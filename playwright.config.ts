import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const STORAGE = path.join(__dirname, 'e2e', '.auth.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3015',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE },
      dependencies: ['setup'],
    },
  ],
});
