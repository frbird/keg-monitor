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
}

runMigrations();

module.exports = { db, runMigrations, dataDir: dir };
