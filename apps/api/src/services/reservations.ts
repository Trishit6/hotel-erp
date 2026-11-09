import { and, asc, desc, eq, gt, gte, like, lt, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "../database/client";
import {
  guests,
  housekeepingTasks,
  invoices,
  checkIns,
  checkOuts,
  invoiceItems,
  reservationGuests,
  reservations,
  reservationStatusHistory,
  roomTypeAmenities,
  roomTypes,
  rooms,
  systemSettings,
  users,
} from "../database/schema";
import {
  CHECKIN_BLOCKED_ROOM_STATUSES,
  RELEASED_RESERVATION_STATUSES,
  RESERVATION_STATUSES,
  STAFF_ROLES,
  TAX_BASIS_POINTS,
  UNAVAILABLE_ROOM_STATUSES,
  type ReservationStatus,
  type StaffRole,
  type UserRole,
} from "../constants";
import { addDays, calculateNights, isDateRangeValid, todayIst } from "../utils/date";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../utils/http";
import { applyBasisPoints, fromPaise, toPaise } from "../utils/money";
import { generateUniqueReference, newId } from "../utils/id";
import { paginated, type PageResult } from "../utils/pagination";
import { normalizeEmailForMatch, normalizePhoneForMatch } from "../utils/contact";
import { hasPermission } from "./permissions";
import {
  activeReservationCondition,
  assertPublicHoldLimit,
  PUBLIC_HOLD_HOURS,
  unexpiredHoldCondition,
} from "./reservationHolds";
import { logActivity } from "./activity";
import { mapGuest, mapInvoice, mapPublicReservation, mapReservation, mapRoom, mapRoomType } from "./mappers";

export interface ReservationCreateInput {
  guestName: string;
  email: string;
  phone: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  specialRequests?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  discount?: number;
}

export interface Actor {
  id: string;
  name: string;
  role: UserRole;
}

export interface CustomerBookingIdentity {
  id: string;
  name: string;
  email: string;
}

export interface ReservationCreateOptions {
  // Customer self-service bookings are rooted in an authenticated account.
  // Staff bookings remain permission-gated through the admin routes.
  source: "customer" | "staff";
  actor?: Actor;
  customer?: CustomerBookingIdentity;
}

interface ReservationFilters {
  status?: ReservationStatus;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
}

function assertStayDates(checkIn: string, checkOut: string): number {
  if (!isDateRangeValid(checkIn, checkOut)) throw badRequest("Check-out must be after check-in.");
  const nights = calculateNights(checkIn, checkOut);
  if (nights > 30) throw badRequest("Stays longer than 30 nights need a direct booking with the hotel.");
  if (checkIn < todayIst()) throw badRequest("Check-in cannot be in the past.");
  return nights;
}

/** A stay is physically current when it starts today or earlier and ends later today. */
function isCurrentStay(checkIn: string, checkOut: string, today = todayIst()): boolean {
  return checkIn <= today && checkOut > today;
}

async function findGuestByEmail(tx: Tx, email: string) {
  const [guest] = await tx.select().from(guests).where(eq(guests.email, email.toLowerCase())).limit(1);
  return guest ?? null;
}

async function upsertGuest(
  tx: Tx,
  input: ReservationCreateInput,
  options: ReservationCreateOptions,
): Promise<typeof guests.$inferSelect> {
  const customer = options.customer;
  if (options.source === "customer" && !customer) {
    throw new Error("Customer identity is required for a customer booking.");
  }
  const email = (customer?.email ?? input.email).trim().toLowerCase();
  const guestName = customer?.name ?? input.guestName;
  const existing = await findGuestByEmail(tx, email);
  const now = new Date();

  if (existing) {
    // Authenticated customers may refresh their own contact details through a
    // booking, but the account name/email remain authoritative. Public/guest
    // callers cannot mutate an existing profile because only customer and
    // permitted staff sources reach this service.
    const canUpdateCustomerProfile = options.source === "customer";
    const canUpdateStaffProfile =
      options.source === "staff" &&
      options.actor !== undefined &&
      (STAFF_ROLES as readonly string[]).includes(options.actor.role) &&
      hasPermission(options.actor.role as StaffRole, "guests:write");
    if (!canUpdateCustomerProfile && !canUpdateStaffProfile) return existing;

    await tx
      .update(guests)
      .set({
        name: guestName,
        phone: input.phone,
        address: input.address || existing.address,
        city: input.city || existing.city,
        state: input.state || existing.state,
        postalCode: input.postalCode || existing.postalCode,
        updatedAt: now,
      })
      .where(eq(guests.id, existing.id));
    const [updated] = await tx.select().from(guests).where(eq(guests.id, existing.id)).limit(1);
    return updated;
  }

  const id = newId("guest");
  try {
    await tx.insert(guests).values({
      id,
      name: guestName,
      email,
      phone: input.phone,
      address: input.address ?? "",
      city: input.city ?? "",
      state: input.state ?? "",
      postalCode: input.postalCode ?? "",
      idType: "Pending",
      idLastFour: "",
      preferences: "",
      totalStays: 0,
      totalSpent: "0.00",
      updatedAt: now,
    });
  } catch (error) {
    // Two simultaneous bookings can race on the unique email. Re-read the winner.
    if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    const winner = await findGuestByEmail(tx, email);
    if (!winner) throw error;
    return winner;
  }
  const [created] = await tx.select().from(guests).where(eq(guests.id, id)).limit(1);
  return created;
}

async function overlappingReservation(
  tx: Tx,
  roomId: string,
  checkIn: string,
  checkOut: string,
  exceptId?: string,
): Promise<{ id: string } | null> {
  const conditions = [
    eq(reservations.roomId, roomId),
    notInArray(reservations.status, RELEASED_RESERVATION_STATUSES),
    unexpiredHoldCondition(),
    lt(reservations.checkIn, checkOut),
    gt(reservations.checkOut, checkIn),
  ];
  if (exceptId) conditions.push(ne(reservations.id, exceptId));
  const [row] = await tx
    .select({ id: reservations.id })
    .from(reservations)
    .where(and(...conditions))
    .limit(1)
    .for("update");
  return row ?? null;
}

export async function createReservation(input: ReservationCreateInput, options: ReservationCreateOptions) {
  const { actor, source, customer } = options;
  if (source === "customer" && (!customer || !actor || actor.id !== customer.id)) {
    throw forbidden("Only the authenticated customer may create this reservation.");
  }
  const nights = assertStayDates(input.checkIn, input.checkOut);
  const discountPaise = toPaise(input.discount ?? 0);
  if (discountPaise < 0) throw badRequest("Discount cannot be negative.");

  return db.transaction(async (tx) => {
    if (source === "customer") {
      // Re-check the account inside the transaction. A session may have become
      // inactive, or the role may have changed, between request authentication
      // and booking creation.
      const [account] = await tx
        .select({ role: users.role, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, customer!.id))
        .limit(1)
        .for("update");
      if (!account || !account.isActive || account.role !== "customer") {
        throw forbidden("Only an active customer account may create a reservation.");
      }
    }

    // Lock the room row first. Every booking for this room serialises here,
    // which prevents concurrent double bookings even when no reservation row
    // exists yet to lock.
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, input.roomId)).limit(1).for("update");
    if (!room) throw badRequest("Choose a valid room.");
    if (UNAVAILABLE_ROOM_STATUSES.includes(room.status)) {
      throw conflict(`Room ${room.number} is currently ${room.status.replaceAll("-", " ")}.`);
    }

    const [type] = await tx.select().from(roomTypes).where(eq(roomTypes.id, room.typeId)).limit(1);
    if (!type) throw badRequest("The room type is not configured.");

    const party = input.adults + input.children;
    if (party > type.capacity) throw badRequest(`This room sleeps up to ${type.capacity} guests.`);

    if (await overlappingReservation(tx, room.id, input.checkIn, input.checkOut)) {
      throw conflict("That room is no longer available for these dates.");
    }

    const roomChargesPaise = toPaise(type.rate) * nights;
    if (discountPaise > roomChargesPaise) throw badRequest("Discount cannot exceed the room charges.");
    const taxablePaise = roomChargesPaise - discountPaise;
    const [settingsRow] = await tx
      .select({ taxRateBps: systemSettings.taxRateBps, invoicePrefix: systemSettings.invoicePrefix })
      .from(systemSettings)
      .limit(1);
    const taxPaise = applyBasisPoints(taxablePaise, settingsRow?.taxRateBps ?? TAX_BASIS_POINTS);
    const totalPaise = taxablePaise + taxPaise;

    const guest = await upsertGuest(tx, input, options);
    const selfServiceBooking = source === "customer";
    if (selfServiceBooking) {
      await assertPublicHoldLimit(tx, guest.id, guest.email, guest.phone);
    }

    const initialStatus: ReservationStatus = selfServiceBooking ? "pending" : "confirmed";

    let reference: string;
    try {
      reference = await generateUniqueReference(async (candidate) => {
        const [existing] = await tx
          .select({ id: reservations.id })
          .from(reservations)
          .where(eq(reservations.reference, candidate))
          .limit(1);
        return Boolean(existing);
      });
    } catch {
      throw new HttpError(
        503,
        "Could not allocate a reservation reference. Please try again.",
        "reference_allocation_failed",
      );
    }

    const reservationId = newId("res");
    await tx.insert(reservations).values({
      id: reservationId,
      reference,
      guestId: guest.id,
      roomId: room.id,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      status: initialStatus,
      paymentStatus: "pending",
      roomCharges: fromPaise(roomChargesPaise),
      additionalCharges: "0.00",
      discount: fromPaise(discountPaise),
      tax: fromPaise(taxPaise),
      total: fromPaise(totalPaise),
      paidAmount: "0.00",
      specialRequests: input.specialRequests ?? "",
      holdExpiresAt: selfServiceBooking
        ? sql.raw(`DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${PUBLIC_HOLD_HOURS} HOUR)`)
        : null,
      updatedAt: new Date(),
    });

    // A future booking is represented by its date range, not by changing the
    // room's present physical state. Only a stay covering today reserves it.
    if (room.status === "available" && isCurrentStay(input.checkIn, input.checkOut)) {
      await tx.update(rooms).set({ status: "reserved", updatedAt: new Date() }).where(eq(rooms.id, room.id));
    }

    const invoiceId = newId("inv");
    await tx.insert(invoices).values({
      id: invoiceId,
      number: `${settingsRow?.invoicePrefix || "INV"}-${new Date().getUTCFullYear()}-${reference.replace("RIVR-", "")}`,
      reservationId,
      status: "pending",
      issuedAt: new Date(),
      dueAmount: fromPaise(totalPaise),
    });
    await tx.insert(invoiceItems).values([
      {
        id: newId("invitem"),
        invoiceId,
        description: `${type.name} - ${nights} night${nights === 1 ? "" : "s"}`,
        quantity: nights,
        unitPrice: type.rate,
        amount: fromPaise(roomChargesPaise),
      },
      ...(taxPaise > 0
        ? [
            {
              id: newId("invitem"),
              invoiceId,
              description: "Tax",
              quantity: 1,
              unitPrice: fromPaise(taxPaise),
              amount: fromPaise(taxPaise),
            },
          ]
        : []),
    ]);

    await tx.insert(reservationGuests).values({
      id: newId("resguest"),
      reservationId,
      guestId: guest.id,
      isPrimary: true,
    });
    await tx.insert(reservationStatusHistory).values({
      id: newId("reshist"),
      reservationId,
      fromStatus: null,
      toStatus: initialStatus,
      note: selfServiceBooking ? "Customer hold created" : "Reservation created",
      changedBy: actor?.id ?? null,
    });

    await logActivity(tx, {
      actor: actor?.name ?? "Guest website",
      action: "Created reservation",
      detail: `${reference} - ${input.guestName}`,
      tone: "success",
      userId: actor?.id ?? null,
    });

    const [created] = await tx.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1);

    // The customer creation response uses the same strict allowlist as later
    // lookup, so a booking response never becomes a full guest-profile export.
    if (selfServiceBooking) {
      return {
        reservation: mapPublicReservation({ reservation: created, guest, room, type }),
      };
    }

    const amenities = await tx
      .select()
      .from(roomTypeAmenities)
      .where(eq(roomTypeAmenities.roomTypeId, type.id))
      .orderBy(asc(roomTypeAmenities.sortOrder));

    return {
      reservation: mapReservation(created),
      guest: mapGuest(guest),
      room: mapRoom(room),
      roomType: mapRoomType(type, amenities.map((item) => item.amenity)),
    };
  });
}

