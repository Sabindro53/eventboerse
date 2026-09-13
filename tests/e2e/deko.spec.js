// Deko auf der Landeseite — was ausgeliefert wird, muss auch erscheinen.
//
// ── DER BEFUND (13.09.2026) ────────────────────────────────────────────
//
// `app-shell.html` trug FÜNF Konfetti-Popper. Gerendert wurden immer nur
// zwei: eine Regel `.ai-popper.pop-3, .pop-4, .pop-5 { display: none }`
// legte die anderen still, mit dem Kommentar „genau ZWEI — wie gewünscht".
// An fünf Breiten gemessen (390/720/900/1280/1600 px) erschien keiner von
// ihnen je. 78 Zeilen SVG gingen an jeden Besucher und zeigten nichts.
//
// Das ist dieselbe Klasse wie ein Prüfer ohne Subjekt, nur an der
// Oberfläche: etwas ist da, sieht aus, als täte es etwas, und tut nichts.
// Stillgelegt wurde per CSS, statt es zu entfernen — und CSS-Regeln
// überleben jeden Umbau, Markup-Leichen auch.
//
// ── UND WAS DAS ANHALTEN NICHT BRINGT ──────────────────────────────────
//
// Gemessen, Hauptthread je 3 s, verschachtelt mit Medianen:
//
//   alle Animationen angehalten      389 ms  (Grundlast 530 ms)
//   nur das Konfetti ANGEHALTEN      423 ms  → −107 ms
//   Konfetti natürlich AUSGELAUFEN   472 ms  → −10 ms, also nichts
//
// Eine angehaltene Animation behält ihre Compositor-Ebene, eine BEENDETE
// gibt sie ab — und der Ebenenbaum kostet zurück, was die Animation
// gespart hätte. Dieselbe Mechanik wie `animation: none` gegen
// `animation-play-state: paused`. Wer die 107 ms erwartet, weil das
// Anhalten sie zeigt, bekommt sie nicht.
//
// Was bleibt: WENIGER TEILE (drei Streifen-Punkt-Paare statt sechs) und
// eine endliche Laufzeit. Der gemessene Gewinn dafür ist klein und
// verrauscht (zwei Läufe: −41 ms und −14 ms bei überlappenden
// Streuungen) — deshalb steht hier keine Zahl als Zusicherung, sondern
// die BEDINGUNG: nichts wird ausgeliefert, das nie erscheint, und ein
// Gruß läuft aus.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openApp } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const BREITEN = [390, 720, 900, 1280, 1600];

/** Alle Deko-Elemente mit ihrer berechneten Sichtbarkeit. */
async function dekoStand(page) {
  return page.evaluate(() => {
    const aus = [];
    for (const el of document.querySelectorAll('.ai-popper')) {
      aus.push({ klasse: el.className, sichtbar: getComputedStyle(el).display !== 'none' });
    }
    return aus;
  });
}

