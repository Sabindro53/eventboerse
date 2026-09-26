// Der Deploy traegt Steuernummer und USt-IdNr ein — ausgefuehrt, nicht gelesen.
//
// § 14 Abs. 4 Nr. 2 UStG verlangt auf jeder Rechnung entweder die Steuernummer
// oder die USt-IdNr des Leistenden. `eb_provision_absender()` faellt ohne beide
// bewusst aus, statt einen Beleg zu erzeugen, der aussieht wie einer. Die
// Konstanten stehen in `wp-config.php` — und die liegt auf IONOS, nicht im
// Repo. Sie von Hand einzutragen hiesse, sich per SFTP anzumelden und eine
// Datei mit allen Datenbank-Zugangsdaten zu oeffnen.
//
// GEMESSEN WIRD DAS VERHALTEN. Ein Test auf „irgendwo steht exit 1" ueberlebt
// jede Mutation, die den Vergleich umdreht: das Wort stuende weiter da.
// Deshalb wird der Schritt aus dem Workflow geschnitten und mit
// `bash -eo pipefail` wirklich gefahren — dieselbe Anordnung wie beim
// Torschritt in `tore.spec.js` und beim csso-Schritt des Deploys.
//
// Zwei Dinge stellt der Pruefstand: `lftp` (eine Attrappe, die den Pfad aus
// dem echten Aufruf liest und Dateien kopiert) und die zwei `/tmp`-Pfade des
// Schritts, damit parallele Laeufe sich nicht dieselbe Datei teilen. Sonst
// laeuft der Schritt Zeile fuer Zeile so, wie GitHub ihn faehrt.
const { test, expect } = require('@playwright/test');
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..', '..');
const WORKFLOW = fs.readFileSync(
  path.join(WURZEL, '.github', 'workflows', 'ionos-deploy.yml'), 'utf8');
const PHP_QUELLE = fs.readFileSync(
  path.join(WURZEL, 'includes', 'steuer', 'provisionsrechnung.php'), 'utf8');

const SCHRITT_NAME = 'Inject tax identifiers into wp-config.php';

/** Der ganze Block dieses Schritts, inklusive `env:` und `run:`. */
function schrittBlock() {
  const i = WORKFLOW.indexOf(`- name: ${SCHRITT_NAME}`);
  if (i < 0) return null;
  const j = WORKFLOW.indexOf('\n      - name:', i + 10);
  return WORKFLOW.slice(i, j < 0 ? WORKFLOW.length : j);
}

/**
 * Das reine Shell-Skript des Schritts, ausgerueckt.
 *
 * Gelesen wird der `run: |`-Block als EIN Befehl. Ihn zeilenweise zu zerlegen
 * waere derselbe Fehler, an dem der erste Tore-Parser gescheitert ist.
 */
function skript() {
  const block = schrittBlock();
  if (!block) return null;
  const start = block.indexOf('run: |');
  if (start < 0) return null;
  const zeilen = block.slice(block.indexOf('\n', start) + 1).split('\n');
  const einzug = 10; // `        run: |` + zwei weitere Stufen
  return zeilen
    .map((z) => (z.startsWith(' '.repeat(einzug)) ? z.slice(einzug) : z))
    .join('\n');
}

const WPCONFIG_VORLAGE = [
  '<?php',
  "/** Pruefstand-Attrappe einer wp-config.php. */",
  "define( 'DB_NAME', 'eventboerse' );",
  "define( 'EB_STRIPE_MODE', 'live' );",
  "$table_prefix = 'wp_';",
  '',
].join('\n');

/**
 * Den Schritt wirklich fahren.
 *
 * @param {{steuernummer?:string, ustId?:string, server?:string}} lage
 */
