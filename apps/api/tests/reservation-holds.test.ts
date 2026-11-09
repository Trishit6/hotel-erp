import request from "supertest";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db, pool } from "../src/database/client";
import {
  activityLogs,
  guests,
  reservationStatusHistory,
  reservations,
  rooms,
} from "../src/database/schema";
import { expirePublicReservationHolds, MAX_ACTIVE_PUBLIC_HOLDS } from "../src/services/reservationHolds";
import { dateAt } from "../src/utils/date";
import { registerCustomerAgent, resetTestDatabase, seedTestCatalog, setupAdmin, type CustomerFixture } from "./helpers";

const app = createApp();

const customers = new Map<string, CustomerFixture>();

async function customerFor(email: string, phone: string): Promise<CustomerFixture> {
  const key = email.trim().toLowerCase();
  const existing = customers.get(key);
  if (existing) return existing;
  const customer = await registerCustomerAgent(app, {
    name: `Hold Guest ${customers.size + 1}`,
    email: key,
    phone: phone.trim(),
  });
  customers.set(key, customer);
  return customer;
}

async function createHold(
  overrides: Record<string, unknown> = {},
  expectedStatus = 201,
) {
  const email = typeof overrides.email === "string" ? overrides.email : "hold.guest@example.com";
  const phone = typeof overrides.phone === "string" ? overrides.phone : "9876500500";
  const customer = await customerFor(email, phone);
  const { guestName: _guestName, email: _email, phone: _phone, ...body } = overrides;
  const response = await customer.agent.post("/api/account/reservations").send({
    phone,
    roomId: "room-hold-1",
    checkIn: dateAt(200),
    checkOut: dateAt(202),
    adults: 2,
    children: 0,
    specialRequests: "",
    ...body,
  });
  expect(response.status).toBe(expectedStatus);
  return response;
}

async function byReference(reference: string) {
  const [row] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.reference, reference))
    .limit(1);
  expect(row).toBeDefined();
  return row;
}

async function expireNow(id: string) {
  await pool.query(
    "UPDATE reservations SET hold_expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE id = ?",
    [id],
  );
}

