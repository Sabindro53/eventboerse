// Barrierefreiheits-Tests (axe-core): WCAG 2.0/2.1/2.2 AA als CI-Gate.
//
// ── DAS TOR MASS FÜNF VON VIERUNDDREISSIG SEITEN (15.09.2026) ────────────
//
// Hier stand „0 Verstöße über beide Farbmodi × 6 Kernseiten". `SEITEN` war
// eine HANDLISTE mit fünf Einträgen, abgemeldet gemessen; `app-shell.html`
// trägt 34 Seiten. Die Zahl stand an vier Stellen im Projekt und war
// viermal verschieden (6 / 6 / 4 / „die gesamte Anwendung") — gemessen: 5.
//
// Gefährlich war nicht die schmale Messung, sondern die Entwarnung, die
// anderswo daraus gemacht wurde: dieselbe Klasse wie der tote
// Gitleaks-Scan. Ein Prüfer, dessen Subjekt nur ein Ausschnitt ist, deckt
// die Aussage nicht, die man ihm anhängt.
//
// Nachgemessen über ALLE Seiten, angemeldet und in beiden Farbmodi:
//
//   58 verstoßende Knoten, 20 davon `critical`
//   Ursachen: 10 Bedienelemente ohne zugänglichen Namen · drei im
//   Dunkelmodus unlesbare Texte (1,12 / 1,15 / 1,51 : 1) · die Markenfarbe
//   als Text und als Fläche · sechs Statusfarben ohne Dunkelwert.
//
// Die Vault-Notiz nannte vorher 40. Der Unterschied ist kein Widerspruch,
// sondern ein Subjektwechsel: damals wurde in der Rolle der jeweiligen
// Seite gemessen, jetzt auf JEDER Seite angemeldet — und mit einem Konto,
// das auch Administrator ist. Erst dadurch rendern der Feed-Kontaktknopf
// und die drei Admin-Bedienelemente überhaupt. Ein weiterer Beleg dafür,
// dass die Abdeckung am Subjekt hängt und nicht an der Sorgfalt.
//
// ── DIE LISTE WIRD ABGELEITET, NICHT GEPFLEGT ───────────────────────────
//
// `SEITEN` kommt jetzt aus den `id="page-…"` der Shell. Eine Handliste
// wäre wieder in dem Moment zu kurz, in dem jemand eine Seite hinzufügt —
// und niemand würde es merken, weil nichts rot wird. Dieselbe Regel wie
// bei `tore.mjs` (Tore aus dem Workflow) und bei `eb_social_tabellen_sql()`
// (Nachweis aus derselben Quelle wie die Anlage).
//
// Drei Gegenproben tragen die Ableitung:
//
//   1. Die Liste muss die Shell wirklich abdecken — sonst gäbe eine
//      kaputte Ableitung eine kurze Liste zurück, und das Tor schrumpfte
//      still auf den alten Zustand.
//   2. Jede Route, die hier NICHT gemessen wird, muss nachweislich
//      weiterleiten, und ihr Ziel muss selbst gemessen werden. Eine
//      Ausnahmeliste ohne Nachweis ist der Anfang derselben Drift.
//   3. Auf jeder Seite wird nachgesehen, welche Seite WIRKLICH aktiv
//      wurde. Ohne das misst man dieselbe Seite zweiunddreißigmal und
//      hält das für Abdeckung — abgemeldet fallen `auftraege`,
//      `business` und `my-listings` auf die Landeseite zurück.
//
// ── WARUM SEIT DEM 10.09.2026 AUCH 2.2 ──────────────────────────────────
//
// Die Kennungsliste endete bei `wcag21aa`. Damit konnte dieses Tor die
// Kriterien der Fassung 2.2 GAR NICHT SEHEN — nicht falsch gemessen,
// sondern nie gefragt. Und genau dort liegt SC 2.5.8 „Target Size
// (Minimum)": 24×24 px Mindestgröße für Bedienelemente.
//
// Das ist nicht nur Höflichkeit: das Barrierefreiheitsstärkungsgesetz gilt
// seit dem 28.06.2025 für den elektronischen Geschäftsverkehr und verweist
// über EN 301 549 auf den jeweils geltenden WCAG-Stand.
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { openApp, warteAufAppBereit } = require('./helpers');
const { textAusHtml } = require('./lib/html-text');
const fs = require('node:fs');
const path = require('node:path');

const SHELL = path.join(__dirname, '..', '..', 'app-shell.html');

/** Jede Seite der Anwendung — aus der Shell, nicht aus einer Handliste. */
function seitenAusDerShell() {
  const roh = fs.readFileSync(SHELL, 'utf8');
  return [...roh.matchAll(/id="page-([a-z0-9-]+)"/g)].map((m) => m[1]);
}

