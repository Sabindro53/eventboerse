// Was der Besucher beim ersten Aufruf wirklich lädt.
//
// Gemessen am 29.08.2026 (minifiziert, wie ausgeliefert):
//
//   app.js      791 KB → gzip 212 KB → brotli 163 KB
//   styles.css  408 KB → gzip  71 KB → brotli  56 KB
//
// Brotli spart also rund 64 KB je Erstbesuch, ohne dass sich am Code etwas
// ändert. Der Rest dieser Datei bewacht die zwei Stellen, an denen so eine
// Verbesserung still wieder verlorengeht: eine ersetzte statt ergänzte
// Kompression, und ein Preload, der ins Leere zeigt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HTACCESS = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8');
const INDEX_PHP = fs.readFileSync(path.join(ROOT, 'index.php'), 'utf8');

test.describe('Auslieferung: Kompression', () => {
  test('Brotli ist da — und gzip ist noch da', () => {
    // <IfModule> ist eine Entscheidung beim Start, keine zur Laufzeit. Fehlt
    // mod_brotli auf dem IONOS-Pool, muss der deflate-Block weiter greifen.
    // Brotli statt gzip einzutragen hiesse: auf einem Server ohne das Modul
    // geht die Kompression ganz verloren — 212 KB werden zu 791 KB.
    expect(HTACCESS, 'kein Brotli').toMatch(/<IfModule mod_brotli\.c>/);
    expect(HTACCESS, 'BROTLI_COMPRESS fehlt').toMatch(/BROTLI_COMPRESS/);
    expect(HTACCESS, 'gzip wurde ersetzt statt ergänzt').toMatch(/<IfModule mod_deflate\.c>/);
    expect(HTACCESS, 'DEFLATE-Filter fehlt').toMatch(/AddOutputFilterByType DEFLATE/);
  });

  test('beide Kompressionen decken dieselben Typen ab', () => {
    // Ein Typ, der nur in einer der beiden Listen steht, wird je nach
    // Servermodul komprimiert oder nicht — ein Unterschied, den niemand
    // bemerkt, weil beide Antworten funktionieren.
    const typen = (regex) => {
      const m = HTACCESS.match(regex);
      return m ? m[1].trim().split(/\s+/).sort() : null;
    };
    const br = typen(/AddOutputFilterByType BROTLI_COMPRESS(.+)/);
    const gz = typen(/AddOutputFilterByType DEFLATE(.+)/);
    expect(br, 'Brotli-Typen nicht lesbar').toBeTruthy();
    expect(gz, 'gzip-Typen nicht lesbar').toBeTruthy();
    expect(br).toEqual(gz);
  });

  test('Vary: Accept-Encoding ist gesetzt', () => {
    // Ohne diesen Kopf darf ein Zwischenspeicher eine brotli-komprimierte
    // Antwort an einen Browser geben, der nur gzip kann. Die Seite ist dann
    // kaputt — und zwar nur für manche, was die Diagnose teuer macht.
    expect(HTACCESS, 'Vary: Accept-Encoding fehlt trotz zweier Kompressionen')
      .toMatch(/Header\s+append\s+Vary\s+Accept-Encoding/i);
  });
});

