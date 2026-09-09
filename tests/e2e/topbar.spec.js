// Die obere Leiste gehört ganz nach oben — und nichts davor.
//
// Gemeldet am 06.09.2026: „die obere topbar ist nicht fixiert und da war ein
// Rand". Beides stimmte, und beides kam aus derselben Ursache. Gemessen auf
// 393x852 vor der Reparatur:
//
//   #navbar      fixed, 0-104,  z-index 1000
//   #betaBanner  sticky top:0,  0-135,  z-index 9999
//   #page-browse ab 135, dazu padding-top: 104px
//
// Der Banner lag also EXAKT über der Leiste und war höher als sie — am
// Seitenanfang sah man von der Navigation nichts, sie „erschien" erst beim
// Scrollen. Das liest sich wie „nicht fixiert", war aber eine Überdeckung.
// Und darunter klaffte eine Lücke von 104 px, weil `.page` Platz für eine
// Leiste reservierte, die dort niemand sah.
//
// Geprüft wird die BEDINGUNG, nicht der eine Banner: was auch immer am
// oberen Rand steht, die Navigationsleiste muss darüber liegen, und der
// Inhalt darf weder überdeckt werden noch eine Lücke lassen.
const { test, expect } = require('@playwright/test');
const { warteAufAppBereit } = require('./helpers');

const BREITEN = [
  { name: 'Mobil', w: 393, h: 852 },
  { name: 'Desktop', w: 1280, h: 800 },
];

async function lage(page) {
  return page.evaluate(() => {
    const kasten = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), unten: Math.round(b.bottom), h: Math.round(b.height) };
    };
    const nav = document.getElementById('navbar');
    const banner = document.getElementById('betaBanner');
    const seite = [...document.querySelectorAll('.page')]
      .find((p) => getComputedStyle(p).display !== 'none') || null;
    // Was der Nutzer am oberen Rand wirklich anfasst — nicht was das CSS
    // behauptet. Ein z-index-Fehler ist nur hier sichtbar.
    const treffer = document.elementFromPoint(20, 3);
    return {
      nav: kasten(nav),
      banner: banner && !banner.hidden ? kasten(banner) : null,
      bannerVersteckt: banner ? banner.hidden : null,
      seite: seite
        ? { id: seite.id, ...kasten(seite), padTop: parseInt(getComputedStyle(seite).paddingTop, 10) }
        : null,
      obenGehoert: treffer ? (treffer.closest('#navbar') ? 'navbar' : (treffer.id || treffer.tagName)) : null,
    };
  });
}

