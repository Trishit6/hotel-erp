import { z } from "zod";
import {
  ATTENDANCE_STATUSES,
  DEPARTMENTS,
  EXPENSE_STATUSES,
  HOUSEKEEPING_PRIORITIES,
  HOUSEKEEPING_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  RESERVATION_STATUSES,
  ROOM_STATUSES,
  STAFF_ROLES,
  STAFF_STATUSES,
} from "../../constants";
import { isDateOnly } from "../../utils/date";
import { isIndianPhone, isIndianPin } from "../../utils/validation";

export const dateOnly = z
  .string()
  .refine(isDateOnly, "Use a valid date in YYYY-MM-DD format.");

export const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(191);

export const indianPhone = z
  .string()
  .trim()
  .refine(isIndianPhone, "Enter a valid Indian mobile number.");

export const optionalIndianPin = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || isIndianPin(value), "Enter a valid 6-digit PIN code.");

export const idParam = z.object({ id: z.string().min(1).max(64) });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email,
  phone: indianPhone,
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "This reset link is invalid.").max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export const accountProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: indianPhone,
    address: z.string().max(300),
    city: z.string().max(80),
    state: z.string().max(80),
    postalCode: optionalIndianPin,
    preferences: z.string().max(500),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12, "Use at least 12 characters.").max(200),
});

export const reservationBaseSchema = z.object({
  guestName: z.string().trim().min(2, "Enter the guest name.").max(120),
  email,
  phone: indianPhone,
  roomId: z.string().min(1).max(64),
  checkIn: dateOnly,
  checkOut: dateOnly,
  adults: z.coerce.number().int().min(1).max(8),
  children: z.coerce.number().int().min(0).max(8),
  specialRequests: z.string().max(500).default(""),
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  postalCode: optionalIndianPin,
});

export const publicReservationSchema = reservationBaseSchema;

export const adminReservationSchema = reservationBaseSchema.extend({
  discount: z.coerce.number().min(0).max(1_000_000).default(0),
});

export const reservationStatusSchema = z.object({ status: z.enum(RESERVATION_STATUSES) });
export const assignRoomSchema = z.object({ roomId: z.string().min(1).max(64) });

export const guestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone: indianPhone,
  address: z.string().max(300).default(""),
  city: z.string().max(80).default(""),
  state: z.string().max(80).default(""),
  postalCode: optionalIndianPin.default(""),
  preferences: z.string().max(500).default(""),
});

export const guestUpdateSchema = guestSchema.partial();

export const roomSchema = z.object({
  number: z.string().trim().min(1).max(20),
  typeId: z.string().min(1).max(64),
  floor: z.coerce.number().int().min(0).max(100),
  notes: z.string().max(500).default(""),
});

export const roomStatusSchema = z.object({ status: z.enum(ROOM_STATUSES) });

export const paymentSchema = z.object({
  reservationId: z.string().min(1).max(64),
  amount: z.coerce.number().positive("Enter a positive payment amount."),
  method: z.enum(PAYMENT_METHODS),
  note: z.string().max(300).default(""),
});

export const taskCreateSchema = z.object({
  roomId: z.string().min(1).max(64),
  assignedTo: z.string().max(64).nullable().optional(),
  priority: z.enum(HOUSEKEEPING_PRIORITIES).default("normal"),
  taskType: z.string().trim().max(80).default("Room service"),
  issue: z.string().max(300).default(""),
  dueDate: dateOnly.optional(),
});

export const taskUpdateSchema = z.object({
  assignedTo: z.string().max(64).nullable().optional(),
  status: z.enum(HOUSEKEEPING_STATUSES).optional(),
  priority: z.enum(HOUSEKEEPING_PRIORITIES).optional(),
  taskType: z.string().trim().max(80).optional(),
  issue: z.string().max(300).optional(),
  dueDate: dateOnly.nullable().optional(),
  completionNotes: z.string().max(300).optional(),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone: indianPhone,
  department: z.enum(DEPARTMENTS),
  role: z.enum(STAFF_ROLES),
  shift: z.string().trim().min(1).max(64),
  status: z.enum(STAFF_STATUSES).default("active"),
  joinedAt: dateOnly,
});

export const attendanceUpdateSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  clockIn: z.string().max(8).nullable().optional(),
  clockOut: z.string().max(8).nullable().optional(),
});

export const inventorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().max(48).default(""),
  category: z.string().trim().min(2).max(80),
  quantity: z.coerce.number().int().min(0),
  unit: z.string().trim().min(1).max(24),
  minimumStock: z.coerce.number().int().min(0),
  supplier: z.string().trim().max(120).default(""),
  purchasePrice: z.coerce.number().min(0),
});

export const inventoryAdjustSchema = z.object({ amount: z.coerce.number().int().refine((value) => value !== 0, "Enter a non-zero adjustment.") });

export const expenseSchema = z.object({
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(300),
  amount: z.coerce.number().positive("Enter a positive amount."),
  method: z.enum(PAYMENT_METHODS),
  date: dateOnly,
});

export const expenseApprovalSchema = z.object({ status: z.enum(EXPENSE_STATUSES).refine((value) => value !== "pending", "Choose approved or rejected.") });

export const orderSchema = z.object({
  guestName: z.string().trim().min(2).max(120),
  roomNumber: z.string().trim().max(20).default(""),
  reservationId: z.string().max(64).nullable().optional(),
  items: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive("Enter a positive amount."),
});

export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password: z.string().min(12, "Use at least 12 characters.").max(200),
  role: z.enum(STAFF_ROLES),
  staffId: z.string().max(64).nullable().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(12).max(200).optional(),
});

export const roomTypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(2000),
  capacity: z.coerce.number().int().min(1).max(20),
  size: z.coerce.number().int().min(1).max(2000),
  rate: z.coerce.number().positive("Enter a nightly rate."),
  image: z.string().trim().max(500).default(""),
  amenities: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
});

export const roomUpdateSchema = z.object({
  number: z.string().trim().min(1).max(20).optional(),
  typeId: z.string().min(1).max(64).optional(),
  floor: z.coerce.number().int().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const inventoryUpdateSchema = inventorySchema.partial();

export const expenseUpdateSchema = expenseSchema.partial();

export const attendanceUpsertSchema = z.object({
  date: dateOnly,
  status: z.enum(ATTENDANCE_STATUSES),
  clockIn: z.string().max(8).nullable().optional(),
  clockOut: z.string().max(8).nullable().optional(),
});

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time such as 14:00.");

export const settingsUpdateSchema = z
  .object({
    hotelName: z.string().trim().min(2).max(120),
    legalName: z.string().trim().max(160),
    email: z.union([z.literal(""), email]),
    phone: z.string().trim().max(32),
    website: z.string().trim().max(200),
    addressLine1: z.string().trim().max(200),
    addressLine2: z.string().trim().max(200),
    city: z.string().trim().max(80),
    state: z.string().trim().max(80),
    postalCode: z.string().trim().max(10),
    country: z.string().trim().max(80),
    timezone: z.string().trim().min(1).max(64),
    currency: z.string().trim().length(3),
    taxRateBps: z.coerce.number().int().min(0).max(5000),
    checkInTime: timeOfDay,
    checkOutTime: timeOfDay,
    invoicePrefix: z.string().trim().min(1).max(16),
    invoiceFooter: z.string().trim().max(300),
    cancellationPolicy: z.string().trim().max(2000),
    cancellationCutoffHours: z.coerce.number().int().min(0).max(720),
    reservationHoldHours: z.coerce.number().int().min(0).max(720),
    logoUrl: z.string().trim().max(500),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one setting to update.");

