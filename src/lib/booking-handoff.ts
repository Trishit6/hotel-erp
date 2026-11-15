import type { PublicReservation } from "./hotel-data";

const KEY = "rivr-booking-confirmation";

/**
 * Hand the already-allowlisted creation response to the confirmation page for
 * this tab only. sessionStorage (not localStorage) keeps the value out of other
 * tabs and clears it when the tab closes.
 */
export function setBookingConfirmation(value: PublicReservation): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // The success page will fall back to the verified lookup form.
  }
}

/**
 * Read without consuming. The page must survive a refresh (and React
 * StrictMode's double render); the handoff is tab-scoped rather than a durable
 * store of guest information.
 */
export function readBookingConfirmation(): PublicReservation | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PublicReservation>;
    if (
      typeof value.reference !== "string" ||
      typeof value.status !== "string" ||
      typeof value.checkIn !== "string" ||
      typeof value.checkOut !== "string" ||
      typeof value.roomTypeName !== "string" ||
      typeof value.roomNumber !== "string" ||
      typeof value.guestFirstName !== "string" ||
      typeof value.total !== "number" ||
      typeof value.paidAmount !== "number" ||
      typeof value.paymentStatus !== "string"
    ) {
      return null;
    }
    return value as PublicReservation;
  } catch {
    return null;
  }
}

/** Explicit clear when the guest leaves the confirmation for a new journey. */
export function clearBookingConfirmation(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage is optional */
  }
}
