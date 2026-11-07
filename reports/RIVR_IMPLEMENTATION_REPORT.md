# RIVR Hotel ERP — Implementation & Testing Report

Date: 2026-11-07
Scope: database extension, unified authentication, role-based dashboards, customer portal, frontend/backend wiring, verification.

---

## 1. Environment verified

| Item | Result |
| --- | --- |
| OS / shell | Windows 11, Git Bash |
| Node / pnpm | v26.8.2 / 12.16.1 |
| MariaDB | 11.8.9 listening on 127.0.0.1:3307 |
| Application DB | `rivr_hotel` (confirmed as the intended DB) |
| Test DB | `rivr_hotel_test` |
| API env | `apps/api/.env` (existing file kept; new `SEED_ADMIN_*` keys appended, nothing overwritten) |
| Credentials | Never printed. DB password is only read from `.env`; the bootstrap admin password lives in `apps/api/.env`. |

The dev database opened with 21 tables and **0 users / 0 roles**, and its business tables were empty (0 room types, 0 rooms, 0 settings rows).

---

## 2. Database

### 2.1 Migration state

`apps/api/drizzle/migrations/` now contains four migrations:

| Migration | Status |
| --- | --- |
| `0000_complex_hawkeye.sql` | applied |
| `0001_solid_black_panther.sql` | applied |
| `0002_giant_phantom_reporter.sql` | tables/columns existed but the file was **not recorded** in `schema_migrations`; two indexes were also missing |
| `0003_worried_shinko_yamashiro.sql` | applied (new tables, generated from `schema.ts`) |

Repair performed instead of editing an applied migration:

- created the two missing indexes (`inventory_sku_idx`, `restaurant_menu_items_category_idx`);
- inserted `0002_giant_phantom_reporter.sql` into `schema_migrations`;
- then applied `0003` normally.

### 2.2 Result

`rivr_hotel` now has **43 tables and 48 foreign keys**.

New tables added by `0003`:

- Access control: `permissions`, `role_permissions`, `password_reset_tokens`, `invitations`
- Property structure: `hotels`, `branches`, `room_amenities`
- Reservations: `reservation_guests`, `reservation_status_history`, `check_ins`, `check_outs`
- Billing: `invoice_items`, `refunds`
- People: `departments`, `shifts`, `leave_requests`
- Housekeeping: `housekeeping_status`, `housekeeping_task_history`
- Restaurant/inventory: `restaurant_order_items`, `inventory_transactions`, `suppliers`
- System: `notifications`

These tables are actively written by the application where noted:

| Table | Written by |
| --- | --- |
| `invoice_items` | reservation creation (room charge + tax lines) |
| `reservation_guests` | reservation creation (primary guest) |
| `reservation_status_history` | create / status change / check-in / check-out / customer cancel |
| `check_ins`, `check_outs` | staff check-in and check-out |
| `housekeeping_task_history` | housekeeping task status updates |
| `password_reset_tokens` | forgot/reset password |
| `permissions`, `role_permissions` | `ensureRoles()`/`syncPermissions()` mirror of the TS matrix |

Schema-only for now (no UI or service writes yet): `hotels`, `branches`, `room_amenities`, `refunds`, `invitations`, `departments` (seeded), `shifts` (seeded), `leave_requests`, `housekeeping_status` (seeded), `restaurant_order_items`, `inventory_transactions`, `suppliers`, `notifications`.

---

## 3. Authentication

- **One login endpoint** (`POST /api/auth/login`) authenticates every role. The role always comes from the `users` row, never from the request.
- **Public signup** (`POST /api/auth/register`) hard-codes the `customer` role. The schema has no role field, and the admin user endpoint rejects `role: "customer"`.
- **Public first-run setup removed**: `POST /api/auth/setup` and `GET /api/auth/setup-status` return 404, and the `/admin/setup` page and link are gone.
- **Bootstrap** is CLI-only: `pnpm create-admin` (uses `--email/--password` or `SEED_ADMIN_*`), refuses to run when an active super administrator already exists, and no longer drops the database.
- **Password reset**: `POST /api/auth/forgot-password` issues a single-use, hashed, one-hour token; `POST /api/auth/reset-password` consumes it, re-hashes the password with Argon2id, marks the token used, and destroys every session for that account. Responses are identical for unknown emails. Because no email provider is configured, the token is returned **only when `NODE_ENV !== "production"`** and shown as a development link on the page.
- Sessions remain server-side with an HTTP-only, SameSite=Lax cookie and HMAC-SHA256 token hashes.
- `/api/admin/*` now sits behind both `requireAuth` and a new `requireStaff` guard; customer sessions receive 403 even on read-only routes.

