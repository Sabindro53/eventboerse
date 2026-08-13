// Design-System-Tests: stille CSS-Überschreibungen im Zaum halten.
//
// Hintergrund: Am 2026-08-01 waren die „Beliebt:"-Suchvorschläge unsichtbar,
// weil zwei Komponenten dieselbe Klasse (.ai-suggestions) nutzten und die
// spätere Regel (display:none) die frühere still aushebelte. Diese Suite
// (a) fixiert den Fix und (b) verhindert per Ratsche, dass NEUE
// Wert-Konflikte dazukommen.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const path = require('path');
const { openApp } = require('./helpers');

const ROOT = path.join(__dirname, '..', '..');

test.describe('Design-System', () => {
  test('kein Stylesheet benutzt eine Variable, die keines definiert', () => {
    // `ui-enhancements.css` benutzte 13 Variablen, die in KEINER CSS-Datei
    // des Projekts standen — --brand-primary, --eb-radius-sm, --eb-spacing-*
    // und weitere. Ein var() ohne Definition ist „invalid at computed-value
    // time": die Deklaration faellt still auf `unset` zurueck. Es gibt keine
    // Fehlermeldung, keinen roten Test, nichts — die Regel steht da und tut
    // nichts.
    //
    // Genau das hat einen KI-Patch (#123) durchgewunken, der eine
    // „konsistente Focus-Visualisierung" versprach und nachweislich nichts
    // bewirkte: er benutzte dieselben nicht existierenden Namen.
    const fs = require('node:fs');
    const dateien = ['styles.css', 'ui-enhancements.css', 'eb-hq-evolution.css']
      .filter((f) => fs.existsSync(path.join(ROOT, f)));
    expect(dateien.length, 'keine Stylesheets gefunden').toBeGreaterThan(0);

    const quelle = Object.fromEntries(dateien.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));

    // Definitionen stehen nicht nur in .css: hq.html traegt sein eigenes
    // :root im Inline-<style>, und einige Variablen setzt erst JS zur
    // Laufzeit (style="--task-color:…"). Wer nur die CSS-Dateien scannt,
    // meldet die als fehlend — und ein Waechter, der Falsches meldet, wird
    // abgeschaltet statt befolgt.
    const definiert = new Set();
    const quellenFuerDefinition = [...Object.values(quelle)];
    for (const f of ['hq.html', 'app-shell.html', 'index.php', 'app.js']) {
      const abs = path.join(ROOT, f);
      if (fs.existsSync(abs)) quellenFuerDefinition.push(fs.readFileSync(abs, 'utf8'));
    }
    for (const t of quellenFuerDefinition) {
      for (const m of t.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) definiert.add(m[1]);
      for (const m of t.matchAll(/setProperty\(\s*['"`](--[a-zA-Z0-9-]+)/g)) definiert.add(m[1]);
    }

    const fehlend = [];
    for (const [f, t] of Object.entries(quelle)) {
      for (const m of t.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*(,|\))/g)) {
        // Ein Rueckfallwert (`var(--x, 8px)`) ist eine bewusste Entscheidung
        // und deshalb erlaubt — nur der nackte Zugriff muss definiert sein.
        if (m[2] === ')' && !definiert.has(m[1])) fehlend.push(`${f}: ${m[1]}`);
      }
    }
    expect([...new Set(fehlend)], 'Variablen ohne Definition und ohne Rückfallwert').toEqual([]);
  });

  test('Hero-Suchvorschläge („Beliebt:") sind sichtbar — Klassenkollision bleibt behoben', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const chips = document.querySelector('.ai-searchbar-outer .ai-sug-row');
      if (!chips) return null;
      const rect = chips.getBoundingClientRect();
      return {
        display: getComputedStyle(chips).display,
        height: rect.height,
        buttons: chips.querySelectorAll('.ai-sug-chip').length,
      };
    });
    expect(r, '.ai-sug-row muss existieren').not.toBeNull();
    expect(r.display).toBe('flex');
    expect(r.height).toBeGreaterThan(10);
    expect(r.buttons).toBeGreaterThanOrEqual(4);
  });

  test('CSS-Konflikt-Ratsche: keine neuen still überschreibenden Regeln', () => {
    // Ratsche: Stand 2026-08-01 sind 56 Alt-Konflikte bekannt (überwiegend
    // bewusste Polish-Schicht-Kaskaden). Neue Konflikte → Test rot.
    // Wer einen Konflikt AUFLÖST, darf die Schranke gerne senken.
    const MAX_BEKANNTE_KONFLIKTE = 56;
    const out = execFileSync('node', ['tests/audit/css-duplicates.js'], { cwd: ROOT, encoding: 'utf8' });
    const m = out.match(/mit Wert-Konflikt: (\d+)/);
    expect(m, 'Analyzer-Ausgabe muss auswertbar sein').not.toBeNull();
    const conflicts = parseInt(m[1], 10);
    expect(conflicts, `Neue still überschreibende CSS-Regel eingeführt (${conflicts} > ${MAX_BEKANNTE_KONFLIKTE}).\n` +
      'node tests/audit/css-duplicates.js zeigt alle Konflikte mit Zeilennummern.').toBeLessThanOrEqual(MAX_BEKANNTE_KONFLIKTE);
  });

  test('Design-Tokens: --eb-* nur noch an EINER Stelle definiert (:root + dark-mode)', () => {
    const fs = require('fs');
    const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    // Jedes --eb-depth-/--eb-ring-Token darf genau 2× definiert sein: hell + dunkel
    for (const token of ['--eb-depth-3:', '--eb-ring:', '--eb-glow-primary:']) {
      const count = css.split(token).length - 1;
      expect(count, `${token} darf nur je 1× für Light + Dark definiert sein (gefunden: ${count})`).toBeLessThanOrEqual(2);
    }
  });
});
