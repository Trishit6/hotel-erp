import { pool } from "../database/client";
import { seedRoles } from "../database/seed-data";
import { PERMISSIONS } from "./permissions";

/**
 * Insert the canonical role catalogue without touching roles that already exist.
 *
 * `users.role` and `staff.role` are foreign keys to `roles.code`, so first-run
 * setup must work even on a database where the roles table has not been seeded.
 * `INSERT IGNORE` keeps this safe to call on every setup attempt and never
 * overwrites an existing role record.
 */
export async function ensureRoles(): Promise<void> {
  for (const role of seedRoles) {
    await pool.query(
      "INSERT IGNORE INTO roles (code, name, description) VALUES (?, ?, ?)",
      [role.code, role.name, role.description],
    );
  }
  await syncPermissions();
}

/**
 * Mirror the TypeScript permission catalogue into `permissions` and
 * `role_permissions`. `PERMISSIONS` remains the enforcement source; the tables
 * give the matrix a queryable, auditable form.
 */
export async function syncPermissions(): Promise<void> {
  for (const [code, roles] of Object.entries(PERMISSIONS)) {
    await pool.query("INSERT IGNORE INTO permissions (code, description) VALUES (?, ?)", [code, ""]);
    // Reconcile removals as well as additions so the tables never drift from
    // the TypeScript matrix.
    await pool.query("DELETE FROM role_permissions WHERE permission_code = ?", [code]);
    for (const role of roles as readonly string[]) {
      await pool.query(
        "INSERT IGNORE INTO role_permissions (role_code, permission_code) VALUES (?, ?)",
        [role, code],
      );
    }
  }
}
