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
| Package manager | pnpm 12 |

---

## Repository layout

```text
.
├── apps/
│   └── api/
│       ├── drizzle/                 # generated SQL migrations
│       ├── scripts/create-admin.ts  # non-interactive first admin setup
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
- pnpm 12.18.0 (`corepack enable` then `corepack prepare pnpm@12.18.0 --activate`)
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
DB_PORT=3307
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
| `COOKIE_SECURE` | Set `true` when served over HTTPS; must be explicitly `true` in production |
| `TRUST_PROXY` | Express proxy trust: `false`, `loopback`, `linklocal`, `uniquelocal`, or 1-10 hops |
| `ALLOW_DEMO_RESET` | Enables the super-admin-only dev reset endpoint |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional extra admin created by `pnpm db:seed`; the demo seed also creates `admin@admin.com` / `password` |

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

`pnpm db:seed` is destructive: it clears the business tables (including users and sessions) and inserts a large demo dataset across rooms, guests, staff, reservations, payments, invoices, housekeeping, attendance, inventory, suppliers, expenses, restaurant orders, activity, notifications, and settings. The demo seed creates the super-admin `admin@admin.com` with password `password`, plus role demo accounts (`manager@rivrhotel.in`, `reception@rivrhotel.in`, `housekeeping@rivrhotel.in`, `accountant@rivrhotel.in`, `restaurant@rivrhotel.in`, `staff@rivrhotel.in`) and customer accounts whose password is also `password`. These well-known credentials are for local development only; never run the demo seed against production data.

Seed data is generated in `apps/api/src/database/seed-data.ts`. It does **not** import browser `localStorage` data. There is no automatic localStorage-to-database migration.

### Create the first administrator

The CLI is non-interactive:

```bash
pnpm create-admin --email admin@example.com --password "a-12-plus-character-password"
```

It migrates, seeds roles, and refuses if an active super-admin already exists. It requires a password of at least 12 characters.

Alternatively, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before `pnpm db:seed` to create an additional admin. Both must be set. The demo seed's built-in `admin@admin.com` / `password` account is separate and is intended only for local demo data.

There is no `/api/auth/setup` endpoint.

### Reset demo data

`pnpm db:reset` is currently a no-op: `reset.ts` has no CLI entrypoint. Use the exported `resetDatabase()` / `dropAllTables()` helpers if a real reset is needed.

The super-admin-only API endpoint `POST /api/admin/dev/reset` re-seeds demo data when `ALLOW_DEMO_RESET=true`. The Settings page exposes this only to a super administrator.

---

## Development

Start both the API and the frontend with one command:

```bash
pnpm dev
```

The script starts the API, waits for `http://localhost:4000/api/health` (or `API_PROXY_TARGET`), then starts Vite. Open `http://localhost:5173`.

To run them separately:

```bash
# terminal 1
pnpm dev:api

# terminal 2
pnpm dev:web
```

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

Open `http://localhost:5173/login` and use a seeded or created account. For the local demo seed, use `admin@admin.com` / `password`. The old demo role picker has been removed. The API sets an HTTP-only session cookie; the browser never chooses a privileged role.

Guest sign-in, guest registration, the guest dashboard, my-bookings, and guest password reset are implemented under `/api/account` and the guest pages. Booking lookup requires the exact reservation reference plus the matching email address or phone number.

---

## Checks and tests

Frontend typecheck:

```bash
pnpm typecheck
```

`pnpm typecheck` runs `tsc -b`; `pnpm exec tsc -b` is the equivalent direct command.

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
| `POST` | `/public/reservations` | Create a guest reservation with a two-hour pending hold |
| `POST` | `/public/reservations/verify` | Verify a reference plus matching email or phone |

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
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
- Login is rate-limited; all API traffic has a global limit. Public reservation verification is limited to 10 attempts per 15 minutes per IP.
- Public lookup requires an exact reference and matching normalized email or phone, returns a minimal allowlist, and never exposes full guest records.
- Production startup rejects insecure cookies, loopback web origins, and session secrets shorter than 32 characters.
- Helmet sets security headers.
- CORS uses an explicit allow-list from `WEB_ORIGIN`; credentials are enabled.
- Every mutation validates its body with Zod and enforces a server-side permission from the permission catalogue.
- The client cannot choose its role. Roles come from the authenticated user row.
- User deactivation and password changes destroy the affected user's other sessions.
- The last active super administrator cannot be demoted or deactivated.
- The initial admin is created through the CLI or `SEED_ADMIN_*`; the demo seed also creates `admin@admin.com` / `password` for local development only.

