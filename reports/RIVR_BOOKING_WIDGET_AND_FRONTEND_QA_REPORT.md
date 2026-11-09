# RIVR — Booking Widget & Frontend Smoothness QA Report

**Date:** 9 November 2026  
**Environment:** React 19 + Vite (`localhost:5173`), Express API (`localhost:4000`), MariaDB, Playwright 1.65.0  
**Test-first workflow:** INSPECT → TEST → DOCUMENT → ROOT CAUSE → FIX → RETEST → REPORT  
**Backend, auth, roles, schema and reservation logic:** **unchanged**

---

## Executive summary

The booking widget is one shared component (`BookingSearch`) used by Home, Stay With Us, Explore Rooms, Booking and Search. Its date logic, guest/room limits, validation and availability search already worked.

The confirmed problems were page-level presentation and state:

1. The widget used a **74 % opaque** surface and was pulled up over the hero with a negative margin. On Home the hero is tall enough that the widget lands on the ivory page; on Stay/Rooms it lands over the photograph, making “Children”, “Rooms” and their values hard to read. That is why Home looked correct and the other pages did not.
2. At 1024 px the grid switched to three columns, producing a **150 px two-row** widget whose button sat below a 768 px viewport. It is now a single 83 px row at 1024.
3. The widget had **no shared search state**. Every page passed the constant `defaultStaySearch`, so selections were lost on back/forward and cross-page navigation.
4. The results page replaced a **118 px loading card with a 425 px room grid**, producing CLS 0.544. Skeleton cards now reserve the final geometry: CLS 0.002.
5. The Home ambience was static apart from the hero photo. It now has two counter-drifting champagne/sage light washes, drifting orbs and moving architectural lines, all disabled under reduced motion.

**Important route finding:** this build has **no Adventures, Gallery or Dining route**. They were not invented. The widget is rendered on five actual public routes only; About, Amenities and Contact use a booking CTA but do not render the widget.

---

## 1. Initial audit

### 1.1 Routes inspected

| Route | Widget rendered | Desktop 1440 | Tablet 1024 | Mobile 390 |
| --- | --- | --- | --- | --- |
| `/` Home | Yes | ✓ | ✓ | ✓ |
| `/stay` Stay With Us | Yes | ✓ | ✓ | ✓ |
| `/rooms` Explore Rooms | Yes | ✓ | ✓ | ✓ |
| `/booking` Booking/search | Yes | ✓ | ✓ | ✓ |
| `/search` Search results | Yes | ✓ | ✓ | ✓ |
| `/amenities` | No — CTA only | ✓ | ✓ | ✓ |
| `/about` | No — CTA only | ✓ | ✓ | ✓ |
| `/contact` | No — CTA only | ✓ | ✓ | ✓ |

Additional smoke coverage at 1440: `/login`, `/register`, `/forgot-password`, `/my-bookings`, `/booking/lookup`.

**Not present in `src/router.tsx`:** `/adventures`, `/gallery`, `/dining`. No routes were created, so no widget test was claimed for them.

### 1.2 Confirmed widget defects

| # | Defect | Evidence |
| --- | --- | --- |
| W1 | Widget surface is translucent (`rgba(255,253,249,0.74)`), unreadable where it overlaps hero photography | All 15 widget instances measured with alpha < 1; six instances overlapped an image by 11,381–13,909 px² |
| W2 | Stay/Rooms widget overlaps the hero image without a solid backing; Children/Rooms text loses contrast | `desktop-stay.jpg`, `desktop-rooms.jpg` before captures |
| W3 | 1024 px layout is two rows / 150 px tall; bottom at 843 px in a 768 px viewport | Audit metrics: tablet form `height=150`, `y=693`, `bottom=843` |
| W4 | Search selections reset on back/forward and cross-page navigation | Submit `15–18 Nov, 3 adults, 1 child, 2 rooms` → back to `/stay` → `10–12 Nov, 2, 0, 1` |
| W5 | Results page shifts layout by 0.544 CLS while loading | One layout-shift entry: results grid `118 px → 425 px`, footer moved from 722 px to 0 |
| W6 | Home “animated background” reads static after the hero entrance | `.hero-ambient` pseudo-elements had no animation; only the photo drifted |

### 1.3 Functional findings (already correct before changes)

