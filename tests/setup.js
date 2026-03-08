/**
 * Set test env and DB path before any server code runs.
 * Server is loaded in setupAfterEnv so the DB is opened only once.
 */
const path = require('path');
const os = require('os');

process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(os.tmpdir(), 'keg-monitor-test.db');
