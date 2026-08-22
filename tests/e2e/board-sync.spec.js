// Board-Sync: was passiert, wenn lokaler Stand und Server auseinanderlaufen.
//
// Das Board liegt in localStorage UND auf dem Server. Zusammengeführt wird in
// `_mergeBoardProjects()` — 50 Zeilen, die entscheiden, welche Version eines
// Projekts überlebt. Ein Fehler dort verliert die Planung eines Nutzers oder
// lässt gelöschte Projekte wieder auftauchen; beides bemerkt man erst, wenn
// es passiert ist. Bis hierher war davon nichts geprüft.
//
// Getestet wird die echte Funktion aus `app.js` im Browser, nicht eine
// Nachbildung. Sie steht durch die Modul-Verkettung im selben Scope.
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');

/** Führt Server- und Lokalstand mit einem gesetzten Grabstein-Zustand zusammen. */
async function merge(page, serverArr, localArr, tombstones) {
  return page.evaluate(({ serverArr, localArr, tombstones }) => {
    _boardTombstones = tombstones || [];
    const r = _mergeBoardProjects(serverArr, localArr);
    return {
      ids: r.merged.map((p) => p.id),
      namen: r.merged.map((p) => p.name),
      uploadNeeded: r.uploadNeeded,
    };
  }, { serverArr, localArr, tombstones });
}

const P = (id, name, updatedAt, extra) =>
  Object.assign({ id, name, updatedAt, cards: [], _stageModel: 2 }, extra || {});

test.describe('Board-Sync: lokaler Stand gegen Server', () => {
  test('ein nur lokal angelegtes Projekt überlebt und will hochgeladen werden', async ({ page }) => {
    // Der häufigste Fall: offline oder vor dem ersten Sync geplant. Ginge es
    // hier verloren, wäre die Arbeit des Nutzers weg — und zwar still.
    const errors = await openApp(page);
    const r = await merge(page, [P('a', 'Vom Server', 2000)], [P('b', 'Nur lokal', 1000)], []);
    expect(r.ids.sort()).toEqual(['a', 'b']);
    expect(r.uploadNeeded, 'der lokale Stand würde beim nächsten Sync verschwinden').toBe(true);
    expectNoPageErrors(errors);
  });

  test('die neuere Fassung gewinnt — in beide Richtungen', async ({ page }) => {
    // Nur eine Richtung zu prüfen wäre wertlos: „immer lokal" und „immer
    // Server" bestünden je die Hälfte der Fälle.
    const errors = await openApp(page);

    const lokalNeuer = await merge(page, [P('a', 'alt', 1000)], [P('a', 'neu', 2000)], []);
    expect(lokalNeuer.namen).toEqual(['neu']);
    expect(lokalNeuer.uploadNeeded, 'die neuere lokale Fassung wird nie gepusht').toBe(true);

    const serverNeuer = await merge(page, [P('a', 'neu', 2000)], [P('a', 'alt', 1000)], []);
    expect(serverNeuer.namen).toEqual(['neu']);
    expectNoPageErrors(errors);
  });

  test('fehlt updatedAt, zählt createdAt', async ({ page }) => {
    // Sonst stünden beide Seiten auf 0 und der Server gewänne immer — ein
    // frisch angelegtes Projekt verlöre gegen eine veraltete Serverkopie.
    const errors = await openApp(page);
    const r = await merge(page,
      [{ id: 'a', name: 'Server alt', createdAt: 1000, cards: [], _stageModel: 2 }],
      [{ id: 'a', name: 'Lokal neu', createdAt: 5000, cards: [], _stageModel: 2 }], []);
    expect(r.namen).toEqual(['Lokal neu']);
    expectNoPageErrors(errors);
  });

  test('ein gelöschtes Projekt kommt nicht zurück', async ({ page }) => {
    // Der Server kennt es noch, lokal wurde es gelöscht. Ohne Grabstein
    // erschiene es bei jedem Sync erneut — der Nutzer löscht, es kommt
    // wieder, und niemand versteht warum.
    const errors = await openApp(page);
    const r = await merge(page, [P('a', 'Gelöscht', 1000), P('b', 'Bleibt', 1000)], [],
      [{ id: 'a', deletedAt: 2000 }]);
    expect(r.ids).toEqual(['b']);
    expect(r.uploadNeeded, 'der Grabstein erreicht den Server nie').toBe(true);
    expectNoPageErrors(errors);
  });

  test('eine Bearbeitung nach dem Löschen überlebt', async ({ page }) => {
    // Die Gegenrichtung, und sie ist nötig: sonst liesse sich eine einmal
    // gelöschte ID nie wieder verwenden, und ein Gerät, das die Löschung
    // verpasst hat, verlöre die spätere Arbeit stillschweigend.
    const errors = await openApp(page);
    const r = await merge(page, [], [P('a', 'Wieder da', 3000)], [{ id: 'a', deletedAt: 2000 }]);
    expect(r.ids).toEqual(['a']);
    expectNoPageErrors(errors);
  });

  test('das Ergebnis steht neueste zuerst', async ({ page }) => {
    const errors = await openApp(page);
    const r = await merge(page,
      [P('alt', 'Alt', 1000), P('neu', 'Neu', 3000), P('mittel', 'Mittel', 2000)], [], []);
    expect(r.ids).toEqual(['neu', 'mittel', 'alt']);
    expectNoPageErrors(errors);
  });
});

