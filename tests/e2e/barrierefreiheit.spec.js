// Barrierefreiheits-Tests (axe-core): WCAG 2.0/2.1/2.2 AA als CI-Gate.
//
// Stand 2026-08-01: 0 Verstöße über beide Farbmodi × 6 Kernseiten
// (vorher: 97 Verstoß-Nodes allein auf Browse). Dieses Gate hält den Stand:
// Jede neue Komponente ohne Label / mit zu schwachem Kontrast macht CI rot.
//
// ── WARUM SEIT DEM 10.09.2026 AUCH 2.2 ──────────────────────────────────
//
// Die Kennungsliste endete bei `wcag21aa`. Damit konnte dieses Tor die
// Kriterien der Fassung 2.2 GAR NICHT SEHEN — nicht falsch gemessen,
// sondern nie gefragt. Und genau dort liegt SC 2.5.8 „Target Size
// (Minimum)": 24×24 px Mindestgröße für Bedienelemente.
//
// Gemessen ergab das EINEN Verstoß in der ganzen Anwendung, und der war
// ernst: 25 Galerie-Punkte auf den Inseratskarten mit 7×7 px Trefferfläche
// (axe: `target-size`, Schweregrad `serious`). Behoben in `styles.css` —
// der sichtbare Punkt blieb 7 px, die Fläche wurde 24 px.
//
// Das ist nicht nur Höflichkeit: das Barrierefreiheitsstärkungsgesetz gilt
// seit dem 28.06.2025 für den elektronischen Geschäftsverkehr und verweist
// über EN 301 549 auf den jeweils geltenden WCAG-Stand.
//
// Ein Tor, dessen Kennungsliste hinter der Norm zurückbleibt, meldet grün
// für Kriterien, nach denen es nie gefragt hat — dieselbe Klasse wie ein
// Prüfer ohne Subjekt.
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { openApp, spaNavigate } = require('./helpers');
const fs = require('node:fs');

const SEITEN = [
  ['browse', null],
  ['detail', 1],
  ['board', null],
  ['aktuelles', null],
  ['freunde', null],
];

for (const mode of ['dark', 'light']) {
  test.describe(`Barrierefreiheit (${mode})`, () => {
    for (const [route, data] of SEITEN) {
      test(`${route}: WCAG AA ohne Verstöße`, async ({ page }) => {
        await openApp(page);
        await page.evaluate((m) => document.body.classList.toggle('dark-mode', m === 'dark'), mode);
        await spaNavigate(page, route, data);
        // Einblendanimationen ausklingen lassen — axe misst sonst
        // Übergangs-Mischfarben statt der stabilen Endfarben
        await page.waitForTimeout(1500);
        const res = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const zusammenfassung = res.violations
          .map((v) => `[${v.impact}] ${v.id} (${v.nodes.length}×): ${v.nodes.slice(0, 3).map((n) => n.target[0]).join(' | ')}`)
          .join('\n');
        expect(res.violations, `WCAG-Verstöße auf ${route} (${mode}):\n${zusammenfassung}`).toEqual([]);
      });
    }
  });
}

test.describe('Zielgrößen: was der Finger trifft', () => {
  // ── DER BEFUND VOM 10.09.2026 ─────────────────────────────────────────
  //
  // Das Tor darüber fängt das über axe. Dieser Test steht daneben, weil
  // seine Meldung SAGT, was falsch ist: eine axe-Ausgabe mit 75 Knoten
  // liest niemand, „Trefferfläche 7×7, gefordert 24×24" schon.
  //
  // Gemessen am Telefon, denn dort trifft ein Finger und kein Mauszeiger.
  test('die Galerie-Punkte sind 24 px breit — und sehen weiter aus wie 7 px', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openApp(page);
    const mass = await page.evaluate(() => {
      const d = [...document.querySelectorAll('.grid-gallery-dot')]
        .filter((b) => b.getBoundingClientRect().width > 0);
      if (!d.length) return null;
      const r = d[0].getBoundingClientRect();
      const vor = getComputedStyle(d[0], '::before');
      return {
        anzahl: d.length,
        breite: Math.round(r.width),
        hoehe: Math.round(r.height),
        sichtbar: parseFloat(vor.width) || 0,
      };
    });
    expect(mass, 'keine Galerie-Punkte gefunden — der Test hat kein Subjekt').toBeTruthy();
    expect(mass.breite, `Trefferfläche ${mass.breite}×${mass.hoehe} px, gefordert 24×24 (WCAG 2.2 SC 2.5.8)`)
      .toBeGreaterThanOrEqual(24);
    expect(mass.hoehe, `Trefferfläche ${mass.breite}×${mass.hoehe} px, gefordert 24×24 (WCAG 2.2 SC 2.5.8)`)
      .toBeGreaterThanOrEqual(24);
    // Die Gegenprobe: die Fläche wächst, der Punkt nicht. Ohne sie wäre die
    // Regel dadurch erfüllt, dass jemand die Punkte optisch aufbläst — und
    // die Karten sähen aus wie eine Perlenkette.
    expect(mass.sichtbar, `der sichtbare Punkt ist auf ${mass.sichtbar} px gewachsen`)
      .toBeLessThanOrEqual(12);
  });

  test('das Tor fragt auch nach WCAG 2.2', async () => {
    // ── WARUM DAS EIN EIGENER TEST IST ──────────────────────────────────
    //
    // Nachgemessen: mit der alten 7-px-Fläche UND einer Kennungsliste ohne
    // `wcag22aa` läuft die Suite oben mit 12 grünen Tests durch — über
    // einen Verstoß mit Schweregrad `serious` hinweg. Nicht falsch
    // gemessen, sondern nie gefragt.
    //
    // Verschwindet die Kennung wieder, ist dieses Tor für jedes Kriterium
    // der Fassung 2.2 blind, ohne dass irgendetwas rot würde. Genau davor
    // steht dieser Test.
    const quelle = fs.readFileSync(__filename, 'utf8');
    const zeile = quelle.match(/\.withTags\(\[([^\]]+)\]\)/);
    expect(zeile, 'die Kennungsliste ist nicht mehr auffindbar').toBeTruthy();
    expect(zeile[1], 'das Tor prüft WCAG 2.2 nicht mehr — SC 2.5.8 und die '
      + 'übrigen Kriterien der Fassung 2.2 fielen still heraus')
      .toContain('wcag22aa');
  });
});

test.describe('Tastaturbedienung', () => {
  test('Suchfeld ist per Tab erreichbar und Fokus sichtbar', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => document.getElementById('browseSearch').focus());
    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      return { id: el.id, outline: cs.outlineStyle, boxShadow: cs.boxShadow };
    });
    expect(focus.id).toBe('browseSearch');
    // Sichtbarer Fokus: Outline ODER Fokus-Ring (box-shadow)
    const sichtbar = focus.outline !== 'none' || (focus.boxShadow && focus.boxShadow !== 'none');
    expect(sichtbar, 'Fokus muss sichtbar sein (outline oder --eb-ring)').toBe(true);
  });

  test('Galerie-Dots tragen sprechende Labels', async ({ page }) => {
    await openApp(page);
    // Dots sind erst bei Karten-Hover sichtbar → auf DOM-Präsenz warten
    await page.waitForSelector('.grid-gallery-dot', { state: 'attached', timeout: 10000 });
    const fehlende = await page.evaluate(() =>
      [...document.querySelectorAll('.grid-gallery-dot')].filter((d) => !d.getAttribute('aria-label')).length
    );
    expect(fehlende, 'Alle Galerie-Dots brauchen aria-label').toBe(0);
  });
});
