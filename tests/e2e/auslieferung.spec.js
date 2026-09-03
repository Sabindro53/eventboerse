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
const { kommentarBereiche, imKommentar } = require('./lib/html-kommentare');

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

    // Kommentarbereiche werden BESTIMMT, nicht herausgeschnitten. Der Griff
    // steht seit dem 02.09.2026 in lib/html-kommentare.js — dort ist auch
    // aufgeschrieben, warum: die von Hand geschriebene Fassung hat CodeQL
    // zweimal gemeldet, das zweite Mal in der Datei, die den ersten Befund
    // beheben sollte.
    const bereiche = kommentarBereiche(php);
    const drin = (i) => imKommentar(bereiche, i);

    // Ein <link>-Tag darf PHP-Bloecke enthalten, und die tragen selbst ein
    // `>`. Ein schlichtes [^>]* endet daran mitten im Tag — genau daran fand
    // die erste Fassung dieses Tests null Treffer und haette jede
    // Doppel-Einbindung durchgewunken. Gefangen hat das die Subjekt-Pruefung
    // darunter, nicht der Blick auf den Code. Die Alternative im Muster
    // erlaubt den PHP-Block ausdruecklich, statt ihn vorher zu entfernen.
    const treffer = [];
    for (const m of php.matchAll(/<link\b(?:<\?php[\s\S]*?\?>|[^>])*>/gi)) {
      if (drin(m.index)) continue;
      const tag = m[0].replace(/<\?php[\s\S]*?\?>/g, '');
      if (!/rel=["']stylesheet["']/i.test(tag)) continue;
      const href = tag.match(/href=["']([^"']*)["']/i);
      if (href && href[1].trim()) treffer.push(normieren(href[1]));
    }
    return treffer;
  }

  test('die Erhebung findet ihre Subjekte überhaupt', () => {
    // Ohne diese Prüfung wäre ein kaputtes Muster ein bestandener Test:
    // zwei leere Listen überschneiden sich nie.
    expect(ausFunctions().length, 'kein wp_enqueue_style gefunden — Test prüft nichts')
      .toBeGreaterThanOrEqual(4);
    const ausPhp = ausIndexPhp();
    expect(ausPhp.length, 'kein <link rel=stylesheet> in index.php — Test prüft nichts')
      .toBeGreaterThan(0);
    // Der erklärende Kommentar in index.php enthält selbst die Zeichenfolge
    // `<link>`. Ein Sammler, der Kommentare mitzählt, meldete daran einen
    // Treffer ohne href — und ein leerer Pfad überschneidet sich mit nichts,
    // also fiele es nie auf. Deshalb hier festgehalten.
    expect(ausPhp.every((p) => p !== '/'), `leerer Pfad gesammelt: ${ausPhp.join(', ')}`)
      .toBe(true);
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

// ── Ein Handle ist ein globaler Name ─────────────────────────────────────
//
// Der Lighthouse-Lauf vom 31.08.2026 gegen die LIVE-Seite zeigte:
//
//   /wp-content/plugins/elementor/assets/lib/flatpickr/flatpickr.min.css?ver=4.6.13
//   /wp-content/plugins/elementor/assets/lib/flatpickr/flatpickr.min.js?ver=4.6.13
//
// Unsere eigenen, im Theme liegenden Dateien kamen NICHT vor. Elementor
// registriert den Handle `flatpickr` frueher, und `wp_enqueue_style()` mit
// einem bereits registrierten Handle verwirft `src` und `version`
// stillschweigend — erkennbar allein am `?ver=4.6.13` statt unseres filemtime.
//
// Der Datumswaehler der Buchung lief also ueber die Kopie eines Plugins, das
// dieses Theme nirgends anfordert, und `flatpickr-de.js` band sich an dessen
// Build. Das ging gut, weil dort zufaellig dieselbe Version liegt.
test.describe('Eigene Bibliotheken tragen eigene Handles', () => {
  const FUNCTIONS_PHP = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

  /** Alle Handles, mit denen das Theme etwas aus assets/lib/ einbindet. */
  function eigeneBibliotheken() {
    const treffer = [];
    for (const m of FUNCTIONS_PHP.matchAll(
      /wp_enqueue_(?:style|script)\(\s*'([^']+)'\s*,\s*\$vendor\b/g)) {
      treffer.push(m[1]);
    }
    return treffer;
  }

  test('die Erhebung findet ihre Subjekte', () => {
    expect(eigeneBibliotheken().length,
      'keine Einbindung aus $vendor gefunden — der Test prüft nichts')
      .toBeGreaterThanOrEqual(4);
  });

  test('jeder Handle für eine eigene Datei trägt das eb-Präfix', () => {
    // Ohne Präfix entscheidet das erste Plugin, welche Datei ausgeliefert
    // wird — und zwar lautlos.
    const ohne = eigeneBibliotheken().filter((h) => !h.startsWith('eb-'));
    expect(ohne, `Handle ohne eb-Präfix, damit für jedes Plugin greifbar: `
      + `${ohne.join(', ')}`).toHaveLength(0);
  });

  test('keine Abhängigkeit zeigt mehr auf einen nackten Namen', () => {
    // Bliebe `array( 'flatpickr' )` stehen, haenge unsere Lokalisierung
    // weiterhin an Elementors Build — die Umbenennung waere wirkungslos.
    for (const alt of ['leaflet', 'flatpickr', 'flatpickr-de']) {
      expect(FUNCTIONS_PHP, `die Abhängigkeit '${alt}' zeigt auf einen Handle, `
        + `den jedes Plugin belegen kann`)
        .not.toMatch(new RegExp(`array\\([^)]*'${alt}'`));
    }
  });
});

// ── Abbestellen nur, wo nachweislich nichts gestaltet wird ───────────────
test.describe('Fremde Stilvorlagen ohne Wirkung werden abbestellt', () => {
  const FUNCTIONS_PHP = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
  const INDEX = fs.readFileSync(path.join(ROOT, 'index.php'), 'utf8');

  test('die Voraussetzung gilt: index.php rendert nie den Seiteninhalt', () => {
    // Das ist die BEDINGUNG, unter der das Abbestellen zulässig ist — nicht
    // „wird vermutlich nicht gebraucht", sondern „das Markup entsteht nie".
    // Wer the_content() wieder einbaut, muss das Abbestellen mit anfassen,
    // und dieser Test sagt es ihm.
    expect(INDEX, 'index.php rendert wieder Seiteninhalt — dann gestaltet die '
      + 'Block-Bibliothek sehr wohl etwas, und das Abbestellen ist falsch')
      .not.toMatch(/\bthe_content\s*\(/);
  });

  test('die Block-Bibliothek wird abbestellt', () => {
    const fn = FUNCTIONS_PHP.match(/function eb_fremde_stile_abbestellen\([\s\S]*?\n\}/);
    expect(fn, 'die Funktion ist verschwunden').toBeTruthy();
    expect(fn[0], 'wp-block-library bleibt geladen').toContain("'wp-block-library'");
    expect(fn[0], 'es wird gar nichts abbestellt').toMatch(/wp_dequeue_style/);
  });

  test('nur im Frontend — der Blockeditor braucht die Vorlage', () => {
    const fn = FUNCTIONS_PHP.match(/function eb_fremde_stile_abbestellen\([\s\S]*?\n\}/)[0];
    expect(fn, 'ohne is_admin()-Schranke bricht der Blockeditor')
      .toMatch(/if \(\s*is_admin\(\)\s*\)\s*\{\s*return;/);
  });

  test('spät genug, sonst ist noch nichts registriert', () => {
    // Bei der Standardpriorität liefe das Abbestellen vor den Registrierungen
    // von WordPress und griffe ins Leere — grün und wirkungslos.
    const zeile = FUNCTIONS_PHP.match(
      /add_action\(\s*'wp_enqueue_scripts',\s*'eb_fremde_stile_abbestellen',\s*(\d+)\s*\)/);
    expect(zeile, 'die Funktion ist nicht eingehängt').toBeTruthy();
    expect(Number(zeile[1]), 'die Priorität ist zu früh').toBeGreaterThanOrEqual(20);
  });
});
