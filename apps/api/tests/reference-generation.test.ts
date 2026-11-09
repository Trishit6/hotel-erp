import request from "supertest";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db } from "../src/database/client";
import { guests, invoices, reservations, users } from "../src/database/schema";
import { recordPayment } from "../src/services/payments";
import { dateAt } from "../src/utils/date";
import {
  generateUniqueReference,
  newReference,
  REFERENCE_MAX_ATTEMPTS,
  REFERENCE_RANDOM_LENGTH,
} from "../src/utils/id";
import { registerCustomerAgent, resetTestDatabase, seedTestCatalog, setupAdmin } from "./helpers";

const app = createApp();

describe("reservation reference generation", () => {
  let customer: Awaited<ReturnType<typeof registerCustomerAgent>>;

  beforeAll(async () => {
    await resetTestDatabase();
    await seedTestCatalog();
    await setupAdmin(request.agent(app));
    customer = await registerCustomerAgent(app, {
      name: "Reference Guest",
      email: "reference.guest@example.com",
      phone: "9876500400",
    });
  });

  it("generates references with ten unambiguous random characters", () => {
    const references = new Set<string>();
    for (let index = 0; index < 200; index += 1) {
      const reference = newReference();
      expect(reference).toMatch(/^RIVR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
      expect(reference.slice("RIVR-".length)).toHaveLength(REFERENCE_RANDOM_LENGTH);
      references.add(reference);
    }
    expect(references.size).toBe(200);
  });

  it("retries collisions and returns the first available reference", async () => {
    let calls = 0;
    const reference = await generateUniqueReference(
      async () => {
        calls += 1;
        return calls <= 2;
      },
      () => `RIVR-CANDIDATE${calls}`,
      5,
    );
    expect(reference).toBe("RIVR-CANDIDATE2");
    expect(calls).toBe(3);
  });

  it("fails safely after the bounded retry count", async () => {
    let calls = 0;
    await expect(
      generateUniqueReference(
        async () => {
          calls += 1;
          return true;
        },
        () => `RIVR-TAKEN${calls}`,
      ),
    ).rejects.toThrow("Unable to allocate a unique reservation reference.");
    expect(calls).toBe(REFERENCE_MAX_ATTEMPTS);
  });

  it("creates invoices from both new and legacy reference formats", async () => {
    const created = await customer.agent.post("/api/account/reservations").send({
      phone: "9876500400",
      roomId: "room-test",
      checkIn: dateAt(140),
      checkOut: dateAt(142),
      adults: 2,
      children: 0,
      specialRequests: "",
    });
    expect(created.status).toBe(201);
    const reference = created.body.reservation.reference as string;
    expect(reference).toMatch(/^RIVR-.{10}$/);

    const [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reference, reference))
      .limit(1);
    const [newInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.reservationId, row.id))
      .limit(1);
    expect(newInvoice.number).toContain(reference.replace("RIVR-", ""));

    const now = new Date();
    await db.insert(guests).values({
      id: "guest-legacy-invoice",
      name: "Legacy Invoice Guest",
      email: "legacy.invoice@example.com",
      phone: "9876500499",
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
      id: "res-legacy-invoice",
      reference: "RIVR-2481",
      guestId: "guest-legacy-invoice",
      roomId: "room-test-2",
      checkIn: dateAt(150),
      checkOut: dateAt(152),
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
    const [admin] = await db.select().from(users).where(eq(users.role, "super-admin")).limit(1);
    await recordPayment(
      {
        reservationId: "res-legacy-invoice",
        amount: 100,
        method: "cash",
        note: "Legacy invoice compatibility",
      },
      { id: admin.id, name: admin.name },
    );
    const [legacyInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.reservationId, "res-legacy-invoice"))
      .limit(1);
    expect(legacyInvoice.number).toContain("2481");
  });
});
