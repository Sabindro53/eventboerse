// Event-Radar: „Was ist in meiner Nähe?"
//
// Die Teile gab es längst, nur unverbunden — haversineKm rechnete
// Entfernungen, die Karte setzte Marker auf Stadtkoordinaten, die
// Standortfreigabe sortierte den Feed. Was fehlte, war der Radius.
//
// Der wichtigste Teil hier sind nicht die Trefferlisten, sondern die
// Datenschutz-Zusicherungen: die Position darf den Browser nicht verlassen,
// und was gespeichert wird, darf nicht auf die Hausnummer zeigen.
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');
const fs = require('node:fs');
const path = require('node:path');

const MODUL = fs.readFileSync(
  path.join(__dirname, '..', '..', 'js', 'modules', 'search', '13-event-radar.js'), 'utf8');

test.describe('Radius statt Stadtgrenze', () => {
  test('der Umkreis überschreitet Stadtgrenzen', async ({ page }) => {
    // Der konkrete Mangel: wer in Potsdam wohnt, bekam nichts aus Berlin,
    // obwohl es 25 Minuten sind. Städtisches Bucketing kennt keine Nähe.
    const errors = await openApp(page);
    const ergebnis = await page.evaluate(() => {
      const potsdam = { lat: 52.3906, lng: 13.0645 };
      const eng  = radarUmkreis(potsdam, 10);
      const weit = radarUmkreis(potsdam, 50);
      return {
        eng: eng.length,
        weit: weit.length,
        berlinDrin: weit.some((t) => t.ort === 'Berlin'),
        // Sortierung: das Nächste zuerst, sonst ist der Radius wertlos.
        sortiert: weit.every((t, i) => i === 0 || weit[i - 1].km <= t.km),
      };
    });
    expect(ergebnis.berlinDrin, 'Berlin liegt 25 km von Potsdam und muss drin sein').toBe(true);
    expect(ergebnis.weit, '50 km müssen mehr liefern als 10 km').toBeGreaterThan(ergebnis.eng);
    expect(ergebnis.sortiert, 'Treffer müssen nach Entfernung sortiert sein').toBe(true);
    expectNoPageErrors(errors, 'Radar-Umkreis');
  });

  test('Dienstleister und Events liegen in einer Liste', async ({ page }) => {
    // Wer ein Fest plant, denkt nicht in „Inserate" und „Veranstaltungen",
    // sondern in „was gibt es hier".
    const errors = await openApp(page);
    const arten = await page.evaluate(() => {
      const treffer = radarUmkreis({ lat: 52.52, lng: 13.405 }, 250);
      return [...new Set(treffer.map((t) => t.art))].sort();
    });
    expect(arten, 'beide Arten müssen im Radar auftauchen').toEqual(['dienstleister', 'event']);
    expectNoPageErrors(errors, 'Radar-Arten');
  });

  test('leerer Umkreis liefert nichts statt irgendetwas', async ({ page }) => {
    // Mitten in der Nordsee darf kein Florist auftauchen. Ein Radar, das
    // immer etwas zeigt, ist kein Radar.
    const errors = await openApp(page);
    const leer = await page.evaluate(() => radarUmkreis({ lat: 56.0, lng: 3.0 }, 25).length);
    expect(leer, 'ohne Nachbarschaft muss die Liste leer bleiben').toBe(0);
    expectNoPageErrors(errors, 'Radar leer');
  });

  test('DACH ist abgedeckt, nicht nur Deutschland', async ({ page }) => {
    const errors = await openApp(page);
    const orte = await page.evaluate(() => Object.keys(RADAR_ORTE));
    for (const stadt of ['Wien', 'Zürich', 'Salzburg', 'Bern', 'Graz']) {
      expect(orte, `${stadt} fehlt im Radar`).toContain(stadt);
    }
    expectNoPageErrors(errors, 'DACH-Abdeckung');
  });

  test('Entfernungen werden nicht genauer angegeben als sie sind', async ({ page }) => {
    // Die Datenbasis sind Stadtkoordinaten. „12,4 km" wäre eine Genauigkeit,
    // die diese Daten nicht hergeben.
    const errors = await openApp(page);
    const texte = await page.evaluate(() => [radarEntfernung(0.4), radarEntfernung(12.37), radarEntfernung(99.6)]);
    expect(texte[0]).toBe('unter 1 km');
    expect(texte[1]).toBe('12 km');
    expect(texte[2]).toBe('100 km');
    expectNoPageErrors(errors, 'Entfernungstext');
  });
});

