import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from the current working directory first, then fall back to the
// API package root. This keeps `pnpm --filter @rivr/api dev` and a compiled
// `node apps/api/dist/server.js` working from either directory.
dotenv.config({ quiet: true });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === "boolean" ? value : ["1", "true", "yes", "on"].includes(value.toLowerCase())));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("rivr_hotel"),
  SESSION_SECRET: z.string().default(""),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  COOKIE_NAME: z.string().default("rivr_session"),
  COOKIE_SECURE: booleanish.default(false),
  SETUP_TOKEN: z.string().default(""),
  ALLOW_DEMO_RESET: booleanish.default(false),
  SEED_ADMIN_EMAIL: z.string().default(""),
  SEED_ADMIN_PASSWORD: z.string().default(""),
  SEED_ADMIN_NAME: z.string().default("RIVR Administrator"),
});

const parsed = schema.parse(process.env);

if (parsed.NODE_ENV === "production" && parsed.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters in production.");
}

export const env = {
  nodeEnv: parsed.NODE_ENV,
  isProduction: parsed.NODE_ENV === "production",
  isTest: parsed.NODE_ENV === "test",
  port: parsed.PORT,
  webOrigins: parsed.WEB_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: parsed.DB_HOST,
    port: parsed.DB_PORT,
    user: parsed.DB_USER,
    password: parsed.DB_PASSWORD,
    database: parsed.DB_NAME,
  },
  session: {
    secret: parsed.SESSION_SECRET || "dev-only-insecure-session-secret-change-me",
    ttlHours: parsed.SESSION_TTL_HOURS,
    cookieName: parsed.COOKIE_NAME,
    cookieSecure: parsed.COOKIE_SECURE,
  },
  setupToken: parsed.SETUP_TOKEN,
  allowDemoReset: parsed.ALLOW_DEMO_RESET && parsed.NODE_ENV !== "production",
  seedAdmin: {
    email: parsed.SEED_ADMIN_EMAIL,
    password: parsed.SEED_ADMIN_PASSWORD,
    name: parsed.SEED_ADMIN_NAME,
  },
} as const;
