/* Read-only QA harness: public routes, both themes, 4 viewports. Writes metrics + screenshots only. */
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(__dirname, "../../../apps/api/node_modules/@playwright/test"));

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "reports/qa-light-dark-audit");
const SHOT = path.join(OUT, "screens");
const DATA = path.join(OUT, "data");
fs.mkdirSync(SHOT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const BASE = "http://localhost:5173";
const PUBLIC_ROUTES = [
  ["/", "home"],
  ["/stay", "stay"],
  ["/rooms", "rooms"],
  ["/amenities", "amenities"],
  ["/about", "about"],
  ["/contact", "contact"],
  ["/search?checkIn=2026-11-20&checkOut=2026-11-22&adults=2&children=0&rooms=1", "search"],
  ["/booking?checkIn=2026-11-20&checkOut=2026-11-22&adults=2&children=0&rooms=1", "booking-entry"],
  ["/booking/lookup", "lookup"],
  ["/booking/success", "booking-success"],
  ["/my-bookings", "my-bookings"],
  ["/login", "login"],
  ["/register", "register"],
  ["/forgot-password", "forgot-password"],
  ["/reset-password?token=invalid", "reset-password"],
  ["/verify-email", "verify-email"],
  ["/this-route-does-not-exist", "404"],
];

const collect = () => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const cs = getComputedStyle(de);
  const canvasVar = cs.getPropertyValue("--canvas").trim();
  const parse = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratioOf = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const canvas = parse(canvasVar) || { r: 244, g: 241, b: 234, a: 1 };
  const effBg = (el) => {
    const chain = [];
    let node = el;
    while (node && node.nodeType === 1) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) chain.push(c);
      node = node.parentElement;
    }
    let bg = canvas;
    for (let i = chain.length - 1; i >= 0; i--) bg = blend(chain[i], bg);
    return bg;
  };

  const textFailures = [];
  const fontFamilies = {};
  const sizes = {};
  let checked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    const text = (n.nodeValue || "").trim();
    if (!text) continue;
    seen.add(el);
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.display === "none") continue;
    if (parseFloat(st.opacity) < 0.15) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > window.innerHeight * 12) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const fg = parse(st.color);
    if (!fg || fg.a < 0.05) continue;
    const bg = effBg(el);
    const fgC = fg.a < 1 ? blend(fg, bg) : fg;
    const size = parseFloat(st.fontSize);
    const weight = parseInt(st.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const ratio = ratioOf(fgC, bg);
    checked++;
    const fam = st.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    fontFamilies[fam] = (fontFamilies[fam] || 0) + 1;
    sizes[Math.round(size)] = (sizes[Math.round(size)] || 0) + 1;
    if (ratio + 0.005 < need) {
      textFailures.push({
        text: text.slice(0, 70),
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 110),
        fg: st.color,
        bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        ratio: Math.round(ratio * 100) / 100,
        need,
        size: Math.round(size * 10) / 10,
        weight,
      });
    }
  }
  textFailures.sort((a, b) => a.ratio - b.ratio);

  const offenders = [];
  document.querySelectorAll("body *").forEach((el) => {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width < 1) return;
    if (r.right > vw + 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 100),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
      });
    }
  });
  offenders.sort((a, b) => b.right - a.right);

  const imgs = [...document.images];
  return {
    url: location.pathname + location.search,
    title: document.title,
    themeAttr: de.dataset.theme,
    metaThemeColor: document.querySelector('meta[name="theme-color"]')?.content,
    storedTheme: (() => { try { return localStorage.getItem("rivr-theme"); } catch { return "ERR"; } })(),
    canvasVar,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    hScroll: de.scrollWidth - de.clientWidth,
    bodyScrollW: document.body.scrollWidth,
    clientW: de.clientWidth,
    overflowOffenders: offenders.slice(0, 12),
    overflowCount: offenders.length,
    contrast: {
      checked,
      failCount: textFailures.length,
      worst: textFailures.slice(0, 12),
    },
    fonts: {
      families: fontFamilies,
      sizes,
      manrope: document.fonts.check('16px "Manrope"'),
      cormorant: document.fonts.check('16px "Cormorant Garamond"'),
      status: document.fonts.status,
    },
    imgs: {
      total: imgs.length,
      missingAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
      emptyAlt: imgs.filter((i) => i.getAttribute("alt") === "").length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc).slice(0, 5),
    },
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => h.tagName),
    landmarks: {
      header: document.querySelectorAll("header").length,
      main: document.querySelectorAll("main").length,
      footer: document.querySelectorAll("footer").length,
      nav: document.querySelectorAll("nav").length,
    },
    toggle: (() => {
      const b = [...document.querySelectorAll("button")].find((x) => /switch to (light|dark) mode/i.test(x.getAttribute("aria-label") || ""));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { label: b.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height), title: b.getAttribute("title") };
    })(),
    bodyClass: document.body.className,
  };
};

async function visit(page, route, theme, shots, errors) {
  const res = { route, theme, console: [], pageErrors: [], failedRequests: [] };
  const onConsole = (m) => { if (m.type() === "error") res.console.push(m.text().slice(0, 300)); };
  const onError = (e) => res.pageErrors.push(String(e).slice(0, 300));
  const onFail = (r) => { if (!r.url().includes("favicon")) res.failedRequests.push(`${r.url().slice(0, 200)} :: ${r.failure()?.errorText}`); };
  page.on("console", onConsole);
  page.on("pageerror", onError);
  page.on("requestfailed", onFail);
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
    res.status = resp ? resp.status() : null;
    await page.waitForTimeout(450);
    res.metrics = await page.evaluate(collect);
    if (shots) {
      const name = `${shots}-${theme}.png`;
      await page.screenshot({ path: path.join(SHOT, name), fullPage: shots.startsWith("desktop") });
      res.screenshot = name;
    }
  } catch (e) {
    res.navError = String(e).slice(0, 300);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onError);
    page.off("requestfailed", onFail);
  }
  return res;
}

