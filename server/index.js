require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const { db, dataDir } = require('./db');
const { verifyUser } = require('./auth');
const { verifyDevice } = require('./device-auth');
const crypto = require('crypto');
const fs = require('fs');

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const secretFile = path.join(dataDir, '.session_secret');
  try {
    if (fs.existsSync(secretFile)) return fs.readFileSync(secretFile, 'utf8').trim();
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  } catch (e) {
    console.warn('Could not read/write session secret file, using ephemeral secret (sessions invalid after restart):', e.message);
    return crypto.randomBytes(32).toString('hex');
  }
}

const sessionSecret = getSessionSecret();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Serve built frontend
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// --- Public API (dashboard data, no auth) ---
function getDashboardSettings() {
  const rows = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('dashboard_%');
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    title: raw.dashboard_title || 'Keg Monitor',
    logoUrl: raw.dashboard_logo_url || null,
    showKegSize: raw.dashboard_show_keg_size !== 'false',
    tempUnit: raw.dashboard_temp_unit === 'C' ? 'C' : 'F',
    showDevice: raw.dashboard_show_device === 'true'
  };
}

app.get('/api/dashboard', (req, res) => {
  const taps = db.prepare(`
    SELECT t.id, t.name, t.remaining_ounces, t.total_ounces, t.updated_at, t.device_id,
           b.brewery, b.beer_style, b.name AS beer_name, b.logo_url,
           ks.name AS keg_size_name,
           d.board_model AS device_board_model, d.board_info AS device_board_info, d.sensor_config AS device_sensor_config
    FROM taps t
    LEFT JOIN beers b ON t.beer_id = b.id
    LEFT JOIN keg_sizes ks ON t.keg_size_id = ks.id
    LEFT JOIN devices d ON t.device_id = d.id
    ORDER BY t.id
  `).all();

  const temps = db.prepare(`
    SELECT tap_id, celsius FROM (
      SELECT tap_id, celsius, ROW_NUMBER() OVER (PARTITION BY tap_id ORDER BY created_at DESC) rn
      FROM temperature_readings
    ) WHERE rn = 1
  `).all();

  const tempByTap = Object.fromEntries(temps.map(r => [r.tap_id, r.celsius]));

  const data = taps.map(t => ({
    id: t.id,
    name: t.name,
    brewery: t.brewery,
    beerStyle: t.beer_style,
    beerName: t.beer_name,
    logoUrl: t.logo_url || null,
    kegSizeName: t.keg_size_name,
    totalOunces: t.total_ounces,
    remainingOunces: t.remaining_ounces,
    levelPercent: t.total_ounces > 0 ? Math.round(100 * t.remaining_ounces / t.total_ounces) : 0,
    temperatureCelsius: tempByTap[t.id] != null ? tempByTap[t.id] : null,
    updatedAt: t.updated_at,
    deviceBoard: t.device_board_model || null,
    deviceBoardInfo: t.device_board_info || null,
    deviceSensors: t.device_sensor_config ? (() => { try { return JSON.parse(t.device_sensor_config); } catch { return null; } })() : null
  }));

  res.json({ taps: data, settings: getDashboardSettings() });
});

// --- Device API (hardware sends metrics; auth by device id + secret) ---
function deviceAuth(req, res, next) {
  const id = req.headers['x-device-id'];
  const secret = req.headers['x-device-secret'];
  if (!id || !secret || !verifyDevice(id, secret)) {
    return res.status(401).json({ error: 'Invalid device credentials' });
  }
  req.deviceId = id;
  next();
}

