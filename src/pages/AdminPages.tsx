import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Download,
  FileDown,
  Filter,
  Home,
  Hotel,
  Loader2,
  Mail,
  Package,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  UsersRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  Card,
  EmptyState,
  MetricCard,
  Money,
  RoomVisual,
  SectionEyebrow,
  StatusBadge,
} from "../components/hotel/HotelUi";
import {
  calculateNights,
  dateAt,
  formatCurrency,
  formatDate,
  formatDateTime,
  type DashboardSummary,
  type Department,
  type Expense,
  type Guest,
  type HousekeepingTask,
  type PaymentMethod,
  type ReservationStatus,
  type Room,
  type RoomStatus,
  type RoomType,
  type StaffMember,
  type StaffRole,
  type UserRole,
} from "../lib/hotel-data";
import {
  useHotel,
  type ExpenseInput,
  type GuestInput,
  type ReservationInput,
  type RoomTypeInput,
} from "../lib/hotel-store";
import { ThemeToggle } from "../components/hotel/ThemeToggle";

const roleLabels: Record<UserRole, string> = {
  "super-admin": "Super Admin",
  admin: "Administrator",
  manager: "Hotel Manager",
  receptionist: "Receptionist",
  housekeeping: "Housekeeping",
  accountant: "Accountant",
  restaurant: "Restaurant Staff",
  staff: "Staff",
  customer: "Customer",
};
const today = dateAt(0);
function salutation() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminIndexPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/dashboard" });
  }, [navigate]);
  return null;
}

export function AdminDashboardPage() {
  const { role } = useHotel();
  if (role === "staff") return <StaffWorkspaceNotice />;
  if (role === "housekeeping") return <HousekeepingDashboard />;
  if (role === "accountant") return <AccountantDashboard />;
  if (role === "receptionist") return <ReceptionistDashboard />;
  if (role === "restaurant") return <RestaurantDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  return <ExecutiveDashboard />;
}

function StaffWorkspaceNotice() {
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--info-soft)] text-[var(--info)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--ink)]">
          Your staff workspace
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          The financial overview is reserved for roles with reporting
          permission. Your own dashboard shows the operational information you
          can act on.
        </p>
        <Link
          to="/staff/dashboard"
          className="mt-5 inline-flex rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--on-primary)]"
        >
          Open your dashboard
        </Link>
      </div>
    </div>
  );
}

