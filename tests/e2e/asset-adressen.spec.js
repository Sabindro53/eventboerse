// Mitgelieferte Dateien müssen auf JEDER Route ankommen — auch auf Unterrouten.
//
// ── DER FEHLER, DEN DIESE SUITE FESTHÄLT ────────────────────────────────
//
// Drei Module bauten ihre Asset-Adresse selbst zusammen, jedes mit derselben
// Kopie: `document.querySelector('script[src*="app.js"]').src`, davon
// `/app.js…` abgeschnitten. Das ist auf Unterrouten falsch, und zwar still.
//
// `tag.src` ist eine AUFGELÖSTE Adresse — der Browser rechnet das Attribut
// bei jedem Zugriff gegen `document.baseURI`, und `history.pushState`
// verschiebt den. Derselbe Script-Tag liefert deshalb je nach Route etwas
// anderes:
//
//     auf „/"                → …/assets/eb-aktivitaeten.json
//     auf „/aktuelles/jetzt" → …/aktuelles/assets/eb-aktivitaeten.json → 404
//
// Betroffen waren die Wissensbasis des KI-Bots, der Demo-Feed und der
// Aktivitäten-Bestand. Live fiel es nicht auf, weil WordPress
// `eventboerseApi.themeUrl` setzt und die zuerst gefragt wird — getroffen war
// der RÜCKFALL, also die Dev-Shell, in der entwickelt und geprüft wird.
//
// ── WARUM HIER NICHTS ABGEFANGEN WIRD ───────────────────────────────────
//
// `jetzt-ansicht.spec.js` stellt die Antwort mit `page.route()` und einem
// `**/assets/…`-Muster. Genau dieses Muster trifft AUCH die falsche Adresse —
// die Tests waren grün, während die echte Anfrage im 404 landete. Ein
// gestellter Prüfstand kann eine kaputte Adresse nicht finden.
//
// Deshalb misst diese Suite den ECHTEN Abruf: keine Route, kein Prüfstück.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

/** Jede Datei, die der Browser aus dem Theme nachlädt. */
const DATEIEN = [
  'assets/eb-knowledge.json',
  'assets/eb-demo-feed.json',
  'assets/eb-aktivitaeten.json',
];

/** Routen mit Pfadsegment — dort und nur dort trat der Fehler auf. */
const ROUTEN = [
  ['aktuelles', 'jetzt'],
  ['aktuelles', 'radar'],
  ['browse', null],
];

test.describe('Asset-Adressen: routenfest', () => {
  test('die Basis verschiebt sich nicht mit der Route', async ({ page }) => {
    await openApp(page);
    const vorher = await page.evaluate(() => EB_THEME_BASIS);

    const besucht = [];
    for (const [seite, kanal] of ROUTEN) {
      await page.evaluate(([s, k]) => navigateTo(s, k), [seite, kanal]);
      await page.waitForTimeout(250);
      const pfad = await page.evaluate(() => location.pathname);
      besucht.push(pfad);
      const jetzt = await page.evaluate(() => EB_THEME_BASIS);
      expect(jetzt, `auf ${pfad} verschiebt sich die Basis`).toBe(vorher);
    }

    // GEGENPROBE: mindestens eine besuchte Route trug wirklich ein
    // Pfadsegment. Ohne sie prüfte der Test eine Gleichheit, die auch dann
    // gilt, wenn der Router gar nicht navigiert — und `browse` landet auf
    // „/", was die erste Fassung dieses Tests prompt hat auffliegen lassen.
    expect(besucht.filter((p) => p.split('/').filter(Boolean).length > 0),
      `keine Route trug ein Pfadsegment: ${besucht.join(', ')}`).not.toEqual([]);
  });

  test('jede Datei kommt auf einer Unterroute wirklich an', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navigateTo('aktuelles', 'jetzt'));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => location.pathname)).toContain('/aktuelles');

    for (const datei of DATEIEN) {
      const antwort = await page.evaluate(async (d) => {
        try {
          const r = await fetch(ebAssetUrl(d), { credentials: 'same-origin' });
          return { status: r.status, url: r.url };
        } catch (e) { return { status: -1, url: String(e) }; }
      }, datei);
      expect(antwort.status, `${datei} → ${antwort.url}`).toBe(200);
      expect(antwort.url, `${datei} landet unter der Route`).not.toContain('/aktuelles/assets/');
    }
  });

  test('die Jetzt-Ansicht lädt auf ihrer eigenen Route — ohne gestellte Antwort', async ({ page }) => {
    // Der Fall, an dem es aufgefallen ist: die Ansicht lebt auf
    // /aktuelles/jetzt und holte von dort ihre eigene Datei nicht.
    await openApp(page);
    await page.evaluate(() => navigateTo('aktuelles', 'jetzt'));
    await page.waitForTimeout(1800);
    const zustand = await page.evaluate(() => _aktZustand);
    expect(zustand, 'der Bestand kam nicht an — Adresse oder Datei fehlt').toBe('da');
    await expect(page.locator('#feedList'))
      .not.toContainText('konnte nicht geladen werden');
  });

  test('kein Modul rechnet die Basis mehr selbst aus', async () => {
    // Die Regel, nicht der Einzelfall: drei Kopien waren der Grund, dass
    // derselbe Fehler an drei Stellen stand. Eine vierte darf nicht dazu.
    const fs = require('node:fs');
    const path = require('node:path');
    const ROOT = path.join(__dirname, '..', '..');
    const MODULE = path.join(ROOT, 'js', 'modules');
    const alle = [];
    (function sammeln(ordner) {
      for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
        const p = path.join(ordner, e.name);
        if (e.isDirectory()) sammeln(p);
        else if (e.name.endsWith('.js')) alle.push(p);
      }
    })(MODULE);
    expect(alle.length, 'keine Module gefunden — der Test hätte kein Subjekt')
      .toBeGreaterThan(20);

    // `core/00-basis.js` ist ausgenommen: DORT wird die Basis definiert, es
    // muss den Script-Tag also lesen dürfen. Die Ausnahme gilt für genau
    // diese eine Datei — eine Ausnahmeliste, die wachsen kann, wäre der
    // Anfang vom Ende der Regel (dieselbe Begründung wie in
    // `pruefhygiene.spec.js` für die Wächterdatei).
    const QUELLE_DER_BASIS = path.join('js', 'modules', 'core', '00-basis.js');
    const treffer = alle.filter((p) => {
      if (path.relative(ROOT, p) === QUELLE_DER_BASIS) return false;
      const ohneKommentare = fs.readFileSync(p, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      return /script\[src\*=["']app\.js["']\]/.test(ohneKommentare);
    }).map((p) => path.relative(ROOT, p));

    // Und die Gegenprobe: die ausgenommene Datei löst wirklich auf. Ohne sie
    // bestünde der Test auch, wenn `EB_THEME_BASIS` verschwände.
    const basis = fs.readFileSync(path.join(ROOT, QUELLE_DER_BASIS), 'utf8');
    expect(basis, 'EB_THEME_BASIS ist weg — dann rechnet niemand mehr die Basis')
      .toMatch(/script\[src\*=["']app\.js["']\]/);

    expect(treffer, 'diese Module lösen die Basis wieder selbst auf — `ebAssetUrl()` benutzen')
      .toEqual([]);
  });
});
