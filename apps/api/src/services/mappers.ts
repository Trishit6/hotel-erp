import type { StaffRole } from "../constants";
import * as schema from "../database/schema";

type RoomTypeRow = typeof schema.roomTypes.$inferSelect;
type RoomRow = typeof schema.rooms.$inferSelect;
type GuestRow = typeof schema.guests.$inferSelect;
type ReservationRow = typeof schema.reservations.$inferSelect;
type PaymentRow = typeof schema.payments.$inferSelect;
type InvoiceRow = typeof schema.invoices.$inferSelect;
type TaskRow = typeof schema.housekeepingTasks.$inferSelect;
type StaffRow = typeof schema.staff.$inferSelect;
type AttendanceRow = typeof schema.attendance.$inferSelect;
type InventoryRow = typeof schema.inventory.$inferSelect;
type ExpenseRow = typeof schema.expenses.$inferSelect;
type OrderRow = typeof schema.restaurantOrders.$inferSelect;
type ActivityRow = typeof schema.activityLogs.$inferSelect;
type UserRow = typeof schema.users.$inferSelect;
type SettingsRow = typeof schema.systemSettings.$inferSelect;

const number = (value: string | number) => Number(value);
const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

export function mapRoomType(row: RoomTypeRow, amenities: string[] = []) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    capacity: row.capacity,
    size: row.size,
    rate: number(row.rate),
    amenities,
    image: row.image,
  };
}

export function mapRoom(row: RoomRow) {
  return {
    id: row.id,
    number: row.number,
    typeId: row.typeId,
    floor: row.floor,
    status: row.status,
    notes: row.notes,
  };
}

export function mapGuest(row: GuestRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    idType: row.idType,
    idLastFour: row.idLastFour,
    preferences: row.preferences,
    totalStays: row.totalStays,
    totalSpent: number(row.totalSpent),
  };
}

export function mapReservation(row: ReservationRow) {
  return {
    id: row.id,
    reference: row.reference,
    guestId: row.guestId,
    roomId: row.roomId,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    adults: row.adults,
    children: row.children,
    status: row.status,
    paymentStatus: row.paymentStatus,
    roomCharges: number(row.roomCharges),
    additionalCharges: number(row.additionalCharges),
    discount: number(row.discount),
    tax: number(row.tax),
    total: number(row.total),
    paidAmount: number(row.paidAmount),
    specialRequests: row.specialRequests,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapPayment(row: PaymentRow) {
  return {
    id: row.id,
    reservationId: row.reservationId,
    amount: number(row.amount),
    method: row.method,
    status: row.status,
    paidAt: row.paidAt.toISOString(),
    note: row.note,
  };
}

export function mapInvoice(row: InvoiceRow) {
  return {
    id: row.id,
    number: row.number,
    reservationId: row.reservationId,
    status: row.status,
    issuedAt: row.issuedAt.toISOString(),
    dueAmount: number(row.dueAmount),
  };
}

export function mapTask(row: TaskRow) {
  return {
    id: row.id,
    roomId: row.roomId,
    assignedTo: row.assignedTo ?? undefined,
    status: row.status,
    priority: row.priority,
    issue: row.issue,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapStaff(row: StaffRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    role: row.role as StaffRole,
    shift: row.shift,
    status: row.status,
    joinedAt: row.joinedAt,
  };
}

export function mapAttendance(row: AttendanceRow) {
  return {
    id: row.id,
    staffId: row.staffId,
    date: row.date,
    status: row.status,
    clockIn: row.clockIn ?? undefined,
    clockOut: row.clockOut ?? undefined,
  };
}

export function mapInventory(row: InventoryRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    purchasePrice: number(row.purchasePrice),
    supplier: row.supplier,
    minimumStock: row.minimumStock,
  };
}

export function mapExpense(row: ExpenseRow) {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    amount: number(row.amount),
    date: row.date,
    method: row.method,
    status: row.status,
  };
}

export function mapOrder(row: OrderRow) {
  return {
    id: row.id,
    reservationId: row.reservationId ?? undefined,
    roomNumber: row.roomNumber || undefined,
    guestName: row.guestName,
    items: row.items,
    amount: number(row.amount),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapActivity(row: ActivityRow) {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    detail: row.detail,
    tone: row.tone,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as StaffRole,
    staffId: row.staffId,
    isActive: row.isActive,
    lastLoginAt: iso(row.lastLoginAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapSettings(row: SettingsRow) {
  const address = [
    row.addressLine1,
    row.addressLine2,
    [row.city, row.state, row.postalCode].filter(Boolean).join(", "),
    row.country,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    id: row.id,
    hotelName: row.hotelName,
    legalName: row.legalName,
    email: row.email,
    phone: row.phone,
    website: row.website,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    address,
    timezone: row.timezone,
    currency: row.currency,
    taxRateBps: row.taxRateBps,
    taxRatePercent: row.taxRateBps / 100,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    invoicePrefix: row.invoicePrefix,
    logoUrl: row.logoUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}
