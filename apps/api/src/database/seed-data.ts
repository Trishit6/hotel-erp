import type {
  ActivityTone,
  AttendanceStatus,
  Department,
  ExpenseStatus,
  HousekeepingStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  RoomStatus,
  StaffRole,
  StaffStatus,
  UserRole,
} from "../constants";
import { RELEASED_RESERVATION_STATUSES } from "../constants";
import { dateAt } from "../utils/date";
import type * as schema from "./schema";

const money = (value: number) => value.toFixed(2);
const currentYear = new Date().getFullYear();
const iso = (offsetDays = 0, hours = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(date.getUTCHours() + hours);
  return date;
};
const pick = <T,>(list: readonly T[], index: number): T =>
  list[((index % list.length) + list.length) % list.length] as T;

type SeedRoomType = Omit<typeof schema.roomTypes.$inferInsert, "updatedAt"> & { amenities: string[] };
type SeedRoom = Omit<typeof schema.rooms.$inferInsert, "updatedAt">;
type SeedGuest = Omit<typeof schema.guests.$inferInsert, "updatedAt">;
type SeedStaff = Omit<typeof schema.staff.$inferInsert, "updatedAt">;
type SeedReservation = Omit<typeof schema.reservations.$inferInsert, "updatedAt">;
type SeedTask = Omit<typeof schema.housekeepingTasks.$inferInsert, "updatedAt" | "createdAt">;
type SeedAttendance = Omit<typeof schema.attendance.$inferInsert, "updatedAt" | "createdAt">;
type SeedInventory = Omit<typeof schema.inventory.$inferInsert, "updatedAt" | "createdAt">;
type SeedExpense = Omit<typeof schema.expenses.$inferInsert, "updatedAt" | "createdAt">;
type SeedMenuCategory = Omit<typeof schema.restaurantMenuCategories.$inferInsert, "updatedAt" | "createdAt">;
type SeedMenuItem = Omit<typeof schema.restaurantMenuItems.$inferInsert, "updatedAt" | "createdAt">;
type SeedOrder = Omit<typeof schema.restaurantOrders.$inferInsert, "updatedAt">;
type SeedLeaveRequest = Omit<typeof schema.leaveRequests.$inferInsert, "updatedAt" | "createdAt">;
type SeedHotel = Omit<typeof schema.hotels.$inferInsert, "updatedAt" | "createdAt">;
type SeedBranch = Omit<typeof schema.branches.$inferInsert, "updatedAt" | "createdAt">;

type SeedRoomAmenity = typeof schema.roomAmenities.$inferInsert;
type SeedReservationGuest = typeof schema.reservationGuests.$inferInsert;
type SeedReservationHistory = typeof schema.reservationStatusHistory.$inferInsert;
type SeedCheckIn = typeof schema.checkIns.$inferInsert;
type SeedCheckOut = typeof schema.checkOuts.$inferInsert;
type SeedPayment = typeof schema.payments.$inferInsert;
type SeedInvoice = typeof schema.invoices.$inferInsert;
type SeedInvoiceItem = typeof schema.invoiceItems.$inferInsert;
type SeedRefund = typeof schema.refunds.$inferInsert;
type SeedTaskHistory = typeof schema.housekeepingTaskHistory.$inferInsert;
type SeedInventoryTransaction = typeof schema.inventoryTransactions.$inferInsert;
type SeedSupplier = typeof schema.suppliers.$inferInsert;
type SeedOrderItem = typeof schema.restaurantOrderItems.$inferInsert;
type SeedActivity = typeof schema.activityLogs.$inferInsert;
type SeedNotification = typeof schema.notifications.$inferInsert;
type SeedSession = typeof schema.sessions.$inferInsert;
type SeedInvitation = typeof schema.invitations.$inferInsert;
type SeedPasswordResetToken = typeof schema.passwordResetTokens.$inferInsert;

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  staffId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt?: Date;
}

const FIRST_NAMES = [
  "Aarav", "Ananya", "Rohan", "Meera", "Vivaan", "Isha", "Kabir", "Diya",
  "Arjun", "Saanvi", "Aditya", "Kiara", "Reyansh", "Aadhya", "Vihaan", "Myra",
  "Karthik", "Nisha", "Siddharth", "Pooja", "Rahul", "Sneha", "Aman", "Tanvi",
  "Dev", "Riya", "Yash", "Neha", "Ravi", "Anjali", "Karan", "Shreya",
] as const;

const LAST_NAMES = [
  "Mehta", "Iyer", "Kapoor", "Nair", "Sharma", "Patel", "Rao", "Menon",
  "Desai", "Singh", "Verma", "Gupta", "Joshi", "Reddy", "Bose", "Chopra",
  "Mishra", "Kulkarni", "Pillai", "Bhat",
] as const;