async function reservationDetailRow(idOrReference: string) {
  const [row] = await db
    .select({ reservation: reservations, guest: guests, room: rooms, type: roomTypes })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .innerJoin(rooms, eq(rooms.id, reservations.roomId))
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.typeId))
    .where(or(eq(reservations.id, idOrReference), eq(reservations.reference, idOrReference)))
    .limit(1);
  return row ?? null;
}

/** Staff-facing detail. Includes the full guest profile after permission checks. */
export async function getReservationDetail(idOrReference: string) {
  const row = await reservationDetailRow(idOrReference);
  if (!row) return null;
  return {
    reservation: mapReservation(row.reservation),
    guest: mapGuest(row.guest),
    room: mapRoom(row.room),
    roomType: mapRoomType(row.type),
  };
}

/**
 * Verify a public booking with an exact reference and the matching contact on
 * that reservation. A wrong reference and a wrong contact intentionally return
 * the same null result so callers can emit one generic 404.
 */
export async function verifyPublicReservation(
  reference: string,
  contact: { email?: string; phone?: string },
) {
  const normalizedReference = reference.trim().toLowerCase();
  if (!normalizedReference) return null;

  const [row] = await db
    .select({ reservation: reservations, guest: guests, room: rooms, type: roomTypes })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .innerJoin(rooms, eq(rooms.id, reservations.roomId))
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.typeId))
    .where(sql`lower(${reservations.reference}) = ${normalizedReference}`)
    .limit(1);
  if (!row) return null;

  const emailMatches = contact.email
    ? normalizeEmailForMatch(row.guest.email) === normalizeEmailForMatch(contact.email)
    : false;
  const phoneMatches = contact.phone
    ? normalizePhoneForMatch(row.guest.phone) === normalizePhoneForMatch(contact.phone)
    : false;
  if (!emailMatches && !phoneMatches) return null;

  return mapPublicReservation(row);
}

