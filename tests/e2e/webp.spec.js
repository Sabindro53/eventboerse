// Bilder: das FORMAT, nicht die Größe.
//
// Gemessen am 31.08.2026 gegen die Live-Seite: 1285 KB der 2189 KB einer
// Startseite sind Bilder. Lighthouse beziffert den Gewinn durch moderne
// Formate auf 675 KB — und den durch richtige Dimensionen auf **0 Bytes**
// (`uses-responsive-images`). Die Bilder werden ungefähr so ausgeliefert, wie
// sie angezeigt werden; ein srcset brächte hier nichts. Wer trotzdem eines
// baut, hat viel Mechanik für keinen Gewinn.
//
// `eb_listings.images` hält blanke URLs als JSON. Diese umzuschreiben wäre
// ein Durchlauf über echte Nutzerdaten — genau die Sorte Eingriff, die hier
// schon einmal Zahlungsdaten hätte löschen können. Deshalb liegt
// `foo.jpg.webp` NEBEN `foo.jpg`, und Apache entscheidet je Anfrage.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const HTACCESS = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

/** Fährt den PHP-Prüfstand gegen den echten Code und echte Bilddateien. */
let zwischenspeicher = null;
function pruefstand() {
  if (!zwischenspeicher) {
    zwischenspeicher = JSON.parse(execFileSync('php', [path.join(__dirname, 'webp.php')],
      { cwd: ROOT, encoding: 'utf8' }));
  }
  return zwischenspeicher;
}

test.describe('WebP entsteht wirklich — an echten Bilddateien gemessen', () => {
  test('GD kann WebP, sonst prüft dieser Test nichts', () => {
    // Ohne imagewebp() wären alle folgenden Zusicherungen bedeutungslos, und
    // ein grüner Lauf hieße nur „nicht nachgesehen".
    expect(pruefstand().gd, 'diese PHP-Installation hat kein imagewebp()').toBe(true);
  });

  test('ein Foto wird deutlich kleiner, das Original bleibt unberührt', () => {
    const r = pruefstand().foto;
    expect(r.stand).toBe('erzeugt');
    expect(r.webpByte, 'WebP nicht entstanden').toBeGreaterThan(0);
    // Der gemessene Gewinn liegt bei rund 62 %. Die Schranke steht bei 25 %,
    // damit sie eine echte Verschlechterung fängt und nicht bei jeder
    // GD-Version ausschlägt.
    expect(r.webpByte, `kaum kleiner: ${r.originalByte} -> ${r.webpByte}`)
      .toBeLessThan(r.originalByte * 0.75);
    expect(r.originalUnberuehrt, 'das Original wurde verändert').toBe(true);
    expect(r.markerDa, 'nach Erfolg darf kein Merkzettel liegen').toBe(false);
  });

  test('die Begleitdatei hängt an, sie ersetzt nicht', () => {
    // `foo.webp` statt `foo.jpg.webp` würde ein echtes WebP-Upload gleichen
    // Namens überschreiben.
    const n = pruefstand().namen;
    expect(n.webp).toBe('/x/foo.jpg.webp');
    expect(n.marker).toBe('/x/foo.jpg.webp.aus');
  });

  test('ein zweiter Aufruf schreibt nicht neu', () => {
    const r = pruefstand().zweiterAufruf;
    expect(r.stand).toBe('vorhanden');
    expect(r.unveraendert, 'die vorhandene Datei wurde überschrieben').toBe(true);
  });

  test('Transparenz überlebt die Umsetzung', () => {
    // Ohne imagepalettetotruecolor/imagesavealpha wird jede Transparenz
    // schwarz — und zwar erst im Betrieb sichtbar.
    const r = pruefstand().png;
    expect(r.stand, 'das PNG wurde gar nicht umgesetzt — Alpha ungeprüft')
      .toBe('erzeugt');
    expect(r.alphaErhalten, 'die Transparenz ging verloren').toBe(true);
  });

  test('ein Paletten-PNG ergibt eine LESBARE WebP-Datei', () => {
    // Der eigentliche Grund für imagepalettetotruecolor(). Ein truecolor-PNG
    // kommt auch ohne die Zeile durch — daran überlebte die erste
    // Mutationsprobe, und der Test sah dabei grün aus.
    //
    // Bei einem 8-Bit-PNG mit transparentem Farbindex — dem verbreitetsten
    // PNG aus Grafikprogrammen — schreibt GD ohne Umwandlung eine Datei, die
    // `imagecreatefromwebp` nicht mehr öffnen kann. Sie ist da, sie ist
    // kleiner, und der Rückgabewert lautet 'erzeugt'. Apache lieferte sie
    // aus, und im Browser bliebe das Bild leer.
    const r = pruefstand().palettePng;
    expect(r.warPalette, 'das Testbild ist gar keine Palette — der Test prüfte '
      + 'denselben Fall wie oben').toBe(true);
    expect(r.stand).toBe('erzeugt');
    expect(r.alphaErhalten, 'die erzeugte WebP-Datei liess sich nicht wieder '
      + 'öffnen oder verlor die Transparenz').toBe(true);
  });

  test('der Typ kommt aus dem Inhalt, nicht aus der Endung', () => {
    const r = pruefstand().keinBild;
    expect(r.stand).toBe('fehler');
  });

  test('die Speicherschranke greift vor dem Laden', () => {
    // Ein 60000x60000-Bild wären ~14 GB als truecolor. Ohne Schranke bräche
    // PHP mitten im Upload ab, und der Nutzer verlöre sein Bild.
    const r = pruefstand().speicher;
    expect(r.winzigPasst, 'ein kleines Bild wird abgelehnt').toBe(true);
    expect(r.riesigNicht, 'ein absurd großes Bild würde geladen').toBe(true);
  });
});

