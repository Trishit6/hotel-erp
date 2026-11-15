const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(process.cwd(), "apps/api/node_modules/@playwright/test"));

const BASE = "http://localhost:5173";
const OUT = path.join(process.cwd(), "reports/frontend-quality-audit/screens");
fs.mkdirSync(OUT, { recursive: true });

const sampleSections = () =>
  [...document.querySelectorAll("main section")].map((s, i) => {
    const r = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return {
      i,
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      opacity: Number(cs.opacity),
      transform: cs.transform,
      text: (s.innerText || "").replace(/\s+/g, " ").slice(0, 70),
    };
  });

(async () => {
  const browser = await chromium.launch();
  const report = { stay: {}, success: {}, notFound: {}, console: [] };

  // --- Stay page reveal state at load, after scrolling, then back at top ---
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") report.console.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => report.console.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/stay`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  report.stay.load = await page.evaluate(sampleSections);
  report.stay.docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: path.join(OUT, "stay-after-fix-before-scroll.jpg"), type: "jpeg", quality: 52, fullPage: true });

  const docH = report.stay.docHeight;
  for (let y = 0; y < docH; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(900);
  report.stay.afterScroll = await page.evaluate(sampleSections);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "stay-after-fix-scrolled.jpg"), type: "jpeg", quality: 52, fullPage: true });

  // --- Booking confirmation handoff (no reservation is created) ---
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();
  await page2.goto(BASE, { waitUntil: "networkidle" });
  await page2.evaluate(() => {
    sessionStorage.setItem(
      "rivr-booking-confirmation",
      JSON.stringify({
        reference: "RIVR-DIAGNOSTIC1",
        status: "confirmed",
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
        roomTypeName: "Diagnostic Suite",
        roomNumber: "T-01",
        guestFirstName: "Diagnostic",
        total: 12345,
        paidAmount: 0,
        paymentStatus: "pending",
      }),
    );
  });
  await page2.goto(`${BASE}/booking/success`, { waitUntil: "networkidle" });
  await page2.waitForTimeout(1200);
  report.success.heading = await page2.locator("h1").first().innerText();
  report.success.storedAfterLoad = await page2.evaluate(() =>
    sessionStorage.getItem("rivr-booking-confirmation"),
  );
  report.success.url = page2.url();
  await page2.screenshot({ path: path.join(OUT, "booking-success-after-fix.jpg"), type: "jpeg", quality: 62 });
  await page2.reload({ waitUntil: "networkidle" });
  await page2.waitForTimeout(900);
  report.success.headingAfterRefresh = await page2.locator("h1").first().innerText();
  report.success.urlAfterRefresh = page2.url();

  // --- 404 ---
  const page3 = await ctx2.newPage();
  await page3.goto(`${BASE}/this-route-does-not-exist`, { waitUntil: "networkidle" });
  await page3.waitForTimeout(700);
  report.notFound = await page3.evaluate(() => ({
    title: document.title,
    h1Count: document.querySelectorAll("h1").length,
    hasHeader: Boolean(document.querySelector("header")),
    hasFooter: Boolean(document.querySelector("footer")),
    hasToggle: Boolean(document.querySelector('[aria-label*="Switch to"]')),
    text: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 180),
  }));
  await page3.screenshot({ path: path.join(OUT, "not-found-after-fix.jpg"), type: "jpeg", quality: 62 });
  await page3.emulateMedia({ colorScheme: "dark" });
  await page3.evaluate(() => localStorage.setItem("rivr-theme", "dark"));
  await page3.reload({ waitUntil: "networkidle" });
  await page3.waitForTimeout(500);
  await page3.screenshot({ path: path.join(OUT, "not-found-after-fix-dark.jpg"), type: "jpeg", quality: 62 });

  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
