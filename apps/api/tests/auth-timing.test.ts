import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const verifyPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/password")>();
  return { ...actual, verifyPassword: verifyPasswordMock };
});

import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { users } from "../src/database/schema";
import { authenticate } from "../src/services/users";
import { resetTestDatabase } from "./helpers";

const app = createApp();
const STORED_INACTIVE_HASH = "stored-inactive-password-hash";

describe("authentication timing paths", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await db.insert(users).values({
      id: "user-inactive-timing",
      name: "Inactive Timing User",
      email: "inactive.timing@test.local",
      passwordHash: STORED_INACTIVE_HASH,
      role: "staff",
      staffId: null,
      isActive: false,
      updatedAt: new Date(),
    });
  });

  it("uses the same dummy hash for missing and inactive accounts", async () => {
    verifyPasswordMock.mockReset();
    verifyPasswordMock.mockResolvedValue(false);

    expect(await authenticate("missing.timing@test.local", "wrong-password")).toBeNull();
    expect(await authenticate("inactive.timing@test.local", "wrong-password")).toBeNull();

    expect(verifyPasswordMock).toHaveBeenCalledTimes(2);
    const missingHash = verifyPasswordMock.mock.calls[0][0] as string;
    const inactiveHash = verifyPasswordMock.mock.calls[1][0] as string;
    expect(inactiveHash).toBe(missingHash);
    expect(inactiveHash).not.toBe(STORED_INACTIVE_HASH);
  });

  it("returns identical client responses for missing and inactive accounts", async () => {
    verifyPasswordMock.mockResolvedValue(false);
    const missing = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing.timing@test.local", password: "wrong-password" });
    const inactive = await request(app)
      .post("/api/auth/login")
      .send({ email: "inactive.timing@test.local", password: "wrong-password" });

    expect(missing.status).toBe(401);
    expect(inactive.status).toBe(401);
    expect(missing.body).toEqual(inactive.body);
    expect(JSON.stringify(missing.body)).not.toContain("missing.timing@test.local");
    expect(JSON.stringify(inactive.body)).not.toContain("inactive.timing@test.local");
  });
});