test.describe('Die Nachrüstung kommt garantiert voran', () => {
  // Der Merkzettel ist kein Schönheitsfehler, er ist der Ausstieg. Ohne ihn
  // bliebe ein Bild, dessen WebP größer ausfällt, für immer Kandidat und
  // stünde bei jedem Lauf wieder vorn — nach ein paar solchen Dateien käme
  // die Schlange nie an den Rest.

  test('ein größeres WebP wird gelöscht UND vermerkt', () => {
    const r = pruefstand().groesser;
    expect(r.stand).toBe('groesser');
    expect(r.webpGeloescht, 'ein größeres WebP blieb liegen — das wäre eine '
      + 'Verschlechterung mit gutem Gewissen').toBe(true);
    expect(r.markerDa, 'ohne Merkzettel wiederholt sich diese Datei ewig').toBe(true);
  });

  test('ein nicht umsetzbares Format wird vermerkt, nicht umgesetzt', () => {
    const r = pruefstand().gif;
    expect(r.stand).toBe('uebersprungen');
    expect(r.keinWebp, 'aus einem GIF entstand ein WebP').toBe(true);
    expect(r.markerDa, 'ohne Merkzettel wiederholt sich diese Datei ewig').toBe(true);
  });

  test('auch ein Fehler wird vermerkt', () => {
    expect(pruefstand().keinBild.markerDa,
      'eine kaputte Datei bliebe sonst für immer vorn in der Schlange').toBe(true);
  });

  test('die Kandidatensuche überspringt beides — WebP und Merkzettel', () => {
    const fn = FUNCTIONS.match(/function eb_webp_kandidaten\(\)[\s\S]*?\n\}/);
    expect(fn, 'eb_webp_kandidaten ist verschwunden').toBeTruthy();
    expect(fn[0], 'die Suche überspringt vorhandene WebP-Dateien nicht')
      .toMatch(/file_exists\(\s*eb_webp_pfad/);
    expect(fn[0], 'die Suche überspringt den Merkzettel nicht — die Nachrüstung '
      + 'käme nie voran').toMatch(/file_exists\(\s*eb_webp_marker_pfad/);
  });

  test('fehlendes GD hinterlässt KEINEN Merkzettel', () => {
    // Das liegt an der Installation, nicht an der Datei. Würde hier vermerkt,
    // wären nach einem GD-Nachbau alle Bilder dauerhaft ausgeschlossen — und
    // niemand wüsste, warum die Nachrüstung nichts mehr findet.
    const fn = FUNCTIONS.match(/function eb_webp_erzeugen\([\s\S]*?\n\}/);
    expect(fn, 'eb_webp_erzeugen ist verschwunden').toBeTruthy();
    const stelle = fn[0].match(
      /if \(\s*!\s*function_exists\(\s*'imagewebp'\s*\)\s*\)\s*\{[\s\S]*?\}/);
    expect(stelle, 'die GD-Prüfung ist verschwunden').toBeTruthy();
    expect(stelle[0], 'fehlendes GD schreibt einen Merkzettel')
      .not.toMatch(/aufgeben/);
  });

  test('der Upload lässt sich von der Umsetzung nicht aufhalten', () => {
    // Das Bild ist da, geprüft und zugeordnet. An einer Formatoptimierung zu
    // scheitern wäre die schlechtere Antwort.
    const stelle = FUNCTIONS.slice(FUNCTIONS.indexOf('eb_webp_erzeugen( $upload'));
    expect(stelle.slice(0, 400), 'der Upload bricht bei einem WebP-Fehler ab')
      .not.toMatch(/is_wp_error\(\s*\$webp|return new WP_REST_Response\([^)]*500/);
  });
});

test.describe('Apache liefert WebP aus, ohne eine Adresse zu ändern', () => {
  test('die Umleitung greift nur bei echter Datei und passendem Accept', () => {
    const block = HTACCESS.match(/<IfModule mod_rewrite\.c>[\s\S]*?RewriteRule \^\(\.\+\)\$ \$1\.webp[^\n]*/);
    expect(block, 'die WebP-Regel fehlt').toBeTruthy();
    const regel = block[0];
    expect(regel, 'ohne Accept-Prüfung bekämen alte Browser WebP')
      .toMatch(/RewriteCond %\{HTTP_ACCEPT\} image\/webp/);
    expect(regel, 'ohne -f würde auf eine nicht existierende Datei umgeleitet — '
      + 'das Bild wäre weg').toMatch(/RewriteCond %\{REQUEST_FILENAME\}\\?\.webp -f/);
    expect(regel, 'die Regel greift auch bei anderen Dateitypen')
      .toMatch(/\\\.\(jpe\?g\|png\)\$/);
  });

  test('Vary: Accept steht da — sonst vergiftet ein Cache die Antwort', () => {
    // Ohne diesen Kopf darf ein Zwischenspeicher die WebP-Antwort an einen
    // Client weitergeben, der kein WebP annimmt. Der bekäme unter einer
    // .jpg-Adresse Bytes, die er nicht dekodieren kann — kaputt, und zwar
    // nur für manche. Dieselbe Mechanik wie bei Accept-Encoding.
    expect(HTACCESS, 'Vary: Accept fehlt für Bilder')
      .toMatch(/<FilesMatch "\\\.\(jpe\?g\|png\)\$">[\s\S]{0,200}Header append Vary Accept/);
  });

  test('der ausgelieferte Inhaltstyp wird richtiggestellt', () => {
    // Die Adresse endet auf .jpg, der Inhalt ist WebP. Ohne Korrektur meldet
    // Apache image/jpeg für WebP-Bytes.
    expect(HTACCESS, 'Content-Type wird nicht auf image/webp gesetzt')
      .toMatch(/Header set Content-Type "image\/webp" env=EB_WEBP/);
    expect(HTACCESS, 'die Regel setzt die Umgebungsvariable EB_WEBP nicht')
      .toMatch(/E=EB_WEBP:1/);
  });

  test('alles steht in <IfModule> — fehlt das Modul, bleibt es beim Original', () => {
    // <IfModule> entscheidet beim Start, nicht zur Laufzeit. Fehlt mod_rewrite
    // auf dem IONOS-Pool, muss der Block folgenlos übersprungen werden statt
    // die ganze .htaccess mit einem 500er zu quittieren.
    //
    // Gezählt wird mit einem STAPEL. Die erste Fassung zog alle </IfModule>
    // von nur den mod_rewrite-Öffnungen ab und kam durch die Brotli- und
    // Headers-Blöcke davor auf -2 — der Test fiel, die Datei war in Ordnung.
    const stapel = [];
    let umgebung = null;
    for (const zeile of HTACCESS.split('\n')) {
      const auf = zeile.match(/<IfModule\s+([^>]+)>/i);
      if (auf) { stapel.push(auf[1].trim()); continue; }
      if (/<\/IfModule>/i.test(zeile)) { stapel.pop(); continue; }
      if (zeile.includes('RewriteCond %{HTTP_ACCEPT} image/webp')) {
        umgebung = [...stapel];
      }
    }
    expect(umgebung, 'die WebP-Regel fehlt').toBeTruthy();
    expect(umgebung, 'die Regel steht ausserhalb jedes <IfModule>')
      .toContain('mod_rewrite.c');
    expect(stapel, 'in der .htaccess bleibt ein <IfModule> offen').toHaveLength(0);
  });
});

test.describe('Die Nachrüst-Route ist admin-only und gedeckelt', () => {
  test('sie hängt an derselben Schranke wie der Demo-Import', () => {
    const stelle = FUNCTIONS.match(
      /register_rest_route\(\s*'eventboerse\/v1',\s*'\/hq\/webp',\s*array\([\s\S]*?\)\s*\);/);
    expect(stelle, 'die Route /hq/webp ist nicht registriert').toBeTruthy();
    expect(stelle[0], 'die Route ist nicht auf Administratoren beschränkt')
      .toMatch(/'permission_callback'\s*=>\s*'eb_hq_verwaltung_darf'/);
  });

  test('GET zeigt nur den Stand, POST arbeitet', () => {
    // Ein Blick mit Nebenwirkungen wird seltener geworfen, als er sollte.
    const fn = FUNCTIONS.match(/function eb_hq_webp_nachruesten\([\s\S]*?\n\}/);
    expect(fn, 'der Handler ist verschwunden').toBeTruthy();
    expect(fn[0], 'GET und POST tun dasselbe')
      .toMatch(/get_method\(\)\s*\)\s*!==\s*'POST'/);
  });

  test('gedeckelt nach Anzahl UND nach Zeit', () => {
    // Ein Durchlauf, der ins PHP-Zeitlimit läuft, wird mitten in der Arbeit
    // abgeschnitten — und dann weiss niemand, wie weit er kam.
    const fn = FUNCTIONS.match(/function eb_hq_webp_nachruesten\([\s\S]*?\n\}/)[0];
    expect(fn, 'keine Mengengrenze').toMatch(/\$max_anzahl/);
    expect(fn, 'keine Zeitgrenze').toMatch(/\$max_sekunden/);
    expect(fn, 'die Zeitgrenze wird nicht geprüft').toMatch(/microtime\(\s*true\s*\)\s*-\s*\$start/);
  });

  test('das HQ zeigt den Knopf nur Administratoren', () => {
    // Die Sperre ist und bleibt die Route. Der Knopf verschwindet trotzdem:
    // ein Bedienelement, das nur eine 403 erzeugt, ist eine Fehlfunktion.
    const hq = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
    const block = hq.match(/const block = document\.getElementById\('webp-block'\);[\s\S]{0,240}/);
    expect(block, 'der WebP-Block im HQ fehlt').toBeTruthy();
    expect(block[0], 'der Block bleibt für Nicht-Administratoren stehen')
      .toMatch(/if \(!HQ_IST_ADMIN\) \{ block\.remove\(\); return; \}/);
  });

  test('ohne imagewebp() bleibt der Knopf wirklich gesperrt', () => {
    // Die Sperre muss dort gesetzt werden, wo der Zustand erkannt wird.
    // Stand sie nur am GET-Aufrufer, gäbe ein POST mit `moeglich: false` den
    // Knopf im finally sofort wieder frei — er sähe gesperrt aus und wäre es
    // nicht. Genau so war die erste Fassung.
    const hq = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
    const fn = hq.match(/function zeigeStand\(d, zusatz\) \{\s*const offen = Number\(d\.offen\) \|\| 0;[\s\S]*?\n  \}/);
    expect(fn, 'zeigeStand des WebP-Blocks ist verschwunden').toBeTruthy();
    // Kommentare raus, BEVOR gesucht wird. Die erste Fassung suchte nach dem
    // Wort „gesperrt" und fand es im erklärenden Kommentar darüber — die
    // Mutation, die genau diese Zeile entfernte, überlebte deshalb. Dieselbe
    // Falle wie beim CodeQL-Befund vom 01.09.: ein Muster, das Prosa trifft,
    // prüft keinen Code.
    const code = fn[0].split('\n').filter((z) => !/^\s*\/\//.test(z)).join('\n');
    expect(code, 'der Nicht-möglich-Fall sperrt den Knopf nicht dauerhaft')
      .toMatch(/moeglich === false[\s\S]{0,300}knopf\.dataset\.gesperrt\s*=/);
  });

  test('„offen" zählt, was wirklich übrig ist', () => {
    const fn = FUNCTIONS.match(/function eb_hq_webp_nachruesten\([\s\S]*?\n\}/)[0];
    expect(fn, '„offen" wird nicht aus den geprüften abgeleitet')
      .toMatch(/'offen'\s*=>\s*max\(\s*0,\s*\$offen_vorher\s*-\s*\$geprueft\s*\)/);
  });
});
