import {
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  ACTIVITY_TONES,
  ATTENDANCE_STATUSES,
  DEPARTMENTS,
  EXPENSE_STATUSES,
  HOUSEKEEPING_PRIORITIES,
  HOUSEKEEPING_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
  ROOM_STATUSES,
  STAFF_ROLES,
  STAFF_STATUSES,
} from "../constants";

const id = (name = "id") => varchar(name, { length: 64 });
const money = (name: string) => decimal(name, { precision: 12, scale: 2 });
const createdAt = () => timestamp("created_at", { mode: "date" }).notNull().defaultNow();
const updatedAt = () => datetime("updated_at", { mode: "date" }).notNull();

export const roles = mysqlTable("roles", {
  code: varchar("code", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  description: varchar("description", { length: 255 }).notNull().default(""),
});

export const staff = mysqlTable(
  "staff",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    department: mysqlEnum("department", DEPARTMENTS).notNull(),
    role: varchar("role", { length: 32 })
      .notNull()
      .references(() => roles.code, { onDelete: "restrict", onUpdate: "cascade" }),
    shift: varchar("shift", { length: 64 }).notNull().default("General"),
    status: mysqlEnum("status", STAFF_STATUSES).notNull().default("active"),
    joinedAt: date("joined_at", { mode: "string" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("staff_email_unique").on(table.email), index("staff_department_idx").on(table.department)],
);

export const users = mysqlTable(
  "users",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 32 })
      .notNull()
      .references(() => roles.code, { onDelete: "restrict", onUpdate: "cascade" }),
    staffId: id("staff_id").references(() => staff.id, { onDelete: "set null", onUpdate: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: datetime("last_login_at", { mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_staff_idx").on(table.staffId),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: id().primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    lastSeenAt: datetime("last_seen_at", { mode: "date" }).notNull(),
    ip: varchar("ip", { length: 64 }).notNull().default(""),
    userAgent: varchar("user_agent", { length: 255 }).notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const roomTypes = mysqlTable(
  "room_types",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull(),
    capacity: int("capacity").notNull(),
    size: int("size").notNull(),
    rate: money("rate").notNull(),
    image: varchar("image", { length: 500 }).notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("room_types_name_unique").on(table.name)],
);

export const roomTypeAmenities = mysqlTable(
  "room_type_amenities",
  {
    id: id().primaryKey(),
    roomTypeId: id("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    amenity: varchar("amenity", { length: 120 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [index("room_type_amenities_type_idx").on(table.roomTypeId)],
);

export const rooms = mysqlTable(
  "rooms",
  {
    id: id().primaryKey(),
    number: varchar("number", { length: 20 }).notNull(),
    typeId: id("type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    floor: int("floor").notNull(),
    status: mysqlEnum("status", ROOM_STATUSES).notNull().default("available"),
    notes: varchar("notes", { length: 500 }).notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("rooms_number_unique").on(table.number),
    index("rooms_type_idx").on(table.typeId),
    index("rooms_status_idx").on(table.status),
  ],
);

export const guests = mysqlTable(
  "guests",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    address: varchar("address", { length: 300 }).notNull().default(""),
    city: varchar("city", { length: 80 }).notNull().default(""),
    state: varchar("state", { length: 80 }).notNull().default(""),
    postalCode: varchar("postal_code", { length: 10 }).notNull().default(""),
    idType: varchar("id_type", { length: 40 }).notNull().default("Pending"),
    idLastFour: varchar("id_last_four", { length: 4 }).notNull().default(""),
    preferences: varchar("preferences", { length: 500 }).notNull().default(""),
    totalStays: int("total_stays").notNull().default(0),
    totalSpent: money("total_spent").notNull().default("0.00"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("guests_email_unique").on(table.email),
    index("guests_name_idx").on(table.name),
    index("guests_phone_idx").on(table.phone),
  ],
);

export const reservations = mysqlTable(
  "reservations",
  {
    id: id().primaryKey(),
    reference: varchar("reference", { length: 24 }).notNull(),
    guestId: id("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "restrict", onUpdate: "cascade" }),
    roomId: id("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict", onUpdate: "cascade" }),
    checkIn: date("check_in", { mode: "string" }).notNull(),
    checkOut: date("check_out", { mode: "string" }).notNull(),
    adults: int("adults").notNull().default(1),
    children: int("children").notNull().default(0),
    status: mysqlEnum("status", RESERVATION_STATUSES).notNull().default("confirmed"),
    paymentStatus: mysqlEnum("payment_status", PAYMENT_STATUSES).notNull().default("pending"),
    roomCharges: money("room_charges").notNull().default("0.00"),
    additionalCharges: money("additional_charges").notNull().default("0.00"),
    discount: money("discount").notNull().default("0.00"),
    tax: money("tax").notNull().default("0.00"),
    total: money("total").notNull().default("0.00"),
    paidAmount: money("paid_amount").notNull().default("0.00"),
    specialRequests: varchar("special_requests", { length: 500 }).notNull().default(""),
    checkedInAt: datetime("checked_in_at", { mode: "date" }),
    checkedOutAt: datetime("checked_out_at", { mode: "date" }),
    cancelledAt: datetime("cancelled_at", { mode: "date" }),
    holdExpiresAt: datetime("hold_expires_at", { mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("reservations_reference_unique").on(table.reference),
    index("reservations_room_dates_idx").on(table.roomId, table.checkIn, table.checkOut),
    index("reservations_status_idx").on(table.status),
    index("reservations_hold_idx").on(table.status, table.holdExpiresAt),
    index("reservations_guest_idx").on(table.guestId),
    index("reservations_created_idx").on(table.createdAt),
  ],
);

export const payments = mysqlTable(
  "payments",
  {
    id: id().primaryKey(),
    reservationId: id("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    amount: money("amount").notNull(),
    method: mysqlEnum("method", PAYMENT_METHODS).notNull(),
    status: mysqlEnum("status", ["completed", "refunded"] as const).notNull().default("completed"),
    paidAt: datetime("paid_at", { mode: "date" }).notNull(),
    note: varchar("note", { length: 300 }).notNull().default(""),
    recordedBy: id("recorded_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  },
  (table) => [index("payments_reservation_idx").on(table.reservationId), index("payments_paid_at_idx").on(table.paidAt)],
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: id().primaryKey(),
    number: varchar("number", { length: 32 }).notNull(),
    reservationId: id("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    status: mysqlEnum("status", PAYMENT_STATUSES).notNull().default("pending"),
    issuedAt: datetime("issued_at", { mode: "date" }).notNull(),
    dueAmount: money("due_amount").notNull().default("0.00"),
  },
  (table) => [
    uniqueIndex("invoices_number_unique").on(table.number),
    index("invoices_reservation_idx").on(table.reservationId),
    index("invoices_status_idx").on(table.status),
  ],
);

export const housekeepingTasks = mysqlTable(
  "housekeeping_tasks",
  {
    id: id().primaryKey(),
    roomId: id("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    assignedTo: id("assigned_to").references(() => staff.id, { onDelete: "set null", onUpdate: "cascade" }),
    status: mysqlEnum("status", HOUSEKEEPING_STATUSES).notNull().default("dirty"),
    priority: mysqlEnum("priority", HOUSEKEEPING_PRIORITIES).notNull().default("normal"),
    taskType: varchar("task_type", { length: 80 }).notNull().default("Room service"),
    issue: varchar("issue", { length: 300 }).notNull().default(""),
    dueDate: date("due_date", { mode: "string" }),
    completionNotes: varchar("completion_notes", { length: 300 }).notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("housekeeping_room_idx").on(table.roomId),
    index("housekeeping_status_idx").on(table.status),
    index("housekeeping_assigned_idx").on(table.assignedTo),
  ],
);

export const attendance = mysqlTable(
  "attendance",
  {
    id: id().primaryKey(),
    staffId: id("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade", onUpdate: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    status: mysqlEnum("status", ATTENDANCE_STATUSES).notNull().default("present"),
    clockIn: varchar("clock_in", { length: 8 }),
    clockOut: varchar("clock_out", { length: 8 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("attendance_staff_date_unique").on(table.staffId, table.date)],
);

export const inventory = mysqlTable(
  "inventory",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    sku: varchar("sku", { length: 48 }).notNull().default(""),
    category: varchar("category", { length: 80 }).notNull(),
    quantity: int("quantity").notNull().default(0),
    unit: varchar("unit", { length: 24 }).notNull().default("unit"),
    minimumStock: int("minimum_stock").notNull().default(0),
    supplier: varchar("supplier", { length: 120 }).notNull().default(""),
    purchasePrice: money("purchase_price").notNull().default("0.00"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("inventory_category_idx").on(table.category),
    index("inventory_sku_idx").on(table.sku),
    uniqueIndex("inventory_name_unique").on(table.name),
  ],
);

export const expenses = mysqlTable(
  "expenses",
  {
    id: id().primaryKey(),
    category: varchar("category", { length: 80 }).notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    amount: money("amount").notNull(),
    method: mysqlEnum("method", PAYMENT_METHODS).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    status: mysqlEnum("status", EXPENSE_STATUSES).notNull().default("pending"),
    submittedBy: id("submitted_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    approvedBy: id("approved_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("expenses_status_idx").on(table.status), index("expenses_date_idx").on(table.date)],
);

export const restaurantOrders = mysqlTable(
  "restaurant_orders",
  {
    id: id().primaryKey(),
    guestName: varchar("guest_name", { length: 120 }).notNull(),
    roomNumber: varchar("room_number", { length: 20 }).notNull().default(""),
    reservationId: id("reservation_id").references(() => reservations.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    items: varchar("items", { length: 500 }).notNull(),
    amount: money("amount").notNull(),
    status: mysqlEnum("status", ORDER_STATUSES).notNull().default("new"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("restaurant_orders_status_idx").on(table.status), index("restaurant_orders_created_idx").on(table.createdAt)],
);

export const restaurantMenuCategories = mysqlTable(
  "restaurant_menu_categories",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 255 }).notNull().default(""),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("restaurant_menu_categories_name_unique").on(table.name),
    index("restaurant_menu_categories_sort_idx").on(table.sortOrder),
  ],
);

export const restaurantMenuItems = mysqlTable(
  "restaurant_menu_items",
  {
    id: id().primaryKey(),
    categoryId: id("category_id")
      .notNull()
      .references(() => restaurantMenuCategories.id, { onDelete: "restrict", onUpdate: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 300 }).notNull().default(""),
    price: money("price").notNull(),
    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("restaurant_menu_items_name_unique").on(table.name),
    index("restaurant_menu_items_category_idx").on(table.categoryId),
  ],
);

export const activityLogs = mysqlTable(
  "activity_logs",
  {
    id: id().primaryKey(),
    actor: varchar("actor", { length: 120 }).notNull(),
    action: varchar("action", { length: 160 }).notNull(),
    detail: varchar("detail", { length: 500 }).notNull().default(""),
    tone: mysqlEnum("tone", ACTIVITY_TONES).notNull().default("info"),
    userId: id("user_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("activity_logs_created_idx").on(table.createdAt)],
);

/**
 * Single-row property configuration. Keeping this in the database lets the
 * public site, invoices and server-side tax calculation share one source of
 * truth instead of duplicating hotel details in the frontend bundle.
 */
export const systemSettings = mysqlTable("system_settings", {
  id: id().primaryKey(),
  hotelName: varchar("hotel_name", { length: 120 }).notNull(),
  legalName: varchar("legal_name", { length: 160 }).notNull().default(""),
  email: varchar("email", { length: 191 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }).notNull().default(""),
  website: varchar("website", { length: 200 }).notNull().default(""),
  addressLine1: varchar("address_line_1", { length: 200 }).notNull().default(""),
  addressLine2: varchar("address_line_2", { length: 200 }).notNull().default(""),
  city: varchar("city", { length: 80 }).notNull().default(""),
  state: varchar("state", { length: 80 }).notNull().default(""),
  postalCode: varchar("postal_code", { length: 10 }).notNull().default(""),
  country: varchar("country", { length: 80 }).notNull().default("India"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
  currency: varchar("currency", { length: 8 }).notNull().default("INR"),
  taxRateBps: int("tax_rate_bps").notNull().default(1200),
  checkInTime: varchar("check_in_time", { length: 8 }).notNull().default("14:00"),
  checkOutTime: varchar("check_out_time", { length: 8 }).notNull().default("11:00"),
  invoicePrefix: varchar("invoice_prefix", { length: 16 }).notNull().default("INV"),
  invoiceFooter: varchar("invoice_footer", { length: 300 }).notNull().default(""),
  cancellationPolicy: text("cancellation_policy").notNull().default(""),
  cancellationCutoffHours: int("cancellation_cutoff_hours").notNull().default(24),
  reservationHoldHours: int("reservation_hold_hours").notNull().default(2),
  logoUrl: varchar("logo_url", { length: 500 }).notNull().default(""),
  updatedBy: id("updated_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------------- */
/* Access control additions                                                   */
/* ------------------------------------------------------------------------- */

export const permissions = mysqlTable("permissions", {
  code: varchar("code", { length: 64 }).primaryKey(),
  description: varchar("description", { length: 255 }).notNull().default(""),
});

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleCode: varchar("role_code", { length: 32 })
      .notNull()
      .references(() => roles.code, { onDelete: "cascade", onUpdate: "cascade" }),
    permissionCode: varchar("permission_code", { length: 64 })
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleCode, table.permissionCode] })],
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: id().primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    usedAt: datetime("used_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_hash_unique").on(table.tokenHash),
    index("password_reset_tokens_user_idx").on(table.userId),
  ],
);

export const invitations = mysqlTable(
  "invitations",
  {
    id: id().primaryKey(),
    email: varchar("email", { length: 191 }).notNull(),
    role: varchar("role", { length: 32 })
      .notNull()
      .references(() => roles.code, { onDelete: "restrict", onUpdate: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    invitedBy: id("invited_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    acceptedAt: datetime("accepted_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("invitations_email_unique").on(table.email),
    uniqueIndex("invitations_token_unique").on(table.tokenHash),
  ],
);

/* ------------------------------------------------------------------------- */
/* Property structure                                                         */
/* ------------------------------------------------------------------------- */

export const hotels = mysqlTable("hotels", {
  id: id().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  legalName: varchar("legal_name", { length: 160 }).notNull().default(""),
  email: varchar("email", { length: 191 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }).notNull().default(""),
  website: varchar("website", { length: 200 }).notNull().default(""),
  addressLine1: varchar("address_line_1", { length: 200 }).notNull().default(""),
  city: varchar("city", { length: 80 }).notNull().default(""),
  state: varchar("state", { length: 80 }).notNull().default(""),
  postalCode: varchar("postal_code", { length: 10 }).notNull().default(""),
  country: varchar("country", { length: 80 }).notNull().default("India"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const branches = mysqlTable(
  "branches",
  {
    id: id().primaryKey(),
    hotelId: id("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade", onUpdate: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 24 }).notNull(),
    addressLine1: varchar("address_line_1", { length: 200 }).notNull().default(""),
    city: varchar("city", { length: 80 }).notNull().default(""),
    state: varchar("state", { length: 80 }).notNull().default(""),
    postalCode: varchar("postal_code", { length: 10 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("branches_code_unique").on(table.code),
    index("branches_hotel_idx").on(table.hotelId),
  ],
);

export const roomAmenities = mysqlTable(
  "room_amenities",
  {
    id: id().primaryKey(),
    roomId: id("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
    amenity: varchar("amenity", { length: 120 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("room_amenities_room_name_unique").on(table.roomId, table.amenity)],
);

/* ------------------------------------------------------------------------- */
/* Reservations, check-in/out and history                                     */
/* ------------------------------------------------------------------------- */

export const reservationGuests = mysqlTable(
  "reservation_guests",
  {
    id: id().primaryKey(),
    reservationId: id("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    guestId: id("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "restrict", onUpdate: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("reservation_guests_unique").on(table.reservationId, table.guestId)],
);

export const reservationStatusHistory = mysqlTable(
  "reservation_status_history",
  {
    id: id().primaryKey(),
    reservationId: id("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    note: varchar("note", { length: 300 }).notNull().default(""),
    changedBy: id("changed_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("reservation_status_history_res_idx").on(table.reservationId)],
);

export const checkIns = mysqlTable(
  "check_ins",
  {
    id: id().primaryKey(),
    reservationId: id("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    roomId: id("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict", onUpdate: "cascade" }),
    checkedInAt: datetime("checked_in_at", { mode: "date" }).notNull(),
    checkedInBy: id("checked_in_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    notes: varchar("notes", { length: 300 }).notNull().default(""),
  },
  (table) => [uniqueIndex("check_ins_reservation_unique").on(table.reservationId)],
);

export const checkOuts = mysqlTable(
  "check_outs",
  {
    id: id().primaryKey(),
    reservationId: id("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    roomId: id("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict", onUpdate: "cascade" }),
    checkedOutAt: datetime("checked_out_at", { mode: "date" }).notNull(),
    checkedOutBy: id("checked_out_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    notes: varchar("notes", { length: 300 }).notNull().default(""),
  },
  (table) => [uniqueIndex("check_outs_reservation_unique").on(table.reservationId)],
);

/* ------------------------------------------------------------------------- */
/* Billing                                                                    */
/* ------------------------------------------------------------------------- */

export const invoiceItems = mysqlTable(
  "invoice_items",
  {
    id: id().primaryKey(),
    invoiceId: id("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade", onUpdate: "cascade" }),
    description: varchar("description", { length: 200 }).notNull(),
    quantity: int("quantity").notNull().default(1),
    unitPrice: money("unit_price").notNull().default("0.00"),
    amount: money("amount").notNull().default("0.00"),
    createdAt: createdAt(),
  },
  (table) => [index("invoice_items_invoice_idx").on(table.invoiceId)],
);

export const refunds = mysqlTable(
  "refunds",
  {
    id: id().primaryKey(),
    paymentId: id("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade", onUpdate: "cascade" }),
    amount: money("amount").notNull(),
    reason: varchar("reason", { length: 300 }).notNull().default(""),
    status: mysqlEnum("status", ["pending", "approved", "processed", "rejected"] as const)
      .notNull()
      .default("pending"),
    processedBy: id("processed_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    processedAt: datetime("processed_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [index("refunds_payment_idx").on(table.paymentId)],
);

/* ------------------------------------------------------------------------- */
/* People, shifts and leave                                                   */
/* ------------------------------------------------------------------------- */

export const departments = mysqlTable(
  "departments",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 255 }).notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("departments_name_unique").on(table.name)],
);

export const shifts = mysqlTable(
  "shifts",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    startTime: varchar("start_time", { length: 8 }).notNull(),
    endTime: varchar("end_time", { length: 8 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("shifts_name_unique").on(table.name)],
);

export const leaveRequests = mysqlTable(
  "leave_requests",
  {
    id: id().primaryKey(),
    staffId: id("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade", onUpdate: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    type: varchar("type", { length: 40 }).notNull().default("casual"),
    status: mysqlEnum("status", ["pending", "approved", "rejected"] as const).notNull().default("pending"),
    reason: varchar("reason", { length: 300 }).notNull().default(""),
    decidedBy: id("decided_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("leave_requests_staff_idx").on(table.staffId), index("leave_requests_status_idx").on(table.status)],
);

/* ------------------------------------------------------------------------- */
/* Housekeeping                                                               */
/* ------------------------------------------------------------------------- */

export const housekeepingStatuses = mysqlTable("housekeeping_status", {
  code: varchar("code", { length: 32 }).primaryKey(),
  label: varchar("label", { length: 64 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
});

export const housekeepingTaskHistory = mysqlTable(
  "housekeeping_task_history",
  {
    id: id().primaryKey(),
    taskId: id("task_id")
      .notNull()
      .references(() => housekeepingTasks.id, { onDelete: "cascade", onUpdate: "cascade" }),
    status: mysqlEnum("status", HOUSEKEEPING_STATUSES).notNull(),
    note: varchar("note", { length: 300 }).notNull().default(""),
    changedBy: id("changed_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("housekeeping_task_history_task_idx").on(table.taskId)],
);

/* ------------------------------------------------------------------------- */
/* Restaurant and inventory                                                   */
/* ------------------------------------------------------------------------- */

export const restaurantOrderItems = mysqlTable(
  "restaurant_order_items",
  {
    id: id().primaryKey(),
    orderId: id("order_id")
      .notNull()
      .references(() => restaurantOrders.id, { onDelete: "cascade", onUpdate: "cascade" }),
    menuItemId: id("menu_item_id").references(() => restaurantMenuItems.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    quantity: int("quantity").notNull().default(1),
    unitPrice: money("unit_price").notNull().default("0.00"),
    amount: money("amount").notNull().default("0.00"),
  },
  (table) => [index("restaurant_order_items_order_idx").on(table.orderId)],
);

export const inventoryTransactions = mysqlTable(
  "inventory_transactions",
  {
    id: id().primaryKey(),
    inventoryId: id("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: mysqlEnum("type", ["in", "out", "adjustment"] as const).notNull(),
    quantity: int("quantity").notNull(),
    note: varchar("note", { length: 300 }).notNull().default(""),
    createdBy: id("created_by").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("inventory_transactions_item_idx").on(table.inventoryId)],
);

export const suppliers = mysqlTable(
  "suppliers",
  {
    id: id().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    contactName: varchar("contact_name", { length: 120 }).notNull().default(""),
    email: varchar("email", { length: 191 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    address: varchar("address", { length: 300 }).notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("suppliers_name_unique").on(table.name)],
);

/* ------------------------------------------------------------------------- */
/* Notifications                                                              */
/* ------------------------------------------------------------------------- */

export const notifications = mysqlTable(
  "notifications",
  {
    id: id().primaryKey(),
    userId: id("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    body: varchar("body", { length: 500 }).notNull().default(""),
    readAt: datetime("read_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [index("notifications_user_idx").on(table.userId)],
);
