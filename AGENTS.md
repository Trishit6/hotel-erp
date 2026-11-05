# AGENTS.md — RIVR Hotel ERP

Full-stack hotel app: React 19 + Vite frontend at the repo root, Express 4 API in `apps/api` (pnpm workspace package `@rivr/api`), MariaDB + Drizzle ORM. Requires Node 20+ and pnpm (pinned `12.16.1`). `README.md` is the product/API reference; this file is the working guide.

## Layout and boundaries

- `src/` is frontend only. Backend code, dependencies, and database tooling live in `apps/api`.
- `apps/api/src/app.ts` builds the Express app; `apps/api/src/server.ts` is the process entry. In non-production it creates the database and applies pending migrations on boot; production does neither.
- Route modules (`apps/api/src/modules/**/*.routes.ts`) validate input, check permissions, and call services. Business logic and transactions belong in `apps/api/src/services/*`; the aggregate `/admin/bootstrap` query in `modules/admin/index.ts` is the one exception.
- `/api/admin` is mounted behind `requireAuth` in `modules/admin/index.ts`; each handler adds `requirePermission(...)`. Permission lists live in `services/permissions.ts`; role/status values live in `src/constants.ts`.
- Throw `HttpError` helpers from `utils/http.ts`. `middleware/error.ts` returns `{ error: { code, message, details? } }`, which the frontend surfaces as `ApiError`.
- Frontend data flow: `src/lib/api.ts` (typed fetch, `credentials: "include"`) → `src/lib/hotel-store.tsx` (public catalog, then `/auth/me`, then `/admin/bootstrap`). Do not move business records back into localStorage; only `rivr-theme` is stored.
- `src/router.tsx` is a hand-written, code-based TanStack Router tree. Register every new page there. Admin page components are exported from `src/pages/AdminPages.tsx`.

## Commands

| Task | Command |
| --- | --- |
| Frontend dev (5173) | `pnpm dev` — proxies `/api` to `:4000`; override with `API_PROXY_TARGET` |
| API dev (4000) | `pnpm dev:api` — `tsx watch` |
| Frontend typecheck | `pnpm exec tsc -b` — **`pnpm typecheck` is a no-op** (`tsconfig.json` has `files: []`) |
| Frontend build | `pnpm build` |
| API typecheck | `pnpm typecheck:api` |
| API build | `pnpm build:api` — emits CommonJS to `apps/api/dist` |
| API tests | `pnpm test:api` |
| One test file | `pnpm --filter @rivr/api exec vitest run tests/auth.test.ts` |
| One test case | add `-t "part of the test name"` |
| Generate migration | `pnpm --filter @rivr/api db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` (destructive, see below) |

There is no lint, formatter, or frontend test suite configured. Do not invent commands for them. Full gate: `pnpm exec tsc -b`, `pnpm build`, `pnpm typecheck:api`, `pnpm test:api`.

## Setup and tests

- `apps/api/.env` is required (untracked; template at `apps/api/.env.example`). `config/env.ts` loads cwd `.env` then `apps/api/.env` and Zod-validates it; production requires `SESSION_SECRET` of at least 32 characters.
- MariaDB 10.6+ is required. The DB user needs `CREATE DATABASE` and `DROP` privileges because dev boot and tests create/drop schemas.
- API tests are real-database integration tests (Vitest + Supertest). `tests/setup.ts` forces `DB_NAME` to `DB_TEST_NAME` (default `rivr_hotel_test`) and each suite drops/recreates all tables in `beforeAll`. `fileParallelism` is off on purpose; keep database suites serial.
- `pnpm typecheck:api` only includes `src/**/*.ts`, so test type errors appear only in the editor/Vitest.

## Schema and migrations

- Schema source of truth: `apps/api/src/database/schema.ts`. Edit it, run `db:generate`, commit the generated SQL in `apps/api/drizzle/migrations/`, then run `pnpm db:migrate`.
- The custom runner (`database/migrate.ts`) applies `*.sql` in filename order, splits on `--> statement-breakpoint`, and records filenames in `schema_migrations`. Add a new migration; never edit an applied one.
- New tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts`, or resets/seeds will silently skip them.

## Destructive scripts — read before running

- `pnpm db:seed` deletes all business rows, including `users` and `sessions`, then reseeds demo data. It is not additive; an admin is recreated only when `SEED_ADMIN_*` is set.
- `pnpm create-admin` calls `resetDatabase()` and drops every table before creating the admin. It requires `--email`/`--password` or `SEED_ADMIN_*` and is **not interactive** despite the README.
- `pnpm db:reset` is currently a no-op: `reset.ts` has no CLI entrypoint, so the script exits without resetting. Use the exported `resetDatabase()`/`dropAllTables()` if a real reset is needed.
- `POST /api/admin/dev/reset` reseeds demo data only when `ALLOW_DEMO_RESET=true` and the caller is a super-admin.

## Domain rules

- Money is `DECIMAL(12,2)` in the DB and integer paise in code (`utils/money.ts`); tax is 12% (`TAX_BASIS_POINTS`). The server computes all totals and payment status; never trust client amounts.
- Dates are date-only `YYYY-MM-DD` strings compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`). DB connections are pinned to UTC.
- Reservation/room transitions live in services: booking locks the room row with `.for("update")` and rejects overlaps; cancel/no-show releases the room when no other stay is active; check-in sets `occupied`; checkout sets `cleaning` and creates a housekeeping task; an inspected task sets the room `available`. Do not duplicate these transitions in routes or UI.
- Roles/statuses are kebab-case (`super-admin`, `out-of-order`) and duplicated across `apps/api/src/constants.ts`, DB enums, and `src/lib/hotel-data.ts`; change them together.
- Scope is single-property. Online payments, email/SMS, and guest accounts are not implemented; the guest auth pages intentionally do not call an API.

## Repo gotchas

- The root package is the frontend. Add backend dependencies in `apps/api/package.json`; the API is Express 4 + CommonJS even though the root package declares Express 5 and `"type": "module"`.
- `node_modules/` (~18k files) and the root `dist/` are already tracked in git despite `.gitignore`. Never use `git add -A`; stage explicit paths only.
- `README.md` lags the code in places (e.g. `create-admin`, `db:reset`, pnpm version). Prefer `package.json` scripts and source when they disagree.
