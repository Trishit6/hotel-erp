# RIVR — Premium Visual Experience Report

**Date:** 9 November 2026  
**Scope:** Public guest website, admin workspace, route transitions, cursor, motion system  
**Direction delivered:** Contemporary Luxury — Editorial Elegance + Cinematic Motion + Restrained Glassmorphism  
**Backend / auth / booking / database:** **not modified**

---

## 1. Initial visual audit

The existing app was run locally against the live database (`http://localhost:5173`, API on `:4000`), signed in with the seeded `admin@admin.com` demo account, and captured with Playwright 1.65.0 at 1440×900, 1024×768 and 390×844 plus reduced motion.

**Baseline evidence:** `reports/screenshots/premium-audit/` (`before-*` PNGs + `audit-before.json`).

| Area inspected | Files |
| --- | --- |
| Atmosphere / editorial components | `src/components/hotel/Cinematic.tsx`, `Reveal.tsx`, `HotelUi.tsx` |
| Hero and motion | `src/pages/HomePage.tsx`, `src/components/hotel/PageHero.tsx`, `src/components/motion/GsapImage.tsx`, `gsap.ts` |
| Route lifecycle | `src/router.tsx` |
| Admin shell | `src/components/hotel/StaffChrome.tsx`, `src/pages/AdminPages.tsx` |
| Cursor | `src/components/motion/CustomCursor.tsx`, `src/index.css` |
| Global styling | `src/index.css` |

Baseline result: all audited routes rendered, no console errors, no horizontal overflow, no broken images. The problems were perceptual, not functional.

---

## 2. Problems discovered in the existing implementation

1. **Hero photography felt static.** The GSAP entrance (clip-path reveal + scale settle) completed in ~1.5–2 s and then stopped. On desktop the only remaining movement was a scroll-linked drift of ±3–5 %. A visitor who does not scroll never sees motion after landing, and the drift is easy to miss.
2. **The page background was effectively flat.** `PageAtmosphere` sat at `z-index: -1` behind the body and behind mostly opaque section surfaces (`--surface-2`, `--surface-3`). Its base gradient was also built from the dark `--deep` token, so on the ivory canvas it was largely hidden rather than layered. The section wash was only 8–9 % opacity.
3. **Navigation produced a washed-out/white frame.** `RootComponent` set the entire route wrapper to `opacity: 0.001` on every pathname change and faded it up, with no pending UI for lazy route chunks. During the fade the ivory canvas showed through, which reads as a white flash or blank page.
4. **The Contact heading could remain partially revealed.** `.pagehero-line` was animated with `.from({ yPercent: 112 })` inside an `overflow-hidden` span and never cleared. If the timeline was interrupted, re-mounted, or reverted mid-flight, the line could stay translated or transparent. There was no completion fallback and no `clearProps`.
5. **The cinematic layer was not a system.** Motion, lighting, and surfaces were implemented per component but not tokenised, so depth varied page to page and was easy to lose.

---

## 3. Root cause of the “invisible” cinematic effects

There was no missing animation library or broken initialization. The effects existed but were **not perceptible for three concrete reasons**:

1. **Duration envelope:** the only auto-playing hero motion finished before it could register, and subsequent motion required scrolling.
2. **Paint order + opacity:** the atmospheric layer was behind opaque surfaces and used a dark base on a light canvas, so almost none of it reached the screen.
3. **Interruption without a terminal state:** text and image tweens relied on `.from()` plus inline styles; nothing guaranteed the final visible state.

Fixes were therefore structural: continuous transform-only image drift, a visible atmospheric layer with stronger light, a non-blanking route transition with a pending state, and explicit terminal states (`clearProps`) for text.

---

## 4. Comparison of the three visual directions

Each direction was built as an isolated static prototype using the real fonts, photography, and content, then screenshotted at 1280 px:

- `reports/visual-experiments/direction-a-cinematic.html`
- `reports/visual-experiments/direction-b-editorial.html`
- `reports/visual-experiments/direction-c-immersive.html`

