// Mehrfachzeiten je Paketposition.
//
// Eine Position kann am Eventtag mehrfach stattfinden: der Fotograf zur
// Trauung und noch einmal zur Party. Bisher trug eine Karte genau eine Zeit,
// also legte man dieselbe Position zweimal an — und buchte, bezahlte und
// bestätigte sie dann auch zweimal.
//
// `card.times` ist die Wahrheit, `startTime`/`endTime` bleiben als Spiegel
// der ersten Zeit. Es gibt bewusst KEINE Migration: bestehende Karten tragen
// weiter nur startTime, und die Ableitung passiert beim Lesen. Eine Migration
// über alle Karten ist genau die Sorte Eingriff, die am 22.08. Zahlungsdaten
// hätte löschen können.
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');

const zeiten = (page, card) => page.evaluate((c) => ebKartenZeiten(c), card);
const setzen = (page, card, neu) => page.evaluate(([c, n]) => {
  const k = JSON.parse(JSON.stringify(c));
  const raus = ebKartenZeitenSetzen(k, n);
  return { karte: k, raus: raus };
}, [card, neu]);

test.describe('Board: Mehrfachzeiten lesen', () => {
  test('eine alte Karte ohne times behält ihre Zeit', async ({ page }) => {
    // Der wichtigste Fall: jede heute gespeicherte Karte sieht so aus. Ginge
    // sie hier verloren, wäre bei jedem bestehenden Board die Uhrzeit weg.
    const errors = await openApp(page);
    expect(await zeiten(page, { startTime: '14:00', endTime: '16:00' }))
      .toEqual([{ start: '14:00', end: '16:00' }]);
    // Offenes Ende bleibt offen — das war schon immer erlaubt.
    expect(await zeiten(page, { startTime: '14:00', endTime: '' }))
      .toEqual([{ start: '14:00', end: '' }]);
    expectNoPageErrors(errors);
  });

  test('ohne jede Zeit kommt eine leere Liste, kein erfundener Wert', async ({ page }) => {
    const errors = await openApp(page);
    expect(await zeiten(page, {})).toEqual([]);
    expect(await zeiten(page, { startTime: '' })).toEqual([]);
    expectNoPageErrors(errors);
  });

  test('times gewinnt gegen den Spiegel', async ({ page }) => {
    // Laufen beide auseinander, ist die Liste die Wahrheit. Andersherum
    // würde ein alter Spiegel die zweite und dritte Zeit verschlucken.
    const errors = await openApp(page);
    expect(await zeiten(page, {
      startTime: '09:00', endTime: '10:00',
      times: [{ start: '14:00', end: '16:00' }, { start: '19:00', end: '22:00' }],
    })).toEqual([{ start: '14:00', end: '16:00' }, { start: '19:00', end: '22:00' }]);
    expectNoPageErrors(errors);
  });

  test('Unsinn fällt weg, statt die Ansicht zu zerlegen', async ({ page }) => {
    // Fremde Daten, ein abgebrochener Sync, ein Tippfehler im Speicher: die
    // Karte soll trotzdem erscheinen.
    const errors = await openApp(page);
    expect(await zeiten(page, { times: [
      { start: '25:00', end: '' },        // keine Uhrzeit
      { start: 'abc', end: '10:00' },
      { end: '18:00' },                   // Ende ohne Start ist bedeutungslos
      null,
      { start: '12:00', end: 'kaputt' },  // ungültiges Ende → offenes Ende
      { start: '08:00', end: '09:00' },
    ] })).toEqual([
      { start: '08:00', end: '09:00' },
      { start: '12:00', end: '' },
    ]);
    expectNoPageErrors(errors);
  });

  test('Zeiten stehen chronologisch und doppelte nur einmal', async ({ page }) => {
    const errors = await openApp(page);
    expect(await zeiten(page, { times: [
      { start: '19:00', end: '22:00' },
      { start: '09:00', end: '' },
      { start: '19:00', end: '22:00' },
    ] })).toEqual([
      { start: '09:00', end: '' },
      { start: '19:00', end: '22:00' },
    ]);
    // Gleicher Start, verschiedenes Ende ist KEIN Duplikat.
    expect(await zeiten(page, { times: [
      { start: '09:00', end: '10:00' },
      { start: '09:00', end: '12:00' },
    ] })).toHaveLength(2);
    expectNoPageErrors(errors);
  });

  test('die Zahl der Zeiten ist gedeckelt', async ({ page }) => {
    // Ohne Deckel legt ein Fehler in einer Schleife 500 Zeiten an, und die
    // Karte rendert danach nicht mehr.
    const errors = await openApp(page);
    const viele = Array.from({ length: 40 }, (_, i) =>
      ({ start: ('0' + (i % 24)).slice(-2) + ':' + (i % 2 ? '30' : '00'), end: '' }));
    const raus = await zeiten(page, { times: viele });
    const max = await page.evaluate(() => EB_MAX_ZEITEN);
    expect(raus.length).toBeLessThanOrEqual(max);
    expect(max, 'ein Deckel von 0 oder 1 wäre kein Deckel, sondern ein Verbot')
      .toBeGreaterThan(1);
    expectNoPageErrors(errors);
  });
});

