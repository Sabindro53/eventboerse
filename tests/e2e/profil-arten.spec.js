// Profilarten — F01 des Live-Audits vom 15.10.2026, PRODUCT_REDESIGN.md 1.5.
//
// ── DER BEFUND ──────────────────────────────────────────────────────────
//
// `loadProvider()` kannte keine Profilart. Den Kopf baute es aus dem
// ERSTEN INSERAT: Unterzeile, Preis, Highlights und Spezialisierungen
// waren dessen Felder. Wer nur Gesuche hat, bekam damit ein
// Anbieterprofil — „DJ & Musik · Köln", „ab 200€ / Event",
// „Spezialisierungen: Hochzeit …". Das Konto aus F01 trägt live die Rolle
// „Admin", nicht „Event-Planer"; eine Weiche nur über die Rolle hätte es
// verfehlt.
//
// Daneben: die Unterzeile lässt sich im eigenen Profil bearbeiten und wird
// als `tagline` gespeichert — angezeigt wurde sie nie, weil das erste
// Inserat sie beim nächsten Laden überschrieb.
//
// ── DIE ENTSCHEIDUNGEN DES INHABERS (16.10.2026) ────────────────────────
//
// P1  Anbieterprofil, wenn mindestens ein Angebot ODER Rolle Dienstleister;
//     sonst Mitgliedsprofil.
// P2  Die gespeicherte Unterzeile bestimmt den Kopf — für ALLE Profile.
// P3  Mischkonten: Gesuche in einem zweiten Reiter „Gesuche".
//
// Gemessen wird, was ein Besucher SIEHT (offsetParent, nicht Markup): ein
// Bereich, der im Markup steht und versteckt ist, ist für ihn nicht da.
const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit } = require('./helpers');

const BASIS = {
  providerName: 'Probe', providerSince: '2026', category: 'dj', categoryLabel: 'DJ & Musik',
  location: 'Köln', images: [], image: '', rating: 0, reviews: 0, description: '<p>Hallo.</p>',
};
/** Wie live: Gesuch mit Vorgabewert 'offer', Anbieter-Feldern und -Preis. */
const GESUCH = {
  ...BASIS, id: 8, listingType: 'offer', title: 'Suche DJ für 28. Geburtstag',
  price: 99, priceLabel: 'ab 99€ / Event',
  features: ['Individuelle Absprache'], tags: ['Hochzeit', 'Geburtstag'],
};
const GESUCH_2 = { ...GESUCH, id: 5, title: 'Klavierspieler für Events gesucht', price: 200, priceLabel: 'ab 200€ / Event' };
const ANGEBOT = {
  ...BASIS, id: 31, listingType: 'offer', title: 'Hochzeitsreportage', category: 'foto',
  categoryLabel: 'Fotografie', location: 'Bonn', price: 900, priceLabel: 'ab 900€ / Event',
  rating: 4.9, reviews: 7, features: ['Zweitfotograf'], tags: ['Reportage', 'Hochzeit'],
};

/**
 * Öffnet das Profil `pid`. `inserate` gehen in LISTINGS (in DIESER
 * Reihenfolge vorn — die erste ist, was früher den Kopf bestimmte), `api`
 * ist die Antwort der Route provider/{pid}.
 */
async function oeffneProfil(page, pid, inserate, api, nutzer) {
  await page.route('**/provider/' + pid + '**', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ id: pid, name: 'Probe', listings: inserate, reviews: [], collaborations: [], ...api }),
  }));
  if (!page.__bereit) {
    await openApp(page);
    await warteAufAppBereit(page);
    page.__bereit = true;
  }
  await page.evaluate(([pid, inserate, nutzer]) => {
    if (nutzer) { currentUser = nutzer; isLoggedIn = true; }
    inserate.slice().reverse().forEach((l) => LISTINGS.unshift(Object.assign({}, l,
      { id: l.id + 10000, _dbId: l.id, _fromDb: true, providerId: pid })));
    const bb = document.getElementById('betaBanner'); if (bb) bb.hidden = true;
    navigateTo('provider', pid);
  }, [pid, inserate, nutzer || null]);
  await expect(page.locator('#providerName')).toHaveText('Probe');
  // Die Antwort der Profil-Route ist angekommen, wenn der Bewertungs-Reiter
  // seinen Lade-Kreisel abgegeben hat.
  await expect(page.locator('#providerReviewsList .spinner')).toHaveCount(0);
}