function ExecutiveDashboard() {
  const {
    rooms,
    reservations,
    tasks,
    activities,
    dashboard,
    actorName,
    guests,
    getGuest,
    getRoom,
    getRoomType,
    staff,
    can,
  } = useHotel();
  const [revenueView, setRevenueView] = useState<"monthly" | "yearly">("monthly");
  const summary = dashboard;
  const occupied = summary?.rooms.occupied ?? rooms.filter((room) => room.status === "occupied").length;
  const available = summary?.rooms.available ?? rooms.filter((room) => room.status === "available").length;
  const totalRooms = summary?.rooms.total ?? rooms.length;
  const reserved = summary?.rooms.reserved ?? rooms.filter((room) => room.status === "reserved").length;
  const cleaning = summary?.rooms.cleaning ?? rooms.filter((room) => room.status === "cleaning").length;
  const offline = summary?.rooms.offline ?? rooms.filter((room) => ["maintenance", "out-of-order"].includes(room.status)).length;
  const arrivals = summary?.reservations.arrivals ?? reservations.filter((item) => item.checkIn === today && ["confirmed", "pending"].includes(item.status)).length;
  const departures = summary?.reservations.departures ?? reservations.filter((item) => item.checkOut === today && item.status === "checked-in").length;
  const occupancy = summary?.rooms.occupancy ?? (totalRooms ? Math.round((occupied / totalRooms) * 100) : 0);
  const revenueSeries = summary?.revenueSeries ?? [];
  const yearlySeries = useMemo(() => {
    const byYear = new Map<
      string,
      { month: string; label: string; revenue: number; bookings: number }
    >();
    for (const point of revenueSeries) {
      const year = point.month.slice(0, 4);
      const current = byYear.get(year) ?? {
        month: year,
        label: year,
        revenue: 0,
        bookings: 0,
      };
      current.revenue += point.revenue;
      current.bookings += point.bookings;
      byYear.set(year, current);
    }
    return [...byYear.values()];
  }, [revenueSeries]);
  const chartSeries = revenueView === "monthly" ? revenueSeries : yearlySeries;
  const currentMonthRevenue =
    revenueSeries[revenueSeries.length - 1]?.revenue ?? 0;
  const maxRevenue = Math.max(1, ...chartSeries.map((point) => point.revenue));
  const totalReservations = summary?.reservations.total ?? reservations.length;
  const pendingReservations = summary?.reservations.pending ?? reservations.filter((item) => item.status === "pending").length;
  const outstanding = summary?.reservations.outstanding ?? reservations.reduce((sum, item) => sum + item.total - item.paidAmount, 0);
  const openTasks = summary?.housekeeping.open ?? tasks.filter((task) => !["cleaned", "inspected"].includes(task.status)).length;
  const recentActivities = summary?.activities ?? activities;
  const offlineCount = Math.max(0, totalRooms - occupied - available - reserved - cleaning);
  const activeStaff = staff.filter((person) => person.status === "active").length;
  const onLeave = staff.filter((person) => person.status === "on-leave").length;
  const lowStock = summary?.inventory.lowStock ?? 0;
  return (
    <AdminPageShell
      eyebrow="Today at RIVR"
      title={`${salutation()}, ${actorName.split(" ")[0] || "team"}.`}
      description="Here’s what’s happening across the property today."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total rooms"
          value={String(totalRooms)}
          detail={`${offline} offline`}
          icon={BedDouble}
        />
        <MetricCard
          label="Available rooms"
          value={String(available)}
          detail="Ready to sell now"
          icon={Home}
          tone="blue"
        />
        <MetricCard
          label="Occupied rooms"
          value={`${occupied}`}
          detail={`${occupancy}% occupancy`}
          icon={Hotel}
          tone="gold"
        />
        <MetricCard
          label="Today's arrivals"
          value={String(arrivals)}
          detail={`${departures} departures`}
          icon={CalendarCheck2}
          tone="rose"
        />
        <MetricCard
          label="Total reservations"
          value={String(totalReservations)}
          detail={`${pendingReservations} pending review`}
          icon={ClipboardCheck}
        />
        <MetricCard
          label="Guest profiles"
          value={String(summary?.guests.total ?? guests.length)}
          detail={`${summary?.guests.returning ?? 0} returning guests`}
          icon={UsersRound}
          />
        <MetricCard
          label="Revenue this month"
          value={formatCurrency(currentMonthRevenue)}
          detail="From non-cancelled stays"
          icon={IndianRupee}
          tone="blue"
        />
        <MetricCard
          label="Pending payments"
          value={formatCurrency(outstanding)}
          detail="Outstanding balance"
          icon={WalletCards}
          tone="gold"
        />
        <MetricCard
          label="Rooms to clean"
          value={String(openTasks)}
          detail="Housekeeping queue"
          icon={Clock3}
          tone="rose"
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickAction
          to="/admin/front-desk"
          label="Open front desk"
          detail="Arrivals, departures and guest requests"
          icon={Hotel}
          tone="violet"
        />
        <QuickAction
          to="/admin/reservations"
          label="New reservation"
          detail="Create or adjust a booking"
          icon={CalendarCheck2}
          tone="blue"
        />
        <QuickAction
          to="/admin/housekeeping"
          label="Housekeeping board"
          detail={`${openTasks} rooms need attention`}
          icon={ClipboardCheck}
          tone="teal"
        />
        {can(["super-admin", "admin", "manager", "accountant"]) ? (
          <QuickAction
            to="/admin/reports"
            label="Open reports"
            detail="Revenue and operational analytics"
            icon={BarChart3}
            tone="gold"
          />
        ) : (
          <QuickAction
            to="/admin/payments"
            label="Payments"
            detail="Collect and reconcile balances"
            icon={CreditCard}
            tone="gold"
          />
        )}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold">Revenue analytics</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Booking revenue over the last 12 periods.
              </p>
            </div>
            <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => setRevenueView("monthly")}
                className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                  revenueView === "monthly"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--faint)] hover:text-[var(--ink)]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setRevenueView("yearly")}
                className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                  revenueView === "yearly"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--faint)] hover:text-[var(--ink)]"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          <div className="chart-grid mt-8 flex h-48 items-end gap-2 rounded-lg border-b border-l border-[var(--line)] px-3 pb-0 pt-4">
            {chartSeries.length === 0 && (
              <p className="m-auto text-xs text-[var(--faint)]">
                Revenue analytics will appear after the first booking.
              </p>
            )}
            {chartSeries.map((point, index) => (
              <div
                key={point.month}
                className="group relative flex h-full flex-1 items-end"
                title={`${point.label}: ${formatCurrency(point.revenue)} · ${point.bookings} bookings`}
              >
                <div
                  className="chart-bar w-full rounded-t-md"
                  style={{
                    height: `${Math.max(3, Math.round((point.revenue / maxRevenue) * 100))}%`,
                    animationDelay: `${Math.min(index * 35, 320)}ms`,
                  }}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-[var(--faint)]">
                  {point.label.slice(0, revenueView === "yearly" ? 4 : 1)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-[var(--muted)]">
            <span>
              <i className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--violet)]" />
              Revenue
            </span>
            <span>
              {chartSeries.reduce((sum, point) => sum + point.bookings, 0)}{" "}
              bookings in this view
            </span>
          </div>
        </Card>
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold">Occupancy analytics</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Live room distribution.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-[var(--sage)]" />
          </div>
          <div className="mt-7 grid place-items-center">
            <OccupancyRing occupancy={occupancy} />
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 text-center text-xs">
            <div>
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-[var(--sage)]" />
              <strong>{occupied}</strong>
              <p className="mt-1 text-[var(--faint)]">Occupied</p>
            </div>
            <div>
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-[var(--accent)]" />
              <strong>{available}</strong>
              <p className="mt-1 text-[var(--faint)]">Available</p>
            </div>
            <div>
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-[var(--warning)]" />
              <strong>{reserved + cleaning}</strong>
              <p className="mt-1 text-[var(--faint)]">Reserved / cleaning</p>
            </div>
            <div>
              <span className="mx-auto mb-2 block h-2 w-2 rounded-full bg-[var(--line-2)]" />
              <strong>{offlineCount}</strong>
              <p className="mt-1 text-[var(--faint)]">Offline</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Recent reservations</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Latest changes in the booking book.
              </p>
            </div>
            <Link
              to="/admin/reservations"
              search={{ q: "" }}
              className="text-xs font-semibold text-[var(--sage)]"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {reservations.slice(0, 4).map((reservation) => (
              <div
                key={reservation.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_0.9fr_0.7fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {getGuest(reservation.guestId)?.name}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--faint)]">
                    {reservation.reference} · Room{" "}
                    {getRoom(reservation.roomId)?.number}
                  </p>
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {formatDate(reservation.checkIn)}
                  <br />
                  <span className="text-[var(--faint)]">
                    to {formatDate(reservation.checkOut)}
                  </span>
                </div>
                <Money value={reservation.total} />
                <StatusBadge status={reservation.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Today’s operations</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                The next useful action.
              </p>
            </div>
            <Link
              to="/admin/front-desk"
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            <OperationRow
              icon={CalendarCheck2}
              label="Expected arrivals"
              value={String(arrivals)}
              tone="sage"
            />
            <OperationRow
              icon={ArrowDownRight}
              label="Expected departures"
              value={String(departures)}
              tone="gold"
            />
            <OperationRow
              icon={WalletCards}
              label="Pending payments"
              value={formatCurrency(outstanding)}
              tone="rose"
            />
            <OperationRow
              icon={ClipboardCheck}
              label="Rooms requiring cleaning"
              value={String(openTasks)}
              tone="blue"
            />
          </div>
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Recent activity</h3>
            <p className="mt-1 text-xs text-[var(--faint)]">
              A lightweight audit trail for your team.
            </p>
          </div>
          <Link
            to="/admin/activity-logs"
            className="text-xs font-semibold text-[var(--sage)]"
          >
            Open logs
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {recentActivities.slice(0, 4).map((activity) => (
            <div
              key={activity.id}
              className="rounded-xl bg-[var(--surface-2)] p-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`h-2 w-2 rounded-full ${activity.tone === "warning" ? "bg-[var(--warning)]" : activity.tone === "danger" ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`}
                />
                <span className="text-[10px] text-[var(--faint)]">
                  {formatDateTime(activity.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold">{activity.action}</p>
              <p className="mt-1 text-[11px] text-[var(--faint)]">
                {activity.detail}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Team snapshot</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                People available across the property.
              </p>
            </div>
            {can(["super-admin", "admin", "manager"]) && (
              <Link
                to="/admin/staff"
                className="text-xs font-semibold text-[var(--violet)]"
              >
                Manage
              </Link>
            )}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <strong className="text-lg">{staff.length}</strong>
              <p className="mt-1 text-[10px] text-[var(--faint)]">People</p>
            </div>
            <div className="rounded-xl bg-[var(--success-soft)] p-3 text-[var(--success)]">
              <strong className="text-lg">{activeStaff}</strong>
              <p className="mt-1 text-[10px]">Active</p>
            </div>
            <div className="rounded-xl bg-[var(--warning-soft)] p-3 text-[var(--warning)]">
              <strong className="text-lg">{onLeave}</strong>
              <p className="mt-1 text-[10px]">On leave</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {staff.slice(0, 4).map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--violet-soft)] text-[11px] font-bold text-[var(--violet)]">
                  {person.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{person.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-[var(--faint)]">
                    {roleLabels[person.role]} · {person.shift}
                  </p>
                </div>
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              </div>
            ))}
            {staff.length === 0 && (
              <p className="py-4 text-center text-xs text-[var(--faint)]">
                No staff records loaded for this role.
              </p>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Operational alerts</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Items that need a decision today.
              </p>
            </div>
            <span className="rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--danger)]">
              {offline + lowStock + openTasks} open
            </span>
          </div>
          <div className="mt-5 grid gap-2">
            <AlertRow
              to="/admin/rooms"
              label="Rooms offline"
              value={String(offline)}
              detail="Maintenance or out of order"
              tone="rose"
            />
            <AlertRow
              to="/admin/inventory"
              label="Low stock items"
              value={String(lowStock)}
              detail="At or below minimum stock"
              tone="gold"
            />
            <AlertRow
              to="/admin/payments"
              label="Outstanding payments"
              value={formatCurrency(outstanding)}
              detail="Guest balances to collect"
              tone="blue"
            />
            <AlertRow
              to="/admin/housekeeping"
              label="Open housekeeping"
              value={String(openTasks)}
              detail="Cleaning and inspection queue"
              tone="teal"
            />
          </div>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function OperationRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "sage" | "gold" | "rose" | "blue";
}) {
  const tones = {
    sage: "bg-[var(--success-soft)] text-[var(--success)]",
    gold: "bg-[var(--warning-soft)] text-[var(--warning)]",
    rose: "bg-[var(--danger-soft)] text-[var(--danger)]",
    blue: "bg-[var(--info-soft)] text-[var(--info)]",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
      <div
        className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1 text-xs text-[var(--muted)]">{label}</span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}

type AdminLink =
  | "/admin/dashboard"
  | "/admin/reservations"
  | "/admin/rooms"
  | "/admin/guests"
  | "/admin/front-desk"
  | "/admin/housekeeping"
  | "/admin/staff"
  | "/admin/payments"
  | "/admin/expenses"
  | "/admin/inventory"
  | "/admin/restaurant"
  | "/admin/reports"
  | "/admin/activity-logs"
  | "/admin/settings";

function QuickAction({
  to,
  label,
  detail,
  icon: Icon,
  tone,
}: {
  to: AdminLink;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: "violet" | "blue" | "gold" | "teal";
}) {
  const tones = {
    violet: "bg-[var(--violet-soft)] text-[var(--violet)]",
    blue: "bg-[var(--info-soft)] text-[var(--info)]",
    gold: "bg-[var(--warning-soft)] text-[var(--warning)]",
    teal: "bg-[var(--success-soft)] text-[var(--success)]",
  };
  return (
    <Link
      to={to}
      className="glass-card group flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--text)]">{label}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[var(--faint)]">{detail}</span>
      </span>
      <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-[var(--faint)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent-strong)]" />
    </Link>
  );
}

function AlertRow({
  to,
  label,
  value,
  detail,
  tone,
}: {
  to: AdminLink;
  label: string;
  value: string;
  detail: string;
  tone: "rose" | "gold" | "blue" | "teal";
}) {
  const dots = {
    rose: "bg-[var(--danger)]",
    gold: "bg-[var(--warning)]",
    blue: "bg-[var(--info)]",
    teal: "bg-[var(--success)]",
  };
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/45 p-3 transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dots[tone]}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{label}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[var(--faint)]">{detail}</span>
      </span>
      <strong className="font-display text-base">{value}</strong>
      <ArrowUpRight className="h-3.5 w-3.5 text-[var(--faint)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent-strong)]" />
    </Link>
  );
}

function PanelHeader({
  title,
  copy,
  icon: Icon,
  action,
}: {
  title: string;
  copy: string;
  icon?: ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
        <p className="mt-1 text-xs text-[var(--faint)]">{copy}</p>
      </div>
      {action ?? (Icon ? <Icon className="h-5 w-5 text-[var(--accent-strong)]" /> : null)}
    </div>
  );
}

function RevenueSpark({ series }: { series: DashboardSummary["revenueSeries"] }) {
  const max = Math.max(1, ...series.map((point) => point.revenue));
  return (
    <div>
      <div className="chart-grid mt-6 flex h-44 items-end gap-2 rounded-lg border-b border-l border-[var(--line)] px-3 pb-0 pt-4">
        {series.map((point, index) => (
          <div
            key={point.month}
            className="group relative flex h-full flex-1 items-end"
            title={`${point.label}: ${formatCurrency(point.revenue)} · ${point.bookings} bookings`}
          >
            <div
              className="chart-bar w-full rounded-t-md"
              style={{
                height: `${Math.max(3, Math.round((point.revenue / max) * 100))}%`,
                animationDelay: `${Math.min(index * 35, 320)}ms`,
              }}
            />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-[var(--faint)]">
              {point.label}
            </span>
          </div>
        ))}
      </div>
      {!series.length && (
        <p className="mt-6 rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">
          Revenue will appear once bookings are recorded.
        </p>
      )}
    </div>
  );
}

function OccupancyRing({ occupancy }: { occupancy: number }) {
  const value = Math.max(0, Math.min(100, occupancy));
  const reduceMotion = useReducedMotion();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="9"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
          {value}%
        </span>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
          Occupied
        </p>
      </div>
    </div>
  );
}

function ReservationMix({
  summary,
}: {
  summary?: DashboardSummary["reservations"];
}) {
  const rows = [
    { label: "Confirmed", value: summary?.confirmed ?? 0, color: "var(--info)" },
    { label: "Pending", value: summary?.pending ?? 0, color: "var(--warning)" },
    { label: "In-house", value: summary?.checkedIn ?? 0, color: "var(--success)" },
    { label: "Cancelled", value: summary?.cancelled ?? 0, color: "var(--danger)" },
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="mt-5 grid gap-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">{row.label}</span>
            <strong>{row.value}</strong>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(4, Math.round((row.value / max) * 100))}%`,
                background: row.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskQueue({
  tasks,
  rooms,
  limit = 5,
}: {
  tasks: HousekeepingTask[];
  rooms: Room[];
  limit?: number;
}) {
  const open = tasks
    .filter((task) => !["cleaned", "inspected"].includes(task.status))
    .slice(0, limit);
  if (!open.length) {
    return (
      <p className="mt-5 rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">
        No open housekeeping tasks right now.
      </p>
    );
  }
  return (
    <div className="mt-4 divide-y divide-[var(--line)]">
      {open.map((task) => {
        const room = rooms.find((item) => item.id === task.roomId);
        return (
          <div key={task.id} className="flex items-center gap-3 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--info-soft)] text-xs font-bold text-[var(--info)]">
              {room?.number ?? "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {room ? `Room ${room.number}` : "Room task"} ·{" "}
                {task.issue || "Housekeeping service"}
              </p>
              <p className="mt-0.5 text-[10px] capitalize text-[var(--faint)]">
                {task.priority} priority · {task.status.replaceAll("-", " ")}
              </p>
            </div>
            <StatusBadge status={task.status} />
          </div>
        );
      })}
    </div>
  );
}

function ActivityFeed({
  activities,
  limit = 5,
}: {
  activities: DashboardSummary["activities"];
  limit?: number;
}) {
  if (!activities.length) {
    return (
      <p className="mt-5 rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">
        No activity has been recorded for this role yet.
      </p>
    );
  }
  return (
    <div className="mt-4 grid gap-2">
      {activities.slice(0, limit).map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3"
        >
          <span
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              activity.tone === "danger"
                ? "bg-[var(--danger)]"
                : activity.tone === "warning"
                  ? "bg-[var(--warning)]"
                  : activity.tone === "success"
                    ? "bg-[var(--success)]"
                    : "bg-[var(--info)]"
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold">{activity.action}</p>
              <span className="text-[10px] text-[var(--faint)]">
                {formatDateTime(activity.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {activity.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ManagerDashboard() {
  const {
    rooms,
    reservations,
    tasks,
    activities,
    dashboard,
    actorName,
    staff,
    attendance,
    inventory,
    getGuest,
    can,
  } = useHotel();
  const summary = dashboard;
  const totalRooms = summary?.rooms.total ?? rooms.length;
  const occupied = summary?.rooms.occupied ?? rooms.filter((room) => room.status === "occupied").length;
  const occupancy = summary?.rooms.occupancy ?? (totalRooms ? Math.round((occupied / totalRooms) * 100) : 0);
  const revenue = summary?.reservations.revenue ?? reservations.reduce((sum, item) => sum + item.total, 0);
  const outstanding = summary?.reservations.outstanding ?? reservations.reduce((sum, item) => sum + item.total - item.paidAmount, 0);
  const openTasks = summary?.housekeeping.open ?? tasks.filter((task) => !["cleaned", "inspected"].includes(task.status)).length;
  const lowStock = summary?.inventory.lowStock ?? inventory.filter((item) => item.quantity <= item.minimumStock).length;
  const todayAttendance = attendance.filter((item) => item.date === today);
  const onDuty = todayAttendance.filter((item) => ["present", "late"].includes(item.status)).length;
  const revenueSeries = summary?.revenueSeries ?? [];
  return (
    <AdminPageShell
      eyebrow="Manager command centre"
      title={`${salutation()}, ${actorName.split(" ")[0] || "team"}.`}
      description="Occupancy, revenue, people, and service delivery in one operating view."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Occupancy" value={`${occupancy}%`} detail={`${occupied} of ${totalRooms} rooms occupied`} icon={Hotel} tone="gold" />
        <MetricCard label="Revenue" value={formatCurrency(revenue)} detail="Non-cancelled stay value" icon={IndianRupee} tone="blue" />
        <MetricCard label="Outstanding" value={formatCurrency(outstanding)} detail="Guest balances to collect" icon={WalletCards} tone="rose" />
        <MetricCard label="Open tasks" value={String(openTasks)} detail={`${lowStock} low-stock items`} icon={ClipboardCheck} />
        <MetricCard label="Confirmed stays" value={String(summary?.reservations.confirmed ?? 0)} detail={`${summary?.reservations.pending ?? 0} pending review`} icon={CalendarCheck2} tone="blue" />
        <MetricCard label="In-house guests" value={String(summary?.reservations.checkedIn ?? 0)} detail={`${summary?.reservations.arrivals ?? 0} arrivals today`} icon={UsersRound} tone="gold" />
        <MetricCard label="Team on duty" value={String(onDuty)} detail={`${staff.filter((person) => person.status === "active").length} active staff`} icon={ShieldCheck} />
        <MetricCard label="Low stock" value={String(lowStock)} detail="Items at or below minimum" icon={Package} tone="rose" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <PanelHeader title="Revenue performance" copy="Monthly booking value across the last 12 periods." icon={BarChart3} />
          <RevenueSpark series={revenueSeries} />
        </Card>
        <Card className="p-5">
          <PanelHeader title="Occupancy health" copy="Live distribution of sellable and occupied rooms." icon={Hotel} />
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <OccupancyRing occupancy={occupancy} />
            <div className="grid gap-3 text-xs">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--success)]" />{summary?.rooms.available ?? rooms.filter((room) => room.status === "available").length} available</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--warning)]" />{summary?.rooms.reserved ?? 0} reserved</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--info)]" />{summary?.rooms.cleaning ?? 0} cleaning</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--danger)]" />{summary?.rooms.offline ?? 0} offline</span>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-5">
          <PanelHeader title="Reservation mix" copy="Where the booking book stands today." icon={CalendarDays} />
          <ReservationMix summary={summary?.reservations} />
        </Card>
        <Card className="p-5">
          <PanelHeader
            title="Housekeeping queue"
            copy="Rooms waiting for service or inspection."
            action={
              can(["super-admin", "admin", "manager"]) ? (
                <Link to="/admin/housekeeping" className="text-xs font-semibold text-[var(--violet)]">Open board</Link>
              ) : undefined
            }
          />
          <TaskQueue tasks={tasks} rooms={rooms} />
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <PanelHeader title="Team pulse" copy="Attendance and recent operating activity." icon={UsersRound} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--surface-2)] p-3 text-center"><strong className="text-lg">{onDuty}</strong><p className="mt-1 text-[10px] text-[var(--faint)]">On duty</p></div>
          <div className="rounded-xl bg-[var(--warning-soft)] p-3 text-center text-[var(--warning)]"><strong className="text-lg">{staff.filter((person) => person.status === "on-leave").length}</strong><p className="mt-1 text-[10px]">On leave</p></div>
          <div className="rounded-xl bg-[var(--info-soft)] p-3 text-center text-[var(--info)]"><strong className="text-lg">{new Set(staff.map((person) => person.department)).size}</strong><p className="mt-1 text-[10px]">Departments</p></div>
        </div>
        <ActivityFeed activities={activities} limit={4} />
      </Card>
    </AdminPageShell>
  );
}

function ReceptionistDashboard() {
  const {
    rooms,
    reservations,
    guests,
    dashboard,
    actorName,
    getGuest,
    getRoom,
  } = useHotel();
  const arrivals = reservations.filter((item) => item.checkIn === today && ["confirmed", "pending"].includes(item.status));
  const departures = reservations.filter((item) => item.checkOut === today && item.status === "checked-in");
  const inHouse = reservations.filter((item) => item.status === "checked-in");
  const availableRooms = rooms.filter((room) => room.status === "available");
  const requests = reservations.filter((item) => item.specialRequests.trim()).slice(0, 5);
  const outstanding = dashboard?.reservations.outstanding ?? reservations.reduce((sum, item) => sum + item.total - item.paidAmount, 0);
  return (
    <AdminPageShell
      eyebrow="Front desk"
      title={`${salutation()}, ${actorName.split(" ")[0] || "team"}.`}
      description="Arrivals, departures, room availability, and guest requests for today."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Arrivals today" value={String(arrivals.length)} detail="Expected check-ins" icon={CalendarCheck2} tone="blue" />
        <MetricCard label="Departures today" value={String(departures.length)} detail="Expected check-outs" icon={ArrowUpRight} tone="gold" />
        <MetricCard label="In-house" value={String(inHouse.length)} detail={`${guests.length} guest profiles`} icon={UsersRound} />
        <MetricCard label="Available rooms" value={String(availableRooms.length)} detail={`${rooms.length} rooms total`} icon={BedDouble} tone="rose" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickAction to="/admin/front-desk" label="Open front desk" detail="Run check-in and check-out" icon={Hotel} tone="violet" />
        <QuickAction to="/admin/reservations" label="New reservation" detail="Create or update a booking" icon={CalendarCheck2} tone="blue" />
        <QuickAction to="/admin/guests" label="Guest directory" detail="Profiles, contact and preferences" icon={UsersRound} tone="teal" />
        <QuickAction to="/admin/payments" label="Collect payment" detail="Record a guest settlement" icon={CreditCard} tone="gold" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <PanelHeader title="Today’s arrivals" copy="Guests expected to check in." action={<Link to="/admin/front-desk" className="text-xs font-semibold text-[var(--violet)]">Front desk</Link>} />
          <div className="mt-4 grid gap-2">
            {arrivals.slice(0, 6).map((reservation) => (
              <div key={reservation.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--violet-soft)] text-xs font-bold text-[var(--violet)]">
                  {(getGuest(reservation.guestId)?.name ?? "G").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{getGuest(reservation.guestId)?.name ?? "Guest"}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--faint)]">{reservation.reference} · Room {getRoom(reservation.roomId)?.number ?? "—"} · {formatDate(reservation.checkIn)}</p>
                </div>
                <StatusBadge status={reservation.status} />
              </div>
            ))}
            {!arrivals.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No arrivals scheduled for today.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <PanelHeader title="Today’s departures" copy="In-house guests due to leave." action={<Link to="/admin/front-desk" className="text-xs font-semibold text-[var(--violet)]">Front desk</Link>} />
          <div className="mt-4 grid gap-2">
            {departures.slice(0, 6).map((reservation) => (
              <div key={reservation.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--warning-soft)] text-xs font-bold text-[var(--warning)]">
                  {(getGuest(reservation.guestId)?.name ?? "G").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{getGuest(reservation.guestId)?.name ?? "Guest"}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--faint)]">{reservation.reference} · Room {getRoom(reservation.roomId)?.number ?? "—"} · {formatDate(reservation.checkOut)}</p>
                </div>
                <StatusBadge status={reservation.status} />
              </div>
            ))}
            {!departures.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No departures scheduled for today.</p>}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-5">
          <PanelHeader title="Guest requests" copy="Special requests attached to active stays." icon={ClipboardCheck} />
          <div className="mt-4 grid gap-2">
            {requests.map((reservation) => (
              <div key={reservation.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">{getGuest(reservation.guestId)?.name ?? "Guest"} · Room {getRoom(reservation.roomId)?.number ?? "—"}</p>
                  <StatusBadge status={reservation.status} />
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">{reservation.specialRequests}</p>
              </div>
            ))}
            {!requests.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No special requests on active stays.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <PanelHeader title="Room availability" copy="Sellable rooms and current house status." icon={BedDouble} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--success-soft)] p-3 text-center text-[var(--success)]"><strong className="text-lg">{availableRooms.length}</strong><p className="mt-1 text-[10px]">Available</p></div>
            <div className="rounded-xl bg-[var(--warning-soft)] p-3 text-center text-[var(--warning)]"><strong className="text-lg">{rooms.filter((room) => room.status === "reserved").length}</strong><p className="mt-1 text-[10px]">Reserved</p></div>
            <div className="rounded-xl bg-[var(--info-soft)] p-3 text-center text-[var(--info)]"><strong className="text-lg">{rooms.filter((room) => room.status === "cleaning").length}</strong><p className="mt-1 text-[10px]">Cleaning</p></div>
            <div className="rounded-xl bg-[var(--danger-soft)] p-3 text-center text-[var(--danger)]"><strong className="text-lg">{rooms.filter((room) => ["maintenance", "out-of-order"].includes(room.status)).length}</strong><p className="mt-1 text-[10px]">Offline</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableRooms.slice(0, 8).map((room) => (
              <span key={room.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/50 px-2.5 py-1.5 text-[11px] font-semibold">{room.number}</span>
            ))}
            {!availableRooms.length && <p className="text-xs text-[var(--faint)]">No rooms are currently available.</p>}
          </div>
          <p className="mt-4 text-[11px] text-[var(--faint)]">Outstanding guest balance: <strong className="text-[var(--text)]">{formatCurrency(outstanding)}</strong></p>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function AccountantDashboard() {
  const { payments, invoices, expenses, reservations, dashboard, actorName } = useHotel();
  const summary = dashboard;
  const revenue = summary?.reservations.revenue ?? reservations.reduce((sum, item) => sum + item.total, 0);
  const received = payments.filter((payment) => payment.status === "completed").reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = payments.filter((payment) => payment.status === "refunded").reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = summary?.reservations.outstanding ?? reservations.reduce((sum, item) => sum + item.total - item.paidAmount, 0);
  const approvedExpenses = expenses.filter((expense) => expense.status === "approved").reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = expenses.filter((expense) => expense.status === "pending");
  const invoiceDue = invoices.reduce((sum, invoice) => sum + (invoice.status === "paid" ? 0 : invoice.dueAmount), 0);
  const categoryTotals = new Map<string, number>();
  for (const expense of expenses.filter((item) => item.status === "approved")) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amount);
  }
  const expenseRows = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxExpense = Math.max(1, ...expenseRows.map(([, value]) => value));
  return (
    <AdminPageShell
      eyebrow="Finance desk"
      title={`${salutation()}, ${actorName.split(" ")[0] || "team"}.`}
      description="Revenue, collections, refunds, expenses, and invoice exposure at a glance."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Revenue" value={formatCurrency(revenue)} detail="Non-cancelled stay value" icon={IndianRupee} tone="blue" />
        <MetricCard label="Payments received" value={formatCurrency(received)} detail={`${payments.filter((payment) => payment.status === "completed").length} completed payments`} icon={CreditCard} />
        <MetricCard label="Outstanding" value={formatCurrency(outstanding)} detail="Guest balances to collect" icon={WalletCards} tone="rose" />
        <MetricCard label="Refunds" value={formatCurrency(refunded)} detail={`${payments.filter((payment) => payment.status === "refunded").length} refunded payments`} icon={ReceiptText} tone="gold" />
        <MetricCard label="Approved expenses" value={formatCurrency(approvedExpenses)} detail={`${pendingExpenses.length} awaiting approval`} icon={ReceiptText} tone="gold" />
        <MetricCard label="Invoice balance" value={formatCurrency(invoiceDue)} detail={`${invoices.filter((invoice) => invoice.status !== "paid").length} open invoices`} icon={FileDown} tone="rose" />
        <MetricCard label="Invoices issued" value={String(invoices.length)} detail="All invoice records" icon={FileDown} tone="blue" />
        <MetricCard label="Payment records" value={String(payments.length)} detail="Recorded settlements" icon={CreditCard} />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <PanelHeader title="Revenue trend" copy="Booking value over the last 12 periods." icon={BarChart3} />
          <RevenueSpark series={summary?.revenueSeries ?? []} />
        </Card>
        <Card className="p-5">
          <PanelHeader title="Expense mix" copy="Approved spend by category." icon={ReceiptText} />
          <div className="mt-5 grid gap-4">
            {expenseRows.map(([category, value]) => (
              <BarRow key={category} label={category} value={value} max={maxExpense} />
            ))}
            {!expenseRows.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No approved expenses yet.</p>}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <PanelHeader title="Recent payments" copy="Latest recorded guest settlements." action={<Link to="/admin/payments" className="text-xs font-semibold text-[var(--violet)]">Open payments</Link>} />
          <div className="mt-4 grid gap-2">
            {payments.slice(0, 6).map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"><CreditCard className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold capitalize">{payment.method.replaceAll("-", " ")}</p><p className="mt-0.5 text-[10px] text-[var(--faint)]">{formatDateTime(payment.paidAt)} · {payment.note || "Guest payment"}</p></div>
                <strong className="text-sm">{formatCurrency(payment.amount)}</strong>
                <StatusBadge status={payment.status} />
              </div>
            ))}
            {!payments.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No payments recorded yet.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <PanelHeader title="Invoice exposure" copy="Issued invoices and outstanding balances." action={<Link to="/admin/payments" className="text-xs font-semibold text-[var(--violet)]">Open invoices</Link>} />
          <div className="mt-4 grid gap-2">
            {invoices.slice(0, 6).map((invoice) => (
              <div key={invoice.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--violet-soft)] text-[var(--violet)]"><FileDown className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{invoice.number}</p><p className="mt-0.5 text-[10px] text-[var(--faint)]">Issued {formatDate(invoice.issuedAt)}</p></div>
                <strong className="text-sm">{formatCurrency(invoice.dueAmount)}</strong>
                <StatusBadge status={invoice.status} />
              </div>
            ))}
            {!invoices.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No invoices issued yet.</p>}
          </div>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function HousekeepingDashboard() {
  const { tasks, rooms, actorName, can } = useHotel();
  const dirty = tasks.filter((task) => task.status === "dirty");
  const inProgress = tasks.filter((task) => ["assigned", "in-progress"].includes(task.status));
  const inspection = tasks.filter((task) => task.status === "cleaned");
  const completed = tasks.filter((task) => task.status === "inspected" && task.updatedAt.slice(0, 10) === today);
  const highPriority = tasks.filter((task) => task.priority === "high" && task.status !== "inspected");
  return (
    <AdminPageShell
      eyebrow="Housekeeping"
      title={`${salutation()}, ${actorName.split(" ")[0] || "team"}.`}
      description="Cleaning priorities, inspection queue, and room readiness for the shift."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Needs cleaning" value={String(dirty.length)} detail="Dirty rooms waiting" icon={BedDouble} tone="rose" />
        <MetricCard label="In progress" value={String(inProgress.length)} detail="Assigned or being cleaned" icon={ClipboardCheck} tone="blue" />
        <MetricCard label="Inspection pending" value={String(inspection.length)} detail="Cleaned, awaiting sign-off" icon={Check} tone="gold" />
        <MetricCard label="Completed today" value={String(completed.length)} detail={`${highPriority.length} high-priority tasks`} icon={Star} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickAction to="/admin/housekeeping" label="Housekeeping board" detail="Update task status and inspect rooms" icon={ClipboardCheck} tone="violet" />
        <QuickAction to="/admin/rooms" label="Room status" detail="Review room availability and blocks" icon={BedDouble} tone="blue" />
        <QuickAction to="/admin/inventory" label="Inventory" detail="Check linen and supply levels" icon={Package} tone="teal" />
        <QuickAction to="/admin/front-desk" label="Front desk" detail="Coordinate departures and arrivals" icon={Hotel} tone="gold" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <PanelHeader
            title="Active cleaning queue"
            copy="Tasks that need attention during this shift."
            action={can(["super-admin", "admin", "manager", "housekeeping"]) ? <Link to="/admin/housekeeping" className="text-xs font-semibold text-[var(--violet)]">Open board</Link> : undefined}
          />
          <TaskQueue tasks={tasks} rooms={rooms} limit={8} />
        </Card>
        <Card className="p-5">
          <PanelHeader title="Room readiness" copy="Current house status across the property." icon={Hotel} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--success-soft)] p-4 text-center text-[var(--success)]"><strong className="text-xl">{rooms.filter((room) => room.status === "available").length}</strong><p className="mt-1 text-[10px]">Available</p></div>
            <div className="rounded-xl bg-[var(--warning-soft)] p-4 text-center text-[var(--warning)]"><strong className="text-xl">{rooms.filter((room) => room.status === "cleaning").length}</strong><p className="mt-1 text-[10px]">Cleaning</p></div>
            <div className="rounded-xl bg-[var(--info-soft)] p-4 text-center text-[var(--info)]"><strong className="text-xl">{rooms.filter((room) => room.status === "occupied").length}</strong><p className="mt-1 text-[10px]">Occupied</p></div>
            <div className="rounded-xl bg-[var(--danger-soft)] p-4 text-center text-[var(--danger)]"><strong className="text-xl">{rooms.filter((room) => ["maintenance", "out-of-order"].includes(room.status)).length}</strong><p className="mt-1 text-[10px]">Offline</p></div>
          </div>
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">High priority</p>
            <div className="mt-3 grid gap-2">
              {highPriority.slice(0, 5).map((task) => {
                const room = rooms.find((item) => item.id === task.roomId);
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)]/45 p-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]"><Star className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Room {room?.number ?? "—"}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{task.issue || "Priority housekeeping service"}</p></div>
                    <StatusBadge status={task.status} />
                  </div>
                );
              })}
              {!highPriority.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-4 text-center text-xs text-[var(--faint)]">No high-priority tasks.</p>}
            </div>
          </div>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function RestaurantDashboard() {
  const { orders, inventory, actorName, can } = useHotel();
  const newOrders = orders.filter((order) => order.status === "new");
  const preparing = orders.filter((order) => order.status === "preparing");
  const servedToday = orders.filter((order) => order.status === "served" && order.createdAt.slice(0, 10) === today);
  const lowStock = inventory.filter((item) => item.quantity <= item.minimumStock);
  const activeOrders = [...newOrders, ...preparing].slice(0, 8);
  return (
    <AdminPageShell
      eyebrow="Restaurant & services"
      title={`${salutation()}, ${actorName.split(" ")[0] || "team"}.`}
      description="Orders, service pace, and supply alerts for the restaurant operation."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="New orders" value={String(newOrders.length)} detail="Waiting to be accepted" icon={Utensils} tone="rose" />
        <MetricCard label="Preparing" value={String(preparing.length)} detail="In the kitchen queue" icon={Clock3} tone="gold" />
        <MetricCard label="Served today" value={String(servedToday.length)} detail="Completed service today" icon={Check} tone="blue" />
        <MetricCard label="Low stock" value={String(lowStock.length)} detail="At or below minimum level" icon={Package} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickAction to="/admin/restaurant" label="Order board" detail="Accept, prepare and serve orders" icon={Utensils} tone="violet" />
        <QuickAction to="/admin/inventory" label="Inventory" detail="Review stock and adjust levels" icon={Package} tone="blue" />
        <QuickAction to="/admin/rooms" label="Rooms" detail="Check in-room service context" icon={BedDouble} tone="teal" />
        <QuickAction to="/admin/front-desk" label="Front desk" detail="Coordinate guest requests" icon={Hotel} tone="gold" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <PanelHeader title="Active order queue" copy="Orders that need service attention." action={can(["super-admin", "admin", "manager", "restaurant", "receptionist"]) ? <Link to="/admin/restaurant" className="text-xs font-semibold text-[var(--violet)]">Open board</Link> : undefined} />
          <div className="mt-4 grid gap-2">
            {activeOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]"><Utensils className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{order.guestName} · {order.roomNumber ? `Room ${order.roomNumber}` : "Walk-in"}</p><p className="mt-0.5 truncate text-[10px] text-[var(--faint)]">{order.items}</p></div>
                <strong className="text-sm">{formatCurrency(order.amount)}</strong>
                <StatusBadge status={order.status} />
              </div>
            ))}
            {!activeOrders.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">No active restaurant orders.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <PanelHeader title="Supply alerts" copy="Inventory items at or below minimum." icon={Package} />
          <div className="mt-4 grid gap-2">
            {lowStock.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)]/45 p-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]"><Package className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{item.name}</p><p className="mt-0.5 text-[10px] text-[var(--muted)]">{item.quantity} {item.unit} remaining · minimum {item.minimumStock}</p></div>
              </div>
            ))}
            {!lowStock.length && <p className="rounded-xl border border-dashed border-[var(--line-2)] p-5 text-center text-xs text-[var(--faint)]">All inventory levels are healthy.</p>}
          </div>
        </Card>
      </div>
    </AdminPageShell>
  );
}

export function AdminReservationsPage() {
  const {
    reservations,
    getGuest,
    getRoom,
    getRoomType,
    updateReservationStatus,
    assignReservationRoom,
    createReservation,
    can,
  } = useHotel();
  const canWrite = can(["super-admin", "admin", "manager", "receptionist"]);
  const search = useSearch({ from: "/admin/reservations" });
  const [query, setQuery] = useState(search.q ?? "");
  const [status, setStatus] = useState<"all" | ReservationStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = reservations.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      `${item.reference} ${getGuest(item.guestId)?.name} ${getGuest(item.guestId)?.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <AdminPageShell
      eyebrow="Guest flow"
      title="Reservations"
      description="Create, search, and move every stay from request to checkout."
      action={
        canWrite ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> New reservation
          </button>
        ) : undefined
      }
    >
      {notice && <Notice text={notice} />}
      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onCreated={(message) => {
            setShowForm(false);
            setNotice(message);
          }}
        />
      )}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2.5 md:w-80">
          <Search className="h-4 w-4 text-[var(--faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest or booking reference"
            className="w-full bg-transparent text-xs outline-none"
          />
        </label>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--faint)]" />
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | ReservationStatus)
            }
            className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2 text-xs capitalize outline-none"
          >
            <option value="all">All statuses</option>
            {[
              "pending",
              "confirmed",
              "checked-in",
              "checked-out",
              "cancelled",
              "no-show",
            ].map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="hidden grid-cols-[1.3fr_1fr_0.85fr_0.65fr_0.8fr_auto] gap-4 border-b border-[var(--line)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)] lg:grid">
          <span>Guest</span>
          <span>Dates</span>
          <span>Room</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {filtered.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservationId={reservation.id}
              onStatus={updateReservationStatus}
              onAssign={assignReservationRoom}
              readOnly={!canWrite}
            />
          ))}
          {filtered.length === 0 && (
            <div className="p-5">
              <EmptyState
                title="No reservations found"
                copy="Try another guest, reference, or status."
              />
            </div>
          )}
        </div>
      </Card>
    </AdminPageShell>
  );
}

