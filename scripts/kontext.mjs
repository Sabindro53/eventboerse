#!/usr/bin/env node
/**
 * Stimmen die Zahlen in CLAUDE.md noch?
 *
 * CLAUDE.md ist die Datei, die jede Sitzung zuerst liest — und die einzige,
 * die niemand nachmisst. Gemessen am 22.08.2026 waren vier Angaben veraltet:
 * 22 statt 24 Module, „86 Routen" statt 101, „~16 300 Zeilen CSS" statt
 * 17 100, und beim Messaging „alle 3s", obwohl das Polling längst mit 5 s
 * beginnt, bis 20 s zurückfährt und bei verstecktem Tab ganz pausiert.
 *
 * Die letzte Angabe ist die teuerste: sie beschreibt eine Schwäche, die es
 * nicht mehr gibt. Wer sie liest, sucht ein Problem, das schon behoben ist.
 * Ein veraltetes Steuerungsdokument kostet mehr als gar keins, weil es
 * Vertrauen genießt.
 *
 *   node scripts/kontext.mjs          Behauptung und Messung nebeneinander
 *   node scripts/kontext.mjs --check  CI-Tor
 *
 * WICHTIG: Findet ein Sucher seine Aussage nicht mehr in CLAUDE.md, ist das
 * ein FEHLER, kein bestandener Test. Ein Tor, das bei umformulierten Text
 * stillschweigend durchwinkt, prüft nichts mehr und sieht dabei grün aus.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (p) => fs.readFileSync(path.join(WURZEL, p), 'utf8');
const zeilen = (p) => lies(p).split('\n').filter((z) => z.trim() && !z.trim().startsWith('#')).length;

/**
 * Jede PHP-Datei des Themes — ohne `node_modules`, `vendor` und Tests.
 *
 * Die Prüfstände unter `tests/` bilden WordPress nach und enthalten
 * dieselben Aufrufe als Attrappe; sie mitzuzählen ergäbe eine Zahl, die
 * nirgends im Betrieb ankommt.
 */