export async function listReservations(filters: ReservationFilters): Promise<PageResult<ReturnType<typeof mapReservation>>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(reservations.status, filters.status));
  if (filters.q) {
    const needle = `%${filters.q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${reservations.reference})`, needle),
        like(sql`lower(${guests.name})`, needle),
        like(sql`lower(${guests.email})`, needle),
        like(sql`lower(${guests.phone})`, needle),
      )!,
    );
  }
  if (filters.from) conditions.push(gte(reservations.checkOut, filters.from));
  if (filters.to) conditions.push(lte(reservations.checkIn, filters.to));
  const where = conditions.length ? and(...conditions) : undefined;

  const sortColumn =
    filters.sort === "checkIn"
      ? reservations.checkIn
      : filters.sort === "total"
        ? reservations.total
        : filters.sort === "status"
          ? reservations.status
          : reservations.createdAt;
  const direction = filters.order === "asc" ? asc : desc;

  const rows = await db
    .select({ reservation: reservations })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .where(where)
    .orderBy(direction(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .where(where);

  return paginated(rows.map((row) => mapReservation(row.reservation)), Number(countRow?.count ?? 0), page, pageSize);
}

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled", "no-show"],
  confirmed: ["cancelled", "no-show"],
  "checked-in": [],
  "checked-out": [],
  cancelled: [],
  "no-show": [],
};

