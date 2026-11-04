# RIVR Hotel ERP

RIVR is a full-stack hotel management and ERP application. The guest-facing React site and the staff operations workspace are backed by an Express + TypeScript REST API, MariaDB, and Drizzle ORM.

The existing guest pages, admin pages, routes, styling, and workflows are preserved. The difference is that business data now comes from the API and database instead of browser storage.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, TanStack Router, Tailwind CSS 4, Motion |
| API | Node.js, Express 4, TypeScript, Zod |
| Database | MariaDB 10.6+ / MySQL 5.7+ compatible, Drizzle ORM, mysql2 |
| Auth | Argon2id (`@node-rs/argon2`), server-managed sessions, HTTP-only cookies |
| Security | Helmet, explicit-origin CORS, rate limiting, RBAC, Zod validation |
| Tests | Vitest, Supertest, real database integration tests |
| Package manager | pnpm 11 |

---

## Repository layout

```text
.
├── apps/
│   └── api/
│       ├── drizzle/                 # generated SQL migrations
│       ├── scripts/create-admin.ts  # interactive initial admin setup
│       ├── src/
│       │   ├── config/              # environment configuration
│       │   ├── database/            # pool, schema, migrations, seed/reset
│       │   ├── middleware/          # auth, validation, errors, rate limits
│       │   ├── modules/             # auth, public, and admin route modules
│       │   ├── services/            # domain logic and transactional workflows
│       │   ├── utils/               # dates, money, IDs, validation, HTTP
│       │   ├── app.ts               # Express app
│       │   └── server.ts            # process entry point
│       └── tests/                   # Vitest + Supertest integration tests
├── src/
│   ├── components/hotel/            # shared hotel UI
│   ├── lib/api.ts                   # typed frontend API client
│   ├── lib/hotel-data.ts            # domain types, formatters, seed source
│   ├── lib/hotel-store.tsx          # API-backed application store
│   ├── pages/                       # guest and admin pages
│   └── router.tsx                   # TanStack Router route tree
├── package.json                     # frontend + workspace scripts
├── pnpm-workspace.yaml
└── vite.config.ts                   # Vite dev proxy for /api
```

---

## Prerequisites

- Node.js 20 or newer
- pnpm 11 (`corepack enable` then `corepack prepare pnpm@11 --activate`)
- MariaDB 10.6+ or a compatible MySQL 5.7+ server
- A database user that can create tables and indexes

The schema intentionally avoids MySQL-8-only features so it also runs on older MySQL-compatible servers. For very old servers (for example MySQL 5.5), keep the migration runner's `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` / `DATETIME` pattern; MySQL 5.5 allows only one automatic `TIMESTAMP` column per table.

---

## Install

```bash
pnpm install
```

This installs the frontend and the `@rivr/api` workspace package.

---

## Environment

Create the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and set at least:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-database-password
DB_NAME=rivr_hotel
DB_TEST_NAME=rivr_hotel_test
SESSION_SECRET=replace-with-a-long-random-secret
WEB_ORIGIN=http://localhost:5173
```

Important variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port, default `4000` |
| `WEB_ORIGIN` | Comma-separated frontend origins allowed by CORS |
| `DB_*` | MariaDB/MySQL connection |
| `DB_TEST_NAME` | Separate database used by integration tests |
| `SESSION_SECRET` | Secret used to HMAC session tokens; required in production |
| `SESSION_TTL_HOURS` | Session lifetime in hours |
| `COOKIE_NAME` | Session cookie name |
| `COOKIE_SECURE` | Set `true` when served over HTTPS |
| `SETUP_TOKEN` | One-time token for `POST /api/auth/setup`; leave empty to disable |
| `ALLOW_DEMO_RESET` | Enables the super-admin-only dev reset endpoint |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional first admin created by `pnpm db:seed` |

Never commit `.env` files. The repository `.gitignore` excludes them.

---

## Database setup

Create the development and test databases:

```sql
CREATE DATABASE rivr_hotel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE rivr_hotel_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations:

```bash
pnpm db:migrate
```

The migration runner applies SQL files from `apps/api/drizzle/migrations` in order and records applied files in the `schema_migrations` table. It is safe to re-run; already-applied files are skipped.

Optional demo data:

