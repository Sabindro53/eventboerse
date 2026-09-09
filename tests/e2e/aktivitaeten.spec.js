// Was ist in meiner Nähe los? — der Aktivitäten-Bestand für Köln
//
// Schritt 3 der Vision (vault/10-Produkt/Vision-Plattform.md): Entdeckung an
// echten Daten beweisen, ohne Vertrag und ohne Kosten. Zwei Quellen,
// OpenLigaDB (Heimspiele des 1. FC Köln) und OpenStreetMap/Overpass (Orte mit
// Erlebniswert im Umkreis von 50 km).
//
// ── WARUM DIESE SUITE AN PRÜFSTÜCKEN MISST ──────────────────────────────
//
// Der Abruf braucht Netz, das die Agent-Umgebung nicht hat (403 auf CONNECT
// für beide Hosts). Genau daran ist `scripts/localize-demo-images.mjs`
// gestorben: geschrieben, nie ausgeführt, heute eine Warnung in CLAUDE.md.
//
// Deshalb ist das Skript zweigeteilt — Holen braucht Netz und läuft in der
// Tagesroutine, Umwandeln und Prüfen läuft überall. Diese Suite misst die
// zweite Hälfte an `tests/fixtures/aktivitaeten-roh.json`, einer nachgebildeten
// Rohantwort im Aufbau der echten APIs. Der letzte Test dieser Datei hält
// fest, dass die erste Hälfte auch wirklich aufgerufen wird; ohne ihn wäre
// dies wieder ein Skript, das niemand startet.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const ROH = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'aktivitaeten-roh.json'), 'utf8'));

// Der Bezugszeitpunkt steht im Prüfstück und wird hier ausdrücklich
// mitgegeben. Ein Test, der `new Date()` benutzt, verdirbt mit der Zeit:
// irgendwann liegt jedes Spiel des Prüfstücks in der Vergangenheit, und dann
// misst er nichts mehr — grün und blind.
const JETZT = new Date('2026-09-09T12:00:00Z');

const modul = () => import(pathToFileURL(path.join(ROOT, 'scripts', 'aktivitaeten.mjs')).href);
const bestand = async (jetzt = JETZT) => (await modul()).bestandBauen(ROH, jetzt);

test.describe('Aktivitäten-Bestand: die Umwandlung', () => {
  test('nur künftige Heimspiele — auswärts, vergangen und fremd fallen weg', async () => {
    const d = await bestand();
    const sport = d.eintraege.filter((e) => e.art === 'sport');

    // Gegenprobe zuerst: enthält das Prüfstück die Fälle überhaupt, die hier
    // wegfallen sollen? Ein Filtertest über einer Liste ohne Ausschussfälle
    // prüft nichts.
    expect(ROH.openligadb.length,
      'das Prüfstück führt zu wenige Spiele, um Auswahl zu belegen').toBeGreaterThan(3);
    expect(ROH.openligadb.some((s) => /FC Köln/.test(s.team2?.teamName || '')),
      'kein Auswärtsspiel im Prüfstück').toBe(true);
    expect(ROH.openligadb.some((s) => new Date(s.matchDateTimeUTC) < JETZT),
      'kein vergangenes Spiel im Prüfstück').toBe(true);

    expect(sport).toHaveLength(2);
    for (const e of sport) {
      expect(e.titel, 'ein Spiel ohne Köln vorne ist kein Heimspiel').toMatch(/^1\. FC Köln –/);
      expect(new Date(e.beginn).getTime()).toBeGreaterThan(JETZT.getTime());
    }
  });

  test('ein Ort bekommt keine erfundene Uhrzeit', async () => {
    // `beginn: null` ist kein fehlender Wert, sondern eine Aussage:
    // „jederzeit". Wer hier eine Uhrzeit einsetzt, damit die Ansicht
    // einheitlich aussieht, hat Daten erfunden.
    const orte = (await bestand()).eintraege.filter((e) => e.art === 'ort');
    expect(orte.length).toBeGreaterThan(2);
    for (const e of orte) expect(e.beginn).toBeNull();
  });

  test('der Umkreis wird nachgerechnet, nicht der Quelle geglaubt', async () => {
    const { entfernungKm, MITTE, UMKREIS_KM } = await modul();
    const d = await bestand();
    const namen = d.eintraege.map((e) => e.titel);

    // Overpass antwortet auf `around:` grosszügig, und eine kaputte Abfrage
    // liefert die halbe Republik. Der weite Eintrag muss wegfallen.
    const fern = ROH.overpass.elements.find((e) => e.tags?.name === 'Städel Museum');
    expect(fern, 'kein ferner Ort im Prüfstück — der Test hätte kein Subjekt').toBeTruthy();
    expect(entfernungKm(MITTE.lat, MITTE.lon, fern.lat, fern.lon)).toBeGreaterThan(UMKREIS_KM);
    expect(namen).not.toContain('Städel Museum');

    // Und die Gegenprobe: der Ort knapp innerhalb bleibt drin, sonst wäre
    // „alles wegwerfen" der bequemste Weg zu einem grünen Test.
    expect(namen).toContain('Kunstpalast');
    const nah = d.eintraege.find((e) => e.titel === 'Kunstpalast');
    expect(nah.entfernungKm).toBeGreaterThan(20);
    expect(nah.entfernungKm).toBeLessThan(UMKREIS_KM);
  });

  test('ein Weg trägt seine Koordinate in center, nicht oben', async () => {
    // OSM-Kinos und -Kletterhallen sind oft Gebäude (`way`), keine Punkte.
    // Wer nur `e.lat` liest, verliert sie stillschweigend — die Liste sieht
    // dann bloss kürzer aus, nicht falsch.
    const w = ROH.overpass.elements.find((e) => e.type === 'way');
    expect(w?.center, 'kein Weg mit center im Prüfstück').toBeTruthy();
    expect(w.lat, 'der Weg hätte auch oben eine Koordinate — Test wertlos').toBeUndefined();
    expect((await bestand()).eintraege.map((e) => e.titel)).toContain(w.tags.name);
  });

  test('ohne Namen kein Vorschlag, und eine Apotheke ist kein Erlebnis', async () => {
    const d = await bestand();
    const ohneName = ROH.overpass.elements.find((e) => e.tags && !e.tags.name);
    const falscheArt = ROH.overpass.elements.find((e) => e.tags?.amenity === 'pharmacy');
    expect(ohneName && falscheArt, 'beide Fälle fehlen im Prüfstück').toBeTruthy();

    expect(d.eintraege.map((e) => e.id)).not.toContain(`osm:node/${ohneName.id}`);
    expect(d.eintraege.map((e) => e.id)).not.toContain(`osm:node/${falscheArt.id}`);
  });
});

