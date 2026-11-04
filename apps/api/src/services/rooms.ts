import { and, asc, eq, gte, inArray, lt, gt, notInArray, sql } from "drizzle-orm";
import { db } from "../database/client";
import { reservations, roomTypeAmenities, roomTypes, rooms } from "../database/schema";
import { RELEASED_RESERVATION_STATUSES, UNAVAILABLE_ROOM_STATUSES } from "../constants";
import type { RoomStatus } from "../constants";
import { mapRoom, mapRoomType } from "./mappers";
import { logActivity } from "./activity";
import { newId } from "../utils/id";
import { badRequest, conflict, notFound } from "../utils/http";
import { todayIst } from "../utils/date";

export async function listRoomTypes() {
  const types = await db.select().from(roomTypes).orderBy(asc(roomTypes.name));
  const amenities = await db.select().from(roomTypeAmenities).orderBy(asc(roomTypeAmenities.sortOrder));
  const byType = new Map<string, string[]>();
  for (const item of amenities) {
    const list = byType.get(item.roomTypeId) ?? [];
    list.push(item.amenity);
    byType.set(item.roomTypeId, list);
  }
  return types.map((type) => mapRoomType(type, byType.get(type.id) ?? []));
}

export async function listRooms() {
  const rows = await db.select().from(rooms).orderBy(asc(rooms.number));
  return rows.map(mapRoom);
}

export async function getRoomTypeById(id: string) {
  const [type] = await db.select().from(roomTypes).where(eq(roomTypes.id, id)).limit(1);
  if (!type) return null;
  const amenities = await db
    .select()
    .from(roomTypeAmenities)
    .where(eq(roomTypeAmenities.roomTypeId, id))
    .orderBy(asc(roomTypeAmenities.sortOrder));
  return mapRoomType(type, amenities.map((item) => item.amenity));
}

export async function getBusyRanges() {
  return db
    .select({ roomId: reservations.roomId, checkIn: reservations.checkIn, checkOut: reservations.checkOut })
    .from(reservations)
    .where(and(notInArray(reservations.status, RELEASED_RESERVATION_STATUSES), gte(reservations.checkOut, todayIst())));
}

export async function getPublicCatalog() {
  const [types, roomRows, busyRanges] = await Promise.all([listRoomTypes(), listRooms(), getBusyRanges()]);
  return { roomTypes: types, rooms: roomRows, busyRanges };
}

export async function getAvailability(checkIn: string, checkOut: string, guests: number) {
  const rows = await db
    .select({ room: rooms, rate: roomTypes.rate })
    .from(rooms)
    .innerJoin(roomTypes, eq(roomTypes.id, rooms.typeId))
    .where(
      and(
        notInArray(rooms.status, UNAVAILABLE_ROOM_STATUSES),
        gte(roomTypes.capacity, guests),
        sql`NOT EXISTS (
          SELECT 1 FROM reservations res
          WHERE res.room_id = ${rooms.id}
            AND res.status NOT IN ('cancelled', 'checked-out', 'no-show')
            AND res.check_in < ${checkOut}
            AND res.check_out > ${checkIn}
        )`,
      ),
    )
    .orderBy(asc(roomTypes.rate), asc(rooms.number));
  return rows.map((row) => mapRoom(row.room));
}

export async function createRoom(
  input: { number: string; typeId: string; floor: number; notes?: string },
  actor: { id: string; name: string },
) {
  const type = await getRoomTypeById(input.typeId);
  if (!type) throw badRequest("Choose a valid room type.");
  const id = newId("room");
  await db.insert(rooms).values({
    id,
    number: input.number.trim(),
    typeId: input.typeId,
    floor: input.floor,
    status: "available",
    notes: input.notes ?? "New room",
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Added room",
    detail: `Room ${input.number}`,
    tone: "success",
    userId: actor.id,
  });
  const [row] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return mapRoom(row);
}

export async function updateRoomStatus(id: string, status: RoomStatus, actor: { id: string; name: string }) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  if (!room) throw notFound("Room not found.");
  if (status === "available") {
    const active = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.roomId, id),
          notInArray(reservations.status, RELEASED_RESERVATION_STATUSES),
          lt(reservations.checkIn, todayIst()),
          gt(reservations.checkOut, todayIst()),
        ),
      )
      .limit(1);
    if (active.length) throw conflict("This room has an active stay. Check the guest out before marking it available.");
  }
  await db.update(rooms).set({ status, updatedAt: new Date() }).where(eq(rooms.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated room status",
    detail: `Room ${room.number} - ${status}`,
    tone: status === "maintenance" || status === "out-of-order" ? "warning" : "info",
    userId: actor.id,
  });
  const [updated] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return mapRoom(updated);
}

export async function roomHasOtherActiveStay(roomId: string, exceptReservationId: string): Promise<boolean> {
  const rows = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.roomId, roomId),
        sql`${reservations.id} <> ${exceptReservationId}`,
        notInArray(reservations.status, RELEASED_RESERVATION_STATUSES),
        lt(reservations.checkIn, todayIst()),
        gt(reservations.checkOut, todayIst()),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function roomIdsForType(typeId: string): Promise<string[]> {
  const rows = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.typeId, typeId));
  return rows.map((row) => row.id);
}

export async function activeRoomsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.select().from(rooms).where(inArray(rooms.id, ids));
  return rows.map(mapRoom);
}
