import { normalizeStaySearch, type StaySearch } from "./hotel-data";

/**
 * The last search is UI state, not a business record, so it lives in
 * sessionStorage: it survives public-page navigation and refreshes but not a
 * new browser session. Dates are re-validated on read so a stored range can
 * never become stale or invalid.
 */
const STORAGE_KEY = "rivr-stay-search";

export function readStoredStaySearch(): StaySearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeStaySearch(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function writeStoredStaySearch(search: StaySearch) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        adults: search.adults,
        children: search.children,
        rooms: search.rooms,
        guests: search.guests,
      }),
    );
  } catch {
    // Session storage can be unavailable (private mode); the search still
    // works, only cross-page memory is lost.
  }
}
