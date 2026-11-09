import { useState } from "react";
import { ArrowRight, CalendarDays, Loader2, Mail, Search, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { SectionEyebrow, StatusBadge } from "../components/hotel/HotelUi";
import {
  defaultStaySearch,
  formatCurrency,
  formatDate,
  hotelInfo,
  type PublicReservation,
} from "../lib/hotel-data";
import { api } from "../lib/api";
import { setBookingConfirmation } from "../lib/booking-handoff";

export default function MyBookingsPage() {
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("");
  const [searched, setSearched] = useState(false);
  const [match, setMatch] = useState<PublicReservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedReference = reference.trim();
    const trimmedContact = contact.trim();
    if (!trimmedReference || !trimmedContact) return;

    setLoading(true);
    setError("");
    setSearched(true);
    setMatch(null);
    try {
      const result = await api.post<{ reservation: PublicReservation }>(
        "/public/reservations/verify",
        {
          reference: trimmedReference,
          ...(trimmedContact.includes("@")
            ? { email: trimmedContact }
            : { phone: trimmedContact }),
        },
      );
      setMatch(result.reservation);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The booking lookup failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
        <div className="text-center">
          <SectionEyebrow>Guest dashboard</SectionEyebrow>
          <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,4.8rem)] leading-[0.98] tracking-[-0.03em] text-[var(--ink)]">
            Your bookings.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">
            Enter your confirmation number together with the email or mobile
            number used for the booking. Both must match. No sign-in is
            required.
          </p>
        </div>

        <form
          onSubmit={runLookup}
          className="glass-card mx-auto mt-9 grid max-w-xl gap-3 rounded-2xl p-3 transition-colors focus-within:border-[var(--accent)] sm:grid-cols-[1fr_1fr_auto] sm:items-center"
        >
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[var(--faint)]" />
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              required
              autoComplete="off"
              placeholder="RIVR-XXXXXXXXXX"
              aria-label="Booking reference"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </label>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5">
            <Mail className="h-4 w-4 shrink-0 text-[var(--faint)]" />
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              required
              autoComplete="email"
              placeholder="Email or mobile"
              aria-label="Booking email or mobile number"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            data-cursor="Verify"
            className="btn-sheen flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{" "}
            {loading ? "Verifying…" : "Find booking"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-[var(--faint)]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]"
          >
            Sign in for a guest dashboard <ArrowRight className="h-3 w-3" />
          </Link>
          <span>·</span>
          <Link
            to="/booking"
            search={defaultStaySearch}
            className="font-semibold text-[var(--ink)]"
          >
            Book another stay
          </Link>
        </div>

        {searched && (
          <div className="mt-8 grid gap-3" aria-live="polite">
            {match && (
              <div className="lux-card rounded-[1.25rem] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">
                      {match.reference}
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-[var(--ink)]">
                      {match.roomTypeName} · Room {match.roomNumber}
                    </h2>
                  </div>
                  <StatusBadge status={match.status} />
                </div>
                <div className="mt-5 grid gap-3 text-xs text-[var(--muted)] sm:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[var(--sage)]" />
                    {formatDate(match.checkIn)} — {formatDate(match.checkOut)}
                  </span>
                  <span>{match.guestFirstName}</span>
                  <span className="font-semibold text-[var(--ink)]">
                    {formatCurrency(match.total)}
                  </span>
                </div>
                <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[var(--line)] pt-4 text-xs text-[var(--faint)] sm:flex-row sm:items-center">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--sage)]" />{" "}
                    Payment {match.paymentStatus}
                  </span>
                  <Link
                    to="/booking/success"
                    search={{}}
                    onClick={() => setBookingConfirmation(match)}
                    className="flex items-center gap-1.5 font-semibold text-[var(--ink)]"
                  >
                    View confirmation <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-[1.25rem] border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
            {!loading && !error && !match && (
              <div className="rounded-[1.25rem] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
                <Search className="mx-auto mb-3 h-6 w-6 text-[var(--faint)]" />
                <h2 className="font-display text-2xl text-[var(--ink)]">
                  No matching booking found.
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                  Check the confirmation number, email, or phone number and try
                  again. Both the reference and contact must match.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-[var(--line)] pt-8 text-center text-xs text-[var(--faint)]">
          <p>Need a hand finding your stay?</p>
          <a
            href={`mailto:${hotelInfo.email}`}
            className="flex items-center gap-1.5 font-semibold text-[var(--ink)]"
          >
            <Mail className="h-3.5 w-3.5 text-[var(--sage)]" /> {hotelInfo.email}
          </a>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
