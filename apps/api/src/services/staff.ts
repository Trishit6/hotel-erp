import { asc, desc, eq } from "drizzle-orm";
import { db } from "../database/client";
import { attendance, staff } from "../database/schema";
import type { AttendanceStatus, Department, StaffRole, StaffStatus } from "../constants";
import { badRequest, notFound } from "../utils/http";
import { newId } from "../utils/id";
import { todayIst } from "../utils/date";
import { logActivity } from "./activity";
import { mapAttendance, mapStaff } from "./mappers";

export async function listStaff() {
  const rows = await db.select().from(staff).orderBy(asc(staff.name));
  return rows.map(mapStaff);
}

export async function createStaff(
  input: {
    name: string;
    email: string;
    phone: string;
    department: Department;
    role: StaffRole;
    shift: string;
    status?: StaffStatus;
    joinedAt: string;
  },
  actor: { id: string; name: string },
) {
  const [existing] = await db.select({ id: staff.id }).from(staff).where(eq(staff.email, input.email)).limit(1);
  if (existing) throw badRequest("A staff member with that email already exists.");
  const id = newId("staff");
  await db.insert(staff).values({
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    department: input.department,
    role: input.role,
    shift: input.shift,
    status: input.status ?? "active",
    joinedAt: input.joinedAt,
    updatedAt: new Date(),
  });
  await logActivity(db, {
    actor: actor.name,
    action: "Added staff member",
    detail: input.name,
    tone: "success",
    userId: actor.id,
  });
  const [created] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  return mapStaff(created);
}

export async function updateStaff(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    phone: string;
    department: Department;
    role: StaffRole;
    shift: string;
    status: StaffStatus;
  }>,
  actor: { id: string; name: string },
) {
  const [existing] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  if (!existing) throw notFound("Staff member not found.");
  if (input.email && input.email !== existing.email) {
    const [duplicate] = await db.select({ id: staff.id }).from(staff).where(eq(staff.email, input.email)).limit(1);
    if (duplicate) throw badRequest("A staff member with that email already exists.");
  }
  await db
    .update(staff)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(staff.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated staff member",
    detail: existing.name,
    tone: "info",
    userId: actor.id,
  });
  const [updated] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  return mapStaff(updated);
}

export async function listAttendance(date = todayIst()) {
  const rows = await db.select().from(attendance).where(eq(attendance.date, date)).orderBy(desc(attendance.createdAt));
  return rows.map(mapAttendance);
}

export async function updateAttendance(
  id: string,
  input: { status: AttendanceStatus; clockIn?: string | null; clockOut?: string | null },
  actor: { id: string; name: string },
) {
  const [existing] = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  if (!existing) throw notFound("Attendance record not found.");
  await db
    .update(attendance)
    .set({
      status: input.status,
      ...(input.clockIn !== undefined ? { clockIn: input.clockIn } : {}),
      ...(input.clockOut !== undefined ? { clockOut: input.clockOut } : {}),
      updatedAt: new Date(),
    })
    .where(eq(attendance.id, id));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated attendance",
    detail: `${existing.staffId} - ${input.status}`,
    tone: "info",
    userId: actor.id,
  });
  const [updated] = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  return mapAttendance(updated);
}

export async function ensureAttendance(staffId: string, date = todayIst()) {
  const [existing] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.staffId, staffId))
    .orderBy(desc(attendance.date))
    .limit(1);
  if (existing && existing.date === date) return mapAttendance(existing);
  const id = newId("att");
  await db.insert(attendance).values({ id, staffId, date, status: "present", clockIn: null, clockOut: null, updatedAt: new Date() });
  const [created] = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
  return mapAttendance(created);
}
