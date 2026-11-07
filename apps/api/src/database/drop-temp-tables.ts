import { pool } from "./client";

async function dropTables() {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("DROP TABLE IF EXISTS restaurant_menu_items, restaurant_menu_categories");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("Tables dropped: restaurant_menu_items, restaurant_menu_categories");
  await pool.end();
}

dropTables().catch((err) => {
  console.error("Failed to drop tables:", err);
  process.exit(1);
});