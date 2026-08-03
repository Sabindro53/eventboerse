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

test.describe('HQ-Zugang', () => {
  test('hq.html enthält keine Zugangsschlüssel im Klartext', () => {
    // Der konkrete Rückfall, den es hier gab: HQ_KEYS = ['eb-hq-2026', …].
    expect(HQ, 'Schlüsselliste im ausgelieferten HTML').not.toMatch(/HQ_KEYS/);
    expect(HQ).not.toMatch(/eb-hq-2026|eventboerse-hq/);
    expect(HQ, 'clientseitige Schlüsselprüfung ist keine Prüfung').not.toMatch(/function checkAuth/);
  });

  test('Auslieferung prüft serverseitig auf Administrator', () => {
    expect(FUNCTIONS).toMatch(/function eb_serve_hq/);
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_serve_hq'));
    expect(fn, 'ohne Rechteprüfung wäre /hq offen').toMatch(/current_user_can\(\s*'manage_options'\s*\)/);
    // 404 statt 403: eine Seite, deren Existenz man nicht bestätigt, wird
    // auch nicht gezielt angegriffen.
    expect(fn.slice(0, 900)).toMatch(/status_header\(\s*404\s*\)/);
  });

  test('direkter Theme-Pfad ist gesperrt', () => {
    // Apache liefert Theme-Dateien direkt aus, PHP läuft dabei nie — ohne
    // diese Sperre wäre die Rechteprüfung schlicht umgehbar.
    expect(HTACCESS).toMatch(/wp-content\/themes\/\[\^\/\]\+\/hq\\\.html/);
  });

  test('HQ wird nicht indexiert', () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_serve_hq'));
    expect(fn.slice(0, 1400)).toMatch(/X-Robots-Tag.*noindex/);
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
    // Alles außerhalb der Liste verlangt Administratorrechte.
    expect(block).toMatch(/in_array\(\s*\$m\[2\],\s*\$oeffentlich/);
    expect(block).toMatch(/current_user_can\(\s*'manage_options'\s*\)/);
  });

  test('Serverseiten-Proxy hält den Schlüssel auf dem Server', () => {
    // Beide Routen nur für Administratoren.
    expect(FUNCTIONS).toMatch(/function eb_hq_proxy_darf/);
    const darf = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_proxy_darf'), FUNCTIONS.indexOf('function eb_hq_proxy_darf') + 260);
    expect(darf).toMatch(/current_user_can\(\s*'manage_options'\s*\)/);
    for (const anbieter of ['anthropic', 'openai']) {
      expect(FUNCTIONS).toMatch(new RegExp(`/hq/probe/${anbieter}`));
    }
    expect(FUNCTIONS.match(/'permission_callback'\s*=>\s*'eb_hq_proxy_darf'/g) || [],
      'jede Probe-Route braucht die Rechteprüfung').toHaveLength(2);

    // Die Antwort darf den Schlüssel nicht zurückgeben — nur Zahlen.
    // Genau bis zum Ende DIESER Funktion lesen; die nächste nennt die
    // Konstante zu Recht, weil sie den Aufruf macht.
    const von = FUNCTIONS.indexOf('function eb_hq_proxy_antwort');
    const bis = FUNCTIONS.indexOf('\nfunction ', von + 10);
    const antwort = FUNCTIONS.slice(von, bis);
    expect(antwort, 'die Antwort darf den Schlüssel nicht enthalten').not.toMatch(/EB_(ANTHROPIC|OPENAI)_API_KEY/);
    // Verbrauch bleibt als nicht abrufbar geführt — dafür braucht es einen
    // gesonderten Admin-Schlüssel, den wir nicht haben.
    expect(antwort).toMatch(/'abrufbar'\s*=>\s*false/);

    // Auch die Probe-Funktionen dürfen den Schlüssel nur SENDEN, nie
    // zurückgeben. Gefährlich ist die Konstante als AUSDRUCK; ihr Name in
    // einer Meldung („… ist nicht hinterlegt") ist Text und hilfreich.
    // Deshalb erst die Zeichenketten entfernen, dann suchen.
    for (const fn of ['eb_hq_probe_anthropic', 'eb_hq_probe_openai']) {
      const a = FUNCTIONS.indexOf('function ' + fn);
      const b = FUNCTIONS.indexOf('\nfunction ', a + 10);
      const body = FUNCTIONS.slice(a, b > 0 ? b : undefined);
      for (const r of body.match(/eb_hq_proxy_antwort\([^;]*/g) || []) {
        const ohneText = r.replace(/'(?:[^'\\]|\\.)*'/g, "''");
        expect(ohneText, `${fn} gibt den Schlüssel zurück`).not.toMatch(/EB_(ANTHROPIC|OPENAI)_API_KEY/);
      }
      // Der Schlüssel darf ausschließlich in den Anfrage-Kopfzeilen stehen.
      const alsAusdruck = (body.replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .match(/EB_(ANTHROPIC|OPENAI)_API_KEY/g) || []).length;
      const inKopfzeilen = (body.match(/(x-api-key|Authorization)[^\n]*EB_(ANTHROPIC|OPENAI)_API_KEY/g) || []).length;
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
    expect(block).toMatch(/if \[ -z "\$ANTHROPIC_KEY" \] && \[ -z "\$OPENAI_KEY" \]; then/);
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

  test('Erweiterung hängt nur an der HQ-Auslieferung', () => {
    const hq = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_serve_hq'));
    expect(hq.slice(0, 1600), 'eb_serve_hq muss die Erweiterung aufrufen').toMatch(/eb_hq_csp_erweitern\(\)/);
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
    await page.waitForTimeout(2500);

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
    await page.waitForTimeout(2000);
    const fehlend = await page.evaluate(() =>
      [...document.querySelectorAll('.conn')].filter((el) => {
        const t = el.textContent;
        return !t.includes('Berechtigungen') || !t.includes('Kontingent') || !t.includes('Schlüssel liegt');
      }).map((el) => el.id)
    );
    expect(fehlend).toEqual([]);
  });
});
