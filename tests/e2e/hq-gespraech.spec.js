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
  'var freihaendig = true, fehlalarme = 0, ausUebernahme = false, MAX_FEHLALARME = 2;',
  'var MAX_LEERRUNDEN = ' + (HQ.match(/MAX_LEERRUNDEN\s*=\s*(\d+)/) || [, 1])[1] + ';',
  'var input = { value: "" };',
  'var __gefragt = [], __nachgehoert = 0, __zustand = [];',
  'function ask(q) { __gefragt.push(q); }',
  'function voiceState(t) { __zustand.push(t); }',
  'function nachhoeren() { __nachgehoert += 1; }',
  'var PHANTOM = ' + (HQ.match(/var PHANTOM = \[[\s\S]*?\n  \];/) || [''])[0].replace(/^var PHANTOM = /, '') ,
  fn('istPhantom'), fn('istNachfrage'), fn('kurzfassung'),
  'var KB = ' + JSON.stringify(JSON.parse(
    fs.readFileSync(path.join(ROOT, 'assets', 'eb-knowledge.json'), 'utf8'))) + ';',
  (HQ.match(/var STOP = \[[\s\S]*?\];/) || [''])[0],
  fn('toks'), fn('inText'), fn('stammImKopf'), fn('search'),
  'window.__antwort = function (q) { var h = search(q); return h ? h.heading : null; };',
  fn('hqOperativeAntwort').replace(/^function/, 'function'),
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
/* Die Antwort muss zur Frage passen.
   Gemeldet am 23.08. mit Beleg: „Was sind denn die nächsten konkreten
   Verbesserungen?" wurde mit einer Notiz über Planungsfehler beantwortet —
   allein wegen des Wortes „sind" in deren Überschrift. „Kann ich eine
   Aufgabe an dir geben?" traf die Suchvorschläge über „an" und „dir".
   Kein einziges inhaltstragendes Wort war beteiligt. */
test.describe('EB Circle: die Antwort passt zur Frage', () => {
  const antwort = (page, q) => page.evaluate((s) => window.__antwort(s), q);

  test('ein einzelnes Allerweltswort trägt keine Antwort', async ({ page }) => {
    await seite(page);
    for (const q of [
      'Was sind denn die nächsten konkreten Verbesserungen?',
      'Kann ich eine Aufgabe an dir geben?',
      'Was macht das HQ?',
    ]) {
      expect(await antwort(page, q),
        `„${q}" bekommt weiterhin eine unpassende Antwort`).toBeNull();
    }
  });

  test('ein einzelnes kurzes Wort trägt keine Antwort', async ({ page }) => {
    // „Chat?" allein ist zu dünn für eine selbstbewusste Auskunft. Ohne die
    // Substanzregel liefert es eine — und dieselbe Regel hält auch
    // „sind"/„macht" aus fremden Überschriften heraus.
    await seite(page);
    for (const q of ['Chat?', 'Board?', 'Wie melde ich?']) {
      expect(await antwort(page, q), `„${q}" wird selbstbewusst beantwortet`).toBeNull();
    }
    // Ein langes Wort allein reicht sehr wohl.
    expect(await antwort(page, 'Stornieren?'), 'ein tragendes Wort wird abgelehnt').toBeTruthy();
  });

  test('echte Fragen bekommen weiterhin ihre Antwort', async ({ page }) => {
    // Die Gegenprobe. Ohne sie wäre die Schwelle auch mit „nie antworten"
    // erfüllt — und die Wissensbasis damit nutzlos.
    await seite(page);
    const erwartet = [
      ['Wie hoch ist die Provision?', /Provision/i],
      ['Wie erstelle ich ein Inserat?', /Inserat/i],
      ['Wie plane ich eine Hochzeit?', /Hochzeit/i],
      ['Was sind typische Fehler bei der Planung?', /Fehler/i],
    ];
    for (const [q, muster] of erwartet) {
      const h = await antwort(page, q);
      expect(h, `„${q}" bekommt gar keine Antwort mehr`).toBeTruthy();
      expect(h, `„${q}" landet bei „${h}"`).toMatch(muster);
    }
  });

  test('deutsche Beugung findet die richtige Notiz', async ({ page }) => {
    // „Registrierung" steht nicht in „Wie registriere ich mich?" — vorher
    // gewann deshalb eine Notiz, die das Wort zufällig als Stichwort führte.
    await seite(page);
    expect(await antwort(page, 'Wie funktioniert die Registrierung?'))
      .toMatch(/registriere/i);
  });

  test('ein zu kurzer Wortstamm zählt nicht', async ({ page }) => {
    // „event-radar" traf „Event-Planer" über den Stamm „event-". Der Stamm
    // muss den Großteil des Wortes ausmachen, sonst passt er überallhin.
    await seite(page);
    const h = await antwort(page, 'Was ist der Event-Radar?');
    expect(h === null || /radar/i.test(h),
      `„Event-Radar" landet bei „${h}"`).toBe(true);
  });
});