```bash
pnpm db:seed
```

Seed data is mapped from the original `src/lib/hotel-data.ts` demo catalogue (room types, rooms, guests, reservations, tasks, inventory, staff, expenses, restaurant orders, activity). It does **not** import browser `localStorage` data. There is no automatic localStorage-to-database migration.

### Create the first administrator

Option A — interactive CLI:

```bash
pnpm create-admin
```

Option B — one-time setup endpoint:

1. Set `SETUP_TOKEN` in `apps/api/.env` to a random value.
2. Start the API.
3. Call `POST /api/auth/setup` with `{ "name", "email", "password", "setupToken" }`.
4. Remove or rotate `SETUP_TOKEN` afterwards.

Option C — seed-time admin: set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before `pnpm db:seed`. Both must be set; there is no default password.

Passwords must be at least 12 characters. They are hashed with Argon2id.

### Reset demo data

`pnpm db:reset` drops and recreates the database schema. This is destructive.

The super-admin-only API endpoint `POST /api/admin/dev/reset` re-seeds demo data when `ALLOW_DEMO_RESET=true`. The Settings page exposes this only to a super administrator.

---

## Development

Run the API and the frontend in separate terminals.

Terminal 1 — API:

```bash
pnpm dev:api
```

Terminal 2 — frontend:

```bash
pnpm dev
```

Open `http://localhost:5173`.

Vite proxies `/api` to `http://localhost:4000` by default. Override the proxy target with `API_PROXY_TARGET` if the API runs elsewhere:

```bash
API_PROXY_TARGET=http://localhost:4000 pnpm dev
```

On Windows PowerShell:

```powershell
$env:API_PROXY_TARGET="http://localhost:4000"; pnpm dev
```

The frontend API base can also be set at build time with `VITE_API_URL`. Leave it unset when using the Vite proxy or a same-origin reverse proxy.

### Staff sign-in

Open `http://localhost:5173/admin/login` and use the email/password created during setup. The old demo role picker has been removed. The API sets an HTTP-only session cookie; the browser never chooses a privileged role.

Guest sign-in, guest registration, and guest password reset remain intentionally unavailable in this build. Booking lookup by reference, email, or phone works without an account.

---

## Checks and tests

Frontend typecheck (the real check; root `pnpm typecheck` is a no-op because the root `tsconfig.json` only has project references):

```bash
pnpm exec tsc -b
```

Frontend production build:

```bash
pnpm build
```

API typecheck:

```bash
pnpm typecheck:api
```

API integration tests:

```bash
pnpm test:api
```

Tests use `DB_TEST_NAME` (default `rivr_hotel_test`) and exercise real routes, sessions, RBAC, validation, payments, check-in/check-out, housekeeping, expenses, and concurrent double-booking protection. Ensure the test database exists and `DB_*` credentials are valid before running them.

Run everything before shipping:

```bash
pnpm exec tsc -b
pnpm build
pnpm typecheck:api
pnpm test:api
```

---

## API overview

Base URL in development: `http://localhost:4000/api`

