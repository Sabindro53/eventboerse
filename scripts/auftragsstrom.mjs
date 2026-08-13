#!/usr/bin/env node
/**
 * Auftragsstrom — aus Befunden wird Arbeit.
 *
 * Die Lücke, die das schließt: elf Rollen laufen alle 30 Minuten und schreiben
 * Befunde ins Arbeitsjournal. Der Autopilot sucht sich seine Aufgabe davon
 * völlig unabhängig selbst — er grept die freigegebenen Dateien nach
 * Textmustern. Das Haus fand also Dinge, und niemand arbeitete daran.
 *
 * Dieses Skript liest das Journal und legt daraus eine Warteschlange an, aus
 * der der Scout ziehen kann.
 *
 * Vier Regeln, jede aus einem Fehler gelernt, den dieses Projekt schon hatte:
 *
 * 1. HERKUNFT. Jeder Eintrag nennt den Journaleintrag, aus dem er stammt —
 *    Rolle, Person, Zeit. Ein Auftrag ohne Herkunft wäre erfundene Arbeit.
 *
 * 2. DER RAHMEN WIRD NIE GEWEITET. Ein Befund über functions.php wird NICHT
 *    zum Auftrag. Er wird ausdrücklich als „außerhalb" geführt. Ein Vorschlag,
 *    den der Autopilot ohnehin ablehnen muss, ist schlimmer als keiner: er
 *    sieht aus wie Arbeit und verbraucht einen Lauf.
 *
 * 3. AUSSCHLÜSSE SIND SICHTBAR. Was nicht in die Schlange kommt, steht mit
 *    Grund daneben. Eine Schlange, die nur Aufnahmen führt, sieht aus wie ein
 *    Haus ohne Grenzen.
 *
 * 4. LEER IST EINE AUSSAGE. Gibt es keinen verwertbaren Befund, steht das so
 *    da — nicht als fehlende Datei und nicht als erfundener Auftrag.
 *
 * Aufrufe:
 *   node scripts/auftragsstrom.mjs            baut assets/eb-auftragsstrom.json
 *   node scripts/auftragsstrom.mjs --check    prüft Herkunft und Rahmen (CI-Tor)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SICHERE_DATEIEN } from './lib/sichere-dateien.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JOURNAL = join(ROOT, 'assets', 'eb-arbeit.json');
const ZIEL = join(ROOT, 'assets', 'eb-auftragsstrom.json');

/** Höchstalter eines Befunds. Älteres beschreibt einen anderen Code-Stand. */
const MAX_ALTER_STUNDEN = 72;
const MAX_AUFTRAEGE = 12;

/**
 * Wie dringend ein Befund klingt — an Wörtern, die das Haus selbst benutzt.
 * Bewusst grob: die Reihung soll nachvollziehbar sein, nicht klug.
 */
const DRINGLICH = [
  [/\b(fehler|kaputt|bricht|schlägt fehl|fehlgeschlagen|defekt)\b/i, 3, 'nennt einen Fehler'],
  [/\b(sicherheit|leck|offen|ungeschützt|injektion)\b/i, 3, 'nennt ein Sicherheitsthema'],
  [/\b(barrierefrei|kontrast|tastatur|screenreader|aria)\b/i, 2, 'nennt Barrierefreiheit'],
  [/\b(veraltet|alt|stale|drift|inkonsistent|widerspricht)\b/i, 2, 'nennt einen Drift'],
  [/\b(langsam|performance|blockiert|ruckelt)\b/i, 1, 'nennt Geschwindigkeit'],
];

function journalLesen() {
  if (!existsSync(JOURNAL)) return null;
  try {
    const j = JSON.parse(readFileSync(JOURNAL, 'utf8'));
    return Array.isArray(j.eintraege) ? j : null;
  } catch {
    return null;
  }
}

function bewerten(eintrag) {
  const text = String(eintrag.text || '');
  let punkte = 0;
  const gruende = [];
  for (const [muster, wert, warum] of DRINGLICH) {
    if (muster.test(text)) { punkte += wert; gruende.push(warum); }
  }
  const alterStunden = (Date.now() - new Date(eintrag.zeit).getTime()) / 3600000;
  // Frisch schlägt alt: ein Befund über einen alten Stand führt in die Irre.
  const frische = alterStunden < 6 ? 3 : alterStunden < 24 ? 2 : 1;
  punkte += frische;
  gruende.push(alterStunden < 6 ? 'frisch (< 6 h)' : alterStunden < 24 ? 'aus dem letzten Tag' : 'älter als ein Tag');
  return { punkte, gruende, alterStunden };
}

