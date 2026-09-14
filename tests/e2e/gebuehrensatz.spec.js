// Der Provisionssatz — eine Zahl, und sie kommt vom Server.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// `functions.php` liest den Satz über `eb_stripe_platform_fee_rate()` aus
// der Konstante `EB_PLATFORM_FEE_RATE` in `wp-config.php` und schickt ihn
// als `application_fee_amount` an Stripe. Er ist also ein
// Betriebsparameter, den der Inhaber jederzeit umstellen kann.
//
// Am 14.09.2026 nachgezählt, was das Frontend daraus machte:
//
//   drei feste Zahlen   EB_PLATFORM_FEE_RATE / EB_STRIPE_FEE_RATE /
//                       EB_STRIPE_FEE_FIXED, alle hart im Code
//   acht Textstellen    „3%" ausgeschrieben — darunter der
//                       Abrechnungsbeleg aus `downloadBusinessInvoice()`,
//                       zwei Nachrichten an den Dienstleister und die
//                       Buchungserklärung in der Shell
//
// Hätte der Inhaber die Konstante gesetzt, wären alle acht falsch
// geworden, ohne dass jemand eine Zeile anfasst: die Auszahlung im
// Cockpit, die Rechnung, die Zusage im Chat. Der Kommentar über der alten
// Definition nannte sich selbst einen „Spiegel" der PHP-Funktion — und
// beschrieb damit genau die Drift, gegen die er nichts unternahm.
//
// Gemessen wird deshalb die WIRKUNG bei einem GEÄNDERTEN Satz. Ein Test,
// der nur den Regelfall prüft, ist bei 3 % grün und sagt nichts über den
// Fall, für den es die Konstante gibt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { ohneJsKommentare } = require('./lib/js-code');
const { phpOhneKommentare } = require('./lib/php-code');
const { warteAufAppBereit } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const MODULE = path.join(WURZEL, 'js', 'modules');

/** Öffnet die Seite so, als käme der Satz vom Server. */
async function mitSatz(page, gebuehren) {
  if (gebuehren) {
    await page.addInitScript((g) => {
      window.eventboerseApi = Object.assign({}, window.eventboerseApi, { gebuehren: g });
    }, gebuehren);
  }
  await page.goto('/');
  await warteAufAppBereit(page);
}

function jsModule() {
  const aus = [];
  const gehe = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) gehe(p);
      else if (e.name.endsWith('.js')) aus.push(p);
    }
  };
  gehe(MODULE);
  return aus;
}

