# AGENTS.md

Compact, repo-specific guidance for working in RIVR Hotel ERP.

## Commands

- Use pnpm (`packageManager: pnpm@11.25.0`, `pnpm-lock.yaml`). Do not switch to npm/yarn.
- `pnpm dev` — Vite dev server.
- `pnpm exec tsc -b` — **actual typecheck** for both `tsconfig.app.json` and `tsconfig.node.json`.
- `pnpm typecheck` is a no-op: root `tsconfig.json` has `files: []` + project references, and `tsc --noEmit` exits 0 even with type errors in `src/` (verified). Use `pnpm exec tsc -b` or `pnpm build`.
- `pnpm build` — `tsc -b && vite build`, writes to `dist/`.
- There is **no lint, test suite, or CI**. Do not claim tests pass; verify with `pnpm exec tsc -b` and a manual dev-server check.
- `tsc -b` rewrites the **tracked** `node_modules/.tmp/tsconfig.app.tsbuildinfo`; never stage that change.

## Repo hygiene (easy to get wrong)

- There is no `.gitignore`. `node_modules/` (~18k files) and `dist/` are committed.
- `pnpm install` can rewrite tracked `node_modules` files with machine-specific paths. Never stage `node_modules/`; keep commits scoped to `src/` (plus `dist/` only when intentionally rebuilding).
- `dist/` uses hashed filenames. A rebuild leaves old tracked bundles behind, so stage deletions too when committing build output.
- `.opencode/`, `.copilot/`, `opencode.jsonc`, `.mcp.json` are tracked. `.opencode/skills/motion` and `.copilot/skills/motion` are duplicate copies — keep both in sync if editing.

## Architecture

- Client-only Vite/React SPA: no server, API, database, real auth, or payment gateway. Guest auth forms validate but create no account; the role picker at `/admin/login` is dev UX.
- Entry chain: `index.html` → `src/main.tsx` → `src/App.tsx` (`ThemeProvider` > `HotelProvider` > `RouterProvider`) → `src/router.tsx`.
- `src/lib/hotel-store.tsx` is the single domain layer: state, mutations, permissions, persistence, availability checks. Replace this provider (per README) when adding a backend.
- `src/lib/hotel-data.ts` owns all domain types, seed data, formatters, `taxConfig`, `hotelInfo`, and IST date helpers. Seed dates are relative to today via `dateAt(offset)`; never hardcode dates.
- `src/lib/theme.tsx` handles light/dark: writes `data-theme` on `<html>` and persists `rivr-theme`.
- UI lives in `src/pages/*` and `src/components/hotel/*`. Shared primitives (`Card`, `StatusBadge`, `RoomVisual`, `Money`, etc.) are in `HotelUi.tsx`; admin layout/role guard in `StaffChrome.tsx`; public header/footer in `PublicChrome.tsx`; motion wrappers in `Reveal.tsx` / `PageHero.tsx`.
- `src/pages/AdminPages.tsx` is one intentionally large file holding every admin page plus local form/modal helpers, mostly dense one-line JSX. Match its terse style instead of reformatting or splitting files arbitrarily.
- Imports are relative; there are no path aliases.

## Routing and roles

- Routes are registered manually in `src/router.tsx`; there is no file-based routing or generated route tree. A new page needs a `createRoute` entry added to `routeTree`.
- Sidebar visibility is separate: add the path to `navGroups` in `StaffChrome.tsx` or it will only be reachable by URL. `adminNav` (exported from the same file) drives the restricted-access panel.
- Several aliases intentionally reuse one component: `/admin/room-types` → `AdminRoomsPage`, `/admin/check-in` and `/admin/check-out` → `AdminFrontDeskPage`, `/admin/invoices` → `AdminPaymentsPage`, `/admin/attendance` → `AdminStaffPage`. Keep new aliases consistent with this pattern.
- `navGroups[].roles` is the permission source of truth. `AdminLayout` redirects to `/admin/login` when `role` is null and shows a restricted panel when the current role is not allowed; admin pages themselves do not re-check permissions.
- Search params are validated per route (`staySearch` → `normalizeStaySearch`, `reservationSearch`, `successSearch`, `resetSearch`); keep defaults/clamping there when adding params.

## Domain rules

- Dates are date-only `YYYY-MM-DD` strings compared lexicographically. Use the helpers: `dateAt` (today in Asia/Kolkata), `calculateNights` (parses `T00:00:00Z`), `formatDate` (parses `T12:00:00+05:30`), `isDateRangeValid`.
- Money is integer INR via `formatCurrency` (`en-IN`, no decimals). Tax is `taxConfig.rate` (0.12 demo) in `hotel-data.ts`, applied in `createReservation` — not a literal in the store.
- `hotelInfo` is deliberately placeholder (`isPlaceholder: true`). Do not present its address/phone as verified property details.
- Availability is centralized in `isRoomAvailable`: `maintenance`, `out-of-order`, and `cleaning` rooms are unavailable, as are overlapping reservations whose status is not `cancelled`, `checked-out`, or `no-show`. Do not duplicate this logic in components.
- State transitions are coupled: create → reservation `confirmed` + room `reserved`; cancel → room `available`; check-in → `occupied`; check-out → `cleaning` + dirty task; task `inspected` → room `available`. Update every affected slice, not just one.
- Mutations validate with Zod schemas at the store boundary and return `{ error }` instead of throwing; surface that string in the UI.
- Guests are deduplicated by lowercase email. `getReservation` accepts either an id or a booking reference.
- State persists per slice to `localStorage` keys `rivr-hotel-*` (`rivr-hotel-role`/`rivr-hotel-actor` hold the demo session). `refreshDemoData` re-persists seeds and reloads, but does not clear role or theme.

## Styling and animation

- Tailwind CSS v4 is CSS-first: there is no `tailwind.config.*`. Components use CSS variables (`var(--canvas)`, `--surface`, `--ink`, `--muted`, `--accent`, …) defined in `:root` and overridden by `[data-theme="dark"]` in `src/index.css`; use them instead of raw hex so dark mode works.
- `@theme` adds font + brand tokens (`navy`, `midnight`, `ivory`, `beige`, `gold`, `sage`); custom utilities (`.animate-rise-in`, `.scrollbar-thin`) and print rules (`.no-print`) also live in `src/index.css`. Google Fonts load via `@import` over the network.
- Motion (`motion/react`) drives the public/auth pages, shared `Reveal`/`PageHero`, and the root route fade; admin pages avoid it. The Motion MCP server is configured in `opencode.jsonc` / `.mcp.json`.
