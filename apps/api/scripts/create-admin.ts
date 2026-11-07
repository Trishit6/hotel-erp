import "dotenv/config";
import { hashPassword } from "../src/services/password";
import { closeDatabase, pool } from "../src/database/client";
import { ensureDatabaseExists } from "../src/database/reset";
import { migrate } from "../src/database/migrate";
import { seedRolesOnly } from "../src/database/seed";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/**
 * One-time local bootstrap for the initial super administrator.
 *
 * There is no public setup endpoint. This command only creates the first
 * administrator, never drops existing data, and refuses to run once an active
 * super administrator exists.
 */
async function main() {
  const email = (arg("email") ?? process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = arg("password") ?? process.env.SEED_ADMIN_PASSWORD ?? "";
  const name = arg("name") ?? process.env.SEED_ADMIN_NAME ?? "RIVR Administrator";

  if (!email || !password) {
    throw new Error("Provide --email and --password (or SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).");
  }
  if (password.length < 12) {
    throw new Error("The administrator password must be at least 12 characters.");
  }

  await ensureDatabaseExists();
  await migrate();
  await seedRolesOnly();

  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'super-admin' AND is_active = 1");
  const existing = Number((rows as { count: number }[])[0]?.count ?? 0);
  if (existing > 0) {
    throw new Error(
      "An active super administrator already exists. Sign in and create further accounts from Settings, or deactivate the existing administrator first.",
    );
  }

  const passwordHash = await hashPassword(password);
  const id = `user-${Date.now()}`;
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, is_active, updated_at) VALUES (?, ?, ?, ?, 'super-admin', 1, UTC_TIMESTAMP())",
    [id, name, email, passwordHash],
  );
  console.log(`Super admin created for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
