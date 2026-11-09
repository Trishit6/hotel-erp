# RIVR — Global Input Focus Outline Fix

Date: 9 November 2026  
Scope: global visual focus treatment only. No authentication, validation, state, API, schema or routing changes.

## Summary

The unwanted square gold outline was **not** a browser default and **not** a Tailwind ring utility. It came from the project-wide rule in `src/index.css`:

```css
:focus-visible {
  outline: 2px solid var(--accent-strong);
  outline-offset: 3px;
}
```

That rule painted a 2 px gold outline directly on form controls. The inner `<input>` inside composite fields has `border-radius: 0`, so the outline was rectangular, and its 3 px offset placed it inside the rounded wrapper that already had a border. Removing the input's own outline and moving the focus treatment to the visible rounded shell fixes it globally.

## 1. Root cause

### Evidence from the running app (before)

On `/login`, clicking the email field produced:

| Property | Input | Parent shell |
|---|---|---|
| `outline` | `2px solid rgb(143, 108, 52)` (`--accent-strong`) | none |
| `outline-offset` | `3px` | — |
| `border-radius` | `0px` | `12px` |
| `border` | `0px` | `1px solid rgba(89, 97, 110, 0.26)` |
| `box-shadow` | none | none |

The password field had the same square input outline **and** the wrapper was simultaneously drawing `focus-within:border-[var(--accent)]` plus `focus-within:ring-4`, which is why it looked like two overlapping borders.

### Why `outline-none` on the inputs did not win

The inputs already used Tailwind's `outline-none`, but the global `:focus-visible` rule is unlayered and comes after Tailwind's utility layer in the stylesheet. It therefore won the cascade on focused text fields. The result was:

1. Rounded wrapper draws its border.
2. Transparent, square inner input draws a second rectangular gold outline inset by 3 px.
3. On fields with a `focus-within` ring, a third focus layer is added outside.

This is one root cause reproduced across all forms, not separate bugs per page.

## 2. Global fix

Only one source file changed: `src/index.css` (+49 / −6).

### 2.1 Square control outline removed

```css
:where(
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]),
  select,
  textarea
):focus-visible {
  outline: none;
}
```

Checkboxes, radios, ranges, file and colour inputs were deliberately excluded so they keep the global accessible outline.

### 2.2 One champagne treatment for bordered fields

```css
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]):not(.bg-transparent):focus,
select:not(.bg-transparent):focus,
textarea:not(.bg-transparent):focus {
  border-color: var(--accent-strong);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
```

The existing rounded border becomes champagne-gold and gains a soft 3 px halo. `box-shadow` does not affect layout, so there is no width/height jump.

### 2.3 Transparent inputs focus their rounded shell once

```css
:where(label, span, form, div)[class*="rounded"]:has(
  > input.bg-transparent:not([type="checkbox"]):not([type="radio"]):focus,
  > select.bg-transparent:focus
) {
  border-color: var(--accent-strong);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
```

This covers auth email/password, booking contact fields, My Bookings lookup, the staff header search and admin search fields without touching each page. The `[class*="rounded"]` guard prevents a shadow being drawn around an unrounded inner layout span.

### 2.4 Shared availability widget

The widget nests its date/count fields inside a rounded `<label>` rather than a bordered `<span>`, so it gets an inset 1 px champagne outline:

```css
form[aria-label="Search room availability"] label:focus-within {
  outline: 1px solid var(--accent-strong);
  outline-offset: -1px;
}
```

### 2.5 Admin overrides aligned

The `.admin-main` base and focus selectors now exclude `.bg-transparent`, so admin search fields are not given a second bordered field inside their rounded container. Bordered admin fields keep the same gold border/halo as the rest of the app.

### 2.6 Older-browser fallback

```css
@supports not selector(:has(*)) {
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }
}
```

Browsers without `:has()` regain a visible (square) outline instead of losing focus indication.

## 3. Accessibility behaviour

- **Mouse / touch:** every text field shows one rounded gold border and soft halo on focus; no square inner outline.
- **Keyboard Tab / Shift+Tab:** tested through login, register, contact and the booking widget. Every focusable text field, select, textarea and link/button had a visible indicator. Tab order was email → password → Show password; Shift+Tab returned to password.
- **Buttons and links:** keep the original `:focus-visible` outline (`2px solid var(--accent-strong)`, offset 3 px).
- **Checkboxes / radios / range / file / colour:** keep the outline; register's terms checkbox measured `outline: solid 2px rgb(143, 108, 52)` on keyboard focus.
- **Password visibility:** unchanged. It still toggles to `Hide password`, and the toggle button keeps its outline on keyboard focus.
- **No contrast change** to text, placeholder or background colours; only border, outline and a transparent halo.
- **No layout shift:** all focus styling uses border colour and `box-shadow`; no padding, border width, width or height changes.

## 4. Testing results

Browser: Chromium via Playwright 1.65, desktop 1280/1440 and mobile 390 px. Database-backed pages used the existing demo accounts (`admin@admin.com`, `aarav.nair5@example.com`, password `password`); no data was submitted or changed.

