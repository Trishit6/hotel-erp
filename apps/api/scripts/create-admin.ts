import "dotenv/config";
import { hashPassword } from "../src/services/password";
import { closeDatabase, pool } from "../src/database/client";
import { ensureDatabaseExists, resetDatabase } from "../src/database/reset";
import { seedRolesOnly } from "../src/database/seed";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

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
  await resetDatabase();
  await seedRolesOnly();

  const passwordHash = await hashPassword(password);
  const id = `user-${Date.now()}`;
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, is_active, updated_at) VALUES (?, ?, ?, ?, 'super-admin', 1, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name), role = 'super-admin', is_active = 1, updated_at = UTC_TIMESTAMP()",
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
