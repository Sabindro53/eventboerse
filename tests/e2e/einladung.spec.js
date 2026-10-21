// Einladen ohne Konto — PRODUCT_REDESIGN.md 6.2 (Teil A).
//
// ── DER BEFUND (16.10.2026, Dev-Shell, Telefonbreite) ───────────────────
//
// Den Einladungslink gab es schon: `/freunde/einladung?einladung=CODE`.
// Wer ihn OHNE Konto öffnete, sah „Dafür brauchst du ein Konto." und einen
// Knopf „Anmelden" — nicht, dass er eingeladen ist, und keinen Weg zur
// Registrierung, obwohl Eingeladene meist neu sind. Nach der Anmeldung
// stand der Code zwar in der Adresse, aber Eingabefeld und „Beitreten"
// musste man selbst finden. Teilen ging nur über „Link kopieren".
//
// ── DIE ENTSCHEIDUNGEN DES INHABERS ──────────────────────────────────────
//
// E1  Ein Link holt auch Menschen ohne Konto, über WhatsApp, Mail und Co.
// E2  NEIN: Eingeladene registrieren oder melden sich zuerst an (kostenlos);
//     vorher zeigt die Ansicht keine Gruppendaten.
//
// ── DREI GRENZEN, DIE HIER GEHALTEN WERDEN ──────────────────────────────
//
// 1. Eventbörse verschickt nichts. WhatsApp, Mail und SMS öffnen die App
//    des Einladenden; die Adresse der eingeladenen Person erreicht den
//    Server nie. Ein Test hält fest, dass beim Teilen keine Anfrage an
//    unsere API geht.
// 2. Kein stilles Beitreten. Erst ein Klick auf „Gruppe beitreten" schickt
//    den Code — der Klick ist die Zustimmung, wie beim Code bisher.
// 3. Falsch und abgelaufen sagen dasselbe (wer 404 von 403 unterscheiden
//    kann, kann Gruppen zählen).
const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit } = require('./helpers');

const CODE = '0123456789abcdef01';
const GRUPPE = { id: 7, name: 'Sommerfest am See', role: 'owner', inviteCode: CODE, memberCount: 2, members: [] };

async function apiStellen(page, { gruppen = [], beitreten } = {}) {
  const anfragen = [];
  await page.route('**/eventboerse/v1/**', (r) => {
    const url = r.request().url();
    anfragen.push(r.request().method() + ' ' + url.split('/v1/')[1]);
    if (/social\/freunde/.test(url)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ friends: [], incoming: [], outgoing: [], blocked: [] }) });
    if (/social\/gruppen\/beitreten/.test(url)) return beitreten ? beitreten(r) : r.fulfill({ contentType: 'application/json', body: JSON.stringify({ group: GRUPPE }) });
    if (/social\/gruppen\/\d+\/plan/.test(url)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    if (/social\/gruppen/.test(url)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ groups: gruppen, invitations: [] }) });
    if (/social\/ich/.test(url)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ handle: 'probe', person: { id: 4242, name: 'Probe' } }) });
    return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  return anfragen;
}

/** Öffnet /freunde/einladung mit `code` in der Adresse — angemeldet oder nicht. */
async function oeffne(page, { code = CODE, nutzer = null } = {}) {
  await openApp(page);
  await warteAufAppBereit(page);
  await page.evaluate(async ([code, nutzer]) => {
    const bb = document.getElementById('betaBanner'); if (bb) bb.hidden = true;
    if (nutzer) { currentUser = nutzer; isLoggedIn = true; }
    history.replaceState(null, '', '/freunde/einladung' + (code ? '?einladung=' + encodeURIComponent(code) : ''));
    // So startet die App bei einem geöffneten Link: navigateTo(…, true)
    // schreibt die Adresse nicht neu. Ohne das dritte Argument ersetzt
    // pushState den Pfad samt Code — der Prüfstand mäße dann einen Weg,
    // den kein Besucher nimmt.
    await navigateTo('freunde', 'einladung', true);
  }, [code, nutzer]);
}

// Der Cookie-Banner trägt selbst role="dialog" — wer nur „den Dialog"
// zählt, zählt ihn mit. Gesucht wird deshalb immer über den Namen.
const ICH = { id: 4242, name: 'Probe', role: 'Event-Planer' };
const inhalt = (page) => page.locator('#freundeInhalt');

