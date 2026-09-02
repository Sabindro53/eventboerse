const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
const PRIVACY = fs.readFileSync(path.join(ROOT, 'ios', 'App', 'App', 'PrivacyInfo.xcprivacy'), 'utf8');

test.describe('App-Store-Schutzregeln', () => {
  test('Registrierung verlangt die Volljährigkeitsbestätigung', async ({ page }) => {
    await page.setContent(INDEX);

    const age = page.locator('#regAgeConfirmed');
    await expect(age).toBeAttached();
    await expect(age).not.toBeChecked();
    await expect(age).toHaveAttribute('required', '');
    await expect(age.locator('xpath=..')).toContainText('mindestens 18 Jahre');
  });

  test('Server erzwingt und protokolliert die Volljährigkeitsbestätigung', () => {
    expect(FUNCTIONS).toMatch(/\$age_confirmed\s*=\s*!\s*empty\(\s*\$params\['age_confirmed'\]\s*\)/);
    expect(FUNCTIONS).toMatch(/if\s*\(\s*!\s*\$age_confirmed\s*\)/);
    expect(FUNCTIONS).toContain("'eb_age_confirmed_at'");
  });

  test('Privacy Manifest meldet kein Tracking und keine nur lokal gespeicherte Suchhistorie', () => {
    expect(PRIVACY).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(PRIVACY).not.toContain('NSPrivacyCollectedDataTypeSearchHistory');
    expect(PRIVACY).not.toContain('NSPrivacyCollectedDataTypePurposeProductPersonalization');
  });
});
