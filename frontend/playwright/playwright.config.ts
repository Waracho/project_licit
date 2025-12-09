/// <reference types="node" />

import { defineConfig, devices } from '@playwright/test';

// 👇 Tomamos BASE_URL desde el entorno (Docker/Jenkins) o usamos localhost en desarrollo
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './playwright/e2e',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,   // 👈 CLAVE: sin esto, '/login' es inválido
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
