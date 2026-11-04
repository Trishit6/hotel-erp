import { asc, eq, sql } from "drizzle-orm";
import { db } from "../database/client";
import { staff, users } from "../database/schema";
import type { StaffRole } from "../constants";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/http";
import { newId } from "../utils/id";
import { hashPassword, verifyPassword } from "./password";
import { destroyUserSessions } from "./session";
import { logActivity } from "./activity";
import { mapUser } from "./mappers";

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user ?? null;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function authenticate(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return null;
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return null;
  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return updated;
}

export async function userCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(row?.count ?? 0);
}

export async function createUser(
  input: { name: string; email: string; password: string; role: StaffRole; staffId?: string | null },
  actor?: { id: string; name: string },
) {
  const existing = await findUserByEmail(input.email);
  if (existing) throw badRequest("A user with that email already exists.");
  if (input.staffId) {
    const [person] = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, input.staffId)).limit(1);
    if (!person) throw badRequest("Choose a valid staff member.");
  }
  const id = newId("user");
  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    staffId: input.staffId ?? null,
    isActive: true,
    updatedAt: new Date(),
  });
  if (actor) {
    await logActivity(db, {
      actor: actor.name,
      action: "Created user account",
      detail: `${input.name} (${input.role})`,
      tone: "success",
      userId: actor.id,
    });
  }
  const [created] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return mapUser(created);
}

export async function listUsers() {
  const rows = await db.select().from(users).orderBy(asc(users.name));
  return rows.map(mapUser);
}

async function activeSuperAdminCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.role} = 'super-admin' and ${users.isActive} = 1`);
  return Number(row?.count ?? 0);
}

export async function updateUser(
  id: string,
  input: { name?: string; role?: StaffRole; isActive?: boolean; password?: string },
  actor: { id: string; name: string },
  currentSessionId?: string,
) {
  const user = await getUserById(id);
  if (!user) throw notFound("User not found.");

  const losingSuperAdmin =
    user.role === "super-admin" &&
    user.isActive &&
    ((input.role !== undefined && input.role !== "super-admin") || input.isActive === false);
  if (losingSuperAdmin && (await activeSuperAdminCount()) <= 1) {
    throw conflict("At least one active super administrator must remain.");
  }

  await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  if (input.isActive === false || input.password) {
    await destroyUserSessions(id, currentSessionId);
  }

  await logActivity(db, {
    actor: actor.name,
    action: "Updated user account",
    detail: user.email,
    tone: "info",
    userId: actor.id,
  });
  const [updated] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return mapUser(updated);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, sessionId?: string) {
  const user = await getUserById(userId);
  if (!user) throw unauthorized();
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw forbidden("Your current password is incorrect.");
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await destroyUserSessions(userId, sessionId);
}
