import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  CalendarDays,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { defaultStaySearch, hotelInfo } from "../../lib/hotel-data";
import { BrandMark } from "./HotelUi";
import { ThemeToggle } from "./ThemeToggle";

function scrollToSection(id: string, smooth = true) {
  const element = document.getElementById(id);
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - 92;
  window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}

export function SectionLink({
  id,
  className,
  onNavigate,
  children,
}: {
  id: string;
  className: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate?.();
    navigate({ to: "/", hash: id, resetScroll: false });
    window.setTimeout(
      () => scrollToSection(id, !reduceMotion),
      location.pathname === "/" ? 0 : 90,
    );
  };

  return (
    <a href={`/#${id}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

const underline = { type: "spring", stiffness: 380, damping: 32 } as const;

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("menu-open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => document.body.classList.remove("menu-open"), []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const path = location.pathname;
  const isHome = path === "/";
  const roomsActive =
    path === "/rooms" || path === "/search" || path.startsWith("/book/");
  const bookingsActive =
    path === "/my-bookings" ||
    path.startsWith("/booking/lookup") ||
    path === "/booking/success";
  const authActive = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/admin/login",
  ].includes(path);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "glass-header border-[var(--line)] shadow-[0_14px_50px_rgba(30,25,16,0.07)]"
          : "border-transparent bg-[var(--canvas)]/78 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex min-h-[80px] max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8 lg:px-10">
        <BrandMark />

        <nav
          aria-label="Primary"
          className="hidden items-center gap-5 text-[13px] font-medium text-[var(--muted)] lg:flex xl:gap-8"
        >
          <Link
            to="/"
            className="relative py-2 transition-colors hover:text-[var(--ink)]"
            activeProps={{ className: "text-[var(--ink)]" }}
            activeOptions={{ exact: true }}
          >
            Home
            {isHome && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
          <Link
            to="/stay"
            className="relative py-2 transition-colors hover:text-[var(--ink)]"
            activeProps={{ className: "text-[var(--ink)]" }}
          >
            Stay With Us
            {path === "/stay" && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
          <Link
            to="/rooms"
            className="relative py-2 transition-colors hover:text-[var(--ink)]"
            activeProps={{ className: "text-[var(--ink)]" }}
          >
            Explore Rooms
            {roomsActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
          <Link
            to="/amenities"
            className="relative py-2 transition-colors hover:text-[var(--ink)]"
            activeProps={{ className: "text-[var(--ink)]" }}
          >
            Amenities
            {path === "/amenities" && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
          <Link
            to="/about"
            className="relative py-2 transition-colors hover:text-[var(--ink)]"
            activeProps={{ className: "text-[var(--ink)]" }}
          >
            About Us
            {path === "/about" && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
          <Link
            to="/contact"
            className="relative py-2 transition-colors hover:text-[var(--ink)]"
            activeProps={{ className: "text-[var(--ink)]" }}
          >
            Contact
            {path === "/contact" && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/my-bookings"
            className="relative hidden text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)] xl:inline"
            activeProps={{ className: "text-[var(--ink)]" }}
          >
            My Bookings
            {bookingsActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute -bottom-0.5 left-0 right-0 h-px bg-[var(--accent)]"
                transition={underline}
              />
            )}
          </Link>
          <Link
            to="/my-bookings"
            className="hidden h-10 w-10 place-items-center rounded-full border border-[var(--line-2)] text-[var(--muted-strong)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] lg:grid xl:hidden"
            activeProps={{
              className: "border-[var(--accent)] text-[var(--ink)]",
            }}
            aria-label="My bookings"
            title="My bookings"
          >
            <CalendarDays className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="hidden h-10 w-10 place-items-center rounded-full border border-[var(--line-2)] text-[var(--muted-strong)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] sm:grid xl:hidden"
            activeProps={{
              className: "border-[var(--accent)] text-[var(--ink)]",
            }}
            aria-label="Sign in"
            title="Sign in"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="hidden items-center gap-2 rounded-full border border-[var(--line-2)] px-3.5 py-2.5 text-xs font-medium text-[var(--muted-strong)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] xl:flex"
            activeProps={{
              className: "border-[var(--accent)] text-[var(--ink)]",
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Sign In
          </Link>
          <ThemeToggle />
          <Link
            to="/booking"
            search={defaultStaySearch}
            data-cursor="Book"
            className="btn-sheen hidden items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--on-primary)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] md:flex"
          >
            Book Your Stay <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink)] lg:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={reduceMotion ? undefined : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[var(--line)] bg-[var(--canvas)] lg:hidden"
          >
            <nav
              aria-label="Mobile"
              className="mx-auto grid max-h-[calc(100vh-76px)] max-w-[1440px] gap-1 overflow-y-auto px-5 py-4 md:px-8"
            >
              <Link
                onClick={close}
                to="/"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${isHome ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Home
              </Link>
              <Link
                onClick={close}
                to="/stay"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${path === "/stay" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Stay With Us
              </Link>
              <Link
                onClick={close}
                to="/rooms"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${roomsActive ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Explore Rooms
              </Link>
              <Link
                onClick={close}
                to="/amenities"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${path === "/amenities" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Amenities
              </Link>
              <Link
                onClick={close}
                to="/about"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${path === "/about" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                About Us
              </Link>
              <Link
                onClick={close}
                to="/contact"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${path === "/contact" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Contact
              </Link>
              <Link
                onClick={close}
                to="/my-bookings"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${bookingsActive ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                My Bookings
              </Link>
              <Link
                onClick={close}
                to="/login"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${authActive ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Sign In
              </Link>
              <Link
                onClick={close}
                to="/login"
                className={`rounded-xl px-3 py-3 text-sm transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] ${path === "/login" ? "bg-[var(--surface-2)] text-[var(--ink)]" : "text-[var(--muted)]"}`}
              >
                Staff portal
              </Link>
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 pl-3">
                <span className="text-xs text-[var(--muted)]">Appearance</span>
                <ThemeToggle />
              </div>
              <Link
                onClick={close}
                to="/booking"
                search={defaultStaySearch}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-[var(--on-primary)]"
              >
                Book Your Stay <ArrowUpRight className="h-4 w-4" />
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function BookingPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass)] px-3.5 py-2 text-[11px] font-semibold text-[var(--on-glass)] backdrop-blur-md">
      <CalendarDays className="h-3.5 w-3.5 text-[var(--sage)]" />
      {children}
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="relative overflow-hidden bg-[var(--deep)] px-5 pb-10 pt-16 text-sm text-white/70 md:px-9 md:pt-20">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 right-0 select-none font-display text-[26vw] leading-none text-white/[0.035] md:-bottom-24"
      >
        RIVR
      </span>
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-10 md:flex-row md:items-end">
          <div>
            <BrandMark dark />
            <p className="mt-6 max-w-md font-display text-3xl leading-tight text-white md:text-4xl">
              A quieter kind of luxury, by the water.
            </p>
          </div>
          <Link
            to="/booking"
            search={defaultStaySearch}
            className="btn-sheen inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3.5 text-xs font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90"
          >
            Plan your stay <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-[1.1fr_0.6fr_0.9fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
              The house
            </p>
            <p className="mt-4 max-w-xs text-xs leading-6">
              Thoughtful rooms and generous hospitality in {hotelInfo.city}, with
              the city and the water close at hand.
            </p>
            <p className="mt-5 text-[11px] text-white/40">
              Direct reservations · India · {hotelInfo.timeZone}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
              Explore
            </p>
            <div className="mt-4 grid gap-2.5 text-xs">
              {[
                ["/stay", "Stay with us"],
                ["/rooms", "Rooms & suites"],
                ["/amenities", "Amenities"],
                ["/about", "About RIVR"],
                ["/contact", "Contact"],
                ["/my-bookings", "My bookings"],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to as "/stay"}
                  className="w-fit transition-colors hover:text-[var(--accent)]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
              Contact
            </p>
            <div className="mt-4 grid gap-3 text-xs">
              <a
                href={`tel:${hotelInfo.phoneHref}`}
                className="flex items-start gap-2 transition-colors hover:text-white"
              >
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />{" "}
                {hotelInfo.phone}
              </a>
              <a
                href={`mailto:${hotelInfo.email}`}
                className="flex items-start gap-2 transition-colors hover:text-white"
              >
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />{" "}
                {hotelInfo.email}
              </a>
              <span className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />{" "}
                {hotelInfo.address}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
              Concierge
            </p>
            <p className="mt-4 text-xs leading-6">
              Planning something particular? Our team is happy to help with
              arrivals, celebrations, and stays that need a little more care.
            </p>
            <a
              href={`mailto:${hotelInfo.email}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-[var(--accent)]"
            >
              Write to the concierge <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-white/10 pt-6 text-[11px] text-white/40 md:flex-row">
          <span>
            © {new Date().getFullYear()} RIVR Hotel &amp; Residences · India
          </span>
          <span>Reservations are stored securely by the hotel team.</span>
        </div>
        {hotelInfo.isPlaceholder && (
          <p className="mt-3 max-w-4xl text-[10px] leading-5 text-white/30">
            {hotelInfo.notice}
          </p>
        )}
      </div>
    </footer>
  );
}
