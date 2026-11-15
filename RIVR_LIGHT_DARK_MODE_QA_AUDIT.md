# RIVR Hotel ERP — Light & Dark Mode QA, UI/UX and Accessibility Audit

**Audit date:** 15 November 2026
**Scope:** Existing implementation only (audit, no fixes)
**Environment:** Local development — frontend `http://localhost:5173`, API `http://localhost:4000`, MariaDB (seeded demo data)
**Repository state:** `main`, working tree free of source changes during the audit
**Tooling:** Playwright 1.65.0 (already a dev dependency), axe-core 4.10.2 injected into test pages from CDN, browser Performance APIs, Node WCAG contrast calculator
**Browsers:** Chromium 158, Microsoft Edge 157 (installed channel), Firefox 159, WebKit 27.2 (Playwright build — **not** Safari)
**Viewports:** 1440×900, 1024×768, 768×1024, 375×812

> This is an audit-only deliverable. No application source, CSS, configuration, migration, database business record, or Git history was modified. See **Audit integrity** at the end.

---

## 1. Executive Summary

RIVR's visual system is coherent and considerably stronger than a typical first-pass hotel ERP: two loaded font families, a disciplined ivory/navy/champagne/sage palette, consistent glass surfaces, a working two-theme public site, and no horizontal overflow at any tested viewport. The most serious problems are not aesthetic — they are **contrast in light mode**, **keyboard behaviour of dialogs**, and **control states that claim to do something they do not** (the staff-workspace theme toggle).

### Scores

| Area | Score | Basis |
|---|---:|---|
| Light mode | **6.5 / 10** | Palette and layout are coherent, but secondary text fails WCAG AA on most public pages and one CTA is white-on-champagne. |
| Dark mode | **8.0 / 10** | Strong contrast throughout; two isolated misses (cinematic CTA, `white/45` micro-copy at 4.47:1). |
| Typography | **6.0 / 10** | Only two families and a clean display/body pairing, but 29% of measured text is ≤11px and 1,162 nodes render at 10px. |
| Colour palette | **7.5 / 10** | System reads as one identity in both themes; two tokens (`--faint` light, `--accent-strong` light) miss normal-text AA. |
| Visual consistency | **8.5 / 10** | Cards, radii, buttons, badges and chrome are consistent; the unstyled 404 and the visually inert admin theme toggle are the outliers. |
| Accessibility | **5.5 / 10** | Alt text, labels on icon buttons, landmarks, reduced motion and focus rings are good; contrast, dialog focus, error association and one ARIA misuse are not. |
| Responsive behaviour | **9.0 / 10** | Zero horizontal overflow at 375/768/1024/1440 across all public routes; mobile menu opens, locks scroll, closes on Escape. |
| Performance | **6.0 / 10** | Measured in Vite **dev** mode only: LCP 2.3–6.2s, CLS 0–0.078. Lighthouse unavailable, so production scores are **NOT MEASURED**. |

**Headline:** this does **not** need a redesign. It needs a token/contrast pass, a dialog keyboard fix, a real 404, and an honest admin theme control — all targeted changes.

### Issues by severity

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 6 |
| LOW | 4 |

---

## 2. Testing Coverage

### 2.1 Route inventory

The generic brief mentions marketing pages (Features/Modules, Pricing, Integrations, Demo, dashboard screenshots). Those are **NOT FOUND** — this repository is a hotel website + ERP workspace, not a SaaS marketing site. Nothing was invented for them.

| Route | Page | Auth | Role | Theme support | Status |
|---|---|---|---|---|---|
| `/` | Home | No | — | Light + dark | PASSED (both themes, 4 widths) |
| `/stay` | Stay With Us | No | — | Light + dark | PASSED (both, 4 widths) |
| `/rooms` | Rooms & suites | No | — | Light + dark | PASSED (both, 4 widths) |
| `/amenities` | Amenities | No | — | Light + dark | PASSED (both, 1440/375) |
| `/about` | About | No | — | Light + dark | PASSED (both, 1440/375) |
| `/contact` | Contact | No | — | Light + dark | PASSED (both, 4 widths) |
| `/search` | Availability results | No | — | Light + dark | PASSED (both, 1440/375) |
| `/booking` | Booking entry | No | — | Light + dark | PASSED (both, 4 widths) |
| `/book/$roomId` | Room booking | Customer (redirects anonymously) | customer | Light + dark | **NOT TESTED** (needs a live room id/date flow) |
| `/booking/success` | Success | No (handoff-based) | — | Light + dark | PASSED (fallback state) |
| `/booking/lookup`, `/my-bookings` | Reservation lookup | No (reference + contact) | — | Light + dark | PASSED (both, 1440/375) |
| `/login` | Sign in | No | — | Light + dark | PASSED (axe 0 violations both) |
| `/register` | Register | No | — | Light + dark | PASSED (1440/375) |
| `/forgot-password` | Forgot password | No | — | Light + dark | PASSED (1440/375) |
| `/reset-password` | Reset password | No (token) | — | Light + dark | PASSED (invalid-token state) |
| `/verify-email` | Verify email | No | — | Light + dark | PASSED (1440/375) |
| unmatched path | 404 | No | — | Neither (no toggle) | **FAILED** (bare "Not Found") |
| `/admin` + 17 `/admin/*` routes | Staff workspace | Yes | Staff + permission | Fixed dark shell (toggle inert) | PASSED / shell fixed dark |
| `/admin/check-in`, `/admin/check-out` | Front-desk aliases | Yes | Staff | Fixed dark | **NOT TESTED separately** (same component as `/admin/front-desk`) |
| `/manager/dashboard`, `/reception/dashboard`, `/housekeeping/dashboard`, `/staff/dashboard` | Role dashboards | Yes | Role | Fixed dark shell | Housekeeping **PASSED**; manager/reception/staff **NOT TESTED** (role accounts) |
| `/guest/dashboard` | Guest area | Yes | customer | Light + dark | PASSED (seeded demo customer) |

