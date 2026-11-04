import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { resetTestDatabase, setupAdmin } from "./helpers";

const app = createApp();

describe("authentication and role permissions", () => {
  let admin: ReturnType<typeof request.agent>;
  let adminCredentials: { email: string; password: string };

  beforeAll(async () => {
    await resetTestDatabase();
    admin = request.agent(app);
    adminCredentials = await setupAdmin(admin);
  });

  it("rejects a bad setup token and completes one-time setup", async () => {
    const second = request.agent(app);
    const bad = await second.post("/api/auth/setup").send({
      name: "Intruder",
      email: "intruder@test.local",
      password: "Intruder@12345",
      setupToken: "wrong-token",
    });
    expect(bad.status).toBe(403);

    const repeat = await second.post("/api/auth/setup").send({
      name: "Another",
      email: "another@test.local",
      password: "Another@12345",
      setupToken: process.env.SETUP_TOKEN,
    });
    expect(repeat.status).toBe(409);
  });

  it("validates the session, logs out, and rejects bad credentials", async () => {
    const me = await admin.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(adminCredentials.email);
    expect(me.body.user.role).toBe("super-admin");

    const logout = await admin.post("/api/auth/logout");
    expect(logout.status).toBe(204);

    const afterLogout = await admin.get("/api/auth/me");
    expect(afterLogout.status).toBe(401);

    const wrong = await admin
      .post("/api/auth/login")
      .send({ email: adminCredentials.email, password: "WrongPassword123" });
    expect(wrong.status).toBe(401);

    const login = await admin
      .post("/api/auth/login")
      .send({ email: adminCredentials.email, password: adminCredentials.password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("super-admin");
  });

  it("enforces server-side role permissions", async () => {
    const createReceptionist = await admin.post("/api/admin/users").send({
      name: "Reception Test",
      email: "reception@test.local",
      password: "Reception@12345",
      role: "receptionist",
    });
    expect(createReceptionist.status).toBe(201);

    const receptionist = request.agent(app);
    const login = await receptionist
      .post("/api/auth/login")
      .send({ email: "reception@test.local", password: "Reception@12345" });
    expect(login.status).toBe(200);

    const forbiddenUsers = await receptionist.get("/api/admin/users");
    expect(forbiddenUsers.status).toBe(403);

    const bootstrap = await receptionist.get("/api/admin/bootstrap");
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.users).toEqual([]);
    expect(bootstrap.body.reservations).toBeDefined();
  });

  it("changes a password and invalidates the old one", async () => {
    const createHousekeeping = await admin.post("/api/admin/users").send({
      name: "Housekeeping Test",
      email: "housekeeping@test.local",
      password: "Housekeeping@12345",
      role: "housekeeping",
    });
    expect(createHousekeeping.status).toBe(201);

    const housekeeping = request.agent(app);
    const login = await housekeeping
      .post("/api/auth/login")
      .send({ email: "housekeeping@test.local", password: "Housekeeping@12345" });
    expect(login.status).toBe(200);

    const change = await housekeeping.post("/api/auth/change-password").send({
      currentPassword: "Housekeeping@12345",
      newPassword: "Housekeeping@54321",
    });
    expect(change.status).toBe(204);

    await housekeeping.post("/api/auth/logout");
    const oldLogin = await housekeeping
      .post("/api/auth/login")
      .send({ email: "housekeeping@test.local", password: "Housekeeping@12345" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await housekeeping
      .post("/api/auth/login")
      .send({ email: "housekeeping@test.local", password: "Housekeeping@54321" });
    expect(newLogin.status).toBe(200);

    const forbiddenExpenses = await housekeeping.get("/api/admin/expenses");
    expect(forbiddenExpenses.status).toBe(403);
  });
});
