// Nickname für alle — die Ansicht im echten Browser (15.10.2026).
//
// Die Regeln stehen im Backend und werden dort AUSGEFÜHRT geprüft
// (`social.spec.js`, Abschnitt „Nickname"). Hier geht es um das, was der
// PHP-Prüfstand nicht sehen kann: was die Oberfläche SENDET und ZEIGT.
//
// ── WAS HIER NICHT VERWECHSELT WERDEN DARF ──────────────────────────────
//
//   Nickname      ein Name, den jedes Konto haben kann
//   Auffindbar    die Zustimmung, über ihn gefunden zu werden
//
// Bis zum 15.10.2026 waren beide eins. Ein Kasten, der den Schalter falsch
// vorbelegt oder beim Namenswechsel still mitschickt, machte Menschen
// auffindbar, die es nie wollten — und sähe dabei völlig richtig aus.
//
// Gemessen wird deshalb der gesendete RUMPF, nicht das Markup.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const PERSON = (id, name, handle) => ({
  id, name, handle, photoUrl: 'data:image/svg+xml;base64,AAAA',
});

/**
 * Antworten stellen und jede Anfrage mitschreiben.
 *
 * `ich` darf eine Funktion sein: beim Kontowechsel muss die zweite Antwort
 * eine andere sein als die erste.
 */
async function stellen(page, { ich, handle, frei } = {}) {
  const gesehen = [];
  let ichAufrufe = 0;
  await page.route('**/social/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const pfad = new URL(url).pathname;
    gesehen.push({ url, methode: req.method(), rumpf: req.postData() });
    const json = (status, daten) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(daten),
    });
    if (pfad.endsWith('/social/ich')) {
      ichAufrufe++;
      const d = typeof ich === 'function' ? ich(ichAufrufe) : ich;
      return d ? json(200, d) : json(500, {});
    }
    if (pfad.endsWith('/social/handle/frei')) {
      const h = new URL(url).searchParams.get('h');
      return typeof frei === 'function' ? frei(route, h, json) : json(200, frei || { status: 'frei', vorschlaege: [] });
    }
    if (pfad.endsWith('/social/handle')) {
      const r = typeof handle === 'function' ? handle(JSON.parse(req.postData() || '{}')) : handle;
      return json(r ? r.status : 200, r ? r.daten : {});
    }
    if (pfad.endsWith('/social/freunde')) return json(200, { friends: [], incoming: [], outgoing: [], blocked: [] });
    if (pfad.endsWith('/social/gruppen')) return json(200, { groups: [], invitations: [] });
    return json(200, {});
  });
  return { gesehen, posts: () => gesehen.filter((g) => g.methode === 'POST' && /\/social\/handle$/.test(new URL(g.url).pathname)) };
}

const ICH = (handle, auffindbar) => {
  const d = { handle, person: PERSON(1, 'Anna', handle), friends: 0 };
  if (auffindbar !== undefined) d.auffindbar = auffindbar;
  return d;
};

async function freundeOeffnen(page) {
  await openApp(page);
  await page.evaluate(() => { currentUser = { id: 1, name: 'Anna' }; });
  await page.evaluate(() => navigateTo('freunde'));
  const kasten = page.locator('#freundeInhalt [data-nick-ort="freunde"]');
  await expect(kasten).toBeVisible({ timeout: 8000 });
  return kasten;
}