test.describe('Beim Einladenden: Teilen über die eigenen Apps', () => {
  test('„Freunde einladen" bietet WhatsApp, E-Mail, SMS und Kopieren — mit Link und Gruppenname', async ({ page }) => {
    await apiStellen(page, { gruppen: [GRUPPE] });
    await oeffne(page, { code: null, nutzer: ICH });
    await page.getByRole('button', { name: 'Freunde einladen' }).click();
    const dlg = page.getByRole('dialog', { name: /Freunde einladen/ });
    await expect(dlg).toBeVisible();
    const href = (name) => dlg.getByRole('link', { name }).getAttribute('href');
    const wa = await href('WhatsApp');
    expect(wa.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(wa.split('text=')[1]);
    expect(text).toContain('Sommerfest am See');
    expect(text).toContain('/freunde/einladung?einladung=' + CODE);
    expect(text).toMatch(/kostenlos/i);
    const mail = await href('E-Mail');
    expect(mail.startsWith('mailto:?subject=')).toBe(true);
    expect(decodeURIComponent(mail)).toContain('Sommerfest am See');
    expect(decodeURIComponent(mail)).toContain('einladung=' + CODE);
    const sms = await href('SMS');
    expect(sms.startsWith('sms:?&body=')).toBe(true);
    // Fremde Apps öffnen sich in einem neuen Fenster — ohne Zugriff zurück.
    expect(await dlg.getByRole('link', { name: 'WhatsApp' }).getAttribute('rel')).toContain('noopener');
  });

  test('Teilen schickt nichts an unseren Server', async ({ page }) => {
    const anfragen = await apiStellen(page, { gruppen: [GRUPPE] });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await oeffne(page, { code: null, nutzer: ICH });
    await page.getByRole('button', { name: 'Freunde einladen' }).click();
    const vorher = anfragen.length;
    await page.getByRole('dialog', { name: /Freunde einladen/ }).getByRole('button', { name: 'Link kopieren' }).click();
    const kopiert = await page.evaluate(() => navigator.clipboard.readText());
    expect(kopiert).toMatch(new RegExp('/freunde/einladung\\?einladung=' + CODE + '$'));
    expect(anfragen.slice(vorher)).toEqual([]);
  });

  test('„Teilen …" erscheint nur, wo das System teilen kann, und bekommt Text und Link', async ({ page }) => {
    await page.addInitScript(() => { window.__geteilt = null; navigator.share = (d) => { window.__geteilt = d; return Promise.resolve(); }; });
    await apiStellen(page, { gruppen: [GRUPPE] });
    await oeffne(page, { code: null, nutzer: ICH });
    await page.getByRole('button', { name: 'Freunde einladen' }).click();
    await page.getByRole('dialog', { name: /Freunde einladen/ }).getByRole('button', { name: /Teilen/ }).click();
    const d = await page.evaluate(() => window.__geteilt);
    expect(d.url).toContain('einladung=' + CODE);
    expect(d.text).toContain('Sommerfest am See');
  });

  test('Gegenprobe: ohne Teilen-Funktion des Systems fehlt der Knopf', async ({ page }) => {
    await page.addInitScript(() => { try { delete Navigator.prototype.share; } catch (e) {} navigator.share = undefined; });
    await apiStellen(page, { gruppen: [GRUPPE] });
    await oeffne(page, { code: null, nutzer: ICH });
    await page.getByRole('button', { name: 'Freunde einladen' }).click();
    await expect(page.getByRole('dialog', { name: /Freunde einladen/ }).getByRole('button', { name: /Teilen/ })).toHaveCount(0);
  });

  test('Escape schließt die Auswahl, der Fokus kehrt zurück', async ({ page }) => {
    await apiStellen(page, { gruppen: [GRUPPE] });
    await oeffne(page, { code: null, nutzer: ICH });
    const knopf = page.getByRole('button', { name: 'Freunde einladen' });
    await knopf.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Freunde einladen/ })).toHaveCount(0);
    // Genau der auslösende Knopf — nicht irgendein Element, dessen Text
    // „Freunde einladen" enthält: <body> enthält ihn auch, und daran hat
    // die Mutation „Fokus nicht zurückgeben" zuerst überlebt.
    expect(await page.evaluate(() => (document.activeElement.getAttribute('onclick') || ''))).toMatch(/^sozialEinladenDialog\(7, this\)$/);
  });

  test('wer keinen Code sieht (Mitglied), bekommt auch keinen Einladen-Knopf', async ({ page }) => {
    await apiStellen(page, { gruppen: [{ ...GRUPPE, role: 'member', inviteCode: undefined }] });
    await oeffne(page, { code: null, nutzer: ICH });
    await expect(inhalt(page)).toContainText('Sommerfest am See');
    await expect(page.getByRole('button', { name: 'Freunde einladen' })).toHaveCount(0);
  });
});

