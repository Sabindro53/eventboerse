// Die Platzhalter im Impressum und der Tag, an dem sie unwahr werden.
//
// Befund vom 22.09.2026: von allen 15 Pflichtseiten traegt nur das Impressum
// unausgefuellte Platzhalter — [TELEFON-GESCHAEFTLICH], HRB [HR-NUMMER],
// [USt-IdNr.], [W-IdNr.].
//
// DREI DAVON KANN ES VOR DER EINTRAGUNG NICHT GEBEN. Handelsregisternummer,
// Umsatzsteuer-Identifikationsnummer und Wirtschafts-Identifikationsnummer
// vergeben Amtsgericht und Bundeszentralamt, nicht wir. Sie sind kein
// Versaeumnis, sondern der ehrliche Zustand "i. G.".
//
// DIE GEFAHR IST NICHT DAS FEHLEN, SIE IST DAS STILLE FALSCHWERDEN. In dem
// Moment, in dem die UG eingetragen ist, wird das Impressum unvollstaendig —
// ohne dass jemand etwas aendert und ohne dass irgendwo eine Warnung
// erscheint. § 5 DDG verlangt die Registernummer, sobald es eine gibt.
// Dieselbe Sorte wie Apples Haendlerstatus: eine FEHLENDE Angabe blockiert
// und faellt auf, eine STILLSCHWEIGEND FALSCH GEWORDENE nicht.
//
// ── Der erste Entwurf dieser Datei war selbst ein Pruefer ohne Subjekt ──
//
// Alle drei Mutationen ueberlebten ihn, und jede zeigte einen eigenen
// Fehler. Sie stehen hier, weil eine stillschweigend reparierte Pruefung
// aussieht, als haette sie immer funktioniert:
//
// 1. `textAusHtml()` laesst HTML-ENTITIES stehen — es entfernt Tags, nicht
//    Entities. Der Rechtsformzusatz steht als `i.&nbsp;G.` im Markup, und
//    `/i\.\s*G\./` trifft das nie: `&nbsp;` ist kein `\s`. Die Erkennung
//    "ist in Gruendung" war also von Anfang an blind.
//
// 2. Sie fiel nicht auf, weil das ODER daneben auf `Vorgründung` traf — den
//    MARKETING-BANNER derselben Seite. Ein Muster, das statt des gemeinten
//    Merkmals ein benachbartes trifft: dieselbe Klasse wie ein Ausdruck, der
//    den erklaerenden Kommentar trifft.
//
// 3. Die Pflichtangaben wurden am ETIKETT gemessen ("steht 'Handelsregister'
//    irgendwo?"), nicht am WERT. Den Wert zu loeschen und das Etikett stehen
//    zu lassen kam damit durch — und das ist genau der gefaehrliche Fall:
//    die Seite sieht vollstaendig aus und nennt die Pflichtangabe nicht mehr.
//
// Gemessen wird jetzt die ZEILE: jede Pflichtangabe muss ein Etikett UND
// dahinter entweder einen Wert oder einen als solchen erkennbaren
// Platzhalter tragen. Nichts dazwischen.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { textAusHtml } = require('./lib/html-text');

const SHELL = path.join(__dirname, '..', '..', 'app-shell.html');

/**
 * Der sichtbare Text des Impressums.
 *
 * `&nbsp;` wird zu einem Leerzeichen — sonst liest sich `i.&nbsp;G.` als
 * Zeichenkette und kein Muster ueber Wortgrenzen trifft je. Das ist keine
 * Schwaeche von textAusHtml(): der Griff entfernt Tags, und Entities sind
 * keine. Wer Text nach WOERTERN durchsucht, normiert sie vorher selbst.
 */
function impressum() {
  const roh = fs.readFileSync(SHELL, 'utf8');
  const ab = roh.indexOf('id="page-impressum"');
  expect(ab, 'die Impressumsseite gibt es nicht mehr').toBeGreaterThan(-1);
  const rest = roh.slice(ab + 1);
  const bis = rest.indexOf('id="page-');
  const text = textAusHtml(bis > -1 ? rest.slice(0, bis) : rest);
  return text.replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
}

/** Jeder [PLATZHALTER] im sichtbaren Text. */
function platzhalter(text) {
  return [...text.matchAll(/\[[A-ZÄÖÜa-zäöü.\- ]{3,30}\]/g)].map((m) => m[0]);
}

/**
 * Traegt die Pflichtangabe hinter ihrem Etikett wirklich etwas?
 *
 * Gibt zurueck, was dort steht: 'wert', 'platzhalter' oder 'leer'. Ein
 * fehlendes Etikett meldet 'fehlt' — das ist der Fall "geloescht statt
 * gefuellt", der schlimmer ist als ein Platzhalter.
 */
function angabe(text, etikett, wertMuster) {
  // JEDE Fundstelle, nicht die erste. Der erste Entwurf nahm `search()` —
  // und das Wort "Handelsregister" steht auf dieser Seite zuerst im
  // ERKLAERENDEN SATZ ("Bis zur Eintragung im Handelsregister wird das
  // Angebot von … betrieben"), erst hundert Zeichen spaeter in der
  // Datenzeile. Der Pruefer mass damit die Prosa statt des Feldes und
  // meldete am heilen Impressum "leer".
  //
  // Dieselbe Klasse wie ein Muster, das den erklaerenden Kommentar trifft —
  // hier im Fliesstext der Seite selbst, und zum zehnten Mal in diesem
  // Projekt.
  const quelle = new RegExp(etikett.source, etikett.flags.includes('g')
    ? etikett.flags : etikett.flags + 'g');
  let gefunden = false;
  for (const m of text.matchAll(quelle)) {
    gefunden = true;
    // Das Fenster hinter dem Etikett. Kurz genug, dass nicht die naechste
    // Zeile mitgemessen wird, lang genug fuer "Amtsgericht Bonn, HRB 12345".
    const fenster = text.slice(m.index, m.index + 80);
    if (platzhalter(fenster).length > 0) return 'platzhalter';
    if (wertMuster.test(fenster)) return 'wert';
  }
  return gefunden ? 'leer' : 'fehlt';
}

