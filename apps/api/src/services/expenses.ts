import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../database/client";
import { expenses } from "../database/schema";
import type { ExpenseStatus, PaymentMethod } from "../constants";
import { conflict, notFound } from "../utils/http";
import { fromPaise, toPaise } from "../utils/money";
import { newId } from "../utils/id";
import { paginated } from "../utils/pagination";
import { logActivity } from "./activity";
import { mapExpense } from "./mappers";

interface ExpenseFilters {
  status?: ExpenseStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listExpenses(filters: ExpenseFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(expenses.status, filters.status));
  if (filters.from) conditions.push(gte(expenses.date, filters.from));
  if (filters.to) conditions.push(lte(expenses.date, filters.to));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(expenses).where(where);
  return paginated(rows.map(mapExpense), Number(countRow?.count ?? 0), page, pageSize);
}

export async function createExpense(
  input: { category: string; description: string; amount: number; method: PaymentMethod; date: string },
  actor: { id: string; name: string },
) {
  const id = newId("exp");
  await db.insert(expenses).values({
    id,
    category: input.category,
    description: input.description,
    amount: fromPaise(toPaise(input.amount)),
    method: input.method,
    date: input.date,
    status: "pending",
    submittedBy: actor.id,
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Submitted expense",
    detail: `${input.description} - INR ${input.amount}`,
    tone: "info",
    userId: actor.id,
  });
  const [created] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return mapExpense(created);
}

export async function approveExpense(
  id: string,
  status: Exclude<ExpenseStatus, "pending">,
  actor: { id: string; name: string },
) {
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!existing) throw notFound("Expense not found.");
  if (existing.status !== "pending") throw conflict("This expense has already been reviewed.");
  await db
    .update(expenses)
    .set({ status, approvedBy: actor.id, updatedAt: new Date() })
    .where(eq(expenses.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: status === "approved" ? "Approved expense" : "Rejected expense",
    detail: `${existing.description} - INR ${existing.amount}`,
    tone: status === "approved" ? "success" : "warning",
    userId: actor.id,
  });
  const [updated] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return mapExpense(updated);
}
