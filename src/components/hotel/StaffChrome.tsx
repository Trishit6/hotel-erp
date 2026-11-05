import {
  Activity,
  BarChart3,
  BedDouble,
  Bell,
  BriefcaseBusiness,
  CalendarCheck2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Gauge,
  Hotel,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useHotel } from "../../lib/hotel-store";
import type { StaffRole } from "../../lib/hotel-data";
import { BrandMark } from "./HotelUi";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: StaffRole[];
};
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
      {
        to: "/admin/reservations",
        label: "Reservations",
        icon: CalendarCheck2,
      },
      { to: "/admin/rooms", label: "Rooms & room types", icon: BedDouble },
      {
        to: "/admin/guests",
        label: "Guests",
        icon: UsersRound,
        roles: [
          "super-admin",
          "admin",
          "manager",
          "receptionist",
          "accountant",
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/front-desk", label: "Front desk", icon: Hotel },
      {
        to: "/admin/housekeeping",
        label: "Housekeeping",
        icon: ClipboardCheck,
      },
      {
        to: "/admin/staff",
        label: "Staff & attendance",
        icon: BriefcaseBusiness,
        roles: ["super-admin", "admin", "manager"],
      },
      {
        to: "/admin/payments",
        label: "Payments & invoices",
        icon: CreditCard,
        roles: [
          "super-admin",
          "admin",
          "manager",
          "accountant",
          "receptionist",
        ],
      },
      {
        to: "/admin/expenses",
        label: "Expenses",
        icon: ReceiptText,
        roles: ["super-admin", "admin", "manager", "accountant"],
      },
      {
        to: "/admin/inventory",
        label: "Inventory",
        icon: Package,
        roles: [
          "super-admin",
          "admin",
          "manager",
          "housekeeping",
          "restaurant",
        ],
      },
      {
        to: "/admin/restaurant",
        label: "Restaurant & services",
        icon: ShoppingBag,
        roles: [
          "super-admin",
          "admin",
          "manager",
          "restaurant",
          "receptionist",
        ],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        to: "/admin/reports",
        label: "Reports & analytics",
        icon: BarChart3,
        roles: ["super-admin", "admin", "manager", "accountant"],
      },
      {
        to: "/admin/activity-logs",
        label: "Activity logs",
        icon: Activity,
        roles: ["super-admin", "admin", "manager"],
      },
      {
        to: "/admin/settings",
        label: "Settings",
        icon: Settings2,
        roles: ["super-admin", "admin", "manager"],
      },
    ],
  },
];

export function AdminLayout() {
  const {
    role,
    actorName,
    logout,
    can,
    reservations,
    status,
    error,
    clearError,
    refresh,
  } = useHotel();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (status === "ready" && !role) navigate({ to: "/admin/login" });
  }, [navigate, role, status]);
  const links = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.roles || can(item.roles)),
      })),
    [can],
  );
  if (status === "loading")
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] text-[var(--muted)]">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--sage)]" />{" "}
          Loading the RIVR workspace…
        </div>
      </div>
    );
  if (status === "error")
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5 text-center text-[var(--text)]">
        <div className="max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-8">
          <h1 className="font-display text-3xl text-[var(--ink)]">
            The workspace could not load.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {error ?? "The RIVR API is not reachable."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]"
            >
              Try again
            </button>
            <Link
              to="/"
              className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-xs font-semibold text-[var(--ink)]"
            >
              Guest website
            </Link>
          </div>
        </div>
      </div>
    );
  if (!role) return null;
  const logoutNow = () => {
    void logout();
    navigate({ to: "/admin/login" });
  };
  const pending = reservations.filter(
    (reservation) => reservation.status === "pending",
  ).length;
  const alertTo =
    role === "housekeeping"
      ? "/admin/housekeeping"
      : role === "accountant"
        ? "/admin/payments"
        : role === "restaurant"
          ? "/admin/restaurant"
          : "/admin/front-desk";
  const restricted = adminNav.find(
    (item) =>
      location.pathname.startsWith(item.to) &&
      item.roles &&
      !item.roles.includes(role),
  );
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] lg:flex">
      <div
        className={`fixed inset-0 z-50 bg-[var(--deep)]/45 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`glass-sidebar no-print fixed inset-y-0 left-0 z-50 flex w-[288px] -translate-x-full flex-col px-5 py-6 text-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : ""}`}
      >
        <div className="flex items-center justify-between">
          <BrandMark dark />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold capitalize">
              {role.replaceAll("-", " ")}
            </p>
            <p className="mt-0.5 text-[10px] text-white/50">RIVR operations</p>
          </div>
        </div>
        <nav className="scrollbar-thin mt-8 flex flex-1 flex-col gap-6 overflow-y-auto">
          {links.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                {group.label}
              </p>
              <div className="grid gap-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    activeProps={{ className: "bg-white/12 text-white" }}
                    inactiveProps={{
                      className:
                        "text-white/58 hover:bg-white/8 hover:text-white",
                    }}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-5 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(201,169,106,0.2),rgba(109,94,252,0.14))] p-4 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
          <Gauge className="mb-4 h-5 w-5 text-[var(--accent)]" />
          <p className="text-sm font-semibold">A clear day ahead.</p>
          <p className="mt-1 text-[11px] leading-4 text-white/62">
            Keep arrivals, rooms, and people moving together.
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-header no-print sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden lg:block">
              <p className="text-[11px] text-[var(--faint)]">
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date())}
              </p>
              <h1 className="mt-0.5 text-lg font-semibold">
                Good morning, {actorName.split(" ")[0]}.
              </h1>
            </div>
            <div className="lg:hidden">
              <BrandMark />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate({ to: "/admin/reservations", search: { q: query } });
              }}
              className="hidden items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2 shadow-sm md:flex"
            >
              <Search className="h-4 w-4 text-[var(--faint)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reservations..."
                aria-label="Search reservations"
                className="w-40 bg-transparent text-xs outline-none placeholder:text-[var(--faint)]"
              />
            </form>
            <Link
              to="/admin/reservations"
              search={{ q: query }}
              className="hidden rounded-xl bg-[var(--primary)] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] sm:flex"
            >
              Quick action
            </Link>
            <Link
              to={alertTo}
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--line-2)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--violet)] hover:text-[var(--ink)]"
              aria-label={
                pending > 0
                  ? `${pending} pending reservations — open alerts`
                  : "Open operational alerts"
              }
              title="Operational alerts"
            >
              <Bell className="h-4 w-4" />
              {pending > 0 && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
              )}
            </Link>
            <ThemeToggle />
            <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--info-soft)] text-xs font-bold text-[var(--info)]">
              {actorName.slice(0, 1).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={logoutNow}
              className="hidden text-xs text-[var(--muted)] hover:text-[var(--ink)] sm:block"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="admin-main flex-1 px-5 py-6 md:px-8 md:py-8 lg:px-10">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-xs text-[var(--danger)]"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}
          {restricted ? (
            <div className="grid min-h-[60vh] place-items-center">
              <div className="max-w-md text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  This workspace is restricted.
                </h2>
                <p className="mt-2 text-sm text-[var(--faint)]">
                  Your current role does not have access to{" "}
                  {restricted.label.toLowerCase()}.
                </p>
                <Link
                  to="/admin/dashboard"
                  className="mt-5 inline-flex rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
                >
                  Back to overview
                </Link>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

export const adminNav = navGroups.flatMap((group) => group.items);
