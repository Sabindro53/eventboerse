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
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (p) => fs.readFileSync(path.join(WURZEL, p), 'utf8');
const zeilen = (p) => lies(p).split('\n').filter((z) => z.trim() && !z.trim().startsWith('#')).length;

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
    name: 'REST-Routen (functions.php)',
    wo: 'CLAUDE.md · Dateitabelle',
    behauptet: () => behauptet(CLAUDE, /REST API \((\d+)\s+Routen\)/),
    gemessen: () => (lies('functions.php').match(/register_rest_route/g) || []).length,
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

/** Zwei Dokumente, die dieselbe Zahl nennen, müssen dieselbe Zahl nennen. */
function testzahlEinig() {
  const a = behauptet(CLAUDE, /(\d+) Tests in \d+ Suiten/);
  const b = behauptet(SPRINT, /Playwright-Suite: (\d+) Tests/);
  return { a, b };
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

  const t = testzahlEinig();
  if (t.a === null || t.b === null) {
    zeilenAus.push('✗ Testzahl: in CLAUDE.md oder im Sprint nicht gefunden');
    fehler++;
  } else if (t.a !== t.b) {
    zeilenAus.push(`✗ Testzahl uneinig: CLAUDE.md ${t.a}, Current-Sprint ${t.b}`);
    fehler++;
  } else {
    zeilenAus.push(`✓ Testzahl einig${''.padEnd(19)} beide ${String(t.a).padStart(6)}`);
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
