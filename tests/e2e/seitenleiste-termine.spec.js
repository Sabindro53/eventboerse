// „Demnächst" in der Seitenleiste — echte Termine oder gar keine.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// `renderSidebarUpcoming()` lieferte bis zum 14.09.2026 eine fest
// verdrahtete Liste unter der Überschrift „Demnächst":
//
//   Rock Festival Berlin  · 12. Sep 2026
//   Hochzeitsmesse Köln   · 20. Sep 2026
//   Oktoberfest Opening   · 19. Okt 2026
//
// Am 14.09.2026 gemessen: die Funktion wird bei jedem Feed-Rendern
// gerufen, `#sidebarUpcoming` steht in der Shell — und der erste Eintrag
// lag bereits in der VERGANGENHEIT. Eine Liste, die mit der Zeit unwahr
// wird, ohne dass jemand etwas ändert: dieselbe Klasse wie ein Prüfer,
// der nicht mehr prüft, nur an der Oberfläche und mit Datum.
//
// Der Bestand für echte Termine lag längst daneben
// (`assets/eb-aktivitaeten.json`, 954 Einträge, täglich erneuert).
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { ohneJsKommentare } = require('./lib/js-code');
const { warteAufAppBereit } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const MODULE = path.join(WURZEL, 'js', 'modules');

const KOELN = { stadt: 'Köln', lat: 50.9413, lon: 6.9583, umkreisKm: 50 };

function termin(titel, beginn) {
  return {
    id: 'test:' + titel.replace(/\W+/g, '-'),
    art: 'kultur',
    titel: titel,
    beginn: beginn,
    gebiet: 'Köln',
    ort: { name: 'Halle', stadt: 'Köln', lat: 50.94, lon: 6.96, ungefaehr: false },
    quelle: { name: 'Prüfstück', url: 'https://example.org/', lizenz: 'Test' },
    partner: false,
  };
}

function bestand(eintraege, felder) {
  return Object.assign({
    stand: '2026-09-14T00:00:00.000Z',
    mitte: { stadt: 'Köln', lat: KOELN.lat, lon: KOELN.lon },
    umkreisKm: 50,
    gebiete: [KOELN],
    eintraege: eintraege || [],
  }, felder || {});
}

/** Öffnet den Feed mit einem gestellten Bestand (oder einer Störung). */
async function feedMit(page, antwort) {
  await page.route('**/assets/eb-aktivitaeten.json*', (route) => {
    if (antwort === 'fehler') return route.fulfill({ status: 500, body: 'nein' });
    return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(antwort),
    });
  });
  await page.goto('/');
  await warteAufAppBereit(page);
  await page.evaluate(() => { try { localStorage.removeItem('eb_radar_pos_v1'); } catch (e) {} });
  await page.evaluate(() => navigateTo('aktuelles'));
  await page.locator('#sidebarUpcoming').waitFor({ state: 'attached', timeout: 10000 });
  // Der Bestand wird nachgeladen; die Karte zeichnet sich danach selbst neu.
  await expect(page.locator('#sidebarUpcoming')).not.toContainText('werden geladen', { timeout: 10000 });
}

function seitenleiste(page) {
  return page.locator('#sidebarUpcoming');
}

function jsModule() {
  const aus = [];
  const gehe = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) gehe(p);
      else if (e.name.endsWith('.js')) aus.push(p);
    }
  };
  gehe(MODULE);
  return aus;
}

