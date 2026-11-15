const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(process.cwd(), "apps/api/node_modules/@playwright/test"));

const BASE = "http://localhost:5173";
const OUT = path.join(process.cwd(), "reports/frontend-quality-audit/screens");
const DATA = path.join(process.cwd(), "reports/frontend-quality-audit/data");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1366", width: 1366, height: 768 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
];

const routes = [
  { name: "home", path: "/" },
  { name: "stay", path: "/stay" },
  { name: "rooms", path: "/rooms" },
  { name: "booking", path: "/booking" },
  { name: "login", path: "/login" },
  { name: "about", path: "/about" },
  { name: "amenities", path: "/amenities" },
  { name: "contact", path: "/contact" },
  { name: "my-bookings", path: "/my-bookings" },
  { name: "404", path: "/this-route-is-not-real" },
];

const measure = () =>
  ({
    hScroll: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    docHeight: document.documentElement.scrollHeight,
    headingsClipped: [...document.querySelectorAll("main h1, main h2, main h3")]
      .filter((el) => el.scrollWidth > el.clientWidth + 2)
      .map((el) => (el.textContent || "").trim().slice(0, 60)),
    hiddenLarge: [...document.querySelectorAll("main *, footer *")]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          style.opacity === "0" &&
          style.visibility !== "hidden" &&
          rect.width * rect.height > 40000
        );
      })
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 50)}`)
      .slice(0, 5),
    brokenImages: [...document.images]
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.alt || img.src)
      .slice(0, 5),
  });

(async () => {
  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), results: [], consoleErrors: [] };

  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    await context.addInitScript((value) => {
      try {
        localStorage.setItem("rivr-theme", value);
      } catch {
        /* optional */
      }
    }, theme);

    const apiCache = new Map();
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") return route.continue();
      const key = request.url();
      if (apiCache.has(key)) return route.fulfill(apiCache.get(key));
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers["content-encoding"];
      delete headers["content-length"];
      delete headers["transfer-encoding"];
      const entry = {
        status: response.status(),
        headers,
        body: await response.body(),
      };
      apiCache.set(key, entry);
      return route.fulfill(entry);
    });

    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("401")) {
        report.consoleErrors.push(`${theme}: ${message.text().slice(0, 160)}`);
      }
    });

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of routes) {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(650);
        const info = await page.evaluate(measure);
        report.results.push({ theme, viewport: viewport.name, route: route.name, ...info });
      }
    }

    // Mobile card compositions for the pages called out in the brief.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of ["about", "amenities", "contact", "stay"]) {
      await page.goto(`${BASE}/${name}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      await page.screenshot({
        path: path.join(OUT, `mobile-${name}-${theme}.jpg`),
        type: "jpeg",
        quality: 48,
        fullPage: true,
      });
    }
    await context.close();
  }

  const failures = report.results.filter(
    (row) =>
      row.hScroll !== 0 ||
      row.headingsClipped.length > 0 ||
      row.hiddenLarge.length > 0,
  );
  report.failures = failures;
  fs.writeFileSync(path.join(DATA, "responsive-after.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        combinations: report.results.length,
        failures: failures.map((row) => ({
          theme: row.theme,
          viewport: row.viewport,
          route: row.route,
          hScroll: row.hScroll,
          headingsClipped: row.headingsClipped,
          hiddenLarge: row.hiddenLarge,
        })),
        consoleErrors: report.consoleErrors,
        brokenImages: report.results.filter((row) => row.brokenImages.length),
      },
      null,
      1,
    ),
  );
  await browser.close();
})();
