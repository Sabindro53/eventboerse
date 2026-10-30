const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit, expectNoPageErrors } = require('./helpers');

// Blickfolge (ui/33-assistent-figur.js): die Figur zeigt das Feld des
// Blender-Rasters, das zur Zeigerposition passt. Gemessen wird, was zu
// SEHEN ist — welches Feld, ob das Raster oder das ruhende Bild oben liegt.
const KNOPF = '#qaLauncher';
const feld = (page) => page.locator(`${KNOPF} .eb-qa-blick`).evaluate((el) => el.dataset.feld).catch(() => null);
const blickt = (page) => page.locator(KNOPF).evaluate((k) => k.classList.contains('is-blick'));

async function bereit(page, reducedMotion = 'no-preference') {
  await page.emulateMedia({ reducedMotion });
  const errors = await openApp(page);
  await warteAufAppBereit(page);
  await expect(page.locator(`${KNOPF} img[data-assistent-figur]`)).toBeVisible();
  return errors;
}

// Bewegt die Maus bei jedem Versuch ein Pixel hin und her, statt nur einmal:
// ein umgeschaltetes prefers-reduced-motion meldet der Browser asynchron, und
// der Horcher setzt den Kopf dann zu Recht zurück — auch wenn er gerade erst
// gedreht hat. Ein Mensch bewegt die Maus weiter; der Test tut es auch.
async function schauen(page, x, y) {
  let n = 0;
  await expect.poll(async () => {
    await page.mouse.move(x + (n++ % 2), y);
    return blickt(page);
  }).toBe(true);
  return expect.poll(() => feld(page));
}

test('der Kopf dreht sich zum Zeiger: links oben, geradeaus, oben', async ({ page }) => {
  const errors = await bereit(page);
  const k = await page.locator(KNOPF).boundingBox();
  const mx = k.x + k.width / 2, my = k.y + k.height / 2;
  await (await schauen(page, 5, 5)).toBe('0,0');                     // weit links oben
  await page.mouse.move(mx, my);
  await expect.poll(() => feld(page)).toBe('3,1');                   // geradeaus
  await page.mouse.move(mx, my - 420);
  await expect.poll(() => feld(page)).toBe('3,0');                   // nach oben
  // Das Raster liegt oben, das ruhende Bild darunter ist ausgeblendet.
  const sicht = await page.locator(KNOPF).evaluate((kn) => ({
    raster: getComputedStyle(kn.querySelector('.eb-qa-blick')).opacity,
    bild: getComputedStyle(kn.querySelector('img')).opacity,
    url: kn.querySelector('.eb-qa-blick').style.backgroundImage,
  }));
  expect(sicht).toMatchObject({ raster: '1', bild: '0' });
  expect(sicht.url).toContain('assets/avatare/avatar-01-blick.webp');
  expectNoPageErrors(errors, 'Blickfolge');
});

test('Launcher, Scroll-Ausblendung und Panel bleiben bedienbar', async ({ page }) => {
  const errors = await bereit(page);
  const knopf = page.locator(KNOPF);
  const position = await knopf.boundingBox();
  await schauen(page, 30, 30);
  expect(await knopf.boundingBox()).toEqual(position);               // nur das Bild ändert sich
  await page.evaluate(() => navigateTo('datenschutz'));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(2500);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await expect(knopf).toBeHidden();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(knopf).toBeVisible();
  await knopf.click();
  await expect(page.locator('#qaPanel')).toBeVisible();
  await knopf.click();
  await expect(page.locator('#qaPanel')).toBeHidden();
  expectNoPageErrors(errors, 'Maus, Scrollen und Panel');
});

test('das Raster lädt erst bei der ersten Bewegung — Besucher ohne Maus zahlen nichts', async ({ page }) => {
  const anfragen = [];
  page.on('request', (r) => { if (new URL(r.url()).pathname.endsWith('-blick.webp')) anfragen.push(r.url()); });
  await bereit(page);
  await page.waitForTimeout(400);
  expect(anfragen).toEqual([]);
  await schauen(page, 40, 40);
  await page.mouse.move(400, 300);
  await page.mouse.move(60, 60);
  expect(anfragen).toHaveLength(1);                                   // nur einmal je Figur
});

