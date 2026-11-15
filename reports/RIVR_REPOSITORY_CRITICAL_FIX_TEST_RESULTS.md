# RIVR — Critical Fix Test Results

Companion to `reports/RIVR_REPOSITORY_CRITICAL_AUDIT_REPORT.md`. Contains before/after evidence for
every change. No secrets, passwords, tokens, cookies or personal data are reproduced here.

Environment: local Windows working tree, MariaDB reachable on the configured port. `DB_NAME` and
`DB_TEST_NAME` are distinct (`rivr_hotel` vs `rivr_hotel_test`). Development-database row counts were
recorded before and after the audit to prove that it was never modified.

---

## 1. Safety pre-flight

| Check | Result |
| --- | --- |
| Databases visible before work | `rivr_hotel`, `rivr_hotel_test` only |
| `DB_TEST_NAME` | `rivr_hotel_test` (contains a `test` segment, differs from `DB_NAME`) |
| Development DB counts before | users 29, reservations 120, rooms 48 |
| Development DB counts after | users 29, reservations 120, rooms 48 |
| Scratch databases created for verification | `rivr_admin_bootstrap_test` (dropped afterwards), `rivr_ci` (never created — guard fired first) |

No `DROP`, `DELETE`, `TRUNCATE` or seed ran against `rivr_hotel`.

---

## 2. Baseline (before fixes)

```
pnpm --filter @rivr/api exec vitest run tests/customer-booking-auth.test.ts tests/public-reservation-lookup.test.ts
→ Test Files 2 passed, Tests 18 passed

pnpm --filter @rivr/api exec vitest run tests/setup.test.ts tests/seed-auth.test.ts
→ Test Files 2 passed, Tests 10 passed
```

This established that the reservation-authorization behaviour was already correct and that the
failures were documentation/safety gaps, not an authorization defect.

---

## 3. Reservation security scenarios (after fixes)

`tests/customer-booking-auth.test.ts` now has 10 tests (was 9). Full coverage of the requested
scenarios:

| Scenario | Assertion | Result |
| --- | --- | --- |
| Unauthenticated create | `POST /api/account/reservations` → 401 `unauthorized`, count unchanged | pass |
| Removed public route | `POST /api/public/reservations` → 404, count unchanged | pass |
| Registered customer create | 201, `status: pending`, `holdExpiresAt` set, guest email/name = account | pass |
| Staff on customer endpoint | admin → 403; staff booking on `/api/admin/reservations` → 201 `confirmed` | pass |
| Cross-customer access | overview excludes the other reference; forged cancel → 404; row unchanged | pass |
| Manipulated identifiers | strict schema rejects role/status/total/discount with 400 | pass |
| Forged session cookie (new) | 401 `unauthorized`, no hold created | pass |
| Deactivated account | 401 after admin deactivation, count unchanged | pass |
| Unauthenticated availability | 200, no reservation created | pass |
| Public verification | wrong contact → 404; own contact → 200; payload excludes email | pass |

```
pnpm --filter @rivr/api exec vitest run tests/database-isolation.test.ts tests/demo-seed-policy.test.ts tests/customer-booking-auth.test.ts
→ Test Files 3 passed, Tests 18 passed
```

---

## 4. Demo seed production guard

New pure policy module `apps/api/src/database/seedPolicy.ts`, called first in `seedDatabase()`.

Automated:

```
tests/demo-seed-policy.test.ts → 3 passed
```

Runtime proof with `NODE_ENV=production` and a scratch `DB_NAME`:

```
$ pnpm exec tsx src/database/seed.ts
Error: Refusing to run the demo seed with NODE_ENV=production: it deletes users, sessions and business records before inserting demo data. Restore a non-production database instead.
exit code 1
```

Database check afterwards: `SHOW DATABASES LIKE 'rivr_seed_guard%'` → 0 rows, proving the refusal
happens before `ensureDatabaseExists()`.

Normal (non-production) seed still works: `tests/seed-auth.test.ts` (full demo seed + row-count
assertions) passes in the full suite.

---

## 5. Test-database isolation guard

New pure resolver `apps/api/tests/database-guard.ts`, used by `tests/setup.ts` before `config/env`
loads; `tests/setup.ts` first loads `apps/api/.env` (without overriding shell variables) so the guard
compares the configured `DB_NAME`/`DB_TEST_NAME`. `resetTestDatabase()` additionally refuses unless
`env.isTest`.

Automated:

```
tests/database-isolation.test.ts → 5 passed
```

