import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: [
    {
      command: 'node --import tsx scripts/test-server.ts',
      env: { PORTFOLIO_TEST_RUNTIME: '1' },
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5174',
      env: { PORTFOLIO_TEST_RUNTIME: '1' },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/development.spec.ts',
      use: { browserName: 'chromium' },
    },
    {
      name: 'development',
      testMatch: '**/development.spec.ts',
      use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:5174' },
    },
  ],
});
