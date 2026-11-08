import { eq } from "drizzle-orm";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db, pool } from "../src/database/client";
import { users } from "../src/database/schema";
import { seedDatabase } from "../src/database/seed";
import { verifyPassword } from "../src/services/password";
import { resetTestDatabase } from "./helpers";

const app = createApp();

async function countRows(table: string): Promise<number> {
  const [rows] = await pool.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  return Number((rows as Array<{ c: number }>)[0].c);
}

async function scalar(sql: string): Promise<number> {
  const [rows] = await pool.query(sql);
  return Number((rows as Array<{ c: number }>)[0].c);
}

async function login(email: string, password: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });
  return { agent, response };
}

describe("demo seed and authentication boundaries", () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await seedDatabase();
  });

  it("seeds a large, fully populated dataset across every table", async () => {
    const expected: Record<string, number> = {
      hotels: 1,
      branches: 3,
      room_types: 8,
      room_amenities: 100,
      rooms: 48,
      guests: 84,
      staff: 40,
      users: 28,
      sessions: 30,
      reservations: 120,
      reservation_guests: 120,
      reservation_status_history: 120,
      check_ins: 1,
      check_outs: 1,
      payments: 50,
      invoices: 120,
      invoice_items: 120,
      refunds: 1,
      housekeeping_tasks: 64,
      housekeeping_task_history: 64,
      attendance: 1200,
      leave_requests: 30,
      suppliers: 12,
      inventory: 40,
      inventory_transactions: 100,
      expenses: 40,
      restaurant_menu_categories: 8,
      restaurant_menu_items: 42,
      restaurant_orders: 60,
      restaurant_order_items: 60,
      activity_logs: 120,
      notifications: 80,
      invitations: 8,
      password_reset_tokens: 5,
    };

    for (const [table, minimum] of Object.entries(expected)) {
      expect(await countRows(table), `${table} row count`).toBeGreaterThanOrEqual(minimum);
    }

    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM guests WHERE email = '' OR phone = '' OR address = '' OR city = '' OR state = '' OR postal_code = '' OR id_type = '' OR id_last_four = ''",
      ),
      "guests have every identity and contact field",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM staff WHERE name = '' OR email = '' OR phone = '' OR department = '' OR role = '' OR shift = '' OR joined_at IS NULL",
      ),
      "staff have every employment field",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM hotels WHERE name = '' OR legal_name = '' OR email = '' OR phone = '' OR website = '' OR address_line_1 = '' OR city = '' OR state = '' OR postal_code = ''",
      ),
      "hotel profile is complete",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM branches WHERE name = '' OR code = '' OR address_line_1 = '' OR city = '' OR state = '' OR postal_code = '' OR phone = ''",
      ),
      "branches are complete",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM system_settings WHERE website = '' OR invoice_footer = '' OR cancellation_policy = '' OR logo_url = '' OR address_line_1 = '' OR address_line_2 = ''",
      ),
      "system settings are complete",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM suppliers WHERE name = '' OR contact_name = '' OR email = '' OR phone = '' OR address = ''",
      ),
      "suppliers are complete",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM inventory WHERE name = '' OR sku = '' OR category = '' OR unit = '' OR supplier = '' OR purchase_price <= 0",
      ),
      "inventory is complete",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM restaurant_menu_items WHERE name = '' OR description = '' OR price <= 0",
      ),
      "menu items are complete",
    ).toBe(0);

    // Relational integrity across the seeded graph.
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM reservations r LEFT JOIN guests g ON g.id = r.guest_id LEFT JOIN rooms rm ON rm.id = r.room_id WHERE g.id IS NULL OR rm.id IS NULL",
      ),
      "reservations point at real guests and rooms",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM payments p LEFT JOIN reservations r ON r.id = p.reservation_id WHERE r.id IS NULL",
      ),
      "payments point at real reservations",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM invoice_items i LEFT JOIN invoices v ON v.id = i.invoice_id WHERE v.id IS NULL",
      ),
      "invoice items point at real invoices",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM refunds f LEFT JOIN payments p ON p.id = f.payment_id WHERE p.id IS NULL",
      ),
      "refunds point at real payments",
    ).toBe(0);
    expect(
      await scalar(
        "SELECT COUNT(*) AS c FROM users u LEFT JOIN roles r ON r.code = u.role WHERE r.code IS NULL",
      ),
      "users have valid roles",
    ).toBe(0);
  });

  it("creates admin@admin.com with the requested password and a real hash", async () => {
    const [adminUser] = await db.select().from(users).where(eq(users.email, "admin@admin.com")).limit(1);
    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe("super-admin");
    expect(adminUser.isActive).toBe(true);
    expect(adminUser.passwordHash).not.toBe("password");
    expect(adminUser.passwordHash.length).toBeGreaterThan(40);
    expect(await verifyPassword(adminUser.passwordHash, "password")).toBe(true);
    expect(await verifyPassword(adminUser.passwordHash, "wrong-password")).toBe(false);
  });

  it("keeps public endpoints public and protects staff endpoints", async () => {
    const anonymous = request.agent(app);
    expect((await anonymous.get("/api/public/catalog")).status).toBe(200);
    expect((await anonymous.get("/api/auth/me")).status).toBe(401);
    expect((await anonymous.get("/api/admin/bootstrap")).status).toBe(401);
    expect((await anonymous.get("/api/account/overview")).status).toBe(401);

    const invalidCookie = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["rivr_session=not-a-real-session-token"]);
    expect(invalidCookie.status).toBe(401);

    const publicWithInvalidCookie = await request(app)
      .get("/api/public/catalog")
      .set("Cookie", ["rivr_session=not-a-real-session-token"]);
    expect(publicWithInvalidCookie.status).toBe(200);
  });

  it("authenticates admin@admin.com / password and returns the seeded data", async () => {
    const { agent, response } = await login("admin@admin.com", "password");
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("admin@admin.com");
    expect(response.body.user.role).toBe("super-admin");
    expect(response.body.redirect).toBe("/admin/dashboard");
    expect(response.headers["set-cookie"]?.[0]).toContain("rivr_session");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("admin@admin.com");
    expect(me.body.redirect).toBe("/admin/dashboard");

    const bootstrap = await agent.get("/api/admin/bootstrap");
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.rooms).toHaveLength(48);
    expect(bootstrap.body.reservations).toHaveLength(120);
    expect(bootstrap.body.guests).toHaveLength(84);
    expect(bootstrap.body.users.length).toBeGreaterThanOrEqual(28);
    expect(bootstrap.body.settings).toBeTruthy();

    const usersResponse = await agent.get("/api/admin/users");
    expect(usersResponse.status).toBe(200);
    const emails = (usersResponse.body.users as Array<{ email: string }>).map((user) => user.email);
    expect(emails).toContain("admin@admin.com");
    expect(emails).toContain("manager@rivrhotel.in");
    expect(emails).toContain("reception@rivrhotel.in");
    expect(emails).toContain("housekeeping@rivrhotel.in");
    expect(emails).toContain("accountant@rivrhotel.in");
    expect(emails).toContain("restaurant@rivrhotel.in");
    expect(emails).toContain("staff@rivrhotel.in");

    expect((await agent.get("/api/admin/settings")).status).toBe(200);
    expect((await agent.get("/api/admin/reports/dashboard")).status).toBe(200);

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("rejects bad credentials without creating a session", async () => {
    const { agent, response } = await login("admin@admin.com", "not-the-password");
    expect(response.status).toBe(401);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("enforces the server-side permission matrix for every staff role", async () => {
    const manager = await login("manager@rivrhotel.in", "password");
    expect(manager.response.status).toBe(200);
    expect((await manager.agent.get("/api/admin/users")).status).toBe(403);
    expect((await manager.agent.get("/api/admin/reports/dashboard")).status).toBe(200);
    expect(
      (await manager.agent.get(
        `/api/admin/reports/summary?from=${new Date().toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`,
      )).status,
    ).toBe(200);

    const reception = await login("reception@rivrhotel.in", "password");
    expect(reception.response.status).toBe(200);
    expect((await reception.agent.get("/api/admin/reservations")).status).toBe(200);
    expect((await reception.agent.get("/api/admin/payments")).status).toBe(200);
    expect((await reception.agent.get("/api/admin/users")).status).toBe(403);
    expect((await reception.agent.get("/api/admin/expenses")).status).toBe(403);

    const housekeeping = await login("housekeeping@rivrhotel.in", "password");
    expect(housekeeping.response.status).toBe(200);
    expect((await housekeeping.agent.get("/api/admin/housekeeping/tasks")).status).toBe(200);
    expect((await housekeeping.agent.get("/api/admin/expenses")).status).toBe(403);
    expect((await housekeeping.agent.get("/api/admin/users")).status).toBe(403);

    const accountant = await login("accountant@rivrhotel.in", "password");
    expect(accountant.response.status).toBe(200);
    expect((await accountant.agent.get("/api/admin/expenses")).status).toBe(200);
    expect((await accountant.agent.get("/api/admin/users")).status).toBe(403);
    expect(
      (await accountant.agent.get(
        `/api/admin/reports/summary?from=${new Date().toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`,
      )).status,
    ).toBe(200);

    const restaurant = await login("restaurant@rivrhotel.in", "password");
    expect(restaurant.response.status).toBe(200);
    expect((await restaurant.agent.get("/api/admin/restaurant/orders")).status).toBe(200);
    expect((await restaurant.agent.get("/api/admin/users")).status).toBe(403);

    const generalStaff = await login("staff@rivrhotel.in", "password");
    expect(generalStaff.response.status).toBe(200);
    expect((await generalStaff.agent.get("/api/admin/reservations")).status).toBe(200);
    expect((await generalStaff.agent.get("/api/admin/housekeeping/tasks")).status).toBe(200);
    expect((await generalStaff.agent.get("/api/admin/inventory")).status).toBe(200);
    expect((await generalStaff.agent.get("/api/admin/reports/dashboard")).status).toBe(403);
    expect((await generalStaff.agent.get("/api/admin/users")).status).toBe(403);
  });

  it("keeps customer accounts out of staff routes and scopes account data", async () => {
    const customerRows = await db.select().from(users).where(eq(users.role, "customer")).limit(2);
    expect(customerRows.length).toBe(2);
    const customerUser = customerRows[0]!;
    const otherCustomerUser = customerRows[1]!;

    const customer = await login(customerUser.email, "password");
    expect(customer.response.status).toBe(200);
    expect(customer.response.body.user.role).toBe("customer");
    expect(customer.response.body.redirect).toBe("/guest/dashboard");

    const overview = await customer.agent.get("/api/account/overview");
    expect(overview.status).toBe(200);
    expect(overview.body.user.email).toBe(customerUser.email);
    expect(Array.isArray(overview.body.reservations)).toBe(true);

    expect((await customer.agent.get("/api/admin/bootstrap")).status).toBe(403);
    expect((await customer.agent.get("/api/admin/users")).status).toBe(403);
    expect((await customer.agent.get("/api/admin/reservations")).status).toBe(403);

    const forbiddenCancel = await customer.agent.post("/api/account/reservations/does-not-exist/cancel");
    expect(forbiddenCancel.status).toBe(404);

    const otherCustomer = await login(otherCustomerUser.email, "password");
    expect(otherCustomer.response.status).toBe(200);
    const otherOverview = await otherCustomer.agent.get("/api/account/overview");
    expect(otherOverview.body.user.email).toBe(otherCustomerUser.email);
    expect(otherOverview.body.reservations).not.toEqual(overview.body.reservations);
  });
});
