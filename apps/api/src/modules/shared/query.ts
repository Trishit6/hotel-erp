import { z } from "zod";
import {
  EXPENSE_STATUSES,
  HOUSEKEEPING_STATUSES,
  ORDER_STATUSES,
  RESERVATION_STATUSES,
} from "../../constants";
import { dateOnly } from "./schemas";

export const reservationQuerySchema = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const guestQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const paymentQuerySchema = z.object({
  reservationId: z.string().max(64).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const taskQuerySchema = z.object({
  status: z.enum(HOUSEKEEPING_STATUSES).optional(),
  roomId: z.string().max(64).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const expenseQuerySchema = z.object({
  status: z.enum(EXPENSE_STATUSES).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const orderQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const inventoryQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  lowStock: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true" || value === "1"),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const attendanceQuerySchema = z.object({
  date: dateOnly.optional(),
});

export const reportQuerySchema = z.object({
  from: dateOnly,
  to: dateOnly,
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
