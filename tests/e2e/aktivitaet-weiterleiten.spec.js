// Eine gefundene Aktivität ins gemeinsame Vorhaben weiterleiten.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// `ebAktivitaetPlanen()` baut aus einem Eintrag des Aktivitäten-Bestands
// einen Entwurf und übergibt ihn an die gemeinsame Planung. Am 14.09.2026
// mit gestellter API nachgemessen — Titel, Datum und Quell-Adresse kamen
// an, zwei Angaben nicht:
//
//   Anlass (`sozGruppeTyp`) : leer, obwohl der Bestand die Kategorie führt
//   Ort                     : im Entwurf vorhanden, nirgends abgelegt
//
// Beides fiel still aus. Der Planer hatte gerade „Museum" in Köln
// angeklickt und tippte im nächsten Bild beides noch einmal ab.
//
// ── UND WARUM SIE DIE API STELLT ───────────────────────────────────────
//
// Ohne Antwort auf `social/freunde|gruppen|ich` steht `/freunde` zu Recht
// auf „Das konnte nicht geladen werden" — dann gibt es das Formular gar
// nicht, und ein Test ohne diese Antworten misst seinen eigenen
// Prüfstand statt des Produkts. Genau daran ist der erste Anlauf dieser
// Messung gescheitert und hätte beinahe einen Fehler gemeldet, den es
// nicht gibt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { ohneJsKommentare } = require('./lib/js-code');
const { warteAufAppBereit } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const BESTAND = path.join(WURZEL, 'assets', 'eb-aktivitaeten.json');
const KOELN = { stadt: 'Köln', lat: 50.9413, lon: 6.9583, umkreisKm: 50 };

function eintrag(felder) {
  return Object.assign({
    id: 't:1', art: 'ort', kategorie: 'Museum', titel: 'Nachtflohmarkt am Rhein',
    beginn: new Date(Date.now() + 36e5 * 30).toISOString(), gebiet: 'Köln',
    ort: { name: 'Halle', stadt: 'Köln', lat: 50.94, lon: 6.96, ungefaehr: false },
    quelle: { name: 'Prüfstück', url: 'https://example.org/x', lizenz: 'Test' },
    partner: false,
  }, felder || {});
}

/** Stellt die drei Antworten, ohne die `/freunde` kein Formular zeigt. */
async function sozialApiStellen(page, freunde) {
  await page.route('**/social/freunde*', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ friends: freunde || [], incoming: [], outgoing: [], blocked: [] }),
  }));
  await page.route('**/social/gruppen*', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ groups: [] }),
  }));
  await page.route('**/social/ich*', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ handle: 'planer', person: { id: 4242, name: 'Planer' } }),
  }));
}

