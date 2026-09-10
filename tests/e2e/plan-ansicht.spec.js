// Der gemeinsame Plan — die Ansicht im echten Browser.
//
// Die Regeln stehen im Backend und werden dort ausgeführt geprüft
// (`plan.spec.js`). Hier geht es um das, was ein Backend-Prüfstand nicht
// sehen kann: ob die Seite den Zustand richtig ZEIGT — und vor allem, was
// sie beim Konflikt tut.
//
// ── EIN KONFLIKT IST DER NORMALFALL ─────────────────────────────────────
//
// Zwei Leute am selben Posten sind bei einem gemeinsamen Plan zu erwarten,
// nicht die Störung. Antwortet der Server mit 409, trägt seine Antwort den
// AKTUELLEN Stand; der muss sofort dastehen. „Bitte neu laden" wäre hier
// die schlechteste Auskunft — der Nutzer hat nichts falsch gemacht.
//
// ── DER PRÜFSTAND NOTIERT, WAS ER BEANTWORTET ───────────────────────────
//
// `page.route()` mit einem Platzhalter trifft auch eine falsche Adresse —
// am 09.09.2026 waren so vierzehn Tests grün, während die echte Anfrage im
// 404 landete. Diese Suite hält deshalb jede beantwortete Adresse fest.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const ICH = { id: 1, name: 'Anna', handle: 'anna.b', photoUrl: 'data:image/svg+xml;base64,AAAA' };
const BEN = { id: 2, name: 'Ben', handle: 'ben.k', photoUrl: 'data:image/svg+xml;base64,AAAA' };

const GRUPPE = {
  id: 7, name: 'Hochzeit Anna & Ben', eventType: 'Hochzeit', eventDate: '2027-06-12',
  role: 'owner', ownerId: 1,
  members: [
    { id: 1, name: 'Anna', handle: 'anna.b', role: 'owner', photoUrl: 'data:image/svg+xml;base64,AAAA' },
    { id: 2, name: 'Ben', handle: 'ben.k', role: 'member', photoUrl: 'data:image/svg+xml;base64,AAAA' },
  ],
};

const POSTEN = (o) => Object.assign({
  id: 100, titel: 'DJ für die Feier', kategorie: 'Musik', status: 'offen',
  notiz: '', betragCent: 90000, listingId: null, rev: 1,
  zustaendig: null, erstelltVon: ICH, erstelltAm: '2026-09-10 00:00:00',
}, o || {});

/**
 * Die Seite öffnen, angemeldet tun, den Plan aufklappen.
 *
 * `plan` ist `null` für „der Abruf schlägt fehl". `handlung` beantwortet
 * die Schreib-Aufrufe; ohne sie werden sie nicht gebraucht.
 */
async function planOeffnen(page, plan, handlung) {
  const gesehen = [];
  await page.route('**/social/**', (route) => {
    const url = route.request().url();
    const methode = route.request().method();
    gesehen.push(methode + ' ' + url);

    if (/\/plan(\?|$)/.test(url) && methode === 'GET') {
      if (!plan) return route.fulfill({ status: 500, body: '{}' });
      return route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(plan),
      });
    }
    if (/\/plan\//.test(url) && methode === 'POST') {
      const a = handlung || { status: 200, body: {} };
      return route.fulfill({
        status: a.status, contentType: 'application/json', body: JSON.stringify(a.body),
      });
    }
    let daten = {};
    if (/\/social\/freunde(\?|$)/.test(url)) daten = { friends: [BEN], incoming: [], outgoing: [], blocked: [] };
    else if (/\/social\/gruppen(\?|$)/.test(url)) daten = { groups: [GRUPPE], invitations: [] };
    else if (/\/social\/ich(\?|$)/.test(url)) daten = { handle: 'anna.b', person: ICH, friends: 1 };
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
  // Auf den Gruppen-Reiter und den Plan aufklappen.
  await page.evaluate(() => sozialReiter('gruppen'));
  await page.evaluate(() => sozialGruppePlanen(7));
  await page.waitForFunction(
    () => {
      const el = document.getElementById('sozPlan7');
      return el && !/wird geladen/i.test(el.textContent);
    }, null, { timeout: 8000 });
  return { plan: page.locator('#sozPlan7'), gesehen };
}

