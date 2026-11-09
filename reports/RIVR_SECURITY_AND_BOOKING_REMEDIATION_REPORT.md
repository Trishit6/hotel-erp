# RIVR Hotel ERP — Security, Booking Logic & Reliability Remediation

Date: 2026-11-09

## 1. Executive summary

The eight requested remediation tasks were worked in priority order against the local working tree. Tasks 1–8 are **PASS** for the code paths and checks listed below. The full project gate passed: `pnpm exec tsc -b && pnpm build && pnpm typecheck:api && pnpm test:api` exited `0`, and all 84 API integration tests passed (14 files).

The highest-risk issues were confirmed and corrected:

- Public reservation data was accessible through reference-only and broad lookup paths. Access is now a POST verification requiring an exact reference plus exactly one matching email or phone, returning a strict allowlist.
- Public bookings could overwrite existing guest profiles. Public bookings now attach without changing stored profiles; staff updates require `guests:write`.
- New reservation references now carry 10 cryptographically random characters with bounded collision handling.
- Public bookings are pending holds with a two-hour expiry; availability, cleanup, payment/confirmation, and contact hold limits were added.
- Check-in/check-out now enforce date and balance rules, with manager/admin-only audited overrides.
- Future bookings no longer mark rooms `reserved`; same-day active-stay calculations use `checkIn <= today`.
- Production config, proxy trust, middleware order, session error logging, and authentication timing were hardened.
- Generated artifacts are ignored, the unused root `express` dependency was removed, stale debug scripts were removed, and scripts/docs were corrected.

No Git commit or push was performed. No production or development business database was reset, seeded, truncated, or deleted. Test resets and the existing `seed-auth` suite ran only against the isolated test database (`rivr_hotel_test`).

## 2. Initial findings and evidence

Confirmed by source inspection and tests:

- `GET /api/public/reservations/lookup` used broad `LIKE`-style querying and `GET /api/public/reservations/:reference` returned staff-facing details through a reference alone. Both were reachable without authentication.
- Public reservation responses reused guest-facing mappers that exposed profile fields; a dedicated allowlist mapper did not exist.
- `upsertGuest()` updated an existing guest from public booking input.
- New references used a shorter random suffix and did not have a bounded reusable allocation helper.
- Public bookings were created `confirmed` without payment or expiry.
- `checkInReservation()` and `checkOutReservation()` did not enforce arrival dates or outstanding balances.
- Reservation creation set an available room to `reserved` for future stays, and several active-stay queries used `checkIn < today`.
- `createApp()` hard-coded `trust proxy` to `1`, ran `attachUser` before the global limiter, and `attachUser()` swallowed lookup errors silently.
- `authenticate()` used the dummy Argon2 hash only for missing users; inactive users still verified their stored hash.
- `SETUP_TOKEN` was parsed and exported but had no legitimate workflow.
- `.gitignore` did not cover build/test artifacts, and several tracked debug scripts contained local database credentials.

## 3. Task results

### Task 1 — Public reservation data exposure — PASS

**Root cause:** Public routes exposed lookup and detail endpoints with broad matching and staff-oriented response mapping; references alone acted as an access secret.

**Changes:**

- Replaced the public lookup/detail paths with `POST /api/public/reservations/verify`.
- Required an exact, case-normalized reference plus exactly one normalized email or phone belonging to that reservation.
- Missing reference and wrong contact both return the same generic `404 Reservation not found.` response.
- Added `mapPublicReservation()` with an explicit allowlist: reference, status, dates, room type name, room number, first name only, total, paid amount, payment status. Internal IDs, full name, email, phone, address, ID fragments, preferences, lifetime spend, and metadata are excluded.
- Added `publicLookupLimiter` (10 attempts / 15 minutes / IP) before validation and database work.
- Updated the frontend: booking creation hands the result to the success page through a one-time `sessionStorage` handoff; later lookup uses the verified POST endpoint; no guest PII is stored in `localStorage`.

**Evidence/tests:** `apps/api/tests/public-reservation-lookup.test.ts` (9 passing) covers single-character lookups, `%`/`_` literals, wrong email/phone, normalized matches, allowlisted JSON keys, removed detail route, and limit enforcement. `security-audit.test.ts` also verifies the removed detail path returns 404.

### Task 2 — Public bookings overwriting guest profiles — PASS

**Root cause:** `upsertGuest()` treated public and staff calls alike and updated existing guest names, phones, and addresses.

**Changes:** Added an explicit `{ source: "public" | "staff", actor? }` contract. Public bookings attach to an existing normalized-email guest without modifying any stored profile field. Staff updates require an authenticated staff actor with `guests:write`. New guests are created only when no matching guest exists.

**Evidence/tests:** `apps/api/tests/guest-profile-protection.test.ts` (2 passing) verifies name, phone, address, city, state, and postal code remain unchanged while the reservation links to the existing guest, and staff updates still work.

