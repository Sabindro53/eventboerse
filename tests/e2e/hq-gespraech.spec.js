// Der EB Circle darf nicht mit sich selbst reden.
//
// Gemeldet am 22.08. vom Inhaber: „redet einfach so, ohne dass ich was frage"
// — und dabei immer wieder „Wie füge ich einen Dienstleister hinzu?".
//
// Eine Ursache, drei Verstärker:
//   1. Das Mikrofon ging 120 ms nach dem Ende der Sprachausgabe wieder auf.
//      Zu kurz für Nachhall — der Kreis hörte den Schwanz seiner EIGENEN
//      Antwort.
//   2. Bei Stille öffnete es sich endlos neu. Ein Mikrofon, das von selbst
//      immer wieder aufgeht, ist auch ein Datenschutzproblem.
//   3. Ein einzelnes erkanntes Wort genügt der Wissensbasis für einen
//      Treffer: „Dienstleister" aus dem eigenen Nachhall trifft die
//      Überschrift der Board-Notiz — also las er sie wieder vor.
//
// Geprüft wird der ausgeführte Code aus hq.html: die Entscheidungsfunktionen
// werden herausgeschnitten und in einer leeren Seite laufen gelassen. Ein
// Textabgleich verfehlte genau das, worauf es ankommt — wann geschwiegen wird.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');

/** Schneidet eine Funktion samt Rumpf aus hq.html. */
function fn(name) {
  const von = HQ.indexOf('function ' + name + '(');
  expect(von, `${name} fehlt in hq.html`).toBeGreaterThan(-1);
  let tiefe = 0, i = HQ.indexOf('{', von);
  for (let k = i; k < HQ.length; k++) {
    if (HQ[k] === '{') tiefe++;
    else if (HQ[k] === '}') { tiefe--; if (!tiefe) return HQ.slice(von, k + 1); }
  }
  throw new Error('Rumpf von ' + name + ' nicht gefunden');
}

/** Die Entscheidungslogik in einer leeren Seite, mit setzbarem Zustand.
 *
 * `aeusserungVerarbeiten` läuft MIT — sie ist die Stelle, die die Regeln
 * verdrahtet, und genau dort steckte im ersten Entwurf ein
 * Reihenfolge-Fehler: der Auto-Merker wurde zurückgesetzt, bevor die
 * Echo-Prüfung ihn lesen konnte. Nur die Einzelregeln zu prüfen liess das
 * unbemerkt. */
const LOGIK = () => [
  'var letzteAntwort = "", autoGeoeffnet = false, leerRunden = 0;',
  'var MAX_LEERRUNDEN = ' + (HQ.match(/MAX_LEERRUNDEN\s*=\s*(\d+)/) || [, 1])[1] + ';',
  'var input = { value: "" };',
  'var __gefragt = [], __nachgehoert = 0, __zustand = [];',
  'function ask(q) { __gefragt.push(q); }',
  'function voiceState(t) { __zustand.push(t); }',
  'function nachhoeren() { __nachgehoert += 1; }',
  fn('normWorte'), fn('istSelbstgehoert'), fn('brauchbareAeusserung'),
  fn('aeusserungVerarbeiten'),
  'window.__pruefe = function (s) {',
  '  letzteAntwort = s.letzteAntwort || ""; autoGeoeffnet = !!s.auto;',
  '  return { echo: istSelbstgehoert(s.text), brauchbar: brauchbareAeusserung(s.text) };',
  '};',
  'window.__verarbeite = function (s) {',
  '  letzteAntwort = s.letzteAntwort || ""; autoGeoeffnet = !!s.auto;',
  '  leerRunden = 0; __gefragt = []; __nachgehoert = 0; __zustand = [];',
  '  aeusserungVerarbeiten(s.text);',
  '  return { gefragt: __gefragt, nachgehoert: __nachgehoert,',
  '           leerRunden: leerRunden, zustand: __zustand };',
  '};',
].join('\n');

async function seite(page) {
  await page.setContent('<!doctype html><meta charset="utf-8"><div></div>');
  await page.addScriptTag({ content: LOGIK() });
}

const pruefe = (page, zustand) => page.evaluate((s) => window.__pruefe(s), zustand);
const verarbeite = (page, zustand) => page.evaluate((s) => window.__verarbeite(s), zustand);

