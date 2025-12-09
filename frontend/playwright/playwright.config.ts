/// <reference types="node" />   // 👈 agrega ESTA LÍNEA ARRIBA

import { defineConfig, devices } from '@playwright/test';

// Usamos BASE_URL desde env (Docker/Jenkins) o localhost en dev
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './playwright/e2e',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: 'list',
});
