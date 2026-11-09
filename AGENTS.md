# AGENTS.md — RIVR Hotel ERP

Full-stack hotel app: React 19 + Vite frontend at the repo root, Express 4 API in `apps/api` (pnpm workspace package `@rivr/api`), MariaDB + Drizzle ORM. Requires Node 20+ and pnpm (pinned `12.18.0`). `README.md` is the product overview; this file plus `package.json` and source win when they disagree.

## Layout and boundaries

- `src/` is frontend only. Backend code, dependencies, and database tooling live in `apps/api`.
- `apps/api/src/app.ts` builds the Express app; `apps/api/src/server.ts` is the process entry. In non-production it creates the database and applies pending migrations on boot; production does neither, so deploy must run migrations explicitly.
- Route modules (`apps/api/src/modules/**/*.routes.ts`) validate input, check permissions, and call services. Business logic and transactions belong in `apps/api/src/services/*`; the aggregate `/admin/bootstrap` query in `modules/admin/index.ts` is the one exception.
- `/api/admin` is mounted behind `requireAuth` + `requireStaff` in `modules/admin/index.ts`; most handlers add `requirePermission(...)`, but `/bootstrap` filters by permission and `/dev/reset` checks super-admin manually. `suppliers.routes.ts` uses `inventory:read`/`inventory:write` (delete also requires super-admin), so do not copy it as a "staff-only" example. The enforcement matrix is `services/permissions.ts`; DB `permissions`/`role_permissions` are only a synced mirror (`services/roles.ts`), so editing them changes nothing.
- Role/status literals live in the API `constants.ts` (DB `mysqlEnum`s import them) but are duplicated in `src/lib/hotel-data.ts`, nav role lists in `src/components/hotel/StaffChrome.tsx`, `services/permissions.ts`, and the seed catalogue. Update them together.
- Public signup (`/auth/register`) always creates a `customer` and sets a session; staff roles are assigned by an admin. Customer endpoints live under `/api/account` (`modules/account/routes.ts`) and are guarded by `assertCustomer`. Customer booking is `POST /api/account/reservations`—there is deliberately **no** unauthenticated reservation-creation route, and `/api/auth/setup` returns 404 (tested).
- Throw `HttpError` helpers from `utils/http.ts`. `middleware/error.ts` returns `{ error: { code, message, details? } }`, which the frontend surfaces as `ApiError`.
- Frontend data flow: `src/lib/api.ts` (typed fetch, `credentials: "include"`) → `src/lib/hotel-store.tsx` (public catalog → `/auth/me` → `/admin/bootstrap` plus `/admin/reports/dashboard`). The store skips the dashboard for the `staff` role because `dashboard:read` excludes it. Do not move business records back into localStorage; only `rivr-theme` is stored (`src/lib/theme.tsx`). Booking success uses a one-time `sessionStorage` handoff (`src/lib/booking-handoff.ts`), not localStorage.
- `src/lib/api.ts` targets `/api` (Vite proxies to `API_PROXY_TARGET`, default `http://localhost:4000`); set `VITE_API_URL` at build time to point elsewhere.
- There is no shared types package. DB rows are shaped by `apps/api/src/services/mappers.ts` and mirrored in `src/lib/hotel-data.ts`; adding a field means touching the schema, mapper, and frontend type.
- `src/router.tsx` is a hand-written, code-based TanStack Router tree. Register every new page there. Admin page components are exported from `src/pages/AdminPages.tsx`; non-admin role dashboards are in `RoleDashboards.tsx` and `GuestDashboardPage.tsx`.
- Most animation uses `motion/react` (Motion 12); a few hero/scroll/image components use GSAP (`src/pages/HomePage.tsx`, `src/components/hotel/PageHero.tsx`, `src/components/motion/gsap.ts`). `opencode.jsonc` enables the Motion MCPs and `.opencode/skills/motion/` contains the animation skill.

## Commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev (frontend + API) | `pnpm dev` — starts the API, waits for `/api/health`, then starts Vite; skips the API if health already answers and starts Vite even if health never does |
| Frontend only (5173) | `pnpm dev:web` — proxies `/api` to `:4000`; override with `API_PROXY_TARGET` |
| API only (4000) | `pnpm dev:api` — `tsx watch` |
| Frontend typecheck | `pnpm typecheck` (runs `tsc -b`); `pnpm exec tsc -b` is equivalent |
| Frontend build | `pnpm build` — runs `tsc -b && vite build` |
| API typecheck | `pnpm typecheck:api` |
| API build | `pnpm build:api` — emits CommonJS to `apps/api/dist` |
| API tests | `pnpm test:api` |
| One test file | `pnpm --filter @rivr/api exec vitest run tests/auth.test.ts` |
| One test case | add `-t "part of the test name"` |
| Generate migration | `pnpm --filter @rivr/api db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` (destructive, see below) |

There is no lint, formatter, frontend test suite, or CI workflow configured. Do not invent commands for them. Full gate, in order: `pnpm build` (already runs `tsc -b`), `pnpm typecheck:api`, `pnpm test:api`.

## Setup and tests

