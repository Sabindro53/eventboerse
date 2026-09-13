// Seitenrouten: was der Router als Adresse schreibt, muss der Server kennen.
//
// ── DER BEFUND, AUS DEM DIESE SUITE ENTSTEHT ───────────────────────────
//
// Am 13.09.2026 gemessen: `app-shell.html` trug 34 Seiten (`id="page-…"`),
// `$spa_pages` in `functions.php` kannte 31 Slugs. Sechs Seiten hatten
// keine Rewrite-Regel — darunter `freunde`, also der Pfad, auf den ein
// Einladungslink in eine Gruppe zeigt.
//
// ── WARUM 1033 GRUENE TESTS DAS DURCHGELASSEN HABEN ────────────────────
//
// `smoke.spec.js` fuehrt `freunde` in seiner Routenliste und war gruen.
// Der Grund steht in `helpers.js`:
//
//     await page.evaluate(([r, d]) => window.navigateTo(r, d || null), …)
//
// Das ist eine Navigation IM BROWSER. Sie schiebt die Adresse per
// `pushState` in die Leiste und stellt nie eine Anfrage. Der Smoke-Test
// prueft damit den Router — und sah nie, dass der Server diesen Pfad gar
// nicht kennt. Ein Pruefer, dessen Subjekt ein anderes ist als das
// vermutete, gibt eine Entwarnung, die er nicht decken kann.
//
// Genau deshalb misst diese Suite die REGELN, nicht die Navigation.
//
// ── UND WARUM SIE DIE REGEL AUS DER DATEI LIEST ────────────────────────
//
// Die Muster (`'^' . $slug . '/?$'`) werden aus `functions.php` gelesen,
// nicht hier abgeschrieben. Zwei gepflegte Fassungen derselben Regel
// driften immer; eine abgeschriebene Fassung bliebe gruen, waehrend die
// echte Regel laengst anders aussieht.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WURZEL = path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(WURZEL, 'functions.php');
const SHELL = path.join(WURZEL, 'app-shell.html');

function functionsText() {
  return fs.readFileSync(FUNCTIONS, 'utf8');
}

/** Jede SPA-Seite des Markups — das ist, was `navigateTo()` aktivieren kann. */
function seitenImMarkup() {
  const roh = fs.readFileSync(SHELL, 'utf8');
  return [...new Set([...roh.matchAll(/id="page-([a-z0-9-]+)"/g)].map((m) => m[1]))];
}

/** Der Block `$spa_pages = array( … );` als Liste von Slugs. */
function slugsAusFunctions(text = functionsText()) {
  const block = text.match(/\$spa_pages\s*=\s*array\(([\s\S]*?)\);/);
  if (!block) return null;
  return [...new Set([...block[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]))];
}

/**
 * Die Muster, mit denen `add_rewrite_rule()` wirklich aufgerufen wird.
 *
 * Gelesen wird die Form `'<vorn>' . $slug . '<hinten>'` — abgeleitet, damit
 * eine Aenderung an der Regel diese Suite erreicht statt sie zu umgehen.
 */
