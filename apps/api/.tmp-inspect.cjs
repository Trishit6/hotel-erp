require("dotenv").config();
const mysql = require("mysql2/promise");

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [meta] = await c.query("SELECT VERSION() AS version, DATABASE() AS db, @@port AS port, @@character_set_database AS charset");
  console.log("META " + JSON.stringify(meta[0]));

  const [tables] = await c.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
  );
  console.log("TABLES " + tables.map((t) => t.TABLE_NAME).join(","));

  const wanted = [
    "roles", "users", "staff", "sessions", "system_settings", "room_types",
    "room_type_amenities", "rooms", "guests", "reservations", "payments",
    "invoices", "housekeeping_tasks", "inventory", "expenses",
    "restaurant_orders", "attendance", "activity_logs",
  ];
  for (const t of wanted) {
    try {
      const [r] = await c.query("SELECT COUNT(*) AS n FROM `" + t + "`");
      console.log("COUNT " + t + " " + r[0].n);
    } catch (e) {
      console.log("COUNT " + t + " ERROR " + e.code);
    }
  }

  const [roles] = await c.query("SELECT code, name FROM roles ORDER BY code");
  console.log("ROLES " + JSON.stringify(roles));
  const [byRole] = await c.query("SELECT role, COUNT(*) AS n FROM users GROUP BY role ORDER BY role");
  console.log("USERS_BY_ROLE " + JSON.stringify(byRole));
  const [settings] = await c.query(
    "SELECT id, hotel_name, city, state, country, timezone, currency, tax_rate_bps, check_in_time, check_out_time, invoice_prefix, email, phone FROM system_settings LIMIT 5"
  );
  console.log("SETTINGS " + JSON.stringify(settings));
  const [migrations] = await c.query("SELECT filename, applied_at FROM schema_migrations ORDER BY filename");
  console.log("MIGRATIONS " + JSON.stringify(migrations));

  for (const table of ["users", "staff", "system_settings", "restaurant_orders", "inventory", "housekeeping_tasks"]) {
    const [cols] = await c.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
      [table]
    );
    console.log("COLUMNS " + table + " " + JSON.stringify(cols));
  }

  const [fk] = await c.query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, CONSTRAINT_NAME"
  );
  console.log("FK " + JSON.stringify(fk));

  await c.end();
})().catch((e) => {
  console.error("DB_CHECK_FAILED", e.code || e.message);
  process.exit(1);
});
