const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');

async function erstAssistentWaehlen(page, id) {
  await page.locator('#qaLauncher').click();
  await expect(page.locator('#avatarPickerModal')).toHaveClass(/show/);
  await page.locator('#avatarPickerGrid [data-avatar="' + id + '"]').click();
  await expect(page.locator('#qaPanel')).toBeVisible();
}

async function funktionaleEinwilligung(page) {
  await page.evaluate(() => localStorage.setItem('eb_cookie_consent', JSON.stringify({
    necessary: true, funktional: true, profil: true, timestamp: new Date().toISOString(),
  })));
}

test.describe('QA-Bot: Rollen und Maskottchen', () => {
  test('Erstwahl zeigt zehn echte Portraits und ersetzt den Roboter', async ({ page }) => {
    const errors = await openApp(page);
    await page.locator('#qaLauncher').click();
    await expect(page.locator('#avatarPickerTitle')).toHaveText('Wähle deinen Event-Assistenten');
    await expect(page.locator('#avatarPickerGrid .avatar-pick')).toHaveCount(10);
    await expect(page.locator('#qaPanel')).toBeHidden();
    for (const image of await page.locator('#avatarPickerGrid img').all()) {
      await expect.poll(async () => image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
      const alpha = await image.evaluate(async (node) => {
        await node.decode();
        const canvas = document.createElement('canvas');
        canvas.width = node.naturalWidth;
        canvas.height = node.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(node, 0, 0);
        return context.getImageData(0, 0, 1, 1).data[3];
      });
      expect(alpha, 'Portrait-Ecke muss transparent sein').toBe(0);
    }

    await page.locator('#avatarPickerGrid [data-avatar="avatar-04"]').click();
    await expect(page.locator('#qaLauncherAvatar')).toHaveAttribute('src', /avatar-04-freigestellt\.webp$/);
    await expect(page.locator('#qaHeaderAvatar')).toHaveAttribute('src', /avatar-04-freigestellt\.webp$/);
    await expect(page.locator('#qaBot')).toHaveAttribute('data-avatar', 'avatar-04');
    await expect(page.locator('#qaPanel')).toBeVisible();
    expectNoPageErrors(errors, 'erste Portraitwahl');
  });

  test('Assistentenwahl bleibt nach Neuladen erhalten', async ({ page }) => {
    await openApp(page);
    await funktionaleEinwilligung(page);
    await erstAssistentWaehlen(page, 'avatar-08');
    await page.reload();
    await expect(page.locator('#qaLauncherAvatar')).toHaveAttribute('src', /avatar-08-freigestellt\.webp$/);
    await page.locator('#qaLauncher').click();
    await expect(page.locator('#qaPanel')).toBeVisible();
    await expect(page.locator('#avatarPickerModal')).not.toHaveClass(/show/);
  });

  test('Rollenwahl aktualisiert Identität und aktive Auswahl', async ({ page }) => {
    const errors = await openApp(page);
    await erstAssistentWaehlen(page, 'avatar-01');
    const personaBar = await page.locator('.eb-qa-personas').boundingBox();
    expect(personaBar.height).toBeLessThanOrEqual(72);
    await page.locator('#qaPanel .eb-qa-persona[data-persona="anbieter"]').click();

    await expect(page.locator('#qaBot')).toHaveAttribute('data-persona', 'anbieter');
    await expect(page.locator('#qaPersonaName')).toHaveText('Finn');
    await expect(page.locator('#qaPersonaTagline')).toHaveText('Für deinen Dienstleister-Alltag');
    await expect(page.locator('#qaMessages')).not.toContainText('Eventplanung');
    await expect(page.locator('#qaMessages')).toContainText('Ich unterstütze dich bei Inseraten');
    await expect(page.locator('#qaSuggestions button').first()).toHaveText('Mein Inserat verbessern');
    await expect(page.locator('#qaPanel .eb-qa-persona[data-persona="anbieter"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#qaPanel .eb-qa-persona[data-persona="planer"]')).toHaveAttribute('aria-pressed', 'false');
    expectNoPageErrors(errors, 'Rollenwahl');
  });

  test('Assistentenporträt wird in Launcher und Chatkopf synchronisiert', async ({ page }) => {
    await openApp(page);
    await erstAssistentWaehlen(page, 'avatar-09');
    await expect(page.locator('#qaLauncherAvatar')).toHaveAttribute('src', /avatar-09-freigestellt\.webp$/);
    await expect(page.locator('#qaHeaderAvatar')).toHaveAttribute('src', /avatar-09-freigestellt\.webp$/);
  });

  test('Portrait-Parallaxe reagiert auf Maus und Touch ohne Fake-Augenpunkte', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await erstAssistentWaehlen(page, 'avatar-01');

    const portrait = page.locator('#qaLauncherAvatar');
    const neutralTransform = await portrait.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.move(0, 0);
    await expect.poll(() => page.locator('#qaBot').evaluate((el) => el.style.getPropertyValue('--qa-head-x')))
      .toBe('-1.40px');
    await expect.poll(() => portrait.evaluate((el) => getComputedStyle(el).transform)).not.toBe(neutralTransform);
    await expect(page.locator('#qaBot .eb-qa-gaze')).toHaveCount(0);

    await page.locator('body').dispatchEvent('pointermove', {
      pointerType: 'touch', clientX: 390, clientY: 844, bubbles: true,
    });
    await expect.poll(() => page.locator('#qaBot').evaluate((el) => el.style.getPropertyValue('--qa-head-x')))
      .toBe('1.40px');
    await expect.poll(() => page.locator('#qaBot').evaluate((el) => el.style.getPropertyValue('--qa-head-y')))
      .toBe('0.80px');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(0, 0);
    await expect(portrait).toHaveCSS('transform', 'none');
  });

  test('Rollenwahl bleibt auf schmalen Displays bedienbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await erstAssistentWaehlen(page, 'avatar-03');
    const panel = await page.locator('#qaPanel').boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(390);
    for (const button of await page.locator('#qaPanel .eb-qa-persona').all()) {
      await expect.poll(async () => (await button.boundingBox()).width).toBeGreaterThanOrEqual(44);
      await expect.poll(async () => (await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('.eb-qa-avatar-switch').click();
    await expect(page.locator('#avatarPickerModal')).toBeVisible();
    const firstCard = page.locator('#avatarPickerGrid .avatar-pick').first();
    const image = await firstCard.locator('img').boundingBox();
    const band = await firstCard.locator('.avatar-pick-hat-band').boundingBox();
    expect(band.y).toBeGreaterThanOrEqual(image.y - 3);
    expect(band.y).toBeLessThan(image.y + 14);
  });
});