- Check-in and check-out selection.
- Changing check-in past check-out rolls check-out forward (`19 Nov → 20 Nov`) automatically.
- Adults 1–8, children 0–6, rooms 1–4 options.
- Invalid range shows “Choose a checkout date after your check-in date.” and stays on `/stay`.
- Submit produces `/search?checkIn=…&checkOut=…&adults=…&children=…&rooms=…&guests=…` and the results page shows the same values.
- Invalid URL values are normalised (past dates → tomorrow, adults 99 → 8, children −2 → 0, rooms 9 → 4).
- Direct URLs override stored state.

### 1.4 Responsive findings

- No horizontal overflow at 1440, 1024, 768 or 390 before or after.
- Labels did not clip at 390; the three guest selectors are 115 px wide and remain usable.
- Mobile widget is 267 px tall and stacked intentionally; it sits below a tall hero and requires scrolling.
- Home’s widget begins below the fold at all three tested viewports because the hero is 680–1,000 px tall. This is placement, not clipping.

### 1.5 Navigation and performance findings

- Six public tabs, browser back, browser forward and refresh all resolved with real content (2,018–4,818 characters) and no blank screen.
- No failed network requests; no failed image responses.
- 62 Chrome console entries per run, **all** “401 (Unauthorized)” for the signed-out `/auth/me` probe. **0 JavaScript exceptions.**
- Long tasks: up to 8 per route during load; no runaway animation loops observed.
- CLS before fix: results pages 0.4265 (audit) / 0.544 (focused trace); catalog pages 0.03–0.08.

---

## 2. Root causes

| Issue | Actual technical cause |
| --- | --- |
| W1/W2 unreadable widget | `BookingSearch` used `bg-[var(--surface)]`, a 74 % opaque token. Stay/Rooms use `-mt-8 md:-mt-10` to overlap the hero; the hero image showed through the form. Home’s taller hero meant the form sat on the page background, which is why Home appeared fine. |
| W3 tablet height | Grid classes `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols[…6 tracks]`. At exactly 1024 (`lg`) it chose three columns, creating two rows (150 px). The six-track layout only activated at 1280. |
| W4 state loss | `BookingSearch` kept local `useState` seeded from props; Home/Stay/Rooms always passed the module constant `defaultStaySearch`. There was no shared or persisted state, so every mount reset it. |
| W5 CLS | `AvailabilityResults` rendered a short loading card (118 px) until `/public/catalog` resolved, then replaced it with the 425 px room grid. The footer and following content moved. |
| W6 static background | `.hero-ambient::before/::after` and `.hero-lines` were static decorative layers. Only the hero `<img>` had a continuous GSAP drift. |
| 62 console entries | `/auth/me` legitimately returns 401 for a signed-out visitor. Chrome logs failed requests; the application catches the 401 and continues. This is not an app exception and cannot be silenced without changing the auth probe. |

No backend defect was found. No API, schema, auth or reservation change was required.

---

## 3. Changes implemented

### 3.1 Files modified

| File | Change |
| --- | --- |
| `src/components/hotel/BookingSearch.tsx` | Opaque elevated surface, one-row layout at 1024, full-width button on small grids, accessible select names, optional initial props, session persistence |
| `src/lib/stay-search.ts` | **New.** Session-scoped read/write with validation/normalisation on read |
| `src/pages/HomePage.tsx` | Home-only ambient layer (`home-wash`), `home-hero` scope, widget now reads the shared session search |
| `src/pages/StayPage.tsx` | Removed hard-coded defaults; widget overlap adjusted to `md:-mt-12` |
| `src/pages/RoomsPage.tsx` | Removed hard-coded defaults; widget overlap adjusted to `md:-mt-12` |
| `src/components/hotel/AvailabilityResults.tsx` | Replaced short loading card with three geometry-matched skeleton cards; removed unused loader import |
| `src/index.css` | Home light washes, orb/grid keyframes, reduced-motion overrides |
| `apps/api/scripts/qa-widget-audit.mjs` | **New verification script only** — repeatable before/after Playwright audit |

No header, footer, auth, admin, schema, migration or reservation files were touched. The earlier uncommitted visual redesign remains in the working tree and is unrelated to these widget fixes.

### 3.2 Booking widget fixes

- **Opaque background:** `bg-[var(--elevated)]` + `border-[var(--line-2)]`; readable over photography in light and dark themes.
- **Tablet layout:** six-track row from `lg` instead of three columns; 83 px tall at 1024. The button spans both columns where the grid is two columns and full width on mobile.
- **Touch target:** selects have a minimum height; labels/values remain on one line.
- **Accessibility:** `aria-label` and `name` on each select; the form keeps its `aria-label`, inline `role="alert"` error and native date constraints.
- **Overlap:** `md:-mt-12` keeps the floating composition while placing the 1024 form bottom exactly at the viewport edge.

