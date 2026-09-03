// Erreichbar ist nicht dasselbe wie brauchbar.
//
// Am 01.09.2026 meldete der Inhaber „die Seite ist down". Der Monitor stand
// zu dem Zeitpunkt seit dem 26.08. durchgehend auf grün und protokollierte
// HTTP 200 — zuletzt dreizehn Minuten vorher.
//
// Beides kann stimmen. Der Monitor rief `curl -o /dev/null` und warf den
// Rumpf weg: geprüft wurde nur, ob überhaupt etwas antwortet. Ein
// PHP-Fatal in `functions.php`, ein halb übertragener Deploy oder eine
// abgestürzte App liefern alle brav 200 — mit nichts darin.
//
// Ein Monitor, der „es kam ein Byte zurück" mit „die Seite funktioniert"
// verwechselt, meldet genau dann nichts, wenn man ihn braucht.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const WF = fs.readFileSync(
  path.join(ROOT, '.github', 'workflows', 'site-monitor.yml'), 'utf8');

/**
 * Fährt die Entscheidungslogik des Workflows als echte Shell.
 *
 * Die Bedingungen werden AUS dem Workflow geschnitten, nicht nachgebaut —
 * eine Nachbildung bewiese, dass die Nachbildung stimmt, und sonst nichts.
 */
function lage(httpCode, hatShell, jsCode) {
  const zweige = [...WF.matchAll(/^\s*(?:if|elif) (\[ "\$HTTP_CODE".*?)(?:; then)$/gm)]
    .map((m) => m[1]);
  expect(zweige.length, 'die Bedingungen stehen nicht mehr im Workflow')
    .toBeGreaterThanOrEqual(3);

  const skript = `
    HTTP_CODE=${httpCode}; HAT_SHELL=${hatShell}; JS_CODE=${jsCode}
    if ${zweige[0]}; then echo leer
    elif ${zweige[1]}; then echo defekt
    elif ${zweige[2]}; then echo up
    else echo down; fi`;
  return execFileSync('bash', ['-c', skript], { encoding: 'utf8' }).trim();
}

test.describe('Der Monitor unterscheidet „antwortet" von „funktioniert"', () => {
  test('alles da → up', () => {
    expect(lage(200, 'ja', 200)).toBe('up');
  });

  test('200, aber ohne die Anwendung → leer, nicht up', () => {
    // Der Fall, den der alte Monitor als „✅ up" führte. Ein PHP-Fatal
    // liefert genau das: Statuscode 200, leerer Rumpf.
    expect(lage(200, 'nein', 200), 'eine leere Seite gilt wieder als gesund')
      .toBe('leer');
  });

  test('Seite da, app.js fehlt → defekt, nicht up', () => {
    // Ein Deploy, der zur Hälfte durchläuft, hinterlässt gültiges HTML und
    // kein Skript. Die Seite lädt dann und tut nichts.
    expect(lage(200, 'ja', 404)).toBe('defekt');
  });

  test('Serverfehler und Totalausfall bleiben down', () => {
    expect(lage(500, 'nein', '000')).toBe('down');
    expect(lage('000', 'nein', '000')).toBe('down');
  });
});

test.describe('Der Alarm sagt, welche Sorte Ausfall es ist', () => {
  test('alle drei Lagen lösen einen Alarm aus, nicht nur „down"', () => {
    // Vorher hing der Alarm allein an `status == 'down'`. Ein 200 ohne
    // Inhalt hätte auch mit der neuen Erkennung niemanden erreicht.
    const bedingung = WF.match(/Create issue if site is down\n\s*if: ([^\n]+)/);
    expect(bedingung, 'die Alarmbedingung ist verschwunden').toBeTruthy();
    for (const l of ['down', 'leer', 'defekt']) {
      expect(bedingung[1], `Lage ${l} löst keinen Alarm aus`).toContain(`'${l}'`);
    }
  });

  test('jede Lage bekommt ihre eigene Anleitung', () => {
    // „Check DNS settings" hilft nicht, wenn die Seite antwortet. Eine
    // Anleitung, die für jeden Fall dieselbe ist, wird beim zweiten Mal
    // nicht mehr gelesen.
    expect(WF, 'die Lage taucht in der Überschrift nicht auf')
      .toMatch(/ueberschrift = \{[\s\S]{0,300}leer:[\s\S]{0,200}defekt:/);
    expect(WF, 'für „leer" fehlt der Hinweis auf das PHP-Protokoll')
      .toMatch(/PHP-Fehlerprotokoll/);
    expect(WF, 'für „defekt" fehlt der Hinweis auf den Deploy')
      .toMatch(/ionos-deploy\.yml erneut starten/);
  });

  test('der Bericht nennt Rumpfgröße und app.js-Status', () => {
    // Ohne diese zwei Zahlen steht im Ticket nur „irgendwas ist kaputt".
    for (const feld of ['GROESSE', 'JSCODE', 'LAGE']) {
      expect(WF, `${feld} wird dem Alarm nicht übergeben`)
        .toMatch(new RegExp(`${feld}: \\$\\{\\{ steps\\.health\\.outputs`));
    }
  });

  test('der Rumpf wird nicht mehr weggeworfen', () => {
    // Die Ursache in einer Zeile: `-o /dev/null` verwirft genau das,
    // woran man einen kaputten Deploy erkennen würde.
    const pruefschritt = WF.slice(WF.indexOf('Check HTTP response'),
      WF.indexOf('Create issue if site is down'));
    expect(pruefschritt, 'die Startseite wird wieder nach /dev/null geladen')
      .not.toMatch(/-o \/dev\/null[^\n]*xn--eventbrse/);
    expect(pruefschritt, 'der Inhalt wird nicht auf den Shell-Marker geprüft')
      .toMatch(/id="page-home"/);
  });
});
