import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { parseEnv } from "../src/config/env";
import { globalLimiter } from "../src/middleware/rateLimit";

const production = {
  NODE_ENV: "production",
  SESSION_SECRET: "s".repeat(32),
  COOKIE_SECURE: "true",
  WEB_ORIGIN: "https://hotel.example.com",
  TRUST_PROXY: "loopback",
};

describe("environment validation", () => {
  it("accepts a valid production configuration", () => {
    const parsed = parseEnv(production);
    expect(parsed.webOrigins).toEqual(["https://hotel.example.com"]);
    expect(parsed.trustProxy).toBe("loopback");
  });

  it("rejects insecure production cookies", () => {
    expect(() => parseEnv({ ...production, COOKIE_SECURE: "false" })).toThrow(
      /COOKIE_SECURE must be explicitly true/,
    );
    expect(() => parseEnv({ ...production, COOKIE_SECURE: undefined })).toThrow(
      /COOKIE_SECURE must be explicitly true/,
    );
  });

  it("rejects localhost and loopback production origins", () => {
    for (const origin of [
      "https://localhost:5173",
      "https://127.0.0.1:5173",
      "https://127.42.0.1",
      "https://[::1]:5173",
      "https://app.localhost",
    ]) {
      expect(() => parseEnv({ ...production, WEB_ORIGIN: origin })).toThrow(/loopback/);
    }
    expect(() =>
      parseEnv({
        ...production,
        WEB_ORIGIN: "https://hotel.example.com,https://localhost:5173",
      }),
    ).toThrow(/loopback/);
  });

  it("rejects a short production session secret without echoing it", () => {
    const secret = "short-secret-value";
    try {
      parseEnv({ ...production, SESSION_SECRET: secret });
      throw new Error("expected production validation to fail");
    } catch (error) {
      expect((error as Error).message).toMatch(/SESSION_SECRET must be at least 32/);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it("rejects invalid TRUST_PROXY values and accepts validated forms", () => {
    for (const value of ["true", "all", "0", "11", "10.0.0.0/8", ""]) {
      expect(() => parseEnv({ ...production, TRUST_PROXY: value })).toThrow(/TRUST_PROXY must be/);
    }
    expect(parseEnv({ ...production, TRUST_PROXY: "false" }).trustProxy).toBe(false);
    expect(parseEnv({ ...production, TRUST_PROXY: "1" }).trustProxy).toBe(1);
    expect(parseEnv({ ...production, TRUST_PROXY: "uniquelocal" }).trustProxy).toBe("uniquelocal");
  });

  it("rejects malformed origins", () => {
    expect(() => parseEnv({ ...production, WEB_ORIGIN: "not-a-url" })).toThrow(/invalid origin/);
    expect(() => parseEnv({ ...production, WEB_ORIGIN: "ftp://hotel.example.com" })).toThrow(
      /invalid origin/,
    );
  });

  it("mounts the global limiter before session attachment", () => {
    const app = createApp();
    const stack = (
      app as unknown as {
        _router: { stack: Array<{ name: string; handle: { name?: string } }> };
      }
    )._router.stack;
    const attachIndex = stack.findIndex((layer) => layer.handle.name === "attachUser");
    expect(attachIndex).toBeGreaterThan(0);
    expect(stack[attachIndex - 1].handle).toBe(globalLimiter);
  });
});