Admin routes visited: index, dashboard, reservations, rooms, room-types, guests, front-desk, housekeeping, staff, attendance, payments, invoices, expenses, inventory, restaurant, reports, settings, activity-logs.

### 2.2 Browsers

| Browser | Version | Status | Notes |
|---|---|---|---|
| Chrome (Chromium) | 158.0.8127.18 | PASSED | Full sweep; fonts loaded, toggle works, no overflow |
| Microsoft Edge | 157.0.4341.46 | PASSED | Installed channel, home light/dark smoke |
| Firefox | 159.0 | PASSED | Home light/dark smoke |
| WebKit | 27.2 (Playwright) | PASSED (engine) | Theme + fonts + toggle OK; **not a Safari claim** |
| Safari | — | **NOT TESTED** | No genuine Safari environment on Windows; Chromium/WebKit emulation is not accepted as Safari evidence |

### 2.3 Themes and states tested

- Light mode, dark mode on every public route at 1440 and 375 (34 + 34 page states), plus 768/1024 on 5 key routes.
- System preference light and dark (no stored value) — both resolved correctly.
- Invalid stored value (`blue`) — falls back to OS preference.
- Toggle while running, persistence after refresh, navigation, and new tab — all persisted.
- Pre-hydration state with the app bundle delayed — `data-theme="dark"` already applied by the inline head script.
- Mobile menu open/close/Escape/scroll lock.
- SSR/No-JS: not applicable (Vite SPA).

### 2.4 User roles tested

| Role | Tested | Result |
|---|---|---|
| super-admin | Yes | All 18 admin routes; guest dashboard via seeded customer |
| housekeeping | Yes | Role home loads; `/admin/settings` shows restricted state; nav filtered |
| customer | Yes | `/guest/dashboard` renders real reservations/invoices in both themes |
| manager / receptionist / accountant / restaurant / staff | No | **NOT TESTED** — role dashboard pages require separate demo sessions; login limiter was exhausted during the sweep |

### 2.5 Tools and limitations

**Used:** Playwright (Chromium/Firefox/WebKit/Edge), axe-core 4.10.2 (WCAG 2.0/2.1/2.2 A/AA tags), DOM computed-style measurement, Node contrast calculator, `PerformanceObserver` (LCP, CLS, long tasks), navigation/resource timing, source inspection.

**Limitations (explicit):**

1. **Lighthouse is not installed** and installing packages was prohibited. All Lighthouse scores are **NOT MEASURED**. Performance numbers below come from Chromium Performance APIs against the **Vite dev server**, which serves unbundled modules; they are not production build metrics.
2. **Safari was not available.** WebKit results are engine-only.
3. **No real screen reader** was driven. Accessibility findings combine axe, keyboard interaction, DOM/ARIA inspection and source review.
4. **Rate limiting interfered with the automated sweep.** The public API's 600-requests/15-min limiter and the login limiter returned 429 during exhaustive crawling. Pages then showed the app's global "Too many requests" banner and empty availability. Those states were **excluded as test artifacts**, and affected checks were repeated after the window reset. Screenshots that include the banner are labelled as such.
5. **Not every interactive state was exercised:** hover/active/disabled across all components, browser autofill, file inputs, every modal and dropdown, payment/email/SMS flows, and destructive admin actions were out of scope or deliberately avoided.
6. Colour contrast is computed from CSS/effective backgrounds; translucent glass and photography mean axe and the calculator can differ by a few hundredths. Where they agree, confidence is high.

---

## 3. What Works Well

Confirmed, not assumed:

1. **Theme system is real and well engineered.** `src/lib/theme.tsx` plus an inline `<head>` script apply the theme before first paint; `meta[theme-color]` and `color-scheme` update too. Toggle → dark persisted through reload, route change and a new tab (`localStorage` key `rivr-theme`).
2. **OS preference and invalid storage are handled.** Fresh contexts resolved `dark` and `light` from `prefers-color-scheme`; a stored value of `blue` fell back to the OS value.
3. **No horizontal overflow anywhere tested.** 375, 768, 1024 and 1440 widths across all public routes: `documentElement.scrollWidth - clientWidth === 0`. The staff shell also reported 0 at 375.
4. **Mobile navigation is functional.** `aria-expanded` flips, `aria-controls` points at the menu, body scroll locks (`overflow: hidden`), Escape closes it, and the admin drawer is an overlay with a labelled close button.
5. **Typography pairing is purposeful.** Exactly two families are loaded — Manrope (sans) and Cormorant Garamond (display) — with Italian italic used for editorial emphasis. No fallback-driven shift was observed (`document.fonts.status === "loaded"` in every browser).
6. **Images are accessible in the tested states.** 508 image instances inspected: **0 missing `alt`**, **0 empty-without-purpose**, **0 broken**.
7. **Landmarks and heading order are solid on real pages.** Home: one `header`, `main`, `footer`, one `h1`; no heading-level skips on home, rooms, booking, login or my-bookings.
8. **Reduced-motion support works.** With `prefers-reduced-motion: reduce`, atmospheric orbs/washes report `animation-name: none`, **0** elements retain long animations, and scroll behaviour becomes `auto`.
9. **Icon-only controls are named.** Theme toggle, sign-in, my-bookings, bell, sign-out, sidebar collapse, mobile menu and password visibility all expose `aria-label`/`title`; axe found **0** `button-name` violations.
10. **Reduced-motion, touch and zoom basics are present.** `min-width: 320px`, `viewport` meta without `maximum-scale`, colour-scheme-aware date inputs, print stylesheet that forces light tokens.
11. **Cross-browser consistency on the home page.** Chromium, Edge, Firefox and WebKit: correct theme, both fonts loaded, toggle switched, 0 horizontal overflow, 0 non-401 console errors.
12. **Status messaging is not colour-only.** `StatusBadge` combines a coloured dot with a text label; alerts use `role="alert"`.
13. **Permission enforcement is visible in UI and API.** Housekeeping navigation omits Settings/Staff/Reports, and `/admin/settings` renders "This workspace is restricted." instead of leaking controls.

---

## 4. Issues Found

### 4.1 HIGH

#### H1 — Light-mode secondary text fails WCAG AA across most public pages

- **Observed:** `--faint` (`#78818d`) renders at **3.50:1** on the light canvas (`#f4f1ea`) and **3.89:1** on elevated surfaces. It is used for 7–12px supporting text: brand strapline, rate notes, helper copy, footer labels, guest-dashboard labels.
- **Expected:** ≥4.5:1 for normal text (WCAG 1.4.3 AA).
- **Affected:** `/`, `/stay`, `/rooms`, `/search`, `/booking`, `/contact`, `/login`, `/booking/lookup`, `/my-bookings`, `/guest/dashboard`.
- **Reproduction:** load any of the routes in light mode, inspect a `.text-[var(--faint)]` label (e.g. "Hotel & Residences", "Rates per night · taxes calculated at checkout").
- **Evidence:** token calculator 3.50:1; axe `color-contrast` (serious) — home 14 nodes, rooms 14, booking 16, my-bookings 11; computed samples in `reports/qa-light-dark-audit/data/followup.json`.
- **Likely source:** `src/index.css` `:root --faint: #78818d`. Confirmed defect.

#### H2 — Dialog focus is never moved or trapped, and Escape does not close it

- **Observed (real modal, `/admin/staff` → "Add staff"):** after opening, `document.activeElement` is still the trigger button outside the dialog (`inDialog:false`). Tabbing escapes the dialog by the **11th** press. Pressing **Escape leaves the dialog open**. Focus is not restored on close.
- **Expected:** initial focus enters the dialog, focus is contained while open, Escape closes it, focus returns to the trigger (WCAG 2.4.3 Focus Order; ARIA Authoring Practices dialog pattern).
- **Affected:** `Modal` used by staff/expenses/rooms/inventory/restaurant forms; role="dialog" + `aria-modal="true"` are present but the behaviour behind them is not.
- **Evidence:** `reports/qa-light-dark-audit/data/followup.json` (`modals[0]`), `screens/modal-open.png`.
- **Likely source:** `src/pages/AdminPages.tsx` `Modal` (~line 4685) has no focus effect, key handler, or sentinel; the backdrop is a plain `div`.
- **Confirmed defect** (keyboard and screen-reader impact).

### 4.2 MEDIUM

#### M1 — The theme toggle in the staff workspace changes state but not appearance

