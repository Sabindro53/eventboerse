// ════════════════════════════════════════════════════════════════════════
// Der Deploy prueft, ob die Seite den Stand wirklich ausliefert
//
// Gefunden am 01.10.2026, unmittelbar nach dem Merge von #303: der Deploy
// war gruen, der Site-Monitor gruen — und es gab keinen Weg festzustellen,
// ob die neue Hero-Parole live steht. Nachgemessen:
//
//   letzter Deploy-Schritt   `Inject AI keys` — keine Pruefung des Ergebnisses
//   Beleg des Monitors       `id="page-home"`, im Markup seit dem 26.08.2026
//   einziger Stand im Kopf   `$asset_ver = '2.5.1'`, von Hand, nie erhoeht
//
// Ein Deploy, der gar nichts oder nur die Haelfte hochlaedt, blieb damit
// gruen. Dieselbe Klasse wie der tote Gitleaks-Scan, eine Ebene tiefer:
// der Pruefer laeuft, er findet auch etwas — nur nicht das, wofuer man ihn
// haelt. Und dieser Spalt hat das Projekt schon einmal zwei Wochen
// gekostet: die vierzehn Routine-PRs waren fertig und erreichten die Seite
// nie.
//
// GEMESSEN WIRD VERHALTEN, nicht Schreibweise. Der Schritt wird aus dem
// Workflow geschnitten und mit `bash -eo pipefail` wirklich gefahren —
// dieselbe Anordnung wie bei `steuernummer-deploy.spec.js`, `tore.spec.js`
// und dem csso-Schritt. Gestellt sind genau zwei Dinge: `curl` (eine
// Attrappe, die eine vorbereitete Antwort ausliefert) und `sleep` (ein
// Mitschreiber — sonst wartete die Suite 50 Sekunden je Fehlerfall, und
// die Pausenfolge waere trotzdem nicht gemessen).
//
// `sha256sum` bleibt ECHT. Es ist die Messung selbst; eine Attrappe davor
// hiesse, den Pruefer mit dem geprueften Werkzeug zu lesen.
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const WORKFLOW_PFAD = path.join(WURZEL, '.github', 'workflows', 'ionos-deploy.yml');
const WORKFLOW = fs.readFileSync(WORKFLOW_PFAD, 'utf8');
const SCHRITT_NAME = 'Verify the live site serves this build';

/** Der ganze Block dieses Schritts, inklusive `run:`. */
function schrittBlock() {
  const i = WORKFLOW.indexOf(`- name: ${SCHRITT_NAME}`);
  if (i < 0) return null;
  const j = WORKFLOW.indexOf('\n      - name:', i + 10);
  return WORKFLOW.slice(i, j < 0 ? WORKFLOW.length : j);
}

/**
 * Das reine Shell-Skript des Schritts, ausgerueckt.
 *
 * Der `run: |`-Block ist EIN Befehl. Ihn zeilenweise zu zerlegen waere
 * derselbe Fehler, an dem der erste Tore-Parser gescheitert ist.
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

/**
 * Den Schritt wirklich fahren.
 *
 * @param {{antworten:Array<{code:string, rumpf:string}>, huelle?:string|null}} lage
 *   `antworten` ist die Folge, die die curl-Attrappe ausliefert — eine je
 *   Versuch; die letzte gilt weiter, wenn mehr Versuche kommen.
 *   `huelle` ist der Inhalt von app-shell.html im Arbeitsverzeichnis;
 *   `null` legt die Datei NICHT an.
 */
