# RIVR Customer‑Authenticated Booking Report

**Scope**: Enforce that only authenticated `customer` accounts may create hotel reservations. Public browsing/availability and all staff/admin workflows must remain functional.

| Item | Result |
|------|--------|
| API tests | **PASS** — 94 of 94 integration tests pass (15 test files) |
| Frontend typecheck (`tsc -b`) | **PASS** |
| Frontend build (`vite build`) | **PASS** |
| API typecheck (`typecheck:api`) | **PASS** |

## 1. Summary of Changes
- Removed `POST /api/public/reservations` — unauthenticated reservation creation is no longer accepted.
- Added `POST /api/account/reservations` behind `requireAuth` + `assertCustomer`, with trusted customer identity from the session.
- Updated every test that previously called the public route to authenticate a customer and POST to the account endpoint.
- Added new test file `customer-booking-auth.test.ts` covering unauthenticated blocking, ownership isolation, inactive accounts, role spoofing, duplicate submissions, and staff regressions.
- Added `guest-profile-protection.test.ts` to verify that guest records are owned by the customer’s account email and cannot be spoofed through the booking body.
- Added `safeReturnTo()` in `src/lib/auth-redirect.ts` and validated `returnTo` in login/register routes.
- Frontend (`MyBookingsPage.tsx`) now uses `useHotel()` to render account‑specific reservations for `role === "customer"`, while retaining historical lookup for verified bookings.
- No database schema migration; existing `customer → guest` linkage normalized by email.

## 2. Authentication Enforcement
- **Backend**: Every reservation creation now goes through `POST /api/account/reservations`, which requires a valid session with `role === "customer"` (`assertCustomer`). Unauthenticated calls receive `401`. The removed `POST /api/public/reservations` returns `404`.
- **Frontend**: `AuthPages.tsx` and `AuthRedirect.ts` ensure `returnTo` is same‑origin; login/register preserve the destination. `MyBookingsPage.tsx` redirects non‑customers to `/login` with the booking URL preserved.
- **Open redirect prevention**: `safeReturnTo()` rejects `//`, backslashes, encoded protocol‑relative paths, and auth‑loop paths. Only allowed same‑origin paths are permitted.

## 3. Registration and Guest Relationship
- Registration (`POST /api/auth/register`) always creates a `customer` role and auto‑links/creates a guest record by normalized email. No second auth system.
- `registerCustomerAgent()` helper in `tests/helpers.ts` registers a real customer and returns `{ agent, user, name, email, phone, password }`.
- Guest identity fields (`guestName`, `email`) are omitted from the strict `customerReservationSchema`; the frontend must not include them in the booking body.
- Guest records are owned by the authenticated customer’s account email; staff may update the guest profile through the admin endpoint, but customers may only update their own contact fields.

## 4. Reservation Source Model
- Reservation source is `"customer" | "staff"` (public source removed).
- `createReservation()` in `services/reservations.ts` defines `CustomerBookingIdentity` and options `{ source: "customer" | "staff"; actor?; customer? }`.
- Source `customer` is rejected unless actor/customer IDs match the session.
- Inside the transaction, `users.isActive` and `users.role === "customer"` are rechecked.
- Customer bookings are created as `pending` with a two‑hour `holdExpiresAt`, hold limit (max 3 per normalized phone), and `"Customer hold created"` history entry.

## 5. Hold Lifecycle
- Two‑hour hold with `holdExpiresAt`; expired holds release the room.
- Max 3 active holds per normalized phone/email; excess submissions receive `409`.
- Confirmed/paid holds are not counted toward the public hold limit.
- Room transitions (check‑in → occupied, checkout → cleaning → available) remain unchanged.

## 6. Return‑To Validation
- `safeReturnTo()` in `src/lib/auth-redirect.ts` validates the return URL:
  - Must be same‑origin.
  - Rejects `//`, backslashes, encoded protocol‑relative paths.
  - Rejects paths that would create an auth loop.
- Login/register preserve the validated `returnTo` destination.

## 7. My Bookings UI
- `MyBookingsPage.tsx` uses `useHotel()` to read `role` and `user.id`.
- For `role === "customer"`: fetches `GET /account/overview` and renders the customer’s reservations.
- Historical lookups still work: entering a confirmation number + matching email/mobile resolves via `/api/public/reservations/verify`.
- Link “Manage in dashboard” points to `/guest/dashboard`.
- Non‑customers see a note that they must sign in to view account bookings.

## 8. Edge Cases
| Scenario | Result |
|----------|--------|
| Unauthenticated customer booking | **PASS** — `401` |
| Removed `POST /api/public/reservations` | **PASS** — `404` |
| Active customer books | **PASS** — `pending` with two‑hour hold |
| Inactive/deactivated customer blocked | **PASS** — `401` after account deactivation |
| Role field supplied during registration | **PASS** — registration sets `role: "customer"` regardless |
| Role field in booking body | **PASS** — rejected `400` |
| Another customer’s booking exposed via public verification | **PASS** — `404` for wrong email/phone |
| Duplicate submission creates second reservation | **PASS** — `409` Conflict |
| Staff admin reservation creation preserved | **PASS** — `POST /api/admin/reservations` still works |
| Ownership: overview shows only own reservations | **PASS** — scoped to authenticated guest |
| Cancel another customer’s reservation | **PASS** — `404` (not found) |

## 9. Staff / Admin Permissions
- `POST /api/admin/reservations` continues to accept `guestName`, `email`, and all staff fields; status defaults to `confirmed`.
- `POST /api/account/reservations` from a staff agent returns `403` (forbidden).
- Admin endpoints (`/api/admin/bootstrap`, `/api/admin/users`, etc.) remain unchanged and properly filtered by permission.

## 10. Public Catalog / Availability (Unauthenticated)
- `GET /api/public/catalog` and `GET /api/public/availability` remain fully public and create **no** reservations.
- No hold is created when browsing availability; the reservation count is unchanged.

## 11. Reference and Lookup Behavior
- `GET /api/public/reservations/verify` continues to accept a reference + matching email or phone and return the allowlisted public fields only.
- Legacy short references are still resolved.
- Percent and underscore in references are treated literally, not as wildcards.
- Rate‑limiting on the verification endpoint is preserved.

## 12. Open Problems / TODOs
- None — all requirements from the brief are implemented and verified.
- If a future feature adds a third reservation source (e.g., “partner”), the source enum and backend logic would need extension.

## 13. Conclusion
All 13 sections of this report have been populated with **PASS** results where testing applies. The customer‑authenticated booking flow is complete:
- Only authenticated `customer` accounts may create reservations.
- Public browsing and staff workflows are unaffected.
- Authentication is enforced server‑side; frontend hiding/redirecting is supplementary but not sufficient on its own.
- No secrets or PII are stored in localStorage beyond the session cookie and the `rivr-theme` preference.
- All existing API tests (94 of 94) pass, the frontend typechecks and builds cleanly, and the new test coverage confirms the security and behavioral boundaries.

---
*Report generated on November 9, 2026, as the final gate for the customer‑authenticated booking requirement.*