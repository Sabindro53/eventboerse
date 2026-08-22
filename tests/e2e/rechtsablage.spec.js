// Geschuetzte Rechts- und Gruendungsablage im HQ.
//
// Die entscheidenden Zusicherungen sind hier nicht nur Oberflaeche:
// Originaldateien duerfen nie im Repo/Webroot landen, jede Datei bleibt
// versioniert, und ein automatischer Rechtsquellen-Check erzeugt Arbeit statt
// eigenmaechtig Vertragstext zu veraendern.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const lesen = (datei) => fs.readFileSync(path.join(ROOT, datei), 'utf8');
const KATALOG = JSON.parse(lesen('assets/eb-rechtsunterlagen.json'));
const FUNCTIONS = lesen('functions.php');
const HQ = lesen('hq.html');

test.describe('Rechtsablage – Bestand und Schutz', () => {
  test('47 Unterlagen sind vollstaendig und eindeutig eingeordnet', () => {
    expect(KATALOG.zusammenfassung).toMatchObject({ gesamt: 47, jetzt: 34, vorFreigabe: 7, anlagen: 5, archiv: 1 });
    expect(new Set(KATALOG.dokumente.map((d) => d.id)).size).toBe(47);
    expect(new Set(KATALOG.dokumente.map((d) => d.datei)).size).toBe(47);
    for (const d of KATALOG.dokumente) {
      expect(['jetzt', 'vor_freigabe', 'anlage', 'archiv']).toContain(d.bedarf);
      expect(d.aktion.length, `${d.id} braucht einen klaren naechsten Schritt`).toBeGreaterThan(14);
    }
    expect(KATALOG.aufgaben.some((a) => a.id === 'unterschriften')).toBe(true);
    expect(KATALOG.aufgaben.some((a) => a.id === 'gruendungsstand')).toBe(true);
  });

  test('keine Originale sind im oeffentlichen Repository', () => {
    const gefunden = [];
    const laufen = (ordner) => {
      for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
        if (['.git', 'node_modules', 'test-results'].includes(eintrag.name)) continue;
        const ziel = path.join(ordner, eintrag.name);
        if (eintrag.isDirectory()) laufen(ziel);
        else if (/\.(docx|pdf)(?:\.|$)/i.test(eintrag.name)) gefunden.push(path.relative(ROOT, ziel));
      }
    };
    laufen(ROOT);
    expect(gefunden, 'Rechtsoriginale gehoeren nur in den privaten Serverspeicher').toEqual([]);
  });

  test('Server speichert ausserhalb des Webroots und prueft echte Dateiinhalte', () => {
    const ordner = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_rechtsablage_ordner'), FUNCTIONS.indexOf('function eb_hq_rechtsablage_zustand'));
    expect(ordner).toMatch(/DOCUMENT_ROOT/);
    expect(ordner).toMatch(/\$liegt_im_web/);
    expect(ordner).toMatch(/eb_recht_storage_public/);
    expect(FUNCTIONS).toMatch(/chmod\(\s*\$ziel,\s*0600\s*\)/);
    expect(FUNCTIONS).toMatch(/locateName\(\s*'word\/document\.xml'/);
    expect(FUNCTIONS).toMatch(/strncmp\(\s*\$kopf,\s*'%PDF-'/);
    expect(FUNCTIONS, 'Rechtsakten sollen Historie haben, keine Loeschroute').not.toMatch(/rechtsablage\/loesch|rechtsablage\/delete/);
  });

  test('alle Ablagewege verlangen den gemeinsamen HQ-Zugang', () => {
    for (const route of ['/hq/rechtsablage', '/hq/rechtsablage/upload', '/hq/rechtsablage/aufgabe']) {
      const start = FUNCTIONS.indexOf(`'${route}'`);
      expect(start, `${route} fehlt`).toBeGreaterThan(0);
      expect(FUNCTIONS.slice(start, start + 330)).toMatch(/'permission_callback'\s*=>\s*'eb_hq_proxy_darf'/);
    }
    expect(FUNCTIONS).toMatch(/function eb_hq_rechtsablage_download/);
    expect(FUNCTIONS).toMatch(/if \( ! eb_hq_zugang_offen\(\) \)/);

    const htaccess = lesen('.htaccess');
    expect(htaccess).toMatch(/assets\/eb-rechts\(unterlagen\|unterlagen-katalog\|quellen\)\\\.json/);
    expect(htaccess).toMatch(/RewriteRule \^assets\/eb-rechts/);
    expect(htaccess).toMatch(/FilesMatch "\^eb-rechts/);
    const deploy = lesen('.github/workflows/ionos-deploy.yml');
    expect(deploy).toMatch(/eb-rechtsunterlagen-katalog\\\.json/);
    expect(deploy).toMatch(/eb-rechtsquellen\\\.json/);
    expect(deploy, 'der geschuetzte Laufzeitkatalog muss auf den Server').not.toMatch(/-x '\^assets\/eb-rechtsunterlagen\\\.json\$'/);
  });

  test('taegliche Routine beobachtet Quellen, schreibt aber keine Vertraege um', () => {
    const routine = lesen('.github/workflows/tagesroutine.yml');
    expect(routine).toMatch(/node scripts\/rechtsquellen\.mjs/);
    expect(routine).toMatch(/node scripts\/rechtsunterlagen\.mjs/);
    expect(routine).toMatch(/assets\/eb-rechtsquellen\.json/);
    expect(routine).toMatch(/assets\/eb-rechtsunterlagen\.json/);
    const monitor = lesen('scripts/rechtsquellen.mjs');
    expect(monitor).toMatch(/akzeptierterHash/);
    expect(monitor).toMatch(/status: akzeptiert === aktuell \? 'aktuell' : 'pruefung'/);
    expect(monitor).not.toMatch(/\.docx|\.pdf/);
  });
});

test.describe('Rechtsablage – HQ-Oberflaeche', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://api.github.com/**', (route) => route.abort());
    await page.route('**/wp-json/eventboerse/v1/hq/rechtsablage', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        speicher: 'bereit',
        aufgaben: {},
        dateien: {
          B01: [{ version: '20260822T120000Z-a1b2c3d4e5f6', name: 'B01_Impressum.docx', typ: 'docx', groesse: 48128, hochgeladen: '2026-08-22T12:00:00Z', von: 'Sandro', sha256: 'a'.repeat(64), download: '/hq/rechtsunterlagen/B01/20260822T120000Z-a1b2c3d4e5f6' }],
        },
      }),
    }));
    await page.goto('/hq.html');
    await expect(page.locator('#recht-liste .recht-dokument')).toHaveCount(41);
  });

  test('zeigt Handlungsbedarf, Zuständigkeit und sicheren Dateistand', async ({ page }) => {
    await expect(page.locator('#rechtsablage')).toContainText('Rechts- & Gründungsablage');
    await expect(page.locator('#recht-kpis')).toContainText('47');
    await expect(page.locator('#recht-kpis')).toContainText('34');
    await expect(page.locator('#recht-kpis')).toContainText('1');
    await expect(page.locator('#recht-aufgaben .recht-aufgabe')).toHaveCount(KATALOG.aufgaben.length);
    await expect(page.locator('#recht-liste')).toContainText('Aktuelle Fassung');
    await expect(page.locator('#recht-sicherheit')).toContainText('Privater Speicher bereit');
  });

  test('trennt Handlungsbedarf, Anlagen und Archiv', async ({ page }) => {
    await page.locator('#recht-bedarf').selectOption('anlage');
    await expect(page.locator('#recht-liste .recht-dokument')).toHaveCount(5);
    await page.locator('#recht-bedarf').selectOption('archiv');
    await expect(page.locator('#recht-liste .recht-dokument')).toHaveCount(1);
    await expect(page.locator('#recht-liste')).toContainText('B06-ALT');
    await page.locator('#recht-bedarf').selectOption('alle');
    await page.locator('#recht-suche').fill('D01');
    await expect(page.locator('#recht-liste .recht-dokument')).toHaveCount(1);
    await expect(page.locator('#recht-liste')).toContainText('Domain-Übertragungsvertrag');
  });

  test('speichert erledigte Aufgaben mit Fingerprint statt sie still zu vergessen', async ({ page }) => {
    await page.route('**/wp-json/eventboerse/v1/hq/rechtsablage/aufgabe', async (route) => {
      const body = route.request().postDataJSON();
      expect(body.id).toBe('gruendungsstand');
      expect(body.fingerprint).toMatch(/^[a-f0-9]{8}$/);
      expect(body.erledigt).toBe(true);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...body, geaendert: '2026-08-22T12:10:00Z', von: 'Sandro' }) });
    });
    const checkbox = page.getByLabel('Aufgabe erledigt: Gründungsstand und überholte Termine bestätigen');
    await checkbox.check();
    await expect(page.locator('#recht-aufgaben-stand')).toContainText((KATALOG.aufgaben.length - 1) + ' offen');
  });
});
