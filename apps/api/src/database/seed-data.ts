import { dateAt } from "../utils/date";

const money = (value: number) => value.toFixed(2);
const iso = (offsetDays = 0, hours = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(date.getUTCHours() + hours);
  return date;
};

export const seedRoles = [
  { code: "super-admin", name: "Super Admin", description: "Full access including user and security management." },
  { code: "admin", name: "Admin", description: "Property administration and configuration." },
  { code: "manager", name: "Manager", description: "Day-to-day hotel operations and reporting." },
  { code: "receptionist", name: "Receptionist", description: "Front desk, reservations, guests and payments." },
  { code: "housekeeping", name: "Housekeeping", description: "Room readiness and housekeeping tasks." },
  { code: "accountant", name: "Accountant", description: "Payments, invoices, expenses and reports." },
  { code: "restaurant", name: "Restaurant Staff", description: "Restaurant orders and service." },
] as const;

export const seedRoomTypes = [
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
];

export const seedRooms = [
  { id: "room-101", number: "101", typeId: "type-king", floor: 1, status: "available", notes: "Near the lobby" },
  { id: "room-102", number: "102", typeId: "type-king", floor: 1, status: "occupied", notes: "Garden side" },
  { id: "room-204", number: "204", typeId: "type-deluxe", floor: 2, status: "reserved", notes: "Sea side" },
  { id: "room-205", number: "205", typeId: "type-suite", floor: 2, status: "available", notes: "Family favourite" },
  { id: "room-301", number: "301", typeId: "type-executive", floor: 3, status: "available", notes: "Corner suite" },
  { id: "room-302", number: "302", typeId: "type-penthouse", floor: 3, status: "maintenance", notes: "HVAC inspection" },
  { id: "room-303", number: "303", typeId: "type-deluxe", floor: 3, status: "cleaning", notes: "Checkout today" },
  { id: "room-304", number: "304", typeId: "type-suite", floor: 3, status: "out-of-order", notes: "Window repair" },
] as const;

