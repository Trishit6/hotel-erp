import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import * as schema from "./schema";
import { ensureDatabaseExists } from "./ensure";
import { migrate } from "./migrate";
import { createAdminFromEnv } from "./reset";
import {
  seedActivities,
  seedAttendance,
  seedExpenses,
  seedGuests,
  seedHousekeepingTasks,
  seedInventory,
  seedInvoices,
  seedPayments,
  seedReservations,
  seedRestaurantOrders,
  seedRoles,
  seedRoomTypes,
  seedRooms,
  seedSettings,
  seedStaff,
} from "./seed-data";

const BUSINESS_TABLES = [
  "activity_logs",
  "restaurant_orders",
  "expenses",
  "inventory",
  "attendance",
  "housekeeping_tasks",
  "invoices",
  "payments",
  "reservations",
  "guests",
  "rooms",
  "room_type_amenities",
  "room_types",
  "sessions",
  "users",
  "staff",
  "system_settings",
] as const;

export async function clearBusinessData(): Promise<void> {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const table of BUSINESS_TABLES) {
      await pool.query(`DELETE FROM \`${table}\``);
    }
  } finally {
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

export async function seedRolesOnly(): Promise<void> {
  await db
    .insert(schema.roles)
    .values([...seedRoles])
    .onDuplicateKeyUpdate({
      set: { name: sql`values(name)`, description: sql`values(description)` },
    });
}

export async function seedDatabase(): Promise<void> {
  await ensureDatabaseExists();
  await migrate();
  await clearBusinessData();
  await seedRolesOnly();

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
        updatedAt: now,
      },
    });

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
  await db.insert(schema.guests).values(seedGuests.map((guest) => ({ ...guest, updatedAt: now })));
  await db.insert(schema.staff).values(seedStaff.map((person) => ({ ...person, updatedAt: now })));
  await db.insert(schema.reservations).values(seedReservations.map((reservation) => ({ ...reservation, updatedAt: now })));
  await db.insert(schema.payments).values([...seedPayments]);
  await db.insert(schema.invoices).values([...seedInvoices]);
  await db.insert(schema.housekeepingTasks).values(seedHousekeepingTasks.map((task) => ({ ...task, updatedAt: now })));
  await db.insert(schema.attendance).values(seedAttendance.map((record) => ({ ...record, updatedAt: now })));
  await db.insert(schema.inventory).values(seedInventory.map((item) => ({ ...item, updatedAt: now })));
  await db.insert(schema.expenses).values(seedExpenses.map((item) => ({ ...item, updatedAt: now })));
  await db
    .insert(schema.restaurantOrders)
    .values(seedRestaurantOrders.map((order) => ({ ...order, updatedAt: now })));
  await db.insert(schema.activityLogs).values([...seedActivities]);

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
