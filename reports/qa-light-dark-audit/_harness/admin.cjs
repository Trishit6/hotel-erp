/* Read-only authenticated audit: staff workspace, role restrictions, guest dashboard. */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "../../../apps/api/node_modules/@playwright/test"));
const { BASE, SHOT, DATA, visit } = require("./shared.cjs");

const ADMIN_ROUTES = [
  ["/admin", "index"],
  ["/admin/dashboard", "dashboard"],
  ["/admin/reservations", "reservations"],
  ["/admin/rooms", "rooms"],
  ["/admin/room-types", "room-types"],
  ["/admin/guests", "guests"],
  ["/admin/front-desk", "front-desk"],
  ["/admin/housekeeping", "housekeeping"],
  ["/admin/staff", "staff"],
  ["/admin/attendance", "attendance"],
  ["/admin/payments", "payments"],
  ["/admin/invoices", "invoices"],
  ["/admin/expenses", "expenses"],
  ["/admin/inventory", "inventory"],
  ["/admin/restaurant", "restaurant"],
  ["/admin/reports", "reports"],
  ["/admin/settings", "settings"],
  ["/admin/activity-logs", "activity-logs"],
];

async function login(page, email, password) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);
  return page.url();
}

async function logout(page) {
  const btn = page.locator('button[aria-label="Sign out"]');
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(1200);
  }
}

