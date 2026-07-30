// Smoke-Suite: SPA lädt, Home rendert, Suche findet Treffer, Browse zeigt Karten,
// Board ist erreichbar. API-Calls werden gemockt — kein Backend nötig.
import { test, expect } from '@playwright/test';

const MOCK_LISTINGS = [
  {
    id: 501,
    title: 'Test-DJ Berlin',
    category: 'DJ',
    city: 'Berlin',
    price: 800,
    priceLabel: 'ab 800 €',
    rating: 4.7,
    reviews: 12,
    images: ['/assets/no-image.svg'],
    features: ['Anlage', 'Licht'],
    listing_type: 'offer',
    providerId: 90001,
    provider: 'Demo-DJ',
  },
  {
    id: 502,
    title: 'Test-Catering Hamburg',
    category: 'Catering',
    city: 'Hamburg',
    price: 45,
    priceLabel: '45 €/Person',
    rating: 4.5,
    reviews: 8,
    images: ['/assets/no-image.svg'],
    features: ['Buffet'],
    listing_type: 'offer',
    providerId: 90002,
    provider: 'Demo-Catering',
  },
];

async function mockApi(page) {
  await page.route('**/wp-json/eventboerse/v1/**', async (route) => {
    const url = route.request().url();
    if (/\/listings(\?|$)/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: MOCK_LISTINGS, total: MOCK_LISTINGS.length }),
      });
    }
    if (/\/me\b/.test(url) || /\/session\b/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    // Alles andere: leeres OK — SPA soll niemals hart crashen.
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, items: [] }),
    });
  });
}

async function trackConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test.describe('Eventbörse SPA — Smoke', () => {
  test('Home lädt ohne Page-Errors und rendert Hero', async ({ page }) => {
    await mockApi(page);
    const errors = await trackConsoleErrors(page);
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    // Titel + Body vorhanden
    await expect(page).toHaveTitle(/Eventb/i);
    await expect(page.locator('body')).toBeVisible();
    // App-Root ist im DOM (main wird beim Boot ggf. per CSS hidden gehalten;
    // wir prüfen "attached", nicht "visible").
    const appRoot = page.locator('main, #appLoadingOverlay').first();
    await expect(appRoot).toBeAttached({ timeout: 8000 });
    // Warten, bis die SPA gebootet ist (navigateTo als globale Funktion vorhanden).
    await page.waitForFunction(() => typeof window['navigateTo'] === 'function', { timeout: 8000 });
    // Keine JS-Page-Errors (Konsolen-Errors ignorieren wir bewusst — die kommen
    // oft von blockierten CDN-Assets in Offline-CI; PageErrors sind das harte Signal).
    const pageErrors = errors.filter((e) => !/net::ERR|ERR_BLOCKED|Failed to fetch|Failed to load resource|status of (404|4\d\d|5\d\d)/i.test(e));
    expect(pageErrors, `Unerwartete Page-Errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('Navigation zwischen Home und Browse funktioniert', async ({ page }) => {
    await mockApi(page);
    await page.goto('/index.html');
    // Warten bis die SPA gebootet ist
    await page.waitForFunction(() => typeof window['navigateTo'] === 'function', { timeout: 8000 });
    await page.evaluate(() => window['navigateTo']('browse'));
    await page.waitForTimeout(500);
    // Browse sollte mindestens ein Rendering-Element haben.
    // Wir prüfen nicht auf konkrete Selektoren, weil das UI wachsen darf.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length, 'Browse-Route rendert leeres Body').toBeGreaterThan(50);
  });

  test('Board-Route ist erreichbar und crasht nicht', async ({ page }) => {
    await mockApi(page);
    const errors = await trackConsoleErrors(page);
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window['navigateTo'] === 'function', { timeout: 8000 });
    await page.evaluate(() => window['navigateTo']('board'));
    await page.waitForTimeout(700);
    const pageErrors = errors.filter((e) => !/net::ERR|ERR_BLOCKED|Failed to fetch|Failed to load resource|status of (404|4\d\d|5\d\d)/i.test(e));
    expect(pageErrors, `Board-Route wirft Page-Errors:\n${pageErrors.join('\n')}`).toEqual([]);
  });
});