function fahre(lage = {}) {
  const s = skript();
  if (!s) throw new Error('der Schritt steht nicht mehr im Workflow');

  const arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-steuer-'));
  const serverDatei = path.join(arbeit, 'server-wp-config.php');
  const lokal = path.join(arbeit, 'lokal-wp-config.php');
  const defines = path.join(arbeit, 'defines.php');
  const summary = path.join(arbeit, 'summary.md');
  const log = path.join(arbeit, 'lftp.log');
  const binDir = path.join(arbeit, 'bin');

  fs.writeFileSync(serverDatei, lage.server === undefined ? WPCONFIG_VORLAGE : lage.server);
  fs.writeFileSync(summary, '');
  fs.writeFileSync(log, '');
  fs.mkdirSync(binDir);

  // Die Attrappe liest den Pfad aus dem ECHTEN Aufruf des Schritts. Eine
  // Attrappe mit fest eingetragenem Pfad wuerde auch dann noch „gelingen",
  // wenn der Schritt eine ganz andere Datei holt.
  fs.writeFileSync(path.join(binDir, 'lftp'), [
    '#!/usr/bin/env bash',
    'CMD="$*"',
    'printf "%s\\n" "$CMD" >> "$EB_STUB_LOG"',
    'if [[ "$CMD" == *"get /public/wp-config.php"* ]]; then',
    '  ZIEL=$(printf "%s" "$CMD" | sed -n "s|.*get /public/wp-config\\.php -o \\([^;]*\\);.*|\\1|p" | tr -d " ")',
    '  [ -n "$ZIEL" ] || { echo "Attrappe: Zielpfad nicht lesbar" >&2; exit 9; }',
    '  cp "$EB_STUB_SERVER" "$ZIEL"',
    'elif [[ "$CMD" == *"put "* ]]; then',
    '  QUELLE=$(printf "%s" "$CMD" | sed -n "s|.*put \\([^ ]*\\) -o /public/wp-config\\.php.*|\\1|p")',
    '  [ -n "$QUELLE" ] || { echo "Attrappe: Quellpfad nicht lesbar" >&2; exit 9; }',
    '  cp "$QUELLE" "$EB_STUB_SERVER"',
    'else',
    '  echo "Attrappe: unbekannter lftp-Aufruf" >&2; exit 9',
    'fi',
    '',
  ].join('\n'), { mode: 0o755 });

  // Die zwei fest eingetragenen /tmp-Pfade des Schritts bekommen je Lauf
  // einen eigenen Namen. Aendert der Schritt sie, greift die Ersetzung ins
  // Leere, der Lauf schreibt nach /tmp — und die Zusicherungen unten fallen
  // durch, statt still etwas anderes zu messen.
  const gefahren = s
    .split('/tmp/eb-steuer-defines.php').join(defines)
    .split('/tmp/wp-config.php').join(lokal);

  const lauf = spawnSync('bash', ['-eo', 'pipefail', '-c', gefahren], {
    encoding: 'utf8',
    cwd: arbeit,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      SFTP_USER: 'pruefstand',
      SFTP_PASS: 'geheim',
      SFTP_HOST: 'sftp.pruefstand.invalid',
      STEUERNUMMER: lage.steuernummer === undefined ? '' : lage.steuernummer,
      UST_ID: lage.ustId === undefined ? '' : lage.ustId,
      GITHUB_STEP_SUMMARY: summary,
      EB_STUB_SERVER: serverDatei,
      EB_STUB_LOG: log,
    },
  });

  const ergebnis = {
    status: lauf.status,
    stdout: lauf.stdout || '',
    stderr: lauf.stderr || '',
    server: fs.readFileSync(serverDatei, 'utf8'),
    summary: fs.readFileSync(summary, 'utf8'),
    lftp: fs.readFileSync(log, 'utf8').split('\n').filter(Boolean),
    reste: fs.existsSync(lokal) || fs.existsSync(defines),
    arbeit,
  };
  fs.rmSync(arbeit, { recursive: true, force: true });
  return ergebnis;
}

