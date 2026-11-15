/**
 * Policy guard for the destructive demo seed.
 *
 * `seedDatabase()` deletes every row in `BUSINESS_TABLES` (including users and
 * sessions) before inserting demo data. That is correct for local development
 * and tests, but never for a production database, so the guard is a hard
 * refusal rather than a warning.
 */
export function assertDemoSeedAllowed(isProduction: boolean): void {
  if (!isProduction) return;
  throw new Error(
    "Refusing to run the demo seed with NODE_ENV=production: it deletes users, sessions and business records before inserting demo data. Restore a non-production database instead.",
  );
}
