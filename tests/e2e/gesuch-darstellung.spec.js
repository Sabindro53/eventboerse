// Gesuche sehen aus wie Gesuche — F01–F03 des Live-Audits vom 15.10.2026.
//
// ── DER BEFUND ──────────────────────────────────────────────────────────
//
// Am 16.10.2026 an der öffentlichen Inserate-Route der Live-Seite gelesen:
// „Suche DJ für 28. Geburtstag" und „Klavierspieler für Events gesucht"
// tragen beide `listingType: "offer"`, `priceLabel: "ab … € / Event"` und
// `rating: 0`. Angelegt im März, also VOR Migration 2.3 (Juli), die solche
// Bestands-Gesuche über ihren Titel nachmarkieren sollte.
//
// Die Nachmarkierung lief nie: sie steht in `if ( ! $tcol )`, und
// `eb_create_tables()` legt die Spalte `listing_type` unmittelbar davor
// per dbDelta selbst an. Die Spalte ist also immer schon da, wenn gefragt
// wird — mit dem Vorgabewert 'offer' für jede alte Zeile.
//
// Daneben las KEINE Karte den Typ: Suche, Laufband und „Meine Inserate"
// zeigten Stern, Bewertung und Anbieterpreis für alles. `listingType`
// wurde im Frontend an genau drei Stellen gelesen (Board-Auswahl,
// Assistent, Bearbeiten) — zwei davon mit je eigener Erkennung.
//
// ── DIE ENTSCHEIDUNG ────────────────────────────────────────────────────
//
// Q3 (Inhaber, 15.10.2026): keine Umstellung echter Daten, nur Darstellung.
// Deshalb gilt `listingType: 'offer'` hier NICHT als Aussage — es ist der
// Vorgabewert der Spalte, den jede alte Zeile trägt. Die Titelregel der
// Migration bleibt als Rückfall, und es gibt sie genau EINMAL:
// `ebIstGesuch()` in core/00-basis.js.
const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit } = require('./helpers');

/** So stehen die zwei Gesuche live in der API (16.10.2026), gekürzt. */
const ALT_GESUCH = {
  id: 8, listingType: 'offer', title: 'Suche DJ für 28. Geburtstag',
  category: 'dj', categoryLabel: 'DJ & Musik', location: 'Köln',
  price: 99, priceModel: 'Pro Event', priceLabel: 'ab 99€ / Event',
  rating: 0, reviews: 0, images: [], image: '', providerId: 1,
};
const ALT_GESUCH_2 = {
  ...ALT_GESUCH, id: 5, title: 'Klavierspieler für Events gesucht',
  price: 200, priceLabel: 'ab 200€ / Event',
};
/** Ein Gesuch, wie die Maske es heute anlegt. */
const NEU_GESUCH = {
  ...ALT_GESUCH, id: 21, listingType: 'search', title: 'Fotograf für Hochzeit',
  price: 800, priceLabel: 'Budget bis 1200€',
};
/** Gegenprobe: ein echtes Angebot (live: id 7). */
const ANGEBOT = {
  ...ALT_GESUCH, id: 7, providerId: 7, title: 'DJ Julian',
  price: 120, priceModel: 'Pro Stunde', priceLabel: 'ab 120€ / Stunde', rating: 4.8, reviews: 3,
};

async function bereit(page) {
  await openApp(page);
  await warteAufAppBereit(page);
}

test.describe('ebIstGesuch: eine Erkennung für alle Stellen', () => {
  test('erkennt das Feld UND die alten Zeilen, deren Feld nur der Vorgabewert ist', async ({ page }) => {
    await bereit(page);
    const r = await page.evaluate((f) => f.map((l) => ebIstGesuch(l)),
      [ALT_GESUCH, ALT_GESUCH_2, NEU_GESUCH, ANGEBOT,
        { title: 'Klavierspieler für jedes Event', listingType: 'offer' },
        { title: 'Gesuchte Momente — Fotografie' },
        { title: 'Suchmaschinen-Workshop' },
        null]);
    expect(r).toEqual([true, true, true, false, false, false, false, false]);
  });

  test('keine Stelle baut die Erkennung selbst nach', async () => {
    const fs = require('fs');
    const path = require('path');
    const { ohneJsKommentare: jsOhneKommentare } = require('./lib/js-code');
    const wurzel = path.join(__dirname, '..', '..', 'js', 'modules');
    const funde = [];
    (function lauf(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { lauf(p); continue; }
        if (!p.endsWith('.js') || p.endsWith(path.join('core', '00-basis.js'))) continue;
        const code = jsOhneKommentare(fs.readFileSync(p, 'utf8'));
        // Die Titelregel der Migration — wer sie wieder hinschreibt, hat
        // eine zweite Erkennung, und zwei Fassungen driften.
        if (/\\bgesucht\\b/.test(code) || /\^\\s\*suche\\s/i.test(code)) funde.push(path.relative(wurzel, p));
      }
    })(wurzel);
    expect(funde, 'eigene Gesuch-Erkennung außerhalb von ebIstGesuch()').toEqual([]);
  });
});

