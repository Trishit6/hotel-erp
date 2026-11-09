import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createUser } from "../src/services/users";
import { dateAt } from "../src/utils/date";
import { resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

const PASSWORD = "Admin@12345678";

async function login(agent: ReturnType<typeof request.agent>, email: string, password = PASSWORD) {
  const response = await agent.post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(200);
}

describe("security audit regression checks", () => {
  const superAdmin = request.agent(app);
  const admin = request.agent(app);
  const housekeeping = request.agent(app);
  const generalStaff = request.agent(app);
  let superAdminId = "";
  let customerReservationReference = "";

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    await setupAdmin(superAdmin);

    await createUser({ name: "Admin Two", email: "admin2@test.local", password: PASSWORD, role: "admin" });
    await createUser({ name: "Housekeeping User", email: "housekeeping@test.local", password: PASSWORD, role: "housekeeping" });
    await createUser({ name: "General Staff", email: "staff@test.local", password: PASSWORD, role: "staff" });
    await login(admin, "admin2@test.local");
    await login(housekeeping, "housekeeping@test.local");
    await login(generalStaff, "staff@test.local");

    const usersResponse = await superAdmin.get("/api/admin/users");
    expect(usersResponse.status).toBe(200);
    superAdminId = (usersResponse.body.users as Array<{ id: string; role: string }>).find(
      (user) => user.role === "super-admin",
    )!.id;

    const staffResponse = await superAdmin.post("/api/admin/staff").send({
      name: "Riya Housekeeping",
      email: "riya.housekeeping@test.local",
      phone: "9876500000",
      department: "Housekeeping",
      role: "housekeeping",
      shift: "Morning",
      joinedAt: dateAt(-30),
    });
    expect(staffResponse.status).toBe(201);

    const bookingResponse = await request(app).post("/api/public/reservations").send({
      guestName: "Victim Guest",
      email: "victim@example.com",
      phone: "9876500001",
      roomId: "room-test",
      checkIn: dateAt(10),
      checkOut: dateAt(12),
      adults: 2,
      children: 0,
      specialRequests: "Security test",
      address: "123 Secret Lane",
      city: "Kolkata",
      state: "West Bengal",
      postalCode: "700001",
    });
    expect(bookingResponse.status).toBe(201);
    customerReservationReference = bookingResponse.body.reservation.reference;
  });

  it("prevents an admin from creating a super-admin account", async () => {
    const response = await admin.post("/api/admin/users").send({
      name: "Escalated Admin",
      email: "escalated@test.local",
      password: PASSWORD,
      role: "super-admin",
    });
    expect(response.status).toBe(403);
  });

  it("still lets an admin manage ordinary staff accounts", async () => {
    const response = await admin.post("/api/admin/users").send({
      name: "Manager Two",
      email: "manager2@test.local",
      password: PASSWORD,
      role: "manager",
    });
    expect(response.status).toBe(201);
  });

  it("prevents an admin from promoting themselves to super-admin", async () => {
    const usersResponse = await admin.get("/api/admin/users");
    const adminId = (usersResponse.body.users as Array<{ id: string; email: string }>).find(
      (user) => user.email === "admin2@test.local",
    )!.id;
    const response = await admin.patch(`/api/admin/users/${adminId}`).send({ role: "super-admin" });
    expect(response.status).toBe(403);
  });

  it("prevents an admin from taking over a super-admin account", async () => {
    const response = await admin.patch(`/api/admin/users/${superAdminId}`).send({
      password: "Attacker@12345678",
    });
    expect(response.status).toBe(403);
  });

  it("does not expose full staff records to a housekeeping bootstrap", async () => {
    const response = await housekeeping.get("/api/admin/bootstrap");
    expect(response.status).toBe(200);
    const staff = response.body.staff as Array<Record<string, unknown>>;
    expect(staff.length).toBeGreaterThan(0);
    expect(staff[0]).toMatchObject({ id: expect.any(String), name: expect.any(String) });
    expect(staff[0].email).toBeUndefined();
    expect(staff[0].phone).toBeUndefined();
    expect(staff[0].shift).toBeUndefined();
  });

  it("requires inventory write permission for supplier creation", async () => {
    const readResponse = await generalStaff.get("/api/admin/suppliers");
    expect(readResponse.status).toBe(200);
    const response = await generalStaff.post("/api/admin/suppliers").send({
      name: "Unauthorized Supplier",
      email: "supplier@example.com",
    });
    expect(response.status).toBe(403);
  });

  it("returns only allowlisted fields through verified public lookup", async () => {
    const response = await request(app).post("/api/public/reservations/verify").send({
      reference: customerReservationReference,
      email: "victim@example.com",
    });
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.reservation).sort()).toEqual(
      [
        "checkIn",
        "checkOut",
        "guestFirstName",
        "paidAmount",
        "paymentStatus",
        "reference",
        "roomNumber",
        "roomTypeName",
        "status",
        "total",
      ].sort(),
    );
    expect(response.body.reservation.guestFirstName).toBe("Victim");
    expect(JSON.stringify(response.body)).not.toContain("Victim Guest");
    expect(JSON.stringify(response.body)).not.toContain("victim@example.com");
    expect(JSON.stringify(response.body)).not.toContain("9876500001");
    expect(JSON.stringify(response.body)).not.toContain("123 Secret Lane");
  });

  it("removes the reference-only public detail endpoint", async () => {
    const response = await request(app).get(`/api/public/reservations/${customerReservationReference}`);
    expect(response.status).toBe(404);
  });

  it("rejects SQL injection payloads in credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin2@test.local", password: "' OR 1=1 --" });
    expect(response.status).toBe(401);
  });

  it("rejects sign-in for an inactive account", async () => {
    await createUser({
      name: "Inactive User",
      email: "inactive@test.local",
      password: PASSWORD,
      role: "staff",
    });
    const usersResponse = await superAdmin.get("/api/admin/users");
    const inactiveId = (usersResponse.body.users as Array<{ id: string; email: string }>).find(
      (user) => user.email === "inactive@test.local",
    )!.id;
    const deactivate = await superAdmin.patch(`/api/admin/users/${inactiveId}`).send({ isActive: false });
    expect(deactivate.status).toBe(200);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "inactive@test.local", password: PASSWORD });
    expect(loginResponse.status).toBe(401);
  });

  it("does not treat wildcard characters as a public lookup pattern", async () => {
    const response = await request(app).post("/api/public/reservations/verify").send({
      reference: "%' OR '1'='1",
      email: "victim@example.com",
    });
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Reservation not found.");
  });

  it("invalidates existing sessions after a password reset", async () => {
    const agent = request.agent(app);
    await login(agent, "housekeeping@test.local");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);

    const resetRequest = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "housekeeping@test.local" });
    expect(resetRequest.status).toBe(200);
    const token = resetRequest.body.resetToken as string;
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "NewHousekeeping@123" });
    expect(reset.status).toBe(204);

    const afterReset = await agent.get("/api/auth/me");
    expect(afterReset.status).toBe(401);
  });

  it("sets browser security headers and rejects disallowed CORS origins", async () => {
    const health = await request(app).get("/api/health");
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
    expect(health.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(health.headers["content-security-policy"]).toBeTruthy();

    const allowed = await request(app)
      .get("/api/public/catalog")
      .set("Origin", "http://localhost:5173");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const blocked = await request(app)
      .get("/api/public/catalog")
      .set("Origin", "https://evil.example");
    expect(blocked.status).toBe(403);
  });

  it("uses an HttpOnly SameSite session cookie and invalidates it on logout", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin2@test.local", password: PASSWORD });
    expect(loginResponse.status).toBe(200);
    const setCookie = (loginResponse.headers["set-cookie"] as unknown as string[])[0];
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    const cookie = setCookie.split(";")[0];

    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);

    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(204);

    const reuse = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(reuse.status).toBe(401);
  });

  it("rate-limits repeated failed login attempts", async () => {
    let limited = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@test.local", password: "wrong-password" });
      if (response.status === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