app.post('/api/device/metrics', deviceAuth, (req, res) => {
  const { temperatures, pours, deviceInfo } = req.body || {};
  if (!temperatures && !pours) {
    return res.status(400).json({ error: 'Provide temperatures and/or pours' });
  }

  const deviceId = req.deviceId;
  const now = new Date().toISOString();

  // Update device last_seen and optional board/sensor info from device
  const deviceUpdate = db.prepare(`
    UPDATE devices SET last_seen_at = ?,
      board_model = COALESCE(?, board_model),
      board_info = COALESCE(?, board_info),
      sensor_config = COALESCE(?, sensor_config)
    WHERE id = ?
  `);
  let boardModel = null;
  let boardInfo = null;
  let sensorConfigJson = null;
  if (deviceInfo && typeof deviceInfo === 'object') {
    if (deviceInfo.board) boardModel = deviceInfo.board;
    if (deviceInfo.boardInfo != null) boardInfo = typeof deviceInfo.boardInfo === 'string' ? deviceInfo.boardInfo : JSON.stringify(deviceInfo.boardInfo);
    if (deviceInfo.sensors && Array.isArray(deviceInfo.sensors)) {
      sensorConfigJson = JSON.stringify(deviceInfo.sensors);
    }
  }
  deviceUpdate.run(now, boardModel, boardInfo, sensorConfigJson, deviceId);

  const tapsForDevice = db.prepare('SELECT id FROM taps WHERE device_id = ? ORDER BY device_tap_index ASC, id ASC').all(deviceId);
  const tapIdsByIndex = tapsForDevice.map((t) => t.id);

  function tapId(entry, index) {
    if (entry.tapId != null) return entry.tapId;
    return tapIdsByIndex[index] ?? null;
  }

  if (Array.isArray(temperatures)) {
    const ins = db.prepare('INSERT INTO temperature_readings (tap_id, celsius) VALUES (?, ?)');
    const upd = db.prepare('UPDATE taps SET updated_at = ? WHERE id = ?');
    temperatures.forEach((t, i) => {
      const tid = tapId(t, i);
      if (tid != null && typeof t.celsius === 'number') {
        ins.run(tid, t.celsius);
        upd.run(now, tid);
      }
    });
  }

  if (Array.isArray(pours)) {
    const insPour = db.prepare('INSERT INTO pour_events (tap_id, ounces, pulses) VALUES (?, ?, ?)');
    const getTap = db.prepare('SELECT remaining_ounces, pulses_per_ounce FROM taps WHERE id = ?');
    const updTap = db.prepare('UPDATE taps SET remaining_ounces = max(0, remaining_ounces - ?), updated_at = ? WHERE id = ?');
    pours.forEach((p, i) => {
      const tid = tapId(p, i);
      if (tid == null) return;
      const tap = getTap.get(tid);
      if (!tap) return;
      let ounces = Number(p.ounces);
      if (Number.isNaN(ounces) && p.pulses != null && tap.pulses_per_ounce) {
        ounces = p.pulses / tap.pulses_per_ounce;
      }
      if (ounces > 0) {
        insPour.run(tid, ounces, p.pulses || 0);
        updTap.run(ounces, now, tid);
      }
    });
  }

  res.json({ ok: true });
});

// Lightweight keepalive: only updates last_seen_at
app.post('/api/device/heartbeat', deviceAuth, (req, res) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(now, req.deviceId);
  res.json({ ok: true });
});

// --- Admin API (session auth) ---
function adminAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = verifyUser(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ username: user.username });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: req.session.username });
});

// Beers
app.get('/api/admin/beers', adminAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, s.name AS supplier_name, s.email AS supplier_email, s.phone AS supplier_phone, s.website AS supplier_website
    FROM beers b
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    ORDER BY b.brewery, b.name
  `).all();
  res.json(rows);
});

app.post('/api/admin/beers', adminAuth, (req, res) => {
  const { brewery, beer_style, name, supplier_id, purchase_business, business_email, business_phone, logo_url } = req.body || {};
  if (!brewery || !beer_style || !name) return res.status(400).json({ error: 'brewery, beer_style, name required' });
  const stmt = db.prepare(
    'INSERT INTO beers (brewery, beer_style, name, supplier_id, purchase_business, business_email, business_phone, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    brewery, beer_style, name,
    supplier_id || null,
    purchase_business || null, business_email || null, business_phone || null,
    logo_url || null
  );
  res.status(201).json({ id: db.prepare('SELECT last_insert_rowid() as id').get().id });
});

app.put('/api/admin/beers/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid beer id' });
  const { brewery, beer_style, name, supplier_id, purchase_business, business_email, business_phone, logo_url } = req.body || {};
  if (!brewery || !beer_style || !name) return res.status(400).json({ error: 'brewery, beer_style, name required' });
  const stmt = db.prepare(
    'UPDATE beers SET brewery=?, beer_style=?, name=?, supplier_id=?, purchase_business=?, business_email=?, business_phone=?, logo_url=? WHERE id=?'
  );
  const result = stmt.run(brewery, beer_style, name, supplier_id || null, purchase_business || null, business_email || null, business_phone || null, logo_url || null, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Beer not found' });
  res.json({ ok: true });
});

app.delete('/api/admin/beers/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid beer id' });
  const inUse = db.prepare('SELECT id FROM taps WHERE beer_id = ? LIMIT 1').get(id);
  if (inUse) return res.status(400).json({ error: 'Beer is in use on a tap. Unassign it from the tap first.' });
  const stmt = db.prepare('DELETE FROM beers WHERE id = ?');
  const result = stmt.run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Beer not found' });
  res.json({ ok: true });
});

// Suppliers
app.get('/api/admin/suppliers', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  res.json(rows);
});

app.post('/api/admin/suppliers', adminAuth, (req, res) => {
  const { name, email, phone, website } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const stmt = db.prepare('INSERT INTO suppliers (name, email, phone, website) VALUES (?, ?, ?, ?)');
  stmt.run((name || '').trim(), email || null, phone || null, website || null);
  res.status(201).json({ id: db.prepare('SELECT last_insert_rowid() as id').get().id });
});

app.put('/api/admin/suppliers/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone, website } = req.body || {};
  const stmt = db.prepare('UPDATE suppliers SET name=?, email=?, phone=?, website=? WHERE id=?');
  stmt.run((name || '').trim(), email || null, phone || null, website || null, id);
  res.json({ ok: true });
});

app.delete('/api/admin/suppliers/:id', adminAuth, (req, res) => {
  db.prepare('UPDATE beers SET supplier_id = NULL WHERE supplier_id = ?').run(Number(req.params.id));
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Keg sizes
app.get('/api/admin/keg-sizes', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM keg_sizes ORDER BY ounces DESC').all();
  res.json(rows);
});

// Taps
app.get('/api/admin/taps', adminAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, b.brewery, b.name AS beer_name, b.logo_url, ks.name AS keg_size_name, ks.ounces AS keg_ounces
    FROM taps t
    LEFT JOIN beers b ON t.beer_id = b.id
    LEFT JOIN keg_sizes ks ON t.keg_size_id = ks.id
    ORDER BY t.id
  `).all();
  res.json(rows);
});

