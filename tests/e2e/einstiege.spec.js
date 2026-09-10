// Kommt der Besucher von der Landeseite aus dorthin, wo er hinwill?
//
// ── DER BEFUND, DEN DIESE SUITE FESTHÄLT ────────────────────────────────
//
// Beim Durchgehen der Nutzerpfade am 09.09.2026 gemessen: die Landeseite ist
// `#page-browse` — eine Suchmaske. Sie bedient genau einen Nutzer, den, der
// schon weiss, wonach er sucht.
//
// Zwei andere Absichten hatten von dort aus KEINEN sichtbaren Weg:
//
//   · „Ich weiss nicht, WAS ich machen will, nur DASS ich etwas machen
//     will."  → der Reiter „⚡ Jetzt" existierte nur auf `#page-aktuelles`
//     und `#page-explore`. Von der Landeseite aus unerreichbar.
//   · „Ich biete etwas an."  → „Inserieren" stand allein in der oberen
//     Leiste. Die halbe Zielgruppe ohne Einstieg.
//
// Beide Ziele gab es, beide waren erreichbar — nur nicht von dort, wo der
// Besucher steht. Das ist derselbe Unterschied wie zwischen einem
// vorhandenen Prüfer und einem, der wirklich läuft.
//
// ── WARUM HIER GEKLICKT UND NICHT GESUCHT WIRD ──────────────────────────
//
// Ein Test auf „das Markup enthält einen Knopf mit dem Text X" ginge an der
// Eigenschaft vorbei: ein Knopf, der auf eine Seite führt, die nicht aktiv
// wird, sieht im Markup vollständig richtig aus. Gemessen wird deshalb der
// Klick und die Seite DANACH — Markierung und Inhalt müssen übereinstimmen,
// dieselbe Regel wie beim Deep-Link-Test der Jetzt-Ansicht.
const { test, expect } = require('@playwright/test');
const { openApp, activePageId } = require('./helpers');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Was hinter den Wegen liegen muss.
 *
 * Zwei Sorten Ziel, und der Unterschied ist keine Nachlässigkeit: ein
 * Inserat kann niemand anonym einstellen. Der Anbieter-Einstieg endet
 * deshalb bewusst in der REGISTRIERUNG und nicht auf einer Seite — und
 * ausdrücklich nicht in der Anmeldung, deren „Bitte melde dich an" jemand
 * ohne Konto als Absage liest.
 */
const WEGE = [
  {
    was: 'etwas erleben',
    text: /Was geht hier gerade/i,
    seite: 'page-aktuelles',
    beleg: '#page-aktuelles .akt-karte-huelle',
  },
  {
    was: 'etwas planen',
    text: /Vorhaben planen/i,
    seite: 'page-board',
    beleg: '#page-board',
  },
  {
    was: 'etwas anbieten',
    text: /Ich biete etwas an/i,
    modal: 'registerModal',
  },
];

