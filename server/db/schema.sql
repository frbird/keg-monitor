-- Keg Monitor schema
-- SQLite

-- Local admin users (username, bcrypt hash, created_at)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Beer library
CREATE TABLE IF NOT EXISTS beers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brewery TEXT NOT NULL,
  beer_style TEXT NOT NULL,
  name TEXT NOT NULL,
  purchase_business TEXT,
  business_email TEXT,
  business_phone TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(brewery, name)
);

-- Keg size presets (name -> total ounces)
CREATE TABLE IF NOT EXISTS keg_sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  ounces INTEGER NOT NULL
);

INSERT OR IGNORE INTO keg_sizes (name, ounces) VALUES
  ('Half Barrel', 1984),
  ('Quarter Barrel', 992),
  ('Sixth Barrel', 661),
  ('Cornelius (5 gal)', 640),
  ('Pin (5.4 gal)', 691),
  ('Mini Keg (1.32 gal)', 169);

-- Taps (physical tap positions; each has current keg state)
CREATE TABLE IF NOT EXISTS taps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  keg_size_id INTEGER NOT NULL REFERENCES keg_sizes(id),
  beer_id INTEGER REFERENCES beers(id),
  total_ounces INTEGER NOT NULL,
  remaining_ounces REAL NOT NULL,
  device_id TEXT,
  device_tap_index INTEGER DEFAULT 0,
  flow_pin INTEGER,
  temp_pin INTEGER,
  pulses_per_ounce REAL DEFAULT 1.0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Temperature readings (from hardware)
CREATE TABLE IF NOT EXISTS temperature_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tap_id INTEGER NOT NULL REFERENCES taps(id),
  celsius REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Pour events (from flow sensor pulses)
CREATE TABLE IF NOT EXISTS pour_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tap_id INTEGER NOT NULL REFERENCES taps(id),
  ounces REAL NOT NULL,
  pulses INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Hardware devices (Arduino R4 WiFi) - for auth when receiving metrics
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  name TEXT,
  last_seen_at TEXT,
  board_model TEXT,
  board_info TEXT,
  sensor_config TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_temperature_tap ON temperature_readings(tap_id);
CREATE INDEX IF NOT EXISTS idx_temperature_created ON temperature_readings(created_at);
CREATE INDEX IF NOT EXISTS idx_pour_tap ON pour_events(tap_id);
CREATE INDEX IF NOT EXISTS idx_pour_created ON pour_events(created_at);
