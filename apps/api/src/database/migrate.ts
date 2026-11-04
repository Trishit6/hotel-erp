import fs from "node:fs";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./client";
import { ensureDatabaseExists } from "./ensure";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../drizzle/migrations");

async function appliedMigrations(): Promise<Set<string>> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT name FROM schema_migrations");
  return new Set(rows.map((row) => String(row.name)));
}

export async function migrate(): Promise<string[]> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS `schema_migrations` (`name` varchar(191) NOT NULL, `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`name`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const applied = await appliedMigrations();
  const ran: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
      await connection.commit();
      ran.push(file);
    } catch (error) {
      await connection.rollback();
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    } finally {
      connection.release();
    }
  }

  return ran;
}

if (require.main === module) {
  ensureDatabaseExists()
    .then(() => migrate())
    .then((ran) => {
      console.log(ran.length ? `Applied migrations: ${ran.join(", ")}` : "Database already up to date.");
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
