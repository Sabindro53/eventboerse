// Freunde & Gruppen — die Ansicht im echten Browser.
//
// Die Regeln stehen im Backend und werden dort ausgeführt geprüft
// (`social.spec.js`). Hier geht es um das, was der Backend-Prüfstand nicht
// sehen kann: ob die Seite den Zustand richtig ZEIGT.
//
// ── DREI ZUSTÄNDE, DIE NICHT DASSELBE SIND ──────────────────────────────
//
//   NICHT ANGEMELDET   Es gibt niemanden, dem Freunde gehören könnten.
//   STÖRUNG            Der Abruf ist fehlgeschlagen.
//   LEER               Abgerufen, und es sind wirklich keine da.
//
// Sie als eine leere Liste zu zeigen wäre eine Falschaussage: „du hast
// keine Freunde" ist etwas anderes als „wir konnten nicht nachsehen".
// Dieselbe Unterscheidung wie bei der Jetzt-Ansicht, eine Ebene höher.
//
// ── DER PRÜFSTAND NOTIERT, WAS ER BEANTWORTET ───────────────────────────
//
// `page.route()` mit einem Platzhalter trifft auch eine falsche Adresse —
// am 09.09.2026 waren so vierzehn Tests grün, während die echte Anfrage im
// 404 landete. Diese Suite hält deshalb jede beantwortete Adresse fest und
// prüft sie.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const PERSON = (id, name, handle) => ({
  id, name, handle, photoUrl: 'data:image/svg+xml;base64,AAAA',
});

const LEER = {
  freunde: { friends: [], incoming: [], outgoing: [], blocked: [] },
  gruppen: { groups: [], invitations: [] },
  ich: { handle: '', person: PERSON(1, 'Anna', ''), friends: 0 },
};

/**
 * Die Seite öffnen, angemeldet tun und die Antworten stellen.
 *
 * `antworten` ist `null` für „alles schlägt fehl".
 */
async function freundeOeffnen(page, antworten) {
  const gesehen = [];
  await page.route('**/social/**', (route) => {
    const url = route.request().url();
    gesehen.push(url);
    if (!antworten) return route.fulfill({ status: 500, body: '{}' });
    let daten = {};
    if (/\/social\/freunde(\?|$)/.test(url)) daten = antworten.freunde;
    else if (/\/social\/gruppen(\?|$)/.test(url)) daten = antworten.gruppen;
    else if (/\/social\/ich(\?|$)/.test(url)) daten = antworten.ich;
    else if (/\/social\/suche/.test(url)) daten = antworten.suche || { results: [] };
    return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(daten),
    });
  });
  await openApp(page);
  await page.evaluate(() => { currentUser = { id: 1, name: 'Anna' }; });
  await page.evaluate(() => navigateTo('freunde'));
  await page.waitForFunction(
    () => !/Wird geladen/.test(document.getElementById('freundeInhalt').textContent),
    null, { timeout: 8000 });
  return { inhalt: page.locator('#freundeInhalt'), gesehen };
}

test.describe('Freunde-Ansicht: die drei Zustände', () => {
  test('ohne Anmeldung steht dort kein leeres Adressbuch', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => { currentUser = null; });
    await page.evaluate(() => navigateTo('freunde'));
    const inhalt = page.locator('#freundeInhalt');
    await expect(inhalt).toContainText('Konto');
    await expect(inhalt, 'ohne Anmeldung wird eine Freundesliste behauptet')
      .not.toContainText('Deine Freunde (0)');
  });

  test('eine Störung sieht anders aus als eine leere Liste', async ({ page }) => {
    const { inhalt } = await freundeOeffnen(page, null);
    await expect(inhalt).toContainText('konnte nicht geladen werden');
    await expect(inhalt, '„du hast keine Freunde" ist bei einem Netzfehler eine Falschaussage')
      .not.toContainText('Deine Freunde (0)');
  });

  test('leer heisst leer, und sagt was zu tun ist', async ({ page }) => {
    const { inhalt } = await freundeOeffnen(page, LEER);
    await expect(inhalt).toContainText('Deine Freunde (0)');
    await expect(inhalt).toContainText('Suchnamen');
    await expect(inhalt).not.toContainText('konnte nicht geladen werden');
  });

  test('die drei Meldungen sind wirklich verschieden', async ({ page }) => {
    // Wer sie zusammenlegt, besteht die Einzeltests weiter, sobald eine die
    // andere enthält.
    const texte = [];
    await openApp(page);
    await page.evaluate(() => { currentUser = null; });
    await page.evaluate(() => navigateTo('freunde'));
    texte.push((await page.locator('#freundeInhalt').innerText()).replace(/\s+/g, ' ').trim());

    for (const fall of [null, LEER]) {
      const { inhalt } = await freundeOeffnen(page, fall);
      texte.push((await inhalt.innerText()).replace(/\s+/g, ' ').trim());
      await page.unrouteAll();
    }
    expect(texte.filter(Boolean)).toHaveLength(3);
    expect(new Set(texte).size, 'zwei Zustände sagen dasselbe').toBe(3);
  });

  test('die Ansicht fragt genau ihre eigenen Adressen ab', async ({ page }) => {
    // Ein Platzhalter im Prüfstand trifft auch die falsche Adresse. Ohne
    // diese Prüfung wären die Tests darüber grün, während die echte
    // Anfrage ins Leere ginge.
    const { gesehen } = await freundeOeffnen(page, LEER);
    for (const pfad of ['/social/freunde', '/social/gruppen', '/social/ich']) {
      expect(gesehen.some((u) => u.includes('/wp-json/eventboerse/v1' + pfad)),
        `${pfad} wurde nicht unter seiner echten Adresse abgefragt: ${gesehen.join(', ')}`)
        .toBe(true);
    }
  });
});