### Task 3 — Reservation reference unpredictability — PASS

**Root cause:** The random suffix was shorter than required.

**Changes:** `newReference()` now uses `randomBytes` and 10 characters from the existing unambiguous alphabet, retaining the `RIVR-` prefix. `generateUniqueReference()` checks the database with a bounded five-attempt retry and throws a clear error when exhausted. Legacy short references remain resolvable; invoice numbering continues to derive from the reference suffix.

**Evidence/tests:** `apps/api/tests/reference-generation.test.ts` (4 passing) covers format/length, collisions, exhausted retries, legacy resolution, and invoice creation for old and new formats.

### Task 4 — Indefinite public room holds — PASS

**Root cause:** Public creations were immediately `confirmed` with no `holdExpiresAt`, so no expiry or cleanup existed.

**Changes:**

- Public reservations start `pending` with `holdExpiresAt = UTC_TIMESTAMP() + 2 hours`; staff reservations remain `confirmed`.
- Added additive migration `0004_faithful_captain_stacy.sql`: nullable `hold_expires_at` and `(status, hold_expires_at)` index. No historical record receives an arbitrary expiry.
- Added `reservationHolds.ts`: unexpired-hold condition, three-active-hold contact limit (normalized email/phone), transactional cleanup, row locks, room release only when no other current active stay exists, status history and activity records.
- Availability, busy ranges, overlap checks, cancellation/reassignment, and account cancellation exclude expired holds.
- `server.ts` runs cleanup every five minutes with `unref()` and clears the interval on graceful shutdown.
- Payments confirm a pending hold, clear expiry, and write status history; staff confirmation also clears expiry. Cleanup only selects `pending` reservations.

**Evidence/tests:** `apps/api/tests/reservation-holds.test.ts` (9 passing) covers pending creation, roughly two-hour expiry, unexpired availability blocking, expired pre-cleanup availability, cleanup cancellation and room release, no release when another active stay exists, protection of paid/confirmed holds, no duplicate history/activity on a second cleanup, email and phone hold limits, and exclusion of staff bookings.

### Task 5 — Check-in/check-out business rules — PASS

**Root cause:** Neither action had date or balance gates and there was no audited override permission.

**Changes:**

- Normal check-in requires `checkIn <= today < checkOut`. Early check-in is rejected unless the request body contains `{ earlyCheckIn: true }` and the caller has the new `reservations:override` permission (super-admin, admin, manager). Check-in at/after check-out is always rejected.
- Check-out with `paidAmount < total` returns HTTP 409 with error code `outstanding_balance` and the outstanding amount. Override requires `{ overrideOutstandingBalance: true }` and `reservations:override`.
- Overrides preserve reservation dates, write a warning activity log identifying the responsible user, and never mark an unpaid invoice paid.
- Added strict request-body validation for both override flags.

**Evidence/tests:** `apps/api/tests/checkin-checkout-rules.test.ts` (8 passing) covers early rejection, normal arrival, after-checkout rejection, authorized/unauthorized early overrides, unpaid 409 with correct balance, fully paid checkout, authorized/unauthorized balance overrides, and activity logging.

### Task 6 — Room reserved-status handling — PASS

**Root cause:** Creation unconditionally reserved an available room, and same-day active-stay checks used a strict `checkIn < today`.

**Changes:**

- Future reservations no longer change the room's physical status.
- Same-day stays (`checkIn <= today < checkOut`) may set an available room to `reserved`.
- Cancellation/reassignment release only `reserved` rooms and only when no other current active reservation needs them; `occupied`, `cleaning`, and `maintenance` are preserved.
- Room status remains a presentation/operational state; date-range availability remains authoritative.

**Evidence/tests:** `apps/api/tests/room-status.test.ts` (5 passing) covers future status preservation, same-day reservation, same-day release calculation, another active same-day stay preventing release, and preservation of occupied/cleaning/maintenance.

### Task 7 — Environment and middleware hardening — PASS

**Root cause:** Production only checked secret length; proxy trust was hard-coded; middleware order performed session lookups before rate limiting; session errors were swallowed; inactive accounts used their real hash.

**Changes:**

- Added testable `parseEnv()` and production checks: `COOKIE_SECURE` must be explicitly true, every `WEB_ORIGIN` must be a valid non-loopback origin, and `SESSION_SECRET` must be at least 32 characters. Errors never print the secret.
- Added validated `TRUST_PROXY` values: `false`, `loopback`, `linklocal`, `uniquelocal`, or 1–10 hops; `app.set("trust proxy", env.trustProxy)`.
- Moved `globalLimiter` before `attachUser`.
- `attachUser()` logs the sanitized message `[auth] session lookup failed` without cookies, tokens, hashes, or user details, while preserving public-endpoint behavior.
- `authenticate()` uses the same stable dummy Argon2 hash for missing and inactive accounts.
- Removed unused `SETUP_TOKEN` configuration handling and documentation references; no setup endpoint was added or changed.