function ReservationRow({
  reservationId,
  onStatus,
  onAssign,
  readOnly = false,
}: {
  reservationId: string;
  onStatus: (
    id: string,
    status: ReservationStatus,
  ) => Promise<{ error?: string }>;
  onAssign: (id: string, roomId: string) => Promise<{ error?: string }>;
  readOnly?: boolean;
}) {
  const { getReservation, getGuest, getRoom, getRoomType, rooms } = useHotel();
  const reservation = getReservation(reservationId)!;
  const guest = getGuest(reservation.guestId);
  const room = getRoom(reservation.roomId);
  const type = room ? getRoomType(room.typeId) : undefined;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[1.3fr_1fr_0.85fr_0.65fr_0.8fr_auto] lg:items-center lg:gap-4">
      <div>
        <p className="text-sm font-semibold">{guest?.name}</p>
        <p className="mt-1 text-[11px] text-[var(--faint)]">
          {reservation.reference} · {guest?.email}
        </p>
      </div>
      <div className="text-xs text-[var(--muted)]">
        {formatDate(reservation.checkIn)}
        <br />
        <span className="text-[var(--faint)]">
          to {formatDate(reservation.checkOut)}
        </span>
      </div>
      <div>
        <p className="text-sm">Room {room?.number}</p>
        <p className="mt-1 text-[11px] text-[var(--faint)]">{type?.name}</p>
      </div>
      <div className="text-sm font-semibold">
        {formatCurrency(reservation.total)}
      </div>
      <StatusBadge status={reservation.status} />
      {!readOnly && (
        <div className="flex items-center gap-2">
          <select
            aria-label={`Update ${reservation.reference}`}
            value={reservation.status}
            onChange={(e) => {
              void onStatus(
                reservation.id,
                e.target.value as ReservationStatus,
              ).then((result) => {
                if (result.error) setError(result.error);
              });
            }}
            className="max-w-24 rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-[11px] capitalize outline-none"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked in</option>
            <option value="checked-out">Checked out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </select>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="rounded-lg border border-[var(--line-2)] p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            title="Assign room"
          >
            <BedDouble className="h-4 w-4" />
          </button>
        </div>
      )}
      {editing && (
        <div className="rounded-lg bg-[var(--surface-2)] p-3 lg:col-span-full">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">Change room</span>
            <select
              defaultValue={reservation.roomId}
              onChange={(e) => {
                void onAssign(reservation.id, e.target.value).then((result) => {
                  if (!result.error) setEditing(false);
                  else setError(result.error);
                });
              }}
              className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2 text-xs"
            >
              <option value={reservation.roomId}>
                Room {room?.number} · current
              </option>
              {rooms
                .filter(
                  (candidate) =>
                    candidate.id !== reservation.roomId &&
                    getRoomType(candidate.typeId)?.capacity &&
                    candidate.status === "available",
                )
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    Room {candidate.number} ·{" "}
                    {getRoomType(candidate.typeId)?.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="text-[11px] text-[var(--danger)] lg:col-span-full"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ReservationForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const { rooms, getRoomType, createReservation } = useHotel();
  const [form, setForm] = useState<ReservationInput>({
    guestName: "",
    email: "",
    phone: "",
    roomId:
      rooms.find((room) => room.status === "available")?.id ??
      rooms[0]?.id ??
      "",
    checkIn: dateAt(1),
    checkOut: dateAt(3),
    adults: 2,
    children: 0,
    discount: 0,
    specialRequests: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = <K extends keyof ReservationInput>(
    key: K,
    value: ReservationInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await createReservation(form);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else onCreated(`${result.reservation?.reference} created successfully.`);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--deep)]/35 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">
              New reservation
            </p>
            <h2 className="mt-2 text-xl font-semibold">Create a guest stay.</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Guest name"
            value={form.guestName}
            onChange={(value) => update("guestName", value)}
            placeholder="Alex Morgan"
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(value) => update("email", value)}
            placeholder="alex@example.com"
            type="email"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(value) => update("phone", value)}
            placeholder="+91 98765 43210"
          />
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
            Room
            <select
              value={form.roomId}
              onChange={(e) => update("roomId", e.target.value)}
              className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal outline-none"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.number} · {getRoomType(room.typeId)?.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Check in"
            value={form.checkIn}
            onChange={(value) => update("checkIn", value)}
            type="date"
          />
          <Field
            label="Check out"
            value={form.checkOut}
            onChange={(value) => update("checkOut", value)}
            type="date"
          />
          <NumberField
            label="Adults"
            value={form.adults}
            onChange={(value) => update("adults", value)}
            min={1}
            max={8}
          />
          <NumberField
            label="Children"
            value={form.children}
            onChange={(value) => update("children", value)}
            min={0}
            max={8}
          />
          <Field
            label="Discount"
            value={String(form.discount)}
            onChange={(value) => update("discount", Number(value))}
            type="number"
          />
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)] sm:col-span-2">
            Special requests
            <textarea
              value={form.specialRequests}
              onChange={(e) => update("specialRequests", e.target.value)}
              rows={3}
              className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal outline-none"
            />
          </label>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-xs font-semibold text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "Creating..." : "Create reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminRoomsPage() {
  const {
    rooms,
    roomTypes,
    updateRoomStatus,
    createRoom,
    updateRoom,
    deleteRoom,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    can,
  } = useHotel();
  const canWrite = can(["super-admin", "admin", "manager"]);
  const canStatus = can(["super-admin", "admin", "manager", "housekeeping"]);
  const [filter, setFilter] = useState<"all" | RoomStatus>("all");
  const [show, setShow] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showType, setShowType] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [error, setError] = useState("");
  const filtered = rooms.filter(
    (room) => filter === "all" || room.status === filter,
  );
  const removeRoom = (room: Room) => {
    if (!window.confirm(`Delete room ${room.number}? This cannot be undone.`)) return;
    setError("");
    void deleteRoom(room.id).then((result) => {
      if (result.error) setError(result.error);
    });
  };
  const removeType = (type: RoomType) => {
    if (!window.confirm(`Delete the ${type.name} room type?`)) return;
    setError("");
    void deleteRoomType(type.id).then((result) => {
      if (result.error) setError(result.error);
    });
  };
  return (
    <AdminPageShell
      eyebrow="Property setup"
      title="Rooms & room types"
      description="Keep your inventory, rates, and sellable room status accurate."
      action={
        canWrite ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowType(true)}
              className="flex items-center gap-2 rounded-full border border-[var(--line-2)] px-4 py-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              <BedDouble className="h-4 w-4" /> Add room type
            </button>
            <button
              type="button"
              onClick={() => setShow(true)}
              className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Add room
            </button>
          </div>
        ) : undefined
      }
    >
      {error && <ErrorNotice text={error} />}
      {show && (
        <RoomForm
          onClose={() => setShow(false)}
          onSave={createRoom}
          roomTypes={roomTypes}
        />
      )}
      {editingRoom && (
        <RoomForm
          initial={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSave={(input) => updateRoom(editingRoom.id, input)}
          roomTypes={roomTypes}
        />
      )}
      {showType && (
        <RoomTypeForm
          onClose={() => setShowType(false)}
          onSave={createRoomType}
        />
      )}
      {editingType && (
        <RoomTypeForm
          initial={editingType}
          onClose={() => setEditingType(null)}
          onSave={(input) => updateRoomType(editingType.id, input)}
        />
      )}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <Filter className="h-4 w-4 text-[var(--faint)]" />
        {(
          [
            "all",
            "available",
            "occupied",
            "reserved",
            "cleaning",
            "maintenance",
            "out-of-order",
          ] as const
        ).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold capitalize ${filter === item ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}
          >
            {item.replaceAll("-", " ")}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((room) => {
          const type = roomTypes.find((item) => item.id === room.typeId);
          return (
            <Card key={room.id} className="group overflow-hidden">
              <RoomVisual room={room} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--faint)]">
                      Room {room.number} · Floor {room.floor}
                    </p>
                    <h3 className="mt-1 text-base font-semibold">
                      {type?.name}
                    </h3>
                  </div>
                  <StatusBadge status={room.status} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(type?.rate ?? 0)}
                    </p>
                    <p className="text-[10px] text-[var(--faint)]">per night</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          aria-label={`Edit room ${room.number}`}
                          onClick={() => setEditingRoom(room)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line-2)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete room ${room.number}`}
                          onClick={() => removeRoom(room)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--danger-line)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <select
                      value={room.status}
                      disabled={!canStatus}
                      onChange={(e) => {
                        void updateRoomStatus(
                          room.id,
                          e.target.value as RoomStatus,
                        ).then((result) => {
                          if (result.error) setError(result.error);
                        });
                      }}
                      className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-[11px] capitalize outline-none disabled:opacity-50"
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="reserved">Reserved</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out-of-order">Out of order</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h3 className="text-base font-semibold">Room types & rates</h3>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          {roomTypes.map((type) => (
            <div key={type.id} className="rounded-xl bg-[var(--surface-2)] p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{type.name}</span>
                <span className="text-sm font-semibold text-[var(--sage)]">
                  {formatCurrency(type.rate)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--faint)]">
                {type.description}
              </p>
              <p className="mt-3 text-[11px] text-[var(--muted)]">
                Up to {type.capacity} guests · {type.size} m²
              </p>
              {canWrite && (
                <div className="mt-3 flex justify-end gap-1 border-t border-[var(--line)] pt-3">
                  <button
                    type="button"
                    aria-label={`Edit ${type.name}`}
                    onClick={() => setEditingType(type)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line-2)] text-[var(--muted)] hover:bg-[var(--surface)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${type.name}`}
                    onClick={() => removeType(type)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--danger-line)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!roomTypes.length && (
            <p className="text-xs text-[var(--faint)]">
              No room types yet. Add one to start selling rooms.
            </p>
          )}
        </div>
      </Card>
    </AdminPageShell>
  );
}
function RoomForm({
  onClose,
  onSave,
  roomTypes,
  initial,
}: {
  onClose: () => void;
  onSave: (input: {
    number: string;
    typeId: string;
    floor: number;
    notes: string;
  }) => Promise<{ error?: string }>;
  roomTypes: { id: string; name: string }[];
  initial?: Room;
}) {
  const [number, setNumber] = useState(initial?.number ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? 1);
  const [typeId, setTypeId] = useState(
    initial?.typeId ?? roomTypes[0]?.id ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--deep)]/35 p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError("");
          const result = await onSave({ number, floor, typeId, notes });
          setSubmitting(false);
          if (result.error) setError(result.error);
          else onClose();
        }}
        className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Property setup
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {initial ? `Edit room ${initial.number}` : "Add a room"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          <Field
            label="Room number"
            value={number}
            onChange={setNumber}
            placeholder="401"
          />
          <NumberField
            label="Floor"
            value={floor}
            onChange={setFloor}
            min={0}
            max={100}
          />
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
            Room type
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
            >
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Internal notes"
            value={notes}
            onChange={setNotes}
            placeholder="Corner room, quiet side"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting
              ? "Saving..."
              : initial
                ? "Save changes"
                : "Add room"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RoomTypeForm({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (input: RoomTypeInput) => Promise<{ error?: string }>;
  initial?: RoomType;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity ?? 2);
  const [size, setSize] = useState(initial?.size ?? 30);
  const [rate, setRate] = useState(initial?.rate ?? 2500);
  const [image, setImage] = useState(initial?.image ?? "");
  const [amenities, setAmenities] = useState(
    (initial?.amenities ?? []).join(", "),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[var(--deep)]/35 p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError("");
          const result = await onSave({
            name,
            description,
            capacity,
            size,
            rate,
            image,
            amenities: amenities
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          });
          setSubmitting(false);
          if (result.error) setError(result.error);
          else onClose();
        }}
        className="my-8 w-full max-w-xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Room inventory
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {initial ? `Edit ${initial.name}` : "Add a room type"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={setName} placeholder="Deluxe King" />
          <Field
            label="Nightly rate (INR)"
            type="number"
            value={String(rate)}
            onChange={(value) => setRate(Number(value) || 0)}
          />
          <NumberField
            label="Capacity"
            value={capacity}
            onChange={setCapacity}
            min={1}
            max={20}
          />
          <NumberField
            label="Size (m²)"
            value={size}
            onChange={setSize}
            min={1}
            max={2000}
          />
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)] sm:col-span-2">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)] sm:col-span-2">
            Amenities (comma separated)
            <textarea
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              rows={2}
              className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <div className="sm:col-span-2">
            <Field
              label="Image URL"
              value={image}
              onChange={setImage}
              placeholder="https://..."
            />
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting
              ? "Saving..."
              : initial
                ? "Save room type"
                : "Add room type"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminGuestsPage() {
  const {
    guests,
    reservations,
    createGuest,
    updateGuest,
    deleteGuest,
    can,
  } = useHotel();
  const canWrite = can(["super-admin", "admin", "manager", "receptionist"]);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const filtered = guests.filter((guest) =>
    `${guest.name} ${guest.email} ${guest.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <AdminPageShell
      eyebrow="Guest relationships"
      title="Guests"
      description="A clear guest profile for a more personal stay."
      action={
        canWrite ? (
          <button
            type="button"
            onClick={() => setShow(true)}
            className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
          >
            <UserPlus className="h-4 w-4" /> Add guest
          </button>
        ) : undefined
      }
    >
      {notice && <Notice text={notice} />}
      {error && <ErrorNotice text={error} />}
      {show && (
        <GuestForm
          onClose={() => setShow(false)}
          onSave={async (input) => {
            const result = await createGuest(input);
            if (!result.error) {
              setNotice("Guest profile added.");
              setError("");
            }
            return result;
          }}
        />
      )}
      {editingGuest && (
        <GuestForm
          initial={editingGuest}
          onClose={() => setEditingGuest(null)}
          onSave={async (input) => {
            const result = await updateGuest(editingGuest.id, input);
            if (!result.error) {
              setNotice("Guest profile updated.");
              setError("");
            }
            return result;
          }}
        />
      )}
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 md:w-96">
        <Search className="h-4 w-4 text-[var(--faint)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guests"
          className="w-full text-xs outline-none"
        />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((guest) => {
          const stays = reservations.filter(
            (item) => item.guestId === guest.id,
          );
          return (
            <Card key={guest.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--info-soft)] text-sm font-semibold text-[var(--info)]">
                  {guest.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold">
                    {guest.name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-[var(--faint)]">
                    {guest.email}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingGuest(guest)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line-2)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                      title="Edit guest"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete ${guest.name}'s profile? Guests with reservations cannot be deleted.`,
                          )
                        )
                          return;
                        void deleteGuest(guest.id).then((result) => {
                          if (result.error) setError(result.error);
                          else {
                            setNotice("Guest profile deleted.");
                            setError("");
                          }
                        });
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--danger-line)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      title="Delete guest"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-5 grid gap-2 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-[var(--sage)]" />
                  {guest.phone}
                </span>
                <span className="flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-[var(--sage)]" />
                  {guest.address || "Address not provided"}
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--sage)]" />
                  {guest.idType} ending {guest.idLastFour || "pending"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{stays.length}</p>
                  <p className="text-[10px] text-[var(--faint)]">bookings</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{guest.totalStays}</p>
                  <p className="text-[10px] text-[var(--faint)]">stays</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(guest.totalSpent)}
                  </p>
                  <p className="text-[10px] text-[var(--faint)]">lifetime</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AdminPageShell>
  );
}
function GuestForm({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (input: GuestInput) => Promise<{ error?: string }>;
  initial?: Guest;
}) {
  const [form, setForm] = useState<GuestInput>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    preferences: initial?.preferences ?? "",
  });
  const [error, setError] = useState("");
  const update = (key: keyof GuestInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      title={initial ? "Edit guest profile" : "Add guest profile"}
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const result = await onSave(form);
        if (result.error) setError(result.error);
        else onClose();
      }}
    >
      <Field
        label="Full name"
        value={form.name}
        onChange={(value) => update("name", value)}
      />
      <Field
        label="Email"
        value={form.email}
        onChange={(value) => update("email", value)}
        type="email"
      />
      <Field
        label="Phone"
        value={form.phone}
        onChange={(value) => update("phone", value)}
      />
      <Field
        label="Address"
        value={form.address}
        onChange={(value) => update("address", value)}
      />
      <Field
        label="Preferences"
        value={form.preferences}
        onChange={(value) => update("preferences", value)}
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}