const CITY_DATA = [
  { city: "Mumbai", state: "Maharashtra", postalCode: "400001" },
  { city: "Pune", state: "Maharashtra", postalCode: "411001" },
  { city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
  { city: "Kochi", state: "Kerala", postalCode: "682001" },
  { city: "Chennai", state: "Tamil Nadu", postalCode: "600001" },
  { city: "Hyderabad", state: "Telangana", postalCode: "500001" },
  { city: "Delhi", state: "Delhi", postalCode: "110001" },
  { city: "Jaipur", state: "Rajasthan", postalCode: "302001" },
  { city: "Ahmedabad", state: "Gujarat", postalCode: "380001" },
  { city: "Goa", state: "Goa", postalCode: "403001" },
] as const;

const STREETS = ["Marine Drive", "MG Road", "Linking Road", "Park Street", "Residency Road", "Banjara Hills", "Connaught Place", "C Scheme"] as const;
const PREFERENCES = ["High floor", "Quiet room", "Sparkling water", "Late checkout", "Vegetarian breakfast", "Extra pillows", "Ocean view", "Airport transfer", "No housekeeping before noon", ""] as const;
const ID_TYPES = ["Passport", "Driving licence", "Aadhaar", "Voter ID"] as const;

export const seedRoles = [
  { code: "super-admin", name: "Super Admin", description: "Full access including user and security management." },
  { code: "admin", name: "Admin", description: "Property administration and configuration." },
  { code: "manager", name: "Manager", description: "Day-to-day hotel operations and reporting." },
  { code: "receptionist", name: "Receptionist", description: "Front desk, reservations, guests and payments." },
  { code: "housekeeping", name: "Housekeeping", description: "Room readiness and housekeeping tasks." },
  { code: "accountant", name: "Accountant", description: "Payments, invoices, expenses and reports." },
  { code: "restaurant", name: "Restaurant Staff", description: "Restaurant orders and service." },
  { code: "staff", name: "Staff", description: "General employee access limited to permitted modules." },
  { code: "customer", name: "Customer", description: "Public guest account. Can never hold staff permissions." },
] as const;

export const seedDepartments = [
  { id: "dept-reception", name: "Reception", description: "Front desk arrivals, departures and guest requests." },
  { id: "dept-housekeeping", name: "Housekeeping", description: "Room readiness and linen." },
  { id: "dept-restaurant", name: "Restaurant", description: "Food and beverage service." },
  { id: "dept-maintenance", name: "Maintenance", description: "Repairs and facilities." },
  { id: "dept-security", name: "Security", description: "Property security." },
  { id: "dept-management", name: "Management", description: "Operations leadership." },
  { id: "dept-finance", name: "Finance", description: "Accounts and purchasing." },
] as const;

export const seedShifts = [
  { id: "shift-morning", name: "Morning", startTime: "07:00", endTime: "15:00" },
  { id: "shift-evening", name: "Evening", startTime: "15:00", endTime: "23:00" },
  { id: "shift-night", name: "Night", startTime: "23:00", endTime: "07:00" },
  { id: "shift-general", name: "General", startTime: "09:00", endTime: "18:00" },
] as const;

export const seedHousekeepingStatuses = [
  { code: "dirty", label: "Dirty", sortOrder: 1 },
  { code: "assigned", label: "Assigned", sortOrder: 2 },
  { code: "in-progress", label: "In progress", sortOrder: 3 },
  { code: "cleaned", label: "Cleaned", sortOrder: 4 },
  { code: "inspected", label: "Inspected", sortOrder: 5 },
] as const;

export const seedSettings = {
  id: "default",
  hotelName: "RIVR Hotel & Residences",
  legalName: "RIVR Hospitality Private Limited",
  email: "stay@rivrhotel.in",
  phone: "+91 22 0000 0000",
  website: "https://rivrhotel.in",
  addressLine1: "RIVR Hotel & Residences, Marine Drive",
  addressLine2: "Nariman Point",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400001",
  country: "India",
  timezone: "Asia/Kolkata",
  currency: "INR",
  taxRateBps: 1200,
  checkInTime: "14:00",
  checkOutTime: "11:00",
  invoicePrefix: "INV",
  invoiceFooter: "Thank you for staying with RIVR. GSTIN: 27AAACR5055K1Z5",
  cancellationPolicy: "Free cancellation until 24 hours before check-in. Cancellations inside 24 hours are charged one night's room rate. No-shows are charged the full reservation value.",
  cancellationCutoffHours: 24,
  reservationHoldHours: 2,
  logoUrl: "https://rivrhotel.in/assets/rivr-logo.svg",
} as const;

export const seedRoomTypes: SeedRoomType[] = [
  {
    id: "type-king",
    name: "King Studio",
    description: "A quiet studio with a considered workspace and city-facing windows.",
    capacity: 2,
    size: 38,
    rate: money(2499),
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85",
    amenities: ["King bed", "Rain shower", "High-speed Wi-Fi", "City view"],
  },
  {
    id: "type-deluxe",
    name: "Deluxe King",
    description: "Generous proportions, a soaking tub, and a view toward the water.",
    capacity: 2,
    size: 46,
    rate: money(4999),
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
    amenities: ["King bed", "Soaking tub", "Breakfast included", "Sea view"],
  },
  {
    id: "type-suite",
    name: "Twin Suite",
    description: "An easy suite for longer stays, families, and room to gather.",
    capacity: 4,
    size: 62,
    rate: money(8499),
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85",
    amenities: ["Two queen beds", "Living room", "Kitchenette", "Sea view"],
  },
  {
    id: "type-executive",
    name: "Executive Suite",
    description: "A private lounge, panoramic light, and a little more room to settle.",
    capacity: 3,
    size: 75,
    rate: money(12999),
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
    amenities: ["King bed", "Lounge", "Panoramic view", "Late checkout"],
  },
  {
    id: "type-penthouse",
    name: "Penthouse",
    description: "Our highest stay with a terrace, service, and the city at your feet.",
    capacity: 4,
    size: 98,
    rate: money(24999),
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    amenities: ["Private terrace", "Butler service", "Panoramic view", "Private dining"],
  },
  {
    id: "type-garden",
    name: "Garden Villa",
    description: "A ground-floor villa opening onto a private garden and plunge pool.",
    capacity: 4,
    size: 84,
    rate: money(15999),
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
    amenities: ["Private garden", "Plunge pool", "Outdoor shower", "Butler service"],
  },
  {
    id: "type-family",
    name: "Family Room",
    description: "Two connected sleeping areas, a play nook, and space for everyone.",
    capacity: 5,
    size: 55,
    rate: money(7499),
    image: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85",
    amenities: ["Two queen beds", "Sofa bed", "Kids amenities", "Breakfast included"],
  },
  {
    id: "type-studio-twin",
    name: "Studio Twin",
    description: "A flexible twin studio for colleagues travelling together.",
    capacity: 2,
    size: 34,
    rate: money(3199),
    image: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=85",
    amenities: ["Twin beds", "Work desk", "Rain shower", "High-speed Wi-Fi"],
  },
];

const baseRooms: SeedRoom[] = [
  { id: "room-101", number: "101", typeId: "type-king", floor: 1, status: "available", notes: "Near the lobby" },
  { id: "room-102", number: "102", typeId: "type-king", floor: 1, status: "occupied", notes: "Garden side" },
  { id: "room-204", number: "204", typeId: "type-deluxe", floor: 2, status: "reserved", notes: "Sea side" },
  { id: "room-205", number: "205", typeId: "type-suite", floor: 2, status: "available", notes: "Family favourite" },
  { id: "room-301", number: "301", typeId: "type-executive", floor: 3, status: "available", notes: "Corner suite" },
  { id: "room-302", number: "302", typeId: "type-penthouse", floor: 3, status: "maintenance", notes: "HVAC inspection" },
  { id: "room-303", number: "303", typeId: "type-deluxe", floor: 3, status: "cleaning", notes: "Checkout today" },
  { id: "room-304", number: "304", typeId: "type-suite", floor: 3, status: "out-of-order", notes: "Window repair" },
];

const ROOM_BLOCKS = [
  { floor: 1, start: 103, count: 8 },
  { floor: 2, start: 206, count: 8 },
  { floor: 3, start: 305, count: 8 },
  { floor: 4, start: 401, count: 8 },
  { floor: 5, start: 501, count: 8 },
] as const;

const ROOM_NOTES = ["City side", "Sea side", "Quiet wing", "Near the lift", "Garden side", "High floor", "Corner room", "Accessible room"] as const;
const ROOM_STATUSES: RoomStatus[] = ["available", "available", "available", "occupied", "reserved", "cleaning", "maintenance", "out-of-order"];

const generatedRooms: SeedRoom[] = ROOM_BLOCKS.flatMap((block) =>
  Array.from({ length: block.count }, (_, index) => {
    const number = String(block.start + index);
    const roomType = seedRoomTypes[(block.floor + index) % seedRoomTypes.length];
    const roomIndex = block.floor * 10 + index;
    return {
      id: `room-${number}`,
      number,
      typeId: roomType.id,
      floor: block.floor,
      status: ROOM_STATUSES[roomIndex % ROOM_STATUSES.length],
      notes: pick(ROOM_NOTES, roomIndex),
    };
  }),
);

export const seedRooms = [...baseRooms, ...generatedRooms];

const baseGuests: SeedGuest[] = [
  { id: "guest-001", name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 98765 43210", address: "12 Marine Drive, Mumbai", city: "Mumbai", state: "Maharashtra", postalCode: "400001", idType: "Passport", idLastFour: "4281", preferences: "High floor, sparkling water", totalStays: 4, totalSpent: money(16797) },
  { id: "guest-002", name: "Ananya Iyer", email: "ananya.iyer@example.com", phone: "+91 98200 11223", address: "8 MG Road, Pune", city: "Pune", state: "Maharashtra", postalCode: "411001", idType: "Driving licence", idLastFour: "9017", preferences: "Quiet room", totalStays: 2, totalSpent: money(6098) },
  { id: "guest-003", name: "Rohan Kapoor", email: "rohan.kapoor@example.com", phone: "+91 99870 44556", address: "41 Residency Road, Bengaluru", city: "Bengaluru", state: "Karnataka", postalCode: "560001", idType: "Passport", idLastFour: "7734", preferences: "Vegetarian breakfast", totalStays: 1, totalSpent: money(41437) },
  { id: "guest-004", name: "Meera Nair", email: "meera.nair@example.com", phone: "+91 98450 77889", address: "5 Marine Drive, Kochi", city: "Kochi", state: "Kerala", postalCode: "682001", idType: "Passport", idLastFour: "1209", preferences: "Late checkout", totalStays: 3, totalSpent: money(6349) },
];

const generatedGuests: SeedGuest[] = Array.from({ length: 80 }, (_, index) => {
  const first = pick(FIRST_NAMES, index);
  const last = pick(LAST_NAMES, index * 7 + 3);
  const location = pick(CITY_DATA, index);
  const guestNumber = index + 5;
  return {
    id: `guest-${String(guestNumber).padStart(3, "0")}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${guestNumber}@example.com`,
    phone: `+91 9${String(700000000 + index)}`,
    address: `${10 + index} ${pick(STREETS, index)}, ${location.city}`,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    idType: pick(ID_TYPES, index),
    idLastFour: String(1000 + index).slice(-4),
    preferences: pick(PREFERENCES, index),
    totalStays: 1 + (index % 8),
    totalSpent: money((1 + (index % 8)) * (2499 + (index % 5) * 1000)),
  };
});

export const seedGuests = [...baseGuests, ...generatedGuests];

const baseStaff: SeedStaff[] = [
  { id: "staff-001", name: "Meera Shah", email: "meera@rivrhotel.in", phone: "+91 98200 10101", department: "Management", role: "manager", shift: "09:00-18:00", status: "active", joinedAt: "2022-03-14" },
  { id: "staff-002", name: "Arjun Rao", email: "arjun@rivrhotel.in", phone: "+91 98200 10102", department: "Reception", role: "receptionist", shift: "07:00-16:00", status: "active", joinedAt: "2023-08-09" },
  { id: "staff-003", name: "Lakshmi Menon", email: "lakshmi@rivrhotel.in", phone: "+91 98200 10103", department: "Housekeeping", role: "housekeeping", shift: "08:00-17:00", status: "active", joinedAt: "2024-01-22" },
  { id: "staff-004", name: "Vikram Desai", email: "vikram@rivrhotel.in", phone: "+91 98200 10104", department: "Finance", role: "accountant", shift: "09:00-18:00", status: "on-leave", joinedAt: "2021-11-03" },
  { id: "staff-005", name: "Priya Singh", email: "priya@rivrhotel.in", phone: "+91 98200 10105", department: "Restaurant", role: "restaurant", shift: "12:00-21:00", status: "active", joinedAt: "2024-05-18" },
  { id: "staff-super-admin", name: "RIVR Super Admin", email: "super.admin@rivrhotel.in", phone: "+91 98200 10001", department: "Management", role: "super-admin", shift: "09:00-18:00", status: "active", joinedAt: "2019-09-01" },
  { id: "staff-admin", name: "RIVR Administrator", email: "admin@rivrhotel.in", phone: "+91 98200 10002", department: "Management", role: "admin", shift: "09:00-18:00", status: "active", joinedAt: "2020-01-06" },
  { id: "staff-general", name: "Rahul Verma", email: "rahul@rivrhotel.in", phone: "+91 98200 10003", department: "Maintenance", role: "staff", shift: "09:00-18:00", status: "active", joinedAt: "2023-02-13" },
];

const STAFF_ROLE_CYCLE: StaffRole[] = ["manager", "receptionist", "housekeeping", "accountant", "restaurant", "staff"];
const STAFF_STATUS_CYCLE: StaffStatus[] = ["active", "active", "active", "active", "active", "on-leave", "inactive"];
const STAFF_SHIFT_CYCLE = ["07:00-15:00", "15:00-23:00", "23:00-07:00", "09:00-18:00"] as const;

const generatedStaff: SeedStaff[] = Array.from({ length: 32 }, (_, index) => {
  const first = pick(FIRST_NAMES, index + 7);
  const last = pick(LAST_NAMES, index + 3);
  const role = pick(STAFF_ROLE_CYCLE, index);
  const department: Department =
    role === "manager" ? "Management" :
    role === "receptionist" ? "Reception" :
    role === "housekeeping" ? "Housekeeping" :
    role === "accountant" ? "Finance" :
    role === "restaurant" ? "Restaurant" : "Maintenance";
  return {
    id: `staff-${String(index + 6).padStart(3, "0")}`,
    name: `${first} ${last}`,
    email: `staff${String(index + 1).padStart(2, "0")}@rivrhotel.in`,
    phone: `+91 98200 ${String(20000 + index)}`,
    department,
    role,
    shift: pick(STAFF_SHIFT_CYCLE, index),
    status: pick(STAFF_STATUS_CYCLE, index),
    joinedAt: dateAt(-120 - index * 9),
  };
});

export const seedStaff = [...baseStaff, ...generatedStaff];

const staffUsers: SeedUser[] = [
  { id: "user-super-admin", name: "RIVR Super Admin", email: "admin@admin.com", password: "password", role: "super-admin", staffId: "staff-super-admin", isActive: true, lastLoginAt: iso(0, -1), createdAt: iso(-365) },
  { id: "user-admin", name: "RIVR Administrator", email: "admin@rivrhotel.in", password: "password", role: "admin", staffId: "staff-admin", isActive: true, lastLoginAt: iso(-1, -3), createdAt: iso(-300) },
  { id: "user-manager", name: "Meera Shah", email: "manager@rivrhotel.in", password: "password", role: "manager", staffId: "staff-001", isActive: true, lastLoginAt: iso(-1, -5), createdAt: iso(-280) },
  { id: "user-reception", name: "Arjun Rao", email: "reception@rivrhotel.in", password: "password", role: "receptionist", staffId: "staff-002", isActive: true, lastLoginAt: iso(0, -2), createdAt: iso(-260) },
  { id: "user-housekeeping", name: "Lakshmi Menon", email: "housekeeping@rivrhotel.in", password: "password", role: "housekeeping", staffId: "staff-003", isActive: true, lastLoginAt: iso(0, -4), createdAt: iso(-240) },
  { id: "user-accountant", name: "Vikram Desai", email: "accountant@rivrhotel.in", password: "password", role: "accountant", staffId: "staff-004", isActive: true, lastLoginAt: iso(-2, -6), createdAt: iso(-220) },
  { id: "user-restaurant", name: "Priya Singh", email: "restaurant@rivrhotel.in", password: "password", role: "restaurant", staffId: "staff-005", isActive: true, lastLoginAt: iso(0, -6), createdAt: iso(-200) },
  { id: "user-staff", name: "Rahul Verma", email: "staff@rivrhotel.in", password: "password", role: "staff", staffId: "staff-general", isActive: true, lastLoginAt: iso(-3, -1), createdAt: iso(-180) },
];

const customerUsers: SeedUser[] = seedGuests.slice(4, 24).map((guest, index) => ({
  id: `user-${guest.id}`,
  name: guest.name,
  email: guest.email,
  password: "password",
  role: "customer",
  staffId: null,
  isActive: true,
  lastLoginAt: iso(-index, -2),
  createdAt: iso(-200 - index),
}));

export const seedUsers = [...staffUsers, ...customerUsers];

export const seedHotels: SeedHotel[] = [
  {
    id: "hotel-rivr",
    name: "RIVR Hotel & Residences",
    legalName: "RIVR Hospitality Private Limited",
    email: "stay@rivrhotel.in",
    phone: "+91 22 0000 0000",
    website: "https://rivrhotel.in",
    addressLine1: "Marine Drive, Nariman Point",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "India",
  },
];

export const seedBranches: SeedBranch[] = [
  { id: "branch-mumbai", hotelId: "hotel-rivr", name: "RIVR Mumbai", code: "RIVR-BOM", addressLine1: "Marine Drive, Nariman Point", city: "Mumbai", state: "Maharashtra", postalCode: "400001", phone: "+91 22 0000 0000", isActive: true },
  { id: "branch-pune", hotelId: "hotel-rivr", name: "RIVR Pune", code: "RIVR-PNQ", addressLine1: "8 MG Road", city: "Pune", state: "Maharashtra", postalCode: "411001", phone: "+91 20 0000 0000", isActive: true },
  { id: "branch-goa", hotelId: "hotel-rivr", name: "RIVR Goa", code: "RIVR-GOI", addressLine1: "Candolim Beach Road", city: "Goa", state: "Goa", postalCode: "403515", phone: "+91 832 000 0000", isActive: true },
];

const ROOM_EXTRAS = [
  "Air conditioning",
  "Smart TV",
  "Mini bar",
  "In-room safe",
  "Tea/coffee station",
  "Blackout curtains",
  "USB charging points",
  "Daily housekeeping",
] as const;

export const seedRoomAmenities: SeedRoomAmenity[] = seedRooms.flatMap((room, roomIndex) => {
  const roomType = seedRoomTypes.find((type) => type.id === room.typeId);
  const names = [...new Set([...(roomType?.amenities ?? []), ...ROOM_EXTRAS.slice(roomIndex % 4, (roomIndex % 4) + 4)])];
  return names.map((amenity, index) => ({
    id: `amenity-${room.id}-${index + 1}`,
    roomId: room.id,
    amenity,
    sortOrder: index,
  }));
});

const baseReservations: SeedReservation[] = [
  { id: "res-001", reference: "RIVR-2481", guestId: "guest-001", roomId: "room-204", checkIn: dateAt(1), checkOut: dateAt(4), adults: 2, children: 0, status: "confirmed", paymentStatus: "partial", roomCharges: money(14997), additionalCharges: money(0), discount: money(0), tax: money(1800), total: money(16797), paidAmount: money(8399), specialRequests: "High floor if possible", createdAt: iso(-4) },
  { id: "res-002", reference: "RIVR-2476", guestId: "guest-002", roomId: "room-102", checkIn: dateAt(-1), checkOut: dateAt(1), adults: 1, children: 0, status: "checked-in", paymentStatus: "paid", roomCharges: money(4998), additionalCharges: money(500), discount: money(0), tax: money(600), total: money(6098), paidAmount: money(6098), specialRequests: "", createdAt: iso(-3), checkedInAt: iso(-1, 14) },
  { id: "res-003", reference: "RIVR-2468", guestId: "guest-003", roomId: "room-301", checkIn: dateAt(5), checkOut: dateAt(8), adults: 2, children: 1, status: "confirmed", paymentStatus: "pending", roomCharges: money(38997), additionalCharges: money(0), discount: money(2000), tax: money(4440), total: money(41437), paidAmount: money(0), specialRequests: "Vegetarian breakfast", createdAt: iso(-2) },
  { id: "res-004", reference: "RIVR-2459", guestId: "guest-004", roomId: "room-303", checkIn: dateAt(0), checkOut: dateAt(1), adults: 2, children: 0, status: "checked-out", paymentStatus: "paid", roomCharges: money(4999), additionalCharges: money(750), discount: money(0), tax: money(600), total: money(6349), paidAmount: money(6349), specialRequests: "", createdAt: iso(-1), checkedInAt: iso(0, 14), checkedOutAt: iso(1, 11) },
  { id: "res-005", reference: "RIVR-2490", guestId: "guest-002", roomId: "room-205", checkIn: dateAt(10), checkOut: dateAt(13), adults: 2, children: 2, status: "pending", paymentStatus: "pending", roomCharges: money(25497), additionalCharges: money(0), discount: money(0), tax: money(3060), total: money(28557), paidAmount: money(0), specialRequests: "Connecting room requested", createdAt: iso(-1) },
];

const PAST_STATUSES: ReservationStatus[] = ["checked-out", "checked-out", "checked-out", "cancelled", "no-show"];
const CURRENT_STATUSES: ReservationStatus[] = ["checked-in", "checked-in", "checked-in", "confirmed"];
const FUTURE_STATUSES: ReservationStatus[] = ["confirmed", "confirmed", "confirmed", "pending", "cancelled", "no-show"];
const PAID_STATUSES: PaymentStatus[] = ["paid", "paid", "paid", "partial"];
const CURRENT_PAYMENT_STATUSES: PaymentStatus[] = ["paid", "partial", "partial"];
const FUTURE_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "partial", "paid"];
const CLOSED_PAYMENT_STATUSES: PaymentStatus[] = ["refunded", "pending"];
const SPECIAL_REQUESTS = ["High floor", "Quiet room", "Late checkout", "Airport transfer", "Extra pillows", "Vegetarian breakfast", "Connecting rooms", ""] as const;

const generatedReservations: SeedReservation[] = [];

for (let index = 0; index < 115; index += 1) {
  const id = `res-${String(index + 6).padStart(3, "0")}`;
  const guest = seedGuests[index % seedGuests.length];
  let room = seedRooms[(index * 5 + 2) % seedRooms.length];
  const phase = Math.floor(index / seedRooms.length);
  let checkInOffset: number;
  if (phase === 0) checkInOffset = -120 + (index % 30);
  else if (phase === 1) checkInOffset = -1 + (index % 2);
  else checkInOffset = 7 + (index % 25);
  const nights = 2 + (index % 4);
  const checkIn = dateAt(checkInOffset);
  const checkOut = dateAt(checkInOffset + nights);
  const checkOutOffset = checkInOffset + nights;

  for (let attempt = 0; attempt < seedRooms.length; attempt += 1) {
    const conflict = [...baseReservations, ...generatedReservations].some(
      (reservation) =>
        reservation.roomId === room.id &&
        !RELEASED_RESERVATION_STATUSES.includes(reservation.status ?? "pending") &&
        reservation.checkIn < checkOut &&
        reservation.checkOut > checkIn,
    );
    if (!conflict) break;
    room = seedRooms[(seedRooms.indexOf(room) + 1) % seedRooms.length];
  }

  const roomType = seedRoomTypes.find((type) => type.id === room.typeId) ?? seedRoomTypes[0];
  const status: ReservationStatus =
    checkOutOffset < 0 ? pick(PAST_STATUSES, index) :
    checkInOffset <= 0 ? pick(CURRENT_STATUSES, index) :
    pick(FUTURE_STATUSES, index);
  const paymentStatus: PaymentStatus =
    status === "checked-out" ? pick(PAID_STATUSES, index) :
    status === "checked-in" ? pick(CURRENT_PAYMENT_STATUSES, index) :
    status === "confirmed" ? pick(FUTURE_PAYMENT_STATUSES, index) :
    status === "pending" ? "pending" :
    pick(CLOSED_PAYMENT_STATUSES, index);

  const rate = Number(roomType.rate);
  const roomCharges = rate * nights;
  const discount = index % 7 === 0 ? 1000 : 0;
  const additional = index % 5 === 0 ? 500 : 0;
  const tax = Math.round((roomCharges - discount) * 0.12);
  const total = roomCharges - discount + additional + tax;
  const paid = paymentStatus === "paid" ? total : paymentStatus === "partial" ? Math.round(total * 0.5) : 0;
  const capacity = roomType.capacity;
  const adults = Math.max(1, Math.min(2 + (index % 3), capacity));
  const children = Math.min(index % 3, capacity - adults);

  generatedReservations.push({
    id,
    reference: `RIVR-${2500 + index}`,
    guestId: guest.id,
    roomId: room.id,
    checkIn,
    checkOut,
    adults,
    children,
    status,
    paymentStatus,
    roomCharges: money(roomCharges),
    additionalCharges: money(additional),
    discount: money(discount),
    tax: money(tax),
    total: money(total),
    paidAmount: money(paid),
    specialRequests: pick(SPECIAL_REQUESTS, index),
    checkedInAt: status === "checked-in" || status === "checked-out" ? iso(checkInOffset, 14) : null,
    checkedOutAt: status === "checked-out" ? iso(checkOutOffset, 11) : null,
    cancelledAt: status === "cancelled" || status === "no-show" ? iso(checkInOffset - 1, 10) : null,
    createdAt: iso(checkInOffset - 5 - (index % 10)),
  });
}

export const seedReservations = [...baseReservations, ...generatedReservations];

export const seedReservationGuests: SeedReservationGuest[] = seedReservations.flatMap((reservation, index) => {
  const partySize = Math.min(4, Math.max(1, (reservation.adults ?? 1) + (reservation.children ?? 0)));
  const guestIds = [reservation.guestId];
  for (let extra = 1; extra < partySize; extra += 1) {
    const candidate = seedGuests[(index * 3 + extra) % seedGuests.length].id;
    if (!guestIds.includes(candidate)) guestIds.push(candidate);
  }
  return guestIds.map((guestId, position) => ({
    id: `rguest-${reservation.id}-${position + 1}`,
    reservationId: reservation.id,
    guestId,
    isPrimary: position === 0,
    createdAt: reservation.createdAt ?? iso(-10),
  }));
});

export const seedReservationStatusHistory: SeedReservationHistory[] = seedReservations.flatMap((reservation) => {
  const entries: SeedReservationHistory[] = [];
  const createdAt = reservation.createdAt ?? iso(-10);
  entries.push({
    id: `reshist-${reservation.id}-1`,
    reservationId: reservation.id,
    fromStatus: null,
    toStatus: "pending",
    note: "Reservation created",
    changedBy: "user-reception",
    createdAt,
  });
  if (reservation.status !== "pending") {
    entries.push({
      id: `reshist-${reservation.id}-${entries.length + 1}`,
      reservationId: reservation.id,
      fromStatus: "pending",
      toStatus: "confirmed",
      note: "Booking confirmed",
      changedBy: "user-manager",
      createdAt: new Date(createdAt.getTime() + 3_600_000),
    });
  }
  if (reservation.status === "checked-in" || reservation.status === "checked-out") {
    entries.push({
      id: `reshist-${reservation.id}-${entries.length + 1}`,
      reservationId: reservation.id,
      fromStatus: "confirmed",
      toStatus: "checked-in",
      note: "Guest checked in",
      changedBy: "user-reception",
      createdAt: reservation.checkedInAt ?? iso(-1, 14),
    });
  }
  if (reservation.status === "checked-out") {
    entries.push({
      id: `reshist-${reservation.id}-${entries.length + 1}`,
      reservationId: reservation.id,
      fromStatus: "checked-in",
      toStatus: "checked-out",
      note: "Guest checked out",
      changedBy: "user-reception",
      createdAt: reservation.checkedOutAt ?? iso(-1, 11),
    });
  }
  if (reservation.status === "cancelled" || reservation.status === "no-show") {
    entries.push({
      id: `reshist-${reservation.id}-${entries.length + 1}`,
      reservationId: reservation.id,
      fromStatus: "confirmed",
      toStatus: reservation.status,
      note: "Reservation closed",
      changedBy: "user-manager",
      createdAt: reservation.cancelledAt ?? iso(-1, 10),
    });
  }
  return entries;
});

export const seedCheckIns: SeedCheckIn[] = seedReservations
  .filter((reservation) => reservation.status === "checked-in" || reservation.status === "checked-out")
  .map((reservation) => ({
    id: `checkin-${reservation.id}`,
    reservationId: reservation.id,
    roomId: reservation.roomId,
    checkedInAt: reservation.checkedInAt ?? iso(-1, 14),
    checkedInBy: "user-reception",
    notes: "Identity verified at the front desk.",
  }));

export const seedCheckOuts: SeedCheckOut[] = seedReservations
  .filter((reservation) => reservation.status === "checked-out")
  .map((reservation) => ({
    id: `checkout-${reservation.id}`,
    reservationId: reservation.id,
    roomId: reservation.roomId,
    checkedOutAt: reservation.checkedOutAt ?? iso(-1, 11),
    checkedOutBy: "user-reception",
    notes: "Room released to housekeeping.",
  }));

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "upi", "card", "bank-transfer", "online"];

