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

/**
 * Die Overpass-Antworten sind seit der Mehrstadt-Umstellung nach Gebiet
 * geschlüsselt. Die Prüfungen unten fragen meist „steht dieser Fall
 * überhaupt im Prüfstück?" — dafür braucht es alle Elemente, egal aus
 * welcher Antwort.
 */
const ELEMENTE = (stadt) => (ROH.overpass[stadt]?.elements || []);
const ALLE_ELEMENTE = Object.values(ROH.overpass)
  .flatMap((a) => (Array.isArray(a?.elements) ? a.elements : []));

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

    // Zwei Kölner Heimspiele plus eines in Berlin — beide Gebiete sind
    // erfasst. Die Heimspiele in München und Stuttgart fallen weg, weil
    // für diese Städte keine Antwort vorlag (siehe eigener Test unten).
    expect(sport).toHaveLength(3);
    for (const e of sport) {
      expect(new Date(e.beginn).getTime()).toBeGreaterThan(JETZT.getTime());
      expect(e.gebiet, 'jedes Spiel gehört zu einem Gebiet').toBeTruthy();
      expect(d.gebiete.map((g) => g.stadt)).toContain(e.gebiet);
    }
    expect(sport.filter((e) => /^1\. FC Köln –/.test(e.titel))).toHaveLength(2);
  });

  test('ein Heimspiel ohne erfasstes Gebiet fällt weg', async () => {
    // Der Fall, der die Zuordnung trägt: OpenLigaDB liefert die ganze
    // Liga. Ohne `verein` je Gebiet stünde ein Spiel in Bremen als
    // Vorschlag da — irgendwo, für irgendwen.
    const d = await bestand();
    const bremen = ROH.openligadb.find((s) => /Werder Bremen/.test(s.team1?.teamName || ''));
    expect(bremen, 'kein Spiel ohne Gebiet im Prüfstück').toBeTruthy();
    expect(new Date(bremen.matchDateTimeUTC).getTime(),
      'das Spiel ist vergangen — dann bewiese sein Fehlen nichts').toBeGreaterThan(JETZT.getTime());
    expect(d.eintraege.map((e) => e.id)).not.toContain('openligadb:' + bremen.matchID);
  });

  test('ein geplantes Gebiet ohne Antwort ist NICHT erfasst', async () => {
    // Der Unterschied zwischen „wir wollen München erfassen" und „wir
    // haben München erfasst". Eine Absichtserklärung in `gebiete` wäre
    // wieder eine Entwarnung ohne Deckung.
    const { STAEDTE } = await modul();
    const d = await bestand();
    expect(STAEDTE.map((s) => s.stadt), 'München steht nicht mehr in der Städteliste')
      .toContain('München');
    expect(ROH.overpass['München'], 'das Prüfstück hätte sonst kein Subjekt').toBeUndefined();
    expect(d.gebiete.map((g) => g.stadt)).not.toContain('München');

    // Und die Gegenprobe am Spiel: das Heimspiel in München steht im
    // Prüfstück, ist künftig — und fällt trotzdem weg.
    const muc = ROH.openligadb.find((s) => /Bayern München/.test(s.team1?.teamName || ''));
    expect(muc && new Date(muc.matchDateTimeUTC) > JETZT).toBe(true);
    expect(d.eintraege.map((e) => e.id)).not.toContain('openligadb:' + muc.matchID);
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
    const fern = ELEMENTE('Köln').find((e) => e.tags?.name === 'Städel Museum');
    expect(fern, 'kein ferner Ort im Prüfstück — der Test hätte kein Subjekt').toBeTruthy();
    expect(entfernungKm(MITTE.lat, MITTE.lon, fern.lat, fern.lon)).toBeGreaterThan(UMKREIS_KM);

    // Er ist im Bestand — aber über die FRANKFURTER Antwort, wo er 0 km
    // entfernt ist. Aus Kölns Antwort ist er gefallen, und genau das misst
    // die Gebietszuordnung: derselbe Ort, zwei Entfernungen, eine richtig.
    const staedel = d.eintraege.find((e) => e.titel === 'Städel Museum');
    expect(staedel, 'der Ort ist ganz verschwunden').toBeTruthy();
    expect(staedel.gebiet, 'aus Kölns Antwort hätte er wegfallen müssen').toBe('Frankfurt');
    expect(staedel.entfernungKm).toBeLessThan(1);

    // Und die Gegenprobe: der Ort knapp innerhalb bleibt drin, sonst wäre
    // „alles wegwerfen" der bequemste Weg zu einem grünen Test.
    expect(namen).toContain('Kunstpalast');
    const nah = d.eintraege.find((e) => e.titel === 'Kunstpalast');
    expect(nah.entfernungKm).toBeLessThan(UMKREIS_KM);
  });

  test('derselbe Ort in zwei Antworten kommt einmal vor — beim näheren Gebiet', async () => {
    // Die Kreise überlappen: Köln und Düsseldorf liegen 35 km auseinander.
    // Ohne Entdoppelung bräche `bestandBauen` mit „doppelte Kennung" ab;
    // ohne die Wahl des NÄHEREN Gebiets entschiede die Reihenfolge der
    // Städteliste, welcher Stadt ein Ort zugeschlagen wird.
    const d = await bestand();
    const inKoeln = ELEMENTE('Köln').find((e) => e.tags?.name === 'Kunstpalast');
    const inDus = ELEMENTE('Düsseldorf').find((e) => e.tags?.name === 'Kunstpalast');
    expect(inKoeln && inDus, 'der Ort steht nicht in zwei Antworten — kein Subjekt').toBeTruthy();
    expect(inKoeln.id).toBe(inDus.id);

    const treffer = d.eintraege.filter((e) => e.titel === 'Kunstpalast');
    expect(treffer, 'der Ort steht doppelt im Bestand').toHaveLength(1);
    expect(treffer[0].gebiet, 'das fernere Gebiet hat gewonnen').toBe('Düsseldorf');
  });

  test('der Umkreis gilt je Gebiet, nicht für die ganze Datei', async () => {
    // Ein Kölner Kino in der BERLINER Antwort. Wer den Umkreis nur einmal
    // gegen die Mitte der Datei rechnet, lässt es durch — es liegt ja im
    // Kölner Kreis. Gemessen werden muss gegen das Gebiet der Antwort.
    const d = await bestand();
    const falsch = ELEMENTE('Berlin').find((e) => e.tags?.name === 'Falsch zugeordnet');
    expect(falsch, 'kein falsch einsortierter Ort im Prüfstück').toBeTruthy();
    expect(d.eintraege.map((e) => e.id)).not.toContain(`osm:node/${falsch.id}`);
  });

  test('Berlin ist erfasst und liefert eigene Einträge', async () => {
    // Der namengebende Fall: „wenn ich in Berlin bin, will ich in meinem
    // Umkreis sehen, was abgeht". Vor der Umstellung war hier nichts.
    const d = await bestand();
    expect(d.gebiete.map((g) => g.stadt)).toContain('Berlin');
    const berlin = d.eintraege.filter((e) => e.gebiet === 'Berlin');
    expect(berlin.length, 'Berlin ist erfasst, hat aber keine Einträge').toBeGreaterThan(2);
    expect(berlin.some((e) => e.art === 'sport'), 'kein Termin in Berlin').toBe(true);
    expect(berlin.some((e) => e.art === 'ort'), 'kein Ort in Berlin').toBe(true);
  });

  test('ein Weg trägt seine Koordinate in center, nicht oben', async () => {
    // OSM-Kinos und -Kletterhallen sind oft Gebäude (`way`), keine Punkte.
    // Wer nur `e.lat` liest, verliert sie stillschweigend — die Liste sieht
    // dann bloss kürzer aus, nicht falsch.
    const w = ALLE_ELEMENTE.find((e) => e.type === 'way');
    expect(w?.center, 'kein Weg mit center im Prüfstück').toBeTruthy();
    expect(w.lat, 'der Weg hätte auch oben eine Koordinate — Test wertlos').toBeUndefined();
    expect((await bestand()).eintraege.map((e) => e.titel)).toContain(w.tags.name);
  });

  test('ohne Namen kein Vorschlag, und eine Apotheke ist kein Erlebnis', async () => {
    const d = await bestand();
    const ohneName = ALLE_ELEMENTE.find((e) => e.tags && !e.tags.name);
    const falscheArt = ALLE_ELEMENTE.find((e) => e.tags?.amenity === 'pharmacy');
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
    const roh = ALLE_ELEMENTE.find((e) => (e.tags?.name || '').includes('<'));
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

  test('ein ausgefallenes Gebiet darf die Abdeckung nicht schrumpfen', async () => {
    // Overpass antwortet nicht immer. Fällt der Abruf für Berlin aus, wäre
    // die neue Datei für alle anderen Gebiete richtig — und für Berlin
    // hiesse sie ab sofort „noch nicht erfasst". Ein Besucher dort bekäme
    // die Auskunft, wir hätten nie hingesehen, weil ein fremder Server
    // eine Minute lang überlastet war.
    const { schreibVerweigert } = await modul();
    const voll = await bestand();
    expect(voll.gebiete.map((g) => g.stadt),
      'ohne Berlin im Bestand hätte der Test kein Subjekt').toContain('Berlin');

    const ohneBerlin = {
      ...voll,
      gebiete: voll.gebiete.filter((g) => g.stadt !== 'Berlin'),
      eintraege: voll.eintraege.filter((e) => e.gebiet !== 'Berlin'),
    };
    ohneBerlin.anzahl = { ...voll.anzahl, gesamt: ohneBerlin.eintraege.length };
    expect(ohneBerlin.anzahl.gesamt,
      'die Datei wäre leer — dann griffe schon die andere Regel').toBeGreaterThan(0);

    const grund = schreibVerweigert(ohneBerlin, voll);
    expect(grund, 'die geschrumpfte Abdeckung ging durch').toBeTruthy();
    expect(grund).toMatch(/Berlin/);
  });

  test('eine WACHSENDE Abdeckung darf schreiben', async () => {
    // Die Gegenprobe: ohne sie wäre „nie schreiben" der bequemste Weg zu
    // einem grünen Test, und der Bestand käme nie über sein erstes Gebiet
    // hinaus.
    const { schreibVerweigert } = await modul();
    const voll = await bestand();
    const nurKoeln = {
      ...voll,
      gebiete: voll.gebiete.filter((g) => g.stadt === 'Köln'),
      eintraege: voll.eintraege.filter((e) => e.gebiet === 'Köln'),
    };
    nurKoeln.anzahl = { ...voll.anzahl, gesamt: nurKoeln.eintraege.length };
    expect(schreibVerweigert(voll, nurKoeln)).toBeNull();
  });
});

