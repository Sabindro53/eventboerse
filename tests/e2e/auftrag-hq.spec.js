// Aufträge aus dem Gespräch — was im Repository ankommt und was nicht.
//
// Die gefährliche Stelle ist nicht das Anlegen, sondern das AUTOMATISCHE
// Anlegen. Spracherkennung verhört sich; ein verhörter Satz, der ungefragt
// ein Ticket erzeugt, füllt das Repository mit Müll und macht die Funktion
// unbenutzbar. Deshalb prüft die erste Zusicherung, dass VOR der Bestätigung
// nichts passiert.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');

async function hqMitGithub(page, aufPost) {
  // Reihenfolge zählt: Playwright prüft Routen in UMGEKEHRTER
  // Registrierungsreihenfolge. Der Auffang muss zuerst stehen, sonst
  // überstimmt er die spezifische Route — genau daran scheiterte der
  // erste Entwurf dieses Tests und sah aus wie ein Fehler im Code.
  await page.route('https://api.github.com/**', (r) => r.abort());
  await page.route('https://api.github.com/repos/*/*/issues', (r) => {
    if (r.request().method() !== 'POST') return r.abort();
    aufPost(JSON.parse(r.request().postData() || '{}'));
    return r.fulfill({ status: 201, contentType: 'application/json',
      body: JSON.stringify({ number: 42, html_url: 'https://github.com/x/y/issues/42' }) });
  });
  await page.goto('/hq.html');
  await page.waitForTimeout(1700);
  await page.evaluate(() => sessionStorage.setItem('hq_pat', 'test-token'));
  await page.evaluate(() => window.ebCircleAPI.oeffnen());
}
const sagen = async (page, t) => {
  await page.locator('#ebc-input').fill(t);
  await page.locator('#ebc-input').press('Enter');
  await page.waitForTimeout(500);
};

test.describe('Aufträge aus dem Gespräch', () => {
  test('ein Auftrag wird gezeigt — und vor der Bestätigung nichts angelegt', async ({ page }) => {
    let post = null;
    await hqMitGithub(page, (p) => { post = p; });
    await sagen(page, 'Auftrag: Die Bilder der Startseite lokal hosten, damit sie schneller laden.');

    await expect(page.locator('.ebc-auftrag')).toHaveCount(1);
    expect(await page.locator('.ebc-auftrag-titel').innerText())
      .toContain('Bilder der Startseite lokal hosten');
    expect(post, 'ein Ticket wurde OHNE Bestätigung angelegt').toBeNull();
  });

  test('erst der Klick legt an — mit Herkunftsvermerk', async ({ page }) => {
    let post = null;
    await hqMitGithub(page, (p) => { post = p; });
    await sagen(page, 'Auftrag: Die Bilder der Startseite lokal hosten, damit sie schneller laden.');
    await page.locator('.ebc-ja').click();
    await page.waitForTimeout(500);

    expect(post, 'nach der Bestätigung wurde nichts angelegt').not.toBeNull();
    expect(post.title).toContain('Bilder der Startseite');
    // Wer das Ticket später liest, muss sehen, woher es kommt.
    expect(post.body, 'kein Herkunftsvermerk').toMatch(/EB Circle im HQ/);
    expect(post.labels).toContain('aus-dem-hq');
    await expect(page.locator('.ebc-auftrag-tasten')).toContainText('#42');
  });

  test('eine gewöhnliche Frage ist kein Auftrag', async ({ page }) => {
    // Sonst würde jede Unterhaltung Tickets erzeugen.
    let post = null;
    await hqMitGithub(page, (p) => { post = p; });
    await sagen(page, 'Wie steht der Betrieb gerade?');
    await expect(page.locator('.ebc-auftrag')).toHaveCount(0);
    expect(post).toBeNull();
  });

  test('ein zu kurzer Auftrag zählt nicht', async ({ page }) => {
    // „Auftrag: ja" ist ein Verhörer, keine Aufgabe.
    await hqMitGithub(page, () => {});
    await sagen(page, 'Auftrag: ja');
    await expect(page.locator('.ebc-auftrag')).toHaveCount(0);
  });

  test('ohne Token geht der Auftrag nicht verloren', async ({ page }) => {
    // Ein Auftrag, der still verschwindet, ist schlimmer als einer, der gar
    // nicht erst angenommen wurde.
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(1700);
    await page.evaluate(() => sessionStorage.removeItem('hq_pat'));
    await page.evaluate(() => window.ebCircleAPI.oeffnen());
    await sagen(page, 'Auftrag: Die Bilder der Startseite lokal hosten, damit sie schneller laden.');

    await expect(page.locator('.ebc-auftrag')).toHaveCount(1);
    await expect(page.locator('.ebc-auftrag-hinweis')).toContainText('Kein GitHub-Token');
    const kopie = await page.locator('.ebc-auftrag-kopie').inputValue();
    expect(kopie, 'der Auftragstext fehlt zum Kopieren').toContain('lokal hosten');
    await expect(page.locator('.ebc-ja')).toHaveCount(0);
  });

  test('gesagter Text landet als Text, nicht als Markup', async ({ page }) => {
    // Beim Diktieren landet im Auftrag, was gerade gesagt wurde — und beim
    // Tippen, was jemand tippt.
    await hqMitGithub(page, () => {});
    await sagen(page, 'Auftrag: Bilder lokal hosten <img src=x onerror=alert(1)> und zwar bald.');
    const html = await page.locator('.ebc-auftrag-text').innerHTML();
    expect(html, 'Fremdtext wurde als Markup eingesetzt').not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  test('das Gespräch kann nur Issues anlegen — nichts anderes', async () => {
    // Ein Sprachbefehl, der Code ändern oder ausliefern kann, ist eine
    // Angriffsfläche mit Mikrofon.
    const von = HQ.indexOf('function auftragKarte');
    const bis = HQ.indexOf('async function ask(');
    expect(von, 'auftragKarte nicht gefunden').toBeGreaterThan(-1);
    const rumpf = HQ.slice(von, bis);
    expect(rumpf).toMatch(/ghRes\('\/issues'/);
    for (const verboten of ['/pulls', '/merges', '/dispatches', '/contents/', 'workflow']) {
      expect(rumpf, `der Auftragsweg kann ${verboten} aufrufen`).not.toContain(verboten);
    }
    // Und die Bestätigung muss im Code stehen, nicht bloss in der Absicht.
    expect(rumpf, 'kein Bestätigungsschritt').toMatch(/ebc-ja[\s\S]*addEventListener\('click'/);
  });
});
