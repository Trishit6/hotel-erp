/**
 * Booking widget + frontend QA audit.
 *
 * Usage: node apps/api/scripts/qa-widget-audit.mjs before|after
 * Writes reports/qa-widget-<mode>.json and screenshots to
 * reports/screenshots/qa-widget-<mode>/.
 *
 * This is a verification script only; it is not part of the app bundle.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const mode = process.argv[2] === "after" ? "after" : "before";
const base = "http://localhost:5173";
const shotDir = `reports/screenshots/qa-widget-${mode}`;
fs.mkdirSync(shotDir, { recursive: true });

const widgetRoutes = ["/", "/stay", "/rooms", "/booking", "/search"];
const otherRoutes = ["/amenities", "/about", "/contact"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const results = {
  mode,
  generatedAt: new Date().toISOString(),
  viewports: {},
  routes: [],
  functional: {},
  navigation: {},
  console: [],
  network: [],
};

const attachDiagnostics = (page) => {
  page.on("console", (message) => {
    if (message.type() === "error")
      results.console.push({ url: page.url(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    results.console.push({ url: page.url(), text: `pageerror: ${error.message}` });
  });
  page.on("requestfailed", (request) => {
    results.network.push({
      url: request.url(),
      reason: request.failure()?.errorText ?? "failed",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/auth/me"))
      results.network.push({ url: response.url(), status: response.status() });
  });
};

const measureWidget = () =>
  (() => {
    const form = document.querySelector(
      'form[aria-label="Search room availability"]',
    );
    if (!form) return { present: false };
    const rect = form.getBoundingClientRect();
    const style = getComputedStyle(form);
    const inputs = [...form.querySelectorAll("input[type=date]")];
    const selects = [...form.querySelectorAll("select")];
    const button = form.querySelector('button[type="submit"]');
    const labels = [...form.querySelectorAll("label")];
    const images = [...document.querySelectorAll("img")];
    const overlapArea = images.reduce((total, image) => {
      const imageRect = image.getBoundingClientRect();
      const width = Math.max(
        0,
        Math.min(rect.right, imageRect.right) - Math.max(rect.left, imageRect.left),
      );
      const height = Math.max(
        0,
        Math.min(rect.bottom, imageRect.bottom) - Math.max(rect.top, imageRect.top),
      );
      return total + width * height;
    }, 0);
    const labelRects = labels.map((label) => label.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < labelRects.length; i += 1) {
      for (let j = i + 1; j < labelRects.length; j += 1) {
        const a = labelRects[i];
        const b = labelRects[j];
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 2 && height > 2) overlaps += 1;
      }
    }
    return {
      present: true,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
      },
      fullyInViewport: rect.top >= 0 && rect.bottom <= innerHeight,
      partlyInViewport: rect.top < innerHeight && rect.bottom > 0,
      docOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      formOverflow: form.scrollWidth > form.clientWidth + 1,
      labelOverlaps: overlaps,
      clippedLabels: labels.filter(
        (label) => label.scrollWidth > label.clientWidth + 1,
      ).length,
      background: style.backgroundColor,
      opaque: !/rgba\([^)]*,\s*0?\.\d+\)/.test(style.backgroundColor),
      overlapsImagePx2: Math.round(overlapArea),
      dates: inputs.map((input) => input.value),
      counts: selects.map((select) => Number(select.value)),
      countOptions: selects.map((select) => select.options.length),
      buttonVisible: Boolean(
        button &&
          button.getBoundingClientRect().width > 0 &&
          button.getBoundingClientRect().height > 0 &&
          getComputedStyle(button).visibility !== "hidden",
      ),
      buttonText: button?.innerText.trim() ?? "",
      error: form.querySelector('[role="alert"]')?.textContent?.trim() ?? "",
    };
  })();

const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    attachDiagnostics(page);
    await page.addInitScript(() => {
      window.__cls = 0;
      window.__longTasks = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.__cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        window.__longTasks += list.getEntries().length;
      }).observe({ type: "longtask", buffered: true });
    });
    results.viewports[viewport.name] = {};

    for (const route of [...widgetRoutes, ...otherRoutes]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const widget = await page.evaluate(measureWidget);
      const perf = await page.evaluate(() => ({
        cls: Math.round((window.__cls ?? 0) * 10000) / 10000,
        longTasks: window.__longTasks ?? 0,
        images: [...document.querySelectorAll("img")].map((image) => ({
          src: image.currentSrc.slice(0, 120),
          loaded: image.complete && image.naturalWidth > 0,
        })),
      }));
      results.routes.push({ viewport: viewport.name, route, widget, perf });
      if (widgetRoutes.includes(route)) {
        await page.screenshot({
          path: `${shotDir}/${viewport.name}${route.replaceAll("/", "-") || "-home"}.jpg`,
          type: "jpeg",
          quality: 80,
        });
      }
    }
    await context.close();
  }

  // Interaction, validation, URL state and persistence tests.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  attachDiagnostics(page);
  const state = async () => {
    const raw = await page.locator("form[aria-label='Search room availability']").evaluate(
      (form) => ({
        dates: [...form.querySelectorAll("input[type=date]")].map((input) => input.value),
        counts: [...form.querySelectorAll("select")].map((select) => Number(select.value)),
        error:
          form.querySelector('[role="alert"]')?.textContent?.trim() ?? "",
      }),
    );
    return raw;
  };

  await page.goto(base + "/stay", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const initial = await state();
  const checkIn = addDays(initial.dates[0], 5);
  const checkOut = addDays(checkIn, 3);

  const dates = page.locator("form[aria-label='Search room availability'] input[type=date]");
  await dates.nth(0).fill(checkIn);
  await dates.nth(1).fill(checkOut);
  const selects = page.locator("form[aria-label='Search room availability'] select");
  await selects.nth(0).selectOption("3");
  await selects.nth(1).selectOption("1");
  await selects.nth(2).selectOption("2");
  const edited = await state();

  // Changing check-in past the checkout must roll checkout forward.
  const later = addDays(checkIn, 4);
  await dates.nth(0).fill(later);
  const afterShift = await state();
  const expectedShift = { checkIn: later, checkOut: addDays(later, 1) };

  // Restore a valid range, submit, and inspect the results URL + results form.
  await dates.nth(0).fill(checkIn);
  await dates.nth(1).fill(checkOut);
  await page.locator("form[aria-label='Search room availability'] button[type=submit]").click();
  await page.waitForURL("**/search?**", { timeout: 8000 });
  await page.waitForTimeout(700);
  const resultsUrl = page.url();
  const resultsState = await state();
  const resultsHeading = await page
    .locator("h1")
    .first()
    .innerText()
    .catch(() => "");

  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const afterBack = await state();

  // Cross-page persistence: edit on Home, navigate to Stay via the header.
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const homeSelects = page.locator(
    "form[aria-label='Search room availability'] select",
  );
  await homeSelects.nth(0).selectOption("4");
  await page.getByRole("link", { name: "Stay With Us" }).first().click();
  await page.waitForURL("**/stay", { timeout: 8000 });
  await page.waitForTimeout(700);
  const afterCrossPage = await state();

  // Direct URL state must be authoritative.
  await page.goto(
    base +
      `/search?checkIn=${checkIn}&checkOut=${checkOut}&adults=4&children=2&rooms=3`,
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(700);
  const directUrlState = await state();
  const directUrlHeading = await page.locator("h1").first().innerText();

  await page.goto(
    base +
      "/search?checkIn=2020-01-01&checkOut=2020-01-02&adults=99&children=-2&rooms=9",
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(700);
  const normalizedState = await state();

  // Invalid range must show an inline error and stay on the page.
  await page.goto(base + "/stay", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const invalidDates = page.locator(
    "form[aria-label='Search room availability'] input[type=date]",
  );
  const current = await state();
  await page.evaluate((value) => {
    const input = document.querySelectorAll(
      "form[aria-label='Search room availability'] input[type=date]",
    )[1];
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, current.dates[0]);
  await page
    .locator("form[aria-label='Search room availability'] button[type=submit]")
    .click();
  await page.waitForTimeout(500);
  const invalidState = await state();
  const invalidUrl = page.url();

  results.functional = {
    initial,
    edited,
    afterShift,
    expectedShift,
    resultsUrl,
    resultsState,
    resultsHeading,
    afterBack,
    afterCrossPage,
    directUrlState,
    directUrlHeading,
    normalizedState,
    invalidState,
    invalidUrl,
  };

  // Navigation / blank-screen / back-forward audit.
  const nav = [];
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const seen = new Set();
  for (const label of ["Stay With Us", "Explore Rooms", "Amenities", "About Us", "Contact", "Home"]) {
    const link = page.getByRole("link", { name: label }).first();
    if ((await link.count()) === 0) {
      nav.push({ label, error: "link not found" });
      continue;
    }
    await link.click();
    await page.waitForTimeout(550);
    const info = await page.evaluate(() => ({
      path: location.pathname,
      bodyChars: document.body.innerText.replace(/\s+/g, " ").trim().length,
      rootOpacity: getComputedStyle(document.querySelector("#root > div")).opacity,
    }));
    seen.add(info.path);
    nav.push({ label, ...info });
  }
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  nav.push({
    label: "browser-back",
    path: new URL(page.url()).pathname,
    bodyChars: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().length,
  });
  await page.goForward({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  nav.push({
    label: "browser-forward",
    path: new URL(page.url()).pathname,
    bodyChars: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().length,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  nav.push({
    label: "refresh",
    path: new URL(page.url()).pathname,
    bodyChars: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().length,
  });
  results.navigation = { visits: nav, uniqueRoutes: [...seen] };

  await context.close();
} finally {
  await browser.close();
}

fs.writeFileSync(
  `reports/qa-widget-${mode}.json`,
  JSON.stringify(results, null, 2),
);

const summary = {
  mode,
  routesChecked: results.routes.length,
  widgets: results.routes.filter((entry) => entry.widget.present).length,
  widgetsNotFullyInViewport: results.routes.filter(
    (entry) => entry.widget.present && !entry.widget.fullyInViewport,
  ).length,
  widgetsOverImage: results.routes.filter(
    (entry) => entry.widget.present && entry.widget.overlapsImagePx2 > 500,
  ).length,
  translucentWidgets: results.routes.filter(
    (entry) => entry.widget.present && !entry.widget.opaque,
  ).length,
  overflowRoutes: results.routes.filter((entry) => entry.widget.docOverflow).length,
  consoleErrors: results.console.length,
  networkFailures: results.network.length,
  functional: results.functional,
};
console.log(JSON.stringify(summary, null, 2));
