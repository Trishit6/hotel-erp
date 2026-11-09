import { createApp } from "./app";
import { env } from "./config/env";
import { closeDatabase } from "./database/client";
import { migrate } from "./database/migrate";
import { ensureDatabaseExists } from "./database/reset";
import { expirePublicReservationHolds, HOLD_CLEANUP_INTERVAL_MS } from "./services/reservationHolds";

async function main() {
  if (!env.isProduction) {
    await ensureDatabaseExists();
    const applied = await migrate();
    if (applied.length) console.log(`[api] applied migrations: ${applied.join(", ")}`);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] RIVR API listening on http://localhost:${env.port}`);
    console.log(`[api] Allowed web origins: ${env.webOrigins.join(", ")}`);
  });

  const runHoldCleanup = () => {
    void expirePublicReservationHolds().catch(() => {
      // Never log reservation details from the cleanup job.
      console.error("[api] public reservation hold cleanup failed");
    });
  };
  runHoldCleanup();
  const holdCleanupTimer = setInterval(runHoldCleanup, HOLD_CLEANUP_INTERVAL_MS);
  holdCleanupTimer.unref();

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down.`);
    clearInterval(holdCleanupTimer);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[api] failed to start:", error);
  process.exitCode = 1;
});
