import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['./scripts/public-reporter.mjs']],
  use: {
    baseURL: process.env.BASE_URL || 'https://lht574.cn',
    browserName: 'chromium',
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    viewport: { width: 1440, height: 1000 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off'
  }
});
