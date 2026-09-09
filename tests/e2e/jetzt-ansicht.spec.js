// „Was kannst du gerade machen?" — die Ansicht zum Aktivitäten-Bestand
//
// Der Bestand (scripts/aktivitaeten.mjs) unterscheidet sorgfältig zwischen
// „nie abgerufen" und „abgerufen und nichts gefunden". Diese Unterscheidung
// ist WERTLOS, wenn die Ansicht beides als leere Liste zeigt — dann steht der
// Besucher wieder vor einem leeren Bildschirm und kann nicht erkennen, ob die
// Seite kaputt ist oder die Gegend still.
//
// Deshalb ist der Kern dieser Suite: DREI leere Zustände, DREI verschiedene
// Meldungen. Ein Test, der nur „irgendein Text erscheint" prüft, ginge an
// genau der Eigenschaft vorbei, die hier Arbeit gekostet hat.
//
// Gemessen wird an gestellten Antworten (`page.route`), nicht an der
// ausgelieferten Datei: die ist heute leer, und ein Test, der nur den einen
// Zustand sehen kann, der zufällig gerade herrscht, prüft die anderen nie.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const MUSTER = '**/assets/eb-aktivitaeten.json';

/** Köln, Dom — dieselbe Mitte wie im Generator. */
const KOELN = { stadt: 'Köln', lat: 50.9413, lon: 6.9583 };

/** Weit in der Zukunft, damit das Prüfstück nicht mit der Zeit verdirbt. */
const KUENFTIG = new Date(Date.now() + 7 * 86400000).toISOString();
const VERGANGEN = new Date(Date.now() - 7 * 86400000).toISOString();

const QUELLE_OSM = {
  name: 'OpenStreetMap',
  url: 'https://www.openstreetmap.org/node/1',
  lizenz: 'ODbL — © OpenStreetMap-Mitwirkende',
};

function bestand(eintraege, stand) {
  return {
    version: 1,
    stand: stand === undefined ? new Date().toISOString() : stand,
    mitte: KOELN,
    umkreisKm: 50,
    quellen: [
      { name: 'OpenLigaDB', lizenz: 'frei (openligadb.de)', url: 'https://www.openligadb.de/' },
      { name: 'OpenStreetMap', lizenz: 'ODbL — © OpenStreetMap-Mitwirkende', url: 'https://www.openstreetmap.org/copyright' },
    ],
    anzahl: { gesamt: eintraege.length, sport: 0, orte: eintraege.length },
    eintraege: eintraege,
  };
}

const ORT_NAH = {
  id: 'osm:node/1', art: 'ort', titel: 'Cinedom', kategorie: 'Kino', beginn: null,
  ort: { name: 'Cinedom', stadt: 'Köln', lat: 50.9489, lon: 6.9331 },
  entfernungKm: 2, quelle: QUELLE_OSM, partner: false,
};
const SPIEL_KUENFTIG = {
  id: 'openligadb:1', art: 'sport', titel: '1. FC Köln – FC Bayern München',
  beginn: KUENFTIG,
  ort: { name: 'RheinEnergieSTADION', stadt: 'Köln', lat: null, lon: null },
  quelle: { name: 'OpenLigaDB', url: 'https://www.openligadb.de/', lizenz: 'frei (openligadb.de)' },
  partner: false,
};

/** Die Seite öffnen, den Bestand stellen und den Reiter „Jetzt" wählen. */
async function jetztOeffnen(page, antwort) {
  await page.route(MUSTER, (route) => {
    if (antwort === null) return route.fulfill({ status: 404, body: 'weg' });
    return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(antwort),
    });
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('eb_cookie_consent', JSON.stringify({
        essential: true, functional: true, ts: Date.now(),
      }));
      // Ohne gemerkten Ort fällt die Ansicht auf Köln zurück — genau das
      // wollen wir hier messen, also den Speicher sauber halten.
      localStorage.removeItem('eb_radar_ort');
    } catch (e) {}
    window.EB_HIDE_DEMO = false;
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.navigateTo === 'function', null, { timeout: 15000 });
  await page.evaluate(() => navigateTo('aktuelles', 'jetzt'));
  // Der Bestand wird asynchron geholt und zeichnet danach neu.
  await page.waitForFunction(
    () => !/wird geladen/.test(document.getElementById('feedList').textContent),
    null, { timeout: 10000 });
  return page.locator('#feedList');
}

