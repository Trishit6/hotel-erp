import { Router } from "express";
import { desc } from "drizzle-orm";
import { db } from "../../database/client";
import * as schema from "../../database/schema";
import { requireAuth, requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler, forbidden } from "../../utils/http";
import { activityQuerySchema } from "../shared/query";
import { hasPermission } from "../../services/permissions";
import {
  mapActivity,
  mapAttendance,
  mapExpense,
  mapGuest,
  mapInventory,
  mapInvoice,
  mapOrder,
  mapPayment,
  mapReservation,
  mapRoom,
  mapRoomType,
  mapSettings,
  mapStaff,
  mapTask,
  mapUser,
} from "../../services/mappers";
import { env } from "../../config/env";
import { seedDatabase } from "../../database/seed";
import { reservationsRouter } from "./reservations.routes";
import { roomsRouter } from "./rooms.routes";
import { guestsRouter } from "./guests.routes";
import { paymentsRouter } from "./payments.routes";
import { housekeepingRouter } from "./housekeeping.routes";
import { staffRouter } from "./staff.routes";
import { inventoryRouter } from "./inventory.routes";
import { expensesRouter } from "./expenses.routes";
import { restaurantRouter } from "./restaurant.routes";
import { reportsRouter } from "./reports.routes";
import { usersRouter } from "./users.routes";
import { settingsRouter } from "./settings.routes";

export const adminRouter = Router();

adminRouter.use(requireAuth);

adminRouter.get(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const role = req.user!.role;
    const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(role, permission);

    const [roomTypeRows, roomRows, reservationRows, taskRows, staffRows, inventoryRows, orderRows] = await Promise.all([
      db.select().from(schema.roomTypes),
      db.select().from(schema.rooms),
      db.select().from(schema.reservations).orderBy(desc(schema.reservations.createdAt)).limit(500),
      db.select().from(schema.housekeepingTasks).orderBy(desc(schema.housekeepingTasks.updatedAt)).limit(500),
      db.select().from(schema.staff),
      db.select().from(schema.inventory),
      db.select().from(schema.restaurantOrders).orderBy(desc(schema.restaurantOrders.createdAt)).limit(500),
    ]);

    const [amenityRows, guestRows, paymentRows, invoiceRows, expenseRows, attendanceRows, activityRows, userRows, settingsRows] =
      await Promise.all([
        db.select().from(schema.roomTypeAmenities),
        can("guests:read")
          ? db.select().from(schema.guests).orderBy(desc(schema.guests.createdAt)).limit(500)
          : Promise.resolve([]),
        can("payments:read") ? db.select().from(schema.payments).orderBy(desc(schema.payments.paidAt)).limit(500) : Promise.resolve([]),
        can("payments:read") ? db.select().from(schema.invoices).orderBy(desc(schema.invoices.issuedAt)).limit(500) : Promise.resolve([]),
        can("expenses:read") ? db.select().from(schema.expenses).orderBy(desc(schema.expenses.date)).limit(500) : Promise.resolve([]),
        can("attendance:read") ? db.select().from(schema.attendance).orderBy(desc(schema.attendance.date)).limit(500) : Promise.resolve([]),
        can("activity:read") ? db.select().from(schema.activityLogs).orderBy(desc(schema.activityLogs.createdAt)).limit(100) : Promise.resolve([]),
        can("users:manage") ? db.select().from(schema.users).orderBy(desc(schema.users.createdAt)) : Promise.resolve([]),
        db.select().from(schema.systemSettings).limit(1),
      ]);

    const amenitiesByType = new Map<string, string[]>();
    for (const item of amenityRows) {
      const list = amenitiesByType.get(item.roomTypeId) ?? [];
      list.push(item.amenity);
      amenitiesByType.set(item.roomTypeId, list);
    }

    res.json({
      user: req.user,
      roomTypes: roomTypeRows.map((row) => mapRoomType(row, amenitiesByType.get(row.id) ?? [])),
      rooms: roomRows.map(mapRoom),
      reservations: reservationRows.map(mapReservation),
      tasks: taskRows.map(mapTask),
      staff: staffRows.map(mapStaff),
      inventory: inventoryRows.map(mapInventory),
      orders: orderRows.map(mapOrder),
      guests: guestRows.map(mapGuest),
      payments: paymentRows.map(mapPayment),
      invoices: invoiceRows.map(mapInvoice),
      expenses: expenseRows.map(mapExpense),
      attendance: attendanceRows.map(mapAttendance),
      activities: activityRows.map(mapActivity),
      users: userRows.map(mapUser),
      settings: can("settings:manage") && settingsRows[0] ? mapSettings(settingsRows[0]) : undefined,
    });
  }),
);

adminRouter.get(
  "/activity",
  requirePermission("activity:read"),
  validate(activityQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { page?: number; pageSize?: number };
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
    const rows = await db
      .select()
      .from(schema.activityLogs)
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    res.json({ items: rows.map(mapActivity), page, pageSize });
  }),
);

adminRouter.post(
  "/dev/reset",
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "super-admin") throw forbidden("Only a super administrator can reset demo data.");
    if (!env.allowDemoReset) throw forbidden("Demo reset is disabled on this server.");
    await seedDatabase();
    res.json({ ok: true, message: "Demo data restored. Please sign in again." });
  }),
);

adminRouter.use("/reservations", reservationsRouter);
adminRouter.use("/rooms", roomsRouter);
adminRouter.use("/guests", guestsRouter);
adminRouter.use("/payments", paymentsRouter);
adminRouter.use("/housekeeping", housekeepingRouter);
adminRouter.use("/staff", staffRouter);
adminRouter.use("/inventory", inventoryRouter);
adminRouter.use("/expenses", expensesRouter);
adminRouter.use("/restaurant", restaurantRouter);
adminRouter.use("/reports", reportsRouter);
adminRouter.use("/users", usersRouter);
adminRouter.use("/settings", settingsRouter);
