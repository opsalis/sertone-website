import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'https://www.sertone.net',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Accept self-signed certs (not needed for live site but good practice)
    ignoreHTTPSErrors: true,
    // Generous timeout for network calls
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 60000,
  expect: {
    timeout: 30000,
  },
});