test.describe('EB Circle: erkennt die eigene Stimme', () => {
  const ANTWORT = 'Wie füge ich einen Dienstleister hinzu? Im Planungsboard '
    + 'wählst du Dienstleister hinzufügen und suchst im Inserat-Picker.';

  test('der Nachhall der eigenen Antwort gilt nicht als Frage', async ({ page }) => {
    await seite(page);
    const r = await pruefe(page, {
      text: 'wählst du Dienstleister hinzufügen und suchst', letzteAntwort: ANTWORT, auto: true });
    expect(r.echo, 'der Kreis beantwortet seinen eigenen Nachhall').toBe(true);
  });

  test('ein einzelnes nachgehalltes Wort auch nicht', async ({ page }) => {
    // Genau dieser Fall erzeugte das gemeldete Verhalten: das Mikrofon fängt
    // nur „Dienstleister" auf, das trifft die Überschrift, und die Notiz
    // wird erneut vorgelesen.
    await seite(page);
    const r = await pruefe(page, { text: 'Dienstleister', letzteAntwort: ANTWORT, auto: true });
    expect(r.echo, 'ein einzelnes Wort aus der eigenen Antwort kommt durch').toBe(true);
  });

  test('nach einem Druck ist dasselbe Wort ein Befehl', async ({ page }) => {
    // Die Gegenprobe, und sie ist nötig: ohne sie wäre „Lagebericht" nach
    // einer Antwort, die das Wort enthält, dauerhaft unbenutzbar. Ein Druck
    // ist eine Absicht.
    await seite(page);
    const r = await pruefe(page, {
      text: 'Lagebericht', letzteAntwort: 'Der Lagebericht steht bereit.', auto: false });
    expect(r.echo, 'ein gedrückter Befehl wird als Echo verworfen').toBe(false);
    expect(r.brauchbar).toBe(true);
  });

  test('eine echte Frage nach einer Antwort bleibt eine Frage', async ({ page }) => {
    // Ohne diese Gegenprobe wäre die Echo-Regel auch mit „alles ist Echo"
    // erfüllt — und das Gespräch wäre tot.
    await seite(page);
    const r = await pruefe(page, {
      text: 'Was kostet die Provision bei einer Buchung?', letzteAntwort: ANTWORT, auto: true });
    expect(r.echo, 'eine echte Frage wird als Echo verworfen').toBe(false);
    expect(r.brauchbar).toBe(true);
  });
});

test.describe('EB Circle: die Entscheidung selbst', () => {
  const ANTWORT2 = 'Wie füge ich einen Dienstleister hinzu? Im Planungsboard '
    + 'wählst du Dienstleister hinzufügen und suchst im Inserat-Picker.';

  test('ein Echo wird nicht gefragt und nicht nachgehört', async ({ page }) => {
    // Beides zusammen ist der Punkt: nur nicht zu antworten würde reichen,
    // um still zu bleiben — aber das Mikrofon ginge wieder auf und hörte
    // beim nächsten Mal denselben Nachhall.
    await seite(page);
    const r = await verarbeite(page, { text: 'Dienstleister', letzteAntwort: ANTWORT2, auto: true });
    expect(r.gefragt, 'der eigene Nachhall wird beantwortet').toEqual([]);
    expect(r.nachgehoert, 'nach einem Echo wird trotzdem nachgehört').toBe(0);
    expect(r.zustand.join(' ')).toMatch(/Eigene Ausgabe/);
  });

  test('eine echte Frage wird gestellt und setzt den Zähler zurück', async ({ page }) => {
    await seite(page);
    const r = await verarbeite(page, {
      text: 'Was kostet die Provision?', letzteAntwort: ANTWORT2, auto: true });
    expect(r.gefragt).toEqual(['Was kostet die Provision?']);
    expect(r.leerRunden, 'eine beantwortete Frage lässt den Zähler stehen').toBe(0);
    expect(r.nachgehoert, 'nach einer Frage wird zusätzlich nachgehört').toBe(0);
  });

  test('Stille führt zum Nachhören, nicht zu einer Frage', async ({ page }) => {
    await seite(page);
    const r = await verarbeite(page, { text: '', letzteAntwort: ANTWORT2, auto: true });
    expect(r.gefragt).toEqual([]);
    expect(r.nachgehoert, 'auf Stille folgt kein Nachhören').toBe(1);
  });

  test('Unverstandenes wird gemeldet, nicht beantwortet', async ({ page }) => {
    await seite(page);
    const r = await verarbeite(page, { text: 'ähm', letzteAntwort: '', auto: true });
    expect(r.gefragt).toEqual([]);
    expect(r.zustand.join(' ')).toMatch(/Nicht verstanden/);
  });
});