export async function updateReservationStatus(id: string, status: ReservationStatus, actor: Actor) {
  if (status === "checked-in" || status === "checked-out") {
    throw badRequest(`Use the ${status === "checked-in" ? "check-in" : "check-out"} action to change this reservation.`);
  }
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1).for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (!ALLOWED_TRANSITIONS[reservation.status].includes(status)) {
      throw conflict(`A ${reservation.status.replaceAll("-", " ")} reservation cannot move to ${status.replaceAll("-", " ")}.`);
    }
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
    if (!room) throw notFound("Assigned room not found.");

    const now = new Date();
    await tx
      .update(reservations)
      .set({
        status,
        cancelledAt: status === "cancelled" || status === "no-show" ? now : reservation.cancelledAt,
        holdExpiresAt: status === "confirmed" ? null : reservation.holdExpiresAt,
        updatedAt: now,
      })
      .where(eq(reservations.id, id));

    if (status === "cancelled" || status === "no-show") {
      const others = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.roomId, room.id),
            ne(reservations.id, id),
            activeReservationCondition(),
            lte(reservations.checkIn, todayIst()),
            gt(reservations.checkOut, todayIst()),
          ),
        )
        .limit(1);
      if (!others.length && room.status === "reserved") {
        await tx.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, room.id));
      }
    }

    if (
      status === "confirmed" &&
      room.status === "available" &&
      isCurrentStay(reservation.checkIn, reservation.checkOut)
    ) {
      await tx.update(rooms).set({ status: "reserved", updatedAt: now }).where(eq(rooms.id, room.id));
    }

    await tx.insert(reservationStatusHistory).values({
      id: newId("reshist"),
      reservationId: id,
      fromStatus: reservation.status,
      toStatus: status,
      note: "Status updated by staff",
      changedBy: actor.id,
    });

    await logActivity(tx, {
      actor: actor.name,
      action: `Updated reservation to ${status}`,
      detail: reservation.reference,
      tone: status === "cancelled" || status === "no-show" ? "warning" : "info",
      userId: actor.id,
    });

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return mapReservation(updated);
  });
}