test.describe('Freunde-Ansicht: was sie zeigt', () => {
  test('eine eingehende Anfrage bekommt beide Knöpfe', async ({ page }) => {
    const { inhalt } = await freundeOeffnen(page, {
      ...LEER,
      freunde: { friends: [], incoming: [PERSON(2, 'Ben', 'ben_k')], outgoing: [], blocked: [] },
    });
    await expect(inhalt).toContainText('Anfragen an dich (1)');
    await expect(inhalt).toContainText('Annehmen');
    await expect(inhalt, 'eine Anfrage ohne Ablehnen ist keine Wahl').toContainText('Ablehnen');
  });

  test('der Zähler am Reiter zeigt, dass etwas wartet', async ({ page }) => {
    // Eine Einladung, die man erst nach dem Umschalten sieht, wird
    // übersehen — und dann wartet jemand vergeblich auf eine Antwort.
    const { inhalt } = await freundeOeffnen(page, {
      ...LEER,
      freunde: { friends: [], incoming: [PERSON(2, 'Ben', 'ben_k')], outgoing: [], blocked: [] },
      gruppen: {
        groups: [],
        invitations: [{ id: 7, name: 'Festival', role: 'invited', memberCount: 3, members: [], ownerId: 9 }],
      },
    });
    await expect(inhalt.locator('.soz-reiter-knopf .soz-punkt')).toHaveCount(2);
  });

  test('eine Einladung steht getrennt von den eigenen Gruppen', async ({ page }) => {
    const { inhalt } = await freundeOeffnen(page, {
      ...LEER,
      gruppen: {
        groups: [],
        invitations: [{
          id: 7, name: 'Festival', role: 'invited', memberCount: 3, members: [],
          ownerId: 9, owner: PERSON(9, 'Cem', 'cem99'),
        }],
      },
    });
    await page.evaluate(() => sozialReiter('gruppen'));
    await expect(inhalt).toContainText('Einladungen (1)');
    await expect(inhalt).toContainText('Deine Gruppen (0)');
    await expect(inhalt.locator('.soz-gruppe-einladung')).toHaveCount(1);
  });

  test('der Einladungscode erscheint nur, wenn der Server ihn schickt', async ({ page }) => {
    // Die Oberfläche erfindet ihn nicht. Wer ihn hier aus der Rolle
    // ableitete, zeigte ihn irgendwann jemandem, dem der Server ihn
    // bewusst vorenthalten hat.
    const basis = {
      id: 3, name: 'Hochzeit', memberCount: 2, ownerId: 1,
      owner: PERSON(1, 'Anna', 'anna.b'),
      members: [Object.assign(PERSON(1, 'Anna', 'anna.b'), { role: 'owner' })],
    };
    const { inhalt } = await freundeOeffnen(page, {
      ...LEER,
      gruppen: {
        groups: [Object.assign({}, basis, { role: 'member' })],
        invitations: [],
      },
    });
    await page.evaluate(() => sozialReiter('gruppen'));
    await expect(inhalt.locator('.soz-code')).toHaveCount(0);

    // UND DER FALL, AN DEM ES HÄNGT: Rolle `owner`, aber KEIN Code in der
    // Antwort. Ohne ihn überlebte die Mutation „Code aus der Rolle
    // ableiten" — die Oberfläche erfände dann einen und zeigte ihn
    // jemandem, dem der Server ihn bewusst vorenthalten hat.
    await page.unrouteAll();
    const ohneCode = await freundeOeffnen(page, {
      ...LEER,
      gruppen: { groups: [Object.assign({}, basis, { role: 'owner' })], invitations: [] },
    });
    await page.evaluate(() => sozialReiter('gruppen'));
    await expect(ohneCode.inhalt.locator('.soz-code'),
      'die Oberfläche erfindet einen Einladungscode').toHaveCount(0);

    // Gegenprobe: mit Code wird er gezeigt — sonst wäre „nie zeigen" der
    // bequemste Weg zu einem grünen Test.
    await page.unrouteAll();
    const zwei = await freundeOeffnen(page, {
      ...LEER,
      gruppen: {
        groups: [Object.assign({}, basis, { role: 'owner', inviteCode: 'abc123def456ghi789' })],
        invitations: [],
      },
    });
    await page.evaluate(() => sozialReiter('gruppen'));
    await expect(zwei.inhalt.locator('.soz-code')).toHaveCount(1);
    await expect(zwei.inhalt).toContainText('abc123def456ghi789');
  });

  test('die Leitung bekommt keinen Entfernen-Knopf', async ({ page }) => {
    // Der Server lehnt das ohnehin ab. Ein Knopf, der zuverlässig eine
    // Fehlermeldung erzeugt, ist trotzdem ein kaputter Knopf.
    const { inhalt } = await freundeOeffnen(page, {
      ...LEER,
      gruppen: {
        groups: [{
          id: 3, name: 'Hochzeit', role: 'owner', memberCount: 2, ownerId: 1,
          owner: PERSON(1, 'Anna', 'anna.b'),
          members: [
            Object.assign(PERSON(1, 'Anna', 'anna.b'), { role: 'owner' }),
            Object.assign(PERSON(2, 'Ben', 'ben_k'), { role: 'member' }),
          ],
        }],
        invitations: [],
      },
    });
    await page.evaluate(() => sozialReiter('gruppen'));
    const zeilen = inhalt.locator('.soz-mitglieder .soz-person');
    await expect(zeilen).toHaveCount(2);
    await expect(zeilen.nth(0).locator('button'),
      'die Leitung hat einen Entfernen-Knopf').toHaveCount(0);
    await expect(zeilen.nth(1).locator('button').first(),
      'ein Mitglied hat keinen Knopf — dann prüft der Test nichts').toBeVisible();
  });

  test('fremdes Markup bleibt Text', async ({ page }) => {
    // Gruppennamen kommen von anderen Nutzern. Der Server entschärft beim
    // Anlegen; hier wird die zweite Schicht gemessen — eine Antwort kann
    // veraltet oder verfälscht sein.
    const { inhalt } = await freundeOeffnen(page, {
      ...LEER,
      gruppen: {
        groups: [{
          id: 3, name: 'Fest <img src=x onerror=window.__geknackt=1>',
          role: 'member', memberCount: 1, ownerId: 9,
          owner: PERSON(9, '<b>Cem</b>', 'cem99'),
          members: [Object.assign(PERSON(9, '<b>Cem</b>', 'cem99'), { role: 'owner' })],
        }],
        invitations: [],
      },
    });
    await page.evaluate(() => sozialReiter('gruppen'));
    await expect(inhalt.locator('img[src="x"]')).toHaveCount(0);
    // ÜBER DIE GANZE ANSICHT, nicht nur über die Kopfzeile. Die erste
    // Fassung mass `.soz-gruppe-kopf b` — dort wird der Name über eine
    // ANDERE Stelle gesetzt, und die Mutation „Personenname unmaskiert"
    // überlebte, weil sie die Mitgliederzeile traf und nicht den Kopf.
    await expect(inhalt.locator('b'), 'irgendwo wurde fremder Text zu Markup')
      .toHaveCount(0);
    await expect(inhalt.locator('.soz-person-text strong').first())
      .toHaveText('<b>Cem</b>');
    expect(await page.evaluate(() => window.__geknackt)).toBeUndefined();
  });

  test('die Ansicht wirft keine Fehler', async ({ page }) => {
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e)));
    await freundeOeffnen(page, LEER);
    await page.evaluate(() => sozialReiter('gruppen'));
    await page.evaluate(() => sozialReiter('freunde'));
    expect(fehler).toEqual([]);
  });
});

test.describe('Freunde-Ansicht: der Weg dorthin', () => {
  test('das Nutzermenü führt hin', async ({ page }) => {
    await openApp(page);
    const knopf = page.locator('#loggedInMenu button', { hasText: /Freunde/ });
    await expect(knopf, 'kein Einstieg im Nutzermenü').toHaveCount(1);
  });

  test('/freunde ist ein Deep-Link', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navigateTo('freunde'));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => location.pathname)).toContain('freunde');
    expect(await page.evaluate(
      () => (document.querySelector('section.page.active') || {}).id)).toBe('page-freunde');
  });
});
