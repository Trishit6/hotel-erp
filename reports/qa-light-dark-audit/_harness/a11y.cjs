/* Read-only accessibility audit: axe-core, keyboard, focus, targets, reduced motion. */
const path = require("path");
const fs = require("fs");
const https = require("https");
const { chromium } = require(path.join(__dirname, "../../../apps/api/node_modules/@playwright/test"));
const { BASE, SHOT, DATA } = require("./shared.cjs");

function fetchAxe() {
  return new Promise((resolve) => {
    https.get("https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js", (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(res.statusCode === 200 ? data : null));
    }).on("error", () => resolve(null));
  });
}

async function runAxe(page, axeSource, label) {
  try {
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
        resultTypes: ["violations"],
      });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
        sample: v.nodes.slice(0, 3).map((n) => ({ target: n.target, summary: (n.failureSummary || "").slice(0, 240) })),
      }));
    });
    return { label, violations: res };
  } catch (e) {
    return { label, error: String(e).slice(0, 300) };
  }
}

async function login(page, email = "admin@admin.com", password = "password") {
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2200);
}

(async () => {
  const axeSource = await fetchAxe();
  const browser = await chromium.launch();
  const out = { generatedAt: new Date().toISOString(), axeAvailable: !!axeSource, axe: [], keyboard: {}, loginErrors: {}, targets: {}, reducedMotion: {}, modal: {}, headings: {} };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();

  for (const [route, label] of [["/", "home"], ["/rooms", "rooms"], ["/booking", "booking"], ["/login", "login"], ["/my-bookings", "my-bookings"]]) {
    for (const theme of ["light", "dark"]) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      await page.evaluate((t) => localStorage.setItem("rivr-theme", t), theme);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      if (axeSource) out.axe.push(await runAxe(page, axeSource, `${label}-${theme}`));
      out.headings[`${label}-${theme}`] = await page.evaluate(() => {
        const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
        let skips = [];
        for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skips.push(`${hs[i - 1]}->${hs[i]}`);
        return { sequence: hs, skips };
      });
    }
  }

  // Keyboard: tab order and visible focus on the login page.
  {
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.evaluate(() => document.body.focus());
    const stops = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => {
        const a = document.activeElement;
        if (!a) return null;
        const st = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        return {
          tag: a.tagName.toLowerCase(),
          type: a.getAttribute("type"),
          name: (a.getAttribute("aria-label") || a.textContent || a.getAttribute("placeholder") || "").trim().slice(0, 45),
          outline: `${st.outlineStyle} ${st.outlineWidth} ${st.outlineColor}`,
          boxShadow: st.boxShadow.slice(0, 80),
          rect: { w: Math.round(r.width), h: Math.round(r.height) },
        };
      }));
    }
    // Toggle via keyboard and confirm it responds.
    await page.locator('button[aria-label*="Switch to"]').first().focus();
    const labelBefore = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, label: document.activeElement?.getAttribute("aria-label") }));
    out.keyboard = { stops, toggle: { labelBefore, after } };
  }

  // Invalid login: action, message, association, focus.
  {
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.fill('input[autocomplete="username"]', "not-an-email");
    await page.fill('input[type="password"]', "x");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    out.loginErrors = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      const inputs = [...document.querySelectorAll("input")];
      return {
        alertText: alert ? alert.textContent.trim().slice(0, 200) : null,
        alertInLiveRegion: !!alert,
        inputs: inputs.map((i) => ({
          type: i.getAttribute("type"),
          ariaInvalid: i.getAttribute("aria-invalid"),
          describedBy: i.getAttribute("aria-describedby"),
          required: i.hasAttribute("required"),
          validationMessage: i.validationMessage,
          borderColor: getComputedStyle(i).borderColor,
        })),
        activeElement: document.activeElement?.tagName,
      };
    });
    await page.screenshot({ path: path.join(SHOT, "login-invalid-light.png") });
  }

  // Touch targets on mobile.
  {
    const m = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: "light" });
    const mp = await m.newPage();
    for (const route of ["/", "/rooms", "/login"]) {
      await mp.goto(BASE + route, { waitUntil: "networkidle" });
      await mp.waitForTimeout(400);
      out.targets[route] = await mp.evaluate(() => {
        const els = [...document.querySelectorAll("button, a, [role=button]")];
        const bad = [];
        for (const el of els) {
          const st = getComputedStyle(el);
          if (st.display === "none" || st.visibility === "hidden") continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.width < 24 || r.height < 24) {
            bad.push({ label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
          }
        }
        return { total: els.length, under24: bad.length, examples: bad.slice(0, 8) };
      });
    }
    await m.close();
  }

  // Reduced motion.
  {
    const m = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const mp = await m.newPage();
    await mp.goto(BASE + "/", { waitUntil: "networkidle" });
    await mp.waitForTimeout(500);
    out.reducedMotion = await mp.evaluate(() => {
      const orb = document.querySelector(".page-atmosphere__orb--gold");
      const wash = document.querySelector(".home-wash");
      const running = [...document.querySelectorAll("body *")].filter((el) => {
        const s = getComputedStyle(el);
        return s.animationName !== "none" && parseFloat(s.animationDuration) > 0.05;
      }).length;
      return {
        orbAnimation: orb ? getComputedStyle(orb).animationName : null,
        washAnimation: wash ? getComputedStyle(wash).animationName : null,
        elementsWithLongAnimation: running,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      };
    });
    await m.close();
  }

  // Modal focus management in the workspace.
  {
    await login(page);
    await page.goto(BASE + "/admin/staff", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1600);
    const trigger = page.getByRole("button", { name: /add staff|add|new/i }).first();
    if (await trigger.count()) {
      await trigger.click();
      await page.waitForTimeout(700);
      const dialog = page.locator('[role="dialog"]');
      const initial = await page.evaluate(() => {
        const a = document.activeElement;
        return { insideDialog: !!a?.closest('[role="dialog"]'), tag: a?.tagName, label: a?.getAttribute("aria-label") };
      });
      let escaped = false;
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press("Tab");
        if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) { escaped = true; break; }
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const closedByEscape = (await dialog.count()) === 0;
      const returnedFocus = await page.evaluate(() => {
        const a = document.activeElement;
        return { tag: a?.tagName, text: (a?.textContent || "").trim().slice(0, 40), inDialog: !!a?.closest('[role="dialog"]') };
      });
      out.modal = { opened: true, hasDialogRole: true, initial, tabEscapedDialog: escaped, closedByEscape, returnedFocus };
      if ((await dialog.count()) > 0) {
        const close = page.locator('[role="dialog"] button[aria-label="Close dialog"]').first();
        if (await close.count()) await close.click();
      }
    } else out.modal = { opened: false, note: "New reservation trigger not found" };

    await page.goto(BASE + "/admin/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    if (axeSource) {
      out.axe.push(await runAxe(page, axeSource, "admin-dashboard-light"));
      await page.evaluate(() => localStorage.setItem("rivr-theme", "dark"));
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      out.axe.push(await runAxe(page, axeSource, "admin-dashboard-dark"));
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(DATA, "a11y.json"), JSON.stringify(out, null, 2));
  const total = out.axe.reduce((n, a) => n + (a.violations?.length || 0), 0);
  console.log("a11y.json written", { axeAvailable: out.axeAvailable, axeRuns: out.axe.length, violationTypes: total, modal: out.modal });
})();
