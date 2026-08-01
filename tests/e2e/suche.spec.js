// Such-Tests: Natürliche Sätze müssen Treffer liefern, Unsinn 0.
//
// Hintergrund (Auftrag Fable 5): Produktionsfehler „Suche ohne Treffer bei
// natürlichen Sätzen“ (fix 8eb5b2b). Diese Suite hält den Fix fest und
// verhindert, dass die Tokenizer-/Synonym-Logik still regressiert.
const { test, expect } = require('@playwright/test');
const { openApp, runSearch, expectNoPageErrors } = require('./helpers');

// Natürliche Formulierungen echter Nutzer → müssen Treffer liefern
const NATUERLICHE_SAETZE = [
  'Ich suche einen DJ für meine Hochzeit',
  'Wir brauchen Catering für unsere Firmenfeier',
  'Fotograf für unsere Hochzeit gesucht',
  'DJ Hochzeit',
  'Location für Geburtstag',
  'Wer macht Musik auf unserer Party?',
];

// Unsinn → muss ehrlich 0 Treffer melden (mit Alternativen-Ansicht)
const UNSINN = [
  'xyzqwertz blorbfink',
  'asdfghjkl qwertzuiop',
];

test.describe('Suche: natürliche Sätze', () => {
  for (const satz of NATUERLICHE_SAETZE) {
    test(`"${satz}" liefert Treffer`, async ({ page }) => {
      const errors = await openApp(page);
      const result = await runSearch(page, satz);
      expect(result.hits, `Suche "${satz}" muss Treffer liefern`).toBeGreaterThan(0);
      expectNoPageErrors(errors, `Suche "${satz}"`);
    });
  }

  for (const quatsch of UNSINN) {
    test(`Unsinn "${quatsch}" liefert 0 Treffer + Alternativen`, async ({ page }) => {
      const errors = await openApp(page);
      const result = await runSearch(page, quatsch);
      expect(result.hits).toBe(0);
      expect(result.noResVisible, 'Empty-State mit Alternativen muss sichtbar sein').toBe(true);
      expectNoPageErrors(errors, `Unsinn-Suche "${quatsch}"`);
    });
  }

  test('Suche mit Ort filtert korrekt (dj + berlin)', async ({ page }) => {
    const errors = await openApp(page);
    const alle = await runSearch(page, 'dj');
    const berlin = await runSearch(page, 'dj', 'berlin');
    expect(alle.hits).toBeGreaterThan(0);
    expect(berlin.hits).toBeGreaterThan(0);
    expect(berlin.hits, 'Ortsfilter muss die Treffermenge einschränken oder gleich lassen')
      .toBeLessThanOrEqual(alle.hits);
    expectNoPageErrors(errors, 'Ortsfilter');
  });

  test('Satz-Vervollständigung (_ebSuggest) liefert Vorschlag für angefangenen Satz', async ({ page }) => {
    const errors = await openApp(page);
    const suggestion = await page.evaluate(() => {
      if (typeof _ebSuggest !== 'function') return null;
      const s = _ebSuggest('Ich suche einen DJ für meine Hoch');
      return s ? JSON.stringify(s).slice(0, 400) : 'null';
    });
    expect(suggestion, '_ebSuggest muss existieren').not.toBeNull();
    expect(suggestion).not.toBe('null');
    expectNoPageErrors(errors, 'Satz-Vervollständigung');
  });

  test('Personalisierung bleibt lokal: Suche löst keinen Server-Request mit Suchbegriff aus', async ({ page }) => {
    // Leitplanke 5: Keine Suchbegriffe an den Server.
    const outgoing = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://127.0.0.1')) return; // externe CDNs egal
      outgoing.push(url);
    });
    const errors = await openApp(page);
    await runSearch(page, 'geheimwort-das-nie-den-browser-verlassen-darf');
    await page.waitForTimeout(600);
    const leaks = outgoing.filter((u) => u.includes('geheimwort'));
    expect(leaks, 'Suchbegriffe dürfen den Browser nicht verlassen').toEqual([]);
    expectNoPageErrors(errors, 'Lokalitäts-Check');
  });
});
