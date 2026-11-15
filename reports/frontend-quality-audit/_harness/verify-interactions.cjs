const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(process.cwd(), "apps/api/node_modules/@playwright/test"));

const BASE = "http://localhost:5173";
const OUT = path.join(process.cwd(), "reports/frontend-quality-audit/screens");
const DATA = path.join(process.cwd(), "reports/frontend-quality-audit/data");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

async function signIn(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[type="password"]').fill("password");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
  await page.waitForTimeout(900);
}

(async () => {
  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), consoleErrors: [] };

  // --- Login validation semantics ---
  const loginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await loginPage.locator('button[type="submit"]').click();
  await loginPage.waitForTimeout(350);
  report.loginValidation = await loginPage.evaluate(() => {
    const email = document.querySelector('input[autocomplete="username"]');
    const error = document.getElementById("login-email-error");
    const active = document.activeElement;
    return {
      emailType: email?.getAttribute("type"),
      ariaInvalid: email?.getAttribute("aria-invalid"),
      describedBy: email?.getAttribute("aria-describedby"),
      errorRole: error?.getAttribute("role"),
      errorText: error?.textContent?.trim(),
      focusedAutocomplete: active?.getAttribute("autocomplete"),
      focusedType: active?.getAttribute("type"),
    };
  });
  await loginPage.screenshot({ path: path.join(OUT, "login-validation-after.jpg"), type: "jpeg", quality: 62 });
  await loginContext.close();

  // --- Public theme persistence without losing stay values ---
  const themeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const themePage = await themeContext.newPage();
  await themePage.goto(`${BASE}/stay`, { waitUntil: "networkidle" });
  await themePage.locator('input[type="date"]').first().fill("2026-12-12");
  await themePage.locator('input[type="date"]').nth(1).fill("2026-12-15");
  const beforeToggle = await themePage.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    dates: [...document.querySelectorAll('input[type="date"]')].map((input) => input.value),
  }));
  await themePage.locator('[aria-label^="Switch to"]').first().click();
  await themePage.waitForTimeout(500);
  const afterToggle = await themePage.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    dates: [...document.querySelectorAll('input[type="date"]')].map((input) => input.value),
    stored: localStorage.getItem("rivr-theme"),
  }));
  await themePage.reload({ waitUntil: "networkidle" });
  await themePage.waitForTimeout(400);
  const afterReload = await themePage.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    dates: [...document.querySelectorAll('input[type="date"]')].map((input) => input.value),
  }));
  report.theme = { beforeToggle, afterToggle, afterReload };

  // Stay values survive navigation.
  await themePage.locator('a[href="/rooms"]').first().click();
  await themePage.waitForTimeout(900);
  report.stayValuesAfterNavigation = await themePage.evaluate(() => ({
    path: location.pathname,
    dates: [...document.querySelectorAll('input[type="date"]')].map((input) => input.value),
  }));

  // --- Booking search validation on mobile ---
  await themePage.setViewportSize({ width: 390, height: 844 });
  await themePage.goto(`${BASE}/stay`, { waitUntil: "networkidle" });
  await themePage.locator('input[type="date"]').first().fill("2026-12-20");
  await themePage.locator('input[type="date"]').nth(1).fill("2026-12-18");
  await themePage.locator('form[aria-label="Search room availability"] button[type="submit"]').click();
  await themePage.waitForTimeout(350);
  report.bookingValidation = await themePage.evaluate(() => ({
    alert: document.querySelector('form[aria-label="Search room availability"] [role="alert"]')?.textContent?.trim(),
    hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    path: location.pathname,
  }));
  await themePage.screenshot({ path: path.join(OUT, "booking-validation-mobile-after.jpg"), type: "jpeg", quality: 55, fullPage: true });
  await themeContext.close();

  // --- Admin dialog keyboard + theme control honesty ---
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  adminPage.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("401")) {
      report.consoleErrors.push(message.text().slice(0, 160));
    }
  });
  await signIn(adminPage, "admin@admin.com");
  await adminPage.goto(`${BASE}/admin/staff`, { waitUntil: "domcontentloaded" });
  await adminPage.waitForTimeout(1500);
  report.adminThemeToggleCount = await adminPage.locator('[aria-label^="Switch to"]').count();

  const trigger = adminPage.getByRole("button", { name: /add staff/i }).first();
  await trigger.click();
  await adminPage.getByRole("dialog").waitFor({ timeout: 5000 });
  report.modal = await adminPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const active = document.activeElement;
    return {
      activeInside: Boolean(dialog && active && dialog.contains(active)),
      activeTag: active?.tagName,
      activeLabel: active?.getAttribute("aria-label") || active?.getAttribute("placeholder"),
    };
  });
  let escaped = 0;
  for (let i = 0; i < 20; i += 1) {
    await adminPage.keyboard.press("Tab");
    const inside = await adminPage.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    });
    if (!inside) escaped += 1;
  }
  report.modal.tabPresses = 20;
  report.modal.focusEscapes = escaped;
  await adminPage.screenshot({ path: path.join(OUT, "admin-modal-focus-after.jpg"), type: "jpeg", quality: 55 });
  await adminPage.keyboard.press("Escape");
  await adminPage.waitForTimeout(350);
  report.modal.closedOnEscape = (await adminPage.getByRole("dialog").count()) === 0;
  report.modal.focusReturnedTo = await adminPage.evaluate(() =>
    (document.activeElement?.textContent || "").trim().slice(0, 40),
  );

  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.getByRole("button", { name: /add staff/i }).first().click();
  await adminPage.getByRole("dialog").waitFor({ timeout: 5000 });
  report.modal.mobile = await adminPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const rect = dialog?.getBoundingClientRect();
    return {
      width: rect ? Math.round(rect.width) : null,
      right: rect ? Math.round(rect.right) : null,
      viewport: window.innerWidth,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  await adminPage.screenshot({ path: path.join(OUT, "admin-modal-mobile-after.jpg"), type: "jpeg", quality: 55 });
  await adminPage.keyboard.press("Escape");
  await adminContext.close();

  // --- Guest dashboard in both themes ---
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guestPage = await guestContext.newPage();
  await signIn(guestPage, "aarav.nair5@example.com");
  await guestPage.goto(`${BASE}/guest/dashboard`, { waitUntil: "networkidle" });
  await guestPage.waitForTimeout(1200);
  report.guest = {
    heading: await guestPage.locator("h1").first().innerText(),
    desktopHScroll: await guestPage.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  };
  await guestPage.screenshot({ path: path.join(OUT, "guest-dashboard-light-after.jpg"), type: "jpeg", quality: 48, fullPage: true });
  await guestPage.locator('[aria-label^="Switch to"]').first().click();
  await guestPage.waitForTimeout(600);
  report.guest.darkTheme = await guestPage.evaluate(() => document.documentElement.dataset.theme);
  await guestPage.screenshot({ path: path.join(OUT, "guest-dashboard-dark-after.jpg"), type: "jpeg", quality: 48, fullPage: true });
  await guestPage.setViewportSize({ width: 390, height: 844 });
  await guestPage.waitForTimeout(400);
  report.guest.mobileHScroll = await guestPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await guestPage.screenshot({ path: path.join(OUT, "guest-dashboard-mobile-dark-after.jpg"), type: "jpeg", quality: 50, fullPage: true });
  await guestContext.close();

  fs.writeFileSync(path.join(DATA, "interactions-after.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
