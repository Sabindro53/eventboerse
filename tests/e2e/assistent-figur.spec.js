// Der Event-Assistent bekommt ein Gesicht — wählbar, statt des Roboters.
//
// Auftrag des Inhabers vom 16.10.2026: die zehn Event-Assistenten-Figuren
// aus `assets/avatare/` ersetzen den gezeichneten Roboter; jede Person kann
// sich eine aussuchen, Vorgabe ist Figur 1. Nutzungsrechte vom Inhaber am
// 16.10.2026 bestätigt (siehe assets/avatare/README.md).
//
// Was hier gemessen wird, und warum:
//   - die Bilder sind ECHTE, kleine WebP mit Transparenz — eine Datei, die nur
//     so heißt, oder ein 50-KB-Bild für einen 64-px-Knopf fiele sonst erst im
//     Betrieb auf;
//   - die Wahl wirkt sichtbar (Knopf UND Kopf des Panels), überlebt das
//     Neuladen nur mit Einwilligung und gilt ohne sie für die Sitzung — „keine
//     Speicherung" heißt nicht „keine Funktion" (Lehre vom Sprachschalter);
//   - ein manipulierter gespeicherter Wert landet nie in einer Adresse;
//   - der Knopf ist mit der Tastatur sichtbar (vorher: outline 0 bei
//     :focus-visible).
//
// N02 (der Knopf verdeckt beim Scrollen Inhalt) ist hier NICHT behoben: unter
// jeder Seite steht die Fußzeile, am Seitenende liegt nichts unter dem Knopf.
// Ein zusätzlicher Abstand unten erzeugte nur Weißraum, die Mutation „Abstand
// weg" überlebte. Die Lösung ist eine Gestaltungsfrage beim Inhaber.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, warteAufAppBereit } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const ORDNER = path.join(WURZEL, 'assets', 'avatare');
const SCHLUESSEL = 'eb_assistent_figur_v1';
const EINWILLIGUNG = JSON.stringify({ v: 2, necessary: true, funktional: true, profil: false });

async function bereit(page) {
  await openApp(page);
  await warteAufAppBereit(page);
  await page.evaluate(() => { const b = document.getElementById('betaBanner'); if (b) b.hidden = true; });
}

const figurImKnopf = (page) => page.evaluate(() => {
  const img = document.querySelector('#qaLauncher img');
  return img ? img.getAttribute('src') : null;
});

test.describe('Die Dateien', () => {
  test('zehn echte WebP mit Transparenz, je höchstens 12 KB', () => {
    for (let n = 1; n <= 10; n++) {
      const datei = path.join(ORDNER, `avatar-${String(n).padStart(2, '0')}.webp`);
      expect(fs.existsSync(datei), datei).toBe(true);
      const b = fs.readFileSync(datei);
      expect(b.subarray(0, 4).toString('latin1')).toBe('RIFF');
      expect(b.subarray(8, 12).toString('latin1')).toBe('WEBP');
      // Transparenz: verlustbehaftet mit Alpha ist VP8X mit gesetztem
      // Alpha-Bit (0x10), verlustfrei VP8L — beides trägt Transparenz.
      const art = b.subarray(12, 16).toString('latin1');
      const mitAlpha = art === 'VP8L' || (art === 'VP8X' && (b[20] & 0x10) !== 0);
      expect(mitAlpha, `${datei}: keine Transparenz (${art})`).toBe(true);
      expect(b.length, datei).toBeLessThanOrEqual(12 * 1024);
    }
  });

  test('es liegt nichts im Ordner, was nicht ausgeliefert werden soll', () => {
    const erlaubt = new Set(['README.md', ...Array.from({ length: 10 }, (_, i) => `avatar-${String(i + 1).padStart(2, '0')}.webp`)]);
    const fremd = fs.readdirSync(ORDNER).filter((f) => !erlaubt.has(f));
    expect(fremd, 'Archiv, Codex-Bild oder Kontextdatei gehören nicht ins öffentliche Repo').toEqual([]);
  });

  test('die README vermerkt die Bestätigung der Nutzungsrechte', () => {
    expect(fs.readFileSync(path.join(ORDNER, 'README.md'), 'utf8')).toMatch(/Nutzungsrechte[^\n]*bestätigt/);
  });
});