test.describe('Auslieferung: Schriften vorziehen', () => {
  /**
   * Alle <link rel="preload" as="font">-Tags aus index.php.
   *
   * `[^>]*` reicht hier NICHT: die href enthält `<?php … ?>`, und das `?>`
   * bringt ein `>` mit. Ein naiver Ausdruck schneidet das Tag genau dort ab
   * und sieht den Dateinamen nie — der Test wäre grün und blind. Deshalb
   * wird bis zum ersten `>` gelesen, dem KEIN `?` vorausgeht.
   */
  const vorgezogen = () =>
    [...INDEX_PHP.matchAll(/<link rel="preload"[\s\S]*?(?<!\?)>/g)]
      .map((m) => m[0])
      .filter((t) => /as="font"/.test(t));

  test('beide Schriften werden vorgezogen', () => {
    const links = vorgezogen();
    expect(links.length, 'keine Schrift wird vorgezogen').toBe(2);
  });

  test('jeder Preload trägt crossorigin', () => {
    // Ohne das Attribut holt der Browser die Schrift ein ZWEITES Mal, statt
    // den Preload zu benutzen: Schriften werden im CORS-Modus geladen, auch
    // von der eigenen Herkunft. Ein Preload ohne crossorigin macht die Seite
    // also langsamer, nicht schneller.
    for (const link of vorgezogen()) {
      expect(link, `Preload ohne crossorigin: ${link}`).toMatch(/\scrossorigin/);
      expect(link, `Preload ohne type: ${link}`).toMatch(/type="font\/woff2"/);
    }
  });

  test('jede vorgezogene Schrift existiert wirklich', () => {
    // Ein Preload auf eine umbenannte Datei ist schlimmer als keiner: der
    // Browser lädt ins Leere und danach das Richtige noch einmal.
    for (const link of vorgezogen()) {
      const datei = link.match(/assets\/fonts\/([\w.-]+\.woff2)/);
      expect(datei, `Preload zeigt nicht auf assets/fonts: ${link}`).toBeTruthy();
      const pfad = path.join(ROOT, 'assets', 'fonts', datei[1]);
      expect(fs.existsSync(pfad), `vorgezogene Schrift fehlt: ${datei[1]}`).toBe(true);
    }
  });

  test('vorgezogen wird genau das, was fonts.css auch lädt', () => {
    // Die eigentliche Driftgefahr: fonts.css wechselt die Datei, der Preload
    // bleibt stehen. Dann lädt jeder Besucher eine Schrift, die niemand
    // benutzt — und die richtige zusätzlich.
    const css = fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'fonts.css'), 'utf8');
    const ausCss = new Set(
      [...css.matchAll(/url\('\.\/([\w.-]+\.woff2)'\)/g)].map((m) => m[1]));
    const ausPreload = new Set(
      vorgezogen().map((l) => l.match(/assets\/fonts\/([\w.-]+\.woff2)/)[1]));
    expect(ausCss.size, 'fonts.css lädt gar keine woff2').toBeGreaterThan(0);
    for (const f of ausPreload) {
      expect([...ausCss], `vorgezogen, aber von fonts.css nicht geladen: ${f}`)
        .toContain(f);
    }
  });

  test('die Icon-Schrift wird vorgezogen — sie ist bis dahin unsichtbar', () => {
    // Material Icons Round steht auf `font-display: block`. Anders als bei
    // Inter (`swap`, Fallback-Text ist sofort da) bleibt hier jedes Symbol
    // LEER, bis die Datei da ist. Von allen Schriften ist das die, deren
    // Verzögerung man am deutlichsten sieht.
    const css = fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'fonts.css'), 'utf8');
    expect(css, 'Annahme veraltet: die Icon-Schrift steht nicht mehr auf block')
      .toMatch(/font-display:\s*block/);
    expect(vorgezogen().join(' '), 'die Icon-Schrift wird nicht vorgezogen')
      .toMatch(/material-icons-round\.woff2/);
  });
});

