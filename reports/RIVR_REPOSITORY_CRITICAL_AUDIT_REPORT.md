# RIVR — Repository Critical Audit Report

Status: **complete** — Stage A findings (Sections 1–8) were recorded before any source change;
Stage B (Sections 9–15) records remediation and final verification.

Date: 2026-11-15
Scope: local working tree at `C:\Users\Prince Bhowmick\hotel-erp` (not the public GitHub snapshot).
No secrets, passwords, tokens, cookies or personal data are reproduced in this report.

---

## 1. Initial repository inspection

| Area | Observed source of truth |
| --- | --- |
| Frontend | root `src/`, React 19 + Vite 8 + TanStack Router (code-based tree in `src/router.tsx`) |
| API | `apps/api` workspace package `@rivr/api`, Express 4 (CommonJS), entry `src/app.ts` / `src/server.ts` |
| DB | MariaDB + Drizzle, schema `apps/api/src/database/schema.ts` (42 `mysqlTable` declarations) |
| Migrations | `apps/api/drizzle/migrations/0000`–`0004`, custom runner `src/database/migrate.ts` |
| Tests | Vitest + Supertest real-DB suites in `apps/api/tests`, Playwright in `tests/playwright` |
| Scripts | root `package.json` delegates to `@rivr/api`; `scripts/dev.mjs` orchestrates dev servers |
| CI / lint | none configured (no `.github`, no eslint/prettier/biome config) |
| Environments | `apps/api/.env` present (gitignored), `DB_NAME=rivr_hotel`, `DB_TEST_NAME=rivr_hotel_test`, DB reachable on the configured port; both schemas exist and are distinct |

Baseline (pre-fix) focused test run against the isolated test database:

- `tests/customer-booking-auth.test.ts` + `tests/public-reservation-lookup.test.ts` → **18 passed**
- `tests/setup.test.ts` + `tests/seed-auth.test.ts` → **10 passed**

---

## 2. Documentation conflicts

| Claim | Reality | Verdict |
| --- | --- | --- |
| `README.md` lists `POST /public/reservations` as public reservation creation | No such route exists; `modules/public/routes.ts` deliberately omits it and customer booking is `POST /api/account/reservations` | **Confirmed documentation defect** |
| `README.md` omits the authenticated customer endpoints (`/api/account/*`) | `modules/account/routes.ts` implements overview, booking, profile, cancel | **Confirmed documentation gap** |
| `README.md` auth table omits `register`, `forgot-password`, `reset-password` | All three exist in `modules/auth/routes.ts` | **Confirmed documentation gap** |
| `README.md` testing section says only Vitest/Supertest | Playwright suite also exists (`apps/api/tests/playwright`, its own config) | **Confirmed documentation gap** |
| `README.md` limits list says bundle code splitting is "future" | Router already lazy-loads every non-home page via `lazyRouteComponent` | **Confirmed stale claim** |
| `knowledge.md` says README "lists 17 tables" and still documents the removed public booking route | README was rewritten earlier and no longer lists tables (but it still lists the removed route — fixed in this task) | **Confirmed stale statement** |
| `knowledge.md` says `node_modules` is committed (via `vite.config.ts` comment) | `git ls-files node_modules` → 0 files; `node_modules` is ignored | **Confirmed stale statement** |
| `knowledge.md` says schema has ~43 tables | 42 `mysqlTable` declarations | **Minor inaccuracy** |

---

## 3. Reservation authentication findings

