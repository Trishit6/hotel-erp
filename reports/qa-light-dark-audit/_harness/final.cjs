/* Final read-only checks after the API rate-limit window resets. */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "../../../apps/api/node_modules/@playwright/test"));
const { BASE, SHOT, DATA, collect } = require("./shared.cjs");

async function login(page, email, password, wait = 2800) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(wait);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  return page.url();
}

(async () => {
  const out = {};
  const b = await chromium.launch();

  // 1. Login validation error state (after reset).
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.fill('input[autocomplete="username"]', "not-an-email");
    await page.fill('input[type="password"]', "x");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(900);
    out.validation = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const inputs = [...document.querySelectorAll("input")];
      return {
        alertText: alert ? alert.textContent.trim().slice(0, 200) : null,
        inputs: inputs.map((i) => ({
          type: i.getAttribute("type"), autocomplete: i.getAttribute("autocomplete"),
          ariaInvalid: i.getAttribute("aria-invalid"), describedBy: i.getAttribute("aria-describedby"),
          borderColor: getComputedStyle(i).borderColor,
        })),
        errorSpans: [...document.querySelectorAll("span.text-\\[var\\(--danger\\)\\]")].map((s) => s.textContent.trim()),
        activeElement: document.activeElement?.tagName,
      };
    });
    await page.screenshot({ path: path.join(SHOT, "preview-login-validation.jpg"), type: "jpeg", quality: 70 });

    // Password visibility toggle + focus indication on the email field.
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    const toggle = page.getByRole("button", { name: /show password/i }).first();
    await toggle.click();
    out.passwordToggle = await page.evaluate(() => {
      const pw = document.querySelector('input[autocomplete="current-password"], input[type="text"], input[type="password"]');
      const labels = [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")).filter(Boolean);
      return { passwordType: pw?.getAttribute("type") || null, labels };
    });
    const email = page.locator('input[autocomplete="username"]');
    await email.focus();
    out.focusStyle = await page.evaluate(() => {
      const i = document.querySelector('input[autocomplete="username"]');
      const shell = i.closest("span");
      return {
        inputOutline: getComputedStyle(i).outlineStyle + " " + getComputedStyle(i).outlineWidth,
        inputBoxShadow: getComputedStyle(i).boxShadow,
        shellBorderColor: shell ? getComputedStyle(shell).borderColor : null,
        shellBoxShadow: shell ? getComputedStyle(shell).boxShadow : null,
      };
    });
    await ctx.close();
  }

  // 2. Housekeeping role dashboard.
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    out.housekeepingUrl = await login(page, "housekeeping@rivrhotel.in", "password");
    await page.goto(BASE + "/housekeeping/dashboard", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1000);
    out.housekeeping = { url: page.url(), text: (await page.evaluate(() => document.body.innerText)).slice(0, 160) };
    await page.screenshot({ path: path.join(SHOT, "preview-role-housekeeping.jpg"), type: "jpeg", quality: 70 });
    await page.evaluate(() => localStorage.setItem("rivr-theme", "dark"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    out.housekeepingDark = await page.evaluate(collect);
    await page.screenshot({ path: path.join(SHOT, "preview-role-housekeeping-dark.jpg"), type: "jpeg", quality: 70 });
    await ctx.close();
  }

  // 3. Admin dashboard JPEG preview.
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await login(page, "admin@admin.com", "password");
    await page.goto(BASE + "/admin/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SHOT, "preview-admin-dashboard.jpg"), type: "jpeg", quality: 70 });
    out.adminDashboard = await page.evaluate(collect);
    await ctx.close();
  }

  // 4. Clean dark screenshots (no rate-limit banner).
  {
    const shots = [];
    for (const [route, name] of [["/", "home"], ["/rooms", "rooms"], ["/stay", "stay"]]) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
      await ctx.addInitScript(() => { try { localStorage.setItem("rivr-theme", "dark"); } catch {} });
      const page = await ctx.newPage();
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      const text = await page.evaluate(() => document.body.innerText);
      const clean = !/Too many requests/i.test(text);
      await page.screenshot({ path: path.join(SHOT, `clean-${name}-dark.jpg`), type: "jpeg", quality: 72 });
      shots.push({ route, clean, hint: text.slice(0, 120) });
      await ctx.close();
    }
    out.cleanShots = shots;
  }

  await b.close();
  fs.writeFileSync(path.join(DATA, "final.json"), JSON.stringify(out, null, 2));
  console.log("final.json", JSON.stringify(out, null, 2).slice(0, 2400));
})();