/** Wert einer Konstante aus einer wp-config.php lesen; null wenn sie fehlt. */
function konstante(inhalt, name) {
  const treffer = inhalt.match(
    new RegExp(`define\\(\\s*'${name}'\\s*,\\s*'([^']*)'\\s*\\)`));
  return treffer ? treffer[1] : null;
}

/** Wie oft eine Konstante in der Datei steht. */
function wieOft(inhalt, name) {
  return (inhalt.match(new RegExp(name, 'g')) || []).length;
}

test.describe('Der Deploy traegt die Steuerangaben ein', () => {
  test('es gibt den Schritt, und er liest beide Secrets', () => {
    expect(schrittBlock(), 'der Deploy traegt die Steuerangaben nicht ein. '
      + 'Sie muessten dann von Hand per SFTP in wp-config.php — in derselben '
      + 'Datei, in der die Datenbank-Zugangsdaten stehen').toBeTruthy();
    expect(schrittBlock(), 'EB_STEUERNUMMER wird nicht gelesen')
      .toMatch(/secrets\.EB_STEUERNUMMER/);
    expect(schrittBlock(), 'EB_UST_ID wird nicht gelesen')
      .toMatch(/secrets\.EB_UST_ID/);
  });

  test('ohne Secrets bleibt wp-config.php unangetastet', () => {
    // Opt-in wie bei EB_APPLE_TEAM_ID. „Nicht eingerichtet" muss anders
    // aussehen als „eingerichtet" — und vor allem darf der Schritt die Datei
    // auf dem Server nicht anfassen, nur um nichts hineinzuschreiben.
    const r = fahre();
    expect(r.status, `der Schritt bricht ohne Secrets ab:\n${r.stderr}`).toBe(0);
    expect(r.server, 'wp-config.php wurde ohne Secrets veraendert')
      .toBe(WPCONFIG_VORLAGE);
    expect(r.lftp, 'ohne Secrets wurde trotzdem eine SFTP-Verbindung aufgebaut')
      .toEqual([]);
    expect(r.summary, 'der Schritt verschweigt, dass er nichts getan hat')
      .toMatch(/unveraendert/);
    expect(r.summary, 'die Zusammenfassung nennt die beiden Secrets nicht, '
      + 'die fehlen — dann weiss niemand, was zu tun waere')
      .toMatch(/EB_STEUERNUMMER[\s\S]*EB_UST_ID/);
  });

  test('nur die Steuernummer: genau sie wird geschrieben, kein leeres Gegenstueck', () => {
    // Ein leeres define('EB_UST_ID', '') waere fuer PHP dasselbe wie keines —
    // in der Datei saehe es aber aus wie eingerichtet.
    const r = fahre({ steuernummer: '220/5678/1234' });
    expect(r.status, `Lauf fehlgeschlagen:\n${r.stderr}`).toBe(0);
    expect(konstante(r.server, 'EB_STEUERNUMMER')).toBe('220/5678/1234');
    expect(wieOft(r.server, 'EB_UST_ID'),
      'ein leeres EB_UST_ID steht in der Datei').toBe(0);
  });

  test('nur die USt-IdNr: genau sie wird geschrieben', () => {
    const r = fahre({ ustId: 'DE123456789' });
    expect(r.status, `Lauf fehlgeschlagen:\n${r.stderr}`).toBe(0);
    expect(konstante(r.server, 'EB_UST_ID')).toBe('DE123456789');
    expect(wieOft(r.server, 'EB_STEUERNUMMER'),
      'ein leeres EB_STEUERNUMMER steht in der Datei').toBe(0);
  });

  test('beide gesetzt: beide stehen hinter dem <?php und die Datei bleibt gueltiges PHP', () => {
    const r = fahre({ steuernummer: '21/815/08150', ustId: 'DE123456789' });
    expect(r.status, `Lauf fehlgeschlagen:\n${r.stderr}`).toBe(0);
    expect(konstante(r.server, 'EB_STEUERNUMMER')).toBe('21/815/08150');
    expect(konstante(r.server, 'EB_UST_ID')).toBe('DE123456789');

    // Die Reihenfolge ist nicht Kosmetik: steht ein define() vor dem
    // Eroeffnungs-Tag, gibt WordPress es als Text aus, und die Seite ist tot.
    const php = r.server.indexOf('<?php');
    expect(php, 'das Eroeffnungs-Tag fehlt').toBeGreaterThanOrEqual(0);
    expect(r.server.indexOf('EB_STEUERNUMMER'),
      'die Konstante steht vor dem <?php').toBeGreaterThan(php);

    // Gemessen, nicht angenommen: eine kaputte Maskierung oder ein
    // verrutschtes sed faellt hier auf, nicht erst auf dem Webserver.
    const ziel = path.join(os.tmpdir(), `eb-steuer-lint-${process.pid}-${Date.now()}.php`);
    fs.writeFileSync(ziel, r.server);
    try {
      execFileSync('php', ['-l', ziel], { encoding: 'utf8' });
    } finally {
      fs.rmSync(ziel, { force: true });
    }
  });

  test('ein zweiter Deploy ersetzt die Zeilen, er verdoppelt sie nicht', () => {
    // Ohne das Loeschen vorher stuenden nach drei Deploys drei define() mit
    // demselben Namen in der Datei. PHP nimmt dann das erste und meldet fuer
    // jedes weitere eine Warnung — im Fehlerlog, das niemand liest.
    const erst = fahre({ steuernummer: '220/5678/1234', ustId: 'DE123456789' });
    expect(erst.status).toBe(0);
    const zweit = fahre({
      steuernummer: '220/5678/9999',
      ustId: 'DE987654321',
      server: erst.server,
    });
    expect(zweit.status, `zweiter Lauf fehlgeschlagen:\n${zweit.stderr}`).toBe(0);
    expect(wieOft(zweit.server, 'EB_STEUERNUMMER'),
      'EB_STEUERNUMMER steht mehrfach in der Datei').toBe(1);
    expect(wieOft(zweit.server, 'EB_UST_ID'),
      'EB_UST_ID steht mehrfach in der Datei').toBe(1);
    expect(konstante(zweit.server, 'EB_STEUERNUMMER')).toBe('220/5678/9999');
    expect(konstante(zweit.server, 'EB_UST_ID')).toBe('DE987654321');
  });

  test('eine USt-IdNr in falscher Form bricht den Schritt ab, bevor etwas geschrieben wird', () => {
    for (const falsch of ['DE12345678', 'DE1234567890', 'de123456789', 'ATU12345678', 'DE12345678X']) {
      const r = fahre({ ustId: falsch });
      expect(r.status, `\`${falsch}\` kommt durch — PHP verwuerfe den Wert `
        + `anschliessend, und der Deploy meldete Erfolg`).not.toBe(0);
      expect(r.stdout + r.stderr, `\`${falsch}\`: kein ::error:: im Log`)
        .toMatch(/::error::/);
      expect(r.server, `\`${falsch}\`: wp-config.php wurde trotzdem angefasst`)
        .toBe(WPCONFIG_VORLAGE);
    }
  });

  test('eine Steuernummer, die keine sein kann, bricht den Schritt ab', () => {
    const falsch = [
      '220/5678/ABCD',          // Buchstaben
      "220/5678/12'34",         // Hochkomma — waere ein Ausbruch aus dem define()
      '123456789',              // 9 Ziffern
      '12345678901234',         // 14 Ziffern
      'EB_STEUERNUMMER',        // Name statt Wert
      '/220/5678/1234',         // fuehrender Trenner
    ];
    for (const wert of falsch) {
      const r = fahre({ steuernummer: wert });
      expect(r.status, `\`${wert}\` kommt als Steuernummer durch`).not.toBe(0);
      expect(r.server, `\`${wert}\`: wp-config.php wurde trotzdem angefasst`)
        .toBe(WPCONFIG_VORLAGE);
    }
  });

  test('die Laenderformate kommen durch — 10 bis 13 Ziffern', () => {
    // Gegenprobe zur Regel darueber. Ohne sie waere „lehnt alles ab" eine
    // Erklaerung, die jeden Test oben besteht — und der Inhaber bekaeme seine
    // eigene Steuernummer nicht eingetragen.
    const echt = [
      '2012345678',        // 10 Ziffern, ohne Trenner
      '21/815/08150',      // Bayern
      '220/5678/1234',     // 11 Ziffern mit Trennern
      '5133081508159',     // 13 Ziffern, vereinheitlichtes Schema
      '013 815 08153',     // Leerzeichen als Trenner
    ];
    for (const wert of echt) {
      const r = fahre({ steuernummer: wert });
      expect(r.status, `\`${wert}\` wird abgewiesen, obwohl es ein gueltiges `
        + `Laenderformat ist:\n${r.stdout}${r.stderr}`).toBe(0);
      expect(konstante(r.server, 'EB_STEUERNUMMER')).toBe(wert);
    }
  });

  test('was der Deploy durchlaesst, nimmt PHP auch an', () => {
    // Zwei Stellen, eine Regel. Driften sie, schreibt der Deploy einen Wert,
    // den `eb_provision_absender()` anschliessend verwirft — es entstuende
    // weiterhin keine Rechnung, und der Deploy meldete Erfolg.
    //
    // Geprueft wird die Richtung, auf die es ankommt: der Deploy darf nie
    // etwas schreiben, das PHP ablehnt. Umgekehrt ist strenger zu sein
    // erlaubt — das scheitert laut im Lauf, nicht still im Betrieb.
    const ausPhp = PHP_QUELLE.match(/preg_match\(\s*'(\/\^DE[^']+\/)'\s*,\s*\$ust_id\s*\)/);
    expect(ausPhp, 'die Formatpruefung in eb_provision_absender() ist nicht '
      + 'mehr auffindbar — dann prueft dieser Test nichts').toBeTruthy();

    const proben = ['DE123456789', 'DE12345678', 'DE1234567890', 'de123456789',
      'DE12345678X', '', 'DE 123456789'];
    let durchgelassen = 0;
    for (const wert of proben) {
      // Gemessen wird, was WIRKLICH in der Datei landet — nicht der
      // Rueckgabewert. Bei leerem Wert steigt der Schritt als Opt-in mit 0
      // aus und schreibt nichts; das ist kein Durchlassen.
      const geschrieben = konstante(fahre({ ustId: wert }).server, 'EB_UST_ID');
      if (geschrieben === null) continue;
      durchgelassen += 1;
      const phpNimmt = execFileSync('php', ['-r',
        'echo preg_match($argv[1], trim($argv[2])) ? "ja" : "nein";',
        '--', ausPhp[1], wert], { encoding: 'utf8' });
      expect(phpNimmt, `der Deploy schreibt \`${wert}\`, `
        + `eb_provision_absender() verwirft es`).toBe('ja');
    }
    // Gegenprobe: laesst der Deploy gar nichts mehr durch, ist die Schleife
    // oben leer und der Test gruen, ohne etwas belegt zu haben.
    expect(durchgelassen, 'der Deploy hat keine einzige Probe geschrieben — '
      + 'dieser Test hat dann nichts gemessen').toBeGreaterThan(0);
  });

  test('der Schritt laesst nichts liegen', () => {
    // wp-config.php traegt die Datenbank-Zugangsdaten. Eine Kopie davon auf
    // dem Runner ist kein Drama — sie im Arbeitsverzeichnis stehen zu lassen
    // waere aber genau die Sorte Nachlaessigkeit, die sich fortpflanzt.
    const r = fahre({ steuernummer: '220/5678/1234', ustId: 'DE123456789' });
    expect(r.status).toBe(0);
    expect(r.reste, 'die geholte wp-config.php liegt nach dem Schritt noch da')
      .toBe(false);
  });
});