test.describe('Deko: ausgeliefert heisst auch gerendert', () => {
  test('kein Popper wird ausgeliefert, der bei KEINER Breite erscheint', async ({ page }) => {
    // DIE EIGENTLICHE REGEL. Gemessen wird über den ganzen Bereich, in dem
    // die Seite benutzt wird — ein Element, das nur bei 1600 px erscheint,
    // ist Gestaltung; eines, das nirgends erscheint, ist Ballast.
    const jeBreite = {};
    for (const b of BREITEN) {
      await page.setViewportSize({ width: b, height: 850 });
      await openApp(page);
      await page.waitForTimeout(700);
      for (const p of await dekoStand(page)) {
        jeBreite[p.klasse] = jeBreite[p.klasse] || [];
        if (p.sichtbar) jeBreite[p.klasse].push(b);
      }
    }
    const namen = Object.keys(jeBreite);
    expect(namen.length, 'es gibt gar keine Popper mehr — dann prüft dieser '
      + 'Test nichts').toBeGreaterThan(0);
    const nie = namen.filter((k) => jeBreite[k].length === 0);
    expect(nie, `diese Deko wird an jeden Besucher ausgeliefert und erscheint `
      + `bei keiner der geprüften Breiten (${BREITEN.join('/')} px): `
      + `${nie.join(', ')}. Entweder sie erscheint irgendwo, oder sie gehört `
      + `aus dem Markup — nicht hinter ein display:none`).toEqual([]);
  });

  test('das Konfetti läuft aus, statt endlos zu kreisen', async ({ page }) => {
    // Ein Popper ist ein Gruss, kein Dauerzustand. Endlos lief er in einer
    // 11-Sekunden-Schleife und stand dabei von 72 % bis 100 % jedes Zyklus
    // auf `opacity: 0` — seine Unteranimationen liefen darin weiter.
    await page.setViewportSize({ width: 1280, height: 900 });
    await openApp(page);
    const endlos = await page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll('*')) {
        for (const a of (el.getAnimations ? el.getAnimations() : [])) {
          if (!/^aiPopper/.test(a.animationName)) continue;
          const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
          if (t.iterations === Infinity) n++;
        }
      }
      return n;
    });
    expect(endlos, 'eine Konfetti-Animation läuft wieder endlos — dann kreist '
      + 'ein Gruss für immer, und ein Drittel jedes Zyklus für ein Element '
      + 'auf opacity:0').toBe(0);
  });

  test('… aber es läuft überhaupt erst einmal', async ({ page }) => {
    // GEGENPROBE. Ohne sie wäre „alles löschen" der bequemste Weg zu einem
    // grünen Test oben — und die Landeseite hätte ihren Willkommensgruss
    // verloren, ohne dass irgendwo etwas rot würde.
    await page.setViewportSize({ width: 1280, height: 900 });
    await openApp(page);
    await page.waitForTimeout(1500);
    const laufend = await page.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll('*'))
        for (const a of (el.getAnimations ? el.getAnimations() : []))
          if (/^aiPopper/.test(a.animationName) && a.playState === 'running') n++;
      return n;
    });
    expect(laufend, 'beim Laden läuft kein Konfetti — der Gruss ist weg')
      .toBeGreaterThan(0);
  });

  test('die Rundenzahl steht an EINER Stelle', () => {
    // Vier Animationen müssen zusammen aufhören: Hülle, Kegel, Streifen,
    // Punkte. Vier Zahlen, die zusammen stimmen müssen, driften — dann
    // kreisen die Punkte weiter, während die Hülle längst stillsteht.
    const css = fs.readFileSync(path.join(WURZEL, 'styles.css'), 'utf8');
    const stellen = [...css.matchAll(/animation:\s*aiPopper\w+\s+\d+s\s+([^\s;]+)/g)]
      .map((m) => m[1]);
    expect(stellen.length, 'die vier aiPopper-Animationen sind nicht mehr '
      + 'auffindbar — dann prüft dieser Test nichts').toBe(4);
    const eigen = stellen.filter((w) => !/^var\(--pp-runden/.test(w));
    expect(eigen, `diese aiPopper-Animationen führen ihre Rundenzahl selbst: `
      + `${eigen.join(', ')}. Sie gehört in --pp-runden, sonst hört eine `
      + `Teilanimation später auf als die Hülle`).toEqual([]);
  });

  test('jedes Konfetti-Teil hat seinen Streifen', () => {
    // Die Teile sind PAARE: jeder Streifen endet in einem Punkt. Einen ohne
    // den anderen zu entfernen lässt einen Punkt im Nichts stehen — im
    // Markup unauffällig, im Bild ein Fehler.
    const shell = fs.readFileSync(path.join(WURZEL, 'app-shell.html'), 'utf8');
    const streifen = (shell.match(/class="ai-popper-stream"/g) || []).length;
    const punkte = (shell.match(/class="ai-popper-bit /g) || []).length;
    expect(streifen, 'es gibt keine Streifen mehr').toBeGreaterThan(0);
    expect(punkte, `${streifen} Streifen, aber ${punkte} Konfetti-Punkte — `
      + `ein Punkt ohne Streifen erscheint aus dem Nichts`).toBe(streifen);
  });
});
