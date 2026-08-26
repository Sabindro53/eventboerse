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
  // In CI arbeitet EIN Worker.
  //
  // Am 26.08. wurde die Suite in vier aufeinanderfolgenden Läufen immer
  // langsamer und fiel immer weiter aus — 4,7 min / 2 Fehlschläge, dann
  // 4,6 / 4, dann 5,1 / 5, dann 9,1 min / 19. Lokal blieb sie in jedem
  // Anlauf grün. Betroffen war immer dieselbe Sorte Test: die, die
  // `hq.html` laden.
  //
  // GEMESSEN, nicht vermutet. Der Aufbau des Bereichsrings dauert:
  //
  //   ohne Bremse      1,0 s
  //   4-fache Bremse   2,6 s
  //   10-fache Bremse  6,6 s
  //
  // Das HQ ist also nicht pathologisch langsam, und die 12 s, die der
  // Bereichsring zugestanden bekommt, sind kein knapper Wert — sie tragen
  // rund 18-fache Verlangsamung. Unter Kontention auf dem Runner wird
  // selbst das überschritten: mit `--workers=12` auf vier Kernen fallen
  // lokal exakt dieselben Tests wie in CI.
  //
  // Weniger Worker half messbar (bei 1 und 2 blieb es sauber), aber der
  // Effekt ist verrauscht: einmal lief auch 12 durch, einmal fiel 4. Ein
  // Schalter, der nur meistens hilft, waere keine Loesung — deshalb hier
  // die Grenze, die Kontention ganz beseitigt.
  //
  // DER PREIS ist gemessen, nicht geschaetzt: lokal 6,1 min mit den
  // Vorgabe-Workern gegen 7,5 min mit einem, also rund ein Viertel mehr.
  // Der rote Lauf brauchte 9,1 min und lieferte 19 Fehlschlaege. Ein Tor,
  // das verlaesslich ist, ist mehr wert als eines, das schneller wuerfelt.
  workers: process.env.CI ? 1 : undefined,
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
