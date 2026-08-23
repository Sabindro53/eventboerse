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
  'var PHANTOM = ' + (HQ.match(/var PHANTOM = \[[\s\S]*?\n  \];/) || [''])[0].replace(/^var PHANTOM = /, '') ,
  fn('istPhantom'), fn('istNachfrage'), fn('kurzfassung'),
  fn('normWorte'), fn('istSelbstgehoert'), fn('brauchbareAeusserung'),
  fn('aeusserungVerarbeiten'),
  'window.__phantom = function (x) { return istPhantom(x); };',
  'window.__nachfrage = function (x) { return istNachfrage(x); };',
  'window.__kurz = function (x, n) { return kurzfassung(x, n); };',
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

/* Whisper erfindet bei Stille Text: es hat mit Untertiteldateien gelernt und
   füllt eine leere Aufnahme mit deren Abspann. Am 23.08. kam so „Untertitel
   der Amara.org-Community" als angebliche Frage des Inhabers an — und wurde
   beantwortet. Das sah aus wie eine Gegenfrage des Kreises. */
test.describe('EB Circle: Whisper-Phantome', () => {
  const phantom = (page, x) => page.evaluate((s) => window.__phantom(s), x);
  const brauchbar = (page, x) => page.evaluate((s) => window.__pruefe({ text: s }).brauchbar, x);

  const ERFUNDEN = [
    'Untertitel der Amara.org-Community',
    'Untertitelung des ZDF für funk, 2017',
    'Untertitel im Auftrag des ZDF, 2020',
    'Vielen Dank fürs Zuschauen!',
    'Vielen Dank.',
    'Copyright WDR 2021',
    'Bis zum nächsten Mal.',
    'Abonniert den Kanal',
    // Die englische Fassung desselben Abspanns — Whisper gibt beide aus.
    // Nur das Amara-Muster fängt sie; ohne diesen Fall wäre es tote Zeile.
    'Subtitles by the Amara.org community',
    'Amara.org',
  ];

  test('kein Phantomtext wird zur Frage', async ({ page }) => {
    await seite(page);
    for (const s of ERFUNDEN) {
      expect(await phantom(page, s), `„${s}" wird nicht erkannt`).toBe(true);
      expect(await brauchbar(page, s), `„${s}" wird beantwortet`).toBe(false);
    }
  });

  test('echte Fragen zu denselben Wörtern bleiben erlaubt', async ({ page }) => {
    // Die Gegenprobe, und sie ist der Grund für die enge Liste: „Untertitel"
    // pauschal zu sperren nähme eine echte Frage nach Untertiteln mit, und
    // „Vielen Dank für die Auskunft" ist ein normaler Satz.
    await seite(page);
    for (const s of [
      'Können wir Untertitel für die Videos anbieten?',
      'Vielen Dank für die Auskunft, was steht als nächstes an?',
      'Wie ist das Copyright bei hochgeladenen Bildern geregelt?',
    ]) {
      expect(await phantom(page, s), `„${s}" wird faelschlich als Phantom verworfen`).toBe(false);
      expect(await brauchbar(page, s)).toBe(true);
    }
  });
});

test.describe('EB Circle: Nachfragen beziehen sich auf das Gesagte', () => {
  const nachfrage = (page, x) => page.evaluate((s) => window.__nachfrage(s), x);

  test('kurze Rückfragen werden als Bezug erkannt', async ({ page }) => {
    await seite(page);
    for (const s of ['Und was heißt das?', 'Wieso denn?', 'Erklär das genauer',
                     'Was heißt das für uns?', 'Und weiter?']) {
      expect(await nachfrage(page, s), `„${s}" gilt nicht als Rückfrage`).toBe(true);
    }
  });

  test('eine eigenständige Frage ist keine Rückfrage', async ({ page }) => {
    // Ohne diese Gegenprobe würde jede Frage am Verlauf hängen, und die
    // Wissensbasis käme nie mehr zum Zug.
    await seite(page);
    for (const s of ['Wie hoch ist die Provision?',
                     'Wie funktioniert die Registrierung für Dienstleister genau?',
                     'Lagebericht']) {
      expect(await nachfrage(page, s), `„${s}" wird faelschlich als Rückfrage gewertet`).toBe(false);
    }
  });
});