test.describe('Jetzt-Ansicht: drei leere Zustände, drei Aussagen', () => {
  test('nie abgerufen ist nicht dasselbe wie nichts gefunden', async ({ page }) => {
    const liste = await jetztOeffnen(page, bestand([], null));
    await expect(liste).toContainText('Noch nichts abgerufen');
    // Und ausdrücklich NICHT die Aussage über die Gegend.
    await expect(liste).not.toContainText('ist gerade nichts eingetragen');
  });

  test('abgerufen und nichts im Umkreis ist eine Aussage über die Gegend', async ({ page }) => {
    // Ein Eintrag in Hamburg — abgerufen, aber weit weg.
    const fern = Object.assign({}, ORT_NAH, {
      id: 'osm:node/9', titel: 'Elbphilharmonie',
      ort: { name: 'Elbphilharmonie', stadt: 'Hamburg', lat: 53.5413, lon: 9.9843 },
    });
    const liste = await jetztOeffnen(page, bestand([fern]));
    await expect(liste).toContainText('ist gerade nichts eingetragen');
    await expect(liste).toContainText('kein Fehler');
    await expect(liste).not.toContainText('Noch nichts abgerufen');
    await expect(liste).not.toContainText('konnte nicht geladen werden');
  });

  test('ein Ladefehler wird als Störung benannt, nicht als Leere', async ({ page }) => {
    const liste = await jetztOeffnen(page, null);
    await expect(liste).toContainText('konnte nicht geladen werden');
    await expect(liste).toContainText('Störung bei uns');
    await expect(liste).not.toContainText('Noch nichts abgerufen');
    await expect(liste).not.toContainText('ist gerade nichts eingetragen');
  });

  test('die drei Meldungen sind wirklich verschieden', async ({ page }) => {
    // Die Gegenprobe zur ganzen Suite: wer die drei Texte zusammenlegt,
    // besteht die Einzeltests oben weiterhin, sobald einer den anderen
    // enthält. Hier wird die Verschiedenheit selbst gemessen.
    const texte = [];
    for (const fall of [bestand([], null), bestand([]), null]) {
      const liste = await jetztOeffnen(page, fall);
      texte.push((await liste.innerText()).replace(/\s+/g, ' ').trim());
      await page.unrouteAll();
    }
    expect(texte.filter(Boolean)).toHaveLength(3);
    expect(new Set(texte).size, 'zwei leere Zustände sagen dasselbe').toBe(3);
  });
});

