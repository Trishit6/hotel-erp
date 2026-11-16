/**
 * One-off bulk demo data generator for a local MariaDB database.
 *
 * Run from the repo root:
 *   node apps/api/scripts/seed-bulk.cjs
 *
 * It is idempotent in the sense that it refuses to run twice: existing
 * `bulk-*` reservations abort the script unless the table has been reseeded.
 * It does not modify the tracked demo seed.
 */
const path = require("node:path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const TARGET_RESERVATIONS = Number(process.env.BULK_RESERVATIONS ?? 12000);
const TARGET_GUESTS = Number(process.env.BULK_GUESTS ?? 5000);
const BATCH = 500;

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Ananya", "Diya", "Aadhya", "Saanvi", "Pari", "Anika",
  "Navya", "Myra", "Sara", "Ira", "Rohan", "Karan", "Neha", "Pooja", "Ritu",
  "Siddharth", "Nikhil", "Rahul", "Amit", "Sanjay", "Priya", "Sneha", "Kavya",
  "Meera", "Riya", "Tanvi", "Dev", "Kabir", "Yash", "Aarohi", "Ishita", "Naina",
];
const LAST_NAMES = [
  "Mehta", "Sharma", "Iyer", "Nair", "Patel", "Shah", "Rao", "Reddy", "Kapoor",
  "Malhotra", "Bose", "Chatterjee", "Joshi", "Desai", "Kulkarni", "Menon",
  "Pillai", "Gupta", "Agarwal", "Singh", "Verma", "Yadav", "Mishra", "Chopra",
];
const CITIES = [
  ["Mumbai", "Maharashtra", "400001"], ["Pune", "Maharashtra", "411001"],
  ["Delhi", "Delhi", "110001"], ["Bengaluru", "Karnataka", "560001"],
  ["Chennai", "Tamil Nadu", "600001"], ["Hyderabad", "Telangana", "500001"],
  ["Kolkata", "West Bengal", "700001"], ["Ahmedabad", "Gujarat", "380001"],
  ["Jaipur", "Rajasthan", "302001"], ["Goa", "Goa", "403001"],
  ["Kochi", "Kerala", "682001"], ["Indore", "Madhya Pradesh", "452001"],
];
const ID_TYPES = ["Passport", "Aadhaar", "Driving Licence", "Voter ID"];
const PREFERENCES = [
  "High floor, quiet room", "Late check-in", "Extra pillows", "Vegetarian meals",
  "Airport pickup", "Sea-facing room", "Early breakfast", "Allergy-friendly linens",
  "Sparkling water", "No housekeeping before noon", "",
];
const METHODS = ["cash", "upi", "card", "bank-transfer", "online"];
const TONES = ["info", "success", "warning", "danger"];
const EXPENSE_CATEGORIES = [
  "Utilities", "Maintenance", "Supplies", "Marketing", "Payroll", "Transport",
  "Food & Beverage", "IT & Software", "Housekeeping", "Guest Relations",
];
const HK_TYPES = [
  "Post-checkout clean", "Daily refresh", "Deep clean", "Turndown service",
  "Maintenance follow-up", "Linen change", "Bathroom sanitisation",
];
const ACTIONS = [
  ["Created reservation", "info"], ["Confirmed reservation", "success"],
  ["Checked in guest", "success"], ["Checked out guest", "info"],
  ["Cancelled reservation", "warning"], ["Recorded payment", "success"],
  ["Approved expense", "success"], ["Updated room status", "info"],
  ["Restaurant order served", "success"], ["No-show recorded", "danger"],
  ["Refund processed", "warning"], ["Inventory adjusted", "info"],
];

const now = new Date();
const today = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

function rand(n) {
  return Math.floor(Math.random() * n);
}
function pick(list) {
  return list[rand(list.length)];
}
function chance(probability) {
  return Math.random() < probability;
}
function pad(value, length = 5) {
  return String(value).padStart(length, "0");
}
function addDays(date, days) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function dateTime(date, hour = 12, minute = 0) {
  return `${date} ${pad(hour, 2)}:${pad(minute, 2)}:00`;
}
function randomDateTimeBetween(start, end) {
  const a = new Date(start + "T00:00:00Z").getTime();
  const b = new Date(end + "T00:00:00Z").getTime();
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  const t = from + Math.random() * Math.max(1, to - from);
  return new Date(t).toISOString().slice(0, 19).replace("T", " ");
}
function money(value) {
  return (Math.round(value * 100) / 100).toFixed(2);
}
function randomPhone(index) {
  return `+91 ${String(70000 + (index % 29999)).padStart(5, "0")} ${String(10000 + (index % 89999)).padStart(5, "0")}`;
}
function todayIsh(date) {
  return date < today ? "past" : date === today ? "today" : "future";
}