export function AdminFrontDeskPage() {
  const {
    reservations,
    getGuest,
    getRoom,
    getRoomType,
    checkIn,
    checkOut,
    can,
  } = useHotel();
  const canOperate = can(["super-admin", "admin", "manager", "receptionist"]);
  const [notice, setNotice] = useState("");
  const arrivals = reservations.filter(
    (item) =>
      ["confirmed", "pending"].includes(item.status) &&
      item.checkIn <= dateAt(1),
  );
  const departures = reservations.filter(
    (item) => item.status === "checked-in" || item.checkOut === today,
  );
  return (
    <AdminPageShell
      eyebrow="Front desk"
      title="Arrivals & departures"
      description="A simple handoff for the people welcoming guests in and out."
      action={
        canOperate ? (
          <Link
            to="/admin/reservations"
            search={{ q: "" }}
            className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Walk-in booking
          </Link>
        ) : undefined
      }
    >
      {notice && <Notice text={notice} />}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <DeskList
          title="Expected arrivals"
          subtitle="Verify, assign, and check guests in."
          icon={ArrowUpRight}
          items={arrivals}
          empty="No expected arrivals in the next 24 hours."
          action={(reservation) =>
            canOperate ? (
              <button
                type="button"
                onClick={() => {
                  void checkIn(reservation.id).then((result) =>
                    setNotice(
                      result.error ??
                        `${getGuest(reservation.guestId)?.name} checked in.`,
                    ),
                  );
                }}
                disabled={reservation.status === "checked-in"}
                className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--success)] disabled:opacity-50"
              >
                Check in
              </button>
            ) : null
          }
          getGuest={getGuest}
          getRoom={getRoom}
          getRoomType={getRoomType}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DeskList
          title="Today's departures"
          subtitle="Settle balances, then release rooms to housekeeping."
          icon={ArrowDownRight}
          items={departures}
          empty="No guests currently due out."
          action={(reservation) =>
            canOperate ? (
              <button
                type="button"
                onClick={() => {
                  void checkOut(reservation.id).then((result) =>
                    setNotice(
                      result.error ??
                        `${getGuest(reservation.guestId)?.name} checked out. Room is cleaning.`,
                    ),
                  );
                }}
                disabled={reservation.status === "checked-out"}
                className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--warning)] disabled:opacity-50"
              >
                Check out
              </button>
            ) : null
          }
          getGuest={getGuest}
          getRoom={getRoom}
          getRoomType={getRoomType}
        />
      </div>
      <Card className="mt-5 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--info-soft)] text-[var(--info)]">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Walk-in workflow</h3>
            <p className="mt-1 text-xs text-[var(--faint)]">
              Use New reservation to create a guest, validate dates, assign a
              room, and calculate taxes before payment.
            </p>
          </div>
        </div>
      </Card>
    </AdminPageShell>
  );
}
function DeskList({
  title,
  subtitle,
  icon: Icon,
  items,
  empty,
  action,
  getGuest,
  getRoom,
  getRoomType,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  items: import("../lib/hotel-data").Reservation[];
  empty: string;
  action: (
    reservation: import("../lib/hotel-data").Reservation,
  ) => React.ReactNode;
  getGuest: (id: string) => import("../lib/hotel-data").Guest | undefined;
  getRoom: (id: string) => import("../lib/hotel-data").Room | undefined;
  getRoomType: (id: string) => import("../lib/hotel-data").RoomType | undefined;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-[var(--faint)]">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {items.map((reservation) => (
          <div
            key={reservation.id}
            className="flex items-center gap-3 px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {getGuest(reservation.guestId)?.name}
              </p>
              <p className="mt-1 text-[11px] text-[var(--faint)]">
                Room {getRoom(reservation.roomId)?.number} ·{" "}
                {getRoomType(getRoom(reservation.roomId)?.typeId ?? "")?.name} ·{" "}
                {reservation.reference}
              </p>
            </div>
            <div className="hidden text-right text-xs text-[var(--muted)] sm:block">
              <p>{formatDate(reservation.checkIn)}</p>
              <p className="mt-1 text-[var(--faint)]">
                Balance{" "}
                {formatCurrency(reservation.total - reservation.paidAmount)}
              </p>
            </div>
            {action(reservation)}
          </div>
        ))}
        {!items.length && (
          <p className="p-8 text-center text-sm text-[var(--faint)]">{empty}</p>
        )}
      </div>
    </Card>
  );
}

