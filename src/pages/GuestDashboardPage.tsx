import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  LogOut,
  Mail,
  ReceiptText,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BrandMark, StatusBadge } from "../components/hotel/HotelUi";
import { ThemeToggle } from "../components/hotel/ThemeToggle";
import { ApiError, api } from "../lib/api";
import {
  calculateNights,
  formatCurrency,
  formatDate,
  hotelInfo,
  type Guest,
  type Invoice,
  type Payment,
  type Reservation,
} from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

type Overview = {
  user: { id: string; name: string; email: string };
  guest: Guest | null;
  reservations: Reservation[];
  invoices: Invoice[];
  payments: Payment[];
};

type Notice = { text: string; tone: "success" | "error" | "info" };

const inputClass =
  "w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10";

export function GuestDashboardPage() {
  const { user, role, status, logout, systemSettings } = useHotel();
  const reduceMotion = useReducedMotion();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", state: "", postalCode: "" });

  const loadOverview = async () => {
    try {
      const data = await api.get<Overview>("/account/overview");
      setOverview(data);
      setForm({
        name: data.user.name,
        phone: data.guest?.phone ?? "",
        address: data.guest?.address ?? "",
        city: data.guest?.city ?? "",
        state: data.guest?.state ?? "",
        postalCode: data.guest?.postalCode ?? "",
      });
      setLoadError("");
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : "Your account could not be loaded.");
    }
  };

  useEffect(() => {
    if (status === "ready" && role === "customer") void loadOverview();
  }, [role, status]);

  const upcoming = useMemo(
    () =>
      (overview?.reservations ?? []).filter(
        (reservation) => !["checked-out", "cancelled", "no-show"].includes(reservation.status),
      ),
    [overview],
  );
  const past = useMemo(
    () =>
      (overview?.reservations ?? []).filter((reservation) =>
        ["checked-out", "cancelled", "no-show"].includes(reservation.status),
      ),
    [overview],
  );

  const upcomingNights = upcoming.reduce(
    (total, reservation) => total + Math.max(0, calculateNights(reservation.checkIn, reservation.checkOut)),
    0,
  );
  const outstanding = (overview?.invoices ?? []).reduce(
    (total, invoice) => total + Math.max(0, invoice.dueAmount),
    0,
  );

  if (status === "loading" || (status === "ready" && role === "customer" && !overview && !loadError)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] text-[var(--muted)]">
        <div className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm shadow-[var(--shadow-soft)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--sage)]" /> Loading your RIVR account…
        </div>
      </div>
    );
  }

  if (role !== "customer") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5 text-center">
        <div className="glass-card max-w-md rounded-[1.6rem] p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)]/15 text-[var(--accent-strong)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="mt-5 font-display text-4xl text-[var(--ink)]">Guest area</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {user ? "This area is for customer accounts. Use the staff workspace instead." : "Sign in to see your reservations."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login" className="btn-sheen rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]">
              Sign in
            </Link>
            <Link to="/" className="rounded-full border border-[var(--line-strong)] px-5 py-3 text-xs font-semibold text-[var(--ink)]">
              Guest website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const data = await api.patch<Overview>("/account/profile", form);
      setOverview(data);
      setNotice({ text: "Profile updated.", tone: "success" });
    } catch (caught) {
      setNotice({
        text: caught instanceof ApiError ? caught.message : "The profile could not be saved.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelReservation = async (id: string) => {
    if (!window.confirm("Cancel this reservation?")) return;
    setCancelling(id);
    setNotice(null);
    try {
      await api.post(`/account/reservations/${id}/cancel`);
      await loadOverview();
      setNotice({ text: "Reservation cancelled.", tone: "success" });
    } catch (caught) {
      setNotice({
        text: caught instanceof ApiError ? caught.message : "The reservation could not be cancelled.",
        tone: "error",
      });
    } finally {
      setCancelling("");
    }
  };

  const signOut = async () => {
    await logout();
    window.location.assign("/login");
  };

  const cutoff = systemSettings?.cancellationCutoffHours;
  const displayName = overview?.user.name ?? user?.name ?? "Guest";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const email = overview?.user.email ?? user?.email ?? "";
  const nextStay = upcoming[0];

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <header className="glass-header sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-3.5 md:px-10">
        <BrandMark />
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/" className="hidden text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)] sm:block">
            Guest website
          </Link>
          <ThemeToggle />
          <div className="hidden items-center gap-2.5 border-l border-[var(--line)] pl-3 md:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-bold text-[var(--on-primary)]">
              {initials}
            </span>
            <span className="hidden lg:block">
              <span className="block text-xs font-semibold text-[var(--ink)]">{displayName}</span>
              <span className="block text-[10px] text-[var(--faint)]">Guest account</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-full border border-[var(--line-2)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--danger)]/30 hover:text-[var(--danger)]"
          >
            <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-6 px-5 py-8 md:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[var(--deep)] px-6 py-8 text-white md:px-9 md:py-10">
          <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(194,163,107,0.28),transparent_70%)]" />
          <span className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(63,107,91,0.22),transparent_70%)]" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                <span className="h-px w-7 bg-[var(--accent)]" /> My RIVR
              </div>
              <h1 className="mt-4 font-display text-[clamp(2.6rem,5vw,4.2rem)] leading-[0.98] tracking-[-0.035em]">
                Welcome back, {firstName}.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">
                Your reservations, invoices and contact details in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/rooms"
                className="btn-sheen inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-xs font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90"
              >
                Book another stay <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href={`mailto:${hotelInfo.email}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-xs font-semibold text-white/85 transition-colors hover:border-[var(--accent)]"
              >
                <Mail className="h-4 w-4" /> Concierge
              </a>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Upcoming stays", value: String(upcoming.length), detail: nextStay ? `Next: ${formatDate(nextStay.checkIn)}` : "Nothing scheduled", icon: CalendarDays },
              { label: "Nights booked", value: String(upcomingNights), detail: "Across upcoming stays", icon: Clock3 },
              { label: "Outstanding", value: formatCurrency(outstanding), detail: "On open invoices", icon: CreditCard },
              { label: "Total stays", value: String(overview?.reservations.length ?? 0), detail: "In your RIVR history", icon: Check },
            ].map(({ label, value, detail, icon: Icon }, index) => (
              <motion.div
                key={label}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
                  <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                </div>
                <p className="mt-3 font-display text-2xl leading-none">{value}</p>
                <p className="mt-1.5 text-[10px] text-white/45">{detail}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <AnimatePresence>
          {loadError && (
            <motion.p
              key="load-error"
              role="alert"
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-xs text-[var(--danger)]"
            >
              {loadError}
            </motion.p>
          )}
          {notice && (
            <motion.p
              key={notice.text}
              role="status"
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${
                notice.tone === "error"
                  ? "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
                  : "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success)]"
              }`}
            >
              {notice.tone === "success" && <Check className="h-4 w-4" />}
              {notice.text}
            </motion.p>
          )}
        </AnimatePresence>

        <section className="glass-card rounded-[1.4rem] p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage)]">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--ink)]">Upcoming stays</h2>
                <p className="text-[11px] text-[var(--faint)]">{upcoming.length === 0 ? "No stays scheduled yet." : `${upcoming.length} reservation${upcoming.length === 1 ? "" : "s"} ahead`}</p>
              </div>
            </div>
            <Link to="/my-bookings" className="text-[11px] font-semibold text-[var(--sage)] transition-colors hover:text-[var(--ink)]">
              Find a booking <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-6 py-10 text-center">
              <p className="font-display text-2xl text-[var(--ink)]">The next stay is yours to plan.</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                Choose your dates and let us take care of the rest.
              </p>
              <Link to="/rooms" className="btn-sheen mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]">
                Explore rooms <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {upcoming.map((reservation) => (
                <div
                  key={reservation.id}
                  className="group relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 pl-5 transition-colors hover:border-[var(--accent)]/40"
                >
                  <span className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-[var(--accent)]/70" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--ink)]">{reservation.reference}</p>
                      <StatusBadge status={reservation.status} />
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)} · {reservation.adults + reservation.children} guest(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-xl text-[var(--ink)]">{formatCurrency(reservation.total)}</span>
                    {["pending", "confirmed"].includes(reservation.status) && (
                      <button
                        type="button"
                        onClick={() => void cancelReservation(reservation.id)}
                        disabled={cancelling === reservation.id}
                        className="rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--danger)]/30 hover:text-[var(--danger)] disabled:opacity-60"
                      >
                        {cancelling === reservation.id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {cutoff !== undefined && upcoming.length > 0 && (
            <p className="mt-4 text-[11px] text-[var(--faint)]">
              Cancellations must be made at least {cutoff} hours before check-in.
            </p>
          )}
        </section>

        {past.length > 0 && (
          <section className="glass-card rounded-[1.4rem] p-5 md:p-7">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Reservation history</h2>
            <div className="mt-4 grid gap-2">
              {past.map((reservation) => (
                <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 text-xs text-[var(--muted)] last:border-0">
                  <span className="font-semibold text-[var(--ink)]">{reservation.reference}</span>
                  <span>{formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}</span>
                  <StatusBadge status={reservation.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="glass-card rounded-[1.4rem] p-5 md:p-7">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--info-soft)] text-[var(--info)]">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Invoices &amp; payments</h2>
              <p className="text-[11px] text-[var(--faint)]">A record of your billing with RIVR.</p>
            </div>
          </div>
          {(overview?.invoices ?? []).length === 0 ? (
            <p className="mt-5 rounded-xl bg-[var(--surface-2)] px-4 py-5 text-sm text-[var(--muted)]">No invoices yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[var(--surface-2)] text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Issued</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.invoices ?? []).map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[var(--line)] transition-colors hover:bg-[var(--accent)]/5">
                      <td className="px-4 py-3 font-semibold text-[var(--ink)]">{invoice.number}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{formatDate(invoice.issuedAt.slice(0, 10))}</td>
                      <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">{formatCurrency(invoice.dueAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass-card rounded-[1.4rem] p-5 md:p-7">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)]/15 text-[var(--accent-strong)]">
              <UserRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Your profile</h2>
              <p className="text-[11px] text-[var(--faint)]">Keep your contact details current for your next stay.</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name", "Full name"],
                ["phone", "Phone"],
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["postalCode", "PIN code"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                <span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted-strong)]">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className={inputClass}
                />
              </label>
            ))}
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <p className="text-[11px] text-[var(--faint)]">Signed in as {email}</p>
              <button
                type="submit"
                disabled={saving}
                className="btn-sheen rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--on-primary)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
