# RIVR Hotel & Residences — Cinematic Visual Enhancement Report

**Date:** 9 November 2026  
**Scope:** Public-facing website visual atmosphere, hero photography, image motion, and section transitions  
**Status:** Implemented and verified against the running frontend with seeded demo data  
**Design language:** Deep charcoal / midnight, warm ivory, champagne gold, sage and bronze accents

---

## 1. Public pages inspected

| Route | Layout / current visual structure | What was verified |
| --- | --- | --- |
| `/` | Custom GSAP hero, booking search, welcome editorial, featured rooms, experience image pair, new full-bleed cinematic band, amenities, offers, guest notes, contact strip | Desktop, tablet, mobile, dark theme, reduced motion |
| `/stay` | `PageHero` + overlapping booking search, room collection, editorial image pair, feature grid, dark CTA | Desktop, tablet, mobile, reduced motion |
| `/rooms` | `PageHero` + overlapping search, room collection, live inventory strip | Desktop, tablet, mobile, dark theme, reduced motion |
| `/amenities` | `PageHero`, amenity grid, dining/wellness image pair, “good to know” panel | Desktop, tablet, mobile, reduced motion |
| `/about` | `PageHero`, story copy + image pair, values, “find us” + pool image | Desktop, tablet, mobile, reduced motion |
| `/contact` | `PageHero`, enquiry form, booking strip | Desktop, tablet, mobile, reduced motion |
| `/search` | Shared `AvailabilityResults` shell and room cards | Route smoke, desktop |
| `/booking` | Booking entry / availability shell | Desktop, tablet, mobile, reduced motion |
| `/book/$roomId` | Auth-gated booking form; redirects signed-out visitors to `/login` | Redirect and loading states verified; authenticated form **not visually captured** |
| `/booking/success` | Confirmation shell / empty state | Desktop |
| `/booking/lookup`, `/my-bookings` | Reservation lookup and account bookings | Desktop |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Shared `AuthShell` split layout with its own header and no site footer | Desktop route smoke; `/login` visually inspected |
| `/guest/dashboard` | Customer account dashboard | Intentionally left unchanged |
| `/admin`, `/manager`, `/reception`, `/housekeeping`, `/staff` dashboards | Internal ERP workspace | Intentionally left unchanged |

All public pages checked render `PublicHeader` / `PublicFooter` except the auth shell (which has its own header and no site footer) and transient booking loading states.

---

## 2. Original visual issues identified

- The site already had a strong editorial layout and a premium colour palette, but most pages sat on flat opaque canvas surfaces. There was no shared atmospheric layer.
- `PageHero` had a good split composition, but no ambient lighting, architectural line detail, image caption, or scroll cue. The image only had a modest drift.
- Secondary photography on Stay, Amenities and About was still a plain `<img>` with no scroll reveal or parallax.
- Home had no full-bleed photographic transition between major editorial sections.
- Section boundaries relied mostly on alternating solid colours and borders; the pages lacked a connected visual rhythm.
- Some image hover zooms were applied to images that GSAP also transformed. GSAP’s inline transform won, so hover zoom was effectively disabled on parallax images.
- Public booking, lookup and auth surfaces had no atmospheric treatment, and the dark theme had no page-level warmth or depth.
- There was no reusable background system; adding ambience page-by-page would have duplicated styles and hurt consistency.
- Photography is remote Unsplash content. Every URL used was checked and returned `200`; no new unverified or unlicensed image source was introduced.

---

## 3. Background design improvements

### Shared public atmosphere

Added a reusable `PageAtmosphere` component (`src/components/hotel/Cinematic.tsx`) mounted only by public pages. It provides:

1. A base colour wash with champagne and sage radial light.
2. Two very large, soft ambient orbs that drift using **transform only**. No `filter: blur()` and no animated gradient repaint.
3. Fine architectural arcs and circles as an inline SVG, masked to the centre of the viewport.
4. A restrained grain layer.
5. A vignette that keeps the centre of the page clear.

The dark theme has its own darker base while keeping the same champagne/sage light logic. The atmosphere is hidden in print and its orb animation is disabled under `prefers-reduced-motion: reduce`.

### Section-level wash

Added `.section-atmosphere`, a reusable pseudo-element that places a low-opacity champagne/sage wash **above a section’s background but below its content**. It is applied to the main editorial sections on Home, Stay, Rooms, Amenities, About and Contact. This means the flat surfaces now catch a little room light without reducing text contrast.

### Hero depth

