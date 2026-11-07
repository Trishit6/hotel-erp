import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Loader2, LogOut, ReceiptText, UserRound } from "lucide-react";
import { BrandMark } from "../components/hotel/HotelUi";
import { ThemeToggle } from "../components/hotel/ThemeToggle";
import { ApiError, api } from "../lib/api";
import { formatCurrency, formatDate, type Guest, type Invoice, type Payment, type Reservation } from "../lib/hotel-data";
import { useHotel } from "../lib/hotel-store";

type Overview = {
  user: { id: string; name: string; email: string };
  guest: Guest | null;
  reservations: Reservation[];
  invoices: Invoice[];
  payments: Payment[];
};

const statusTone: Record<string, string> = {
  confirmed: "bg-[var(--info-soft)] text-[var(--info)]",
  pending: "bg-[var(--warning-soft)] text-[var(--warning)]",
  "checked-in": "bg-[var(--success-soft)] text-[var(--success)]",
  "checked-out": "bg-[var(--surface-2)] text-[var(--muted)]",
  cancelled: "bg-[var(--danger-soft)] text-[var(--danger)]",
  "no-show": "bg-[var(--danger-soft)] text-[var(--danger)]",
  paid: "bg-[var(--success-soft)] text-[var(--success)]",
  partial: "bg-[var(--warning-soft)] text-[var(--warning)]",
  refunded: "bg-[var(--surface-2)] text-[var(--muted)]",
};

export function GuestDashboardPage() {
  const { user, role, status, logout, systemSettings } = useHotel();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
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

  if (status === "loading" || (status === "ready" && role === "customer" && !overview && !loadError)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] text-[var(--muted)]">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--sage)]" /> Loading your RIVR account…
        </div>
      </div>
    );
  }

  if (role !== "customer") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5 text-center">
        <div className="max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-8">
          <h1 className="font-display text-3xl text-[var(--ink)]">Guest area</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {user ? "This area is for customer accounts. Use the staff workspace instead." : "Sign in to see your reservations."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login" className="rounded-full bg-[var(--primary)] px-5 py-3 text-xs font-semibold text-[var(--on-primary)]">
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
    setNotice("");
    try {
      const data = await api.patch<Overview>("/account/profile", form);
      setOverview(data);
      setNotice("Profile updated.");
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "The profile could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const cancelReservation = async (id: string) => {
    if (!window.confirm("Cancel this reservation?")) return;
    setCancelling(id);
    setNotice("");
    try {
      await api.post(`/account/reservations/${id}/cancel`);
      await loadOverview();
      setNotice("Reservation cancelled.");
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.message : "The reservation could not be cancelled.");
    } finally {
      setCancelling("");
    }
  };

  const signOut = async () => {
    await logout();
    window.location.assign("/login");
  };

  const cutoff = systemSettings?.cancellationCutoffHours;

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)]/85 px-5 py-4 backdrop-blur md:px-10">
        <BrandMark />
        <div className="flex items-center gap-3">
          <Link to="/" className="hidden text-xs text-[var(--muted)] sm:block">
            Guest website
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--line-2)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-6 px-5 py-8 md:px-8 lg:py-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sage)]">My RIVR</p>
          <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Welcome back, {overview?.user.name.split(" ")[0] ?? user?.name.split(" ")[0]}.</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your reservations, invoices and contact details in one place.
          </p>
        </div>

        {loadError && (
          <p role="alert" className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-xs text-[var(--danger)]">
            {loadError}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-[var(--info)]/25 bg-[var(--info-soft)] px-4 py-3 text-xs text-[var(--info)]">
            {notice}
          </p>
        )}

        <section className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--sage)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">Upcoming stays</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No upcoming reservations.{" "}
              <Link to="/rooms" className="font-semibold text-[var(--sage)] underline underline-offset-4">
                Book a stay
              </Link>
              .
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {upcoming.map((reservation) => (
                <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink)]">{reservation.reference}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)} · {reservation.adults + reservation.children} guest(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusTone[reservation.status] ?? ""}`}>
                      {reservation.status}
                    </span>
                    <span className="text-xs font-semibold text-[var(--ink)]">{formatCurrency(reservation.total)}</span>
                    {["pending", "confirmed"].includes(reservation.status) && (
                      <button
                        type="button"
                        onClick={() => void cancelReservation(reservation.id)}
                        disabled={cancelling === reservation.id}
                        className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-60"
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
            <p className="mt-3 text-[11px] text-[var(--faint)]">
              Cancellations must be made at least {cutoff} hours before check-in.
            </p>
          )}
        </section>

        {past.length > 0 && (
          <section className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Reservation history</h2>
            <div className="mt-3 grid gap-2">
              {past.map((reservation) => (
                <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] py-2 text-xs text-[var(--muted)] last:border-0">
                  <span className="font-semibold text-[var(--ink)]">{reservation.reference}</span>
                  <span>{formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone[reservation.status] ?? ""}`}>{reservation.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[var(--sage)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">Invoices & payments</h2>
          </div>
          {(overview?.invoices ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No invoices yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
                  <tr>
                    <th className="py-2">Invoice</th>
                    <th className="py-2">Issued</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.invoices ?? []).map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[var(--line)]">
                      <td className="py-2 font-semibold text-[var(--ink)]">{invoice.number}</td>
                      <td className="py-2 text-[var(--muted)]">{formatDate(invoice.issuedAt.slice(0, 10))}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone[invoice.status] ?? ""}`}>{invoice.status}</span>
                      </td>
                      <td className="py-2 text-right font-semibold text-[var(--ink)]">{formatCurrency(invoice.dueAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[var(--sage)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">Your profile</h2>
          </div>
          <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
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
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted-strong)]">{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--sage)]"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--on-primary)] disabled:opacity-60"
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