export const seedPayments: SeedPayment[] = [];
export const seedInvoices: SeedInvoice[] = [];
export const seedInvoiceItems: SeedInvoiceItem[] = [];
export const seedRefunds: SeedRefund[] = [];

seedReservations.forEach((reservation, index) => {
  const invoiceId = `inv-${reservation.id}`;
  const total = Number(reservation.total);
  const paid = Number(reservation.paidAmount);
  const due = reservation.paymentStatus === "refunded" ? 0 : Math.max(0, total - paid);
  const createdAt = reservation.createdAt ?? iso(-5);
  const room = seedRooms.find((item) => item.id === reservation.roomId) ?? seedRooms[0];
  const roomType = seedRoomTypes.find((type) => type.id === room.typeId) ?? seedRoomTypes[0];
  const nights = Math.max(1, Math.round((Date.parse(reservation.checkOut) - Date.parse(reservation.checkIn)) / 86_400_000));

  seedInvoices.push({
    id: invoiceId,
    number: `INV-${currentYear}-${String(1000 + index)}`,
    reservationId: reservation.id,
    status: reservation.paymentStatus,
    issuedAt: createdAt,
    dueAmount: money(due),
  });

  seedInvoiceItems.push({
    id: `invitem-${reservation.id}-1`,
    invoiceId,
    description: `${roomType.name} - ${nights} night(s)`,
    quantity: nights,
    unitPrice: roomType.rate,
    amount: reservation.roomCharges,
  });
  if (Number(reservation.additionalCharges) > 0) {
    seedInvoiceItems.push({
      id: `invitem-${reservation.id}-2`,
      invoiceId,
      description: "Additional services",
      quantity: 1,
      unitPrice: reservation.additionalCharges,
      amount: reservation.additionalCharges,
    });
  }
  if (Number(reservation.discount) > 0) {
    seedInvoiceItems.push({
      id: `invitem-${reservation.id}-3`,
      invoiceId,
      description: "Discount applied",
      quantity: 1,
      unitPrice: money(-Number(reservation.discount)),
      amount: money(-Number(reservation.discount)),
    });
  }
  seedInvoiceItems.push({
    id: `invitem-${reservation.id}-4`,
    invoiceId,
    description: "Tax",
    quantity: 1,
    unitPrice: reservation.tax,
    amount: reservation.tax,
  });

  if (reservation.paymentStatus === "paid" || reservation.paymentStatus === "partial" || reservation.paymentStatus === "refunded") {
    const amount = reservation.paymentStatus === "refunded" ? total : paid;
    const paymentId = `pay-${reservation.id}`;
    seedPayments.push({
      id: paymentId,
      reservationId: reservation.id,
      amount: money(amount),
      method: pick(PAYMENT_METHODS, index),
      status: "completed",
      paidAt: createdAt,
      note: reservation.paymentStatus === "partial" ? "Part payment received" : "Payment received",
      recordedBy: index % 2 === 0 ? "user-reception" : "user-accountant",
    });
    if (reservation.paymentStatus === "refunded") {
      seedRefunds.push({
        id: `refund-${reservation.id}`,
        paymentId,
        amount: money(amount),
        reason: "Guest cancelled the stay",
        status: "processed",
        processedBy: "user-accountant",
        processedAt: iso(-1),
        createdAt: iso(-1),
      });
    }
  }
});