export function auftragsstromBauen(journal, jetzt = Date.now()) {
  const auftraege = [];
  const ausserhalb = [];
  const verworfen = [];

  for (const e of (journal?.eintraege || [])) {
    const herkunft = {
      rolle: e.rolle, person: e.person, rollenname: e.rollenname,
      bereich: e.bereich, zeit: e.zeit, aufgabe: e.aufgabe,
    };
    // Nur echte Lieferungen tragen einen Befund. Eine übersprungene Schicht
    // hat nichts gefunden — sie ist gar nicht gelaufen.
    if (e.ergebnis !== 'fertig') {
      verworfen.push({ herkunft, grund: `Schicht endete als „${e.ergebnis}" — kein Befund entstanden` });
      continue;
    }
    if (!String(e.text || '').trim()) {
      verworfen.push({ herkunft, grund: 'Eintrag ohne Text' });
      continue;
    }
    const alterStunden = (jetzt - new Date(e.zeit).getTime()) / 3600000;
    if (!(alterStunden < MAX_ALTER_STUNDEN)) {
      verworfen.push({ herkunft, grund: `älter als ${MAX_ALTER_STUNDEN} h — beschreibt einen anderen Code-Stand` });
      continue;
    }

    const genannt = Array.isArray(e.dateien) ? e.dateien : [];
    const drin = genannt.filter((d) => Object.hasOwn(SICHERE_DATEIEN, d));
    const draussen = genannt.filter((d) => !Object.hasOwn(SICHERE_DATEIEN, d));

    if (!drin.length) {
      // Regel 2: der Rahmen wird nicht geweitet, und Regel 3: es steht da.
      ausserhalb.push({
        herkunft,
        dateien: draussen,
        grund: draussen.length
          ? `nennt ${draussen.join(', ')} — außerhalb des freigegebenen Rahmens`
          : 'nennt keine Datei, die der Autopilot anfassen darf',
      });
      continue;
    }

    const { punkte, gruende } = bewerten(e);
    auftraege.push({
      quelle: herkunft,
      befund: String(e.text).replace(/\s+/g, ' ').trim().slice(0, 400),
      dateien: drin,
      // Dateien außerhalb des Rahmens werden hier NICHT mitgeführt: sonst
      // stünden sie in einem Auftrag, den der Autopilot annehmen soll.
      ausgeklammert: draussen,
      rang: punkte,
      warum: gruende.join(' · '),
    });
  }

  auftraege.sort((a, b) => b.rang - a.rang || new Date(b.quelle.zeit) - new Date(a.quelle.zeit));
  auftraege.forEach((a, i) => { a.id = `A${String(i + 1).padStart(3, '0')}`; });

  return {
    version: 1,
    erzeugt: new Date(jetzt).toISOString(),
    hinweis: 'Erzeugt von scripts/auftragsstrom.mjs aus assets/eb-arbeit.json. Nicht von Hand bearbeiten.',
    journalStand: journal?.aktualisiert || null,
    // Regel 4: leer ist eine Aussage, kein fehlender Schlüssel.
    lage: auftraege.length
      ? `${auftraege.length} verwertbare${auftraege.length === 1 ? 'r' : ''} Befund${auftraege.length === 1 ? '' : 'e'} im Rahmen`
      : (journal
        ? 'Kein Befund im freigegebenen Rahmen — der Scout wählt selbst.'
        : 'Arbeitsjournal nicht lesbar — es liegt kein Befund vor, das ist etwas anderes als keiner.'),
    auftraege: auftraege.slice(0, MAX_AUFTRAEGE),
    ausserhalb,
    verworfen,
  };
}

function pruefen(strom) {
  const fehler = [];
  if (!strom || strom.version !== 1) fehler.push('Kein gültiger Auftragsstrom.');
  for (const a of strom?.auftraege || []) {
    if (!a.quelle?.rolle || !a.quelle?.zeit) fehler.push(`${a.id}: Auftrag ohne Herkunft`);
    if (!a.dateien?.length) fehler.push(`${a.id}: Auftrag ohne Datei`);
    for (const d of a.dateien || []) {
      if (!Object.hasOwn(SICHERE_DATEIEN, d)) fehler.push(`${a.id}: ${d} liegt außerhalb des freigegebenen Rahmens`);
    }
    if (!String(a.befund || '').trim()) fehler.push(`${a.id}: Auftrag ohne Befund`);
  }
  if (!strom?.lage) fehler.push('Die Lage wird nicht benannt.');
  return fehler;
}

function main() {
  const args = process.argv.slice(2);
  const nurPruefen = args.includes('--check');
  const journal = journalLesen();

  if (nurPruefen) {
    if (!existsSync(ZIEL)) {
      console.error('⛔ assets/eb-auftragsstrom.json fehlt — node scripts/auftragsstrom.mjs ausführen.');
      process.exit(1);
    }
    const strom = JSON.parse(readFileSync(ZIEL, 'utf8'));
    const fehler = pruefen(strom);
    if (fehler.length) {
      console.error('⛔ Auftragsstrom:\n' + fehler.map((f) => `   - ${f}`).join('\n'));
      process.exit(1);
    }
    console.log(`✓ Auftragsstrom — ${strom.auftraege.length} im Rahmen, ${strom.ausserhalb.length} außerhalb, ${strom.verworfen.length} ohne Befund.`);
    return;
  }

  const strom = auftragsstromBauen(journal);
  writeFileSync(ZIEL, JSON.stringify(strom, null, 2) + '\n');
  console.log(`✓ assets/eb-auftragsstrom.json — ${strom.lage}`);
  if (strom.ausserhalb.length) {
    console.log(`   ${strom.ausserhalb.length} Befund(e) außerhalb des Rahmens:`);
    for (const a of strom.ausserhalb.slice(0, 5)) console.log(`   - ${a.herkunft.person}: ${a.grund}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('auftragsstrom.mjs')) main();
