const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit, expectNoPageErrors } = require('./helpers');

const BILD = '#qaLauncher img[data-assistent-figur]';
const transform = (page) => page.locator(BILD).evaluate((img) => img.style.transform);

async function bereit(page, reducedMotion = 'no-preference') {
  await page.emulateMedia({ reducedMotion });
  const errors = await openApp(page);
  await warteAufAppBereit(page);
  await expect(page.locator(BILD)).toBeVisible();
  return errors;
}

async function bewegen(page, x, y) {
  const vorher = await transform(page);
  await page.mouse.move(x, y);
  await expect.poll(() => transform(page)).not.toBe(vorher);
}

test('Maus bewegt nur die Figur; Launcher, Scroll-Ausblendung und Panel bleiben bedienbar', async ({ page }) => {
  const errors = await bereit(page);
  const knopf = page.locator('#qaLauncher');
  const position = await knopf.boundingBox();
  await bewegen(page, 30, 30);
  const links = await transform(page);
  expect(links).toContain('translate(');
  expect(links).toContain('rotate3d(');
  await bewegen(page, 1250, 850);
  expect(await knopf.boundingBox()).toEqual(position);
  expect(await page.locator('#qaPanel').evaluate((el) => el.hidden)).toBe(true);

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

test('Verlassen, Blur und versteckter Tab setzen die Figur zurück', async ({ page }) => {
  const errors = await bereit(page);
  const neutral = await transform(page);
  await bewegen(page, 30, 30);
  // Ein tatsächliches Verlassen des Viewports erzeugt pointerleave.
  await page.mouse.move(-10, -10);
  await expect.poll(() => transform(page)).toBe(neutral);
  await bewegen(page, 50, 50);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(() => transform(page)).toBe(neutral);
  await bewegen(page, 80, 80);
  // visibilityState ist im Headless-Browser nicht per Tabwechsel steuerbar.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => transform(page)).toBe(neutral);
  await page.mouse.move(120, 120);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await transform(page)).toBe(neutral);
  expectNoPageErrors(errors, 'Reset');
});

test('Bewegungsreduktion verhindert Mausblick und setzt eine aktive Neigung zurück', async ({ page }) => {
  const errors = await bereit(page, 'reduce');
  const neutral = await transform(page);
  await page.mouse.move(30, 30);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await transform(page)).toBe(neutral);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await bewegen(page, 80, 80);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => transform(page)).toBe(neutral);
  await page.mouse.move(200, 200);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await transform(page)).toBe(neutral);
  expectNoPageErrors(errors, 'Bewegungsreduktion');
});
