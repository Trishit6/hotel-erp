# RIVR Hotel ERP — Frontend Quality, UI/UX & Responsive Audit

**Date:** 15 November 2026
**Scope:** Existing local working tree (`C:\Users\Prince Bhowmik\hotel-erp`)
**Type:** Inspect → reproduce → fix → verify (not a redesign)
**Environment:** Vite dev server `http://localhost:5173`, Express API `http://localhost:4000`, MariaDB with seeded demo data
**Browsers:** Chromium 158 (Playwright), Firefox/WebKit available but this pass used Chromium for interaction coverage
**Viewports:** 360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1920×1080

---

## A. Executive Summary

RIVR's visual identity is intact and the frontend is now substantially more reliable than at the start of this pass. The audit reproduced three serious defects that were not just cosmetic:

1. **The Stay page looked empty below the search bar** because all below-fold `Reveal` wrappers started at `opacity: 0`, and `GsapImage` clipped images to `inset(100%)` until scroll. A 2,268 px section rendered as blank space at first paint.
2. **A booking confirmation did not survive a refresh.** The one-time `sessionStorage` handoff was consumed inside the success page's state initializer, so reloading `/booking/success` showed “Reservation not found”.
3. **The admin dialog was partly off-screen and keyboard-inert.** A filtered ancestor made `position: fixed` relative to the staff content column, placing the dialog at `y=485` with a 712 px height on a 900 px viewport, and the backdrop started at `y=-800`. There was no focus trap and Escape did nothing.

All three are fixed and verified. The 404 is now a branded, themed page. Contrast failures in light-mode secondary text, dark footer text and the champagne CTA are resolved. Login validation is announced and associated with its fields. The staff workspace no longer exposes a theme toggle that cannot change its appearance.

**Axe result after fixes:** 0 violations across home, Stay, login and 404 in **both** themes (8 states).  
**Responsive result:** 140 route/theme/viewport combinations, **0 horizontal overflow**, **0 clipped headings**, **0 broken images**.  
**API regression suite:** 17 files / **103 tests passed**.  
**Production build:** passed (`tsc -b` + Vite).

The remaining work is not a redesign: it is performance measurement, real-device/Safari testing, a full booking E2E, and a product decision on whether the admin workspace should ever support light mode.

### What was verified, concretely

| Area | Before | After |
|---|---|---|
| Stay page at first paint | Cards/sections invisible; large blank region | All sections and cards visible; images may lazy-load but their frames have a surface placeholder |
| `/booking/success` refresh | “Reservation not found” | Confirmation remains for the tab; refresh preserves it |
| Admin dialog at 1440 | `y=485`, height 712, backdrop `y=-800`, no trap/Escape | Centred `y=94`, full 1440×900 backdrop, focus trapped, Escape closes, focus restored |
| Light secondary text | `--faint` 3.50:1 | `#5f6875`, ~4.9:1 |
| Champagne CTA | white 2.40:1 light / 1.92:1 dark | `accent-ink` 7.28:1 / 9.10:1 |
| 404 | Bare “Not Found” | Branded layout, header/footer/theme toggle, `h1`, recovery links |
| Login invalid submit | Error text only; focus stayed on submit | `aria-invalid`, `aria-describedby`, `role="alert"`, focus moves to email |
| Admin theme toggle | Changed storage/state but not appearance | Removed from the fixed-dark workspace |
| Axe (8 states) | Contrast + `aria-prohibited-attr` | **0 violations** |

### Scores for this tested scope

| Area | Score | Note |
|---|---:|---|
| Light mode | 8.5 / 10 | Contrast fixed; tiny label sizes remain |
| Dark mode | 9.0 / 10 | Strong contrast, coherent surfaces |
| Typography | 7.0 / 10 | Two-font pairing is good; 7–11 px labels remain |
| Palette | 8.5 / 10 | Existing identity preserved; token corrections only |
| Visual consistency | 9.0 / 10 | Cards, chrome, forms and 404 now align |
| Accessibility | 8.5 / 10 | Axe clean on tested states; no screen-reader session |
| Responsive | 9.5 / 10 | No overflow/clipping at seven widths |
| Performance | **Not scored** | Lighthouse unavailable; build payload recorded, no production run |