- **Observed:** on `/admin/dashboard`, clicking the toggle changes `data-theme` to `dark` and `localStorage` to `dark`, but `.admin-shell` computed tokens are identical before and after: `--canvas #070b12`, `--text #d9dee7`, header `rgba(7, 12, 19, 0.74)`, main text `rgb(217, 222, 231)`.
- **Cause:** `.admin-shell` re-declares every token to a fixed dark set and sets `color-scheme: dark` in `src/index.css`. The global light/dark variables never reach the workspace.
- **Impact:** users are told "Switch to light mode" and the interface does not change; screen readers hear a state change that is not real. 18/18 admin routes exhibit this.
- **Evidence:** `data/admin.json` `themeInWorkspace`; `screens/admin-dashboard-theme-light-state.png` vs `...-dark-state.png` (visually identical).
- **Confirmed defect.** Fix by honouring the theme in the shell, or by hiding/relabelling the toggle as a fixed dark workspace.

#### M2 — The 404 route is an unstyled dead end

- **Observed:** any unmatched path renders the literal text **"Not Found"** at the top-left of an otherwise blank page. No header, footer, navigation, theme toggle or `h1`; title remains the site title.
- **Impact:** a lost visitor has no way back except the browser button; brand and theme continuity break.
- **Evidence:** `data/followup.json` `p404` (light & dark: `hasHeader:false`, `hasFooter:false`, `hasToggle:false`, `h1:0`); `screens/preview-404-light.jpg`.
- **Likely source:** TanStack Router has no `notFoundComponent` registered in `src/router.tsx`.
- **Confirmed defect.**

#### M3 — "Explore the house" CTA renders white on champagne (1.92:1 dark, 2.40:1 light)

- **Observed:** the link in the home cinematic band computes `color: rgb(255,255,255)` on `--accent` (`#d6b77d` in dark; `#c2a36b` in light), despite the component specifying `text-[var(--accent-ink)]`.
- **Cause:** `src/index.css` contains `.cinematic-band a { color: white; }`. Class specificity (0,1,0) loses to `.cinematic-band a` (0,1,1), so the Tailwind token is overridden.
- **Expected:** the intended `--accent-ink` gives **9.10:1** on dark accent and **7.28:1** on light accent.
- **Evidence:** computed ratio in `data/followup.json` (`dark /` solid failure), `screens/clean-home-dark.jpg`.
- **Confirmed defect** (CSS specificity).

#### M4 — Supporting typography is routinely 7–11px

- **Observed:** 2,100 of 7,124 measured text nodes (29%) are ≤11px. The most common sizes are 12px (2,702), 10px (1,162), 14px (830), 11px (714); 7px (84) and 9px (140) are used for straplines and badges. Many carry `0.14em–0.24em` uppercase tracking.
- **Impact:** legibility on 375px screens and low-DPI displays; particularly hard for older guests/staff. Not a WCAG failure by itself, but a significant readability issue.
- **Evidence:** aggregated computed styles across 88 page states (`data/public.json`).
- **Confirmed observation.**

#### M5 — Login validation messages are not programmatically associated with fields

- **Observed:** submitting an invalid email renders "Enter the email address on your account." in a plain `span.text-[var(--danger)]`. The email/password inputs have `aria-invalid: null`, no `aria-describedby`, no `required`, and no visual border change; the error container has no `role="alert"` or live region. Focus stays on the submit button.
- **Expected:** `aria-invalid="true"`, `aria-describedby` pointing at the message, focus moved to the first invalid field, and an announced alert (WCAG 3.3.1 / 1.3.1).
- **Evidence:** `data/final.json` `validation`; `screens/preview-login-validation.jpg`.
- **Likely source:** `src/pages/AuthPages.tsx` LoginPage error spans (~lines 273–290).
- **Confirmed defect.**

#### M6 — `aria-label` on a role-less rating `div` is ignored by assistive technology

- **Observed:** axe `aria-prohibited-attr` (serious) on 3 nodes on the home page: `<div aria-label="5 out of 5 stars">` has no role, so the label cannot be used.
- **Expected:** `role="img"` with the label, or visually hidden text.
- **Evidence:** `data/a11y.json` (home light/dark).
- **Confirmed defect.**

### 4.3 LOW

#### L1 — Admin notification badge: white on pink = 2.09:1
The bell badge (`bg-[var(--danger)] text-white`, 9px bold) computes **2.09:1** against the admin `--danger` `#f898ab` on all admin routes. Use dark text (`--deep`) or a darker badge fill. Evidence: `data/admin.json`, every route.

#### L2 — Dark-mode micro-copy at 4.47:1
`text-white/45` at 7px sits just below 4.5:1 on the deep hero/footer backgrounds (home 9 nodes, rooms 9, booking 9, my-bookings 9). Axe flags it as serious; the miss is marginal (4.47). Raise to `white/60` or use `--muted`. Evidence: `data/a11y.json`.

