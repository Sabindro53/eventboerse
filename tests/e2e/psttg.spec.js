// PStTG: die Daten, ohne die wir im Januar nicht melden koennen.
//
// Seit dem 01.01.2023 ist ein Plattformbetreiber meldepflichtig, ueber den
// eine "relevante Taetigkeit" vermittelt wird. § 5 Abs. 1 Nr. 2 PStTG nennt
// die PERSOENLICHE DIENSTLEISTUNG ausdruecklich — DJ, Catering, Fotografie.
//
// UND ES GIBT KEINE BAGATELLGRENZE FUER UNS. Die Ausnahme des § 4 Abs. 5
// Nr. 4 (unter 30 Faelle UND unter 2.000 Euro) gilt nur fuer den VERKAUF VON
// WAREN. Am 22.09.2026 nachgeschlagen, weil die Annahme "unter 30 ist frei"
// naheliegt — und hier waere sie teuer: gemeldet wird ab dem ersten Euro,
// ein Verstoss ist eine Ordnungswidrigkeit nach § 25 PStTG.
//
// GEPRUEFT WIRD AUSGEFUEHRT, NICHT GELESEN. Der teure Fehler ist nicht der
// Syntaxfehler, sondern die Validierung, die etwas durchlaesst — und die
// sieht im Diff genauso aus wie eine, die haelt. tests/e2e/psttg.php bindet
// den echten Quelltext ein und stellt nur die drei Griffe, die er braucht.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const HARNISCH = path.join(__dirname, 'psttg.php');
const QUELLE = path.join(WURZEL, 'includes', 'steuer', 'psttg.php');

function faelle() {
  const roh = execFileSync('php', [HARNISCH], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(roh);
}

test.describe('PStTG: Anbieterdaten werden erhoben und geprueft', () => {
  test('der Pruefstand laeuft und prueft wirklich etwas', () => {
    const alle = faelle();
    // Gegenprobe zuerst: eine leere Liste bestuende jede Zusicherung unten.
    expect(alle.length, 'der Pruefstand hat keinen einzigen Fall gefahren')
      .toBeGreaterThan(25);
  });

  test('jeder Fall des Pruefstands geht durch', () => {
    const schlecht = faelle().filter((f) => !f.ok);
    const text = schlecht.map((f) => `${f.name}: ist ${JSON.stringify(f.ist)}, `
      + `soll ${JSON.stringify(f.soll)}`).join('\n');
    expect(schlecht, `PStTG-Pruefstand:\n${text}`).toHaveLength(0);
  });

  test('die Pruefziffer der Steuer-ID wird wirklich gerechnet', () => {
    // Die Zusicherung, an der alles haengt: eine Nummer mit falscher
    // Pruefziffer darf nicht durchgehen, eine amtliche muss. Ein Pruefer, der
    // nur die Laenge misst, waere hier gruen und im Januar rot.
    const alle = faelle();
    const amtlich = alle.find((f) => f.name === 'amtliche Beispielnummer gilt');
    const kaputt = alle.find((f) => f.name === 'falsche Pruefziffer faellt durch');
    expect(amtlich && amtlich.ok, 'die amtliche Beispielnummer wird abgewiesen').toBe(true);
    expect(kaputt && kaputt.ok, 'eine falsche Pruefziffer kommt durch').toBe(true);
  });

  test('die Erhebung haengt am Auszahlungsweg, nicht an der Registrierung', () => {
    // Die datenschutzrechtliche Entscheidung dieser Datei. Meldepflichtig ist
    // nur, wer Verguetung erhaelt (§ 4 Abs. 4) — ein Eventplaner nie.
    // Geburtsdatum und Steuer-ID von JEDEM Registrierten einzusammeln waere
    // eine Erhebung auf Vorrat (Art. 5 Abs. 1 lit. c DSGVO).
    //
    // Gemessen an der Registrierung: sie darf diese Felder nicht kennen.
    const shell = fs.readFileSync(path.join(WURZEL, 'app-shell.html'), 'utf8');
    const ab = shell.indexOf('id="registerModal"');
    expect(ab, 'das Registrierungsfenster gibt es nicht mehr — dieser Test '
      + 'hat sein Subjekt verloren').toBeGreaterThan(-1);
    // Bis zum naechsten Fenster; das Registrierungsfenster endet vor
    // `registerOtpModal`.
    const bis = shell.indexOf('id="registerOtpModal"', ab);
    const formular = shell.slice(ab, bis > -1 ? bis : ab + 8000);
    expect(formular, 'der gemessene Ausschnitt ist nicht das Formular')
      .toContain('id="regEmail"');
    for (const feld of ['psttgSteuerId', 'psttgGeburtsdatum']) {
      expect(formular, `die Registrierung fragt ${feld} ab — das ist eine `
        + 'Erhebung auf Vorrat fuer alle, die nie Verguetung erhalten')
        .not.toContain(feld);
    }
  });

  test('Pflichtfelder werden abgeleitet, nicht zweimal gepflegt', () => {
    // eb_psttg_stand() und eb_psttg_anbieterdaten() muessen beide
    // eb_psttg_pflichtfelder() fragen. Zwei Listen derselben Pflicht driften,
    // und diese driftet bis zur abgelehnten Meldung — ein Jahr spaeter.
    const code = phpOhneKommentare(QUELLE);
    for (const fn of ['eb_psttg_stand', 'eb_psttg_anbieterdaten']) {
      const ab = code.indexOf(`function ${fn}`);
      expect(ab, `${fn}() gibt es nicht`).toBeGreaterThan(-1);
      const rest = code.slice(ab + 1);
      const ende = rest.search(/\nfunction\s/);
      const rumpf = ende > -1 ? rest.slice(0, ende) : rest;
      expect(rumpf, `${fn}() baut seine eigene Feldliste, statt `
        + 'eb_psttg_pflichtfelder() zu fragen').toContain('eb_psttg_pflichtfelder');
    }
  });

  test('das Modul wird von functions.php wirklich eingebunden', () => {
    // Sonst ist es fertiger Code, den niemand ausfuehrt — die teuerste
    // wiederkehrende Fehlerklasse dieses Projekts. Gesucht wird die
    // EINBINDUNG, nicht der Pfad: beim Kontaktschutz stand der Pfad im
    // erklaerenden Kommentar und die Mutation "require_once entfernt"
    // ueberlebte.
    const code = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    expect(code, 'includes/steuer/psttg.php wird nirgends eingebunden')
      .toMatch(/require(_once)?[^;]*steuer\/psttg\.php/);
  });
});