test.describe('Demnächst: echte Termine oder gar keine', () => {
  test('die drei erfundenen Termine sind aus dem Code verschwunden', () => {
    // GEMESSEN NACH ABZUG DER KOMMENTARE: der Befund steht als Erklärung
    // über der neuen Funktion und nennt alle drei Namen. Ohne das
    // Abziehen fände dieser Test seinen eigenen Kommentar — zum sechsten
    // Mal dieselbe Ursache an einem Tag.
    const erfunden = ['Rock Festival Berlin', 'Hochzeitsmesse Köln', 'Oktoberfest Opening'];
    const funde = [];
    for (const datei of jsModule()) {
      const quelle = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      for (const name of erfunden) {
        if (quelle.includes(name)) funde.push(path.relative(WURZEL, datei) + ': ' + name);
      }
    }
    expect(funde, `erfundene Termine im ausgelieferten Code:\n${funde.join('\n')}`)
      .toEqual([]);
  });

  test('genau EINE Definition', () => {
    // `app.js` ist eine Verkettung: bei zwei gleichnamigen Funktionen
    // gewinnt die spätere. Bliebe die alte stehen, wäre die neue tot —
    // genau so waren hier schon `renderFeed()` und `switchFeedTab()` tot.
    let n = 0;
    for (const datei of jsModule()) {
      const quelle = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      n += (quelle.match(/function\s+renderSidebarUpcoming\s*\(/g) || []).length;
    }
    expect(n, `renderSidebarUpcoming ist ${n}-mal definiert`).toBe(1);
  });

  test('ein echter Termin erscheint', async ({ page }) => {
    const morgen = new Date(Date.now() + 36e5 * 30).toISOString();
    await feedMit(page, bestand([termin('Nachtflohmarkt am Rhein', morgen)]));
    await expect(seitenleiste(page), 'der Termin aus dem Bestand steht nicht da')
      .toContainText('Nachtflohmarkt am Rhein');
  });

  test('ein vergangener Termin erscheint NICHT', async ({ page }) => {
    // Der eigentliche Befund. „12. Sep 2026" stand am 14.09. immer noch
    // unter „Demnächst".
    const gestern = new Date(Date.now() - 36e5 * 30).toISOString();
    const morgen = new Date(Date.now() + 36e5 * 30).toISOString();
    await feedMit(page, bestand([
      termin('Laengst vorbei', gestern),
      termin('Kommt noch', morgen),
    ]));
    await expect(seitenleiste(page)).toContainText('Kommt noch');
    await expect(seitenleiste(page), 'ein Termin von gestern steht unter „Demnächst"')
      .not.toContainText('Laengst vorbei');
  });

  test('höchstens drei — die Karte ist schmal', async ({ page }) => {
    const liste = [];
    for (let i = 1; i <= 6; i++) {
      liste.push(termin('Termin Nummer ' + i, new Date(Date.now() + 36e5 * 24 * i).toISOString()));
    }
    await feedMit(page, bestand(liste));
    const zeilen = await page.locator('#sidebarUpcoming .sidebar-event-item').count();
    expect(zeilen, 'die Seitenleiste zeigt mehr als drei Termine').toBe(3);
  });

  test('die leeren Fälle sagen VERSCHIEDENES', async ({ page }) => {
    // Drei Zustände, drei Aussagen — dieselbe Regel wie in der
    // Jetzt-Ansicht. Wer sie zusammenzieht, macht die Sorgfalt des
    // Bestands wieder unsichtbar: „nichts eingetragen" behauptet, wir
    // hätten nachgesehen.
    await feedMit(page, 'fehler');
    const stoerung = (await seitenleiste(page).textContent()).trim();

    await page.unroute('**/assets/eb-aktivitaeten.json*');
    await feedMit(page, bestand([], { stand: null }));
    const nichtAbgerufen = (await seitenleiste(page).textContent()).trim();

    await page.unroute('**/assets/eb-aktivitaeten.json*');
    await feedMit(page, bestand([]));
    const leer = (await seitenleiste(page).textContent()).trim();

    for (const t of [stoerung, nichtAbgerufen, leer]) expect(t.length).toBeGreaterThan(5);
    expect(new Set([stoerung, nichtAbgerufen, leer]).size,
      `die drei leeren Fälle sagen dasselbe:\n· ${stoerung}\n· ${nichtAbgerufen}\n· ${leer}`)
      .toBe(3);
  });

  test('die Seitenleiste STEUERT den Radar nicht', async ({ page }) => {
    // ── WARUM DIESE ZUSICHERUNG ENTSTAND ───────────────────────────────
    //
    // Der erste Entwurf rief `radarPositionSetzen()`, wenn noch keine
    // Position bekannt war — abgeschrieben aus `renderFeedJetzt()`, wo es
    // richtig ist. `renderFeed()` ruft diese Karte aber VOR der
    // Radar-Ansicht, und der Radar ist geteilter Zustand.
    //
    // Gemeldet hat es ein FREMDER Test: „Marker-Popups bleiben im Dark
    // Mode deutlich lesbar" fiel in zwei von drei Läufen aus, weil
    // `feedRadarFocus(0)` danach auf einen anderen Marker zielte. Auf
    // `main` lief derselbe Test dreimal grün — die Nebenwirkung war
    // meine. Als Flackern eines fremden Tests ist so etwas die
    // unauffälligste Sorte Schaden.
    const morgen = new Date(Date.now() + 36e5 * 30).toISOString();
    await page.route('**/assets/eb-aktivitaeten.json*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(bestand([termin('Irgendwas', morgen)])),
    }));
    await page.goto('/');
    await warteAufAppBereit(page);

    const ergebnis = await page.evaluate(async () => {
      try { localStorage.removeItem('eb_radar_pos_v1'); } catch (e) {}
      await new Promise((fertig) => ebAktivitaetenLaden(fertig));
      const vorher = JSON.stringify(radarStand());
      renderSidebarUpcoming();
      return { vorher: vorher, nachher: JSON.stringify(radarStand()) };
    });
    expect(ergebnis.nachher, 'die Seitenleiste hat den Radar-Zustand verändert — '
      + 'sie verschiebt damit die Karte einer anderen Ansicht')
      .toBe(ergebnis.vorher);
  });

  test('fremder Text kommt als TEXT an', async ({ page }) => {
    // Titel und Ortsnamen stammen aus fremden Quellen. Der Generator
    // maskiert, die Ansicht maskiert erneut — eine ausgelieferte Datei
    // kann veraltet oder verfälscht sein.
    const morgen = new Date(Date.now() + 36e5 * 30).toISOString();
    await feedMit(page, bestand([termin('<img src=x onerror=alert(1)>Fest', morgen)]));
    const treffer = await page.evaluate(() => ({
      bilder: document.querySelectorAll('#sidebarUpcoming img').length,
      text: document.getElementById('sidebarUpcoming').textContent,
    }));
    expect(treffer.bilder, 'fremder Text wurde als Markup eingesetzt').toBe(0);
    expect(treffer.text).toContain('<img src=x onerror=alert(1)>Fest');
  });
});
