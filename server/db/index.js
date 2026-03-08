const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'keg.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = require('fs').readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  // Add new device columns for existing DBs (ignore if already present)
  const deviceColumns = [
    ['last_seen_at', 'TEXT'],
    ['board_model', 'TEXT'],
    ['board_info', 'TEXT'],
    ['sensor_config', 'TEXT']
  ];
  for (const [col, type] of deviceColumns) {
    try {
      db.exec(`ALTER TABLE devices ADD COLUMN ${col} ${type}`);
    } catch (e) {
      if (!/duplicate column name/i.test(e.message)) throw e;
    }
  }
  // Suppliers table (if not exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      website TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try {
    db.exec('ALTER TABLE beers ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)');
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  try {
    db.exec('ALTER TABLE suppliers ADD COLUMN website TEXT');
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  const settingDefaults = [
    ['dashboard_title', 'Keg Monitor'],
    ['dashboard_logo_url', ''],
    ['dashboard_show_keg_size', 'true'],
    ['dashboard_temp_unit', 'F'],
    ['dashboard_show_device', 'false']
  ];
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of settingDefaults) {
    ins.run(k, v);
  }
}

runMigrations();

module.exports = { db, runMigrations, dataDir: dir };