/** Was ein Besucher sieht. */
function sicht(page) {
  return page.evaluate(() => {
    const pg = document.getElementById('page-provider');
    const sichtbar = (el) => !!el && el.offsetParent !== null;
    const txt = (id) => ((document.getElementById(id) || {}).innerText || '').trim();
    const abschnitt = (id) => sichtbar((document.getElementById(id) || {}).closest
      ? document.getElementById(id).closest('.provider-section, .provider-fact-card') : null);
    return {
      unterzeile: txt('providerTagline'),
      bewertungSichtbar: sichtbar(document.getElementById('providerRating')),
      reviewsSichtbar: sichtbar(document.getElementById('providerReviews')),
      zaehlerBeschriftung: (document.getElementById('providerListingCount').parentElement.querySelector('span') || {}).textContent,
      highlights: abschnitt('providerHighlights'),
      portfolio: abschnitt('providerPortfolio'),
      spezialisierungen: abschnitt('providerSpecTags'),
      fakten: abschnitt('providerFacts') ? txt('providerFacts') : null,
      reiter: [...pg.querySelectorAll('.provider-tabs .tab')].filter(sichtbar).map((t) => t.innerText.replace(/^\S+\s*/, '').trim()),
      aktiverReiter: ((pg.querySelector('.provider-tabs .tab.active') || {}).innerText || '').replace(/^\S+\s*/, '').trim(),
      inserate: [...pg.querySelectorAll('#providerListings .listing-card-title')].map((e) => e.textContent),
      gesuche: [...pg.querySelectorAll('#providerGesuche .listing-card-title')].map((e) => e.textContent),
      bewertungenLeer: txt('providerReviewsList'),
    };
  });
}

test.describe('Mitgliedsprofil: nur Gesuche', () => {
  test('das Konto aus F01 (Rolle Admin, nur Gesuche) ist kein Anbieterprofil', async ({ page }) => {
    await oeffneProfil(page, 41, [GESUCH, GESUCH_2], { role: 'Admin', tagline: '', location: 'Köln' });
    const s = await sicht(page);
    expect(s.unterzeile).toBe('Köln');
    expect(s.bewertungSichtbar).toBe(false);
    expect(s.reviewsSichtbar).toBe(false);
    expect(s.zaehlerBeschriftung).toBe('Gesuche');
    expect(s.highlights).toBe(false);
    expect(s.portfolio).toBe(false);
    expect(s.spezialisierungen).toBe(false);
    expect(s.fakten).toBe('location_on\nKöln');
    expect(s.reiter).toEqual(['Gesuche']);
    expect(s.aktiverReiter).toBe('Gesuche');
    expect(s.gesuche.sort()).toEqual([GESUCH.title, GESUCH_2.title].sort());
  });

  test('ein Event-Planer ohne Inserat ist ein Mitglied und sagt, dass es keine Gesuche gibt', async ({ page }) => {
    await oeffneProfil(page, 42, [], { role: 'Event-Planer', tagline: '', location: 'Bonn' });
    const s = await sicht(page);
    expect(s.reiter).toEqual(['Gesuche']);
    expect(s.highlights).toBe(false);
    expect(await page.locator('#providerGesuche').innerText()).toContain('Noch keine Gesuche');
  });

  test('der leere Bewertungstext spricht nicht von einem Anbieter', async ({ page }) => {
    await oeffneProfil(page, 43, [GESUCH], { role: 'Event-Planer' });
    const s = await sicht(page);
    expect(s.bewertungenLeer).toContain('Dieses Profil ist neu');
    expect(s.bewertungenLeer).not.toContain('Anbieter');
  });
});

