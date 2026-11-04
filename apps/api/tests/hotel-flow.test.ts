import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { dateAt } from "../src/utils/date";
import { resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

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

    const created = await request(app).post("/api/public/reservations").send(booking());
    expect(created.status).toBe(201);
    const reservation = created.body.reservation;
    expect(reservation.status).toBe("confirmed");
    // 2 nights x INR 2,500 + 12% tax
    expect(reservation.roomCharges).toBe(5000);
    expect(reservation.tax).toBe(600);
    expect(reservation.total).toBe(5600);
    expect(reservation.reference).toMatch(/^RIVR-/);

    const overlap = await request(app)
      .post("/api/public/reservations")
      .send(booking({ email: "overlap@example.com", guestName: "Overlap Guest" }));
    expect(overlap.status).toBe(409);

    const capacity = await request(app)
      .post("/api/public/reservations")
      .send(booking({ email: "capacity@example.com", adults: 3 }));
    expect(capacity.status).toBe(400);

    const partial = await admin.post("/api/admin/payments").send({
      reservationId: reservation.id,
      amount: 1000,
      method: "upi",
      note: "Deposit",
    });
    expect(partial.status).toBe(201);
    expect(partial.body.reservation.paymentStatus).toBe("partial");
    expect(partial.body.reservation.paidAmount).toBe(1000);

    const overpay = await admin.post("/api/admin/payments").send({
      reservationId: reservation.id,
      amount: 999999,
      method: "card",
    });
    expect(overpay.status).toBe(400);

    const settle = await admin.post("/api/admin/payments").send({
      reservationId: reservation.id,
      amount: 4600,
      method: "card",
    });
    expect(settle.status).toBe(201);
    expect(settle.body.reservation.paymentStatus).toBe("paid");
    expect(settle.body.reservation.paidAmount).toBe(5600);

    const checkInResponse = await admin.post(`/api/admin/reservations/${reservation.id}/check-in`);
    expect(checkInResponse.status).toBe(200);
    expect(checkInResponse.body.reservation.status).toBe("checked-in");

    const roomsAfterCheckIn = await admin.get("/api/admin/rooms");
    expect(roomsAfterCheckIn.body.rooms.find((room: { id: string }) => room.id === "room-test").status).toBe(
      "occupied",
    );

    const checkOutResponse = await admin.post(`/api/admin/reservations/${reservation.id}/check-out`);
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

    const first = await request(app)
      .post("/api/public/reservations")
      .send(booking({ roomId: "room-test-2", email: "cancel.one@example.com", checkIn, checkOut }));
    expect(first.status).toBe(201);

    const cancelled = await admin
      .patch(`/api/admin/reservations/${first.body.reservation.id}/status`)
      .send({ status: "cancelled" });
    expect(cancelled.status).toBe(200);

    const second = await request(app)
      .post("/api/public/reservations")
      .send(booking({ roomId: "room-test-2", email: "cancel.two@example.com", checkIn, checkOut }));
    expect(second.status).toBe(201);

    const concurrentCheckIn = dateAt(30);
    const concurrentCheckOut = dateAt(32);
    const [left, right] = await Promise.all([
      request(app)
        .post("/api/public/reservations")
        .send(
          booking({
            roomId: "room-test-2",
            email: "race.one@example.com",
            guestName: "Race One",
            checkIn: concurrentCheckIn,
            checkOut: concurrentCheckOut,
          }),
        ),
      request(app)
        .post("/api/public/reservations")
        .send(
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
    const invalidPhone = await request(app)
      .post("/api/public/reservations")
      .send(booking({ email: "bad.phone@example.com", phone: "12345" }));
    expect(invalidPhone.status).toBe(400);

    const invalidPin = await request(app)
      .post("/api/public/reservations")
      .send(booking({ email: "bad.pin@example.com", postalCode: "123" }));
    expect(invalidPin.status).toBe(400);

    const pastDate = await request(app)
      .post("/api/public/reservations")
      .send(booking({ email: "past@example.com", checkIn: "2020-01-01", checkOut: "2020-01-03" }));
    expect(pastDate.status).toBe(400);

    const reversed = await request(app)
      .post("/api/public/reservations")
      .send(booking({ email: "reverse@example.com", checkIn: dateAt(10), checkOut: dateAt(9) }));
    expect(reversed.status).toBe(400);

    const unauthorised = await request(app).get("/api/admin/bootstrap");
    expect(unauthorised.status).toBe(401);
  });
});
