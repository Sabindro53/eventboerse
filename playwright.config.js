// Playwright-Smoke-Konfiguration.
// Ziel: Regression-Schutz gegen verschwundene Listings/Board-Bugs (P0 aus Roadmap).
// Läuft gegen eine lokal gestartete Python-Serve, greift NICHT auf das echte
// WordPress-Backend zu — API-Antworten werden im Test gemockt.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 8765',
    port: 8765,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