test.describe('Aktivitäten-Bestand: die Abdeckung wird mitgeprüft', () => {
  test('Einträge ohne Gebietsliste werden beanstandet', async () => {
    // `gebiete` trägt den Satz „diese Gegend ist noch nicht erfasst".
    // Fehlt die Liste, kann die Ansicht erfasst und unerfasst nicht mehr
    // unterscheiden — und fällt auf genau die Auskunft zurück, die dieser
    // Umbau beseitigt hat.
    const { beanstanden } = await modul();
    const d = await bestand();
    const ohne = { ...d };
    delete ohne.gebiete;
    expect(beanstanden(ohne, JETZT).beanstandungen.join(' ')).toMatch(/gebiete fehlt/);
  });

  test('ein Eintrag in einem unerfassten Gebiet wird beanstandet', async () => {
    const { beanstanden } = await modul();
    const d = await bestand();
    const kaputt = {
      ...d,
      gebiete: d.gebiete.filter((g) => g.stadt !== 'Berlin'),
    };
    expect(beanstanden(kaputt, JETZT).beanstandungen.join(' '))
      .toMatch(/Gebiet „Berlin", das nicht erfasst ist/);
  });

  test('ein Gebiet ohne brauchbare Mitte wird beanstandet', async () => {
    const { beanstanden } = await modul();
    const d = await bestand();
    const kaputt = {
      ...d,
      gebiete: d.gebiete.map((g) => (g.stadt === 'Köln' ? { ...g, lat: null } : g)),
    };
    expect(beanstanden(kaputt, JETZT).beanstandungen.join(' '))
      .toMatch(/ohne brauchbare Mitte/);
  });

  test('der heile Bestand geht durch', async () => {
    // Die Gegenprobe zu den drei Mutationen darüber: ohne sie bestünde
    // die Prüfung auch, wenn sie alles beanstandete.
    const { beanstanden } = await modul();
    expect(beanstanden(await bestand(), JETZT).beanstandungen).toEqual([]);
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

/* ============================================================================
 * DER ABRUF: EIN VERSUCH JE STADT WAR EINER ZU WENIG
 *
 * Am 13.09.2026 an vier aufeinanderfolgenden Tagesständen gemessen — und die
 * Messung hat die Aufgabenstellung widerlegt, die als „München und Stuttgart
 * fehlen" in der Übergabe stand:
 *
 *   10.09.  6/8 — ohne Dortmund, Stuttgart
 *   11.09.  5/8 — ohne Dortmund, Berlin, Stuttgart
 *   12.09.  7/8 — ohne Berlin
 *   13.09.  6/8 — ohne München, Stuttgart
 *
 * An keinem Tag waren alle acht da, und welche fehlten, wechselte täglich.
 * Der Ausfall ist vorübergehend, nicht stadtspezifisch. Die Wirkung war
 * schlimmer als ein Loch: „Diese Gegend ist noch nicht erfasst" wanderte von
 * Tag zu Tag durch Deutschland.
 *
 * GEPRÜFT WIRD DAS VERHALTEN, NICHT DIE KONSTANTE. Ein Test auf
 * `ABRUF_VERSUCHE === 3` wäre grün, während die Schleife den Wert gar nicht
 * benutzt — dieselbe Klasse wie ein Prüfer ohne Subjekt. Deshalb zählt jeder
 * Test hier echte Aufrufe an einem gestellten `holer`.
 * ========================================================================= */
test.describe('Abruf: ein ausgefallenes Gebiet bekommt einen zweiten Anlauf', () => {
  const GEBIET = { stadt: 'Stuttgart', lat: 48.7758, lon: 9.1829, umkreisKm: 50 };

  /** Ein gestellter `fetch`, der eine vorgegebene Folge von Antworten liefert. */
  function holerMit(folge) {
    const rufe = [];
    const holer = async (url, opt) => {
      rufe.push({ url, opt });
      const a = folge[Math.min(rufe.length - 1, folge.length - 1)];
      if (a instanceof Error) throw a;
      return {
        ok: a.status >= 200 && a.status < 300,
        status: a.status,
        json: async () => a.body ?? { elements: [] },
      };
    };
    return { holer, rufe };
  }

  test('ein 429 wird wiederholt — und der zweite Anlauf zählt', async () => {
    // Der häufigste Fall: Overpass ist gerade voll. Beim ersten Mal abgewiesen,
    // beim zweiten Mal durch — genau dieser Unterschied entscheidet, ob eine
    // ganze Stadt einen Tag lang „nicht erfasst" heisst.
    const { overpassHolen } = await modul();
    const { holer, rufe } = holerMit([{ status: 429 }, { status: 200, body: { elements: [{ id: 1 }] } }]);
    const gewartet = [];
    const antwort = await overpassHolen(GEBIET, { holer, warten: async (ms) => gewartet.push(ms) });

    expect(antwort, 'die Antwort des zweiten Anlaufs kommt nicht durch')
      .toEqual({ elements: [{ id: 1 }] });
    expect(rufe.length, `nach einem 429 wurde ${rufe.length}-mal gefragt. Ein `
      + 'einziger Anlauf macht aus einer vorübergehenden Überlastung eine '
      + 'Aussage über die Gegend, die einen ganzen Tag gilt').toBe(2);
    expect(gewartet.length, 'vor dem zweiten Anlauf wurde nicht gewartet — '
      + 'sofort wieder anzuklopfen ist genau das, was den 429 ausgelöst hat')
      .toBe(1);
  });

  test('ein 400 wird NICHT wiederholt', async () => {
    // Das ist unsere Abfrage, nicht deren Last. Sie dreimal zu schicken wäre
    // dreimal derselbe Fehler — und dreimal dieselbe Last für einen Dienst,
    // der uns seine Rechenzeit schenkt.
    const { overpassHolen } = await modul();
    const { holer, rufe } = holerMit([{ status: 400 }]);
    await expect(overpassHolen(GEBIET, { holer, warten: async () => {} }))
      .rejects.toThrow(/400/);
    expect(rufe.length, `eine fehlerhafte Abfrage wurde ${rufe.length}-mal `
      + 'geschickt. Overpass ist gespendet, nicht gekauft').toBe(1);
  });

  test('bleibt es bei Ausfällen, bleibt das Gebiet ohne Antwort', async () => {
    // DIE REGEL DARF NICHT AUFWEICHEN. Wiederholen erhöht die Chance, es
    // ersetzt keine Antwort. Wer hier eine leere Liste zurückgibt statt zu
    // scheitern, macht aus „wir haben nicht hingesehen" ein „da ist nichts" —
    // und genau diese Verwechslung war der teuerste Fehler dieser Datei.
    const { overpassHolen } = await modul();
    const { holer, rufe } = holerMit([{ status: 504 }]);
    await expect(overpassHolen(GEBIET, { holer, warten: async () => {} }))
      .rejects.toThrow(/Stuttgart/);
    expect(rufe.length, 'die Anläufe wurden nicht ausgeschöpft').toBe(3);
  });

  test('ein Netzfehler zählt wie ein vorübergehender Ausfall', async () => {
    // Ein abgebrochener Aufruf ist kein Nein der Gegenseite, sondern gar keine
    // Antwort. Hier nicht zu wiederholen wäre strenger als bei einem 429 —
    // und der Fall ist dieselbe Sorte Zufall.
    const { overpassHolen } = await modul();
    const { holer, rufe } = holerMit([new Error('fetch failed'), { status: 200 }]);
    await overpassHolen(GEBIET, { holer, warten: async () => {} });
    expect(rufe.length, 'ein Netzfehler wurde nicht wiederholt').toBe(2);
  });

  test('jeder Aufruf trägt ein Zeitlimit', async () => {
    // Die Abfrage sagt Overpass `[out:json][timeout:90]` — das bindet den
    // Server, nicht uns. Ohne Limit HIER hält ein hängender Aufruf die ganze
    // Tagesroutine fest, ohne Fehlermeldung. Dieselbe Fehlerart hat am
    // 03.09.2026 den Deploy zweimal über sechs Minuten stehen lassen.
    const { overpassHolen } = await modul();
    const { holer, rufe } = holerMit([{ status: 200 }]);
    await overpassHolen(GEBIET, { holer, warten: async () => {} });
    expect(rufe[0].opt.signal, 'der Aufruf hat kein Abbruchsignal — ein Hänger '
      + 'läuft dann bis zum Job-Limit von GitHub').toBeTruthy();
  });

  test('das Budget nimmt keinem Gebiet den ERSTEN Anlauf', async () => {
    // Drei Anläufe × 120 s × acht Städte wären im schlimmsten Fall fast eine
    // Stunde — eine Behebung, die eine zweite Störung einbaut. Gekürzt werden
    // deshalb nur die Wiederholungen. Eine Stadt, die gar nicht mehr gefragt
    // wird, wäre wieder ein Loch, nur mit anderer Ursache.
    const { overpassHolen } = await modul();
    const { holer, rufe } = holerMit([{ status: 503 }]);
    await expect(overpassHolen(GEBIET, { holer, warten: async () => {}, frist: Date.now() - 1 }))
      .rejects.toThrow(/Stuttgart/);
    expect(rufe.length, 'bei aufgebrauchtem Budget wurde gar nicht mehr gefragt')
      .toBe(1);
  });

  test('die Pause wächst, sie bleibt nicht gleich', async () => {
    // Nach dem zweiten Fehlschlag länger zu warten ist der Unterschied
    // zwischen Nachfragen und Klopfen. Gemessen an den echten Wartezeiten,
    // nicht an der Konstante: eine Liste, die niemand benutzt, wäre grün.
    const { overpassHolen } = await modul();
    const { holer } = holerMit([{ status: 429 }]);
    const gewartet = [];
    await expect(overpassHolen(GEBIET, { holer, warten: async (ms) => gewartet.push(ms) }))
      .rejects.toThrow();
    expect(gewartet.length, 'es wurde nicht zwischen den Anläufen gewartet')
      .toBe(2);
    expect(gewartet[1], `gewartet wurde ${gewartet.join(' und ')} ms — die zweite `
      + 'Pause ist nicht länger als die erste').toBeGreaterThan(gewartet[0]);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   DIE ADRESSE DES BETREIBERS, NICHT DIE DER KARTE
   ══════════════════════════════════════════════════════════════════════

   Gemeldet am 15.09.2026: „das radar öffnet openstreetmap statt die
   website des externen betreibers". Gemessen: 800 von 954 Einträgen tragen
   als `quelle.url` die OSM-Objektseite — das ist der ODbL-Attributionslink
   und muss es bleiben. Als Ziel eines Klicks ist eine Kartenseite aber die
   falsche Auskunft: wer ein Kino antippt, will die Spielzeiten.

   OSM führt die Betreiberseite als `website` bzw. `contact:website`. Der
   Wert kommt von Fremden und landet in einem Link — deshalb nur https.
*/
test.describe('Aktivitäten: die Betreiberseite', () => {
  test('osmWebseite nimmt nur brauchbare https-Adressen', async () => {
    const m = await import('../../scripts/aktivitaeten.mjs');
    const faelle = [
      [{ website: 'https://kino.de' }, 'https://kino.de'],
      [{ 'contact:website': 'https://theater.de' }, 'https://theater.de'],
      [{ website: 'http://kino.de' }, ''],            // kein Klartext-HTTP
      [{ website: 'javascript:alert(1)' }, ''],       // hier wird aus Daten Code
      [{ website: '  ' }, ''],
      [{}, ''],
      [{ website: 'https://x' }, ''],                 // zu kurz, um echt zu sein
    ];
    for (const [tags, erwartet] of faelle) {
      expect(m.osmWebseite(tags), `${JSON.stringify(tags)}`).toBe(erwartet);
    }
  });

  test('der Bestand trägt die Betreiberseite — und die Quelle bleibt OSM', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const m = await import('../../scripts/aktivitaeten.mjs');
    const roh = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', 'fixtures', 'aktivitaeten-roh.json'), 'utf8'));
    const antworten = roh.overpass;
    const erst = Array.isArray(antworten) ? antworten[0]
      : (antworten && antworten.elements ? antworten : Object.values(antworten)[0]);
    const eintraege = m.ausOverpass(erst);

    const mit = eintraege.filter((x) => x.webseite);
    expect(mit.length, 'kein Eintrag trägt eine Betreiberseite — der Test misst nichts')
      .toBeGreaterThan(0);
    for (const e of mit) expect(e.webseite).toMatch(/^https:\/\//);

    // Die Attribution bleibt: sie ist Lizenzbedingung, nicht Zierrat.
    for (const e of eintraege) expect(e.quelle.url).toMatch(/openstreetmap\.org/);

    // Fehlt das Tag, fehlt das FELD — kein leerer String, der wie eine
    // Adresse aussieht und keine ist.
    const ohne = eintraege.filter((x) => !x.webseite);
    expect(ohne.every((x) => !('webseite' in x)),
      'ein Eintrag ohne Betreiberseite trägt ein leeres Feld').toBe(true);
  });
});