/** Öffnet „⚡ Jetzt" mit einem gestellten Bestand und klickt weiter. */
async function weitergeleitet(page, eintraege) {
  await sozialApiStellen(page, [{ id: 9, name: 'Mia', handle: 'mia' }]);
  await page.route('**/assets/eb-aktivitaeten.json*', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      stand: new Date().toISOString(),
      mitte: { stadt: 'Köln', lat: KOELN.lat, lon: KOELN.lon },
      umkreisKm: 50, gebiete: [KOELN], eintraege: eintraege,
    }),
  }));
  await page.goto('/');
  await warteAufAppBereit(page);
  await page.evaluate(() => {
    isLoggedIn = true;
    currentUser = { id: 4242, name: 'Planer', role: 'Eventplaner', baseRole: 'Eventplaner' };
  });
  await page.evaluate(() => navigateTo('aktuelles', 'jetzt'));
  await page.locator('[onclick*="ebAktivitaetPlanen"]').first().waitFor({ timeout: 10000 });
  await page.locator('[onclick*="ebAktivitaetPlanen"]').first().click();
  // Gegenprobe: das Formular ist wirklich da. Ohne sie misst der Test
  // die Störungsmeldung und hält eine leere Eingabe für einen Befund.
  await page.locator('#sozGruppeName').waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Aktivität weiterleiten: nichts verfällt unterwegs', () => {
  test('genau EINE Ableitung der Kategorie', () => {
    // `app.js` ist eine Verkettung. Und zwei Kopien desselben Ausdrucks
    // laufen auseinander — der Filter würde dann etwas anderes „Sport"
    // nennen als die Weiterleitung.
    let n = 0;
    for (const datei of fs.readdirSync(path.join(WURZEL, 'js', 'modules', 'search'))) {
      if (!datei.endsWith('.js')) continue;
      const quelle = ohneJsKommentare(
        fs.readFileSync(path.join(WURZEL, 'js', 'modules', 'search', datei), 'utf8'));
      n += (quelle.match(/function\s+ebAktivitaetKategorie\s*\(/g) || []).length;
      // Der ausgeschriebene Ausdruck darf nur noch im Helfer stehen.
      const kopien = (quelle.match(/art\s*===\s*'sport'\s*\?\s*'Sport'/g) || []).length;
      expect(kopien, `${datei}: der Kategorie-Ausdruck steht ${kopien}-mal ausgeschrieben`)
        .toBeLessThanOrEqual(1);
    }
    expect(n, `ebAktivitaetKategorie ist ${n}-mal definiert`).toBe(1);
  });

  test('die Kategorie kommt aus dem Bestand, nicht aus einer zweiten Tabelle', async ({ page }) => {
    // Gemessen am ECHTEN Bestand: `art` kennt nur `sport` und `ort`.
    // „Ort" ist kein Anlass — das brauchbare Wort steht in `kategorie`.
    await page.goto('/');
    await warteAufAppBereit(page);
    const befund = await page.evaluate(() => ({
      sport: ebAktivitaetKategorie({ art: 'sport', kategorie: '' }),
      ort: ebAktivitaetKategorie({ art: 'ort', kategorie: 'Museum' }),
      leer: ebAktivitaetKategorie(null),
    }));
    expect(befund.sport).toBe('Sport');
    expect(befund.ort, 'die Kategorie eines Ortes wird nicht durchgereicht').toBe('Museum');
    expect(befund.leer).toBe('');
  });

  test('der Anlass steht im Formular, statt leer zu bleiben', async ({ page }) => {
    await weitergeleitet(page, [eintrag({ kategorie: 'Museum' })]);
    await expect(page.locator('#sozGruppeTyp'),
      'das Anlass-Feld bleibt leer — der Planer tippt „Museum" ab').toHaveValue('Museum');
  });

  test('ein Heimspiel heißt „Sport", nicht „Ort"', async ({ page }) => {
    await weitergeleitet(page, [eintrag({ art: 'sport', kategorie: '', titel: '1. FC vs. Bayern' })]);
    await expect(page.locator('#sozGruppeTyp')).toHaveValue('Sport');
  });

  test('Titel und Datum kommen weiter an', async ({ page }) => {
    // Gegenprobe: die zwei Lücken zu schliessen darf nicht kaputt
    // machen, was schon trug.
    await weitergeleitet(page, [eintrag({})]);
    await expect(page.locator('#sozGruppeName')).toHaveValue('Nachtflohmarkt am Rhein');
    await expect(page.locator('#sozGruppeDatum')).not.toHaveValue('');
  });

  test('der ORT verfällt nicht — er steht im Startposten', async ({ page }) => {
    // `eb_groups` hat keine Ortsspalte, das Formular kein Ortsfeld. Die
    // Angabe kommt deshalb in den Posten, wo es ein Feld dafür gibt.
    await weitergeleitet(page, [eintrag({})]);
    const posten = await page.evaluate(() => sozialPlanStartposten(_groupPlanningDraft));
    expect(posten.length, 'es entsteht gar kein Startposten').toBe(1);
    expect(posten[0].notiz, 'der Ort ist unterwegs verfallen: ' + posten[0].notiz)
      .toContain('Köln');
    expect(posten[0].kategorie, 'der Posten trägt die Kategorie nicht').toBe('Museum');
  });

  test('die Quell-Adresse bleibt erhalten und wird nicht verdrängt', async ({ page }) => {
    // Der Ort darf sich nicht an die Stelle der Quelle setzen — beide
    // sagen etwas anderes, und die Quelle ist die Lizenzpflicht.
    await weitergeleitet(page, [eintrag({})]);
    const posten = await page.evaluate(() => sozialPlanStartposten(_groupPlanningDraft));
    expect(posten[0].notiz).toContain('https://example.org/x');
    expect(posten[0].notiz).toContain('Veranstalter');
  });

  test('ohne Ort bleibt die Notiz wie vorher', async ({ page }) => {
    // Kein „Ort: " ohne Ort — eine leere Beschriftung ist schlimmer als
    // keine, weil sie nach einem Datenverlust aussieht.
    await weitergeleitet(page, [eintrag({ ort: { name: 'Halle', stadt: '', lat: 50.94, lon: 6.96 } })]);
    const posten = await page.evaluate(() => sozialPlanStartposten(_groupPlanningDraft));
    expect(posten[0].notiz, 'leere Ortsangabe: ' + posten[0].notiz).not.toContain('Ort:');
    expect(posten[0].notiz).toContain('https://example.org/x');
  });

  test('eine Quelle ohne https wird nicht übernommen', async ({ page }) => {
    // Der Wert stammt aus einer ausgelieferten Datei und landet in einer
    // Notiz, die andere lesen. `javascript:` ist genau die Stelle, an der
    // aus Daten Code wird.
    await weitergeleitet(page, [eintrag({
      quelle: { name: 'Böse', url: 'javascript:alert(1)', lizenz: 'Test' },
    })]);
    const posten = await page.evaluate(() => sozialPlanStartposten(_groupPlanningDraft));
    expect(posten[0].notiz, 'eine javascript:-Adresse ist durchgekommen')
      .not.toContain('javascript:');
    expect(posten[0].notiz).toContain('Köln');
  });

  test('der echte Bestand kennt genau die zwei Arten, auf die sich das stützt', () => {
    // Der Helfer stützt sich darauf, dass `art` nur `sport` und `ort`
    // führt. Kommt eine dritte Art dazu, muss jemand entscheiden, wie
    // sie heisst — statt sie still als leeren Anlass durchzureichen.
    const bestand = JSON.parse(fs.readFileSync(BESTAND, 'utf8'));
    const arten = new Set((bestand.eintraege || []).map((e) => e.art));
    expect([...arten].sort(), 'neue Aktivitätsart im Bestand — die Kategorie-Ableitung '
      + 'braucht dafür eine Entscheidung').toEqual(['ort', 'sport']);
  });
});