// Zwei Routen sind KEINE eigene Seite, sondern Weiterleitungen. Gemessen,
// nicht angenommen — und ihr Ziel steht selbst in der Messliste, es fällt
// also nichts heraus. Der Test weiter unten hält beide Behauptungen nach.
const WEITERLEITUNG = {
  home: 'browse',
  profile: 'provider',
};

const SEITEN = seitenAusDerShell();
const GEMESSEN = SEITEN.filter((s) => !(s in WEITERLEITUNG));

// Ein Konto, das jede Ansicht öffnen darf. Abgemeldet fiel ein Drittel der
// Seiten auf die Landeseite zurück, und das Tor hätte dieselbe Seite
// mehrfach für Abdeckung gehalten. `isAdmin` gehört dazu: drei
// Bedienelemente erscheinen nur damit, und alle drei waren kaputt.
const MESSKONTO = {
  id: 7777, name: 'Mess Konto', role: 'Dienstleister',
  baseRole: 'Dienstleister', isAdmin: true, handle: 'mess.konto',
};

/**
 * Einmal messen, und bei einem Fund ein zweites Mal.
 *
 * Einblendanimationen liefern Übergangs-Mischfarben; axe sieht sie als
 * Kontrastverstoß, obwohl die stabile Endfarbe in Ordnung ist. Ein Prüfer,
 * der aus dem falschen Grund rot meldet, kostet mehr als keiner. Gemeldet
 * wird deshalb nur, was in BEIDEN Messungen steht — im grünen Fall kostet
 * das nichts, weil die zweite Runde gar nicht läuft.
 */
async function verstoesse(page) {
  const lauf = async () => {
    const res = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const raus = [];
    for (const v of res.violations) {
      for (const n of v.nodes) raus.push(`[${v.impact}] ${v.id} @ ${n.target[0]}`);
    }
    return raus;
  };
  const erste = await lauf();
  if (!erste.length) return [];
  await page.waitForTimeout(1400);
  const zweite = new Set(await lauf());
  return erste.filter((e) => zweite.has(e));
}

for (const mode of ['dark', 'light']) {
  test.describe(`Barrierefreiheit (${mode})`, () => {
    // 32 Seiten × axe — das dauert, und es ist der Punkt der Übung.
    test.setTimeout(300000);

    test(`WCAG AA über alle ${GEMESSEN.length} Seiten`, async ({ page }) => {
      await openApp(page);
      await warteAufAppBereit(page);
      const funde = [];
      const verfehlt = [];

      for (const route of GEMESSEN) {
        await page.evaluate(([m, r, konto]) => {
          document.body.classList.toggle('dark-mode', m === 'dark');
          isLoggedIn = true;
          currentUser = konto;
          window.navigateTo(r, r === 'detail' ? 1 : null);
        }, [mode, route, MESSKONTO]);
        await page.waitForTimeout(900);

        // Gegenprobe 3: Wurde wirklich DIESE Seite aktiv?
        const aktiv = await page.evaluate(() => {
          const el = document.querySelector('section.page.active');
          return el ? el.id.replace(/^page-/, '') : null;
        });
        if (aktiv !== route) { verfehlt.push(`${route} → ${aktiv}`); continue; }

        for (const v of await verstoesse(page)) funde.push(`${route}: ${v}`);
      }

      expect(verfehlt, 'diese Routen wurden nicht aktiv — gemessen wurde eine '
        + 'andere Seite, die Abdeckung ist also kleiner als sie aussieht:\n'
        + verfehlt.join('\n')).toEqual([]);
      expect(funde, `WCAG-Verstöße (${mode}):\n${funde.join('\n')}`).toEqual([]);
    });
  });
}