test.describe('Der Knopf', () => {
  test('zeigt Figur 1, und der Roboter ist weg', async ({ page }) => {
    await bereit(page);
    expect(await figurImKnopf(page)).toMatch(/assets\/avatare\/avatar-01\.webp$/);
    const r = await page.evaluate(() => ({
      roboter: document.querySelectorAll('.eb-qa-icon-svg, .qa-visor, .qa-head-main').length,
      geladen: (document.querySelector('#qaLauncher img') || {}).naturalWidth || 0,
      name: document.getElementById('qaLauncher').getAttribute('aria-label'),
      alt: document.querySelector('#qaLauncher img').getAttribute('alt'),
    }));
    expect(r.roboter).toBe(0);
    expect(r.name).toBe('Event-Assistent öffnen');
    // Das Bild ist Schmuck im benannten Knopf — ein Alternativtext würde
    // den Namen doppelt vorlesen.
    expect(r.alt).toBe('');
    await expect.poll(() => page.evaluate(() => document.querySelector('#qaLauncher img').naturalWidth)).toBeGreaterThan(0);
  });

  test('ist mit der Tastatur sichtbar fokussiert', async ({ page }) => {
    await bereit(page);
    await page.keyboard.press('Shift');
    const stil = await page.evaluate(() => {
      const k = document.getElementById('qaLauncher');
      k.focus();
      const s = getComputedStyle(k);
      return { fokus: k.matches(':focus-visible'), outline: s.outlineStyle, breite: parseFloat(s.outlineWidth) };
    });
    expect(stil.fokus).toBe(true);
    expect(stil.outline).not.toBe('none');
    expect(stil.breite).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Die Wahl', () => {
  test('beim ersten Öffnen erscheint die Auswahl mit zehn benannten Figuren', async ({ page }) => {
    await bereit(page);
    await page.click('#qaLauncher');
    const wahl = page.locator('#qaFigurWahl');
    await expect(wahl).toBeVisible();
    await expect(wahl.getByRole('heading', { name: 'Wähle deinen Event-Assistenten' })).toBeVisible();
    const knoepfe = wahl.locator('button[data-figur]');
    await expect(knoepfe).toHaveCount(10);
    const namen = await knoepfe.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
    expect(new Set(namen).size).toBe(10);
    expect(await knoepfe.first().getAttribute('aria-pressed')).toBe('true');
  });

  test('eine Wahl wechselt Knopf UND Kopf und schließt die Auswahl', async ({ page }) => {
    await bereit(page);
    await page.click('#qaLauncher');
    await page.click('#qaFigurWahl button[data-figur="03"]');
    await expect(page.locator('#qaFigurWahl')).toBeHidden();
    expect(await figurImKnopf(page)).toMatch(/avatar-03\.webp$/);
    expect(await page.locator('.eb-qa-head-avatar img').getAttribute('src')).toMatch(/avatar-03\.webp$/);
  });

  test('„Später" behält Figur 1 und fragt beim nächsten Öffnen nicht wieder', async ({ page }) => {
    await bereit(page);
    await page.click('#qaLauncher');
    await page.click('#qaFigurWahl .eb-qa-figur-spaeter');
    await expect(page.locator('#qaFigurWahl')).toBeHidden();
    await page.evaluate(() => { closeQaBot(); openQaBot(); });
    await expect(page.locator('#qaFigurWahl')).toBeHidden();
    expect(await figurImKnopf(page)).toMatch(/avatar-01\.webp$/);
  });

  test('der Kopf des Panels bietet den Wechsel jederzeit an', async ({ page }) => {
    await bereit(page);
    await page.click('#qaLauncher');
    await page.click('#qaFigurWahl button[data-figur="05"]');
    await page.click('#qaFigurWechseln');
    await expect(page.locator('#qaFigurWahl')).toBeVisible();
    expect(await page.locator('#qaFigurWahl button[data-figur="05"]').getAttribute('aria-pressed')).toBe('true');
  });
});

test.describe('Das Panel mit offener Auswahl', () => {
  // Zuerst nur im Bildschirmfoto gesehen: die offene Auswahl stauchte die
  // Vorschlagsleiste, die Knöpfe waren unten abgeschnitten. Kein Test hatte
  // es bemerkt — gemessen wird jetzt, ob die Leiste ihre volle Höhe hat.
  test('die Vorschläge und das Eingabefeld werden nicht gestaucht', async ({ page }) => {
    // Kleines Telefon (iPhone SE): erst hier reicht der Platz nicht für
    // alles, und nur hier entscheidet flex-shrink, wer nachgibt. Bei 844 px
    // Höhe überlebte die Mutation „Stauchen wieder erlaubt" — die Messung
    // stand an einer Stelle, an der es nichts zu messen gab.
    await page.setViewportSize({ width: 375, height: 667 });
    await bereit(page);
    await page.click('#qaLauncher');
    await expect(page.locator('#qaFigurWahl')).toBeVisible();
    const m = await page.evaluate(() => {
      const leiste = document.getElementById('qaSuggestions');
      const knopf = leiste.querySelector('button').getBoundingClientRect();
      const kasten = leiste.getBoundingClientRect();
      const form = document.querySelector('.eb-qa-form');
      return { knopfUnten: knopf.bottom, leisteUnten: kasten.bottom, formH: form.clientHeight, formSoll: form.scrollHeight };
    });
    expect(m.knopfUnten).toBeLessThanOrEqual(m.leisteUnten + 0.5);
    expect(m.formH).toBeGreaterThanOrEqual(m.formSoll);
  });
});

test.describe('Speichern nur mit Einwilligung', () => {
  test('mit funktionaler Einwilligung überlebt die Wahl das Neuladen', async ({ page }) => {
    // Die Einwilligung wird NACH openApp() gesetzt — sofort und für jedes
    // weitere Laden. Gemessen am 17.10.2026: openApp() (helpers.js) schreibt
    // vor jedem Laden eine Einwilligung im ALTEN Format
    // ({essential, functional}), die App liest aber `funktional`. Ein
    // früher registriertes Skript wurde davon überschrieben, ebSpeichern()
    // verweigerte, und der Test fiel je nach Ablauf durch. Die Diagnose stand
    // erst, als der Fehlerfall den gespeicherten Wert ausgab.
    await bereit(page);
    await page.addInitScript((e) => localStorage.setItem('eb_cookie_consent', e), EINWILLIGUNG);
    await page.evaluate((e) => localStorage.setItem('eb_cookie_consent', e), EINWILLIGUNG);
    await page.click('#qaLauncher');
    await page.click('#qaFigurWahl button[data-figur="07"]');
    expect(await page.evaluate((k) => localStorage.getItem(k), SCHLUESSEL), 'vor dem Neuladen gespeichert').toBe('07');
    await page.reload();
    await warteAufAppBereit(page);
    expect(await page.evaluate((k) => localStorage.getItem(k), SCHLUESSEL), 'nach dem Neuladen noch da').toBe('07');
    expect(await figurImKnopf(page), 'Knopf zeigt die gespeicherte Figur').toMatch(/avatar-07\.webp$/);
  });

  test('ohne Einwilligung gilt sie für die Sitzung und wird nicht abgelegt', async ({ page }) => {
    await bereit(page);
    await page.evaluate(() => localStorage.removeItem('eb_cookie_consent'));
    await page.click('#qaLauncher');
    await page.click('#qaFigurWahl button[data-figur="07"]');
    expect(await figurImKnopf(page)).toMatch(/avatar-07\.webp$/);
    expect(await page.evaluate((k) => localStorage.getItem(k), SCHLUESSEL)).toBeNull();
  });

  test('ein manipulierter gespeicherter Wert landet nie in einer Adresse', async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, '../../wp-config"><img src=x>'), SCHLUESSEL);
    await bereit(page);
    expect(await figurImKnopf(page)).toMatch(/assets\/avatare\/avatar-01\.webp$/);
  });
});

