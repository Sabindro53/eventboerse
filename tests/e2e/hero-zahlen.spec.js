// ════════════════════════════════════════════════════════════════════════
// Die Zahlen unter der Hero-Überschrift
//
// Am 08.10.2026 beim Bau des IHK-Pitches gefunden. Die Landeseite trug im
// Markup „150+ Dienstleister · Sofort kontaktierbar · Top bewertet" und
// darunter „150+ Dienstleister · 4.8★ Ø Bewertung · 12 Kategorien".
//
// Drei Probleme, alle gemessen:
//   - „150+", „4.8★" und „Top bewertet" waren PLATZHALTER. Sie standen da,
//     bis `updateHeroStats()` lief — und blieben stehen, wenn das Laden der
//     Inserate fehlschlug. Lokal war genau das der Fall.
//   - `updateHeroStats()` zählte das sichtbare Set. Blendet der Admin-Switch
//     Demo-Inserate ein, wurden Demo-Anbieter und Demo-Bewertungen zur
//     Werbeaussage. Die Plattform steht in der Beta, mit Demo-Daten — eine
//     Zahl darüber ist eine Aussage ohne Deckung (UWG).
//   - „12 Kategorien" stimmte nie: ein Inserat kann zehn tragen.
//
// Jetzt zählt die Zeile ausschliesslich echte Inserate und bleibt verborgen,
// solange es keines gibt. Die Kategorienzahl kommt aus AI_CATEGORIES.
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { openApp, warteAufAppBereit } = require('./helpers');
const { trefferAusserhalbKommentaren } = require('./lib/html-kommentare');

const WURZEL = path.join(__dirname, '..', '..');

async function stats(page) {
  return page.evaluate(() => {
    const row = document.querySelector('.ai-hero-stats');
    return {
      hidden: row.hidden,
      sichtbar: getComputedStyle(row).display !== 'none',
      anbieter: document.getElementById('statProviders').textContent,
      kategorien: document.getElementById('statCategories').textContent,
      bewertung: document.getElementById('statRatingItem').innerText.trim(),
      kategorienSoll: AI_CATEGORIES.length,
    };
  });
}

test.describe('Hero-Zahlen', () => {
  test('im Markup steht keine Werbezahl als Platzhalter', () => {
    const shell = fs.readFileSync(path.join(WURZEL, 'app-shell.html'), 'utf8');
    // Ausserhalb der HTML-Kommentare gemessen: der erklärende Kommentar über
    // der Zeile nennt „150+" wörtlich.
    for (const muster of [/150\+/g, /4\.8★/g, /Top bewertet/g, /Sofort kontaktierbar/g, /<strong>12<\/strong> Kategorien/g]) {
      expect(trefferAusserhalbKommentaren(shell, muster), `${muster} steht noch im Markup`).toEqual([]);
    }
  });

  test('nur Demo-Inserate → die Zeile bleibt verborgen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Gegenprobe: es gibt überhaupt Inserate, sie sind nur alle Demo.
    const n = await page.evaluate(() => LISTINGS.length);
    expect(n).toBeGreaterThan(0);
    const r = await stats(page);
    expect(r.hidden).toBe(true);
    expect(r.sichtbar).toBe(false);
  });

  test('auch eingeblendete Demo-Inserate zählen nicht mit', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => { window.EB_HIDE_DEMO = false; updateHeroStats(); });
    const r = await stats(page);
    expect(r.hidden, 'Demo-Daten dürfen keine Werbezahl ergeben').toBe(true);
  });

  test('echte Inserate ergeben echte Zahlen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => {
      LISTINGS.push({ id: 777001, _fromDb: true, providerId: 4711, rating: 4.5 });
      LISTINGS.push({ id: 777002, _fromDb: true, providerId: 4711, rating: 4.7 });
      LISTINGS.push({ id: 777003, _fromDb: true, providerId: 4712, rating: 0 });
      updateHeroStats();
    });
    const r = await stats(page);
    expect(r.sichtbar).toBe(true);
    // Zwei Anbieter, nicht drei Inserate.
    expect(r.anbieter).toBe('2');
    expect(r.kategorien).toBe(String(r.kategorienSoll));
    expect(r.bewertung).toContain('4,6★');
  });

  test('ohne Bewertung steht „Neu", keine erfundene Sternzahl', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => {
      LISTINGS.push({ id: 777010, _fromDb: true, providerId: 4720 });
      updateHeroStats();
    });
    const r = await stats(page);
    expect(r.sichtbar).toBe(true);
    expect(r.bewertung).not.toContain('★');
    expect(r.bewertung).toContain('Neu');
  });
});