`PageHero` and the Home hero now share `.hero-ambient` and `.hero-lines` layers:

- Gold ambient light behind the copy.
- Sage ambient light at the opposite corner.
- Very faint vertical architectural lines, masked toward the top.
- Stronger image scrims for readable white captions.
- A champagne corner detail on the image side.

### Section rhythm

- Added `SectionDivider`, a fine champagne rule with a small diamond.
- Added `CinematicBand`, a full-bleed photographic band with a dark left-to-right scrim and a thin champagne bottom rule.
- Kept alternating light surfaces and one dark band rather than making every section dark.

The background work is intentionally restrained: it creates depth behind the content rather than becoming the content.

---

## 4. Hero section improvements

### `PageHero` (Stay, Rooms, Amenities, About, Contact)

- GSAP clip-path image reveal plus a slow scale settle.
- Staggered eyebrow, headline-line, intro and CTA reveals.
- Desktop-only scroll-linked image drift.
- New ambient gold/sage lighting and architectural line detail.
- Stronger gradient scrims so the image caption and top badge stay readable.
- New image caption: “A considered arrival.” with the RIVR year mark.
- New “Scroll to discover” cue with a travelling champagne line, hidden below `lg` and disabled for reduced motion.
- Mobile layout keeps the copy first and the image below, with the image caption hidden below `md`.

### Home hero

- Kept the existing approved hero composition and GSAP timeline.
- Added the shared ambient and architectural line layers.
- Added a deeper, softer hero shadow to separate the card from the page atmosphere.
- Preserved the existing image reveal, headline mask, CTA stagger and trust line.
- Scroll parallax is now desktop-only.

### Photography

The existing verified hotel photography is retained and used first. No unlicensed asset was introduced. Hero/editorial URLs were requested at appropriate widths (`w=1000–1600`) rather than the original file sizes. The new full-bleed home band uses a `w=1600&q=80` request to keep the payload reasonable.

Attribution: photography is served from Unsplash image URLs already used by the project.

---

## 5. Image animation changes by page

| Page | Image treatment |
| --- | --- |
| **Home** | Hero image: GSAP clip reveal + scale settle, desktop parallax. Welcome image and experience pair: `GsapImage` reveal + desktop drift. Offers: full-bleed background images with frame hover zoom. Room cards: Motion reveal from `Reveal`, card lift and CSS image zoom. New cinematic band: scroll-linked image drift with dark scrim. |
| **Stay** | Both editorial images converted to `GsapImage`: clip-path reveal, desktop parallax, and a subtle frame hover zoom. Room cards retain their existing reveal and hover lift. |
| **Rooms** | Room cards are revealed by `Reveal` with a subtle card lift and image zoom on hover. Hero image uses the `PageHero` treatment. |
| **Amenities** | Dining and pool image pair converted to `GsapImage` with reveal, desktop parallax and frame hover zoom. Hero uses `PageHero`. |
| **About** | Bedroom/dining pair and pool image converted to `GsapImage` with reveal, desktop parallax and frame hover zoom. Hero uses `PageHero`. |
| **Contact** | Hero uses `PageHero`; the form and booking strip sit on the atmospheric page and section wash. |
| **Search / Booking entry** | Room cards use the existing reveal and hover treatment; page gets the public atmosphere and a soft heading glow. |
| **Auth pages** | Split image already used `GsapImage`; the whole `AuthShell` now sits on the public atmosphere. |
| **Gallery** | No gallery route or lightbox exists in the current application. No unrelated gallery feature was added. |

**Hover conflict fixed:** Image hover zoom now scales the `GsapImage` frame rather than the `<img>`. GSAP owns the image’s transform for parallax; the frame owns the hover scale. This prevents the two from fighting over the same property.

---

## 6. GSAP and Framer Motion usage

**Installed versions:** `gsap ^3.15.1`, `motion ^12.43.0`, React 19.2.0, Vite 8.

### GSAP owns cinematic and scroll work

- Home hero entrance timeline: headline masks, CTA stagger, image clip reveal and scale.
- `PageHero` entrance timeline: eyebrow, headline lines, intro, CTA, image reveal and scale.
- `GsapImage`: clip-path reveal and scroll-linked image drift.
- Desktop-only parallax using `window.matchMedia("(min-width: 1024px)")` or `768px` where appropriate.
- `ScrollTrigger` registered once; animations run inside `gsap.context()` and are reverted on unmount or dependency change.
- `useGsap` skips setup entirely when reduced motion is requested.

### Framer Motion owns component interaction

