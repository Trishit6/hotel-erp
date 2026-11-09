import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const BASE = process.env.VISUAL_BASE ?? "http://localhost:5173";
const outDir = process.env.VISUAL_OUT ?? path.resolve("reports/screenshots/premium-audit");
const label = process.env.VISUAL_LABEL ?? "before";
const routes = (process.env.VISUAL_ROUTES ?? "/,/stay,/rooms,/amenities,/about,/contact,/booking,/login,/admin/dashboard")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report = { label, base: BASE, generatedAt: new Date().toISOString(), routes: [] };

async function capture(viewport, name, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  if (options.login) {
    const response = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email: "admin@admin.com", password: "password" },
    });
    if (!response.ok()) consoleErrors.push(`login ${response.status()}: ${await response.text()}`);
  }

  for (const route of routes) {
    const entry = { viewport: name, route, consoleErrors: [], pageErrors: [] };
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(options.settle ?? 1500);
      await page.evaluate(async () => {
        await Promise.all(
          Array.from(document.images)
            .filter((image) => !image.complete)
            .map((image) => new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
              setTimeout(resolve, 4000);
            })),
        );
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(250);

      const metrics = await page.evaluate(() => {
        const images = Array.from(document.images);
        return {
          title: document.title,
          url: location.pathname + location.search,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          bodyHeight: document.body.scrollHeight,
          brokenImages: images
            .filter((image) => image.complete && image.naturalWidth === 0)
            .map((image) => image.currentSrc || image.src),
          imageCount: images.length,
          hasHero: Boolean(document.querySelector(".pagehero-line, .hero-title-line")),
          atmosphere: Boolean(document.querySelector(".page-atmosphere")),
          opacityRoot: getComputedStyle(document.body).opacity,
        };
      });
      entry.metrics = metrics;
      entry.consoleErrors = [...consoleErrors];
      entry.pageErrors = [...pageErrors];

      const slug = route === "/" ? "home" : route.replace(/^\//, "").replaceAll("/", "-");
      const file = path.join(outDir, `${label}-${slug}-${name}.png`);
      await page.screenshot({ path: file, fullPage: options.fullPage ?? false });
      entry.screenshot = path.relative(process.cwd(), file);

      if (options.fullPage) {
        const full = path.join(outDir, `${label}-${slug}-${name}-full.png`);
        await page.screenshot({ path: full, fullPage: true });
        entry.fullScreenshot = path.relative(process.cwd(), full);
      }
    } catch (error) {
      entry.error = String(error);
    }
    report.routes.push(entry);
  }

  await context.close();
}

await capture({ width: 1440, height: 900 }, "desktop", { login: true, fullPage: true });
await capture({ width: 1024, height: 768 }, "tablet", { login: true });
await capture({ width: 390, height: 844 }, "mobile", { login: true });
await capture({ width: 1440, height: 900 }, "reduced", { login: true, reducedMotion: "reduce" });

await browser.close();

const fs = await import("node:fs/promises");
await fs.writeFile(path.join(outDir, `audit-${label}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
