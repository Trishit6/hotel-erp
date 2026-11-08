# knowledge.md — RIVR Hotel ERP

Full-stack hotel management + ERP app: React 19/Vite guest site and staff portal, Express 4 REST API in `apps/api` (pnpm workspace package `@rivr/api`), MariaDB 10.6+ via Drizzle ORM. Requires Node 20+ and pnpm `12.16.1`.

`AGENTS.md` is the canonical working guide; `README.md` is the product/API reference but lags the code in places. When they disagree, follow source and `package.json` scripts.

## Where code lives

- `src/` — frontend only: `pages/` (guest pages + admin components exported from `AdminPages.tsx`), `components/hotel/`, `lib/`, `router.tsx` (hand-written code-based TanStack Router tree — register every new page there).
- `src/lib/api.ts` — single typed fetch client (`credentials: "include"`, parses `{ error: { code, message } }` into `ApiError`).
- `src/lib/hotel-store.tsx` — data flow: public catalog (includes property settings) → `/auth/me` → `/admin/bootstrap` + `/admin/reports/dashboard`. Business data comes from the API; only `rivr-theme` is stored in localStorage.
- `apps/api/src/app.ts` builds the Express app; `server.ts` is the entry (dev boot creates the DB and applies migrations; production does neither).
- `apps/api/src/modules/` — `auth/`, `public/`, `shared/` (schemas, query, actor), `admin/` (one `*.routes.ts` per area + aggregate `index.ts`). Routes validate and check permissions, then call `apps/api/src/services/*` for logic/transactions. Exception: `GET /admin/bootstrap` in `modules/admin/index.ts`.
- `apps/api/src/database/schema.ts` — schema source of truth (20 tables). `apps/api/drizzle/migrations/` — generated SQL applied in filename order by `database/migrate.ts`.
- `apps/api/tests/` — real-DB Vitest + Supertest integration tests (`auth.test.ts`, `hotel-flow.test.ts`, `setup.test.ts`) with shared `helpers.ts`/`setup.ts`.

## Commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev (frontend + API) | `pnpm dev` (starts the API, waits for `/api/health`, then Vite) |
| Frontend only (5173) | `pnpm dev:web` (proxies `/api` → `:4000`; override `API_PROXY_TARGET`) |
| API only (4000) | `pnpm dev:api` (`tsx watch src/server.ts`) |
| Frontend typecheck | `pnpm exec tsc -b` — root `pnpm typecheck` is a no-op (`tsconfig.json` has `files: []`) |
| Frontend build | `pnpm build` (`tsc -b && vite build`) |
| API typecheck | `pnpm typecheck:api` (only covers `src/**/*.ts`) |
| API build | `pnpm build:api` → CommonJS in `apps/api/dist` |
| API tests | `pnpm test:api` — one file: `pnpm --filter @rivr/api exec vitest run tests/auth.test.ts`; one case: add `-t "..."`. `tests/seed-auth.test.ts` covers the full demo seed, auth, sessions, and role permissions; Playwright suites under `tests/playwright/` are excluded from Vitest. |
| Generate migration | `pnpm --filter @rivr/api db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` (destructive; creates `admin@admin.com` / `password`) |

No lint, formatter, or frontend test suite is configured — do not invent commands for them. Full gate: `pnpm exec tsc -b`, `pnpm build`, `pnpm typecheck:api`, `pnpm test:api`.

## Setup

- `apps/api/.env` is required and untracked; template at `apps/api/.env.example`. Loaded by `config/env.ts` (cwd `.env`, then `apps/api/.env`) and Zod-validated. Production requires `SESSION_SECRET` ≥ 32 chars.
- Key vars: `DB_HOST/PORT/USER/PASSWORD/NAME`, `DB_TEST_NAME`, `SESSION_SECRET`, `SESSION_TTL_HOURS`, `COOKIE_NAME`, `COOKIE_SECURE`, `WEB_ORIGIN` (comma-separated CORS allow-list), `ALLOW_DEMO_RESET`, `SEED_ADMIN_*`.
- The DB user needs `CREATE DATABASE`/`DROP` because dev boot and tests create/drop schemas.
- First admin: `pnpm create-admin --email <email> --password <12+ chars>` (or `SEED_ADMIN_*`, non-interactive). The demo seed separately creates `admin@admin.com` / `password` plus role/customer demo accounts with password `password`. There is no `/api/auth/setup` endpoint; `SETUP_TOKEN` is vestigial.