Roles (kebab-case, DB enum/string + TypeScript `USER_ROLES`):
`super-admin`, `admin`, `manager`, `receptionist`, `housekeeping`, `accountant`, `restaurant`, `staff`, `customer`.

---

## 4. Role-based dashboards

| Role | Destination | Implementation |
| --- | --- | --- |
| super-admin / admin | `/admin/dashboard` | existing executive dashboard |
| manager | `/manager/dashboard` | manager dashboard inside the staff shell |
| receptionist | `/reception/dashboard` | front desk page inside the staff shell |
| housekeeping | `/housekeeping/dashboard` | housekeeping page inside the staff shell |
| accountant | `/admin/reports` | reports (financial) |
| restaurant | `/admin/restaurant` | restaurant board |
| staff | `/staff/dashboard` | new limited operational view |
| customer | `/guest/dashboard` | new customer portal |

`POST /api/auth/login` and `POST /api/auth/register` return a `redirect` value, and `/auth/me` returns one too, so the frontend lands on the correct dashboard after a full reload. The staff shell redirects unauthenticated visitors to `/login` and customers to `/guest/dashboard`, and still blocks navigation items a role may not use.

Permissions changed during verification: `dashboard:read` (which exposes revenue and outstanding balances) is no longer granted to the general `staff` role. The workspace loader skips the financial summary for that role so sign-in does not fail.

---

## 5. Customer portal

`/guest/dashboard` loads from `GET /api/account/overview`:

- upcoming and past reservations with status and total;
- invoices and balances;
- editable profile (name, phone, address, city, state, PIN).

`POST /api/account/reservations/:id/cancel` only matches reservations whose guest email equals the session account email, allows only `pending`/`confirmed` stays, enforces the hotel's `cancellation_cutoff_hours`, releases the room when no other stay is active, and records status history and an activity log entry.

---

## 6. Frontend/backend integration

- `src/lib/api.ts` remains the single typed fetch client with `credentials: "include"`.
- `src/lib/hotel-store.tsx` now exposes `login`/`register` returning `{ error?, redirect? }`, loads the admin workspace only for staff, and skips `/admin/reports/dashboard` for the `staff` role.
- `/login`, `/register`, `/forgot-password`, `/reset-password` call the API; the previous "not enabled" placeholders are gone.
- Removed `AdminLoginPage`, `AdminSetupPage`, `/admin/login`, `/admin/setup`, and the public-chrome "Staff portal" link that pointed at them.
- New pages: `src/pages/RoleDashboards.tsx` and `src/pages/GuestDashboardPage.tsx`; all routes registered in `src/router.tsx`.

---

## 7. Verification actually run

### 7.1 Static checks

| Check | Result |
| --- | --- |
| `pnpm typecheck:api` | exit 0 |
| `pnpm exec tsc -b` | exit 0 |
| `pnpm build` | exit 0 (single 836 kB chunk warning) |
| `pnpm build:api` | exit 0 |
| `pnpm db:migrate` | applied `0003` |

### 7.2 API integration tests (`pnpm test:api`)

3 files, **15/15 tests passed**, including:

- no public bootstrap endpoint (404);
- customer signup cannot request a staff role;
- customer sessions get 403 on `/api/admin/bootstrap`;
- unified login/session/logout and invalid credentials;
- receptionist blocked from user management but allowed bootstrap;
- admin cannot create a customer through the staff user endpoint;
- password change invalidates the old password;
- housekeeping blocked from expenses;
- last active super admin cannot be demoted;
- single-use password reset;
- customer records stay private (empty overview, 404 for another reservation).

### 7.3 Live end-to-end checks (built API + running Vite)

