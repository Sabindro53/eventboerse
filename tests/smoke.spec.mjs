// @ts-check
/**
 * Eventboerse — SPA Smoke-Tests
 *
 * Ziel: Regression-Schutz fuer die grossen SPA-Routen (Sprint-P0
 * „Listings/Board Regression-Schutz"). Backend-freie Client-Pfade,
 * die auf Demo-Daten fallen zurueck. Alles was das Live-WordPress
 * braucht (Login, Inserat erstellen, Stripe) ist bewusst nicht drin.
 *
 * Was jeder Test prueft:
 *   - Seite laed ohne uncaught JS-Errors
 *   - Ziel-Section (`page-*`) wird `.active`
 *   - Erwartetes Kern-Element ist im DOM
 */
import { test, expect } from '@playwright/test';

// SPA nutzt Google Fonts / Leaflet / Stripe CDN. In restriktiven CI-Netzen
// koennen diese Requests fehlschlagen — die App muss trotzdem laufen.
// Dieser Helper blockt sie deterministisch weg, damit der Test-Lauf
// reproduzierbar wird (nichts wartet auf externe TLS-Timeouts).
async function blockExternalCdns(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return route.continue();
    }
    return route.abort();
  });
}

// Demo-Daten explizit einblenden, sonst filtert `filterDemos()` alles weg.
// In Prod setzt WordPress `EB_HIDE_DEMO=true` sobald echte DB-Inserate
// existieren; ohne Backend soll die SPA-Shell aber trotzdem etwas zeigen.
async function showDemosOnLoad(page) {
  await page.addInitScript(() => {
    window.EB_HIDE_DEMO = false;
  });
}

// Sammelt echte Page-Errors (uncaught JS). Console-Errors werden separat
// gefiltert — externe Ressourcen die per `blockExternalCdns` gekillt
// wurden, produzieren „Failed to load resource" Console-Errors, die
// nicht auf App-Bugs hinweisen.
function trackPageErrors(page) {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  return pageErrors;
}

// Kleine Helper-Sequenz: erste Navigation aktiv erzwingen (DOMContentLoaded-
// Handler kann durch Session-Restore verzoegert werden) und auf die Ziel-
// Section warten.
async function ensurePage(page, targetPage, targetSectionId) {
  await page.evaluate((p) => window.navigateTo(p), targetPage);
  await expect(page.locator('#' + targetSectionId)).toHaveClass(/active/, { timeout: 10_000 });
}

test.beforeEach(async ({ page }) => {
  await blockExternalCdns(page);
  await showDemosOnLoad(page);
});

test.describe('SPA Smoke', () => {
  test('Home/Browse laed und rendert Listings', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await page.goto('/index.html');
    await ensurePage(page, 'browse', 'page-browse');
    // Mindestens eine Listing-Card ist im Browse-Grid (Demo-Daten)
    await expect(page.locator('#browseGrid .listing-card').first()).toBeVisible({ timeout: 10_000 });
    expect(pageErrors, `Page errors: ${pageErrors.map(String).join('\n')}`).toHaveLength(0);
  });

  test('Detail-Seite oeffnet ueber navigateTo', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await page.goto('/index.html');
    await ensurePage(page, 'browse', 'page-browse');
    await expect(page.locator('#browseGrid .listing-card').first()).toBeVisible({ timeout: 10_000 });
    // Programmgesteuert navigieren — Klicks auf Cards fuehren einige
    // Analytics-Handler aus, die je nach Zufall Toasts triggern.
    await page.evaluate(() => window.navigateTo('detail', 1));
    await expect(page.locator('#page-detail')).toHaveClass(/active/, { timeout: 10_000 });
    expect(pageErrors, `Page errors: ${pageErrors.map(String).join('\n')}`).toHaveLength(0);
  });

  test('Board (Event-Planer) laed als eigene Seite', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await page.goto('/index.html');
    await ensurePage(page, 'board', 'page-board');
    expect(pageErrors, `Page errors: ${pageErrors.map(String).join('\n')}`).toHaveLength(0);
  });

  test('Feed/Aktuelles laed', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await page.goto('/index.html');
    await ensurePage(page, 'aktuelles', 'page-aktuelles');
    expect(pageErrors, `Page errors: ${pageErrors.map(String).join('\n')}`).toHaveLength(0);
  });

  test('Favoriten-Seite laed (auch ohne Login)', async ({ page }) => {
    const pageErrors = trackPageErrors(page);
    await page.goto('/index.html');
    await ensurePage(page, 'favorites', 'page-favorites');
    expect(pageErrors, `Page errors: ${pageErrors.map(String).join('\n')}`).toHaveLength(0);
  });

  test('Selbstbuchungs-Schutz: navigateTo(detail, unbekannt) darf nicht crashen', async ({ page }) => {
    // Regression-Guard fuer den bekannten Bug „Selbstbuchung im Board".
    // Auch ohne eingeloggten User darf ein Klick auf ein beliebiges Detail
    // die App nicht zerlegen.
    const pageErrors = trackPageErrors(page);
    await page.goto('/index.html');
    await ensurePage(page, 'browse', 'page-browse');
    await expect(page.locator('#browseGrid .listing-card').first()).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => window.navigateTo('detail', 99999));
    // Ziel-Section darf trotz unbekannter ID angezeigt werden
    await expect(page.locator('#page-detail')).toHaveClass(/active/);
    expect(pageErrors, `Page errors: ${pageErrors.map(String).join('\n')}`).toHaveLength(0);
  });
});
