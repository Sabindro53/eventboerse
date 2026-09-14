// Dienstleister-Termine — „was steht wann an".
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// `/auftraege` ist die Tagesseite des Dienstleisters. Am 14.09.2026 im
// echten Browser gemessen, drei Auftraege gestellt (24.12., 20.09.,
// 05.10.):
//
//   Reihenfolge der Karten : 24.12. -> 20.09. -> 05.10.   (unsortiert)
//   Uhrzeit auf der Seite  : nirgends
//   Wege zu einer Tagesansicht in der ganzen App : 0
//
// Die Reihenfolge war die, in der die Projekte zufaellig im Board-Blob
// liegen — der naechste Termin stand in der Mitte. Und `card.times` war
// gefuellt: die Zeit lag vor, sie erreichte nur nie den Menschen, der
// hinfahren muss.
//
// Gemessen wird hier die WIRKUNG an der gerenderten Seite, nicht das
// Markup: eine Gruppierung, die im Quelltext richtig aussieht und einen
// Auftrag verschluckt, ist der teurere Fehler.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { ohneJsKommentare } = require('./lib/js-code');
const { warteAufAppBereit } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const MODULE = path.join(WURZEL, 'js', 'modules');

function jsModule() {
  const aus = [];
  const gehe = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) gehe(p);
      else if (e.name.endsWith('.js')) aus.push(p);
    }
  };
  gehe(MODULE);
  return aus;
}

/**
 * Stellt einen angemeldeten Dienstleister mit Auftraegen und oeffnet
 * `/auftraege`.
 *
 * `auftraege` ist eine Liste von `[tagVersatz, name, zeiten]`; der
 * Versatz ist relativ zu HEUTE, damit die Suite nicht in dem Moment
 * falsch wird, in dem ein fest eingetragenes Datum vergangen ist. Genau
 * daran ist die alte „Demnaechst"-Liste gestorben.
 */
async function auftraegeSeite(page, auftraege) {
  await page.goto('/');
  await warteAufAppBereit(page);
  await page.evaluate(async (liste) => {
    isLoggedIn = true;
    currentUser = { id: 7777, name: 'Test DJ', role: 'Dienstleister', baseRole: 'Dienstleister' };
    const tag = (n) => {
      if (n === null) return '';
      const d = new Date();
      d.setDate(d.getDate() + n);
      return ebTerminTag(d);
    };
    _boardProjects = liste.map((a, i) => ({
      id: 'p' + i,
      name: 'Projekt ' + a[1],
      date: tag(a[0]),
      cards: [{
        id: 'c' + i,
        name: a[1],
        stage: 'angebot',
        price: 500,
        providerId: 7777,
        providerAcceptedAt: new Date().toISOString(),
        startTime: (a[2] && a[2][0] && a[2][0].start) || null,
        endTime: (a[2] && a[2][0] && a[2][0].end) || null,
        times: a[2] || [],
      }],
    }));
    _activeBoardId = 'p0';
    navigateTo('auftraege');
  }, auftraege);
  await page.locator('#auftraegeContent .auftraege-raster').first()
    .waitFor({ state: 'attached', timeout: 10000 });
  return page.locator('#auftraegeContent');
}

/** Die Namen der Auftragskarten, in der Reihenfolge, in der sie stehen. */
async function kartenNamen(seite) {
  return seite.locator('.auftraege-raster > div').evaluateAll(
    (els) => els.map((e) => {
      const t = e.querySelector('div[style*="font-weight:700"]');
      return t ? t.textContent.trim() : '?';
    }));
}