| Test | Before | After | Result |
|---|---|---|---|
| Login email | Square 2 px gold outline inside 12 px shell | One gold rounded border + 3 px halo | Pass |
| Login password | Square outline inside shell + outer `focus-within` ring | One rounded border + halo; outer ring unified | Pass |
| Wrong/empty validation state | Square outline on error | Same single rounded treatment; inline errors still render | Pass |
| Password show/hide | Toggle worked | Toggle still works; label changes; keyboard outline on button | Pass |
| Register (6 fields + terms) | Square on all text fields | Single rounded treatment; checkbox keeps 2 px outline | Pass |
| Forgot password (1 field) | Square on focus | Single rounded treatment | Pass |
| Reset password (2 fields) | Square on focus | Single rounded treatment | Pass |
| Contact (name/email/phone/select/textarea) | Square on focus | Gold border + halo on all five; click-outside clears it | Pass |
| Availability widget (2 dates + 3 selects) | Square outline inside widget | Inset 1 px rounded gold outline on the label | Pass |
| My Bookings lookup (2 fields) | Square outline | Gold rounded border + halo | Pass |
| Customer booking form (8 fields) | Square outline | Gold rounded border/halo; read-only fields unchanged | Pass |
| Admin reservations search | Inner field outline | Single wrapper gold border + halo | Pass |
| Admin reservations status select | Square/native outline | Rounded gold border + halo | Pass |
| Admin guests / settings / rooms / staff / inventory / restaurant etc. | Global outline on focus | No square text-control outlines | Pass |
| Keyboard Tab / Shift+Tab | Global outline | Visible indicator on every control; buttons keep outline | Pass |
| Checkbox keyboard focus | Outline | Outline retained | Pass |
| Mobile login (390 px) | Square outline | Rounded treatment fits, no horizontal overflow | Pass |
| Dark theme (admin) | — | Gold border/halo visible against dark surfaces | Pass |
| Browser console | — | No page exceptions; no unexpected console errors | Pass |

### Field coverage

- Public audit: `/`, `/contact`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/booking/lookup` — **23 field instances, 0 without a visible focus indicator, 0 square text-control outlines.**
- Admin audit: **15 route loads** (dashboard, reservations, rooms, guests, front desk, housekeeping, staff, payments, expenses, inventory, restaurant, reports, activity logs, settings, reservations `?q=`) — **664 field instances**, including repeated header search and table inline selects: **0 without an indicator, 0 square text-control outlines.**
- Customer booking form: **8 fields**, all pass.
- Guest dashboard: loaded successfully; **0 inputs** to test.
- Build gate: `pnpm build` **PASS** (2.32 s, 444.39 kB JS / 143.75 kB gzip).

## 5. Screenshots

All in `reports/screenshots/`.

### Before (original rule restored for a controlled close-up)

- `input-focus-before-login-closeup.jpg` — square inner gold rectangle clearly visible.
- `input-focus-before-password-closeup.jpg` — square outline plus outer rounded ring.
- `input-focus-before-login.png` / `input-focus-before-password.png` — full-page originals.

### After

- `input-focus-after-login.jpg` — email, one rounded border + halo.
- `input-focus-after-password-closeup.jpg` — password, one treatment.
- `input-focus-after-contact.jpg` — bordered contact input.
- `input-focus-after-contact-textarea.jpg` — textarea.
- `input-focus-after-booking-search.jpg` — availability widget date field.
- `input-focus-after-lookup.jpg` — booking lookup.
- `input-focus-after-register.jpg` — registration email.
- `input-focus-after-booking-form.jpg` — customer booking form.
- `input-focus-after-admin-reservations-search.jpg` — admin search wrapper.
- `input-focus-after-admin-reservations-select.jpg` — admin select.
- `input-focus-after-admin-guests-search.jpg`, `input-focus-after-admin-settings.jpg` — dark admin fields.
- `input-focus-after-mobile-login.jpg` — 390 px mobile login.
- `input-focus-after-login-error.jpg` — validation error state.

## 6. Not tested / remaining issues

- **Admin “New reservation” modal was not visually verified.** Automation clicked the button but no dialog opened in that session; the customer booking form and all admin list/search/filter fields were tested instead.
- **Disabled text inputs were not exercised** — the tested views had no focusable disabled text field. Disabled styling was not changed by this fix.
- **Chromium only.** Firefox and Safari were not run. The `:has()` rule requires Chrome 105+, Safari 15.4+ or Firefox 121+; the `@supports` fallback keeps a visible outline on older engines.
- **Mobile was verified on login only** (390 px, no overflow). Contact, booking and admin forms were tested at desktop widths.
- **Screen-reader and touch-specific behaviour** were not tested beyond standard focus semantics.
- On `/admin/guests`, the search input still sits inside its pre-existing bordered filter container, so a thin outer container border remains around the focused field. It is no longer a square or double gold outline; the focused field itself has one rounded halo.
- The focus border colour is intentionally standardised to champagne gold, so fields that previously used a sage focus border now use gold. No other colour token changed.
- No commits or pushes were made.