test.describe('Einstiege: die Landeseite bedient mehr als eine Absicht', () => {
  test('die Landeseite ist wirklich die Suchseite', async ({ page }) => {
    // Die Gegenprobe zur ganzen Suite. Ohne sie prüften die Tests darunter
    // eine Reihe von Knöpfen auf irgendeiner Seite — und blieben grün,
    // wenn die Landeseite eine ganz andere würde.
    //
    // Sie hat ausserdem schon einmal etwas gefangen: bei der ersten Messung
    // wurde über `/index.html` geöffnet, und dort liest der Router
    // „index.html" als Routen-Token — es war KEINE Seite aktiv, und der
    // Befund lautete fälschlich „die Startseite zeigt nichts".
    await openApp(page);
    expect(await activePageId(page), 'die Landeseite ist nicht mehr die Suche')
      .toBe('page-browse');
    await expect(page.locator('#browseSearch')).toHaveCount(1);
  });

  test('jeder Weg führt wirklich an sein Ziel', async ({ page }) => {
    for (const weg of WEGE) {
      await openApp(page);
      const knopf = page.locator('.ai-hero-wege button', { hasText: weg.text });
      await expect(knopf, `kein Einstieg „${weg.was}" auf der Landeseite`).toHaveCount(1);
      await knopf.click();
      await page.waitForTimeout(600);

      if (weg.modal) {
        await expect(page.locator('#' + weg.modal),
          `„${weg.was}" öffnet ${weg.modal} nicht`).toHaveClass(/show/);
        // Und AUSDRÜCKLICH nicht die Anmeldung: „Bitte melde dich an"
        // ist für jemanden ohne Konto die falsche Auskunft.
        await expect(page.locator('#loginModal'),
          `„${weg.was}" landet in der Anmeldung statt in der Registrierung`)
          .not.toHaveClass(/show/);
        continue;
      }

      expect(await activePageId(page), `„${weg.was}" führt nicht auf ${weg.seite}`)
        .toBe(weg.seite);
      // Und der Inhalt, nicht nur die Markierung: eine Seite, die aktiv
      // gesetzt wird und leer bleibt, ist kein erreichtes Ziel.
      await expect(page.locator(weg.beleg),
        `${weg.seite} ist aktiv, zeigt aber nichts`).toBeVisible();
    }
  });

  test('angemeldet führt der Anbieter-Einstieg direkt zum Inserat', async ({ page }) => {
    // Die Gegenprobe zur Weiche: ohne sie wäre „immer die Registrierung
    // zeigen" der bequemste Weg zu einem grünen Test — und ein
    // angemeldeter Anbieter bekäme bei jedem Klick ein Formular für ein
    // Konto, das er längst hat.
    await openApp(page);
    await page.evaluate(() => { isLoggedIn = true; });
    await page.locator('.ai-hero-wege button', { hasText: /Ich biete etwas an/i }).click();
    await page.waitForTimeout(600);
    expect(await activePageId(page)).toBe('page-create-listing');
    await expect(page.locator('#registerModal')).not.toHaveClass(/show/);
  });

  test('kein Weg endet im Nichts — die Regel, nicht die Aufzählung', async ({ page }) => {
    // Ein Test, der die drei bekannten Knöpfe aufzählt, findet nie einen
    // vierten, der ins Leere führt. Gemessen wird deshalb JEDER Knopf der
    // Reihe: nach dem Klick muss irgendeine Seite aktiv sein, und es darf
    // nicht die Landeseite bleiben.
    await openApp(page);
    const anzahl = await page.locator('.ai-hero-wege button').count();
    expect(anzahl, 'die Einstiegsreihe ist leer — der Test hätte kein Subjekt')
      .toBeGreaterThanOrEqual(3);

    for (let i = 0; i < anzahl; i++) {
      const fehler = await openApp(page);
      const knopf = page.locator('.ai-hero-wege button').nth(i);
      const beschriftung = (await knopf.innerText()).replace(/\s+/g, ' ').trim();
      await knopf.click();
      await page.waitForTimeout(600);

      const seite = await activePageId(page);
      const modalOffen = await page.locator('.modal-overlay.show').count();
      expect(seite, `„${beschriftung}" macht keine Seite aktiv`).toBeTruthy();
      // Entweder eine andere Seite ODER ein offener Dialog. Beides ist ein
      // Ziel; keines von beidem ist ein toter Knopf.
      expect(seite !== 'page-browse' || modalOffen > 0,
        `„${beschriftung}" bewirkt nichts Sichtbares`).toBe(true);
      expect(fehler, `„${beschriftung}" wirft einen Fehler: ${fehler.join(' | ')}`)
        .toEqual([]);
    }
  });

  test('„Jetzt" war vorher von hier aus nicht erreichbar', async ({ page }) => {
    // Der Beleg für den Befund, nicht nur für die Behebung. Die
    // Reiterleiste mit „Jetzt" gehört zu `#page-aktuelles` und
    // `#page-explore` — auf der Landeseite gibt es sie nicht. Ohne die
    // Einstiegsreihe gäbe es von dort also keinen Weg dorthin.
    //
    // Verschwindet dieser Test, verschwindet die einzige Stelle, an der
    // steht, WARUM die Reihe existiert.
    await openApp(page);
    const reiterAufLandeseite = await page.locator('#page-browse .feed-tab[data-feed="jetzt"]').count();
    expect(reiterAufLandeseite,
      'die Landeseite trägt jetzt selbst einen Jetzt-Reiter — dann ist der Befund überholt und dieser Test anzupassen')
      .toBe(0);
    // Und der Gegenbeweis, dass es den Reiter überhaupt gibt:
    expect(await page.locator('.feed-tab[data-feed="jetzt"]').count(),
      'es gibt gar keinen Jetzt-Reiter mehr').toBeGreaterThan(0);
  });

  test('der Dienstleister hatte von hier aus KEINEN Weg zu seinem Geschäft', async ({ page }) => {
    // ── DER BEFUND VOM 10.09.2026, IM BROWSER GEMESSEN ─────────────────
    //
    // Angemeldet als Dienstleister, auf der Landeseite stehend:
    //
    //   my-listings   2 im Markup, 0 SICHTBAR
    //   auftraege     1 im Markup, 0 SICHTBAR
    //   business      1 im Markup, 0 SICHTBAR
    //   create-listing               3 sichtbar
    //
    // Alle drei lagen hinter dem Ausklappmenü. Der einzige sichtbare Weg
    // für die halbe Marktseite führte zu „noch ein Inserat anlegen" — dem
    // Einzigen, was ein Anbieter schon getan hat.
    //
    // Dieser Test hält den BEFUND fest: er misst, dass die drei Ziele
    // weiterhin keinen eigenen sichtbaren Knopf auf der Landeseite haben.
    // Verschwindet er, verschwindet die Stelle, an der steht, warum der
    // dritte Weg für Anbieter umschaltet.
    await openApp(page);
    await page.evaluate(() => {
      currentUser = { id: 5, name: 'DJ Julian', role: 'Dienstleister' };
      isLoggedIn = true;
      if (typeof _applyRoleNav === 'function') _applyRoleNav();
    });
    const eigene = await page.evaluate(() => {
      const sichtbar = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'
          && s.display !== 'none' && s.opacity !== '0';
      };
      const raus = {};
      for (const z of ['my-listings', 'auftraege', 'business']) {
        raus[z] = [...document.querySelectorAll(`[onclick*="navigateTo('${z}'"]`)]
          .filter(sichtbar).length;
      }
      return raus;
    });
    for (const [ziel, n] of Object.entries(eigene)) {
      expect(n, `„${ziel}" hat jetzt einen eigenen sichtbaren Einstieg — dann ist `
        + 'der Befund überholt und dieser Test anzupassen').toBe(0);
    }
  });

  test('für einen Anbieter führt der dritte Weg in sein Geschäft', async ({ page }) => {
    // Beschriftung UND Ziel wandern zusammen. Ein Weg, der woandershin
    // führt, als er verspricht, ist schlimmer als einer, den es nicht gibt
    // — deshalb wird BEIDES gemessen.
    const fehler = await openApp(page);
    await page.evaluate(() => {
      currentUser = { id: 5, name: 'DJ Julian', role: 'Dienstleister' };
      isLoggedIn = true;
      if (typeof _applyRoleNav === 'function') _applyRoleNav();
    });
    const knopf = page.locator('#wegAnbieter');
    await expect(knopf, 'der dritte Weg trägt für Anbieter die alte Beschriftung')
      .toContainText('Mein Geschäft');
    await knopf.click();
    await page.waitForTimeout(600);
    expect(await activePageId(page), 'der Anbieter landet nicht in seinem Bereich')
      .toBe('page-my-listings');
    expect(fehler, `Fehler auf dem Weg: ${fehler.join(' | ')}`).toEqual([]);
  });

  test('für alle anderen bleibt der dritte Weg, was er war', async ({ page }) => {
    // Die Gegenprobe. Ohne sie wäre die Regel dadurch erfüllt, dass der
    // Weg für JEDEN ins Geschäft führt — und ein Event-Planer stünde vor
    // „Meine Inserate", ohne je eins gehabt zu haben.
    await openApp(page);
    await page.evaluate(() => {
      currentUser = { id: 9, name: 'Anna', role: 'Event-Planer' };
      isLoggedIn = true;
      if (typeof _applyRoleNav === 'function') _applyRoleNav();
    });
    const knopf = page.locator('#wegAnbieter');
    await expect(knopf, 'ein Event-Planer bekommt den Anbieter-Bereich angeboten')
      .toContainText('Ich biete etwas an');
    await knopf.click();
    await page.waitForTimeout(600);
    expect(await activePageId(page)).toBe('page-create-listing');
  });

  test('kein Knopf wird beschriftet, den es nicht gibt', async ({ page }) => {
    // ── EIN TOTER BLOCK, DER AUSSAH, ALS TÄTE ER ETWAS ────────────────
    //
    // `applyLogin()` und `applyLogout()` setzten Symbol und Text auf
    // `#mobileNav button[data-page="create-listing"]`. Diesen Knopf gibt es
    // in der Mobilleiste NICHT — sie trägt Feed, Suche, Board, Chat, Profil.
    // Zwei Blöcke, die nie etwas getan haben und im Diff aussahen wie
    // rollenabhängige Navigation. Dieselbe Klasse wie ein Prüfer ohne
    // Subjekt, nur an der Oberfläche.
    //
    // Gemessen wird die BEDINGUNG, nicht die Fundstelle: jeder Selektor auf
    // die Mobilleiste in `30-auth.js` muss auch etwas treffen.
    await openApp(page);
    const quelle = fs.readFileSync(
      path.join(__dirname, '..', '..', 'js', 'modules', 'core', '30-auth.js'), 'utf8');
    const selektoren = [...quelle.matchAll(/querySelector\(\s*'(#mobileNav[^']*)'/g)]
      .map((m) => m[1]);
    expect(selektoren.length, 'kein Mobilleisten-Selektor gefunden — der Test hat kein Subjekt')
      .toBeGreaterThan(0);
    for (const sel of selektoren) {
      const n = await page.locator(sel).count();
      expect(n, `„${sel}" trifft nichts — der Code dahinter tut nichts und sieht aus, als täte er es`)
        .toBeGreaterThan(0);
    }
  });
});
