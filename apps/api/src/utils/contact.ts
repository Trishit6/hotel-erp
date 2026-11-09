/**
 * Normalize contact details before comparing a booking verification attempt.
 * These functions are deliberately comparison-only: they never rewrite stored
 * guest profiles.
 */
export function normalizeEmailForMatch(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhoneForMatch(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}
