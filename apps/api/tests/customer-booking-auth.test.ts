import request from "supertest";
import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { guests, reservations } from "../src/database/schema";
import { dateAt } from "../src/utils/date";
import {
  registerCustomerAgent,
  resetTestDatabase,
  seedTestCatalog,
  setupAdmin,
  type CustomerFixture,
} from "./helpers";

const app = createApp();

const bookingBody = (overrides: Record<string, unknown> = {}) => ({
  phone: "9876500900",
  roomId: "room-test",
  checkIn: dateAt(10),
  checkOut: dateAt(12),
  adults: 2,
  children: 0,
  specialRequests: "Authenticated booking test",
  ...overrides,
});

async function reservationCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(reservations);
  return Number(row?.count ?? 0);
}

describe("customer-authenticated reservation creation", () => {
  let admin: ReturnType<typeof request.agent>;
  let customerA: CustomerFixture;
  let customerB: CustomerFixture;
  let referenceA = "";
  let referenceB = "";
  let reservationAId = "";
  let reservationBId = "";

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    admin = request.agent(app);
    await setupAdmin(admin);

    customerA = await registerCustomerAgent(app, {
      name: "Account Alpha",
      email: "account.alpha@example.com",
      phone: "9876500900",
    });
    customerB = await registerCustomerAgent(app, {
      name: "Account Beta",
      email: "account.beta@example.com",
      phone: "9876500901",
    });

    const first = await customerA.agent.post("/api/account/reservations").send(bookingBody());
    expect(first.status).toBe(201);
    referenceA = first.body.reservation.reference;
    const [rowA] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, referenceA))
      .limit(1);
    reservationAId = rowA.id;

    const second = await customerB.agent
      .post("/api/account/reservations")
      .send(bookingBody({ roomId: "room-test-2", phone: "9876500901" }));
    expect(second.status).toBe(201);
    referenceB = second.body.reservation.reference;
    const [rowB] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, referenceB))
      .limit(1);
    reservationBId = rowB.id;
  });

  it("allows unauthenticated browsing and availability without creating a hold", async () => {
    const before = await reservationCount();
    const catalog = await request(app).get("/api/public/catalog");
    expect(catalog.status).toBe(200);
    expect(Array.isArray(catalog.body.rooms)).toBe(true);
    expect(catalog.body.rooms.length).toBeGreaterThan(0);

    const availability = await request(app).get(
      `/api/public/availability?checkIn=${dateAt(40)}&checkOut=${dateAt(42)}&guests=2`,
    );
    expect(availability.status).toBe(200);
    expect(availability.body.rooms.length).toBeGreaterThan(0);
    expect(await reservationCount()).toBe(before);
  });

  it("rejects unauthenticated customer booking and the removed public creation route", async () => {
    const before = await reservationCount();
    const unauthenticated = await request(app)
      .post("/api/account/reservations")
      .send(bookingBody({ checkIn: dateAt(44), checkOut: dateAt(46) }));
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe("unauthorized");

    const removed = await request(app)
      .post("/api/public/reservations")
      .send({
        guestName: "Anonymous Guest",
        email: "anonymous@example.com",
        ...bookingBody({ checkIn: dateAt(44), checkOut: dateAt(46) }),
      });
    expect(removed.status).toBe(404);
    expect(await reservationCount()).toBe(before);
  });

  it("creates a pending hold owned by the authenticated customer's guest", async () => {
    const [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationAId))
      .limit(1);
    expect(row.status).toBe("pending");
    expect(row.holdExpiresAt).toBeTruthy();

    const [guest] = await db
      .select()
      .from(guests)
      .where(eq(guests.id, row.guestId))
      .limit(1);
    expect(guest.email).toBe(customerA.email);
    expect(guest.name).toBe(customerA.name);
  });

  it("scopes account overview and cancellation to the authenticated customer's guest", async () => {
    const overviewA = await customerA.agent.get("/api/account/overview");
    expect(overviewA.status).toBe(200);
    const referencesA = (overviewA.body.reservations as Array<{ reference: string }>).map(
      (item) => item.reference,
    );
    expect(referencesA).toContain(referenceA);
    expect(referencesA).not.toContain(referenceB);

    const forgedCancel = await customerA.agent.post(
      `/api/account/reservations/${reservationBId}/cancel`,
    );
    expect(forgedCancel.status).toBe(404);

    const [stillThere] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationBId))
      .limit(1);
    expect(stillThere.status).toBe("pending");
  });

  it("does not expose another customer's booking through public verification", async () => {
    const wrongContact = await request(app).post("/api/public/reservations/verify").send({
      reference: referenceB,
      email: customerA.email,
    });
    expect(wrongContact.status).toBe(404);

    const ownContact = await request(app).post("/api/public/reservations/verify").send({
      reference: referenceB,
      email: customerB.email,
    });
    expect(ownContact.status).toBe(200);
    expect(ownContact.body.reservation.reference).toBe(referenceB);
    expect(JSON.stringify(ownContact.body)).not.toContain(customerB.email);
  });

  it("does not create a duplicate reservation on a repeated submission", async () => {
    const before = await reservationCount();
    const repeated = await customerA.agent.post("/api/account/reservations").send(bookingBody());
    expect(repeated.status).toBe(409);
    expect(await reservationCount()).toBe(before);
  });

  it("ignores role fields during registration and rejects them in a booking body", async () => {
    const agent = request.agent(app);
    const registration = await agent.post("/api/auth/register").send({
      name: "Role Probe",
      email: "role.probe@example.com",
      phone: "9876500902",
      password: "Customer@123456",
      role: "super-admin",
    });
    expect(registration.status).toBe(201);
    expect(registration.body.user.role).toBe("customer");

    const elevatedBooking = await agent.post("/api/account/reservations").send({
      ...bookingBody({ checkIn: dateAt(50), checkOut: dateAt(52) }),
      role: "super-admin",
      status: "confirmed",
      total: 1,
      discount: 9999,
    });
    expect(elevatedBooking.status).toBe(400);
  });

  it("rejects booking after the customer account is deactivated", async () => {
    const customer = await registerCustomerAgent(app);
    const before = await reservationCount();
    const deactivate = await admin
      .patch(`/api/admin/users/${customer.user.id}`)
      .send({ isActive: false });
    expect(deactivate.status).toBe(200);

    const attempt = await customer.agent
      .post("/api/account/reservations")
      .send(bookingBody({ phone: customer.phone, checkIn: dateAt(60), checkOut: dateAt(62) }));
    expect(attempt.status).toBe(401);
    expect(await reservationCount()).toBe(before);
  });

  it("keeps authorized staff reservation creation on the admin endpoint", async () => {
    const staffBooking = await admin.post("/api/admin/reservations").send({
      guestName: "Walk In Guest",
      email: "walk.in@example.com",
      phone: "9876500903",
      roomId: "room-test",
      checkIn: dateAt(70),
      checkOut: dateAt(72),
      adults: 1,
      children: 0,
      specialRequests: "",
      discount: 0,
    });
    expect(staffBooking.status).toBe(201);
    expect(staffBooking.body.reservation.status).toBe("confirmed");

    const staffCustomerAttempt = await admin
      .post("/api/account/reservations")
      .send(bookingBody({ checkIn: dateAt(74), checkOut: dateAt(76) }));
    expect(staffCustomerAttempt.status).toBe(403);
  });
});