test.describe('Nickname-Kasten: Name und Zustimmung sind zwei Dinge', () => {
  test('ein vergebener, aber verborgener Name steht da — der Schalter ist AUS', async ({ page }) => {
    await stellen(page, { ich: ICH('anna.b', false) });
    const kasten = await freundeOeffnen(page);
    await expect(kasten).toContainText('@anna.b');
    await expect(kasten.getByRole('textbox', { name: 'Nickname' })).toHaveValue('anna.b');
    await expect(kasten.getByRole('checkbox', { name: 'Über meinen Nickname gefunden werden' })).not.toBeChecked();
  });

  test('ein Server ohne „auffindbar" kennt nur Name = auffindbar — dann ist der Schalter AN', async ({ page }) => {
    await stellen(page, { ich: ICH('anna.b') });
    const kasten = await freundeOeffnen(page);
    await expect(kasten.getByRole('checkbox')).toBeChecked();
  });

  test('ohne Änderung wird nichts gesendet', async ({ page }) => {
    const s = await stellen(page, { ich: ICH('anna.b', false) });
    const kasten = await freundeOeffnen(page);
    await kasten.getByRole('button', { name: 'Speichern' }).click();
    await expect(kasten.getByRole('status')).toContainText('nichts zu speichern');
    expect(s.posts()).toHaveLength(0);
  });

  test('ein ungültiger Name wird nicht gesendet', async ({ page }) => {
    const s = await stellen(page, { ich: ICH('anna.b', false) });
    const kasten = await freundeOeffnen(page);
    await kasten.getByRole('textbox', { name: 'Nickname' }).fill('Anna B!');
    await kasten.getByRole('button', { name: 'Speichern' }).click();
    await expect(kasten.getByRole('status')).toContainText('3–24 Zeichen');
    expect(s.posts()).toHaveLength(0);
  });

  test('Einschalten sendet die Zustimmung ausdrücklich mit — und der Kasten zeigt danach den neuen Stand', async ({ page }) => {
    const s = await stellen(page, {
      ich: ICH('anna.b', false),
      handle: (b) => ({ status: 200, daten: { handle: b.handle, auffindbar: b.auffindbar, success: true } }),
    });
    const kasten = await freundeOeffnen(page);
    await kasten.getByRole('checkbox').check();
    await kasten.getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(() => s.posts().length).toBe(1);
    expect(JSON.parse(s.posts()[0].rumpf)).toEqual({ handle: 'anna.b', auffindbar: true });
    const neu = page.locator('#freundeInhalt [data-nick-ort="freunde"]');
    await expect(neu.getByRole('checkbox')).toBeChecked();
  });

  test('ein Namenswechsel lässt den Schalter, wie er war', async ({ page }) => {
    const s = await stellen(page, {
      ich: ICH('anna.b', false),
      handle: (b) => ({ status: 200, daten: { handle: b.handle, auffindbar: b.auffindbar, success: true } }),
    });
    const kasten = await freundeOeffnen(page);
    await kasten.getByRole('textbox', { name: 'Nickname' }).fill('@Anna.Neu');
    await kasten.getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(() => s.posts().length).toBe(1);
    expect(JSON.parse(s.posts()[0].rumpf)).toEqual({ handle: 'anna.neu', auffindbar: false });
  });

  test('„schon vergeben" bietet freie Namen an, und ein Klick trägt sie ein', async ({ page }) => {
    await stellen(page, {
      ich: ICH('anna.b', true),
      handle: () => ({ status: 409, daten: { error: 'handle_vergeben', message: 'Dieser Name ist schon vergeben.' } }),
      frei: { status: 'vergeben', vorschlaege: ['ben1', 'ben2'] },
    });
    const kasten = await freundeOeffnen(page);
    await kasten.getByRole('textbox', { name: 'Nickname' }).fill('ben');
    await kasten.getByRole('button', { name: 'Speichern' }).click();
    await expect(kasten.getByRole('status')).toContainText('schon vergeben');
    await kasten.getByRole('button', { name: '@ben2' }).click();
    await expect(kasten.getByRole('textbox', { name: 'Nickname' })).toHaveValue('ben2');
  });

  test('fremder Text in einem Vorschlag landet nie als Knopf', async ({ page }) => {
    await stellen(page, {
      ich: ICH('anna.b', true),
      handle: () => ({ status: 409, daten: { error: 'handle_vergeben', message: 'Dieser Name ist schon vergeben.' } }),
      frei: { status: 'vergeben', vorschlaege: ["x');alert(1);('", 'gut1'] },
    });
    const kasten = await freundeOeffnen(page);
    await kasten.getByRole('textbox', { name: 'Nickname' }).fill('ben');
    await kasten.getByRole('button', { name: 'Speichern' }).click();
    await expect(kasten.getByRole('button', { name: '@gut1' })).toBeVisible();
    await expect(kasten.locator('.soz-nick-vorschlaege button')).toHaveCount(1);
  });
});