/* Die Stage-Migration läuft bei JEDEM Laden über alle Karten und darf dabei
   Zahlungsfelder leeren — sie räumt einen alten, künstlichen „Bezahlt"-Marker
   weg, den die frühere Provider-Annahme ohne echte Stripe-Referenz gesetzt
   hat. Geprüft war bisher nur, dass sie diesen Marker WEGRÄUMT. Dass sie eine
   echte Zahlung STEHEN LÄSST, war es nicht: eine Mutation, die
   `!card.paymentIntentId` aus der Bedingung nimmt, löscht jeden Zahlungsbeleg
   bei jedem Laden und kam durch die gesamte Suite. */
test.describe('Board-Migration: Zahlungsdaten', () => {
  const migriere = (page, cards) => page.evaluate((cards) => {
    const projects = [{ id: 'p', cards: JSON.parse(JSON.stringify(cards)) }];
    const changed = _migrateBoardStageModel(projects);
    return { changed, cards: projects[0].cards };
  }, cards);

  test('eine echte Stripe-Zahlung wird nie geleert', async ({ page }) => {
    // Gleiche Zeitstempel sind kein Beweis für einen künstlichen Marker —
    // eine Sofortzahlung bei Annahme sieht genau so aus. Was den Unterschied
    // macht, ist die Referenz.
    const errors = await openApp(page);
    const zeit = '2026-08-10T10:00:00Z';
    const r = await migriere(page, [
      { id: 'intent', stage: 'bestaetigt', providerAcceptedAt: zeit, paidAt: zeit,
        paidAmount: 4500, paymentStatus: 'paid', paymentIntentId: 'pi_echt' },
      { id: 'referenz', stage: 'bestaetigt', providerAcceptedAt: zeit, paidAt: zeit,
        paidAmount: 9900, paymentStatus: 'Bezahlt', paymentReference: 'ref_echt' },
    ]);
    expect(r.cards[0].paidAt, 'Zahlungsdatum gelöscht').toBe(zeit);
    expect(r.cards[0].paidAmount, 'Betrag gelöscht').toBe(4500);
    expect(r.cards[0].paymentStatus).toBe('paid');
    expect(r.cards[1].paidAt).toBe(zeit);
    expect(r.cards[1].paidAmount).toBe(9900);
    expectNoPageErrors(errors);
  });

  test('der künstliche Marker ohne Referenz verschwindet', async ({ page }) => {
    // Die Gegenrichtung. Ohne sie wäre der Test oben mit „nie etwas löschen"
    // erfüllbar — und der alte Falschbeleg bliebe für immer stehen.
    const errors = await openApp(page);
    const zeit = '2026-08-10T10:00:00Z';
    const r = await migriere(page, [
      { id: 'kuenstlich', stage: 'bestaetigt', providerAcceptedAt: zeit, paidAt: zeit,
        paidAmount: 4500, paymentStatus: 'Bezahlt', paymentMethod: 'Stripe' },
    ]);
    expect(r.cards[0].paidAt).toBe('');
    expect(r.cards[0].paidAmount).toBe(0);
    expect(r.cards[0].paymentStatus).toBe('');
    expectNoPageErrors(errors);
  });

  test('eine später erfasste Zahlung bleibt stehen', async ({ page }) => {
    // Ohne Referenz, aber Annahme und Zahlung zu verschiedenen Zeiten: das ist
    // eine nachträglich vermerkte Zahlung, kein Artefakt der alten Annahme.
    const errors = await openApp(page);
    const r = await migriere(page, [
      { id: 'spaeter', stage: 'bestaetigt', providerAcceptedAt: '2026-08-10T10:00:00Z',
        paidAt: '2026-08-14T09:30:00Z', paidAmount: 12000, paymentStatus: 'Bezahlt' },
    ]);
    expect(r.cards[0].paidAt).toBe('2026-08-14T09:30:00Z');
    expect(r.cards[0].paidAmount).toBe(12000);
    expectNoPageErrors(errors);
  });

  test('der zweite Lauf ändert nichts mehr', async ({ page }) => {
    // Die Migration läuft bei jedem Laden. Ohne die Versionsmarke liefe sie
    // immer wieder — und was sie einmal richtig geräumt hat, träfe sie beim
    // nächsten Mal in einem anderen Zustand an.
    const errors = await openApp(page);
    const r = await page.evaluate(() => {
      const zeit = '2026-08-10T10:00:00Z';
      const projects = [{ id: 'p', flowLayout: { a: 1 }, cards: [
        { id: 'a', stage: 'bestaetigt', providerAcceptedAt: zeit, paidAt: zeit, paymentStatus: 'Bezahlt' },
        { id: 'b', stage: 'abgeschlossen', fulfilledAt: zeit, paymentIntentId: 'pi', paymentStatus: 'paid' },
      ] }];
      const erst = _migrateBoardStageModel(projects);
      const nachErstem = JSON.stringify(projects);
      const zweit = _migrateBoardStageModel(projects);
      return { erst, zweit, unveraendert: JSON.stringify(projects) === nachErstem };
    });
    expect(r.erst).toBe(true);
    expect(r.zweit, 'die Migration meldet beim zweiten Lauf erneut Änderungen').toBe(false);
    expect(r.unveraendert, 'der zweite Lauf verändert die Karten').toBe(true);
    expectNoPageErrors(errors);
  });

  test('eine bereits migrierte Karte wird nicht erneut angefasst', async ({ page }) => {
    // Sie sieht aus wie ein Altfall — gleiche Zeitstempel, keine Referenz —
    // trägt aber die Versionsmarke. Fasste die Migration sie trotzdem an,
    // verlöre eine echte Zahlung ihre Felder beim nächsten Laden.
    const errors = await openApp(page);
    const zeit = '2026-08-10T10:00:00Z';
    const r = await migriere(page, [
      { id: 'fertig', stage: 'abgeschlossen', providerAcceptedAt: zeit, paidAt: zeit,
        paidAmount: 7700, paymentStatus: 'Bezahlt', _stageModel: 2 },
    ]);
    expect(r.changed, 'eine v2-Karte löst eine Änderung aus').toBe(false);
    expect(r.cards[0].paidAmount).toBe(7700);
    expect(r.cards[0].stage, 'die Stufe wurde neu berechnet').toBe('abgeschlossen');
    expectNoPageErrors(errors);
  });
});

