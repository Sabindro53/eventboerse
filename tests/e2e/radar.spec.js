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

test.describe('Radar-Oberfläche', () => {
  /**
   * Karte öffnen und warten, BIS der Radar da ist — nicht 700 ms lang.
   *
   * radarBeimOeffnen() läuft 400 ms nach dem Öffnen (nach initLeafletMap).
   * Eine feste Wartezeit reicht unter Last nicht und macht den Test
   * launisch; genau das ist hier einmal passiert. Gewartet wird deshalb
   * auf den Zustand, nicht auf die Uhr.
   */
  async function karteOeffnen(page) {
    await page.evaluate(() => { if (typeof toggleMapOverlay === 'function') toggleMapOverlay(); });
    await page.waitForFunction(
      () => document.querySelectorAll('#radarRadien .radar-chip').length > 0,
      null, { timeout: 10000 });
  }

  test('beim Laden wird NICHT nach dem Standort gefragt', async ({ page }) => {
    // Eine Seite, die ungefragt den Standortdialog öffnet, verbrennt das
    // Vertrauen genau einmal. Gefragt wird nur auf Knopfdruck.
    let gefragt = false;
    await page.addInitScript(() => {
      window.__geoGefragt = false;
      const echt = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = function (...a) {
        window.__geoGefragt = true; return echt(...a);
      };
    });
    const errors = await openApp(page);
    await karteOeffnen(page);
    gefragt = await page.evaluate(() => window.__geoGefragt);
    expect(gefragt, 'Standort darf nicht ungefragt erfragt werden').toBe(false);
    expectNoPageErrors(errors, 'Kein Auto-Standort');
  });

  test('Leiste zeigt Radien und DACH-Städte', async ({ page }) => {
    const errors = await openApp(page);
    await karteOeffnen(page);
    const ui = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('#radarRadien .radar-chip')].map((b) => b.textContent),
      aktiv: document.querySelectorAll('#radarRadien .radar-chip.aktiv').length,
      staedte: document.getElementById('radarStadt').options.length,
      hatWien: [...document.getElementById('radarStadt').options].some((o) => o.value === 'Wien'),
    }));
    expect(ui.chips).toEqual(['10 km', '25 km', '50 km', '100 km', '250 km']);
    expect(ui.aktiv, 'genau ein Radius muss aktiv sein').toBe(1);
    expect(ui.staedte, 'Städte müssen befüllt sein').toBeGreaterThan(20);
    expect(ui.hatWien).toBe(true);
    expectNoPageErrors(errors, 'Radar-Leiste');
  });

  test('Stadtwahl füllt die Trefferliste, Radiuswechsel ändert sie', async ({ page }) => {
    const errors = await openApp(page);
    await karteOeffnen(page);
    const r = await page.evaluate(() => {
      radarStadtKlick('Potsdam');
      radarRadiusKlick(10);
      const eng = document.querySelectorAll('#mapLocationsList .radar-treffer').length;
      const engLeer = !!document.querySelector('#mapLocationsList .radar-leer');
      radarRadiusKlick(100);
      const weit = document.querySelectorAll('#mapLocationsList .radar-treffer').length;
      return { eng, engLeer, weit, hinweis: document.getElementById('radarHinweis').textContent };
    });
    // Potsdam→Berlin sind 27 km: bei 10 km leer, bei 100 km Treffer.
    expect(r.engLeer, 'bei 10 km um Potsdam darf nichts stehen').toBe(true);
    expect(r.weit, 'bei 100 km müssen Treffer erscheinen').toBeGreaterThan(0);
    expect(r.hinweis).toMatch(/im Umkreis von 100 km/);
    expectNoPageErrors(errors, 'Radiuswechsel');
  });

  test('der leere Fall bietet den nächstgrößeren Radius an', async ({ page }) => {
    // „Keine Treffer" ist eine Aussage über die Gegend, kein Fehler — und
    // der nächste Schritt soll nicht erraten werden müssen.
    const errors = await openApp(page);
    await karteOeffnen(page);
    const angebot = await page.evaluate(() => {
      radarStadtKlick('Potsdam');
      radarRadiusKlick(10);
      const b = document.querySelector('#mapLocationsList .radar-link');
      return b ? b.textContent : null;
    });
    expect(angebot, 'Erweiterung muss angeboten werden').toMatch(/25 km/);
    expectNoPageErrors(errors, 'Leerer Fall');
  });

  test('Standort entfernen räumt Liste und Karte', async ({ page }) => {
    const errors = await openApp(page);
    await karteOeffnen(page);
    const nachher = await page.evaluate(() => {
      radarStadtKlick('Berlin');
      radarVergessenKlick();
      return {
        text: document.getElementById('radarOrtText').textContent,
        entfernenVersteckt: document.getElementById('radarVergessenBtn').hidden,
        gemerkt: localStorage.getItem('eb_radar_ort'),
      };
    });
    expect(nachher.text).toBe('Standort freigeben');
    expect(nachher.entfernenVersteckt).toBe(true);
    expect(nachher.gemerkt).toBeNull();
    expectNoPageErrors(errors, 'Standort entfernen');
  });

  test('Treffer-IDs landen maskiert im Markup', async ({ page }) => {
    // Das onclick-Attribut ist mit " begrenzt; eine ID mit " bräche sonst aus.
    const errors = await openApp(page);
    await karteOeffnen(page);
    const roh = await page.evaluate(() => {
      radarStadtKlick('Berlin');
      radarRadiusKlick(250);
      return document.getElementById('mapLocationsList').innerHTML;
    });
    // Kein unmaskiertes Anführungszeichen innerhalb eines onclick-Werts.
    const onclicks = [...roh.matchAll(/onclick="([^"]*)"/g)].map((m) => m[1]);
    expect(onclicks.length, 'es müssen Treffer da sein').toBeGreaterThan(0);
    for (const c of onclicks) {
      expect(c, 'roher Anführungsstrich im onclick').not.toMatch(/(?<!&quot;)"/);
    }
    expectNoPageErrors(errors, 'ID-Maskierung');
  });
});