export function AdminHousekeepingPage() {
  const { tasks, rooms, staff, getRoom, updateTask, createTask, can } =
    useHotel();
  const canWrite = can(["super-admin", "admin", "manager", "housekeeping"]);
  const [filter, setFilter] = useState<"all" | HousekeepingTask["status"]>(
    "all",
  );
  const [error, setError] = useState("");
  const employees = staff.filter(
    (member) => member.department === "Housekeeping",
  );
  const filtered = tasks.filter(
    (task) => filter === "all" || task.status === filter,
  );
  return (
    <AdminPageShell
      eyebrow="Room care"
      title="Housekeeping"
      description="Keep every room moving from dirty to inspected."
      action={
        canWrite ? (
          <button
            type="button"
            onClick={() => {
              const room = rooms.find((item) => item.status === "cleaning");
              if (room)
                void createTask(room.id).then((result) => {
                  if (result.error) setError(result.error);
                });
            }}
            className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> New task
          </button>
        ) : undefined
      }
    >
      {error && <ErrorNotice text={error} />}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(
          ["dirty", "assigned", "in-progress", "cleaned", "inspected"] as const
        ).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-xl border p-4 text-left ${filter === status ? "border-[var(--sage)] bg-[var(--success-soft)]" : "border-[var(--line)] bg-[var(--surface)]"}`}
          >
            <StatusBadge status={status} />
            <p className="mt-3 text-2xl font-semibold">
              {tasks.filter((task) => task.status === status).length}
            </p>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((task) => (
          <Card key={task.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--faint)]">
                  Room {getRoom(task.roomId)?.number}
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  {getRoom(task.roomId)
                    ? `Floor ${getRoom(task.roomId)?.floor}`
                    : "Unassigned"}
                </h3>
                <p className="mt-1 text-[11px] font-medium text-[var(--muted)]">
                  {task.taskType}
                </p>
              </div>
              <StatusBadge status={task.priority} />
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
              {task.issue}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
              Due {task.dueDate ?? "not set"}
            </p>
            <label className="mt-5 grid gap-1.5 text-[11px] font-semibold text-[var(--muted-strong)]">
              Assigned employee
              <select
                value={task.assignedTo ?? ""}
                disabled={!canWrite}
                onChange={(e) => {
                  void updateTask(task.id, {
                    assignedTo: e.target.value || undefined,
                    status: e.target.value ? "assigned" : "dirty",
                  }).then((result) => {
                    if (result.error) setError(result.error);
                  });
                }}
                className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-xs font-normal outline-none disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {employees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 grid gap-1.5 text-[11px] font-semibold text-[var(--muted-strong)]">
              Progress
              <select
                value={task.status}
                disabled={!canWrite}
                onChange={(e) => {
                  void updateTask(task.id, {
                    status: e.target.value as HousekeepingTask["status"],
                  }).then((result) => {
                    if (result.error) setError(result.error);
                  });
                }}
                className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-xs font-normal capitalize outline-none disabled:opacity-50"
              >
                {[
                  "dirty",
                  "assigned",
                  "in-progress",
                  "cleaned",
                  "inspected",
                ].map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 grid gap-1.5 text-[11px] font-semibold text-[var(--muted-strong)]">
              Completion notes
              <textarea
                defaultValue={task.completionNotes}
                disabled={!canWrite}
                rows={2}
                placeholder="What was completed or found?"
                onBlur={(event) => {
                  if (event.target.value === task.completionNotes) return;
                  void updateTask(task.id, {
                    completionNotes: event.target.value,
                  }).then((result) => {
                    if (result.error) setError(result.error);
                  });
                }}
                className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-xs font-normal outline-none disabled:opacity-50"
              />
            </label>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}

export function AdminStaffPage() {
  const {
    staff,
    attendance,
    addStaff,
    updateStaff,
    updateAttendance,
    createAttendance,
  } = useHotel();
  const [show, setShow] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [error, setError] = useState("");
  return (
    <AdminPageShell
      eyebrow="People operations"
      title="Staff & attendance"
      description="Keep teams, shifts, and daily attendance in one place."
      action={
        <button
          type="button"
          onClick={() => setShow(true)}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Add staff
        </button>
      }
    >
      {error && <ErrorNotice text={error} />}
      {show && <StaffForm onClose={() => setShow(false)} onSave={addStaff} />}
      {editingStaff && (
        <StaffForm
          initial={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={(input) => updateStaff(editingStaff.id, input)}
        />
      )}
      <Card className="mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1.3fr_1fr_1fr_0.9fr_1fr] gap-4 border-b border-[var(--line)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)] md:grid">
          <span>Team member</span>
          <span>Department</span>
          <span>Role</span>
          <span>Shift</span>
          <span>Today</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {staff.map((person) => {
            const record = attendance.find(
              (item) => item.staffId === person.id,
            );
            return (
              <div
                key={person.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1fr_1fr_0.9fr_1fr] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--info-soft)] text-xs font-semibold text-[var(--info)]">
                    {person.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{person.name}</p>
                    <p className="mt-1 text-[11px] text-[var(--faint)]">
                      {person.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${person.name}`}
                    onClick={() => setEditingStaff(person)}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-[var(--line-2)] text-[var(--muted)] hover:bg-[var(--surface-2)] md:ml-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {person.department}
                </span>
                <span className="text-xs capitalize text-[var(--muted)]">
                  {roleLabels[person.role]}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {person.shift}
                </span>
                <select
                  value={record?.status ?? "absent"}
                  onChange={(e) => {
                    const status = e.target
                      .value as import("../lib/hotel-data").Attendance["status"];
                    const action = record
                      ? updateAttendance(record.id, status)
                      : createAttendance(person.id, {
                          date: today,
                          status,
                          clockIn: status === "present" ? "09:00" : undefined,
                          clockOut: undefined,
                        });
                    void action.then((result) => {
                      if (result.error) setError(result.error);
                    });
                  }}
                  className="w-fit rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-[11px] capitalize outline-none"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="leave">Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            );
          })}
        </div>
      </Card>
    </AdminPageShell>
  );
}
function StaffForm({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (
    input: Omit<import("../lib/hotel-data").StaffMember, "id" | "joinedAt">,
  ) => Promise<{ error?: string }>;
  initial?: StaffMember;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [department, setDepartment] = useState<Department>(
    initial?.department ?? "Reception",
  );
  const [role, setRole] = useState<StaffRole>(
    initial?.role ?? "receptionist",
  );
  const [shift, setShift] = useState(initial?.shift ?? "09:00–18:00");
  const [status, setStatus] = useState<StaffMember["status"]>(
    initial?.status ?? "active",
  );
  const [error, setError] = useState("");
  return (
    <Modal
      title={initial ? `Edit ${initial.name}` : "Add staff member"}
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const result = await onSave({
          name,
          email,
          phone,
          department,
          role,
          shift,
          status,
        });
        if (result.error) setError(result.error);
        else onClose();
      }}
    >
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Email" value={email} onChange={setEmail} type="email" />
      <Field
        label="Phone"
        value={phone}
        onChange={setPhone}
        placeholder="+91 98765 43210"
      />
      <Field label="Shift" value={shift} onChange={setShift} />
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
        Department
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value as Department)}
          className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
        >
          {[
            "Reception",
            "Housekeeping",
            "Restaurant",
            "Maintenance",
            "Security",
            "Management",
            "Finance",
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
        Role
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
        >
          {Object.keys(roleLabels).map((item) => (
            <option key={item} value={item}>
              {roleLabels[item as StaffRole]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
        Status
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as StaffMember["status"])
          }
          className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
        >
          <option value="active">Active</option>
          <option value="on-leave">On leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}

export function AdminPaymentsPage() {
  const { reservations, payments, invoices, getGuest, recordPayment } =
    useHotel();
  const [selected, setSelected] = useState(
    reservations.find((item) => item.total > item.paidAmount)?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const record = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await recordPayment(selected, Number(amount), method);
    setSubmitting(false);
    setNotice(result.error ?? "Payment recorded and invoice balance updated.");
    if (!result.error) setAmount("");
  };
  return (
    <AdminPageShell
      eyebrow="Financial control"
      title="Payments & invoices"
      description="Record settlements and keep every outstanding balance visible."
    >
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Record payment</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Validated against the reservation balance.
              </p>
            </div>
          </div>
          <form onSubmit={record} className="mt-6 grid gap-4">
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
              Reservation
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal"
              >
                {reservations
                  .filter((item) => item.total > item.paidAmount)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.reference} · {getGuest(item.guestId)?.name} · due{" "}
                      {formatCurrency(item.total - item.paidAmount)}
                    </option>
                  ))}
              </select>
            </label>
            <Field
              label="Amount"
              value={amount}
              onChange={setAmount}
              type="number"
              placeholder="0"
            />
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
              Payment method
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal capitalize"
              >
                {["cash", "upi", "card", "bank-transfer", "online"].map(
                  (item) => (
                    <option key={item}>{item.replaceAll("-", " ")}</option>
                  ),
                )}
              </select>
            </label>
            {notice && <Notice text={notice} />}
            <button
              type="submit"
              disabled={submitting || !selected}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? "Recording..." : "Record payment"}
            </button>
          </form>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Invoice register</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Every generated invoice and current due.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCsv("rivr-invoices.csv", [
                  ["Invoice", "Reservation", "Status", "Due"],
                  ...invoices.map((invoice) => [
                    invoice.number,
                    reservations.find(
                      (item) => item.id === invoice.reservationId,
                    )?.reference ?? "",
                    invoice.status,
                    String(invoice.dueAmount),
                  ]),
                ])
              }
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--sage)]"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center gap-3 px-5 py-4"
              >
                <FileDown className="h-4 w-4 text-[var(--sage)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{invoice.number}</p>
                  <p className="mt-1 text-[11px] text-[var(--faint)]">
                    {
                      reservations.find(
                        (item) => item.id === invoice.reservationId,
                      )?.reference
                    }
                  </p>
                </div>
                <div className="text-right">
                  <Money value={invoice.dueAmount} />
                  <div className="mt-1">
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--line)] px-5 py-4 text-xs text-[var(--faint)]">
            {payments.length} payment records · partial payments supported
          </div>
        </Card>
      </div>
    </AdminPageShell>
  );
}

