/* Read-only extra checks: theme persistence, cross-browser smoke, measured performance. */
const path = require("path");
const fs = require("fs");
const pw = require(path.join(__dirname, "../../../apps/api/node_modules/@playwright/test"));
const { BASE, SHOT, DATA } = require("./shared.cjs");

const PERF_INIT = () => {
  window.__perf = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.lcp = Math.max(window.__perf.lcp, e.startTime + (e.renderTime || e.loadTime || 0));
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) { window.__perf.longTasks++; window.__perf.longTaskMs += e.duration; }
    }).observe({ type: "longtask", buffered: true });
  } catch {}
};

const readPerf = () => {
  const nav = performance.getEntriesByType("navigation")[0] || {};
  const res = performance.getEntriesByType("resource");
  const byType = {};
  for (const r of res) {
    const t = r.initiatorType || "other";
    byType[t] = byType[t] || { count: 0, transfer: 0 };
    byType[t].count++;
    byType[t].transfer += r.transferSize || 0;
  }
  return {
    lcp: Math.round((window.__perf?.lcp || 0) * 10) / 10,
    cls: Math.round((window.__perf?.cls || 0) * 1000) / 1000,
    longTasks: window.__perf?.longTasks || 0,
    longTaskMs: Math.round(window.__perf?.longTaskMs || 0),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
    load: Math.round(nav.loadEventEnd || 0),
    transferKB: Math.round(res.reduce((n, r) => n + (r.transferSize || 0), 0) / 1024),
    resources: byType,
    fontRequests: res.filter((r) => /fonts\.(googleapis|gstatic)/.test(r.name)).length,
  };
};

(async () => {
  const out = { generatedAt: new Date().toISOString(), persistence: {}, browsers: [], perf: {} };

  // 1. Theme persistence, using a clean context with no per-load storage init script.
  {
    const b = await pw.chromium.launch();
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("rivr-theme"));
    await page.reload({ waitUntil: "networkidle" });
    const baseline = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme") }));
    await page.locator('button[aria-label*="Switch to"]').first().click();
    await page.waitForTimeout(600);
    const toggled = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme"), meta: document.querySelector('meta[name="theme-color"]')?.content, canvas: getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim(), bodyBg: getComputedStyle(document.body).backgroundColor }));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const reloaded = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme"), canvas: getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim() }));
    await page.goto(BASE + "/rooms", { waitUntil: "networkidle" });
    const navigated = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme") }));
    // New tab in the same context shares localStorage.
    const tab = await ctx.newPage();
    await tab.goto(BASE + "/login", { waitUntil: "networkidle" });
    const newTab = await tab.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme") }));
    out.persistence = { baseline, toggled, reloaded, navigated, newTab };
    await b.close();
  }

  // 2. Cross-browser smoke on the home page (Chromium, Firefox, WebKit, Edge).
  const engines = [
    ["chromium", () => pw.chromium.launch()],
    ["firefox", () => pw.firefox.launch()],
    ["webkit", () => pw.webkit.launch()],
    ["edge", () => pw.chromium.launch({ channel: "msedge" })],
  ];
  for (const [name, launch] of engines) {
    const entry = { engine: name };
    try {
      const b = await launch();
      entry.version = b.version();
      for (const theme of ["light", "dark"]) {
        const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
        await ctx.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
        const page = await ctx.newPage();
        const consoleErrors = [];
        page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("401")) consoleErrors.push(m.text().slice(0, 200)); });
        page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 200)));
        await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(600);
        const snap = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          fontManrope: document.fonts.check('16px "Manrope"'),
          fontCormorant: document.fonts.check('16px "Cormorant Garamond"'),
          toggle: !!document.querySelector('button[aria-label*="Switch to"]'),
          canvas: getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim(),
        }));
        await page.screenshot({ path: path.join(SHOT, `xb-${name}-home-${theme}.png`) });
        await page.locator('button[aria-label*="Switch to"]').first().click();
        await page.waitForTimeout(500);
        const toggled = await page.evaluate(() => document.documentElement.dataset.theme);
        entry[theme] = { ...snap, toggledTo: toggled, consoleErrors };
        await ctx.close();
      }
      await b.close();
    } catch (e) {
      entry.error = String(e).slice(0, 300);
    }
    out.browsers.push(entry);
  }

  // 3. Measured performance (Lighthouse itself is not installed and must not be added).
  {
    const b = await pw.chromium.launch();
    for (const [route, label] of [["/", "home"], ["/rooms", "rooms"], ["/login", "login"]]) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
      await ctx.addInitScript(PERF_INIT);
      const page = await ctx.newPage();
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(1800);
      out.perf[label] = await page.evaluate(readPerf);
      await ctx.close();
    }
    // Admin dashboard: add the observer before authenticating.
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    await ctx.addInitScript(PERF_INIT);
    const page = await ctx.newPage();
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.fill('input[autocomplete="username"]', "admin@admin.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.goto(BASE + "/admin/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    out.perf.adminDashboard = await page.evaluate(readPerf);
    await page.screenshot({ path: path.join(SHOT, "review-admin-dashboard.png") });
    await ctx.close();
    await b.close();
  }

  // 4. Viewport-only screenshots for visual review (small enough to inspect).
  {
    const b = await pw.chromium.launch();
    for (const [route, name] of [["/", "home"], ["/rooms", "rooms"], ["/stay", "stay"], ["/login", "login"], ["/booking", "booking"], ["/contact", "contact"]]) {
      for (const theme of ["light", "dark"]) {
        const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
        await ctx.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
        const page = await ctx.newPage();
        await page.goto(BASE + route, { waitUntil: "networkidle" });
        await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(SHOT, `review-${name}-${theme}.png`) });
        await ctx.close();
      }
    }
    await b.close();
  }

  fs.writeFileSync(path.join(DATA, "extra.json"), JSON.stringify(out, null, 2));
  console.log("extra.json written", JSON.stringify({ persistence: out.persistence.reloaded, browsers: out.browsers.map((b) => ({ e: b.engine, err: b.error ? "ERR" : undefined })), perf: out.perf }));
})();
