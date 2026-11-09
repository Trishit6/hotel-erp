import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const BASE = process.env.VISUAL_BASE ?? "http://localhost:5173";
const outDir = path.resolve(process.env.VISUAL_OUT ?? "reports/screenshots/premium-final");
await mkdir(outDir, { recursive: true });

const results = { generatedAt: new Date().toISOString(), base: BASE, checks: {}, routes: [] };

const browser = await chromium.launch();

async function newContext(viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  if (options.login) {
    const response = await context.request.post(`${BASE}/api/auth/login`, {
      data: { email: "admin@admin.com", password: "password" },
    });
    results.checks.login = response.status();
  }
  return context;
}

async function settle(page, ms = 1700) {
  await page.waitForTimeout(ms);
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 3500);
        })),
    );
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(180);
}

async function heroState(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll(".pagehero-line, .hero-title-line")).map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement;
      const parentStyle = parent ? getComputedStyle(parent) : null;
      return {
        text: (element.textContent ?? "").trim().slice(0, 28),
        opacity: style.opacity,
        transform: style.transform,
        height: Math.round(rect.height),
        parentHeight: parent ? Math.round(parent.getBoundingClientRect().height) : null,
        parentOverflow: parentStyle?.overflow ?? null,
      };
    }),
  );
}

async function pageMetrics(page) {
  return page.evaluate(() => ({
    path: location.pathname + location.search,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    brokenImages: Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
    atmosphere: Boolean(document.querySelector(".page-atmosphere")),
    beams: document.querySelectorAll(".page-atmosphere__beam").length,
    adminShell: Boolean(document.querySelector(".admin-shell")),
    adminBg: document.querySelector(".admin-shell")
      ? getComputedStyle(document.querySelector(".admin-shell")).backgroundColor
      : null,
    adminCardBg: document.querySelector(".admin-main .glass-card")
      ? getComputedStyle(document.querySelector(".admin-main .glass-card")).backgroundColor
      : null,
    adminCardBlur: document.querySelector(".admin-main .glass-card")
      ? getComputedStyle(document.querySelector(".admin-main .glass-card")).backdropFilter
      : null,
  }));
}

