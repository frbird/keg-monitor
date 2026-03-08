/**
 * Load the app (opens DB once) and seed admin + device for API tests.
 */
require('../server/index.js');
const { createUser } = require('../server/auth');
const { createDevice } = require('../server/device-auth');

createUser('admin', 'admin');
createDevice('test-device', 'test-secret');