test.describe('Anbieterprofil', () => {
  test('nur Angebote: alles wie bisher, Kopf aus dem Angebot', async ({ page }) => {
    await oeffneProfil(page, 51, [ANGEBOT], { role: 'Dienstleister', tagline: '' });
    const s = await sicht(page);
    expect(s.unterzeile).toBe('Fotografie · Bonn');
    expect(s.bewertungSichtbar).toBe(true);
    expect(s.zaehlerBeschriftung).toBe('Inserate');
    expect(s.highlights).toBe(true);
    expect(s.portfolio).toBe(true);
    expect(s.spezialisierungen).toBe(true);
    expect(s.fakten).toContain('ab 900€ / Event');
    expect(s.reiter).toEqual(['Inserate', 'Bewertungen', 'Arbeitet zusammen mit']);
    expect(s.aktiverReiter).toBe('Inserate');
    expect(s.inserate).toEqual([ANGEBOT.title]);
  });

  test('Rolle Dienstleister ohne Inserat bleibt Anbieter', async ({ page }) => {
    await oeffneProfil(page, 52, [], { role: 'Dienstleister', tagline: '', location: 'Essen' });
    const s = await sicht(page);
    expect(s.reiter).toEqual(['Inserate', 'Bewertungen', 'Arbeitet zusammen mit']);
    expect(s.highlights).toBe(true);
  });

  test('gemischt: Kopf, Preis und Spezialisierungen nur aus dem Angebot, Gesuche im eigenen Reiter', async ({ page }) => {
    // Das Gesuch steht VORN — früher bestimmte es damit den Kopf.
    await oeffneProfil(page, 53, [GESUCH, ANGEBOT], { role: 'Dienstleister', tagline: '' });
    const s = await sicht(page);
    expect(s.unterzeile).toBe('Fotografie · Bonn');
    expect(s.fakten).toContain('ab 900€ / Event');
    expect(s.fakten).not.toContain('99');
    expect(await page.locator('#providerSpecTags').innerText()).toContain('Reportage');
    expect(s.reiter).toEqual(['Inserate', 'Gesuche', 'Bewertungen', 'Arbeitet zusammen mit']);
    expect(s.inserate).toEqual([ANGEBOT.title]);
    expect(s.gesuche).toEqual([GESUCH.title]);
  });

  test('nach einem Mitgliedsprofil kommen alle Bereiche zurück', async ({ page }) => {
    await oeffneProfil(page, 54, [GESUCH], { role: 'Event-Planer' });
    await oeffneProfil(page, 55, [ANGEBOT], { role: 'Dienstleister' });
    const s = await sicht(page);
    expect(s.highlights).toBe(true);
    expect(s.bewertungSichtbar).toBe(true);
    expect(s.reiter).toEqual(['Inserate', 'Bewertungen', 'Arbeitet zusammen mit']);
    expect(s.aktiverReiter).toBe('Inserate');
  });
});

