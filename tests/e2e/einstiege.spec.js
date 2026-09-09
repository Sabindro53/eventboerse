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
});