| Criterion (1–5) | A · Cinematic Luxury | B · Editorial Luxury | C · Modern Immersive |
| --- | --- | --- | --- |
| Professional hotel-brand appearance | 4 | **5** | 4 |
| Colour harmony | 4 | **5** | 4 |
| Readability | 3 | **5** | 4 |
| Visual hierarchy | 4 | **5** | 4 |
| Uniqueness | 4 | 4 | **5** |
| Suitability for a hotel website | 4 | **5** | 3 |
| Animation quality | **5** | 3 | 5 |
| Performance / responsiveness | 4 | **5** | 3 |

**Strengths**

- **A (Cinematic Luxury):** most dramatic photography and strongest first impression, but turning the entire public site charcoal would fight the already-approved light header/footer and risks the “too dark / too gold” failure mode.
- **B (Editorial Luxury):** best readability, hierarchy, and hotel-brand fit; closest to the existing approved shell. Weaker on motion and can read beige if lighting is flat.
- **C (Modern Immersive):** best depth and glass language, but reads more “technology product” than “hotel” and its teal accents drift from the brand sage.

**Selection:** the hybrid **B + A's image language + C's glass reserved for the workspace** was chosen. This matches the preferred direction, keeps the approved header/footer and light editorial identity, and gives the admin a distinct, professional midnight-glass product language. The prototypes were not shipped; production uses one system.

**Prototype screenshots:** `reports/screenshots/premium-experiments/direction-{a-cinematic,b-editorial,c-immersive}.jpg`.

---

## 5. Final palette and tokens

The palette is intentionally narrow: warm ivory/stone paper, charcoal ink, champagne metal, and sage — with a separate midnight-glass scale for operations.

| Role | Token / value | Use |
| --- | --- | --- |
| Primary background | `--canvas: #f4f1ea` / `--ivory: #f7f4ed` | Public paper |
| Secondary background | `--surface-2: #efeae1` | Editorial bands |
| Surface | `--surface: rgba(255,253,249,0.74)` | Cards, translucent |
| Elevated surface | `--elevated: #fffdfa` | Dialogs |
| Primary text | `--ink: #0d1117` | Headlines |
| Secondary text | `--text: #26303f`, `--muted: #5d6674` | Body |
| Primary accent | `--accent: #c2a36b` (champagne) | Rules, labels, highlights |
| Secondary accent | `--sage: #3f6b5b` (sage) | Italic display lines, calm emphasis |
| Border | `--line: rgba(89,97,110,0.16)` | Hairlines |
| Hover | `--primary-hover: #243a59`, accent border | Buttons / cards |
| Focus | `3px` champagne ring via `:focus-visible` | Keyboard |
| Success / warning / error | `#2f7d5b` / `#8f6516` / `#b4475c` | Status only |
| Admin canvas | `#070b12` | Operations |
| Admin glass | `rgba(18,27,40,0.62)` + `blur(22px)` | Panels |
| Admin accent | `#d8bb82` | Highlights, charts |

**Why it holds together:** one metal (champagne) and one cool accent (sage) against neutral paper; no second gold, no neon, no arbitrary gradients. Status colours remain semantic and are the only saturated hues in the workspace.

---

## 6. Public website changes

### Atmosphere system

- Reworked `PageAtmosphere` into five layers: warm ivory/stone base with large sage + champagne radial light, two slow architectural **light beams**, drifting ambient orbs, an architectural line SVG, and film grain + vignette.
- The base was corrected from a dark gradient to an ivory-to-stone wash, so the layer is visible through translucent section surfaces.
- Section wash raised from 8–9 % to 12–14 % accent/sage.
- All continuous motion is transform/opacity only; no animated gradient repaint, no full-screen blur, no video.

### Hero sections

- `PageHero` (Stay, Rooms, Amenities, About, Contact, and other guest pages): clip-path image reveal, 1.2 → 1.03 scale settle, **continuous 18 s sine drift**, a light sweep across the photograph, stronger cinematic scrim, and desktop-only parallax on a dedicated wrapper (±4 %).
- `HomePage` hero: same treatment with a deeper scale envelope (1.2 → 1.04), 19 s continuous drift, ±5 % desktop parallax, and a light sweep.
- Text entrance is explicit `fromTo` with `clearProps` on completion, so headings always end fully visible.
- `AboutPage` and `ContactPage` use the reversed copy/image composition so consecutive pages do not read identically.
- One primary CTA on Home carries `data-magnetic`; the effect is deliberately not global.

### Route transitions

