// @ts-check
const { defineConfig } = require('@playwright/test');

// Requires a local MongoDB reachable at backend/.env's MONGODB_URI (see backend/.env.example).
// Starts the real backend (backend/server.js) and serves frontend/ as a static site on :5500,
// matching the CORS allowlist in backend/server.js.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5500',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node server.js',
      cwd: '../backend',
      url: 'http://localhost:5001/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'python3 -m http.server 5500',
      cwd: '../frontend',
      url: 'http://localhost:5500/login.html',
      reuseExistingServer: true,
      timeout: 15000,
    },
  ],
});
