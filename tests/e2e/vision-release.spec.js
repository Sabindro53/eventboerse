const { test, expect } = require('@playwright/test');

test.describe('Vision Release', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('eb_cookie_consent', 'necessary');
      sessionStorage.setItem('eb_beta_notice_dismissed', '1');
    });
    await page.reload();
  });

  test('Radar ist ein eigener Feed-Kanal mit Stadt und Radius', async ({ page }) => {
    await page.getByRole('link', { name: 'Social Feed' }).click();
    await page.getByRole('button', { name: /Radar/ }).click();
    await expect(page.getByRole('heading', { name: 'Event-Radar' })).toBeVisible();
    await expect(page.getByLabel('Stadt')).toHaveValue('Köln');
    await page.getByRole('button', { name: '100 km' }).click();
    await expect(page.locator('.radar-chip.aktiv')).toHaveText('100 km');
    await expect(page.locator('.feed-radar-result').first()).toBeVisible();
  });

  test('Dienstleister-Cockpit rendert KPIs, Steuern, PDF und Media Studio', async ({ page }) => {
    await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = {
        id: 4242, name: 'Test Dienstleister', role: 'Dienstleister', baseRole: 'Dienstleister',
        gallery: [], taxProfile: { smallBusiness: true, vatRate: 19, invoicePrefix: 'EB' }
      };
      _boardProjects = [];
      navigateTo('business');
    });
    await expect(page.getByRole('heading', { name: 'Dein Business auf einen Blick' })).toBeVisible();
    await expect(page.getByText('Auftragsvolumen')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rechnungsangaben' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Einzigartige Profil- und Inseratsmotive' })).toBeVisible();
    await expect(page.locator('#mediaStudioCanvas')).toBeVisible();
  });

  test('HQ zeigt operative Sprache, Betriebsbericht und sichtbares Ende', async ({ page }) => {
    await page.goto('/hq.html');
    await expect(page.getByText('Operative Zentrale')).toBeVisible();
    await expect(page.getByRole('button', { name: '⏻ HQ beenden' })).toBeVisible();
    await page.locator('#nn-orb').waitFor({ state: 'visible' });
    await page.locator('#nn-orb').click();
    await expect(page.getByRole('dialog', { name: 'Eventbörse Assistent' })).toBeVisible();
    await expect(page.getByRole('button', { name: '📋 Ehrlicher Betriebsbericht' })).toBeVisible();
    await expect(page.getByRole('button', { name: '■ Gespräch beenden' })).toBeVisible();
    await expect(page.locator('#modelle-grid')).toBeHidden();
    await expect(page.locator('#conn-obsidian')).toHaveCount(0);
  });
});
