// Playwright-Konfiguration — Eventbörse Testsuite
//
// Die Tests laufen gegen die lokale Dev-Shell (index.html, generiert aus
// app-shell.html). Kein Build-Schritt: python3 -m http.server genügt.
// Backend-gebundene Flows (Login, Stripe live) laufen hier NICHT —
// getestet wird alles, was der Browser ohne WordPress kann.
const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');

// Chromium-Binary robust bestimmen.
// Grund: Playwright erwartet eine exakte Browser-Build-Nummer. Umgebungen mit
// vorinstallierten Browsern (Agent-Container, manche CI-Images) liefern eine
// andere Nummer oder nur das volle Chromium ohne headless-shell — dann bricht
// der Start mit "Executable doesn't exist" ab, obwohl ein Browser da ist.
// Reihenfolge: PW_CHROMIUM_PATH > bekannter Symlink > Playwright-Standard.
function chromiumPath() {
  const candidates = [process.env.PW_CHROMIUM_PATH, '/opt/pw-browsers/chromium'];
  for (const c of candidates) {
    try { if (c && fs.existsSync(c)) return fs.realpathSync(c); } catch { /* weiter */ }
  }
  return undefined; // Playwright entscheidet selbst
}
const CHROMIUM = chromiumPath();

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
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        ...(CHROMIUM ? { launchOptions: { executablePath: CHROMIUM } } : {}),
      },
    },
  ],
});
