import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "../services/password";
import { env } from "../config/env";
import { pool } from "./client";
import { ensureDatabaseExists } from "./ensure";
import { migrate } from "./migrate";

export { ensureDatabaseExists };

export const TABLES = [
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
  "roles",
  "schema_migrations",
] as const;

/** Remove every application table. Used by tests and the explicit dev reset command. */
export async function dropAllTables(): Promise<void> {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const table of TABLES) {
      await pool.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  } finally {
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

export async function resetDatabase(): Promise<void> {
  await ensureDatabaseExists();
  await dropAllTables();
  await migrate();
}

export async function runSqlFile(relativePath: string): Promise<void> {
  const sql = fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
  for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) {
    await pool.query(statement);
  }
}

export async function createAdminFromEnv(): Promise<void> {
  if (!env.seedAdmin.email || !env.seedAdmin.password) {
    console.log("Skipping admin creation: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are not both set.");
    return;
  }
  const passwordHash = await hashPassword(env.seedAdmin.password);
  const id = `user-${Date.now()}`;
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, is_active, updated_at) VALUES (?, ?, ?, ?, 'super-admin', 1, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = 'super-admin', is_active = 1, updated_at = UTC_TIMESTAMP()",
    [id, env.seedAdmin.name, env.seedAdmin.email.toLowerCase(), passwordHash],
  );
  console.log(`Admin account ready for ${env.seedAdmin.email.toLowerCase()}.`);
}
