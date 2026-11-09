# knowledge.md — RIVR Hotel ERP

Full-stack hotel management + ERP app: React 19/Vite guest site and staff portal, Express 4 REST API in `apps/api` (pnpm workspace package `@rivr/api`), MariaDB 10.6+ via Drizzle ORM. Requires Node 20+ and pnpm 12 (`packageManager: pnpm@12.18.0`).

`AGENTS.md` is the canonical working guide; `README.md` is the product/API reference but lags the code in places. When they disagree, follow source and `package.json` scripts.

## Where code lives

- `src/` — frontend only: `pages/` (guest pages + admin components exported from `AdminPages.tsx`), `components/hotel/`, `lib/`, `router.tsx` (hand-written code-based TanStack Router tree — register every new page there). Non-admin role dashboards live in `RoleDashboards.tsx` and `GuestDashboardPage.tsx`.
- `src/lib/api.ts` — single typed fetch client (`credentials: "include"`, parses `{ error: { code, message } }` into `ApiError`). Hits `/api`; Vite proxies to `API_PROXY_TARGET` (default `http://localhost:4000`). Set `VITE_API_URL` at build time to point elsewhere.
- `src/lib/hotel-store.tsx` — data flow: public catalog (includes property settings) → `/auth/me` → `/admin/bootstrap` + `/admin/reports/dashboard`. It skips the dashboard request for the `staff` role because `dashboard:read` excludes it. Business data comes from the API; only `rivr-theme` is stored in localStorage.
- `apps/api/src/app.ts` builds the Express app; `server.ts` is the entry (dev boot creates the DB and applies migrations; production does neither, so run migrations explicitly).
- `apps/api/src/modules/` — `auth/`, `account/` (customer-only, guarded by `assertCustomer`), `public/`, `shared/` (schemas, query, actor), `admin/` (one `*.routes.ts` per area + aggregate `index.ts`). Routes validate and check permissions, then call `apps/api/src/services/*` for logic/transactions. Exception: `GET /admin/bootstrap` in `modules/admin/index.ts`.
- `apps/api/src/database/schema.ts` — schema source of truth (40+ tables, growing). `apps/api/drizzle/migrations/` — generated SQL applied in filename order by `database/migrate.ts`.
- `apps/api/tests/` — real-DB Vitest + Supertest integration tests: `auth.test.ts`, `hotel-flow.test.ts`, `seed-auth.test.ts`, `security-audit.test.ts`, `setup.test.ts`, plus shared `helpers.ts`/`setup.ts`. Playwright suites under `tests/playwright/` are excluded from Vitest.

## Commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev (frontend + API) | `pnpm dev` (starts the API, waits for `/api/health`, then Vite; starts Vite even if health never answers) |
| Frontend only (5173) | `pnpm dev:web` (proxies `/api` → `:4000`; override `API_PROXY_TARGET`) |
| API only (4000) | `pnpm dev:api` (`tsx watch src/server.ts`) |
| Frontend typecheck | `pnpm typecheck` (runs `tsc -b`); `pnpm exec tsc -b` is equivalent |
| Frontend build | `pnpm build` (`tsc -b && vite build`) |
| API typecheck | `pnpm typecheck:api` (only covers `src/**/*.ts`) |
| API build | `pnpm build:api` → CommonJS in `apps/api/dist` |
| API tests | `pnpm test:api` — one file: `pnpm --filter @rivr/api exec vitest run tests/auth.test.ts`; one case: add `-t "..."` |
| Playwright suites | `pnpm --filter @rivr/api exec playwright test` (no root script; requires `pnpm dev` + seeded demo data) |
| Generate migration | `pnpm --filter @rivr/api db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` (destructive; creates `admin@admin.com` / `password`) |

No lint, formatter, or frontend test suite is configured — do not invent commands for them. Full gate: `pnpm exec tsc -b`, `pnpm build`, `pnpm typecheck:api`, `pnpm test:api`.

## Setup

- `apps/api/.env` is required and untracked; template at `apps/api/.env.example`. Loaded by `config/env.ts` (cwd `.env`, then `apps/api/.env`) and Zod-validated. Production requires `SESSION_SECRET` ≥ 32 chars; development falls back to a known insecure secret.
- Key vars: `DB_HOST/PORT/USER/PASSWORD/NAME`, `DB_TEST_NAME`, `SESSION_SECRET`, `SESSION_TTL_HOURS`, `COOKIE_NAME`, `COOKIE_SECURE`, `WEB_ORIGIN` (comma-separated CORS allow-list), `ALLOW_DEMO_RESET`, `SEED_ADMIN_*`. `DB_TEST_NAME` is read by `tests/setup.ts` before `env.ts` and is not in the env schema.
- `ALLOW_DEMO_RESET` is forced off in production; cookies are always `Secure` in production. There is **no** `/api/auth/setup` endpoint (a test asserts 404).
- The DB user needs `CREATE DATABASE`/`DROP` because dev boot and tests create/drop schemas.
- First admin: `pnpm create-admin --email <email> --password <12+ chars>` (or `SEED_ADMIN_*`; non-interactive, migrates + seeds roles, refuses if an active super-admin exists). The demo seed separately creates `admin@admin.com` / `password` plus staff/customer demo accounts whose password is `password`.