| Required scenario | Implementation | Test evidence | Verdict |
| --- | --- | --- | --- |
| Unauthenticated visitor creates a reservation | `POST /api/account/reservations` behind `requireAuth`; `POST /api/public/reservations` absent | `customer-booking-auth.test.ts` → 401 `unauthorized`, public route 404, reservation count unchanged | **Correct** |
| Registered customer creates a reservation | `accountRouter` → `assertCustomer` → `createReservation({ source: "customer" })`, guest derived from session email | 201, status `pending`, hold set, guest email/name match account | **Correct** |
| Staff account uses customer booking endpoint | `assertCustomer` rejects non-customer roles | admin → 403; staff booking on `/api/admin/reservations` → 201 `confirmed` | **Correct** |
| Customer accesses another customer's reservation | Overview scoped by guest email; cancel scoped by owner (404 otherwise) | other customer's reference absent from overview; forged cancel → 404, row unchanged | **Correct** |
| Customer manipulates guest/user identifiers | `customerReservationSchema` omits `guestName`/`email` and is `.strict()`; service ignores client identity | role/status/total/discount → 400; `role` on register ignored | **Correct** |
| Invalid/expired session creates a reservation | `attachUser` drops unknown tokens; deactivated account re-checked inside the booking transaction | deactivated account → 401, no row created | **Correct** (forged-cookie case added to the suite) |
| Unauthenticated availability search | `GET /api/public/availability` intentionally public and read-only | 200, no reservation created | **Correct** |

Public reservation verification (`POST /api/public/reservations/verify`) requires a reference plus a
matching email **or** phone, is rate-limited (10 / 15 min), returns an allowlisted payload, and the old
reference-only detail route is gone (asserted by `public-reservation-lookup.test.ts` and
`security-audit.test.ts`).

**Root cause of the reservation concern: README drift only. No backend authorization defect confirmed.**

---

## 4. Super-admin creation safety findings

Source: `apps/api/scripts/create-admin.ts` (invoked as `pnpm create-admin`).

Verified: refuses missing email/password, refuses passwords under 12 chars, runs
`ensureDatabaseExists()` → `migrate()` → `seedRolesOnly()`, counts
`role = 'super-admin' AND is_active = 1`, and refuses when one exists. Insert is a single statement.

| Check | Verdict |
| --- | --- |
| Creates first super-admin with hashed password | **Correct** (`hashPassword`, Argon2id service) |
| Refuses a second active super-admin | **Correct** by code inspection; verified at runtime (Section 9) |
| Does not overwrite/duplicate existing users | **Correct** (plain `INSERT`, refusal happens first) |
| Partial data on failure | **Correct** — failures occur before the single insert; migrations/role sync are idempotent |
| Existing business records preserved | **Correct** — no delete/DELETE/TRUNCATE in the script |
| Environment loading | **Defect (confirmed)**: the script loads only `dotenv/config` (cwd `.env`), unlike `config/env.ts`, which also loads `apps/api/.env`. Run from the repository root without the pnpm filter, it silently falls back to default DB settings (`127.0.0.1:3306`, user `root`, empty password, database `rivr_hotel`). |

Concurrency: the count-then-insert is not serialized, so two simultaneous runs could both pass the
count check. This is a residual risk, not a reproduced defect; no behavioural change was made for it.

---

## 5. Demo seed safety findings

Source: `apps/api/src/database/seed.ts`, `database/reset.ts`, `POST /api/admin/dev/reset`.

- `BUSINESS_TABLES` is deleted with `DELETE FROM` under `SET FOREIGN_KEY_CHECKS = 0`; it includes
  `users`, `sessions`, `reservations`, `payments`, `guests`, `rooms`, `system_settings`.
- Reference tables (`departments`, `shifts`, `housekeeping_status`) are inserted with `INSERT IGNORE`
  and intentionally excluded from the delete list.
- Demo accounts (`admin@admin.com` / `password` and role demo accounts) are recreated by the seed.
- No transaction wraps the whole seed; each statement autocommits.
- Production protection: `env.allowDemoReset` is forced off in production, so the HTTP reset route is
  blocked — **but the CLI seed only printed a warning when `NODE_ENV=production` and then proceeded.**

| Check | Verdict |
| --- | --- |
| Deletes users/sessions | **Yes, by design** (documented) |
| Recreates demo accounts | **Yes** |
| Transactional protection | **No** (not claimed anywhere) |
| Production blocked | **Defect (confirmed)**: warning only; a mistaken `NODE_ENV` still deletes production users |
| Misconfiguration can cause data loss | **Yes** — that is the confirmed weakness |

---

## 6. Test database isolation findings

Source: `apps/api/tests/setup.ts`, `tests/helpers.ts`, `vitest.config.ts`, `playwright.config.ts`.

