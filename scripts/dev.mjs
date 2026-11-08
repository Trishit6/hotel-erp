import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";
const healthUrl = new URL("/api/health", apiTarget).toString();

const children = [];
let shuttingDown = false;
let webStarted = false;

function run(name, command, args) {
  const child = isWindows
    ? spawn([command, ...args].join(" "), {
        stdio: "inherit",
        shell: true,
        env: process.env,
      })
    : spawn(command, args, {
        stdio: "inherit",
        env: process.env,
      });

  child.on("error", (error) => {
    console.error(`[dev] ${name} failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[dev] ${name} exited${signal ? ` (${signal})` : ` with code ${code}`}. Stopping the other process.`,
    );
    shutdown(code ?? 1);
  });

  children.push({ name, child });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of children) {
    if (child.exitCode !== null || child.killed) continue;
    if (isWindows && child.pid) {
      // `tsx watch` and Vite both spawn child processes; kill the whole tree.
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(code), 300);
}

function startWeb() {
  if (webStarted || shuttingDown) return;
  webStarted = true;
  run("web", "pnpm", ["run", "dev:web"]);
}

async function waitForApi() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline && !shuttingDown) {
    try {
      // Any HTTP response means the API process is listening. A 503 is still
      // useful: the frontend can start while the database is being fixed.
      await fetch(healthUrl, { signal: AbortSignal.timeout(1_000) });
      console.log("[dev] API is ready; starting the frontend.");
      startWeb();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  if (!shuttingDown) {
    console.warn(`[dev] API did not respond at ${healthUrl}; starting the frontend anyway.`);
    startWeb();
  }
}

async function apiIsAlreadyRunning() {
  try {
    // A 503 still means the API process is listening (usually the database is down).
    await fetch(healthUrl, { signal: AbortSignal.timeout(1_000) });
    return true;
  } catch {
    return false;
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  if (await apiIsAlreadyRunning()) {
    console.log(`[dev] API already running at ${healthUrl}; starting only the frontend.`);
    startWeb();
    return;
  }

  console.log(`[dev] starting the API (waiting for ${healthUrl})...`);
  run("api", "pnpm", ["run", "dev:api"]);
  await waitForApi();
}

void main();
