# knowledge.md — RIVR Hotel ERP

Full-stack hotel management + ERP: a guest-facing site and staff workspace (React 19 + Vite + TanStack Router + Tailwind 4) backed by an Express 4 API in `apps/api` (workspace package `@rivr/api`), MariaDB 10.6+ and Drizzle ORM. Requires Node 20+ and pnpm 12.18.0 (`packageManager`).

`AGENTS.md` is the canonical working guide. `README.md` is the product overview but lags the code (it still documents the removed unauthenticated `POST /public/reservations` and lists 17 tables). Source, `package.json`, and `AGENTS.md` win.

## Where code lives

- `src/` — frontend only. `pages/` (guest pages; admin components exported from `AdminPages.tsx`; role dashboards in `RoleDashboards.tsx` / `GuestDashboardPage.tsx`), `components/hotel/`, `lib/`, `router.tsx` (hand-written, code-based route tree — register every new page there).
- `src/lib/api.ts` — single typed fetch client (`credentials: "include"`, parses `{ error: { code, message, details? } }` into `ApiError`). Requests `/api`; Vite proxies to `API_PROXY_TARGET` (default `http://localhost:4000`). Set `VITE_API_URL` at build time for a different base.
- `src/lib/hotel-store.tsx` — store flow: public catalog → `/auth/me` → `/admin/bootstrap` + `/admin/reports/dashboard` (dashboard skipped for `staff`, which lacks `dashboard:read`). Business data comes from the API; only `rivr-theme` is persisted (`src/lib/theme.tsx`). Booking success uses a one-time `sessionStorage` handoff (`src/lib/booking-handoff.ts`).
- `apps/api/src/app.ts` builds the Express app; `server.ts` is the entry point. Non-production boot creates the DB and applies migrations; production does neither, so run migrations explicitly on deploy.
- `apps/api/src/modules/` — `auth/`, `account/` (customer-only, guarded by `assertCustomer`), `public/`, `shared/` (schemas, query helpers, actor), `admin/` (one `*.routes.ts` per area plus the aggregate `index.ts`). Routes validate + check permissions, then call `apps/api/src/services/*` for logic/transactions. Exception: the aggregate `GET /admin/bootstrap` query in `modules/admin/index.ts`.
- `apps/api/src/database/schema.ts` — schema source of truth (~43 tables). Generated SQL in `apps/api/drizzle/migrations/` (currently `0000`–`0004`) is applied in filename order by `database/migrate.ts`. Seed catalogue: `database/seed-data.ts`; orchestration: `database/seed.ts`.
- `apps/api/tests/` — real-database Vitest + Supertest integration suites (`auth`, `auth-timing`, `checkin-checkout-rules`, `customer-booking-auth`, `guest-profile-protection`, `hotel-flow`, `public-reservation-lookup`, `reference-generation`, `reservation-holds`, `room-status`, `security-audit`, `seed-auth`, `setup`, plus pure `config-validation` / `session-error-logging`), shared `helpers.ts` / `setup.ts`. Playwright suite: `tests/playwright/auth.test.ts` (excluded from Vitest).
- `reports/` — implementation reports and reference screenshots (tracked; not runtime code).

## Commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev (frontend + API) | `pnpm dev` (`scripts/dev.mjs`: starts API, waits for `/api/health`, then Vite; skips the API if health already answers, starts Vite even if it never does) |
| Frontend only (5173) | `pnpm dev:web` (proxies `/api` → `:4000`; override `API_PROXY_TARGET`) |
| API only (4000) | `pnpm dev:api` (`tsx watch src/server.ts`) |
| Frontend typecheck | `pnpm typecheck` (`tsc -b`; `pnpm exec tsc -b` equivalent) |
| Frontend build | `pnpm build` (`tsc -b && vite build`) |
| API typecheck | `pnpm typecheck:api` (covers `src/**/*.ts` only) |
| API build | `pnpm build:api` → CommonJS in `apps/api/dist` |
| API tests | `pnpm test:api`; one file: `pnpm --filter @rivr/api exec vitest run tests/auth.test.ts`; one case: add `-t "..."` |
| Playwright | `pnpm --filter @rivr/api exec playwright test` (no root script; needs `pnpm dev` + seeded demo data; hits `http://127.0.0.1:5173` directly — no `webServer`) |
| Generate migration | `pnpm --filter @rivr/api db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` (destructive, see below) |
| First super-admin | `pnpm create-admin --email <email> --password <12+ chars>` (non-interactive) |