- `tests/setup.ts` sets `NODE_ENV=test`, then `DB_NAME = DB_TEST_NAME ?? "rivr_hotel_test"`.
- `resetTestDatabase()` drops all tables, migrates, seeds roles; `fileParallelism: false`.
- Playwright has no `webServer`/DB access; it only drives the browser at `127.0.0.1:5173`.
- `DB_TEST_NAME` is read before `env.ts` and is not part of the Zod schema.

| Check | Verdict |
| --- | --- |
| Tests use a dedicated database | **Yes** for the current `.env` (`rivr_hotel_test` ≠ `rivr_hotel`) |
| Cannot silently resolve to the dev database | **Defect (confirmed)**: no guard; `DB_TEST_NAME=rivr_hotel` (or a shell `DB_NAME`) would drop development tables |
| Production execution blocked | Unreachable in practice (`NODE_ENV` forced to `test`) but not asserted |
| Reset scoped to configured test DB | By configuration only, no assertion |
| Serial execution | **Yes** |
| Playwright isolation | **Yes** (browser only) |

---

## 7. Database reset command findings

- Root script: `"db:reset": "pnpm --filter @rivr/api db:reset"`.
- API script: `"db:reset": "tsx src/database/reset.ts"`.
- `reset.ts` exports `ensureDatabaseExists`, `TABLES`, `dropAllTables`, `resetDatabase`,
  `runSqlFile`, `createAdminFromEnv` but has **no** `require.main` entrypoint.

Observed behaviour: the module loads, opens no query, and exits with code 0 — a **silent no-op** that
looks successful. This is a usability/safety trap (an operator may believe the database was reset).
`resetDatabase()` is exported but unused by application code or tests (tests use `dropAllTables()`).

No destructive CLI functionality was added (explicitly out of scope).

---

## 8. Actual root causes

1. **README drift** after the customer-authenticated booking change, plus missing `/api/account`,
   password-reset, Playwright and guarded-operation documentation.
2. **Missing production guard** on the CLI demo seed (only an HTTP-level `ALLOW_DEMO_RESET` guard).
3. **Missing fail-fast** for a misconfigured `DB_TEST_NAME`, which controls a table-dropping reset.
4. **Silent success** of `pnpm db:reset`.
5. **Inconsistent environment loading** in `create-admin` (cwd-only dotenv), which can target the
   wrong database when invoked outside the pnpm filter.
6. Stale statements in `knowledge.md` (README shape, table count, committed `node_modules`).

---

# Stage B — fixes and final results

## 9. Fixes applied

| # | Defect | Fix | Guard/test |
| --- | --- | --- | --- |
| 1 | `README.md` documented a removed public booking route and omitted implemented endpoints | Public table corrected; authenticated customer, password-reset and admin endpoint documentation added; testing/safety/limitations corrected | Route tables verified against `modules/*/routes.ts` |
| 2 | Demo seed only warned in production | `seedDatabase()` calls `assertDemoSeedAllowed(env.isProduction)` before any DB contact; no override | `tests/demo-seed-policy.test.ts`; runtime refusal reproduced |
| 3 | `DB_TEST_NAME` could target a non-test database and drop its tables | `tests/database-guard.ts` requires a `test` name segment and `DB_TEST_NAME ≠ DB_NAME`; `resetTestDatabase()` requires `env.isTest` | `tests/database-isolation.test.ts`; runtime fail-fast reproduced without creating the DB |
| 4 | `pnpm db:reset` silently did nothing | Direct execution now explains the refusal and exits 1 without connecting | Runtime check; dev DB counts unchanged |
| 5 | `create-admin` loaded only cwd dotenv, risking default DB credentials when run from the repo root | Loads `config/env.ts` (cwd `.env` then `apps/api/.env`) | Runtime success from repo root against a scratch DB |
| 6 | `knowledge.md` stale statements | Corrected README status, table count (42), `node_modules` claim, seed/reset/test/admin behavior | Cross-checked against source |

No backend authorization code was changed: the reservation tests already proved the server enforces
session + customer role + server-derived ownership.

## 10. Files modified

Production: `apps/api/src/database/seedPolicy.ts` (new), `seed.ts`, `reset.ts`,
`apps/api/scripts/create-admin.ts`.