test.describe('Board: Mehrfachzeiten setzen', () => {
  test('der Spiegel folgt der ersten Zeit', async ({ page }) => {
    // Läuft er nicht mit, zeigt eine Ansicht etwas anderes als die andere —
    // und der Server bekommt eine Zeit, die es nicht mehr gibt.
    const errors = await openApp(page);
    const r = await setzen(page, { startTime: '09:00', endTime: '10:00' },
      [{ start: '19:00', end: '22:00' }, { start: '14:00', end: '16:00' }]);
    expect(r.karte.times).toEqual([
      { start: '14:00', end: '16:00' },
      { start: '19:00', end: '22:00' },
    ]);
    expect(r.karte.startTime, 'der Spiegel zeigt noch die alte Zeit').toBe('14:00');
    expect(r.karte.endTime).toBe('16:00');
    expectNoPageErrors(errors);
  });

  test('alle Zeiten entfernen leert auch den Spiegel', async ({ page }) => {
    // Sonst bliebe eine gelöschte Zeit als startTime stehen und käme beim
    // nächsten Lesen als einzige Zeit zurück.
    const errors = await openApp(page);
    const r = await setzen(page, { startTime: '09:00', endTime: '10:00' }, []);
    expect(r.karte.times).toEqual([]);
    expect(r.karte.startTime).toBe('');
    expect(r.karte.endTime).toBe('');
    expect(await zeiten(page, r.karte)).toEqual([]);
    expectNoPageErrors(errors);
  });

  test('was gespeichert wurde, wird auch zurückgemeldet', async ({ page }) => {
    // Der Aufrufer erfährt, dass eine doppelte Zeit wegfiel — sonst glaubt
    // der Nutzer, sie sei gespeichert.
    const errors = await openApp(page);
    const r = await setzen(page, {}, [
      { start: '10:00', end: '' }, { start: '10:00', end: '' }, { start: '99:99', end: '' },
    ]);
    expect(r.raus).toHaveLength(1);
    expect(r.raus).toEqual(r.karte.times);
    expectNoPageErrors(errors);
  });

  test('Setzen und Lesen ergeben dasselbe', async ({ page }) => {
    // Rundlauf: was aus ebKartenZeitenSetzen kommt, muss ebKartenZeiten
    // unverändert wieder liefern. Sonst wandert der Wert bei jedem
    // Speichern ein Stück.
    const errors = await openApp(page);
    const r = await setzen(page, {}, [
      { start: '19:00', end: '22:00' }, { start: '09:00', end: '12:00' },
    ]);
    expect(await zeiten(page, r.karte)).toEqual(r.karte.times);
    expectNoPageErrors(errors);
  });
});

/* Eine Warnung, die zu oft kommt, wird weggeklickt und ist dann schlimmer
   als keine. Die Hälfte dieser Tests prüft deshalb, wann sie SCHWEIGT. */