test.describe('Dienstleister-Termine: was steht wann an', () => {
  test('genau EINE Definition', () => {
    // `app.js` ist eine Verkettung: bei zwei gleichnamigen Funktionen
    // gewinnt die spaetere. Genau so waren hier schon `renderFeed()`,
    // `switchFeedTab()` und `_fetchWithTimeout()` tot.
    const namen = ['ebAuftraegeGruppieren', 'ebAuftragZeiten', 'ebAuftragZeitText',
      'ebTerminTag', 'ebAuftragSchluessel', 'ebTerminTagTitel', 'ebAuftragDatum'];
    const doppelt = [];
    for (const name of namen) {
      let n = 0;
      for (const datei of jsModule()) {
        const quelle = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
        n += (quelle.match(new RegExp('function\\s+' + name + '\\s*\\(', 'g')) || []).length;
      }
      if (n !== 1) doppelt.push(name + ' ist ' + n + '-mal definiert');
    }
    expect(doppelt, doppelt.join('\n')).toEqual([]);
  });

  test('der naechste Auftrag steht oben', async ({ page }) => {
    // DER BEFUND. Absichtlich in ungluecklicher Reihenfolge angelegt —
    // genau so lagen sie im Board-Blob.
    const seite = await auftraegeSeite(page, [
      [60, 'Weihnachtsfeier', [{ start: '20:00', end: '23:00' }]],
      [3, 'Firmenfeier', [{ start: '18:00', end: '21:00' }]],
      [10, 'Taufe', [{ start: '14:00', end: '17:00' }]],
    ]);
    expect(await kartenNamen(seite), 'die Auftraege stehen nicht nach Datum')
      .toEqual(['Firmenfeier', 'Taufe', 'Weihnachtsfeier']);
  });

  test('zwei Auftraege am selben Tag: die fruehere Uhrzeit zuerst', async ({ page }) => {
    // Ohne die Uhrzeit im Sortierschluessel entschiede wieder die
    // Reihenfolge im Blob, und zwar unsichtbar: das Datum stimmte ja.
    const seite = await auftraegeSeite(page, [
      [4, 'Abendgig', [{ start: '21:00', end: '23:00' }]],
      [4, 'Mittagsgig', [{ start: '11:00', end: '14:00' }]],
    ]);
    expect(await kartenNamen(seite), 'gleicher Tag, aber nicht nach Uhrzeit geordnet')
      .toEqual(['Mittagsgig', 'Abendgig']);
  });

  test('KEIN Auftrag faellt heraus — auch keiner ohne Datum', async ({ page }) => {
    // Die teuerste denkbare Verschlimmbesserung: eine Gruppierung, die
    // einen Auftrag verschluckt. Er ist dann weg, es gibt keine Meldung,
    // und der Dienstleister erfaehrt vom Termin gar nicht mehr.
    const seite = await auftraegeSeite(page, [
      [60, 'Weihnachtsfeier', [{ start: '20:00', end: '23:00' }]],
      [0, 'Heutegig', [{ start: '09:00', end: '12:00' }]],
      [-9, 'Alte Hochzeit', [{ start: '21:00', end: null }]],
      [null, 'Ohne Datum', []],
      [3, 'Firmenfeier', [{ start: '18:00', end: '21:00' }]],
    ]);
    const namen = await kartenNamen(seite);
    expect(namen.length, 'fuenf Auftraege gestellt, ' + namen.length + ' gerendert:\n' + namen.join('\n'))
      .toBe(5);
    for (const n of ['Weihnachtsfeier', 'Heutegig', 'Alte Hochzeit', 'Ohne Datum', 'Firmenfeier']) {
      expect(namen, n + ' ist verschwunden').toContain(n);
    }
  });

  test('„Ohne Datum" steht hinter den echten Terminen', async ({ page }) => {
    const seite = await auftraegeSeite(page, [
      [null, 'Ohne Datum', []],
      [2, 'Uebermorgen', [{ start: '10:00', end: '12:00' }]],
    ]);
    expect(await kartenNamen(seite), '„Ohne Datum" steht vor einem echten Termin')
      .toEqual(['Uebermorgen', 'Ohne Datum']);
  });

  test('der Sortierschluessel allein stellt Datumslose schon hinten ein', async ({ page }) => {
    // ── WARUM DIESER TEST AM HELFER MISST UND NICHT AN DER SEITE ───────
    //
    // Die Mutation „ohne Datum sortiert nach vorn" hat den Test darueber
    // UEBERLEBT: an der gerenderten Seite ist die Wache nicht sichtbar,
    // weil `ebAuftraegeGruppieren()` Datumslose ohnehin in eine eigene
    // Gruppe ganz hinten legt. Der Sortierschluessel entscheidet dort
    // nichts mehr.
    //
    // Eine Wache ohne Subjekt ist eine Behauptung — genau die Klasse, an
    // der dieses Projekt sonst haengenbleibt. Also bekommt sie hier ihr
    // Subjekt: der Helfer ist global und sortiert auch fuer jeden
    // kuenftigen Aufrufer, der nicht gruppiert. Ein leerer Schluessel
    // sortierte vor JEDEM Datum und schoebe ausgerechnet den Auftrag
    // nach oben, ueber den am wenigsten bekannt ist.
    await page.goto('/');
    await warteAufAppBereit(page);
    const befund = await page.evaluate(() => {
      const ohne = { project: { date: '' }, card: {} };
      const spaet = { project: { date: '2099-12-31' }, card: { startTime: '23:00', times: [] } };
      return {
        ohne: ebAuftragSchluessel(ohne),
        spaet: ebAuftragSchluessel(spaet),
        sortiert: [ohne, spaet].sort((a, b) => {
          const x = ebAuftragSchluessel(a), y = ebAuftragSchluessel(b);
          return x < y ? -1 : (x > y ? 1 : 0);
        }).map((j) => j.project.date || 'ohne'),
      };
    });
    expect(befund.sortiert, 'ein Auftrag ohne Datum sortiert vor einem mit Datum — '
      + `Schluessel: ohne=${JSON.stringify(befund.ohne)} spaet=${JSON.stringify(befund.spaet)}`)
      .toEqual(['2099-12-31', 'ohne']);
  });

  test('Vergangenes steht getrennt und ZULETZT — aber es steht da', async ({ page }) => {
    // Wegfiltern waere die bequeme Loesung und die falsche: ein Auftrag
    // von gestern traegt weiter Knoepfe (Erbringung bestaetigen,
    // Zahlung, Storno). Er gehoert nur nicht unter „als Naechstes".
    const seite = await auftraegeSeite(page, [
      [-9, 'Alte Hochzeit', [{ start: '21:00', end: null }]],
      [3, 'Firmenfeier', [{ start: '18:00', end: '21:00' }]],
    ]);
    const namen = await kartenNamen(seite);
    expect(namen, 'der vergangene Auftrag ist weggefiltert').toContain('Alte Hochzeit');
    expect(namen[namen.length - 1], 'Vergangenes steht nicht zuletzt').toBe('Alte Hochzeit');

    const gruppen = await seite.locator('.auftraege-tag').allTextContents();
    expect(gruppen[gruppen.length - 1], 'die letzte Gruppe ist nicht „Vergangen"')
      .toContain('Vergangen');
    expect(gruppen.filter((g) => /Vergangen/.test(g)).length,
      'Vergangenes steht in derselben Gruppe wie Kommendes').toBe(1);

    // Gegenprobe: der vergangene Auftrag ist nicht bloss Deko.
    const karte = seite.locator('.auftraege-raster > div').last();
    await expect(karte.locator('button'), 'der vergangene Auftrag hat keinen Knopf mehr')
      .not.toHaveCount(0);
  });

  test('die Uhrzeit steht auf der Karte', async ({ page }) => {
    const seite = await auftraegeSeite(page, [
      [3, 'Firmenfeier', [{ start: '18:00', end: '21:00' }]],
    ]);
    await expect(seite.locator('.auftrag-zeiten'), 'auf der Karte steht keine Uhrzeit')
      .toContainText('18:00–21:00');
  });

  test('zwei Einsaetze: BEIDE, nicht nur der erste', async ({ page }) => {
    // `card.startTime` ist nur der Spiegel der ersten Zeit. Wer ihn
    // liest statt `ebKartenZeiten()`, zeigt dem Fotografen die Trauung
    // und verschweigt ihm die Party.
    const seite = await auftraegeSeite(page, [
      [5, 'Doppelschicht', [{ start: '09:00', end: '12:00' }, { start: '19:00', end: '22:00' }]],
    ]);
    const zeile = seite.locator('.auftrag-zeiten');
    await expect(zeile).toContainText('09:00–12:00');
    await expect(zeile, 'der zweite Einsatz fehlt — es wurde der Spiegel gelesen')
      .toContainText('19:00–22:00');
    await expect(zeile).toContainText('2 Einsätze');
  });

  test('offenes Ende bleibt offen', async ({ page }) => {
    // „20:00 – 20:00" waere erfunden, und danach plant jemand.
    const seite = await auftraegeSeite(page, [
      [3, 'Offenes Ende', [{ start: '20:00', end: null }]],
    ]);
    const text = (await seite.locator('.auftrag-zeiten').textContent()).trim();
    expect(text, 'offenes Ende wird als Spanne erfunden: ' + text).toContain('ab 20:00');
    expect(/20:00\s*–\s*20:00/.test(text), 'aus dem offenen Ende wurde eine Spanne')
      .toBe(false);
  });

  test('Heute steht als erste Gruppe und ist als heute markiert', async ({ page }) => {
    const seite = await auftraegeSeite(page, [
      [7, 'Naechste Woche', [{ start: '10:00', end: '12:00' }]],
      [0, 'Heutegig', [{ start: '09:00', end: '12:00' }]],
      [1, 'Morgengig', [{ start: '09:00', end: '12:00' }]],
    ]);
    const gruppen = await seite.locator('.auftraege-tag').allTextContents();
    expect(gruppen[0], 'die erste Gruppe ist nicht „Heute"').toContain('Heute');
    expect(gruppen[1], 'die zweite Gruppe heisst nicht „Morgen"').toContain('Morgen');
    await expect(seite.locator('.auftraege-tag.ist-heute'),
      'der heutige Tag ist nicht hervorgehoben').toHaveCount(1);
  });

  test('die Gruppe nennt ihre Anzahl', async ({ page }) => {
    // Zwei Auftraege an einem Tag sind eine andere Lage als einer.
    const seite = await auftraegeSeite(page, [
      [4, 'Abendgig', [{ start: '21:00', end: '23:00' }]],
      [4, 'Mittagsgig', [{ start: '11:00', end: '14:00' }]],
    ]);
    await expect(seite.locator('.auftraege-tag-zahl').first()).toHaveText('2');
  });
});