test.describe('N02: beim Herunterscrollen weg, beim Hochscrollen wieder da', () => {
  // Entscheidung des Inhabers vom 17.10.2026. Der Knopf schwebt über dem
  // Inhalt und lag beim Scrollen über Auftragskarten (live gemessen, N02).
  // Ein reservierter Abstand am Seitenende half nicht — dort steht die
  // Fußzeile. Jetzt geht er aus dem Weg, solange gelesen wird.
  //
  // Gemessen wird, was der Finger trifft (elementFromPoint), nicht eine
  // Klasse: ein Knopf mit Klasse „weg“, der noch klickbar über dem Inhalt
  // liegt, wäre genau der Befund.
  async function langeSeite(page, reduziert) {
    await page.setViewportSize({ width: 390, height: 844 });
    if (reduziert) await page.emulateMedia({ reducedMotion: 'reduce' });
    await bereit(page);
    // Eine lange ÖFFENTLICHE Seite. Der erste Entwurf nahm „settings" —
    // abgemeldet öffnet die das Anmeldefenster, und gemessen wurde dessen
    // Formular statt des Knopfes.
    await page.evaluate(() => navigateTo('datenschutz'));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.getElementById('loginModal').classList.contains('active'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(2500);
  }
  const scrolle = (page, y) => page.evaluate(async (y) => {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((ok) => setTimeout(ok, 450));
  }, y);
  // Ob er „weg" ist, entscheidet der Zustand sofort; ob der Finger ihn noch
  // trifft, erst nach dem Gleiten. Unter Last maß ein fester Takt zu früh —
  // die Mutation „Panel-Ausnahme weg" überlebte deshalb einen von zwei
  // Läufen. Gewartet wird jetzt auf den Zustand, nicht auf die Uhr.
  const weg = (page) => page.evaluate(() => document.getElementById('qaBot').classList.contains('is-weg'));
  const trifftKnopf = (page) => page.evaluate(() => {
    const k = document.getElementById('qaLauncher').getBoundingClientRect();
    const el = document.elementFromPoint(k.left + k.width / 2, k.top + k.height / 2);
    return !!(el && el.closest('#qaLauncher'));
  });

  test('herunter: der Knopf ist nicht mehr zu treffen — hoch: wieder da', async ({ page }) => {
    await langeSeite(page);
    expect(await trifftKnopf(page)).toBe(true);
    await scrolle(page, 600);
    await expect.poll(() => trifftKnopf(page)).toBe(false);
    await scrolle(page, 450);
    await expect.poll(() => trifftKnopf(page)).toBe(true);
  });

  test('ganz oben ist er immer da, auch nach einem Ruck nach unten', async ({ page }) => {
    await langeSeite(page);
    await scrolle(page, 60);
    expect(await weg(page)).toBe(false);
    expect(await trifftKnopf(page)).toBe(true);
  });

  test('ein kleines Zittern blendet nichts aus', async ({ page }) => {
    await langeSeite(page);
    await scrolle(page, 400);
    await scrolle(page, 300);
    expect(await trifftKnopf(page)).toBe(true);
    await scrolle(page, 303);
    expect(await weg(page)).toBe(false);
    expect(await trifftKnopf(page)).toBe(true);
  });

  test('ist das Panel offen, bleibt der Knopf', async ({ page }) => {
    await langeSeite(page);
    await page.evaluate(() => { _ebFigurGefragt = true; openQaBot(); });
    await scrolle(page, 600);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(550);
    expect(await weg(page)).toBe(false);
    const s = await page.evaluate(() => getComputedStyle(document.getElementById('qaLauncher')).visibility);
    expect(s).toBe('visible');
  });

  test('hat der Knopf den Tastaturfokus, bleibt er', async ({ page }) => {
    await langeSeite(page);
    await page.keyboard.press('Shift');
    await page.evaluate(() => document.getElementById('qaLauncher').focus());
    await scrolle(page, 600);
    expect(await weg(page)).toBe(false);
    expect(await trifftKnopf(page)).toBe(true);
  });

  test('versteckt ist er auch für die Tastatur weg — kein Fokus auf Unsichtbarem', async ({ page }) => {
    await langeSeite(page);
    await scrolle(page, 600);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('qaLauncher')).visibility)).toBe('hidden');
  });

  test('Bewegungsreduktion: dieselbe Funktion, aber ohne Gleiten', async ({ page }) => {
    await langeSeite(page, true);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const dauer = await page.evaluate(() => getComputedStyle(document.getElementById('qaLauncher')).transitionDuration);
    // Die globale Regel setzt 0.01ms !important; der Browser meldet „1e-05s“.
    // Gemessen wird, dass nichts sichtbar gleitet, nicht die Schreibweise.
    expect(dauer.split(',').every((d) => parseFloat(d) <= 0.001), dauer).toBe(true);
    await scrolle(page, 600);
    await expect.poll(() => trifftKnopf(page)).toBe(false);
  });

  test('Gegenprobe: ohne Bewegungsreduktion gleitet er wirklich', async ({ page }) => {
    await langeSeite(page);
    const dauer = await page.evaluate(() => getComputedStyle(document.getElementById('qaLauncher')).transitionDuration);
    expect(dauer.split(',').some((d) => parseFloat(d) >= 0.1), dauer).toBe(true);
  });
});

test.describe('Recht', () => {
  test('der Schlüssel ist funktional eingeordnet und steht in der Cookie-Liste', () => {
    const basis = fs.readFileSync(path.join(WURZEL, 'js', 'modules', 'core', '00-basis.js'), 'utf8');
    expect(basis).toMatch(new RegExp(`${SCHLUESSEL}: 'funktional'`));
    const liste = fs.readFileSync(path.join(WURZEL, 'vault', '40-Governance', 'Legal', 'Cookie-Liste.md'), 'utf8');
    expect(liste).toMatch(new RegExp('\\| `' + SCHLUESSEL + '` \\| funktional'));
  });
});
