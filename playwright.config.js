import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests/playwright',
  use: {
    baseURL: 'http://localhost:5001',
  },
});