test.describe('Board-Sync: Grabsteine', () => {
  test('vom Server kommt das spätere Löschdatum, nicht das erste', async ({ page }) => {
    // Ein Gerät löscht, legt neu an, löscht wieder. Nähme die Zusammenführung
    // das ältere Datum, überlebte die zwischenzeitliche Fassung die zweite
    // Löschung.
    const errors = await openApp(page);
    // Die Zeitstempel müssen im 60-Tage-Fenster liegen — sonst prüft der Test
    // versehentlich nur den Verfall und wäre für das späte Datum blind.
    const stand = await page.evaluate(() => {
      currentUser = { id: 99 };
      const t0 = Date.now() - 10 * 86400 * 1000;
      _boardTombstones = [{ id: 'a', deletedAt: t0 + 1000 }, { id: 'b', deletedAt: t0 + 9000 }];
      _mergeTombstones([{ id: 'a', deletedAt: t0 + 5000 }, { id: 'b', deletedAt: t0 + 2000 }]);
      return _boardTombstones
        .map((t) => t.id + ':' + (t.deletedAt - t0)).sort();
    });
    expect(stand).toEqual(['a:5000', 'b:9000']);
    expectNoPageErrors(errors);
  });

  test('alte Grabsteine werden vergessen', async ({ page }) => {
    // Ohne Verfall wüchse die Liste unbegrenzt und ein Jahre alter Eintrag
    // könnte eine neu vergebene ID sofort wieder löschen.
    const errors = await openApp(page);
    const übrig = await page.evaluate(() => {
      currentUser = { id: 99 };
      const tag = 86400 * 1000;
      _boardTombstones = [];
      _mergeTombstones([
        { id: 'frisch', deletedAt: Date.now() - 5 * tag },
        { id: 'uralt', deletedAt: Date.now() - 400 * tag },
      ]);
      return _boardTombstones.map((t) => t.id);
    });
    expect(übrig).toEqual(['frisch']);
    expectNoPageErrors(errors);
  });

  test('ein kaputter Speicherstand legt das Board nicht lahm', async ({ page }) => {
    // Fremde Erweiterungen, ein abgebrochener Schreibvorgang, ein manueller
    // Eingriff: JSON.parse wirft, und ohne Fang käme das Board gar nicht
    // hoch. Lieber ohne Grabsteine starten als gar nicht.
    const errors = await openApp(page);
    const ergebnis = await page.evaluate(() => {
      currentUser = { id: 99 };
      localStorage.setItem('eb_board_tombstones_99', '{kein json');
      _boardTombstones = [{ id: 'x', deletedAt: 1 }];
      _loadBoardTombstones();
      return { anzahl: _boardTombstones.length, typ: Array.isArray(_boardTombstones) };
    });
    expect(ergebnis.typ, 'nach dem Fehler ist es kein Array mehr').toBe(true);
    expect(ergebnis.anzahl).toBe(0);
    expectNoPageErrors(errors);
  });
});
