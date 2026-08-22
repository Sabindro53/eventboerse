#!/usr/bin/env node
/**
 * Welche Material-Icons das Theme wirklich benutzt.
 *
 * Die ausgelieferte Icon-Schrift trug 2200 Symbole und 170 KB, benutzt werden
 * rund 380. Jeder Besucher lud den Rest mit. Diese Datei ist die eine Stelle,
 * die entscheidet, welche Namen drinbleiben — der Zuschnitt selbst passiert in
 * `scripts/icons-subset.py`, das diese Liste liest.
 *
 * WARUM DIE SAMMLUNG NICHT NUR `>name<` SUCHT: ein guter Teil der Icons steht
 * nicht als Text im Markup, sondern kommt aus einer Variablen —
 * `'<span class="material-icons-round">' + stage.icon + '</span>'`. Eine
 * Sammlung, die nur das Markup liest, verlöre genau diese und man sähe es erst
 * im Betrieb. Deshalb wird umgekehrt gesucht: von den 2200 möglichen Namen
 * bleibt jeder, der im Code überhaupt als eigenständiges Wort vorkommt.
 *
 * Das nimmt zu viel mit (`add`, `search`, `link` sind auch gewöhnliche
 * Bezeichner) — und das ist die richtige Richtung. Ein Icon zu viel kostet
 * ein paar hundert Byte; ein Icon zu wenig ist ein leerer Kasten in der
 * Oberfläche.
 *
 *   node scripts/icons.mjs          Liste neu erzeugen
 *   node scripts/icons.mjs --check  CI-Tor: benutzt der Code ein Icon,
 *                                   das nicht in der Liste steht?
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Alle Ligaturnamen der Quellschrift — von `icons-subset.py` erzeugt. */
export const ALLE_NAMEN = path.join(WURZEL, 'scripts', 'lib', 'material-icons-namen.txt');
/** Die Auswahl, mit der die ausgelieferte Schrift zugeschnitten wurde. */
export const BENUTZTE_NAMEN = path.join(WURZEL, 'scripts', 'lib', 'material-icons-benutzt.txt');

/**
 * Dateien, in denen Iconnamen stehen können.
 *
 * `app.js` ist die Verkettung aller Module und deckt `js/modules/**` mit ab;
 * beide zu lesen wäre doppelt, aber nicht falsch — deshalb steht die Quelle
 * mit drin, damit ein Icon auch dann gefunden wird, wenn `app.js` gerade
 * nicht neu gebaut wurde.
 */
const QUELLEN = [
  'app.js', 'hq.html', 'app-shell.html', 'index.php', 'styles.css',
  'index.local-head.html', 'index.local-foot.html',
];
const MODUL_ORDNER = path.join(WURZEL, 'js', 'modules');

function lies(datei) {
  const p = path.join(WURZEL, datei);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function alleModule(ordner) {
  if (!fs.existsSync(ordner)) return [];
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(ordner, e.name);
    return e.isDirectory() ? alleModule(p) : (e.name.endsWith('.js') ? [p] : []);
  });
}

/** Jedes Wort, das im Code vorkommt — Grundlage der Gegenprobe. */
export function woerterImCode() {
  let text = QUELLEN.map(lies).join('\n');
  for (const p of alleModule(MODUL_ORDNER)) text += '\n' + fs.readFileSync(p, 'utf8');
  return new Set(text.match(/[a-z0-9_]+/g) || []);
}

/** Die Iconnamen, die der Code benutzt: Schnittmenge aus allen Namen und dem Code. */
export function benutzteIcons() {
  const alle = fs.readFileSync(ALLE_NAMEN, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const woerter = woerterImCode();
  return alle.filter((n) => woerter.has(n));
}

function schreiben() {
  const benutzt = benutzteIcons();
  fs.writeFileSync(BENUTZTE_NAMEN, benutzt.join('\n') + '\n');
  const alle = fs.readFileSync(ALLE_NAMEN, 'utf8').trim().split('\n').length;
  console.log(`── Material-Icons ───────────────────────────────`);
  console.log(`Symbole in der Quelle : ${alle}`);
  console.log(`Im Code gefunden      : ${benutzt.length}`);
  console.log(`Liste geschrieben     : ${path.relative(WURZEL, BENUTZTE_NAMEN)}`);
  console.log(`Danach: python3 scripts/icons-subset.py`);
  console.log(`─────────────────────────────────────────────────`);
}

function pruefen() {
  if (!fs.existsSync(BENUTZTE_NAMEN)) {
    console.error('✗ Die Auswahlliste fehlt. `node scripts/icons.mjs` ausführen.');
    process.exit(1);
  }
  const inListe = new Set(
    fs.readFileSync(BENUTZTE_NAMEN, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  const fehlt = benutzteIcons().filter((n) => !inListe.has(n));
  if (fehlt.length) {
    console.error('✗ Der Code benutzt Icons, die nicht in der ausgelieferten Schrift stehen:');
    for (const n of fehlt) console.error(`   • ${n}`);
    console.error('');
    console.error('  Diese Symbole würden als leerer Kasten erscheinen. Beheben:');
    console.error('    node scripts/icons.mjs && python3 scripts/icons-subset.py');
    process.exit(1);
  }
  console.log(`✓ Alle ${inListe.size} benutzten Icons stehen in der ausgelieferten Schrift.`);
}

if (process.argv.includes('--check')) pruefen();
else schreiben();