- `Reveal`: scroll-triggered opacity/translate entrance with `once: true`.
- `RoomCard` / `RoomTypeCard`: hover lift.
- `CustomCursor`: spring-driven follower.
- `ScrollProgress`: spring progress line on guest pages only.
- `AnimatedNumber`: value-change animation.

### Separation rule

No element is controlled by both libraries for the same property. GSAP handles image transforms; Motion handles parent/card entrance and hover lifts; CSS handles frame hover scale.

No new animation dependency was added.

---

## 7. Cursor interaction changes

The existing `CustomCursor` was inspected and retained. It already meets the brief:

- Desktop/pointer-fine only.
- Native cursor remains visible and fully functional.
- Disabled on coarse pointers and when reduced motion is requested.
- Disabled on the dense staff workspace routes.
- Movement is spring-smoothed, lightweight, and labels interactive elements only.
- It does not interfere with clicking, text selection, or keyboard navigation.

No change was required. The mobile verification confirmed the cursor is not rendered (`cursor: false` in the mobile route checks).

---

## 8. Responsive and accessibility improvements

- **No horizontal overflow** at 1440, 768 and 390 px. `scrollWidth === innerWidth` on every verified route.
- Hero headline uses fluid `clamp()` sizing; mobile hero stacks copy above the image.
- Image caption hidden below `md`; scroll cue hidden below `lg`.
- Scroll-linked parallax is disabled below `768px`; phones keep the reveal only.
- Decorative layers use `aria-hidden` and `pointer-events: none`.
- All meaningful images have descriptive alt text.
- New CTA links are real links and remain keyboard-focusable.
- `prefers-reduced-motion: reduce`: GSAP setup is skipped, Motion initial states are skipped, atmospheric orb animation and the scroll cue animation are disabled.
- Fixed-height image frames prevent layout shift while remote images load.
- Text contrast was checked in light and dark themes via computed colours and screenshots. The cinematic band uses a dark scrim behind white copy; the section washes are low-opacity and sit below content.
- No focus traps, scroll hijacking, or custom scroll behaviour were introduced.

A formal axe/Lighthouse accessibility audit was not run; this was a manual contrast, keyboard and reduced-motion review.

---

## 9. Performance considerations

- No new runtime dependency.
- The atmosphere uses CSS gradients, one inline SVG, and two transform-only orbs. No full-screen blur filters and no continuously repainting gradient background.
- Section washes are static pseudo-elements.
- Hero images are eager/high priority; below-the-fold images remain lazy.
- Unsplash `auto=format` is retained, and requested widths are capped at `w=1000–1600` rather than original sizes.
- Desktop-only parallax avoids extra scroll work on phones.
- GSAP contexts and `ScrollTrigger` instances are cleaned up on unmount; `useGsap` also debounces a `ScrollTrigger.refresh()` after setup.
- Existing code-splitting is preserved. The production build emitted route chunks and a shared `HotelUi` chunk as before.
- The new CSS adds roughly 2.4 kB gzip to the stylesheet. The new component is small and imports only the existing `GsapImage`.

---

## 10. Exact files modified and why

| File | Change |
| --- | --- |
| `src/components/hotel/Cinematic.tsx` | **New.** `PageAtmosphere`, `SectionDivider`, `CinematicBand`. |
| `src/index.css` | Atmosphere layers, hero light/line layers, section wash, divider, cinematic band, scroll-cue animation, reduced-motion and print rules. |
| `src/components/hotel/PageHero.tsx` | Ambient/line layers, stronger scrims, image caption, scroll cue, desktop-only parallax, shadow. |
| `src/components/motion/GsapImage.tsx` | Parallax limited to `min-width: 768px`. |
| `src/components/hotel/HotelUi.tsx` | Added `loading="lazy"` and `decoding="async"` to `RoomVisual`; no visual/layout change. |
| `src/components/hotel/AvailabilityResults.tsx` | Public atmosphere, relative main, soft heading glow. |
| `src/pages/HomePage.tsx` | Public atmosphere, hero ambient/lines, section washes, dividers, cinematic band, verified hover treatment, optimized band image. |
| `src/pages/StayPage.tsx` | Public atmosphere, `GsapImage` editorial images, divider, section washes. |
| `src/pages/RoomsPage.tsx` | Public atmosphere, divider, section washes. |
| `src/pages/AmenitiesPage.tsx` | Public atmosphere, `GsapImage` image pair, divider, section washes. |
| `src/pages/AboutPage.tsx` | Public atmosphere, `GsapImage` image pair and pool image, divider, section washes. |
| `src/pages/ContactPage.tsx` | Public atmosphere, divider, section washes. |
| `src/pages/BookingPage.tsx` | Public atmosphere + relative main on the booking form shell. |
| `src/pages/BookingSuccessPage.tsx` | Public atmosphere on confirmation and empty states. |
| `src/pages/MyBookingsPage.tsx` | Public atmosphere on the guest booking lookup. |
| `src/pages/AuthPages.tsx` | Public atmosphere on the shared `AuthShell`. |