const baseTasks: SeedTask[] = [
  { id: "hk-001", roomId: "room-303", assignedTo: "staff-003", status: "in-progress", priority: "high", taskType: "Post-checkout deep clean", issue: "Post-checkout deep clean", dueDate: dateAt(0), completionNotes: "" },
  { id: "hk-002", roomId: "room-102", assignedTo: "staff-003", status: "inspected", priority: "normal", taskType: "Daily service", issue: "Daily service", dueDate: dateAt(0), completionNotes: "Room inspected and amenities replenished." },
  { id: "hk-003", roomId: "room-205", assignedTo: null, status: "dirty", priority: "normal", taskType: "Pre-arrival clean", issue: "Pre-arrival clean", dueDate: dateAt(1), completionNotes: "" },
  { id: "hk-004", roomId: "room-101", assignedTo: "staff-003", status: "cleaned", priority: "low", taskType: "Amenity refresh", issue: "Amenity refresh", dueDate: dateAt(0), completionNotes: "Amenities refreshed; awaiting inspection." },
];

const TASK_TYPES = ["Post-checkout deep clean", "Daily service", "Pre-arrival clean", "Amenity refresh", "Linen change", "Bathroom deep clean", "Carpet vacuum", "Balcony clean"] as const;
const TASK_ISSUES = ["Routine turnover", "Guest departed", "Arrival due today", "Low amenities", "Stain reported", "Maintenance follow-up", "Deep clean requested", "VIP arrival"] as const;
const COMPLETION_NOTES = ["Completed and inspected.", "Amenities replenished.", "Fresh linen and towels placed.", "Bathroom sanitised.", "Awaiting supervisor inspection."] as const;
const PRIORITIES = ["low", "normal", "high"] as const;
const housekeepingStaffIds = seedStaff.filter((person) => person.role === "housekeeping").map((person) => person.id);

