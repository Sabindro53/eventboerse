// Smoke-Tests: Jede öffentliche SPA-Route rendert ohne Page-Errors.
//
// Hintergrund (Auftrag Fable 5, Priorität 1): Die letzten Produktionsfehler
// waren alle Regressionen, die ein simpler „Seite rendert ohne Fehler“-Check
// gefangen hätte. Diese Suite ist das Sicherheitsnetz für jede Route.
const { test, expect } = require('@playwright/test');
const { openApp, spaNavigate, activePageId, expectNoPageErrors } = require('./helpers');

// Öffentliche Routen → erwartete section-ID.
// Login-pflichtige Routen (profile, settings, admin, messages, create-listing)
// werden separat getestet: sie müssen zum Login-Modal umleiten, nicht crashen.
const PUBLIC_ROUTES = [
  ['browse',            'page-browse'],
  ['explore',           'page-explore'],
  ['aktuelles',         'page-aktuelles'],
  ['board',             'page-board'],
  ['favorites',         'page-favorites'],
  ['agb',               'page-agb'],
  ['agb-b2b',           'page-agb-b2b'],
  ['agb-dienstleister', 'page-agb-dienstleister'],
  ['marktplatz',        'page-marktplatz'],
  ['cookies',           'page-cookies'],
  ['widerruf',          'page-widerruf'],
  ['community',         'page-community'],
  ['bewertungen',       'page-bewertungen'],
  ['dsa',               'page-dsa'],
  ['p2b',               'page-p2b'],
];

const LOGIN_REQUIRED = ['create-listing', 'messages', 'profile', 'settings', 'admin'];

test.describe('Smoke: SPA-Routen', () => {
  test('Startseite lädt als Browse mit Listings und 0 Page-Errors', async ({ page }) => {
    const errors = await openApp(page);
    expect(await activePageId(page)).toBe('page-browse');
    // Demo-Listings müssen sichtbar sein (Regression: verschwundene Listings)
    const count = await page.evaluate(() => (typeof getHeroListings === 'function' ? getHeroListings().length : 0));
    expect(count, 'Es müssen sichtbare Listings vorhanden sein').toBeGreaterThan(10);
    expectNoPageErrors(errors, 'Startseite');
  });

  for (const [route, pageId] of PUBLIC_ROUTES) {
    test(`Route "${route}" rendert ${pageId} ohne Fehler`, async ({ page }) => {
      const errors = await openApp(page);
      await spaNavigate(page, route);
      expect(await activePageId(page)).toBe(pageId);
      expectNoPageErrors(errors, `Route ${route}`);
    });
  }

  test('Detailseite eines Demo-Listings rendert vollständig', async ({ page }) => {
    const errors = await openApp(page);
    await spaNavigate(page, 'detail', 1);
    expect(await activePageId(page)).toBe('page-detail');
    // Titel des Listings muss auf der Seite stehen
    const detail = page.locator('#page-detail');
    await expect(detail).toContainText('DJ SoundMaster Berlin');
    expectNoPageErrors(errors, 'Detailseite');
  });

  test('Provider-Profil rendert ohne Fehler', async ({ page }) => {
    const errors = await openApp(page);
    await spaNavigate(page, 'provider', 90001);
    expect(await activePageId(page)).toBe('page-provider');
    expectNoPageErrors(errors, 'Provider-Profil');
  });

  test('Profil ohne Inserate erzeugt keine kuenstliche Inseratkarte', async ({ page }) => {
    await page.route('**/wp-json/eventboerse/v1/provider/11?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 11,
          name: 'Maria Heilig',
          role: 'Admin',
          since: '2026',
          tagline: 'Admin',
          location: '',
          bio: '',
          photoUrl: '',
          gallery: [],
          listings: [],
          reviews: [],
          collaborations: [],
        }),
      });
    });

    const errors = await openApp(page);
    await spaNavigate(page, 'provider', 11);

    await expect(page.locator('#providerName')).toHaveText('Maria Heilig');
    await expect(page.locator('#providerListingCount')).toHaveText('0');
    await expect(page.locator('#providerListings')).toContainText('Noch keine Inserate');
    await expect(page.locator('#providerListings .listing-card')).toHaveCount(0);

    const pollutedListings = await page.evaluate(() => LISTINGS.filter((l) =>
      String(l && l.providerId) === '11' || String(l && l.id) === 'profile-11'
    ).length);
    expect(pollutedListings, 'Profil-Fallback darf LISTINGS nicht veraendern').toBe(0);
    expectNoPageErrors(errors, 'Profil ohne Inserate');
  });

  for (const route of LOGIN_REQUIRED) {
    test(`Geschützte Route "${route}" leitet unangemeldet zum Login um (kein Crash)`, async ({ page }) => {
      const errors = await openApp(page);
      await spaNavigate(page, route);
      // Login-Modal muss offen sein, die Seite selbst darf nicht wechseln
      const modalOpen = await page.evaluate(() => {
        const m = document.getElementById('loginModal');
        return !!(m && m.classList.contains('show'));
      });
      expect(modalOpen, `Login-Modal muss sich für "${route}" öffnen`).toBe(true);
      expectNoPageErrors(errors, `geschützte Route ${route}`);
    });
  }

  test('Browser-Historie: vor/zurück zwischen Routen ohne Fehler', async ({ page }) => {
    const errors = await openApp(page);
    await spaNavigate(page, 'board');
    await spaNavigate(page, 'detail', 1);
    await page.goBack();
    await page.waitForTimeout(400);
    expect(await activePageId(page)).toBe('page-board');
    await page.goBack();
    await page.waitForTimeout(400);
    expect(await activePageId(page)).toBe('page-browse');
    expectNoPageErrors(errors, 'Historie vor/zurück');
  });
});