test.describe('EB Circle: die Antwort ist auch verdrahtet', () => {
  /* Dieselbe Lücke wie zweimal zuvor: die Regel zu prüfen genügt nicht,
     wenn ask() sie nicht benutzt. ask() ist zu gross zum Ausschneiden. */
  const ASK = HQ.slice(HQ.indexOf('  async function ask(q'),
    HQ.indexOf('  function aufnahmeBeenden'));

  test('nur search() trägt eine Antwort, nicht der Kontexttreffer', () => {
    // topTreffer() sammelt Kontext fürs Modell und hat dafür eine
    // niedrigere Schwelle. Sie als Antwort zu nehmen hiess: was zum
    // Nachschlagen reicht, gilt auch als Auskunft.
    expect(ASK, 'der Kontexttreffer wird wieder zur Antwort')
      .not.toMatch(/var hit = treffer\[0\]/);
    expect(ASK).toMatch(/var hit = search\(q\);/);
  });

  test('die Antwort greift die Frage auf', () => {
    // Vorher begann sie wörtlich mit einer fremden Überschrift — das las
    // sich, als höre der Kreis gar nicht zu.
    expect(ASK).toMatch(/Ich verstehe das als/);
  });

  test('ein schwacher Wortstamm wiegt weniger als ein Stichwort', () => {
    // Mit gleicher Punktzahl stand „naechste" aus dem Fliesstext gleichauf
    // mit einem echten Stichwort. Zwei solche Zufälle ergaben eine
    // selbstbewusste Antwort auf eine Frage, die niemand gestellt hat.
    const suche = HQ.slice(HQ.indexOf('  function search(q)'),
      HQ.indexOf('  function topTreffer'));
    const schwach = Number((suche.match(/sc \+= (\d+); schwach\+\+/) || [, 99])[1]);
    const stichwort = Number((suche.match(/keys \|\| \[\]\)\.indexOf\(w\) !== -1\) \{ sc \+= (\d+)/) || [, 0])[1]);
    expect(schwach, 'kein schwacher Treffer mehr').toBeLessThan(stichwort);
    // Und er zählt nicht als vollwertiger Treffer für die Substanzregel.
    expect(suche).toMatch(/schwach\+\+/);
  });
});

test.describe('EB Circle: Fragen über den Kreis selbst', () => {
  const op = (page, q) => page.evaluate((s) => {
    try { var r = hqOperativeAntwort(s); return r ? r.answer : null; } catch (e) { return 'FEHLER:' + e.message; }
  }, q);

  test('er kann sagen, was das HQ ist', async ({ page }) => {
    // Stand in keiner Notiz — deshalb suchte die Wissensbasis irgendetwas.
    // Ein Assistent, der nicht sagen kann, was er ist, wirkt zu Recht
    // unbrauchbar.
    await seite(page);
    const a = await op(page, 'Was macht das HQ?');
    expect(a, 'keine Antwort auf die Frage nach dem HQ').toBeTruthy();
    expect(a).toMatch(/Betriebszentrale|Betriebsfragen/);
  });

  test('er erklärt, wie man ihm einen Auftrag gibt', async ({ page }) => {
    await seite(page);
    const a = await op(page, 'Kann ich eine Aufgabe an dir geben?');
    expect(a, 'keine Antwort auf die Auftragsfrage').toBeTruthy();
    expect(a, 'die Rückfrage vor dem Anlegen wird nicht genannt').toMatch(/Klick|Rückfrage|zeige/);
    expect(a, 'die Grenze auf Issues wird nicht genannt').toMatch(/Issue/);
  });

  test('eine gewöhnliche Produktfrage bleibt bei der Wissensbasis', async ({ page }) => {
    // Gegenprobe: die Muster dürfen nicht alles einsammeln, was „macht"
    // enthält — sonst verliert die Wissensbasis ihre Fragen.
    await seite(page);
    expect(await op(page, 'Was macht ein gutes Inserat aus?')).toBeNull();
  });
});

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

/* Freihändiges Dazwischenreden: während der Kreis spricht, misst ein
   Mithörer den Pegel. Das ist dieselbe Anordnung, die am 22.08. das
   Selbstgespräch erzeugt hat — offenes Mikrofon während der Ausgabe. Die
   Sicherungen sind deshalb der eigentliche Prüfgegenstand. */