### Roles

`super-admin`, `admin`, `manager`, `receptionist`, `housekeeping`, `accountant`, `restaurant`, `staff`.

Permissions are defined in `apps/api/src/services/permissions.ts`. Frontend navigation uses the same role names for visibility hints, but the API is authoritative.

---

## Frontend integration

- `src/lib/api.ts` is the single typed fetch client. It uses `credentials: "include"`, parses the API error envelope into `ApiError`, and points at `/api` or `VITE_API_URL`.
- `src/lib/hotel-store.tsx` loads the public catalogue before authentication, calls `/auth/me`, and loads `/admin/bootstrap` after sign-in.
- Public availability stays synchronous for the existing UI by loading active busy date ranges from `/public/catalog`; the server still re-checks availability and locks the room row before confirming a booking.
- Admin pages use the bootstrap data and await every mutation, then refresh the affected slices.
- Loading states are shown while the catalogue or workspace loads. Errors are surfaced in the admin shell and in the relevant forms.
- A `401` from a mutation clears the local session and asks the user to sign in again.
- Booking success uses the creation response through a one-time `sessionStorage` handoff. Later booking lookup requires the reference plus matching email or phone, so it works across browsers and devices without exposing reference-only data.
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
- Public reservations start `pending` with a two-hour hold; staff bookings start `confirmed`. Unexpired holds block availability, and expired holds are cancelled by cleanup.
- Future reservations do not change a room's current status. A same-day stay may set an available room to `reserved`; check-in → `occupied`; check-out → `cleaning` + dirty housekeeping task; task `inspected` → `available`. Cancellation releases a room only when no other active stay needs it.
- Check-in is allowed from the arrival date until the check-out date; early check-in and check-out with an outstanding balance require a manager/admin override that is logged.
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
8. Disable `ALLOW_DEMO_RESET` and remove any `SEED_ADMIN_*` credentials after initial setup.

The API applies pending migrations on startup in development only (`apps/api/src/server.ts`). In production, run `pnpm db:migrate` as a release step before starting the server.

---

## Limitations

- No online payment gateway. Payments are recorded manually by staff; the UI does not claim otherwise.
- Guest accounts, guest registration, the guest dashboard, my-bookings, and guest password reset are implemented. Staff authentication and RBAC are fully implemented.
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
pnpm dev
```

Then open the guest site at `http://localhost:5173` or the admin site at `http://localhost:5173/login` and sign in with the demo super-admin `admin@admin.com` / `password`. Change or remove the demo accounts before using real data.

- Guest site: `http://localhost:5173`
- Staff portal: `http://localhost:5173/login`
- API health: `http://localhost:4000/api/health`

---

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the API and the Vite frontend together |
| `pnpm dev:web` | Start only the Vite frontend |
| `pnpm dev:api` | Start only the API with `tsx watch` |
| `pnpm build` | Typecheck and build the frontend |
| `pnpm build:api` | Compile the API |
| `pnpm exec tsc -b` | Real frontend typecheck |
| `pnpm typecheck:api` | API typecheck |
| `pnpm test:api` | Run API integration tests |
| `pnpm db:migrate` | Apply pending SQL migrations |
| `pnpm db:seed` | Seed the large demo dataset (destructive; creates `admin@admin.com` / `password`) |
| `pnpm db:reset` | Currently a no-op; use the exported reset helpers |
| `pnpm create-admin` | Non-interactive first-admin creation (`--email`, `--password` 12+ chars) |

---

## License

Proprietary. All rights reserved.