test.describe('Board: Überschneidungswarnung', () => {
  const paare = (page, zeiten) => page.evaluate((z) => ebZeitUeberschneidungen(z), zeiten);
  const satz = (page, zeiten) => page.evaluate((z) => ebUeberschneidungText(z), zeiten);

  test('eine echte Überschneidung wird erkannt', async ({ page }) => {
    const errors = await openApp(page);
    expect(await paare(page, [
      { start: '14:00', end: '16:00' },
      { start: '15:00', end: '17:00' },
    ])).toEqual([[0, 1]]);
    expect(await satz(page, [
      { start: '14:00', end: '16:00' },
      { start: '15:00', end: '17:00' },
    ])).toContain('1. und 2. Zeit');
    expectNoPageErrors(errors);
  });

  test('nahtlos aneinander ist kein Konflikt', async ({ page }) => {
    // 14–16 und 16–18 ist ein Ablauf. Wer hier warnt, warnt bei jeder
    // sauber geplanten Kette.
    const errors = await openApp(page);
    expect(await paare(page, [
      { start: '14:00', end: '16:00' },
      { start: '16:00', end: '18:00' },
    ])).toEqual([]);
    expect(await satz(page, [
      { start: '14:00', end: '16:00' },
      { start: '16:00', end: '18:00' },
    ])).toBe('');
    expectNoPageErrors(errors);
  });

  test('ein offenes Ende warnt nicht', async ({ page }) => {
    // „Ab 14:00" hat keine messbare Dauer. Bis Mitternacht zu rechnen
    // würde fast jedes Paar zum Konflikt machen.
    const errors = await openApp(page);
    expect(await paare(page, [
      { start: '14:00', end: '' },
      { start: '15:00', end: '17:00' },
    ])).toEqual([]);
    // Umgekehrt aber schon: die frühere Zeit hat ein Ende, die spätere
    // beginnt davor — das ist messbar, egal ob SIE offen endet.
    expect(await paare(page, [
      { start: '14:00', end: '16:00' },
      { start: '15:00', end: '' },
    ])).toEqual([[0, 1]]);
    expectNoPageErrors(errors);
  });

  test('über Mitternacht wird richtig gerechnet', async ({ page }) => {
    // „22:00 – 02:00" erzeugt die Nacht-Vorauswahl selbst. Ein reiner
    // Textvergleich hielte 02:00 für früher als 23:00 und übersähe genau
    // den Fall, für den es die Warnung gibt.
    const errors = await openApp(page);
    expect(await paare(page, [
      { start: '20:00', end: '02:00' },
      { start: '23:00', end: '01:00' },
    ]), 'die Überschneidung nach Mitternacht wird übersehen').toEqual([[0, 1]]);
    // Und die Gegenprobe: Abend endet, Nacht beginnt — kein Konflikt.
    expect(await paare(page, [
      { start: '18:00', end: '22:00' },
      { start: '22:00', end: '02:00' },
    ])).toEqual([]);
    expectNoPageErrors(errors);
  });

  test('drei Zeiten melden jedes betroffene Paar', async ({ page }) => {
    const errors = await openApp(page);
    expect(await paare(page, [
      { start: '10:00', end: '14:00' },
      { start: '11:00', end: '12:00' },
      { start: '13:00', end: '15:00' },
    ])).toEqual([[0, 1], [0, 2]]);
    expectNoPageErrors(errors);
  });

  test('eine einzelne Zeit und eine leere Liste schweigen', async ({ page }) => {
    const errors = await openApp(page);
    expect(await satz(page, [{ start: '14:00', end: '16:00' }])).toBe('');
    expect(await satz(page, [])).toBe('');
    expectNoPageErrors(errors);
  });

  test('die Warnung steht live im Formular und blockiert nicht', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 80, name: 'Zeit Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_warn';
      _boardProjects = [{
        id: 'bp_warn', name: 'Warnboard', date: '2026-09-12', budget: 0,
        cards: [{ id: 'c1', name: 'Fotograf', stage: 'geplant', _stageModel: 2,
          times: [{ start: '14:00', end: '16:00' }], startTime: '14:00', endTime: '16:00' }],
      }];
      openFlowCardModal('c1');
    });
    await page.waitForSelector('#fcZeiten .eb-zeit-block');
    await expect(page.locator('#fcZeiten_warn')).toBeHidden();

    await page.click('#fcZeiten .eb-zeit-plus');
    await page.fill('#fcZ_s1', '15:00');
    await page.fill('#fcZ_e1', '17:00');
    // Ohne Speichern, ohne Klick: die Warnung folgt der Eingabe.
    await expect(page.locator('#fcZeiten_warn')).toBeVisible();
    await expect(page.locator('#fcZeiten_warn')).toContainText('überschneiden');

    // Sie blockiert nicht — Aufbau und Service dürfen sich überlappen.
    await page.click('#flowCardModal button[type="submit"]');
    expect(await page.evaluate(() => _boardProjects[0].cards[0].times)).toEqual([
      { start: '14:00', end: '16:00' },
      { start: '15:00', end: '17:00' },
    ]);
    expectNoPageErrors(errors);
  });

  test('die Warnung verschwindet wieder, wenn der Konflikt weg ist', async ({ page }) => {
    // Ohne diese Gegenprobe wäre der Test oben auch mit „immer sichtbar"
    // erfüllt — und eine Warnung, die stehen bleibt, verliert ihre Bedeutung.
    const errors = await openApp(page);
    await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 81, name: 'Zeit Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_warn2';
      _boardProjects = [{
        id: 'bp_warn2', name: 'Warnboard', date: '2026-09-12', budget: 0,
        cards: [{ id: 'c1', name: 'Fotograf', stage: 'geplant', _stageModel: 2,
          times: [{ start: '14:00', end: '16:00' }, { start: '15:00', end: '17:00' }],
          startTime: '14:00', endTime: '16:00' }],
      }];
      openFlowCardModal('c1');
    });
    await page.waitForSelector('#fcZeiten .eb-zeit-block');
    await expect(page.locator('#fcZeiten_warn')).toBeVisible();
    await page.fill('#fcZ_s1', '17:00');
    await page.fill('#fcZ_e1', '19:00');
    await expect(page.locator('#fcZeiten_warn')).toBeHidden();
    expectNoPageErrors(errors);
  });

  test('die Karte im Flow zeigt den Konflikt an', async ({ page }) => {
    // Im Formular sieht man die Warnung nur, solange es offen ist.
    const errors = await openApp(page);
    const treffer = await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 82, name: 'Zeit Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_flow';
      _boardProjects = [{
        id: 'bp_flow', name: 'Flowboard', date: '2026-09-12', budget: 0,
        cards: [
          { id: 'ok', name: 'Sauber', stage: 'geplant', _stageModel: 2,
            times: [{ start: '10:00', end: '11:00' }, { start: '12:00', end: '13:00' }] },
          { id: 'bad', name: 'Konflikt', stage: 'geplant', _stageModel: 2,
            times: [{ start: '14:00', end: '16:00' }, { start: '15:00', end: '17:00' }] },
        ],
      }];
      renderBoardFlow();
      return {
        mitKonflikt: document.querySelectorAll('.flow-prov-time.hat-konflikt').length,
        gesamt: document.querySelectorAll('.flow-prov-time').length,
      };
    });
    expect(treffer.gesamt, 'beide Karten müssen eine Zeit zeigen').toBe(2);
    expect(treffer.mitKonflikt, 'genau die konfliktbehaftete Karte wird markiert').toBe(1);
    expectNoPageErrors(errors);
  });
});

