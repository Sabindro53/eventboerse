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

/* ══════════════════════════════════════════════════════════════════════
   WAS NICHT GEHT — UND DER KNOPF, DER NIE ZUM RADAR FÜHRTE
   ══════════════════════════════════════════════════════════════════════

   Gemeldet am 15.09.2026: der Assistent „verweist nicht richtig" und soll
   auch Nicht-Möglichkeiten beantworten. Zwei getrennte Befunde:

   1. `{ label: 'Radar öffnen', target: 'aktuelles' }` — `runQaAction` reichte
      nur `target` an `navigateTo()` weiter. Der Knopf landete auf „Für dich",
      nie auf dem Radar. Beschriftung und Ziel liefen auseinander.

   2. Ein angemeldeter Eventplaner, der inserieren wollte, bekam den Knopf
      „Inserat erstellen" — in eine Sackgasse. Die Rollenzusage war leer:
      `_qaAnswer` hängte „Ich berücksichtige, dass du gerade als X unterwegs
      bist" an und gab danach für jede Rolle dieselbe Antwort.
*/
const WILL_ANBIETEN = [
  'Ich möchte selbst eine Dienstleistung anbieten',
  'Wie kann ich hier etwas anbieten?',
  'Ich will ein Inserat erstellen',
  'Kann ich als DJ inserieren?',
  'Ich möchte meine Leistung verkaufen',
  'Wie werde ich Dienstleister?',
  'Ich will meine Räume vermieten',
];

/* Dieselbe Rolle, aber KEINE Absicht zu inserieren. Ohne diese Hälfte
   wäre „gib immer die Absage" eine Erklärung, die alle Treffer besteht —
   dieselbe Anordnung wie beim Kontaktschutz-Korpus. */
const WILL_NICHT_ANBIETEN = [
  'Welche Anbieter gibt es in Köln?',
  'Wie kontaktiere ich einen Dienstleister?',
  'Was kostet ein DJ?',
  'Wie funktioniert das Planungsboard?',
  'Zeig mir Catering in meiner Nähe',
  'Wie hoch ist die Provision?',
];

test.describe('QA-Bot: Nicht-Möglichkeiten und Ziele', () => {
  test('der Knopf „Radar öffnen" trägt den Unterkanal', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      const t = QA_TOPICS.find((x) => x.id === 'radar');
      const a = t && t.actions.find((x) => /radar/i.test(x.label));
      return { target: a && a.target, data: a && a.data, argZahl: runQaAction.length };
    });
    expect(r.target, 'Radar-Aktion zeigt auf die Feed-Seite').toBe('aktuelles');
    expect(r.data, 'ohne Unterkanal landet der Knopf auf „Für dich"').toBe('radar');
    // Gegenprobe: der Läufer kann den Unterkanal überhaupt annehmen. Ohne sie
    // wäre `data: 'radar'` eine Angabe, die niemand liest.
    expect(r.argZahl, 'runQaAction nimmt den Unterkanal nicht entgegen').toBeGreaterThanOrEqual(3);
  });

  test('der Knopf führt wirklich zum Radar, nicht in den Feed', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { runQaAction('page', 'aktuelles', 'radar'); });
    await page.waitForTimeout(1500);
    const wo = await page.evaluate(() => ({ pfad: location.pathname, karte: !!document.querySelector('#feedRadarMap') }));
    expect(wo.pfad, 'die Adresse nennt den Radar nicht').toBe('/aktuelles/radar');
    expect(wo.karte, 'die Radarkarte ist nicht da').toBe(true);
  });

  test('ein Eventplaner bekommt die Absage statt einer Sackgasse', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate((saetze) => {
      isLoggedIn = true;
      currentUser = { id: 4242, name: 'P', role: 'Eventplaner', baseRole: 'Eventplaner' };
      return saetze.map((s) => !!_qaNichtMoeglich(s));
    }, WILL_ANBIETEN);
    const daneben = WILL_ANBIETEN.filter((_, i) => !r[i]);
    expect(daneben, `diese Sätze bekommen weiter „Inserat erstellen": ${daneben.join(' · ')}`).toEqual([]);
  });

  test('normale Fragen desselben Planers werden NICHT abgewiesen', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate((saetze) => {
      isLoggedIn = true;
      currentUser = { id: 4242, name: 'P', role: 'Eventplaner', baseRole: 'Eventplaner' };
      return saetze.map((s) => !!_qaNichtMoeglich(s));
    }, WILL_NICHT_ANBIETEN);
    const falsch = WILL_NICHT_ANBIETEN.filter((_, i) => r[i]);
    expect(falsch, `Fehlalarm — diese Fragen sind keine Inserats-Absicht: ${falsch.join(' · ')}`).toEqual([]);
  });

  test('ein Dienstleister darf anbieten und bekommt keine Absage', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate((saetze) => {
      isLoggedIn = true;
      currentUser = { id: 7, name: 'D', role: 'Dienstleister', baseRole: 'Dienstleister' };
      return saetze.map((s) => !!_qaNichtMoeglich(s));
    }, WILL_ANBIETEN);
    expect(r.filter(Boolean).length, 'ein Dienstleister wird fälschlich abgewiesen').toBe(0);
  });

  test('ein Gast wird nicht abgewiesen — er kann sich noch als Dienstleister anmelden', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate((saetze) => {
      isLoggedIn = false; currentUser = null;
      return saetze.map((s) => !!_qaNichtMoeglich(s));
    }, WILL_ANBIETEN);
    expect(r.filter(Boolean).length, 'einem Gast wird etwas verboten, das er noch wählen kann').toBe(0);
  });

  test('die Absage nennt den Weg, nicht nur das Nein', async ({ page }) => {
    await openApp(page);
    const a = await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 4242, name: 'P', role: 'Eventplaner', baseRole: 'Eventplaner' };
      return _qaNichtMoeglich('Ich möchte etwas anbieten');
    });
    expect(a, 'keine Absage gefunden').not.toBeNull();
    // Die Auskunft muss am Code belegt sein: 30-auth.js verlangt fuer eine
    // Dienstleister-Registrierung Firmenname UND bestaetigte Gewerbeanmeldung.
    expect(a.antwort).toMatch(/Gewerbeanmeldung/i);
    expect(a.antwort).toMatch(/Dienstleister/i);
    expect(a.actions.some((x) => x.target === 'registerModal'),
      'die Absage bietet keinen Weg zur Dienstleister-Registrierung').toBe(true);
  });

  test('die leere Rollenzusage ist weg', async ({ page }) => {
    // „Ich berücksichtige, dass du gerade als X unterwegs bist" behauptete
    // eine Rücksicht und gab für jede Rolle dieselbe Antwort.
    const fs = require('node:fs');
    const path = require('node:path');
    const quelle = fs.readFileSync(
      path.join(__dirname, '..', '..', 'js', 'modules', 'ui', '31-modals-toast-qabot.js'), 'utf8');
    const { ohneJsKommentare } = require('./lib/js-code');
    expect(ohneJsKommentare(quelle)).not.toMatch(/Ich berücksichtige, dass du gerade als/);
  });
});