---

## B. Pages Inspected

### Public and authentication routes

All public routes were rendered at **7 viewports × 2 themes** (140 combinations):

| Route | Light | Dark | 7 widths | Interaction verified |
|---|:--:|:--:|:--:|---|
| `/` Home | ✅ | ✅ | ✅ | CTA contrast/axe |
| `/stay` | ✅ | ✅ | ✅ | reveal fix, date persistence, validation, valid search |
| `/rooms` | ✅ | ✅ | ✅ | navigation, persisted stay values |
| `/booking` | ✅ | ✅ | ✅ | mobile layout, invalid-date validation |
| `/search` | ✅ | ✅ | ✅ | valid mobile search → 30 rooms |
| `/login` | ✅ | ✅ | ✅ | invalid submit, focus, ARIA |
| `/about` | ✅ | ✅ | ✅ | mobile cards |
| `/amenities` | ✅ | ✅ | ✅ | mobile cards |
| `/contact` | ✅ | ✅ | ✅ | mobile form, focus border |
| `/my-bookings` | ✅ | ✅ | ✅ | layout |
| `/booking/success` | ✅ | ✅ | 1440/390 | handoff, refresh |
| Unknown route | ✅ | ✅ | ✅ | branded 404 |
| `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | ✅ | ✅ | prior audit + route loads | not re-driven interactively in this pass |

### Customer and staff routes

| Route | Coverage |
|---|---|
| `/guest/dashboard` | Signed-in customer, 1440 and 390, light **and** dark; real reservations/invoices; 0 overflow |
| `/admin/dashboard`, `/admin/staff` | Signed-in super-admin, 1440/390, modal and header controls |
| `/admin/*` (18 routes) | Route/theme/overflow coverage retained from the preceding audit |
| `/manager/dashboard` | Signed-in manager, 1440/390, `h1`, 0 overflow |
| `/reception/dashboard` | Signed-in receptionist, 1440/390, `h1`, 0 overflow |
| `/staff/dashboard` | Signed-in staff, 1440/390, `h1`, 0 overflow |
| `/housekeeping/dashboard` | Checked in preceding pass; fixed-dark shell |

The generic “Features / Pricing / Integrations / Demo” pages in the brief do **not exist** in this repository and were not invented.

---

## C. Issues Discovered

### HIGH

#### H1 — Stay page rendered large blank areas before scroll

- **Page/component:** `/stay`, `Reveal`, `GsapImage`, all public pages using them.
- **Description:** At 1440×900 the hero and search bar rendered, then roughly 2,268 px of the “Ways to stay” section was blank; subsequent sections were also invisible in a full-page capture. Scrolling brought them in.
- **Severity:** HIGH (content appears missing on first paint).
- **Reproduction:** open `/stay` at 1440 and capture/screenshot before scrolling.
- **Root cause:** `Reveal` used `initial={{ opacity: 0, y }}` with `whileInView`; `GsapImage` set `clipPath: inset(0 0 100% 0)` until its ScrollTrigger fired. Content outside the initial viewport was therefore genuinely invisible, not just unanimated.
- **Confirmed:** yes — DOM opacity measured 1 only on sections, while the wrappers/cards inside were 0; before/after full-page captures.
- **Fix:** `Reveal` keeps opacity 1 and animates only `y`; `GsapImage` starts at a 12% clip instead of 100% and gains a surface placeholder.

#### H2 — Booking confirmation became “Reservation not found” after refresh

- **Page/component:** `/booking/success`, `booking-handoff.ts`.
- **Description:** After a creation response was handed over, the first load rendered the confirmation, but a reload showed “Reservation not found”. The handoff was consumed on read and never available again.
- **Severity:** HIGH (a guest can lose the confirmation view immediately after booking).
- **Reproduction:** set a valid creation payload in `sessionStorage` under `rivr-booking-confirmation`, open `/booking/success`, then reload.
- **Root cause:** `takeBookingConfirmation()` removed the key inside the `useState` initializer; refreshes and new page instances had nothing to read.
- **Confirmed:** yes — refresh reproduced the not-found state; the payload itself matched the success page's expected shape.
- **Fix:** read without consuming (`readBookingConfirmation`), explicit `clearBookingConfirmation` on leaving, corrected fallback copy for genuinely missing/direct entries. First load and refresh now both render the confirmation.

#### H3 — Admin dialog was clipped and unusable by keyboard

- **Page/component:** `/admin/staff` → “Add staff”, shared `Modal` in `AdminPages.tsx`.
- **Description:** The dialog opened at `x=640, y=485, 448×712` on a 1440×900 viewport (bottom at 1,197 px). The backdrop measured `x=328, y=-800, 1072×3283`, so it did not cover the viewport. Focus stayed outside the dialog, Tab escaped after 11 presses, and Escape did not close it.
- **Severity:** HIGH.
- **Reproduction:** sign in as super-admin, open Staff & attendance, click “Add staff”; inspect bounding boxes, press Tab repeatedly, press Escape.
- **Root cause:** the modal was rendered inside a filtered/backdrop-filtered ancestor, so `position: fixed` was relative to that column rather than the viewport. The `Modal` had no focus management or key handler.
- **Confirmed:** yes — measured before the fix and after.
- **Fix:** portal the dialog to `document.body` with an `admin-shell` token wrapper; focus the first field, trap Tab/Shift+Tab, close on Escape, lock body scroll, restore focus to the trigger, use `aria-labelledby`.

### MEDIUM

#### M1 — 404 was an unstyled dead end

- **Page:** any unmatched route.
- **Description:** literal “Not Found” text, no header, footer, theme toggle, `h1`, or recovery links.
- **Root cause:** root TanStack route had no `notFoundComponent`.
- **Confirmed:** yes. **Fix:** added `src/pages/NotFoundPage.tsx` and registered it on the root route.

#### M2 — Admin theme toggle changed state but not appearance

- **Page:** every `/admin/*` route.
- **Description:** `data-theme`/`localStorage` flipped, but `.admin-shell` re-declares every token as fixed dark; the workspace looked identical.
- **Root cause:** deliberate fixed-dark token override plus a global toggle.
- **Confirmed:** yes (computed header/main colours identical; 0 visual change).
- **Fix:** removed the toggle from the staff header rather than pretending it works. The workspace remains intentionally dark. A true light admin theme is a larger token-scoping decision, documented under remaining work.

#### M3 — Dark-band footer text failed contrast

- **Pages:** footer on all public routes, 404, Stay/Home dark bands.
- **Description:** `text-white/40` (and `/30` legal copy) produced 8–9 axe contrast failures per page. Low-opacity labels were also hard to read.
- **Root cause:** opacity utilities used for hierarchy without checking effective contrast against `--deep`.
- **Confirmed:** yes (axe targets + computed colours). **Fix:** raised to `white/65` for labels/legal and `white/55` for the placeholder disclaimer; also raised sidebar/auth/hero low-opacity labels.

#### M4 — Champagne CTA was white on gold

- **Pages:** home cinematic band, similar dark-band buttons.
- **Description:** measured white on `#c2a36b` = **2.40:1** (light) and on `#d6b77d` = **1.92:1** (dark), despite the component specifying `text-[var(--accent-ink)]`.
- **Root cause:** `.cinematic-band a { color: white }` (0,1,1) overrode the utility (0,1,0).
- **Confirmed:** yes. **Fix:** scoped the white rule to `:not(.btn-sheen)`; CTA now measures `rgb(20,29,44)` on gold → **7.28:1**.

#### M5 — Login errors were not programmatically associated; email input had no type

- **Page:** `/login`.
- **Description:** invalid submit produced a visual red span, but the email input had `aria-invalid: null`, no `aria-describedby`, and no `type`; focus stayed on the submit button. Screen-reader users were not told which field failed.
- **Root cause:** visual-only error rendering.
- **Confirmed:** yes. **Fix:** `type="email"`, `aria-invalid`, `aria-describedby`, `role="alert"`, and focus moved to the first invalid field.

#### M6 — Rating `aria-label` sat on a role-less `div`

- **Page:** home guest reviews.
- **Description:** three nodes failed `aria-prohibited-attr`; the label was ignored.
- **Root cause:** no semantic role.
- **Confirmed:** yes. **Fix:** added `role="img"` (axe now clean).

#### M7 — Focus treatment was duplicated/inconsistent

- **Pages:** availability search, login, contact, admin fields.
- **Description:** the availability widget combined a square `outline` with a rounded halo; auth used sage while the rest used champagne; contact inputs overrode the global ring with sage.
- **Root cause:** a bespoke `form[aria-label="Search room availability"] label:focus-within` rule plus mixed utility colours.
- **Confirmed:** yes (CSS + focus screenshots). **Fix:** removed the square outline, standardised focus on `--accent-strong` + a 3–4 px soft champagne halo, kept a visible indicator for keyboard users.

#### M8 — Admin notification badge: white on pink = 2.09:1

- **Page:** staff header.
- **Description:** 9 px white count on `--danger` (`#f898ab`).
- **Confirmed:** yes. **Fix:** dark `--deep` text on the pink badge.

### LOW / observations

- **L1 — Small inline tap targets remain** in footer/inline links (16–20 px high). WCAG 2.5.8’s inline-text exception likely applies; not changed.
- **L2 — Very small type remains** (7–11 px labels, brand strapline). Contrast is now sufficient, but the size floor is a design decision; not changed.
- **L3 — Below-fold images are lazy-loaded.** Full-page screenshots can show their placeholder surface; this is intentional performance behaviour, not a missing section. The new `--surface-3` frame makes the wait look deliberate.
- **L4 — Expected 401 probes** still log twice on anonymous pages. Not a regression.

### Issue count

| Severity | Found | Fixed | Remaining |
|---|---:|---:|---:|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 3 | 3 | 0 |
| MEDIUM | 8 | 8 | 0 |
| LOW | 3 | 0 | 3 observations |

---

## D. Fixes Implemented

### Hidden content / motion

- **`src/components/hotel/Reveal.tsx`** — reveal no longer gates visibility: content starts at `opacity: 1`, only a short `y` settle remains. Reduced motion still disables it.
- **`src/components/motion/GsapImage.tsx`** — clip reveal now starts at `inset(0 0 12% 0)` rather than fully hidden; added a themed `--surface-3` placeholder background. ScrollTrigger still supplies the transition.

### Booking confirmation

- **`src/lib/booking-handoff.ts`** — replaced consume-on-read with `readBookingConfirmation()` + explicit `clearBookingConfirmation()`; the value stays tab-scoped in `sessionStorage`.
- **`src/pages/BookingSuccessPage.tsx`** — state reads without consuming, survives refresh/StrictMode; fallback copy now explains tab-scoped confirmations and links to secure lookup; clears the handoff when the guest leaves via the two explicit actions.

### Routing / 404

- **`src/pages/NotFoundPage.tsx`** (new) — branded 404 with `PublicHeader`/`PublicFooter`, theme toggle, `h1`, attempted path, return-home/availability actions and four helpful links; responsive two-column to stacked layout.
- **`src/router.tsx`** — root route registers `notFoundComponent: NotFoundPage`.

### Dialog

- **`src/pages/AdminPages.tsx`** — `Modal` now uses `createPortal` to `document.body` with an `admin-shell` token wrapper, centres in the viewport, traps focus, supports Escape, locks body scroll, restores focus, uses `aria-labelledby`; removed the unused ThemeToggle import; standardised admin field focus to champagne.

### Authentication

- **`src/pages/AuthPages.tsx`** — login email is `type="email"`; errors use ids + `role="alert"`; `aria-invalid`/`aria-describedby` wired; focus moves to the first invalid field; `PasswordField` accepts `aria` state and refs; auth field focus uses the champagne ring.

### Theme / contrast

- **`src/index.css`** — light `--faint` `#78818d` → `#5f6875` (≈4.9:1); removed the duplicate square outline on availability fields; scoped `.cinematic-band a` so CTA text uses `--accent-ink`.
- **`src/components/hotel/PublicChrome.tsx`** — footer labels/legal raised from `white/40`/`/30` to `white/65`/`/55`.
- **`src/components/hotel/StaffChrome.tsx`** — removed the ineffective admin theme toggle; badge text uses `--deep`; sidebar secondary labels raised.
- **`src/pages/GuestDashboardPage.tsx`** — hero summary labels/details raised to `white/65`.
- **`src/components/hotel/HotelUi.tsx`** — dark brand strapline raised; `SectionEyebrow` accepts `onDark` for dark bands.
- **`src/pages/HomePage.tsx`** — uses `SectionEyebrow onDark` in the deep section; rating container gets `role="img"`; dark copy raised.
- **`src/components/hotel/PageHero.tsx`**, **`src/pages/ContactPage.tsx`** — low-opacity hero copy and focus colours aligned.

No route was removed, no business rule was changed, and no backend/API code was touched.

---

## E. Testing Results

### Commands executed

| Command | Result | Evidence |
|---|---|---|
| `pnpm build` | **PASS** (`tsc -b` + Vite, 1.57 s) | `data/build-final.log` |
| `pnpm typecheck:api` | **PASS** | terminal output |
| `pnpm test:api` | **PASS** — 17 files, 103 tests, 90.80 s | `data/api-tests-final.log` |
| `node …/verify-a11y.cjs` | **PASS** — 0 axe violations, 8 states | `data/a11y-after.json`, `a11y-final.log` |
| `node …/verify-responsive.cjs` | **PASS** — 140 combinations, 0 overflow, 0 clipped headings, 0 broken images | `data/responsive-after.json` |
| `node …/verify-interactions.cjs` | **PASS** — see below | `data/interactions-after.json` |
| `node …/diagnose.cjs` | **PASS** — Stay opacity 1, success survives refresh, 404 complete | `data/diagnose-after.json` |
| Final role/search smoke | **PASS** — manager/reception/staff dashboards and valid search | `data/final-smoke.json` |

### Build output (final)

- `dist/assets/index-*.js` 447.93 kB (144.46 kB gzip)
- `HotelUi-*.js` 309.97 kB (99.50 kB gzip)
- CSS 117.90 kB (20.15 kB gzip)
- Build completed in 1.57 s.

### Axe (WCAG 2.0/2.1/2.2 A/AA)

| State | Light | Dark |
|---|---|---|
| Home | 0 | 0 |
| Stay | 0 | 0 |
| Login | 0 | 0 |
| 404 | 0 | 0 |

Before the fixes the same harness reported 8–16 contrast nodes per public page plus `aria-prohibited-attr` on home.

### Responsive

- **140** page/theme/viewport combinations (10 routes × 7 widths × 2 themes).
- **0** horizontal-overflow failures.
- **0** clipped `h1/h2/h3`.
- **0** broken images.
- **0** unexpected console errors (only expected 401 auth probes).
- Mobile screenshots of About, Amenities, Contact and Stay show consistent radii, spacing, wrapped headings and stacked cards at 390.

### Interaction verification

| Check | Result |
|---|---|
| Login invalid submit | Email `type="email"`, `aria-invalid="true"`, `aria-describedby="login-email-error"`, error `role="alert"`, focus moved to email |
| Theme toggle + persistence | light→dark, dates unchanged, reload keeps dark, stay dates persist into `/rooms` |
| Invalid date range | “Choose a checkout date after your check-in date.”, stays on `/stay`, 0 overflow at 390 |
| Valid search | navigates to `/search`, “30 rooms available for this stay”, 0 overflow at 390 |
| Admin theme toggle | count **0** in the workspace |
| Dialog | initial focus inside, **0 escapes in 20 Tabs**, Escape closes, focus returns to “Add staff”, 309 px wide inside 390 |
| Guest dashboard | real data, both themes, 0 overflow at 1440/390 |
| Role dashboards | manager, reception, staff all load with 0 overflow at 1440/390 |
| Stay reveal | every section opacity 1 at load |

### Skipped / not run

- **The repo's existing Playwright suite was not executed.** Its config points at `http://127.0.0.1:5173`, which returns `000` in this environment (Vite is reachable via `localhost`/IPv6), and its registration test creates a demo customer. The equivalent read-only flows were exercised by the harness above. This is a configuration limitation, not a claimed pass.
- **No real reservation was submitted** through the UI, to avoid adding demo business records. The confirmation view was verified with the exact allowlisted creation payload; booking creation itself is covered by the 103-test API suite.
- Lighthouse / Core Web Vitals: **NOT MEASURED** (Lighthouse not installed; no production performance run).
- Real Safari, screen-reader session, payment/email/SMS: **NOT TESTED** (not available or not implemented).

---

## F. Visual Evidence

All files are under `reports/frontend-quality-audit/screens/`.

| Fix | Before | After |
|---|---|---|
| Stay blank sections | `stay-blank-before.jpg` (blank after search) | `stay-after-fix-before-scroll.jpg` (all cards visible), `stay-after-fix-scrolled.jpg` |
| 404 | `not-found-before-fix.jpg` (bare text) | `not-found-after-fix.jpg`, `not-found-after-fix-dark.jpg` |
| Confirmation refresh | `booking-success-before-fix.jpg` (first load) | `booking-success-after-fix.jpg`; refresh verified in `data/diagnose-after.json` |
| Admin dialog | `admin-modal-focus-after.jpg` (clipped, backdrop offset) | `admin-modal-fixed.jpg`, `admin-modal-fixed-mobile.jpg` |
| Login validation/focus | — | `login-validation-after.jpg` |
| Mobile public cards | — | `mobile-about-light/dark.jpg`, `mobile-amenities-light/dark.jpg`, `mobile-contact-light/dark.jpg`, `mobile-stay-light.jpg` |
| Guest dashboard | — | `guest-dashboard-light-after.jpg`, `guest-dashboard-dark-after.jpg` |
| Booking search | — | `booking-validation-mobile-after.jpg`, `booking-search-mobile-after.jpg` |

The HTML report/JSON data live in `reports/frontend-quality-audit/data/`; harnesses in `_harness/`.

---

## G. Remaining Issues / Limitations

1. **Admin light mode is not implemented.** The workspace is intentionally fixed dark; the misleading toggle was removed. Supporting light mode requires scoping the many admin-specific tokens/classes and is a product/architecture decision, not a token tweak.
2. **Typography floor remains 7–11 px** for several labels. Contrast is fixed, but a future pass should raise supporting text to 12 px+.
3. **Small inline tap targets** (16–20 px high) remain in footer/inline links; the WCAG inline exception likely applies.
4. **External Unsplash imagery.** Images are remote and lazy-loaded; full-page captures can show placeholders before scroll. The surface placeholder makes this look intentional, but self-hosting/optimised variants would improve reliability and performance.
5. **Performance not measured in production.** No Lighthouse run, no field Core Web Vitals, no bundle analysis beyond build sizes.
6. **No full booking E2E.** API tests cover creation; the UI confirmation was verified with the creation payload. A real booking on a disposable database should be part of CI.
7. **Existing Playwright suite port mismatch** (`127.0.0.1` vs `localhost`) and its data-creating registration test need adjustment before it can be a safe gate.
8. **Confirmation handoff is tab-scoped until explicit clear or tab close**, not time-expired. That is deliberate for refresh survival but can be tightened with a timestamp if desired.
9. **Unknown admin paths use the public 404 chrome.** Acceptable for now; an in-workspace 404 could be added later.
10. **No real Safari / screen reader / payment / email verification** testing. Email verification remains accurately presented as unavailable until a provider is configured.

---

## H. Final Assessment

**Functionally and visually verified for the tested scope; improved but not declared production-ready.**

The three critical user-facing failures — invisible Stay content, lost confirmation on refresh, and a clipped/inaccessible admin dialog — are fixed and independently re-measured. The 404, contrast, focus treatment, login validation and theme-control honesty are also corrected. The production build and 103-test API suite pass, axe is clean on the eight representative states, and 140 responsive combinations show no overflow or clipped headings.

It should not be called production-ready yet: Lighthouse/Core Web Vitals have not been measured, the admin light-theme decision is open, the existing Playwright suite is not runnable as configured, and a real booking E2E plus real Safari/screen-reader pass are still outstanding. None of those require a redesign; they are verification and product-decision work on top of the existing identity.

### Safety statement

- No commits or pushes were made.
- No production/demo data was deleted or reset. The API suite used the isolated test database only; UI verification created login sessions in the demo database (unavoidable for authenticated checks) and no reservations/payments/guest records.
- No environment variables, credentials, session cookies or secrets are reproduced in this report.
- The only source changes are the 15 modified files plus the new `NotFoundPage.tsx`; audit artifacts are under `reports/frontend-quality-audit/`.
