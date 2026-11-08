import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import * as schema from "./schema";
import { ensureDatabaseExists } from "./ensure";
import { migrate } from "./migrate";
import { createAdminFromEnv } from "./reset";
import { ensureRoles } from "../services/roles";
import { hashPassword } from "../services/password";
import { env } from "../config/env";
import {
  seedActivities,
  seedAttendance,
  seedBranches,
  seedCheckIns,
  seedCheckOuts,
  seedDepartments,
  seedExpenses,
  seedGuests,
  seedHotels,
  seedHousekeepingStatuses,
  seedHousekeepingTaskHistory,
  seedHousekeepingTasks,
  seedInvitations,
  seedInventory,
  seedInventoryTransactions,
  seedInvoiceItems,
  seedInvoices,
  seedLeaveRequests,
  seedMenuCategories,
  seedMenuItems,
  seedNotifications,
  seedPasswordResetTokens,
  seedPayments,
  seedRefunds,
  seedReservationGuests,
  seedReservationStatusHistory,
  seedReservations,
  seedRestaurantOrderItems,
  seedRestaurantOrders,
  seedRoomAmenities,
  seedRoomTypes,
  seedRooms,
  seedSessions,
  seedSettings,
  seedShifts,
  seedStaff,
  seedSuppliers,
  seedUsers,
} from "./seed-data";

const BUSINESS_TABLES = [
  "notifications",
  "inventory_transactions",
  "suppliers",
  "restaurant_order_items",
  "housekeeping_task_history",
  "check_outs",
  "check_ins",
  "reservation_status_history",
  "reservation_guests",
  "refunds",
  "invoice_items",
  "leave_requests",
  "invitations",
  "password_reset_tokens",
  "activity_logs",
  "restaurant_menu_items",
  "restaurant_menu_categories",
  "restaurant_orders",
  "expenses",
  "inventory",
  "attendance",
  "housekeeping_tasks",
  "invoices",
  "payments",
  "reservations",
  "guests",
  "room_amenities",
  "rooms",
  "room_type_amenities",
  "room_types",
  "branches",
  "hotels",
  "sessions",
  "users",
  "staff",
  "system_settings",
] as const;

export async function clearBusinessData(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of BUSINESS_TABLES) {
      await connection.query(`DELETE FROM \`${table}\``);
    }
  } finally {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } finally {
      connection.release();
    }
  }
}

export async function seedRolesOnly(): Promise<void> {
  await ensureRoles();
}

