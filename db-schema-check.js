const mysql = require('mysql2/promise');

async function main() {
  const pool = await mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: 'Pribca@2026',
    database: 'rivr_hotel'
  });
  
  // Check housekeeping_tasks columns
  console.log('=== housekeeping_tasks COLUMNS ===');
  const [hk_cols] = await pool.query(
    'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    ['housekeeping_tasks']
  );
  console.log(JSON.stringify(hk_cols, null, 2));
  
  // Check inventory columns
  console.log('\n=== inventory COLUMNS ===');
  const [inv_cols] = await pool.query(
    'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    ['inventory']
  );
  console.log(JSON.stringify(inv_cols, null, 2));
  
  // Check system_settings columns
  console.log('\n=== system_settings COLUMNS ===');
  const [ss_cols] = await pool.query(
    'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    ['system_settings']
  );
  console.log(JSON.stringify(ss_cols, null, 2));
  
  // Check restaurant_menu_ tables
  console.log('\n=== TABLES EXISTS ===');
  const [tables] = await pool.query('SHOW TABLES');
  console.log(tables.map(t => t.TABLE_NAME).join(', '));
  
  // Check FKs for housekeeping_tasks
  console.log('\n=== housekeeping_tasks FKs ===');
  const [fks] = await pool.query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME = 'housekeeping_tasks'"
  );
  console.log(JSON.stringify(fks, null, 2));
  
  // Check indexes
  console.log('\n=== housekeeping_tasks INDEXES ===');
  const [idxs] = await pool.query(
    "SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'housekeeping_tasks'"
  );
  console.log(JSON.stringify(idxs, null, 2));
  
  await pool.end();
}

main().catch(console.error);