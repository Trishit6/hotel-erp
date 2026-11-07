import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { env } from "../config/env";
import type { UserRole } from "../constants";
import { db } from "../database/client";
import { sessions, users } from "../database/schema";
import { newSessionId, newSessionToken } from "../utils/id";

export function hashToken(token: string): string {
  return createHmac("sha256", env.session.secret).update(token).digest("hex");
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.session.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(env.session.cookieName, token, sessionCookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.session.cookieName, {
    httpOnly: true,
    secure: env.session.cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}

export async function createSession(userId: string, req: Request): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + env.session.ttlHours * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: newSessionId(),
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    lastSeenAt: new Date(),
    ip: (req.ip ?? "").slice(0, 64),
    userAgent: (req.get("user-agent") ?? "").slice(0, 255),
  });
  return { token, expiresAt };
}

export interface AuthenticatedSession {
  sessionId: string;
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    staffId: string | null;
  };
}

export async function findSession(token: string): Promise<AuthenticatedSession | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      staffId: users.staffId,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row || !row.isActive) return null;

  if (Date.now() - row.lastSeenAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.sessionId));
  }

  return {
    sessionId: row.sessionId,
    expiresAt: row.expiresAt,
    user: {
      id: row.userId,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      staffId: row.staffId,
    },
  };
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function destroyUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  const rows = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  for (const row of rows) {
    if (row.id !== exceptSessionId) await db.delete(sessions).where(eq(sessions.id, row.id));
  }
}