export function AdminExpensesPage() {
  const { expenses, addExpense, approveExpense, can } = useHotel();
  const canApprove = can(["super-admin", "admin", "manager"]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  return (
    <AdminPageShell
      eyebrow="Financial control"
      title="Expenses"
      description="Track operating costs and approve spend with an accountable record."
      action={
        <button
          type="button"
          onClick={() => setShow(true)}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Add expense
        </button>
      }
    >
      {error && <ErrorNotice text={error} />}
      {show && (
        <ExpenseForm onClose={() => setShow(false)} onSave={addExpense} />
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total tracked"
          value={formatCurrency(total)}
          detail="Current records"
          icon={IndianRupee}
        />
        <MetricCard
          label="Pending approval"
          value={formatCurrency(
            expenses
              .filter((item) => item.status === "pending")
              .reduce((sum, item) => sum + item.amount, 0),
          )}
          detail="Needs review"
          icon={Clock3}
          tone="gold"
        />
        <MetricCard
          label="Approved"
          value={String(
            expenses.filter((item) => item.status === "approved").length,
          )}
          detail="Expense records"
          icon={Check}
          tone="blue"
        />
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold">{expense.description}</p>
                <p className="mt-1 text-[11px] text-[var(--faint)]">
                  {expense.category} · {formatDate(expense.date)}
                </p>
              </div>
              <span className="text-xs capitalize text-[var(--muted)]">
                {expense.method.replaceAll("-", " ")}
              </span>
              <Money value={expense.amount} />
              <StatusBadge status={expense.status} />
              {canApprove && expense.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void approveExpense(expense.id, "approved").then(
                        (result) => {
                          if (result.error) setError(result.error);
                        },
                      );
                    }}
                    className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--success)]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void approveExpense(expense.id, "rejected").then(
                        (result) => {
                          if (result.error) setError(result.error);
                        },
                      );
                    }}
                    className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--danger)]"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </AdminPageShell>
  );
}
function ExpenseForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: ExpenseInput) => Promise<{ error?: string }>;
}) {
  const [form, setForm] = useState<ExpenseInput>({
    category: "Supplies",
    description: "",
    amount: 0,
    date: today,
    method: "card",
  });
  const [error, setError] = useState("");
  const update = <K extends keyof ExpenseInput>(
    key: K,
    value: ExpenseInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      title="Add expense"
      onClose={onClose}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const result = await onSave(form);
        if (result.error) setError(result.error);
        else onClose();
      }}
    >
      <Field
        label="Category"
        value={form.category}
        onChange={(value) => update("category", value)}
      />
      <Field
        label="Description"
        value={form.description}
        onChange={(value) => update("description", value)}
      />
      <Field
        label="Amount"
        value={String(form.amount)}
        onChange={(value) => update("amount", Number(value))}
        type="number"
      />
      <Field
        label="Date"
        value={form.date}
        onChange={(value) => update("date", value)}
        type="date"
      />
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
        Method
        <select
          value={form.method}
          onChange={(e) => update("method", e.target.value as PaymentMethod)}
          className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal capitalize"
        >
          {["cash", "upi", "card", "bank-transfer", "online"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}

export function AdminInventoryPage() {
  const { inventory, adjustInventory } = useHotel();
  const [error, setError] = useState("");
  return (
    <AdminPageShell
      eyebrow="Stock control"
      title="Inventory"
      description="Keep linens, guest supplies, and restaurant stock above their minimums."
    >
      {error && <ErrorNotice text={error} />}
      <Card className="mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1.3fr_0.8fr_0.7fr_0.7fr_1fr_auto] gap-4 border-b border-[var(--line)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)] md:grid">
          <span>Product</span>
          <span>Category</span>
          <span>Quantity</span>
          <span>Minimum</span>
          <span>Supplier</span>
          <span>Adjust</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {inventory.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_0.8fr_0.7fr_0.7fr_1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-xl ${item.quantity <= item.minimumStock ? "bg-[var(--warning-soft)] text-[var(--warning)]" : "bg-[var(--success-soft)] text-[var(--success)]"}`}
                >
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="mt-1 text-[11px] text-[var(--faint)]">
                    {item.sku || "No SKU"} · {formatCurrency(item.purchasePrice)} / {item.unit}
                  </p>
                </div>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {item.category}
              </span>
              <span
                className={`text-sm font-semibold ${item.quantity <= item.minimumStock ? "text-[var(--warning)]" : ""}`}
              >
                {item.quantity} {item.unit}
              </span>
              <span className="text-xs text-[var(--faint)]">
                {item.minimumStock}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {item.supplier}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    void adjustInventory(item.id, -1).then((result) => {
                      if (result.error) setError(result.error);
                    });
                  }}
                  className="grid h-7 w-7 place-items-center rounded-md border border-[var(--line-2)]"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void adjustInventory(item.id, 1).then((result) => {
                      if (result.error) setError(result.error);
                    });
                  }}
                  className="grid h-7 w-7 place-items-center rounded-md border border-[var(--line-2)]"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AdminPageShell>
  );
}

export function AdminRestaurantPage() {
  const { orders, menuCategories, menuItems, addOrder, updateOrder } = useHotel();
  const [guestName, setGuestName] = useState("");
  const [items, setItems] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !items || amount <= 0) return;
    const result = await addOrder({ guestName, items, amount });
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setGuestName("");
    setItems("");
    setAmount(0);
  };
  return (
    <AdminPageShell
      eyebrow="Guest services"
      title="Restaurant & services"
      description="Manage room service orders and post additional charges to a stay."
    >
      {error && <ErrorNotice text={error} />}
      <Card className="mt-6 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Add room service order</h3>
            <p className="mt-1 text-xs text-[var(--faint)]">
              Orders can be attached to a reservation from the active stay.
            </p>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="mt-5 grid gap-3 md:grid-cols-[1fr_1.4fr_0.6fr_auto]"
        >
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Guest name"
            className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-xs outline-none"
          />
          <input
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Items or service"
            className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-xs outline-none"
          />
          <input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Amount"
            className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-xs outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
          >
            Add order
          </button>
        </form>
      </Card>
      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Menu &amp; pricing</h3>
            <p className="mt-1 text-xs text-[var(--faint)]">
              Select a dish to add it to the order form, or use the menu as the
              restaurant price list.
            </p>
          </div>
          <span className="rounded-full border border-[var(--line-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
            {menuItems.length} items
          </span>
        </div>
        {menuCategories.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--line-2)] p-4 text-xs text-[var(--faint)]">
            No menu has been configured yet. Run the demo initializer or add menu
            categories and items through the API.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {menuCategories.map((category) => {
              const categoryItems = menuItems
                .filter((item) => item.categoryId === category.id)
                .sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <div
                  key={category.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/45 p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-sm font-semibold">{category.name}</h4>
                    <span className="text-[10px] text-[var(--faint)]">
                      {categoryItems.length} items
                    </span>
                  </div>
                  {category.description && (
                    <p className="mt-1 text-[11px] text-[var(--faint)]">
                      {category.description}
                    </p>
                  )}
                  <div className="mt-3 divide-y divide-[var(--line)]">
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setItems((current) =>
                            current
                              ? `${current}, 1x ${item.name}`
                              : `1x ${item.name}`,
                          );
                          setAmount((current) => current + item.price);
                        }}
                        className="flex w-full items-center justify-between gap-3 py-2 text-left transition hover:text-[var(--violet)]"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-xs font-semibold">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                item.isVegetarian
                                  ? "bg-[var(--success)]"
                                  : "bg-[var(--danger)]"
                              }`}
                            />
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="mt-0.5 block truncate text-[10px] text-[var(--faint)]">
                              {item.description}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs font-semibold">
                          {formatCurrency(item.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card className="mt-5 overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {orders.map((order) => (
            <div
              key={order.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1.4fr_0.6fr_0.8fr] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold">{order.guestName}</p>
                <p className="mt-1 text-[11px] text-[var(--faint)]">
                  {order.roomNumber
                    ? `Room ${order.roomNumber}`
                    : "No room attached"}
                </p>
              </div>
              <span className="text-xs text-[var(--muted)]">{order.items}</span>
              <Money value={order.amount} />
              <select
                value={order.status}
                onChange={(e) => {
                  void updateOrder(
                    order.id,
                    e.target
                      .value as import("../lib/hotel-data").RestaurantOrder["status"],
                  ).then((result) => {
                    if (result.error) setError(result.error);
                  });
                }}
                className="w-fit rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-2 py-2 text-[11px] capitalize outline-none"
              >
                <option>new</option>
                <option>preparing</option>
                <option>served</option>
                <option>cancelled</option>
              </select>
            </div>
          ))}
        </div>
      </Card>
    </AdminPageShell>
  );
}

