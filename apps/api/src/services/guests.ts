import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "../database/client";
import { guests } from "../database/schema";
import { badRequest, notFound } from "../utils/http";
import { paginated } from "../utils/pagination";
import { newId } from "../utils/id";
import { logActivity } from "./activity";
import { mapGuest } from "./mappers";

interface GuestFilters {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export async function listGuests(filters: GuestFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const conditions: SQL[] = [];
  if (filters.q) {
    const needle = `%${filters.q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${guests.name})`, needle),
        like(sql`lower(${guests.email})`, needle),
        like(sql`lower(${guests.phone})`, needle),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const sortColumn =
    filters.sort === "name" ? guests.name : filters.sort === "totalSpent" ? guests.totalSpent : guests.createdAt;
  const direction = filters.order === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(guests)
    .where(where)
    .orderBy(direction(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(guests).where(where);
  return paginated(rows.map(mapGuest), Number(countRow?.count ?? 0), page, pageSize);
}

export async function getGuest(id: string) {
  const [row] = await db.select().from(guests).where(eq(guests.id, id)).limit(1);
  return row ? mapGuest(row) : null;
}

export async function createGuest(
  input: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    preferences?: string;
  },
  actor: { id: string; name: string },
) {
  const [existing] = await db.select({ id: guests.id }).from(guests).where(eq(guests.email, input.email)).limit(1);
  if (existing) throw badRequest("A guest with that email already exists.");
  const id = newId("guest");
  await db.insert(guests).values({
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    address: input.address ?? "",
    city: input.city ?? "",
    state: input.state ?? "",
    postalCode: input.postalCode ?? "",
    idType: "Pending",
    idLastFour: "",
    preferences: input.preferences ?? "",
    totalStays: 0,
    totalSpent: "0.00",
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Added guest",
    detail: input.name,
    tone: "success",
    userId: actor.id,
  });
  return getGuest(id);
}

export async function updateGuest(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    preferences: string;
  }>,
  actor: { id: string; name: string },
) {
  const [existing] = await db.select().from(guests).where(eq(guests.id, id)).limit(1);
  if (!existing) throw notFound("Guest not found.");
  if (input.email && input.email !== existing.email) {
    const [duplicate] = await db.select({ id: guests.id }).from(guests).where(eq(guests.email, input.email)).limit(1);
    if (duplicate) throw badRequest("A guest with that email already exists.");
  }
  await db
    .update(guests)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
      ...(input.preferences !== undefined ? { preferences: input.preferences } : {}),
      updatedAt: new Date(),
    })
    .where(eq(guests.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated guest profile",
    detail: existing.name,
    tone: "info",
    userId: actor.id,
  });
  return getGuest(id);
}
