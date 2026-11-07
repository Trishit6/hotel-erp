import { asc, eq, sql } from "drizzle-orm";
import { db } from "../database/client";
import { guests, staff, users } from "../database/schema";
import { CUSTOMER_ROLE, type StaffRole, type UserRole } from "../constants";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/http";
import { newId } from "../utils/id";
import { hashPassword, verifyPassword } from "./password";
import { destroyUserSessions } from "./session";
import { logActivity } from "./activity";
import { mapUser } from "./mappers";
import { ensureRoles } from "./roles";

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
  input: { name: string; email: string; password: string; role: UserRole; staffId?: string | null },
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

/**
 * Public signup. The role is hard-coded to `customer`; callers cannot choose a
 * staff role. The matching guest record is linked by email so a customer sees
 * the reservations they already made through the public booking flow.
 */
export async function registerCustomer(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (await findUserByEmail(email)) {
    throw conflict("An account with that email already exists. Sign in instead.");
  }
  await ensureRoles();
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existingGuest] = await tx.select().from(guests).where(eq(guests.email, email)).limit(1);
    if (existingGuest) {
      await tx
        .update(guests)
        .set({ name: input.name, phone: input.phone, updatedAt: now })
        .where(eq(guests.id, existingGuest.id));
    } else {
      await tx.insert(guests).values({
        id: newId("guest"),
        name: input.name,
        email,
        phone: input.phone,
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
    }

    const id = newId("user");
    await tx.insert(users).values({
      id,
      name: input.name,
      email,
      passwordHash,
      role: CUSTOMER_ROLE,
      staffId: null,
      isActive: true,
      updatedAt: now,
    });
    await logActivity(tx, {
      actor: input.name,
      action: "Created customer account",
      detail: email,
      tone: "success",
      userId: id,
    });
    const [created] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
    return mapUser(created);
  });
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