Tests: `apps/api/tests/database-guard.ts` (new), `setup.ts`, `helpers.ts`,
`database-isolation.test.ts` (new), `demo-seed-policy.test.ts` (new), `customer-booking-auth.test.ts`.

Docs: `README.md`, `AGENTS.md`, `knowledge.md`, this report and
`reports/RIVR_REPOSITORY_CRITICAL_FIX_TEST_RESULTS.md`.

No migration files, seeds, `.env` files or database credentials were changed.

## 11. Tests executed

- Focused pre-fix: `customer-booking-auth` + `public-reservation-lookup` (18 passed),
  `setup` + `seed-auth` (10 passed).
- Focused post-fix: `database-isolation` + `demo-seed-policy` + `customer-booking-auth` (18 passed).
- Runtime guard checks: production seed refusal, `db:reset` refusal, `DB_TEST_NAME=rivr_ci` fail-fast,
  `create-admin` create/refuse/short-password/wrong-cwd sequence.
- Full gate: `pnpm build`, `pnpm typecheck:api`, `pnpm test:api` (**17 files / 103 tests passed**).

## 12. Test results

All executed checks passed. Detailed evidence is in
`reports/RIVR_REPOSITORY_CRITICAL_FIX_TEST_RESULTS.md`. The development database retained the same
user/reservation/room counts before and after the audit.

## 13. Remaining risks

1. **Seed is not transactional.** A crash mid-seed leaves a partially cleared dataset. Documented, not
   changed (changing it would require reworking the intentional demo-seed design).
2. **`create-admin` count-then-insert is not serialized.** Two simultaneous runs could both pass the
   count check. Requires an operator to run two bootstraps concurrently; a DB-level uniqueness rule
   would be a separate schema change.
3. **`system_settings.reservation_hold_hours` is not used by hold creation** (the `PUBLIC_HOLD_HOURS`
   constant is). Documented in `AGENTS.md`/`knowledge.md`; wiring it through would be a behavior change
   outside this task.
4. **The test guard is name-based.** A genuinely dangerous database could be named `…_test`; the guard
   prevents the realistic misconfiguration (`DB_TEST_NAME` pointing at `DB_NAME`) but cannot detect
   what a database actually contains.
5. **No CI** enforces the gate; it runs only when invoked manually.

## 14. Items that could not be verified

- Behaviour of the public GitHub snapshot: this audit covers only the local working tree.
- Production deployment topology (reverse proxy, HTTPS, cookie/domain settings) — no deployment config
  exists in the repository.
- Race condition in `create-admin` under true concurrency — not reproduced; only code inspection.
- Real email/SMS delivery for password resets — no provider is implemented (token returned outside
  production by design).

## 15. Summary

| Area | Initial finding | Fix required? | Final result | Evidence |
| --- | --- | --- | --- | --- |
| Reservation API security | Backend correct; README documented a removed public create route | Docs only | README matches implementation; all 7 scenarios tested | `customer-booking-auth.test.ts` 10 tests pass |
| Customer authentication | Session + `assertCustomer`, server-derived guest, strict body | No | Verified unchanged | 401/403/404 assertions pass |
| Super-admin creation | Refuses a second active admin; wrong-cwd env loading defect | Yes (env loading) | Loads `config/env`; create/refuse/short-password verified on scratch DB | Section 7 of test results |
| Demo seed safety | Warned in production and continued | Yes | Hard refusal before DB contact | `demo-seed-policy.test.ts`; runtime refusal, no DB created |
| Test database isolation | No guard on the table-dropping test DB | Yes | Fail-fast name/identity guard + `env.isTest` check | `database-isolation.test.ts` 5 tests; `rivr_ci` rejected before creation |
| Database reset command | Silent no-op | Yes (loud refusal) | Exits 1 with explanation; no DB contact | Runtime check; dev counts unchanged |
| README/API consistency | Removed route, missing account/auth endpoints, stale limitations | Yes | Corrected | README §API Overview, §Testing, §Data Safety |
| AGENTS/knowledge consistency | Missing holds/booking-auth facts; stale reset/README/`node_modules` claims | Yes | Updated | `AGENTS.md`, `knowledge.md` |