async function insertRows(connection, table, columns, rows) {
  if (!rows.length) return;
  for (let offset = 0; offset < rows.length; offset += BATCH) {
    const slice = rows.slice(offset, offset + BATCH);
    const placeholders = slice.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    const values = slice.flat();
    await connection.query(
      `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(",")}) VALUES ${placeholders}`,
      values,
    );
  }
  console.log(`  ${table}: +${rows.length}`);
}

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "rivr_hotel",
    timezone: "Z",
  });

  const [existing] = await connection.query(
    "SELECT COUNT(*) AS c FROM reservations WHERE id LIKE 'bulk-res-%'",
  );
  if (existing[0].c > 0) {
    console.log(
      `Bulk data already present (${existing[0].c} bulk reservations). Reseed the demo database first to start over.`,
    );
    await connection.end();
    return;
  }

  console.log(`Generating bulk data for ${process.env.DB_NAME} on port ${process.env.DB_PORT}...`);
  console.log(`  target guests: ${TARGET_GUESTS}, target reservations: ${TARGET_RESERVATIONS}`);

  const [rooms] = await connection.query(
    "SELECT r.id, r.number, r.type_id, rt.rate FROM rooms r JOIN room_types rt ON rt.id = r.type_id ORDER BY r.id",
  );
  const [baseGuests] = await connection.query("SELECT id, name, email FROM guests ORDER BY id");
  const [staff] = await connection.query("SELECT id, name, department FROM staff ORDER BY id");
  const [users] = await connection.query("SELECT id, name, role FROM users ORDER BY id");
  const [menu] = await connection.query(
    "SELECT id, name, price FROM restaurant_menu_items ORDER BY id",
  );
  const [inventory] = await connection.query("SELECT id, name FROM inventory ORDER BY id");
  const [settings] = await connection.query("SELECT tax_rate_bps FROM system_settings LIMIT 1");

  if (!rooms.length || !staff.length || !users.length || !menu.length || !inventory.length) {
    throw new Error("Reference data is missing. Run `pnpm db:seed` first.");
  }

  const taxRate = (settings[0]?.tax_rate_bps ?? 1200) / 10000;
  const frontDeskUsers = users.filter((u) =>
    ["receptionist", "manager", "admin", "super-admin", "accountant"].includes(u.role),
  );
  const housekeepingUsers = users.filter((u) =>
    ["housekeeping", "manager", "admin", "super-admin"].includes(u.role),
  );
  const managers = users.filter((u) => ["manager", "admin", "super-admin"].includes(u.role));
  const frontDesk = frontDeskUsers.length ? frontDeskUsers : users;
  const hkUsers = housekeepingUsers.length ? housekeepingUsers : users;
  const managerPool = managers.length ? managers : users;
  const housekeepingStaff = staff.filter((s) => s.department === "Housekeeping");
  const activeStaff = housekeepingStaff.length ? housekeepingStaff : staff;
  const guestPool = baseGuests.slice();
  const guestIds = guestPool.map((g) => g.id);

  // ---- Guests -------------------------------------------------------------
  const guestStart = addDays(today, -900);
  const guests = [];
  for (let i = 1; i <= TARGET_GUESTS; i += 1) {
    const [city, state, postal] = pick(CITIES);
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const id = `bulk-guest-${pad(i)}`;
    const createdAt = randomDateTimeBetween(guestStart, today);
    guests.push([
      id,
      `${firstName} ${lastName}`,
      `bulk.guest${pad(i)}@example.com`,
      randomPhone(i),
      `${10 + (i % 80)} ${pick(["Marine Drive", "MG Road", "Park Street", "Linking Road", "Brigade Road", "Residency Road"])}, ${city}`,
      city,
      state,
      postal,
      pick(ID_TYPES),
      pad(1000 + (i % 9000), 4),
      pick(PREFERENCES),
      0,
      "0.00",
      createdAt,
      createdAt,
    ]);
    guestPool.push({ id, name: `${firstName} ${lastName}`, email: `bulk.guest${pad(i)}@example.com` });
    guestIds.push(id);
  }
  await insertRows(
    connection,
    "guests",
    [
      "id", "name", "email", "phone", "address", "city", "state", "postal_code",
      "id_type", "id_last_four", "preferences", "total_stays", "total_spent",
      "created_at", "updated_at",
    ],
    guests,
  );

  // ---- Reservations (sequential per room so dates never overlap) ----------
  const guestById = new Map(guestPool.map((g) => [g.id, g]));
  const reservations = [];
  const timelineStart = addDays(today, -760);
  const timelineEnd = addDays(today, 365);
  const roomCursor = new Map(rooms.map((room) => [room.id, timelineStart]));
  const nightsOptions = [1, 2, 2, 3, 3, 3, 4, 4, 5];
  const gapOptions = [0, 0, 1, 1, 2];
  let rid = 0;

  outer: while (rid < TARGET_RESERVATIONS) {
    let createdThisRound = 0;
    for (const room of rooms) {
      if (rid >= TARGET_RESERVATIONS) break outer;
      let checkIn = roomCursor.get(room.id);
      if (checkIn > timelineEnd) continue;
      const nights = pick(nightsOptions);
      const checkOut = addDays(checkIn, nights);
      const guest = guestPool[rid % guestPool.length];
      const rate = Number(room.rate);
      const roomCharges = rate * nights;
      const additional = chance(0.28) ? Math.round(Math.random() * 4500) : 0;
      const discount = chance(0.18) ? Math.round(roomCharges * (Math.random() * 0.12)) : 0;
      const taxable = roomCharges + additional - discount;
      const tax = Math.round(taxable * taxRate * 100) / 100;
      const total = Math.round((taxable + tax) * 100) / 100;

      const period = todayIsh(checkIn);
      let status;
      if (period === "past") {
        status = chance(0.9) ? "checked-out" : chance(0.7) ? "cancelled" : "no-show";
      } else if (period === "today") {
        status = chance(0.9) ? "checked-in" : "confirmed";
      } else {
        status = chance(0.9) ? "confirmed" : "pending";
      }

      let paidAmount = 0;
      let paymentStatus = "pending";
      if (status === "checked-out" || status === "checked-in") {
        if (chance(0.6)) {
          paidAmount = total;
          paymentStatus = "paid";
        } else {
          paidAmount = Math.round(total * (0.35 + Math.random() * 0.4) * 100) / 100;
          paymentStatus = "partial";
        }
      } else if (status === "cancelled" || status === "no-show") {
        if (chance(0.5)) {
          paidAmount = Math.round(total * (0.2 + Math.random() * 0.3) * 100) / 100;
          paymentStatus = "refunded";
        }
      } else if (status === "confirmed") {
        if (chance(0.45)) {
          paidAmount = Math.round(total * (0.2 + Math.random() * 0.3) * 100) / 100;
          paymentStatus = "partial";
        }
      } else if (chance(0.15)) {
        paidAmount = Math.round(total * 0.2 * 100) / 100;
        paymentStatus = "partial";
      }

      const createdDate = randomDateTimeBetween(
        addDays(checkIn, -Math.max(1, 5 + rand(55))),
        checkIn <= today ? checkIn : today,
      );
      const updatedDate =
        status === "checked-out"
          ? dateTime(checkOut, 11, 30)
          : status === "checked-in"
            ? dateTime(checkIn, 14, 10)
            : createdDate;
      const createdAt = createdDate;
      const checkedInAt =
        status === "checked-in" || status === "checked-out" ? dateTime(checkIn, 14, rand(50)) : null;
      const checkedOutAt = status === "checked-out" ? dateTime(checkOut, 11, rand(50)) : null;
      const cancelledAt =
        status === "cancelled" || status === "no-show"
          ? randomDateTimeBetween(addDays(checkIn, -3), addDays(checkIn, 1))
          : null;
      const holdExpiresAt =
        status === "pending" && checkIn > today
          ? randomDateTimeBetween(today, addDays(today, 2))
          : null;

      rid += 1;
      reservations.push({
        id: `bulk-res-${pad(rid)}`,
        reference: `RIVR-B${pad(rid)}`,
        guest_id: guest.id,
        room_id: room.id,
        room_number: room.number,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        adults: 1 + rand(3),
        children: chance(0.2) ? rand(3) : 0,
        status,
        payment_status: paymentStatus,
        room_charges: money(roomCharges),
        additional_charges: money(additional),
        discount: money(discount),
        tax: money(tax),
        total: money(total),
        paid_amount: money(paidAmount),
        special_requests: chance(0.35) ? pick(PREFERENCES) : "",
        checked_in_at: checkedInAt,
        checked_out_at: checkedOutAt,
        cancelled_at: cancelledAt,
        created_at: createdAt,
        updated_at: updatedDate,
        hold_expires_at: holdExpiresAt,
      });

      // Advance the room timeline with a small turnover gap.
      roomCursor.set(room.id, addDays(checkOut, pick(gapOptions)));
      createdThisRound += 1;
    }
    if (createdThisRound === 0) break;
  }

  await insertRows(
    connection,
    "reservations",
    [
      "id", "reference", "guest_id", "room_id", "check_in", "check_out", "adults",
      "children", "status", "payment_status", "room_charges", "additional_charges",
      "discount", "tax", "total", "paid_amount", "special_requests",
      "checked_in_at", "checked_out_at", "cancelled_at", "created_at", "updated_at",
      "hold_expires_at",
    ],
    reservations.map((r) => [
      r.id, r.reference, r.guest_id, r.room_id, r.check_in, r.check_out, r.adults,
      r.children, r.status, r.payment_status, r.room_charges, r.additional_charges,
      r.discount, r.tax, r.total, r.paid_amount, r.special_requests,
      r.checked_in_at, r.checked_out_at, r.cancelled_at, r.created_at, r.updated_at,
      r.hold_expires_at,
    ]),
  );

  // ---- Reservation guests -------------------------------------------------
  const reservationGuests = [];
  for (let i = 0; i < reservations.length; i += 1) {
    const reservation = reservations[i];
    const count = 1 + rand(3);
    const used = new Set([reservation.guest_id]);
    reservationGuests.push([
      `bulk-rg-${pad(i + 1)}-1`,
      reservation.id,
      reservation.guest_id,
      1,
      reservation.created_at,
    ]);
    for (let extra = 1; extra < count; extra += 1) {
      let guestId = guestIds[rand(guestIds.length)];
      let guard = 0;
      while (used.has(guestId) && guard < 10) {
        guestId = guestIds[rand(guestIds.length)];
        guard += 1;
      }
      if (used.has(guestId)) continue;
      used.add(guestId);
      reservationGuests.push([
        `bulk-rg-${pad(i + 1)}-${extra + 1}`,
        reservation.id,
        guestId,
        0,
        reservation.created_at,
      ]);
    }
  }
  await insertRows(
    connection,
    "reservation_guests",
    ["id", "reservation_id", "guest_id", "is_primary", "created_at"],
    reservationGuests,
  );

  // ---- Reservation status history ----------------------------------------
  const history = [];
  let historyId = 0;
  for (const r of reservations) {
    const changedBy = pick(frontDesk).id;
    historyId += 1;
    history.push([
      `bulk-reshist-${pad(historyId)}`,
      r.id,
      null,
      r.status === "pending" ? "pending" : "confirmed",
      "Reservation created",
      changedBy,
      r.created_at,
    ]);
    if (["checked-in", "checked-out"].includes(r.status)) {
      historyId += 1;
      history.push([
        `bulk-reshist-${pad(historyId)}`,
        r.id,
        "confirmed",
        "checked-in",
        "Guest checked in",
        changedBy,
        r.checked_in_at,
      ]);
    }
    if (r.status === "checked-out") {
      historyId += 1;
      history.push([
        `bulk-reshist-${pad(historyId)}`,
        r.id,
        "checked-in",
        "checked-out",
        "Guest checked out",
        changedBy,
        r.checked_out_at,
      ]);
    } else if (r.status === "cancelled" || r.status === "no-show") {
      historyId += 1;
      history.push([
        `bulk-reshist-${pad(historyId)}`,
        r.id,
        "confirmed",
        r.status,
        r.status === "no-show" ? "Guest did not arrive" : "Reservation cancelled",
        changedBy,
        r.cancelled_at,
      ]);
    }
  }
  await insertRows(
    connection,
    "reservation_status_history",
    ["id", "reservation_id", "from_status", "to_status", "note", "changed_by", "created_at"],
    history,
  );

  // ---- Check-ins / check-outs --------------------------------------------
  const checkIns = [];
  const checkOuts = [];
  for (const r of reservations) {
    if (r.status === "checked-in" || r.status === "checked-out") {
      checkIns.push([
        `bulk-ci-${r.id.replace("bulk-res-", "")}`,
        r.id,
        r.room_id,
        r.checked_in_at,
        pick(frontDesk).id,
        "Identity verified at the front desk.",
      ]);
    }
    if (r.status === "checked-out") {
      checkOuts.push([
        `bulk-co-${r.id.replace("bulk-res-", "")}`,
        r.id,
        r.room_id,
        r.checked_out_at,
        pick(frontDesk).id,
        "Room released to housekeeping.",
      ]);
    }
  }
  await insertRows(
    connection,
    "check_ins",
    ["id", "reservation_id", "room_id", "checked_in_at", "checked_in_by", "notes"],
    checkIns,
  );
  await insertRows(
    connection,
    "check_outs",
    ["id", "reservation_id", "room_id", "checked_out_at", "checked_out_by", "notes"],
    checkOuts,
  );

  // ---- Payments -----------------------------------------------------------
  const payments = [];
  const refundCandidates = [];
  let paymentId = 0;
  for (const r of reservations) {
    const paid = Number(r.paid_amount);
    if (paid <= 0) continue;
    const splits = paid > 5000 && chance(0.45) ? 2 : 1;
    const firstAmount = splits === 1 ? paid : Math.round(paid * (0.4 + Math.random() * 0.2) * 100) / 100;
    const amounts = splits === 1 ? [paid] : [firstAmount, Math.round((paid - firstAmount) * 100) / 100];
    for (let index = 0; index < amounts.length; index += 1) {
      paymentId += 1;
      const method = pick(METHODS);
      const paidAt =
        index === 0
          ? randomDateTimeBetween(addDays(r.check_in, -Math.max(1, 3 + rand(30))), r.check_in <= today ? r.check_in : today)
          : randomDateTimeBetween(r.check_in, r.created_at.slice(0, 10) < today ? today : r.created_at.slice(0, 10));
      const status = r.payment_status === "refunded" && index === 0 ? "refunded" : "completed";
      const id = `bulk-pay-${pad(paymentId)}`;
      payments.push([
        id,
        r.id,
        money(amounts[index]),
        method,
        status,
        paidAt,
        index === 0 ? "Payment received" : "Balance payment received",
        pick(frontDesk).id,
      ]);
      if (status === "refunded") {
        refundCandidates.push({ paymentId: id, amount: Number(amounts[index]), createdAt: paidAt });
      }
    }
  }
  await insertRows(
    connection,
    "payments",
    ["id", "reservation_id", "amount", "method", "status", "paid_at", "note", "recorded_by"],
    payments,
  );

  // ---- Invoices + items ---------------------------------------------------
  const invoices = [];
  const invoiceItems = [];
  let invoiceId = 0;
  for (const r of reservations) {
    if (r.status === "pending" && chance(0.7)) continue;
    if (chance(0.12)) continue;
    invoiceId += 1;
    const id = `bulk-inv-${pad(invoiceId)}`;
    const due = Math.max(0, Number(r.total) - Number(r.paid_amount));
    invoices.push([
      id,
      `INV-B-${pad(invoiceId)}`,
      r.id,
      r.payment_status,
      r.created_at,
      money(due),
    ]);
    invoiceItems.push([
      `bulk-invitem-${pad(invoiceId)}-1`,
      id,
      `${r.nights} night(s) room charge`,
      r.nights,
      money(Number(r.room_charges) / r.nights),
      r.room_charges,
      r.created_at,
    ]);
    if (Number(r.additional_charges) > 0) {
      invoiceItems.push([
        `bulk-invitem-${pad(invoiceId)}-2`,
        id,
        "Additional services",
        1,
        r.additional_charges,
        r.additional_charges,
        r.created_at,
      ]);
    }
    if (Number(r.tax) > 0) {
      invoiceItems.push([
        `bulk-invitem-${pad(invoiceId)}-3`,
        id,
        "Taxes",
        1,
        r.tax,
        r.tax,
        r.created_at,
      ]);
    }
  }
  await insertRows(
    connection,
    "invoices",
    ["id", "number", "reservation_id", "status", "issued_at", "due_amount"],
    invoices,
  );
  await insertRows(
    connection,
    "invoice_items",
    ["id", "invoice_id", "description", "quantity", "unit_price", "amount", "created_at"],
    invoiceItems,
  );

  // ---- Restaurant orders + items -----------------------------------------
  const orders = [];
  const orderItems = [];
  let orderId = 0;
  for (let i = 0; i < 6000; i += 1) {
    const r = pick(reservations);
    if (r.status === "cancelled" || r.status === "no-show") continue;
    orderId += 1;
    const id = `bulk-ord-${pad(orderId)}`;
    const itemCount = 1 + rand(3);
    const chosen = [];
    let amount = 0;
    const created = chance(0.8)
      ? randomDateTimeBetween(r.check_in, r.check_out > today ? today : r.check_out)
      : randomDateTimeBetween(r.check_in, r.check_in);
    for (let j = 0; j < itemCount; j += 1) {
      const item = pick(menu);
      const quantity = 1 + rand(3);
      const line = Number(item.price) * quantity;
      amount += line;
      chosen.push(item.name);
      orderItems.push([
        `bulk-orditem-${pad(orderId)}-${j + 1}`,
        id,
        item.id,
        item.name,
        quantity,
        money(Number(item.price)),
        money(line),
      ]);
    }
    let status;
    if (r.check_in > today) status = "new";
    else if (r.check_out < today) status = chance(0.85) ? "served" : chance(0.5) ? "cancelled" : "preparing";
    else status = pick(["preparing", "served", "new"]);
    orders.push([
      id,
      guestById.get(r.guest_id)?.name ?? "Guest",
      r.room_number,
      r.id,
      chosen.join(", ").slice(0, 500),
      money(amount),
      status,
      created,
      created,
    ]);
  }
  await insertRows(
    connection,
    "restaurant_orders",
    ["id", "guest_name", "room_number", "reservation_id", "items", "amount", "status", "created_at", "updated_at"],
    orders,
  );
  await insertRows(
    connection,
    "restaurant_order_items",
    ["id", "order_id", "menu_item_id", "name", "quantity", "unit_price", "amount"],
    orderItems,
  );

  // ---- Housekeeping tasks + history --------------------------------------
  const tasks = [];
  const taskHistory = [];
  for (let i = 1; i <= 4000; i += 1) {
    const room = pick(rooms);
    const assignee = pick(activeStaff);
    const createdAt = randomDateTimeBetween(addDays(today, -540), today);
    const dueDate = addDays(createdAt.slice(0, 10), 1 + rand(3));
    const status = pick(["dirty", "assigned", "in-progress", "cleaned", "inspected", "inspected", "cleaned"]);
    const id = `bulk-hk-${pad(i)}`;
    tasks.push([
      id,
      room.id,
      assignee.id,
      status,
      pick(["low", "normal", "normal", "high"]),
      pick(HK_TYPES),
      createdAt,
      createdAt,
      pick(HK_TYPES),
      dueDate,
      status === "inspected" ? "Inspected and released." : status === "cleaned" ? "Cleaned, awaiting inspection." : "",
    ]);
    taskHistory.push([
      `bulk-hkhist-${pad(i)}-1`,
      id,
      "dirty",
      "Task created",
      pick(hkUsers).id,
      createdAt,
    ]);
    if (status !== "dirty") {
      taskHistory.push([
        `bulk-hkhist-${pad(i)}-2`,
        id,
        status,
        `Status moved to ${status}`,
        pick(hkUsers).id,
        createdAt,
      ]);
    }
  }
  await insertRows(
    connection,
    "housekeeping_tasks",
    ["id", "room_id", "assigned_to", "status", "priority", "issue", "created_at", "updated_at", "task_type", "due_date", "completion_notes"],
    tasks,
  );
  await insertRows(
    connection,
    "housekeeping_task_history",
    ["id", "task_id", "status", "note", "changed_by", "created_at"],
    taskHistory,
  );

  // ---- Activity logs ------------------------------------------------------
  const activities = [];
  for (let i = 1; i <= 3000; i += 1) {
    const [action, tone] = pick(ACTIONS);
    const actor = pick(staff).name;
    activities.push([
      `bulk-act-${pad(i)}`,
      actor,
      action,
      `${pick(["Room", "Reservation", "Guest", "Invoice", "Order"])} ${pad(100 + rand(900), 3)}`,
      tone,
      chance(0.8) ? pick(users).id : null,
      randomDateTimeBetween(addDays(today, -540), today),
    ]);
  }
  await insertRows(
    connection,
    "activity_logs",
    ["id", "actor", "action", "detail", "tone", "user_id", "created_at"],
    activities,
  );

  // ---- Notifications ------------------------------------------------------
  const notifications = [];
  for (let i = 1; i <= 1000; i += 1) {
    const createdAt = randomDateTimeBetween(addDays(today, -120), today);
    notifications.push([
      `bulk-notif-${pad(i)}`,
      pick(users).id,
      pick(["New reservation", "Payment received", "Housekeeping update", "Low inventory", "Expense approval", "Guest message"]),
      pick([
        "A new booking has been confirmed.",
        "A payment was recorded against a reservation.",
        "A room was released after checkout.",
        "An inventory item is below its minimum stock.",
        "An expense is awaiting approval.",
      ]),
      chance(0.55) ? randomDateTimeBetween(createdAt.slice(0, 10), today) : null,
      createdAt,
    ]);
  }
  await insertRows(
    connection,
    "notifications",
    ["id", "user_id", "title", "body", "read_at", "created_at"],
    notifications,
  );

  // ---- Inventory transactions --------------------------------------------
  const inventoryTransactions = [];
  for (let i = 1; i <= 4000; i += 1) {
    const item = pick(inventory);
    const type = pick(["in", "out", "adjustment"]);
    inventoryTransactions.push([
      `bulk-invtxn-${pad(i)}`,
      item.id,
      type,
      1 + rand(30),
      type === "in" ? "Stock received from supplier" : type === "out" ? "Issued to housekeeping" : "Physical count adjustment",
      pick(hkUsers).id,
      randomDateTimeBetween(addDays(today, -540), today),
    ]);
  }
  await insertRows(
    connection,
    "inventory_transactions",
    ["id", "inventory_id", "type", "quantity", "note", "created_by", "created_at"],
    inventoryTransactions,
  );

  // ---- Refunds ------------------------------------------------------------
  const refunds = [];
  for (let i = 0; i < 300 && refundCandidates.length; i += 1) {
    const candidate = pick(refundCandidates);
    const status = pick(["processed", "processed", "pending", "approved", "rejected"]);
    refunds.push([
      `bulk-refund-${pad(i + 1)}`,
      candidate.paymentId,
      money(Math.min(Number(candidate.amount), Number(candidate.amount) * (0.3 + Math.random() * 0.7))),
      pick(["Guest cancelled the stay", "Room issue", "Overpayment", "Service recovery"]),
      status,
      status === "processed" ? pick(frontDesk).id : null,
      status === "processed" ? randomDateTimeBetween(candidate.createdAt.slice(0, 10), today) : null,
      candidate.createdAt,
    ]);
  }
  await insertRows(
    connection,
    "refunds",
    ["id", "payment_id", "amount", "reason", "status", "processed_by", "processed_at", "created_at"],
    refunds,
  );

  // ---- Leave requests -----------------------------------------------------
  const leaveRequests = [];
  for (let i = 1; i <= 200; i += 1) {
    const start = addDays(today, -180 + rand(330));
    const status = pick(["pending", "approved", "approved", "rejected"]);
    const createdAt = randomDateTimeBetween(addDays(start, -10), start);
    leaveRequests.push([
      `bulk-leave-${pad(i)}`,
      pick(staff).id,
      start,
      addDays(start, rand(4)),
      pick(["casual", "sick", "earned", "unpaid"]),
      status,
      pick(["Family function", "Medical appointment", "Personal leave", "Travel plans"]),
      status === "pending" ? null : pick(managerPool).id,
      createdAt,
      createdAt,
    ]);
  }
  await insertRows(
    connection,
    "leave_requests",
    ["id", "staff_id", "start_date", "end_date", "type", "status", "reason", "decided_by", "created_at", "updated_at"],
    leaveRequests,
  );

  // ---- Attendance (last ~23 months, excluding existing rows) -------------
  const attendance = [];
  const attendanceStart = addDays(today, -700);
  for (const member of staff) {
    for (let cursor = attendanceStart; cursor <= yesterday(today); cursor = addDays(cursor, 1)) {
      const status = chance(0.82) ? "present" : chance(0.5) ? "late" : chance(0.5) ? "leave" : "absent";
      attendance.push([
        `bulk-att-${member.id}-${cursor}`,
        member.id,
        cursor,
        status,
        status === "present" || status === "late" ? `0${7 + rand(3)}:${pad(rand(60), 2)}` : null,
        status === "present" || status === "late" ? `1${7 + rand(4)}:${pad(rand(60), 2)}` : null,
        `${cursor} 09:00:00`,
        `${cursor} 18:00:00`,
      ]);
    }
  }
  // INSERT IGNORE keeps the unique (staff_id, date) rows already created by the demo seed.
  for (let offset = 0; offset < attendance.length; offset += 1000) {
    const slice = attendance.slice(offset, offset + 1000);
    const placeholders = slice.map(() => "(?,?,?,?,?,?,?,?)").join(",");
    await connection.query(
      "INSERT IGNORE INTO attendance (id, staff_id, date, status, clock_in, clock_out, created_at, updated_at) VALUES " +
        placeholders,
      slice.flat(),
    );
  }
  console.log(`  attendance: +${attendance.length} (ignored duplicates)`);

  // ---- Expenses -----------------------------------------------------------
  const expenses = [];
  for (let i = 1; i <= 2000; i += 1) {
    const date = addDays(today, -540 + rand(540));
    const status = pick(["pending", "approved", "approved", "approved", "rejected"]);
    const createdAt = randomDateTimeBetween(date, date);
    expenses.push([
      `bulk-exp-${pad(i)}`,
      pick(EXPENSE_CATEGORIES),
      pick([
        "Monthly electricity", "Plumbing repair", "Linen replenishment", "Digital campaign",
        "Staff transport", "Kitchen supplies", "Software subscription", "Deep-clean service",
      ]),
      money(500 + Math.random() * 49500),
      pick(METHODS),
      date,
      status,
      pick(users).id,
      status === "approved" ? pick(managerPool).id : null,
      createdAt,
      createdAt,
    ]);
  }
  await insertRows(
    connection,
    "expenses",
    ["id", "category", "description", "amount", "method", "date", "status", "submitted_by", "approved_by", "created_at", "updated_at"],
    expenses,
  );

  // ---- Aggregates + room occupancy ---------------------------------------
  await connection.query(
    `UPDATE guests g
     LEFT JOIN (
       SELECT guest_id, COUNT(*) AS stays, SUM(paid_amount) AS spent
       FROM reservations
       WHERE status IN ('checked-in', 'checked-out', 'confirmed')
       GROUP BY guest_id
     ) x ON x.guest_id = g.id
     SET g.total_stays = COALESCE(x.stays, 0), g.total_spent = COALESCE(x.spent, 0)`,
  );
  await connection.query(
    `UPDATE rooms r
     SET r.status = 'occupied'
     WHERE EXISTS (
       SELECT 1 FROM reservations res
       WHERE res.room_id = r.id AND res.status = 'checked-in'
     )`,
  );

  const [final] = await connection.query(
    "SELECT (SELECT COUNT(*) FROM reservations) AS reservations, (SELECT COUNT(*) FROM guests) AS guests, (SELECT COUNT(*) FROM payments) AS payments, (SELECT COUNT(*) FROM invoices) AS invoices",
  );
  console.log("Done. Totals:", final[0]);
  await connection.end();
})().catch(async (error) => {
  console.error("Bulk seed failed:", error);
  process.exit(1);
});

function yesterday(date) {
  return addDays(date, -1);
}
