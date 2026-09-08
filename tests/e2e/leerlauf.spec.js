// Was die Seite kostet, wenn der Nutzer NICHTS tut.
//
// Gemeldet am 08.09.2026: „ist etwas langsam, fühlt sich nicht liquid an".
// Das ist kein Ladezeit-Befund — es ist der Hauptthread, der nie zur Ruhe
// kommt. Im echten Chromium gemessen, 4 Sekunden Leerlauf auf der
// Startseite:
//
//   vorher   492 ms Hauptthread-Arbeit, 237 Stil-Neuberechnungen
//   nachher   73 ms,                     37
//
// Die Ursache war eine Animation in einem GESCHLOSSENEN Dropdown.
// `opacity: 0` heisst für den Browser nicht „weg", sondern „gerendert und
// durchsichtig": die Animation lief weiter, 60-mal pro Sekunde, für einen
// Farbverlauf, den niemand sieht. Nur `display: none` nimmt eine Animation
// wirklich aus dem Lauf — und das kann das Overlay nicht benutzen, es
// braucht `opacity` für sein Ein- und Ausblenden.
//
// WARUM 826 GRÜNE TESTS DAS DURCHGELASSEN HABEN: keiner hat je den
// Leerlauf gemessen. Jeder prüfte, was nach einer Handlung passiert — und
// die Kosten entstehen, wenn nichts passiert.
//
// Die naheliegende Erklärung wäre `reducedMotion: 'reduce'` in der
// playwright.config.js gewesen. Sie ist falsch, und zwar gemessen: am
// kaputten Zustand ergaben beide Modi dasselbe — 240 Neuberechnungen mit
// `reduce`, 241 ohne. Der `prefers-reduced-motion`-Block in styles.css
// setzt nur die DAUER auf ~0; die Animation läuft weiter und rechnet
// weiter jeden Frame neu. Wer Bewegungsreduktion einschaltet, zahlt
// denselben Preis und sieht die Bewegung bloss nicht.
//
// `no-preference` steht hier trotzdem: gemessen werden soll, was ein
// normaler Besucher bekommt, nicht was die Testvoreinstellung ergibt.
const { test, expect } = require('@playwright/test');

test.use({ reducedMotion: 'no-preference' });   // wie ein echter Besucher

/** Alle endlos laufenden Animationen mit ihrem Sichtbarkeitsbefund. */
async function dauerAnimationen(page) {
  return page.evaluate(() => {
    const raus = [];
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.getTiming && a.effect.getTiming();
      if (!t || t.iterations !== Infinity) continue;
      const ziel = a.effect.target;
      if (!ziel) continue;

      let grund = '';
      for (let el = ziel; el && el !== document.documentElement; el = el.parentElement) {
        const s = getComputedStyle(el);
        const wer = el.className || el.tagName;
        if (parseFloat(s.opacity) === 0) { grund = `opacity:0 an .${wer}`; break; }
        if (s.visibility === 'hidden') { grund = `visibility:hidden an .${wer}`; break; }
      }
      raus.push({
        name: a.animationName || '(css)',
        ziel: String(ziel.className || ziel.tagName) + (a.effect.pseudoElement || ''),
        unsichtbar: grund,
      });
    }
    return raus;
  });
}

test.describe('Leerlauf: was die Seite kostet, wenn niemand etwas tut', () => {
  test('keine Dauer-Animation läuft auf einem unsichtbaren Element', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(2500);
    const alle = await dauerAnimationen(page);

    // Ohne Subjekt prüft der Test nichts. Genau diese Verwechslung liess
    // den toten Gitleaks-Scan vier Monate wie Schutz aussehen.
    expect(alle.length, 'es läuft gar keine Dauer-Animation — dann ist diese '
      + 'Prüfung blind (läuft die Seite versehentlich mit reducedMotion?)')
      .toBeGreaterThan(0);

    const blind = alle.filter((a) => a.unsichtbar);
    expect(blind.map((a) => `${a.name} auf ${a.ziel} (${a.unsichtbar})`),
      'diese Animationen laufen dauerhaft auf etwas, das niemand sieht. '
      + '`opacity: 0` nimmt sie NICHT aus dem Lauf — die Regel gehört hinter '
      + 'die Klasse, die das Element sichtbar macht').toEqual([]);
  });

  test('das geöffnete Overlay animiert wieder — gedrosselt, nicht gelöscht', async ({ page }) => {
    // Die Gegenprobe zur Regel oben. Ohne sie wäre „einfach löschen" der
    // bequemste Weg, den Test grün zu bekommen, und die Gestaltung wäre weg.
    await page.goto('/index.html');
    await page.waitForTimeout(2000);
    const zu = (await dauerAnimationen(page)).map((a) => a.name).sort();

    await page.evaluate(() => document.getElementById('navAiOverlay').classList.add('show'));
    await page.waitForTimeout(400);
    const offen = (await dauerAnimationen(page)).map((a) => a.name).sort();

    expect(offen.length, 'im geöffneten Overlay laufen nicht mehr Animationen '
      + 'als im geschlossenen — dann wurde die Gestaltung entfernt statt '
      + 'gedrosselt').toBeGreaterThan(zu.length);
    expect(offen, 'der Farbverlauf im Overlay-Kopf fehlt')
      .toContain('navAiGradient');
  });

  test('der Hauptthread kommt im Leerlauf zur Ruhe', async ({ page }) => {
    // Gezählt wird, nicht gestoppt: Stil-Neuberechnungen sind vom Tempo des
    // Rechners fast unabhängig, Millisekunden nicht. Vorher waren es 237 in
    // vier Sekunden (60 pro Sekunde — jeden Frame), jetzt 37. Die Schranke
    // liegt bei 150: weit genug für einen langsamen Runner, eng genug, dass
    // eine frameweise Neuberechnung sie reisst.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const zaehler = async () => {
      const { metrics } = await cdp.send('Performance.getMetrics');
      return Object.fromEntries(metrics.map((x) => [x.name, x.value])).RecalcStyleCount;
    };

    await page.goto('/index.html');
    await page.waitForTimeout(2500);
    const vor = await zaehler();
    await page.waitForTimeout(4000);          // vier Sekunden nichts tun
    const nach = await zaehler();

    expect(nach - vor, 'die Startseite rechnet im Leerlauf ihre Stile neu, '
      + 'als würde jemand scrollen. Meist eine Animation, die auf etwas '
      + 'Unsichtbarem läuft — der Test darüber nennt sie').toBeLessThan(150);
  });
});
