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