### 3.3 Shared state / persistence

`BookingSearch` now:

- Reads the last search from **sessionStorage** (`rivr-stay-search`) and validates it with `normalizeStaySearch`.
- Uses explicit props when all five are supplied (Booking/Search pages, where URL state must win).
- Writes every change to sessionStorage, so selections survive Home ↔ Stay ↔ Rooms, back/forward and refresh.
- Does not use localStorage; only the existing theme key lives there.

**Verified:** back → `15–18 Nov, 3 adults, 1 child, 2 rooms`; Home edit to 4 adults → Stay shows 4; refresh keeps 5 adults.

### 3.4 Homepage animated background

Home-only, CSS-driven, no new media or dependency:

- Two large champagne/sage light washes drift in opposite directions (`home-wash` + `::after`).
- The existing ambient orbs now breathe/drift (`home-orb-a/b`).
- The architectural line field drifts and shifts opacity (`home-grid-drift`).
- All movement is transform/opacity only, `will-change` on the moving layers.
- Reduced motion sets every Home animation to `none`.
- The hero photograph keeps its existing continuous drift and sweep, so the first frame and the steady state both have depth.

**Measured:** wash translate −356 → −249 px, counter-wash 113 → 79 px, orb scale 1.0008 → 1.0047 over 2.5 s. Under `prefers-reduced-motion: reduce`, all three report `animationName: none`.

### 3.5 Performance / stability improvements

- Results skeleton cards match the room-card grid height, removing the 0.544 CLS event.
- Catalogue CLS remains 0.03–0.08 from font/hero reflow; results are now 0.002–0.003.
- No new event listeners beyond the React/session write effect; no timers; no duplicate GSAP timelines.
- No image, API or data changes.

---

## 4. Testing results

**Automated evidence:** `reports/qa-widget-before.json`, `reports/qa-widget-after.json` (24 route/viewport captures each), plus a focused CLS/motion trace.

| Test | Before | After | Result |
| --- | --- | --- | --- |
| Home booking widget | Works, but translucent and starts below the fold (y 955 desktop, 1,152 mobile) | Same placement, opaque, session-aware | **Pass (placement unchanged by design)** |
| Stay With Us booking widget | Overlaps hero photo; Children/Rooms text low contrast; 150 px at 1024 | Opaque, legible, 83 px at 1024, bottom at viewport edge | **Fixed** |
| Adventures booking widget | Route does not exist in `src/router.tsx` | Not invented | **Not applicable** |
| Gallery booking widget | Route does not exist | Not invented | **Not applicable** |
| Other public routes | About/Amenities/Contact render CTA, no widget; Booking/Search render it correctly | Same; Booking/Search verified with results | **Pass** |
| Date selection | Check-in/out selectable; invalid range rejected | Same; auto-shift `19→20 Nov` verified | **Pass** |
| Guest selection | Adults/children selectable; limits 1–8 / 0–6 | Same; values persist across pages and refresh | **Pass** |
| Room selection | 1–4 selectable | Same; persists | **Pass** |
| Availability search | `/search?checkIn=…&adults=3…`; results heading + 9 rooms | Same; Home 4-adult submit returns results with 4 | **Pass** |
| Responsive behavior | No overflow; 150 px two-row at 1024; 267 px mobile; 768 two-column | No overflow; 83 px one-row at 1024; 267 px mobile; 271 px at 768 | **Fixed (layout)** |
| Navigation | All tabs/back/forward/refresh render; selections reset | All 13 smoke routes render; no blank/overflow; selections persist | **Fixed (state)** |
| Homepage background | Static ambient orbs; photo drift only | Champagne/sage washes + orb + grid drift confirmed by transform sampling | **Fixed** |
| Browser console | 62 × 401 network logs, 0 JS errors, 0 failed requests | 62 × 401, 0 JS errors, 0 failed requests, 0 other messages | **No regression** |
| Layout stability | Results CLS 0.544 | Results CLS 0.002; max route 0.0533 | **Fixed** |
| Refresh persistence | — | Adults 5 retained after reload | **Pass** |
| 768 px portrait | Not measured in first pass | Form 752 px wide, 271 px tall, no overflow | **Pass** |