Run against the rebuilt API on a clean port with the real MariaDB database: **19/19 passed**.

Covered: health + DB connectivity, Vite serving the SPA, customer signup → customer role + `/guest/dashboard`, customer blocked from staff APIs, account overview, admin login → `/admin/dashboard`, admin bootstrap, manager/receptionist/housekeeping/staff login redirects, housekeeping blocked from financial data, receptionist blocked from users, general staff blocked from financial reports, public booking, booking visible in the portal, customer cancellation, password-reset token and successful new-password login.

A stale pre-fix API process (`node apps/api/dist/server.js`, started before the permission change) initially held port 4000 and returned an outdated 200 for the staff-reports check. It was stopped and the current build started on 4000; re-running the same checks there gives admin login 200, staff login 200, `GET /api/admin/reports/dashboard` 403, `GET /api/admin/users` 403, `GET /api/admin/bootstrap` (no session) 401, and `GET /api/auth/setup-status` 404. If `pnpm dev:api` ever reports `EADDRINUSE`, stop the old process first.

### 7.4 Browser testing limitation

No scripted browser (Playwright/Puppeteer) run was performed. Verification covered the running Vite server, the built frontend, and the API over HTTP, but did **not** include automated visual/console inspection of every screen. Responsive layout and console errors were not mechanically checked.

---

## 8. Errors found and fixed

1. **Migration 0002 unrecorded and missing two indexes** — repaired (indexes created, file marked applied) so later migrations could run.
2. **Dev DB had no roles/users and no business data** — reference rows are created on demand by `ensureRoles()`; demo data reseeded with `pnpm db:seed` (admin recreated from `SEED_ADMIN_*`).
3. **General staff could read the financial dashboard** — `dashboard:read` now excludes `staff`; the store no longer requests that endpoint for them; the admin overview shows a restricted notice.
4. **Customer login would have called `/admin/bootstrap`** — now skipped for customers, and the API rejects customer sessions there.
5. **`/admin/login` and `/admin/setup` links/pages remained** — removed from the router and public navigation.
6. **Tests referenced the removed setup endpoint** — replaced with bootstrap/CLI service tests.
7. **Public Chrome linked to a deleted route** — repointed to `/login`.

---

## 9. Remaining work / limitations

- **No email or SMS provider.** Password reset tokens are development-only until one is configured. `notifications` is not wired to delivery.
- **Schema-only tables** listed in §2.2 have no UI yet (invitations, refunds, hotel/branch management, order items, inventory transactions, room amenities). Suppliers service and API routes have been implemented with CRUD operations and role-based permissions (super-admin only delete, staff read/create/update).
- **Restaurant orders** still store a single text `items` field; `restaurant_order_items` is not populated.
- **No online payments**; payments remain staff-recorded.
- **Single property**; `hotels`/`branches` exist but rooms are not scoped to a branch yet.
- **Tax** is the configurable demo rate in `system_settings` (12% seed), not confirmed GST advice.
- **Frontend bundle** is one ~836 kB chunk (build warning); code-splitting is not implemented.
- **No automated browser tests** (see §7.4).
- `SETUP_TOKEN` is now unused; remove it from `apps/api/.env` when convenient.

---

## 10. Commands to run the application

```bash
# 1. Dependencies (already installed)
pnpm install

# 2. Apply migrations (already applied)
pnpm db:migrate

# 3. First administrator — only once, and only on an empty users table
#    (already created from SEED_ADMIN_* in apps/api/.env)
pnpm create-admin --email you@example.com --password "at-least-12-chars"

# 4. API (port 4000)
pnpm dev:api

# 5. Frontend (port 5173) — second terminal
pnpm dev
```

Open:

- Guest site: http://localhost:5173
- Unified login: http://localhost:5173/login
- Customer signup: http://localhost:5173/register
- Staff workspace: http://localhost:5173/admin/dashboard

The first super admin is `admin@rivr.local`; its password is the `SEED_ADMIN_PASSWORD` value in `apps/api/.env`. Change it from the Settings page after the first sign-in.

Checks:

```bash
pnpm exec tsc -b
pnpm build
pnpm typecheck:api
pnpm test:api
```
