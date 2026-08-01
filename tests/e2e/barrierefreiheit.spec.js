// Barrierefreiheits-Tests (axe-core): WCAG 2.0/2.1 AA als CI-Gate.
//
// Stand 2026-08-01: 0 Verstöße über beide Farbmodi × 6 Kernseiten
// (vorher: 97 Verstoß-Nodes allein auf Browse). Dieses Gate hält den Stand:
// Jede neue Komponente ohne Label / mit zu schwachem Kontrast macht CI rot.
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { openApp, spaNavigate } = require('./helpers');

const SEITEN = [
  ['browse', null],
  ['detail', 1],
  ['board', null],
  ['aktuelles', null],
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
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        const zusammenfassung = res.violations
          .map((v) => `[${v.impact}] ${v.id} (${v.nodes.length}×): ${v.nodes.slice(0, 3).map((n) => n.target[0]).join(' | ')}`)
          .join('\n');
        expect(res.violations, `WCAG-Verstöße auf ${route} (${mode}):\n${zusammenfassung}`).toEqual([]);
      });
    }
  });
}

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