(async () => {
  const browser = await chromium.launch();
  const results = { generatedAt: new Date().toISOString(), base: BASE, desktop: [], mobile: [], tablet: [], laptop: [], themeChecks: [] };

  // Desktop + mobile, both themes, all routes.
  for (const [route, name] of PUBLIC_ROUTES) {
    for (const theme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
      await ctx.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
      const page = await ctx.newPage();
      results.desktop.push(await visit(page, route, theme, `desktop-${name}`, null));
      await ctx.close();

      const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: theme, isMobile: true, hasTouch: true });
      await mctx.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
      const mp = await mctx.newPage();
      results.mobile.push(await visit(mp, route, theme, `mobile-${name}`, null));
      await mctx.close();
    }
  }

  // Tablet + laptop overflow/metrics only, key routes.
  for (const [route, name] of PUBLIC_ROUTES.filter(([r]) => ["/", "/stay", "/rooms", "/booking", "/login", "/contact"].includes(r))) {
    for (const [w, h, bucket] of [[1024, 768, "laptop"], [768, 1024, "tablet"]]) {
      for (const theme of ["light", "dark"]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
        await ctx.addInitScript((t) => { try { localStorage.setItem("rivr-theme", t); } catch {} }, theme);
        const page = await ctx.newPage();
        results[bucket].push(await visit(page, route, theme, null, null));
        await ctx.close();
      }
    }
  }

  // Theme behaviour checks on the home page.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    await ctx.addInitScript(() => { try { localStorage.removeItem("rivr-theme"); } catch {} });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const before = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      stored: localStorage.getItem("rivr-theme"),
      meta: document.querySelector('meta[name="theme-color"]')?.content,
      canvas: getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim(),
    }));
    const toggle = page.locator('button[aria-label*="Switch to"]').first();
    const toggleVisible = await toggle.isVisible();
    await toggle.click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      stored: localStorage.getItem("rivr-theme"),
      meta: document.querySelector('meta[name="theme-color"]')?.content,
      canvas: getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim(),
      active: document.activeElement?.getAttribute("aria-label"),
    }));
    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme") }));
    await page.goto(BASE + "/rooms", { waitUntil: "networkidle" });
    const afterNav = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("rivr-theme") }));
    results.themeChecks.push({ name: "toggle+persist", before, toggleVisible, after, afterReload, afterNav });
    await ctx.close();
  }

  // OS preference, no stored value.
  for (const scheme of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
    await ctx.addInitScript(() => { try { localStorage.removeItem("rivr-theme"); } catch {} });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    results.themeChecks.push({ name: `os-pref-${scheme}`, observed: await page.evaluate(() => document.documentElement.dataset.theme) });
    await ctx.close();
  }

  // Invalid stored value.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
    await ctx.addInitScript(() => { try { localStorage.setItem("rivr-theme", "blue"); } catch {} });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    results.themeChecks.push({ name: "invalid-stored", observed: await page.evaluate(() => document.documentElement.dataset.theme) });
    await ctx.close();
  }

  // FOUC: delay the app bundle so the inline head script's first paint state is observable.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
    await ctx.addInitScript(() => { try { localStorage.setItem("rivr-theme", "dark"); } catch {} });
    const page = await ctx.newPage();
    await page.route("**/src/main.tsx*", async (route) => { await new Promise((r) => setTimeout(r, 1200)); await route.continue(); });
    const nav = page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    const preHydration = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      htmlBg: getComputedStyle(document.documentElement).backgroundColor,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      canvas: getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim(),
      rootChildren: document.getElementById("root")?.childElementCount ?? -1,
    }));
    await nav;
    await page.waitForTimeout(800);
    results.themeChecks.push({ name: "pre-hydration-dark", preHydration });
    await ctx.close();
  }

  // Mobile menu interaction on home.
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const btn = page.locator('button[aria-label*="navigation"]').first();
    const labelBefore = await btn.getAttribute("aria-label");
    await btn.click();
    await page.waitForTimeout(400);
    const openState = await page.evaluate(() => ({
      menu: !!document.getElementById("mobile-navigation"),
      bodyClass: document.body.className,
      expanded: document.querySelector('button[aria-controls="mobile-navigation"]')?.getAttribute("aria-expanded"),
      scrollLocked: getComputedStyle(document.body).overflow,
    }));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() => ({
      menu: !!document.getElementById("mobile-navigation"),
      bodyClass: document.body.className,
      expanded: document.querySelector('button[aria-controls="mobile-navigation"]')?.getAttribute("aria-expanded"),
    }));
    results.themeChecks.push({ name: "mobile-menu", labelBefore, openState, closed });
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(DATA, "public.json"), JSON.stringify(results, null, 2));
  console.log("public.json written", {
    desktop: results.desktop.length,
    mobile: results.mobile.length,
    laptop: results.laptop.length,
    tablet: results.tablet.length,
    themeChecks: results.themeChecks.length,
  });
})();