## Conventions & domain rules

- Money: `DECIMAL(12,2)` in DB, integer paise in code (`utils/money.ts`). Tax comes from `system_settings.tax_rate_bps` (seeded 12%, fallback `TAX_BASIS_POINTS`), editable via `/admin/settings` (`settings:manage`). Server computes all totals/tax/payment status — never trust client amounts.
- Dates: date-only `YYYY-MM-DD`, compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`); pooled DB connections are pinned to UTC.
- Throw `HttpError` helpers (`utils/http.ts`); `middleware/error.ts` renders `{ error: { code, message, details? } }`.
- All `/api/admin` routes sit behind `requireAuth`; each handler adds `requirePermission(...)`. Permission catalogue: `services/permissions.ts` (`settings:manage`, `restaurant:read/write`, etc.). Role/status literals are duplicated across `apps/api/src/constants.ts`, DB enums, `src/lib/hotel-data.ts`, and nav role lists in `src/components/hotel/StaffChrome.tsx` — change them together.
- Roles: `super-admin`, `admin`, `manager`, `receptionist`, `housekeeping`, `accountant`, `restaurant`, `staff`, plus `customer`.
- Reservation/room transitions live in services, not routes/UI: booking locks the room row with `.for("update")` and rejects overlaps; cancel/no-show frees the room if no other stay is active; check-in → `occupied`; checkout → `cleaning` + housekeeping task; inspected task → `available`.
- Scope is single-property. No payment gateway or email/SMS delivery is wired up; `forgot-password` returns a reset token outside production. Guest dashboard, my-bookings, and password reset are implemented. `hotelInfo` in `src/lib/hotel-data.ts` is placeholder data, not verified property details.

## Gotchas

- Schema changes: edit `schema.ts` → `pnpm --filter @rivr/api db:generate` → commit the generated SQL → `pnpm db:migrate`. Never edit an applied migration. The runner splits files on `--> statement-breakpoint` and records filenames in `schema_migrations`.
- New tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts` (plus seed inserts), else resets/seeds silently skip them.
- `pnpm db:seed` deletes all business rows (including `users` and `sessions`) then reseeds a large demo dataset with demo accounts (`admin@admin.com` / `password`); it is not additive.
- `pnpm create-admin` does **not** reset the database; it creates the first super-admin and refuses if one already exists.
- `pnpm db:reset` is currently a no-op: `database/reset.ts` has no CLI entrypoint. Use its exported `resetDatabase()`/`dropAllTables()`.
- `POST /api/admin/dev/reset` reseeds only with `ALLOW_DEMO_RESET=true` and a super-admin caller; it clears users/sessions.
- The root package is the frontend; add backend deps to `apps/api/package.json`. The API is Express 4 + CommonJS (`"type": "commonjs"`) even though the root declares Express 5 and `"type": "module"`.
- `pnpm typecheck:api` excludes tests (`src/**/*.ts` only) and test files are excluded in `apps/api/tsconfig.json`; test type errors appear only in the editor/Vitest.
- API tests force `DB_NAME = DB_TEST_NAME` (default `rivr_hotel_test`) and drop/migrate/seed per suite; `fileParallelism` is off — keep DB suites serial and never point `DB_TEST_NAME` at a real database.
- Root `dist/` build output is tracked, as are `api-test.log`, `api-typecheck.log`, `seed.log`, `check-flow.mjs`, and vendored `.opencode`/`.copilot` skill dirs. Never `git add -A`; stage explicit paths. Running `pnpm build` dirties tracked `dist/`.
- Vite config dedupes `react`/`react-dom` because the committed `node_modules` materialises pnpm junctions as real directories.
- Animations use `motion/react` (Motion 12).