test.describe('Aktivitäten-Bestand: fremder Text ist Daten, nie Markup', () => {
  test('spitze Klammern überleben die Umwandlung nicht', async () => {
    // Namen und Titel kommen von Fremden und landen in unserer Oberfläche.
    // Das ist der Weg, über den ein OSM-Eintrag zu einem XSS würde.
    //
    // GESUCHT WIRD DIE SPITZE KLAMMER, NICHT `<script>`. Hier stand zuerst
    // `/<script>/.test(…)`, und CodeQL hat es zu Recht angestrichen: ein
    // Ausdruck, der genau ein kleingeschriebenes Tag trifft, sieht aus wie
    // ein Filter und wäre als Filter kaputt (`<SCRIPT>` ginge durch). Er war
    // hier nur ein Nachschlag im Prüfstück — aber die Verwechslung ist genau
    // die, vor der `lib/html-kommentare.js` schon einmal entstanden ist.
    // Ein Zeichen-Enthält braucht keinen Ausdruck und misst zudem das, worum
    // es wirklich geht: die Klammer, nicht das Wort dahinter.
    const roh = ROH.overpass.elements.find((e) => (e.tags?.name || '').includes('<'));
    expect(roh, 'kein Markup im Prüfstück — der Test hätte kein Subjekt').toBeTruthy();

    const d = await bestand();
    const treffer = d.eintraege.find((e) => e.id === `osm:node/${roh.id}`);
    expect(treffer, 'der Eintrag ist ganz verschwunden statt entschärft').toBeTruthy();
    expect(treffer.titel).not.toMatch(/[<>]/);
    expect(treffer.ort.name).not.toMatch(/[<>]/);
    // Entschärft, nicht zensiert: der lesbare Teil des Namens bleibt.
    expect(treffer.titel).toContain('Kletterhalle');
  });

  test('Steuerzeichen und Überlängen werden gekappt', async () => {
    const { textSaeubern } = await modul();
    // Die Steuerzeichen stehen hier als ESCAPE, nicht woertlich: eine
    // Quelldatei mit rohen Steuerzeichen haelt git fuer eine Binaerdatei,
    // und dann zeigt kein Diff mehr, was sich geaendert hat.
    expect(textSaeubern('Kino\u0000\u001FK\u00f6ln'),
      'Steuerzeichen werden zu Raum').toBe('Kino K\u00f6ln');
    expect(textSaeubern('Kino K\u00f6ln')).toBe('Kino K\u00f6ln');
    expect(textSaeubern('  viel   Raum  ')).toBe('viel Raum');
    expect(textSaeubern('x'.repeat(500)).length).toBeLessThanOrEqual(120);
    expect(textSaeubern(null)).toBe('');
    expect(textSaeubern({ toString: () => '<b>' }), 'nur Zeichenketten').toBe('');
  });

  test('der Fremdtext erreicht die Wissensbasis nie', async () => {
    // Die Wissensbasis speist den KI-Bot und den Board-Assistenten. Käme
    // fremder Veranstaltungstext dort hinein, wäre jeder OSM-Name eine
    // Einladung zur Prompt-Injektion. `build-knowledge.mjs` liest deshalb
    // ausschliesslich aus `vault/` — hier festgehalten, damit es so bleibt.
    const bau = fs.readFileSync(path.join(ROOT, 'scripts', 'build-knowledge.mjs'), 'utf8');
    expect(bau).toContain("join(ROOT, 'vault')");
    expect(bau, 'die Wissensbasis liest den Aktivitäten-Bestand').not.toContain('eb-aktivitaeten');

    // Und andersherum: das Skript schreibt nirgends in den Vault.
    const quelle = fs.readFileSync(path.join(ROOT, 'scripts', 'aktivitaeten.mjs'), 'utf8');
    const ohneKommentare = quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(ohneKommentare, 'der Bestand schreibt in den Vault').not.toMatch(/['"`]vault['"`]/);
  });
});

test.describe('Aktivitäten-Bestand: das Tor sagt die Wahrheit', () => {
  test('jeder Eintrag nennt Quelle, Adresse und Lizenz', async () => {
    // Ein Eintrag ohne Herkunft ist erfunden — und bei ODbL-Daten ist die
    // Namensnennung ausserdem Lizenzbedingung, keine Höflichkeit.
    const d = await bestand();
    expect(d.eintraege.length).toBeGreaterThan(0);
    for (const e of d.eintraege) {
      expect(e.quelle.name, e.id).toBeTruthy();
      expect(e.quelle.url, e.id).toMatch(/^https:\/\//);
      expect(e.quelle.lizenz, e.id).toBeTruthy();
    }
    expect(d.eintraege.filter((e) => e.art === 'ort')[0].quelle.lizenz)
      .toContain('OpenStreetMap-Mitwirkende');
  });

  test('eine fehlende Quelle wird beanstandet', async () => {
    const { beanstanden } = await modul();
    const d = await bestand();
    const kaputt = JSON.parse(JSON.stringify(d));
    delete kaputt.eintraege[0].quelle.lizenz;
    const { beanstandungen } = beanstanden(kaputt, JETZT);
    expect(beanstandungen.join(' ')).toMatch(/Quelle unvollständig/);
  });

  test('„nie abgerufen" ist ehrlich, Einträge ohne Abruf sind es nicht', async () => {
    const { leererBestand, beanstanden } = await modul();

    // Eine Datei, die sagt „der Abruf lief nie", ist in Ordnung. Das ist der
    // Unterschied zu „abgerufen und nichts gefunden" — genau diese
    // Verwechslung liess den toten Gitleaks-Scan wie Schutz aussehen.
    const leer = leererBestand();
    expect(leer.stand).toBeNull();
    expect(beanstanden(leer, JETZT).beanstandungen).toEqual([]);

    // Einträge zu führen und dabei zu behaupten, nie gelaufen zu sein, ist es
    // nicht: die Daten hätten dann keine Herkunft.
    const d = await bestand();
    const { beanstandungen } = beanstanden({ ...d, stand: null }, JETZT);
    expect(beanstandungen.join(' ')).toMatch(/ohne Abrufzeitpunkt/);
  });

  test('ein abgelaufener Termin meldet, blockiert aber nicht', async () => {
    // DIE REGEL: blockierend ist nur, was derselbe Commit beheben kann.
    // Ein verstrichenes Spiel entsteht dadurch, dass die Tagesroutine eine
    // Weile nicht lief — nicht durch den Diff, in dem der Check rot wird.
    // Als Beanstandung geführt, machte es den PR eines Unbeteiligten rot,
    // und nach dem dritten Mal schaltet jemand das Tor ab.
    const { beanstanden } = await modul();
    const d = await bestand();
    const spaeter = new Date('2027-01-01T00:00:00Z');   // alle Spiele vorbei

    const { beanstandungen, hinweise } = beanstanden(d, spaeter);
    expect(beanstandungen, 'ein alter Abruf blockiert den PR-Check').toEqual([]);
    expect(hinweise.join(' '), 'und er wird auch nicht verschwiegen').toMatch(/Vergangenheit/);

    // Gegenprobe: zum Bezugszeitpunkt gibt es nichts zu melden.
    expect(beanstanden(d, JETZT).hinweise).toEqual([]);
  });

  test('ein unlesbarer Zeitpunkt blockiert sehr wohl', async () => {
    // Der Unterschied zum Test darüber: das ist ein Fehler der Umwandlung,
    // also im Diff behebbar.
    const { beanstanden } = await modul();
    const d = await bestand();
    const kaputt = JSON.parse(JSON.stringify(d));
    kaputt.eintraege[0].beginn = 'demnächst';
    expect(beanstanden(kaputt, JETZT).beanstandungen.join(' ')).toMatch(/kein Zeitpunkt/);
  });

  test('Markup im Titel blockiert', async () => {
    const { beanstanden } = await modul();
    const d = await bestand();
    const kaputt = JSON.parse(JSON.stringify(d));
    kaputt.eintraege[0].titel = 'Kino <img onerror=x>';
    expect(beanstanden(kaputt, JETZT).beanstandungen.join(' ')).toMatch(/Markup im Titel/);
  });

  test('doppelte Kennungen fallen auf', async () => {
    const { beanstanden } = await modul();
    const d = await bestand();
    const kaputt = JSON.parse(JSON.stringify(d));
    kaputt.eintraege.push({ ...kaputt.eintraege[0] });
    kaputt.anzahl.gesamt = kaputt.eintraege.length;
    expect(beanstanden(kaputt, JETZT).beanstandungen.join(' ')).toMatch(/doppelte Kennung/);
  });

  test('die gemeldete Anzahl muss zur Liste passen', async () => {
    const { beanstanden } = await modul();
    const d = await bestand();
    const { beanstandungen } = beanstanden({ ...d, anzahl: { ...d.anzahl, gesamt: 99 } }, JETZT);
    expect(beanstandungen.join(' ')).toMatch(/passt nicht zu/);
  });
});

test.describe('Aktivitäten-Bestand: der leere Abruf überschreibt nichts', () => {
  test('0 Einträge über einen gefüllten Bestand werden verweigert', async () => {
    // Ein Abruf, der 200 liefert und nichts enthält, ist ein Quellenausfall.
    // Geschrieben sähe er auf der Seite aus wie „heute ist nichts los" — ein
    // leerer Bildschirm, den niemand als Fehler erkennt.
    const { schreibVerweigert, leererBestand } = await modul();
    const voll = await bestand();
    const grund = schreibVerweigert(leererBestand(), voll);
    expect(grund).toBeTruthy();
    expect(grund).toMatch(/Quellenausfall/);
  });

  test('aber der allererste Lauf darf schreiben', async () => {
    // Sonst käme der Bestand nie in Gang: über einer leeren Datei ist 0 der
    // richtige Wert, und über gar keiner erst recht.
    const { schreibVerweigert, leererBestand } = await modul();
    expect(schreibVerweigert(leererBestand(), null)).toBeNull();
    expect(schreibVerweigert(leererBestand(), leererBestand())).toBeNull();
    expect(schreibVerweigert(await bestand(), leererBestand())).toBeNull();
  });
});

test.describe('Aktivitäten-Bestand: das Skript wird auch gestartet', () => {
  test('die Tagesroutine ruft den Abruf und das Tor', async () => {
    // DER TEST, DER DIESE DATEI VOR DEM SCHICKSAL VON localize-demo-images.mjs
    // BEWAHRT. Jenes Skript ist fertig, richtig — und nie gelaufen, weil es
    // niemand aufruft. Ein Bestand, den keine Routine erneuert, ist nach zwei
    // Wochen eine Liste vergangener Spiele.
    const wf = fs.readFileSync(
      path.join(ROOT, '.github', 'workflows', 'tagesroutine.yml'), 'utf8');
    expect(wf, 'der Abruf läuft nirgends').toMatch(/scripts\/aktivitaeten\.mjs\s+--holen/);
    expect(wf, 'das Ergebnis wird nicht geprüft').toMatch(/scripts\/aktivitaeten\.mjs\s+--check/);
  });

  test('der PR-Check prüft den Bestand mit', async () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'pr-check.yml'), 'utf8');
    expect(wf).toMatch(/scripts\/aktivitaeten\.mjs\s+--check/);
  });

  test('der ausgelieferte Bestand ist da und formal in Ordnung', async () => {
    const { beanstanden } = await modul();
    const p = path.join(ROOT, 'assets', 'eb-aktivitaeten.json');
    expect(fs.existsSync(p), 'assets/eb-aktivitaeten.json fehlt').toBe(true);
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(beanstanden(d, JETZT).beanstandungen).toEqual([]);
  });
});