**Evidence/tests:** `config-validation.test.ts` (7), `session-error-logging.test.ts` (1), and `auth-timing.test.ts` (2) all pass. They cover insecure cookies, loopback origins, short secrets, valid production config, invalid proxy values, middleware order, sanitized logging, and identical missing/inactive verification paths and responses.

### Task 8 — Repository hygiene and documentation — PASS

**Changes:**

- `.gitignore` now covers `dist/`, API build output, Playwright reports/test results, logs, `*.tsbuildinfo`, schema dumps, and temporary inspection files.
- Generated artifacts were removed from Git tracking with `git rm --cached` without deleting source files; logs/test results remain in the working tree, and `dist/` was regenerated by the final build.
- Removed `verify-db.js`, `db-schema-check.js`, `check-flow.mjs`, `apps/api/verify.mjs`, and `verify.ljs` after confirming no source imports or scripts depend on them; these were stale debug/inspection scripts containing local database credentials.
- Removed unused root `express`; `apps/api` still declares and resolves Express 4.22.3.
- Root `typecheck` now runs `tsc -b` instead of the no-op `tsc --noEmit`.
- Corrected README/AGENTS/knowledge notes for pnpm 12.18.0, non-interactive admin creation, removed lookup routes, pending-hold behavior, secure verification, check-in/out rules, `TRUST_PROXY`, and the real typecheck command.

## 4. Database migration

`apps/api/drizzle/migrations/0004_faithful_captain_stacy.sql` was inspected before use:

```sql
ALTER TABLE `reservations` ADD `hold_expires_at` datetime;
CREATE INDEX `reservations_hold_idx` ON `reservations` (`status`,`hold_expires_at`);
```

It is additive, nullable, and preserves all existing rows. It was exercised through the isolated test-database reset/migrate workflow (`rivr_hotel_test`). No migration was applied to the development or production database by this work.

## 5. Files changed

Task-related source/config/docs:

- `apps/api/src/services/reservations.ts`
- `apps/api/src/services/reservationHolds.ts` (new)
- `apps/api/src/services/rooms.ts`
- `apps/api/src/services/account.ts`
- `apps/api/src/services/payments.ts`
- `apps/api/src/services/mappers.ts`
- `apps/api/src/services/users.ts`
- `apps/api/src/services/permissions.ts`
- `apps/api/src/utils/id.ts`
- `apps/api/src/utils/contact.ts` (new)
- `apps/api/src/modules/public/routes.ts`
- `apps/api/src/modules/admin/reservations.routes.ts`
- `apps/api/src/modules/shared/schemas.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/rateLimit.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/database/schema.ts`
- `apps/api/drizzle/migrations/0004_faithful_captain_stacy.sql` (new)
- `apps/api/drizzle/migrations/meta/_journal.json`
- `apps/api/drizzle/migrations/meta/0004_snapshot.json` (new)
- `apps/api/.env.example`
- `src/lib/hotel-data.ts`
- `src/lib/hotel-store.tsx`
- `src/lib/booking-handoff.ts` (new)
- `src/pages/BookingPage.tsx`
- `src/pages/BookingSuccessPage.tsx`
- `src/pages/MyBookingsPage.tsx`
- `package.json`, `pnpm-lock.yaml`, `.gitignore`, `AGENTS.md`, `knowledge.md`, `README.md`

Tests added/updated:

- `apps/api/tests/public-reservation-lookup.test.ts` (new)
- `apps/api/tests/guest-profile-protection.test.ts` (new)
- `apps/api/tests/reference-generation.test.ts` (new)
- `apps/api/tests/reservation-holds.test.ts` (new)
- `apps/api/tests/checkin-checkout-rules.test.ts` (new)
- `apps/api/tests/room-status.test.ts` (new)
- `apps/api/tests/config-validation.test.ts` (new)
- `apps/api/tests/session-error-logging.test.ts` (new)
- `apps/api/tests/auth-timing.test.ts` (new)
- `apps/api/tests/hotel-flow.test.ts` (updated for pending public status and explicit early-check-in override)
- `apps/api/tests/security-audit.test.ts` (updated alongside public lookup coverage)

Unrelated UI/theme/report changes that were already present in the working tree were preserved and not intentionally modified. The repository also had pre-existing modifications to `apps/api/src/modules/admin/index.ts`, `suppliers.routes.ts`, and several frontend components; those files are not claimed as remediation changes here.

## 6. Commands and results

