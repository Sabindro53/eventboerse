// Die Provision floss ohne Beleg — § 14 UStG.
//
// Befund vom 22.09.2026: `application_fee_amount` zog die Provision bei
// jeder Buchung ab, und es gab keine Rechnung von uns an den Dienstleister.
// `eb_send_invoice()` ist die Buchungsbestaetigung ueber die EVENTLEISTUNG,
// `downloadBusinessInvoice()` eine Selbstauskunft mit einer Abzugszeile —
// beide sind keine Rechnung. Der Dienstleister konnte die Provision nicht
// als Vorsteuer ziehen, wir hatten keinen Ausgangsbeleg.
//
// GEPRUEFT WIRD AUSGEFUEHRT, NICHT GELESEN. Der teure Fehler ist der Beleg,
// dem eine Pflichtangabe fehlt — und der sieht im Diff aus wie ein richtiger.
// Aufgefallen waere er erst, wenn das Finanzamt des Dienstleisters den
// Vorsteuerabzug streicht.
//
// ZWEI LAEUFE, WEIL EIN ZUSTAND ZWEI SEITEN HAT: einmal mit hinterlegter
// Steuernummer (der Betrieb), einmal ohne (die UG in Gruendung, also heute).
// Der zweite ist der wichtigere: ohne Steuernummer darf KEIN Beleg
// entstehen, und es darf dabei auch keine Rechnungsnummer verbraucht werden.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const HARNISCH = path.join(__dirname, 'provisionsrechnung.php');
const QUELLE = path.join(WURZEL, 'includes', 'steuer', 'provisionsrechnung.php');

function faelle(env = {}) {
  const roh = execFileSync('php', [HARNISCH], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return JSON.parse(roh);
}

test.describe('Die Provisionsrechnung traegt, was § 14 UStG verlangt', () => {
  test('der Pruefstand faehrt wirklich Faelle', () => {
    // Gegenprobe zuerst: eine leere Liste bestuende jede Zusicherung unten.
    expect(faelle().length, 'kein einziger Fall gefahren').toBeGreaterThan(30);
  });

  test('jeder Fall des Betriebs geht durch', () => {
    const schlecht = faelle().filter((f) => !f.ok);
    const text = schlecht.map((f) => `${f.name}: ist ${JSON.stringify(f.ist)}, `
      + `soll ${JSON.stringify(f.soll)}`).join('\n');
    expect(schlecht, `Provisionsrechnung:\n${text}`).toHaveLength(0);
  });

  test('ohne Steuernummer entsteht kein Beleg — und keine Luecke', () => {
    // Der Zustand von heute: die UG ist in Gruendung und hat weder
    // Steuernummer noch USt-IdNr. Ein Beleg ohne sie ist keine Rechnung im
    // Sinne des § 14 Abs. 4 Nr. 2 — er berechtigt den Empfaenger nicht zum
    // Vorsteuerabzug und muesste spaeter berichtigt werden.
    //
    // Wichtiger noch: der Fruehausstieg darf KEINE Rechnungsnummer
    // verbrauchen. Eine Luecke in der Folge muss man bei einer Pruefung
    // erklaeren koennen, und "da hat ein Aufruf abgebrochen" ist keine
    // Erklaerung, die jemand nachvollziehen kann.
    const alle = faelle({ EB_TEST_OHNE_STEUERNUMMER: '1' });
    const schlecht = alle.filter((f) => !f.ok);
    expect(alle.length, 'der Fall ohne Steuernummer wurde nicht gefahren')
      .toBeGreaterThan(2);
    expect(schlecht, schlecht.map((f) => f.name).join(', ')).toHaveLength(0);
  });

  test('die Steuer wird herausgerechnet, nicht aufgeschlagen', () => {
    // Die Zeile, an der Geld haengt. Stripe zieht die Application Fee vom
    // Zahlbetrag ab — sie IST der Bruttobetrag unserer Leistung. Wer 19 %
    // aufschlaegt, stellt mehr in Rechnung, als eingenommen wurde, und
    // schuldet die Differenz aus eigener Tasche.
    const alle = faelle();
    const netto = alle.find((f) => f.name === 'Netto wird herausgerechnet, nicht aufgeschlagen');
    expect(netto && netto.ok, 'aus 119,00 brutto wurden nicht 100,00 netto').toBe(true);
    // Und centgenau ueber die ganze Bandbreite.
    for (const f of alle.filter((x) => x.name.startsWith('Netto+Steuer=Brutto'))) {
      expect(f.ok, `${f.name}: ${f.ist} statt ${f.soll}`).toBe(true);
    }
  });

  test('ein unklarer Steuerfall wird gemeldet, nicht geraten', () => {
    // Eine falsch angewandte Reverse-Charge-Regel ist keine Formalie: wer
    // sie zu Unrecht anwendet, schuldet die Steuer trotzdem und hat sie
    // nicht eingenommen.
    const alle = faelle();
    for (const name of ['Drittland ist unklar', 'EU ohne USt-IdNr ist unklar',
      'EU mit fremder USt-IdNr ist unklar', 'unklarer Steuerfall wird abgewiesen']) {
      const f = alle.find((x) => x.name === name);
      expect(f && f.ok, `${name} — der Fall wird geraten statt gemeldet`).toBe(true);
    }
  });

  test('die Rechnungsnummer wird atomar hochgezaehlt', () => {
    // Ein get_option + update_option hat ein Rennen: zwei gleichzeitige
    // Buchungen lesen 41 und schreiben beide 42. Dieselbe Nummer zweimal zu
    // vergeben verletzt § 14 Abs. 4 Nr. 4 — und faellt erst bei einer
    // Pruefung auf. Gemessen wird die SCHREIBWEISE des Statements, weil ein
    // echtes Rennen im Pruefstand nicht herstellbar ist.
    const code = phpOhneKommentare(QUELLE);
    const ab = code.indexOf('function eb_provision_naechste_nummer');
    expect(ab, 'die Nummernvergabe gibt es nicht mehr').toBeGreaterThan(-1);
    const rest = code.slice(ab + 1);
    const ende = rest.search(/\nfunction\s/);
    const rumpf = ende > -1 ? rest.slice(0, ende) : rest;

    expect(rumpf, 'die Nummer wird nicht in EINEM Statement hochgezaehlt — '
      + 'zwei gleichzeitige Buchungen bekaemen dieselbe')
      .toMatch(/option_value\s*=\s*option_value\s*\+\s*1/);
    expect(rumpf, 'es wird wieder gelesen, gerechnet und geschrieben')
      .not.toMatch(/update_option\s*\(/);
  });

  test('das Modul wird von functions.php wirklich eingebunden', () => {
    // Sonst ist es fertiger Code, den niemand ausfuehrt. Gesucht wird die
    // EINBINDUNG nach Abzug der Kommentare, nicht der Pfad: beim
    // Kontaktschutz stand der Pfad im erklaerenden Kommentar und die
    // Mutation "require_once entfernt" ueberlebte.
    const code = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    expect(code, 'includes/steuer/provisionsrechnung.php wird nirgends eingebunden')
      .toMatch(/require(_once)?[^;]*steuer\/provisionsrechnung\.php/);
  });
});
