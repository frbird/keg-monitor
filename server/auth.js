const bcrypt = require('bcryptjs');
const { db } = require('./db');

const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function createUser(username, password) {
  const hash = hashPassword(password);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    stmt.run(username, hash);
    return true;
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return false;
    throw e;
  }
}

function findUserByUsername(username) {
  const stmt = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
  return stmt.get(username);
}

function verifyUser(username, password) {
  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return { id: user.id, username: user.username };
}

module.exports = { hashPassword, verifyPassword, createUser, findUserByUsername, verifyUser };
