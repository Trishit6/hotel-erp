import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../database/client";
import { invoices, payments, reservations } from "../database/schema";
import type { PaymentMethod } from "../constants";
import { badRequest, conflict, notFound } from "../utils/http";
import { fromPaise, toPaise } from "../utils/money";
import { newId } from "../utils/id";
import { paginated } from "../utils/pagination";
import { logActivity } from "./activity";
import { mapInvoice, mapPayment, mapReservation } from "./mappers";

interface PaymentFilters {
  reservationId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listPayments(filters: PaymentFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const conditions: SQL[] = [];
  if (filters.reservationId) conditions.push(eq(payments.reservationId, filters.reservationId));
  if (filters.from) conditions.push(gte(payments.paidAt, new Date(`${filters.from}T00:00:00Z`)));
  if (filters.to) conditions.push(lte(payments.paidAt, new Date(`${filters.to}T23:59:59Z`)));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(payments)
    .where(where)
    .orderBy(desc(payments.paidAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(payments).where(where);
  return paginated(rows.map(mapPayment), Number(countRow?.count ?? 0), page, pageSize);
}

export async function recordPayment(
  input: { reservationId: string; amount: number; method: PaymentMethod; note?: string },
  actor: { id: string; name: string },
) {
  const amountPaise = toPaise(input.amount);
  if (amountPaise <= 0) throw badRequest("Enter a positive payment amount.");

  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, input.reservationId))
      .limit(1)
      .for("update");
    if (!reservation) throw notFound("Reservation not found.");
    if (reservation.status === "cancelled" || reservation.status === "no-show") {
      throw conflict("Payments cannot be recorded against a cancelled reservation.");
    }

    const totalPaise = toPaise(reservation.total);
    const paidPaise = toPaise(reservation.paidAmount);
    const outstanding = totalPaise - paidPaise;
    if (outstanding <= 0) throw conflict("This reservation is already fully paid.");
    if (amountPaise > outstanding) {
      throw badRequest(`Payment exceeds the outstanding balance of INR ${fromPaise(outstanding)}.`);
    }

    const nextPaid = paidPaise + amountPaise;
    const paymentStatus = nextPaid >= totalPaise ? "paid" : "partial";
    const now = new Date();
    const paymentId = newId("pay");

    await tx.insert(payments).values({
      id: paymentId,
      reservationId: reservation.id,
      amount: fromPaise(amountPaise),
      method: input.method,
      status: "completed",
      paidAt: now,
      note: input.note ?? "Recorded at front desk",
      recordedBy: actor.id,
    });

    await tx
      .update(reservations)
      .set({ paidAmount: fromPaise(nextPaid), paymentStatus, updatedAt: now })
      .where(eq(reservations.id, reservation.id));

    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.reservationId, reservation.id))
      .limit(1);
    if (invoice) {
      await tx
        .update(invoices)
        .set({ status: paymentStatus, dueAmount: fromPaise(totalPaise - nextPaid) })
        .where(eq(invoices.id, invoice.id));
    } else {
      await tx.insert(invoices).values({
        id: newId("inv"),
        number: `INV-${new Date().getUTCFullYear()}-${reservation.reference.replace("RIVR-", "")}`,
        reservationId: reservation.id,
        status: paymentStatus,
        issuedAt: now,
        dueAmount: fromPaise(totalPaise - nextPaid),
      });
    }

    await logActivity(tx, {
      actor: actor.name,
      action: "Recorded payment",
      detail: `${reservation.reference} - INR ${fromPaise(amountPaise)}`,
      tone: "success",
      userId: actor.id,
    });

    const [created] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    const [updated] = await tx.select().from(reservations).where(eq(reservations.id, reservation.id)).limit(1);
    return { payment: mapPayment(created), reservation: mapReservation(updated) };
  });
}

export async function listInvoices(filters: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const rows = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.issuedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  return paginated(rows.map(mapInvoice), Number(countRow?.count ?? 0), page, pageSize);
}
