import { ArrowRight, CalendarDays, DoorOpen, Loader2, Search, Users } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useNavigate } from "@tanstack/react-router";
import { addDays, dateAt, isDateOnly, isDateRangeValid } from "../../lib/hotel-data";
import {
  readStoredStaySearch,
  writeStoredStaySearch,
} from "../../lib/stay-search";

interface BookingSearchProps {
  compact?: boolean;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialRooms?: number;
}

export function BookingSearch({
  compact = false,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
  initialRooms,
}: BookingSearchProps) {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  // Catalog pages leave the initial values undefined so the last search is
  // restored for the session. Results pages pass all five from the URL, which
  // must win over the stored search.
  const [stored] = useState(readStoredStaySearch);
  const hasExplicitSearch = [
    initialCheckIn,
    initialCheckOut,
    initialAdults,
    initialChildren,
    initialRooms,
  ].every((value) => value !== undefined);
  const [checkIn, setCheckIn] = useState(
    initialCheckIn ?? stored?.checkIn ?? dateAt(1),
  );
  const [checkOut, setCheckOut] = useState(
    initialCheckOut ?? stored?.checkOut ?? dateAt(3),
  );
  const [adults, setAdults] = useState(initialAdults ?? stored?.adults ?? 2);
  const [children, setChildren] = useState(
    initialChildren ?? stored?.children ?? 0,
  );
  const [rooms, setRooms] = useState(initialRooms ?? stored?.rooms ?? 1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasExplicitSearch) return;
    setCheckIn(initialCheckIn ?? dateAt(1));
    setCheckOut(initialCheckOut ?? dateAt(3));
    setAdults(initialAdults ?? 2);
    setChildren(initialChildren ?? 0);
    setRooms(initialRooms ?? 1);
  }, [
    hasExplicitSearch,
    initialAdults,
    initialCheckIn,
    initialCheckOut,
    initialChildren,
    initialRooms,
  ]);

  useEffect(() => {
    writeStoredStaySearch({
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
      guests: adults + children,
    });
  }, [adults, checkIn, checkOut, children, rooms]);

  const today = dateAt(0);
  const minCheckOut = addDays(checkIn, 1);

  const changeCheckIn = (value: string) => {
    setCheckIn(value);
    if (isDateOnly(value) && value >= today && checkOut <= value) setCheckOut(addDays(value, 1));
    if (error) setError("");
  };

  const changeCheckOut = (value: string) => {
    setCheckOut(value);
    if (error) setError("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isDateOnly(checkIn) || checkIn < today) {
      setError("Choose a check-in date from today onward.");
      return;
    }
    if (!isDateOnly(checkOut) || !isDateRangeValid(checkIn, checkOut)) {
      setError("Choose a checkout date after your check-in date.");
      return;
    }
    if (adults < 1) {
      setError("At least one adult is required.");
      return;
    }
    if (rooms < 1) {
      setError("Choose at least one room.");
      return;
    }
    setError("");
    startTransition(() => {
      navigate({ to: "/search", search: { checkIn, checkOut, adults, children, rooms, guests: adults + children } });
    });
  };

  const pad = compact ? "p-2" : "p-2 md:p-2.5";

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Search room availability"
      className={`relative z-20 grid gap-1.5 rounded-[1.35rem] border border-[var(--line-2)] bg-[var(--elevated)] ${pad} shadow-[0_24px_70px_rgba(23,43,73,0.18)] md:grid-cols-2 lg:grid-cols-[1.05fr_1.05fr_0.8fr_0.8fr_0.8fr_auto]`}
    >
      <label className="group flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)] focus-within:bg-[var(--surface-2)]">
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--sage)]" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">Check in</span>
          <input
            required
            type="date"
            value={checkIn}
            min={today}
            onChange={(event) => changeCheckIn(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--text)] outline-none"
          />
        </span>
      </label>

      <label className="group flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)] focus-within:bg-[var(--surface-2)]">
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--sage)]" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">Check out</span>
          <input
            required
            type="date"
            value={checkOut}
            min={minCheckOut}
            onChange={(event) => changeCheckOut(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--text)] outline-none"
          />
        </span>
      </label>

      <div className="grid grid-cols-3 gap-1.5 md:contents">
        <SelectField icon={<Users className="h-4 w-4 text-[var(--sage)]" />} label="Adults" value={adults} setValue={setAdults} min={1} max={8} />
        <SelectField icon={<Users className="h-4 w-4 text-[var(--accent-strong)]" />} label="Children" value={children} setValue={setChildren} min={0} max={6} />
        <SelectField icon={<DoorOpen className="h-4 w-4 text-[var(--sage)]" />} label="Rooms" value={rooms} setValue={setRooms} min={1} max={4} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-wait disabled:opacity-70 md:col-span-2 lg:col-span-1"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 xl:hidden" />}
        <span className="hidden xl:inline">{isPending ? "Searching..." : "Search availability"}</span>
        <span className="xl:hidden">Search</span>
        <ArrowRight className="hidden h-4 w-4 xl:block" />
      </button>

      {error && (
        <p role="alert" className="col-span-full px-3 pb-1 text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </form>
  );
}

function SelectField({
  icon,
  label,
  value,
  setValue,
  min,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)] focus-within:bg-[var(--surface-2)] sm:px-3">
      <span className="hidden shrink-0 sm:block">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">{label}</span>
        <select
          aria-label={label}
          name={label.toLowerCase()}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="min-h-6 w-full bg-transparent text-sm text-[var(--text)] outline-none"
        >
          {Array.from({ length: max - min + 1 }, (_, index) => index + min).map((amount) => (
            <option value={amount} key={amount}>
              {amount}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
