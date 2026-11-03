import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Maximize2, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatCurrency, type RoomType, type StaySearch } from "../../lib/hotel-data";
import { FeatureLine } from "./HotelUi";

export function RoomTypeCard({ type, search, compact = false }: { type: RoomType; search: StaySearch; compact?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -5 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[var(--surface)] shadow-[0_10px_35px_rgba(23,43,73,0.05)] transition-shadow hover:shadow-[0_22px_55px_rgba(23,43,73,0.12)]"
    >
      <div className={`relative overflow-hidden bg-[var(--surface-3)] ${compact ? "h-44" : "h-56"}`}>
        <img
          src={type.image}
          alt={`${type.name} interior at RIVR`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/60 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-[var(--glass-strong)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--on-glass)] backdrop-blur">
          {type.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl leading-tight text-[var(--ink)]">{type.name}</h3>
          <div className="text-right">
            <span className="font-display text-xl text-[var(--ink)]">{formatCurrency(type.rate)}</span>
            <span className="block text-[10px] text-[var(--faint)]">per night</span>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{type.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--faint)]">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Up to {type.capacity} guests
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="h-3.5 w-3.5" /> {type.size} m²
          </span>
        </div>

        <ul className="mt-4 grid gap-2">
          {type.amenities.slice(0, 3).map((amenity) => (
            <FeatureLine key={amenity}>{amenity}</FeatureLine>
          ))}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--line)] pt-4">
          <span className="text-[11px] text-[var(--faint)]">Rates in INR · taxes at checkout</span>
          <Link
            to="/booking"
            search={search}
            aria-label={`Check availability for ${type.name}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Check dates <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