test.describe('Der Standort bleibt im Browser', () => {
  test('keine Koordinaten in irgendeinem Server-Request', async ({ page }) => {
    // Dieselbe Regel wie bei Suchbegriffen. Sie ist auch der Grund, warum
    // das Radar ohne eine einzige neue Server-Route auskommt.
    const ausgehend = [];
    page.on('request', (req) => {
      const u = req.url();
      if (!u.startsWith('http://127.0.0.1')) return;
      ausgehend.push(u + ' ' + (req.postData() || ''));
    });
    const errors = await openApp(page);
    await page.evaluate(() => {
      radarStadtWaehlen('München');
      radarUmkreis(radarStand().pos, 50);
    });
    await page.waitForTimeout(600);
    // 48.1351 / 11.5820 — München. Nichts davon darf hinausgehen.
    const lecks = ausgehend.filter((u) => /48\.13|11\.58|lat=|lng=|latitude|longitude/i.test(u));
    expect(lecks, 'Koordinaten dürfen den Browser nicht verlassen').toEqual([]);
    expectNoPageErrors(errors, 'Standort-Lokalität');
  });

  test('gespeichert wird nur grob', async ({ page }) => {
    // Zwei Nachkommastellen sind ~1,1 km. Ein geteiltes oder verlorenes
    // Gerät soll nicht die Hausnummer des letzten Nutzers verraten.
    const errors = await openApp(page);
    const gespeichert = await page.evaluate(() => {
      // Eine absichtlich sehr genaue Position setzen.
      _radarPos = { lat: 52.5200123, lng: 13.4050987 };
      _radarMerken(_radarPos, 'geo');
      return JSON.parse(localStorage.getItem('eb_radar_ort'));
    });
    expect(String(gespeichert.lat), 'Breitengrad zu genau gespeichert').toMatch(/^\d+\.\d{1,2}$/);
    expect(String(gespeichert.lng), 'Längengrad zu genau gespeichert').toMatch(/^\d+\.\d{1,2}$/);
    expectNoPageErrors(errors, 'Grobspeicherung');
  });

  test('der Standort lässt sich wieder entfernen', async ({ page }) => {
    // Eine Freigabe, die man nicht zurücknehmen kann, ist keine Freigabe.
    const errors = await openApp(page);
    const nachher = await page.evaluate(() => {
      radarStadtWaehlen('Hamburg');
      radarVergessen();
      return { pos: radarStand().pos, gemerkt: localStorage.getItem('eb_radar_ort') };
    });
    expect(nachher.pos, 'Position muss weg sein').toBeNull();
    expect(nachher.gemerkt, 'gemerkter Ort muss weg sein').toBeNull();
    expectNoPageErrors(errors, 'Standort vergessen');
  });

  test('kein Standortdienst eines Dritten', () => {
    // Eine IP-Ortung müsste die Adresse des Nutzers an einen Fremden geben,
    // um eine Stadt zurückzubekommen. Stadtwahl ist ehrlicher und genauer.
    expect(MODUL, 'IP-Ortung über Dritte').not.toMatch(
      /ipapi|ip-api|ipinfo|geoip|freegeoip|ipgeolocation/i);
    // Und die Abfrage darf nur auf Handlung erfolgen, nie beim Laden.
    expect(MODUL).toMatch(/function radarStandortErfragen/);
    expect(MODUL, 'Standort darf nicht beim Laden erfragt werden')
      .not.toMatch(/DOMContentLoaded[\s\S]{0,200}getCurrentPosition/);
  });

  test('ohne Freigabe bleibt die Stadtwahl gleichwertig', async ({ page }) => {
    const errors = await openApp(page);
    const pos = await page.evaluate(() => radarStadtWaehlen('Wien'));
    expect(pos, 'Stadtwahl muss eine Position liefern').not.toBeNull();
    expect(Math.round(pos.lat), 'Wien liegt bei 48°').toBe(48);
    expectNoPageErrors(errors, 'Stadtwahl');
  });
});
