// Die Zwecktexte für Info.plist — aus EINER Quelle, nicht aus zwei.
//
// `Info.plist-zwecktexte.md` ist die Fassung, die ein Mensch liest und pflegt.
// Dieses Skript liest dieselbe Datei und erzeugt daraus, was Xcode braucht.
// Eine zweite Abschrift im Code driftet: gepflegt wird die, die man vor sich
// hat, und Apple sieht die andere.
//
// ── Die Regel, an der alles hängt ──────────────────────────────────────────
// Ein Abschnitt zählt nur, wenn der Schlüssel in seiner ÜBERSCHRIFT steht.
//
// Das ist keine Formalie. `NSMicrophoneUsageDescription` kommt in der Datei
// vor — im Fließtext eines Abschnitts, der ausdrücklich empfiehlt, das
// Mikrofon NICHT aufzunehmen. Ein Sammler, der die ganze Datei nach
// `NS…UsageDescription` durchsucht, trüge es ein und erbäte damit eine
// Berechtigung, von der die Datei abrät. Ebenso stehen unter „Nicht
// eintragen" vier weitere Schlüssel; auch die dürfen nie hineingeraten.
//
//   node native/zwecktexte.mjs            # zeigt, was eingetragen würde
//   node native/zwecktexte.mjs --plist    # XML-Fragment für Info.plist
//   node native/zwecktexte.mjs --strings  # en.lproj/InfoPlist.strings
import { readFile } from 'node:fs/promises';

const QUELLE = new URL('./Info.plist-zwecktexte.md', import.meta.url);

// Ein Schlüssel in einer `##`-Überschrift, in Backticks.
const UEBERSCHRIFT = /^##\s+.*?`(NS[A-Za-z]+UsageDescription)`/;
// Nur `##` beendet einen Abschnitt — `###` und `---` gehören noch dazu.
const NAECHSTE_UEBERSCHRIFT = /^##\s/;
const ZITAT = /^>\s*\*\*(DE|EN):\*\*\s*(.*)$/;

export async function zwecktexteLesen(pfad = QUELLE) {
  const zeilen = (await readFile(pfad, 'utf8')).split('\n');
  const raus = [];
  let offen = null;

  const abschliessen = () => {
    if (!offen) return;
    // Ein Abschnitt ohne beide Sprachen ist unvollständig, nicht „halb gut":
    // eine fehlende englische Fassung fällt erst im Review auf.
    if (!offen.de || !offen.en) {
      throw new Error(
        `${offen.schluessel}: ${!offen.de ? 'DE' : 'EN'}-Fassung fehlt in `
        + 'Info.plist-zwecktexte.md');
    }
    raus.push(offen);
    offen = null;
  };

  for (const zeile of zeilen) {
    const kopf = zeile.match(UEBERSCHRIFT);
    if (kopf) {
      abschliessen();
      offen = { schluessel: kopf[1], de: '', en: '' };
      continue;
    }
    if (NAECHSTE_UEBERSCHRIFT.test(zeile)) { abschliessen(); continue; }
    if (!offen) continue;

    const z = zeile.match(ZITAT);
    if (z) {
      offen[z[1].toLowerCase()] = z[2].trim();
      continue;
    }
    // Fortsetzungszeile eines Zitats: `> weiterer Text`, aber keine Leerzeile
    // und kein neuer Marker. Die Texte sind im Markdown umbrochen.
    if (/^>\s+\S/.test(zeile) && (offen.en || offen.de)) {
      const feld = offen.en ? 'en' : 'de';
      offen[feld] = (offen[feld] + ' ' + zeile.replace(/^>\s*/, '').trim()).trim();
    }
  }
  abschliessen();
  return raus;
}

const maskieren = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function alsPlist(eintraege) {
  return eintraege
    .map((e) => `\t<key>${e.schluessel}</key>\n\t<string>${maskieren(e.de)}</string>`)
    .join('\n');
}

export function alsStrings(eintraege) {
  // .strings ist keine Property-List: Anführungszeichen und Backslashes
  // müssen maskiert werden, sonst bricht die Datei still und Xcode liefert
  // den Schlüsselnamen als Text aus.
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return eintraege.map((e) => `"${e.schluessel}" = "${esc(e.en)}";`).join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const eintraege = await zwecktexteLesen();
  const modus = process.argv[2];
  if (modus === '--plist') console.log(alsPlist(eintraege));
  else if (modus === '--strings') console.log(alsStrings(eintraege));
  else {
    console.log(`${eintraege.length} Zwecktexte aus Info.plist-zwecktexte.md:\n`);
    for (const e of eintraege) {
      console.log(`  ${e.schluessel}`);
      console.log(`    DE: ${e.de}`);
      console.log(`    EN: ${e.en}\n`);
    }
    console.log('Nicht dabei (mit Absicht): NSMicrophoneUsageDescription und');
    console.log('alles unter „Nicht eintragen" — der Schlüssel steht dort im');
    console.log('Fließtext, nicht in einer Überschrift.');
  }
}
