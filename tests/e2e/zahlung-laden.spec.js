// Stripe.js lädt erst, wenn wirklich gezahlt wird.
//
// Bis zum 02.09.2026 band `functions.php` js.stripe.com/v3 unbedingt ein — auf
// der Startseite, im Impressum, überall. Gemessen am 31.08. waren das 250 KB,
// die drittgrößte Übertragung der Startseite.
//
// Schwerer wiegt der Datenschutz. Stripe.js setzt zur Betrugserkennung eigene
// Kennungen und sah die IP-Adresse JEDES Besuchers, auch auf Seiten, auf denen
// nie jemand zahlt. Das ist ein Drittanbieter-Datenfluss ohne Bezug zur
// aufgerufenen Seite.
//
// `scripts/recht.mjs` deckt das NICHT auf: es prüft, ob ein Drittanbieter in
// der Datenschutzerklärung steht — nicht, wann er lädt. Genau diese Lücke
// bewacht diese Datei.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { trefferAusserhalbKommentaren } = require('./lib/html-kommentare');
const { istHost } = require('./lib/url-host');

const ROOT = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const STRIPE_HOST = 'js.stripe.com';

test.describe('Beim normalen Besuch geht nichts an Stripe', () => {
  test('die Startseite lädt js.stripe.com nicht', async ({ page }) => {
    // Der eigentliche Beweis, und er wird am VERHALTEN geführt: nicht „steht
    // kein script-Tag im Quelltext", sondern „der Browser fragt den Host
    // nicht an". Ein Preconnect oder ein nachgeladenes Modul fiele hier auch
    // auf, ein Quelltext-Test nicht.
    const anStripe = [];
    page.on('request', (r) => {
      if (istHost(r.url(), STRIPE_HOST)) anStripe.push(r.url());
    });
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.navigateTo === 'function');
    await page.waitForTimeout(800);   // spät eingehängte Skripte mitnehmen
    expect(anStripe, `beim blossen Besuch ging etwas an Stripe: `
      + `${anStripe.join(', ')}`).toHaveLength(0);
  });

  test('window.Stripe existiert vorher nicht', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.navigateTo === 'function');
    expect(await page.evaluate(() => typeof window.Stripe),
      'Stripe ist ohne Zahlungsvorgang schon da').toBe('undefined');
  });
});

test.describe('Der Lader holt die Bibliothek, wenn sie gebraucht wird', () => {
  /** Fängt js.stripe.com ab und liefert eine Attrappe — ohne Netzzugang. */
  async function stripeAttrappe(page, verhalten = 'ok') {
    await page.route(`**${STRIPE_HOST}/**`, (route) => {
      if (verhalten === 'fehler') return route.abort();
      if (verhalten === 'leer') return route.fulfill({
        status: 200, contentType: 'application/javascript', body: '/* leer */',
      });
      return route.fulfill({
        status: 200, contentType: 'application/javascript',
        body: 'window.Stripe = function () { return { elements: function () {} }; };',
      });
    });
  }

  test('ein Aufruf lädt die Bibliothek nach', async ({ page }) => {
    await stripeAttrappe(page);
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.ebStripeJsLaden === 'function');
    const ok = await page.evaluate(() =>
      window.ebStripeJsLaden().then(() => typeof window.Stripe).catch((e) => 'FEHLER: ' + e.message));
    expect(ok, 'der Lader hat window.Stripe nicht bereitgestellt').toBe('function');
  });

  test('drei Aufrufe hängen nur EIN Skript ein', async ({ page }) => {
    // Ohne gemerktes Versprechen hängt jeder Zahlungsversuch ein weiteres
    // Skript ein — und lädt Stripe mehrfach in dieselbe Seite.
    //
    // Gezählt werden die SKRIPT-ELEMENTE, nicht die Netzanfragen. Die erste
    // Fassung zählte Anfragen und überlebte die Mutation: der Browser fasst
    // identische, gleichzeitig laufende Skript-Anfragen zu einer zusammen.
    // Der Test mass damit eine Eigenschaft von Chromium statt unserer.
    await stripeAttrappe(page);
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.ebStripeJsLaden === 'function');
    const anzahl = await page.evaluate(() => Promise.all([
      window.ebStripeJsLaden(), window.ebStripeJsLaden(), window.ebStripeJsLaden(),
    ]).then(() => [...document.querySelectorAll('script[src]')]
      .filter((el) => { try { return new URL(el.src).hostname === 'js.stripe.com'; }
                        catch { return false; } }).length));
    expect(anzahl, `drei Aufrufe hängten ${anzahl} Skripte ein`).toBe(1);
  });

  test('nach einem Fehler ist ein zweiter Versuch möglich', async ({ page }) => {
    // Ein gemerktes ABGELEHNTES Versprechen würde die Kasse für die ganze
    // Sitzung sperren: eine Netzstörung von zwei Sekunden kostete dann den
    // Kauf. Deshalb wird der Speicher im Fehlerfall geleert.
    await stripeAttrappe(page, 'fehler');
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.ebStripeJsLaden === 'function');
    const ersterFehler = await page.evaluate(() =>
      window.ebStripeJsLaden().then(() => 'ok').catch(() => 'fehler'));
    expect(ersterFehler, 'der erste Versuch hätte scheitern müssen').toBe('fehler');

    // Jetzt antwortet der Host wieder.
    await page.unroute(`**${STRIPE_HOST}/**`);
    await stripeAttrappe(page, 'ok');
    const zweiter = await page.evaluate(() =>
      window.ebStripeJsLaden().then(() => typeof window.Stripe).catch((e) => 'FEHLER: ' + e.message));
    expect(zweiter, 'nach einem Fehler bleibt die Kasse gesperrt').toBe('function');
  });

  test('eine leere Antwort gilt als Fehler, nicht als Erfolg', async ({ page }) => {
    // Ein Zwischenspeicher oder ein Filter kann eine leere 200 liefern. Das
    // `onload` feuert dann trotzdem — geladen ist nicht dasselbe wie
    // brauchbar, und ein Erfolg hier führte zu `Stripe is not a function`
    // mitten im Zahlungsdialog.
    await stripeAttrappe(page, 'leer');
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof window.ebStripeJsLaden === 'function');
    const r = await page.evaluate(() =>
      window.ebStripeJsLaden().then(() => 'ok').catch(() => 'fehler'));
    expect(r, 'eine leere Antwort wurde als Erfolg gewertet').toBe('fehler');
  });
});

