# knowledge.md — RIVR Hotel ERP

Full-stack hotel management + ERP app: React 19/Vite guest site and staff portal, Express 4 REST API in `apps/api` (pnpm workspace package `@rivr/api`), MariaDB 10.6+ via Drizzle ORM. Requires Node 20+ and pnpm `12.16.1`.

## Where code lives

- `src/` — frontend only: `pages/` (guest pages + `AdminPages.tsx`), `components/hotel/`, `lib/`, `router.tsx` (hand-written TanStack Router tree — register every new page here).
- `src/lib/api.ts` — the single typed fetch client (`credentials: "include"`, parses `{ error: { code, message } }` into `ApiError`).
- `src/lib/hotel-store.tsx` — data flow: public catalog → `/auth/me` → `/admin/bootstrap`. Business data comes from the API, not localStorage (only `rivr-theme` is stored there).
- `apps/api/src/app.ts` builds the Express app; `server.ts` is the process entry (dev boot creates the DB + applies migrations; production does neither).
- `apps/api/src/modules/` — `auth`, `public`, `admin` route modules. Routes validate + check permissions, then call `apps/api/src/services/*` (business logic/transactions). Exception: aggregate `GET /admin/bootstrap` in `modules/admin/index.ts`.
- `apps/api/src/database/schema.ts` — schema source of truth. `apps/api/drizzle/migrations/` — generated SQL, applied in filename order by `database/migrate.ts`.
- `apps/api/tests/` — real-DB Vitest + Supertest integration tests (`auth.test.ts`, `hotel-flow.test.ts`).

## Commands

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Frontend dev (5173) | `pnpm dev` (proxies `/api` → `:4000`; override `API_PROXY_TARGET`) |
| API dev (4000) | `pnpm dev:api` (`tsx watch`) |
| Frontend typecheck | `pnpm exec tsc -b` — root `pnpm typecheck` is a no-op (`tsconfig.json` has `files: []`) |
| Frontend build | `pnpm build` |
| API typecheck | `pnpm typecheck:api` |
| API build | `pnpm build:api` → CommonJS in `apps/api/dist` |
| API tests | `pnpm test:api` — one file: `pnpm --filter @rivr/api exec vitest run tests/auth.test.ts`; one case: add `-t "..."` |
| Generate migration | `pnpm --filter @rivr/api db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` (destructive) |

No lint, formatter, or frontend test suite is configured — do not invent commands for them. Full gate: `pnpm exec tsc -b`, `pnpm build`, `pnpm typecheck:api`, `pnpm test:api`.

## Setup

- `apps/api/.env` is required and untracked; template at `apps/api/.env.example`. Loaded by `config/env.ts` (cwd `.env`, then `apps/api/.env`) and Zod-validated. Production requires `SESSION_SECRET` ≥ 32 chars.
- Key vars: `DB_HOST/PORT/USER/PASSWORD/NAME`, `SESSION_SECRET`, `WEB_ORIGIN` (comma-separated CORS allow-list), `DB_TEST_NAME`, `SETUP_TOKEN`, `ALLOW_DEMO_RESET`, `SEED_ADMIN_*`, `COOKIE_SECURE`.
- The DB user needs `CREATE DATABASE`/`DROP` because dev boot and tests create/drop schemas.
- First admin: `pnpm create-admin` (non-interactive flags/`SEED_ADMIN_*`, not interactive despite the README), `POST /api/auth/setup` with `SETUP_TOKEN`, or `SEED_ADMIN_*` before seeding. Passwords min 12 chars, Argon2id.

## Conventions & domain rules

- Money: `DECIMAL(12,2)` in DB, integer paise in code (`utils/money.ts`). Tax 12% (`TAX_BASIS_POINTS`). Server computes all totals/tax/payment status — never trust client amounts.
- Dates: date-only `YYYY-MM-DD`, compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`); DB connections pinned to UTC.
- Throw `HttpError` helpers (`utils/http.ts`); `middleware/error.ts` renders `{ error: { code, message, details? } }`.
- All `/api/admin` routes sit behind `requireAuth`; each handler adds `requirePermission(...)`. Permission catalogue: `services/permissions.ts`. Roles/statuses are kebab-case (`super-admin`, `out-of-order`) and duplicated across `apps/api/src/constants.ts`, DB enums, and `src/lib/hotel-data.ts` — change them together.
- Reservation/room transitions live in services, not routes/UI: booking locks the room row with `.for("update")` and rejects overlaps; cancel/no-show frees the room if no other stay is active; check-in → `occupied`; checkout → `cleaning` + housekeeping task; inspected task → `available`.
- Scope is single-property. No online payments, email/SMS, or guest accounts (guest auth pages intentionally never call the API).

## Gotchas

- Schema changes: edit `schema.ts` → `pnpm --filter @rivr/api db:generate` → commit the generated SQL → `pnpm db:migrate`. Never edit an applied migration. The runner splits files on `--> statement-breakpoint` and records filenames in `schema_migrations`.
- New tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts`, else resets/seeds skip them.
- `pnpm db:seed` deletes all business rows (including `users` and `sessions`) then reseeds; it is not additive.
- `pnpm create-admin` calls `resetDatabase()` and drops every table first.
- `pnpm db:reset` is currently a no-op: `database/reset.ts` has no CLI entrypoint. Use its exported `resetDatabase()`/`dropAllTables()` if a real reset is needed.
- `POST /api/admin/dev/reset` reseeds only with `ALLOW_DEMO_RESET=true` and a super-admin caller.
- The root package is the frontend; add backend deps to `apps/api/package.json`. The API is Express 4 + CommonJS even though the root declares Express 5 and `"type": "module"`.
- `pnpm typecheck:api` only covers `src/**/*.ts`; test type errors show only in the editor/Vitest.
- API tests force `DB_NAME = DB_TEST_NAME` (default `rivr_hotel_test`) and drop/recreate tables per suite; `fileParallelism` is off — keep DB suites serial.
- `node_modules/` and root `dist/` are tracked in git despite `.gitignore`; never `git add -A`, stage explicit paths.
- `README.md` lags the code in places (`create-admin`, `db:reset`, pnpm version); prefer `package.json` scripts and source.