- default when unset → `rivr_hotel_test`
- accepts `rivr_hotel_test`, `test_rivr`, `rivr-test`
- rejects `rivr_hotel`, `rivr_ci`, `hospitality`, `rivr_latest`
- rejects when `DB_TEST_NAME` equals `DB_NAME` (case-insensitive)

Runtime proof of fail-fast (safe scratch name, never the dev DB):

```
$ DB_TEST_NAME=rivr_ci pnpm exec vitest run tests/database-isolation.test.ts
Error: Refusing to run database-backed tests against "rivr_ci": DB_TEST_NAME must contain a "test" segment …
Test Files 1 failed
exit code 1
```

Pointing `DB_TEST_NAME` at the configured development database is also rejected before any connection:

```
$ DB_TEST_NAME=rivr_hotel pnpm exec vitest run tests/database-isolation.test.ts
Error: Refusing to run database-backed tests against "rivr_hotel": DB_TEST_NAME must contain a "test" segment …
exit code 1
```

Database check afterwards: neither `rivr_ci` nor `rivr_hotel` was contacted or modified.

---

## 6. `pnpm db:reset`

Before: `tsx src/database/reset.ts` loaded the module, did nothing and exited 0 (silent success).
After: the module detects direct execution and refuses without connecting.

```
$ pnpm --filter @rivr/api db:reset
[db:reset] Refusing to run: this script does not reset the database, because doing so drops every table in DB_NAME.
[db:reset] Database-backed tests reset their isolated DB_TEST_NAME database through tests/helpers.ts. …
exit code 1
```

Development DB counts unchanged (29 users / 120 reservations / 48 rooms).

---

## 7. First super-admin creation

The script now loads configuration through `config/env.ts`, so `apps/api/.env` is honoured from any
working directory (previously only cwd dotenv was loaded, which could fall back to `127.0.0.1:3306`,
user `root`, empty password).

All runtime checks used the scratch database `rivr_admin_bootstrap_test` (dropped afterwards):

| Step | Invocation | Observed |
| --- | --- | --- |
| First creation | `tsx scripts/create-admin.ts --email audit-admin@example.test --password <12+>` | exit 0, "Super admin created" |
| State | SQL on scratch DB | exactly 1 user: `super-admin`, active, hash length 97, hash ≠ plaintext, 5 migrations applied |
| Second creation | same DB, different email | exit 1, "An active super administrator already exists" |
| Short password | `--password short` | exit 1, "must be at least 12 characters"; user count still 1 |
| Wrong-cwd safety | run from repo root with `DB_NAME=rivr_admin_bootstrap_test` | exit 0 using the configured port from `apps/api/.env`, not default 3306 |
| Cleanup | `DROP DATABASE rivr_admin_bootstrap_test` | only `rivr_hotel`, `rivr_hotel_test` remain |

No partial user rows were left by any failure path.

---

## 8. Full project verification (safe commands only)

```
pnpm build          → tsc -b && vite build, exit 0
pnpm typecheck:api  → tsc --noEmit -p tsconfig.json, exit 0
pnpm test:api       → Test Files 17 passed (17), Tests 103 passed (103), exit 0
```

`pnpm test:api` includes the full demo-seed suite, the new pure suites, and all database-backed
integration suites, run serially against `rivr_hotel_test`.

---

## 9. Files touched

| File | Change |
| --- | --- |
| `apps/api/src/database/seedPolicy.ts` | new pure production refusal |
| `apps/api/src/database/seed.ts` | call the guard; remove the warn-and-continue block |
| `apps/api/src/database/reset.ts` | explicit non-destructive CLI refusal |
| `apps/api/scripts/create-admin.ts` | load env via `config/env` |
| `apps/api/tests/database-guard.ts` | new pure DB-name resolver |
| `apps/api/tests/setup.ts` | fail-fast DB isolation |
| `apps/api/tests/helpers.ts` | `resetTestDatabase()` requires `env.isTest` |
| `apps/api/tests/database-isolation.test.ts` | new guard tests |
| `apps/api/tests/demo-seed-policy.test.ts` | new seed-policy tests |
| `apps/api/tests/customer-booking-auth.test.ts` | forged-session scenario |
| `README.md` | endpoint, environment, testing and safety corrections |
| `AGENTS.md` | booking/hold, guard, reset, env and repo facts |
| `knowledge.md` | stale statements corrected |
| `reports/RIVR_REPOSITORY_CRITICAL_AUDIT_REPORT.md` | this audit |
| `reports/RIVR_REPOSITORY_CRITICAL_FIX_TEST_RESULTS.md` | this file |
