const crypto = require('crypto');
const { db } = require('./db');

function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function createDevice(id, secret, name = null) {
  const secretHash = hashSecret(secret);
  const stmt = db.prepare('INSERT OR REPLACE INTO devices (id, secret_hash, name) VALUES (?, ?, ?)');
  stmt.run(id, secretHash, name);
  return { id, secret };
}

function verifyDevice(id, secret) {
  const stmt = db.prepare('SELECT secret_hash FROM devices WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return false;
  return row.secret_hash === hashSecret(secret);
}

module.exports = { hashSecret, createDevice, verifyDevice };