**Deliberately not modified:** `src/components/hotel/PublicChrome.tsx` (approved header/footer), `src/components/hotel/StaffChrome.tsx`, `src/pages/AdminPages.tsx`, `src/pages/RoleDashboards.tsx`, `src/pages/GuestDashboardPage.tsx`, and all `apps/api` backend code.

**Note on the working tree:** the repository already contained unrelated uncommitted changes from a previous customer-auth task (for example `src/lib/hotel-store.tsx`, `src/router.tsx`, parts of `BookingPage`, `MyBookingsPage`, `AuthPages`, and several `apps/api` files). Those were left untouched by this visual task.

---

## 11. Actual test/build results

| Check | Result | Detail |
| --- | --- | --- |
| `pnpm exec tsc -b` | **PASS** | No TypeScript errors. |
| `pnpm build` | **PASS** | `tsc -b && vite build`; 2,359 modules transformed; built in 10.84 s. CSS 101.02 kB (17.35 kB gzip); main JS 441.39 kB (142.77 kB gzip). |
| `pnpm typecheck:api` | **PASS** | No API TypeScript errors. |
| Playwright public-route smoke | **PASS** | 9 desktop routes, 6 tablet routes, 6 mobile routes. No page errors. No horizontal overflow. Atmosphere/header/footer present as expected. |
| Image loading check | **PASS** | Every `<img>` used on the verified public pages reported `complete` and `naturalWidth > 0`. All unique Unsplash URLs returned HTTP 200. |
| Dark theme | **PASS** | Home, Rooms and Contact checked at 1440×900; atmosphere, section wash, hero and band all render with readable contrast. |
| Reduced motion | **PASS** | Pages render fully with GSAP disabled, Motion initial states skipped, and CSS ambience static. |
| Expected console noise | **PASS (expected)** | Only signed-out `401` responses from `/auth/me`; no React/runtime errors. |
| Frontend unit tests | **NOT TESTED** | No frontend test suite is configured in this repository. |
| API integration tests | **NOT TESTED** | No backend/API changes were made by this task; the DB-backed API suite was not run. |
| Authenticated `/book/$roomId` form | **NOT TESTED (visual)** | Signed-out access correctly redirects to `/login`; the authenticated form was not captured. Its shared shell and atmosphere mount were code-verified. |

A pre-change production build artifact was not recorded; the final build above is the authoritative result.

---

## 12. Before-and-after screenshots

**Before (prior accepted UI/UX state):**

- `reports/screenshots/home-preview.jpg`
- `reports/screenshots/home-mobile.png`
- `reports/screenshots/home-dark-preview.jpg`
- `reports/screenshots/rooms-desktop.png`
- `reports/screenshots/rooms-mobile.png`
- `reports/screenshots/login-desktop.jpg`
- `reports/screenshots/booking-desktop.png`
- `reports/screenshots/my-bookings-desktop.png`

**After (this task, reduced motion so all content is visible):**

- `reports/screenshots/cinematic-final/home-desktop.png`
- `reports/screenshots/cinematic-final/home-fold.png`
- `reports/screenshots/cinematic-final/home-band.png`
- `reports/screenshots/cinematic-final/stay-desktop.png`
- `reports/screenshots/cinematic-final/rooms-desktop.png`
- `reports/screenshots/cinematic-final/rooms-lower-viewport.png`
- `reports/screenshots/cinematic-final/amenities-desktop.png`
- `reports/screenshots/cinematic-final/about-desktop.png`
- `reports/screenshots/cinematic-final/contact-desktop.png`
- `reports/screenshots/cinematic-final/booking-desktop.png`
- `reports/screenshots/cinematic-final/my-bookings-desktop.png`
- `reports/screenshots/cinematic-final/login-fold.png`
- `reports/screenshots/cinematic-final/home-mobile.png`
- `reports/screenshots/cinematic-final/stay-mobile.png`
- `reports/screenshots/cinematic-final/rooms-mobile.png`
- `reports/screenshots/cinematic-final/amenities-mobile.png`
- `reports/screenshots/cinematic-final/about-mobile.png`
- `reports/screenshots/cinematic-final/contact-mobile.png`
- `reports/screenshots/cinematic-final/home-dark.png`
- `reports/screenshots/cinematic-final/rooms-dark-fold.png`

