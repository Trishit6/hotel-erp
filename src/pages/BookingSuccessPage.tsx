import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck2, CalendarPlus, Check, Copy, Loader2, Mail, MapPin, Sparkles } from "lucide-react";
import { Link, useSearch } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { SectionEyebrow } from "../components/hotel/HotelUi";
import { calculateNights, formatCurrency, formatDate, hotelInfo, type Guest, type Reservation, type Room, type RoomType } from "../lib/hotel-data";
import { api } from "../lib/api";

type ReservationDetail = { reservation: Reservation; guest: Guest; room: Room; roomType: RoomType };

function downloadCalendar(reservation: Reservation) {
  const start = reservation.checkIn.replaceAll("-", "");
  const end = reservation.checkOut.replaceAll("-", "");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RIVR Hotel & Residences//Reservation//EN",
    "BEGIN:VEVENT",
    `UID:${reservation.id}@rivr.hotel`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:RIVR Hotel stay — ${reservation.reference}`,
    `LOCATION:${hotelInfo.address.replaceAll(",", "\\,")}`,
    `DESCRIPTION:Reservation ${reservation.reference}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rivr-${reservation.reference}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BookingSuccessPage() {
  const { bookingId } = useSearch({ from: "/booking/success" });
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<ReservationDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    api
      .get<ReservationDetail>(`/public/reservations/${encodeURIComponent(bookingId)}`)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
        <PublicHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-5 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--sage)]" />
          <p className="text-sm text-[var(--muted)]">Loading your reservation…</p>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (state === "missing" || !detail) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
        <PublicHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
          <h1 className="font-display text-4xl text-[var(--ink)]">Reservation not found</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">The confirmation link may be incomplete. Search with your booking reference, email, or phone number.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/my-bookings" className="rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]">Find my booking</Link>
            <Link to="/" className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-xs font-semibold text-[var(--ink)]">Return home</Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const { reservation, guest, room, roomType: type } = detail;
  const nights = calculateNights(reservation.checkIn, reservation.checkOut);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reservation.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main className="mx-auto flex max-w-3xl flex-col items-center px-5 py-14 text-center md:py-20">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
          <Check className="h-8 w-8" />
        </div>
        <SectionEyebrow>Reservation confirmed</SectionEyebrow>
        <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,5rem)] leading-[0.98] tracking-[-0.03em] text-[var(--ink)]">We’ll see you by the water.</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">Your stay is reserved, {guest.name.split(" ")[0] ?? "friend"}. Keep this confirmation number handy.</p>

        <div className="mt-10 w-full rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 text-left shadow-[0_14px_45px_rgba(23,43,73,0.07)] md:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--faint)]">Confirmation</p>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="font-display text-3xl text-[var(--ink)]">{reservation.reference}</h2>
                <button type="button" onClick={copyReference} className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line-2)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]" aria-label="Copy confirmation number">
                  {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {copied && <span className="text-[11px] text-[var(--success)]">Copied</span>}
              </div>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)]">
              <CalendarCheck2 className="h-3.5 w-3.5" /> Confirmed
            </span>
          </div>

          <div className="grid gap-5 py-6 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--faint)]">Room</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{type?.name} · {room?.number}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--faint)]">Stay</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{formatDate(reservation.checkIn)} — {formatDate(reservation.checkOut)}</p>
              <p className="mt-0.5 text-[11px] text-[var(--faint)]">{nights} {nights === 1 ? "night" : "nights"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--faint)]">Estimated total</p>
              <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{formatCurrency(reservation.total)}</p>
              <p className="mt-0.5 text-[11px] capitalize text-[var(--faint)]">Payment {reservation.paymentStatus}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3.5 py-3 text-xs text-[var(--muted)]">
            <Mail className="h-4 w-4 text-[var(--sage)]" /> A confirmation has been recorded for {guest.email}.
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => downloadCalendar(reservation)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 py-3 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]">
              <CalendarPlus className="h-4 w-4" /> Add to calendar
            </button>
            <Link to="/my-bookings" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)]">
              View my bookings <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--faint)]">
          <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[var(--sage)]" /> {hotelInfo.city}, {hotelInfo.state}</span>
          <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[var(--accent-strong)]" /> Thank you for choosing a slower stay.</span>
        </div>
        <Link to="/" className="group mt-8 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          Return to RIVR
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] transition-transform group-hover:translate-x-1">
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