## Conventions & domain rules

- Roles: `super-admin`, `admin`, `manager`, `receptionist`, `housekeeping`, `accountant`, `restaurant`, `staff`, plus `customer`. Public signup (`/auth/register`) always creates a `customer`; staff roles are assigned by an admin. Role/status literals are duplicated across `apps/api/src/constants.ts`, DB enums, `src/lib/hotel-data.ts`, nav role lists in `src/components/hotel/StaffChrome.tsx`, and `services/permissions.ts` — change them together.
- Permission enforcement matrix: `apps/api/src/services/permissions.ts`; the DB `permissions`/`role_permissions` tables are only a synced mirror (`services/roles.ts`), so editing them changes nothing.
- `/api/admin` is mounted behind `requireAuth` + `requireStaff`; most handlers add `requirePermission(...)`. Exceptions: `/bootstrap` filters by permission, `/dev/reset` checks super-admin manually, and supplier delete is super-admin-only.
- Customer endpoints live under `/api/account` (`modules/account/routes.ts`): overview, profile update, cancel own reservation, no staff permissions.
- Money: `DECIMAL(12,2)` in DB, integer paise in code (`utils/money.ts`). Tax comes from `system_settings.tax_rate_bps` (seeded 12%, fallback `TAX_BASIS_POINTS`), editable via `/admin/settings` (`settings:manage`). Server computes all totals/tax/payment status — never trust client amounts.
- Dates: date-only `YYYY-MM-DD`, compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`); pooled DB connections are pinned to UTC.
- Throw `HttpError` helpers (`utils/http.ts`); `middleware/error.ts` renders `{ error: { code, message, details? } }`.
- Reservation/room transitions live in services, not routes/UI: booking locks the room row with `.for("update")` and rejects overlaps; cancel/no-show frees the room if no other stay is active; check-in → `occupied`; checkout → `cleaning` + housekeeping task; inspected task → `available`.
- Scope is single-property. No payment gateway or email/SMS delivery is wired up; `forgot-password` returns a reset token outside production. Guest dashboard, my-bookings, and password reset are implemented. `hotelInfo` in `src/lib/hotel-data.ts` is placeholder data, not verified property details.
- Animations use `motion/react` (Motion 12).

## Gotchas

- Schema changes: edit `schema.ts` → `pnpm --filter @rivr/api db:generate` → commit the generated SQL → `pnpm db:migrate`. Never edit an applied migration. The runner splits files on `--> statement-breakpoint`, runs each file in a transaction, and records filenames in `schema_migrations`; `multipleStatements` is off, so hand-written migrations need breakpoints between statements. The root `0002_giant_phantom_reporter.sql` is a stray copy and is not applied.
- New tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts` (plus seed inserts), else resets/seeds silently skip them.
- `pnpm db:seed` deletes all business rows (including `users` and `sessions`) then reseeds a large demo dataset with demo accounts (`admin@admin.com` / `password`); it is not additive and must not run against production.
- `pnpm create-admin` does **not** reset the database; it creates the first super-admin and refuses if one already exists.
- `pnpm db:reset` is currently a no-op: `database/reset.ts` has no CLI entrypoint. Use its exported `resetDatabase()`/`dropAllTables()`.
- `POST /api/admin/dev/reset` reseeds only with `ALLOW_DEMO_RESET=true` and a super-admin caller; it clears users/sessions, so everyone must sign in again.
- The root package is the frontend; add backend deps to `apps/api/package.json`. The API is Express 4 + CommonJS (`"type": "commonjs"`), while the root package is ESM.
- API tests set `NODE_ENV=test` and force `DB_NAME = DB_TEST_NAME` (default `rivr_hotel_test`); each suite drops/migrates/seeds in `beforeAll`, and `fileParallelism` is off — keep DB suites serial and never point `DB_TEST_NAME` at a real database. Changing seed data usually means updating the row counts asserted in `tests/seed-auth.test.ts`.
- `pnpm typecheck:api` excludes tests (`src/**/*.ts` only), so test type errors appear only in the editor/Vitest.
- Generated build/test output (`dist/`, `apps/api/dist/`, Playwright reports, logs, `*.tsbuildinfo`, schema dumps) is gitignored. Vendored `.opencode`/`.copilot` skill dirs remain tracked. Never `git add -A`; stage explicit paths.
- Vite config dedupes `react`/`react-dom` because the committed `node_modules` materialises pnpm junctions as real directories.
- `knowledge.md` is this file; `AGENTS.md` remains canonical if they drift.
