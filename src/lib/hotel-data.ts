export type RoomStatus = "available" | "occupied" | "reserved" | "cleaning" | "maintenance" | "out-of-order";
export type ReservationStatus = "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled" | "no-show";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";
export type PaymentMethod = "cash" | "upi" | "card" | "bank-transfer" | "online";
export type StaffRole = "super-admin" | "manager" | "receptionist" | "housekeeping" | "accountant" | "restaurant";
export type Department = "Reception" | "Housekeeping" | "Restaurant" | "Maintenance" | "Security" | "Management" | "Finance";
export type HousekeepingStatus = "dirty" | "assigned" | "in-progress" | "cleaned" | "inspected";

export interface StaySearch {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  guests: number;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  capacity: number;
  size: number;
  rate: number;
  amenities: string[];
  image: string;
}

export interface Room {
  id: string;
  number: string;
  typeId: string;
  floor: number;
  status: RoomStatus;
  notes: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  idType: string;
  idLastFour: string;
  preferences: string;
  totalStays: number;
  totalSpent: number;
}

export interface Reservation {
  id: string;
  reference: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  roomCharges: number;
  additionalCharges: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  specialRequests: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  status: "completed" | "refunded";
  paidAt: string;
  note: string;
}

export interface Invoice {
  id: string;
  number: string;
  reservationId: string;
  status: PaymentStatus;
  issuedAt: string;
  dueAmount: number;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  assignedTo?: string;
  status: HousekeepingStatus;
  priority: "low" | "normal" | "high";
  issue: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: Department;
  role: StaffRole;
  shift: string;
  status: "active" | "on-leave" | "inactive";
  joinedAt: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  date: string;
  status: "present" | "absent" | "late" | "leave";
  clockIn?: string;
  clockOut?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  supplier: string;
  minimumStock: number;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: "pending" | "approved" | "rejected";
}

export interface RestaurantOrder {
  id: string;
  reservationId?: string;
  roomNumber?: string;
  guestName: string;
  items: string;
  amount: number;
  status: "new" | "preparing" | "served" | "cancelled";
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
  tone: "info" | "success" | "warning" | "danger";
}

export interface PublicOffer {
  id: string;
  title: string;
  description: string;
  discount: string;
  image: string;
}

export interface Review {
  id: string;
  guest: string;
  rating: number;
  comment: string;
  date: string;
}

export const IST_TIME_ZONE = "Asia/Kolkata";

function currentIstParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export const dateAt = (offset: number) => {
  const { year, month, day } = currentIstParts();
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const defaultStaySearch: StaySearch = {
  checkIn: dateAt(1),
  checkOut: dateAt(3),
  adults: 2,
  children: 0,
  rooms: 1,
  guests: 2,
};

/**
 * Demo property configuration.
 *
 * The repository does not contain verified Indian property details. These values are deliberately
 * marked as placeholders so they can be replaced from one place before launch. Do not publish them
 * as the hotel's real address or phone number.
 */
export const hotelInfo = {
  name: "RIVR Hotel & Residences",
  addressLine1: "RIVR Hotel & Residences",
  addressLine2: "[Hotel address to be configured]",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400001",
  country: "India",
  address: "RIVR Hotel & Residences, [Hotel address to be configured], Mumbai, Maharashtra 400001, India",
  phone: "+91 22 0000 0000",
  phoneHref: "+912200000000",
  email: "stay@rivrhotel.in",
  timeZone: IST_TIME_ZONE,
  mapQuery: "Mumbai, Maharashtra 400001, India",
  isPlaceholder: true,
  notice: "Demo property details — replace the address and phone with the hotel's verified details before launch.",
};

/**
 * Tax is configurable in one place because the repository has no confirmed GST configuration.
 * Replace this demo rate with the hotel's actual tax slab before accepting real payments.
 */
export const taxConfig = {
  rate: 0.12,
  label: "Taxes (12% demo rate)",
  note: "Tax is a configurable demo rate. Confirm the hotel's applicable GST slab before launch.",
};

export const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const roomTypes: RoomType[] = [
  { id: "type-king", name: "King Studio", description: "A quiet studio with a considered workspace and city-facing windows.", capacity: 2, size: 38, rate: 2499, amenities: ["King bed", "Rain shower", "High-speed Wi-Fi", "City view"], image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-deluxe", name: "Deluxe King", description: "Generous proportions, a soaking tub, and a view toward the water.", capacity: 2, size: 46, rate: 4999, amenities: ["King bed", "Soaking tub", "Breakfast included", "Sea view"], image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-suite", name: "Twin Suite", description: "An easy suite for longer stays, families, and room to gather.", capacity: 4, size: 62, rate: 8499, amenities: ["Two queen beds", "Living room", "Kitchenette", "Sea view"], image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-executive", name: "Executive Suite", description: "A private lounge, panoramic light, and a little more room to settle.", capacity: 3, size: 75, rate: 12999, amenities: ["King bed", "Lounge", "Panoramic view", "Late checkout"], image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-penthouse", name: "Penthouse", description: "Our highest stay with a terrace, service, and the city at your feet.", capacity: 4, size: 98, rate: 24999, amenities: ["Private terrace", "Butler service", "Panoramic view", "Private dining"], image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85" },
];

export const rooms: Room[] = [
  { id: "room-101", number: "101", typeId: "type-king", floor: 1, status: "available", notes: "Near the lobby" },
  { id: "room-102", number: "102", typeId: "type-king", floor: 1, status: "occupied", notes: "Garden side" },
  { id: "room-204", number: "204", typeId: "type-deluxe", floor: 2, status: "reserved", notes: "Sea side" },
  { id: "room-205", number: "205", typeId: "type-suite", floor: 2, status: "available", notes: "Family favourite" },
  { id: "room-301", number: "301", typeId: "type-executive", floor: 3, status: "available", notes: "Corner suite" },
  { id: "room-302", number: "302", typeId: "type-penthouse", floor: 3, status: "maintenance", notes: "HVAC inspection" },
  { id: "room-303", number: "303", typeId: "type-deluxe", floor: 3, status: "cleaning", notes: "Checkout today" },
  { id: "room-304", number: "304", typeId: "type-suite", floor: 3, status: "out-of-order", notes: "Window repair" },
];

export const guests: Guest[] = [
  { id: "guest-001", name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 98765 43210", address: "Mumbai, Maharashtra", city: "Mumbai", state: "Maharashtra", postalCode: "400001", idType: "Passport", idLastFour: "4281", preferences: "High floor, sparkling water", totalStays: 4, totalSpent: 16797 },
  { id: "guest-002", name: "Ananya Iyer", email: "ananya.iyer@example.com", phone: "+91 98200 11223", address: "Pune, Maharashtra", city: "Pune", state: "Maharashtra", postalCode: "411001", idType: "Driving licence", idLastFour: "9017", preferences: "Quiet room", totalStays: 2, totalSpent: 6098 },
  { id: "guest-003", name: "Rohan Kapoor", email: "rohan.kapoor@example.com", phone: "+91 99870 44556", address: "Bengaluru, Karnataka", city: "Bengaluru", state: "Karnataka", postalCode: "560001", idType: "Passport", idLastFour: "7734", preferences: "Vegetarian breakfast", totalStays: 1, totalSpent: 41437 },
  { id: "guest-004", name: "Meera Nair", email: "meera.nair@example.com", phone: "+91 98450 77889", address: "Kochi, Kerala", city: "Kochi", state: "Kerala", postalCode: "682001", idType: "Passport", idLastFour: "1209", preferences: "Late checkout", totalStays: 3, totalSpent: 6349 },
];

export const reservations: Reservation[] = [
  { id: "res-001", reference: "RIVR-2481", guestId: "guest-001", roomId: "room-204", checkIn: dateAt(1), checkOut: dateAt(4), adults: 2, children: 0, status: "confirmed", paymentStatus: "partial", roomCharges: 14997, additionalCharges: 0, discount: 0, tax: 1800, total: 16797, paidAmount: 8399, specialRequests: "High floor if possible", createdAt: new Date().toISOString() },
  { id: "res-002", reference: "RIVR-2476", guestId: "guest-002", roomId: "room-102", checkIn: dateAt(-1), checkOut: dateAt(1), adults: 1, children: 0, status: "checked-in", paymentStatus: "paid", roomCharges: 4998, additionalCharges: 500, discount: 0, tax: 600, total: 6098, paidAmount: 6098, specialRequests: "", createdAt: new Date().toISOString() },
  { id: "res-003", reference: "RIVR-2468", guestId: "guest-003", roomId: "room-301", checkIn: dateAt(5), checkOut: dateAt(8), adults: 2, children: 1, status: "confirmed", paymentStatus: "pending", roomCharges: 38997, additionalCharges: 0, discount: 2000, tax: 4440, total: 41437, paidAmount: 0, specialRequests: "Vegetarian breakfast", createdAt: new Date().toISOString() },
  { id: "res-004", reference: "RIVR-2459", guestId: "guest-004", roomId: "room-303", checkIn: dateAt(0), checkOut: dateAt(1), adults: 2, children: 0, status: "checked-out", paymentStatus: "paid", roomCharges: 4999, additionalCharges: 750, discount: 0, tax: 600, total: 6349, paidAmount: 6349, specialRequests: "", createdAt: new Date().toISOString() },
  { id: "res-005", reference: "RIVR-2490", guestId: "guest-002", roomId: "room-205", checkIn: dateAt(10), checkOut: dateAt(13), adults: 2, children: 2, status: "pending", paymentStatus: "pending", roomCharges: 25497, additionalCharges: 0, discount: 0, tax: 3060, total: 28557, paidAmount: 0, specialRequests: "Connecting room requested", createdAt: new Date().toISOString() },
];

export const payments: Payment[] = [
  { id: "pay-001", reservationId: "res-001", amount: 8399, method: "card", status: "completed", paidAt: new Date().toISOString(), note: "Deposit" },
  { id: "pay-002", reservationId: "res-002", amount: 6098, method: "upi", status: "completed", paidAt: new Date().toISOString(), note: "Settled at front desk" },
  { id: "pay-003", reservationId: "res-004", amount: 6349, method: "card", status: "completed", paidAt: new Date().toISOString(), note: "Final settlement" },
];

export const invoices: Invoice[] = [
  { id: "inv-001", number: "INV-2025-001", reservationId: "res-001", status: "partial", issuedAt: new Date().toISOString(), dueAmount: 8398 },
  { id: "inv-002", number: "INV-2025-002", reservationId: "res-002", status: "paid", issuedAt: new Date().toISOString(), dueAmount: 0 },
  { id: "inv-003", number: "INV-2025-003", reservationId: "res-004", status: "paid", issuedAt: new Date().toISOString(), dueAmount: 0 },
];

export const staff: StaffMember[] = [
  { id: "staff-001", name: "Meera Shah", email: "meera@rivrhotel.in", phone: "+91 98200 10101", department: "Management", role: "manager", shift: "09:00–18:00", status: "active", joinedAt: "2022-03-14" },
  { id: "staff-002", name: "Arjun Rao", email: "arjun@rivrhotel.in", phone: "+91 98200 10102", department: "Reception", role: "receptionist", shift: "07:00–16:00", status: "active", joinedAt: "2023-08-09" },
  { id: "staff-003", name: "Lakshmi Menon", email: "lakshmi@rivrhotel.in", phone: "+91 98200 10103", department: "Housekeeping", role: "housekeeping", shift: "08:00–17:00", status: "active", joinedAt: "2024-01-22" },
  { id: "staff-004", name: "Vikram Desai", email: "vikram@rivrhotel.in", phone: "+91 98200 10104", department: "Finance", role: "accountant", shift: "09:00–18:00", status: "on-leave", joinedAt: "2021-11-03" },
  { id: "staff-005", name: "Priya Singh", email: "priya@rivrhotel.in", phone: "+91 98200 10105", department: "Restaurant", role: "restaurant", shift: "12:00–21:00", status: "active", joinedAt: "2024-05-18" },
];

export const attendance: Attendance[] = staff.map((person, index) => ({ id: `att-${index + 1}`, staffId: person.id, date: dateAt(0), status: person.status === "on-leave" ? "leave" : "present", clockIn: person.status === "on-leave" ? undefined : "08:57" }));

export const housekeepingTasks: HousekeepingTask[] = [
  { id: "hk-001", roomId: "room-303", assignedTo: "staff-003", status: "in-progress", priority: "high", issue: "Post-checkout deep clean", updatedAt: new Date().toISOString() },
  { id: "hk-002", roomId: "room-102", assignedTo: "staff-003", status: "inspected", priority: "normal", issue: "Daily service", updatedAt: new Date().toISOString() },
  { id: "hk-003", roomId: "room-205", status: "dirty", priority: "normal", issue: "Pre-arrival clean", updatedAt: new Date().toISOString() },
  { id: "hk-004", roomId: "room-101", assignedTo: "staff-003", status: "cleaned", priority: "low", issue: "Amenity refresh", updatedAt: new Date().toISOString() },
];

export const inventory: InventoryItem[] = [
  { id: "stock-001", name: "Bath towels", category: "Linen", quantity: 86, unit: "pieces", purchasePrice: 180, supplier: "Sahyadri Linen Co.", minimumStock: 40 },
  { id: "stock-002", name: "Shampoo bottles", category: "Toiletries", quantity: 24, unit: "boxes", purchasePrice: 420, supplier: "Lotus Supply", minimumStock: 30 },
  { id: "stock-003", name: "Coffee beans", category: "Restaurant", quantity: 18, unit: "kg", purchasePrice: 240, supplier: "Deccan Roasters", minimumStock: 10 },
  { id: "stock-004", name: "Bed sheets", category: "Linen", quantity: 60, unit: "pieces", purchasePrice: 320, supplier: "Sahyadri Linen Co.", minimumStock: 30 },
];

export const expenses: Expense[] = [
  { id: "exp-001", category: "Utilities", description: "Monthly electricity", amount: 18400, date: dateAt(-2), method: "bank-transfer", status: "approved" },
  { id: "exp-002", category: "Supplies", description: "Housekeeping replenishment", amount: 6200, date: dateAt(-1), method: "card", status: "approved" },
  { id: "exp-003", category: "Maintenance", description: "Window repair estimate", amount: 3800, date: dateAt(0), method: "bank-transfer", status: "pending" },
];

export const restaurantOrders: RestaurantOrder[] = [
  { id: "ord-001", reservationId: "res-002", roomNumber: "102", guestName: "Ananya Iyer", items: "Breakfast for one", amount: 240, status: "served", createdAt: new Date().toISOString() },
  { id: "ord-002", reservationId: "res-001", roomNumber: "204", guestName: "Aarav Mehta", items: "Sparkling water, club sandwich", amount: 460, status: "preparing", createdAt: new Date().toISOString() },
];

export const activities: ActivityLog[] = [
  { id: "act-001", actor: "Arjun Rao", action: "Checked in guest", detail: "Ananya Iyer · Room 102", createdAt: new Date().toISOString(), tone: "success" },
  { id: "act-002", actor: "Meera Shah", action: "Approved expense", detail: "Housekeeping replenishment · ₹6,200", createdAt: new Date().toISOString(), tone: "info" },
  { id: "act-003", actor: "Lakshmi Menon", action: "Marked room cleaned", detail: "Room 101", createdAt: new Date().toISOString(), tone: "success" },
  { id: "act-004", actor: "System", action: "Low inventory alert", detail: "Shampoo bottles below minimum stock", createdAt: new Date().toISOString(), tone: "warning" },
];

export const offers: PublicOffer[] = [
  { id: "offer-001", title: "The Long Weekend", description: "Stay three nights and take the fourth at our house rate.", discount: "4th night on us", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85" },
  { id: "offer-002", title: "Slow Sunday", description: "A late checkout, breakfast for two, and nowhere else to be.", discount: "From ₹4,999 / night", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85" },
];

export const reviews: Review[] = [
  { id: "review-001", guest: "Nina R.", rating: 5, comment: "The kind of hotel where every detail feels quietly considered.", date: "18 Sep 2025" },
  { id: "review-002", guest: "Marcus T.", rating: 5, comment: "Beautiful room, wonderful sleep, and the easiest check-in we have had in years.", date: "29 Aug 2025" },
  { id: "review-003", guest: "Elena P.", rating: 4, comment: "Warm service and a genuinely peaceful place to land in the city.", date: "11 Aug 2025" },
];

export function getRoomType(room: Room) {
  return roomTypes.find((type) => type.id === room.typeId);
}

export function calculateNights(checkIn: string, checkOut: string) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

export function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function normalizeStaySearch(search: Record<string, unknown>) {
  const clamp = (value: unknown, min: number, max: number, fallback: number) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(max, Math.max(min, Math.round(numeric))) : fallback;
  };
  const today = dateAt(0);
  const checkIn = isDateOnly(search.checkIn) && search.checkIn >= today ? search.checkIn : dateAt(1);
  const checkOut = isDateOnly(search.checkOut) && search.checkOut > checkIn ? search.checkOut : addDays(checkIn, 2);
  const adults = clamp(search.adults, 1, 8, 2);
  const children = clamp(search.children, 0, 6, 0);
  const rooms = clamp(search.rooms, 1, 4, 1);
  return { checkIn, checkOut, adults, children, rooms, guests: adults + children };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST_TIME_ZONE }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST_TIME_ZONE,
  }).format(date);
  return `${formatted.replace(/\b(am|pm)\b/i, (match) => match.toUpperCase())} IST`;
}

export function isDateRangeValid(checkIn: string, checkOut: string) {
  return Boolean(checkIn && checkOut && calculateNights(checkIn, checkOut) > 0);
}

export function normalizeIndianPhone(value: string) {
  return value.replace(/[\s()-]/g, "");
}

export function isIndianPhone(value: string) {
  const digits = normalizeIndianPhone(value);
  return /^(?:\+91|91)?[6-9]\d{9}$/.test(digits);
}

export function isIndianPin(value: string) {
  return /^[1-9]\d{5}$/.test(value.trim());
}
