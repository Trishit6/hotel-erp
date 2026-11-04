import { createApp } from "./app";
import { env } from "./config/env";
import { closeDatabase } from "./database/client";
import { migrate } from "./database/migrate";
import { ensureDatabaseExists } from "./database/reset";

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

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down.`);
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