No lint, formatter, frontend test suite, or CI workflow is configured — do not invent them. Full gate, in order: `pnpm build` (already runs `tsc -b`), `pnpm typecheck:api`, `pnpm test:api`.

## Setup and environment

- `apps/api/.env` is required and untracked; template at `apps/api/.env.example`. `config/env.ts` loads cwd `.env` then `apps/api/.env`, Zod-validates it. Production rejects a `SESSION_SECRET` under 32 chars, insecure cookies, and loopback `WEB_ORIGIN`.
- Key vars: `DB_HOST/PORT/USER/PASSWORD/NAME`, `DB_TEST_NAME`, `SESSION_SECRET`, `SESSION_TTL_HOURS`, `COOKIE_NAME`, `COOKIE_SECURE`, `WEB_ORIGIN` (comma-separated CORS allow-list), `TRUST_PROXY`, `API_PUBLIC_URL`, `ALLOW_DEMO_RESET`, `SEED_ADMIN_*`. `DB_TEST_NAME` is read by `tests/setup.ts` before `env.ts` and is not in the env schema.
- DB user needs `CREATE DATABASE`/`DROP` because dev boot and tests create and drop databases/tables.
- Demo seed credentials: `admin@admin.com` / `password`, plus staff (`manager@`, `reception@`, `housekeeping@`, `accountant@`, `restaurant@`, `staff@` — `rivrhotel.in`) and customer accounts, all password `password`. Local demo only.

## Auth, roles and permissions

- Roles (`apps/api/src/constants.ts`): `super-admin`, `admin`, `manager`, `receptionist`, `housekeeping`, `accountant`, `restaurant`, `staff`, plus `customer`.
- Public signup (`/auth/register`) always creates a `customer` and sets a session; staff roles are assigned by an admin. `/api/auth/setup` returns 404 (tested). Customer endpoints live under `/api/account`; customer booking is `POST /api/account/reservations` — there is deliberately **no** unauthenticated reservation-creation route. `/public/*` exposes catalog, availability, and `POST /public/reservations/verify` (reference + matching email **or** phone, rate-limited).
- Enforcement matrix: `apps/api/src/services/permissions.ts`. DB `permissions` / `role_permissions` are only a synced mirror (`services/roles.ts`) — editing them changes nothing.
- `/api/admin` is mounted behind `requireAuth` + `requireStaff`; most handlers add `requirePermission(...)`. Exceptions: `/bootstrap` filters by permission, `/dev/reset` checks super-admin manually, supplier delete is super-admin-only. `suppliers.routes.ts` uses `inventory:*`, so don't copy it as a "staff-only" template.
- Role/status literals are duplicated across the API `constants.ts`, DB `mysqlEnum`s, `src/lib/hotel-data.ts`, nav role lists in `src/components/hotel/StaffChrome.tsx`, `services/permissions.ts`, and the seed catalogue — update them together.
- Sessions: HttpOnly `SameSite=Lax` cookie; only an HMAC-SHA256 hash of the token is stored. Login and public verification are rate-limited; global limiter applies. Passwords use Argon2id.

## Domain rules