test.describe('Die unbedingte Einbindung kommt nicht zurück', () => {
  test('functions.php bindet Stripe nicht mehr ein', () => {
    // Wer es dort wieder einträgt, macht die Umstellung lautlos rückgängig —
    // die Zahlung funktioniert ja weiterhin, und nur der Datenfluss ist
    // wieder da.
    const php = lies('functions.php')
      .split('\n').filter((z) => !/^\s*[*\/]/.test(z)).join('\n');
    expect(php, 'Stripe.js wird wieder unbedingt eingebunden')
      .not.toMatch(/wp_enqueue_script\(\s*'stripe-js'/);
    expect(php, 'app.js hängt wieder von stripe-js ab')
      .not.toMatch(/array\([^)]*'stripe-js'/);
  });

  test('keine Shell zieht die Verbindung vor', () => {
    // Ein Preconnect auf jeder Seite wäre genau der Drittanbieter-Kontakt,
    // den die Umstellung beseitigt — nur ohne den Nutzen, den er früher
    // hatte.
    // Kommentare zählen nicht — die erklärenden Absätze in index.php nennen
    // den entfernten preconnect ausdrücklich. Der Griff dafür steht in
    // lib/html-kommentare.js und wird NICHT hier nachgebaut; genau das hat
    // `pruefhygiene.spec.js` an der ersten Fassung dieser Datei bemängelt.
    for (const datei of ['index.php', 'index.local-head.html', 'index.html']) {
      const treffer = trefferAusserhalbKommentaren(
        lies(datei), /rel="preconnect"[^>]*js\.stripe\.com/g);
      expect(treffer, `${datei} zieht die Verbindung zu Stripe vor`).toHaveLength(0);
    }
  });

  test('die Dev-Shell verhält sich wie die Produktion', () => {
    // Lief Stripe lokal eager und in der Produktion bedarfsgesteuert, wäre
    // der Unterschied genau dort unsichtbar, wo man ihn testet.
    const treffer = trefferAusserhalbKommentaren(
      lies('index.local-foot.html'), /<script[^>]*js\.stripe\.com/g);
    expect(treffer, 'die Dev-Shell lädt Stripe weiterhin fest').toHaveLength(0);
  });

  test('die CSP erlaubt den Host weiterhin', () => {
    // Das nachgeladene Skript kommt von js.stripe.com und fällt unter
    // dieselbe script-src-Regel. Wer den Host aus der CSP nimmt, weil „wir
    // laden Stripe ja nicht mehr", legt die Zahlung still lahm.
    const php = lies('functions.php');
    expect(php, 'js.stripe.com fehlt in script-src — die Zahlung wäre blockiert')
      .toMatch(/script-src[^"]*https:\/\/js\.stripe\.com/);
  });
});