- Removed the near-zero opacity gate: the route wrapper now starts at `0.9` and settles to `1`, so content never disappears against the canvas.
- Added a router-level pending component (`defaultPendingMs: 140`, `defaultPendingMinMs: 300`) with a branded loader, so lazy chunks no longer show an empty page.
- Removed the guest scroll-progress bar from staff workspaces.

### Preserved

- Header/footer untouched (`src/components/hotel/PublicChrome.tsx` has an empty git diff).
- No routes added or removed; no gallery route invented (none exists).

---

## 7. Admin glassmorphism

The workspace now has its own scoped design language under `.admin-shell`; it does **not** leak into the guest site.

- **Background:** midnight `#070b12` with champagne and deep-sage ambient light, a masked architectural grid, and one slow orb.
- **Tokens:** the full surface/text/border/status set is redefined for dark glass, so existing components become legible without rewriting every page.
- **Panels:** `glass-card` uses a translucent midnight gradient, 22 px backdrop blur, a 1 px light border, an inset top highlight, and deep shadow. Blur is applied to panels, sidebar, header and modals — not to every element.
- **Sidebar/header:** near-opaque midnight glass with a fine border; active navigation retains the champagne rail.
- **KPI cards:** champagne corner glow, stronger hover border/shadow, existing live badges and numbers preserved.
- **Tables:** light `--ink` text, muted-strong headers on a darker header band, hairline row borders, champagne row hover.
- **Forms:** dark translucent inputs with champagne focus ring, dark date pickers, dark select options.
- **Charts:** brighter champagne→sage bars, higher-contrast grid lines.
- **Accessibility/performance:** `color-scheme: dark`; explicit `@supports` fallback to solid panels when backdrop-filter is unavailable; reduced-motion disables the ambient orb.
- All data, roles, permissions and workflows are untouched. Only the shell wrapper and atmosphere element were added to `StaffChrome.tsx`.

**Known trade-off:** the admin workspace is deliberately always midnight glass, so the public ThemeToggle does not visibly re-theme it. The guest site still switches light/dark normally.

---

## 8. Cursor improvements

The existing identity (small champagne dot + thin ring + contextual label) was preserved and extended.

- **Response:** ring spring tightened to `stiffness 520 / damping 34 / mass 0.42`; the dot follows the pointer exactly. No lag or jitter observed.
- **Modes:** `idle` (30 px), `link` (46 px + label), `media` (74 px translucent glass ring + light label), `field` (ring hidden so the native caret owns text fields).
- **Magnetic CTAs:** `[data-magnetic]` elements translate up to 9 px toward the pointer with a 280 ms ease-out. Applied only to the Home primary CTA.
- **Click feedback:** dot grows and ring contracts on press (CSS state driven by `mousedown`/`mouseup`).
- **Contextual imagery:** image frames expose `data-cursor` labels such as “RIVR”; the large ring communicates that the photograph is part of the interaction.
- **Safety:** native cursor remains visible; disabled on coarse pointers, reduced motion, and all staff workspace routes; pointer events none; text selection and inputs unaffected; keyboard focus styles untouched.

**Verified:** `link` mode with label “Explore” on the CTA, `translate: 6.47px -0.93px` magnetic pull, `field` mode with ring opacity 0, and a visible ring in `cursor-check.jpg`.

---

## 9. Files modified

| File | Change |
| --- | --- |
| `src/index.css` | Design tokens v2, visible atmosphere, cinematic overlays, route/pending styles, admin glass token scope, cursor v2 states, reduced-motion rules |
| `src/components/hotel/Cinematic.tsx` | Added light-beam layers to `PageAtmosphere`; band image treatment |
| `src/components/hotel/PageHero.tsx` | Reworked entrance, continuous drift, sweep, parallax wrapper, `clearProps`, optional `reverse` composition |
| `src/pages/HomePage.tsx` | Stronger cinematic hero, continuous drift, sweep, magnetic CTA, terminal text state |
| `src/pages/AboutPage.tsx` | Reversed hero composition |
| `src/pages/ContactPage.tsx` | Reversed hero composition |
| `src/router.tsx` | Removed blanking transition, added pending UI, hid guest scroll progress in workspaces |
| `src/components/hotel/StaffChrome.tsx` | `admin-shell` scope + atmosphere layer on shell/loading/error states |
| `src/components/motion/CustomCursor.tsx` | Mode system, magnet, press feedback, field handling |
| `src/components/motion/gsap.ts` | ScrollTrigger refresh on load/fonts, listener cleanup |

