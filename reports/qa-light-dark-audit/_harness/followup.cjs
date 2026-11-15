/* Follow-up read-only checks: real modal trigger, seeded customer login, solid-bg contrast, 404. */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "../../../apps/api/node_modules/@playwright/test"));
const { BASE, SHOT, DATA, collect } = require("./shared.cjs");

async function login(page, email, password) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  return page.url();
}
async function logout(page) {
  const b = page.locator('button[aria-label="Sign out"]');
  if (await b.count()) { await b.first().click(); await page.waitForTimeout(1800); }
}

(async () => {
  const out = { generatedAt: new Date().toISOString(), modals: [], guest: {}, solidContrast: [], p404: {} };
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();

  out.adminUrl = await login(page, "admin@admin.com", "password");

  // Real dialogs: try likely form triggers until one opens a role=dialog.
  for (const route of ["/admin/staff", "/admin/expenses", "/admin/rooms", "/admin/inventory", "/admin/restaurant"]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const triggers = page.getByRole("button", { name: /add|new|create/i });
    const count = await triggers.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const t = triggers.nth(i);
      if (!(await t.isVisible())) continue;
      const text = (await t.textContent())?.trim().slice(0, 40);
      await t.click().catch(() => {});
      await page.waitForTimeout(700);
      const dialog = page.locator('[role="dialog"]');
      if ((await dialog.count()) > 0) {
        const initial = await page.evaluate(() => {
          const a = document.activeElement;
          return { inDialog: !!a?.closest('[role="dialog"]'), tag: a?.tagName, label: a?.getAttribute("aria-label"), name: (a?.textContent || "").trim().slice(0, 40) };
        });
        let escaped = false, escapedAt = null;
        for (let k = 1; k <= 16; k++) {
          await page.keyboard.press("Tab");
          if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) { escaped = true; escapedAt = k; break; }
        }
        await page.screenshot({ path: path.join(SHOT, "modal-open.png") });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        const openAfterEscape = (await dialog.count()) > 0;
        const afterEscape = await page.evaluate(() => {
          const a = document.activeElement;
          return { tag: a?.tagName, text: (a?.textContent || "").trim().slice(0, 40), inDialog: !!a?.closest('[role="dialog"]') };
        });
        out.modals.push({ route, trigger: text, opened: true, ariaLabel: await dialog.first().getAttribute("aria-label"), initial, tabEscapedDialog: escaped, escapedAt, openAfterEscape, afterEscape });
        if (openAfterEscape) {
          const close = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
          if (await close.count()) await close.click();
        }
        break;
      }
    }
    if (out.modals.length) break;
  }

  // Seeded customer account: demo login emails carry a trailing guest number.
  await page.goto(BASE + "/admin/guests", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const emails = await page.evaluate(() => [...new Set((document.body.innerText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []))].filter((e) => /@example\.com$/i.test(e)));
  out.customerEmailCandidates = emails.slice(0, 8);
  const customer = emails.find((e) => /\d+@example\.com$/i.test(e)) || emails.find((e) => /@example\.com$/i.test(e));
  out.customerEmail = customer || null;
  if (customer) {
    await logout(page);
    out.guest.loginUrl = await login(page, customer, "password");
    out.guest.errorText = await page.evaluate(() => document.querySelector('[role="alert"]')?.textContent?.trim().slice(0, 200) || null);
    out.guest.landedAt = page.url();
    if (page.url().includes("/guest/dashboard")) {
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => localStorage.setItem("rivr-theme", t), theme);
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForTimeout(800);
        out.guest[theme] = await page.evaluate(collect);
        await page.screenshot({ path: path.join(SHOT, `guest-dashboard-real-${theme}.png`) });
      }
    }
  }

  // Solid-background contrast recheck with image/gradient overlays classified separately.
  {
    const routes = ["/", "/stay", "/rooms", "/search?checkIn=2026-11-20&checkOut=2026-11-22&adults=2&children=0&rooms=1", "/booking?checkIn=2026-11-20&checkOut=2026-11-22&adults=2&children=0&rooms=1", "/contact", "/login", "/booking/lookup"];
    for (const theme of ["light", "dark"]) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
      await c.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
      const p = await c.newPage();
      for (const route of routes) {
        await p.goto(BASE + route, { waitUntil: "networkidle" });
        await p.waitForTimeout(400);
        const m = await p.evaluate(collect);
        out.solidContrast.push({ route, theme, checked: m.contrast.checked, solidFails: m.contrast.solidFailCount, mediaFails: m.contrast.mediaFailCount, worst: m.contrast.solid.slice(0, 5) });
      }
      await c.close();
    }
  }

  // 404 in both themes.
  for (const theme of ["light", "dark"]) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
    const p = await c.newPage();
    await p.goto(BASE + "/definitely-not-a-page", { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const m = await p.evaluate(collect);
    out.p404[theme] = { text: (await p.evaluate(() => document.body.innerText)).slice(0, 120), theme: m.themeAttr, hasHeader: !!m.landmarks.header, hasFooter: !!m.landmarks.footer, hasToggle: !!m.toggle, h1: m.h1Count, title: m.title };
    await p.screenshot({ path: path.join(SHOT, `review-404-${theme}.png`) });
    await c.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(DATA, "followup.json"), JSON.stringify(out, null, 2));
  console.log("followup.json", JSON.stringify({ modals: out.modals, customer: out.customerEmail, guestUrl: out.guest.landedAt, guestError: out.guest.errorText, p404: out.p404 }));
})();
