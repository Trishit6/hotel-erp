import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const outDir = path.resolve("reports/screenshots/premium-experiments");
await mkdir(outDir, { recursive: true });

const files = [
  ["direction-a-cinematic", "A · Cinematic Luxury"],
  ["direction-b-editorial", "B · Editorial Luxury"],
  ["direction-c-immersive", "C · Modern Immersive"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });

for (const [slug, name] of files) {
  await page.goto(pathToFileURL(path.resolve(`reports/visual-experiments/${slug}.html`)).href, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(outDir, `${slug}.jpg`),
    type: "jpeg",
    quality: 78,
    fullPage: true,
  });
  console.log(name, "captured");
}

await browser.close();
