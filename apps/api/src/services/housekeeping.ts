import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../database/client";
import { housekeepingTasks, rooms, staff } from "../database/schema";
import type { HousekeepingStatus } from "../constants";
import { badRequest, notFound } from "../utils/http";
import { newId } from "../utils/id";
import { paginated } from "../utils/pagination";
import { logActivity } from "./activity";
import { mapTask } from "./mappers";

interface TaskFilters {
  status?: HousekeepingStatus;
  roomId?: string;
  page?: number;
  pageSize?: number;
}

export async function listTasks(filters: TaskFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(housekeepingTasks.status, filters.status));
  if (filters.roomId) conditions.push(eq(housekeepingTasks.roomId, filters.roomId));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(housekeepingTasks)
    .where(where)
    .orderBy(desc(housekeepingTasks.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(housekeepingTasks).where(where);
  return paginated(rows.map(mapTask), Number(countRow?.count ?? 0), page, pageSize);
}

export async function createTask(
  input: { roomId: string; assignedTo?: string | null; priority?: "low" | "normal" | "high"; issue?: string },
  actor: { id: string; name: string },
) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, input.roomId)).limit(1);
  if (!room) throw badRequest("Choose a valid room.");
  if (input.assignedTo) {
    const [person] = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, input.assignedTo)).limit(1);
    if (!person) throw badRequest("Choose a valid staff member.");
  }
  const id = newId("hk");
  await db.insert(housekeepingTasks).values({
    id,
    roomId: input.roomId,
    assignedTo: input.assignedTo ?? null,
    status: input.assignedTo ? "assigned" : "dirty",
    priority: input.priority ?? "normal",
    issue: input.issue ?? "Room cleaning",
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Created housekeeping task",
    detail: `Room ${room.number}`,
    tone: "info",
    userId: actor.id,
  });
  const [created] = await db.select().from(housekeepingTasks).where(eq(housekeepingTasks.id, id)).limit(1);
  return mapTask(created);
}

export async function updateTask(
  id: string,
  input: { assignedTo?: string | null; status?: HousekeepingStatus; priority?: "low" | "normal" | "high"; issue?: string },
  actor: { id: string; name: string },
) {
  const [task] = await db.select().from(housekeepingTasks).where(eq(housekeepingTasks.id, id)).limit(1);
  if (!task) throw notFound("Housekeeping task not found.");
  if (input.assignedTo) {
    const [person] = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, input.assignedTo)).limit(1);
    if (!person) throw badRequest("Choose a valid staff member.");
  }

  const now = new Date();
  await db
    .update(housekeepingTasks)
    .set({
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.issue !== undefined ? { issue: input.issue } : {}),
      updatedAt: now,
    })
    .where(eq(housekeepingTasks.id, id));

  if (input.status === "inspected") {
    await db.update(rooms).set({ status: "available", updatedAt: now }).where(eq(rooms.id, task.roomId));
  }

  await logActivity(db, {
    actor: actor.name,
    action: input.status === "inspected" ? "Marked room inspected" : "Updated housekeeping task",
    detail: `Task ${task.id.slice(0, 12)}`,
    tone: "success",
    userId: actor.id,
  });
  const [updated] = await db.select().from(housekeepingTasks).where(eq(housekeepingTasks.id, id)).limit(1);
  return mapTask(updated);
}
