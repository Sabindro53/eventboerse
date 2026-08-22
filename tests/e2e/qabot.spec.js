// Der QA-Bot: landet eine echte Frage beim richtigen Thema?
//
// Der Bot ordnet jede Frage einem von 13 Themen zu und bietet danach dessen
// Aktionen an. Die Zuordnung entscheidet also, welche Knöpfe der Nutzer sieht
// — und sie entstand bisher aus Auslöserlisten, die niemand gegen echte Sätze
// gemessen hat. Beim ersten Messen landete „Wie schreibe ich einen Anbieter
// an?" bei `listing`: der Fragende bekam „Inserat erstellen" angeboten, weil
// `anbieter` dort ein Auslöser ist und als einziger traf.
//
// Diese Tabelle ist der Schutz davor. Sie prüft nicht die Formulierung der
// Antwort, sondern wo die Frage ankommt — das ist die Eigenschaft, an der
// eine Änderung an den Auslösern etwas kaputt macht.
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');

/**
 * Echte Sätze mit dem Thema, das sie treffen müssen.
 *
 * Mehrere zulässige Themen, wo die Frage wirklich mehrdeutig ist: „Zeig mir
 * DJs in meiner Nähe" darf bei der Suche oder beim Radar landen, beide führen
 * den Nutzer richtig weiter. Ein Test, der hier eine einzige Antwort erzwingt,
 * würde bei jeder sinnvollen Verbesserung fehlschlagen.
 */
const FRAGEN = [
  ['Ich komme nicht in mein Konto rein', ['login']],
  ['Der Bestätigungscode kam nicht an', ['login']],
  ['Wie hoch ist die Auszahlung auf mein Konto?', ['payment']],
  ['Ich möchte mit Kreditkarte bezahlen', ['payment']],
  ['Wie lege ich ein neues Angebot an?', ['listing']],
  ['Wie schreibe ich einen Anbieter an?', ['messages']],
  ['Wie kontaktiere ich einen Dienstleister?', ['messages']],
  ['Wie funktioniert das Planungsboard?', ['board']],
  ['Ich brauche Catering für 50 Personen', ['search']],
  ['Zeig mir DJs in meiner Nähe', ['search', 'radar']],
  ['Wo sehe ich meinen Umsatz?', ['business']],
  ['Was steht in eurer Datenschutzerklärung?', ['legal']],
  ['Darf ich meine Telefonnummer weitergeben?', ['safechat', 'legal']],
  ['Kann ich Bilder mit KI erstellen?', ['media']],
];

test.describe('QA-Bot: Frage trifft Thema', () => {
  test('echte Sätze landen beim richtigen Thema', async ({ page }) => {
    const errors = await openApp(page);
    const treffer = await page.evaluate((fragen) =>
      fragen.map(([satz]) => _qaFindTopic(satz).id), FRAGEN);

    const daneben = FRAGEN
      .map(([satz, erlaubt], i) => ({ satz, erlaubt, ist: treffer[i] }))
      .filter((x) => !x.erlaubt.includes(x.ist));

    expect(daneben.map((x) => `„${x.satz}" → ${x.ist} (erwartet ${x.erlaubt.join('/')})`))
      .toEqual([]);
    expectNoPageErrors(errors);
  });

  test('keine Frage fällt stumm durch', async ({ page }) => {
    // `fallback` ist kein Fehler — aber wenn die halbe Tabelle dort landet,
    // ist die Zuordnung kaputt und der Test oben hätte es nur einzeln
    // gemeldet.
    const errors = await openApp(page);
    const fallbacks = await page.evaluate((fragen) =>
      fragen.filter(([satz]) => _qaFindTopic(satz).id === 'fallback').length, FRAGEN);
    expect(fallbacks, 'Fragen landen im Auffangthema').toBe(0);
    expectNoPageErrors(errors);
  });

  test('die Messung erkennt eine kaputte Zuordnung überhaupt', async ({ page }) => {
    // Gegenprobe: Kauderwelsch MUSS im Auffangthema landen. Ohne diese
    // Zusicherung wäre der Test oben auch mit „alles trifft immer" erfüllt.
    const errors = await openApp(page);
    const id = await page.evaluate(() => _qaFindTopic('xqzv plrmt wbnk').id);
    expect(id, 'selbst Kauderwelsch bekommt ein Thema zugewiesen').toBe('fallback');
    expectNoPageErrors(errors);
  });

  test('jedes Thema bietet mindestens eine Aktion an', async ({ page }) => {
    // Eine Antwort ohne Weg ist eine Sackgasse: der Bot erklärt etwas und
    // der Nutzer muss selbst suchen, wo er es tun kann.
    const errors = await openApp(page);
    const ohne = await page.evaluate(() =>
      QA_TOPICS.filter((t) => !t.actions || !t.actions.length).map((t) => t.id));
    expect(ohne).toEqual([]);
    expectNoPageErrors(errors);
  });

  test('kein Auslöser steht in zwei Themen', async ({ page }) => {
    // Ein doppelter Auslöser entscheidet nach Reihenfolge im Array statt
    // nach Bedeutung — genau so gewann `login` gegen `payment` bei allem,
    // worin „konto" vorkommt. Bekannte Überschneidungen stehen hier
    // benannt; eine NEUE fällt auf.
    const bekannt = ['konto', 'rechnung', 'kontakt'];
    const errors = await openApp(page);
    const doppelt = await page.evaluate(() => {
      const wo = {};
      QA_TOPICS.forEach((t) => t.triggers.forEach((x) => {
        (wo[x] = wo[x] || []).push(t.id);
      }));
      return Object.keys(wo).filter((k) => wo[k].length > 1);
    });
    expect(doppelt.filter((d) => !bekannt.includes(d)),
      'neuer doppelter Auslöser — die Reihenfolge im Array entscheidet dann').toEqual([]);
    expectNoPageErrors(errors);
  });
});
