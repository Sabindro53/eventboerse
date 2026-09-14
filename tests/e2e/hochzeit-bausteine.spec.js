// Die Hochzeit aus Bausteinen — schliesst der Kreis wirklich?
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// `43-planungs-zentrale.js` bietet achtzehn Bausteine für eine Hochzeit,
// jeder mit einer Kategorie und einem Knopf „<Kategorie> finden". Der
// Knopf öffnet die Anbieter-Auswahl vorgefiltert.
//
// Am 14.09.2026 nachgezählt: `fragment.cardId` wurde im ganzen Frontend an
// GENAU EINER Stelle geschrieben — von Hand, über das Dropdown „Leistung im
// Board". Der Knopf merkte sich nicht, für welchen Baustein er geöffnet
// wurde. Wer also über den Baustein suchte und buchte, hatte danach eine
// Karte auf dem Board und einen Baustein, der weiter „noch offen" zeigte
// und sein Budget in der Restsumme mitrechnete.
//
// Der Weg war da, er sah vollständig aus, und das letzte Glied fehlte.
// Aufgefallen ist es nicht, weil die Karte ja erscheint — dieselbe
// Schadensart, die in diesem Projekt schon mehrfach teuer war.
//
// Gemessen wird deshalb die WIRKUNG am echten Board: geklickt wird der
// echte Knopf, abgeschickt das echte Formular, und nachgesehen wird im
// Projekt — nicht im Markup.
const { test, expect } = require('@playwright/test');
const { warteAufAppBereit } = require('./helpers');

/**
 * Ein angemeldeter Planer mit einer frischen Hochzeit auf dem Board.
 *
 * Gestellt wird über den SPEICHER, nicht über die Modulvariablen: das
 * Board lädt seine Projekte beim Rendern selbst nach und überschreibt
 * dabei alles, was vorher von Hand hineingeschrieben wurde. Der erste
 * Entwurf dieser Suite tat genau das — `_activeBoardId` war nach der
 * Navigation wieder `null`, und alle sechs Tests scheiterten daran, dass
 * der Prüfstand seine eigene Vorbereitung weggeräumt hatte.
 *
 * Geöffnet wird danach über den echten Knopf „Plan öffnen". Wer das Board
 * per Funktionsaufruf herstellt, prüft den Weg dorthin nicht mit.
 */
async function hochzeitAufbauen(page, optionen) {
  await page.goto('/');
  await warteAufAppBereit(page);
  const id = await page.evaluate((o) => {
    isLoggedIn = true;
    currentUser = { id: 7, role: 'Eventplaner', name: 'Test-Planerin' };
    var projekt = planningCreateProject({
      template: 'wedding', name: 'Unsere Hochzeit', budget: 12000, guests: 80,
    });
    // Manche Projekte stammen aus der Zeit vor den Bausteinen und tragen
    // keine eigene Liste. Dann leitet `planningFragments()` sie beim Lesen
    // ab — und eine Verknüpfung, die in diese Ableitung schreibt, landet
    // in einer Kopie, die niemand je wiedersieht.
    if (o && o.ohneListe) delete projekt.fragments;
    localStorage.setItem('eb_board_projects_7', JSON.stringify([projekt]));
    navigateTo('board');
    return projekt.id;
  }, optionen || {});

  const oeffnen = page.locator('[data-planning-action="open"][data-project="' + id + '"]').first();
  await oeffnen.waitFor({ state: 'visible', timeout: 20000 });
  await oeffnen.click();
  await page.locator('#boardPlanningOverview').waitFor({ state: 'visible', timeout: 10000 });
  return id;
}

/** Der Stand, auf den es ankommt — aus dem Projekt, nicht aus dem DOM. */
function standLesen(page, fragmentId) {
  return page.evaluate((fid) => {
    var p = (_boardProjects || []).find(function (x) { return x.id === _activeBoardId; });
    var liste = Array.isArray(p.fragments) ? p.fragments : [];
    var f = liste.find(function (x) { return x.id === fid; });
    return {
      hatListe: Array.isArray(p.fragments),
      cardId: f ? f.cardId : null,
      karten: (p.cards || []).map(function (c) { return c.id; }),
      verknuepfte: liste.filter(function (x) { return x.cardId; }).map(function (x) { return x.id; }),
    };
  }, fragmentId);
}