export async function assignReservationRoom(id: string, roomId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1).for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (!["pending", "confirmed"].includes(reservation.status)) {
      throw conflict("Only pending or confirmed reservations can be reassigned.");
    }
    if (reservation.roomId === roomId) return mapReservation(reservation);

    const [newRoom] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).limit(1).for("update");
    if (!newRoom) throw badRequest("Choose a valid room.");
    if (UNAVAILABLE_ROOM_STATUSES.includes(newRoom.status)) {
      throw conflict(`Room ${newRoom.number} is currently ${newRoom.status.replaceAll("-", " ")}.`);
    }
    const [type] = await tx.select().from(roomTypes).where(eq(roomTypes.id, newRoom.typeId)).limit(1);
    if (!type) throw badRequest("The room type is not configured.");
    if (reservation.adults + reservation.children > type.capacity) {
      throw badRequest(`Room ${newRoom.number} sleeps up to ${type.capacity} guests.`);
    }
    if (await overlappingReservation(tx, newRoom.id, reservation.checkIn, reservation.checkOut, reservation.id)) {
      throw conflict("That room is not available for these dates.");
    }

    const [oldRoom] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
    const now = new Date();
    await tx.update(reservations).set({ roomId, updatedAt: now }).where(eq(reservations.id, id));

    if (oldRoom && oldRoom.status === "reserved") {
      const others = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.roomId, oldRoom.id),
            ne(reservations.id, id),
            activeReservationCondition(),
            lte(reservations.checkIn, todayIst()),
            gt(reservations.checkOut, todayIst()),
          ),
        )
        .limit(1);
      if (!others.length) {
        await tx.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, oldRoom.id));
      }
    }
    if (newRoom.status === "available" && isCurrentStay(reservation.checkIn, reservation.checkOut)) {
      await tx.update(rooms).set({ status: "reserved", updatedAt: now }).where(eq(rooms.id, newRoom.id));
    }

    await logActivity(tx, {
      actor: actor.name,
      action: "Changed room assignment",
      detail: `${reservation.reference} - Room ${newRoom.number}`,
      tone: "info",
      userId: actor.id,
    });

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return mapReservation(updated);
  });
}

export async function checkInReservation(
  id: string,
  actor: Actor,
  options: { earlyCheckIn?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1).for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (reservation.status === "checked-in") throw conflict("This guest is already checked in.");
    if (!["pending", "confirmed"].includes(reservation.status)) {
      throw conflict(`A ${reservation.status.replaceAll("-", " ")} reservation cannot be checked in.`);
    }

    const today = todayIst();
    if (today >= reservation.checkOut) {
      throw conflict("This stay has passed its check-out date and cannot be checked in.");
    }
    const earlyCheckIn = today < reservation.checkIn;
    if (earlyCheckIn && !options.earlyCheckIn) {
      throw conflict(`Check-in opens on ${reservation.checkIn}.`);
    }
    if (
      earlyCheckIn &&
      !hasPermission(actor.role as StaffRole, "reservations:override")
    ) {
      throw forbidden("Only a manager or administrator may authorize an early check-in.");
    }

    const [room] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
    if (!room) throw notFound("Assigned room not found.");
    if (CHECKIN_BLOCKED_ROOM_STATUSES.includes(room.status)) {
      throw conflict(`Room ${room.number} is ${room.status.replaceAll("-", " ")} and cannot be checked in.`);
    }
    if (room.status === "occupied") throw conflict(`Room ${room.number} is already occupied.`);

    const now = new Date();
    await tx
      .update(reservations)
      .set({ status: "checked-in", checkedInAt: now, holdExpiresAt: null, updatedAt: now })
      .where(eq(reservations.id, id));
    await tx.update(rooms).set({ status: "occupied", updatedAt: now }).where(eq(rooms.id, room.id));
    await tx.insert(checkIns).values({
      id: newId("checkin"),
      reservationId: id,
      roomId: room.id,
      checkedInAt: now,
      checkedInBy: actor.id,
    });
    await tx.insert(reservationStatusHistory).values({
      id: newId("reshist"),
      reservationId: id,
      fromStatus: reservation.status,
      toStatus: "checked-in",
      note: earlyCheckIn ? "Early check-in override" : "",
      changedBy: actor.id,
    });

    await logActivity(tx, {
      actor: actor.name,
      action: "Checked in guest",
      detail: `${reservation.reference} - Room ${room.number}`,
      tone: "success",
      userId: actor.id,
    });
    if (earlyCheckIn) {
      await logActivity(tx, {
        actor: actor.name,
        action: "Early check-in override",
        detail: `${reservation.reference} - checked in ${today}, arrival ${reservation.checkIn}`,
        tone: "warning",
        userId: actor.id,
      });
    }

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return mapReservation(updated);
  });
}

