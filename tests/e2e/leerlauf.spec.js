// Was die Seite kostet, wenn der Nutzer NICHTS tut.
//
// Gemeldet am 08.09.2026: „ist etwas langsam, fühlt sich nicht liquid an".
// Kein Ladezeit-Befund — der Hauptthread kam nie zur Ruhe. Im echten
// Chromium gemessen, Leerlauf auf der Startseite:
//
//   08.09.  Overlay-Verlauf in einem GESCHLOSSENEN Dropdown
//           492 ms → 73 ms Hauptthread je vier Sekunden
//   09.09.  Schreibmaschine in der Leiste + Deko ausserhalb des Bildes
//           649 ms → 486 ms je drei Sekunden, weit unten gemessen
//
// WARUM 830 GRÜNE TESTS DAS DURCHGELASSEN HABEN: keiner hat je den
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

test.use({ reducedMotion: 'no-preference' });

/**
 * Endlos laufende Animationen mit Sichtbarkeitsbefund.
 *
 * ZWEI AUSNAHMEN, beide nötig — ohne sie meldet der Prüfer Fehler, die
 * keine sind, und wird nach dem dritten Fehlalarm abgeschaltet:
 *
 *  · Wer seine eigene Deckkraft FÄHRT, ist nicht unsichtbar. Konfetti
 *    (`aiPopperBit`) beginnt bei `opacity: 0` und blendet sich selbst ein.
 *    Eine Momentaufnahme trifft es zwangsläufig irgendwann bei 0. Die
 *    erste Fassung dieses Prüfers meldete so 32 Fehlalarme.
 *  · Eine ANGEHALTENE Animation kostet nichts. `eb-deko-ruht` hält die
 *    Deko ausserhalb des Bildes an; sie steht dann berechtigt still.
 */
async function dauerAnimationen(page) {
  return page.evaluate(() => {
    const faehrtDeckkraft = new Set();
    for (const a of document.getAnimations()) {
      const el = a.effect && a.effect.target;
      if (!el) continue;
      try {
        for (const kf of a.effect.getKeyframes()) {
          if ('opacity' in kf || 'visibility' in kf) { faehrtDeckkraft.add(el); break; }
        }
      } catch (e) { /* egal */ }
    }

    const raus = [];
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.getTiming && a.effect.getTiming();
      if (!t || t.iterations !== Infinity) continue;
      if (a.playState !== 'running') continue;          // angehalten kostet nichts
      const ziel = a.effect.target;
      if (!ziel) continue;

      let grund = '';
      for (let el = ziel; el && el !== document.documentElement; el = el.parentElement) {
        const s = getComputedStyle(el);
        const wer = (typeof el.className === 'string' && el.className) || el.id || el.tagName;
        if (s.display === 'none') { grund = `display:none an .${wer}`; break; }
        if (faehrtDeckkraft.has(el)) continue;
        if (parseFloat(s.opacity) === 0) { grund = `opacity:0 an .${wer}`; break; }
        if (s.visibility === 'hidden') { grund = `visibility:hidden an .${wer}`; break; }
      }
      raus.push({
        name: a.animationName || '(css)',
        ziel: String((typeof ziel.className === 'string' && ziel.className) || ziel.tagName)
          + (a.effect.pseudoElement || ''),
        unsichtbar: grund,
      });
    }
    return raus;
  });
}

/** Startseite so, wie ein Besucher sie sieht — samt gerendertem Hero. */
async function startseite(page) {
  await page.goto('/index.html');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { navigateTo('home'); } catch (e) { /* egal */ } });
  await page.waitForTimeout(1200);
}