export function AdminReportsPage() {
  const { reservations, rooms, payments, expenses, staff } = useHotel();
  const revenue = reservations.reduce((sum, item) => sum + item.total, 0);
  const paid = payments.reduce((sum, item) => sum + item.amount, 0);
  const expensesTotal = expenses
    .filter((item) => item.status === "approved")
    .reduce((sum, item) => sum + item.amount, 0);
  return (
    <AdminPageShell
      eyebrow="Business intelligence"
      title="Reports & analytics"
      description="Export-ready summaries for revenue, occupancy, people, and operations."
    >
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <CalendarDays className="h-4 w-4 text-[var(--sage)]" /> Last 30 days{" "}
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              downloadCsv("rivr-report.csv", [
                ["Metric", "Value"],
                ["Gross revenue", String(revenue)],
                ["Collected", String(paid)],
                ["Operating expenses", String(expensesTotal)],
                [
                  "Occupied rooms",
                  String(
                    rooms.filter((room) => room.status === "occupied").length,
                  ),
                ],
              ])
            }
            className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-2 text-xs font-semibold text-[var(--muted)]"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
          >
            <FileDown className="h-3.5 w-3.5" /> Print report
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Gross revenue"
          value={formatCurrency(revenue)}
          detail="Room & service charges"
          icon={IndianRupee}
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(paid)}
          detail="Completed payments"
          icon={CreditCard}
          tone="sage"
        />
        <MetricCard
          label="Operating expenses"
          value={formatCurrency(expensesTotal)}
          detail="Approved spend"
          icon={ReceiptText}
          tone="rose"
        />
        <MetricCard
          label="Net movement"
          value={formatCurrency(paid - expensesTotal)}
          detail="Collected less spend"
          icon={ArrowUpRight}
          tone="blue"
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ReportCard title="Booking mix">
          <div className="mt-6 space-y-4">
            {(
              [
                "confirmed",
                "pending",
                "checked-in",
                "checked-out",
                "cancelled",
              ] as const
            ).map((status) => {
              const count = reservations.filter(
                (item) => item.status === status,
              ).length;
              return (
                <BarRow
                  key={status}
                  label={status.replaceAll("-", " ")}
                  value={count}
                  max={reservations.length}
                />
              );
            })}
          </div>
        </ReportCard>
        <ReportCard title="Property health">
          <div className="mt-6 space-y-4">
            <BarRow
              label="Occupied rooms"
              value={rooms.filter((room) => room.status === "occupied").length}
              max={rooms.length}
            />
            <BarRow
              label="Rooms ready"
              value={rooms.filter((room) => room.status === "available").length}
              max={rooms.length}
            />
            <BarRow
              label="Active staff"
              value={
                staff.filter((person) => person.status === "active").length
              }
              max={staff.length}
            />
            <BarRow
              label="Paid invoices"
              value={payments.length}
              max={reservations.length}
            />
          </div>
        </ReportCard>
      </div>
    </AdminPageShell>
  );
}
function ReportCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <BarChart3 className="h-4 w-4 text-[var(--sage)]" />
      </div>
      {children}
    </Card>
  );
}
function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs">
        <span className="capitalize text-[var(--muted)]">{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--sage))] transition-[width] duration-500"
          style={{ width: `${max ? Math.max(5, (value / max) * 100) : 5}%` }}
        />
      </div>
    </div>
  );
}