// ── Kein Stylesheet auf zwei Wegen ───────────────────────────────────────
//
// Der Lighthouse-Lauf vom 31.08.2026 gegen die LIVE-Seite zeigte 64 Anfragen,
// darunter diese vier:
//
//   styles.css?v=2.5.1          68 KB
//   styles.css?ver=1787748136   68 KB
//   fonts.css?v=2.5.1            1 KB
//   fonts.css?ver=1787748126     1 KB
//
// Zwei Wege banden dieselben Dateien ein: ein festes <link> in `index.php`
// und `wp_enqueue_style()` in `functions.php`. Verschiedene Query-Strings
// sind fuer den Browser verschiedene Adressen — er laedt beide, und beide
// blockieren den Aufbau.
//
// Fuer die Schriften war genau das am 21.08.2026 schon einmal behoben
// worden. Der erklaerende Kommentar blieb stehen, die Zeile darunter auch.
//
// Geprueft wird die Bedingung, nicht der Einzelfall: KEINE Datei darf auf
// beiden Wegen kommen. Ein Test auf "styles.css steht nicht mehr in
// index.php" waere beim naechsten Doppelgaenger wieder blind.
test.describe('Kein Stylesheet wird auf zwei Wegen eingebunden', () => {
  /** Loest die PHP-Ausdruecke zu einem Pfad relativ zum Theme-Wurzelverzeichnis. */
  const normieren = (s) => '/' + String(s)
    .replace(/\?.*$/, '')
    .replace(/^\/+/, '')
    .trim();

  function ausFunctions() {
    const php = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    const treffer = [];
    for (const m of php.matchAll(/wp_enqueue_style\(\s*'[^']*'\s*,\s*([^,]+),/g)) {
      let q = m[1].trim();
      if (/get_stylesheet_uri\(\)/.test(q)) { treffer.push('/style.css'); continue; }
      q = q.replace(/\$fonts\b/, "'assets/fonts'")
           .replace(/\$vendor\b/, "'assets/lib'")
           .replace(/get_template_directory_uri\(\)/, "''");
      const teile = [...q.matchAll(/'([^']*)'/g)].map((x) => x[1]).filter(Boolean);
      if (teile.length) treffer.push(normieren(teile.join('/').replace(/\/+/g, '/')));
    }
    return treffer;
  }

  function ausIndexPhp() {
    const php = fs.readFileSync(path.join(ROOT, 'index.php'), 'utf8');
    // Reihenfolge ist wesentlich: erst Kommentare, dann PHP.
    //
    // Die PHP-Bloecke MUESSEN vor dem Suchen weg. `<?php … ?>` enthaelt ein
    // `>`, und daran endet jedes `[^>]*` mitten im <link>-Tag — die erste
    // Fassung dieses Tests fand deshalb null Treffer und haette jede
    // Doppel-Einbindung durchgewunken. Gefangen hat das die Subjekt-Pruefung
    // darunter, nicht der Blick auf den Code.
    const roh = php
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\?php[\s\S]*?\?>/g, '');
    const treffer = [];
    for (const m of roh.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)) {
      const href = m[0].match(/href=["']([^"']*)["']/i);
      if (href && href[1].trim()) treffer.push(normieren(href[1]));
    }
    return treffer;
  }

  test('die Erhebung findet ihre Subjekte überhaupt', () => {
    // Ohne diese Prüfung wäre ein kaputtes Muster ein bestandener Test:
    // zwei leere Listen überschneiden sich nie.
    expect(ausFunctions().length, 'kein wp_enqueue_style gefunden — Test prüft nichts')
      .toBeGreaterThanOrEqual(4);
    expect(ausIndexPhp().length, 'kein <link rel=stylesheet> in index.php — Test prüft nichts')
      .toBeGreaterThan(0);
  });

  test('keine Datei kommt über <link> UND wp_enqueue_style', () => {
    const eingebunden = new Set(ausFunctions());
    const doppelt = ausIndexPhp().filter((p) => eingebunden.has(p));
    expect(doppelt, `doppelt eingebunden (fest in index.php und per wp_enqueue_style): `
      + `${doppelt.join(', ')}`).toHaveLength(0);
  });

  test('styles.css und fonts.css laufen über wp_enqueue_style', () => {
    // Die Gegenrichtung: sie dürfen nicht einfach VERSCHWINDEN. Ein Test, der
    // nur "nicht doppelt" prüft, wäre auch dann grün, wenn beide fehlen —
    // und die Seite käme ohne jedes Design.
    const e = ausFunctions();
    expect(e, 'styles.css wird nirgends mehr eingebunden').toContain('/styles.css');
    expect(e, 'fonts.css wird nirgends mehr eingebunden')
      .toContain('/assets/fonts/fonts.css');
  });
});
