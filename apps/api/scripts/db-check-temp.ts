import "dotenv/config";
import mysql from "mysql2/promise";

async function check(port: number) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port,
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
  });
  try {
    const [versionRows] = await connection.query("SELECT VERSION() AS version");
    const [dbRows] = await connection.query("SHOW DATABASES");
    const databases = (dbRows as { Database: string }[]).map((row) => row.Database).filter((name) => name.startsWith("rivr"));
    const [tableRows] = await connection.query(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?",
      [process.env.DB_NAME ?? "rivr_hotel"],
    );
    const [migrationRows] = await connection.query(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'schema_migrations'",
      [process.env.DB_NAME ?? "rivr_hotel"],
    );
    console.log(JSON.stringify({
      port,
      version: (versionRows as { version: string }[])[0]?.version,
      databases,
      appTableCount: Number((tableRows as { count: number }[])[0]?.count ?? 0),
      hasMigrations: Number((migrationRows as { count: number }[])[0]?.count ?? 0) > 0,
    }));
  } finally {
    await connection.end();
  }
}

async function main() {
  for (const port of [3306, 3307]) {
    try {
      await check(port);
    } catch (error) {
      console.log(JSON.stringify({ port, error: (error as Error).message }));
    }
  }
}

void main();