export const seedGuests = [
  { id: "guest-001", name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+91 98765 43210", address: "Mumbai, Maharashtra", city: "Mumbai", state: "Maharashtra", postalCode: "400001", idType: "Passport", idLastFour: "4281", preferences: "High floor, sparkling water", totalStays: 4, totalSpent: money(16797) },
  { id: "guest-002", name: "Ananya Iyer", email: "ananya.iyer@example.com", phone: "+91 98200 11223", address: "Pune, Maharashtra", city: "Pune", state: "Maharashtra", postalCode: "411001", idType: "Driving licence", idLastFour: "9017", preferences: "Quiet room", totalStays: 2, totalSpent: money(6098) },
  { id: "guest-003", name: "Rohan Kapoor", email: "rohan.kapoor@example.com", phone: "+91 99870 44556", address: "Bengaluru, Karnataka", city: "Bengaluru", state: "Karnataka", postalCode: "560001", idType: "Passport", idLastFour: "7734", preferences: "Vegetarian breakfast", totalStays: 1, totalSpent: money(41437) },
  { id: "guest-004", name: "Meera Nair", email: "meera.nair@example.com", phone: "+91 98450 77889", address: "Kochi, Kerala", city: "Kochi", state: "Kerala", postalCode: "682001", idType: "Passport", idLastFour: "1209", preferences: "Late checkout", totalStays: 3, totalSpent: money(6349) },
] as const;

export const seedStaff = [
  { id: "staff-001", name: "Meera Shah", email: "meera@rivrhotel.in", phone: "+91 98200 10101", department: "Management", role: "manager", shift: "09:00-18:00", status: "active", joinedAt: "2022-03-14" },
  { id: "staff-002", name: "Arjun Rao", email: "arjun@rivrhotel.in", phone: "+91 98200 10102", department: "Reception", role: "receptionist", shift: "07:00-16:00", status: "active", joinedAt: "2023-08-09" },
  { id: "staff-003", name: "Lakshmi Menon", email: "lakshmi@rivrhotel.in", phone: "+91 98200 10103", department: "Housekeeping", role: "housekeeping", shift: "08:00-17:00", status: "active", joinedAt: "2024-01-22" },
  { id: "staff-004", name: "Vikram Desai", email: "vikram@rivrhotel.in", phone: "+91 98200 10104", department: "Finance", role: "accountant", shift: "09:00-18:00", status: "on-leave", joinedAt: "2021-11-03" },
  { id: "staff-005", name: "Priya Singh", email: "priya@rivrhotel.in", phone: "+91 98200 10105", department: "Restaurant", role: "restaurant", shift: "12:00-21:00", status: "active", joinedAt: "2024-05-18" },
] as const;

export const seedReservations = [
  { id: "res-001", reference: "RIVR-2481", guestId: "guest-001", roomId: "room-204", checkIn: dateAt(1), checkOut: dateAt(4), adults: 2, children: 0, status: "confirmed", paymentStatus: "partial", roomCharges: money(14997), additionalCharges: money(0), discount: money(0), tax: money(1800), total: money(16797), paidAmount: money(8399), specialRequests: "High floor if possible", createdAt: iso(-4) },
  { id: "res-002", reference: "RIVR-2476", guestId: "guest-002", roomId: "room-102", checkIn: dateAt(-1), checkOut: dateAt(1), adults: 1, children: 0, status: "checked-in", paymentStatus: "paid", roomCharges: money(4998), additionalCharges: money(500), discount: money(0), tax: money(600), total: money(6098), paidAmount: money(6098), specialRequests: "", createdAt: iso(-3) },
  { id: "res-003", reference: "RIVR-2468", guestId: "guest-003", roomId: "room-301", checkIn: dateAt(5), checkOut: dateAt(8), adults: 2, children: 1, status: "confirmed", paymentStatus: "pending", roomCharges: money(38997), additionalCharges: money(0), discount: money(2000), tax: money(4440), total: money(41437), paidAmount: money(0), specialRequests: "Vegetarian breakfast", createdAt: iso(-2) },
  { id: "res-004", reference: "RIVR-2459", guestId: "guest-004", roomId: "room-303", checkIn: dateAt(0), checkOut: dateAt(1), adults: 2, children: 0, status: "checked-out", paymentStatus: "paid", roomCharges: money(4999), additionalCharges: money(750), discount: money(0), tax: money(600), total: money(6349), paidAmount: money(6349), specialRequests: "", createdAt: iso(-1) },
  { id: "res-005", reference: "RIVR-2490", guestId: "guest-002", roomId: "room-205", checkIn: dateAt(10), checkOut: dateAt(13), adults: 2, children: 2, status: "pending", paymentStatus: "pending", roomCharges: money(25497), additionalCharges: money(0), discount: money(0), tax: money(3060), total: money(28557), paidAmount: money(0), specialRequests: "Connecting room requested", createdAt: iso(-1) },
] as const;

export const seedPayments = [
  { id: "pay-001", reservationId: "res-001", amount: money(8399), method: "card", status: "completed", paidAt: iso(-2), note: "Deposit" },
  { id: "pay-002", reservationId: "res-002", amount: money(6098), method: "upi", status: "completed", paidAt: iso(-1), note: "Settled at front desk" },
  { id: "pay-003", reservationId: "res-004", amount: money(6349), method: "card", status: "completed", paidAt: iso(0), note: "Final settlement" },
] as const;

export const seedInvoices = [
  { id: "inv-001", number: "INV-2025-001", reservationId: "res-001", status: "partial", issuedAt: iso(-4), dueAmount: money(8398) },
  { id: "inv-002", number: "INV-2025-002", reservationId: "res-002", status: "paid", issuedAt: iso(-3), dueAmount: money(0) },
  { id: "inv-003", number: "INV-2025-003", reservationId: "res-004", status: "paid", issuedAt: iso(-1), dueAmount: money(0) },
] as const;

export const seedHousekeepingTasks = [
  { id: "hk-001", roomId: "room-303", assignedTo: "staff-003", status: "in-progress", priority: "high", issue: "Post-checkout deep clean", updatedAt: iso(0) },
  { id: "hk-002", roomId: "room-102", assignedTo: "staff-003", status: "inspected", priority: "normal", issue: "Daily service", updatedAt: iso(0) },
  { id: "hk-003", roomId: "room-205", assignedTo: null, status: "dirty", priority: "normal", issue: "Pre-arrival clean", updatedAt: iso(0) },
  { id: "hk-004", roomId: "room-101", assignedTo: "staff-003", status: "cleaned", priority: "low", issue: "Amenity refresh", updatedAt: iso(0) },
] as const;

export const seedAttendance = seedStaff.map((person, index) => ({
  id: `att-${index + 1}`,
  staffId: person.id,
  date: dateAt(0),
  status: (person.status === "on-leave" ? "leave" : "present") as "leave" | "present",
  clockIn: person.status === "on-leave" ? null : "08:57",
  clockOut: null,
}));

export const seedInventory = [
  { id: "stock-001", name: "Bath towels", category: "Linen", quantity: 86, unit: "pieces", purchasePrice: money(180), supplier: "Sahyadri Linen Co.", minimumStock: 40 },
  { id: "stock-002", name: "Shampoo bottles", category: "Toiletries", quantity: 24, unit: "boxes", purchasePrice: money(420), supplier: "Lotus Supply", minimumStock: 30 },
  { id: "stock-003", name: "Coffee beans", category: "Restaurant", quantity: 18, unit: "kg", purchasePrice: money(240), supplier: "Deccan Roasters", minimumStock: 10 },
  { id: "stock-004", name: "Bed sheets", category: "Linen", quantity: 60, unit: "pieces", purchasePrice: money(320), supplier: "Sahyadri Linen Co.", minimumStock: 30 },
] as const;

export const seedExpenses = [
  { id: "exp-001", category: "Utilities", description: "Monthly electricity", amount: money(18400), date: dateAt(-2), method: "bank-transfer", status: "approved" },
  { id: "exp-002", category: "Supplies", description: "Housekeeping replenishment", amount: money(6200), date: dateAt(-1), method: "card", status: "approved" },
  { id: "exp-003", category: "Maintenance", description: "Window repair estimate", amount: money(3800), date: dateAt(0), method: "bank-transfer", status: "pending" },
] as const;

export const seedRestaurantOrders = [
  { id: "ord-001", reservationId: "res-002", roomNumber: "102", guestName: "Ananya Iyer", items: "Breakfast for one", amount: money(240), status: "served", createdAt: iso(-1) },
  { id: "ord-002", reservationId: "res-001", roomNumber: "204", guestName: "Aarav Mehta", items: "Sparkling water, club sandwich", amount: money(460), status: "preparing", createdAt: iso(0) },
] as const;

export const seedActivities = [
  { id: "act-001", actor: "Arjun Rao", action: "Checked in guest", detail: "Ananya Iyer - Room 102", tone: "success", createdAt: iso(0, -2) },
  { id: "act-002", actor: "Meera Shah", action: "Approved expense", detail: "Housekeeping replenishment - INR 6,200", tone: "info", createdAt: iso(0, -4) },
  { id: "act-003", actor: "Lakshmi Menon", action: "Marked room cleaned", detail: "Room 101", tone: "success", createdAt: iso(-1) },
  { id: "act-004", actor: "System", action: "Low inventory alert", detail: "Shampoo bottles below minimum stock", tone: "warning", createdAt: iso(-1) },
] as const;