test.describe('Karten in Suche und Feed', () => {
  test('ein altes Gesuch zeigt Budget statt Anbieterpreis und keinen Stern', async ({ page }) => {
    await bereit(page);
    const karte = await page.evaluate((l) => {
      const d = document.createElement('div');
      d.innerHTML = renderListingCard(l);
      document.body.appendChild(d);
      const c = d.querySelector('.listing-card');
      return {
        text: c.innerText,
        stern: !!c.querySelector('.listing-card-rating'),
        art: (c.querySelector('.listing-card-art') || {}).textContent || '',
        preis: c.querySelector('.listing-card-price').textContent.trim(),
        klasse: c.classList.contains('is-gesuch'),
      };
    }, ALT_GESUCH);
    expect(karte.stern).toBe(false);
    expect(karte.art).toBe('Gesuch');
    expect(karte.klasse).toBe(true);
    expect(karte.preis).toBe('Budget: 99 €');
    expect(karte.text).not.toContain('ab 99');
  });

  test('ein neues Gesuch behält sein gespeichertes Budget', async ({ page }) => {
    await bereit(page);
    const preis = await page.evaluate((l) => {
      const d = document.createElement('div');
      d.innerHTML = renderListingCard(l);
      return d.querySelector('.listing-card-price').textContent.trim();
    }, NEU_GESUCH);
    expect(preis).toBe('Budget bis 1200€');
  });

  test('Gegenprobe: ein Angebot bleibt unverändert', async ({ page }) => {
    await bereit(page);
    const karte = await page.evaluate((l) => {
      const d = document.createElement('div');
      d.innerHTML = renderListingCard(l);
      const c = d.querySelector('.listing-card');
      return {
        stern: (c.querySelector('.listing-card-rating') || {}).textContent || '',
        art: !!c.querySelector('.listing-card-art'),
        preis: c.querySelector('.listing-card-price').textContent.trim(),
      };
    }, ANGEBOT);
    expect(karte.stern).toContain('4.8');
    expect(karte.art).toBe(false);
    expect(karte.preis).toBe('ab 120€ / Stunde');
  });

  test('fremder Titel wird auch im Gesuch-Zweig maskiert', async ({ page }) => {
    await bereit(page);
    const n = await page.evaluate((l) => {
      const d = document.createElement('div');
      d.innerHTML = renderListingCard(l);
      return d.querySelectorAll('img[onerror="1"], b').length;
    // Der Gesuch-Zweig zeigt einen GESPEICHERTEN Budget-Text unverändert —
    // also muss das Markup darin beginnen; „ab …" würde er gar nicht zeigen,
    // und die Probe bestünde, ohne die Maskierung zu erreichen.
    }, { ...ALT_GESUCH, title: 'Suche <b>DJ</b> gesucht', priceLabel: 'Budget <img src=x onerror="1">' });
    expect(n).toBe(0);
  });
});

test.describe('Laufband auf der Startseite', () => {
  test('ein Gesuch trägt dort Budget und keinen Stern, ein Angebot schon', async ({ page }) => {
    await bereit(page);
    const karten = await page.evaluate(([g, a]) => {
      LISTINGS.splice(0, LISTINGS.length, g, a);
      renderHeroMarquees();
      const seen = {};
      document.querySelectorAll('.hero-marquee-card').forEach((c) => {
        const t = c.querySelector('h4').textContent;
        if (!seen[t]) seen[t] = c.querySelector('.hero-marquee-card-info span').textContent;
      });
      return seen;
    }, [ALT_GESUCH, ANGEBOT]);
    expect(karten['Suche DJ für 28. Geburtstag']).toBe('Gesuch · Budget: 99 €');
    expect(karten['DJ Julian']).toContain('★');
  });
});

test.describe('Meine Inserate', () => {
  for (const [rolle, user] of [
    ['Dienstleister', { id: 1, name: 'Probe', role: 'Dienstleister' }],
    ['Event-Planer', { id: 1, name: 'Probe', role: 'Event-Planer' }],
  ]) {
    test(`${rolle}: ein Gesuch zeigt keine Bewertung und keine Verfügbarkeit, ein Angebot schon`, async ({ page }) => {
      await page.route('**/my-listings**', (r) => r.fulfill({
        contentType: 'application/json', body: JSON.stringify([ALT_GESUCH, ANGEBOT]),
      }));
      await bereit(page);
      await page.evaluate((u) => { currentUser = u; isLoggedIn = true; navigateTo('my-listings'); }, user);
      await expect(page.locator('#myListingsGrid .my-listing-card')).toHaveCount(2);
      const karten = await page.evaluate(() => [...document.querySelectorAll('#myListingsGrid .my-listing-card')].map((c) => ({
        titel: c.querySelector('h3').textContent,
        text: c.innerText,
        verfuegbarkeit: [...c.querySelectorAll('button')].some((b) => /Verfügbarkeit/.test(b.textContent)),
      })));
      const g = karten.find((k) => k.titel === ALT_GESUCH.title);
      const a = karten.find((k) => k.titel === ANGEBOT.title);
      expect(g.text).toContain('Gesuch');
      expect(g.text).toContain('Budget: 99 €');
      expect(g.text).not.toMatch(/Bewertungen|\/5/);
      expect(g.verfuegbarkeit).toBe(false);
      expect(a.text).toContain('Bewertungen');
      if (rolle === 'Dienstleister') expect(a.verfuegbarkeit).toBe(true);
    });
  }
});
