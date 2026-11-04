export const STAFF_ROLES = [
  "super-admin",
  "admin",
  "manager",
  "receptionist",
  "housekeeping",
  "accountant",
  "restaurant",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROOM_STATUSES = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "maintenance",
  "out-of-order",
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "checked-in",
  "checked-out",
  "cancelled",
  "no-show",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "partial", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "upi", "card", "bank-transfer", "online"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DEPARTMENTS = [
  "Reception",
  "Housekeeping",
  "Restaurant",
  "Maintenance",
  "Security",
  "Management",
  "Finance",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const HOUSEKEEPING_STATUSES = ["dirty", "assigned", "in-progress", "cleaned", "inspected"] as const;
export type HousekeepingStatus = (typeof HOUSEKEEPING_STATUSES)[number];

export const HOUSEKEEPING_PRIORITIES = ["low", "normal", "high"] as const;

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const STAFF_STATUSES = ["active", "on-leave", "inactive"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const ORDER_STATUSES = ["new", "preparing", "served", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ACTIVITY_TONES = ["info", "success", "warning", "danger"] as const;
export type ActivityTone = (typeof ACTIVITY_TONES)[number];

/** Statuses that no longer block a room for overlapping dates. */
export const RELEASED_RESERVATION_STATUSES: ReservationStatus[] = ["cancelled", "checked-out", "no-show"];

/** Room statuses that cannot sell a stay. */
export const UNAVAILABLE_ROOM_STATUSES: RoomStatus[] = ["maintenance", "out-of-order", "cleaning"];

/** Room statuses that block check-in until housekeeping resolves them. */
export const CHECKIN_BLOCKED_ROOM_STATUSES: RoomStatus[] = ["maintenance", "out-of-order", "cleaning"];

export const IST_TIME_ZONE = "Asia/Kolkata";
export const TAX_BASIS_POINTS = 1200; // 12% demo rate, expressed in basis points.