**New verification tooling (not app runtime):**

- `apps/api/scripts/visual-audit.mjs` — baseline route capture
- `apps/api/scripts/visual-experiments.mjs` — prototype screenshots
- `apps/api/scripts/visual-verify.mjs` — motion/transition/cursor/responsive verification
- `reports/visual-experiments/*.html` — three isolated prototypes
- `reports/screenshots/premium-{audit,experiments,final}/` — evidence

---

## 10. Dependencies

**No packages were installed.** Used only what was already present:

| Dependency | Version | Use |
| --- | --- | --- |
| `gsap` | 3.15.1 | Hero timelines, clip reveals, drift, parallax, sweep |
| `gsap/ScrollTrigger` | 3.15.1 | Scroll-linked drift, already installed |
| `motion` (`motion/react`) | 12.43.0 | Cursor springs, `Reveal`, route fade controls |
| `lucide-react` | 0.577.0 | Existing icons |
| Playwright (`@playwright/test`) | 1.65.0 | Verification only (already a dev dependency of `@rivr/api`) |

No new animation library, 3D library, or CSS framework was added.

---

## 11. Build and typecheck results

| Check | Result | Detail |
| --- | --- | --- |
| `pnpm build` (`tsc -b && vite build`) | **PASS** | 2,359 modules, built in 1.31 s, exit 0 |
| `pnpm typecheck:api` | **PASS** | exit 0 |
| CSS output | 112.33 kB / 19.39 kB gzip | +11.3 kB raw / +2.0 kB gzip vs the build recorded in the previous report |
| Main JS output | 443.73 kB / 143.46 kB gzip | +2.3 kB raw / +0.7 kB gzip |
| Frontend unit tests | **NOT RUN** | no frontend test suite is configured |
| API integration tests | **NOT RUN** | no backend files changed; DB suite intentionally not exercised |

---

## 12. Routes actually tested

Browser runs: 9 desktop routes, 4 tablet, 4 mobile, 3 reduced-motion = **20 captures**.

| Route | Desktop | Tablet | Mobile | Reduced motion |
| --- | --- | --- | --- | --- |
| `/` | ✓ | ✓ | ✓ | ✓ |
| `/stay` | ✓ | — | — | — |
| `/rooms` | ✓ | ✓ | ✓ | — |
| `/amenities` | ✓ | — | — | — |
| `/about` | ✓ | — | — | — |
| `/contact` | ✓ | ✓ | ✓ | ✓ |
| `/booking` | ✓ | — | — | — |
| `/login` | ✓ | — | — | — |
| `/admin/dashboard` (super-admin) | ✓ | ✓ | ✓ | ✓ |

Additional checks: Home → Rooms client-side navigation, Home dark theme, Contact dark theme, cursor idle/link/field/magnetic states.

---

## 13. Browser console results

- **0 console errors** and **0 page errors** across all 20 captures.
- Auth for the admin route returned `200`.
- The earlier baseline also reported no console/page errors.
- Playwright `pageerror` and console `error` channels were both monitored on every route.

---

## 14. Responsive verification

| Viewport | Result |
| --- | --- |
| 1440×900 desktop | No horizontal overflow; hero copy/image split intact; all hero lines fully visible; admin 4-column KPIs readable |
| 1024×768 tablet | No overflow; hero stacks correctly; search overlay remains usable |
| 390×844 mobile | No overflow; copy-first hero; image below copy; admin cards readable; cursor disabled by design |

Measured: `scrollWidth === innerWidth` on every captured route/viewport. Hero-line audit found **0 lines** with opacity < 0.99 or a collapsed height.

---

## 15. Final screenshots

**Public desktop:** `final-home-desktop.jpg`, `final-stay-desktop.jpg`, `final-rooms-desktop.jpg`, `final-amenities-desktop.jpg`, `final-about-desktop.jpg`, `final-contact-desktop.jpg`, `final-booking-desktop.jpg`, `final-login-desktop.jpg`

