// Playwright-Konfiguration — Eventbörse Testsuite
//
// Die Tests laufen gegen die lokale Dev-Shell (index.html, generiert aus
// app-shell.html). Kein Build-Schritt: python3 -m http.server genügt.
// Backend-gebundene Flows (Login, Stripe live) laufen hier NICHT —
// getestet wird alles, was der Browser ohne WordPress kann.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8000',
    // Animationen (Feuerwerk, Marquee, Hero-Montage) beruhigen → stabile Tests
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 900 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  webServer: {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8000/index.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
