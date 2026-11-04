import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "../database/client";
import { activityLogs, expenses, housekeepingTasks, inventory, payments, reservations, rooms, staff } from "../database/schema";
import { RELEASED_RESERVATION_STATUSES } from "../constants";
import { todayIst } from "../utils/date";
import { mapActivity } from "./mappers";

const num = (value: unknown) => Number(value ?? 0);

export async function getDashboard() {
  const today = todayIst();

  const [roomSummary] = await db
    .select({
      total: sql<number>`count(*)`,
      available: sql<number>`sum(case when ${rooms.status} = 'available' then 1 else 0 end)`,
      occupied: sql<number>`sum(case when ${rooms.status} = 'occupied' then 1 else 0 end)`,
      offline: sql<number>`sum(case when ${rooms.status} in ('maintenance','out-of-order') then 1 else 0 end)`,
    })
    .from(rooms);

  const [reservationSummary] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`sum(case when ${reservations.status} = 'pending' then 1 else 0 end)`,
      confirmed: sql<number>`sum(case when ${reservations.status} = 'confirmed' then 1 else 0 end)`,
      checkedIn: sql<number>`sum(case when ${reservations.status} = 'checked-in' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${reservations.status} = 'cancelled' then 1 else 0 end)`,
      revenue: sql<number>`coalesce(sum(case when ${reservations.status} <> 'cancelled' then ${reservations.total} else 0 end), 0)`,
      outstanding: sql<number>`coalesce(sum(case when ${reservations.status} <> 'cancelled' then ${reservations.total} - ${reservations.paidAmount} else 0 end), 0)`,
      arrivals: sql<number>`sum(case when ${reservations.checkIn} = ${today} and ${reservations.status} in ('confirmed','pending') then 1 else 0 end)`,
      departures: sql<number>`sum(case when ${reservations.checkOut} = ${today} and ${reservations.status} = 'checked-in' then 1 else 0 end)`,
    })
    .from(reservations);

  const [taskSummary] = await db
    .select({ open: sql<number>`sum(case when ${housekeepingTasks.status} not in ('cleaned','inspected') then 1 else 0 end)` })
    .from(housekeepingTasks);
  const [inventorySummary] = await db
    .select({ low: sql<number>`sum(case when ${inventory.quantity} <= ${inventory.minimumStock} then 1 else 0 end)` })
    .from(inventory);

  const recentActivities = await db.select().from(activityLogs).orderBy(sql`${activityLogs.createdAt} desc`).limit(8);

  const totalRooms = num(roomSummary?.total);
  const occupied = num(roomSummary?.occupied);

  return {
    rooms: {
      total: totalRooms,
      available: num(roomSummary?.available),
      occupied,
      offline: num(roomSummary?.offline),
      occupancy: totalRooms ? Math.round((occupied / totalRooms) * 100) : 0,
    },
    reservations: {
      total: num(reservationSummary?.total),
      pending: num(reservationSummary?.pending),
      confirmed: num(reservationSummary?.confirmed),
      checkedIn: num(reservationSummary?.checkedIn),
      cancelled: num(reservationSummary?.cancelled),
      arrivals: num(reservationSummary?.arrivals),
      departures: num(reservationSummary?.departures),
      revenue: num(reservationSummary?.revenue),
      outstanding: num(reservationSummary?.outstanding),
    },
    housekeeping: { open: num(taskSummary?.open) },
    inventory: { lowStock: num(inventorySummary?.low) },
    activities: recentActivities.map(mapActivity),
  };
}

export async function getReportSummary(from: string, to: string) {
  const [revenueRow] = await db
    .select({
      gross: sql<number>`coalesce(sum(${reservations.total}), 0)`,
      discount: sql<number>`coalesce(sum(${reservations.discount}), 0)`,
      tax: sql<number>`coalesce(sum(${reservations.tax}), 0)`,
    })
    .from(reservations)
    .where(and(gte(reservations.checkIn, from), lte(reservations.checkIn, to), ne(reservations.status, "cancelled")));

  const [paymentRow] = await db
    .select({ collected: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(gte(payments.paidAt, new Date(`${from}T00:00:00Z`)), lte(payments.paidAt, new Date(`${to}T23:59:59Z`))));

  const [expenseRow] = await db
    .select({ approved: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(eq(expenses.status, "approved"), gte(expenses.date, from), lte(expenses.date, to)));

  const bookingMix = await db
    .select({ status: reservations.status, count: sql<number>`count(*)` })
    .from(reservations)
    .where(and(gte(reservations.checkIn, from), lte(reservations.checkIn, to)))
    .groupBy(reservations.status);

  const roomMix = await db
    .select({ status: rooms.status, count: sql<number>`count(*)` })
    .from(rooms)
    .groupBy(rooms.status);

  const [staffRow] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${staff.status} = 'active' then 1 else 0 end)`,
    })
    .from(staff);

  const collected = num(paymentRow?.collected);
  const approvedExpenses = num(expenseRow?.approved);

  return {
    range: { from, to },
    revenue: {
      gross: num(revenueRow?.gross),
      discount: num(revenueRow?.discount),
      tax: num(revenueRow?.tax),
      collected,
      approvedExpenses,
      netMovement: collected - approvedExpenses,
    },
    bookingMix: bookingMix.map((row) => ({ status: row.status, count: num(row.count) })),
    rooms: roomMix.map((row) => ({ status: row.status, count: num(row.count) })),
    staff: { total: num(staffRow?.total), active: num(staffRow?.active) },
    releasedStatuses: RELEASED_RESERVATION_STATUSES,
  };
}