- `apps/api/.env` is expected (untracked; template at `apps/api/.env.example`). `config/env.ts` loads cwd `.env` then `apps/api/.env` and Zod-validates it; production requires `SESSION_SECRET` of at least 32 characters.
- MariaDB 10.6+ is required. The DB user needs `CREATE DATABASE` and `DROP` privileges because dev boot/tests create the database and drop tables.
- API tests are real-database integration tests (Vitest + Supertest). `tests/setup.ts` forces `NODE_ENV=test` and sets `DB_NAME` from `DB_TEST_NAME` (default `rivr_hotel_test`) plus a fixed test session secret; `DB_TEST_NAME` is read before `env.ts`, not validated there. Database-backed suites call `resetTestDatabase()` (drop all tables → migrate → seed roles) in `beforeAll`; `tests/config-validation.test.ts` and `tests/session-error-logging.test.ts` are pure/mocked and need no database. `fileParallelism` is off on purpose; keep database suites serial. Never point `DB_TEST_NAME` at a real database. `tests/seed-auth.test.ts` runs the full demo seed and asserts minimum row counts across ~30 tables, `admin@admin.com` / `password`, session handling, and the staff/customer permission matrix; changing seed data usually means updating those minimums.
- `apps/api/vitest.config.ts` deliberately excludes `tests/playwright/**`; browser suites run with `pnpm --filter @rivr/api exec playwright test` (no root script). They hit `http://127.0.0.1:5173` directly—the Playwright config has no `webServer`—so run `pnpm dev` and seed demo data first.
- `pnpm typecheck:api` only includes `src/**/*.ts`, so test type errors appear only in the editor/Vitest.
- First super admin: `pnpm create-admin --email <email> --password <12+ chars>` (or `SEED_ADMIN_*`). It migrates and seeds roles, refuses if an active super-admin already exists, and is **not interactive**. The demo seed below separately creates `admin@admin.com` / `password`.

## Schema and migrations

- Schema source of truth: `apps/api/src/database/schema.ts`. Edit it, run `db:generate`, commit the generated SQL in `apps/api/drizzle/migrations/`, then run `pnpm db:migrate`.
- The custom runner (`database/migrate.ts`) applies `apps/api/drizzle/migrations/*.sql` in filename order, splits on `--> statement-breakpoint`, runs each file in a transaction, and records filenames in `schema_migrations`. `multipleStatements` is off, so every statement in a hand-written migration needs a breakpoint marker. Add a new migration; never edit an applied one. The tracked root `0002_giant_phantom_reporter.sql` is a stray copy and is not applied.
- New business tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts` (plus the seed inserts), or resets/seeds will silently skip them. Reference tables seeded idempotently (`departments`, `shifts`, `housekeeping_status`) intentionally stay out of `BUSINESS_TABLES`.

## Destructive scripts — read before running

- `pnpm db:seed` deletes all rows in `BUSINESS_TABLES` (including `users` and `sessions`), then reseeds a large demo dataset. It is not additive. The seed creates the demo super-admin `admin@admin.com` / `password` and staff/customer demo accounts whose password is also `password`; it warns when `NODE_ENV=production`. `SEED_ADMIN_*` can additionally create/update a separate admin. Do not run it against a production database.
- `pnpm create-admin` does **not** reset the database; it only creates the first super-admin and refuses if one already exists.
- `pnpm db:reset` is currently a no-op: `reset.ts` has no CLI entrypoint, so the script exits without resetting. Use the exported `resetDatabase()`/`dropAllTables()` if a real reset is needed.
- `POST /api/admin/dev/reset` reseeds demo data only when `ALLOW_DEMO_RESET=true` and the caller is a super-admin; `env.ts` forces the flag off in production. It clears users/sessions, so everyone must sign in again.

## Domain rules

- Money is `DECIMAL(12,2)` in the DB and integer paise in code (`utils/money.ts`). The server computes all totals and payment status; never trust client amounts. Tax comes from `system_settings.tax_rate_bps` (seeded 12%, fallback `TAX_BASIS_POINTS`), editable via `/admin/settings` (`settings:manage`).
- Dates are date-only `YYYY-MM-DD` strings compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`). Pooled DB connections are pinned to UTC.
- Reservation/room transitions live in services: booking locks the room row with `.for("update")` and rejects overlaps; cancel/no-show releases the room when no other stay is active; check-in sets `occupied`; checkout sets `cleaning` and creates a housekeeping task; an inspected task sets the room `available`. Do not duplicate these transitions in routes or UI.
- Scope is single-property. The `hotels`/`branches` tables exist but are only seeded—no service reads them yet; settings live in the single `system_settings` row. No payment gateway or email/SMS delivery is wired up; `forgot-password` returns a reset token outside production so the flow is testable. `hotelInfo` in `src/lib/hotel-data.ts` is still placeholder data — do not treat its address or phone as verified property details.

## Repo gotchas

- The root package is the frontend. Add backend dependencies in `apps/api/package.json`; the API is Express 4 + CommonJS (`"type": "commonjs"`) while the root package is `"type": "module"`.
- Generated build/test output (`dist/`, `apps/api/dist/`, Playwright reports, logs, `*.tsbuildinfo`, schema dumps) is gitignored. The vendored `.opencode`/`.copilot` skill directories remain tracked; `node_modules/` is ignored. Never use `git add -A`; stage explicit paths only.
- `README.md` is usable but stale in places: it lists 17 tables (the schema has ~42), documents the removed unauthenticated `POST /public/reservations` (customer booking is `POST /api/account/reservations`), and omits newer routes such as suppliers/settings/restaurant menus. Prefer `package.json`, this file, and source when they disagree.
- `knowledge.md` duplicates this guide and has stale details; treat `AGENTS.md` as canonical.