### Public

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health and database connectivity |
| `GET` | `/public/room-types` | Public room types and amenities |
| `GET` | `/public/catalog` | Room types, rooms, and active busy date ranges |
| `GET` | `/public/rooms` | Public rooms |
| `GET` | `/public/availability` | Availability search |
| `POST` | `/public/reservations` | Create a guest reservation |
| `GET` | `/public/reservations/lookup?q=` | Lookup by reference, email, name, or phone |
| `GET` | `/public/reservations/:reference` | Reservation detail by id or reference |

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/setup` | One-time initial super-admin creation (requires `SETUP_TOKEN`) |
| `POST` | `/auth/login` | Email/password sign-in; creates a server session |
| `POST` | `/auth/logout` | Destroys the current session |
| `GET` | `/auth/me` | Current session user |
| `POST` | `/auth/change-password` | Change the current user's password |

### Admin

All admin routes require an authenticated session and the relevant permission.

| Area | Endpoints |
| --- | --- |
| Bootstrap | `GET /admin/bootstrap` |
| Activity | `GET /admin/activity` |
| Reservations | `GET /admin/reservations`, `POST /admin/reservations`, `GET /admin/reservations/:id`, `PATCH /admin/reservations/:id`, `PATCH /admin/reservations/:id/status`, `PATCH /admin/reservations/:id/room`, `POST /admin/reservations/:id/check-in`, `POST /admin/reservations/:id/check-out` |
| Rooms | `GET /admin/rooms`, `GET /admin/rooms/types`, `POST /admin/rooms`, `PATCH /admin/rooms/:id/status` |
| Guests | `GET /admin/guests`, `POST /admin/guests`, `GET /admin/guests/:id`, `PATCH /admin/guests/:id` |
| Payments & invoices | `GET /admin/payments`, `POST /admin/payments`, `GET /admin/payments/invoices` |
| Housekeeping | `GET /admin/housekeeping/tasks`, `POST /admin/housekeeping/tasks`, `PATCH /admin/housekeeping/tasks/:id` |
| Staff & attendance | `GET /admin/staff`, `GET /admin/staff/attendance`, `PATCH /admin/staff/attendance/:id`, `POST /admin/staff`, `PATCH /admin/staff/:id` |
| Inventory | `GET /admin/inventory`, `POST /admin/inventory`, `POST /admin/inventory/:id/adjust` |
| Expenses | `GET /admin/expenses`, `POST /admin/expenses`, `PATCH /admin/expenses/:id/approval` |
| Restaurant | `GET /admin/restaurant/orders`, `POST /admin/restaurant/orders`, `PATCH /admin/restaurant/orders/:id/status` |
| Reports | `GET /admin/reports/dashboard`, `GET /admin/reports/summary` |
| Users | `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id` |
| Dev reset | `POST /admin/dev/reset` (super-admin only, `ALLOW_DEMO_RESET=true`) |

Money is stored as `DECIMAL(12,2)` and calculated in integer paise on the server. Clients never submit trusted totals, tax, or payment status.

---

## Authentication and security

- Passwords are hashed with Argon2id.
- Sessions are server-side rows. The browser receives a random token in an HTTP-only cookie; only an HMAC-SHA256 hash of the token is stored in the database.
- Cookies are `SameSite=Lax`, `HttpOnly`, and `Secure` when `COOKIE_SECURE=true` or `NODE_ENV=production`.
- The session token is never exposed to JavaScript.
- Login and setup are rate-limited; all API traffic has a global limit.
- Helmet sets security headers.
- CORS uses an explicit allow-list from `WEB_ORIGIN`; credentials are enabled.
- Every mutation validates its body with Zod and enforces a server-side permission from the permission catalogue.
- The client cannot choose its role. Roles come from the authenticated user row.
- User deactivation and password changes destroy the affected user's other sessions.
- The last active super administrator cannot be demoted or deactivated.
- The initial admin is created through `SETUP_TOKEN`, the CLI, or `SEED_ADMIN_*`; no default password is committed.

### Roles

`super-admin`, `admin`, `manager`, `receptionist`, `housekeeping`, `accountant`, `restaurant`.

Permissions are defined in `apps/api/src/services/permissions.ts`. Frontend navigation uses the same role names for visibility hints, but the API is authoritative.

---

## Frontend integration

- `src/lib/api.ts` is the single typed fetch client. It uses `credentials: "include"`, parses the API error envelope into `ApiError`, and points at `/api` or `VITE_API_URL`.
- `src/lib/hotel-store.tsx` loads the public catalogue before authentication, calls `/auth/me`, and loads `/admin/bootstrap` after sign-in.
- Public availability stays synchronous for the existing UI by loading active busy date ranges from `/public/catalog`; the server still re-checks availability and locks the room row before confirming a booking.
- Admin pages use the bootstrap data and await every mutation, then refresh the affected slices.
- Loading states are shown while the catalogue or workspace loads. Errors are surfaced in the admin shell and in the relevant forms.
- A `401` from a mutation clears the local session and asks the user to sign in again.
- Booking lookup and booking confirmation fetch real reservation data from the API, so they work across browsers and devices.
- `localStorage` is used only for the `rivr-theme` UI preference. Business records are no longer stored in the browser.

---

## Data model

The normalized schema contains 17 tables:

- `roles`
- `staff`
- `users`
- `sessions`
- `room_types`
- `room_type_amenities`
- `rooms`
- `guests`
- `reservations`
- `payments`
- `invoices`
- `housekeeping_tasks`
- `attendance`
- `inventory`
- `expenses`
- `restaurant_orders`
- `activity_logs`

Foreign keys, unique constraints, indexes, timestamps, and decimal money columns are defined in `apps/api/src/database/schema.ts`. The generated migration is in `apps/api/drizzle/migrations`.

---

## Business rules

- Dates are date-only `YYYY-MM-DD` strings compared lexicographically. The API and UI use Asia/Kolkata (`Asia/Kolkata`) for "today" and Indian display formats.
- Reservations cannot overlap for the same room. The booking transaction locks the room row with `SELECT ... FOR UPDATE` before the overlap check, preventing concurrent double bookings.
- Rooms in `maintenance`, `out-of-order`, or `cleaning` are not sellable.
- Reservation transitions are coupled: create → reservation `confirmed` + room `reserved`; cancel → room `available`; check-in → room `occupied`; check-out → room `cleaning` + dirty housekeeping task; task `inspected` → room `available`.
- Payments are transaction-safe and update invoice paid/balance values. There is no online payment gateway; payments are recorded by staff.
- Tax is a configurable 12% demo rate (`TAX_BASIS_POINTS = 1200`). Confirm the hotel's applicable GST slab before production use.
- `hotelInfo` in `src/lib/hotel-data.ts` remains placeholder data. Do not treat its address or phone number as verified property details.

---

## Production deployment

1. Set `NODE_ENV=production`, a strong `SESSION_SECRET`, `COOKIE_SECURE=true`, and the production `WEB_ORIGIN`.
2. Run migrations against the production database:

   ```bash
   pnpm db:migrate
   ```

3. Build the API and frontend:

   ```bash
   pnpm build:api
   pnpm build
   ```

4. Start the API:

   ```bash
   node apps/api/dist/server.js
   ```

5. Serve the frontend `dist/` directory with SPA fallback to `index.html`.
6. Put the frontend and API behind the same origin and reverse-proxy `/api` to the API process. This keeps the session cookie same-site and avoids CORS complexity. If they are on different origins, set `WEB_ORIGIN` explicitly and configure `VITE_API_URL`.
7. Use HTTPS. Keep `COOKIE_SECURE=true` in production.
8. Disable `ALLOW_DEMO_RESET` and remove `SETUP_TOKEN` after initial setup.

The API applies pending migrations on startup in development only (`apps/api/src/server.ts`). In production, run `pnpm db:migrate` as a release step before starting the server.

---

## Limitations

- No online payment gateway. Payments are recorded manually by staff; the UI does not claim otherwise.
- Guest accounts, guest registration, and guest password reset are not enabled. Staff authentication and RBAC are fully implemented.
- No email, SMS, or calendar delivery service is integrated. The booking confirmation page and downloadable calendar file are generated locally.
- Single-property configuration. `hotelInfo` is placeholder data and must be replaced before launch.
- Seed data is demo data derived from the original frontend catalogue. It is not a production data import tool.
- There is no automatic browser-storage migration. Import legacy data through a controlled, reviewed process if needed.
- The frontend build is a single large bundle; code-splitting can be added later without changing the API.

---

## Local quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env with your database password and a SESSION_SECRET
pnpm db:migrate
pnpm db:seed
pnpm create-admin
pnpm dev:api
# in a second terminal
pnpm dev
```

Then open:

- Guest site: `http://localhost:5173`
- Staff portal: `http://localhost:5173/admin/login`
- API health: `http://localhost:4000/api/health`

---

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite frontend |
| `pnpm dev:api` | Start the API with `tsx watch` |
| `pnpm build` | Typecheck and build the frontend |
| `pnpm build:api` | Compile the API |
| `pnpm exec tsc -b` | Real frontend typecheck |
| `pnpm typecheck:api` | API typecheck |
| `pnpm test:api` | Run API integration tests |
| `pnpm db:migrate` | Apply pending SQL migrations |
| `pnpm db:seed` | Seed demo data and optional first admin |
| `pnpm db:reset` | Drop and recreate the schema (destructive) |
| `pnpm create-admin` | Interactive first-admin creation |

---

## License

Proprietary. All rights reserved.