test.describe('P1 an den Rändern — beide Hälften der Regel tragen', () => {
  // Diese zwei Fälle fehlten zuerst: die Mutationen „Art nur nach Rolle"
  // und „Rolle aus der Profil-Route nicht übernommen" überlebten jede
  // andere Probe dieser Datei.
  test('ein Angebot macht das Anbieterprofil — auch ohne Rolle Dienstleister', async ({ page }) => {
    await oeffneProfil(page, 71, [ANGEBOT], { role: 'Admin' });
    const s = await sicht(page);
    expect(s.reiter).toEqual(['Inserate', 'Bewertungen', 'Arbeitet zusammen mit']);
    expect(s.highlights).toBe(true);
  });

  test('ein Dienstleister mit nur Gesuchen bleibt Anbieter — die Rolle kommt erst von der Profil-Route', async ({ page }) => {
    await oeffneProfil(page, 72, [GESUCH], { role: 'Dienstleister' });
    const s = await sicht(page);
    expect(s.reiter).toEqual(['Inserate', 'Gesuche', 'Bewertungen', 'Arbeitet zusammen mit']);
    expect(s.gesuche).toEqual([GESUCH.title]);
    expect(s.inserate).toEqual([]);
  });

  test('eine späte Antwort für ein schon verlassenes Profil zeichnet nicht in das neue', async ({ page }) => {
    // Profil 73 antwortet langsam; bevor die Antwort kommt, steht schon 74 da.
    await page.route('**/provider/73**', async (r) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      await r.fulfill({ contentType: 'application/json', body: JSON.stringify(
        { id: 73, name: 'Probe', role: 'Event-Planer', tagline: 'Spät und falsch', listings: [GESUCH], reviews: [] }) });
    });
    await openApp(page);
    await warteAufAppBereit(page);
    page.__bereit = true;
    await page.evaluate((g) => {
      LISTINGS.unshift(Object.assign({}, g, { id: 10073, _dbId: 73, _fromDb: true, providerId: 73 }));
      navigateTo('provider', 73);
    }, GESUCH);
    await expect(page.locator('#providerName')).toHaveText('Probe');
    await oeffneProfil(page, 74, [ANGEBOT], { role: 'Dienstleister', tagline: 'Richtig' });
    await page.waitForTimeout(2000);
    const s = await sicht(page);
    expect(s.unterzeile).toBe('Richtig');
    expect(s.reiter).toEqual(['Inserate', 'Bewertungen', 'Arbeitet zusammen mit']);
  });
});

test.describe('Die gespeicherte Unterzeile', () => {
  test('bestimmt den Kopf — auch bei einem Anbieter (P2)', async ({ page }) => {
    await oeffneProfil(page, 61, [ANGEBOT], { role: 'Dienstleister', tagline: 'Reportagen ohne Gestellt' });
    expect((await sicht(page)).unterzeile).toBe('Reportagen ohne Gestellt');
  });

  test('bestimmt den Kopf eines Mitglieds', async ({ page }) => {
    await oeffneProfil(page, 62, [GESUCH], { role: 'Event-Planer', tagline: 'Plant Feiern in Köln' });
    expect((await sicht(page)).unterzeile).toBe('Plant Feiern in Köln');
  });

  test('wer sie im eigenen Profil speichert, findet sie nach dem Neuladen wieder', async ({ page }) => {
    let gespeichert = null;
    await page.route('**/eventboerse/v1/profile**', async (r) => {
      if (r.request().method() === 'POST') gespeichert = JSON.parse(r.request().postData() || '{}').tagline;
      await r.fulfill({ contentType: 'application/json', body: '{"ok":true}' });
    });
    const ich = { id: 63, name: 'Probe', role: 'Dienstleister', tagline: '' };
    await oeffneProfil(page, 63, [ANGEBOT], { role: 'Dienstleister', tagline: '' }, ich);
    await page.evaluate(() => {
      document.getElementById('providerTagline').textContent = 'Mein neuer Satz';
      _provSaveTagline();
    });
    await expect.poll(() => gespeichert).toBe('Mein neuer Satz');
    // Neu laden: die Route liefert jetzt, was gespeichert wurde.
    await page.unroute('**/provider/63**');
    // Nach einem Neuladen kommt das Konto mit dem gespeicherten Wert vom
    // Server zurück — genau der Wert, den der POST geschickt hat.
    await oeffneProfil(page, 63, [], { role: 'Dienstleister', tagline: gespeichert }, { ...ich, tagline: gespeichert });
    expect((await sicht(page)).unterzeile).toBe('Mein neuer Satz');
  });
});

test.describe('Markup', () => {
  test('der Gesuche-Reiter steht in der Shell und hat seinen Platz', async () => {
    const fs = require('fs');
    const path = require('path');
    const shell = fs.readFileSync(path.join(__dirname, '..', '..', 'app-shell.html'), 'utf8');
    expect(shell).toMatch(/switchProviderTab\(this, 'gesuche'\)/);
    expect(shell).toMatch(/id="provider-tab-gesuche"/);
    expect(shell).toMatch(/id="providerGesuche"/);
  });
});
