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
  Gauge,
  Globe2,
  Hotel,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  UsersRound,
  X,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
        roles: ["super-admin", "admin"],
      },
    ],
  },
];

const pathLabels: Record<string, string> = {
  "/admin/dashboard": "Overview",
  "/admin/reservations": "Reservations",
  "/admin/rooms": "Rooms & room types",
  "/admin/room-types": "Rooms & room types",
  "/admin/guests": "Guests",
  "/admin/front-desk": "Front desk",
  "/admin/check-in": "Check-in",
  "/admin/check-out": "Check-out",
  "/admin/housekeeping": "Housekeeping",
  "/admin/staff": "Staff & attendance",
  "/admin/attendance": "Staff & attendance",
  "/admin/payments": "Payments & invoices",
  "/admin/invoices": "Payments & invoices",
  "/admin/expenses": "Expenses",
  "/admin/inventory": "Inventory",
  "/admin/restaurant": "Restaurant & services",
  "/admin/reports": "Reports & analytics",
  "/admin/activity-logs": "Activity logs",
  "/admin/settings": "Settings",
};

export function AdminLayout({ children }: { children?: ReactNode }) {
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
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status === "ready" && !role) navigate({ to: "/login" });
    if (status === "ready" && role === "customer")
      navigate({ to: "/guest/dashboard" });
  }, [navigate, role, status]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

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
        <div className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm shadow-[var(--shadow-soft)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--sage)]" /> Loading the RIVR workspace…
        </div>
      </div>
    );

  if (status === "error")
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5 text-center text-[var(--text)]">
        <div className="glass-card max-w-md rounded-[1.5rem] p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-5 font-display text-3xl text-[var(--ink)]">
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

  if (!role || role === "customer") return null;

  const logoutNow = () => {
    void logout();
    navigate({ to: "/login" });
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
  const pageLabel =
    pathLabels[location.pathname] ??
    adminNav.find(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`),
    )?.label ??
    "Workspace";
  const initials = actorName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] lg:flex">
      <a
        href="#admin-main"
        className="sr-only z-[100] rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <div
        className={`fixed inset-0 z-40 bg-[var(--deep)]/55 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`glass-sidebar no-print fixed inset-y-0 left-0 z-50 flex w-[288px] -translate-x-full flex-col px-4 py-5 text-white transition-[width,transform] duration-300 lg:sticky lg:bottom-auto lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        } ${collapsed ? "lg:w-[92px]" : "lg:w-[288px]"}`}
      >
        <div className="flex items-center justify-between">
          <div className={collapsed ? "hidden lg:block" : ""}>
            <BrandMark dark compact={collapsed} />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 ${
            collapsed ? "lg:justify-center lg:p-2" : ""
          }`}
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className={collapsed ? "lg:hidden" : ""}>
            <p className="text-xs font-semibold capitalize">
              {role.replaceAll("-", " ")}
            </p>
            <p className="mt-0.5 text-[10px] text-white/50">RIVR operations</p>
          </div>
        </div>

        <nav className="scrollbar-thin mt-7 flex flex-1 flex-col gap-5 overflow-y-auto">
          {links.map((group) => (
            <div key={group.label}>
              <p
                className={`mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35 ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                {group.label}
              </p>
              <div className="grid gap-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    title={collapsed ? label : undefined}
                    activeProps={{
                      className:
                        "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                      "aria-current": "page",
                    }}
                    inactiveProps={{
                      className:
                        "text-white/58 hover:bg-white/8 hover:text-white",
                    }}
                    className={`sidebar-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      collapsed ? "lg:justify-center lg:px-2" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                      {label}
                    </span>
                    <ChevronRight
                      className={`ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50 ${
                        collapsed ? "lg:hidden" : ""
                      }`}
                    />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {collapsed ? (
          <Link
            to="/"
            title="View guest website"
            className="mx-auto mt-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Globe2 className="h-4 w-4" />
          </Link>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(194,163,107,0.2),rgba(63,107,91,0.14))] p-4 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
            <Gauge className="mb-4 h-5 w-5 text-[var(--accent)]" />
            <p className="text-sm font-semibold">A clear day ahead.</p>
            <p className="mt-1 text-[11px] leading-4 text-white/60">
              Keep arrivals, rooms, and people moving together.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white"
            >
              <Globe2 className="h-3 w-3" /> View guest site
            </Link>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-header no-print sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-3.5 md:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden h-9 w-9 place-items-center rounded-xl border border-[var(--line-2)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--ink)] lg:grid"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <div className="hidden min-w-0 md:block">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">
                <Link to="/admin/dashboard" className="transition-colors hover:text-[var(--ink)]">
                  Workspace
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="truncate text-[var(--muted-strong)]">{pageLabel}</span>
              </div>
            </div>
            <div className="md:hidden">
              <BrandMark />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-2.5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate({ to: "/admin/reservations", search: { q: query } });
              }}
              className="hidden items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2 shadow-sm transition-colors focus-within:border-[var(--accent)]/50 lg:flex"
            >
              <Search className="h-4 w-4 text-[var(--faint)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reservations..."
                aria-label="Search reservations"
                className="w-36 bg-transparent text-xs outline-none placeholder:text-[var(--faint)] xl:w-44"
              />
            </form>
            <Link
              to="/admin/reservations"
              search={{ q: query }}
              className="hidden rounded-xl bg-[var(--primary)] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] sm:flex"
            >
              Quick action
            </Link>
            <Link
              to={alertTo}
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--line-2)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--ink)]"
              aria-label={
                pending > 0
                  ? `${pending} pending reservations — open alerts`
                  : "Open operational alerts"
              }
              title="Operational alerts"
            >
              <Bell className="h-4 w-4" />
              {pending > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-bold text-white">
                  {pending > 9 ? "9+" : pending}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <span className="hidden h-8 w-px bg-[var(--line)] sm:block" aria-hidden="true" />
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--sage)] text-[10px] font-bold text-[var(--deep)] ring-2 ring-[var(--surface)]">
                {initials}
              </span>
              <span className="hidden lg:block">
                <span className="block text-[11px] font-semibold text-[var(--ink)]">{actorName}</span>
                <span className="block text-[9px] capitalize text-[var(--faint)]">
                  {role.replaceAll("-", " ")}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={logoutNow}
              className="grid h-9 w-9 place-items-center rounded-xl border border-transparent text-[var(--muted)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--danger)]"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main id="admin-main" className="admin-main flex-1 px-5 py-6 md:px-8 md:py-8 lg:px-10">
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
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-display text-3xl text-[var(--ink)]">
                  This workspace is restricted.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--faint)]">
                  Your current role does not have access to{" "}
                  {restricted.label.toLowerCase()}.
                </p>
                <Link
                  to="/admin/dashboard"
                  className="mt-5 inline-flex rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white"
                >
                  Back to overview
                </Link>
              </div>
            </div>
          ) : (
            (children ?? <Outlet />)
          )}
        </main>
      </div>
    </div>
  );
}

export const adminNav = navGroups.flatMap((group) => group.items);
