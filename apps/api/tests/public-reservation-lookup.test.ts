import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { guests, reservations } from "../src/database/schema";
import { dateAt } from "../src/utils/date";
import { resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

const booking = (overrides: Record<string, unknown> = {}) => ({
  guestName: "Lookup Guest",
  email: "lookup.guest@example.com",
  phone: "9876500100",
  roomId: "room-test",
  checkIn: dateAt(70),
  checkOut: dateAt(72),
  adults: 2,
  children: 0,
  specialRequests: "",
  ...overrides,
});

let ipCounter = 1;
function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function verify(body: Record<string, unknown>, ip = nextIp()) {
  return request(app)
    .post("/api/public/reservations/verify")
    .set("X-Forwarded-For", ip)
    .send(body);
}

describe("verified public reservation lookup", () => {
  let reference = "";
  let phoneReference = "";
  let phoneGuestEmail = "";

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    await setupAdmin(request.agent(app));

    const primary = await request(app)
      .post("/api/public/reservations")
      .set("X-Forwarded-For", nextIp())
      .send(booking({ guestName: "Private Person" }));
    expect(primary.status).toBe(201);
    reference = primary.body.reservation.reference;

    const phoneGuest = await request(app)
      .post("/api/public/reservations")
      .set("X-Forwarded-For", nextIp())
      .send(
        booking({
          guestName: "Phone Person",
          email: "phone.person@example.com",
          phone: "+91 98765 00111",
          checkIn: dateAt(80),
          checkOut: dateAt(82),
        }),
      );
    expect(phoneGuest.status).toBe(201);
    phoneReference = phoneGuest.body.reservation.reference;
    phoneGuestEmail = "phone.person@example.com";
  });

  it("does not retrieve a reservation from a single-character lookup", async () => {
    const response = await verify({ reference: "R", email: "lookup.guest@example.com" });
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Reservation not found.");
  });

  it("treats percent and underscore as literal characters, not wildcards", async () => {
    for (const candidate of ["%", "_", "%_%", "RIVR-%"]) {
      const response = await verify({
        reference: candidate,
        email: "lookup.guest@example.com",
      });
      expect(response.status, candidate).toBe(404);
    }
  });

  it("returns a generic 404 for a correct reference with the wrong email", async () => {
    const response = await verify({
      reference,
      email: "attacker@example.com",
    });
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Reservation not found.");
  });

  it("returns a generic 404 for a correct reference with the wrong phone", async () => {
    const response = await verify({ reference, phone: "9000000000" });
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Reservation not found.");
  });

  it("accepts a normalized matching email", async () => {
    const response = await verify({
      reference: reference.toLowerCase(),
      email: "  LOOKUP.GUEST@EXAMPLE.COM  ",
    });
    expect(response.status).toBe(200);
    expect(response.body.reservation.reference).toBe(reference);
  });

  it("accepts a normalized matching phone", async () => {
    const response = await verify({
      reference: phoneReference,
      phone: phoneGuestEmail ? "9876500111" : "",
    });
    expect(response.status).toBe(200);
    expect(response.body.reservation.reference).toBe(phoneReference);
  });

  it("returns only the allowlisted public fields", async () => {
    const response = await verify({
      reference,
      email: "lookup.guest@example.com",
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
    const serialized = JSON.stringify(response.body);
    for (const forbidden of [
      "Private Person",
      "lookup.guest@example.com",
      "9876500100",
      "idLastFour",
      "address",
      "guestId",
      "roomId",
      "reservationId",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(response.body.reservation.guestFirstName).toBe("Private");
  });

  it("continues to resolve legacy short references", async () => {
    const now = new Date();
    await db.insert(guests).values({
      id: "guest-legacy-lookup",
      name: "Legacy Guest",
      email: "legacy.lookup@example.com",
      phone: "9876500222",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      idType: "Pending",
      idLastFour: "",
      preferences: "",
      totalStays: 0,
      totalSpent: "0.00",
      updatedAt: now,
    });
    await db.insert(reservations).values({
      id: "res-legacy-lookup",
      reference: "RIVR-2481",
      guestId: "guest-legacy-lookup",
      roomId: "room-test-2",
      checkIn: dateAt(90),
      checkOut: dateAt(92),
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

    const response = await verify({
      reference: "rivr-2481",
      email: "legacy.lookup@example.com",
    });
    expect(response.status).toBe(200);
    expect(response.body.reservation.reference).toBe("RIVR-2481");
  });

  it("rate-limits the verification endpoint and keeps the removed detail path unavailable", async () => {
    const ip = "203.0.113.50";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await verify(
        { reference: "RIVR-NOTREAL", email: "nobody@example.com" },
        ip,
      );
      expect(response.status).toBe(404);
    }
    const limited = await verify(
      { reference: "RIVR-NOTREAL", email: "nobody@example.com" },
      ip,
    );
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("rate_limited");
    expect(limited.body.error.message).not.toContain("nobody@example.com");

    const detail = await request(app).get(`/api/public/reservations/${reference}`);
    expect(detail.status).toBe(404);
  });
});
