import {
  ArrowUpRight,
  BedDouble,
  Check,
  ChevronRight,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AnimatedNumber } from "../motion/AnimatedNumber";
import { dateAt, formatCurrency, type Room } from "../../lib/hotel-data";
import { useHotel } from "../../lib/hotel-store";

export function BrandMark({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className="group flex w-fit items-center gap-2.5" aria-label="RIVR home">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-[18deg] ${
          dark
            ? "border border-white/15 bg-white/10"
            : "border border-[var(--line)] bg-[var(--primary)]"
        }`}
      >
        <span className="h-3.5 w-3.5 rounded-full border border-[var(--accent)]" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={`text-sm font-semibold tracking-[0.24em] ${dark ? "text-white" : "text-[var(--ink)]"}`}
          >
            RIVR
          </span>
          <span
            className={`mt-1 text-[7px] font-medium uppercase tracking-[0.22em] ${
              dark ? "text-white/45" : "text-[var(--faint)]"
            }`}
          >
            Hotel &amp; Residences
          </span>
        </span>
      )}
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: "bg-[var(--success-soft)] text-[var(--success)]",
    confirmed: "bg-[var(--info-soft)] text-[var(--info)]",
    pending: "bg-[var(--warning-soft)] text-[var(--warning)]",
    occupied: "bg-[var(--warning-soft)] text-[var(--warning)]",
    reserved: "bg-[var(--violet-soft)] text-[var(--violet)]",
    cleaning: "bg-[var(--info-soft)] text-[var(--info)]",
    maintenance: "bg-[var(--danger-soft)] text-[var(--danger)]",
    "out-of-order": "bg-[var(--danger-soft)] text-[var(--danger)]",
    "checked-in": "bg-[var(--success-soft)] text-[var(--success)]",
    "checked-out": "bg-[var(--neutral-soft)] text-[var(--neutral)]",
    cancelled: "bg-[var(--danger-soft)] text-[var(--danger)]",
    "no-show": "bg-[var(--danger-soft)] text-[var(--danger)]",
    dirty: "bg-[var(--danger-soft)] text-[var(--danger)]",
    assigned: "bg-[var(--warning-soft)] text-[var(--warning)]",
    "in-progress": "bg-[var(--info-soft)] text-[var(--info)]",
    cleaned: "bg-[var(--success-soft)] text-[var(--success)]",
    inspected: "bg-[var(--success-soft)] text-[var(--success)]",
    paid: "bg-[var(--success-soft)] text-[var(--success)]",
    partial: "bg-[var(--warning-soft)] text-[var(--warning)]",
    refunded: "bg-[var(--neutral-soft)] text-[var(--neutral)]",
    completed: "bg-[var(--success-soft)] text-[var(--success)]",
    approved: "bg-[var(--success-soft)] text-[var(--success)]",
    rejected: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ring-current/10 ${styles[status] ?? "bg-[var(--surface-2)] text-[var(--muted)]"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replaceAll("-", " ")}
    </span>
  );
}

export function RoomVisual({
  room,
  compact = false,
}: {
  room: Room;
  compact?: boolean;
}) {
  const { getRoomType } = useHotel();
  const type = getRoomType(room.typeId);
  return (
    <div
      className={`relative overflow-hidden rounded-[1.2rem] bg-[var(--surface-3)] ${compact ? "h-24" : "h-48"}`}
    >
      <img
        src={type?.image}
        alt={`${type?.name ?? "Room"} interior`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/65 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white/90">
        <BedDouble className={compact ? "h-4 w-4" : "h-5 w-5"} />
        <span className={compact ? "text-[10px]" : "text-xs"}>
          Room {room.number}
        </span>
      </div>
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-strong)]">
      <span className="h-px w-6 bg-[var(--accent)]" aria-hidden="true" />
      <Sparkles className="h-3 w-3 text-[var(--accent-strong)]" aria-hidden="true" />
      {children}
    </div>
  );
}
export function FeatureLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-xs text-[var(--muted)]">
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success)]">
        <Check className="h-2.5 w-2.5" />
      </span>
      {children}
    </li>
  );
}
export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="glass-card rounded-[1.4rem] border-dashed p-10 text-center">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] text-[var(--accent-strong)]">
        <CircleAlert className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--faint)]">{copy}</p>
    </div>
  );
}
export function ArrowButton({ children }: { children: ReactNode }) {
  return (
    <span className="btn-sheen inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--on-primary)] transition-transform group-hover:translate-x-0.5">
      <span>{children}</span>
      <ArrowUpRight className="h-4 w-4" />
    </span>
  );
}
export function BackLink({
  to = "/",
  children,
}: {
  to?: "/" | "/search" | "/admin/dashboard";
  children: ReactNode;
}) {
  if (to === "/search")
    return (
      <Link
        to="/search"
        search={{
          checkIn: dateAt(1),
          checkOut: dateAt(3),
          adults: 2,
          children: 0,
          rooms: 1,
          guests: 2,
        }}
        className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        {children}
      </Link>
    );
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
    >
      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
      {children}
    </Link>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-card rounded-[1.35rem] ${className}`}>
      {children}
    </section>
  );
}
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sage",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "sage" | "blue" | "gold" | "rose";
}) {
  const tones = {
    sage: "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success)]",
    blue: "border-[var(--info)]/20 bg-[var(--info-soft)] text-[var(--info)]",
    gold: "border-[var(--accent)]/30 bg-[var(--warning-soft)] text-[var(--warning)]",
    rose: "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <Card className="metric-card group p-3.5 md:p-5">
      <span className="metric-glow" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div
          className={`grid h-9 w-9 place-items-center rounded-full border md:h-10 md:w-10 ${tones[tone]} transition-transform duration-300 group-hover:-rotate-6`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
          <span className="h-1 w-1 rounded-full bg-[var(--success)] animate-soft-pulse" />
          Live
        </span>
      </div>
      <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)] md:text-[10px] md:tracking-[0.16em]">{label}</p>
      <p className="mt-1.5 font-display text-[1.55rem] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)] sm:text-[1.9rem]">
        <AnimatedNumber value={value} />
      </p>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-[var(--accent)]/50 to-transparent" aria-hidden="true" />
      <p className="mt-2 text-[11px] leading-4 text-[var(--faint)]">{detail}</p>
    </Card>
  );
}
export function Money({ value }: { value: number }) {
  return <span>{formatCurrency(value)}</span>;
}
