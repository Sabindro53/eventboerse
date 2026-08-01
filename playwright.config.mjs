// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright-Konfiguration fuer die Eventboerse-SPA.
 *
 * Der webServer startet einen simplen Python-HTTP-Server, der die statische
 * SPA-Shell (index.html + app.js + styles.css) aus dem Repo ausliefert.
 * Backend-Aufrufe (/wp-json/...) sind absichtlich nicht verfuegbar — die
 * Smoke-Tests pruefen ausschliesslich die Client-seitigen Render-Pfade,
 * die auf Demo-Daten fallen zurueck, wenn die REST-API 404 liefert.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Falls eine vorinstallierte Chromium-Binary vorhanden ist
        // (z. B. Managed Sandbox oder eigener Runner), diese nutzen
        // statt einen Download zu erzwingen. In der GitHub-Action
        // laeuft davor `npx playwright install --with-deps chromium`.
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8000/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