test.describe('Plan-Ansicht: die drei Zustände', () => {
  test('eine Störung sieht anders aus als ein leerer Plan', async ({ page }) => {
    // „Noch nichts geplant" bei einem Netzfehler wäre eine Falschaussage
    // über die Gruppe — dieselbe Regel wie bei der Freundesliste.
    const { plan } = await planOeffnen(page, null);
    await expect(plan).toContainText('konnte nicht geladen werden');
    await expect(plan, 'bei einer Störung wird ein leerer Plan behauptet')
      .not.toContainText('Noch nichts geplant');
  });

  test('eine Störung bietet einen zweiten Versuch an', async ({ page }) => {
    // Eine Fehlermeldung ohne Ausweg lässt den Nutzer die Seite neu laden —
    // und dabei verliert er alles andere auf ihr.
    const { plan } = await planOeffnen(page, null);
    await expect(plan.locator('button', { hasText: 'Erneut versuchen' })).toBeVisible();
  });

  test('leer heisst leer, und sagt was zu tun ist', async ({ page }) => {
    const { plan } = await planOeffnen(page, { items: [], bilanz: { posten: 0, offen: 0, summeCent: 0 } });
    await expect(plan).toContainText('Noch nichts geplant');
    await expect(plan, 'der leere Plan sagt nicht, was man tun kann').toContainText('Catering');
    await expect(plan).not.toContainText('konnte nicht geladen werden');
  });

  test('die beiden Meldungen sind wirklich verschieden', async ({ page }) => {
    // Wer sie zusammenlegt, besteht die Einzeltests weiter, sobald eine die
    // andere enthält.
    const texte = [];
    for (const fall of [null, { items: [], bilanz: { posten: 0, offen: 0, summeCent: 0 } }]) {
      const { plan } = await planOeffnen(page, fall);
      texte.push((await plan.innerText()).replace(/\s+/g, ' ').trim());
    }
    expect(texte[0], 'Störung und leer sagen dasselbe').not.toBe(texte[1]);
    expect(texte[0].includes(texte[1]) || texte[1].includes(texte[0]),
      'die eine Meldung enthält die andere').toBe(false);
  });
});

