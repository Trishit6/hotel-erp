import type { PublicReservation } from "./hotel-data";

const KEY = "rivr-booking-confirmation";

/**
 * Hand the already-allowlisted creation response to the confirmation page for
 * this tab only. The value is removed on read, so it does not become a durable
 * store of guest information the way localStorage would.
 */
export function setBookingConfirmation(value: PublicReservation): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // The success page will fall back to the verified lookup form.
  }
}

export function takeBookingConfirmation(): PublicReservation | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
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
