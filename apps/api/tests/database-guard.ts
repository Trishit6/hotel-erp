/**
 * Fail-fast guard for the destructive integration-test database.
 *
 * The suite drops every table in the configured database, so the name must be
 * unmistakably a test database. Keeping this pure makes it unit-testable
 * without loading the environment or opening a connection.
 */
const TEST_SEGMENT = /(^|[_-])test([_-]|$)/i;
export const DEFAULT_TEST_DATABASE = "rivr_hotel_test";

export function resolveTestDatabaseName(input: {
  dbTestName?: string;
  configuredDatabase?: string;
}): string {
  const database = (input.dbTestName ?? "").trim() || DEFAULT_TEST_DATABASE;
  const configured = (input.configuredDatabase ?? "").trim();

  if (!TEST_SEGMENT.test(database)) {
    throw new Error(
      `Refusing to run database-backed tests against "${database}": DB_TEST_NAME must contain a "test" segment (for example ${DEFAULT_TEST_DATABASE}) because the suite drops every table in that schema.`,
    );
  }

  if (configured && configured.toLowerCase() === database.toLowerCase()) {
    throw new Error(
      `Refusing to run database-backed tests: DB_TEST_NAME and DB_NAME both resolve to "${database}". Tests drop every table, so the test database must be separate.`,
    );
  }

  return database;
}