(async () => {
  const browser = await chromium.launch();
  const results = { generatedAt: new Date().toISOString(), login: {}, routes: [], themeInWorkspace: {}, modal: {}, mobile: {}, roleRestriction: {}, guest: {} };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 250)); });

  results.login.adminUrl = await login(page, "admin@admin.com", "password");
  await page.waitForTimeout(700);

  // Theme toggle inside the staff workspace.
  {
    await page.goto(BASE + "/admin/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const snap = () => page.evaluate(() => {
      const shell = document.querySelector(".admin-shell");
      const header = document.querySelector(".glass-header");
      const main = document.querySelector(".admin-main");
      const cs = shell ? getComputedStyle(shell) : null;
      return {
        theme: document.documentElement.dataset.theme,
        stored: localStorage.getItem("rivr-theme"),
        shellCanvas: cs ? cs.getPropertyValue("--canvas").trim() : null,
        shellText: cs ? cs.getPropertyValue("--text").trim() : null,
        shellBg: shell ? getComputedStyle(shell).backgroundColor : null,
        headerBg: header ? getComputedStyle(header).backgroundColor : null,
        mainText: main ? getComputedStyle(main).color : null,
      };
    });
    const before = await snap();
    await page.screenshot({ path: path.join(SHOT, "admin-dashboard-theme-light-state.png") });
    const toggle = page.locator('button[aria-label*="Switch to"]').first();
    const visible = await toggle.isVisible();
    await toggle.click();
    await page.waitForTimeout(700);
    const after = await snap();
    await page.screenshot({ path: path.join(SHOT, "admin-dashboard-theme-dark-state.png") });
    results.themeInWorkspace = { visible, before, after, changed: JSON.stringify(before) !== JSON.stringify(after) };
    // restore light
    await toggle.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // Route sweep (theme = light state; the workspace shell is intentionally dark regardless).
  for (const [route, name] of ADMIN_ROUTES) {
    const r = await visit(page, route, "light", `admin-${name}`, false);
    results.routes.push(r);
  }
  // Dark-state screenshots of a few routes for visual comparison.
  for (const [route, name] of [["/admin/dashboard", "dashboard"], ["/admin/reservations", "reservations"], ["/admin/settings", "settings"]]) {
    await page.evaluate(() => localStorage.setItem("rivr-theme", "dark"));
    const r = await visit(page, route, "dark", `admin-${name}-dark`, false);
    results.routes.push(r);
  }
  await page.evaluate(() => localStorage.setItem("rivr-theme", "light"));

  // Modal behaviour.
  {
    await page.goto(BASE + "/admin/reservations", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const trigger = page.getByRole("button", { name: /new reservation/i }).first();
    const found = (await trigger.count()) > 0;
    if (found) {
      await trigger.click();
      await page.waitForTimeout(600);
      const dialog = page.locator('[role="dialog"]');
      const open = (await dialog.count()) > 0;
      const initialFocus = await page.evaluate(() => {
        const a = document.activeElement;
        return a ? { tag: a.tagName.toLowerCase(), text: (a.textContent || "").trim().slice(0, 40), label: a.getAttribute("aria-label") } : null;
      });
      const label = open ? await dialog.first().getAttribute("aria-label") : null;
      const box = open ? await dialog.first().boundingBox() : null;
      let escaped = false;
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press("Tab");
        if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) { escaped = true; break; }
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const stillOpen = (await page.locator('[role="dialog"]').count()) > 0;
      await page.screenshot({ path: path.join(SHOT, "admin-modal-after-escape.png") });
      results.modal = { found, open, label, initialFocus, tabEscapedDialog: escaped, stillOpenAfterEscape: stillOpen, box };
      if (stillOpen) {
        const close = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
        if (await close.count()) await close.click();
      }
    } else results.modal = { found: false };
  }

  // Mobile workspace.
  {
    const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: "light" });
    const mp = await mctx.newPage();
    await login(mp, "admin@admin.com", "password");
    const dash = await visit(mp, "/admin/dashboard", "light", "admin-dashboard-mobile-light", false);
    await mp.screenshot({ path: path.join(SHOT, "admin-mobile-nav-closed.png") });
    const openBtn = mp.locator('button[aria-label="Open navigation"]').first();
    let nav = {};
    if (await openBtn.count()) {
      await openBtn.click();
      await mp.waitForTimeout(500);
      nav = await mp.evaluate(() => {
        const aside = document.querySelector("aside");
        const r = aside?.getBoundingClientRect();
        return { asideLeft: r ? Math.round(r.left) : null, asideWidth: r ? Math.round(r.width) : null, scrollLocked: getComputedStyle(document.body).overflow };
      });
      await mp.screenshot({ path: path.join(SHOT, "admin-mobile-nav-open.png") });
      const closeBtn = mp.locator('button[aria-label="Close navigation"]').first();
      if (await closeBtn.count()) await closeBtn.click();
    }
    results.mobile = { dashboard: dash, nav };
    await mctx.close();
  }

  // Role restriction: housekeeping cannot open settings.
  {
    await logout(page);
    results.login.housekeepingUrl = await login(page, "housekeeping@rivrhotel.in", "password");
    const restricted = await visit(page, "/admin/settings", "light", "admin-settings-housekeeping", false);
    const allowed = await visit(page, "/admin/housekeeping", "light", "admin-housekeeping-role", false);
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    results.roleRestriction = { restricted, allowed, restrictedText: body, urlAfter: page.url() };
  }

  // Guest dashboard using a seeded demo customer.
  {
    await logout(page);
    await login(page, "admin@admin.com", "password");
    await page.goto(BASE + "/admin/guests", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const emails = await page.evaluate(() => [...new Set((document.body.innerText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []))].filter((e) => /@example\.com$/i.test(e)).slice(0, 5));
    await logout(page);
    const email = emails[0];
    if (email) {
      results.login.customerEmail = email;
      results.login.customerUrl = await login(page, email, "password");
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => localStorage.setItem("rivr-theme", t), theme);
        const r = await visit(page, "/guest/dashboard", theme, `guest-dashboard-${theme}`, false);
        results.guest[theme] = r;
      }
      results.guest.visibleEmailSample = emails;
    } else results.guest.note = "No seeded @example.com customer email surfaced on /admin/guests";
  }

  results.consoleErrors = errors.slice(0, 20);
  await browser.close();
  fs.writeFileSync(path.join(DATA, "admin.json"), JSON.stringify(results, null, 2));
  console.log("admin.json written", {
    routes: results.routes.length,
    themeChanged: results.themeInWorkspace.changed,
    modal: results.modal,
    guest: results.login.customerEmail || null,
  });
})();
