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
const { ohneCssKommentare } = require('./lib/css-code');

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
    // ── WARUM DIE LISTE ABGELEITET WIRD (15.09.2026) ────────────────────
    //
    // Hier standen drei Dateinamen von Hand: styles.css, ui-enhancements.css,
    // eb-hq-evolution.css. `journeys.css` und `discovery.css` waren NIE
    // Subjekt dieses Waechters — und genau dort stand `--white`, ein Token,
    // das es im ganzen Projekt nirgends gibt. Gemeldet hat es der Inhaber,
    // nicht dieser Test: die Kacheln unter /profil standen weiss auf #121212,
    // Titel darauf 1,61:1.
    //
    // Ein Pruefer, dessen Subjekt nur ein Ausschnitt ist, gibt eine
    // Entwarnung, die er nicht decken kann. Die Liste kommt deshalb aus den
    // Stellen, die Stylesheets WIRKLICH ausliefern — wer eine neue CSS-Datei
    // einbindet, bekommt ihre Pruefung geschenkt.
    const fs = require('node:fs');
    const LIEFERWEGE = ['index.php', 'index.local-head.html', 'hq.html', 'functions.php'];
    const ausgeliefert = new Set();
    for (const q of LIEFERWEGE) {
      const abs = path.join(ROOT, q);
      if (!fs.existsSync(abs)) continue;
      for (const m of fs.readFileSync(abs, 'utf8').matchAll(/([A-Za-z0-9_-]+\.css)/g)) ausgeliefert.add(m[1]);
    }
    const dateien = fs.readdirSync(ROOT).filter((f) => f.endsWith('.css') && ausgeliefert.has(f)).sort();
    // Ohne diese Schranke waere ein kaputter Ableitungsschritt ein gruener
    // Test ueber null Dateien — nicht messen ist kein Bestehen.
    expect(dateien.length, 'Ableitung hat keine ausgelieferten Stylesheets gefunden').toBeGreaterThan(5);
    expect(dateien, 'journeys.css und discovery.css muessen im Subjekt liegen')
      .toEqual(expect.arrayContaining(['journeys.css', 'discovery.css', 'styles.css']));

    // Nach Abzug der Kommentare, ueber den gemeinsamen Griff. Beim ersten
    // Lauf dieser Fassung meldete der Waechter `styles.css: --x` — und das
    // war der ERKLAERENDE KOMMENTAR ueber den neuen Token, der `var(--x,
    // literal)` als Beispiel nennt. Siebter Fall dieser Klasse im Projekt.
    const quelle = Object.fromEntries(dateien.map(
      (f) => [f, ohneCssKommentare(fs.readFileSync(path.join(ROOT, f), 'utf8'))]));

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

    // ── UND WARUM EIN RUECKFALLWERT NICHT MEHR ENTSCHULDIGT ─────────────
    //
    // Hier stand: „Ein Rueckfallwert (`var(--x, 8px)`) ist eine bewusste
    // Entscheidung und deshalb erlaubt." Fuer eine LAENGE stimmt das.
    // Fuer eine FLAECHE ist der Rueckfall genau der Fehler: ist das Token
    // nirgends definiert, gilt das Literal in BEIDEN Farbmodi — die Flaeche
    // kann dem Dunkelmodus dann gar nicht mehr folgen.
    //
    // `background: var(--white, #fff)` hatte einen Rueckfallwert, war
    // deshalb von dieser Regel ausgenommen, und war der gemeldete Fehler.
    // Auch `--bg-card, #fff`, `--card-bg, #fff` und `--bg-soft,
    // rgba(0,0,0,.04)` standen so in styles.css, das der Waechter SCHON
    // gelesen hat — die Ausnahme allein hat sie durchgelassen.
    //
    // Ein Name, den nichts definiert, ist immer ein Versehen: entweder das
    // Token anlegen oder das Literal hinschreiben. Beides ist ehrlich, ein
    // erfundener Name ist es nicht.
    //
    // ── ZUR MUTATIONSPROBE ──────────────────────────────────────────────
    //
    // „Rueckfallwert entschuldigt wieder" ueberlebt ALLEIN — und das ist
    // richtig so: nach dem Fix gibt es kein undefiniertes Token mit
    // Rueckfallwert mehr, die Lockerung hat also kein Subjekt. Belegt ist
    // die Regel ueber das PAAR, gemessen am 15.09.2026:
    //
    //   `--white` zurueck in journeys.css          → ROT
    //   `--white` zurueck UND Lockerung zurueck    → GRUEN
    //
    // Die zweite Zeile ist der Beweis, dass genau diese Verschaerfung den
    // gemeldeten Fehler faengt. Dieselbe Lage wie bei den zwei Leer-Wachen
    // in `erstattung.spec.js`: die Zusicherung gilt dem Paar.
    const fehlend = [];
    for (const [f, t] of Object.entries(quelle)) {
      for (const m of t.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
        if (!definiert.has(m[1])) fehlend.push(`${f}: ${m[1]}`);
      }
    }
    expect([...new Set(fehlend)].sort(),
      'Diese Variablen werden benutzt, aber nirgends definiert. Ein Rückfallwert\n'
      + 'macht das nicht gut: bei einer Farbe gilt er dann in BEIDEN Farbmodi.\n'
      + 'Entweder das Token in :root (+ body.dark-mode) anlegen oder das Literal setzen.')
      .toEqual([]);
  });

  test('jedes Stylesheet im Wurzelverzeichnis wird ausgeliefert — oder trägt einen Grund', () => {
    // Der Waechter darueber prueft, was ausgeliefert wird. Damit sein Subjekt
    // nicht still schrumpft, muss jede andere CSS-Datei begruendet sein —
    // dasselbe Muster wie STILLGELEGT bei den Phantom-Workflows: stilllegen
    // heisst eintragen, nicht verschweigen. Ein leerer Grund faellt durch.
    //
    // Gefunden am 15.09.2026: `mobile-overrides.css`, 10 KB, wird von keiner
    // Stelle eingebunden — und steht trotzdem im Autopilot-Rahmen
    // (`scripts/lib/sichere-dateien.mjs`). Ein Modell koennte also eine Datei
    // verbessern, die nie jemand laedt. Sie benutzt ausserdem `--color-primary,
    // #7c3aed` — ein Lila, das die Marke (#FF385C) nicht kennt.
    const fs = require('node:fs');
    const OHNE_AUSLIEFERUNG = {
      'mobile-overrides.css':
        'Nirgends eingebunden (weder index.php, Dev-Shell, hq.html noch functions.php). '
        + 'Fremde Markenfarbe #7c3aed. Loeschen ist eine Entscheidung des Inhabers, '
        + 'deshalb hier eingetragen statt still entfernt.',
    };
    const LIEFERWEGE = ['index.php', 'index.local-head.html', 'hq.html', 'functions.php'];
    const ausgeliefert = new Set();
    for (const q of LIEFERWEGE) {
      const abs = path.join(ROOT, q);
      if (!fs.existsSync(abs)) continue;
      for (const m of fs.readFileSync(abs, 'utf8').matchAll(/([A-Za-z0-9_-]+\.css)/g)) ausgeliefert.add(m[1]);
    }
    const verwaist = fs.readdirSync(ROOT)
      .filter((f) => f.endsWith('.css') && !ausgeliefert.has(f));
    for (const f of verwaist) {
      expect(String(OHNE_AUSLIEFERUNG[f] || '').trim().length,
        `${f} wird nirgends ausgeliefert und trägt keinen Grund. Entweder einbinden,\n`
        + 'löschen, oder mit Begründung in OHNE_AUSLIEFERUNG eintragen.').toBeGreaterThan(30);
    }
    // Gegenprobe: ein Eintrag, der inzwischen doch ausgeliefert wird, ist
    // eine Luege in Listenform und muss auffallen.
    for (const f of Object.keys(OHNE_AUSLIEFERUNG)) {
      expect(ausgeliefert.has(f), `${f} steht als „nicht ausgeliefert", wird aber eingebunden`).toBe(false);
    }
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