test.describe('Positionen sind echt, nicht gewürfelt', () => {
  const KARTE = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'modules', 'ui', '32-consent-init-map.js'), 'utf8');

  test('Marker werden nicht zufällig gestreut', () => {
    // Vorher: (Math.random() - 0.5) * 0.015 — ±0,8 km, NEU GEWÜRFELT bei
    // jedem Neuzeichnen. Dasselbe Inserat lag bei jedem Öffnen woanders.
    // Wer danach seine Anfahrt einschätzt, tut das auf Basis von Zufall.
    const block = KARTE.slice(KARTE.indexOf('function addListingMarkers'),
      KARTE.indexOf('function renderLocationsList'));
    expect(block, 'Zufallsstreuung darf nicht zurückkommen').not.toMatch(/Math\.random/);
    expect(block, 'echte Koordinaten werden nicht genutzt').toMatch(/listing\.koordinaten/);
  });

  test('dieselbe Position bei jedem Neuzeichnen', async ({ page }) => {
    // Die Eigenschaft, nicht die Schreibweise: zweimal rechnen muss
    // zweimal dasselbe ergeben.
    const errors = await openApp(page);
    const [a, b] = await page.evaluate(() => {
      const p = { lat: 52.52, lng: 13.405 };
      const km = () => radarUmkreis(p, 250).map((t) => t.km.toFixed(6)).join(',');
      return [km(), km()];
    });
    expect(a, 'Entfernungen müssen stabil sein').toBe(b);
    expect(a.length, 'es müssen Treffer da sein').toBeGreaterThan(0);
    expectNoPageErrors(errors, 'Stabile Positionen');
  });

  test('Stadtteil-Koordinaten schlagen den Stadtmittelpunkt', async ({ page }) => {
    // Ein Kreuzberger DJ ist von Potsdam näher als einer aus Prenzlauer Berg.
    // Mit Stadtmittelpunkten wären beide exakt gleich weit — genau die
    // Ungenauigkeit, die dieser Ausbau behebt.
    const errors = await openApp(page);
    const r = await page.evaluate(() => {
      const potsdam = { lat: 52.3906, lng: 13.0645 };
      const berliner = radarUmkreis(potsdam, 250).filter((t) => t.ort === 'Berlin');
      return {
        anzahl: berliner.length,
        verschieden: new Set(berliner.map((t) => t.km.toFixed(3))).size,
        alleGenau: berliner.every((t) => t.genau === true),
        stadtteile: berliner.map((t) => t.stadtteil).filter(Boolean).length,
      };
    });
    expect(r.anzahl, 'es müssen mehrere Berliner Einträge da sein').toBeGreaterThan(1);
    expect(r.verschieden, 'Einträge derselben Stadt müssen unterschiedlich weit sein')
      .toBeGreaterThan(1);
    expect(r.stadtteile, 'Stadtteile fehlen').toBeGreaterThan(0);
    expectNoPageErrors(errors, 'Stadtteil-Genauigkeit');
  });

  test('ohne Koordinaten wird die Ungenauigkeit benannt', async ({ page }) => {
    // Eine Entfernung ab Stadtmitte ist eine Schätzung. Sie darf nicht
    // aussehen wie eine Messung.
    const errors = await openApp(page);
    const r = await page.evaluate(() => {
      const ohne = radarPosition({ location: 'Bremen' });        // nur Stadt bekannt
      const mit  = radarPosition({ location: 'Berlin', koordinaten: [52.4987, 13.418] });
      return { ohneGenau: ohne.genau, mitGenau: mit.genau, unbekannt: radarPosition({ location: 'Atlantis' }) };
    });
    expect(r.ohneGenau, 'Stadtmitte ist nicht genau').toBe(false);
    expect(r.mitGenau, 'echte Koordinaten sind genau').toBe(true);
    expect(r.unbekannt, 'unbekannter Ort liefert keine Position').toBeNull();
    expectNoPageErrors(errors, 'Genauigkeitskennzeichnung');
  });
});