describe("public reservation holds and expiry", () => {
  let admin: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    admin = request.agent(app);
    await setupAdmin(admin);

    const now = new Date();
    await db.insert(rooms).values(
      Array.from({ length: 9 }, (_, index) => ({
        id: `room-hold-${index + 1}`,
        number: `H${index + 1}`,
        typeId: "type-test",
        floor: 2,
        status: "available" as const,
        notes: "Hold lifecycle test room",
        updatedAt: now,
      })),
    );
  });

  it("creates public reservations as pending with a roughly two-hour hold", async () => {
    const response = await createHold();
    expect(response.body.reservation.status).toBe("pending");
    const row = await byReference(response.body.reservation.reference);
    expect(row.status).toBe("pending");
    expect(row.holdExpiresAt).toBeTruthy();

    const [timing] = await pool.query(
      "SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), hold_expires_at) AS minutes FROM reservations WHERE id = ?",
      [row.id],
    );
    const minutes = Number((timing as Array<{ minutes: number }>)[0].minutes);
    expect(minutes).toBeGreaterThan(110);
    expect(minutes).toBeLessThanOrEqual(120);
  });

  it("blocks availability while the hold is unexpired", async () => {
    const checkIn = dateAt(210);
    const checkOut = dateAt(212);
    await createHold({ roomId: "room-hold-2", checkIn, checkOut });

    const availability = await request(app).get(
      `/api/public/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`,
    );
    expect(availability.status).toBe(200);
    expect(availability.body.rooms.map((room: { id: string }) => room.id)).not.toContain("room-hold-2");

    const catalog = await request(app).get("/api/public/catalog");
    expect(
      (catalog.body.busyRanges as Array<{ roomId: string }>).some(
        (range) => range.roomId === "room-hold-2",
      ),
    ).toBe(true);
  });

  it("stops an expired hold from blocking availability before cleanup runs", async () => {
    const checkIn = dateAt(214);
    const checkOut = dateAt(216);
    const created = await createHold({ roomId: "room-hold-3", checkIn, checkOut });
    const row = await byReference(created.body.reservation.reference);
    await expireNow(row.id);

    const availability = await request(app).get(
      `/api/public/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`,
    );
    expect(availability.status).toBe(200);
    expect(availability.body.rooms.map((room: { id: string }) => room.id)).toContain("room-hold-3");
  });

  it("cancels an expired hold, releases its room, and does not duplicate history on a second run", async () => {
    const created = await createHold({
      roomId: "room-hold-4",
      email: "expire.guest@example.com",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    const row = await byReference(created.body.reservation.reference);
    expect(row.status).toBe("pending");
    await expireNow(row.id);

    expect(await expirePublicReservationHolds()).toBeGreaterThanOrEqual(1);
    const [afterFirst] = await db.select().from(reservations).where(eq(reservations.id, row.id)).limit(1);
    expect(afterFirst.status).toBe("cancelled");
    const [room] = await db.select().from(rooms).where(eq(rooms.id, "room-hold-4")).limit(1);
    expect(room.status).toBe("available");

    const historyCount = async () => {
      const rows = await db
        .select()
        .from(reservationStatusHistory)
        .where(eq(reservationStatusHistory.reservationId, row.id));
      return rows.filter((entry) => entry.note === "Public hold expired").length;
    };
    const activityCount = async () => {
      const rows = await db.select().from(activityLogs);
      return rows.filter(
        (entry) =>
          entry.action === "Expired reservation hold" && entry.detail === row.reference,
      ).length;
    };
    expect(await historyCount()).toBe(1);
    expect(await activityCount()).toBe(1);
    expect(await expirePublicReservationHolds()).toBe(0);
    expect(await historyCount()).toBe(1);
    expect(await activityCount()).toBe(1);
  });

  it("does not release a room that another active reservation still needs", async () => {
    const created = await createHold({
      roomId: "room-hold-5",
      email: "blocked.release@example.com",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    const row = await byReference(created.body.reservation.reference);
    await expireNow(row.id);

    const now = new Date();
    const [guest] = await db.select().from(guests).where(eq(guests.id, row.guestId)).limit(1);
    await db.insert(reservations).values({
      id: "res-holds-other-active",
      reference: "RIVR-HOLDOTHER1",
      guestId: guest.id,
      roomId: "room-hold-5",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
      adults: 1,
      children: 0,
      status: "confirmed",
      paymentStatus: "pending",
      roomCharges: "2500.00",
      additionalCharges: "0.00",
      discount: "0.00",
      tax: "300.00",
      total: "2800.00",
      paidAmount: "0.00",
      specialRequests: "",
      updatedAt: now,
    });
    await db.update(rooms).set({ status: "reserved" }).where(eq(rooms.id, "room-hold-5"));

    await expirePublicReservationHolds();
    const [cancelled] = await db.select().from(reservations).where(eq(reservations.id, row.id)).limit(1);
    expect(cancelled.status).toBe("cancelled");
    const [room] = await db.select().from(rooms).where(eq(rooms.id, "room-hold-5")).limit(1);
    expect(room.status).toBe("reserved");
  });

  it("does not cancel a confirmed hold after payment or staff confirmation", async () => {
    const paid = await createHold({
      roomId: "room-hold-6",
      email: "paid.hold@example.com",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    const paidRow = await byReference(paid.body.reservation.reference);
    const payment = await admin.post("/api/admin/payments").send({
      reservationId: paidRow.id,
      amount: 100,
      method: "cash",
    });
    expect(payment.status).toBe(201);
    expect(payment.body.reservation.status).toBe("confirmed");

    const confirmed = await createHold({
      roomId: "room-hold-7",
      email: "confirmed.hold@example.com",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    const confirmedRow = await byReference(confirmed.body.reservation.reference);
    const update = await admin
      .patch(`/api/admin/reservations/${confirmedRow.id}/status`)
      .send({ status: "confirmed" });
    expect(update.status).toBe(200);

    await expireNow(paidRow.id);
    await expireNow(confirmedRow.id);
    await expirePublicReservationHolds();

    const [afterPaid] = await db.select().from(reservations).where(eq(reservations.id, paidRow.id)).limit(1);
    const [afterConfirmed] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, confirmedRow.id))
      .limit(1);
    expect(afterPaid.status).toBe("confirmed");
    expect(afterConfirmed.status).toBe("confirmed");
  });

  it(`rejects more than ${MAX_ACTIVE_PUBLIC_HOLDS} active holds for the same normalized email`, async () => {
    const email = "limit.email@example.com";
    for (let index = 0; index < MAX_ACTIVE_PUBLIC_HOLDS; index += 1) {
      await createHold({
        roomId: "room-hold-8",
        email: `  ${email.toUpperCase()}  `,
        phone: "9876500777",
        checkIn: dateAt(300 + index * 2),
        checkOut: dateAt(302 + index * 2),
      });
    }
    const fourth = await createHold({
      roomId: "room-hold-8",
      email,
      phone: "9876500777",
      checkIn: dateAt(320),
      checkOut: dateAt(322),
    }, 409);
    expect(fourth.body.error.message).toContain("maximum number of active booking holds");
  });

  it(`rejects more than ${MAX_ACTIVE_PUBLIC_HOLDS} active holds for the same normalized phone`, async () => {
    for (let index = 0; index < MAX_ACTIVE_PUBLIC_HOLDS; index += 1) {
      await createHold({
        roomId: "room-hold-9",
        email: `limit.phone.${index}@example.com`,
        phone: "+91 98765 05555",
        checkIn: dateAt(400 + index * 2),
        checkOut: dateAt(402 + index * 2),
      });
    }
    const fourth = await createHold({
      roomId: "room-hold-9",
      email: "limit.phone.fourth@example.com",
      phone: "9876505555",
      checkIn: dateAt(420),
      checkOut: dateAt(422),
    }, 409);
    expect(fourth.body.error.message).toContain("maximum number of active booking holds");
  });

  it("does not count confirmed staff bookings toward the public hold limit", async () => {
    const email = "staff.not.counted@example.com";
    const phone = "9876500666";
    const staffBooking = await admin.post("/api/admin/reservations").send({
      guestName: "Staff Guest",
      email,
      phone,
      roomId: "room-hold-8",
      checkIn: dateAt(500),
      checkOut: dateAt(502),
      adults: 1,
      children: 0,
      specialRequests: "",
      discount: 0,
    });
    expect(staffBooking.status).toBe(201);
    expect(staffBooking.body.reservation.status).toBe("confirmed");

    for (let index = 0; index < MAX_ACTIVE_PUBLIC_HOLDS; index += 1) {
      await createHold({
        roomId: "room-hold-8",
        email,
        phone,
        checkIn: dateAt(510 + index * 2),
        checkOut: dateAt(512 + index * 2),
      });
    }
  });
});
