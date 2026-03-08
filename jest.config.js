/** Jest config for Keg Monitor API tests. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/client/'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  maxWorkers: 1,
  verbose: true,
  collectCoverageFrom: ['server/**/*.js', '!server/scripts/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