test.describe('Board: Zeiten bearbeiten', () => {
  /** Öffnet die Flow-Karte einer Testkarte mit den angegebenen Zeiten. */
  async function modalOeffnen(page, cardZeiten) {
    await page.evaluate((z) => {
      isLoggedIn = true;
      currentUser = { id: 78, name: 'Zeit Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_edit';
      _boardProjects = [{
        id: 'bp_edit', name: 'Editboard', date: '2026-09-12', budget: 500,
        cards: [{
          id: 'c1', name: 'Fotograf', category: 'Foto', stage: 'geplant', price: 100,
          times: z, _stageModel: 2,
          startTime: z.length ? z[0].start : '', endTime: z.length ? z[0].end : '',
        }],
      }];
      openFlowCardModal('c1');
    }, cardZeiten);
    await page.waitForSelector('#fcZeiten .eb-zeit-block');
  }

  const gespeicherteZeiten = (page) => page.evaluate(() =>
    _boardProjects[0].cards[0].times);

  test('bestehende Zeiten stehen alle im Formular', async ({ page }) => {
    const errors = await openApp(page);
    await modalOeffnen(page, [
      { start: '09:00', end: '10:00' }, { start: '19:00', end: '22:00' },
    ]);
    expect(await page.locator('#fcZeiten .eb-zeit-block').count()).toBe(2);
    await expect(page.locator('#fcZ_s0')).toHaveValue('09:00');
    await expect(page.locator('#fcZ_e1')).toHaveValue('22:00');
    expectNoPageErrors(errors);
  });

  test('eine Zeit hinzufügen und speichern behält alle', async ({ page }) => {
    // Der eigentliche Nutzerweg. Ginge beim Speichern eine Zeit verloren,
    // fiele es erst auf, wenn der Dienstleister nicht erscheint.
    const errors = await openApp(page);
    await modalOeffnen(page, [{ start: '14:00', end: '16:00' }]);
    await page.click('#fcZeiten .eb-zeit-plus');
    expect(await page.locator('#fcZeiten .eb-zeit-block').count()).toBe(2);
    await page.fill('#fcZ_s1', '19:00');
    await page.fill('#fcZ_e1', '22:00');
    await page.click('#flowCardModal button[type="submit"]');
    expect(await gespeicherteZeiten(page)).toEqual([
      { start: '14:00', end: '16:00' },
      { start: '19:00', end: '22:00' },
    ]);
    expectNoPageErrors(errors);
  });

  test('eine Zeit entfernen speichert nur noch die übrige', async ({ page }) => {
    const errors = await openApp(page);
    await modalOeffnen(page, [
      { start: '09:00', end: '10:00' }, { start: '19:00', end: '22:00' },
    ]);
    await page.click('#fcZeiten .eb-zeit-block[data-zeit="0"] .eb-zeit-weg');
    expect(await page.locator('#fcZeiten .eb-zeit-block').count()).toBe(1);
    await page.click('#flowCardModal button[type="submit"]');
    expect(await gespeicherteZeiten(page)).toEqual([{ start: '19:00', end: '22:00' }]);
    expectNoPageErrors(errors);
  });

  test('das Hinzufügen verliert nichts Getipptes', async ({ page }) => {
    // Die Liste wird beim Hinzufügen neu gezeichnet. Würde dabei nicht aus
    // dem DOM zurückgelesen, wäre jede noch nicht gespeicherte Eingabe weg —
    // ein Datenverlust mitten im Formular.
    const errors = await openApp(page);
    await modalOeffnen(page, [{ start: '14:00', end: '16:00' }]);
    await page.fill('#fcZ_s0', '11:15');
    await page.click('#fcZeiten .eb-zeit-plus');
    await expect(page.locator('#fcZ_s0'), 'die getippte Zeit wurde überschrieben')
      .toHaveValue('11:15');
    expectNoPageErrors(errors);
  });

  test('bei einer einzigen Zeit gibt es keinen Entfernen-Knopf', async ({ page }) => {
    // Eine Position ohne jede Zeit ist erlaubt, aber sie soll nicht durch
    // versehentliches Wegklicken der letzten Zeile entstehen.
    const errors = await openApp(page);
    await modalOeffnen(page, [{ start: '14:00', end: '16:00' }]);
    expect(await page.locator('#fcZeiten .eb-zeit-weg').count()).toBe(0);
    await page.click('#fcZeiten .eb-zeit-plus');
    expect(await page.locator('#fcZeiten .eb-zeit-weg').count(),
      'ab zwei Zeiten muss man wieder entfernen können').toBe(2);
    expectNoPageErrors(errors);
  });

  test('eine neu angelegte Position bekommt ihre Zeiten mit', async ({ page }) => {
    // Der Anlege-Pfad ist ein anderer als der Bearbeiten-Pfad. Eine Mutation,
    // die dort `times: []` schreibt, kam durch alle übrigen Tests — der
    // Nutzer hätte beim Hinzufügen Zeiten gesetzt und keine bekommen.
    const errors = await openApp(page);
    await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 79, name: 'Zeit Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_neu';
      _boardProjects = [{ id: 'bp_neu', name: 'Neuboard', date: '2026-09-12', budget: 0, cards: [] }];
      openAddProviderModal('geplant');
    });
    await page.waitForSelector('#cardZeiten .eb-zeit-block');
    await page.fill('#cardName', 'Fotograf');
    await page.fill('#nkZ_s0', '14:00');
    await page.fill('#nkZ_e0', '16:00');
    await page.click('#cardZeiten .eb-zeit-plus');
    await page.fill('#nkZ_s1', '19:00');
    await page.fill('#nkZ_e1', '22:00');
    await page.click('#addProviderModal button[type="submit"]');

    const karte = await page.evaluate(() => _boardProjects[0].cards[0]);
    expect(karte.times).toEqual([
      { start: '14:00', end: '16:00' },
      { start: '19:00', end: '22:00' },
    ]);
    // Und der Spiegel steht auch hier richtig.
    expect(karte.startTime).toBe('14:00');
    expect(karte.endTime).toBe('16:00');
    expectNoPageErrors(errors);
  });

  test('mehr als der Deckel lässt sich nicht anlegen', async ({ page }) => {
    const errors = await openApp(page);
    await modalOeffnen(page, [{ start: '00:00', end: '' }]);
    const max = await page.evaluate(() => EB_MAX_ZEITEN);
    for (let i = 1; i < max; i++) {
      await page.click('#fcZeiten .eb-zeit-plus');
      await page.fill('#fcZ_s' + i, ('0' + i).slice(-2) + ':00');
    }
    expect(await page.locator('#fcZeiten .eb-zeit-block').count()).toBe(max);
    // Am Limit verschwindet der Knopf, statt wirkungslos dazustehen.
    expect(await page.locator('#fcZeiten .eb-zeit-plus').count()).toBe(0);
    expectNoPageErrors(errors);
  });
});

