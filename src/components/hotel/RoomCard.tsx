import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, BedDouble, Maximize2, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatCurrency, type Room, type StaySearch } from "../../lib/hotel-data";
import { useHotel } from "../../lib/hotel-store";
import { FeatureLine, StatusBadge } from "./HotelUi";

export function RoomCard({ room, search }: { room: Room; search: StaySearch }) {
  const { getRoomType } = useHotel();
  const type = getRoomType(room.typeId);
  const reduceMotion = useReducedMotion();
  if (!type) return null;

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -5 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[var(--surface)] shadow-[0_10px_35px_rgba(23,43,73,0.05)] transition-shadow hover:shadow-[0_22px_55px_rgba(23,43,73,0.12)]"
    >
      <div className="relative h-52 overflow-hidden bg-[var(--surface-3)] sm:h-56">
        <img
          src={type.image}
          alt={`${type.name} interior at RIVR`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep)]/65 via-transparent to-transparent" />
        <div className="absolute left-4 top-4">
          <StatusBadge status="available" />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white/90">
          <BedDouble className="h-4 w-4" />
          <span className="text-xs">Room {room.number}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sage)]">{type.name}</p>
        <h3 className="mt-1 font-display text-2xl leading-tight text-[var(--ink)]">Room {room.number}</h3>
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
          <div>
            <span className="font-display text-2xl text-[var(--ink)]">{formatCurrency(type.rate)}</span>
            <span className="ml-1 text-xs text-[var(--faint)]">/ night</span>
          </div>
          <Link
            to="/book/$roomId"
            params={{ roomId: room.id }}
            search={search}
            aria-label={`Reserve room ${room.number}, ${type.name}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Reserve <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
