import request from "supertest";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { guests, reservations } from "../src/database/schema";
import { dateAt } from "../src/utils/date";
import { resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

const profile = {
  guestName: "Original Guest",
  email: "profile.protection@example.com",
  phone: "9876500300",
  roomId: "room-test",
  checkIn: dateAt(120),
  checkOut: dateAt(122),
  adults: 2,
  children: 0,
  specialRequests: "",
  address: "1 Original Road",
  city: "Kolkata",
  state: "West Bengal",
  postalCode: "700001",
};

describe("public reservation guest-profile protection", () => {
  let admin: ReturnType<typeof request.agent>;
  let originalGuestId = "";
  let firstReference = "";
  let secondReference = "";

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    admin = request.agent(app);
    await setupAdmin(admin);

    const first = await request(app).post("/api/public/reservations").send(profile);
    expect(first.status).toBe(201);
    firstReference = first.body.reservation.reference;

    const [firstReservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, firstReference))
      .limit(1);
    originalGuestId = firstReservation.guestId;
  });

  it("does not change an existing guest's stored name or phone on a public booking", async () => {
    const second = await request(app)
      .post("/api/public/reservations")
      .send({
        ...profile,
        guestName: "Impostor Name",
        phone: "9000000000",
        checkIn: dateAt(124),
        checkOut: dateAt(126),
        address: "999 Changed Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
      });
    expect(second.status).toBe(201);
    secondReference = second.body.reservation.reference;

    const [guest] = await db.select().from(guests).where(eq(guests.id, originalGuestId)).limit(1);
    expect(guest.name).toBe("Original Guest");
    expect(guest.phone).toBe("9876500300");
    expect(guest.address).toBe("1 Original Road");
    expect(guest.city).toBe("Kolkata");
    expect(guest.state).toBe("West Bengal");
    expect(guest.postalCode).toBe("700001");

    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, secondReference))
      .limit(1);
    expect(reservation.guestId).toBe(originalGuestId);

    const verified = await request(app).post("/api/public/reservations/verify").send({
      reference: secondReference,
      email: profile.email,
    });
    expect(verified.status).toBe(200);
    expect(verified.body.reservation.guestFirstName).toBe("Original");
  });

  it("still allows an authorized staff booking to update the guest profile", async () => {
    const staffBooking = await admin.post("/api/admin/reservations").send({
      ...profile,
      guestName: "Updated by Staff",
      phone: "9876500399",
      checkIn: dateAt(128),
      checkOut: dateAt(130),
      address: "2 Staff Updated Road",
      city: "Pune",
      state: "Maharashtra",
      postalCode: "411001",
      discount: 0,
    });
    expect(staffBooking.status).toBe(201);

    const [guest] = await db.select().from(guests).where(eq(guests.id, originalGuestId)).limit(1);
    expect(guest.name).toBe("Updated by Staff");
    expect(guest.phone).toBe("9876500399");
    expect(guest.address).toBe("2 Staff Updated Road");
    expect(guest.city).toBe("Pune");
    expect(guest.state).toBe("Maharashtra");
    expect(guest.postalCode).toBe("411001");
  });
});
