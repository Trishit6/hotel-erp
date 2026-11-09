import { and, desc, eq, inArray, ne, gt, lte } from "drizzle-orm";
import { db } from "../database/client";
import {
  guests,
  invoices,
  payments,
  reservationStatusHistory,
  reservations,
  rooms,
  users,
} from "../database/schema";

import { todayIst } from "../utils/date";
import { badRequest, conflict, forbidden, notFound } from "../utils/http";
import { newId } from "../utils/id";
import { logActivity } from "./activity";
import { mapGuest, mapInvoice, mapPayment, mapReservation } from "./mappers";
import { getSettings } from "./settings";
import { activeReservationCondition } from "./reservationHolds";

export interface AccountProfileInput {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  preferences?: string;
}

async function guestForUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw notFound("Account not found.");
  const [guest] = await db.select().from(guests).where(eq(guests.email, user.email)).limit(1);
  return { user, guest: guest ?? null };
}

export async function getAccountOverview(userId: string) {
  const { user, guest } = await guestForUser(userId);
  if (!guest) {
    return { user: { id: user.id, name: user.name, email: user.email }, guest: null, reservations: [], invoices: [], payments: [] };
  }

  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.guestId, guest.id))
    .orderBy(desc(reservations.checkIn));
  const reservationIds = rows.map((row) => row.id);
  const invoiceRows = reservationIds.length
    ? await db.select().from(invoices).where(inArray(invoices.reservationId, reservationIds))
    : [];
  const paymentRows = reservationIds.length
    ? await db.select().from(payments).where(inArray(payments.reservationId, reservationIds))
    : [];

  return {
    user: { id: user.id, name: user.name, email: user.email },
    guest: mapGuest(guest),
    reservations: rows.map(mapReservation),
    invoices: invoiceRows.map(mapInvoice),
    payments: paymentRows.map(mapPayment),
  };
}

export async function updateAccountProfile(userId: string, input: AccountProfileInput) {
  const { user, guest } = await guestForUser(userId);
  const now = new Date();

  await db.transaction(async (tx) => {
    if (input.name) {
      await tx.update(users).set({ name: input.name, updatedAt: now }).where(eq(users.id, user.id));
    }
    if (guest) {
      await tx
        .update(guests)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
          ...(input.preferences !== undefined ? { preferences: input.preferences } : {}),
          updatedAt: now,
        })
        .where(eq(guests.id, guest.id));
    } else {
      await tx.insert(guests).values({
        id: newId("guest"),
        name: input.name ?? user.name,
        email: user.email,
        phone: input.phone ?? "",
        address: input.address ?? "",
        city: input.city ?? "",
        state: input.state ?? "",
        postalCode: input.postalCode ?? "",
        idType: "Pending",
        idLastFour: "",
        preferences: input.preferences ?? "",
        totalStays: 0,
        totalSpent: "0.00",
        updatedAt: now,
      });
    }
    await logActivity(tx, {
      actor: input.name ?? user.name,
      action: "Updated customer profile",
      detail: user.email,
      tone: "info",
      userId: user.id,
    });
  });

  return getAccountOverview(userId);
}

export async function cancelOwnReservation(userId: string, reservationId: string) {
  const { user, guest } = await guestForUser(userId);
  if (!guest) throw notFound("Reservation not found.");

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.id, reservationId), eq(reservations.guestId, guest.id)))
    .limit(1);
  if (!reservation) throw notFound("Reservation not found.");
  if (!["pending", "confirmed"].includes(reservation.status)) {
    throw conflict("Only pending or confirmed reservations can be cancelled.");
  }

  const settings = await getSettings();
  const checkInAt = new Date(`${reservation.checkIn}T${settings.checkInTime}:00+05:30`);
  const hoursUntilCheckIn = (checkInAt.getTime() - Date.now()) / 3_600_000;
  if (hoursUntilCheckIn < settings.cancellationCutoffHours) {
    throw badRequest(
      `Cancellations must be made at least ${settings.cancellationCutoffHours} hours before check-in. Please contact the hotel.`,
    );
  }

  return db.transaction(async (tx) => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
    const now = new Date();
    await tx
      .update(reservations)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
      .where(eq(reservations.id, reservation.id));

    if (room?.status === "reserved") {
      const [otherStay] = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.roomId, room.id),
            ne(reservations.id, reservation.id),
            activeReservationCondition(),
            lte(reservations.checkIn, todayIst()),
            gt(reservations.checkOut, todayIst()),
          ),
        )
        .limit(1);
      if (!otherStay) {
        await tx.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, room.id));
      }
    }

    await tx.insert(reservationStatusHistory).values({
      id: newId("reshist"),
      reservationId: reservation.id,
      fromStatus: reservation.status,
      toStatus: "cancelled",
      note: "Cancelled by the customer",
      changedBy: user.id,
    });
    await logActivity(tx, {
      actor: user.name,
      action: "Cancelled reservation",
      detail: reservation.reference,
      tone: "warning",
      userId: user.id,
    });

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, reservation.id)).limit(1);
    return mapReservation(updated);
  });
}

/** Defence in depth: a customer id can never act as staff through this module. */
export function assertCustomer(role: string): void {
  if (role !== "customer") throw forbidden("This area is for customer accounts only.");
}