for (const { name, w, h } of BREITEN) {
  test.describe(`${name} (${w}px)`, () => {
    test('die Leiste liegt ganz oben — auch mit Banner', async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await page.waitForSelector('#navbar');
      // ERST WENN DER LADESCHLEIER WEG IST. Er liegt auf z-index 99999 über
      // allem; wer vorher misst, misst ihn — einen Zwischenzustand, den kein
      // Nutzer anfasst. Begründung bei `warteAufAppBereit()`.
      await warteAufAppBereit(page);
      const l = await lage(page);

      expect(l.nav, '#navbar fehlt').toBeTruthy();
      expect(l.nav.top, 'die Leiste beginnt nicht bei 0').toBe(0);
      // Der eigentliche Befund: wer am obersten Rand tippt, muss die Leiste
      // treffen. Vorher traf man dort den Banner.
      expect(l.obenGehoert,
        `am oberen Rand liegt "${l.obenGehoert}" statt der Navigationsleiste`)
        .toBe('navbar');
    });

    test('nichts überdeckt die Leiste, und darunter klafft nichts', async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await page.waitForSelector('#navbar');
      await warteAufAppBereit(page);
      const l = await lage(page);
      // Kein Ueberspringen: der Banner steht in app-shell.html und ist beim
      // ersten Aufruf immer da. Fehlt er, ist das ein Befund, kein Grund,
      // den Test aus der Bilanz zu nehmen.
      expect(l.banner, 'der Banner ist beim ersten Aufruf nicht sichtbar').toBeTruthy();

      expect(l.banner.top,
        `der Banner beginnt bei ${l.banner.top} und damit im Bereich der Leiste `
        + `(0-${l.nav.unten})`).toBeGreaterThanOrEqual(l.nav.unten);

      // Kein Loch: der Inhalt beginnt dort, wo der Banner aufhört. Vorher lag
      // dazwischen die Hoehe der Leiste als leere Flaeche.
      const inhaltBeginn = l.seite.top + l.seite.padTop;
      expect(Math.abs(inhaltBeginn - l.banner.unten),
        `zwischen Banner (endet ${l.banner.unten}) und Inhalt (beginnt `
        + `${inhaltBeginn}) liegen ${inhaltBeginn - l.banner.unten} px`)
        .toBeLessThanOrEqual(1);
    });

    test('der Ladeschleier verschwindet wirklich', async ({ page }) => {
      // ── DIE LÜCKE, DIE DER AUSFALL SICHTBAR GEMACHT HAT ───────────────
      //
      // Am 09.09.2026 fiel `topbar.spec.js` in CI durch, weil der
      // Ladeschleier beim Messen noch oben lag. Beim Nachsehen zeigte
      // sich: dass er auf der ECHTEN Seite überhaupt je verschwindet,
      // prüfte niemand. `bild-laden.spec.js` misst seine Logik an einer
      // nachgebauten Seite — richtig für die Logik, blind für den Start.
      //
      // Bleibt er stehen, sieht der Besucher dauerhaft „Eventbörse wird
      // geladen…". Kein Statuscode, kein Page-Error, keine leere Liste —
      // 953 Tests hätten es nicht bemerkt. Genau die Schadensart, die hier
      // schon dreimal teuer war: die Seite sieht heil aus und tut nichts.
      await page.setViewportSize({ width: w, height: h });
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(String(e)));
      await page.goto('/');

      // Gegenprobe: der Schleier ist beim ersten Aufruf überhaupt da.
      // Ohne sie bestünde der Test auch, wenn es ihn gar nicht mehr gäbe.
      expect(await page.locator('#appLoadingOverlay').count(),
        'der Ladeschleier steht beim ersten Aufruf nicht in der Seite').toBe(1);

      await warteAufAppBereit(page);
      expect(fehler, `beim Start geworfen: ${fehler.join(' | ')}`).toEqual([]);

      // Und er ist wirklich weg, nicht nur durchsichtig: was am oberen
      // Rand liegt, muss die Leiste sein.
      const l = await lage(page);
      expect(l.obenGehoert,
        `nach dem Laden liegt „${l.obenGehoert}" oben`).toBe('navbar');
    });

    test('nach dem Schliessen rutscht der Inhalt nicht unter die Leiste', async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await page.waitForSelector('#navbar');
      await warteAufAppBereit(page);
      const vorher = await lage(page);
      expect(vorher.banner, 'der Banner ist beim ersten Aufruf nicht sichtbar').toBeTruthy();

      // Über den echten Knopf, nicht über einen nachgebauten Aufruf: genau
      // hier entscheidet sich, ob `hidden` gesetzt wird — und die CSS-Regel
      // `body:has(#betaBanner:not([hidden]))` haengt daran. Wer den Knopf auf
      // style.display umstellt, verliert die Reservierung lautlos.
      await page.click('.beta-banner-close');
      await page.waitForTimeout(150);
      const l = await lage(page);

      expect(l.bannerVersteckt, 'der Knopf hat den Banner nicht auf hidden gesetzt').toBe(true);
      const inhaltBeginn = l.seite.top + l.seite.padTop;
      expect(inhaltBeginn,
        `nach dem Schliessen beginnt der Inhalt bei ${inhaltBeginn}, die Leiste `
        + `reicht bis ${l.nav.unten} — er laege darunter`)
        .toBeGreaterThanOrEqual(l.nav.unten);
    });

    test('auch beim WIEDERkommen nach dem Schliessen', async ({ page }) => {
      // Der Fall, der beim ersten Mutationsdurchgang durchrutschte: das
      // Startskript versteckt den Banner bei gesetztem Merker. Tut es das mit
      // style.display statt mit `hidden`, passt die Regel
      // `:has(#betaBanner:not([hidden]))` weiterhin — die Seite verliert ihre
      // Reservierung, und der Inhalt liegt unter der Leiste. Betroffen waeren
      // genau die Besucher, die den Hinweis einmal weggeklickt haben, also
      // mit der Zeit alle.
      await page.setViewportSize({ width: w, height: h });
      await page.addInitScript(() => {
        try { localStorage.setItem('eb_beta_banner_dismissed', '1'); } catch (e) { /* egal */ }
      });
      await page.goto('/');
      await page.waitForSelector('#navbar');
      const l = await lage(page);

      expect(l.bannerVersteckt,
        'der Merker ist gesetzt, aber der Banner traegt kein hidden').toBe(true);
      const inhaltBeginn = l.seite.top + l.seite.padTop;
      expect(inhaltBeginn,
        `beim Wiederkommen beginnt der Inhalt bei ${inhaltBeginn}, die Leiste `
        + `reicht bis ${l.nav.unten} — er laege darunter`)
        .toBeGreaterThanOrEqual(l.nav.unten);
    });
  });
}
