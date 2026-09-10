import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4179', browserName: 'chromium', channel: 'chrome', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: { command: 'pnpm dev --host 127.0.0.1 --port 4179 --strictPort', url: 'http://127.0.0.1:4179', reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 } },
});