test.describe('Der Provisionssatz kommt vom Server', () => {
  test('ohne Angabe gilt der Regelfall', async ({ page }) => {
    // Die Dev-Shell hat kein `eventboerseApi`. Fiele der Rückfall weg,
    // stünde hier `NaN` — und jede Auszahlung wäre keine Zahl.
    await mitSatz(page, null);
    const stand = await page.evaluate(() => ({
      satz: EB_PLATFORM_FEE_RATE,
      stripe: EB_STRIPE_FEE_RATE,
      fix: EB_STRIPE_FEE_FIXED,
      text: ebProvisionText(),
      auszahlung: calculatePayout(100).platformFeeAmount,
    }));
    expect(stand.satz, 'der Rückfall auf den Regelsatz fehlt').toBe(0.03);
    expect(stand.stripe).toBe(0.015);
    expect(stand.fix).toBe(0.25);
    expect(stand.text).toBe('3 %');
    expect(stand.auszahlung, 'die Provision auf 100 € ist nicht 3 €').toBe(3);
  });

  test('ein anderer Satz erreicht die RECHNUNG', async ({ page }) => {
    // Der Kern. Vorher stand hier eine feste 0.03, und diese Zusicherung
    // wäre trotzdem grün gewesen — deshalb wird mit 7 % gemessen.
    await mitSatz(page, { plattformSatz: 0.07, stripeSatz: 0.02, stripeFixCent: 30 });
    const q = await page.evaluate(() => ({
      satz: EB_PLATFORM_FEE_RATE,
      quote: calculatePayout(200),
      stripe: EB_STRIPE_FEE_RATE,
      fix: EB_STRIPE_FEE_FIXED,
    }));
    expect(q.satz, 'der Satz des Servers kommt nicht an').toBe(0.07);
    expect(q.quote.platformFeeAmount, 'die Provision rechnet weiter mit 3 % — '
      + 'der Dienstleister sähe eine Auszahlung, die es nicht gibt').toBe(14);
    expect(q.quote.platformFeeRate).toBe(0.07);
    // Die zwei Nachbarn gehören zum selben Modell und zur selben Lücke.
    expect(q.stripe, 'der Stripe-Satz folgt dem Server nicht').toBe(0.02);
    expect(q.fix, 'der Stripe-Fixbetrag folgt dem Server nicht (Cent → Euro)').toBe(0.3);
  });

  test('ein anderer Satz erreicht den TEXT', async ({ page }) => {
    // Eine richtige Zahl neben einem falschen Satz ist nicht halb richtig.
    // „Eventbörse behält 3 % ein" ist eine Aussage über Geld, abgegeben im
    // Moment der Buchung — dieselbe Klasse wie der Empfänger, der drei
    // Monate lang in der Rechnungsmail zugesagt wurde und nicht mitlas.
    await mitSatz(page, { plattformSatz: 0.045 });
    const t = await page.evaluate(() => {
      var stellen = [].slice.call(document.querySelectorAll('[data-eb-provision]'));
      return { text: ebProvisionText(), shell: stellen.map(function (e) { return e.textContent; }) };
    });
    expect(t.text, 'der Satz wird nicht als deutscher Text gebildet').toBe('4,5 %');
    expect(t.shell.length, 'die Buchungserklärung hat keine Stelle für den Satz — '
      + 'dann steht dort wieder eine feste Zahl').toBeGreaterThan(0);
    for (const s of t.shell) {
      expect(s, 'die feste Erklärung in der Shell wurde nicht gefüllt und '
        + 'behauptet weiter den alten Satz').toBe('4,5 %');
    }
  });

  test('ein unsinniger Satz wird abgewiesen', async ({ page }) => {
    // 5 hiesse 500 %. Eine kaputte oder verfälschte Antwort darf keine
    // Provision erfinden — die Grenzen sind dieselben, die PHP setzt.
    await mitSatz(page, { plattformSatz: 5, stripeSatz: -1, stripeFixCent: 99999 });
    const stand = await page.evaluate(() => ({
      satz: EB_PLATFORM_FEE_RATE, stripe: EB_STRIPE_FEE_RATE, fix: EB_STRIPE_FEE_FIXED,
    }));
    expect(stand.satz, 'ein Satz über der PHP-Grenze wird übernommen').toBe(0.03);
    expect(stand.stripe, 'ein negativer Satz wird übernommen').toBe(0.015);
    expect(stand.fix, 'ein Fixbetrag über der PHP-Grenze wird übernommen').toBe(0.25);
  });

  test('kein Modul schreibt den Satz mehr aus', async ({ page }) => {
    // Die Regel, nicht der Einzelfall: neben dem Wort „Provision" darf
    // keine feste Prozentzahl stehen. Ein Test auf die acht bekannten
    // Fundstellen fände die neunte nie.
    const funde = [];
    for (const datei of jsModule()) {
      const quelle = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      for (const m of quelle.matchAll(/Provision/gi)) {
        const fenster = quelle.slice(Math.max(0, m.index - 40), m.index + 60);
        const zahl = fenster.match(/\d+(?:[.,]\d+)?\s*%/);
        if (zahl) funde.push(path.relative(WURZEL, datei) + ': …' + fenster.trim() + '…');
      }
    }
    expect(funde, `hier steht der Satz wieder als feste Zahl neben dem Wort `
      + `„Provision":\n${funde.join('\n')}`).toEqual([]);
  });

  test('genau EINE Definition, sonst gewinnt die spätere', async ({ page }) => {
    // `app.js` ist eine Verkettung. Zwei `var` gleichen Namens sind kein
    // Fehler, die spätere Zuweisung gewinnt einfach — und das war hier
    // schon zweimal der Grund für toten Code (`renderFeed`,
    // `_fetchWithTimeout`). Bei einem Geldsatz wäre es teurer.
    const namen = ['EB_PLATFORM_FEE_RATE', 'EB_STRIPE_FEE_RATE', 'EB_STRIPE_FEE_FIXED'];
    for (const name of namen) {
      let n = 0;
      for (const datei of jsModule()) {
        const quelle = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
        n += (quelle.match(new RegExp('(?:^|\\n)\\s*var\\s+' + name + '\\s*=', 'g')) || []).length;
      }
      expect(n, `\`${name}\` wird ${n}-mal definiert — bei mehr als einer `
        + `Definition entscheidet die Reihenfolge in modules.list, welcher `
        + `Satz gilt`).toBe(1);
    }
  });

  test('der Server liefert die Sätze wirklich aus', async ({ page }) => {
    // Ohne diese Zeilen in `functions.php` fiele das Frontend dauerhaft auf
    // den Rückfall zurück — leise, und mit einem Satz, der zufällig heute
    // stimmt. Nicht messen ist kein Bestehen.
    //
    // GEMESSEN WIRD NACH ABZUG DER KOMMENTARE, und das ist keine Zierde:
    // die erste Fassung dieses Tests überlebte die Mutation
    // „`eb_stripe_platform_fee_rate()` durch 0.03 ersetzt", weil der
    // erklärende Kommentar direkt über der Zeile denselben Funktionsnamen
    // nennt. Zum fünften Mal an einem Tag dieselbe Ursache — der Griff
    // dafür lag längst in `lib/php-code.js`.
    const php = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    const block = php.slice(php.indexOf("'eventboerseApi'"));
    const ende = block.indexOf(') );');
    const localize = block.slice(0, ende > 0 ? ende : 4000);
    expect(localize, 'der Plattformsatz wird nicht an den Browser geliefert')
      .toContain('eb_stripe_platform_fee_rate()');
    expect(localize, 'der Stripe-Satz wird nicht geliefert')
      .toContain('eb_stripe_processing_fee_rate()');
    expect(localize, 'der Stripe-Fixbetrag wird nicht geliefert')
      .toContain('eb_stripe_processing_fee_fixed_cents()');
  });
});