app.post('/api/admin/taps', adminAuth, (req, res) => {
  const { name, keg_size_id, beer_id, device_id, flow_pin, temp_pin, pulses_per_ounce } = req.body || {};
  const keg = keg_size_id != null ? db.prepare('SELECT ounces FROM keg_sizes WHERE id = ?').get(keg_size_id) : null;
  const ounces = keg ? keg.ounces : 1984;
  const stmt = db.prepare(
    'INSERT INTO taps (name, keg_size_id, beer_id, total_ounces, remaining_ounces, device_id, device_tap_index, flow_pin, temp_pin, pulses_per_ounce) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    name || 'Tap 1',
    keg_size_id ?? 1,
    beer_id || null,
    ounces,
    ounces,
    device_id || null,
    req.body.device_tap_index ?? 0,
    flow_pin ?? 2,
    temp_pin ?? 3,
    pulses_per_ounce ?? 1.0
  );
  res.status(201).json({ id: db.prepare('SELECT last_insert_rowid() as id').get().id });
});

app.put('/api/admin/taps/:id', adminAuth, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const tap = db.prepare('SELECT * FROM taps WHERE id = ?').get(id);
  if (!tap) return res.status(404).json({ error: 'Tap not found' });

  let { name, keg_size_id, beer_id, device_id, flow_pin, temp_pin, pulses_per_ounce, new_keg } = body;

  let total_ounces = tap.total_ounces;
  let remaining_ounces = tap.remaining_ounces;
  if (new_keg === true || keg_size_id != null) {
    const kid = keg_size_id ?? tap.keg_size_id;
    const keg = db.prepare('SELECT ounces FROM keg_sizes WHERE id = ?').get(kid);
    if (keg) {
      total_ounces = keg.ounces;
      remaining_ounces = keg.ounces;
    }
  }

  const stmt = db.prepare(`
    UPDATE taps SET name=?, keg_size_id=?, beer_id=?, total_ounces=?, remaining_ounces=?, device_id=?, device_tap_index=?, flow_pin=?, temp_pin=?, pulses_per_ounce=?, updated_at=datetime('now')
    WHERE id=?
  `);
  stmt.run(
    name ?? tap.name,
    keg_size_id ?? tap.keg_size_id,
    beer_id !== undefined ? beer_id : tap.beer_id,
    total_ounces,
    remaining_ounces,
    device_id !== undefined ? device_id : tap.device_id,
    body.device_tap_index !== undefined ? body.device_tap_index : tap.device_tap_index,
    flow_pin ?? tap.flow_pin,
    temp_pin ?? tap.temp_pin,
    pulses_per_ounce ?? tap.pulses_per_ounce,
    id
  );
  res.json({ ok: true });
});

