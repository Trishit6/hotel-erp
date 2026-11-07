import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { resetTestDatabase, setupAdmin } from "./helpers";

const app = createApp();

describe("unified authentication and role permissions", () => {
  let admin: ReturnType<typeof request.agent>;
  let adminCredentials: { email: string; password: string };

  beforeAll(async () => {
    await resetTestDatabase();
    admin = request.agent(app);
    adminCredentials = await setupAdmin(admin);
  });

  it("no longer exposes a public bootstrap endpoint", async () => {
    const response = await request(app).post("/api/auth/setup").send({
      name: "Intruder",
      email: "intruder@test.local",
      password: "Intruder@12345",
      setupToken: "anything",
    });
    expect(response.status).toBe(404);
  });

  it("registers public signups as customers and never as staff", async () => {
    const agent = request.agent(app);
    const created = await agent.post("/api/auth/register").send({
      name: "Customer One",
      email: "customer@test.local",
      phone: "9876543210",
      password: "Customer@12345",
      role: "super-admin",
    });
    expect(created.status).toBe(201);
    expect(created.body.user.role).toBe("customer");
    expect(created.body.redirect).toBe("/guest/dashboard");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("customer");

    // Customer accounts are rejected by every staff endpoint.
    const bootstrap = await agent.get("/api/admin/bootstrap");
    expect(bootstrap.status).toBe(403);

    const overview = await agent.get("/api/account/overview");
    expect(overview.status).toBe(200);
    expect(overview.body.user.email).toBe("customer@test.local");

    // Staff endpoints are not reachable with a customer session even when the
    // customer can read their own account.
    const staffLogin = await agent.post("/api/auth/login").send({
      email: "customer@test.local",
      password: "Customer@12345",
    });
    expect(staffLogin.status).toBe(200);
    expect(staffLogin.body.redirect).toBe("/guest/dashboard");
  });

  it("validates the session, logs out, and rejects bad credentials", async () => {
    const me = await admin.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(adminCredentials.email);
    expect(me.body.user.role).toBe("super-admin");
    expect(me.body.redirect).toBe("/admin/dashboard");

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
    expect(login.body.redirect).toBe("/reception/dashboard");

    const forbiddenUsers = await receptionist.get("/api/admin/users");
    expect(forbiddenUsers.status).toBe(403);

    const bootstrap = await receptionist.get("/api/admin/bootstrap");
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.users).toEqual([]);
    expect(bootstrap.body.reservations).toBeDefined();
  });

  it("does not let an administrator create a customer through the staff endpoint", async () => {
    const response = await admin.post("/api/admin/users").send({
      name: "Sneaky Customer",
      email: "sneaky@test.local",
      password: "SneakyCustomer@123",
      role: "customer",
    });
    expect(response.status).toBe(400);
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
    expect(login.body.redirect).toBe("/housekeeping/dashboard");

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

    // Financial modules stay closed to housekeeping.
    const forbiddenExpenses = await housekeeping.get("/api/admin/expenses");
    expect(forbiddenExpenses.status).toBe(403);
  });

  it("issues a single-use password reset token", async () => {
    const requestReset = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "housekeeping@test.local" });
    expect(requestReset.status).toBe(200);
    const token = requestReset.body.resetToken as string;
    expect(token).toBeTruthy();

    const unknown = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@test.local" });
    expect(unknown.status).toBe(200);
    expect(unknown.body.resetToken).toBeUndefined();

    const reset = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "Housekeeping@98765",
    });
    expect(reset.status).toBe(204);

    const reuse = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "Housekeeping@00000",
    });
    expect(reuse.status).toBe(400);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "housekeeping@test.local", password: "Housekeeping@98765" });
    expect(login.status).toBe(200);
  });

  it("keeps customer reservations private", async () => {
    const other = request.agent(app);
    await other.post("/api/auth/register").send({
      name: "Customer Two",
      email: "customer.two@test.local",
      phone: "9876500000",
      password: "CustomerTwo@12345",
    });
    const overview = await other.get("/api/account/overview");
    expect(overview.status).toBe(200);
    expect(overview.body.reservations).toEqual([]);
    expect(overview.body.overview).toBeUndefined();

    const cancel = await other.post("/api/account/reservations/does-not-exist/cancel");
    expect(cancel.status).toBe(404);
  });
});
