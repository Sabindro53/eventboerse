// ════════════════════════════════════════════════════════════════════════
// Die Überschrift der Landeseite
//
// Am 01.10.2026 auf Wunsch des Inhabers geändert: aus „EVENTBÖRSE, finde
// dein Event ©" wurde „EVENTBÖRSE, PLANE DEIN PERFEKTES EVENT."
//
// Das ist nicht nur ein Austausch von Text. `.ai-hero-line2` trug
// `white-space: nowrap` — gesetzt, damit das frühere `©` nicht von seinem
// Wort abbrach. Die neue Zeile ist 27 Zeichen in GROSSBUCHSTABEN statt 16
// gemischt; mit nowrap wäre sie bei 390 px aus dem Bild gelaufen und hätte
// die ganze Landeseite querscrollbar gemacht.
//
// Gemessen wird deshalb die WIRKUNG an drei Breiten, nicht das Markup: ein
// Test auf „der Text steht da" wäre bei einer abgeschnittenen Zeile grün.
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { openApp, warteAufAppBereit } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const PAROLE = 'PLANE DEIN PERFEKTES EVENT.';
const BREITEN = [
  { name: 'Telefon', w: 390, h: 844 },
  { name: 'Tablet', w: 768, h: 1024 },
  { name: 'Desktop', w: 1280, h: 900 },
];

test.describe('Hero-Überschrift', () => {
  test('die Parole steht wirklich auf der Seite', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const h1 = page.locator('.ai-hero-h1');
    await expect(h1).toBeVisible();
    const text = (await h1.innerText()).replace(/\s+/g, ' ').trim();
    // Marke, Komma und Parole — in dieser Reihenfolge.
    expect(text).toMatch(/^EVENTBÖRSE,\s*PLANE DEIN PERFEKTES EVENT\.$/);
  });

  for (const b of BREITEN) {
    test(`kein Querscroll bei ${b.w} px (${b.name})`, async ({ page }) => {
      await page.setViewportSize({ width: b.w, height: b.h });
      await openApp(page);
      await warteAufAppBereit(page);

      const r = await page.evaluate(() => {
        const el = document.querySelector('.ai-hero-line2');
        const k = el.getBoundingClientRect();
        return {
          // scrollWidth > clientWidth heisst: der Inhalt ist breiter als
          // sein Kasten — genau das, was nowrap hier erzeugt hätte.
          zeileUeberlaeuft: el.scrollWidth > el.clientWidth + 1,
          rechts: k.right,
          fensterBreite: document.documentElement.clientWidth,
          seiteScrollt: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          umbruch: getComputedStyle(el).whiteSpace,
        };
      });
      expect(r.umbruch, 'nowrap ist hier ein Querscroll-Fehler').not.toBe('nowrap');
      expect(r.zeileUeberlaeuft, `${b.name}: die Zeile ist breiter als ihr Kasten`).toBe(false);
      expect(r.rechts, `${b.name}: die Zeile ragt aus dem Fenster`).toBeLessThanOrEqual(r.fensterBreite + 1);
      // Die ganze Seite, nicht nur die Überschrift: ein einziges zu breites
      // Element macht jede Geste auf dem Telefon unsauber.
      expect(r.seiteScrollt, `${b.name}: die Landeseite scrollt seitwärts`).toBe(false);
    });
  }

  test('die Verlaufsschrift bleibt lesbar, nicht transparent ins Nichts', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const r = await page.evaluate(() => {
      const g = getComputedStyle(document.querySelector('.ai-hero-gradient'));
      const b = getComputedStyle(document.querySelector('.ai-hero-brand'));
      return {
        gVerlauf: g.backgroundImage,
        gClip: g.webkitBackgroundClip || g.backgroundClip,
        bVerlauf: b.backgroundImage,
      };
    });
    // Dieselbe Eigenschaft, die `css-minify.spec.js` gegen den Minifier
    // hält: ohne `background-clip: text` wird aus der Verlaufsschrift ein
    // Farbblock, und bei `-webkit-text-fill-color: transparent` ein
    // unsichtbarer. Hier geprüft, weil die Zeile neu ist.
    expect(r.gVerlauf).toContain('gradient');
    expect(r.gClip).toBe('text');
    expect(r.bVerlauf).toContain('gradient');
  });

  test('die Zeile bricht auf dem Telefon wirklich um, statt zu schrumpfen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await warteAufAppBereit(page);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.ai-hero-line2');
      const k = el.getBoundingClientRect();
      const zeilenhoehe = parseFloat(getComputedStyle(el).lineHeight) ||
        parseFloat(getComputedStyle(el).fontSize) * 1.1;
      return { hoehe: k.height, zeilenhoehe, groesse: parseFloat(getComputedStyle(el).fontSize) };
    });
    // Gegenprobe zum Test darüber: „kein Überlauf" wäre auch erfüllt, wenn
    // jemand die Schrift auf 10 px schrumpfte. Zwei Zeilen bei voller Grösse
    // sind das gewollte Ergebnis.
    expect(r.groesse, 'die Überschrift darf nicht kleingerechnet werden').toBeGreaterThanOrEqual(24);
    expect(r.hoehe, 'bei 390 px braucht die Parole mehr als eine Zeile')
      .toBeGreaterThan(r.zeilenhoehe * 1.4);
  });

  test('die alte Parole und ihre verwaiste Regel sind weg', () => {
    const shell = fs.readFileSync(path.join(WURZEL, 'app-shell.html'), 'utf8');
    const css = fs.readFileSync(path.join(WURZEL, 'styles.css'), 'utf8');
    expect(shell, 'die alte Parole steht noch im Markup').not.toContain('finde dein Event');
    expect(shell, 'die Parole muss im Markup stehen').toContain(PAROLE);
    // `.ai-hero-cr` hat kein Subjekt mehr. Eine CSS-Regel ohne Element
    // überlebt jeden Umbau — dieselbe Klasse wie die Konfetti-Popper hinter
    // `display: none`.
    expect(shell).not.toContain('ai-hero-cr');
    expect(css, 'die Regel für das © hat kein Subjekt mehr').not.toMatch(/\.ai-hero-cr\s*\{/);
  });

  test('index.html ist aus app-shell.html gebaut', () => {
    // Die Dev-Shell ist generiert. Wer nur die Quelle ändert, prüft lokal
    // eine Seite, die es live nicht gibt — daran ist am 06.09.2026 ein
    // ganzer Mutationsdurchgang gescheitert.
    const dev = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
    expect(dev).toContain(PAROLE);
    expect(dev).not.toContain('finde dein Event');
  });
});
