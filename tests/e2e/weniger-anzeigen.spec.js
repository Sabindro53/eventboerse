// Suchergebnisse lassen sich wieder einklappen — Besprechung vom 15.10.2026,
// PRODUCT_REDESIGN.md 6.1.
//
// „Mehr anzeigen" öffnete weitere Treffer, und es gab keinen Weg zurück.
// Wer zehn Reihen aufgeklappt hatte, scrollte sie alle wieder hoch. Die
// Gegenfunktion setzt auf die Startmenge zurück — dieselbe, die
// renderBrowseGrid() beim ersten Zeichnen wählt, nicht eine feste Zahl.
//
// Gemessen wird am echten Knopf und an der Zahl gerenderter Karten, nicht
// am Text des Knopfs: „Weniger anzeigen", der nichts einklappt, sähe im
// Markup vollständig richtig aus.
const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit } = require('./helpers');

function inserate(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: 90000 + i, title: 'Probe ' + i, images: [], image: '',
    category: 'dj', categoryLabel: 'DJ & Musik', location: 'Köln', priceLabel: 'ab 100€', rating: 4,
  }));
}

async function suche(page, n) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  await warteAufAppBereit(page);
  // navigateTo('browse') zeichnet nach loadDbListings() selbst — wer vorher
  // stellt, wird überschrieben und misst das Standardraster.
  await page.evaluate(async (rows) => {
    const bb = document.getElementById('betaBanner'); if (bb) bb.hidden = true;
    await navigateTo('browse');
    renderBrowseGrid(rows);
  }, inserate(n));
}

const karten = (page) => page.locator('#browseGrid .listing-card').count();
const start = (page) => page.evaluate(() => _browseGridPaging.start);
const mehr = (page) => page.locator('#browseLoadMoreBtn');
const weniger = (page) => page.locator('#browseShowLessBtn');

test.describe('Suchergebnisse: Weniger anzeigen', () => {
  test('nach „Mehr anzeigen" klappt „Weniger anzeigen" auf die Startmenge zurück', async ({ page }) => {
    await suche(page, 60);
    const anfang = await karten(page);
    expect(anfang).toBe(await start(page));
    await expect(weniger(page)).toBeHidden();

    await mehr(page).click();
    expect(await karten(page)).toBeGreaterThan(anfang);
    await expect(weniger(page)).toBeVisible();

    await weniger(page).click();
    expect(await karten(page)).toBe(anfang);
    await expect(weniger(page)).toBeHidden();
    await expect(mehr(page)).toBeVisible();
  });

  test('der Fokus geht nicht verloren: er landet auf „Mehr anzeigen"', async ({ page }) => {
    await suche(page, 60);
    await mehr(page).click();
    await weniger(page).click();
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('browseLoadMoreBtn');
  });

  test('ist alles aufgeklappt, bleibt nur „Weniger anzeigen"', async ({ page }) => {
    await suche(page, 40);
    for (let i = 0; i < 10 && await mehr(page).isVisible(); i++) await mehr(page).click();
    expect(await karten(page)).toBe(40);
    await expect(mehr(page)).toBeHidden();
    await expect(weniger(page)).toBeVisible();
    await weniger(page).click();
    expect(await karten(page)).toBe(await start(page));
  });

  test('Gegenprobe: passen alle Treffer in die Startmenge, gibt es keinen der beiden Knöpfe', async ({ page }) => {
    await suche(page, 3);
    expect(await karten(page)).toBe(3);
    await expect(mehr(page)).toBeHidden();
    await expect(weniger(page)).toBeHidden();
  });

  test('eine neue Suche beginnt wieder eingeklappt', async ({ page }) => {
    await suche(page, 60);
    await mehr(page).click();
    await page.evaluate((rows) => renderBrowseGrid(rows), inserate(60));
    expect(await karten(page)).toBe(await start(page));
    await expect(weniger(page)).toBeHidden();
  });
});