test.describe('Bei der eingeladenen Person ohne Konto', () => {
  test('sieht „Du bist eingeladen" und den Weg zur kostenlosen Registrierung — keine Gruppendaten (E2)', async ({ page }) => {
    await apiStellen(page);
    await oeffne(page);
    await expect(inhalt(page)).toContainText('Du bist eingeladen');
    await expect(inhalt(page)).not.toContainText('Dafür brauchst du ein Konto');
    await expect(inhalt(page)).not.toContainText('Sommerfest');
    await page.getByRole('button', { name: /Kostenlos registrieren/ }).click();
    await expect(page.locator('#registerModal')).toBeVisible();
    // Eingeladene planen mit — die Registrierung steht auf Eventplaner.
    expect(await page.locator('#registerModal .role-btn.active[data-role]').getAttribute('data-role')).toBe('user');
  });

  test('„Ich habe schon ein Konto" öffnet die Anmeldung', async ({ page }) => {
    await apiStellen(page);
    await oeffne(page);
    await page.getByRole('button', { name: 'Ich habe schon ein Konto' }).click();
    await expect(page.locator('#loginModal')).toBeVisible();
  });

  test('Gegenprobe: ohne Einladung bleibt es bei der Kontoerklärung', async ({ page }) => {
    await apiStellen(page);
    await oeffne(page, { code: null });
    await expect(inhalt(page)).toContainText('Dafür brauchst du ein Konto');
    await expect(inhalt(page)).not.toContainText('Du bist eingeladen');
  });

  test('ein Code in falscher Form gilt nicht als Einladung', async ({ page }) => {
    await apiStellen(page);
    await oeffne(page, { code: '<img src=x onerror=1>' });
    await expect(inhalt(page)).not.toContainText('Du bist eingeladen');
    expect(await page.locator('#freundeInhalt img[onerror]').count()).toBe(0);
  });
});

test.describe('Nach Anmeldung oder Registrierung', () => {
  test('erst der Klick tritt bei — dann öffnet sich der gemeinsame Plan und der Code verschwindet aus der Adresse', async ({ page }) => {
    const anfragen = await apiStellen(page);
    await oeffne(page);
    // Registrierung abgeschlossen: applyLogin() ruft sozialAuthFortsetzen().
    await page.evaluate(() => { currentUser = { id: 4242, name: 'Probe', role: 'Event-Planer' }; isLoggedIn = true; sozialAuthFortsetzen(); });
    await expect(page.getByRole('button', { name: 'Gruppe beitreten' })).toBeVisible();
    expect(anfragen.some((a) => /beitreten/.test(a)), 'kein stilles Beitreten').toBe(false);
    await page.getByRole('button', { name: 'Gruppe beitreten' }).click();
    await expect.poll(() => page.evaluate(() => _sozialPlanOffen)).toBe(7);
    expect(anfragen.filter((a) => /beitreten/.test(a))).toEqual(['POST social/gruppen/beitreten']);
    expect(await page.evaluate(() => location.search)).toBe('');
  });

  test('der Beitritt schickt genau den Code aus dem Link', async ({ page }) => {
    let rumpf = null;
    await apiStellen(page, { beitreten: (r) => { rumpf = JSON.parse(r.request().postData()); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ group: GRUPPE }) }); } });
    await oeffne(page, { nutzer: ICH });
    await page.getByRole('button', { name: 'Gruppe beitreten' }).click();
    await expect.poll(() => rumpf).toEqual({ code: CODE });
  });

  test('ein abgelaufener oder falscher Code sagt, was zu tun ist, und führt weiter', async ({ page }) => {
    await apiStellen(page, { beitreten: (r) => r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'code_ungueltig', message: 'Dieser Code passt nicht.' }) }) });
    await oeffne(page, { nutzer: ICH });
    await page.getByRole('button', { name: 'Gruppe beitreten' }).click();
    await expect(inhalt(page)).toContainText('Diese Einladung gilt nicht mehr');
    await expect(inhalt(page)).toContainText('neuen Link');
    await expect(page.getByRole('button', { name: 'Gruppe beitreten' })).toHaveCount(0);
    expect(await page.evaluate(() => location.search)).toBe('');
  });

  test('„Später" lässt die Einladung liegen, ohne beizutreten', async ({ page }) => {
    const anfragen = await apiStellen(page);
    await oeffne(page, { nutzer: ICH });
    await page.getByRole('button', { name: 'Später' }).click();
    await expect(page.getByRole('button', { name: 'Gruppe beitreten' })).toHaveCount(0);
    expect(anfragen.some((a) => /beitreten/.test(a))).toBe(false);
    expect(await page.evaluate(() => location.search)).toBe('');
  });
});