test.describe('Jetzt-Ansicht: was sie zeigt', () => {
  test('Termine und Orte stehen getrennt, Termine zuerst', async ({ page }) => {
    const liste = await jetztOeffnen(page, bestand([ORT_NAH, SPIEL_KUENFTIG]));
    await expect(liste).toContainText('Demnächst');
    await expect(liste).toContainText('Jederzeit');
    await expect(liste).toContainText('1. FC Köln');
    await expect(liste).toContainText('Cinedom');

    // GEMESSEN WIRD `textContent`, NICHT `innerText`. Die Überschriften
    // stehen auf `text-transform: uppercase`; `innerText` liefert den
    // GERENDERTEN Text („DEMNÄCHST") und fände „Demnächst" nie — ein Test,
    // der an der Gestaltung scheitert statt an der Reihenfolge.
    const text = await liste.evaluate((el) => el.textContent);
    expect(text.indexOf('Demnächst'), 'die Überschrift fehlt ganz').toBeGreaterThan(-1);
    expect(text.indexOf('Demnächst'), 'Termine gehören vor die Orte')
      .toBeLessThan(text.indexOf('Jederzeit'));
  });

  test('ein vergangener Termin wird nicht mehr angeboten', async ({ page }) => {
    // Das Prüftor des Generators lässt einen alten Abruf durch — er entsteht
    // durch eine ausgefallene Tagesroutine, nicht durch einen Commit. Die
    // ANSICHT darf ihn trotzdem nicht zeigen: ein Spiel von gestern als
    // „was ist jetzt los" ist schlimmer als eine kurze Liste.
    const alt = Object.assign({}, SPIEL_KUENFTIG, { id: 'openligadb:2', beginn: VERGANGEN });
    const liste = await jetztOeffnen(page, bestand([ORT_NAH, alt]));
    await expect(liste).toContainText('Cinedom');
    await expect(liste, 'ein vergangenes Spiel steht noch in der Liste')
      .not.toContainText('Demnächst');
  });

  test('ein Ort ohne eigene Koordinate wird als Schätzung gekennzeichnet', async ({ page }) => {
    // Das Stadion hat keine Koordinaten; gerechnet wird ab Stadtmitte. Das
    // so darzustellen wie eine Messung wäre dieselbe Sorte Behauptung wie
    // ein Katalog, der Verbindungszustand vortäuscht.
    const liste = await jetztOeffnen(page, bestand([SPIEL_KUENFTIG]));
    await expect(liste).toContainText('ab Stadtmitte');
    // Gegenprobe: der Eintrag MIT Koordinaten trägt den Zusatz nicht.
    await page.unrouteAll();
    const zwei = await jetztOeffnen(page, bestand([ORT_NAH]));
    await expect(zwei).not.toContainText('ab Stadtmitte');
  });

  test('jeder Eintrag nennt seine Quelle, und die Lizenz steht immer da', async ({ page }) => {
    // Bei ODbL ist die Namensnennung Lizenzbedingung, keine Höflichkeit.
    const liste = await jetztOeffnen(page, bestand([ORT_NAH]));
    await expect(liste.locator('.akt-quelle')).toHaveCount(1);
    await expect(liste).toContainText('OpenStreetMap-Mitwirkende');

    // Auch im leeren Fall — dort will jemand gerade wissen, woher die Liste
    // käme, wenn sie eine hätte.
    await page.unrouteAll();
    const leer = await jetztOeffnen(page, bestand([]));
    await expect(leer).toContainText('OpenStreetMap-Mitwirkende');
  });

  test('der Umkreis lässt sich erweitern und die Liste folgt', async ({ page }) => {
    // Bonn ist ~27 km entfernt: bei 10 km draußen, bei 50 km drin.
    const bonn = Object.assign({}, ORT_NAH, {
      id: 'osm:node/7', titel: 'Haus der Geschichte',
      ort: { name: 'Haus der Geschichte', stadt: 'Bonn', lat: 50.7180, lon: 7.1200 },
    });
    const liste = await jetztOeffnen(page, bestand([bonn]));
    await expect(liste).toContainText('Haus der Geschichte');

    await page.evaluate(() => feedJetztRadius(10));
    await expect(liste).not.toContainText('Haus der Geschichte');
    await expect(liste).toContainText('Im Umkreis von 10 km');

    await page.evaluate(() => feedJetztRadius(50));
    await expect(liste).toContainText('Haus der Geschichte');
  });
});