#### L3 — Two 401 console errors on every anonymous page load
Loading any public page logs `Failed to load resource: 401` twice — the expected `/auth/me` and admin bootstrap probes. It is not a functional defect, but it pollutes the console and any error monitoring. Evidence: every entry in `data/public.json`.

#### L4 — Some interactive targets are under 24px high
On mobile, 8–11 links/buttons per page measure <24px in one dimension (mainly footer/inline text links at 16–20px; the password eye button is 23×28). WCAG 2.5.8 exempts inline links in text, so this is a usability note rather than a clear failure. Evidence: `data/a11y.json` `targets`.

### 4.4 Confirmed passes (no issue found)

- Light/dark toggle, persistence, OS preference, invalid stored value, new tab.
- No horizontal overflow at 375/768/1024/1440 (public) or 375/1440 (admin).
- Reduced motion, mobile menu, Escape close, body scroll lock.
- Images alt text, broken images, icon-button names, landmarks, heading order.
- Login and admin dashboard: **0 axe violations** in both themes.
- Cross-browser home smoke in Chromium, Edge, Firefox, WebKit.

---

## 5. Recommended Improvements

*Recommendations only — nothing here was implemented.*

### Quick fixes (under one working day)

1. **Darken light `--faint`** to a value ≥4.5:1, e.g. `#5f6875` (~4.9:1) — or restrict `--faint` to decorative icons and use `--muted` (`5.15:1`) for text.
2. **Fix `.cinematic-band a` specificity.** Scope the white rule to non-CTA links (`color: inherit` on `.btn-sheen`), restoring `--accent-ink` (7.28/9.10:1).
3. **Badge contrast:** use `text-[var(--deep)]` for the notification count, or a darker danger fill.
4. **Raise dark `white/45` to `white/60`** (or `--muted`) for 7px micro-copy.
5. **Add `type="email"`** to the login email input (currently untyped, so mobile keyboards do not switch to email layout).
6. **Give the rating `div` `role="img"`** (or replace with visually hidden text).
7. **Register a real `notFoundComponent`** with public chrome, `h1`, one sentence, and links to Home/Rooms/My bookings.
8. **Associate login errors:** `aria-invalid`, `aria-describedby`, `role="alert"`, focus the first invalid field, and a red field border.

### Medium changes (component/token level)

1. **Dialog accessibility:** move initial focus to the first field, trap Tab/Shift+Tab, close on Escape, restore focus to the trigger, and wire `aria-labelledby` to the heading. Apply once in the shared `Modal`.
2. **Decide the admin theme contract.** Either make `.admin-shell` consume the global tokens (true light workspace) or remove/disable the toggle there and label the workspace "Always dark". Do not announce an unapplied theme change.
3. **Raise the supporting type floor:** 12px minimum for labels and helper text, 14–16px body, 11px only for uppercase eyebrows with strong contrast; cap tracking at `0.14em` on small labels.
4. **Status token audit:** `--success` on `--success-soft` is 4.39:1 in light mode — darken success slightly (e.g. `#2a7153`) or use white/large text on badges.
5. **Silence expected 401 probes** in the client (treat as a normal auth state) or handle them before they surface as console errors.
6. **Light-mode glass over photography:** text on translucent cards can vary with the image beneath; consider a fixed scrim token for overlay labels (evidence: room badges sit over images).

### Major redesign considerations

**None required.** The layout system, type pairing, palette architecture and responsive grid are sound. A redesign would be justified only if the product explicitly needs a **light staff workspace**, which is an architectural theme change (token scoping) rather than a visual redesign.

---

## 6. Colour Palette Review

### 6.1 Measured tokens (from `src/index.css`)

**Light**

| Token | Value | Used for |
|---|---|---|
| `--canvas` | `#f4f1ea` | Page canvas |
| `--surface` | `rgba(255,253,249,0.74)` | Glass cards |
| `--surface-2` / `--surface-3` | `#efeae1` / `#e6dfd3` | Section washes |
| `--elevated` | `#fffdfa` | Solid panels |
| `--ink` | `#0d1117` | Display headings |
| `--text` | `#26303f` | Body |
| `--muted` | `#5d6674` | Secondary |
| `--muted-strong` | `#424b58` | Labels |
| `--faint` | `#78818d` | Tertiary/micro-copy |
| `--primary` | `#16243b` | Primary buttons |
| `--on-primary` | `#fbf8f2` | Button text |
| `--accent` / `--accent-strong` | `#c2a36b` / `#8f6c34` | Champagne accents |
| `--success` / `--danger` / `--warning` | `#2f7d5b` / `#b4475c` / `#8f6516` | Status |
| `--info` / `--neutral` / `--violet` | `#2f5f8f` / `#5f6a78` / `#4f6d74` | Status/info |

