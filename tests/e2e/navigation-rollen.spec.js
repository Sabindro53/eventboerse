// Navigation je Rolle — Stufe 1 der Überarbeitung (15.10.2026).
//
// Was hier gilt, steht in PRODUCT_REDESIGN.md, Abschnitte 3.1 und 4. Die
// Suite misst die WIRKUNG: geklickt wird der echte Knopf, nachgesehen wird,
// welche Seite aktiv wurde. Ein Test auf die Beschriftung allein wäre grün,
// während der Knopf woandershin führt — und ein Weg, der woandershin führt,
// als er verspricht, ist schlimmer als einer, den es nicht gibt.
//
// ── NICHTS FÄLLT WEG ────────────────────────────────────────────────────
//
// Das Menü wurde umgebaut. Damit beim nächsten Umbau kein Ziel still
// verschwindet, steht die Liste der Ziele VOR der Überarbeitung hier fest,
// und der letzte Test verlangt, dass jedes davon für mindestens eine Rolle
// sichtbar im Menü erreichbar bleibt.
const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit } = require('./helpers');

const ROLLEN = {
  abgemeldet: null,
  planer: { id: 9, name: 'Anna', role: 'Event-Planer' },
  anbieter: { id: 5, name: 'DJ Julian', role: 'Dienstleister' },
};

/** Die Ziele des Benutzermenüs vor dem 15.10.2026 — festgeschrieben. */
const BISHERIGE_ZIELE = [
  'profile', 'messages', 'board', 'freunde', 'create-listing', 'my-listings',
  'auftraege', 'business', 'notifications', 'favorites', 'settings', 'contact',
];

async function alsRolle(page, rolle, viewport) {
  if (viewport) await page.setViewportSize(viewport);
  await openApp(page);
  await warteAufAppBereit(page);
  await page.evaluate((u) => {
    if (u) {
      currentUser = u;
      isLoggedIn = true;
      document.getElementById('loggedOutMenu').style.display = 'none';
      document.getElementById('loggedInMenu').style.display = '';
    }
    _applyRoleNav();
    const banner = document.getElementById('betaBanner');
    if (banner) banner.hidden = true;
  }, ROLLEN[rolle]);
}

const aktiv = (page) => page.evaluate(() => (document.querySelector('.page.active') || {}).id);

