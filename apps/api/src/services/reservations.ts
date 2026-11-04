import { and, asc, desc, eq, gt, gte, inArray, like, lt, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "../database/client";
import {
  guests,
  housekeepingTasks,
  invoices,
  reservations,
  roomTypeAmenities,
  roomTypes,
  rooms,
} from "../database/schema";
import {
  CHECKIN_BLOCKED_ROOM_STATUSES,
  RELEASED_RESERVATION_STATUSES,
  RESERVATION_STATUSES,
  TAX_BASIS_POINTS,
  UNAVAILABLE_ROOM_STATUSES,
  type ReservationStatus,
  type StaffRole,
} from "../constants";
import { addDays, calculateNights, isDateRangeValid, todayIst } from "../utils/date";
import { badRequest, conflict, notFound } from "../utils/http";
import { applyBasisPoints, fromPaise, toPaise } from "../utils/money";
import { newId, newReference } from "../utils/id";
import { paginated, type PageResult } from "../utils/pagination";
import { logActivity } from "./activity";
import { mapGuest, mapInvoice, mapReservation, mapRoom, mapRoomType } from "./mappers";

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
  role: StaffRole;
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

async function findGuestByEmail(tx: Tx, email: string) {
  const [guest] = await tx.select().from(guests).where(eq(guests.email, email.toLowerCase())).limit(1);
  return guest ?? null;
}

async function upsertGuest(
  tx: Tx,
  input: ReservationCreateInput,
): Promise<typeof guests.$inferSelect> {
  const email = input.email.trim().toLowerCase();
  const existing = await findGuestByEmail(tx, email);
  const now = new Date();

  if (existing) {
    await tx
      .update(guests)
      .set({
        name: input.guestName,
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
      name: input.guestName,
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

export async function createReservation(input: ReservationCreateInput, actor?: Actor) {
  const nights = assertStayDates(input.checkIn, input.checkOut);
  const discountPaise = toPaise(input.discount ?? 0);
  if (discountPaise < 0) throw badRequest("Discount cannot be negative.");

  return db.transaction(async (tx) => {
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
    const taxPaise = applyBasisPoints(taxablePaise, TAX_BASIS_POINTS);
    const totalPaise = taxablePaise + taxPaise;

    const guest = await upsertGuest(tx, input);

    let reference = newReference();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [existing] = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(eq(reservations.reference, reference))
        .limit(1);
      if (!existing) break;
      reference = newReference();
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
      status: "confirmed",
      paymentStatus: "pending",
      roomCharges: fromPaise(roomChargesPaise),
      additionalCharges: "0.00",
      discount: fromPaise(discountPaise),
      tax: fromPaise(taxPaise),
      total: fromPaise(totalPaise),
      paidAmount: "0.00",
      specialRequests: input.specialRequests ?? "",
      updatedAt: new Date(),
    });

    if (room.status === "available") {
      await tx.update(rooms).set({ status: "reserved", updatedAt: new Date() }).where(eq(rooms.id, room.id));
    }

    const invoiceId = newId("inv");
    await tx.insert(invoices).values({
      id: invoiceId,
      number: `INV-${new Date().getUTCFullYear()}-${reference.replace("RIVR-", "")}`,
      reservationId,
      status: "pending",
      issuedAt: new Date(),
      dueAmount: fromPaise(totalPaise),
    });

    await logActivity(tx, {
      actor: actor?.name ?? "Guest website",
      action: "Created reservation",
      detail: `${reference} - ${input.guestName}`,
      tone: "success",
      userId: actor?.id ?? null,
    });

    const [created] = await tx.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1);
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

export async function getReservationDetail(idOrReference: string) {
  const [row] = await db
    .select({ reservation: reservations, guest: guests, room: rooms, type: roomTypes })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .innerJoin(rooms, eq(rooms.id, reservations.roomId))
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.typeId))
    .where(or(eq(reservations.id, idOrReference), eq(reservations.reference, idOrReference)))
    .limit(1);
  if (!row) return null;
  return {
    reservation: mapReservation(row.reservation),
    guest: mapGuest(row.guest),
    room: mapRoom(row.room),
    roomType: mapRoomType(row.type),
  };
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
            notInArray(reservations.status, RELEASED_RESERVATION_STATUSES),
            lt(reservations.checkIn, todayIst()),
            gt(reservations.checkOut, todayIst()),
          ),
        )
        .limit(1);
      if (!others.length && room.status === "reserved") {
        await tx.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, room.id));
      }
    }

    if (status === "confirmed" && room.status === "available") {
      await tx.update(rooms).set({ status: "reserved", updatedAt: now }).where(eq(rooms.id, room.id));
    }

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
            notInArray(reservations.status, RELEASED_RESERVATION_STATUSES),
            lt(reservations.checkIn, todayIst()),
            gt(reservations.checkOut, todayIst()),
          ),
        )
        .limit(1);
      if (!others.length) {
        await tx.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, oldRoom.id));
      }
    }
    if (newRoom.status === "available") {
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

export async function checkInReservation(id: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1).for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (reservation.status === "checked-in") throw conflict("This guest is already checked in.");
    if (!["pending", "confirmed"].includes(reservation.status)) {
      throw conflict(`A ${reservation.status.replaceAll("-", " ")} reservation cannot be checked in.`);
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
      .set({ status: "checked-in", checkedInAt: now, updatedAt: now })
      .where(eq(reservations.id, id));
    await tx.update(rooms).set({ status: "occupied", updatedAt: now }).where(eq(rooms.id, room.id));

    await logActivity(tx, {
      actor: actor.name,
      action: "Checked in guest",
      detail: `${reservation.reference} - Room ${room.number}`,
      tone: "success",
      userId: actor.id,
    });

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return mapReservation(updated);
  });
}

export async function checkOutReservation(id: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1).for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (reservation.status === "checked-out") throw conflict("This guest is already checked out.");
    if (reservation.status !== "checked-in") throw conflict("Only checked-in guests can be checked out.");

    const [room] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
    if (!room) throw notFound("Assigned room not found.");

    const now = new Date();
    await tx
      .update(reservations)
      .set({ status: "checked-out", checkedOutAt: now, updatedAt: now })
      .where(eq(reservations.id, id));
    await tx.update(rooms).set({ status: "cleaning", updatedAt: now }).where(eq(rooms.id, room.id));
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

    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return mapReservation(updated);
  });
}

export async function lookupReservations(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const matchingGuests = await db
    .select({ id: guests.id })
    .from(guests)
    .where(
      or(
        like(sql`lower(${guests.email})`, `%${normalized}%`),
        like(sql`lower(${guests.name})`, `%${normalized}%`),
        like(sql`lower(${guests.phone})`, `%${normalized}%`),
      ),
    )
    .limit(50);

  const guestIds = matchingGuests.map((guest) => guest.id);
  const referenceMatch = `%${normalized}%`;
  const condition = guestIds.length
    ? or(like(sql`lower(${reservations.reference})`, referenceMatch), inArray(reservations.guestId, guestIds))
    : like(sql`lower(${reservations.reference})`, referenceMatch);

  const rows = await db
    .select({ reservation: reservations, guest: guests, room: rooms, type: roomTypes })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .innerJoin(rooms, eq(rooms.id, reservations.roomId))
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.typeId))
    .where(condition)
    .orderBy(desc(reservations.createdAt))
    .limit(20);

  return rows.map((row) => ({
    reservation: mapReservation(row.reservation),
    guest: mapGuest(row.guest),
    room: mapRoom(row.room),
    roomType: mapRoomType(row.type),
  }));
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