**Dark**

| Token | Value | Used for |
|---|---|---|
| `--canvas` | `#070b12` | Page canvas |
| `--surface` / `--elevated` | `rgba(16,24,36,0.74)` / `#101a28` | Glass/panels |
| `--surface-2` / `--surface-3` | `#0f1825` / `#162233` | Washes |
| `--ink` / `--text` | `#f4efe5` / `#e3ded3` | Headings/body |
| `--muted` / `--muted-strong` / `--faint` | `#9ba4b1` / `#c4cbd5` / `#7f8896` | Secondary tiers |
| `--primary` / `--on-primary` | `#2c4768` / `#ffffff` | Buttons |
| `--accent` / `--accent-strong` | `#d6b77d` / `#e7cf9f` | Champagne |
| `--success` / `--danger` / `--warning` | `#74d3a8` / `#f898ab` / `#e8c079` | Status |
| `--info` / `--neutral` / `--violet` | `#94b8e6` / `#adb8c6` / `#9fc3c9` | Status/info |

The **admin shell** overrides every token to a fixed dark set (`--canvas #070b12`, `--text #d9dee7`, `--primary #27405f`, `--accent #d8bb82`), independent of the theme.

### 6.2 Measured contrast (declared pairs)

| Pair | Ratio | AA normal | AA large/UI |
|---|---:|:--:|:--:|
| Light text / canvas | 11.81 | PASS | PASS |
| Light muted / canvas | 5.15 | PASS | PASS |
| Light muted-strong / canvas | 7.83 | PASS | PASS |
| **Light faint / canvas** | **3.50** | **FAIL** | PASS |
| Light faint / elevated | 3.89 | FAIL | PASS |
| Light on-primary / primary | 14.68 | PASS | PASS |
| Light accent-strong / canvas | 4.27 | FAIL (normal) | PASS |
| Light success / success-soft | 4.39 | FAIL (marginal) | PASS |
| Light danger / danger-soft | 4.53 | PASS | PASS |
| Light warning / warning-soft | 4.63 | PASS | PASS |
| Dark text / canvas | 14.69 | PASS | PASS |
| Dark muted / canvas | 7.83 | PASS | PASS |
| Dark faint / canvas | 5.50 | PASS | PASS |
| Dark on-primary / primary | 9.51 | PASS | PASS |
| Dark accent-strong / canvas | 12.97 | PASS | PASS |
| Dark status pairs | 7.66–8.58 | PASS | PASS |
| Admin text / canvas | 14.59 | PASS | PASS |
| Admin muted / faint | 8.98 / 6.23 | PASS | PASS |
| **CTA white / light accent** | **2.40** | **FAIL** | FAIL |
| **CTA white / dark accent** | **1.92** | **FAIL** | FAIL |
| CTA accent-ink / accent (intended) | 7.28 / 9.10 | PASS | PASS |
| **Bell badge white / admin danger** | **2.09** | **FAIL** | FAIL |

Axe independently reported `color-contrast` on home/rooms/booking/my-bookings, which corroborates the token math (glass backgrounds can shift ratios slightly).

### 6.3 Palette consistency

- **Coherent:** champagne gold + sage on ivory (public) and midnight glass + gold (workspace) read as one brand; no stray accent hues, no oversaturated status colours.
- **Status without colour dependence:** labels accompany all status dots.
- **Harshness:** no pure `#000`/`#fff` page backgrounds; dark canvas is `#070b12`, light is warm ivory. Shadows are soft.
- **Weak spots:** light `--faint`, light `--accent-strong`, light success-on-soft, white-on-champagne CTA, white-on-pink badge.
- **Colour-vision:** statuses use red/green/amber but also text labels and distinct icons; no red-green-only encoding found.

### 6.4 Proposed corrections (recommendations, not current implementation)

| Token | Current | Proposed | Reason |
|---|---|---|---|
| Light `--faint` | `#78818d` | `#5f6875` | 3.50 → ~4.9:1 |
| Light `--accent-strong` | `#8f6c34` | `#7a5a2a` | 4.27 → ~5.2:1 for small text/focus text |
| Light `--success` | `#2f7d5b` | `#2a7153` (verify) | 4.39 → ≥4.5 on soft green |
| Cinematic CTA text | `.cinematic-band a { white }` | `--accent-ink` | 2.40/1.92 → 7.28/9.10 |
| Admin danger badge text | white | `--deep` (`#04080f`) | 2.09 → high contrast |
| Dark micro-copy | `white/45` | `white/60` or `--muted` | 4.47 → ≥4.5 |

Suggested token set (semantic names): `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--faint`, `--primary`, `--on-primary`, `--accent`, `--accent-ink`, `--border`, `--success`, `--warning`, `--danger`, `--info` — with the light `--faint` value above as the only required change to reach AA body text.