**Verification evidence:**

- `reports/screenshots/cinematic-final/verify-desktop.json`
- `reports/screenshots/cinematic-final/verify-tablet.json`
- `reports/screenshots/cinematic-final/verify-mobile.json`

Full-page captures can show off-screen lazy images as placeholders until the browser decodes them. The verification script forced decode and confirmed every image loaded; viewport captures (`rooms-lower-viewport.png`, `home-band.png`) show the painted result.

---

## 13. Confirmation that the header and footer were preserved

**PASS.**

- `src/components/hotel/PublicChrome.tsx` was not modified.
- `git diff` for `PublicChrome.tsx`, `StaffChrome.tsx`, `AdminPages.tsx` and `RoleDashboards.tsx` is empty.
- The approved navigation, header actions, mobile menu, footer columns and footer legal copy remain unchanged.
- The new atmospheric layers are behind the header/footer; they do not alter their layout or interaction.
- The `PageHero` changes are scoped to the page opener content below the header, not to the header itself.
- Auth pages keep their existing separate header; only the page atmosphere was added behind it.

---

## 14. Confirmation that backend, authentication, bookings, APIs and database were not changed

**PASS for this task.**

- No files under `apps/api` were edited by this task.
- No database schema, migration, seed, permission matrix, reservation service, pricing, payment status, or API response format was changed.
- No new dependency was introduced.
- No authentication or registration logic was changed. The only auth-page edit is the visual `PageAtmosphere` mount in `AuthPages.tsx`.
- The booking pages received only a background layer; booking calculations, availability, and submission logic were not touched.
- `pnpm typecheck:api` passes.

**Important working-tree note:** the repository already had unrelated uncommitted backend and customer-auth changes before this task began. They remain in place and were not modified by this work.

---

## 15. Remaining issues

1. **Remote photography dependency.** All used Unsplash URLs are valid (HTTP 200), but the site still depends on remote image delivery. A local, licensed asset pipeline with `srcset`/AVIF derivatives would be the next production step.
2. **Authenticated booking form not visually captured.** `/book/$roomId` correctly redirects signed-out users to `/login`; the signed-in form was not visually inspected. The shared public shell and atmosphere mount are in place.
3. **No gallery/lightbox route exists.** The brief allowed a lightbox only if a gallery already existed or could be added without unrelated scope. Neither was added.
4. **Placeholder property details remain.** The hotel address/phone are pre-existing placeholders and were not changed.
5. **No formal accessibility audit.** Manual contrast, keyboard, reduced-motion and overflow checks passed; no axe/Lighthouse run was performed.
6. **Full-page screenshot caveat.** Off-screen lazy images can appear as placeholders in stitched captures until decoded. Runtime inspection and forced decode confirmed all images load.
7. **Pre-existing unrelated uncommitted work remains.** Backend/customer-auth changes from the prior task are still present in the working tree and were deliberately left untouched.

---

## Status summary

| Area | Status |
| --- | --- |
| Public page inventory | **PASS** |
| Shared background system | **PASS** |
| Hero treatments (Home + `PageHero`) | **PASS** |
| Image animation coverage | **PASS** (auth-gated booking form visual: **NOT TESTED**) |
| GSAP usage and cleanup | **PASS** |
| Framer Motion usage | **PASS** |
| Custom cursor | **PASS** |
| Section transitions | **PASS** |
| Header/footer preservation | **PASS** |
| ERP dashboard preservation | **PASS** |
| Responsive layout / overflow | **PASS** |
| Reduced motion | **PASS** |
| Light and dark contrast | **PASS** |
| Performance approach | **PASS** |
| `pnpm exec tsc -b` | **PASS** |
| `pnpm build` | **PASS** |
| `pnpm typecheck:api` | **PASS** |
| Browser smoke verification | **PASS** |
| API integration tests | **NOT TESTED** |
| Frontend unit tests | **NOT TESTED** (not configured) |
| Formal axe/Lighthouse audit | **NOT TESTED** |

**Overall:** the public site now has a coherent cinematic atmosphere, stronger hero photography, scroll-revealed imagery across the guest pages, a full-bleed photographic transition on Home, and a consistent section rhythm — while the approved header/footer and the internal ERP dashboards remain untouched.