test.describe('EB Circle: freihändig übernehmen', () => {
  /** Baut mithoerenStarten() mit gefälschtem Audio-Stack und Pegelverlauf. */
  const MITHOER = (pegel) => [
    'var mithoerStrom = null, mithoerCtx = null, mithoerLauf = false;',
    'var freihaendig = true, fehlalarme = 0, ausUebernahme = false;',
    'var MAX_FEHLALARME = 2, voiceMode = true;',
    'var EICHDAUER = ' + (HQ.match(/EICHDAUER = (\d+)/) || [, 600])[1] + ';',
    'var HALTEDAUER = ' + (HQ.match(/HALTEDAUER = (\d+)/) || [, 350])[1] + ';',
    'var UEBERNAHME_FAKTOR = ' + (HQ.match(/UEBERNAHME_FAKTOR = ([\d.]+)/) || [, 3.5])[1] + ';',
    'var UEBERNAHME_MIN = ' + (HQ.match(/UEBERNAHME_MIN = (\d+)/) || [, 4])[1] + ';',
    'window.__uebernommen = 0;',
    'var suppressVoiceRestart = false, askController = null, asking = false;',
    'var leerRunden = 0;',
    'function stimmeStoppen() {}',
    'function voiceState() {}',
    'function toggleMic() { window.__uebernommen += 1; }',
    fn('mithoerenBeenden'),
    fn('freihaendigUebernehmen'),
    fn('mithoerenStarten'),
    // Gefälschter Audio-Stack: der Pegelverlauf kommt aus dem Test.
    'var __pegel = ' + JSON.stringify(pegel) + ', __i = 0;',
    'navigator.mediaDevices = { getUserMedia: function () {',
    '  return Promise.resolve({ getTracks: function () { return [{ stop: function () {} }]; } });',
    '} };',
    'window.AudioContext = function () {',
    '  this.createMediaStreamSource = function () { return { connect: function () {} }; };',
    '  this.createAnalyser = function () { return { fftSize: 0, frequencyBinCount: 8,',
    '    getByteTimeDomainData: function (a) {',
    '      var p = __pegel[Math.min(__i++, __pegel.length - 1)];',
    '      for (var k = 0; k < a.length; k++) a[k] = 128 + p;',
    '    } }; };',
    '  this.close = function () {};',
    '};',
    'window.__start = function () { mithoerenStarten(); };',
    'window.__stand = function () { return { uebernommen: window.__uebernommen,',
    '  laeuft: mithoerLauf, freihaendig: freihaendig }; };',
  ].join('\n');

  async function mithoer(page, pegel) {
    await page.setContent('<!doctype html><meta charset="utf-8"><div></div>');
    await page.addScriptTag({ content: MITHOER(pegel) });
    await page.evaluate(() => window.__start());
  }
  const stand = (page) => page.evaluate(() => window.__stand());

  test('anhaltendes Sprechen übernimmt', async ({ page }) => {
    // Erst leise (Eichung: Raum plus Rest der eigenen Stimme), dann laut
    // und laut bleibend.
    await mithoer(page, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 30]);
    await expect.poll(async () => (await stand(page)).uebernommen,
      { timeout: 6000 }).toBe(1);
    expect((await stand(page)).laeuft, 'der Mithörer läuft nach der Übernahme weiter').toBe(false);
  });

  test('ein kurzer Knall übernimmt nicht', async ({ page }) => {
    // Türknall, Tastenanschlag: laut, aber nicht gehalten. Ohne diese
    // Bedingung unterbricht jedes Geräusch die Antwort.
    const leise = new Array(12).fill(1);
    await mithoer(page, leise.concat([40, 40, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    await page.waitForTimeout(2200);
    expect((await stand(page)).uebernommen, 'ein kurzer Knall hat übernommen').toBe(0);
  });

  test('der eigene Nachhall übernimmt nicht', async ({ page }) => {
    // Der Pegel bleibt durchgehend auf Eichhöhe — genau die eigene Stimme,
    // die die Echo-Unterdrückung übrig lässt.
    //
    // Der Wert liegt bewusst ÜBER der absoluten Untergrenze: bei 3 hätte
    // auch eine feste Schwelle geschwiegen, und der Test hätte die Eichung
    // gar nicht geprüft. Bei 8 löst eine feste Schwelle aus, die geeichte
    // nicht — das ist der Unterschied, um den es geht.
    await mithoer(page, new Array(40).fill(8));
    await page.waitForTimeout(2200);
    expect((await stand(page)).uebernommen, 'der eigene Nachhall hat übernommen').toBe(0);
  });

  test('zwei getrennte Knalle übernehmen nicht', async ({ page }) => {
    // Ohne Zurücksetzen der lauten Phase merkt sich der Messer den ersten
    // Knall, und der zweite löst sofort aus — obwohl dazwischen Ruhe war.
    const leise = new Array(12).fill(1);
    await mithoer(page, leise
      .concat([40, 40])                      // erster Knall, zu kurz
      .concat(new Array(14).fill(1))         // Ruhe
      .concat([40, 40])                      // zweiter Knall, ebenfalls kurz
      .concat(new Array(14).fill(1)));
    await page.waitForTimeout(3000);
    expect((await stand(page)).uebernommen,
      'der zweite Knall hat die alte laute Phase geerbt').toBe(0);
  });

  test('die Schwelle liegt deutlich über dem Ruhepegel', () => {
    // Der Prüfstand oben liest den Faktor aus der Quelle — er ändert sich
    // also mit. Deshalb wird die Eigenschaft hier direkt behauptet: ein
    // Faktor um 1 hiesse „alles, was auch nur minimal lauter ist als der
    // eigene Nachhall, gilt als Sprechen". Dann wäre die Eichung Zierde.
    const faktor = Number((HQ.match(/UEBERNAHME_FAKTOR = ([\d.]+)/) || [, 0])[1]);
    expect(faktor, 'kein Eichfaktor gefunden').toBeGreaterThan(0);
    expect(faktor, 'der Abstand zum Ruhepegel ist zu klein').toBeGreaterThanOrEqual(2);
    const halte = Number((HQ.match(/HALTEDAUER = (\d+)/) || [, 0])[1]);
    expect(halte, 'zu kurz — dann unterbricht jedes Geräusch').toBeGreaterThanOrEqual(200);
  });

  test('ohne Mikrofon-Freigabe schaltet es sich ab, statt still zu scheitern', async ({ page }) => {
    await page.setContent('<!doctype html><meta charset="utf-8"><div></div>');
    await page.addScriptTag({ content: MITHOER([1]).replace(
      'return Promise.resolve({ getTracks: function () { return [{ stop: function () {} }]; } });',
      'return Promise.reject(new Error("verweigert"));') });
    await page.evaluate(() => window.__start());
    await expect.poll(async () => (await stand(page)).freihaendig, { timeout: 3000 }).toBe(false);
  });
});

test.describe('EB Circle: die Übernahme begrenzt sich selbst', () => {
  test('zwei Fehlalarme schalten das freihändige Zuhören ab', async ({ page }) => {
    // Eine Automatik, die sich irrt, muss aufhören können — und sichtbar,
    // nicht still.
    await seite(page);
    const r = await page.evaluate(() => {
      const raus = [];
      for (let i = 0; i < 3; i++) {
        ausUebernahme = true;
        aeusserungVerarbeiten('ähm');
        raus.push({ freihaendig: freihaendig, fehlalarme: fehlalarme });
      }
      return raus;
    });
    expect(r[0].freihaendig, 'schon der erste Fehlalarm schaltet ab').toBe(true);
    expect(r[1].freihaendig, 'nach zwei Fehlalarmen läuft es weiter').toBe(false);
  });

  test('eine berechtigte Übernahme setzt den Zähler zurück', async ({ page }) => {
    // Ohne das Zurücksetzen summieren sich Fehlalarme über ein langes
    // Gespräch, und irgendwann schaltet es grundlos ab.
    await seite(page);
    const r = await page.evaluate(() => {
      ausUebernahme = true; aeusserungVerarbeiten('ähm');
      const nachFehl = fehlalarme;
      ausUebernahme = true; aeusserungVerarbeiten('Was kostet die Provision?');
      return { nachFehl: nachFehl, nachEcht: fehlalarme, freihaendig: freihaendig };
    });
    expect(r.nachFehl).toBe(1);
    expect(r.nachEcht, 'eine berechtigte Übernahme setzt nicht zurück').toBe(0);
    expect(r.freihaendig).toBe(true);
  });

  test('ein Druck zählt nicht als Fehlalarm', async ({ page }) => {
    // Sonst schaltete sich das freihändige Zuhören ab, weil jemand den
    // Knopf gedrückt und sich verhaspelt hat.
    await seite(page);
    const r = await page.evaluate(() => {
      ausUebernahme = false;
      aeusserungVerarbeiten('ähm');
      aeusserungVerarbeiten('hm');
      return { fehlalarme: fehlalarme, freihaendig: freihaendig };
    });
    expect(r.fehlalarme).toBe(0);
    expect(r.freihaendig).toBe(true);
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
