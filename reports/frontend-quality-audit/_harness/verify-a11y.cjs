const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(process.cwd(), "apps/api/node_modules/@playwright/test"));

const BASE = "http://localhost:5173";
const DATA = path.join(process.cwd(), "reports/frontend-quality-audit/data");
fs.mkdirSync(DATA, { recursive: true });

const states = [
  { name: "home", path: "/" },
  { name: "stay", path: "/stay" },
  { name: "login", path: "/login" },
  { name: "404", path: "/does-not-exist" },
];

(async () => {
  const browser = await chromium.launch();
  const report = { generatedAt: new Date().toISOString(), runs: [] };

  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript((value) => {
      try {
        localStorage.setItem("rivr-theme", value);
      } catch {
        /* optional */
      }
    }, theme);
    const page = await context.newPage();

    for (const state of states) {
      await page.goto(`${BASE}${state.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1400);
      await page.addScriptTag({
        url: "https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js",
      });
      const result = await page.evaluate(async () => {
        const axe = window.axe;
        const run = await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          },
        });
        return run.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          targets: violation.nodes.slice(0, 8).map((node) => node.target.join(" ")),
        }));
      });
      report.runs.push({ theme, state: state.name, violations: result });
    }

    if (theme === "light") {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      report.cta = await page.evaluate(() => {
        const link = [...document.querySelectorAll("a")].find((a) =>
          /explore the house/i.test(a.textContent || ""),
        );
        if (!link) return null;
        const style = getComputedStyle(link);
        return { color: style.color, background: style.backgroundColor };
      });
    }
    await context.close();
  }

  fs.writeFileSync(path.join(DATA, "a11y-after.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