**Build/type checks**

| Check | Result |
| --- | --- |
| `pnpm build` (`tsc -b && vite build`) | **PASS**, exit 0, 2,360 modules, 2.09 s |
| `pnpm typecheck:api` | **PASS**, exit 0 |
| CSS output | 115.43 kB / 19.81 kB gzip |
| Main JS output | 444.39 kB / 143.75 kB gzip |
| API tests | Not run — no backend files changed |

---

## 5. Screenshots

### Before

- `reports/screenshots/qa-widget-before/desktop-home.jpg`
- `reports/screenshots/qa-widget-before/desktop-stay.jpg`
- `reports/screenshots/qa-widget-before/desktop-rooms.jpg`
- `reports/screenshots/qa-widget-before/tablet-stay.jpg`
- `reports/screenshots/qa-widget-before/mobile-stay.jpg`
- `reports/screenshots/qa-widget-before/mobile-rooms.jpg`

### After

- Home page + ambient background: `reports/screenshots/qa-widget-after/desktop-home.jpg`
- Home booking widget, scrolled into view: `reports/screenshots/qa-widget-after/home-widget-desktop.jpg`, `home-widget-tablet.jpg`, `home-widget-mobile.jpg`
- Home reduced motion: `reports/screenshots/qa-widget-after/desktop-home-reduced.jpg`
- Stay widget: `reports/screenshots/qa-widget-after/desktop-stay.jpg`
- Rooms widget: `reports/screenshots/qa-widget-after/desktop-rooms.jpg`
- Results page: `reports/screenshots/qa-widget-after/desktop-booking-results.jpg`
- Tablet 1024 widget: `reports/screenshots/qa-widget-after/tablet-widget.jpg`
- Tablet 768 widget: `reports/screenshots/qa-widget-after/tablet-768-widget.jpg`
- Mobile Stay widget: `reports/screenshots/qa-widget-after/mobile-widget.jpg`
- Mobile Rooms widget: `reports/screenshots/qa-widget-after/mobile-rooms-widget.jpg`

The top-of-page captures for all 24 route/viewport combinations are in the same folder.

---

## 6. Final status

### Fixed and verified

- Widget legibility over hero photography (opaque surface, no image bleed).
- 1024 px widget is a single row and its bottom sits at the viewport boundary.
- 768 px two-column and 390 px stacked layouts without overflow or clipped labels.
- Check-in/out, guest and room selection, auto date correction, invalid-range error, submit and results URL.
- Selected search preserved across Home/Stay/Rooms, back/forward and refresh; explicit URLs still win.
- Results-page CLS 0.544 → 0.002.
- Home animated background visibly moves and is disabled under reduced motion.
- 13 public routes render with content, no horizontal overflow and no JS exceptions.
- Production build and API typecheck pass.

### Fixed but not visually verified

- Native `<select>` **open menus** were exercised programmatically (`selectOption`) but not screenshotted in the open state; their closed values are visible in the screenshots.

### Not fixed (intentional / out of scope)

- Widget starts below the fold on Home at all viewports and on mobile catalog pages. Moving it above the hero would require restructuring the shared hero; no clipping or overlap defect remains.
- Adventures, Gallery and Dining routes do not exist. Adding them is a product decision, not a widget fix.
- Native date inputs use the browser’s locale format (`MM-DD-YYYY` in test Chromium). A custom Indian-format picker was not added; existing `min`/validation behaviour is preserved.
- 62 console 401 entries remain by design for signed-out `/auth/me`; there are zero JavaScript errors.
- Catalogue CLS is 0.03–0.08 (font/hero reflow), below the “good” 0.1 threshold but not zero.

### Remaining limitations

- Browser automation was Chromium only; no Safari, Firefox or physical device run.
- No FPS trace or memory-heap profile was captured; layout shift and long tasks were measured.
- Session search state is per-tab and intentionally not shared between tabs.
- No video/GIF background was introduced; no suitable local asset exists and the CSS/photo system is lighter.
- No auth, permission, reservation, schema or backend behaviour was changed.
- No commits or pushes were made.

---

## 7. Reproduction

```bash
# dev stack
pnpm dev

# repeatable audit (server must be running)
node apps/api/scripts/qa-widget-audit.mjs before
node apps/api/scripts/qa-widget-audit.mjs after

# gates
pnpm build
pnpm typecheck:api
```
