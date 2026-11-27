import { defineConfig } from '@playwright/test';

const BACKEND_URL = process.env.ROLEITO_E2E_BACKEND ?? 'http://localhost:8000';
const BACKEND_PORT = new URL(BACKEND_URL).port || '8000';

export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 5 : 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // Toda la suite navega la UI en español (la app traduce por navigator.language
    // vía i18n); fijar el locale evita que specs sin `test.use({ locale })` vean
    // la interfaz en inglés a medida que los textos migran a claves.
    locale: 'es-ES',
  },
  webServer: [
    {
      command: 'npm run dev:dm',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `${process.env.CI ? 'npm run dev:backend:ci' : 'npm run dev:backend'} -- --port ${BACKEND_PORT}`,
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