const generatedTasks: SeedTask[] = Array.from({ length: 60 }, (_, index) => {
  const room = seedRooms[(index * 3 + 1) % seedRooms.length];
  const status = pick(seedHousekeepingStatuses, index).code as HousekeepingStatus;
  return {
    id: `hk-${String(index + 5).padStart(3, "0")}`,
    roomId: room.id,
    assignedTo: index % 5 === 0 ? null : pick(housekeepingStaffIds, index),
    status,
    priority: pick(PRIORITIES, index),
    taskType: pick(TASK_TYPES, index),
    issue: pick(TASK_ISSUES, index),
    dueDate: dateAt(-3 + (index % 10)),
    completionNotes: status === "cleaned" || status === "inspected" ? pick(COMPLETION_NOTES, index) : "",
  };
});

export const seedHousekeepingTasks = [...baseTasks, ...generatedTasks];

export const seedHousekeepingTaskHistory: SeedTaskHistory[] = seedHousekeepingTasks.flatMap((task, index) => {
  const status = task.status ?? "dirty";
  const entries: SeedTaskHistory[] = [
    { id: `hkhist-${task.id}-1`, taskId: task.id, status: "dirty", note: "Task created", changedBy: "user-housekeeping", createdAt: iso(-2 - (index % 5)) },
  ];
  if (status !== "dirty") {
    entries.push({ id: `hkhist-${task.id}-2`, taskId: task.id, status, note: "Status updated", changedBy: "user-housekeeping", createdAt: iso(-1 - (index % 3)) });
  }
  return entries;
});

export const seedAttendance: SeedAttendance[] = seedStaff.flatMap((person, personIndex) =>
  Array.from({ length: 30 }, (_, dayIndex) => {
    const offset = -29 + dayIndex;
    const date = dateAt(offset);
    let status: AttendanceStatus;
    if (person.status === "on-leave") status = "leave";
    else if (person.status === "inactive") status = "absent";
    else {
      const roll = (personIndex + dayIndex) % 20;
      status = roll === 0 ? "absent" : roll === 1 ? "late" : roll === 2 ? "leave" : "present";
    }
    const clockIn = status === "present" ? `08:${String(50 + (personIndex % 9)).padStart(2, "0")}` : status === "late" ? `09:${String(10 + (personIndex % 20)).padStart(2, "0")}` : null;
    const clockOut = offset < 0 && (status === "present" || status === "late") ? `17:${String(50 + (personIndex % 9)).padStart(2, "0")}` : null;
    return { id: `att-${person.id}-${date}`, staffId: person.id, date, status, clockIn, clockOut };
  }),
);

const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"] as const;
const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;
const LEAVE_REASONS = ["Family function", "Medical appointment", "Personal errand", "Travel", "Recovery", "Childcare", "Festival", "Study leave"] as const;

export const seedLeaveRequests: SeedLeaveRequest[] = Array.from({ length: 30 }, (_, index) => {
  const person = seedStaff[index % seedStaff.length];
  const start = 5 + (index % 20);
  const status = pick(LEAVE_STATUSES, index);
  return {
    id: `leave-${String(index + 1).padStart(3, "0")}`,
    staffId: person.id,
    startDate: dateAt(start),
    endDate: dateAt(start + 1 + (index % 3)),
    type: pick(LEAVE_TYPES, index),
    status,
    reason: pick(LEAVE_REASONS, index),
    decidedBy: status === "pending" ? null : "user-manager",
  };
});

