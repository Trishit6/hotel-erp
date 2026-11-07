import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../database/client";
import { passwordResetTokens, users } from "../database/schema";
import { badRequest } from "../utils/http";
import { newId } from "../utils/id";
import { logActivity } from "./activity";
import { hashPassword } from "./password";
import { destroyUserSessions } from "./session";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHmac("sha256", env.session.secret).update(token).digest("hex");
}

/**
 * Issue a single-use reset token. Returns `null` for unknown or inactive
 * accounts so the endpoint can respond identically and avoid account
 * enumeration.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  if (!user || !user.isActive) return null;

  const token = randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    id: newId("prt"),
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const [row] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) throw badRequest("This reset link is invalid or has expired. Request a new one.");

  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, row.userId)).limit(1);
  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  });

  // Any stolen session for the account must stop working after a reset.
  await destroyUserSessions(row.userId);
  await logActivity(db, {
    actor: user?.name ?? "Account holder",
    action: "Reset password",
    detail: user?.email ?? "",
    tone: "info",
    userId: row.userId,
  });
}
