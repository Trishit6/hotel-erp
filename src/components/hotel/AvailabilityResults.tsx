import { useMemo } from "react";
import { ArrowRight, CalendarDays, Loader2, SlidersHorizontal, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BookingSearch } from "./BookingSearch";
import { PageAtmosphere } from "./Cinematic";
import { PublicFooter, PublicHeader } from "./PublicChrome";
import { Reveal } from "./Reveal";
import { RoomCard } from "./RoomCard";
import { SectionEyebrow } from "./HotelUi";
import { formatDate, type StaySearch } from "../../lib/hotel-data";
import { useHotel } from "../../lib/hotel-store";

export function AvailabilityResults({ search }: { search: StaySearch }) {
  const { getAvailableRooms, getRoomType, status, error } = useHotel();
  const available = useMemo(
    () =>
      [...getAvailableRooms(search.checkIn, search.checkOut, search.adults + search.children)].sort(
        (a, b) => (getRoomType(a.typeId)?.rate ?? 0) - (getRoomType(b.typeId)?.rate ?? 0),
      ),
    [getAvailableRooms, getRoomType, search.adults, search.checkIn, search.checkOut, search.children],
  );

  return (
    <div className="relative min-h-screen text-[var(--text)]">
      <PageAtmosphere />
      <PublicHeader />
      <main className="relative mx-auto max-w-7xl px-5 pb-20 md:px-10">
        <div className="hero-ambient pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" aria-hidden="true" />
        <div className="hero-lines pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-30" aria-hidden="true" />
        <div className="mb-8 mt-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <SectionEyebrow>Find your room</SectionEyebrow>
            <h1 className="mt-3 font-display text-[clamp(2.8rem,5vw,4.6rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">Your next stay starts here.</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--sage)]" /> {formatDate(search.checkIn)} — {formatDate(search.checkOut)}
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--sage)]" /> {search.adults} adults · {search.children} children
              </span>
              <span className="rounded-full border border-[var(--line-2)] px-2.5 py-1 text-[11px] font-medium">{search.rooms} {search.rooms === 1 ? "room" : "rooms"}</span>
            </div>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2.5 text-xs text-[var(--muted)]">
            <SlidersHorizontal className="h-4 w-4 text-[var(--sage)]" /> Best available rates
          </div>
        </div>

        <BookingSearch
          compact
          initialCheckIn={search.checkIn}
          initialCheckOut={search.checkOut}
          initialAdults={search.adults}
          initialChildren={search.children}
          initialRooms={search.rooms}
        />

        <div className="mt-10 flex flex-col justify-between gap-2 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center" aria-live="polite">
          <p className="text-sm text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)]">{available.length} {available.length === 1 ? "room" : "rooms"}</span> available for this stay
            {search.rooms > 1 && <span className="text-[var(--faint)]"> · {search.rooms} rooms requested</span>}
          </p>
          <span className="text-xs text-[var(--faint)]">Rates per night · taxes calculated at checkout</span>
        </div>

        {status === "loading" ? (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-12 text-sm text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--sage)]" /> Loading live availability…
          </div>
        ) : status === "error" ? (
          <div className="mt-8 rounded-[1.4rem] border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-8 text-center text-sm text-[var(--danger)]">{error ?? "Live availability could not be loaded. Please try again."}</div>
        ) : available.length === 0 ? (
          <div className="mt-8 rounded-[1.4rem] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-12 text-center">
            <CalendarDays className="mx-auto mb-4 h-7 w-7 text-[var(--faint)]" />
            <h2 className="font-display text-3xl text-[var(--ink)]">No rooms fit those dates.</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Try a different date range or a smaller party. The search above will update the results immediately.</p>
            <Link to="/rooms" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sage)]">
              Explore all rooms <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {available.map((room, index) => (
              <Reveal key={room.id} delay={Math.min(index * 0.04, 0.2)}>
                <RoomCard room={room} search={search} />
              </Reveal>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-[var(--faint)] sm:text-left">Each reservation secures one room. For more than one room, complete a separate reservation per room.</p>
      </main>
      <PublicFooter />
    </div>
  );
}
