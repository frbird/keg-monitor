#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { runMigrations } = require('../db');
const { createUser } = require('../auth');

runMigrations();
console.log('Database initialized.');

const defaultUser = process.env.ADMIN_USERNAME || 'admin';
const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
if (createUser(defaultUser, defaultPassword)) {
  console.log(`Created default user: ${defaultUser}. Change password after first login.`);
} else {
  console.log('Default user already exists or createUser not available.');
}
