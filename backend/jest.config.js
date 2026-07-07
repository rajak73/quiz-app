module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup/db.js'],
  testMatch: ['**/tests/integration/**/*.test.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
