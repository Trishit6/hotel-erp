const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const pool = await mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: 'Pribca@2026',
    database: 'rivr_hotel'
  });

  // Show tables
  const [tables] = await pool.query('SHOW TABLES');
  console.log('=== TABLES ===');
  console.log(tables.map(t => t.TABLE_NAME).join(', '));

  // Count rows in each wanted table
  const wanted = ['roles', 'users', 'staff', 'sessions', 'system_settings', 
    'room_types', 'room_type_amenities', 'rooms', 'guests', 'reservations', 
    'payments', 'invoices', 'housekeeping_tasks', 'inventory', 'expenses',
    'restaurant_orders', 'attendance', 'activity_logs'];

  console.log('\n=== ROW COUNTS ===');
  for (const t of wanted) {
    try {
      const [r] = await pool.query('SELECT COUNT(*) AS n FROM ??', [t]);
      console.log('COUNT ' + t + ' = ' + r[0].n);
    } catch (e) {
      console.log('COUNT ' + t + ' = ERROR ' + e.code);
    }
  }

  // System settings
  console.log('\n=== SYSTEM SETTINGS ===');
  const [settings] = await pool.query('SELECT * FROM system_settings');
  console.log(JSON.stringify(settings[0], null, 2));

  // Migrations
  console.log('\n=== MIGRATIONS ===');
  const [migrations] = await pool.query('SELECT filename, applied_at FROM schema_migrations ORDER BY filename');
  console.log(JSON.stringify(migrations, null, 2));

  // Column details for key tables
  console.log('\n=== KEY TABLE COLUMNS ===');
  for (const table of ['users', 'staff', 'system_settings', 'restaurant_orders', 'inventory', 'housekeeping_tasks']) {
    const [cols] = await pool.query(
      'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
      [table]
    );
    console.log('COLUMNS ' + table + ':', JSON.stringify(cols));
  }

  // Foreign keys
  console.log('\n=== FOREIGN KEYS ===');
  const [fk] = await pool.query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, CONSTRAINT_NAME"
  );
  console.log(JSON.stringify(fk, null, 2));

  await pool.end();
}

main().catch(console.error);