const SUPPLIER_DATA = [
  { name: "Sahyadri Linen Co.", contactName: "Ravi Patil", email: "ravi@sahyadrilinen.in", phone: "+91 98200 30001", address: "MIDC, Pune" },
  { name: "Lotus Supply", contactName: "Nina Shah", email: "nina@lotussupply.in", phone: "+91 98200 30002", address: "Andheri East, Mumbai" },
  { name: "Deccan Roasters", contactName: "Kiran Rao", email: "kiran@deccanroasters.in", phone: "+91 98200 30003", address: "Banjara Hills, Hyderabad" },
  { name: "Konkan Fresh Foods", contactName: "Sameer Naik", email: "sameer@konkanfresh.in", phone: "+91 98200 30004", address: "Panaji, Goa" },
  { name: "Mumbai Cleaning Mart", contactName: "Farah Khan", email: "farah@mumbaicleaning.in", phone: "+91 98200 30005", address: "Lower Parel, Mumbai" },
  { name: "EcoCare Toiletries", contactName: "Ishita Bose", email: "ishita@ecocare.in", phone: "+91 98200 30006", address: "Salt Lake, Kolkata" },
  { name: "Skyline Maintenance", contactName: "Deepak Joshi", email: "deepak@skylinemaint.in", phone: "+91 98200 30007", address: "Vashi, Navi Mumbai" },
  { name: "Paper Trail Stationery", contactName: "Ritu Gupta", email: "ritu@papertrail.in", phone: "+91 98200 30008", address: "Connaught Place, Delhi" },
  { name: "Volt Electronics", contactName: "Ajay Reddy", email: "ajay@voltelectronics.in", phone: "+91 98200 30009", address: "Madhapur, Hyderabad" },
  { name: "BevCo Distributors", contactName: "Sara D'Souza", email: "sara@bevco.in", phone: "+91 98200 30010", address: "Bandra West, Mumbai" },
  { name: "Spa Botanicals", contactName: "Maya Pillai", email: "maya@spabotanicals.in", phone: "+91 98200 30011", address: "Kochi, Kerala" },
  { name: "Kitchen Craft India", contactName: "Naveen Kumar", email: "naveen@kitchencraft.in", phone: "+91 98200 30012", address: "Peenya, Bengaluru" },
] as const;

export const seedSuppliers: SeedSupplier[] = SUPPLIER_DATA.map((supplier, index) => ({
  id: `supplier-${String(index + 1).padStart(2, "0")}`,
  name: supplier.name,
  contactName: supplier.contactName,
  email: supplier.email,
  phone: supplier.phone,
  address: supplier.address,
}));

const baseInventory: SeedInventory[] = [
  { id: "stock-001", name: "Bath towels", sku: "LIN-TWL-001", category: "Linen", quantity: 86, unit: "pieces", purchasePrice: money(180), supplier: "Sahyadri Linen Co.", minimumStock: 40 },
  { id: "stock-002", name: "Shampoo bottles", sku: "BTH-SHP-004", category: "Toiletries", quantity: 24, unit: "boxes", purchasePrice: money(420), supplier: "Lotus Supply", minimumStock: 30 },
  { id: "stock-003", name: "Coffee beans", sku: "REST-COF-009", category: "Restaurant", quantity: 18, unit: "kg", purchasePrice: money(240), supplier: "Deccan Roasters", minimumStock: 10 },
  { id: "stock-004", name: "Bed sheets", sku: "LIN-SHT-002", category: "Linen", quantity: 60, unit: "pieces", purchasePrice: money(320), supplier: "Sahyadri Linen Co.", minimumStock: 30 },
];

const EXTRA_INVENTORY = [
  { name: "Hand towels", category: "Linen", unit: "pieces" },
  { name: "Bathrobes", category: "Linen", unit: "pieces" },
  { name: "Pillow covers", category: "Linen", unit: "pieces" },
  { name: "Duvet covers", category: "Linen", unit: "pieces" },
  { name: "Pool towels", category: "Linen", unit: "pieces" },
  { name: "Conditioner bottles", category: "Toiletries", unit: "boxes" },
  { name: "Body wash", category: "Toiletries", unit: "bottles" },
  { name: "Dental kits", category: "Toiletries", unit: "boxes" },
  { name: "Shaving kits", category: "Toiletries", unit: "boxes" },
  { name: "Sanitary kits", category: "Toiletries", unit: "boxes" },
  { name: "Tea bags", category: "Restaurant", unit: "boxes" },
  { name: "Basmati rice", category: "Restaurant", unit: "kg" },
  { name: "Olive oil", category: "Restaurant", unit: "litres" },
  { name: "Mineral water", category: "Restaurant", unit: "cases" },
  { name: "Crockery set", category: "Restaurant", unit: "sets" },
  { name: "Floor cleaner", category: "Cleaning", unit: "litres" },
  { name: "Glass cleaner", category: "Cleaning", unit: "litres" },
  { name: "Laundry detergent", category: "Cleaning", unit: "kg" },
  { name: "Disinfectant", category: "Cleaning", unit: "litres" },
  { name: "Garbage bags", category: "Cleaning", unit: "rolls" },
  { name: "Light bulbs", category: "Maintenance", unit: "pieces" },
  { name: "Batteries", category: "Maintenance", unit: "packs" },
  { name: "Door hinges", category: "Maintenance", unit: "pieces" },
  { name: "Paint", category: "Maintenance", unit: "litres" },
  { name: "Silicone sealant", category: "Maintenance", unit: "tubes" },
  { name: "Guest folders", category: "Stationery", unit: "pieces" },
  { name: "Pens", category: "Stationery", unit: "boxes" },
  { name: "Printer paper", category: "Stationery", unit: "reams" },
  { name: "Envelopes", category: "Stationery", unit: "packs" },
  { name: "Key card sleeves", category: "Stationery", unit: "packs" },
  { name: "Hair dryers", category: "Electronics", unit: "pieces" },
  { name: "Kettles", category: "Electronics", unit: "pieces" },
  { name: "Alarm clocks", category: "Electronics", unit: "pieces" },
  { name: "TV remotes", category: "Electronics", unit: "pieces" },
  { name: "Phone chargers", category: "Electronics", unit: "pieces" },
  { name: "Sparkling water", category: "Minibar", unit: "cases" },
] as const;

const generatedInventory: SeedInventory[] = EXTRA_INVENTORY.map((item, index) => ({
  id: `stock-${String(index + 5).padStart(3, "0")}`,
  name: item.name,
  sku: `SKU-${item.category.slice(0, 3).toUpperCase()}-${String(index + 5).padStart(3, "0")}`,
  category: item.category,
  quantity: 20 + ((index * 7) % 150),
  unit: item.unit,
  purchasePrice: money(80 + (index % 30) * 45),
  supplier: SUPPLIER_DATA[index % SUPPLIER_DATA.length].name,
  minimumStock: 10 + (index % 6) * 10,
}));

export const seedInventory = [...baseInventory, ...generatedInventory];

export const seedInventoryTransactions: SeedInventoryTransaction[] = Array.from({ length: 100 }, (_, index) => {
  const item = seedInventory[index % seedInventory.length];
  const type = pick(["in", "out", "adjustment"] as const, index);
  const quantity = type === "in" ? 5 + (index % 40) : type === "out" ? -(1 + (index % 15)) : 1 + (index % 5);
  return {
    id: `invtxn-${String(index + 1).padStart(3, "0")}`,
    inventoryId: item.id,
    type,
    quantity,
    note: type === "in" ? "Stock received from supplier" : type === "out" ? "Issued to department" : "Stock count adjustment",
    createdBy: index % 2 === 0 ? "user-housekeeping" : "user-accountant",
    createdAt: iso(-(index % 30), -(index % 12)),
  };
});

const EXPENSE_CATEGORIES = ["Utilities", "Supplies", "Maintenance", "Salaries", "Marketing", "Transport", "Food & Beverage", "Housekeeping", "Technology", "Professional Fees"] as const;
const EXPENSE_DESCRIPTIONS = ["Monthly electricity", "Housekeeping replenishment", "Window repair estimate", "Front desk salaries", "Digital campaign", "Airport transfers", "Kitchen produce", "Linen replacement", "Property management software", "Legal consultation"] as const;
const EXPENSE_STATUS_CYCLE: ExpenseStatus[] = ["approved", "approved", "pending", "rejected"];

const baseExpenses: SeedExpense[] = [
  { id: "exp-001", category: "Utilities", description: "Monthly electricity", amount: money(18400), date: dateAt(-2), method: "bank-transfer", status: "approved", submittedBy: "user-accountant", approvedBy: "user-admin" },
  { id: "exp-002", category: "Supplies", description: "Housekeeping replenishment", amount: money(6200), date: dateAt(-1), method: "card", status: "approved", submittedBy: "user-housekeeping", approvedBy: "user-manager" },
  { id: "exp-003", category: "Maintenance", description: "Window repair estimate", amount: money(3800), date: dateAt(0), method: "bank-transfer", status: "pending", submittedBy: "user-manager", approvedBy: null },
];