test.describe('Plan-Ansicht: der Inhalt', () => {
  test('ein Posten zeigt Zustand, Budget und wer sich kümmert', async ({ page }) => {
    const { plan } = await planOeffnen(page, {
      items: [POSTEN({ status: 'vergeben', zustaendig: BEN, betragCent: 90000 })],
      bilanz: { posten: 1, offen: 0, summeCent: 90000 },
    });
    await expect(plan).toContainText('DJ für die Feier');
    await expect(plan).toContainText('Musik');
    await expect(plan).toContainText('übernommen');
    await expect(plan).toContainText('Ben');
    await expect(plan, 'das Budget steht nicht in Euro da').toContainText('900');
  });

  test('ein freier Posten lädt zum Übernehmen ein, ein vergebener nicht', async ({ page }) => {
    // Die Oberfläche blendet aus, was der Server ablehnen würde. Dass er es
    // wirklich ablehnt, prüft plan.spec.js — nicht diese Zeile.
    const frei = await planOeffnen(page, {
      items: [POSTEN()], bilanz: { posten: 1, offen: 1, summeCent: 90000 },
    });
    await expect(frei.plan.locator('button', { hasText: 'Ich mach das' })).toBeVisible();

    const vergeben = await planOeffnen(page, {
      items: [POSTEN({ status: 'vergeben', zustaendig: BEN })],
      bilanz: { posten: 1, offen: 0, summeCent: 90000 },
    });
    await expect(vergeben.plan.locator('button', { hasText: 'Ich mach das' })).toHaveCount(0);
  });

  test('nur wer selbst zugesagt hat, sieht „Doch nicht"', async ({ page }) => {
    const fremd = await planOeffnen(page, {
      items: [POSTEN({ status: 'vergeben', zustaendig: BEN })],
      bilanz: { posten: 1, offen: 0, summeCent: 90000 },
    });
    await expect(fremd.plan.locator('button', { hasText: 'Doch nicht' })).toHaveCount(0);

    const eigen = await planOeffnen(page, {
      items: [POSTEN({ status: 'vergeben', zustaendig: ICH })],
      bilanz: { posten: 1, offen: 0, summeCent: 90000 },
    });
    await expect(eigen.plan.locator('button', { hasText: 'Doch nicht' })).toBeVisible();
  });

  test('die Bilanz kommt vom Server, nicht aus dem Browser', async ({ page }) => {
    // Zwei Rechenwege für dieselbe Zahl driften, und diese Zahl ist Geld.
    // Geprüft wird, dass die ANGEZEIGTE Summe die gelieferte ist — auch
    // wenn sie nicht zur Postenliste passt.
    const { plan } = await planOeffnen(page, {
      items: [POSTEN({ betragCent: 90000 })],
      bilanz: { posten: 1, offen: 1, summeCent: 123400 },
    });
    await expect(plan.locator('.soz-plan-kopf'), 'die Summe wird im Browser nachgerechnet')
      .toContainText('1.234');
  });

  test('fremder Text bleibt Text', async ({ page }) => {
    // Der Server entschärft beim Schreiben; hier wird ERNEUT maskiert. Eine
    // ausgelieferte Antwort kann veraltet oder verfälscht sein.
    const { plan } = await planOeffnen(page, {
      items: [POSTEN({ titel: '<img src=x onerror=alert(1)>Catering', notiz: '<b>fett</b>' })],
      bilanz: { posten: 1, offen: 1, summeCent: 0 },
    });
    await expect(plan.locator('img'), 'eingeschleustes Markup wurde gerendert').toHaveCount(0);
    await expect(plan.locator('b'), 'eingeschleustes Markup wurde gerendert').toHaveCount(0);
    await expect(plan).toContainText('Catering');
  });
});

test.describe('Plan-Ansicht: der Konflikt', () => {
  test('bei 409 steht sofort der aktuelle Stand da — ohne Neuladen', async ({ page }) => {
    // ── DER KERN DIESER SUITE ───────────────────────────────────────────
    //
    // Der Server schickt bei 409 den aktuellen Stand mit. Wer ihn
    // wegwirft und nur eine Fehlermeldung zeigt, lässt den Nutzer auf
    // falsche Daten sehen und weiter darauf klicken.
    const { plan } = await planOeffnen(page, {
      items: [POSTEN()], bilanz: { posten: 1, offen: 1, summeCent: 90000 },
    }, {
      status: 409,
      body: {
        code: 'schon_vergeben',
        message: 'Jemand anderes kümmert sich schon darum.',
        item: POSTEN({ status: 'vergeben', zustaendig: BEN, rev: 2 }),
      },
    });

    await plan.locator('button', { hasText: 'Ich mach das' }).click();
    // Der Posten zeigt jetzt Ben — obwohl der eigene Klick abgelehnt wurde.
    await expect(plan, 'der abgelehnte Klick lässt den veralteten Stand stehen')
      .toContainText('Ben');
    await expect(plan.locator('button', { hasText: 'Ich mach das' }),
      'der Knopf lädt weiter zum Übernehmen ein, obwohl der Posten vergeben ist')
      .toHaveCount(0);
  });

  test('der Konflikt wird gesagt, nicht verschluckt', async ({ page }) => {
    const { plan } = await planOeffnen(page, {
      items: [POSTEN()], bilanz: { posten: 1, offen: 1, summeCent: 90000 },
    }, {
      status: 409,
      body: {
        code: 'schon_vergeben',
        message: 'Jemand anderes kümmert sich schon darum.',
        item: POSTEN({ status: 'vergeben', zustaendig: BEN, rev: 2 }),
      },
    });
    await plan.locator('button', { hasText: 'Ich mach das' }).click();
    await expect(page.locator('body'), 'der Nutzer erfährt nicht, was passiert ist')
      .toContainText('kümmert sich schon');
  });
});