function fahre(lage) {
  const s = skript();
  if (!s) throw new Error('der Schritt steht nicht mehr im Workflow');

  const arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-livestand-'));
  const binDir = path.join(arbeit, 'bin');
  const summary = path.join(arbeit, 'summary.md');
  const zaehler = path.join(arbeit, 'curl-aufrufe');
  const pausen = path.join(arbeit, 'pausen');
  fs.mkdirSync(binDir);
  fs.writeFileSync(summary, '');
  fs.writeFileSync(zaehler, '');
  fs.writeFileSync(pausen, '');

  const huelle = lage.huelle === undefined ? 'DIE HUELLE DIESES COMMITS\n' : lage.huelle;
  if (huelle !== null) fs.writeFileSync(path.join(arbeit, 'app-shell.html'), huelle);

  // Die Antworten liegen als Dateien bereit; die Attrappe zaehlt ihre
  // eigenen Aufrufe mit und greift den passenden Eintrag. Eine Attrappe mit
  // einer festen Antwort koennte nicht belegen, dass ueberhaupt wiederholt
  // wird.
  lage.antworten.forEach((a, i) => {
    fs.writeFileSync(path.join(arbeit, `antwort-${i}.html`), a.rumpf);
    fs.writeFileSync(path.join(arbeit, `code-${i}`), a.code);
  });

  fs.writeFileSync(path.join(binDir, 'curl'), [
    '#!/usr/bin/env bash',
    '# Attrappe. Liest das Ziel der Ausgabe aus dem ECHTEN Aufruf des',
    '# Schritts (-o <datei>) — eine Attrappe mit fest eingetragenem Pfad',
    '# wuerde auch dann noch "gelingen", wenn der Schritt woandershin',
    '# schreibt.',
    'ZIEL=""',
    'while [ $# -gt 0 ]; do',
    '  case "$1" in -o) ZIEL="$2"; shift 2;; *) shift;; esac',
    'done',
    `N=$(wc -l < "${zaehler}" | tr -d ' ')`,
    `echo "x" >> "${zaehler}"`,
    `MAX=${lage.antworten.length - 1}`,
    '[ "$N" -gt "$MAX" ] && N=$MAX',
    `[ -n "$ZIEL" ] && cat "${arbeit}/antwort-$N.html" > "$ZIEL"`,
    `cat "${arbeit}/code-$N"`,
    '',
  ].join('\n'), { mode: 0o755 });

  // `sleep` schreibt mit, statt zu warten. Die Pausenfolge ist damit
  // messbar, ohne dass die Suite 50 Sekunden je Fehlerfall steht.
  fs.writeFileSync(path.join(binDir, 'sleep'), [
    '#!/usr/bin/env bash',
    `echo "$1" >> "${pausen}"`,
    '',
  ].join('\n'), { mode: 0o755 });

  const r = spawnSync('bash', ['-eo', 'pipefail', '-c', s], {
    cwd: arbeit,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      GITHUB_STEP_SUMMARY: summary,
    },
    encoding: 'utf8',
  });

  const aus = {
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    summary: fs.readFileSync(summary, 'utf8'),
    aufrufe: fs.readFileSync(zaehler, 'utf8').split('\n').filter(Boolean).length,
    pausen: fs.readFileSync(pausen, 'utf8').split('\n').filter(Boolean),
  };
  fs.rmSync(arbeit, { recursive: true, force: true });
  return aus;
}

/** Der Fingerabdruck, den der Schritt fuer diese Huelle erwarten muss. */
function standVon(huelle) {
  return require('node:crypto').createHash('sha256').update(huelle).digest('hex').slice(0, 12);
}

/** Eine Live-Seite, die diesen Stand im Kopf traegt. */
function seiteMit(stand) {
  return [
    '<!DOCTYPE html><html lang="de"><head>',
    '<meta charset="UTF-8">',
    `<meta name="eb-stand" content="${stand}">`,
    '<title>EventBörse</title>',
    '</head><body><div id="page-home"></div></body></html>',
  ].join('\n');
}

/** Ein Lauf des PHP-Pruefstands. */
function php(modus) {
  const aus = execFileSync('php', [path.join(__dirname, 'live-stand.php'), modus], {
    encoding: 'utf8',
  });
  return JSON.parse(aus.trim());
}

// ─────────────────────────────────────────────────────────────────────────
test.describe('eb_shell_stand(): der Fingerabdruck ist abgeleitet', () => {
  test('er ist sha256 ueber die echte Huelle, zwoelf Hex-Zeichen', () => {
    const r = php('echt');
    expect(r.dateiBytes).toBeGreaterThan(100000); // Gegenprobe: echte Datei
    expect(r.stand).toBe(r.erwartet);
    expect(r.stand).toMatch(/^[0-9a-f]{12}$/);
  });

  test('eine geaenderte Huelle ergibt einen anderen Stand', () => {
    const echt = php('echt');
    const anders = php('geaendert');
    expect(anders.stand).toBe(anders.erwartet);
    // Ein Fingerabdruck, der sich bei geaendertem Inhalt NICHT aendert,
    // waere genau die Handzahl, die er ersetzt.
    expect(anders.stand).not.toBe(echt.stand);
  });

  test('eine fehlende Huelle ergibt KEINEN Stand', () => {
    // Nicht messen ist kein Bestehen. Der leere Stand laesst das Tor
    // scheitern — und ein halber Deploy ist genau das, was es sehen soll.
    expect(php('fehlt').stand).toBe('');
  });

  test('eine leere Huelle ergibt KEINEN Stand', () => {
    expect(php('leer').stand).toBe('');
  });

  test('Fingerabdruck und ausgelieferte Huelle kommen aus EINER Lesung', () => {
    // Die Datei wird unter dem laufenden Prozess ausgetauscht. Liest
    // eb_shell_ausgeben() selbst noch einmal, stuende im Kopf der
    // Fingerabdruck von A ueber einem Koerper B.
    const r = php('geteilt');
    expect(r.stand).toBe(r.standVonA);
    expect(r.standVonB).not.toBe(r.standVonA); // Gegenprobe
    expect(r.ausgabeHatA, 'ausgeliefert wurde nicht die gelesene Huelle').toBe(true);
    expect(r.ausgabeHatB, 'ausgeliefert wurde die spaeter geschriebene Huelle').toBe(false);
    // Und der echte Weg wurde gegangen, nicht ein vereinfachter.
    expect(r.ausgabeNonce).toBe(true);
  });
});

