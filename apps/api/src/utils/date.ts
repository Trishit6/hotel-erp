import { IST_TIME_ZONE } from "../constants";

const IST_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function currentIstParts() {
  const parts = IST_PARTS.formatToParts(new Date());
  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Today in Asia/Kolkata as YYYY-MM-DD. */
export function todayIst(): string {
  const { year, month, day } = currentIstParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Date at an offset from today in Asia/Kolkata, as YYYY-MM-DD. */
export function dateAt(offset: number): string {
  const { year, month, day } = currentIstParts();
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function isDateOnly(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

export function isDateRangeValid(checkIn: string, checkOut: string): boolean {
  return Boolean(checkIn && checkOut && calculateNights(checkIn, checkOut) > 0);
}

export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nowUtc(): Date {
  return new Date();
}