test.describe('Plan-Ansicht: die Adressen', () => {
  test('der Plan wird unter der Gruppe abgerufen, nicht irgendwo', async ({ page }) => {
    // Ein gestellter Prüfstand mit Platzhalter kann eine kaputte Adresse
    // nicht finden — deshalb wird die echte Adresse nachgesehen.
    const { gesehen } = await planOeffnen(page, {
      items: [], bilanz: { posten: 0, offen: 0, summeCent: 0 },
    });
    const treffer = gesehen.filter((u) => /\/social\/gruppen\/7\/plan(\?|$)/.test(u));
    expect(treffer.length, `keine Anfrage an den Plan der Gruppe 7:\n${gesehen.join('\n')}`)
      .toBeGreaterThan(0);
    expect(treffer[0]).toMatch(/^GET /);
  });

  test('der Plan lädt erst, wenn ihn jemand sehen will', async ({ page }) => {
    // Ein Plan, der bei jedem Öffnen der Seite für jede Gruppe mitgeladen
    // wird, kostet bei zehn Gruppen zehn Anfragen für nichts.
    //
    // ── GEMESSEN WIRD DIE REIHENFOLGE, NICHT DER ZEITPUNKT ──────────────
    //
    // Der erste Entwurf prüfte direkt nach dem Rendern, dass noch keine
    // Plan-Anfrage da ist — und war damit ein Rennen: `fetch` läuft
    // asynchron, die Abfangstelle war noch nicht dran. Die Mutation
    // „ungefragt mitladen" überlebte prompt, obwohl der Test genau sie
    // fangen sollte.
    //
    // Jetzt wird eine MARKE in die Liste gelegt, sobald jemand den Plan
    // aufklappt. Steht davor eine Plan-Anfrage, ist sie ungefragt gekommen
    // — das gilt unabhängig davon, wie schnell irgendetwas ist.
    const gesehen = [];
    await page.route('**/social/**', (route) => {
      const url = route.request().url();
      gesehen.push(url);
      let daten = {};
      if (/\/plan(\?|$)/.test(url)) daten = { items: [], bilanz: { posten: 0, offen: 0, summeCent: 0 } };
      else if (/\/social\/freunde(\?|$)/.test(url)) daten = { friends: [], incoming: [], outgoing: [], blocked: [] };
      else if (/\/social\/gruppen(\?|$)/.test(url)) daten = { groups: [GRUPPE], invitations: [] };
      else if (/\/social\/ich(\?|$)/.test(url)) daten = { handle: 'anna.b', person: ICH, friends: 0 };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(daten) });
    });
    await openApp(page);
    await page.evaluate(() => { currentUser = { id: 1, name: 'Anna' }; });
    await page.evaluate(() => navigateTo('freunde'));
    await page.waitForFunction(
      () => !/Wird geladen/.test(document.getElementById('freundeInhalt').textContent),
      null, { timeout: 8000 });
    await page.evaluate(() => sozialReiter('gruppen'));

    // Gegenprobe zuerst: die Gruppe steht wirklich da. Ohne sie könnte der
    // Test dadurch bestehen, dass gar nichts gerendert wurde.
    await expect(page.locator('#freundeInhalt')).toContainText('Hochzeit Anna & Ben');

    gesehen.push('--- AUFGEKLAPPT ---');
    await page.evaluate(() => sozialGruppePlanen(7));
    await page.waitForFunction(
      () => {
        const el = document.getElementById('sozPlan7');
        return el && !/wird geladen/i.test(el.textContent);
      }, null, { timeout: 8000 });

    const marke = gesehen.indexOf('--- AUFGEKLAPPT ---');
    const vorher = gesehen.slice(0, marke).filter((u) => /\/plan/.test(u));
    expect(vorher, `der Plan wird ungefragt geladen:\n${gesehen.join('\n')}`).toHaveLength(0);
    // Und danach kommt er wirklich — sonst wäre die Regel dadurch erfüllt,
    // dass der Plan überhaupt nie geladen wird.
    const nachher = gesehen.slice(marke).filter((u) => /\/plan/.test(u));
    expect(nachher.length, 'nach dem Aufklappen wird der Plan gar nicht geholt')
      .toBeGreaterThan(0);
  });
});
