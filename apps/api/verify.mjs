import mysql from 'mysql2/promise';
const pool = await mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'Pribca@2026',
  database: 'rivr_hotel'
);

// Restaurant menu tables columns
try { const [catCols] = await pool.query("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant_menu_categories' ORDER BY ORDINAL_POSITION"); console.log('=== RESTAURANT_MENU_CATEGORIES_COLS ==='); console.log(JSON.stringify(catCols, null, 2)); } catch(e) { console.log('RESTAURANT_MENU_CATS_ERROR:' + e.message); }

try { const [itemCols] = await pool.query("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant_menu_items' ORDER BY ORDINAL_POSITION"); console.log('=== RESTAURANT_MENU_ITEMS_COLS ==='); console.log(JSON.stringify(itemCols, null, 2)); } catch(e) { console.log('RESTAURANT_MENU_ITEMS_ERROR:' + e.message); }

// Restaurant menu tables indexes
try { const [catIdx] = await pool.query("SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant_menu_categories' ORDER BY INDEX_NAME, ORDINAL_POSITION"); console.log('=== RESTAURANT_MENU_CATS_IDX ==='); console.log(JSON.stringify(catIdx, null, 2)); } catch(e) { console.log('RESTAURANT_MENU_CATS_IDX_ERROR:' + e.message); }

try { const [itemIdx] = await pool.query("SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant_menu_items' ORDER BY INDEX_NAME, ORDINAL_POSITION"); console.log('=== RESTAURANT_MENU_ITEMS_IDX ==='); console.log(JSON.stringify(itemIdx, null, 2)); } catch(e) { console.log('RESTAURANT_MENU_ITEMS_IDX_ERROR:' + e.message); }

// Restaurant menu FK check
try { const [catFK] = await pool.query("SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME IN ('restaurant_menu_categories','restaurant_menu_items')"); console.log('=== RESTAURANT_MENU_FKS ==='); console.log(JSON.stringify(catFK, null, 2)); } catch(e) { console.log('RESTAURANT_MENU_FKS_ERROR:' + e.message); }

// Row counts for key tables
try { const [usersCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM users'); console.log('=== USERS_CNT ==='); console.log(JSON.stringify(usersCnt, null, 2)); } catch(e) { console.log('USERS_CNT_ERROR:' + e.message); }

try { const [staffCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM staff'); console.log('=== STAFF_CNT ==='); console.log(JSON.stringify(staffCnt, null, 2)); } catch(e) { console.log('STAFF_CNT_ERROR:' + e.message); }

try { const [hkCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM housekeeping_tasks'); console.log('=== HOUSEKEEPING_CNT ==='); console.log(JSON.stringify(hkCnt, null, 2)); } catch(e) { console.log('HOUSEKEEPING_CNT_ERROR:' + e.message); }

try { const [invCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM inventory'); console.log('=== INVENTORY_CNT ==='); console.log(JSON.stringify(invCnt, null, 2)); } catch(e) { console.log('INVENTORY_CNT_ERROR:' + e.message); }

try { const [ssCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM system_settings'); console.log('=== SYSSETTINGS_CNT ==='); console.log(JSON.stringify(ssCnt, null, 2)); } catch(e) { console.log('SYSSETTINGS_CNT_ERROR:' + e.message); }

try { const [rolesCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM roles'); console.log('=== ROLES_CNT ==='); console.log(JSON.stringify(rolesCnt, null, 2)); } catch(e) { console.log('ROLES_CNT_ERROR:' + e.message); }

try { const [rmCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM room_types'); console.log('=== ROOM_TYPES_CNT ==='); console.log(JSON.stringify(rmCnt, null, 2)); } catch(e) { console.log('ROOM_TYPES_CNT_ERROR:' + e.message); }

try { const [roomsCnt] = await pool.query('SELECT COUNT(*) AS cnt FROM rooms'); console.log('=== ROOMS_CNT ==='); console.log(JSON.stringify(roomsCnt, null, 2)); } catch(e) { console.log('ROOMS_CNT_ERROR:' + e.message); }

console.log('=== DONE_VERIFICATION ===');

pool.end();