test.describe('Leerlauf: was die Seite kostet, wenn niemand etwas tut', () => {
  test('keine Dauer-Animation läuft auf einem unsichtbaren Element', async ({ page }) => {
    // Gemessen wird die GERENDERTE Startseite, nicht der Zustand direkt
    // nach dem Laden. Bis zum 09.09. stand hier nur `goto` — da waren erst
    // vier Animationen da, nach `navigateTo('home')` sind es 58. Ein Prüfer,
    // der einen Zwischenzustand misst, prüft die Seite nicht.
    await startseite(page);
    const alle = await dauerAnimationen(page);

    expect(alle.length, 'es läuft gar keine Dauer-Animation — dann ist diese '
      + 'Prüfung blind (läuft die Seite versehentlich mit reducedMotion?)')
      .toBeGreaterThan(10);

    const blind = alle.filter((a) => a.unsichtbar);
    expect(blind.map((a) => `${a.name} auf ${a.ziel} (${a.unsichtbar})`),
      'diese Animationen laufen dauerhaft auf etwas, das niemand sieht. '
      + '`opacity: 0` nimmt sie NICHT aus dem Lauf — die Regel gehört hinter '
      + 'die Klasse, die das Element sichtbar macht').toEqual([]);
  });

  test('das geöffnete Overlay animiert wieder — gedrosselt, nicht gelöscht', async ({ page }) => {
    // Die Gegenprobe. Ohne sie wäre „einfach löschen" der bequemste Weg,
    // den Test grün zu bekommen, und die Gestaltung wäre weg.
    await page.goto('/index.html');
    await page.waitForTimeout(2000);
    const zu = (await dauerAnimationen(page)).length;

    await page.evaluate(() => document.getElementById('navAiOverlay').classList.add('show'));
    await page.waitForTimeout(400);
    const offen = await dauerAnimationen(page);

    expect(offen.length, 'im geöffneten Overlay laufen nicht mehr Animationen '
      + 'als im geschlossenen — dann wurde die Gestaltung entfernt statt '
      + 'gedrosselt').toBeGreaterThan(zu);
    expect(offen.map((a) => a.name), 'der Farbverlauf im Overlay-Kopf fehlt')
      .toContain('navAiGradient');
  });

  test('die Schreibmaschine hört nach einer Runde auf', async ({ page }) => {
    // Sie schrieb alle 35–60 ms `textContent` neu, auf JEDER Seite, für
    // immer — jeder Schreibvorgang zieht Stil-Neuberechnung und Layout nach
    // sich. Nach allen fünf Beispielsätzen ist gesagt, was sie sagen soll.
    await page.addInitScript(() => {
      window.__offen = new Map();
      window.__jeErzeugt = 0;
      const si = window.setInterval, ci = window.clearInterval;
      window.setInterval = function (fn, ms, ...a) {
        const id = si.call(window, fn, ms, ...a);
        if (ms <= 250) { window.__offen.set(id, ms); window.__jeErzeugt++; }
        return id;
      };
      window.clearInterval = function (id) { window.__offen.delete(id); return ci.call(window, id); };
    });
    await page.goto('/index.html');
    await page.waitForTimeout(2000);

    // GEZÄHLT WIRD, WAS JE ERZEUGT WURDE, nicht was gerade offen ist.
    // Die Schreibmaschine pausiert zwischen zwei Sätzen absichtlich 2,4 s
    // ganz ohne Zeitgeber — eine Momentaufnahme trifft diese Lücke und
    // meldete „läuft gar nicht", während sie einwandfrei lief.
    const frueh = await page.evaluate(() => window.__jeErzeugt);
    expect(frueh, 'die Schreibmaschine läuft gar nicht erst an — dann '
      + 'prüft dieser Test nichts').toBeGreaterThan(0);

    await page.waitForTimeout(26000);            // eine volle Runde abwarten
    const spaet = await page.evaluate(() => ({
      offen: [...window.__offen.values()],
      text: (document.getElementById('navAiTyping') || {}).textContent || '',
    }));
    expect(spaet.offen, 'nach der Runde tickt immer noch ein schneller '
      + 'Zeitgeber — die Schreibmaschine läuft endlos weiter').toEqual([]);
    expect(spaet.text.trim().length, 'das Suchfeld steht am Ende ohne '
      + 'Beispielsatz da — ein Platzhalter, der verschwindet, nimmt dem Feld '
      + 'seine Erklärung').toBeGreaterThan(3);
  });

  test('Dekoration ausserhalb des Bildes hält an — und läuft danach weiter', async ({ page }) => {
    // Der Browser hält Animationen ausserhalb des Sichtfelds NICHT an.
    // Gemessen: weit unten waren 56 von 58 nicht im Bild und kosteten
    // trotzdem rund 250 ms Hauptthread je drei Sekunden.
    await startseite(page);
    const laufend = () => page.evaluate(() => document.getAnimations()
      .filter((a) => a.effect.getTiming().iterations === Infinity && a.playState === 'running')
      .length);

    // Die Laufzeit EINER bestimmten Animation, um Anhalten von Beenden zu
    // unterscheiden. `animation: none` sähe in der blossen Anzahl genauso
    // aus wie `paused` — nur beginnt danach alles von vorn.
    const uhr = () => page.evaluate(() => {
      const a = document.getAnimations().find((x) => x.animationName === 'heroFwRise');
      return a ? Math.round(a.currentTime || 0) : -1;
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2500);          // Vorlauf, damit die Uhr deutlich steht
    const oben = await laufend();
    const uhrOben = await uhr();

    await page.evaluate(() => window.scrollTo(0, 4000));
    await page.waitForTimeout(2500);
    const unten = await laufend();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    const zurueck = await laufend();
    const uhrZurueck = await uhr();

    expect(uhrOben, 'die Probe-Animation heroFwRise gibt es nicht mehr — '
      + 'dann misst dieser Test das Anhalten nicht').toBeGreaterThan(500);
    expect(uhrZurueck, `die Deko lief nach dem Zurückscrollen bei `
      + `${uhrZurueck} ms wieder an, vorher stand sie bei ${uhrOben} ms — sie `
      + 'wurde also BEENDET statt angehalten und beginnt von vorn. Das ist '
      + 'der Unterschied zwischen `animation-play-state: paused` und '
      + '`animation: none`').toBeGreaterThan(uhrOben * 0.8);

    expect(oben, 'oben läuft keine Deko — dann prüft dieser Test nichts')
      .toBeGreaterThan(10);
    expect(unten, `weit unten laufen weiterhin ${unten} von ${oben} Animationen. `
      + 'Der IntersectionObserver in ebDekoRuhenLassen() greift nicht, oder '
      + '.eb-deko-ruht hält nicht mehr an').toBeLessThan(oben / 2);
    // MINDESTENS so viele wie oben, nicht genau so viele. Beim Weg nach
    // unten bekommen weitere Abschnitte `.visible`, deren Animationen
    // danach zu Recht laufen — die erste Fassung verlangte Gleichheit und
    // fiel über die eigene Verbesserung (55 vor, 57 nach dem Scrollen).
    expect(zurueck, 'beim Zurückscrollen läuft die Deko nicht wieder an — '
      + '`animation-play-state: paused` wurde durch etwas ersetzt, das die '
      + 'Animation beendet statt sie anzuhalten').toBeGreaterThanOrEqual(oben);
  });

  test('der Hauptthread kommt im Leerlauf zur Ruhe', async ({ page }) => {
    // Gezählt wird, nicht gestoppt: Stil-Neuberechnungen sind vom Tempo des
    // Rechners fast unabhängig, Millisekunden nicht. Die Schranke ist ein
    // Rücklaufschutz, kein Ziel — sie reisst, wenn wieder etwas frameweise
    // rechnet, und löst nicht bei jedem langsamen Runner aus.
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
      + 'als würde jemand scrollen. Meist eine Animation auf etwas '
      + 'Unsichtbarem oder ein schneller Zeitgeber — die Tests darüber '
      + 'nennen beides').toBeLessThan(150);
  });
});
