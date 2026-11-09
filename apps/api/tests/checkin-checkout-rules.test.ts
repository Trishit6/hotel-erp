import request from "supertest";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { activityLogs, reservations, rooms } from "../src/database/schema";
import { createUser } from "../src/services/users";
import { dateAt } from "../src/utils/date";
import { resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

const staffBooking = (overrides: Record<string, unknown> = {}) => ({
  guestName: "Stay Rules Guest",
  email: "stay.rules@example.com",
  phone: "9876500800",
  roomId: "room-stay-1",
  checkIn: dateAt(10),
  checkOut: dateAt(12),
  adults: 2,
  children: 0,
  specialRequests: "",
  discount: 0,
  ...overrides,
});

describe("check-in and check-out business rules", () => {
  let admin: ReturnType<typeof request.agent>;
  let reception: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    admin = request.agent(app);
    await setupAdmin(admin);

    const now = new Date();
    await db.insert(rooms).values(
      Array.from({ length: 7 }, (_, index) => ({
        id: `room-stay-${index + 1}`,
        number: `S${index + 1}`,
        typeId: "type-test",
        floor: 3,
        status: "available" as const,
        notes: "Stay rules test room",
        updatedAt: now,
      })),
    );

    await createUser({
      name: "Reception Stay",
      email: "reception.stay@test.local",
      password: "Reception@12345",
      role: "receptionist",
    });
    reception = request.agent(app);
    const login = await reception
      .post("/api/auth/login")
      .send({ email: "reception.stay@test.local", password: "Reception@12345" });
    expect(login.status).toBe(200);
  });

  async function create(overrides: Record<string, unknown> = {}) {
    const response = await admin.post("/api/admin/reservations").send(staffBooking(overrides));
    expect(response.status).toBe(201);
    return response.body.reservation as { id: string; reference: string; total: number };
  }

  it("rejects an early check-in without an override", async () => {
    const reservation = await create({ roomId: "room-stay-1" });
    const response = await admin.post(`/api/admin/reservations/${reservation.id}/check-in`).send({});
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("Check-in opens");
  });

  it("allows a normal check-in on the arrival date", async () => {
    const reservation = await create({
      roomId: "room-stay-2",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    const response = await admin.post(`/api/admin/reservations/${reservation.id}/check-in`).send({});
    expect(response.status).toBe(200);
    expect(response.body.reservation.status).toBe("checked-in");
  });

  it("rejects check-in on or after the check-out date even with an override", async () => {
    const reservation = await create({ roomId: "room-stay-3", checkIn: dateAt(1), checkOut: dateAt(3) });
    await db
      .update(reservations)
      .set({ checkIn: dateAt(-2), checkOut: dateAt(0) })
      .where(eq(reservations.id, reservation.id));

    const response = await admin
      .post(`/api/admin/reservations/${reservation.id}/check-in`)
      .send({ earlyCheckIn: true });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("check-out date");
  });

  it("allows an authorized early check-in override and records it", async () => {
    const reservation = await create({ roomId: "room-stay-4", checkIn: dateAt(3), checkOut: dateAt(5) });
    const response = await admin
      .post(`/api/admin/reservations/${reservation.id}/check-in`)
      .send({ earlyCheckIn: true });
    expect(response.status).toBe(200);
    expect(response.body.reservation.checkIn).toBe(dateAt(3));

    const rows = await db
      .select()
      .from(activityLogs)
      .where(and(eq(activityLogs.action, "Early check-in override"), eq(activityLogs.detail, `${reservation.reference} - checked in ${dateAt(0)}, arrival ${dateAt(3)}`)));
    expect(rows.length).toBe(1);
    expect(rows[0].userId).toBeTruthy();
  });

  it("rejects an unauthorized early check-in override", async () => {
    const reservation = await create({ roomId: "room-stay-5", checkIn: dateAt(4), checkOut: dateAt(6) });
    const response = await reception
      .post(`/api/admin/reservations/${reservation.id}/check-in`)
      .send({ earlyCheckIn: true });
    expect(response.status).toBe(403);
  });

  it("rejects an unpaid normal check-out with HTTP 409 and the balance", async () => {
    const reservation = await create({
      roomId: "room-stay-6",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    expect((await admin.post(`/api/admin/reservations/${reservation.id}/check-in`).send({})).status).toBe(200);

    const response = await admin.post(`/api/admin/reservations/${reservation.id}/check-out`).send({});
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("outstanding_balance");
    expect(response.body.error.details.outstandingBalance).toBe(reservation.total);
  });

  it("allows a fully paid reservation to check out normally", async () => {
    const reservation = await create({
      roomId: "room-stay-1",
      guestName: "Paid Guest",
      email: "paid.stay@example.com",
      phone: "9876500811",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    expect((await admin.post(`/api/admin/reservations/${reservation.id}/check-in`).send({})).status).toBe(200);
    const payment = await admin.post("/api/admin/payments").send({
      reservationId: reservation.id,
      amount: reservation.total,
      method: "cash",
    });
    expect(payment.status).toBe(201);
    expect(payment.body.reservation.paymentStatus).toBe("paid");

    const response = await admin.post(`/api/admin/reservations/${reservation.id}/check-out`).send({});
    expect(response.status).toBe(200);
    expect(response.body.reservation.status).toBe("checked-out");
  });

  it("rejects an unauthorized checkout override, then permits an authorized one", async () => {
    const reservation = await create({
      roomId: "room-stay-7",
      guestName: "Override Guest",
      email: "override.stay@example.com",
      phone: "9876500822",
      checkIn: dateAt(0),
      checkOut: dateAt(2),
    });
    expect((await admin.post(`/api/admin/reservations/${reservation.id}/check-in`).send({})).status).toBe(200);
    expect(
      (
        await admin.post("/api/admin/payments").send({
          reservationId: reservation.id,
          amount: 1000,
          method: "cash",
        })
      ).status,
    ).toBe(201);

    const blocked = await reception
      .post(`/api/admin/reservations/${reservation.id}/check-out`)
      .send({ overrideOutstandingBalance: true });
    expect(blocked.status).toBe(403);

    const outstanding = reservation.total - 1000;
    const override = await admin
      .post(`/api/admin/reservations/${reservation.id}/check-out`)
      .send({ overrideOutstandingBalance: true });
    expect(override.status).toBe(200);
    expect(override.body.reservation.paymentStatus).toBe("partial");

    const rows = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.action, "Outstanding balance checkout override"),
          eq(activityLogs.detail, `${reservation.reference} - INR ${outstanding.toFixed(2)} outstanding`),
        ),
      );
    expect(rows.length).toBe(1);
    expect(rows[0].userId).toBeTruthy();
  });
});