test.describe('Board: Mehrfachzeiten in der Oberfläche', () => {
  /** Legt ein Board mit einer Karte an und rendert den Ablauf. */
  async function boardMit(page, cardZeiten) {
    return page.evaluate((z) => {
      isLoggedIn = true;
      currentUser = { id: 77, name: 'Zeit Test', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_zeit';
      _boardProjects = [{
        id: 'bp_zeit', name: 'Zeitboard', date: '2026-09-12', budget: 1000,
        cards: [{
          id: 'c1', name: 'Fotograf', category: 'Foto', stage: 'bestaetigt',
          fulfilledAt: '', times: z, _stageModel: 2,
          startTime: z.length ? z[0].start : '', endTime: z.length ? z[0].end : '',
        }],
      }];
      renderBoardTimeline();
      const chain = document.getElementById('timelineChain');
      return {
        zeiten: [...chain.querySelectorAll('.tl-time')].map((e) => e.textContent.trim()),
        karten: chain.querySelectorAll('.tl-card').length,
      };
    }, cardZeiten);
  }

  test('eine Position mit drei Zeiten steht dreimal im Ablauf', async ({ page }) => {
    // Das ist der Sinn der Sache: ein Ablauf, der die zweite und dritte Zeit
    // verschweigt, ist kein Ablauf.
    const errors = await openApp(page);
    const r = await boardMit(page, [
      { start: '09:00', end: '10:00' },
      { start: '14:00', end: '16:00' },
      { start: '19:00', end: '22:00' },
    ]);
    expect(r.karten).toBe(3);
    expect(r.zeiten.join(' | ')).toContain('09:00 – 10:00');
    expect(r.zeiten.join(' | ')).toContain('19:00 – 22:00');
    // Und der Zähler sagt, dass es dieselbe Position ist.
    expect(r.zeiten.some((t) => t.includes('1/3'))).toBe(true);
    expectNoPageErrors(errors);
  });

  test('eine Position mit einer Zeit steht einmal und ohne Zähler', async ({ page }) => {
    // Gegenprobe: ohne sie wäre der Test oben auch mit „immer dreimal"
    // erfüllt, und an jeder gewöhnlichen Karte stünde ein „1/1".
    const errors = await openApp(page);
    const r = await boardMit(page, [{ start: '14:00', end: '16:00' }]);
    expect(r.karten).toBe(1);
    expect(r.zeiten[0]).toBe('14:00 – 16:00');
    expect(r.zeiten[0]).not.toContain('/');
    expectNoPageErrors(errors);
  });

  test('eine Position ganz ohne Zeit verschwindet nicht', async ({ page }) => {
    // Sie bekommt weiterhin eine Platzhalterzeit statt aus dem Ablauf zu
    // fallen — eine bestätigte Buchung, die niemand sieht, ist schlimmer
    // als eine mit geschätzter Uhrzeit.
    const errors = await openApp(page);
    const r = await boardMit(page, []);
    expect(r.karten).toBe(1);
    expect(r.zeiten[0]).toMatch(/^\d{2}:\d{2}$/);
    expectNoPageErrors(errors);
  });
});
