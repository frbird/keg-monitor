#!/usr/bin/env node
// Run DB init then start the server (for Docker)
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const init = spawn(process.execPath, [path.join(__dirname, 'scripts', 'init-db.js')], {
  stdio: 'inherit',
  env: process.env
});
init.on('close', (code) => {
  if (code !== 0) process.exit(code);
  const server = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
    stdio: 'inherit',
    env: process.env
  });
  server.on('close', (c) => process.exit(c));
});
