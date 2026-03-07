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
}

runMigrations();

module.exports = { db, runMigrations };