export function AdminActivityPage() {
  const { activities } = useHotel();
  return (
    <AdminPageShell
      eyebrow="Governance"
      title="Activity logs"
      description="A transparent record of important operational changes."
    >
      <Card className="mt-6 overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 px-5 py-4">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${activity.tone === "warning" ? "bg-[var(--warning)]" : activity.tone === "danger" ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{activity.action}</p>
                  <span className="text-[11px] text-[var(--faint)]">
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {activity.detail}
                </p>
                <p className="mt-2 text-[11px] text-[var(--faint)]">
                  by {activity.actor}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AdminPageShell>
  );
}

export function AdminSettingsPage() {
  const {
    refreshDemoData,
    role,
    actorName,
    user,
    users,
    can,
    createUser,
    updateUser,
    changePassword,
    systemSettings,
    updateSettings,
  } = useHotel();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    hotelName: "",
    legalName: "",
    email: "",
    phone: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    timezone: "Asia/Kolkata",
    currency: "INR",
    taxRatePercent: "12",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    invoicePrefix: "INV",
    invoiceFooter: "",
    cancellationPolicy: "",
    cancellationCutoffHours: "24",
    reservationHoldHours: "2",
    logoUrl: "",
  });
  useEffect(() => {
    if (!systemSettings) return;
    setSettingsForm({
      hotelName: systemSettings.hotelName,
      legalName: systemSettings.legalName,
      email: systemSettings.email,
      phone: systemSettings.phone,
      website: systemSettings.website,
      addressLine1: systemSettings.addressLine1,
      addressLine2: systemSettings.addressLine2,
      city: systemSettings.city,
      state: systemSettings.state,
      postalCode: systemSettings.postalCode,
      country: systemSettings.country,
      timezone: systemSettings.timezone,
      currency: systemSettings.currency,
      taxRatePercent: String(systemSettings.taxRatePercent),
      checkInTime: systemSettings.checkInTime,
      checkOutTime: systemSettings.checkOutTime,
      invoicePrefix: systemSettings.invoicePrefix,
      invoiceFooter: systemSettings.invoiceFooter,
      cancellationPolicy: systemSettings.cancellationPolicy,
      cancellationCutoffHours: String(systemSettings.cancellationCutoffHours),
      reservationHoldHours: String(systemSettings.reservationHoldHours),
      logoUrl: systemSettings.logoUrl,
    });
  }, [systemSettings]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "receptionist" as StaffRole,
  });
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const canManageUsers = can(["super-admin", "admin"]);
  const canManageSettings = can(["super-admin", "admin"]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const taxRate = Number(settingsForm.taxRatePercent);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 50) {
      setError("Enter a tax rate between 0 and 50 percent.");
      return;
    }
    setSettingsSubmitting(true);
    const result = await updateSettings({
      hotelName: settingsForm.hotelName,
      legalName: settingsForm.legalName,
      email: settingsForm.email,
      phone: settingsForm.phone,
      website: settingsForm.website,
      addressLine1: settingsForm.addressLine1,
      addressLine2: settingsForm.addressLine2,
      city: settingsForm.city,
      state: settingsForm.state,
      postalCode: settingsForm.postalCode,
      country: settingsForm.country,
      timezone: settingsForm.timezone,
      currency: settingsForm.currency,
      taxRateBps: Math.round(taxRate * 100),
      checkInTime: settingsForm.checkInTime,
      checkOutTime: settingsForm.checkOutTime,
      invoicePrefix: settingsForm.invoicePrefix,
      invoiceFooter: settingsForm.invoiceFooter,
      cancellationPolicy: settingsForm.cancellationPolicy,
      cancellationCutoffHours: Number(settingsForm.cancellationCutoffHours) || 0,
      reservationHoldHours: Number(settingsForm.reservationHoldHours) || 0,
      logoUrl: settingsForm.logoUrl,
    });
    setSettingsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Property settings saved. New reservations use the updated tax rate.");
  };

  const addUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setUserSubmitting(true);
    const result = await createUser(newUser);
    setUserSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewUser({ name: "", email: "", password: "", role: "receptionist" });
    setMessage("User account created.");
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (passwordForm.next !== passwordForm.confirm) {
      setError("The new passwords do not match.");
      return;
    }
    if (passwordForm.next.length < 12) {
      setError("Use at least 12 characters for the new password.");
      return;
    }
    setPasswordSubmitting(true);
    const result = await changePassword(
      passwordForm.current,
      passwordForm.next,
    );
    setPasswordSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    setMessage("Password changed. Other sessions were signed out.");
  };

  return (
    <AdminPageShell
      eyebrow="Property configuration"
      title="Settings"
      description="Keep the workspace aligned with the way your hotel runs."
    >
      {message && <Notice text={message} />}
      {error && <ErrorNotice text={error} />}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--info-soft)] text-[var(--info)]">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Hotel profile</h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                These details feed the public site, invoices and check-in times.
              </p>
            </div>
          </div>
          <form onSubmit={saveSettings} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field
                label="Hotel name"
                value={settingsForm.hotelName}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, hotelName: value }))
                }
              />
              <Field
                label="Legal name"
                value={settingsForm.legalName}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, legalName: value }))
                }
              />
              <Field
                label="Contact email"
                type="email"
                value={settingsForm.email}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, email: value }))
                }
              />
              <Field
                label="Contact phone"
                value={settingsForm.phone}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, phone: value }))
                }
              />
              <Field
                label="Website"
                value={settingsForm.website}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, website: value }))
                }
              />
              <Field
                label="Invoice prefix"
                value={settingsForm.invoicePrefix}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    invoicePrefix: value.toUpperCase(),
                  }))
                }
              />
              <Field
                label="Address line 1"
                value={settingsForm.addressLine1}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    addressLine1: value,
                  }))
                }
              />
              <Field
                label="Address line 2"
                value={settingsForm.addressLine2}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    addressLine2: value,
                  }))
                }
              />
              <Field
                label="City"
                value={settingsForm.city}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, city: value }))
                }
              />
              <Field
                label="State"
                value={settingsForm.state}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, state: value }))
                }
              />
              <Field
                label="PIN code"
                value={settingsForm.postalCode}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    postalCode: value,
                  }))
                }
              />
              <Field
                label="Country"
                value={settingsForm.country}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, country: value }))
                }
              />
              <Field
                label="Timezone"
                value={settingsForm.timezone}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, timezone: value }))
                }
              />
              <Field
                label="Currency code"
                value={settingsForm.currency}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    currency: value.toUpperCase(),
                  }))
                }
              />
              <Field
                label="Default tax rate (%)"
                type="number"
                value={settingsForm.taxRatePercent}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    taxRatePercent: value,
                  }))
                }
              />
              <Field
                label="Check-in time"
                type="time"
                value={settingsForm.checkInTime}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    checkInTime: value,
                  }))
                }
              />
              <Field
                label="Check-out time"
                type="time"
                value={settingsForm.checkOutTime}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    checkOutTime: value,
                  }))
                }
              />
              <Field
                label="Logo URL"
                value={settingsForm.logoUrl}
                onChange={(value) =>
                  setSettingsForm((current) => ({ ...current, logoUrl: value }))
                }
              />
              <Field
                label="Cancellation cut-off (hours)"
                type="number"
                value={settingsForm.cancellationCutoffHours}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    cancellationCutoffHours: value,
                  }))
                }
              />
              <Field
                label="Reservation hold (hours)"
                type="number"
                value={settingsForm.reservationHoldHours}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    reservationHoldHours: value,
                  }))
                }
              />
              <Field
                label="Invoice footer"
                value={settingsForm.invoiceFooter}
                onChange={(value) =>
                  setSettingsForm((current) => ({
                    ...current,
                    invoiceFooter: value,
                  }))
                }
              />
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)] md:col-span-2 xl:col-span-3">
                Cancellation policy
                <textarea
                  value={settingsForm.cancellationPolicy}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      cancellationPolicy: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Explain the cancellation window and any charges."
                  className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal outline-none focus:border-[var(--sage)]"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-[var(--faint)]">
                Tax changes apply to new reservations. Existing totals stay unchanged.
              </p>
              <button
                type="submit"
                disabled={settingsSubmitting || !canManageSettings}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {settingsSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {settingsSubmitting ? "Saving..." : "Save property settings"}
              </button>
            </div>
          </form>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Access & development data
              </h3>
              <p className="mt-1 text-xs text-[var(--faint)]">
                Current session and local development controls.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 rounded-xl bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
            <p>
              <strong>Signed in as:</strong> {actorName}
            </p>
            <p>
              <strong>Role:</strong> {roleLabels[role ?? "manager"]}
            </p>
            <p>
              <strong>Storage:</strong> MariaDB via the RIVR REST API
            </p>
          </div>
          {role === "super-admin" && (
            <button
              type="button"
              onClick={() => {
                void refreshDemoData().then((result) => {
                  if (result.error) setError(result.error);
                });
              }}
              className="mt-5 flex items-center gap-2 rounded-lg border border-[var(--line-2)] px-4 py-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              <RefreshCcw className="h-4 w-4" /> Reset demo data
            </button>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-semibold">Change your password</h3>
          <p className="mt-1 text-xs text-[var(--faint)]">
            Use at least 12 characters. Other sessions for your account will be
            signed out.
          </p>
          <form onSubmit={submitPassword} className="mt-5 grid gap-4">
            <Field
              label="Current password"
              value={passwordForm.current}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, current: value }))
              }
              type="password"
            />
            <Field
              label="New password"
              value={passwordForm.next}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, next: value }))
              }
              type="password"
            />
            <Field
              label="Confirm new password"
              value={passwordForm.confirm}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, confirm: value }))
              }
              type="password"
            />
            <button
              type="submit"
              disabled={passwordSubmitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {passwordSubmitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {passwordSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        </Card>
        {canManageUsers && (
          <Card className="p-5">
            <h3 className="text-base font-semibold">Team access</h3>
            <p className="mt-1 text-xs text-[var(--faint)]">
              Create staff logins and control who can access the workspace.
            </p>
            <form onSubmit={addUser} className="mt-5 grid gap-4">
              <Field
                label="Full name"
                value={newUser.name}
                onChange={(value) =>
                  setNewUser((current) => ({ ...current, name: value }))
                }
              />
              <Field
                label="Email"
                value={newUser.email}
                onChange={(value) =>
                  setNewUser((current) => ({ ...current, email: value }))
                }
                type="email"
              />
              <Field
                label="Temporary password"
                value={newUser.password}
                onChange={(value) =>
                  setNewUser((current) => ({ ...current, password: value }))
                }
                type="password"
              />
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
                Role
                <select
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      role: event.target.value as StaffRole,
                    }))
                  }
                  className="rounded-lg border border-[var(--line-2)] px-3 py-2.5 text-sm font-normal"
                >
                  {Object.keys(roleLabels).map((item) => (
                    <option key={item} value={item}>
                      {roleLabels[item as StaffRole]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={userSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {userSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {userSubmitting ? "Creating..." : "Create user"}
              </button>
            </form>
            <div className="mt-6 grid gap-2">
              {users.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2.5 text-xs sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {member.name}
                    </p>
                    <p className="mt-0.5 text-[var(--faint)]">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      disabled={member.id === user?.id}
                      onChange={(event) => {
                        void updateUser(member.id, {
                          role: event.target.value as StaffRole,
                        }).then((result) => {
                          if (result.error) setError(result.error);
                        });
                      }}
                      className="rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-[11px] disabled:opacity-60"
                    >
                      {Object.keys(roleLabels).map((item) => (
                        <option key={item} value={item}>
                          {roleLabels[item as StaffRole]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={member.id === user?.id}
                      onClick={() => {
                        void updateUser(member.id, {
                          isActive: !member.isActive,
                        }).then((result) => {
                          if (result.error) setError(result.error);
                        });
                      }}
                      className="rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {member.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
              {!users.length && (
                <p className="text-xs text-[var(--faint)]">
                  No user accounts loaded.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </AdminPageShell>
  );
}

function AdminPageShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const trail =
    pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .map((segment) =>
        segment === "dashboard" ? "Overview" : segment.replaceAll("-", " "),
      )
      .join(" / ") || "Overview";
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  return (
    <div className="animate-rise-in">
      <div className="glass-card relative mb-6 overflow-hidden rounded-[1.5rem] px-5 py-6 md:px-7 md:py-7">
        <span className="pointer-events-none absolute -left-10 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(194,163,107,0.22),transparent_68%)] blur-2xl" />
        <span className="pointer-events-none absolute -right-16 -bottom-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(63,107,91,0.11),transparent_70%)] blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">
              <Link to="/admin/dashboard" className="transition-colors hover:text-[var(--ink)]">
                Workspace
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="capitalize text-[var(--muted-strong)]">{trail}</span>
            </div>
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[2.7rem] md:leading-[1.04]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--faint)]">{description}</p>
          </div>
          <div className="relative flex shrink-0 flex-col items-start gap-3 md:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              <CalendarDays className="h-3 w-3 text-[var(--accent-strong)]" /> {dateLabel}
            </span>
            {action}
          </div>
        </div>
        <div className="relative mt-6 h-px bg-gradient-to-r from-[var(--accent)]/60 via-[var(--line)] to-transparent" />
      </div>
      {children}
    </div>
  );
}
function Notice({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[var(--success-line)] bg-[var(--success-soft)] px-4 py-3 text-xs text-[var(--success)]">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--success)]/12">
        <Check className="h-3 w-3" />
      </span>
      {text}
    </div>
  );
}
function ErrorNotice({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-xs text-[var(--danger)]"
    >
      {text}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal outline-none focus:border-[var(--sage)]"
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <Field
      label={label}
      value={String(value)}
      onChange={(value) => onChange(Number(value))}
      type="number"
    />
  );
}
function Modal({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center bg-[var(--deep)]/45 p-4">
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-[var(--line)] bg-[var(--elevated)] p-6 shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-[var(--ink)]">{title}</h2>
            <div className="gold-rule mt-3" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors hover:border-[var(--danger)]/30 hover:text-[var(--danger)]"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