/** Ein Menüeintrag ist erreichbar, wenn er sichtbar ist — nicht nur im Markup steht. */
async function sichtbareMenueZiele(page) {
  await page.click('#avatarBtn');
  return page.evaluate(() => [...document.querySelectorAll('#userMenu button')]
    .filter((b) => b.offsetParent !== null)
    .map((b) => ((b.getAttribute('onclick') || '').match(/navigateTo\('([a-z-]+)'/) || [])[1])
    .filter(Boolean));
}

test.describe('Topbar: der Hauptlink folgt der Rolle — und führt dorthin, wo er sagt', () => {
  for (const [rolle, text, ziel] of [
    ['planer', 'Mein Event', 'page-board'],
    ['anbieter', 'Mein Geschäft', 'page-my-listings'],
  ]) {
    test(`${rolle}: „${text}" öffnet ${ziel}`, async ({ page }) => {
      await alsRolle(page, rolle);
      const link = page.locator('#navHauptLink');
      await expect(link).toHaveText(text);
      await link.click();
      await expect.poll(() => aktiv(page)).toBe(ziel);
    });
  }

  test('abgemeldet: „Für Dienstleister" führt in die Registrierung, nicht in die Anmeldung', async ({ page }) => {
    await alsRolle(page, 'abgemeldet');
    const link = page.locator('#navHauptLink');
    await expect(link).toHaveText('Für Dienstleister');
    await link.click();
    await expect(page.locator('#registerModal')).toBeVisible();
    await expect(page.locator('#loginModal')).toBeHidden();
  });

  test('kein „Inserieren" mehr in der Leiste — für einen Planer war es die falsche Einladung', async ({ page }) => {
    await alsRolle(page, 'planer');
    await expect(page.locator('#navbar .nav-link', { hasText: 'Inserieren' })).toHaveCount(0);
  });
});

test.describe('Benutzermenü: Abschnitte je Rolle', () => {
  test('Planer sieht „Mein Event" und „Konto", nicht „Mein Geschäft"', async ({ page }) => {
    await alsRolle(page, 'planer');
    await page.click('#avatarBtn');
    await expect(page.getByRole('group', { name: 'Mein Event' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Konto' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Mein Geschäft' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Meine Gesuche' })).toBeVisible();
  });

  test('Dienstleister sieht alle drei, „Mein Geschäft" zuerst — und keine doppelten „Meine Gesuche"', async ({ page }) => {
    await alsRolle(page, 'anbieter');
    await page.click('#avatarBtn');
    const titel = await page.locator('#userMenu .user-menu-gruppe:not([hidden]) .user-menu-titel').allTextContents();
    expect(titel).toEqual(['Mein Geschäft', 'Mein Event', 'Konto']);
    await expect(page.getByRole('button', { name: 'Meine Gesuche' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Meine Inserate' })).toBeVisible();
  });

  test('Tastatur: Öffnen setzt aria-expanded und Fokus, Escape schließt und gibt den Fokus zurück', async ({ page }) => {
    await alsRolle(page, 'planer');
    const avatar = page.locator('#avatarBtn');
    await expect(avatar).toHaveAttribute('aria-expanded', 'false');
    await avatar.focus();
    await page.keyboard.press('Enter');
    await expect(avatar).toHaveAttribute('aria-expanded', 'true');
    // Der erste SICHTBARE Eintrag — beim Planer liegt „Mein Geschäft" versteckt davor.
    await expect(page.getByRole('button', { name: 'Planungs-Board' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#userMenu')).toBeHidden();
    await expect(avatar).toHaveAttribute('aria-expanded', 'false');
    await expect(avatar).toBeFocused();
  });

  test('ein Menüeintrag schließt das Menü — und aria-expanded folgt', async ({ page }) => {
    await alsRolle(page, 'planer');
    await page.click('#avatarBtn');
    await page.locator('#userMenu').getByRole('button', { name: 'Favoriten', exact: true }).click();
    await expect.poll(() => aktiv(page)).toBe('page-favorites');
    await expect(page.locator('#avatarBtn')).toHaveAttribute('aria-expanded', 'false');
  });

  test('am Telefon passt das Menü in den Bildschirm — „Abmelden" ist erreichbar', async ({ page }) => {
    await alsRolle(page, 'anbieter', { width: 390, height: 640 });
    await page.click('#avatarBtn');
    const menu = page.locator('#userMenu');
    const box = await menu.boundingBox();
    expect(box.y + box.height, 'das Menü ragt unter den Bildschirmrand').toBeLessThanOrEqual(640);
    const abmelden = page.getByRole('button', { name: 'Abmelden' });
    await abmelden.scrollIntoViewIfNeeded();
    await expect(abmelden).toBeInViewport();
  });
});

test.describe('„Gesuch aufgeben" — der Typ passt zum Weg', () => {
  test('Planer: „Gesuch aufgeben" öffnet die Maske auf „Ich suche"', async ({ page }) => {
    await alsRolle(page, 'planer');
    await page.click('#avatarBtn');
    await page.getByRole('button', { name: 'Gesuch aufgeben' }).click();
    await expect.poll(() => aktiv(page)).toBe('page-create-listing');
    await expect(page.locator('#createListingType')).toHaveValue('search');
  });

  // Die Rollen-Voreinstellung stand schon vorher in updateCreateFormForRole().
  // Hier stand zuerst die Vermutung, sie fehle — widerlegt; der Test hält sie jetzt fest.
  test('Planer ohne Vorgabe: „Ich suche" (die bestehende Rollen-Voreinstellung)', async ({ page }) => {
    await alsRolle(page, 'planer');
    await page.evaluate(() => navigateTo('create-listing'));
    await expect(page.locator('#createListingType')).toHaveValue('search');
  });

  test('Dienstleister ohne Vorgabe: weiter „Ich biete"', async ({ page }) => {
    await alsRolle(page, 'anbieter');
    await page.evaluate(() => navigateTo('create-listing'));
    await expect(page.locator('#createListingType')).toHaveValue('offer');
  });

  test('die Vorgabe schlägt die Rolle: ein Dienstleister kann ein Gesuch aufgeben', async ({ page }) => {
    await alsRolle(page, 'anbieter');
    await page.click('#avatarBtn');
    await page.getByRole('button', { name: 'Gesuch aufgeben' }).click();
    await expect(page.locator('#createListingType')).toHaveValue('search');
  });
});

test.describe('Mobilleiste: der dritte Platz folgt der Rolle', () => {
  for (const [rolle, text, ziel] of [
    ['planer', 'Planen', 'page-board'],
    ['anbieter', 'Aufträge', 'page-auftraege'],
  ]) {
    test(`${rolle}: „${text}" öffnet ${ziel} und ist danach markiert`, async ({ page }) => {
      await alsRolle(page, rolle, { width: 390, height: 844 });
      const platz = page.locator('#mobileNav .mobile-nav-board');
      await expect(platz).toContainText(text);
      await platz.click();
      await expect.poll(() => aktiv(page)).toBe(ziel);
      await expect(platz).toHaveClass(/active/);
    });
  }
});

test.describe('Nichts fällt weg', () => {
  test('jedes bisherige Menüziel ist für mindestens eine Rolle sichtbar erreichbar', async ({ page }) => {
    const erreichbar = new Set();
    for (const rolle of ['planer', 'anbieter']) {
      await alsRolle(page, rolle);
      for (const z of await sichtbareMenueZiele(page)) erreichbar.add(z);
    }
    const fehlt = BISHERIGE_ZIELE.filter((z) => !erreichbar.has(z));
    expect(fehlt, 'diese Ziele sind aus dem Menü verschwunden').toEqual([]);
  });

  test('ein Dienstleister erreicht sein Planungs-Board weiter über das Menü', async ({ page }) => {
    await alsRolle(page, 'anbieter');
    expect(await sichtbareMenueZiele(page)).toContain('board');
  });
});

test.describe('Screenreader: Symbole sind keine Namen', () => {
  test('Menü- und Mobilleisten-Knöpfe heißen wie ihr Text, ohne Icon-Wort', async ({ page }) => {
    await alsRolle(page, 'anbieter', { width: 390, height: 844 });
    await page.click('#avatarBtn');
    for (const name of ['Aufträge', 'Planungs-Board', 'Favoriten', 'Einstellungen', 'Abmelden']) {
      await expect(page.locator('#userMenu').getByRole('button', { name, exact: true })).toHaveCount(1);
    }
    await page.keyboard.press('Escape');
    for (const name of ['Feed', 'Suche', 'Aufträge', 'Chat', 'Profil']) {
      await expect(page.locator('#mobileNav').getByRole('button', { name, exact: true })).toHaveCount(1);
    }
  });
});
