import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: [
        '--ignore-certificate-errors',
        '--host-resolver-rules=MAP deposit-drawdown-ledger.sociobot.in 127.0.0.1',
      ],
    },
  },
  webServer: [
    { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120_000 },
    { command: 'npm run build && npm run preview:https', url: 'https://127.0.0.1:4174', reuseExistingServer: false, ignoreHTTPSErrors: true, timeout: 120_000 },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
});