test.describe('EB Circle: was als Frage zählt', () => {
  test('Füllwörter sind keine Frage', async ({ page }) => {
    await seite(page);
    for (const wort of ['ähm', 'hm', 'mhm', 'ja', 'ok', 'also', '  ']) {
      const r = await pruefe(page, { text: wort, letzteAntwort: '', auto: true });
      expect(r.brauchbar, `„${wort}" wird als Frage behandelt`).toBe(false);
    }
  });

  test('ein einzelnes Fachwort ist sehr wohl ein Befehl', async ({ page }) => {
    // „Lagebericht" ist genau der Weg, den der Inhaber benutzt. Eine Regel,
    // die Einwortsätze pauschal verwirft, nähme ihm den Befehl weg.
    await seite(page);
    for (const wort of ['Lagebericht', 'Betriebsstand', 'Risiken']) {
      const r = await pruefe(page, { text: wort, letzteAntwort: '', auto: false });
      expect(r.brauchbar, `„${wort}" wird verworfen`).toBe(true);
    }
  });
});

test.describe('EB Circle: das Mikrofon geht nicht endlos wieder auf', () => {
  test('es gibt eine Runden-Grenze und sie ist klein', async () => {
    const m = HQ.match(/MAX_LEERRUNDEN\s*=\s*(\d+)/);
    expect(m, 'keine Grenze fürs Nachhören').toBeTruthy();
    expect(Number(m[1]), 'die Grenze ist so hoch, dass sie keine ist')
      .toBeLessThanOrEqual(2);
  });

  test('kein Sprachweg startet das Mikrofon an der Grenze vorbei', async () => {
    // Vorher stand `setTimeout(toggleMic, …)` an vier Stellen — zweimal
    // dieselbe endlose Schleife, einmal je Sprachweg. Jetzt führt genau ein
    // Weg zurück ans Mikrofon, und der zählt mit.
    const ohneKommentare = HQ.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const direkt = ohneKommentare.match(/setTimeout\(\s*toggleMic/g) || [];
    expect(direkt, 'ein Sprachweg startet das Mikrofon direkt neu').toEqual([]);
    expect(ohneKommentare).toMatch(/function nachhoeren\(\)/);
  });

  test('nach dem Sprechen wird nicht sofort zugehört', async () => {
    // 120 ms reichen nicht: der eigene Nachhall landet dann im Mikrofon.
    const m = HQ.match(/NACHHOER_PAUSE\s*=\s*(\d+)/);
    expect(m, 'keine Pause vor dem Nachhören').toBeTruthy();
    expect(Number(m[1]), 'die Pause ist zu kurz für den eigenen Nachhall')
      .toBeGreaterThanOrEqual(500);
  });

  test('nur ein Druck setzt die Grenze zurück', async () => {
    // In toggleMic() zurückzusetzen wäre falsch: das automatische Nachhören
    // ruft dieselbe Funktion und hätte die Grenze damit aufgehoben. Genau
    // dieser Fehler steckte im ersten Entwurf.
    const von = HQ.indexOf('function toggleMic()');
    const bis = HQ.indexOf('\n  function micBrowser', von);
    expect(HQ.slice(von, bis), 'toggleMic setzt den Zähler zurück')
      .not.toMatch(/leerRunden\s*=\s*0/);
    expect(HQ).toMatch(/function vonHand\(\)[\s\S]{0,120}leerRunden\s*=\s*0/);
  });

  test('was gesagt wurde, wird für den Vergleich gemerkt', async () => {
    // Ohne diese Zuweisung hätte die Echo-Erkennung nichts zu vergleichen
    // und wäre wirkungslos — grün, aber blind.
    const von = HQ.indexOf('function say(text)');
    expect(HQ.slice(von, von + 400)).toMatch(/letzteAntwort\s*=/);
  });
});