export async function checkOutReservation(
  id: string,
  actor: Actor,
  options: { overrideOutstandingBalance?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1).for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (reservation.status === "checked-out") throw conflict("This guest is already checked out.");
    if (reservation.status !== "checked-in") throw conflict("Only checked-in guests can be checked out.");

    const outstandingPaise = toPaise(reservation.total) - toPaise(reservation.paidAmount);
    if (outstandingPaise > 0) {
      if (!options.overrideOutstandingBalance) {
        throw new HttpError(
          409,
          `Outstanding balance of INR ${fromPaise(outstandingPaise)} must be settled before check-out.`,
          "outstanding_balance",
          { outstandingBalance: Number(fromPaise(outstandingPaise)), currency: "INR" },
        );
      }
      if (!hasPermission(actor.role as StaffRole, "reservations:override")) {
        throw forbidden("Only a manager or administrator may override an outstanding balance.");
      }
    }

    const [room] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
    if (!room) throw notFound("Assigned room not found.");

    const now = new Date();
    await tx
      .update(reservations)
      .set({ status: "checked-out", checkedOutAt: now, holdExpiresAt: null, updatedAt: now })
      .where(eq(reservations.id, id));
    await tx.update(rooms).set({ status: "cleaning", updatedAt: now }).where(eq(rooms.id, room.id));
    await tx.insert(checkOuts).values({
      id: newId("checkout"),
      reservationId: id,
      roomId: room.id,
      checkedOutAt: now,
      checkedOutBy: actor.id,
    });
    await tx.insert(reservationStatusHistory).values({
      id: newId("reshist"),
      reservationId: id,
      fromStatus: reservation.status,
      toStatus: "checked-out",
      note: outstandingPaise > 0 ? "Outstanding balance override" : "",
      changedBy: actor.id,
    });
    await tx.insert(housekeepingTasks).values({
      id: newId("hk"),
      roomId: room.id,
      status: "dirty",
      priority: "high",
      issue: "Post-checkout clean",
      updatedAt: now,
    });

    const [guest] = await tx.select().from(guests).where(eq(guests.id, reservation.guestId)).limit(1).for("update");
    if (guest) {
      await tx
        .update(guests)
        .set({
          totalStays: guest.totalStays + 1,
          totalSpent: fromPaise(toPaise(guest.totalSpent) + toPaise(reservation.total)),
          updatedAt: now,
        })
        .where(eq(guests.id, guest.id));
    }

    await logActivity(tx, {
      actor: actor.name,
      action: "Checked out guest",
      detail: reservation.reference,
      tone: "success",
      userId: actor.id,
    });
    if (outstandingPaise > 0) {
      await logActivity(tx, {
        actor: actor.name,
        action: "Outstanding balance checkout override",
        detail: `${reservation.reference} - INR ${fromPaise(outstandingPaise)} outstanding`,
        tone: "warning",
        userId: actor.id,
      });
    }

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return mapReservation(updated);
  });
}

export async function listInvoices(page = 1, pageSize = 50) {
  const rows = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.issuedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  return paginated(rows.map(mapInvoice), Number(countRow?.count ?? 0), page, pageSize);
}