const generatedExpenses: SeedExpense[] = Array.from({ length: 37 }, (_, index) => {
  const status = pick(EXPENSE_STATUS_CYCLE, index);
  return {
    id: `exp-${String(index + 4).padStart(3, "0")}`,
    category: pick(EXPENSE_CATEGORIES, index),
    description: `${pick(EXPENSE_DESCRIPTIONS, index)} #${index + 4}`,
    amount: money(1000 + ((index * 137) % 50000)),
    date: dateAt(-(index % 60)),
    method: pick(PAYMENT_METHODS, index),
    status,
    submittedBy: index % 3 === 0 ? "user-manager" : "user-accountant",
    approvedBy: status === "pending" ? null : "user-admin",
  };
});

export const seedExpenses = [...baseExpenses, ...generatedExpenses];

export const seedMenuCategories: SeedMenuCategory[] = [
  { id: "menu-cat-breakfast", name: "Breakfast", description: "Served from 07:00 to 10:30.", sortOrder: 1 },
  { id: "menu-cat-starters", name: "Starters", description: "Small plates for sharing.", sortOrder: 2 },
  { id: "menu-cat-main", name: "Main Course", description: "Comfort classics and house favourites.", sortOrder: 3 },
  { id: "menu-cat-biryani", name: "Rice & Biryani", description: "Slow-cooked rice dishes.", sortOrder: 4 },
  { id: "menu-cat-desserts", name: "Desserts", description: "Sweet finishes.", sortOrder: 5 },
  { id: "menu-cat-beverages", name: "Beverages", description: "Coffee, tea, and refreshments.", sortOrder: 6 },
  { id: "menu-cat-soups", name: "Soups & Salads", description: "Light bowls and fresh greens.", sortOrder: 7 },
  { id: "menu-cat-breads", name: "Indian Breads", description: "Fresh from the tandoor.", sortOrder: 8 },
];