/** Steht die UG noch als "in Gruendung" da? Am Rechtsformzusatz, nicht am Banner. */
function inGruendung(text) {
  return /\bi\.\s*G\.(\s|,|$)/.test(text);
}

test.describe('Impressum: Platzhalter und ihre Erklaerung gehoeren zusammen', () => {
  test('die Seite nennt die Pflichtangaben des § 5 DDG', () => {
    const text = impressum();
    // Gegenprobe zuerst: ohne sie bestuende alles Weitere auch an einer
    // leeren Seite.
    expect(text.length, 'das Impressum ist praktisch leer').toBeGreaterThan(2000);
    expect(text, 'das Impressum nennt seine Rechtsgrundlage nicht').toMatch(/§ 5 DDG/);
    expect(text, 'der Anbieter fehlt').toMatch(/Eventbörse UG/);
    expect(text, 'die Anschrift fehlt').toMatch(/Königswinter/);
  });

  test('der Rechtsformzusatz wird wirklich gelesen', () => {
    // Die Gegenprobe zu Fehler 1 und 2 oben. Ohne sie waere die Erkennung
    // wieder blind, und beide Tests darunter winkten still durch.
    expect(inGruendung('Eventbörse UG (haftungsbeschränkt) i. G., Bonn')).toBe(true);
    expect(inGruendung('Eventbörse UG (haftungsbeschränkt), Bonn')).toBe(false);
    // Und der Marketing-Banner darf die Erkennung NICHT tragen: genau daran
    // hat die erste Fassung ihre Blindheit versteckt.
    expect(inGruendung('Beta- und Vorgründungsphase. Wir bauen gerade.')).toBe(false);
    // Am echten Text muss sie anschlagen, solange der Zusatz dasteht.
    expect(inGruendung(impressum()),
      'der Zusatz "i. G." wird im echten Impressum nicht erkannt').toBe(true);
  });

  test('jede amtliche Nummer traegt einen Wert oder einen Platzhalter', () => {
    // Der eigentliche Wächter. "Geloescht statt gefuellt" ist der
    // gefaehrliche Ausgang: die Seite sieht vollstaendig aus und nennt die
    // Pflichtangabe gar nicht mehr.
    const text = impressum();

    // Die Etiketten sind die der DATENZEILEN, nicht die Woerter aus dem
    // Fliesstext daneben. "Registernummer:" steht nur dort, "Handelsregister"
    // auch im erklaerenden Satz.
    const pflicht = [
      ['Registernummer', /Registernummer/, /HR[AB]\s?\d{2,7}/],
      ['Registergericht', /Amtsgericht|Registergericht/, /Amtsgericht\s+\p{Lu}\p{L}+/u],
      ['USt-IdNr.', /USt-IdNr|Umsatzsteuer-Identifikationsnummer/, /DE\s?\d{9}/],
    ];

    for (const [name, etikett, wert] of pflicht) {
      const stand = angabe(text, etikett, wert);
      expect(stand, `${name}: die Zeile ist ganz verschwunden — geloescht `
        + 'statt gefuellt. § 5 DDG verlangt sie, sobald es die Nummer gibt.')
        .not.toBe('fehlt');
      expect(stand, `${name}: Etikett da, aber weder Wert noch Platzhalter `
        + 'dahinter — die Seite sieht vollstaendig aus und ist es nicht.')
        .not.toBe('leer');
    }
  });

  test('solange Platzhalter dastehen, steht der Gruendungszusatz dabei', () => {
    const text = impressum();
    const offen = platzhalter(text);
    if (offen.length === 0) return; // alles gefuellt — der naechste Test greift

    expect(inGruendung(text), `${offen.length} Platzhalter (${offen.join(', ')}) `
      + 'stehen ohne den Zusatz "i. G." da — dann liest ein Besucher sie als '
      + 'kaputte Seite statt als "noch nicht eingetragen"').toBe(true);
  });

  test('ist die Gruendungsphase vorbei, darf kein Platzhalter bleiben', () => {
    const text = impressum();
    const offen = platzhalter(text);

    if (inGruendung(text)) {
      // Heute der Fall. Der Zustand wird benannt, statt stillschweigend zu
      // gelten: wer alle Platzhalter fuellt, muss auch den Zusatz entfernen.
      expect(offen.length, 'kein Platzhalter mehr, aber die Seite fuehrt sich '
        + 'weiter als "i. G." — einer von beiden ist veraltet').toBeGreaterThan(0);
      return;
    }

    expect(offen, 'die UG fuehrt sich nicht mehr als "i. G.", aber das '
      + `Impressum traegt noch ${offen.join(', ')}`).toHaveLength(0);
  });

  test('eine unmittelbare Kontaktmoeglichkeit steht immer da', () => {
    // § 5 DDG verlangt Angaben, die eine UNMITTELBARE Kommunikation
    // ermoeglichen. Ob das eine Telefonnummer sein muss, ist umstritten —
    // eine zeitnah beantwortete E-Mail-Adresse genuegt nach herrschender
    // Auffassung. Was NICHT genuegt, ist keines von beidem.
    const text = impressum();
    expect(text, 'weder E-Mail noch Telefon im Impressum')
      .toMatch(/@|Telefon/);
  });
});
