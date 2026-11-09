import request from "supertest";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { guests, reservations, rooms } from "../src/database/schema";
import { dateAt } from "../src/utils/date";
import { registerCustomerAgent, resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

describe("room reserved-status handling", () => {
  let admin: ReturnType<typeof request.agent>;
  let bookingSequence = 0;

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    admin = request.agent(app);
    await setupAdmin(admin);

    const now = new Date();
    await db.insert(rooms).values(
      Array.from({ length: 7 }, (_, index) => ({
        id: `room-status-${index + 1}`,
        number: `R${index + 1}`,
        typeId: "type-test",
        floor: 4,
        status: "available" as const,
        notes: "Room status test room",
        updatedAt: now,
      })),
    );
  });

  async function publicBooking(roomId: string, checkIn: string, checkOut: string) {
    bookingSequence += 1;
    const phone = `98765${String(10000 + bookingSequence).slice(-5)}`;
    const customer = await registerCustomerAgent(app, {
      name: `Status Guest ${bookingSequence}`,
      email: `status.${bookingSequence}@example.com`,
      phone,
    });
    const response = await customer.agent.post("/api/account/reservations").send({
      phone,
      roomId,
      checkIn,
      checkOut,
      adults: 1,
      children: 0,
      specialRequests: "",
    });
    expect(response.status).toBe(201);
    const [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, response.body.reservation.reference))
      .limit(1);
    return row;
  }

  async function staffBooking(roomId: string, checkIn: string, checkOut: string) {
    bookingSequence += 1;
    const response = await admin.post("/api/admin/reservations").send({
      guestName: `Staff Status Guest ${bookingSequence}`,
      email: `staff.status.${bookingSequence}@example.com`,
      phone: `98766${String(10000 + bookingSequence).slice(-5)}`,
      roomId,
      checkIn,
      checkOut,
      adults: 1,
      children: 0,
      specialRequests: "",
      discount: 0,
    });
    expect(response.status).toBe(201);
    return response.body.reservation as { id: string };
  }

  async function roomStatus(roomId: string) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    return room.status;
  }

  it("does not change a room's current status for a future reservation", async () => {
    await publicBooking("room-status-1", dateAt(10), dateAt(12));
    expect(await roomStatus("room-status-1")).toBe("available");
  });

  it("reserves an available room for a same-day arrival", async () => {
    await publicBooking("room-status-2", dateAt(0), dateAt(2));
    expect(await roomStatus("room-status-2")).toBe("reserved");
  });

  it("includes a reservation starting today when releasing a cancelled room", async () => {
    const reservation = await staffBooking("room-status-3", dateAt(0), dateAt(2));
    expect(await roomStatus("room-status-3")).toBe("reserved");
    const cancelled = await admin
      .patch(`/api/admin/reservations/${reservation.id}/status`)
      .send({ status: "cancelled" });
    expect(cancelled.status).toBe(200);
    expect(await roomStatus("room-status-3")).toBe("available");
  });

  it("does not release a room that another active same-day reservation needs", async () => {
    const reservation = await staffBooking("room-status-4", dateAt(0), dateAt(2));
    const [guest] = await db.select().from(guests).where(eq(guests.id, (await db.select().from(reservations).where(eq(reservations.id, reservation.id)).limit(1))[0].guestId)).limit(1);
    const now = new Date();
    await db.insert(reservations).values({
      id: "res-room-status-other",
      reference: "RIVR-OTHERSTAY",
      guestId: guest.id,
      roomId: "room-status-4",
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

    const cancelled = await admin
      .patch(`/api/admin/reservations/${reservation.id}/status`)
      .send({ status: "cancelled" });
    expect(cancelled.status).toBe(200);
    expect(await roomStatus("room-status-4")).toBe("reserved");
  });

  it("preserves occupied, cleaning, and maintenance states when cancelling", async () => {
    const cases = [
      { roomId: "room-status-5", status: "occupied" as const },
      { roomId: "room-status-6", status: "cleaning" as const },
      { roomId: "room-status-7", status: "maintenance" as const },
    ];
    for (const item of cases) {
      const reservation = await staffBooking(item.roomId, dateAt(0), dateAt(2));
      await db.update(rooms).set({ status: item.status }).where(eq(rooms.id, item.roomId));
      const response = await admin
        .patch(`/api/admin/reservations/${reservation.id}/status`)
        .send({ status: "cancelled" });
      expect(response.status).toBe(200);
      expect(await roomStatus(item.roomId)).toBe(item.status);
    }
  });
});
