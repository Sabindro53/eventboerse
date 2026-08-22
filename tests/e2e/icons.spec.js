// Die zugeschnittene Icon-Schrift: zeigt sie noch alle Symbole?
//
// Die ausgelieferte Schrift trug 2200 Symbole und 170 KB, benutzt werden 384.
// Der Zuschnitt spart 138 KB bei jedem ersten Seitenaufruf — und er kann auf
// zwei Arten still danebengehen: ein Symbol fehlt (leerer Kasten) oder die
// Ligaturen fehlen (der Iconname steht als Wort im Knopf).
//
// Deshalb wird hier NICHT die Namensliste mit sich selbst verglichen, sondern
// die WIRKLICH AUSGELIEFERTE Schrift in einem echten Browser gerendert. Ein
// Symbol ist quadratisch, ein Wort ist breit — dieser Unterschied ist die
// Messung.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCHRIFT = path.join(ROOT, 'assets', 'fonts', 'material-icons-round.woff2');
const BENUTZT = fs
  .readFileSync(path.join(ROOT, 'scripts', 'lib', 'material-icons-benutzt.txt'), 'utf8')
  .split('\n').map((s) => s.trim()).filter(Boolean);

/** Eine nackte Seite, die nur die Schrift lädt — kein Theme, keine Nebenwirkung. */
async function schriftSeite(page) {
  await page.goto('/tests/fixtures/icons.html');
  // Die Schrift MUSS hier erzwungen geladen werden. Ein Browser lädt eine
  // @font-face erst, wenn ein Element sie braucht; wer vorher misst, misst die
  // Ersatzschrift und bekommt für jedes Symbol die Breite des Wortes. Genau
  // dieser Fehler liess den Test beim Bauen einen intakten Zuschnitt als
  // kaputt melden.
  const geladen = await page.evaluate(async () => {
    await document.fonts.load("24px 'Material Icons Round'");
    await document.fonts.ready;
    return document.fonts.check("24px 'Material Icons Round'");
  });
  expect(geladen, 'die Icon-Schrift wurde nicht geladen').toBe(true);
}

/** Breite jedes Namens, gerendert in der Icon-Schrift. */
async function breiten(page, namen) {
  return page.evaluate((namen) => {
    const wirt = document.getElementById('probe');
    wirt.textContent = '';
    const spans = namen.map((n) => {
      const s = document.createElement('span');
      s.className = 'material-icons-round';
      s.textContent = n;
      wirt.appendChild(s);
      return s;
    });
    // Erst nach dem Einfügen messen, sonst ist die Breite 0.
    return spans.map((s) => s.getBoundingClientRect().width);
  }, namen);
}

test.describe('Icon-Schrift: der Zuschnitt zeigt alles', () => {
  test('die Messung kann Symbol und Wort überhaupt unterscheiden', async ({ page }) => {
    // Ohne diese Gegenprobe wäre der Test darunter wertlos: wenn ALLES schmal
    // gemessen würde, bestünde er auch mit einer leeren Schrift.
    await schriftSeite(page);
    const [symbol, wort] = await breiten(page, ['search', 'kein_material_icon_name']);
    expect(symbol, 'ein Symbol ist rund 24 px breit').toBeLessThan(40);
    expect(wort, 'ein unaufgelöster Name muss deutlich breiter sein').toBeGreaterThan(80);
  });

  test('jedes benutzte Symbol löst sich zu einem Glyph auf', async ({ page }) => {
    await schriftSeite(page);
    expect(BENUTZT.length, 'die Auswahlliste ist leer').toBeGreaterThan(300);
    const gemessen = await breiten(page, BENUTZT);
    // 40 px ist grosszügig: die Symbole sind 24 px, ein zweibuchstabiges Wort
    // schon breiter. Wer hier scheitert, sieht im Betrieb den Namen im Knopf.
    const kaputt = BENUTZT.filter((_, i) => gemessen[i] > 40);
    expect(kaputt, `nicht aufgelöst: ${kaputt.slice(0, 12).join(', ')}`).toEqual([]);
  });

  test('kein benutztes Icon fehlt in der Auswahl', () => {
    // Dasselbe Tor wie in der CI. Ein neu eingebautes Icon, das niemand in die
    // Liste nachträgt, wäre im Betrieb ein leerer Kasten.
    const raus = execFileSync('node', [path.join(ROOT, 'scripts', 'icons.mjs'), '--check'],
      { cwd: ROOT, encoding: 'utf8' });
    expect(raus).toMatch(/✓/);
  });

  test('die ausgelieferte Schrift bleibt klein', () => {
    // Regression gegen den Rückfall: wer versehentlich die Quellschrift nach
    // assets/fonts kopiert, macht jeden ersten Seitenaufruf wieder 138 KB
    // schwerer, ohne dass irgendein anderer Test das merkt.
    const kb = fs.statSync(SCHRIFT).size / 1024;
    expect(kb, `die Icon-Schrift ist ${kb.toFixed(0)} KB gross`).toBeLessThan(60);
    // Und die Quelle liegt ausserhalb des ausgelieferten Bereichs.
    expect(fs.existsSync(path.join(ROOT, 'scripts', 'lib', 'material-icons-quelle.woff2')),
      'ohne Quellschrift lässt sich der Zuschnitt nie wiederholen').toBe(true);
  });
});