app.delete('/api/admin/taps/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM taps WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Dashboard settings (admin only)
app.get('/api/admin/dashboard-settings', adminAuth, (req, res) => {
  res.json(getDashboardSettings());
});

app.put('/api/admin/dashboard-settings', adminAuth, (req, res) => {
  const { title, logoUrl, showKegSize, tempUnit, showDevice } = req.body || {};
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  if (title !== undefined) upsert.run('dashboard_title', String(title).trim() || 'Keg Monitor');
  if (logoUrl !== undefined) upsert.run('dashboard_logo_url', logoUrl == null ? '' : String(logoUrl).trim());
  if (showKegSize !== undefined) upsert.run('dashboard_show_keg_size', showKegSize ? 'true' : 'false');
  if (tempUnit !== undefined) upsert.run('dashboard_temp_unit', tempUnit === 'C' ? 'C' : 'F');
  if (showDevice !== undefined) upsert.run('dashboard_show_device', showDevice ? 'true' : 'false');
  res.json(getDashboardSettings());
});

// Devices (for hardware auth)
const DEVICE_CONNECTED_SECONDS = 120; // consider connected if last_seen within 2 min

function getDeviceLatestReadings(deviceId) {
  const tapIds = db.prepare('SELECT id FROM taps WHERE device_id = ? ORDER BY device_tap_index, id').all(deviceId).map(r => r.id);
  if (tapIds.length === 0) return { temperatures: [], pours: [] };
  const placeholders = tapIds.map(() => '?').join(',');
  const temps = db.prepare(`
    SELECT tap_id, celsius, created_at FROM (
      SELECT tap_id, celsius, created_at, ROW_NUMBER() OVER (PARTITION BY tap_id ORDER BY created_at DESC) rn
      FROM temperature_readings WHERE tap_id IN (${placeholders})
    ) WHERE rn = 1
  `).all(...tapIds);
  const pours = db.prepare(`
    SELECT tap_id, ounces, pulses, created_at FROM (
      SELECT tap_id, ounces, pulses, created_at, ROW_NUMBER() OVER (PARTITION BY tap_id ORDER BY created_at DESC) rn
      FROM pour_events WHERE tap_id IN (${placeholders})
    ) WHERE rn = 1
  `).all(...tapIds);
  return { temperatures: temps, pours };
}

app.get('/api/admin/devices', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT id, name, created_at, last_seen_at, board_model, board_info, sensor_config FROM devices ORDER BY created_at').all();
  const now = Date.now() / 1000;
  const devices = rows.map(d => {
    const lastSeen = d.last_seen_at ? new Date(d.last_seen_at).getTime() / 1000 : null;
    const connected = lastSeen != null && (now - lastSeen) <= DEVICE_CONNECTED_SECONDS;
    let sensorConfig = null;
    if (d.sensor_config) try { sensorConfig = JSON.parse(d.sensor_config); } catch {}
    const latest = getDeviceLatestReadings(d.id);
    return {
      id: d.id,
      name: d.name,
      created_at: d.created_at,
      last_seen_at: d.last_seen_at,
      connection_status: connected ? 'connected' : (lastSeen ? 'disconnected' : 'never_seen'),
      board_model: d.board_model,
      board_info: d.board_info,
      sensor_config: sensorConfig,
      latest_temperatures: latest.temperatures,
      latest_pours: latest.pours
    };
  });
  res.json(devices);
});

app.post('/api/admin/devices', adminAuth, (req, res) => {
  const crypto = require('crypto');
  const id = req.body?.id || crypto.randomBytes(8).toString('hex');
  const secret = req.body?.secret || crypto.randomBytes(16).toString('hex');
  const name = req.body?.name || null;
  const { createDevice } = require('./device-auth');
  createDevice(id, secret, name);
  res.status(201).json({ id, secret, name });
});

app.put('/api/admin/devices/:id', adminAuth, (req, res) => {
  const id = String(req.params.id);
  const { name, sensor_config } = req.body || {};
  const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const updates = [];
  const values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name || null); }
  if (sensor_config !== undefined) {
    updates.push('sensor_config = ?');
    values.push(Array.isArray(sensor_config) ? JSON.stringify(sensor_config) : (typeof sensor_config === 'string' ? sensor_config : null));
  }
  if (updates.length) {
    values.push(id);
    db.prepare(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json({ ok: true });
});

app.delete('/api/admin/devices/:id', adminAuth, (req, res) => {
  const id = String(req.params.id);
  db.prepare('UPDATE taps SET device_id = NULL WHERE device_id = ?').run(id);
  db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Keg Monitor server on http://localhost:${PORT}`);
  });
}

module.exports = app;
