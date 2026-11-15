import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { resolveTestDatabaseName } from "./database-guard";

// Load the API environment first so the guard compares the *configured* DB_NAME
// and DB_TEST_NAME, not just values exported in the current shell. dotenv never
// overrides variables that are already set.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

process.env.NODE_ENV = "test";

// The suite drops every table in this database. Fail fast (before `config/env`
// loads) when DB_TEST_NAME is missing a "test" segment or points at DB_NAME.
process.env.DB_NAME = resolveTestDatabaseName({
  dbTestName: process.env.DB_TEST_NAME,
  configuredDatabase: process.env.DB_NAME,
});
process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef0123456789";
process.env.ALLOW_DEMO_RESET = "false";
process.env.SEED_ADMIN_EMAIL = "";
process.env.SEED_ADMIN_PASSWORD = "";
process.env.COOKIE_SECURE = "false";
process.env.WEB_ORIGIN = "http://localhost:5173";
