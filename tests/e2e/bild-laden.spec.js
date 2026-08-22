// Wie Bilder geladen werden — gemessen, nicht geschätzt.
//
// Die erste Messung führte mich in die Irre: 191 Bild-Elemente auf der
// Startseite, 180 davon „eifrig". Das klang nach 180 Anfragen. Es waren 22,
// davon 11 eindeutig — die 180 Marquee-Elemente teilen sich dieselbe Adresse,
// und der Browser fasst gleiche URLs zu einer Anfrage zusammen.
//
// Daraus zwei Regeln für diese Suite: es wird die Zahl der ANFRAGEN geprüft,
// nicht die der Elemente. Und das grosse Bild oben darf nie verzögert werden.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const BASIS = fs.readFileSync(path.join(ROOT, 'js', 'modules', 'core', '00-basis.js'), 'utf8');
const FEED = fs.readFileSync(path.join(ROOT, 'js', 'modules', 'search', '10-karten-home-feed.js'), 'utf8');
const DETAIL = fs.readFileSync(path.join(ROOT, 'js', 'modules', 'search', '12-detail-provider.js'), 'utf8');

test.describe('Bildladen', () => {
  test('die Attribute stehen an einer Stelle, nicht an dreissig', () => {
    expect(BASIS).toMatch(/EB_IMG_LAZY_ATTR\s*=\s*' loading="lazy" decoding="async"'/);
    expect(BASIS).toMatch(/EB_IMG_EAGER_ATTR\s*=[^;]*fetchpriority="high"/);
  });

  test('Karten-Galerien laden verzögert — sie liegen unter dem Sichtfenster', () => {
    // Anders als die Marquee tragen sie je Inserat eigene Adressen; hier
    // spart Verzögern wirklich Anfragen.
    expect(FEED).toMatch(/grid-gallery-slide[\s\S]{0,200}EB_IMG_LAZY_ATTR/);
  });

  test('das grosse Bild oben wird nie verzögert', () => {
    // Ein verzögertes LCP-Element macht die Seite langsamer, nicht schneller.
    const stelle = DETAIL.slice(DETAIL.indexOf('detail-hero-photo') - 300, DETAIL.indexOf('detail-hero-photo') + 200);
    expect(stelle, 'Hero ohne Vorrang').toMatch(/EB_IMG_EAGER_ATTR/);
    expect(stelle, 'Hero verzögert geladen').not.toMatch(/EB_IMG_LAZY_ATTR|loading="lazy"/);
  });

  test('die Verbindung zum Bild-Host wird vorbereitet', () => {
    // Die Demo-Bilder kommen weiterhin von Pexels. Preconnect spart den
    // DNS- und TLS-Aufbau vor dem ersten Bild.
    for (const datei of ['index.php', 'index.local-head.html']) {
      const t = fs.readFileSync(path.join(ROOT, datei), 'utf8');
      expect(t, `${datei} ohne Preconnect zum Bild-Host`)
        .toMatch(/preconnect[^>]*images\.pexels\.com/);
    }
  });

  test('die Startseite löst wenige Bildanfragen aus, nicht eine pro Element', async ({ page }) => {
    const anfragen = [];
    await page.route('https://images.pexels.com/**', (r) => { anfragen.push(r.request().url()); r.abort(); });
    await page.goto('/index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    const elemente = await page.evaluate(() => document.images.length);
    expect(elemente, 'die Messung läuft leer').toBeGreaterThan(20);
    // Der Punkt: viele Elemente, wenige Anfragen. Ginge das auseinander,
    // hätte jemand die Adressen pro Element eindeutig gemacht.
    expect(new Set(anfragen).size, `${elemente} Elemente, aber ${new Set(anfragen).size} Anfragen`)
      .toBeLessThan(elemente / 4);
  });
});