| Command | Result |
| --- | --- |
| `pnpm typecheck:api` | Pass |
| `pnpm --filter @rivr/api exec vitest run tests/public-reservation-lookup.test.ts` | 9 passed |
| `pnpm --filter @rivr/api exec vitest run tests/guest-profile-protection.test.ts` | 2 passed |
| `pnpm --filter @rivr/api exec vitest run tests/reference-generation.test.ts` | 4 passed |
| `pnpm --filter @rivr/api exec vitest run tests/reservation-holds.test.ts` | 9 passed |
| `pnpm --filter @rivr/api exec vitest run tests/checkin-checkout-rules.test.ts` | 8 passed |
| `pnpm --filter @rivr/api exec vitest run tests/room-status.test.ts` | 5 passed |
| `pnpm --filter @rivr/api exec vitest run tests/config-validation.test.ts tests/session-error-logging.test.ts tests/auth-timing.test.ts` | 10 passed |
| `pnpm exec tsc -b` | Exit 0 |
| `pnpm build` | Exit 0 |
| `pnpm typecheck` | Exit 0 (`tsc -b`) |
| `pnpm test:api` | 84 passed, 14 files, exit 0 |
| Final gate: `pnpm exec tsc -b && pnpm build && pnpm typecheck:api && pnpm test:api` | Exit 0 |

Playwright:

- Started a temporary Vite server bound to `127.0.0.1:5173` and ran two read-only Chromium auth tests.
- `Guest website loads successfully`: passed.
- `Admin can login and access admin dashboard`: failed with HTTP/browser CORS rejection because the suite targets `http://127.0.0.1:5173` while the running API's `WEB_ORIGIN` allow-list contains `http://localhost:5173`. This is a test/environment origin mismatch, not a booking-code failure. The full Playwright suite was not run because it registers users and targets the development database.

## 7. Before/after behavior

| Area | Before | After |
| --- | --- | --- |
| Public lookup | Broad lookup and reference-only detail | Exact reference + exactly one matching normalized email/phone via POST |
| Public response | Staff/guest profile fields | Explicit 10-field allowlist, no PII/internal IDs |
| Public booking profile | Could overwrite existing guest | Attaches to existing guest without profile mutation |
| Reference suffix | Short random suffix | 10 crypto-random characters with bounded DB collision retry |
| Public booking state | Immediately `confirmed` | `pending` with two-hour UTC hold expiry |
| Expired holds | Remained blocking | Cancelled by cleanup; ignored by availability once expired |
| Hold abuse | Public write limiter only | Three active holds per normalized email/phone plus limiter |
| Check-in | Any date | Arrival date through before checkout; audited manager/admin early override |
| Check-out | Allowed with balance | HTTP 409 until paid; audited manager/admin override |
| Room status | Future booking set `reserved` | Only a same-day active stay may reserve an available room |
| Same-day active check | `checkIn < today` | `checkIn <= today` |
| Proxy trust | Hard-coded `1` | Validated `TRUST_PROXY` |
| Session lookup failures | Silent | Sanitized server log, same client behavior |
| Inactive login timing | Real stored hash | Stable dummy Argon2 hash, identical client response |

## 8. Remaining risks and limitations

- The public hold duration is a code constant (2 hours). The existing `system_settings.reservationHoldHours` field is not wired to the public hold lifecycle; changing the configured setting does not change hold duration yet.
- Hold-limit phone comparison uses a last-10-digit normalization suitable for Indian numbers; non-Indian formats could collide. The application is documented as single-property/India-focused.
- Cleanup uses a per-process guard plus row locks, which prevents duplicate records within one process and serializes database work; multiple API processes can still contend, though row re-checks prevent duplicate history/activity.
- Admin UI controls for the new override flags were not added. The backend contract is ready; staff can call the validated API flags, but the existing frontend does not expose them.
- The public verification response deliberately includes room number. This is permitted by the task list, but it is operational information; if the product requires later-hide behavior, it can be removed without changing the lookup contract.
- The Playwright admin login check is blocked by the local `WEB_ORIGIN` mismatch described above. No authentication or booking UI Playwright coverage exists for the new flows.
- Generated artifacts removed from the index are now untracked (logs/test results remain on disk; `dist/` was rebuilt). No commit was made to record that index change.
- The tracked debug scripts that were removed had embedded local database credentials. Removing the current files does not rewrite Git history; credential rotation is still advisable if those scripts were ever shared.

## 9. Confirmations

- **No Git commit or push was performed.**
- **No branch was changed and no destructive Git command (`git reset --hard`, `git clean`) was run.**
- **No production or development business database was reset, truncated, seeded, or had records deleted.**
- Test-only resets/migrations and the existing `seed-auth` suite ran against `rivr_hotel_test` only.
- `pnpm db:seed`, `pnpm create-admin`, and destructive seed scripts were not run.
- No `.env` contents, credentials, tokens, session hashes, or guest PII are included in this report.
