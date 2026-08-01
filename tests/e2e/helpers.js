// Gemeinsame Test-Helfer für die Eventbörse-E2E-Suite.
const { expect } = require('@playwright/test');

/**
 * Öffnet die SPA und sammelt Page-Errors.
 * Cookie-Consent wird vorab gesetzt, damit der Banner keine Tests verdeckt.
 * Rückgabe: Array, das alle uncaught exceptions der Seite aufnimmt.
 */
async function openApp(page, options) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('eb_cookie_consent', JSON.stringify({
        essential: true, functional: true, ts: Date.now(),
      }));
    } catch (e) {}
    // Live setzt das Backend window.EB_HIDE_DEMO=false (Demo-Inserate sichtbar).
    // Lokal gibt es kein Backend → Flag wie im Live-Betrieb setzen, sonst
    // wäre jede Trefferliste leer und die Suche nicht testbar.
    window.EB_HIDE_DEMO = false;
  });
  // WICHTIG: '/' wie live — unter '/index.html' liest der SPA-Router
  // „index.html“ als Routen-Token und keine Seite wäre aktiv.
  const url = (options && options.url) || '/';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // app.js ist defer — warten bis der Router initialisiert ist
  await page.waitForFunction(() => typeof window.navigateTo === 'function', null, { timeout: 15000 });
  return errors;
}

/** SPA-Navigation über den echten Router (Deep-Links kennt der Dev-Server nicht). */
async function spaNavigate(page, route, data) {
  await page.evaluate(([r, d]) => window.navigateTo(r, d || null), [route, data || null]);
  // Rendern abwarten (Router ist synchron, Folge-Renders laufen über Timeouts)
  await page.waitForTimeout(400);
}

/** Aktive SPA-Seite (section.page.active) zurückgeben. */
async function activePageId(page) {
  return page.evaluate(() => {
    const el = document.querySelector('section.page.active');
    return el ? el.id : null;
  });
}

/** Suche auf der Browse-Seite ausführen und Trefferzahl zurückgeben. */
async function runSearch(page, query, location) {
  return page.evaluate(([q, loc]) => {
    const inp = document.getElementById('browseSearch');
    const locInp = document.getElementById('browseLocation');
    if (inp) inp.value = q;
    if (locInp) locInp.value = loc || '';
    filterListings();
    const noRes = document.getElementById('noResultsContainer');
    const noResVisible = !!(noRes && noRes.style.display !== 'none');
    const countTxt = (document.getElementById('browseResultCount') || {}).textContent || '';
    const m = countTxt.match(/(\d+)/);
    return { hits: noResVisible ? 0 : (m ? parseInt(m[1], 10) : 0), noResVisible };
  }, [query, location || '']);
}

/** Es dürfen keine unbehandelten Fehler aufgetreten sein. */
function expectNoPageErrors(errors, kontext) {
  expect(errors, `Page-Errors bei ${kontext}: ${errors.join(' | ')}`).toEqual([]);
}

module.exports = { openApp, spaNavigate, activePageId, runSearch, expectNoPageErrors };
