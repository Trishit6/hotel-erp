import { and, asc, eq, like, sql, type SQL } from "drizzle-orm";
import { db } from "../database/client";
import { inventory } from "../database/schema";
import { badRequest, conflict, notFound } from "../utils/http";
import { fromPaise, toPaise } from "../utils/money";
import { newId } from "../utils/id";
import { paginated } from "../utils/pagination";
import { logActivity } from "./activity";
import { mapInventory } from "./mappers";

interface InventoryFilters {
  q?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listInventory(filters: InventoryFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const conditions: SQL[] = [];
  if (filters.q) conditions.push(like(sql`lower(${inventory.name})`, `%${filters.q.toLowerCase()}%`));
  if (filters.category) conditions.push(eq(inventory.category, filters.category));
  if (filters.lowStock) conditions.push(sql`${inventory.quantity} <= ${inventory.minimumStock}`);
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(inventory)
    .where(where)
    .orderBy(asc(inventory.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(inventory).where(where);
  return paginated(rows.map(mapInventory), Number(countRow?.count ?? 0), page, pageSize);
}

export async function createInventoryItem(
  input: {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minimumStock: number;
    supplier: string;
    purchasePrice: number;
  },
  actor: { id: string; name: string },
) {
  const [existing] = await db.select({ id: inventory.id }).from(inventory).where(eq(inventory.name, input.name)).limit(1);
  if (existing) throw badRequest("An inventory item with that name already exists.");
  const id = newId("stock");
  await db.insert(inventory).values({
    id,
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    unit: input.unit,
    minimumStock: input.minimumStock,
    supplier: input.supplier,
    purchasePrice: fromPaise(toPaise(input.purchasePrice)),
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Added inventory item",
    detail: input.name,
    tone: "success",
    userId: actor.id,
  });
  const [created] = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  return mapInventory(created);
}

export async function adjustInventory(id: string, amount: number, actor: { id: string; name: string }) {
  if (!Number.isInteger(amount) || amount === 0) throw badRequest("Enter a non-zero whole-number adjustment.");
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(inventory).where(eq(inventory.id, id)).limit(1).for("update");
    if (!item) throw notFound("Inventory item not found.");
    const nextQuantity = item.quantity + amount;
    if (nextQuantity < 0) throw conflict(`Only ${item.quantity} ${item.unit} available.`);
    await tx.update(inventory).set({ quantity: nextQuantity, updatedAt: new Date() }).where(eq(inventory.id, id));
    await logActivity(tx, {
      actor: actor.name,
      action: amount > 0 ? "Increased stock" : "Reduced stock",
      detail: `${item.name} - ${amount > 0 ? "+" : ""}${amount} ${item.unit}`,
      tone: nextQuantity <= item.minimumStock ? "warning" : "info",
      userId: actor.id,
    });
    const [updated] = await tx.select().from(inventory).where(eq(inventory.id, id)).limit(1);
    return mapInventory(updated);
  });
}

export async function updateInventoryItem(
  id: string,
  input: Partial<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minimumStock: number;
    supplier: string;
    purchasePrice: number;
  }>,
  actor: { id: string; name: string },
) {
  const [existing] = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  if (!existing) throw notFound("Inventory item not found.");
  if (input.name && input.name !== existing.name) {
    const [duplicate] = await db.select({ id: inventory.id }).from(inventory).where(eq(inventory.name, input.name)).limit(1);
    if (duplicate) throw badRequest("An inventory item with that name already exists.");
  }
  await db
    .update(inventory)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.minimumStock !== undefined ? { minimumStock: input.minimumStock } : {}),
      ...(input.supplier !== undefined ? { supplier: input.supplier } : {}),
      ...(input.purchasePrice !== undefined ? { purchasePrice: fromPaise(toPaise(input.purchasePrice)) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(inventory.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated inventory item",
    detail: input.name ?? existing.name,
    tone: "info",
    userId: actor.id,
  });
  const [updated] = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  return mapInventory(updated);
}

export async function deleteInventoryItem(id: string, actor: { id: string; name: string }) {
  const [existing] = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  if (!existing) throw notFound("Inventory item not found.");
  await db.delete(inventory).where(eq(inventory.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Deleted inventory item",
    detail: existing.name,
    tone: "warning",
    userId: actor.id,
  });
  return { ok: true };
}