// „Heute" wird LOKAL gerechnet. In UTC gemessen liegt der Tageswechsel
// in Deutschland ein bis zwei Stunden vor Mitternacht — wer um 01:30
// nachsieht, bekaeme sonst den Vortag als „heute" angeboten.
test.describe('Der Tag ist der lokale Tag', () => {
  test.use({ timezoneId: 'Europe/Berlin' });

  test('ebTerminTag() folgt der Ortszeit, nicht UTC', async ({ page }) => {
    await page.goto('/');
    await warteAufAppBereit(page);
    const befund = await page.evaluate(() => {
      // 16.06.2026, 01:30 Berliner Zeit = 15.06.2026, 23:30 UTC.
      const d = new Date('2026-06-16T01:30:00+02:00');
      return { lokal: ebTerminTag(d), utc: d.toISOString().slice(0, 10) };
    });
    // Gegenprobe zuerst: unterscheiden sich die beiden hier ueberhaupt?
    // Laeuft der Browser in UTC, waere der Test sonst gruen, ohne etwas
    // zu belegen — genau die Sorte Pruefung, die dieses Projekt schon
    // mehrfach getaeuscht hat.
    expect(befund.utc, 'die Zeitzone greift nicht — der Test belegt nichts')
      .toBe('2026-06-15');
    expect(befund.lokal, 'ebTerminTag() rechnet nach UTC statt nach Ortszeit')
      .toBe('2026-06-16');
  });
});
