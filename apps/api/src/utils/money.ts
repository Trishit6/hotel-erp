/**
 * Authoritative money handling: values are stored as DECIMAL strings in the
 * database and all arithmetic is performed on integer paise.
 */

const MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

export function toPaise(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid monetary value.");
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (!MONEY_PATTERN.test(trimmed)) throw new Error(`Invalid monetary value: ${value}`);
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = unsigned.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -paise : paise;
}

export function fromPaise(paise: number): string {
  if (!Number.isFinite(paise)) throw new Error("Invalid paise amount.");
  const rounded = Math.round(paise);
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function addPaise(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

export function subtractPaise(amount: number, deduction: number): number {
  return amount - deduction;
}

/** Apply a rate expressed in basis points using integer arithmetic. */
export function applyBasisPoints(paise: number, basisPoints: number): number {
  return Math.round((paise * basisPoints) / 10_000);
}

export function minPaise(...amounts: number[]): number {
  return Math.min(...amounts);
}