test.describe('index.php traegt den Stand in den Kopf', () => {
  const quelle = phpOhneKommentare(path.join(WURZEL, 'index.php'));

  test('der Marker steht im <head> und kommt aus eb_shell_stand()', () => {
    expect(quelle).toContain('eb_shell_stand()');
    expect(quelle).toMatch(/<meta name="eb-stand" content="/);
    // Der Marker muss VOR </head> stehen — ein <meta> im Body ist kein
    // Kopf, und der Deploy-Schritt liest den Kopf.
    const marker = quelle.indexOf('name="eb-stand"');
    const kopfEnde = quelle.indexOf('</head>');
    expect(marker).toBeGreaterThan(-1);
    expect(kopfEnde).toBeGreaterThan(marker);
  });

  test('ein leerer Stand schreibt KEIN leeres Attribut', () => {
    // `content=""` saehe fuer den Deploy-Schritt aus wie ein Marker und
    // waere keiner — der Ausdruck verlangt zwoelf Hex-Zeichen, der Schritt
    // meldete also "kein eb-stand" statt "Marker leer". Die Bedingung im
    // Markup haelt den Fall da, wo er hingehoert.
    expect(quelle).toMatch(/\$eb_stand\s*!==\s*''/);
  });

  test('keine tote function_exists-Wache davor', () => {
    // WordPress laedt functions.php vor jedem Template; die Wache koennte
    // nie greifen und wuerde nur einen Schutz vortaeuschen — dieselbe
    // Klasse wie die typeof-Wache auf AI_CATEGORIES.
    expect(quelle).not.toMatch(/function_exists\(\s*'eb_shell_stand'/);
  });
});

test.describe('Der Deploy-Schritt prueft den Live-Stand', () => {
  test('der Schritt steht ZULETZT im Job', () => {
    // Nicht Kosmetik: ein roter Pruefer bricht den Job ab, und alles
    // danach wird uebersprungen. Stuende er vor den wp-config-Schritten,
    // verhinderte ein kurzer Netzfehler die Uebertragung von SMTP-,
    // Stripe-, Apple-, Steuer- und KI-Zugangsdaten.
    const namen = [...WORKFLOW.matchAll(/\n      - name: (.+)/g)].map((m) => m[1].trim());
    expect(namen.length).toBeGreaterThan(5);
    expect(namen[namen.length - 1]).toBe(SCHRITT_NAME);
  });

  test('passender Stand: Exit 0, ein Aufruf, keine Pause', () => {
    const huelle = 'EINE HUELLE\n';
    const r = fahre({ huelle, antworten: [{ code: '200', rumpf: seiteMit(standVon(huelle)) }] });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.summary).toContain('✅');
    expect(r.summary).toContain(standVon(huelle));
    expect(r.aufrufe).toBe(1);
    expect(r.pausen).toEqual([]);
  });

  test('anderer Stand: Exit 1, und der Befund nennt BEIDE', () => {
    const huelle = 'EINE HUELLE\n';
    const fremd = 'abcdef012345';
    const r = fahre({ huelle, antworten: [{ code: '200', rumpf: seiteMit(fremd) }] });
    expect(r.status).toBe(1);
    expect(r.summary).toContain(standVon(huelle));
    expect(r.summary).toContain(fremd);
    expect(r.summary).toContain('ANDERE');
  });

  test('kein Marker: eigene Diagnose, nicht dieselbe wie bei Abweichung', () => {
    const r = fahre({
      antworten: [{ code: '200', rumpf: '<html><head><title>x</title></head></html>' }],
    });
    expect(r.status).toBe(1);
    // Drei Lagen, drei Handgriffe. Ein gemeinsamer Text verwischt sie, und
    // dann sucht jemand am falschen Ende.
    expect(r.summary).toContain('traegt den Marker aber nicht');
    expect(r.summary).not.toContain('ANDERE');
  });

  test('nicht erreichbar: eigene Diagnose, und nichts wird behauptet', () => {
    const r = fahre({ antworten: [{ code: '500', rumpf: '' }] });
    expect(r.status).toBe(1);
    expect(r.summary).toContain('geprueft ist nichts');
    expect(r.summary).not.toContain('traegt den Marker aber nicht');
  });

  test('der Schritt wiederholt — mit wachsender Pause', () => {
    const huelle = 'EINE HUELLE\n';
    const r = fahre({
      huelle,
      antworten: [
        { code: '503', rumpf: '' },
        { code: '200', rumpf: seiteMit('000000000000') },
        { code: '200', rumpf: seiteMit(standVon(huelle)) },
      ],
    });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.aufrufe).toBe(3);
    // Nach einem Fehlschlag sofort wieder anzuklopfen misst den Deploy,
    // nicht die Seite: ein SFTP-Deploy macht den Opcode-Zwischenspeicher
    // ungueltig, die erste Anfrage danach uebersetzt functions.php neu.
    expect(r.pausen).toEqual(['5', '10']);
  });

  test('fuenf Anlaeufe, dann ist Schluss — keine Endlosschleife', () => {
    const r = fahre({ antworten: [{ code: '503', rumpf: '' }] });
    expect(r.status).toBe(1);
    expect(r.aufrufe).toBe(5);
    expect(r.pausen).toEqual(['5', '10', '15', '20']);
  });

  test('zwoelf Hex-Zeichen irgendwo im Rumpf sind KEIN Marker', () => {
    // Ein weiter gefasster Ausdruck faende den Stand auch im Fliesstext
    // oder in einem `?ver=`-Parameter und meldete Erfolg fuer eine Seite,
    // die den Marker nicht traegt.
    const huelle = 'EINE HUELLE\n';
    const stand = standVon(huelle);
    const r = fahre({
      huelle,
      antworten: [{
        code: '200',
        rumpf: `<html><head><title>eb-stand</title>`
             + `<link href="/x.css?v=${stand}"></head>`
             + `<body>eb-stand ${stand}</body></html>`,
      }],
    });
    expect(r.status).toBe(1);
    expect(r.summary).toContain('traegt den Marker aber nicht');
  });

  test('fehlt app-shell.html, meldet er NICHT eine Stand-Abweichung', () => {
    // `set -eo pipefail` traegt diesen Fall: ohne pipefail waere der
    // Rueckgabewert von `sha256sum … | cut` der von `cut`, und `cut`
    // gelingt immer. Der Schritt liefe mit LEERER Erwartung weiter und
    // meldete eine Stand-Abweichung — rot aus dem falschen Grund, und
    // jemand sucht am falschen Ende. Genau so waren am 09.09.2026 sechs
    // Tore in pr-check.yml entwaffnet, nur andersherum.
    const r = fahre({ huelle: null, antworten: [{ code: '200', rumpf: seiteMit('abcdef012345') }] });
    expect(r.status).not.toBe(0);
    expect(r.summary).not.toContain('stimmt nicht mit dem Upload');
    expect(r.aufrufe, 'ohne Erwartung darf nichts gemessen werden').toBe(0);
  });

  test('die Erwartung ist aus app-shell.html abgeleitet, nicht eingetragen', () => {
    // Gegenprobe zu allem darueber: zwei verschiedene Huellen muessen zwei
    // verschiedene Erwartungen ergeben. Ein fest eingetragener Stand
    // bestuende jeden Einzelfall oben, solange die gestellte Seite ihn
    // traegt.
    const a = 'HUELLE EINS\n';
    const b = 'HUELLE ZWEI\n';
    const mitA = fahre({ huelle: a, antworten: [{ code: '200', rumpf: seiteMit(standVon(a)) }] });
    const mitB = fahre({ huelle: b, antworten: [{ code: '200', rumpf: seiteMit(standVon(a)) }] });
    expect(mitA.status).toBe(0);
    expect(mitB.status, 'die Erwartung folgt der Datei nicht').toBe(1);
  });

  test('kein Cache-Umgeher an der Adresse', () => {
    // Liefert etwas dazwischen einen alten Stand aus, ist das genau der
    // Fall, den dieses Tor sehen soll — ein `?nocache=`-Parameter wuerde
    // es blind machen. Gemessen wird dieselbe Adresse wie fuer Besucher.
    const s = skript();
    expect(s).toMatch(/ZIEL="https:\/\/xn--eventbrse-57a\.de"/);
    expect(s).not.toMatch(/\$ZIEL\?|nocache|cache-bust/i);
  });
});