test.describe('EB Circle: der Lagebericht ist lesbar', () => {
  test('nur der erste Satz, nie mitten im Wort', async ({ page }) => {
    // Im Bericht stand ein 200-Zeichen-Schnipsel eines Frage-Antwort-Blocks,
    // abgebrochen bei „über dein Profi". Vorgelesen ist das unbrauchbar.
    await seite(page);
    const lang = 'Registriere dich kostenlos mit E-Mail und Passwort über dein Profil. '
      + 'Danach wählst du deine Rolle aus und ergänzt dein Profil.';
    const kurz = await page.evaluate((s) => window.__kurz(s, 140), lang);
    expect(kurz).toBe('Registriere dich kostenlos mit E-Mail und Passwort über dein Profil.');
    expect(kurz, 'der Satz endet mitten im Wort').not.toMatch(/\S…$/);
  });

  test('das Datum des Selbstchecks kommt aus dem echten Feld', async () => {
    // Die Audit-Datei nennt das Feld generatedAt. Der Bericht las `erzeugt`
    // und `generated` — beides gibt es nicht, also stand dort monatelang
    // „Selbstcheck vom ohne Datum".
    const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'latest.json'), 'utf8'));
    expect(audit.generatedAt, 'die Audit-Datei hat kein generatedAt mehr').toBeTruthy();
    const von = HQ.indexOf("'Selbstcheck vom '");
    expect(HQ.slice(von, von + 200)).toMatch(/state\.audit\.generatedAt/);
  });
});

test.describe('EB Circle: die Nachfrage ist auch verdrahtet', () => {
  /* Die Regel allein nützt nichts, wenn ask() sie nicht benutzt. Genau diese
     Lücke liess gestern zwei Mutationen überleben: geprüft war die Regel,
     nicht ihre Wirkung. ask() ist zu gross zum Ausschneiden — geprüft werden
     deshalb die vier Tatsachen, die zusammen die Wirkung ausmachen. */
  const ASK = HQ.slice(HQ.indexOf('  async function ask(q'),
    HQ.indexOf('  function aufnahmeBeenden'));

  test('ask() fragt istNachfrage und nur mit Verlauf', () => {
    expect(ASK, 'ask() kennt die Rückfrage nicht').toMatch(/istNachfrage\(q\)/);
    expect(ASK, 'eine Rückfrage ohne Verlauf hätte keinen Bezug')
      .toMatch(/conversation\.length\s*>\s*0[\s\S]{0,40}istNachfrage/);
  });

  test('eine Rückfrage geht nicht an die Wissensbasis', () => {
    // Sonst findet die Suche auf „und was heisst das?" irgendetwas
    // Schwaches — und die Antwort passt nicht zur Frage.
    expect(ASK).toMatch(/if \(nachfrage\) hit = null;/);
    expect(ASK, 'der Wissenszweig greift trotzdem')
      .toMatch(/if \(hit && !status && !g && !operative && !nachfrage\)/);
  });

  test('das zuletzt Gesagte wird als Bezug mitgegeben', () => {
    // Ohne diesen Kontext beantwortet das Modell die Rückfrage im Leeren.
    expect(ASK).toMatch(/nachfrage && letzteAntwort/);
    expect(ASK).toMatch(/bezieht sich auf deine letzte Antwort/);
  });
});

test.describe('EB Circle: dazwischenreden', () => {
  /* Der Inhaber: „ich will zwischendurch auch was anderes fragen können".
     Vorher beendete ein Druck während der Antwort das GANZE Gespräch — man
     konnte also nur warten oder wegwerfen. */
  const sprich = HQ.slice(HQ.indexOf('sprich: function () {'),
    HQ.indexOf('sprechen: function'));

  test('ein Druck während der Antwort beendet das Gespräch nicht', () => {
    expect(sprich, 'der Unterbrechungsfall fehlt').toMatch(/spricht\(\)\s*\|\|\s*asking/);
    // Der Abbruchzweig muss VOR dem close() stehen, sonst greift er nie.
    const iUnterbrechen = sprich.indexOf('spricht()');
    const iSchliessen = sprich.indexOf('close()');
    expect(iUnterbrechen, 'close() kommt vor der Unterbrechung').toBeLessThan(iSchliessen);
    // Und er hört danach zu, statt nur still zu werden.
    expect(sprich.slice(iUnterbrechen, iSchliessen)).toMatch(/stimmeStoppen\(\)/);
    expect(sprich.slice(iUnterbrechen, iSchliessen)).toMatch(/toggleMic\(\)/);
  });

  test('im Ruhezustand beendet derselbe Druck weiterhin', () => {
    // Die Gegenprobe: ohne sie liesse sich das Gespräch nicht mehr schliessen.
    expect(sprich).toMatch(/close\(\);\s*return;/);
  });

  test('der Kreis lädt zum Unterbrechen ein', () => {
    // Ein Label, das nur den Zustand nennt („antwortet"), sieht aus wie eine
    // Anzeige. Es muss dranstehen, dass man drücken darf.
    const von = HQ.indexOf("orbText.textContent = klasse ===");
    expect(HQ.slice(von, von + 300)).toMatch(/'spricht' \? 'unterbrechen'/);
  });

  test('das Mikrofon unterdrückt das eigene Echo', () => {
    // Ohne echoCancellation hört das Mikrofon die eigene Ausgabe aus den
    // Lautsprechern mit — die Grundlage jedes Selbstgesprächs.
    const von = HQ.indexOf('getUserMedia({ audio:');
    expect(von, 'die Aufnahme fordert keine Einstellungen an').toBeGreaterThan(-1);
    expect(HQ.slice(von, von + 260)).toMatch(/echoCancellation:\s*true/);
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