// 1. Desktop public + admin, screenshots and a hero motion sample.
{
  const context = await newContext({ width: 1440, height: 900 }, { login: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(180);
  const motionEarly = await page.evaluate(() => {
    const image = document.querySelector(".image-frame img");
    const line = document.querySelector(".hero-title-line");
    return {
      imageTransform: image ? getComputedStyle(image).transform : null,
      lineOpacity: line ? getComputedStyle(line).opacity : null,
      frameClip: document.querySelector(".hero-frame-shadow .image-frame")
        ? getComputedStyle(document.querySelector(".hero-frame-shadow .image-frame")).clipPath
        : null,
    };
  });
  await page.waitForTimeout(2400);
  const motionMid = await page.evaluate(() => {
    const image = document.querySelector(".image-frame img");
    return image ? getComputedStyle(image).transform : null;
  });
  await page.waitForTimeout(2600);
  const motionDrift = await page.evaluate(() => {
    const image = document.querySelector(".image-frame img");
    return image ? getComputedStyle(image).transform : null;
  });
  const motionLate = await page.evaluate(() => {
    const image = document.querySelector(".image-frame img");
    const line = document.querySelector(".hero-title-line");
    return {
      imageTransform: image ? getComputedStyle(image).transform : null,
      lineOpacity: line ? getComputedStyle(line).opacity : null,
      frameClip: document.querySelector(".hero-frame-shadow .image-frame")
        ? getComputedStyle(document.querySelector(".hero-frame-shadow .image-frame")).clipPath
        : null,
      drift: image?.getAnimations?.().length ?? null,
    };
  });
  results.checks.heroMotion = { early: motionEarly, mid: motionMid, drift: motionDrift, late: motionLate };

  // Route transition: click through to Rooms and sample the stage opacity
  // immediately, then again once the lazy chunk has settled.
  const nav = page.locator('header a[href="/rooms"]').first();
  await nav.click();
  await page.waitForTimeout(120);
  const transitionEarly = await page.evaluate(() => {
    const stage = document.querySelector("#root > div");
    return {
      opacity: stage ? getComputedStyle(stage).opacity : null,
      heading: document.querySelector("h1")?.textContent?.trim().slice(0, 40) ?? null,
      bodyText: document.body.innerText.trim().length,
      pending: document.body.innerText.includes("Preparing your page"),
    };
  });
  await page.waitForTimeout(700);
  const transitionLate = await page.evaluate(() => ({
    opacity: (() => {
      const stage = document.querySelector("#root > div");
      return stage ? getComputedStyle(stage).opacity : null;
    })(),
    heading: document.querySelector("h1")?.textContent?.trim().slice(0, 40) ?? null,
  }));
  results.checks.transition = { early: transitionEarly, late: transitionLate };

  // Cursor states + magnetic pull.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await settle(page, 1200);
  await page.mouse.move(420, 420);
  await page.waitForTimeout(200);
  const cursorIdle = await page.evaluate(() => {
    const ring = document.querySelector(".cursor-ring");
    return ring ? { mode: ring.dataset.mode, opacity: getComputedStyle(ring).opacity } : null;
  });
  const ctaBox = await page.locator('[data-magnetic]').first().boundingBox();
  if (ctaBox) {
    await page.mouse.move(ctaBox.x + ctaBox.width * 0.82, ctaBox.y + ctaBox.height * 0.4);
    await page.waitForTimeout(320);
  }
  const cursorMagnet = await page.evaluate(() => {
    const ring = document.querySelector(".cursor-ring");
    const cta = document.querySelector("[data-magnetic]");
    return {
      mode: ring?.dataset.mode ?? null,
      label: document.querySelector(".cursor-label")?.textContent ?? null,
      translate: cta?.style.translate ?? null,
    };
  });
  results.checks.cursor = { idle: cursorIdle, magnet: cursorMagnet };

  await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.locator("input").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const fieldBox = await page.locator("input").first().boundingBox();
  if (fieldBox) await page.mouse.move(fieldBox.x + fieldBox.width / 2, fieldBox.y + fieldBox.height / 2);
  await page.waitForTimeout(260);
  results.checks.cursorField = await page.evaluate(() => ({
    mode: document.querySelector(".cursor-ring")?.dataset.mode ?? null,
    ringOpacity: document.querySelector(".cursor-ring")
      ? getComputedStyle(document.querySelector(".cursor-ring")).opacity
      : null,
  }));

  const routes = ["/", "/stay", "/rooms", "/amenities", "/about", "/contact", "/booking", "/login", "/admin/dashboard"];
  for (const route of routes) {
    const entry = { route, viewport: "desktop" };
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await settle(page);
      entry.metrics = await pageMetrics(page);
      entry.hero = await heroState(page);
      entry.consoleErrors = [...consoleErrors];
      entry.pageErrors = [...pageErrors];
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
      await page.screenshot({
        path: path.join(outDir, `final-${slug}-desktop.jpg`),
        type: "jpeg",
        quality: 74,
      });
      await page.screenshot({
        path: path.join(outDir, `final-${slug}-desktop-full.jpg`),
        type: "jpeg",
        quality: 62,
        fullPage: true,
      });
    } catch (error) {
      entry.error = String(error);
    }
    results.routes.push(entry);
  }

  // Reduced motion pass on the main public and admin pages.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/contact", "/admin/dashboard"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const entry = { route, viewport: "reduced" };
    entry.hero = await heroState(page);
    entry.metrics = await pageMetrics(page);
    const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
    await page.screenshot({
      path: path.join(outDir, `final-${slug}-reduced.jpg`),
      type: "jpeg",
      quality: 70,
    });
    results.routes.push(entry);
  }
  await context.close();
}

// 2. Mobile and tablet capture.
for (const [name, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 1024, height: 768 }],
]) {
  const context = await newContext(viewport, { login: true });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  for (const route of ["/", "/rooms", "/contact", "/admin/dashboard"]) {
    const entry = { route, viewport: name };
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await settle(page, 1300);
      entry.metrics = await pageMetrics(page);
      entry.hero = await heroState(page);
      entry.consoleErrors = [...consoleErrors];
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
      await page.screenshot({
        path: path.join(outDir, `final-${slug}-${name}.jpg`),
        type: "jpeg",
        quality: 72,
      });
    } catch (error) {
      entry.error = String(error);
    }
    results.routes.push(entry);
  }
  await context.close();
}

await browser.close();

const fs = await import("node:fs/promises");
await fs.writeFile(path.join(outDir, "verify.json"), JSON.stringify(results, null, 2));

console.log(JSON.stringify({
  login: results.checks.login,
  heroMotion: results.checks.heroMotion,
  transition: results.checks.transition,
  cursor: results.checks.cursor,
  cursorField: results.checks.cursorField,
  routeFailures: results.routes.filter((route) =>
    Boolean(route.error) ||
    Boolean(route.pageErrors?.length) ||
    Boolean(route.metrics && route.metrics.scrollWidth > route.metrics.innerWidth)
  ),
  heroLineFailures: results.routes
    .filter((route) => route.hero?.some((line) => Number(line.opacity) < 0.99 || line.height < 10))
    .map((route) => ({ route: route.route, viewport: route.viewport, hero: route.hero })),
  routeCount: results.routes.length,
}, null, 2));