test.describe('Jetzt-Ansicht: fremder Text bleibt Text', () => {
  test('Markup in einem Titel wird nicht zu Markup', async ({ page }) => {
    // Der Generator entschärft bereits. Hier wird die zweite Schicht
    // gemessen: eine ausgelieferte Datei kann veraltet oder verfälscht sein,
    // und die Ansicht ist die Stelle, an der das gefährlich würde.
    const boese = Object.assign({}, ORT_NAH, {
      titel: 'Kino <img src=x onerror=window.__geknackt=1>',
      ort: { name: '<b>fett</b>', stadt: 'Köln', lat: 50.9489, lon: 6.9331 },
    });
    const liste = await jetztOeffnen(page, bestand([boese]));
    await expect(liste).toContainText('Kino');
    expect(await liste.locator('img').count(), 'das Markup wurde ausgeführt').toBe(0);
    expect(await liste.locator('b').count()).toBe(0);
    expect(await page.evaluate(() => window.__geknackt)).toBeUndefined();
  });

  test('eine Quell-Adresse wird nur als https verlinkt', async ({ page }) => {
    // `javascript:` in einem href ist der klassische Weg, aus Daten Code zu
    // machen. Ein Link ist genau die Stelle, an der das ausgeführt würde.
    const boese = Object.assign({}, ORT_NAH, {
      quelle: { name: 'Angeblich OSM', url: 'javascript:window.__geknackt=1', lizenz: 'ODbL' },
    });
    const liste = await jetztOeffnen(page, bestand([boese]));
    await expect(liste).toContainText('Angeblich OSM');
    expect(await liste.locator('a.akt-quelle').count(),
      'eine javascript:-Adresse wurde verlinkt').toBe(0);
    // Gegenprobe: eine echte https-Quelle WIRD verlinkt — sonst wäre
    // „nie verlinken" der bequemste Weg zu einem grünen Test.
    await page.unrouteAll();
    const gut = await jetztOeffnen(page, bestand([ORT_NAH]));
    expect(await gut.locator('a.akt-quelle').count()).toBe(1);
    await expect(gut.locator('a.akt-quelle')).toHaveAttribute('rel', /noopener/);
  });
});

test.describe('Jetzt-Ansicht: der Weg dorthin', () => {
  test('beide Reiterleisten führen zu „Jetzt"', async ({ page }) => {
    // Genau hier lag der Radar-Fehler vom 31.08.: der Reiter stand nur in
    // einer der zwei Leisten, und von „Entdecken" aus war er unerreichbar.
    const shell = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');
    const leisten = shell.split('feed-tabs').length - 1;
    expect(leisten, 'die Reiterleisten sind nicht mehr auffindbar').toBeGreaterThan(1);
    expect((shell.match(/feed-tab-jetzt/g) || []).length,
      '„Jetzt" fehlt in einer der Leisten').toBeGreaterThanOrEqual(2);
  });

  test('/aktuelles/jetzt zeigt auch wirklich die Jetzt-Ansicht', async ({ page }) => {
    // MARKIERUNG UND INHALT MÜSSEN ÜBEREINSTIMMEN. Der erste Entwurf dieses
    // Tests prüfte nur URL und Reiter-Markierung — beide werden vom Router
    // gesetzt, nicht von der Ansicht. Nimmt man `renderFeed()` die Weiche
    // auf 'jetzt', bleibt der Reiter markiert, darunter erscheinen die
    // Inserate von „Für dich", und der Test war grün.
    //
    // Das ist genau der Fehler vom 31.08.2026, nur eine Ebene höher: es
    // sieht nicht nach einem Fehler aus, sondern nach einer Seite, die
    // einen nicht versteht.
    const liste = await jetztOeffnen(page, bestand([ORT_NAH]));
    expect(await page.evaluate(() => location.pathname)).toContain('jetzt');
    const aktiv = await page.evaluate(
      () => !!document.querySelector('#page-aktuelles .feed-tab[data-feed="jetzt"].active'));
    expect(aktiv, 'der Reiter ist nicht markiert').toBe(true);
    // Und darunter steht die Ansicht, nicht irgendein anderer Kanal.
    await expect(liste.locator('.akt-karte-huelle'),
      'der Reiter ist markiert, darunter steht ein anderer Kanal').toHaveCount(1);
    await expect(liste).toContainText('Was kannst du gerade machen?');
  });

  test('die Ansicht wirft keine Fehler', async ({ page }) => {
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e)));
    await jetztOeffnen(page, bestand([ORT_NAH, SPIEL_KUENFTIG]));
    expect(fehler).toEqual([]);
  });
});
