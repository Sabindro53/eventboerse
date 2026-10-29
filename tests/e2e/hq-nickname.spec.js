// Der Nickname-Probelauf im HQ — Knopf und Bericht im echten Browser.
//
// Der Probelauf selbst wird in `social.spec.js` im echten PHP ausgeführt
// (zählt, plant, schreibt nichts). Hier geht es um das, was er dort nicht
// sehen kann: ob das HQ ihn erst auf Klick ruft und den Bericht so zeigt,
// dass man ihn lesen kann — und ob es ihn NICHT ruhig zeigt, wenn die
// Zahlen nicht zusammenpassen.
//
// ── NICHTS NACHGEBAUT ───────────────────────────────────────────────────
//
// Markup UND Skript werden aus `hq.html` herausgeschnitten. Ein Gerüst von
// Hand wäre eine zweite Fassung desselben Blocks; benennt jemand dort eine
// Kennung um, bliebe der Test grün und der echte Knopf tot.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const HQ = fs.readFileSync(path.join(__dirname, '..', '..', 'hq.html'), 'utf8');

const MARKUP = (() => {
  const von = HQ.indexOf('<div id="nick-block"');
  const bis = HQ.indexOf('<!-- nick-block:ende -->');
  if (von < 0 || bis < von) throw new Error('nick-block nicht in hq.html gefunden');
  return HQ.slice(von, bis);
})();

const SKRIPT = (() => {
  const marke = "const block = document.getElementById('nick-block');";
  const i = HQ.indexOf(marke);
  if (i < 0) throw new Error('Skript des nick-block nicht gefunden');
  const von = HQ.lastIndexOf('(function () {', i);
  const bis = HQ.indexOf('\n})();', i);
  return HQ.slice(von, bis + 6);
})();

const BERICHT = {
  probelauf: true,
  abgeschnitten: false,
  zaehlung: { konten: 10, gueltig: 6, auffindbar: 4, verborgen: 2, fehlt: 2, geleert: 1, ungueltig: 1, doppelt: 1, reserviert_bestand: 0 },
  plan: { wuerde_vergeben: 2, davon_neutral: 1, ohne_vorschlag: 0 },
  ungueltig: [44],
  doppelt: [[51, 52]],
  vorschau: [{ id: 7, nickname: 'max.mustermann' }, { id: 8, nickname: 'eventfan.8' }],
  schalter: false,
  marke: false,
};

/** Seite aus echtem Markup und Skript; `antwort` ist {status, daten}. */
async function baueSeite(page, antwort, admin = true) {
  await page.setContent('<!doctype html><meta charset="utf-8"><body>' + MARKUP + '</body>');
  await page.evaluate(([antwort, admin]) => {
    window.HQ_IST_ADMIN = admin;
    window.HQ_REST_NONCE = 'test-nonce';
    window.__rufe = [];
    window.fetch = function (url, opt) {
      window.__rufe.push({ url: String(url), methode: (opt && opt.method) || 'GET',
        nonce: opt && opt.headers && opt.headers['X-WP-Nonce'] });
      return Promise.resolve({
        ok: antwort.status < 400,
        status: antwort.status,
        json: () => Promise.resolve(antwort.daten),
      });
    };
  }, [antwort, admin]);
  await page.addScriptTag({ content: SKRIPT });
}

test.describe('HQ: Nickname-Probelauf', () => {
  test('beim Öffnen wird NICHTS gerufen — erst der Klick startet den Lauf', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: BERICHT });
    await expect(page.locator('#nick-block')).toBeVisible();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__rufe)).toEqual([]);
    await page.click('#nick-start');
    await expect.poll(() => page.evaluate(() => window.__rufe.length)).toBe(1);
    const ruf = (await page.evaluate(() => window.__rufe))[0];
    expect(ruf).toEqual({ url: '/wp-json/eventboerse/v1/hq/nicknames', methode: 'GET', nonce: 'test-nonce' });
  });

  test('ohne Verwaltungsrecht ist der Block weg, nicht nur versteckt', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: BERICHT }, false);
    await expect(page.locator('#nick-block')).toHaveCount(0);
  });

  test('der Bericht ist lesbar: Bestand, Plan, Vorschau, Altlasten, Schalter', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: BERICHT });
    await page.click('#nick-start');
    const b = page.locator('#nick-bericht');
    await expect(b).toBeVisible();
    await expect(b.getByRole('row', { name: /ohne Nickname\s+2/ })).toBeVisible();
    await expect(b.getByRole('row', { name: /würde vergeben \(verborgen\)\s+2/ })).toBeVisible();
    await expect(b.getByRole('row', { name: /Konto 7\s+@max\.mustermann/ })).toBeVisible();
    await expect(b).toContainText('Konten: 44');
    await expect(b).toContainText('[51, 52]');
    await expect(b).toContainText('EB_HANDLE_NACHTRAG: aus');
    await expect(page.locator('#nick-badge')).toHaveText('2 ohne Nickname');
    await expect(page.locator('#nick-stand')).toHaveText('Probelauf fertig — nichts wurde geändert.');
  });

  test('Zahlen, die nicht aufgehen, stehen als Warnung da — nicht als „fertig"', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: { ...BERICHT, zaehlung: { ...BERICHT.zaehlung, konten: 12 } } });
    await page.click('#nick-start');
    await expect(page.locator('#nick-stand')).toContainText('die Spalten gehen nicht auf (10 von 12)');
    await expect(page.locator('#nick-stand')).not.toContainText('fertig');
  });

  test('ein abgeschnittener Lauf sagt es', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: { ...BERICHT, abgeschnitten: true } });
    await page.click('#nick-start');
    await expect(page.locator('#nick-stand')).toContainText('nur die ersten 10 Konten');
  });

  test('eine Antwort ohne Probelauf-Bestätigung wird nicht als Probelauf ausgegeben', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: { ...BERICHT, probelauf: undefined } });
    await page.click('#nick-start');
    await expect(page.locator('#nick-stand')).toContainText('bestätigt keinen Probelauf');
  });

  test('ein Fehler steht da, der alte Bericht verschwindet, der Knopf geht wieder', async ({ page }) => {
    await baueSeite(page, { status: 200, daten: BERICHT });
    await page.click('#nick-start');
    await expect(page.locator('#nick-bericht')).toBeVisible();
    await page.evaluate(() => {
      window.fetch = () => Promise.resolve({ ok: false, status: 403,
        json: () => Promise.resolve({ message: 'Keine Berechtigung.' }) });
    });
    await page.click('#nick-start');
    await expect(page.locator('#nick-stand')).toHaveText('Probelauf nicht möglich: Keine Berechtigung.');
    await expect(page.locator('#nick-bericht')).toBeHidden();
    await expect(page.locator('#nick-start')).toBeEnabled();
  });

  test('fremder Text im Nickname bleibt Text', async ({ page }) => {
    const boese = '<img src=x onerror="window.__boese=1">';
    await baueSeite(page, { status: 200, daten: { ...BERICHT, vorschau: [{ id: 9, nickname: boese }] } });
    await page.click('#nick-start');
    await expect(page.locator('#nick-bericht')).toContainText(boese);
    await expect(page.locator('#nick-bericht img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__boese)).toBeUndefined();
  });
});
