# AGENTS.md — RIVR Hotel ERP

Full-stack hotel app: React 19 + Vite frontend at the repo root, Express 4 API in `apps/api` (pnpm workspace package `@rivr/api`), MariaDB + Drizzle ORM. Requires Node 20+ and pnpm (pinned `12.16.1`). `README.md` is the product/API reference; this file is the working guide and overrides it when they disagree.

## Layout and boundaries

- `src/` is frontend only. Backend code, dependencies, and database tooling live in `apps/api`.
- `apps/api/src/app.ts` builds the Express app; `apps/api/src/server.ts` is the process entry. In non-production it creates the database and applies pending migrations on boot; production does neither.
- Route modules (`apps/api/src/modules/**/*.routes.ts`) validate input, check permissions, and call services. Business logic and transactions belong in `apps/api/src/services/*`; the aggregate `/admin/bootstrap` query in `modules/admin/index.ts` is the one exception.
- `/api/admin` is mounted behind `requireAuth` in `modules/admin/index.ts`; each handler adds `requirePermission(...)`. The role→permission matrix is `services/permissions.ts`; domain enums are in `apps/api/src/constants.ts`.
- Role/status literals are duplicated across the API `constants.ts`, DB enums, `src/lib/hotel-data.ts` types, nav role lists in `src/components/hotel/StaffChrome.tsx`, and `services/permissions.ts`. Change them together.
- Throw `HttpError` helpers from `utils/http.ts`. `middleware/error.ts` returns `{ error: { code, message, details? } }`, which the frontend surfaces as `ApiError`.
- Frontend data flow: `src/lib/api.ts` (typed fetch, `credentials: "include"`) → `src/lib/hotel-store.tsx` (public catalog → `/auth/me` → `/admin/bootstrap` plus `/admin/reports/dashboard`). Do not move business records back into localStorage; only `rivr-theme` is stored.
- `src/router.tsx` is a hand-written, code-based TanStack Router tree. Register every new page there. Admin page components are exported from `src/pages/AdminPages.tsx`.
- Animations use `motion/react` (Motion 12). `opencode.jsonc` enables the Motion MCP and `.opencode/skills/motion/` contains the animation skill.

## Commands

| Task | Command |
| --- | --- |
| Frontend dev (5173) | `pnpm dev` — proxies `/api` to `:4000`; override with `API_PROXY_TARGET` |
| API dev (4000) | `pnpm dev:api` — `tsx watch` |
| Frontend typecheck | `pnpm exec tsc -b` — root `pnpm typecheck` exits 0 without checking anything (`tsconfig.json` has `files: []`) |
| Frontend build | `pnpm build` — runs `tsc -b && vite build` |
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
- API tests are real-database integration tests (Vitest + Supertest). `tests/setup.ts` forces `NODE_ENV=test`, `DB_NAME=DB_TEST_NAME` (default `rivr_hotel_test`), and a fixed `SETUP_TOKEN`; each suite calls `resetTestDatabase()` (drop all tables → migrate → seed roles) in `beforeAll`. `fileParallelism` is off on purpose; keep database suites serial. Never point `DB_TEST_NAME` at a real database.
- `pnpm typecheck:api` only includes `src/**/*.ts`, so test type errors appear only in the editor/Vitest.

## Schema and migrations

- Schema source of truth: `apps/api/src/database/schema.ts`. Edit it, run `db:generate`, commit the generated SQL in `apps/api/drizzle/migrations/`, then run `pnpm db:migrate`.
- The custom runner (`database/migrate.ts`) applies `*.sql` in filename order, splits on `--> statement-breakpoint`, runs each file in a transaction, and records filenames in `schema_migrations`. Add a new migration; never edit an applied one.
- New tables must be added to `TABLES` in `database/reset.ts` and `BUSINESS_TABLES` in `database/seed.ts` (plus the seed inserts), or resets/seeds will silently skip them.

## Destructive scripts — read before running

- `pnpm db:seed` deletes all business rows, including `users` and `sessions`, then reseeds demo data. It is not additive; an admin is recreated only when `SEED_ADMIN_*` is set.
- `pnpm create-admin` calls `resetDatabase()` and drops every table before creating the admin. It requires `--email`/`--password` or `SEED_ADMIN_*` and is **not interactive** despite the README.
- `pnpm db:reset` is currently a no-op: `reset.ts` has no CLI entrypoint, so the script exits without resetting. Use the exported `resetDatabase()`/`dropAllTables()` if a real reset is needed.
- `POST /api/admin/dev/reset` reseeds demo data only when `ALLOW_DEMO_RESET=true` and the caller is a super-admin; `env.ts` forces the flag off in production. It clears users/sessions, so everyone must sign in again.

## Domain rules

- Money is `DECIMAL(12,2)` in the DB and integer paise in code (`utils/money.ts`). The server computes all totals and payment status; never trust client amounts. Tax comes from `system_settings.tax_rate_bps` (seeded 12%, fallback `TAX_BASIS_POINTS`), editable via `/admin/settings` (`settings:manage`).
- Dates are date-only `YYYY-MM-DD` strings compared lexicographically; "today" is Asia/Kolkata (`utils/date.ts`). Pooled DB connections are pinned to UTC.
- Reservation/room transitions live in services: booking locks the room row with `.for("update")` and rejects overlaps; cancel/no-show releases the room when no other stay is active; check-in sets `occupied`; checkout sets `cleaning` and creates a housekeeping task; an inspected task sets the room `available`. Do not duplicate these transitions in routes or UI.
- Scope is single-property. Online payments, email/SMS, and guest accounts are not implemented; the guest auth pages intentionally do not call an API. `hotelInfo` in `src/lib/hotel-data.ts` is still placeholder data — do not treat its address or phone as verified property details.

## Repo gotchas

- The root package is the frontend. Add backend dependencies in `apps/api/package.json`; the API is Express 4 + CommonJS even though the root package declares Express 5 and `"type": "module"`.
- Root `dist/` build output is tracked, as are `api-test.log`, `api-typecheck.log`, `seed.log`, `check-flow.mjs`, and the vendored `.opencode`/`.copilot` skill directories; `node_modules/` is ignored. Never use `git add -A`; stage explicit paths only. Running `pnpm build` dirties tracked `dist/`.
- `README.md` lags the code (pnpm version, `create-admin` interactivity, `db:reset`); prefer `package.json` scripts and source when they disagree.
- `knowledge.md` duplicates this guide and can lag behind it; treat `AGENTS.md` as canonical.
