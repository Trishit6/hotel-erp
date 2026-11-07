import { Link } from "@tanstack/react-router";
import { BedDouble, ClipboardCheck, CalendarCheck2, Utensils } from "lucide-react";
import { AdminLayout } from "../components/hotel/StaffChrome";
import { useHotel } from "../lib/hotel-store";
import { formatDate } from "../lib/hotel-data";
import {
  AdminDashboardPage,
  AdminFrontDeskPage,
  AdminHousekeepingPage,
} from "./AdminPages";

/** Manager: hotel overview plus the full staff workspace. */
export function ManagerDashboardPage() {
  return (
    <AdminLayout>
      <AdminDashboardPage />
    </AdminLayout>
  );
}

/** Receptionist: front desk is the dashboard. */
export function ReceptionDashboardPage() {
  return (
    <AdminLayout>
      <AdminFrontDeskPage />
    </AdminLayout>
  );
}

/** Housekeeping: assigned tasks and room readiness only. */
export function HousekeepingDashboardPage() {
  return (
    <AdminLayout>
      <AdminHousekeepingPage />
    </AdminLayout>
  );
}

/**
 * General staff: a deliberately limited view. Financial summaries come from the
 * staff-gated reports endpoint, so this page shows only operational counts that
 * every staff role may read.
 */
export function StaffDashboardPage() {
  return (
    <AdminLayout>
      <StaffHome />
    </AdminLayout>
  );
}

function StaffHome() {
  const { rooms, reservations, tasks, orders, actorName } = useHotel();
  const today = new Date().toISOString().slice(0, 10);
  const available = rooms.filter((room) => room.status === "available").length;
  const dirty = tasks.filter(
    (task) => task.status !== "inspected" && task.status !== "cleaned",
  ).length;
  const arrivals = reservations.filter(
    (reservation) => reservation.checkIn === today && reservation.status !== "cancelled",
  );
  const serving = orders.filter(
    (order) => order.status === "new" || order.status === "preparing",
  ).length;

  const cards = [
    {
      label: "Available rooms",
      value: available,
      detail: `${rooms.length} rooms in the property`,
      to: "/admin/rooms" as const,
      icon: BedDouble,
    },
    {
      label: "Arrivals today",
      value: arrivals.length,
      detail: arrivals[0] ? `Next: ${formatDate(arrivals[0].checkIn)}` : "Nothing scheduled",
      to: "/admin/reservations" as const,
      icon: CalendarCheck2,
    },
    {
      label: "Open housekeeping",
      value: dirty,
      detail: "Tasks still awaiting inspection",
      to: "/admin/housekeeping" as const,
      icon: ClipboardCheck,
    },
    {
      label: "Restaurant queue",
      value: serving,
      detail: "Orders not yet served",
      to: "/admin/restaurant" as const,
      icon: Utensils,
    },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sage)]">
          Staff workspace
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--ink)]">
          Good to see you, {actorName.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
          This is the shared staff view. Financial reports and settings stay
          restricted to the roles that hold those permissions.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-[0_14px_40px_rgba(23,43,73,0.08)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                {label}
              </p>
              <Icon className="h-4 w-4 text-[var(--sage)]" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[var(--ink)]">
              {value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