---

## 7. Typography Review

### 7.1 Measured

- **Families:** exactly two — **Manrope** (6,024 measured nodes) and **Cormorant Garamond** (1,100). Loaded successfully in Chromium, Edge, Firefox and WebKit; `document.fonts.status === "loaded"`. Fallbacks (`Inter`, system sans; `Playfair Display`, Georgia) were not observed taking over.
- **Display:** Cormorant Garamond, 400 weight, fluid `clamp()` sizes from ~2.4rem to 4.6rem, tight leading (0.96–1.02) and negative tracking (−0.03em) — intentional and consistent.
- **Body:** Manrope 400–600 at 12–15px, line-height 5–7 (20–28px).
- **Labels:** uppercase 7–10px, 500–700 weight, tracking 0.14–0.24em.
- **Most common sizes:** 12px (2,702 nodes), 10px (1,162), 14px (830), 11px (714), 30px (576), 13px (180), 16px (176), 24px (148), 9px (140), 7px (84).
- **≤11px:** 2,100 of 7,124 nodes (29.5%).
- **Wrapping:** `text-balance`/`text-pretty` utilities exist; no clipped headings observed at 375px. No layout shift attributable to font swap (CLS 0 on home/login).

### 7.2 Inconsistencies

- Supporting text spans 7, 9, 10, 11, 12 and 13px with no clear role mapping; 10px is doing most label work.
- Uppercase 7px straplines ("HOTEL & RESIDENCES") combine tiny size, low weight and wide tracking — the hardest text to read in light mode.
- Two different display scales exist (public hero clamp vs admin `text-3xl`/`text-2xl`), which is acceptable for different contexts but not documented.

### 7.3 Recommended pairing and scale (recommendations)

- Keep **Cormorant Garamond + Manrope** — it is the strongest part of the identity.
- Type scale: **12 / 14 / 16 / 20 / 24 / 32 / 44 / 64** (display via clamp).
- Body: 15–16px, line-height 1.6; supporting: 13–14px; minimum label: 12px (11px only for uppercase eyebrows ≥4.5:1).
- Weights: 400 body, 500 UI, 600 emphasis, 700 reserved for badges/counts.
- Letter spacing: 0 on body; `0.12–0.14em` on uppercase labels; avoid 0.22em below 10px.

---

## 8. Responsive Design Review

| Viewport | Result |
|---|---|
| **1440×900** | All public and admin routes render; no overflow; nav complete; admin sidebar expanded/collapsed states work. |
| **1024×768** | Home, stay, rooms, booking, login, contact: no overflow; desktop nav visible; booking search bar fits. |
| **768×1024** | Same six routes: no overflow; public nav collapses to the menu button; form grids stack. |
| **375×812** | All 17 public routes: `scrollWidth - clientWidth = 0`; mobile menu opens/closes with scroll lock; cards stack; booking/search forms remain usable. Admin dashboard/reservations: 0 horizontal scroll; drawer overlays content. |

Specific observations:

- **No horizontal overflow** in any tested state — a strong result.
- **Admin decorative glows** extend beyond the container (`metric-glow` right edge 394px at 375), but `overflow-x` clipping keeps the page at 0 scroll. This is cosmetic, not a defect.
- **Admin mobile drawer** is 288px wide, has a labelled close button and a backdrop; focus is not trapped (it is a disclosure, not a modal dialog, so acceptable).
- **Small tap targets** remain the main mobile issue (see L4), especially footer links.
- **Long-content pages** (rooms, booking) remain readable at 375; no clipped buttons or overlapping cards observed in screenshots.

---

## 9. Performance and Accessibility Results

### 9.1 Performance (measured, dev server only)

| Route | LCP | CLS | Long tasks | Long-task time | Transfer (dev) | Script requests |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 6,248 ms | 0.000 | 10 | 2,302 ms | 15,658 KB | 40 |
| `/rooms` | 2,920 ms | 0.078 | 7 | 1,086 ms | 15,777 KB | 43 |
| `/login` | 2,280 ms | 0.000 | 3 | 467 ms | 15,000 KB | 41 |
| `/admin/dashboard` | 1,392 ms | 0.000 | 3 | 275 ms | 281 KB | 41 |

- **Lighthouse Performance / Accessibility / Best Practices / SEO: NOT MEASURED** (not installed; installing was prohibited).
- **INP: NOT MEASURED** (no reliable interaction set).
- **Fonts:** one Google Fonts stylesheet request; both families resolved; no failed font requests.
- **Images:** no broken images; hero imagery is the dominant image payload (~1.0–1.1 MB in dev).
- **Console:** only the two expected 401 auth probes; no JS exceptions, no failed asset requests.
- **Caveat:** the Vite dev server serves unbundled ES modules (40+ script requests, ~15 MB), so these numbers **must not** be compared with a production build. A production build/Lighthouse run is the required next measurement.