test.describe('Nickname in den Einstellungen', () => {
  async function einstellungen(page) {
    await openApp(page);
    await page.evaluate(() => { currentUser = { id: 1, name: 'Anna' }; isLoggedIn = true; });
    await page.evaluate(() => navigateTo('settings'));
    return page.locator('#page-settings [data-nickname-kasten="einstellungen"]');
  }

  test('derselbe Kasten steht in den Einstellungen — mit dem Stand vom Server', async ({ page }) => {
    await stellen(page, { ich: ICH('anna.b', false) });
    const platz = await einstellungen(page);
    await expect(platz.getByRole('textbox', { name: 'Nickname' })).toHaveValue('anna.b', { timeout: 8000 });
    await expect(platz.getByRole('checkbox')).not.toBeChecked();
  });

  // CodeQL (15.10.2026): der Platz-Wert kam aus dem DOM und wurde zu HTML.
  // Ein unbekannter Ort zeichnet NICHTS — auch keiner, der ein gültiges Wort ist.
  test('ein Platz mit fremdem Ort bleibt leer, der echte wird gezeichnet', async ({ page }) => {
    await stellen(page, { ich: ICH('anna.b', true) });
    const platz = await einstellungen(page);
    await expect(platz.getByRole('textbox', { name: 'Nickname' })).toHaveValue('anna.b', { timeout: 8000 });
    await page.evaluate(() => {
      for (const wert of ["x');window.__boese=1;('", 'fremd']) {
        const d = document.createElement('div');
        d.className = 'fremder-platz';
        d.setAttribute('data-nickname-kasten', wert);
        document.body.appendChild(d);
      }
      sozialNicknameKaestenZeichnen();
    });
    for (const el of await page.locator('.fremder-platz').all()) {
      await expect(el).toBeEmpty();
    }
    await expect(platz.getByRole('textbox', { name: 'Nickname' })).toHaveValue('anna.b');
    expect(await page.evaluate(() => window.__boese)).toBeUndefined();
  });

  test('eine Störung sagt es und bietet einen zweiten Versuch — kein leerer Kasten', async ({ page }) => {
    await stellen(page, { ich: null });
    const platz = await einstellungen(page);
    await expect(platz).toContainText('konnte nicht geladen werden', { timeout: 8000 });
    await expect(platz.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();
  });

  test('nach einem Kontowechsel steht der Name des NEUEN Kontos da', async ({ page }) => {
    await stellen(page, { ich: (n) => (n === 1 ? ICH('anna.b', true) : ICH('ben.k', false)) });
    const platz = await einstellungen(page);
    await expect(platz.getByRole('textbox', { name: 'Nickname' })).toHaveValue('anna.b', { timeout: 8000 });
    await page.evaluate(() => { currentUser = { id: 2, name: 'Ben' }; });
    await page.evaluate(() => navigateTo('settings'));
    await expect(platz.getByRole('textbox', { name: 'Nickname' })).toHaveValue('ben.k', { timeout: 8000 });
  });
});

test.describe('Nickname bei der Registrierung', () => {
  async function registrierung(page) {
    await openApp(page);
    await page.evaluate(() => openModal('registerModal'));
    return page.locator('#regHandle');
  }

  test('nach dem Tippen wird geprüft, und „vergeben" bietet freie Namen an', async ({ page }) => {
    const s = await stellen(page, { frei: { status: 'vergeben', vorschlaege: ['max1'] } });
    const feld = await registrierung(page);
    await feld.fill('max');
    await expect(page.locator('#regHandleStatus')).toContainText('Schon vergeben');
    expect(s.gesehen.some((g) => new URL(g.url).searchParams.get('h') === 'max')).toBe(true);
    await page.locator('#regHandleStatus').getByRole('button', { name: '@max1' }).click();
    await expect(feld).toHaveValue('max1');
  });

  test('fremder Text in einem Vorschlag wird nie zum Knopf', async ({ page }) => {
    await stellen(page, { frei: { status: 'vergeben', vorschlaege: ["x');alert(1);('", 'max1'] } });
    const feld = await registrierung(page);
    await feld.fill('max');
    await expect(page.locator('#regHandleStatus').getByRole('button', { name: '@max1' })).toBeVisible();
    await expect(page.locator('#regHandleStatus button')).toHaveCount(1);
  });

  test('eine Störung ist „nicht prüfbar", nicht „vergeben"', async ({ page }) => {
    await stellen(page, { frei: (route) => route.fulfill({ status: 500, body: '{}' }) });
    const feld = await registrierung(page);
    await feld.fill('max');
    await expect(page.locator('#regHandleStatus')).toContainText('Prüfung gerade nicht möglich');
    await expect(page.locator('#regHandleStatus')).not.toContainText('vergeben');
  });

  test('eine verspätete Antwort auf eine alte Eingabe überschreibt die neue nicht', async ({ page }) => {
    let freigeben;
    const wartet = new Promise((r) => { freigeben = r; });
    await stellen(page, {
      frei: async (route, h, json) => {
        if (h === 'alt') { await wartet; return json(200, { status: 'vergeben', vorschlaege: [] }); }
        return json(200, { status: 'frei', vorschlaege: [] });
      },
    });
    const feld = await registrierung(page);
    await feld.fill('alt');
    await page.waitForTimeout(500);
    await feld.fill('neu');
    await expect(page.locator('#regHandleStatus')).toContainText('Verfügbar');
    freigeben();
    await page.waitForTimeout(300);
    await expect(page.locator('#regHandleStatus')).toContainText('Verfügbar');
  });

  async function formularFuellen(page, handle) {
    await page.locator('#regFirstName').fill('Max');
    await page.locator('#regLastName').fill('Muster');
    await page.locator('#regHandle').fill(handle);
    await page.locator('#regEmail').fill('max@example.org');
    await page.locator('#regPassword').fill('ein-langes-passwort');
    await page.evaluate(() => {
      const t = document.querySelector('#registerModal .terms input[type="checkbox"]');
      if (t) t.checked = true;
    });
  }

  for (const [status, sperrt] of [['vergeben', true], ['frei', false], ['fehler', false]]) {
    test(`Absenden bei „${status}": ${sperrt ? 'gesperrt' : 'geht an den Server'}`, async ({ page }) => {
      const s = await stellen(page, {
        frei: status === 'fehler'
          ? (route) => route.fulfill({ status: 500, body: '{}' })
          : { status, vorschlaege: [] },
      });
      let registriert = 0;
      await page.route('**/register', (route) => {
        registriert++;
        return route.fulfill({ status: 400, contentType: 'application/json',
          body: JSON.stringify({ message: 'Testabbruch' }) });
      });
      await registrierung(page);
      await formularFuellen(page, 'max');
      await expect(page.locator('#regHandleStatus')).not.toHaveText('', { timeout: 4000 });
      await expect(page.locator('#regHandleStatus')).not.toContainText('Wird geprüft');
      await page.evaluate(() => document.querySelector('#registerModal form')
        .dispatchEvent(new Event('submit', { cancelable: true })));
      await page.waitForTimeout(400);
      expect(registriert, sperrt ? 'trotz vergebenem Namen abgeschickt' : 'nicht abgeschickt').toBe(sperrt ? 0 : 1);
      expect(s.gesehen.length).toBeGreaterThan(0);
    });
  }

  test('scheitert der Nickname nach dem Anlegen, steht es da — mit Zustimmung im Rumpf', async ({ page }) => {
    const s = await stellen(page, {
      handle: () => ({ status: 409, daten: { error: 'handle_vergeben', message: 'Dieser Name ist schon vergeben.' } }),
    });
    await openApp(page);
    await page.evaluate(() => _regHandleSetzen('max'));
    await expect(page.locator('.toast, #toast, [class*="toast"]').filter({ hasText: 'konnte nicht gesetzt werden' }).first())
      .toBeVisible({ timeout: 4000 });
    expect(JSON.parse(s.posts()[0].rumpf)).toEqual({ handle: 'max', auffindbar: true });
  });
});
