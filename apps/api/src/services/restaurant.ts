import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../database/client";
import { reservations, restaurantOrders, rooms } from "../database/schema";
import type { OrderStatus } from "../constants";
import { badRequest, notFound } from "../utils/http";
import { fromPaise, toPaise } from "../utils/money";
import { newId } from "../utils/id";
import { paginated } from "../utils/pagination";
import { logActivity } from "./activity";
import { mapOrder } from "./mappers";

interface OrderFilters {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

export async function listOrders(filters: OrderFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(restaurantOrders.status, filters.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(restaurantOrders)
    .where(where)
    .orderBy(desc(restaurantOrders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(restaurantOrders).where(where);
  return paginated(rows.map(mapOrder), Number(countRow?.count ?? 0), page, pageSize);
}

export async function createOrder(
  input: {
    guestName: string;
    roomNumber?: string;
    reservationId?: string | null;
    items: string;
    amount: number;
  },
  actor: { id: string; name: string },
) {
  let roomNumber = input.roomNumber ?? "";
  if (input.reservationId) {
    const [row] = await db
      .select({ roomNumber: rooms.number })
      .from(reservations)
      .innerJoin(rooms, eq(rooms.id, reservations.roomId))
      .where(eq(reservations.id, input.reservationId))
      .limit(1);
    if (!row) throw badRequest("Choose a valid reservation.");
    roomNumber = row.roomNumber;
  }
  const id = newId("ord");
  await db.insert(restaurantOrders).values({
    id,
    guestName: input.guestName,
    roomNumber,
    reservationId: input.reservationId ?? null,
    items: input.items,
    amount: fromPaise(toPaise(input.amount)),
    status: "new",
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Added room service order",
    detail: `${input.guestName} - INR ${input.amount}`,
    tone: "success",
    userId: actor.id,
  });
  const [created] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.id, id)).limit(1);
  return mapOrder(created);
}

export async function updateOrderStatus(id: string, status: OrderStatus, actor: { id: string; name: string }) {
  const [existing] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.id, id)).limit(1);
  if (!existing) throw notFound("Order not found.");
  await db.update(restaurantOrders).set({ status, updatedAt: new Date() }).where(eq(restaurantOrders.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated restaurant order",
    detail: `${existing.guestName} - ${status}`,
    tone: status === "cancelled" ? "warning" : "info",
    userId: actor.id,
  });
  const [updated] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.id, id)).limit(1);
  return mapOrder(updated);
}