test('eine andere Figur blickt mit ihrem eigenen Raster, nie mit dem alten', async ({ page }) => {
  const errors = await bereit(page);
  await schauen(page, 30, 30);
  await page.evaluate(() => ebAssistentFigurWaehlen('04'));
  await page.mouse.move(50, 50);
  await expect.poll(() => page.locator(`${KNOPF} .eb-qa-blick`).evaluate((el) => el.style.backgroundImage))
    .toContain('avatar-04-blick.webp');
  expectNoPageErrors(errors, 'Figurwechsel');
});

test('fehlt das Raster, bleibt das ruhende Bild — kein leerer Knopf', async ({ page }) => {
  await page.route('**/avatar-01-blick.webp', (r) => r.fulfill({ status: 404, body: '' }));
  const errors = await bereit(page);
  await page.mouse.move(30, 30);
  await page.waitForTimeout(500);
  expect(await blickt(page)).toBe(false);
  expect(await page.locator(`${KNOPF} img`).evaluate((i) => getComputedStyle(i).opacity)).toBe('1');
  expectNoPageErrors(errors.filter((e) => !String(e).includes('404')), 'fehlendes Raster');
});

test('Verlassen, Blur und versteckter Tab zeigen wieder das ruhende Bild', async ({ page }) => {
  const errors = await bereit(page);
  await schauen(page, 30, 30);
  await page.mouse.move(-10, -10);                                    // echtes pointerleave
  await expect.poll(() => blickt(page)).toBe(false);
  await schauen(page, 50, 50);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(() => blickt(page)).toBe(false);
  await schauen(page, 80, 80);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => blickt(page)).toBe(false);
  await page.mouse.move(120, 120);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await blickt(page)).toBe(false);
  expectNoPageErrors(errors, 'Reset');
});

test('Bewegungsreduktion: der Kopf bleibt still, auch eine laufende Drehung endet', async ({ page }) => {
  const errors = await bereit(page, 'reduce');
  await page.mouse.move(30, 30);
  await page.waitForTimeout(300);
  expect(await blickt(page)).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await schauen(page, 80, 80);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => blickt(page)).toBe(false);
  expectNoPageErrors(errors, 'Bewegungsreduktion');
});

test('Finger: ein Tippen lenkt den Blick kurz dorthin, dann wieder nach vorn', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = await bereit(page);
  // Das erste Tippen lädt das Raster; jedes weitere zeigt den Blick 1,4 s lang.
  // Getippt wird je Versuch, sonst kann der Blick zwischen zwei Abfragen schon
  // wieder vorbei sein.
  await expect.poll(async () => {
    await page.touchscreen.tap(30, 200);
    return (await blickt(page)) ? await feld(page) : null;
  }, { timeout: 5000 }).toMatch(/^[0-2],/);                         // nach links
  await expect.poll(() => blickt(page), { timeout: 4000 }).toBe(false);
  expectNoPageErrors(errors, 'Tippen');
  await ctx.close();
});

test('die Feldwahl ist symmetrisch und deckt das ganze Raster ab', async ({ page }) => {
  await bereit(page);
  const r = await page.evaluate(() => [
    ebAssistentBlickFeld(-9999, -9999), ebAssistentBlickFeld(0, 0), ebAssistentBlickFeld(9999, 9999),
    ebAssistentBlickFeld(-210, 0), ebAssistentBlickFeld(210, 0),
  ]);
  expect(r).toEqual([
    { spalte: 0, zeile: 0 }, { spalte: 3, zeile: 1 }, { spalte: 6, zeile: 2 },
    { spalte: 2, zeile: 1 }, { spalte: 5, zeile: 1 },
  ]);
});
