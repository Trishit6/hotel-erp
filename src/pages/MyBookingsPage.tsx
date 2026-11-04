import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, Mail, Search, ShieldCheck } from "lucide-react";
import { Link, useSearch } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { SectionEyebrow, StatusBadge } from "../components/hotel/HotelUi";
import { defaultStaySearch, formatCurrency, formatDate, hotelInfo, type Guest, type Reservation, type Room, type RoomType } from "../lib/hotel-data";
import { api } from "../lib/api";

type ReservationDetail = { reservation: Reservation; guest: Guest; room: Room; roomType: RoomType };

export default function MyBookingsPage() {
  const search = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState(search.q ?? "");
  const [searched, setSearched] = useState(Boolean(search.q));
  const [matches, setMatches] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runLookup = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const result = await api.get<{ reservations: ReservationDetail[] }>(
        `/public/reservations/lookup?q=${encodeURIComponent(trimmed)}`,
      );
      setMatches(result.reservations);
    } catch (caught) {
      setMatches([]);
      setError(caught instanceof Error ? caught.message : "The booking lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search.q) void runLookup(search.q);
    // The initial query is only used once; subsequent searches come from the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
        <div className="text-center">
          <SectionEyebrow>Guest dashboard</SectionEyebrow>
          <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,4.8rem)] leading-[0.98] tracking-[-0.03em] text-[var(--ink)]">Your bookings.</h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">Enter your confirmation number, booking email, or phone number to find a stay. No sign-in is required.</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runLookup(query);
          }}
          className="mx-auto mt-9 flex max-w-xl gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_10px_35px_rgba(23,43,73,0.06)]"
        >
          <Search className="ml-3 mt-3 h-4 w-4 shrink-0 text-[var(--faint)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            required
            placeholder="Reference, email, or phone"
            aria-label="Confirmation number, booking email, or phone"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
          />
          <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {loading ? "Searching…" : "Find booking"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-[var(--faint)]">
          <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">Sign in for a guest dashboard <ArrowRight className="h-3 w-3" /></Link>
          <span>·</span>
          <Link to="/booking" search={defaultStaySearch} className="font-semibold text-[var(--ink)]">Book another stay</Link>
        </div>

        {searched && (
          <div className="mt-8 grid gap-3" aria-live="polite">
            {matches.length > 0 && (
              <p className="text-center text-xs text-[var(--faint)]">
                {matches.length} {matches.length === 1 ? "booking" : "bookings"} found
              </p>
            )}
            {matches.map(({ reservation, guest, room, roomType }) => (
              <div key={reservation.id} className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_8px_28px_rgba(31,43,60,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">{reservation.reference}</p>
                    <h2 className="mt-1 font-display text-2xl text-[var(--ink)]">{roomType.name} · Room {room.number}</h2>
                  </div>
                  <StatusBadge status={reservation.status} />
                </div>
                <div className="mt-5 grid gap-3 text-xs text-[var(--muted)] sm:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[var(--sage)]" />
                    {formatDate(reservation.checkIn)} — {formatDate(reservation.checkOut)}
                  </span>
                  <span>{guest.name}</span>
                  <span className="font-semibold text-[var(--ink)]">{formatCurrency(reservation.total)}</span>
                </div>
                <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[var(--line)] pt-4 text-xs text-[var(--faint)] sm:flex-row sm:items-center">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--sage)]" /> Payment {reservation.paymentStatus}
                  </span>
                  <Link to="/booking/success" search={{ bookingId: reservation.id }} className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                    View confirmation <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {error && (
              <div className="rounded-[1.25rem] border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]">{error}</div>
            )}
            {!loading && !error && matches.length === 0 && (
              <div className="rounded-[1.25rem] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
                <Search className="mx-auto mb-3 h-6 w-6 text-[var(--faint)]" />
                <h2 className="font-display text-2xl text-[var(--ink)]">No matching booking found.</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Check the confirmation number, email, or phone number and try again.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-[var(--line)] pt-8 text-center text-xs text-[var(--faint)]">
          <p>Need a hand finding your stay?</p>
          <a href={`mailto:${hotelInfo.email}`} className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
            <Mail className="h-3.5 w-3.5 text-[var(--sage)]" /> {hotelInfo.email}
          </a>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