- Money: `DECIMAL(12,2)` in DB, integer paise in code (`utils/money.ts`). The server computes every total, tax and payment status — never trust client amounts. Tax comes from `system_settings.tax_rate_bps` (seeded 12%, fallback `TAX_BASIS_POINTS`), editable via `/admin/settings` (`settings:manage`).
- Dates: date-only `YYYY-MM-DD`, compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`); pooled connections pinned to UTC.
- Reservations cannot overlap per room; booking locks the room row with `.for("update")`. Public bookings start `pending` with a hold (default 2h); staff bookings start `confirmed`. Held, non-expired reservations block availability.
- Room transitions live in services, never routes/UI: cancel/no-show frees the room only when no other stay needs it; same-day stay may set `reserved`; check-in → `occupied`; checkout → `cleaning` + housekeeping task; inspected task → `available`. `maintenance` / `out-of-order` / `cleaning` are unsellable.
- Scope is single-property. `hotels` / `branches` are seeded but unused by services; settings live in the single `system_settings` row.
- No payment gateway or email/SMS delivery is wired up; `forgot-password` returns a reset token outside production. `hotelInfo` in `src/lib/hotel-data.ts` is placeholder data — not verified property details.
- Frontend animation mostly uses `motion/react` (Motion 12); a few hero/scroll/image pieces use GSAP (`HomePage.tsx`, `PageHero.tsx`, `components/motion/gsap.ts`). `.opencode/skills/motion/` holds the animation skill.

## Gotchas

- Schema changes: edit `schema.ts` → `pnpm --filter @rivr/api db:generate` → commit the generated SQL → `pnpm db:migrate`. Never edit an applied migration. The runner splits on `--> statement-breakpoint`, wraps each file in a transaction, and records filenames in `schema_migrations`; `multipleStatements` is off, so hand-written migrations need a breakpoint between statements. The root `0002_giant_phantom_reporter.sql` is a stray copy and is not applied.
- New business tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts` (plus seed inserts), or resets/seeds silently skip them. Idempotently seeded reference tables (`departments`, `shifts`, `housekeeping_status`) intentionally stay out of `BUSINESS_TABLES`.
- `pnpm db:seed` deletes all `BUSINESS_TABLES` rows (including `users` and `sessions`) then reseeds a large demo dataset. Not additive; never against production. `SEED_ADMIN_*` can additionally create/update a separate admin.
- `pnpm db:reset` is currently a **no-op**: `database/reset.ts` has no CLI entrypoint. Use exported `resetDatabase()` / `dropAllTables()`.
- `POST /api/admin/dev/reset` reseeds only when `ALLOW_DEMO_RESET=true` (forced off in production) and the caller is a super-admin; it clears users/sessions, so everyone must sign in again.
- `pnpm create-admin` does not reset the DB; it migrates, seeds roles, and refuses when an active super-admin already exists.
- Tests are real-DB integration tests. `tests/setup.ts` forces `NODE_ENV=test`, sets `DB_NAME` from `DB_TEST_NAME` (default `rivr_hotel_test`), a fixed test secret, and disables demo reset/seed admin. DB suites call `resetTestDatabase()` (drop → migrate → seed roles) in `beforeAll`; `fileParallelism` is off — keep DB suites serial and never point `DB_TEST_NAME` at a real DB. `tests/seed-auth.test.ts` asserts minimum row counts across ~30 tables and the permission matrix, so seed changes usually require updating it.
- `pnpm typecheck:api` excludes tests (`src/**/*.ts` only), so test type errors only appear in the editor/Vitest.
- The root package is the frontend (ESM); add backend deps to `apps/api/package.json`. The API is Express 4 + CommonJS (`"type": "commonjs"`).
- Generated output (`dist/`, `apps/api/dist/`, Playwright reports, logs, `*.tsbuildinfo`, schema dumps) is gitignored; vendored `.opencode` / `.copilot` skill dirs stay tracked. Never `git add -A`; stage explicit paths only.
- `vite.config.ts` dedupes `react` / `react-dom` because the committed `node_modules` materialises pnpm Windows junctions as real directories.
- Registration/updating role-sensitive literals? See "Auth, roles and permissions" above — six places must stay in sync.
