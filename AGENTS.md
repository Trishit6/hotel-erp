# AGENTS.md

Compact, repo-specific guidance for working in RIVR Hotel ERP.

## Commands

- Use pnpm (`packageManager: pnpm@11.25.0`, `pnpm-lock.yaml`). Do not switch to npm/yarn.
- `pnpm dev` — Vite dev server.
- `pnpm exec tsc -b` — **actual typecheck** for both `tsconfig.app.json` and `tsconfig.node.json`.
- `pnpm typecheck` currently checks nothing: root `tsconfig.json` has `files: []` + project references, and plain `tsc --noEmit` does not build referenced projects. It exits 0 even with type errors in `src/`. Use `pnpm exec tsc -b`, or `pnpm build`.
- `pnpm build` — `tsc -b && vite build`, writes to `dist/`.
- There is **no lint and no test suite**. Do not claim tests pass; verify with `pnpm exec tsc -b` and a manual dev-server check.

## Repo hygiene (easy to get wrong)

- There is no `.gitignore`. `node_modules/` (18k+ files) and `dist/` are committed.
- `pnpm install` rewrites thousands of **tracked** `node_modules` files with machine-specific paths. Never stage `node_modules/`; keep commits scoped to `src/` (plus `dist/` only when intentionally rebuilding).
- `git status` may already show dirty `node_modules/.bin/*` and untracked `.opencode/`, `.copilot/`, `opencode.jsonc`, `.mcp.json`. Leave that churn alone.
- `dist/` uses hashed filenames. A rebuild leaves the old tracked bundles behind, so stage deletions too if committing build output.

## Architecture

- Client-only Vite/React SPA: no server, API, database, real auth, or payment gateway. The role picker at `/admin/login` is dev UX.
- Entry chain: `index.html` → `src/main.tsx` → `src/App.tsx` (`HotelProvider` + `RouterProvider`) → `src/router.tsx`.
- `src/lib/hotel-store.tsx` is the single domain layer: state, mutations, permissions, persistence, availability checks. Replace this provider (per README) when adding a backend.
- `src/lib/hotel-data.ts` owns all domain types, seed data, and formatters. Seed dates are relative to today via `dateAt(offset)`; never hardcode dates.
- UI lives in `src/pages/*` and `src/components/hotel/*`. Shared primitives (`Card`, `StatusBadge`, `RoomVisual`, `Money`, etc.) are in `HotelUi.tsx`; admin layout/role guard is in `StaffChrome.tsx`; public header/footer in `PublicChrome.tsx`.
- `src/pages/AdminPages.tsx` is one intentionally large file holding every admin page plus local form/modal helpers. Match its terse one-line JSX style instead of reformatting or splitting files arbitrarily.
- Imports are relative; there are no path aliases.

## Routing and roles

- Routes are registered manually in `src/router.tsx`; there is no file-based routing or generated route tree. A new page needs a `createRoute` entry added to `routeTree`.
- Sidebar visibility is separate: add the path to `navGroups` in `StaffChrome.tsx` or it will only be reachable by URL.
- Several aliases intentionally reuse one component: `/admin/room-types` → `AdminRoomsPage`, `/admin/check-in` and `/admin/check-out` → `AdminFrontDeskPage`, `/admin/invoices` → `AdminPaymentsPage`, `/admin/attendance` → `AdminStaffPage`. Keep new aliases consistent with this pattern.
- `navGroups[].roles` is the permission source of truth. `AdminLayout` redirects when `role` is null and shows a restricted panel when the current role is not allowed; admin pages themselves do not re-check permissions.
- Search params are validated per route (`staySearch`, `reservationSearch`, etc.); keep defaults there when adding params.

## Domain rules

- Dates are date-only `YYYY-MM-DD` strings compared lexicographically. Parse with noon (`T12:00:00`) as the helpers do to avoid timezone shifts; use `dateAt`, `calculateNights`, `isDateRangeValid`, `formatDate`.
- Money is integer USD via `formatCurrency`; reservations apply a hardcoded 12% tax in `createReservation`.
- Availability is centralized in `isRoomAvailable`: rooms with `maintenance`, `out-of-order`, or `cleaning` are unavailable, and overlapping active reservations block a room. Do not duplicate this logic in components.
- Reservation, room, and housekeeping states are coupled in the store (create → `reserved`, cancel → `available`, check-in → `occupied`, check-out → `cleaning` + dirty task). New workflows must update all affected slices, not just one.
- Mutations validate with Zod schemas at the store boundary and return `{ error }` instead of throwing; surface that string in the UI.
- Guests are deduplicated by lowercase email. `getReservation` accepts either an id or a booking reference.
- State persists per slice to `localStorage` keys `rivr-hotel-*` (`rivr-hotel-role` stores the demo role). Changing seed shapes does not clear existing users' localStorage; reset through Settings (`refreshDemoData`), which re-persists seeds and reloads.

## Styling and animation

- Tailwind CSS v4 is CSS-first: there is no `tailwind.config.*`. Theme tokens (`navy`, `midnight`, `ivory`, `beige`, `gold`, `sage`) and custom utilities (`.animate-rise-in`, `.scrollbar-thin`) live in `src/index.css` via `@theme`.
- Motion (`motion/react`) is used on the public site; the Motion MCP server is configured in `opencode.jsonc` / `.mcp.json`, with skill docs in `.opencode/skills/motion` (duplicated under `.copilot/skills/motion` — keep both copies in sync if editing).
