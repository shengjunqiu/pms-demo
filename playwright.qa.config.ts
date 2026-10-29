import { defineConfig } from '@playwright/test';

/**
 * QA 专用配置：复用已经运行的 Vite dev server（默认 5173），不自动拉起 webServer，
 * 便于多个角色 lane 并发跑各自 spec。业务状态在每个 page load 内新建，互不影响。
 */
export default defineConfig({
  testDir: './e2e/qa',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: 'list',
  use: {
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    baseURL: process.env.PMS_QA_BASE_URL || 'http://127.0.0.1:5173',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
});
