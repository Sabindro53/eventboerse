// Verbindungs-Tests: Connector-Katalog und HQ-Zugang.
//
// Zwei Dinge werden hier festgehalten, die beide schon einmal falsch waren:
//
//   1. Das HQ war faktisch offen — die Prüfung lief im Browser gegen eine
//      im HTML mitgelieferte Schlüsselliste. Kein Test hätte das gemeldet.
//   2. Ein Katalog, der Status behauptet, ist eine Lüge in Dateiform. Der
//      Katalog beschreibt Möglichkeiten; ob etwas verbunden IST, entscheidet
//      ausschließlich ein echter Aufruf zur Laufzeit.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const KATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'eb-connectors.json'), 'utf8'));
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
const HTACCESS = fs.readFileSync(path.join(ROOT, '.htaccess'), 'utf8');

/**
 * PHP-Kommentare entfernen.
 *
 * Eine Zusicherung gegen den Rohtext prüft auch die Kommentare — und ein
 * Kommentar, der den behobenen Fehler beschreibt („vorher stand hier
 * readfile('404.html')"), lässt den Test dann über die eigene Erklärung
 * stolpern. Geprüft wird, was ausgeführt wird.
 */
function ohneKommentare(php) {
  return php.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Rumpf einer PHP-Funktion — bis zur nächsten Funktion oder add_action.
 *
 * Feste Zeichenfenster (`.slice(0, 900)`) haben hier schon dreimal gelogen:
 * wächst der Kommentar über der Prüfung, rutscht die Zusicherung aus dem
 * Fenster und der Test wird grün, ohne noch etwas zu prüfen.
 */
function rumpfVon(quelle, name) {
  const von = quelle.indexOf(`function ${name}`);
  if (von === -1) return '';
  const enden = [quelle.indexOf('\nfunction ', von + 10), quelle.indexOf('\nadd_action', von + 10)]
    .filter((i) => i !== -1);
  return quelle.slice(von, enden.length ? Math.min(...enden) : undefined);
}

test.describe('HQ-Zugang', () => {
  test('hq.html enthält keine Zugangsschlüssel im Klartext', () => {
    // Der konkrete Rückfall, den es hier gab: HQ_KEYS = ['eb-hq-2026', …].
    expect(HQ, 'Schlüsselliste im ausgelieferten HTML').not.toMatch(/HQ_KEYS/);
    expect(HQ).not.toMatch(/eb-hq-2026|eventboerse-hq/);
    expect(HQ, 'clientseitige Schlüsselprüfung ist keine Prüfung').not.toMatch(/function checkAuth/);
  });

  test('Auslieferung prüft serverseitig auf Administrator', () => {
    expect(FUNCTIONS).toMatch(/function eb_serve_hq/);
    const fn = rumpfVon(FUNCTIONS, 'eb_serve_hq');
    // Die Rechteprüfung sitzt in eb_hq_darf_sehen() — sie deckt neben
    // manage_options auch die Mitarbeiter-Fähigkeit UND den zweiten Faktor ab.
    expect(fn, 'ohne Rechteprüfung wäre /hq offen').toMatch(/eb_hq_darf_sehen\(\)/);
    const tor = rumpfVon(FUNCTIONS, 'eb_hq_darf_sehen');
    expect(tor, 'Admin-Weg fehlt').toMatch(/'manage_options'/);
    expect(tor, 'Mitarbeiter-Weg fehlt').toMatch(/'eb_hq_access'/);
    // Der entscheidende Punkt: eingerichtetes TOTP muss auch benutzt werden.
    expect(tor, 'zweiter Faktor wird nicht erzwungen')
      .toMatch(/eb_totp_aktiv\([^)]*\)\s*\)\s*return eb_hq_sitzung_offen/);
    // 404 statt 403: eine Seite, deren Existenz man nicht bestätigt, wird
    // auch nicht gezielt angegriffen.
    const abweisung = fn.slice(0, fn.indexOf('$file'));
    expect(abweisung, 'Abweisung muss 404 setzen').toMatch(/status_header\(\s*404\s*\)/);
    expect(abweisung, 'nie 403 — das bestätigt die Existenz').not.toMatch(/status_header\(\s*40[13]\s*\)/);
  });

  test('Administratoren kommen ohne zweites Geheimnis hinein', () => {
    // Der Wunsch war: wer als Administrator angemeldet ist, soll ins HQ,
    // ohne noch ein Passwort einzugeben. Genau das leistet die
    // WordPress-Sitzung schon — es fehlte nur der Weg dorthin.
    //
    // Vom 15. bis 20.08. lief hier ein Generalzugang mit geteiltem Passwort.
    // Dieser Test haelt fest, dass er weg ist und nicht zurueckkehrt: ein
    // zweiter Weg hinein waere ein zweites Geheimnis, das gepflegt,
    // gewechselt und widerrufen werden muesste.
    const wirksam = FUNCTIONS.split('\n').filter((z) => !/^\s*(\*|\/\/)/.test(z)).join('\n');
    for (const rest of ['EB_HQ_PASSWORT_HASH', 'eb_hq_tor_offen', 'eb_hq_torseite_ausliefern',
                        'eb_hq_tor_versuch', 'EB_HQ_TOR_COOKIE']) {
      expect(wirksam, `${rest} ist zurueck — kein zweiter Weg ins HQ`).not.toContain(rest);
    }
    // Und der Zugang haengt allein an der geprueften Nutzeridentitaet.
    const gate = rumpfVon(FUNCTIONS, 'eb_hq_zugang_offen');
    expect(gate).toMatch(/eb_hq_darf_sehen\(\)/);
    expect(gate, 'kein Passwort, kein Cookie, kein Token').not.toMatch(/passwort|cookie|token/i);
  });

  test('das HQ ist aus dem Admin-Bereich erreichbar', () => {
    // /hq stand nirgends verlinkt — man musste die Adresse kennen. Das war
    // der eigentliche Grund fuer den Wunsch nach einem Passwortzugang: nicht
    // die Anmeldung fehlte, sondern der Weg.
    expect(FUNCTIONS, 'kein Eintrag in der Admin-Leiste').toMatch(/admin_bar_menu/);
    expect(FUNCTIONS, 'kein Eintrag im Admin-Menue').toMatch(/add_menu_page\(/);

    // Jede Stelle, die auf /hq verlinkt, muss hinter der Rechtepruefung
    // stehen. Ein Menuepunkt, der auf eine 404 fuehrt, behauptet ein Recht,
    // das nicht existiert — und verraet nebenbei, dass es /hq gibt.
    //
    // Bewusst ueber ALLE add_action-Bloecke, nicht ueber den ersten: das Theme
    // haengt sich mehrfach an `admin_menu` (unter anderem, um die Kommentare
    // auszublenden). Ein Test, der den ersten Treffer nimmt, prueft dann den
    // falschen Block — und faellt entweder zu Unrecht durch oder, schlimmer,
    // zu Unrecht durch die Maschen.
    const bloecke = [...FUNCTIONS.matchAll(/add_action\(\s*'(admin_bar_menu|admin_menu)'[\s\S]*?\n\}\s*(?:,\s*\d+\s*)?\);/g)];
    const mitHq = bloecke.filter((m) => /home_url\(\s*'\/hq'\s*\)/.test(m[0]));
    expect(mitHq.length, 'kein Admin-Einstieg, der auf /hq zeigt').toBeGreaterThanOrEqual(2);
    for (const m of mitHq) {
      expect(m[0], `${m[1]} verlinkt /hq ohne Rechtepruefung`).toMatch(/eb_hq_grundrecht\(\)/);
    }
  });

  test('Zugänge vergibt nur, wer wirklich Administrator ist', () => {
    // Die Maske im HQ ist Höflichkeit, keine Sicherheit: die Route prüft
    // ohnehin. Aber ein Knopf, der einem Mitarbeiter 403 antwortet, sieht aus
    // wie ein Fehler — und ein Knopf, den ein Mitarbeiter bedienen KANN, wäre
    // einer.
    expect(FUNCTIONS, 'das Admin-Flag wird nicht eingesetzt')
      .toMatch(/__EB_HQ_IST_ADMIN__/);
    const ersetzung = FUNCTIONS.slice(FUNCTIONS.indexOf("'__EB_HQ_IST_ADMIN__'"));
    expect(ersetzung.slice(0, 200), 'das Flag muss aus der strengen Prüfung kommen')
      .toMatch(/eb_hq_verwaltung_darf\(\)/);

    // Und die Oberfläche verlässt sich darauf.
    expect(HQ).toMatch(/const HQ_IST_ADMIN = '__EB_HQ_IST_ADMIN__' === '1'/);
    expect(HQ, 'ohne Adminrecht muss der Block verschwinden')
      .toMatch(/if \(!HQ_IST_ADMIN\)[\s\S]{0,80}remove\(\)/);
    // Lokal ist der Platzhalter roher Text — dann gilt "kein Admin".
    expect('__EB_HQ_IST_ADMIN__' === '1', 'unersetzt darf er nicht wahr sein').toBe(false);
  });

  test('die Zugangsmaske legt keine Konten an', () => {
    // Ein Zugang, der aus einer Maske heraus entsteht, ist schwerer
    // nachzuvollziehen als einer, den ein Mensch in WordPress angelegt hat.
    const rumpf = rumpfVon(FUNCTIONS, 'eb_hq_mitarbeiter');
    expect(rumpf, 'schaltet nur bestehende Konten frei').toMatch(/get_user_by\(\s*'email'/);
    expect(rumpf, 'kein Anlegen neuer Konten')
      .not.toMatch(/wp_insert_user|wp_create_user/);
    // Und der Hinweis auf den fehlenden zweiten Faktor muss durchgereicht
    // werden — ohne ihn kommt der Mitarbeiter nicht hinein.
    expect(rumpf).toMatch(/'totp'/);
    expect(HQ, 'die Maske verschweigt den fehlenden zweiten Faktor')
      .toMatch(/d\.totp === false|d\.hinweis/);
  });

  test('Abweisung sieht aus wie jede andere unbekannte Adresse', () => {
    // Der Fehler, der das ausgelöst hat: die Abweisung lieferte 404.html —
    // eine eingefrorene SPA-Kopie mit relativen Pfaden. Unter /hq zeigten
    // styles.css und app.js ins Leere, die Seite kam nackt an.
    const fn = ohneKommentare(rumpfVon(FUNCTIONS, 'eb_serve_hq'));
    const abweisung = fn.slice(0, fn.indexOf('$file'));
    expect(abweisung, 'kein eigener Body — die reguläre 404-Seite des Themes')
      .toMatch(/require\s+get_template_directory\(\)\s*\.\s*'\/404\.php'/);
    expect(abweisung, 'eingefrorene SPA-Kopie darf nicht zurückkommen').not.toMatch(/404\.html/);
    // Ein Header, den nur /hq setzt, ist ein messbares Signal.
    expect(abweisung, 'kein Header, den andere 404er nicht haben').not.toMatch(/X-Robots-Tag/);
  });

  test('keine eingefrorene SPA-Kopie mehr im Theme', () => {
    // app-shell.html ist die einzige Quelle des SPA-Bodys. Eine zweite Kopie
    // driftet zwangsläufig — diese hier war vier Monate alt.
    expect(fs.existsSync(path.join(ROOT, '404.html')), '404.html ist eine Kopie von app-shell.html').toBe(false);
  });

  test('direkter Theme-Pfad ist gesperrt', () => {
    // Apache liefert Theme-Dateien direkt aus, PHP läuft dabei nie — ohne
    // diese Sperre wäre die Rechteprüfung schlicht umgehbar.
    expect(HTACCESS).toMatch(/wp-content\/themes\/\[\^\/\]\+\/hq\\\.html/);
    const deploy = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ionos-deploy.yml'), 'utf8');
    const builder = fs.readFileSync(path.join(ROOT, 'scripts', 'build-protected-hq.mjs'), 'utf8');
    expect(deploy, 'statisches HQ darf nicht auf den Server gespiegelt werden').toMatch(/-x '\^hq\\\.html\$'/);
    expect(deploy, 'alte statische HQ-Kopie muss beim Deploy entfernt werden').toContain('rm -f ${DEPLOY_DIR}hq.html');
    expect(deploy, 'geschütztes HQ-Template wird nicht erzeugt').toContain('node scripts/build-protected-hq.mjs');
    expect(builder, 'Direktaufruf des PHP-Templates ist nicht gesperrt').toMatch(/! defined\( 'ABSPATH' \)/);
    expect(FUNCTIONS, 'HQ-Auslieferung bevorzugt nicht das geschützte Template').toContain("'/hq-protected.php'");
  });

  test('HQ wird nicht indexiert', () => {
    // Geprüft wird die AUSLIEFERUNG an den Administrator — nur die ist eine
    // echte Seite. Die Abweisung ist eine 404 und wird ohnehin nicht indexiert.
    const fn = rumpfVon(FUNCTIONS, 'eb_serve_hq');
    const auslieferung = fn.slice(fn.indexOf('$file'));
    expect(auslieferung, 'ausgeliefertes HQ ohne noindex').toMatch(/X-Robots-Tag.*noindex/);
  });

  test('geschützte REST-Proxies erhalten den WordPress-Nonce', () => {
    // Cookie-Auth allein reicht in der WP-REST-API nicht: ohne X-WP-Nonce
    // wird der aktuelle Nutzer auf 0 gesetzt und manage_options scheitert.
    expect(HQ).toMatch(/const HQ_REST_NONCE\s*=\s*['"]__EB_HQ_REST_NONCE__/);
    expect(HQ).toMatch(/['"]X-WP-Nonce['"]\s*:\s*HQ_REST_NONCE/);
    const start = FUNCTIONS.indexOf('function eb_serve_hq');
    const fn = FUNCTIONS.slice(start, FUNCTIONS.indexOf("add_action( 'template_redirect'", start));
    expect(fn).toMatch(/wp_create_nonce\(\s*'wp_rest'\s*\)/);
    expect(fn).toMatch(/str_replace\(\s*'__EB_HQ_REST_NONCE__'/);
    expect(fn).toMatch(/file_get_contents\(\s*\$file\s*\)/);
  });
});

test.describe('Datendateien erreichbar', () => {
  // Der konkrete Ausfall: das HQ läuft unter /hq, die Datendateien liegen im
  // Theme. Ein relativer fetch zeigte von dort ins Leere — der Katalog kam nie
  // an („Connector-Katalog nicht ladbar"). Bei Tieflinks wie
  // /hq/connections/github wäre es noch eine Ebene daneben gelandet.
  test('HQ holt Datendateien über absolute Pfade', () => {
    expect(HQ, 'hqAsset() löst assets/ und audit/ absolut auf').toMatch(/function hqAsset/);
    // Kein roher relativer fetch auf die Datenordner mehr.
    expect(HQ).not.toMatch(/fetch\(\s*['"]assets\//);
    expect(HQ).not.toMatch(/new URL\(\s*['"]audit\//);
  });

  test('functions.php liefert /assets/*.json und /audit/*.json aus', () => {
    expect(FUNCTIONS).toMatch(/\^\/\(assets\|audit\)\//);
    // Bis zum `exit;` des Blocks lesen statt eine Zeichenzahl zu raten —
    // ein zusätzlicher Kommentar darf den Test nicht kippen.
    const start = FUNCTIONS.indexOf("'#^/(assets|audit)/");
    const block = FUNCTIONS.slice(start, FUNCTIONS.indexOf('readfile( $ziel );', start) + 40);
    // Nur JSON — für Skripte und Stile gibt es den Theme-Pfad.
    expect(block.slice(0, 200)).toMatch(/\\\.json/);
    // Ausbruch nach oben muss am aufgelösten Pfad scheitern, nicht nur am Muster.
    expect(block).toMatch(/realpath/);
    expect(block).toMatch(/strpos\(\s*\$ziel/);
    expect(block).toMatch(/X-Content-Type-Options/);
  });

  test('nur harmlose Datendateien sind öffentlich', () => {
    // Der Connector-Katalog nennt Berechtigungen, interne Endpunkte und
    // Schlüssel-Ablagen; der Selbstcheck listet die eigenen Schwachstellen.
    // Beides ist eine Landkarte, die Angreifer nicht bekommen sollen.
    const start = FUNCTIONS.indexOf("'#^/(assets|audit)/");
    const block = FUNCTIONS.slice(start, FUNCTIONS.indexOf('readfile( $ziel );', start) + 40);
    expect(block, 'Whitelist der öffentlichen Dateien fehlt').toMatch(/\$oeffentlich\s*=\s*array\(/);
    const liste = block.match(/\$oeffentlich\s*=\s*array\(([^)]*)\)/)[1];
    expect(liste).toContain('eb-knowledge.json');   // der Website-Bot braucht sie
    expect(liste).toContain('eb-demo-feed.json');   // Demo-Inhalte für jeden
    expect(liste, 'der Connector-Katalog darf nicht öffentlich sein').not.toContain('eb-connectors.json');
    expect(liste, 'der Selbstcheck darf nicht öffentlich sein').not.toContain('latest.json');
    // Alles außerhalb der Liste verlangt einen geprüften HQ-Zugang.
    //
    // Geprüft wird die Eigenschaft, nicht die Formulierung: hier stand früher
    // `current_user_can('manage_options')` von Hand nachgebaut. Das ließ einen
    // Administrator durch, der den zweiten Faktor noch gar nicht vorgelegt
    // hatte — die Seite war zu, die Daten dahinter nicht.
    expect(block).toMatch(/in_array\(\s*\$m\[2\],\s*\$oeffentlich/);
    expect(block, 'die Datendateien müssen dieselbe Frage stellen wie die Seite')
      .toMatch(/eb_hq_zugang_offen\(\)/);
    const gate = rumpfVon(FUNCTIONS, 'eb_hq_zugang_offen');
    expect(gate, 'der Zugang muss den geprüften Nutzerweg enthalten').toMatch(/eb_hq_darf_sehen\(\)/);
  });

  test('Serverseiten-Proxy hält den Schlüssel auf dem Server', () => {
    // Alle HQ-Routen hinter einer geprüften Schwelle.
    expect(FUNCTIONS).toMatch(/function eb_hq_proxy_darf/);
    // Die Schwelle darf sich verschieben (Mitarbeiter-Fähigkeit, zweiter
    // Faktor, Generalzugang) — sie muss aber über die gemeinsame Funktion
    // laufen, damit es nur eine Stelle gibt, die man ändern kann.
    expect(rumpfVon(FUNCTIONS, 'eb_hq_proxy_darf')).toMatch(/eb_hq_zugang_offen\(\)/);
    // Jede EINZELNE /hq-Route prüfen, statt Anzahlen zu vergleichen. Eine
    // weitere Route ist erwünscht — sie muss nur dieselbe Schwelle tragen,
    // und genau das ist die Aussage. Zweimal hat eine Zählung hier zu Unrecht
    // Alarm geschlagen, weil eine neue Route dazugekommen war.
    // Bindestriche und Ziffern gehoeren ins Muster: `/hq/demo-bilder` lief
    // sonst an dieser Schleife vorbei — erfasst wurden 8 von 9 Routen, und
    // die neunte waere ungeprueft geblieben. Genau dafuer gibt es die
    // Gegenprobe unten, die beide Zaehlungen vergleicht.
    const routen = [...FUNCTIONS.matchAll(
      /register_rest_route\(\s*'eventboerse\/v1',\s*'(\/hq\/[a-z0-9\/-]+)',\s*array\(([\s\S]*?)\)\s*\);/g)];
    expect(routen.length, 'es muss HQ-Routen geben').toBeGreaterThanOrEqual(3);
    // Zwei zugelassene Schwellen, keine dritte: die gemeinsame HQ-Prüfung und
    // die strengere Verwaltungsprüfung. `__return_true` oder eine eigene
    // Bedingung pro Route fällt hier durch.
    const erlaubt = ['eb_hq_proxy_darf', 'eb_hq_verwaltung_darf'];
    for (const [, pfad, rumpf] of routen) {
      const cb = (rumpf.match(/'permission_callback'\s*=>\s*'([a-z_]+)'/) || [, ''])[1];
      expect(erlaubt, `${pfad} trägt eine unbekannte Rechteprüfung: ${cb || '(keine)'}`).toContain(cb);
    }
    // Und die Route, die Zugänge vergibt, trägt die strengere von beiden.
    const verwaltung = routen.find(([, p]) => p === '/hq/mitarbeiter');
    expect(verwaltung, '/hq/mitarbeiter muss erfasst sein').toBeTruthy();
    expect(verwaltung[2], 'Zugänge vergeben darf nur ein angemeldeter Administrator')
      .toMatch(/'permission_callback'\s*=>\s*'eb_hq_verwaltung_darf'/);
    // Umgekehrt: keine HQ-Route darf an der Prüfung vorbei registriert werden.
    const alleHq = FUNCTIONS.match(/register_rest_route\(\s*'eventboerse\/v1',\s*'\/hq\//g) || [];
    expect(alleHq.length, 'jede /hq-Route muss oben erfasst sein').toBe(routen.length);

    // Die Antwort darf den Schlüssel nicht zurückgeben — nur Zahlen.
    // Genau bis zum Ende DIESER Funktion lesen; die nächste nennt die
    // Konstante zu Recht, weil sie den Aufruf macht.
    const von = FUNCTIONS.indexOf('function eb_hq_proxy_antwort');
    const bis = FUNCTIONS.indexOf('\nfunction ', von + 10);
    const antwort = FUNCTIONS.slice(von, bis);
    expect(antwort, 'die Antwort darf den Schlüssel nicht enthalten').not.toMatch(/EB_(ANTHROPIC|OPENAI|OPENROUTER)_API_KEY/);
    // Verbrauch bleibt als nicht abrufbar geführt — dafür braucht es einen
    // gesonderten Admin-Schlüssel, den wir nicht haben.
    expect(antwort).toMatch(/'abrufbar'\s*=>\s*false/);

    // Auch die Probe-Funktionen dürfen den Schlüssel nur SENDEN, nie
    // zurückgeben. Gefährlich ist die Konstante als AUSDRUCK; ihr Name in
    // einer Meldung („… ist nicht hinterlegt") ist Text und hilfreich.
    // Deshalb erst die Zeichenketten entfernen, dann suchen.
    for (const fn of ['eb_hq_probe_anthropic', 'eb_hq_probe_openai', 'eb_hq_probe_openrouter']) {
      const a = FUNCTIONS.indexOf('function ' + fn);
      // Bis zur nächsten Funktion ODER zum nächsten add_action — die letzte
      // Probe-Funktion liefe sonst bis Dateiende und zöge Fremdes herein.
      const kandidaten = [FUNCTIONS.indexOf('\nfunction ', a + 10), FUNCTIONS.indexOf('\nadd_action', a + 10)]
        .filter((x) => x > 0);
      const body = FUNCTIONS.slice(a, kandidaten.length ? Math.min(...kandidaten) : undefined);
      for (const r of body.match(/eb_hq_proxy_antwort\([^;]*/g) || []) {
        const ohneText = r.replace(/'(?:[^'\\]|\\.)*'/g, "''");
        expect(ohneText, `${fn} gibt den Schlüssel zurück`).not.toMatch(/EB_(ANTHROPIC|OPENAI|OPENROUTER)_API_KEY/);
      }
      // Der Schlüssel darf ausschließlich in den Anfrage-Kopfzeilen stehen.
      const alsAusdruck = (body.replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .match(/EB_(ANTHROPIC|OPENAI|OPENROUTER)_API_KEY/g) || []).length;
      const inKopfzeilen = (body.match(/(x-api-key|Authorization)[^\n]*EB_(ANTHROPIC|OPENAI|OPENROUTER)_API_KEY/g) || []).length;
      // Einmal in der defined()-Prüfung, einmal im Wert, einmal in der Kopfzeile.
      expect(alsAusdruck, `${fn}: Konstante an unerwarteter Stelle`).toBeLessThanOrEqual(3);
      expect(inKopfzeilen, `${fn}: Schlüssel gehört in die Kopfzeile`).toBe(1);
    }
  });

  test('AI-Schlüssel werden nur auf ausdrücklichen Wunsch auf den Server gelegt', () => {
    const deploy = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ionos-deploy.yml'), 'utf8');
    const block = deploy.slice(deploy.indexOf('Inject AI keys'));
    // Ohne gesetzte Secrets passiert nichts — ein Schlüssel wandert nicht
    // stillschweigend an einen weiteren Ort.
    //
    // Nicht auf den Wortlaut festnageln: ein weiterer Anbieter darf dazukommen.
    // Entscheidend ist, dass die Abbruchbedingung JEDEN Schlüssel abdeckt —
    // eine Lücke hier hieße, dass ein Secret ungefragt geschrieben wird.
    const wache = (block.match(/^\s*if\s+(.*-z\s+"\$[A-Z_]+".*);\s*then\s*$/m) || [])[1];
    expect(wache, 'Abbruchbedingung nicht gefunden').toBeTruthy();
    const bewacht = (wache.match(/\$([A-Z_]+)/g) || []).map((x) => x.slice(1));
    const uebergeben = [...block.matchAll(/^\s{10}([A-Z_]+_KEY):\s*\$\{\{\s*secrets\./gm)].map((m) => m[1]);
    expect(uebergeben.length, 'keine Schlüssel-Variablen gefunden').toBeGreaterThan(0);
    for (const k of uebergeben) {
      expect(bewacht, `${k} ist nicht von der Abbruchbedingung gedeckt`).toContain(k);
    }
    expect(block).toMatch(/exit 0/);
    // In der Ausgabe darf der Wert nicht auftauchen.
    expect(block).toMatch(/REDACTED/);
  });

  test('Route ist auf die zwei Ordner und .json begrenzt', () => {
    const m = FUNCTIONS.match(/preg_match\(\s*'(#\^\/\(assets\|audit\)\/[^']+#)'/);
    expect(m, 'Muster nicht gefunden').toBeTruthy();
    const re = new RegExp(m[1].slice(1, -1));
    expect(re.test('/assets/eb-connectors.json')).toBe(true);
    expect(re.test('/audit/latest.json')).toBe(true);
    // Was nicht durchkommen darf:
    expect(re.test('/assets/../wp-config.php'), 'Verzeichniswechsel').toBe(false);
    expect(re.test('/assets/js/app.js'), 'Unterordner').toBe(false);
    expect(re.test('/assets/evil.php'), 'anderes Format').toBe(false);
    expect(re.test('/vault/geheim.json'), 'fremder Ordner').toBe(false);
  });

  test('audit/latest.json existiert und wird ausgeliefert', () => {
    // Wurde einmal als „nie erzeugt" abgetan — die Datei liegt seit dem
    // 1. August im Repo, sie war nur nicht erreichbar.
    const p = path.join(ROOT, 'audit', 'latest.json');
    expect(fs.existsSync(p), 'audit/latest.json fehlt').toBe(true);
    JSON.parse(fs.readFileSync(p, 'utf8'));
    const deploy = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ionos-deploy.yml'), 'utf8');
    expect(deploy, 'audit/ darf nicht vom Deploy ausgeschlossen sein').not.toMatch(/-x '\^audit\//);
  });

  test('zwischengespeicherter Stand wird als solcher gekennzeichnet', () => {
    // Der Header zeigte einen alten Commit-SHA, als wäre er der aktuelle:
    // renderFromCache() schreibt ihn, und wenn der frische Abruf scheitert
    // (ohne Token greift GitHubs Limit), bleibt er unmarkiert stehen.
    expect(HQ).toMatch(/state\.ausCache\s*=\s*true/);
    expect(HQ).toMatch(/state\.ausCache\s*=\s*false/);
    expect(HQ).toMatch(/zwischengespeichert/);
  });
});

test.describe('CSP: HQ darf mit GitHub sprechen', () => {
  // Der teuerste Fehler dieser Reihe. Route und Token waren in Ordnung, neun
  // von zehn Karten meldeten trotzdem „Failed to fetch": connect-src erlaubte
  // api.github.com nicht, der Browser ließ die Anfragen gar nicht erst raus.
  //
  // Die Playwright-Tests konnten das nicht finden — sie blockieren
  // api.github.com absichtlich und sehen deshalb dasselbe Bild wie bei einem
  // CSP-Verstoß. Deshalb wird hier der Header selbst gerechnet, in PHP, gegen
  // die echte Direktivenliste aus functions.php.
  const csp = JSON.parse(execFileSync('php', ['tests/e2e/csp-hq.php'], { cwd: ROOT, encoding: 'utf8' }));

  test('connect-src erlaubt api.github.com für /hq', () => {
    expect(csp.github, `connect-src nachher: ${csp.nachher}`).toBe(true);
    expect(csp.raw, 'raw.githubusercontent.com ist der Fallback des Selbstchecks').toBe(true);
  });

  test('bestehende Quellen bleiben unangetastet', () => {
    expect(csp.self).toBe(true);
    expect(csp.stripe).toBe(true);
    expect(csp.nominatim).toBe(true);
    expect(csp.scriptSrcGleich, 'nur connect-src darf sich ändern').toBe(true);
    expect(csp.imgSrcGleich).toBe(true);
    expect(csp.gleicheAnzahl, 'keine Direktive dazu oder weg').toBe(true);
  });

  test('genau ein connect-src, mehrfach aufrufbar', () => {
    // Zwei CSP-Header wertet der Browser als Schnittmenge — ein zweiter hätte
    // nichts erlaubt, sondern weiter eingeschränkt.
    expect(csp.einConnectSrc).toBe(true);
    expect(csp.idempotent, 'erneuter Aufruf darf nichts erneut senden').toBe(true);
  });

  test('die öffentliche Seite bekommt GitHub NICHT erlaubt', () => {
    // Was die Website nicht braucht, soll ihr auch nicht offenstehen.
    expect(csp.oeffentlichOhneGithub, `öffentliches connect-src: ${csp.vorher}`).toBe(true);
  });

  test('Mikrofon ist nur im admin-geschützten HQ freigegeben', () => {
    expect(FUNCTIONS).toMatch(/function eb_hq_mikrofon_erlauben/);
    const hq = FUNCTIONS.slice(
      FUNCTIONS.indexOf('function eb_serve_hq'),
      FUNCTIONS.indexOf("add_action( 'template_redirect'", FUNCTIONS.indexOf('function eb_serve_hq'))
    );
    expect(hq).toMatch(/eb_hq_mikrofon_erlauben\(\)/);
    const erlaubnis = FUNCTIONS.slice(
      FUNCTIONS.indexOf('function eb_hq_mikrofon_erlauben'),
      FUNCTIONS.indexOf('function eb_serve_hq')
    );
    expect(erlaubnis).toMatch(/microphone=\(self\)/);
    expect(FUNCTIONS).toMatch(/magnetometer=\(\), microphone=\(\)/);
  });

  test('Erweiterung hängt nur an der HQ-Auslieferung', () => {
    const hq = rumpfVon(FUNCTIONS, 'eb_serve_hq');
    expect(hq, 'eb_serve_hq muss die Erweiterung aufrufen').toMatch(/eb_hq_csp_erweitern\(\)/);
    // Und zwar erst NACH der Abweisung — sonst lockert schon der 404-Weg die CSP.
    expect(hq.indexOf('eb_hq_csp_erweitern()'), 'Erweiterung liegt vor der Rechteprüfung')
      .toBeGreaterThan(hq.indexOf('$file'));
    // Kein globaler Hook — sonst gälte die Lockerung für jede Seite.
    expect(FUNCTIONS).not.toMatch(/add_action\([^)]*eb_hq_csp_erweitern/);
  });
});

test.describe('Connector-Katalog', () => {
  test('Katalog-Prüfung läuft sauber durch', () => {
    const out = execFileSync('node', ['scripts/connectors.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/kein vorgetäuschter Zustand/);
  });

  test('Katalog behauptet keinen Verbindungszustand', () => {
    for (const c of KATALOG.connectors) {
      expect(c, `${c.id} darf keinen Status mitliefern`).not.toHaveProperty('status');
      expect(c).not.toHaveProperty('letzteSynchronisierung');
      expect(c).not.toHaveProperty('letzterFehler');
    }
  });

  test('jeder Connector deklariert alle 15 HQ-Funktionen', () => {
    for (const c of KATALOG.connectors) {
      for (const fn of KATALOG.funktionen) {
        expect(['ja', 'nein', 'proxy'], `${c.id}.${fn}`).toContain(c.faehigkeiten[fn]);
      }
    }
  });

  test('nicht eingerichtete Connectors behaupten keine Fähigkeiten', () => {
    const harmlos = ['connect', 'disconnect', 'getCapabilities'];
    for (const c of KATALOG.connectors.filter((x) => !x.methodeAktiv)) {
      const behauptet = KATALOG.funktionen.filter((fn) => c.faehigkeiten[fn] === 'ja' && !harmlos.includes(fn));
      expect(behauptet, `${c.id} ist nicht eingerichtet`).toEqual([]);
    }
  });

  test('Copilot-Kontingent wird als nicht abrufbar geführt', () => {
    const c = KATALOG.connectors.find((x) => x.id === 'copilot');
    expect(c.kontingent.ueberApiAbrufbar).toBe(false);
    // Wortlaut aus der Spezifikation — geschätzte Tokenzahlen sind keine Werte.
    expect(c.kontingent.hinweis).toContain('nicht über die API verfügbar');
  });

  test('Abonnement und API-Zugang werden getrennt ausgewiesen', () => {
    for (const id of ['openai', 'anthropic']) {
      const c = KATALOG.connectors.find((x) => x.id === id);
      expect(c.unterscheidung, `${id} braucht die Abgrenzung Abo ↔ API`).toBeTruthy();
      expect(c.unterscheidung.punkte.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('kein Geheimnis im ausgelieferten Katalog', () => {
    const roh = JSON.stringify(KATALOG);
    for (const muster of [/sk_(live|test)_/i, /ghp_[A-Za-z0-9]/, /sk-[A-Za-z0-9]{20}/, /api[_-]?key\s*[:=]\s*\S/i]) {
      expect(roh, `Verbotsmuster ${muster}`).not.toMatch(muster);
    }
  });

  test('alle hinterlegten Links sind https', () => {
    for (const c of KATALOG.connectors) {
      for (const [name, url] of Object.entries(c.links)) {
        if (url) expect(url, `${c.id}.${name}`).toMatch(/^https:\/\//);
      }
    }
  });
});

test.describe('Verbindungs-Oberfläche', () => {
  test('Karten starten getrennt und werden nur durch echte Prüfung grün', async ({ page }) => {
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    // Ohne Netz nach draußen: alle GitHub-Aufrufe scheitern. Genau dann darf
    // keine Karte „verbunden" zeigen.
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.locator('.conn').first().waitFor({ state: 'attached', timeout: 20000 });

    const zustand = await page.evaluate(() => ({
      geladen: !!window.connKatalog || typeof connKatalog !== 'undefined' && !!connKatalog,
      karten: document.querySelectorAll('.conn').length,
      verbunden: [...document.querySelectorAll('.conn')].filter(
        (el) => el.querySelector('.st-verbunden')).map((el) => el.id),
    }));

    expect(fehler, `Page-Errors: ${fehler.join(' | ')}`).toEqual([]);
    expect(zustand.karten, 'Verbindungskarten müssen gerendert sein').toBeGreaterThanOrEqual(10);
    // eventboerse prüft gleiche Herkunft und darf grün sein — GitHub-gestützte
    // Connectors dürfen es ohne erreichbare API nicht.
    const ghGestuetzt = zustand.verbunden.filter((id) => id !== 'conn-eventboerse');
    expect(ghGestuetzt, 'ohne API-Antwort darf nichts „verbunden" behaupten').toEqual([]);
  });

  test('jede Karte nennt Berechtigungen, Kontingent und Schlüssel-Ablage', async ({ page }) => {
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.locator('.conn').first().waitFor({ state: 'attached', timeout: 20000 });
    const fehlend = await page.evaluate(() =>
      [...document.querySelectorAll('.conn')].filter((el) => {
        const t = el.textContent;
        return !t.includes('Berechtigungen') || !t.includes('Kontingent') || !t.includes('Schlüssel liegt');
      }).map((el) => el.id)
    );
    expect(fehlend).toEqual([]);
  });
});
