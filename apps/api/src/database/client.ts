import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../config/env";
import * as schema from "./schema";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  // Keep JS Date <-> SQL conversion aligned with the database server timezone.
  // In production run both MariaDB and the API in UTC.
  timezone: "local",
  // DATE columns are date-only business values; keep them as YYYY-MM-DD strings.
  dateStrings: ["DATE"],
});

// Drizzle treats MySQL TIMESTAMP/DATETIME values as UTC. Force every pooled
// connection to UTC so CURRENT_TIMESTAMP defaults match application Dates.
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export const db = drizzle(pool, { schema, mode: "default" });

export type DbClient = typeof db;
export type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export async function pingDatabase(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