function phpDateien(ordner = '') {
  const voll = path.join(WURZEL, ordner);
  const raus = [];
  for (const e of fs.readdirSync(voll, { withFileTypes: true })) {
    const rel = ordner ? `${ordner}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (['node_modules', 'vendor', '.git', 'tests', 'test-results'].includes(e.name)) continue;
      raus.push(...phpDateien(rel));
    } else if (e.name.endsWith('.php')) {
      raus.push(rel);
    }
  }
  return raus;
}

const CLAUDE = lies('CLAUDE.md');
const SPRINT = lies('vault/50-Evolution/Roadmap/Current-Sprint.md');

/**
 * Eine Zahl aus einem Text ziehen.
 *
 * `null` = Stelle nicht mehr gefunden. `NaN` = mehrdeutig, also an mehreren
 * Stellen mit verschiedenen Zahlen. Beides ist ein Fehler.
 *
 * Die Mehrdeutigkeit ist keine Theorie: als dieser Prüfer dokumentiert wurde,
 * zitierte der Fliesstext die alte Zahl („~16 300 Zeilen CSS"), das Muster
 * griff die erste Fundstelle und meldete einen Fehler, den es nicht gab. Ein
 * Muster, das mehrere Stellen trifft, misst nicht die Aussage, sondern die
 * Reihenfolge im Dokument.
 */
function behauptet(text, muster) {
  const alle = [...text.matchAll(new RegExp(muster.source, muster.flags.replace('g', '') + 'g'))]
    .map((m) => Number(String(m[1]).replace(/[.\s]/g, '')));
  if (!alle.length) return null;
  return alle.every((z) => z === alle[0]) ? alle[0] : NaN;
}

export const AUSSAGEN = [
  {
    name: 'Frontend-Module',
    wo: 'CLAUDE.md · Architektur-Tabelle',
    behauptet: () => behauptet(CLAUDE, /(\d+)\s+Module in `core\/`/),
    gemessen: () => zeilen('js/modules/modules.list'),
  },
  {
    name: 'REST-Routen (alle PHP-Dateien)',
    wo: 'CLAUDE.md · Dateitabelle',
    behauptet: () => behauptet(CLAUDE, /REST API \((\d+)\s+Routen\)/),
    // ── WARUM NICHT NUR functions.php ───────────────────────────────────
    //
    // Bis zum 09.09.2026 stand hier `lies('functions.php')`. Das war
    // richtig, solange alle Routen dort standen — und wurde still falsch,
    // als `includes/social/routen.php` sechzehn weitere brachte: der
    // Prüfer meldete „106 behauptet, 106 gemessen" für eine Anwendung mit
    // 122 Routen.
    //
    // Ein Prüfer, der sein Subjekt nur zur Hälfte kennt, gibt eine
    // Entwarnung, die er nicht decken kann. Gezählt wird deshalb über
    // JEDE PHP-Datei des Themes — wer Routen auslagert, ändert damit
    // nicht die Zählpflicht.
    gemessen: () => phpDateien()
      .reduce((n, d) => n + (lies(d).match(/register_rest_route/g) || []).length, 0),
  },
  {
    name: 'Test-Suiten',
    wo: 'CLAUDE.md · Tests',
    behauptet: () => behauptet(CLAUDE, /Tests in (\d+)\s+Suiten/),
    gemessen: () => fs.readdirSync(path.join(WURZEL, 'tests', 'e2e'))
      .filter((f) => f.endsWith('.spec.js')).length,
  },
  {
    name: 'Benutzte Icons',
    wo: 'CLAUDE.md · Icon-Schrift',
    behauptet: () => behauptet(CLAUDE, /benutzt werden (\d+)\./),
    gemessen: () => zeilen('scripts/lib/material-icons-benutzt.txt'),
  },
  {
    name: 'Dateien im Autopilot-Rahmen',
    wo: 'CLAUDE.md · Befund → Arbeit',
    behauptet: () => behauptet(CLAUDE, /Rahmen umfasst \*\*(\d+)\s+Dateien\*\*/),
    // Aus der Datei gelesen statt importiert: der Sicherheitsrahmen soll
    // hier nicht von einer Modulauflösung abhängen.
    //
    // Das Muster darf sich NICHT auf `js/modules/` verengen — der Rahmen
    // enthält auch drei CSS-Dateien. Mit der engeren Fassung meldete dieser
    // Prüfer 12 statt 15 und hätte beinahe dazu geführt, eine korrekte
    // Sicherheitsgrenze in der Dokumentation kleiner zu schreiben, als sie
    // ist. Ein Prüfer, der sich irrt, ist gefährlicher als keiner.
    gemessen: () => (lies('scripts/lib/sichere-dateien.mjs')
      .match(/^\s{2}'[^']+':/gm) || []).length,
  },
  {
    name: 'Zeilen in styles.css (auf Hunderter)',
    wo: 'CLAUDE.md · Dateitabelle',
    // An die Tabellenzeile gebunden, nicht an den Fliesstext.
    behauptet: () => behauptet(CLAUDE, /\| `styles\.css` \| ~([\d\s]+) Zeilen CSS/),
    gemessen: () => Math.round(lies('styles.css').split('\n').length / 100) * 100,
    // CSS wächst bei fast jedem PR. Eine Angabe auf Hunderter mit Spielraum
    // ist ehrlicher als eine exakte Zahl, die dauernd falsch ist.
    spielraum: 500,
  },
];

/**
 * Wie viele Tests es WIRKLICH gibt — je Datei und insgesamt.
 *
 * ── WARUM NICHT GEZÄHLT, SONDERN GEFRAGT ────────────────────────────────
 *
 * Ein Ausdruck über `^\s*test\(` ergibt 902, Playwright meldet 956. Die
 * Differenz sind Tests, die in einer Schleife entstehen — `topbar.spec.js`
 * fährt denselben Fall über zwei Bildschirmbreiten. Ein Prüfer mit dieser
 * Zahl läge bei jedem Lauf um 54 daneben und wäre gefährlicher als keiner.
 *
 * `--list` kostet 1,4 s und läuft im PR-Check unmittelbar vor
 * `npx playwright test`; die Installation ist dort also ohnehin da.
 *
 * Schlägt der Aufruf fehl oder ist die Ausgabe unverständlich, ist das ein
 * FEHLER — nicht messen ist kein Bestehen. Genau diese Verwechslung liess
 * den toten Gitleaks-Scan vier Monate wie Schutz aussehen.
 */
let _testzahlen = null;
function testzahlen() {
  if (_testzahlen) return _testzahlen;
  let ausgabe;
  try {
    ausgabe = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=null'], {
      cwd: WURZEL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
    });
  } catch (e) {
    return (_testzahlen = { fehler: `Playwright liess sich nicht befragen: ${e.message.split('\n')[0]}` });
  }
  const gesamt = ausgabe.match(/Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+files?/);
  if (!gesamt) {
    return (_testzahlen = { fehler: 'Playwright-Ausgabe ohne "Total: N tests in M files"' });
  }
  const jeDatei = new Map();
  for (const m of ausgabe.matchAll(/›\s+([\w.-]+\.spec\.js):\d+:\d+\s+›/g)) {
    jeDatei.set(m[1], (jeDatei.get(m[1]) || 0) + 1);
  }
  if (!jeDatei.size) {
    return (_testzahlen = { fehler: 'Playwright-Ausgabe ohne einzelne Testzeilen' });
  }
  return (_testzahlen = { gesamt: Number(gesamt[1]), dateien: Number(gesamt[2]), jeDatei });
}

/**
 * Die Suitenzahlen neben den `npx playwright test …`-Zeilen in CLAUDE.md.
 *
 * ── WARUM DAS HIER STEHT ────────────────────────────────────────────────
 *
 * Bis zum 10.09.2026 verglich dieser Prüfer die Gesamtzahl in CLAUDE.md mit
 * der in Current-Sprint.md — also ZWEI HANDZAHLEN MITEINANDER. Beide durften
 * 800 sagen, das Tor blieb grün; gemessen hat niemand.
 *
 * Der Beleg lag schon vor: `# 44 Tests` neben `social.spec.js` (echt 43) und
 * `# 14 Tests` neben `aasa.spec.js` (echt 18). Zwei falsche Angaben in der
 * Datei, die jede Sitzung zuerst liest, mit einem grünen Haken daneben.
 *
 * Findet das Muster keine einzige solche Zeile, ist das ein Fehler: ein
 * Prüfer ohne Subjekt gibt eine Entwarnung, die er nicht decken kann.
 */
function suitenzahlen() {
  return [...CLAUDE.matchAll(/tests\/e2e\/([\w.-]+\.spec\.js)[^\n#]*#\s*(\d+)\s+Tests/g)]
    .map((m) => ({ datei: m[1], behauptet: Number(m[2]) }));
}

function pruefen(streng) {
  const zeilenAus = [];
  let fehler = 0;

  for (const s of AUSSAGEN) {
    const b = s.behauptet();
    const g = s.gemessen();
    if (b === null) {
      // Nicht mehr auffindbar: der Sucher greift ins Leere. Das ist der
      // gefährlichste Fall, weil er wie „geprüft" aussieht.
      zeilenAus.push(`✗ ${s.name}: Aussage nicht mehr gefunden (${s.wo})`);
      fehler++;
      continue;
    }
    if (Number.isNaN(b)) {
      zeilenAus.push(`✗ ${s.name}: Aussage mehrdeutig — das Muster trifft mehrere`);
      zeilenAus.push(`  Stellen mit verschiedenen Zahlen (${s.wo}). Muster enger fassen.`);
      fehler++;
      continue;
    }
    const ok = s.spielraum ? Math.abs(b - g) <= s.spielraum : b === g;
    zeilenAus.push(`${ok ? '✓' : '✗'} ${s.name.padEnd(34)} behauptet ${String(b).padStart(6)}  gemessen ${String(g).padStart(6)}`);
    if (!ok) fehler++;
  }

  // ── Die Testzahl wird gemessen, nicht abgeglichen ─────────────────────
  //
  // Zwei Dokumente, die einander bestätigen, belegen nichts. Beide werden
  // deshalb gegen Playwright geprüft — und wer sie umformuliert, muss das
  // Muster mitziehen, statt still durchgewunken zu werden.
  const t = testzahlen();
  if (t.fehler) {
    zeilenAus.push(`✗ Testzahl nicht messbar: ${t.fehler}`);
    fehler++;
  } else {
    for (const [wo, zahl] of [
      ['CLAUDE.md', behauptet(CLAUDE, /(\d+) Tests in \d+ Suiten/)],
      ['Current-Sprint', behauptet(SPRINT, /Playwright-Suite: (\d+) Tests/)],
    ]) {
      if (zahl === null) {
        zeilenAus.push(`✗ Testzahl in ${wo} nicht gefunden — Muster anpassen`);
        fehler++;
        continue;
      }
      const ok = zahl === t.gesamt;
      zeilenAus.push(`${ok ? '✓' : '✗'} ${`Tests (${wo})`.padEnd(34)} behauptet ${String(zahl).padStart(6)}  gemessen ${String(t.gesamt).padStart(6)}`);
      if (!ok) fehler++;
    }

    const suiten = suitenzahlen();
    if (!suiten.length) {
      zeilenAus.push('✗ Keine `npx playwright test …  # N Tests`-Zeile in CLAUDE.md gefunden');
      fehler++;
    } else {
      const schief = suiten.filter((s) => t.jeDatei.get(s.datei) !== s.behauptet);
      for (const s of schief) {
        const ist = t.jeDatei.get(s.datei);
        zeilenAus.push(`✗ ${s.datei.padEnd(34)} behauptet ${String(s.behauptet).padStart(6)}  gemessen ${String(ist === undefined ? '—' : ist).padStart(6)}`);
      }
      fehler += schief.length;
      if (!schief.length) {
        zeilenAus.push(`✓ ${'Suitenzahlen in CLAUDE.md'.padEnd(34)} ${String(suiten.length).padStart(6)} geprüft, alle richtig`);
      }
    }
  }

  console.log('── Kontext gegen Code ───────────────────────────');
  zeilenAus.forEach((z) => console.log(z));
  console.log('─────────────────────────────────────────────────');
  if (fehler) {
    console.log(`${fehler} Angabe(n) stimmen nicht. CLAUDE.md ist das erste, was jede`);
    console.log('Sitzung liest — eine falsche Zahl dort kostet mehr als keine.');
    if (streng) process.exit(1);
  } else {
    console.log('✓ Alle prüfbaren Angaben stimmen mit dem Code überein.');
  }
}

pruefen(process.argv.includes('--check'));
