import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Leaf,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "../components/hotel/PublicChrome";
import { RoomVisual, SectionEyebrow } from "../components/hotel/HotelUi";
import {
  calculateNights,
  formatCurrency,
  formatDate,
  indianStates,
  isDateRangeValid,
  isIndianPhone,
  isIndianPin,
  taxConfig,
} from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

const emptyForm = {
  guestName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  specialRequests: "",
};

export default function BookingPage() {
  const { roomId } = useParams({ from: "/book/$roomId" });
  const search = useSearch({ from: "/book/$roomId" });
  const navigate = useNavigate();
  const {
    getRoom,
    getRoomType,
    createReservation,
    isRoomAvailable,
    status,
    error: loadError,
  } = useHotel();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const room = getRoom(roomId);
  const type = room ? getRoomType(room.typeId) : undefined;
  const nights = calculateNights(search.checkIn, search.checkOut);
  const datesValid = isDateRangeValid(search.checkIn, search.checkOut);
  const available = room
    ? isRoomAvailable(room.id, search.checkIn, search.checkOut)
    : false;

  const preview = useMemo(() => {
    if (!type || nights < 1) return { roomCharges: 0, tax: 0, total: 0 };
    const roomCharges = nights * type.rate;
    const tax = Math.round(roomCharges * taxConfig.rate);
    return { roomCharges, tax, total: roomCharges + tax };
  }, [nights, type]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] px-6 py-5 text-sm text-[var(--muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--sage)]" />{" "}
          Loading your room…
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5">
        <div className="max-w-md rounded-[1.4rem] border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-8 text-center text-sm text-[var(--danger)]">
          {loadError ??
            "The booking service could not be reached. Please try again."}
        </div>
      </div>
    );
  }

  if (!room || !type) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5">
        <div className="max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
          <h1 className="font-display text-3xl text-[var(--ink)]">
            Room not found
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This room is no longer part of the current inventory.
          </p>
          <Link
            to="/booking"
            search={search}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]"
          >
            Back to available rooms <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!datesValid) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5">
        <div className="max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
          <CalendarDays className="mx-auto h-7 w-7 text-[var(--accent-strong)]" />
          <h1 className="mt-3 font-display text-3xl text-[var(--ink)]">
            Those dates need another look.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Check-out must be after check-in, and check-in cannot be in the
            past.
          </p>
          <Link
            to="/booking"
            search={search}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]"
          >
            Choose new dates <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isIndianPhone(form.phone)) {
      setError(
        "Enter a valid Indian mobile number, for example +91 98765 43210.",
      );
      return;
    }
    if (form.postalCode && !isIndianPin(form.postalCode)) {
      setError("Enter a valid 6-digit Indian PIN code.");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await createReservation({
      ...form,
      roomId: room.id,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      adults: search.adults,
      children: search.children,
      discount: 0,
    });
    setSubmitting(false);
    if (result.error || !result.reservation) {
      setError(result.error ?? "The reservation could not be confirmed.");
      return;
    }
    startTransition(() => {
      navigate({
        to: "/booking/success",
        search: { bookingId: result.reservation!.id },
      });
    });
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 md:px-10">
        <div className="mb-7 mt-10">
          <Link
            to="/booking"
            search={search}
            className="inline-flex items-center gap-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to available
            rooms
          </Link>
          <div className="mt-5">
            <SectionEyebrow>Complete your stay</SectionEyebrow>
            <h1 className="mt-3 font-display text-[clamp(2.5rem,4.6vw,4.1rem)] leading-[1.02] tracking-[-0.03em] text-[var(--ink)]">
              Reserve room {room.number}.
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {formatDate(search.checkIn)} — {formatDate(search.checkOut)} ·{" "}
              {search.adults} adults · {search.children} children
            </p>
          </div>
        </div>

        {!available && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              This room is no longer available for the selected dates.
            </span>
            <Link
              to="/booking"
              search={search}
              className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4"
            >
              See available rooms <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.78fr]">
          <form
            onSubmit={submit}
            className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_35px_rgba(23,43,73,0.05)] md:p-8"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">
                  Guest details
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  We use these details to confirm your stay.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--success)]">
                <LockKeyhole className="h-3.5 w-3.5" /> Instant confirmation
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                  Full name
                </span>
                <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
                  <UserRound className="h-4 w-4 text-[var(--faint)]" />
                  <input
                    required
                    value={form.guestName}
                    onChange={(event) =>
                      update("guestName", event.target.value)
                    }
                    placeholder="Aarav Mehta"
                    autoComplete="name"
                    className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
                  />
                </span>
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                  Email
                </span>
                <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
                  <Mail className="h-4 w-4 text-[var(--faint)]" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
                  />
                </span>
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                  Indian mobile number
                </span>
                <span className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 transition-colors focus-within:border-[var(--sage)]">
                  <Phone className="h-4 w-4 text-[var(--faint)]" />
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
                  />
                </span>
              </label>
            </div>

            <div className="mt-7 border-t border-[var(--line)] pt-5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--sage)]" />
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  Billing address{" "}
                  <span className="font-normal text-[var(--faint)]">
                    (optional)
                  </span>
                </h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Add a billing address if you need it on the invoice. No payment
                is collected online; settle at the hotel or by bank transfer.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                    Address
                  </span>
                  <input
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    autoComplete="street-address"
                    placeholder="Street address"
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                    City
                  </span>
                  <input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    autoComplete="address-level2"
                    placeholder="Mumbai"
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                    State
                  </span>
                  <select
                    value={form.state}
                    onChange={(event) => update("state", event.target.value)}
                    autoComplete="address-level1"
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--sage)]"
                  >
                    <option value="">Select a state</option>
                    {indianStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                    PIN code
                  </span>
                  <input
                    value={form.postalCode}
                    onChange={(event) =>
                      update(
                        "postalCode",
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    autoComplete="postal-code"
                    inputMode="numeric"
                    placeholder="400001"
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-semibold text-[var(--muted-strong)]">
                    Special requests
                  </span>
                  <textarea
                    value={form.specialRequests}
                    onChange={(event) =>
                      update("specialRequests", event.target.value)
                    }
                    rows={3}
                    maxLength={500}
                    placeholder="Arrival notes, accessibility needs, or preferences"
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--sage)]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
              <CreditCard className="h-4 w-4 text-[var(--sage)]" /> Instant
              confirmation. No payment is collected online.
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-2.5 text-xs font-medium text-[var(--danger)]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !available}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Confirming..." : "Confirm reservation"}{" "}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-[var(--faint)]">
              By confirming, you agree to the rate and stay dates shown here.
              Your reservation is saved to the hotel system.
            </p>
          </form>

          <aside className="h-fit overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] shadow-[0_10px_35px_rgba(23,43,73,0.05)]">
            <RoomVisual room={room} />
            <div className="p-5 md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sage)]">
                Your room
              </p>
              <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
                {type.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Sleeps {type.capacity}
                </span>
                <span>{type.size} m²</span>
                <span className="flex items-center gap-1.5">
                  <Leaf className="h-3.5 w-3.5" /> {nights}{" "}
                  {nights === 1 ? "night" : "nights"}
                </span>
              </div>

              <ul className="mt-5 grid gap-2.5">
                {type.amenities.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs text-[var(--muted)]"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--success)]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-2 border-t border-[var(--line)] pt-5 text-xs">
                <div className="flex items-center justify-between text-[var(--muted)]">
                  <span>
                    {formatCurrency(type.rate)} × {nights}{" "}
                    {nights === 1 ? "night" : "nights"}
                  </span>
                  <span>{formatCurrency(preview.roomCharges)}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--muted)]">
                  <span>{taxConfig.label}</span>
                  <span>{formatCurrency(preview.tax)}</span>
                </div>
                <div className="mt-1 flex items-end justify-between border-t border-[var(--line)] pt-3">
                  <span className="font-semibold text-[var(--ink)]">
                    Estimated total
                  </span>
                  <span className="font-display text-2xl text-[var(--ink)]">
                    {formatCurrency(preview.total)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[var(--faint)]">
                {taxConfig.note}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