const baseMenuItems: SeedMenuItem[] = [
  { id: "menu-item-english-breakfast", categoryId: "menu-cat-breakfast", name: "English Breakfast", description: "Eggs, sausage, grilled tomato, toast and coffee.", price: money(450), isVegetarian: false, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-masala-dosa", categoryId: "menu-cat-breakfast", name: "Masala Dosa", description: "Crisp dosa with spiced potato, sambar and chutney.", price: money(320), isVegetarian: true, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-aloo-paratha", categoryId: "menu-cat-breakfast", name: "Aloo Paratha", description: "Whole-wheat paratha, curd and pickle.", price: money(280), isVegetarian: true, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-paneer-tikka", categoryId: "menu-cat-starters", name: "Paneer Tikka", description: "Char-grilled paneer with peppers and mint chutney.", price: money(380), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-chicken-tikka", categoryId: "menu-cat-starters", name: "Chicken Tikka", description: "Yoghurt-marinated chicken from the tandoor.", price: money(460), isVegetarian: false, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-spring-rolls", categoryId: "menu-cat-starters", name: "Vegetable Spring Rolls", description: "Crisp rolls with a sweet chilli dip.", price: money(260), isVegetarian: true, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-dal-makhani", categoryId: "menu-cat-main", name: "Dal Makhani", description: "Black lentils simmered overnight with butter and cream.", price: money(340), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-paneer-butter-masala", categoryId: "menu-cat-main", name: "Paneer Butter Masala", description: "Paneer in a silky tomato and cashew gravy.", price: money(420), isVegetarian: true, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-butter-chicken", categoryId: "menu-cat-main", name: "Butter Chicken", description: "Tandoori chicken in a rich tomato-butter gravy.", price: money(520), isVegetarian: false, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-grilled-fish", categoryId: "menu-cat-main", name: "Grilled Fish", description: "Bengali-style grilled fish with lemon and herbs.", price: money(620), isVegetarian: false, isAvailable: true, sortOrder: 4 },
  { id: "menu-item-vegetable-biryani", categoryId: "menu-cat-biryani", name: "Vegetable Biryani", description: "Fragrant basmati rice with seasonal vegetables and raita.", price: money(380), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-chicken-biryani", categoryId: "menu-cat-biryani", name: "Chicken Biryani", description: "Hyderabadi-style chicken biryani with raita.", price: money(520), isVegetarian: false, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-gulab-jamun", categoryId: "menu-cat-desserts", name: "Gulab Jamun", description: "Warm milk dumplings in cardamom syrup.", price: money(180), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-brownie", categoryId: "menu-cat-desserts", name: "Chocolate Brownie", description: "Fudgy brownie with vanilla ice cream.", price: money(240), isVegetarian: true, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-filter-coffee", categoryId: "menu-cat-beverages", name: "Filter Coffee", description: "South Indian filter coffee with steamed milk.", price: money(120), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-masala-chai", categoryId: "menu-cat-beverages", name: "Masala Chai", description: "Spiced tea brewed with milk.", price: money(90), isVegetarian: true, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-lime-soda", categoryId: "menu-cat-beverages", name: "Fresh Lime Soda", description: "Sweet or salted lime soda.", price: money(150), isVegetarian: true, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-sparkling-water", categoryId: "menu-cat-beverages", name: "Sparkling Water", description: "Chilled sparkling mineral water.", price: money(110), isVegetarian: true, isAvailable: true, sortOrder: 4 },
];

const extraMenuItems: SeedMenuItem[] = [
  { id: "menu-item-poha", categoryId: "menu-cat-breakfast", name: "Poha", description: "Flattened rice with peanuts, curry leaves and lemon.", price: money(220), isVegetarian: true, isAvailable: true, sortOrder: 4 },
  { id: "menu-item-upma", categoryId: "menu-cat-breakfast", name: "Upma", description: "Semolina with vegetables and coconut chutney.", price: money(240), isVegetarian: true, isAvailable: true, sortOrder: 5 },
  { id: "menu-item-eggs-benedict", categoryId: "menu-cat-breakfast", name: "Eggs Benedict", description: "Poached eggs, ham and hollandaise on toasted muffin.", price: money(480), isVegetarian: false, isAvailable: true, sortOrder: 6 },
  { id: "menu-item-chilli-paneer", categoryId: "menu-cat-starters", name: "Chilli Paneer", description: "Crisp paneer tossed with peppers and chilli sauce.", price: money(360), isVegetarian: true, isAvailable: true, sortOrder: 4 },
  { id: "menu-item-chicken-65", categoryId: "menu-cat-starters", name: "Chicken 65", description: "Spicy South Indian fried chicken with curry leaves.", price: money(440), isVegetarian: false, isAvailable: true, sortOrder: 5 },
  { id: "menu-item-onion-bhaji", categoryId: "menu-cat-starters", name: "Onion Bhaji", description: "Crisp onion fritters with tamarind chutney.", price: money(240), isVegetarian: true, isAvailable: true, sortOrder: 6 },
  { id: "menu-item-kadai-chicken", categoryId: "menu-cat-main", name: "Kadai Chicken", description: "Chicken cooked with peppers and freshly ground spices.", price: money(540), isVegetarian: false, isAvailable: true, sortOrder: 5 },
  { id: "menu-item-palak-paneer", categoryId: "menu-cat-main", name: "Palak Paneer", description: "Paneer cubes in a smooth spinach gravy.", price: money(400), isVegetarian: true, isAvailable: true, sortOrder: 6 },
  { id: "menu-item-vegetable-korma", categoryId: "menu-cat-main", name: "Vegetable Korma", description: "Seasonal vegetables in a coconut and cashew gravy.", price: money(380), isVegetarian: true, isAvailable: true, sortOrder: 7 },
  { id: "menu-item-lemon-rice", categoryId: "menu-cat-biryani", name: "Lemon Rice", description: "Tangy rice with peanuts, curry leaves and mustard seeds.", price: money(260), isVegetarian: true, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-prawn-biryani", categoryId: "menu-cat-biryani", name: "Prawn Biryani", description: "Coastal-style prawn biryani with coconut and spices.", price: money(620), isVegetarian: false, isAvailable: true, sortOrder: 4 },
  { id: "menu-item-jeera-rice", categoryId: "menu-cat-biryani", name: "Jeera Rice", description: "Basmati rice tempered with cumin.", price: money(220), isVegetarian: true, isAvailable: true, sortOrder: 5 },
  { id: "menu-item-rasmalai", categoryId: "menu-cat-desserts", name: "Rasmalai", description: "Soft cheese discs in saffron milk.", price: money(220), isVegetarian: true, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-kheer", categoryId: "menu-cat-desserts", name: "Rice Kheer", description: "Slow-cooked rice pudding with cardamom and nuts.", price: money(190), isVegetarian: true, isAvailable: true, sortOrder: 4 },
  { id: "menu-item-chocolate-mousse", categoryId: "menu-cat-desserts", name: "Chocolate Mousse", description: "Dark chocolate mousse with whipped cream.", price: money(260), isVegetarian: true, isAvailable: true, sortOrder: 5 },
  { id: "menu-item-iced-tea", categoryId: "menu-cat-beverages", name: "Iced Tea", description: "Chilled lemon iced tea.", price: money(130), isVegetarian: true, isAvailable: true, sortOrder: 5 },
  { id: "menu-item-cold-coffee", categoryId: "menu-cat-beverages", name: "Cold Coffee", description: "Blended coffee with milk and ice cream.", price: money(180), isVegetarian: true, isAvailable: true, sortOrder: 6 },
  { id: "menu-item-orange-juice", categoryId: "menu-cat-beverages", name: "Fresh Orange Juice", description: "Freshly squeezed orange juice.", price: money(160), isVegetarian: true, isAvailable: true, sortOrder: 7 },
  { id: "menu-item-tomato-shorba", categoryId: "menu-cat-soups", name: "Tomato Shorba", description: "Spiced tomato soup with coriander cream.", price: money(190), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-sweet-corn-soup", categoryId: "menu-cat-soups", name: "Sweet Corn Soup", description: "Creamy sweet corn soup with spring onion.", price: money(200), isVegetarian: true, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-garden-salad", categoryId: "menu-cat-soups", name: "Garden Salad", description: "Seasonal greens, cucumber, tomato and citrus dressing.", price: money(240), isVegetarian: true, isAvailable: true, sortOrder: 3 },
  { id: "menu-item-butter-naan", categoryId: "menu-cat-breads", name: "Butter Naan", description: "Tandoor-baked naan brushed with butter.", price: money(90), isVegetarian: true, isAvailable: true, sortOrder: 1 },
  { id: "menu-item-garlic-naan", categoryId: "menu-cat-breads", name: "Garlic Naan", description: "Naan topped with garlic and coriander.", price: money(110), isVegetarian: true, isAvailable: true, sortOrder: 2 },
  { id: "menu-item-tandoori-roti", categoryId: "menu-cat-breads", name: "Tandoori Roti", description: "Whole-wheat flatbread from the tandoor.", price: money(70), isVegetarian: true, isAvailable: true, sortOrder: 3 },
];

export const seedMenuItems = [...baseMenuItems, ...extraMenuItems];

const baseOrders: SeedOrder[] = [
  { id: "ord-001", reservationId: "res-002", roomNumber: "102", guestName: "Ananya Iyer", items: "Breakfast for one", amount: money(240), status: "served", createdAt: iso(-1) },
  { id: "ord-002", reservationId: "res-001", roomNumber: "204", guestName: "Aarav Mehta", items: "Sparkling water, club sandwich", amount: money(460), status: "preparing", createdAt: iso(0) },
];

const ORDER_STATUS_CYCLE: OrderStatus[] = ["new", "preparing", "served", "served", "cancelled"];

const generatedOrders: SeedOrder[] = Array.from({ length: 58 }, (_, index) => {
  const reservation = seedReservations[index % seedReservations.length];
  const guest = seedGuests.find((item) => item.id === reservation.guestId) ?? seedGuests[0];
  const room = seedRooms.find((item) => item.id === reservation.roomId) ?? seedRooms[0];
  const firstItem = seedMenuItems[index % seedMenuItems.length];
  const secondItem = seedMenuItems[(index * 3 + 1) % seedMenuItems.length];
  const amount = Number(firstItem.price) + Number(secondItem.price);
  return {
    id: `ord-${String(index + 3).padStart(3, "0")}`,
    reservationId: reservation.id,
    roomNumber: room.number,
    guestName: guest.name,
    items: `${firstItem.name}, ${secondItem.name}`,
    amount: money(amount),
    status: pick(ORDER_STATUS_CYCLE, index),
    createdAt: iso(-(index % 20), -(index % 12)),
  };
});

export const seedRestaurantOrders = [...baseOrders, ...generatedOrders];

export const seedRestaurantOrderItems: SeedOrderItem[] = seedRestaurantOrders.flatMap((order, orderIndex) => {
  const items: SeedOrderItem[] = [];
  const itemCount = 1 + (orderIndex % 3);
  for (let position = 0; position < itemCount; position += 1) {
    const menuItem = seedMenuItems[(orderIndex * 2 + position) % seedMenuItems.length];
    const quantity = 1 + ((orderIndex + position) % 2);
    items.push({
      id: `orditem-${order.id}-${position + 1}`,
      orderId: order.id,
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      unitPrice: menuItem.price,
      amount: money(Number(menuItem.price) * quantity),
    });
  }
  return items;
});

const ACTIVITY_ACTIONS = ["Checked in guest", "Checked out guest", "Created reservation", "Cancelled reservation", "Recorded payment", "Approved expense", "Marked room cleaned", "Added inventory", "Updated menu", "Sent notification", "Processed refund", "Updated settings"] as const;
const ACTIVITY_DETAILS = ["Front desk arrival", "Room released to housekeeping", "Direct booking", "Guest request", "Payment received", "Approved by manager", "Housekeeping completed", "Stock received", "Menu availability updated", "Guest notification sent", "Refund processed", "Property configuration changed"] as const;
const ACTIVITY_TONES: ActivityTone[] = ["info", "success", "warning", "danger"];

const baseActivities: SeedActivity[] = [
  { id: "act-001", actor: "Arjun Rao", action: "Checked in guest", detail: "Ananya Iyer - Room 102", tone: "success", createdAt: iso(0, -2) },
  { id: "act-002", actor: "Meera Shah", action: "Approved expense", detail: "Housekeeping replenishment - INR 6,200", tone: "info", createdAt: iso(0, -4) },
  { id: "act-003", actor: "Lakshmi Menon", action: "Marked room cleaned", detail: "Room 101", tone: "success", createdAt: iso(-1) },
  { id: "act-004", actor: "System", action: "Low inventory alert", detail: "Shampoo bottles below minimum stock", tone: "warning", createdAt: iso(-1) },
];

const generatedActivities: SeedActivity[] = Array.from({ length: 116 }, (_, index) => {
  const user = seedUsers[index % seedUsers.length];
  return {
    id: `act-${String(index + 5).padStart(3, "0")}`,
    actor: user.name,
    action: pick(ACTIVITY_ACTIONS, index),
    detail: pick(ACTIVITY_DETAILS, index),
    tone: pick(ACTIVITY_TONES, index),
    userId: user.id,
    createdAt: iso(-(index % 30), -(index % 12)),
  };
});

export const seedActivities = [...baseActivities, ...generatedActivities];

const NOTIFICATION_TITLES = ["New reservation", "Payment received", "Room ready", "Low stock alert", "Expense awaiting approval", "Guest request", "Checkout completed", "Shift handover"] as const;
const NOTIFICATION_BODIES = ["A new booking has been confirmed.", "A payment was recorded against an invoice.", "Housekeeping has released a room.", "An inventory item is below its minimum stock level.", "An expense needs a manager decision.", "A guest has requested an extra amenity.", "A room has been returned to the front desk.", "The shift summary is ready for review."] as const;

export const seedNotifications: SeedNotification[] = Array.from({ length: 80 }, (_, index) => ({
  id: `notif-${String(index + 1).padStart(3, "0")}`,
  userId: seedUsers[index % seedUsers.length].id,
  title: pick(NOTIFICATION_TITLES, index),
  body: pick(NOTIFICATION_BODIES, index),
  readAt: index % 3 === 0 ? iso(-(index % 10), -2) : null,
  createdAt: iso(-(index % 30), -(index % 12)),
}));

export const seedSessions: SeedSession[] = Array.from({ length: 30 }, (_, index) => ({
  id: `sess-seed-${String(index + 1).padStart(3, "0")}`,
  tokenHash: index.toString(16).padStart(64, "0"),
  userId: seedUsers[index % seedUsers.length].id,
  expiresAt: iso(1 + index),
  lastSeenAt: iso(-(index % 10), -(index % 12)),
  ip: index % 2 === 0 ? "127.0.0.1" : "::1",
  userAgent: index % 2 === 0 ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" : "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
}));

export const seedInvitations: SeedInvitation[] = Array.from({ length: 8 }, (_, index) => ({
  id: `invitation-${String(index + 1).padStart(2, "0")}`,
  email: `invitee${index + 1}@rivrhotel.in`,
  role: pick(STAFF_ROLE_CYCLE, index),
  tokenHash: (index + 1000).toString(16).padStart(64, "0"),
  invitedBy: "user-super-admin",
  expiresAt: iso(7 + index),
  acceptedAt: index % 4 === 0 ? iso(-1) : null,
}));

export const seedPasswordResetTokens: SeedPasswordResetToken[] = Array.from({ length: 5 }, (_, index) => ({
  id: `prt-${String(index + 1).padStart(2, "0")}`,
  userId: customerUsers[index % customerUsers.length].id,
  tokenHash: (index + 2000).toString(16).padStart(64, "0"),
  expiresAt: iso(1),
  usedAt: index % 2 === 0 ? iso(-1) : null,
}));
