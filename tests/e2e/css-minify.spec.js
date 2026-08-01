// CSS-Minify-Regressionstest: Verlaufsschrift muss die Minifizierung überleben.
//
// Hintergrund (Leitplanke 3): csso hat schon einmal die `background`-Kurzform
// hinter `background-clip: text` geschoben und damit die Hero-Verlaufsschrift
// in massive Farbblöcke verwandelt — lokal unsichtbar, live kaputt (ae3f624).
// Diese Suite prüft deshalb IMMER gegen das MINIFIZIERTE Ergebnis:
//   1. Statisch: keine background-Kurzform in Regeln mit background-clip:text.
//   2. Live: Seite mit minifiziertem CSS laden und computed styles messen.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openApp } = require('./helpers');

const ROOT = path.join(__dirname, '..', '..');
let minifiedCss = null;

// Identischer Aufruf wie im Deploy (ionos-deploy.yml): csso-cli gepinnt,
// --no-restructure ist PFLICHT.
function minify() {
  if (minifiedCss) return minifiedCss;
  const tmp = path.join(os.tmpdir(), `eb-min-${process.pid}.css`);
  execFileSync('npx', ['--yes', 'csso-cli@4.0.2', '--no-restructure', 'styles.css', '-o', tmp], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000,
  });
  minifiedCss = fs.readFileSync(tmp, 'utf8');
  fs.unlinkSync(tmp);
  return minifiedCss;
}

/** Alle Regel-Blöcke eines CSS extrahieren (naiv, reicht für Deklarations-Checks). */
function ruleBlocks(css) {
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    blocks.push({ selector: m[1].trim(), body: m[2] });
  }
  return blocks;
}

test.describe('CSS-Minifizierung: Verlaufsschrift', () => {
  test('Minifiziertes CSS entsteht und ist deutlich kleiner als das Original', () => {
    const min = minify();
    const orig = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    expect(min.length).toBeGreaterThan(10000);
    expect(min.length, 'Minifizierung muss real verkleinern').toBeLessThan(orig.length * 0.95);
  });

  test('Keine background-Kurzform in Regeln mit background-clip:text (min. CSS)', () => {
    const min = minify();
    const verletzer = [];
    for (const { selector, body } of ruleBlocks(min)) {
      if (!/background-clip\s*:\s*text/i.test(body)) continue;
      // Die Kurzform `background:` setzt background-clip zurück — in einer
      // Verlaufsschrift-Regel ist sie IMMER ein Fehler, egal an welcher Stelle.
      if (/(^|;)\s*background\s*:/i.test(body)) {
        verletzer.push(selector);
      }
    }
    expect(verletzer, `background-Kurzform neben background-clip:text gefunden — Verlaufsschrift bricht nach Minify: ${verletzer.join(', ')}`).toEqual([]);
  });

  test('Live-Check: Hero-Verlaufsschrift rendert mit MINIFIZIERTEM CSS korrekt', async ({ page }) => {
    const min = minify();
    // styles.css durch die minifizierte Fassung ersetzen — exakt wie live
    await page.route('**/styles.css*', (route) => {
      route.fulfill({ status: 200, contentType: 'text/css', body: min });
    });
    const errors = await openApp(page);
    await page.waitForSelector('.ai-hero-brand', { timeout: 10000 });

    for (const sel of ['.ai-hero-brand', '.ai-hero-gradient']) {
      const style = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          backgroundImage: cs.backgroundImage,
          textFillColor: cs.webkitTextFillColor,
          backgroundClip: cs.webkitBackgroundClip || cs.backgroundClip,
        };
      }, sel);
      expect(style, `${sel} muss im DOM existieren`).not.toBeNull();
      // Der historische Bruch: backgroundImage wird 'none' bzw. clip nicht 'text'
      // → statt Verlaufsschrift ein massiver Farbblock.
      expect(style.backgroundImage, `${sel}: Verlauf muss erhalten bleiben`).toContain('gradient');
      expect(style.backgroundClip, `${sel}: background-clip muss 'text' bleiben`).toBe('text');
      expect(style.textFillColor, `${sel}: text-fill muss transparent bleiben`).toMatch(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/);
    }
    expect(errors).toEqual([]);
  });

  test('styles.css Quelle: Verlaufsschrift-Regeln nutzen background-image, nie die Kurzform', () => {
    // Leitplanke 3, präventiv an der Quelle: wer eine neue Verlaufsschrift
    // hinzufügt, muss background-image verwenden.
    const src = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    const verletzer = [];
    for (const { selector, body } of ruleBlocks(src)) {
      if (!/background-clip\s*:\s*text/i.test(body)) continue;
      if (/(^|;)\s*background\s*:/i.test(body)) verletzer.push(selector);
    }
    expect(verletzer, `Kurzform in Verlaufsschrift-Regel (Quelle): ${verletzer.join(', ')}`).toEqual([]);
  });
});
