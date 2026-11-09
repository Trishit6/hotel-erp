import path from "node:path";
import { isIP } from "node:net";
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
  TRUST_PROXY: z.string().default("loopback"),
  ALLOW_DEMO_RESET: booleanish.default(false),
  SEED_ADMIN_EMAIL: z.string().default(""),
  SEED_ADMIN_PASSWORD: z.string().default(""),
  SEED_ADMIN_NAME: z.string().default("RIVR Administrator"),
});

function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (isIP(host) === 4) return host.split(".")[0] === "127";
  if (isIP(host) === 6) return host === "::1" || host === "0:0:0:0:0:0:0:1";
  return false;
}

function parseWebOrigins(raw: string): string[] {
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) throw new Error("WEB_ORIGIN must contain at least one valid origin.");

  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`WEB_ORIGIN contains an invalid origin: ${origin}`);
    }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`WEB_ORIGIN contains an invalid origin: ${origin}`);
    }
  }
  return origins;
}

function resolveTrustProxy(raw: string): false | "loopback" | "linklocal" | "uniquelocal" | number {
  const value = raw.trim().toLowerCase();
  if (value === "false") return false;
  if (value === "loopback" || value === "linklocal" || value === "uniquelocal") return value;
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (hops >= 1 && hops <= 10) return hops;
  }
  throw new Error(
    "TRUST_PROXY must be false, loopback, linklocal, uniquelocal, or a hop count between 1 and 10.",
  );
}

export function parseEnv(source: NodeJS.ProcessEnv) {
  const parsed = schema.parse(source);
  const webOrigins = parseWebOrigins(parsed.WEB_ORIGIN);
  const trustProxy = resolveTrustProxy(parsed.TRUST_PROXY);

  if (parsed.NODE_ENV === "production") {
    if (parsed.SESSION_SECRET.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters in production.");
    }
    if (!parsed.COOKIE_SECURE) {
      throw new Error("COOKIE_SECURE must be explicitly true in production.");
    }
    for (const origin of webOrigins) {
      if (isLoopbackHostname(new URL(origin).hostname)) {
        throw new Error("WEB_ORIGIN must not use localhost or a loopback address in production.");
      }
    }
  }

  return { ...parsed, webOrigins, trustProxy };
}

const parsed = parseEnv(process.env);

export const env = {
  nodeEnv: parsed.NODE_ENV,
  isProduction: parsed.NODE_ENV === "production",
  isTest: parsed.NODE_ENV === "test",
  port: parsed.PORT,
  webOrigins: parsed.webOrigins,
  trustProxy: parsed.trustProxy,
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
    // Secure cookies are mandatory in production; the explicit check above
    // prevents a deployment from silently relying on this fallback.
    cookieSecure: parsed.COOKIE_SECURE || parsed.NODE_ENV === "production",
  },
  allowDemoReset: parsed.ALLOW_DEMO_RESET && parsed.NODE_ENV !== "production",
  seedAdmin: {
    email: parsed.SEED_ADMIN_EMAIL,
    password: parsed.SEED_ADMIN_PASSWORD,
    name: parsed.SEED_ADMIN_NAME,
  },
} as const;