/** Das echte Formular der Anbieter-Auswahl ausfüllen und abschicken. */
async function anbieterAnlegen(page, name) {
  await page.fill('#cardName', name);
  await page.click('#addProviderModal button[type="submit"]');
  await expect(page.locator('#addProviderModal')).toHaveCount(0);
}

test.describe('Hochzeit aus Bausteinen: der Kreis schliesst sich', () => {
  test('der Baustein-Knopf öffnet die Auswahl vorgefiltert', async ({ page }) => {
    await hochzeitAufbauen(page);
    const knopf = page.locator('[data-fragment="music"] [data-planning-action="find-fragment"]');
    await expect(knopf, 'der Baustein „DJ & Live-Musik" hat keinen Such-Knopf')
      .toHaveCount(1);
    await knopf.click();
    await expect(page.locator('#addProviderModal')).toHaveCount(1);
    // Die Kategorie steht im Suchfeld — sonst fängt der Nutzer bei null an,
    // und der Knopf hätte nur die Auswahl geöffnet wie jeder andere auch.
    await expect(page.locator('#lpickSearch')).toHaveValue('DJ');
  });

  test('die angelegte Karte landet WIRKLICH am Baustein', async ({ page }) => {
    // Das ist der Kern. Vor der Behebung war `cardId` hier leer, während
    // die Karte auf dem Board stand — beides sah für sich richtig aus.
    await hochzeitAufbauen(page);
    await page.click('[data-fragment="music"] [data-planning-action="find-fragment"]');
    await anbieterAnlegen(page, 'DJ Testlauf');

    const stand = await standLesen(page, 'music');
    expect(stand.karten.length, 'es wurde gar keine Karte angelegt').toBe(1);
    expect(stand.cardId, 'der Baustein kennt seine Karte nicht — er zeigt weiter '
      + '„noch offen" und rechnet sein Budget in der Restsumme mit')
      .toBe(stand.karten[0]);
    expect(stand.verknuepfte, 'es wurde mehr als der eine Baustein verknüpft')
      .toEqual(['music']);

    // Und der Planer muss es SEHEN. Ohne diese Zusicherung überlebt die
    // Mutation „verknüpfen, aber die Übersicht nicht neu zeichnen": im
    // Speicher stimmt alles, und der Baustein steht weiter auf „Noch nicht
    // ausgewählt", bis jemand die Seite wechselt.
    await expect(page.locator('[data-fragment="music"] select[data-planning-field="cardId"]'),
      'die Übersicht zeigt den Baustein weiter als unbelegt')
      .toHaveValue(stand.karten[0]);
  });

  test('die Herkunft gilt nur für IHR Projekt', async ({ page }) => {
    // Diese Wache ist Vorsorge: über die Oberfläche lässt sich das Projekt
    // nicht wechseln, solange der Dialog offen ist. Ein Wächter ohne Test
    // ist aber eine Behauptung — und der Schaden wäre lautlos, weil beide
    // Hochzeiten dieselben Baustein-Kennungen tragen. Die Karte landete
    // dann am gleichnamigen Baustein eines FREMDEN Vorhabens.
    const ersteId = await hochzeitAufbauen(page);
    await page.click('[data-fragment="music"] [data-planning-action="find-fragment"]');

    const zweiteId = await page.evaluate((erste) => {
      var zweites = planningCreateProject({ template: 'wedding', name: 'Andere Hochzeit' });
      _boardProjects.push(zweites);
      _activeBoardId = zweites.id;
      return zweites.id;
    }, ersteId);

    await anbieterAnlegen(page, 'DJ im falschen Plan');

    const beide = await page.evaluate(([a, b]) => {
      var hole = function (id) {
        var p = _boardProjects.find(function (x) { return x.id === id; });
        return (p.fragments || []).filter(function (f) { return f.cardId; }).map(function (f) { return f.id; });
      };
      return { erste: hole(a), zweite: hole(b) };
    }, [ersteId, zweiteId]);

    expect(beide.zweite, 'die Karte wurde an den gleichnamigen Baustein eines '
      + 'fremden Vorhabens gehängt').toEqual([]);
    expect(beide.erste, 'die Karte liegt gar nicht in diesem Projekt — sie darf '
      + 'auch hier nicht verknüpft werden').toEqual([]);
  });

  test('ein Projekt ohne gespeicherte Liste verliert die Verknüpfung nicht', async ({ page }) => {
    // `planningFragments()` leitet die Liste ab, solange das Projekt keine
    // eigene hat. Ohne das Festschreiben schriebe die Verknüpfung in diese
    // Ableitung — sichtbar für einen Augenblick, weg beim nächsten Lesen.
    await hochzeitAufbauen(page, { ohneListe: true });
    await page.click('[data-fragment="venue"] [data-planning-action="find-fragment"]');
    await anbieterAnlegen(page, 'Gutshof Testlauf');

    const stand = await standLesen(page, 'venue');
    expect(stand.hatListe, 'das Projekt hat danach keine eigene Bausteinliste — '
      + 'die Verknüpfung ging in eine Kopie').toBe(true);
    expect(stand.cardId, 'der Baustein eines Alt-Projekts bleibt unverknüpft')
      .toBe(stand.karten[0]);
  });

  test('der gewöhnliche Weg verknüpft NICHTS', async ({ page }) => {
    // Gegenprobe. Ohne sie wäre „verknüpfe immer den ersten Baustein" eine
    // Erklärung, die alle Tests oben besteht.
    await hochzeitAufbauen(page);
    await page.click('[data-planning-action="suppliers"]');
    await expect(page.locator('#addProviderModal')).toHaveCount(1);
    await anbieterAnlegen(page, 'Freie Leistung');

    const stand = await standLesen(page, 'music');
    expect(stand.karten.length, 'die Karte wurde gar nicht angelegt').toBe(1);
    expect(stand.verknuepfte, 'eine Leistung, die über „Leistung hinzufügen" kam, '
      + 'wurde an einen Baustein gehängt, den niemand gewählt hat').toEqual([]);
  });

  test('eine abgebrochene Auswahl hinterlässt keine Notiz', async ({ page }) => {
    // Der teuerste Fall, und der Grund, warum die Herkunft am Dialog steht
    // und nicht in einer Modulvariablen: wer „DJ finden" öffnet, es sich
    // anders überlegt und später etwas ganz anderes einträgt, bekäme sonst
    // eine falsche Verknüpfung — leise, und im Markup unauffällig.
    await hochzeitAufbauen(page);
    await page.click('[data-fragment="photo"] [data-planning-action="find-fragment"]');
    await expect(page.locator('#addProviderModal')).toHaveCount(1);
    await page.click('#addProviderModal .modal-close');
    await expect(page.locator('#addProviderModal')).toHaveCount(0);

    await page.click('[data-planning-action="suppliers"]');
    await anbieterAnlegen(page, 'Etwas ganz anderes');

    const stand = await standLesen(page, 'photo');
    expect(stand.verknuepfte, 'die abgebrochene Auswahl hat ihre Herkunft überlebt '
      + 'und die nächste, fremde Karte an sich gezogen').toEqual([]);
  });

  test('das verknüpfte Budget fällt aus der Restsumme heraus', async ({ page }) => {
    // Die Verknüpfung ist kein Selbstzweck: an ihr hängt, was noch zu
    // vergeben ist. Ein Baustein, der bezahlt ist und weiter mitgerechnet
    // wird, macht die einzige Zahl falsch, auf die man beim Planen sieht.
    await hochzeitAufbauen(page);
    const offenVorher = await page.evaluate(() => {
      var p = _boardProjects.find(function (x) { return x.id === _activeBoardId; });
      p.fragments.find(function (f) { return f.id === 'cake'; }).budget = 900;
      renderPlanningOverview();
      return planningFragments(p).reduce(function (s, f) {
        return s + (f.enabled !== false && !(p.cards || []).some(function (c) { return c.id === f.cardId; })
          ? Math.max(0, Number(f.budget) || 0) : 0);
      }, 0);
    });
    expect(offenVorher, 'das Probe-Budget kam gar nicht an').toBe(900);

    await page.click('[data-fragment="cake"] [data-planning-action="find-fragment"]');
    await anbieterAnlegen(page, 'Konditorei Testlauf');

    const offenNachher = await page.evaluate(() => {
      var p = _boardProjects.find(function (x) { return x.id === _activeBoardId; });
      return planningFragments(p).reduce(function (s, f) {
        return s + (f.enabled !== false && !(p.cards || []).some(function (c) { return c.id === f.cardId; })
          ? Math.max(0, Number(f.budget) || 0) : 0);
      }, 0);
    });
    expect(offenNachher, 'der gebuchte Baustein wird weiter als offen gerechnet')
      .toBe(0);
  });
});