### 9.2 Automated accessibility (axe-core 4.10.2)

| Page / theme | Violations | Detail |
|---|---|---|
| Home light | 2 | `color-contrast` ×14 nodes; `aria-prohibited-attr` ×3 |
| Home dark | 2 | `color-contrast` ×9; `aria-prohibited-attr` ×3 |
| Rooms light | 1 | `color-contrast` ×14 |
| Rooms dark | 1 | `color-contrast` ×9 |
| Booking light | 1 | `color-contrast` ×16 |
| Booking dark | 1 | `color-contrast` ×9 |
| My bookings light | 1 | `color-contrast` ×11 |
| My bookings dark | 1 | `color-contrast` ×9 |
| Login light / dark | 0 | PASS |
| Admin dashboard light / dark | 0 | PASS |

### 9.3 Manual accessibility checks

- **Keyboard order:** logical on `/login` — brand → back → theme toggle → email → password → show password → forgot → submit → create account. Theme toggle activates with Enter and updates its label.
- **Focus visibility:** links/buttons show a 2px accent outline with offset; text inputs suppress the native square outline but their rounded shell receives a 3px champagne halo (`box-shadow` confirmed). Acceptable, though the shell border itself did not change colour in the measured state.
- **Dialog:** FAILED — see H2.
- **Error association:** FAILED — see M5.
- **Reduced motion:** PASS — 0 long animations, orbs/washes disabled, `scroll-behavior: auto`.
- **Touch targets:** 8–11 per page under 24px in one dimension (mostly inline/footer text links; WCAG 2.5.8 inline exception likely applies).
- **ARIA misuse:** `aria-label` on role-less rating `div` (M6).
- **Labels/landmarks:** no `label` or `button-name` violations; one `h1` per real page; no skipped heading levels.
- **Images:** 0 missing alt, 0 broken.
- **Status:** text labels accompany colour dots.

---

## 10. Priority Roadmap

### Fix first — HIGH

1. Light-mode `--faint` contrast (all public pages). *Token change; verify with axe.*
2. Dialog focus entry/trap/Escape/restore (shared `Modal`).

### Fix second — MEDIUM

3. Admin theme toggle contract (apply theme or remove it).
4. Real 404 with header/footer/theme/h1.
5. Cinematic CTA specificity (`accent-ink`).
6. Login error association + `type="email"`.
7. Rating `role="img"`.
8. Typography floor (reduce 7–10px reliance).

### Fix third — LOW

9. Notification badge contrast.
10. Dark `white/45` micro-copy.
11. 401 console noise.
12. Small tap targets in footer/inline links.

---

## 11. Final Verdict

### **NO — a redesign is not required. Targeted fixes are sufficient.**

The design system is coherent and the responsive implementation is unusually clean: no overflow at four widths, functional mobile navigation, correct theme persistence and OS preference handling, two well-chosen fonts, accessible imagery, and zero axe violations on login and the admin dashboard. The failures are localized and fixable at the token/component level: one light-mode colour token, one CSS specificity rule, one badge colour, dialog focus behaviour, a missing 404, and error association. Only the admin light theme — if it is genuinely desired — requires an architectural decision rather than a cosmetic fix.

---

## Audit integrity

- **No application source, CSS, configuration, migration, environment file or database business data was modified.** `git diff --stat -- src apps/api` is empty.
- The only source-tree addition is this report and the audit artifact folder `reports/qa-light-dark-audit/` (Playwright harness, JSON measurements, 147 screenshots). Existing reports were not overwritten or regenerated.
- Testing used existing seeded demo data. Signing in creates **session rows** in the demo database (unavoidable for authenticated testing); no reservations, payments, guests, inventory or settings records were created, changed or deleted. No bookings were submitted.
- Demo credentials are intentionally omitted from this report. No cookies, tokens, secrets or personal data are reproduced.
- The API rate limiter was triggered by exhaustive crawling during the audit; affected screenshots are labelled and those states were excluded from findings (the limiter itself is working as designed).
- Lighthouse scores are absent because Lighthouse is not installed and installing packages was prohibited — they are reported as **NOT MEASURED**, not estimated.

### Reproducing the measurements

```bash
node reports/qa-light-dark-audit/_harness/tokens.cjs     # declared token contrast
node reports/qa-light-dark-audit/_harness/audit.cjs      # public routes × themes × viewports
node reports/qa-light-dark-audit/_harness/admin.cjs      # staff workspace + guest dashboard
node reports/qa-light-dark-audit/_harness/a11y.cjs       # axe + keyboard + reduced motion
node reports/qa-light-dark-audit/_harness/extra.cjs      # persistence + cross-browser + perf
```

Raw data: `reports/qa-light-dark-audit/data/*.json`. Screenshots: `reports/qa-light-dark-audit/screens/`.
