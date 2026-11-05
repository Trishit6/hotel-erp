import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = "http://localhost:5173";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "rivr-flow-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9227",
  `--user-data-dir=${profile}`, "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p, method = "GET") =>
  (await fetch(`http://127.0.0.1:9227${p}`, { method })).json();

for (let i = 0; i < 40; i++) {
  try { await getJson("/json/version"); break; } catch { await sleep(250); }
}

const target = await getJson(`/json/new?${encodeURIComponent(base + "/")}`, "PUT");
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  else if (msg.method === "Runtime.exceptionThrown") problems.push("EXCEPTION: " + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 220));
  else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") problems.push("CONSOLE: " + msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 220));
};
const send = (method, params = {}) => { const mid = ++id; ws.send(JSON.stringify({ id: mid, method, params })); return new Promise((res) => pending.set(mid, res)); };
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.value;
await new Promise((res) => (ws.onopen = res));
await send("Runtime.enable");
await send("Page.enable");

const runChecks = async (name, fn) => {
  let ok = true, detail = null;
  try { detail = await fn(); } catch (e) { ok = false; detail = e.message; }
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail ? "-> " + detail : ""}`);
  return ok ? detail : null;
};

const visit = async (route) => {
  await send("Page.navigate", { url: base + route });
  await sleep(5500);
};

const checkCatalog = async () => {
  const j = await send("Runtime.evaluate", {
    expression: `(async () => {
      const r = await fetch("${base}/api/public/catalog", { credentials: "include" });
      const t = await r.text();
      return { status: r.status, size: t.length, preview: t.slice(0, 120) };
    })()`,
    awaitPromise: true,
  });
  return JSON.parse(j.result.value);
};

const checkPublicRoomTypes = async () => {
  const j = await send("Runtime.evaluate", {
    expression: `(async () => {
      const r = await fetch("${base}/api/public/room-types", { credentials: "include" });
      const j = await r.json();
      return { status: r.status, count: Array.isArray(j) ? j.length : -1, first: j[0] };
    })()`,
    awaitPromise: true,
  });
  return JSON.parse(j.result.value);
};

await runChecks("GET /api/public/catalog", checkCatalog);
await runChecks("GET /api/public/room-types", checkPublicRoomTypes);

await runChecks("Homepage renders", async () => {
  await visit("/");
  const s = await evaluate(`JSON.stringify({
    hasHero: !!document.querySelector("main section div.relative.grid"),
    h1: document.querySelector("h1")?.innerText?.slice(0,40),
    searchForm: !!document.querySelector('form[aria-label="Search room availability"]')
  })`);
  return s.replace(/\n/g, " ");
});

await runChecks("Rooms page renders", async () => {
  await visit("/rooms");
  const s = await evaluate(`JSON.stringify({
    h1: document.querySelector("h1")?.innerText?.slice(0,30),
    cards: document.querySelectorAll(".room-card, [class*='RoomCard']").length
  })`);
  return s.replace(/\n/g, " ");
});

await runChecks("Stay page renders", async () => {
  await visit("/stay");
  const s = await evaluate(`JSON.stringify({ h1: document.querySelector("h1")?.innerText?.slice(0,30), cards: document.querySelectorAll("article.room-card").length })`);
  return s.replace(/\n/g, " ");
});

await runChecks("Search/booking pages render", async () => {
  await visit("/search?q=x");
  const s = await evaluate(`JSON.stringify({ h1: document.querySelector("h1")?.innerText?.slice(0,30), form: !!document.querySelector('form[aria-label="Search room availability"]') })`);
  return s.replace(/\n/g, " ");
});

console.log("\nRUNTIME PROBLEMS:", problems.length);
for (const p of problems) console.log("-", p);
ws.close();
chrome.kill();
await sleep(400);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
