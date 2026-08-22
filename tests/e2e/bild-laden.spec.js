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
const SHELL = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');
const LOADER_SCRIPT = (() => {
  const marker = 'var STARTED_AT = Date.now();';
  const scriptStart = SHELL.lastIndexOf('<script>', SHELL.indexOf(marker));
  const scriptEnd = SHELL.indexOf('</script>', SHELL.indexOf(marker));
  return SHELL.slice(scriptStart + '<script>'.length, scriptEnd);
})();

test.describe('Bildladen', () => {
  test('die Attribute stehen an einer Stelle, nicht an dreissig', () => {
    expect(BASIS).toMatch(/EB_IMG_LAZY_ATTR\s*=\s*' loading="lazy" decoding="async"'/);
    expect(BASIS).toMatch(/EB_IMG_EAGER_ATTR\s*=[^;]*fetchpriority="high"/);
    expect(BASIS).toMatch(/EB_IMG_EAGER_ATTR\s*=[^;]*data-eb-critical="true"/);
  });

  test('der Loader wartet auf wichtige Bilder und besitzt einen längeren Failsafe', () => {
    expect(SHELL).toMatch(/FAILSAFE_MS\s*=\s*15000/);
    expect(SHELL).toMatch(/querySelectorAll\('\.page\.active img\[data-eb-critical="true"\]'/);
    expect(SHELL).toMatch(/img\.decode\(\)/);
    expect(SHELL).toMatch(/Bilder werden geladen/);
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

  test('der Loader bleibt stehen, solange wichtige Bilder noch laden', async ({ page }) => {
    let freigeben;
    const gate = new Promise(resolve => { freigeben = resolve; });
    let bildAnfragen = 0;
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    await page.route('https://images.pexels.com/**', async route => {
      bildAnfragen++;
      await gate;
      await route.fulfill({ status: 200, contentType: 'image/png', body: pixel });
    });

    await page.setContent(`
      <div id="appLoadingOverlay"><div id="appLoadingStatus"></div></div>
      <section class="page active"><img id="critical" data-eb-critical="true" alt=""></section>
    `);
    await page.addScriptTag({ content: LOADER_SCRIPT });
    await page.evaluate(() => {
      document.getElementById('critical').src = 'https://images.pexels.com/slow-critical.jpg';
      window.__finishAppLoading();
    });
    await expect.poll(() => bildAnfragen).toBeGreaterThan(0);
    expect(await page.locator('#appLoadingOverlay').count()).toBe(1);

    freigeben();
    await expect(page.locator('#appLoadingOverlay')).toHaveCount(0, { timeout: 5000 });
  });

  test('die Marquee sammelt weder Frames noch Bedien-Handler an', async ({ page }) => {
    await page.route('https://images.pexels.com/**', route => route.abort());
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.renderHeroMarquees === 'function');
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) window.renderHeroMarquees();
    });
    await page.waitForTimeout(800);
    const stand = await page.evaluate(() => ({
      cleanups: window._marqueeRAFs.length,
      tracks: document.querySelectorAll('.hero-marquee-track').length,
      nurFunktionen: window._marqueeRAFs.every(v => typeof v === 'function'),
      kritisch: document.querySelectorAll('img[data-eb-critical="true"]').length,
      bilder: document.images.length,
    }));
    expect(stand.cleanups).toBeLessThanOrEqual(stand.tracks);
    expect(stand.nurFunktionen).toBe(true);
    expect(stand.kritisch).toBeGreaterThan(0);
    expect(stand.kritisch).toBeLessThan(stand.bilder);
  });
});
