import { and, asc, eq, gt, isNotNull, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "../database/client";
import { guests, reservationStatusHistory, reservations, rooms } from "../database/schema";
import { RELEASED_RESERVATION_STATUSES } from "../constants";
import { todayIst } from "../utils/date";
import { normalizeEmailForMatch, normalizePhoneForMatch } from "../utils/contact";
import { conflict } from "../utils/http";
import { newId } from "../utils/id";
import { logActivity } from "./activity";

export const PUBLIC_HOLD_HOURS = 2;
export const MAX_ACTIVE_PUBLIC_HOLDS = 3;
export const HOLD_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 100;

/**
 * Null means a reservation has no hold expiry (staff bookings and historical
 * records). A non-null timestamp blocks availability until it passes.
 */
export function unexpiredHoldCondition(): SQL {
  return sql`(${reservations.holdExpiresAt} IS NULL OR ${reservations.holdExpiresAt} > UTC_TIMESTAMP())`;
}

export function activeReservationCondition(): SQL {
  return and(notInArray(reservations.status, RELEASED_RESERVATION_STATUSES), unexpiredHoldCondition())!;
}

function normalizedStoredPhone() {
  return sql`RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${guests.phone}, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', ''), 10)`;
}

/**
 * Count only public, active, unexpired holds tied to the same normalized email
 * or phone. Locking the guest row and the candidate hold rows serializes
 * concurrent attempts for the same contact where MySQL can acquire the locks.
 */
export async function assertPublicHoldLimit(
  tx: Tx,
  guestId: string,
  email: string,
  phone: string,
): Promise<void> {
  await tx.select({ id: guests.id }).from(guests).where(eq(guests.id, guestId)).limit(1).for("update");

  const activeHolds = await tx
    .select({ id: reservations.id })
    .from(reservations)
    .innerJoin(guests, eq(guests.id, reservations.guestId))
    .where(
      and(
        eq(reservations.status, "pending"),
        isNotNull(reservations.holdExpiresAt),
        gt(reservations.holdExpiresAt, sql`UTC_TIMESTAMP()`),
        or(
          eq(guests.email, normalizeEmailForMatch(email)),
          eq(normalizedStoredPhone(), normalizePhoneForMatch(phone)),
        ),
      ),
    )
    .limit(MAX_ACTIVE_PUBLIC_HOLDS)
    .for("update");

  if (activeHolds.length >= MAX_ACTIVE_PUBLIC_HOLDS) {
    throw conflict(
      "You already have the maximum number of active booking holds for this contact. Complete or cancel one before starting another.",
    );
  }
}

let cleanupInProgress = false;

/**
 * Cancel expired public holds atomically. The in-process guard prevents
 * overlapping scheduled runs; row locks protect against another API process
 * acting on the same reservation at the same time.
 */
export async function expirePublicReservationHolds(): Promise<number> {
  if (cleanupInProgress) return 0;
  cleanupInProgress = true;

  try {
    return await db.transaction(async (tx) => {
      const candidates = await tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.status, "pending"),
            isNotNull(reservations.holdExpiresAt),
            lte(reservations.holdExpiresAt, sql`UTC_TIMESTAMP()`),
          ),
        )
        .orderBy(asc(reservations.holdExpiresAt))
        .limit(CLEANUP_BATCH_SIZE)
        .for("update");

      let cancelled = 0;
      const today = todayIst();

      for (const candidate of candidates) {
        const [reservation] = await tx
          .select()
          .from(reservations)
          .where(
            and(
              eq(reservations.id, candidate.id),
              eq(reservations.status, "pending"),
              isNotNull(reservations.holdExpiresAt),
              lte(reservations.holdExpiresAt, sql`UTC_TIMESTAMP()`),
            ),
          )
          .limit(1)
          .for("update");
        // Re-check after waiting for a concurrent payment, confirmation, or
        // cleanup transaction to release its lock.
        if (!reservation) continue;

        const [room] = await tx.select().from(rooms).where(eq(rooms.id, reservation.roomId)).limit(1).for("update");
        const now = new Date();

        await tx
          .update(reservations)
          .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
          .where(eq(reservations.id, reservation.id));

        if (room?.status === "reserved") {
          const [otherStay] = await tx
            .select({ id: reservations.id })
            .from(reservations)
            .where(
              and(
                eq(reservations.roomId, room.id),
                ne(reservations.id, reservation.id),
                activeReservationCondition(),
                lte(reservations.checkIn, today),
                gt(reservations.checkOut, today),
              ),
            )
            .limit(1)
            .for("update");
          if (!otherStay) {
            await tx.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, room.id));
          }
        }

        await tx.insert(reservationStatusHistory).values({
          id: newId("reshist"),
          reservationId: reservation.id,
          fromStatus: "pending",
          toStatus: "cancelled",
          note: "Public hold expired",
          changedBy: null,
        });

        await logActivity(tx, {
          actor: "System",
          action: "Expired reservation hold",
          detail: reservation.reference,
          tone: "warning",
          userId: null,
        });
        cancelled += 1;
      }

      return cancelled;
    });
  } finally {
    cleanupInProgress = false;
  }
}