test.describe('Die Seitenliste des Tors', () => {
  // ── GEGENPROBE 1 ──────────────────────────────────────────────────────
  //
  // Ohne diesen Test wäre eine kaputte Ableitung (ein Muster, das nur noch
  // eine Seite trifft) ein GRÜNES Tor über einer Seite. Genau so sah der
  // Zustand vor dem 15.09.2026 aus, nur mit fünf statt einer.
  test('die Seiten kommen aus der Shell und decken sie ab', () => {
    const roh = fs.readFileSync(SHELL, 'utf8');
    const gezaehlt = (roh.match(/id="page-/g) || []).length;
    expect(SEITEN.length, 'die Ableitung trifft nicht jede Seite der Shell')
      .toBe(gezaehlt);
    expect(SEITEN.length, 'die Shell hat plötzlich kaum noch Seiten — das ist '
      + 'eher ein kaputtes Muster als ein kleineres Produkt')
      .toBeGreaterThanOrEqual(30);
    // Stichproben aus verschiedenen Bereichen: eine Ableitung, die nur die
    // ersten Treffer liefert, bestünde die Zählung oben sonst weiter.
    for (const s of ['browse', 'settings', 'create-listing', 'auftraege', 'freunde', 'admin']) {
      expect(GEMESSEN, `${s} wird nicht mehr gemessen`).toContain(s);
    }
  });

  // ── GEGENPROBE 2 ──────────────────────────────────────────────────────
  //
  // Stilllegen heißt eintragen, nicht verschweigen — dieselbe Regel wie bei
  // den Phantom-Workflows. Und ein Eintrag, den niemand nachmisst, ist eine
  // Behauptung: würde `profile` eines Tages eine echte Seite, fiele sie
  // still aus der Messung, und nichts würde rot.
  test('jede übersprungene Route leitet wirklich weiter — auf eine gemessene Seite', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    for (const [route, ziel] of Object.entries(WEITERLEITUNG)) {
      const aktiv = await page.evaluate(([r, konto]) => {
        isLoggedIn = true;
        currentUser = konto;
        window.navigateTo(r, null);
        const el = document.querySelector('section.page.active');
        return el ? el.id.replace(/^page-/, '') : null;
      }, [route, MESSKONTO]);
      expect(aktiv, `${route} leitet nicht mehr auf ${ziel} — die Route ist `
        + 'jetzt eine eigene Seite und gehört in die Messung').toBe(ziel);
      expect(GEMESSEN, `${route} wird übersprungen, und sein Ziel ${ziel} `
        + 'wird auch nicht gemessen — hier fällt eine Seite ganz heraus')
        .toContain(ziel);
    }
  });
});

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
    // `wcag22aa` läuft die Suite oben grün durch — über einen Verstoß mit
    // Schweregrad `serious` hinweg. Nicht falsch gemessen, sondern nie
    // gefragt.
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

test.describe('Beschriftungen: der Name, den ein Screenreader vorliest', () => {
  // ── WARUM DAS NEBEN axe STEHT (15.09.2026) ────────────────────────────
  //
  // axe meldete zehn Elemente ohne zugänglichen Namen. Gezählt wurden in
  // der Shell aber **37** Gruppen, deren `<label>` NEBEN seinem Feld stand
  // statt mit ihm verbunden. Der Unterschied ist axes Nachsicht: bei einem
  // `<input>` lässt es ein `placeholder` als Notnamen durchgehen, bei einem
  // `<select>` nicht.
  //
  // Ein Platzhalter ist aber kein Name: er verschwindet beim Tippen, und
  // genau dann braucht ihn jemand. Gemessen wird deshalb die BEDINGUNG —
  // jede Formularbeschriftung nennt ihr Feld —, nicht die zehn Fälle, die
  // axe zufällig sieht.
  //
  // <label class="toggle-switch|check-label|…"> sind HÜLLEN um ihr
  // Kästchen. Sie stehen bewusst nicht unter dieser Regel; ihren Namen
  // tragen sie über `aria-labelledby` auf den Text daneben.
  test('jede Formularbeschriftung nennt das Feld, das sie beschriftet', () => {
    const roh = fs.readFileSync(SHELL, 'utf8');
    const ohne = [];
    for (const m of roh.matchAll(/<label(?:\s+id="[A-Za-z0-9_-]+")?>/g)) {
      const ab = m.index + m[0].length;
      const text = textAusHtml(roh.slice(ab, roh.indexOf('</label>', ab)));
      const fenster = roh.slice(ab, ab + 900);
      const naechste = fenster.search(/<label[\s>]/);
      const bereich = naechste > -1 ? fenster.slice(0, naechste) : fenster;
      for (const s of bereich.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
        if (/type="hidden"/.test(s[2])) continue;
        const id = s[2].match(/\bid="([A-Za-z0-9_-]+)"/);
        if (id && text) ohne.push(`„${text.slice(0, 40)}" → ${id[1]}`);
        break;
      }
    }
    expect(ohne, 'diese <label> stehen neben ihrem Feld, statt es zu nennen — '
      + 'am Bildschirm sieht alles beschriftet aus, ein Screenreader sagt '
      + '„Eingabefeld" ohne Namen:\n' + ohne.join('\n')).toEqual([]);
  });

  test('ein Kästchen in einer Hülle ohne Text trägt seinen Namen anders', () => {
    // Die drei `toggle-switch`-Hüllen umschließen ihr Kästchen, tragen selbst
    // aber keinen Text. Ohne `aria-label`/`aria-labelledby` heißt das Element
    // dann gar nichts — darunter war `#settings2faToggle`, der Schalter für
    // die Zwei-Faktor-Anmeldung, und `#darkModeToggle`, den axe nie sah, weil
    // er in einem geschlossenen Menü liegt.
    const roh = fs.readFileSync(SHELL, 'utf8');
    const ohne = [];
    for (const m of roh.matchAll(/<label class="toggle-switch[^"]*">\s*(<input[^>]*>)/g)) {
      if (!/aria-label(ledby)?=/.test(m[1])) {
        ohne.push((m[1].match(/id="([^"]+)"/) || [, '?'])[1]);
      }
    }
    expect(ohne, 'diese Schalter haben keinen Namen: ' + ohne.join(', ')).toEqual([]);
  });
});
