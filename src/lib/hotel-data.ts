export type RoomStatus = "available" | "occupied" | "reserved" | "cleaning" | "maintenance" | "out-of-order";
export type ReservationStatus = "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled" | "no-show";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";
export type PaymentMethod = "cash" | "upi" | "card" | "bank-transfer" | "online";
export type StaffRole = "super-admin" | "manager" | "receptionist" | "housekeeping" | "accountant" | "restaurant";
export type Department = "Reception" | "Housekeeping" | "Restaurant" | "Maintenance" | "Security" | "Management" | "Finance";
export type HousekeepingStatus = "dirty" | "assigned" | "in-progress" | "cleaned" | "inspected";

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

export const dateAt = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const hotelInfo = {
  name: "RIVR Hotel & Residences",
  address: "88 Harbor View, San Francisco, CA 94105",
  phone: "+1 (415) 555-0198",
  email: "stay@rivrhotel.com",
};

export const roomTypes: RoomType[] = [
  { id: "type-king", name: "King Studio", description: "A quiet studio with a considered workspace and city-facing windows.", capacity: 2, size: 38, rate: 185, amenities: ["King bed", "Rain shower", "Fast Wi-Fi", "City view"], image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-deluxe", name: "Deluxe King", description: "Generous proportions, a soaking tub, and a view toward the water.", capacity: 2, size: 46, rate: 225, amenities: ["King bed", "Soaking tub", "Breakfast included", "River view"], image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-suite", name: "Twin Suite", description: "An easy suite for longer stays, families, and room to gather.", capacity: 4, size: 62, rate: 285, amenities: ["Two queen beds", "Living room", "Kitchenette", "River view"], image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-executive", name: "Executive Suite", description: "A private lounge, panoramic light, and a little more room to settle.", capacity: 3, size: 75, rate: 390, amenities: ["King bed", "Lounge", "Panoramic view", "Late checkout"], image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85" },
  { id: "type-penthouse", name: "Penthouse", description: "Our highest stay with a terrace, service, and the city at your feet.", capacity: 4, size: 98, rate: 520, amenities: ["Private terrace", "Butler service", "Panoramic view", "Private dining"], image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85" },
];

export const rooms: Room[] = [
  { id: "room-101", number: "101", typeId: "type-king", floor: 1, status: "available", notes: "Near the lobby" },
  { id: "room-102", number: "102", typeId: "type-king", floor: 1, status: "occupied", notes: "Garden side" },
  { id: "room-204", number: "204", typeId: "type-deluxe", floor: 2, status: "reserved", notes: "River side" },
  { id: "room-205", number: "205", typeId: "type-suite", floor: 2, status: "available", notes: "Family favorite" },
  { id: "room-301", number: "301", typeId: "type-executive", floor: 3, status: "available", notes: "Corner suite" },
  { id: "room-302", number: "302", typeId: "type-penthouse", floor: 3, status: "maintenance", notes: "HVAC inspection" },
  { id: "room-303", number: "303", typeId: "type-deluxe", floor: 3, status: "cleaning", notes: "Checkout today" },
  { id: "room-304", number: "304", typeId: "type-suite", floor: 3, status: "out-of-order", notes: "Window repair" },
];

export const guests: Guest[] = [
  { id: "guest-001", name: "Avery Morgan", email: "avery.morgan@example.com", phone: "+1 415 555 0184", address: "San Francisco, CA", idType: "Passport", idLastFour: "4281", preferences: "High floor, sparkling water", totalStays: 4, totalSpent: 2870 },
  { id: "guest-002", name: "Jordan Lee", email: "jordan.lee@example.com", phone: "+1 415 555 0107", address: "Oakland, CA", idType: "Driver license", idLastFour: "9017", preferences: "Quiet room", totalStays: 2, totalSpent: 1120 },
  { id: "guest-003", name: "Sofia Patel", email: "sofia.patel@example.com", phone: "+1 415 555 0132", address: "Austin, TX", idType: "Passport", idLastFour: "7734", preferences: "Vegetarian breakfast", totalStays: 1, totalSpent: 1170 },
  { id: "guest-004", name: "Elliot Brooks", email: "elliot.brooks@example.com", phone: "+1 415 555 0166", address: "Seattle, WA", idType: "Passport", idLastFour: "1209", preferences: "Late checkout", totalStays: 3, totalSpent: 1980 },
];

export const reservations: Reservation[] = [
  { id: "res-001", reference: "RIVR-2481", guestId: "guest-001", roomId: "room-204", checkIn: dateAt(1), checkOut: dateAt(4), adults: 2, children: 0, status: "confirmed", paymentStatus: "partial", roomCharges: 675, additionalCharges: 0, discount: 0, tax: 81, total: 756, paidAmount: 378, specialRequests: "High floor if possible", createdAt: new Date().toISOString() },
  { id: "res-002", reference: "RIVR-2476", guestId: "guest-002", roomId: "room-102", checkIn: dateAt(-1), checkOut: dateAt(1), adults: 1, children: 0, status: "checked-in", paymentStatus: "paid", roomCharges: 310, additionalCharges: 24, discount: 0, tax: 40, total: 374, paidAmount: 374, specialRequests: "", createdAt: new Date().toISOString() },
  { id: "res-003", reference: "RIVR-2468", guestId: "guest-003", roomId: "room-301", checkIn: dateAt(5), checkOut: dateAt(8), adults: 2, children: 1, status: "confirmed", paymentStatus: "pending", roomCharges: 1170, additionalCharges: 0, discount: 90, tax: 130, total: 1210, paidAmount: 0, specialRequests: "Vegetarian breakfast", createdAt: new Date().toISOString() },
  { id: "res-004", reference: "RIVR-2459", guestId: "guest-004", roomId: "room-303", checkIn: dateAt(0), checkOut: dateAt(1), adults: 2, children: 0, status: "checked-out", paymentStatus: "paid", roomCharges: 225, additionalCharges: 46, discount: 0, tax: 32, total: 303, paidAmount: 303, specialRequests: "", createdAt: new Date().toISOString() },
  { id: "res-005", reference: "RIVR-2490", guestId: "guest-002", roomId: "room-205", checkIn: dateAt(10), checkOut: dateAt(13), adults: 2, children: 2, status: "pending", paymentStatus: "pending", roomCharges: 855, additionalCharges: 0, discount: 0, tax: 103, total: 958, paidAmount: 0, specialRequests: "Connecting room requested", createdAt: new Date().toISOString() },
];

export const payments: Payment[] = [
  { id: "pay-001", reservationId: "res-001", amount: 378, method: "card", status: "completed", paidAt: new Date().toISOString(), note: "Deposit" },
  { id: "pay-002", reservationId: "res-002", amount: 374, method: "upi", status: "completed", paidAt: new Date().toISOString(), note: "Settled at front desk" },
  { id: "pay-003", reservationId: "res-004", amount: 303, method: "card", status: "completed", paidAt: new Date().toISOString(), note: "Final settlement" },
];

export const invoices: Invoice[] = [
  { id: "inv-001", number: "INV-2025-001", reservationId: "res-001", status: "partial", issuedAt: new Date().toISOString(), dueAmount: 378 },
  { id: "inv-002", number: "INV-2025-002", reservationId: "res-002", status: "paid", issuedAt: new Date().toISOString(), dueAmount: 0 },
  { id: "inv-003", number: "INV-2025-003", reservationId: "res-004", status: "paid", issuedAt: new Date().toISOString(), dueAmount: 0 },
];

export const staff: StaffMember[] = [
  { id: "staff-001", name: "Maya Chen", email: "maya@rivrhotel.com", phone: "+1 415 555 0141", department: "Management", role: "manager", shift: "09:00–18:00", status: "active", joinedAt: "2022-03-14" },
  { id: "staff-002", name: "Noah Williams", email: "noah@rivrhotel.com", phone: "+1 415 555 0142", department: "Reception", role: "receptionist", shift: "07:00–16:00", status: "active", joinedAt: "2023-08-09" },
  { id: "staff-003", name: "Iris Thompson", email: "iris@rivrhotel.com", phone: "+1 415 555 0143", department: "Housekeeping", role: "housekeeping", shift: "08:00–17:00", status: "active", joinedAt: "2024-01-22" },
  { id: "staff-004", name: "Liam Carter", email: "liam@rivrhotel.com", phone: "+1 415 555 0144", department: "Finance", role: "accountant", shift: "09:00–18:00", status: "on-leave", joinedAt: "2021-11-03" },
  { id: "staff-005", name: "Priya Singh", email: "priya@rivrhotel.com", phone: "+1 415 555 0145", department: "Restaurant", role: "restaurant", shift: "12:00–21:00", status: "active", joinedAt: "2024-05-18" },
];

export const attendance: Attendance[] = staff.map((person, index) => ({ id: `att-${index + 1}`, staffId: person.id, date: dateAt(0), status: person.status === "on-leave" ? "leave" : "present", clockIn: person.status === "on-leave" ? undefined : "08:57" }));

export const housekeepingTasks: HousekeepingTask[] = [
  { id: "hk-001", roomId: "room-303", assignedTo: "staff-003", status: "in-progress", priority: "high", issue: "Post-checkout deep clean", updatedAt: new Date().toISOString() },
  { id: "hk-002", roomId: "room-102", assignedTo: "staff-003", status: "inspected", priority: "normal", issue: "Daily service", updatedAt: new Date().toISOString() },
  { id: "hk-003", roomId: "room-205", status: "dirty", priority: "normal", issue: "Pre-arrival clean", updatedAt: new Date().toISOString() },
  { id: "hk-004", roomId: "room-101", assignedTo: "staff-003", status: "cleaned", priority: "low", issue: "Amenity refresh", updatedAt: new Date().toISOString() },
];

export const inventory: InventoryItem[] = [
  { id: "stock-001", name: "Bath towels", category: "Linen", quantity: 86, unit: "pieces", purchasePrice: 18, supplier: "Harbor Linen Co.", minimumStock: 40 },
  { id: "stock-002", name: "Shampoo bottles", category: "Toiletries", quantity: 24, unit: "boxes", purchasePrice: 42, supplier: "Cedar Supply", minimumStock: 30 },
  { id: "stock-003", name: "Coffee beans", category: "Restaurant", quantity: 18, unit: "kg", purchasePrice: 24, supplier: "Bay Roasters", minimumStock: 10 },
  { id: "stock-004", name: "Bed sheets", category: "Linen", quantity: 60, unit: "pieces", purchasePrice: 32, supplier: "Harbor Linen Co.", minimumStock: 30 },
];

export const expenses: Expense[] = [
  { id: "exp-001", category: "Utilities", description: "Monthly electricity", amount: 1840, date: dateAt(-2), method: "bank-transfer", status: "approved" },
  { id: "exp-002", category: "Supplies", description: "Housekeeping replenishment", amount: 620, date: dateAt(-1), method: "card", status: "approved" },
  { id: "exp-003", category: "Maintenance", description: "Window repair estimate", amount: 380, date: dateAt(0), method: "bank-transfer", status: "pending" },
];

export const restaurantOrders: RestaurantOrder[] = [
  { id: "ord-001", reservationId: "res-002", roomNumber: "102", guestName: "Jordan Lee", items: "Breakfast for one", amount: 24, status: "served", createdAt: new Date().toISOString() },
  { id: "ord-002", reservationId: "res-001", roomNumber: "204", guestName: "Avery Morgan", items: "Sparkling water, club sandwich", amount: 46, status: "preparing", createdAt: new Date().toISOString() },
];

export const activities: ActivityLog[] = [
  { id: "act-001", actor: "Noah Williams", action: "Checked in guest", detail: "Jordan Lee · Room 102", createdAt: new Date().toISOString(), tone: "success" },
  { id: "act-002", actor: "Maya Chen", action: "Approved expense", detail: "Housekeeping replenishment · $620", createdAt: new Date().toISOString(), tone: "info" },
  { id: "act-003", actor: "Iris Thompson", action: "Marked room cleaned", detail: "Room 101", createdAt: new Date().toISOString(), tone: "success" },
  { id: "act-004", actor: "System", action: "Low inventory alert", detail: "Shampoo bottles below minimum stock", createdAt: new Date().toISOString(), tone: "warning" },
];

export const offers: PublicOffer[] = [
  { id: "offer-001", title: "The Long Weekend", description: "Stay three nights and take the fourth at our house rate.", discount: "4th night on us", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85" },
  { id: "offer-002", title: "Slow Sunday", description: "A late checkout, breakfast for two, and nowhere else to be.", discount: "From $195 / night", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85" },
];

export const reviews: Review[] = [
  { id: "review-001", guest: "Nina R.", rating: 5, comment: "The kind of hotel where every detail feels quietly considered.", date: "Sep 18, 2025" },
  { id: "review-002", guest: "Marcus T.", rating: 5, comment: "Beautiful room, wonderful sleep, and the easiest check-in we have had in years.", date: "Aug 29, 2025" },
  { id: "review-003", guest: "Elena P.", rating: 4, comment: "Warm service and a genuinely peaceful place to land in the city.", date: "Aug 11, 2025" },
];

export function getRoomType(room: Room) { return roomTypes.find((type) => type.id === room.typeId); }
export function calculateNights(checkIn: string, checkOut: string) { const start = new Date(`${checkIn}T12:00:00`); const end = new Date(`${checkOut}T12:00:00`); return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)); }
export function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
export function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
export function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
export function isDateRangeValid(checkIn: string, checkOut: string) { return Boolean(checkIn && checkOut && calculateNights(checkIn, checkOut) > 0); }