export async function seedDatabase(): Promise<void> {
  await ensureDatabaseExists();
  await migrate();
  await clearBusinessData();
  await seedRolesOnly();

  // Reference data is inserted idempotently so reseeding keeps the same rows.
  for (const department of seedDepartments) {
    await pool.query("INSERT IGNORE INTO departments (id, name, description) VALUES (?, ?, ?)", [
      department.id,
      department.name,
      department.description,
    ]);
  }
  for (const shift of seedShifts) {
    await pool.query("INSERT IGNORE INTO shifts (id, name, start_time, end_time) VALUES (?, ?, ?, ?)", [
      shift.id,
      shift.name,
      shift.startTime,
      shift.endTime,
    ]);
  }
  for (const status of seedHousekeepingStatuses) {
    await pool.query("INSERT IGNORE INTO housekeeping_status (code, label, sort_order) VALUES (?, ?, ?)", [
      status.code,
      status.label,
      status.sortOrder,
    ]);
  }

  const now = new Date();

  await db
    .insert(schema.systemSettings)
    .values({ ...seedSettings, updatedAt: now })
    .onDuplicateKeyUpdate({
      set: {
        hotelName: sql`values(hotel_name)`,
        legalName: sql`values(legal_name)`,
        email: sql`values(email)`,
        phone: sql`values(phone)`,
        website: sql`values(website)`,
        addressLine1: sql`values(address_line_1)`,
        addressLine2: sql`values(address_line_2)`,
        city: sql`values(city)`,
        state: sql`values(state)`,
        postalCode: sql`values(postal_code)`,
        country: sql`values(country)`,
        timezone: sql`values(timezone)`,
        currency: sql`values(currency)`,
        taxRateBps: sql`values(tax_rate_bps)`,
        checkInTime: sql`values(check_in_time)`,
        checkOutTime: sql`values(check_out_time)`,
        invoicePrefix: sql`values(invoice_prefix)`,
        invoiceFooter: sql`values(invoice_footer)`,
        cancellationPolicy: sql`values(cancellation_policy)`,
        cancellationCutoffHours: sql`values(cancellation_cutoff_hours)`,
        reservationHoldHours: sql`values(reservation_hold_hours)`,
        logoUrl: sql`values(logo_url)`,
        updatedAt: now,
      },
    });

  await db.insert(schema.hotels).values(seedHotels.map((hotel) => ({ ...hotel, updatedAt: now })));
  await db.insert(schema.branches).values(seedBranches.map((branch) => ({ ...branch, updatedAt: now })));

  await db.insert(schema.roomTypes).values(seedRoomTypes.map(({ amenities, ...type }) => ({ ...type, updatedAt: now })));
  await db.insert(schema.roomTypeAmenities).values(
    seedRoomTypes.flatMap((type) =>
      type.amenities.map((amenity, index) => ({
        id: `${type.id}-amenity-${index + 1}`,
        roomTypeId: type.id,
        amenity,
        sortOrder: index,
      })),
    ),
  );
  await db.insert(schema.rooms).values(seedRooms.map((room) => ({ ...room, updatedAt: now })));
  await db.insert(schema.roomAmenities).values(seedRoomAmenities);

  await db.insert(schema.guests).values(seedGuests.map((guest) => ({ ...guest, updatedAt: now })));
  await db.insert(schema.staff).values(seedStaff.map((person) => ({ ...person, updatedAt: now })));

  if (env.isProduction) {
    console.warn(
      "WARNING: seeding demo accounts with a well-known password. Do not run the demo seed against production data.",
    );
  }
  const passwordHashes = new Map<string, string>();
  const userRows: Array<typeof schema.users.$inferInsert> = [];
  for (const { password, ...user } of seedUsers) {
    let passwordHash = passwordHashes.get(password);
    if (!passwordHash) {
      passwordHash = await hashPassword(password);
      passwordHashes.set(password, passwordHash);
    }
    userRows.push({ ...user, passwordHash, updatedAt: now });
  }
  await db.insert(schema.users).values(userRows);
  await db.insert(schema.sessions).values(seedSessions);
  await db.insert(schema.passwordResetTokens).values(seedPasswordResetTokens);
  await db.insert(schema.invitations).values(seedInvitations);

  await db.insert(schema.reservations).values(seedReservations.map((reservation) => ({ ...reservation, updatedAt: now })));
  await db.insert(schema.reservationGuests).values(seedReservationGuests);
  await db.insert(schema.reservationStatusHistory).values(seedReservationStatusHistory);
  await db.insert(schema.checkIns).values(seedCheckIns);
  await db.insert(schema.checkOuts).values(seedCheckOuts);

  await db.insert(schema.payments).values(seedPayments);
  await db.insert(schema.invoices).values(seedInvoices);
  await db.insert(schema.invoiceItems).values(seedInvoiceItems);
  await db.insert(schema.refunds).values(seedRefunds);

  await db.insert(schema.housekeepingTasks).values(
    seedHousekeepingTasks.map((task) => ({ ...task, updatedAt: now })),
  );
  await db.insert(schema.housekeepingTaskHistory).values(seedHousekeepingTaskHistory);
  await db.insert(schema.attendance).values(seedAttendance.map((record) => ({ ...record, updatedAt: now })));
  await db.insert(schema.leaveRequests).values(seedLeaveRequests.map((request) => ({ ...request, updatedAt: now })));

  await db.insert(schema.suppliers).values(seedSuppliers);
  await db.insert(schema.inventory).values(seedInventory.map((item) => ({ ...item, updatedAt: now })));
  await db.insert(schema.inventoryTransactions).values(seedInventoryTransactions);
  await db.insert(schema.expenses).values(seedExpenses.map((item) => ({ ...item, updatedAt: now })));

  await db
    .insert(schema.restaurantMenuCategories)
    .values(seedMenuCategories.map((category) => ({ ...category, updatedAt: now })));
  await db
    .insert(schema.restaurantMenuItems)
    .values(seedMenuItems.map((item) => ({ ...item, updatedAt: now })));
  await db
    .insert(schema.restaurantOrders)
    .values(seedRestaurantOrders.map((order) => ({ ...order, updatedAt: now })));
  await db.insert(schema.restaurantOrderItems).values(seedRestaurantOrderItems);

  await db.insert(schema.activityLogs).values(seedActivities);
  await db.insert(schema.notifications).values(seedNotifications);

  await createAdminFromEnv();
  console.log("Demo data seeded.");
}

if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