function musterAusFunctions(text = functionsText()) {
  const aus = [];
  const re = /add_rewrite_rule\(\s*'([^']*)'\s*\.\s*\$slug\s*\.\s*'([^']*)'/g;
  for (const m of text.matchAll(re)) aus.push({ vorn: m[1], hinten: m[2] });
  return aus;
}

/** Trifft irgendeine Regel diesen Pfad? WordPress prueft ohne fuehrenden `/`. */
function pfadTrifft(pfad, slugs, muster) {
  const blank = pfad.replace(/^\/+/, '');
  for (const slug of slugs) {
    for (const { vorn, hinten } of muster) {
      const roh = vorn + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + hinten;
      let re;
      try { re = new RegExp(roh); } catch (e) { continue; }
      if (re.test(blank)) return slug;
    }
  }
  return null;
}

/**
 * Der `init`-Block, in dem die Regeln stehen — nicht irgendeiner.
 *
 * `functions.php` haengt mehrere Rueckrufe an `init`. Der erste ist ein
 * anderer; wer ihn misst, prueft eine Funktion, die mit Routen nichts zu tun
 * hat, und meldet rot aus dem falschen Grund. Gesucht wird deshalb rueckwaerts
 * ab `$spa_pages`.
 */
function initBlock(text = functionsText()) {
  const anker = text.indexOf('$spa_pages');
  if (anker < 0) return null;
  const start = text.lastIndexOf("add_action( 'init', function() {", anker);
  if (start < 0) return null;
  let tiefe = 0;
  for (let i = text.indexOf('{', start); i < text.length; i++) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}') {
      tiefe--;
      if (tiefe === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

test.describe('Seitenrouten: ein geteilter Link muss ankommen', () => {
  test('der Prüfer hat überhaupt ein Subjekt', () => {
    // Ohne diese Gegenprobe koennte jemand `$spa_pages` umbenennen und alle
    // folgenden Tests waeren still gruen — ueber einer Seite, die auf jedem
    // geteilten Link eine Fehlerseite zeigt. Dieselbe Klasse wie ein Tor,
    // dem sein Subjekt weggenommen wurde.
    const slugs = slugsAusFunctions();
    expect(slugs, 'In functions.php ist kein `$spa_pages`-Array auffindbar — '
      + 'dann prüft diese Suite nichts').not.toBeNull();
    expect(slugs.length, 'zu wenige Slugs — das Array wurde vermutlich '
      + 'umgebaut').toBeGreaterThan(25);

    const seiten = seitenImMarkup();
    expect(seiten.length, 'in app-shell.html sind kaum Seiten auffindbar — '
      + 'dann misst der Abgleich nichts').toBeGreaterThan(25);

    const muster = musterAusFunctions();
    expect(muster.length, 'es ist kein `add_rewrite_rule`-Muster mit `$slug` '
      + 'auffindbar — die Regelform hat sich geändert').toBeGreaterThan(0);
  });

  test('jede Seite des Markups wird von einer Regel wirklich getroffen', () => {
    // DIE EIGENTLICHE REGEL. Gemessen wird nicht die Mitgliedschaft in einer
    // Liste, sondern ob das Muster den Pfad TRIFFT: ein Tippfehler im Slug
    // stuende in der Liste und traefe nichts.
    const slugs = slugsAusFunctions();
    const muster = musterAusFunctions();
    const ohne = seitenImMarkup().filter((s) => !pfadTrifft('/' + s, slugs, muster));
    expect(ohne, `diese Seiten gibt es im Markup, aber ein direkt geöffneter `
      + `Link darauf endet auf 404.php: ${ohne.map((s) => '/' + s).join(', ')}. `
      + `Jede Seite mit id="page-…" gehört in $spa_pages`).toEqual([]);
  });

  test('der Einladungslink in eine Gruppe kommt an', () => {
    // `/freunde` ist der Pfad, auf den eine Gruppeneinladung zeigt, und das
    // Weitergeben ist der einzige Grund, aus dem es diesen Link gibt. Das
    // zweite Segment traegt den Reiter — ohne die zweite Regel fiele genau
    // die geteilte Adresse heraus, waehrend `/freunde` funktionierte.
    const slugs = slugsAusFunctions();
    const muster = musterAusFunctions();
    for (const pfad of ['/freunde', '/freunde/gruppen', '/detail/10010',
      '/aktuelles/jetzt', '/board', '/auftraege', '/my-listings']) {
      expect(pfadTrifft(pfad, slugs, muster),
        `ein direkt geöffneter Link auf ${pfad} wird von keiner Regel `
        + 'getroffen und landet auf der Fehlerseite').not.toBeNull();
    }
  });

  test('die Regeln sind kein Auffangmuster', () => {
    // GEGENPROBE. Traefe `^(.*)$` jeden Pfad, waere der Test oben immer
    // gruen — und WordPress lieferte fuer jede Adresse die SPA statt einer
    // ehrlichen 404. Ein Pruefer ohne Gegenprobe belegt nur sich selbst.
    const slugs = slugsAusFunctions();
    const muster = musterAusFunctions();
    for (const pfad of ['/gibt-es-nicht', '/wp-login.php', '/hq',
      '/freunde/gruppen/zuviel']) {
      expect(pfadTrifft(pfad, slugs, muster),
        `${pfad} wird von einer SPA-Regel getroffen — dann ist die Regel ein `
        + 'Auffangmuster und der Nachweis oben wertlos').toBeNull();
    }
  });

  test('die Regeln werden nach dem Deploy neu eingelesen', () => {
    // OHNE DAS WAERE DIE KORREKTUR UNSICHTBAR. `add_rewrite_rule()` traegt
    // nur in den Speicher ein; gefragt wird zur Laufzeit die Option
    // `rewrite_rules`. Geflusht wurde bis zum 13.09.2026 ausschliesslich bei
    // `after_switch_theme` — und ein SFTP-Deploy schaltet kein Theme um. Die
    // neuen Slugs staenden im Code, die Seite bliebe bei 404, und der Diff
    // saehe vollstaendig richtig aus.
    const block = initBlock();
    expect(block, 'der init-Block mit den Rewrite-Regeln ist nicht auffindbar')
      .not.toBeNull();
    expect(block, 'im init-Block wird nie geflusht — neue Slugs erreichen die '
      + 'Seite dann erst, wenn jemand das Theme umschaltet')
      .toMatch(/flush_rewrite_rules/);
    expect(block, 'geflusht wird hart — das versucht, die .htaccess der '
      + 'Installation zu schreiben. Diese Regeln wertet PHP aus, ein weicher '
      + 'Flush (`false`) genügt und fasst keine fremde Datei an')
      .toMatch(/flush_rewrite_rules\(\s*false\s*\)/);
    expect(block, 'der Flush hängt an keiner Bedingung — dann läuft er bei '
      + 'JEDEM Seitenaufruf und schreibt bei jedem Besucher die Regeln neu')
      .toMatch(/get_option\(/);
  });

  test('die Fassung ist aus der Liste abgeleitet, nicht von Hand gepflegt', () => {
    // Eine Handnummer, die man beim Ergaenzen hochzaehlen muss, wird beim
    // naechsten Mal vergessen — und dann steht der neue Slug im Code, ohne
    // dass je geflusht wird. Genau der Fehler, den dieser PR behebt, waere
    // still wieder da.
    //
    // Gemessen wird das VERHALTEN im echten PHP: derselbe Ausdruck ueber
    // zwei verschiedenen Listen muss zwei verschiedene Fassungen ergeben.
    const text = functionsText();
    const zeile = text.match(/\$eb_regel_fassung\s*=\s*([^;]+);/);
    expect(zeile, 'es gibt keine abgeleitete Regel-Fassung in functions.php')
      .not.toBeNull();

    const ausdruck = zeile[1].trim();
    const lauf = (liste) => {
      const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ebrf-')), 'p.php');
      fs.writeFileSync(datei, `<?php\n$spa_pages = ${JSON.stringify(liste)
        .replace(/^\[/, 'array(').replace(/\]$/, ')')};\n`
        + `echo ${ausdruck};\n`);
      return execFileSync('php', [datei], { encoding: 'utf8' }).trim();
    };

    const echt = slugsAusFunctions(text);
    const a = lauf(echt);
    const b = lauf([...echt, 'eine-neue-seite']);
    expect(a.length, 'die Fassung ist leer — dann vergleicht die Bedingung '
      + 'nichts und es wird nie geflusht').toBeGreaterThan(0);
    expect(b, 'ein zusätzlicher Slug ändert die Fassung NICHT. Dann ist sie '
      + 'festgeschrieben statt abgeleitet, und die nächste neue Seite '
      + 'erreicht die Live-Regeln nie').not.toBe(a);
  });

  test('der Smoke-Test verlässt sich weiter auf die Navigation im Browser', () => {
    // Der Befund selbst, festgehalten. `spaNavigate()` ruft `navigateTo()` im
    // Browser und stellt keine Anfrage — das ist fuer seinen Zweck richtig
    // (rendert die Seite ohne Page-Errors) und als Nachweis fuer die
    // Erreichbarkeit untauglich.
    //
    // Verschwindet diese Eigenschaft, ist die einzige Stelle weg, an der
    // steht, WARUM es diese Suite zusaetzlich gibt.
    const helpers = fs.readFileSync(path.join(__dirname, 'helpers.js'), 'utf8');
    expect(helpers, 'spaNavigate navigiert nicht mehr über `navigateTo` im '
      + 'Browser. Prüft es jetzt echte Anfragen, ist diese Suite womöglich '
      + 'überflüssig — dann hier nachziehen statt beides stehen zu lassen')
      .toMatch(/spaNavigate[\s\S]{0,300}navigateTo/);

    // Und die Gegenprobe, dass der Smoke-Test wirklich Routen fuehrt, die
    // diese Suite deckt: sonst pruefte keine der beiden den Fall.
    const smoke = fs.readFileSync(path.join(__dirname, 'smoke.spec.js'), 'utf8');
    const slugs = slugsAusFunctions();
    const genannt = [...smoke.matchAll(/\[\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
    const fremd = genannt.filter((s) => !slugs.includes(s));
    expect(fremd, `der Smoke-Test fährt Routen, die der Server nicht kennt: `
      + `${fremd.join(', ')}. Er bleibt grün, weil er nur im Browser `
      + `navigiert — live enden sie auf der Fehlerseite`).toEqual([]);
  });
});