**Admin:** `final-admin-dashboard-desktop.jpg`, `final-admin-dashboard-tablet.jpg`, `final-admin-dashboard-mobile.jpg`

**Responsive:** `final-home-mobile.jpg`, `final-rooms-mobile.jpg`, `final-contact-mobile.jpg`, `final-home-tablet.jpg`, `final-rooms-tablet.jpg`, `final-contact-tablet.jpg`

**Theme:** `final-home-dark.jpg`, `final-contact-dark.jpg`

**Motion / cursor evidence:** `cursor-check.jpg`, `verify.json`

**Before:** `reports/screenshots/premium-audit/before-*.png`

**Direction experiments:** `reports/screenshots/premium-experiments/direction-*.jpg`

Full-page captures also exist as `*-full.jpg`; they may show lazy images as placeholders until decoded, so viewport captures are the authoritative visual result.

---

## 16. Measured motion evidence

| Check | Early sample | Mid / drift | Settled |
| --- | --- | --- | --- |
| Home hero image scale | `1.1547` at ~180 ms | `1.0401` at ~2.6 s → `1.0427` at ~5.2 s | `1.0427` |
| Hero headline opacity | `0.177` | — | `1` |
| Route transition (Home → Rooms) | wrapper opacity `0.9974`, heading already present, 3,486 chars, no pending flash at 120 ms | — | `1` |
| Cursor | link mode, label “Explore”, `translate: 6.47px -0.93px` | — | field mode ring opacity `0` |

The continuing scale change between 2.6 s and 5.2 s proves the drift loop is running after the entrance completes, rather than only existing in source.

---

## 17. Status

### Implemented and verified

- Visible layered public atmosphere with beams, orbs, lines, grain.
- Hero entrance + **continuous** image drift + light sweep + desktop parallax.
- Contact/About headings complete at every tested viewport and reduced motion.
- No blank/white route transition; pending UI for lazy chunks.
- Midnight glass admin shell, panels, KPIs, tables, forms, charts, fallbacks.
- Cursor modes, magnetic CTA, field hand-off, visibility.
- Dark public theme remains readable; mobile/tablet have no overflow.
- `pnpm build`, `pnpm typecheck:api`.

### Implemented but not visually verified

- Cursor **click pulse** (state wiring is in place; not captured mid-press).
- Magnetic effect on any CTA beyond the Home primary (none added by design).
- Manager / reception / housekeeping / accountant / restaurant / staff dashboards individually (they share the verified `AdminLayout` and `AdminPageShell`, but were not captured per role).
- Authenticated `/book/$roomId` form (signed-out access redirects; shared shell inherits the system).

### Not implemented (intentional)

- No gallery/lightbox route (none exists; the brief forbids inventing routes).
- No new motion or 3D dependency.
- No redesign of header/footer.
- No backend, schema, auth, permission, booking, payment or data changes.

---

## 18. Remaining limitations

1. **Remote photography.** All imagery is the existing Unsplash set (verified loading in the browser). A local AVIF/WebP pipeline with `srcset` is the next production step.
2. **No formal accessibility audit.** Contrast, keyboard focus, reduced motion and overflow were checked manually/programmatically; no axe or Lighthouse run.
3. **Animation is verified by computed styles, not video.** No FPS trace was recorded; transforms/opacity are compositor-friendly and no layout-animating tweens were added.
4. **Admin is fixed to midnight glass.** The public theme toggle works, but the workspace intentionally keeps its dark glass identity; that is a deliberate product decision, not a bug.
5. **Other role dashboards share the shell** but were not screenshot-audited individually.
6. **Full-page screenshot caveat.** Off-screen lazy images can appear blank until decoded; the verification script forces decode before measuring, and viewport shots are provided as the definitive record.
7. **Contrast on photography** relies on scrims; the hero captions are intentionally low-emphasis and hidden below `md`.

---

## 19. Scope confirmation

- **Header/footer:** `src/components/hotel/PublicChrome.tsx` — empty git diff, unchanged.
- **Backend / DB / migrations / tests:** `git status` shows no changes under `apps/api/src`, `apps/api/drizzle` or `apps/api/tests`.
- **Auth, permissions, reservation logic, payments:** untouched.
- **Destructive scripts:** none run.
- **Git:** no commits or pushes were made.
