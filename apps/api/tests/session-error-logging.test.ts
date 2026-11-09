import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const findSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/session")>();
  return { ...actual, findSession: findSessionMock };
});

import { createApp } from "../src/app";

const app = createApp();

describe("session lookup error logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    findSessionMock.mockReset();
  });

  it("logs a sanitized error and preserves the client-facing 401", async () => {
    findSessionMock.mockRejectedValue(new Error("database connection refused"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = "secret-session-token-value";

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `rivr_session=${token}`);

    expect(response.status).toBe(401);
    expect(errorSpy).toHaveBeenCalledWith("[auth] session lookup failed");
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain(token);
    expect(logged).not.toContain("rivr_session");
    expect(logged).not.toContain("database connection refused");
  });
});
