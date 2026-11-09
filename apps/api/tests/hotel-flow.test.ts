import request from "supertest";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { reservations } from "../src/database/schema";
import { dateAt } from "../src/utils/date";
import { registerCustomerAgent, resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

const booking = (overrides: Record<string, unknown> = {}) => ({
  guestName: "Flow Guest",
  email: "flow.guest@example.com",
  phone: "9876543210",
  roomId: "room-test",
  checkIn: dateAt(10),
  checkOut: dateAt(12),
  adults: 2,
  children: 0,
  specialRequests: "Integration test",
  ...overrides,
});

async function submitBooking(overrides: Record<string, unknown> = {}) {
  const email = typeof overrides.email === "string" ? overrides.email : "flow.guest@example.com";
  const guestName = typeof overrides.guestName === "string" ? overrides.guestName : "Flow Guest";
  const customer = await registerCustomerAgent(app, { email, name: guestName });
  const { guestName: _guestName, email: _email, ...body } = overrides;
  return customer.agent.post("/api/account/reservations").send({
    ...body,
    phone: typeof overrides.phone === "string" ? overrides.phone : customer.phone,
  });
}

describe("reservations, availability, payments, and housekeeping", () => {
  let admin: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    admin = request.agent(app);
    await setupAdmin(admin);
  });

  it("quotes, books, pays, checks in, checks out and inspects a room", async () => {
    const checkIn = dateAt(10);
    const checkOut = dateAt(12);

    const availability = await request(app).get(
      `/api/public/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`,
    );
    expect(availability.status).toBe(200);
    expect(availability.body.rooms.map((room: { id: string }) => room.id)).toContain("room-test");

    const created = await submitBooking(booking());
    expect(created.status).toBe(201);
    const publicReservation = created.body.reservation;
    expect(publicReservation.status).toBe("pending");
    expect(publicReservation.reference).toMatch(/^RIVR-/);
    expect(publicReservation.total).toBe(5600);
    expect(publicReservation.id).toBeUndefined();

    const [createdRow] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, publicReservation.reference))
      .limit(1);
    expect(createdRow).toBeDefined();
    const reservationId = createdRow.id;

    const detail = await admin.get(`/api/admin/reservations/${reservationId}`);
    expect(detail.status).toBe(200);
    // 2 nights x INR 2,500 + 12% tax
    expect(detail.body.reservation.roomCharges).toBe(5000);
    expect(detail.body.reservation.tax).toBe(600);
    expect(detail.body.reservation.total).toBe(5600);

    const overlap = await submitBooking(
      booking({ email: "overlap@example.com", guestName: "Overlap Guest" }),
    );
    expect(overlap.status).toBe(409);

    const capacity = await submitBooking(booking({ email: "capacity@example.com", adults: 3 }));
    expect(capacity.status).toBe(400);

    const partial = await admin.post("/api/admin/payments").send({
      reservationId,
      amount: 1000,
      method: "upi",
      note: "Deposit",
    });
    expect(partial.status).toBe(201);
    expect(partial.body.reservation.paymentStatus).toBe("partial");
    expect(partial.body.reservation.paidAmount).toBe(1000);

    const overpay = await admin.post("/api/admin/payments").send({
      reservationId,
      amount: 999999,
      method: "card",
    });
    expect(overpay.status).toBe(400);

    const settle = await admin.post("/api/admin/payments").send({
      reservationId,
      amount: 4600,
      method: "card",
    });
    expect(settle.status).toBe(201);
    expect(settle.body.reservation.paymentStatus).toBe("paid");
    expect(settle.body.reservation.paidAmount).toBe(5600);

    // The fixture arrives in the future, so this end-to-end flow uses the
    // explicitly authorized early-check-in path instead of the normal date gate.
    const checkInResponse = await admin
      .post(`/api/admin/reservations/${reservationId}/check-in`)
      .send({ earlyCheckIn: true });
    expect(checkInResponse.status).toBe(200);
    expect(checkInResponse.body.reservation.status).toBe("checked-in");

    const roomsAfterCheckIn = await admin.get("/api/admin/rooms");
    expect(roomsAfterCheckIn.body.rooms.find((room: { id: string }) => room.id === "room-test").status).toBe(
      "occupied",
    );

    const checkOutResponse = await admin.post(`/api/admin/reservations/${reservationId}/check-out`);
    expect(checkOutResponse.status).toBe(200);
    expect(checkOutResponse.body.reservation.status).toBe("checked-out");

    const bootstrap = await admin.get("/api/admin/bootstrap");
    expect(bootstrap.body.rooms.find((room: { id: string }) => room.id === "room-test").status).toBe("cleaning");
    const task = bootstrap.body.tasks.find(
      (item: { roomId: string; status: string }) => item.roomId === "room-test" && item.status === "dirty",
    );
    expect(task).toBeDefined();

    const inspected = await admin
      .patch(`/api/admin/housekeeping/tasks/${task.id}`)
      .send({ status: "inspected" });
    expect(inspected.status).toBe(200);

    const roomsAfterInspection = await admin.get("/api/admin/rooms");
    expect(roomsAfterInspection.body.rooms.find((room: { id: string }) => room.id === "room-test").status).toBe(
      "available",
    );
  });

  it("releases a cancelled room and prevents concurrent double bookings", async () => {
    const checkIn = dateAt(20);
    const checkOut = dateAt(22);

    const first = await submitBooking(
      booking({ roomId: "room-test-2", email: "cancel.one@example.com", checkIn, checkOut }),
    );
    expect(first.status).toBe(201);

    const [firstRow] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, first.body.reservation.reference))
      .limit(1);
    expect(firstRow).toBeDefined();
    const cancelled = await admin
      .patch(`/api/admin/reservations/${firstRow.id}/status`)
      .send({ status: "cancelled" });
    expect(cancelled.status).toBe(200);

    const second = await submitBooking(
      booking({ roomId: "room-test-2", email: "cancel.two@example.com", checkIn, checkOut }),
    );
    expect(second.status).toBe(201);

    const concurrentCheckIn = dateAt(30);
    const concurrentCheckOut = dateAt(32);
    const [left, right] = await Promise.all([
      submitBooking(
        booking({
          roomId: "room-test-2",
          email: "race.one@example.com",
          guestName: "Race One",
          checkIn: concurrentCheckIn,
          checkOut: concurrentCheckOut,
        }),
      ),
      submitBooking(
        booking({
          roomId: "room-test-2",
          email: "race.two@example.com",
          guestName: "Race Two",
          checkIn: concurrentCheckIn,
          checkOut: concurrentCheckOut,
        }),
      ),
    ]);

    expect([left.status, right.status].sort()).toEqual([201, 409]);
  });

  it("enforces expense approval permissions", async () => {
    const expense = await admin.post("/api/admin/expenses").send({
      category: "Supplies",
      description: "Integration test supplies",
      amount: 1500,
      method: "cash",
      date: dateAt(0),
    });
    expect(expense.status).toBe(201);

    const approved = await admin
      .patch(`/api/admin/expenses/${expense.body.expense.id}/approval`)
      .send({ status: "approved" });
    expect(approved.status).toBe(200);
    expect(approved.body.expense.status).toBe("approved");

    const second = await admin.post("/api/admin/expenses").send({
      category: "Maintenance",
      description: "Second approval test",
      amount: 500,
      method: "cash",
      date: dateAt(0),
    });
    expect(second.status).toBe(201);

    const user = await admin.post("/api/admin/users").send({
      name: "Reception Flow",
      email: "reception.flow@test.local",
      password: "Reception@12345",
      role: "receptionist",
    });
    expect(user.status).toBe(201);

    const receptionist = request.agent(app);
    const login = await receptionist
      .post("/api/auth/login")
      .send({ email: "reception.flow@test.local", password: "Reception@12345" });
    expect(login.status).toBe(200);

    const forbidden = await receptionist
      .patch(`/api/admin/expenses/${second.body.expense.id}/approval`)
      .send({ status: "approved" });
    expect(forbidden.status).toBe(403);
  });

  it("rejects invalid booking and payment input", async () => {
    const customer = await registerCustomerAgent(app);
    const base = {
      phone: customer.phone,
      roomId: "room-test",
      checkIn: dateAt(10),
      checkOut: dateAt(12),
      adults: 2,
      children: 0,
    };

    const invalidPhone = await customer.agent
      .post("/api/account/reservations")
      .send({ ...base, phone: "12345" });
    expect(invalidPhone.status).toBe(400);

    const invalidPin = await customer.agent
      .post("/api/account/reservations")
      .send({ ...base, postalCode: "123" });
    expect(invalidPin.status).toBe(400);

    const pastDate = await customer.agent
      .post("/api/account/reservations")
      .send({ ...base, checkIn: "2020-01-01", checkOut: "2020-01-03" });
    expect(pastDate.status).toBe(400);

    const reversed = await customer.agent
      .post("/api/account/reservations")
      .send({ ...base, checkIn: dateAt(10), checkOut: dateAt(9) });
    expect(reversed.status).toBe(400);

    const unauthorised = await request(app).get("/api/admin/bootstrap");
    expect(unauthorised.status).toBe(401);
  });
});
