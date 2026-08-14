// KI-Transparenz: keine stillen Defaults, sichtbare Kennzeichnung auf jeder
// Inseratflaeche und ein belastbarer Meldeweg fuer falsche Deklarationen.
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
const SHELL = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');
const BASIS = fs.readFileSync(path.join(ROOT, 'js/modules/core/00-basis.js'), 'utf8');
const UPLOADS = fs.readFileSync(path.join(ROOT, 'js/modules/ui/22-inserat-settings-uploads.js'), 'utf8');
const DETAIL = fs.readFileSync(path.join(ROOT, 'js/modules/search/12-detail-provider.js'), 'utf8');
const VISION = fs.readFileSync(path.join(ROOT, 'js/modules/ui/52-release-vision.js'), 'utf8');
const RATE_LIMIT = fs.readFileSync(path.join(ROOT, 'includes/security/rate-limit.php'), 'utf8');

test.describe('Deklaration ist ausdruecklich und dauerhaft', () => {
  test('Text und Medien brauchen getrennte Auswahl ohne Vorbelegung', () => {
    expect(SHELL.match(/name="createAiTextDisclosure"/g) || []).toHaveLength(3);
    expect(SHELL.match(/name="createAiMediaDisclosure"/g) || []).toHaveLength(3);
    expect(SHELL).not.toMatch(/name="createAi(?:Text|Media)Disclosure"[^>]*\schecked(?:\s|>|=)/);
    expect(UPLOADS).toMatch(/if \(!aiTextDisclosure \|\| !aiMediaDisclosure\)/);
    expect(UPLOADS).toMatch(/aiTextDisclosure:\s*aiTextDisclosure/);
    expect(UPLOADS).toMatch(/aiMediaDisclosure:\s*aiMediaDisclosure/);
  });

  test('Server akzeptiert keine fehlende oder erfundene Erklaerung', () => {
    expect(FUNCTIONS).toMatch(/function eb_ai_disclosure_pruefen/);
    expect(FUNCTIONS).toMatch(/array\( 'none', 'assisted', 'generated' \)/);
    expect(FUNCTIONS).toMatch(/\$params\['aiTextDisclosure'\] \?\? ''/);
    expect(FUNCTIONS).toMatch(/\$params\['aiMediaDisclosure'\] \?\? ''/);
    expect(FUNCTIONS).not.toMatch(/array\( 'none', 'assisted', 'generated', 'undeclared' \)/);
    const update = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_listings_update'), FUNCTIONS.indexOf('function eb_listings_delete'));
    expect(update).toMatch(/\$params\['aiTextDisclosure'\] \?\? ''/);
    expect(update).toMatch(/\$params\['aiMediaDisclosure'\] \?\? ''/);
  });

  test('Migration erfindet fuer Altinhalte keine menschliche Urheberschaft', () => {
    expect(FUNCTIONS).toMatch(/define\( 'EB_DB_VERSION', '2\.6' \)/);
    expect(FUNCTIONS).toMatch(/ai_text_disclosure varchar\(20\) NOT NULL DEFAULT 'undeclared'/);
    expect(FUNCTIONS).toMatch(/ai_media_disclosure varchar\(20\) NOT NULL DEFAULT 'undeclared'/);
    expect(BASIS).toContain('Medien: KI-Status offen');
    expect(BASIS).toContain('Text: KI-Status offen');
  });
});

test.describe('Kennzeichnung bleibt an jedem Inhalt', () => {
  test('Helfer liefern sichtbare und maschinenlesbare Kennzeichnung', async ({ page }) => {
    const errors = await openApp(page);
    const result = await page.evaluate(() => {
      const ai = { aiTextDisclosure: 'assisted', aiMediaDisclosure: 'generated' };
      const human = { aiTextDisclosure: 'none', aiMediaDisclosure: 'none' };
      const legacy = {};
      return {
        attrs: _aiDisclosureAttrs(ai),
        media: _aiMediaWatermarkHtml(ai),
        text: _aiTextDisclosureHtml(ai),
        labels: _aiDisclosureLabelsHtml(ai),
        humanMedia: _aiMediaWatermarkHtml(human),
        humanText: _aiTextDisclosureHtml(human),
        legacyMedia: _aiMediaWatermarkHtml(legacy),
        legacyText: _aiTextDisclosureHtml(legacy),
      };
    });
    expect(result.attrs).toContain('data-ai-text="assisted"');
    expect(result.attrs).toContain('data-ai-media="generated"');
    expect(result.media).toContain('KI-GENERIERT');
    expect(result.text).toContain('KI-Text bearbeitet');
    expect(result.labels).toContain('KI-generiert');
    expect(result.humanMedia).toBe('');
    expect(result.humanText).toBe('');
    expect(result.legacyMedia).toContain('KI-STATUS OFFEN');
    expect(result.legacyText).toContain('Text-KI offen');
    expectNoPageErrors(errors, 'KI-Kennzeichnungshelfer');
  });

  test('Inseratkarte traegt Datenattribute und beide sichtbaren Hinweise', async ({ page }) => {
    const errors = await openApp(page);
    const html = await page.evaluate(() => renderListingCard({
      id: 991,
      title: 'Deklarierter Testinhalt',
      image: window.EB_IMG_FALLBACK,
      images: [window.EB_IMG_FALLBACK],
      providerName: 'Transparenz-Test',
      providerImg: window.EB_IMG_FALLBACK,
      providerId: 1,
      priceLabel: '100 €',
      rating: 5,
      reviews: 1,
      region: 'Berlin',
      aiTextDisclosure: 'generated',
      aiMediaDisclosure: 'assisted',
    }));
    expect(html).toContain('data-ai-text="generated"');
    expect(html).toContain('data-ai-media="assisted"');
    expect(html).toContain('KI-BEARBEITET');
    expect(html).toContain('KI-Text');
    expectNoPageErrors(errors, 'KI-Inseratkarte');
  });

  test('neue KI-Bilder bekommen das Wasserzeichen in die Pixel', async ({ page }) => {
    const errors = await openApp(page);
    const marked = await page.evaluate(async () => {
      const source = document.createElement('canvas');
      source.width = 900;
      source.height = 600;
      const sourceCtx = source.getContext('2d');
      sourceCtx.fillStyle = '#ffffff';
      sourceCtx.fillRect(0, 0, source.width, source.height);
      const original = await new Promise((resolve) => source.toBlob(resolve, 'image/png'));
      const result = await _aiWatermarkBlob(original, 'generated');
      const bitmap = await createImageBitmap(result);
      const out = document.createElement('canvas');
      out.width = bitmap.width;
      out.height = bitmap.height;
      const ctx = out.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const pixels = ctx.getImageData(0, Math.floor(out.height * .78), out.width, Math.ceil(out.height * .22)).data;
      let dark = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100) dark++;
      }
      return { type: result.type, dark };
    });
    expect(marked.type).toBe('image/jpeg');
    expect(marked.dark, 'eingebrannte dunkle Wasserzeichenflaeche fehlt').toBeGreaterThan(1000);
    expectNoPageErrors(errors, 'Pixel-Wasserzeichen');
  });
});

test.describe('Meldeweg und Rechtstexte', () => {
  test('Meldung wird gespeichert, begrenzt und bestaetigt', () => {
    expect(FUNCTIONS).toContain('eb_content_reports');
    expect(FUNCTIONS).toMatch(/\/listings\/\(\?P<id>\\d\+\)\/report/);
    expect(FUNCTIONS).toMatch(/eventboerse_check_rate_limit\( 'content_report', 20, HOUR_IN_SECONDS \)/);
    expect(FUNCTIONS).toMatch(/'good_faith'\s*=>\s*1/);
    expect(FUNCTIONS).toContain("'sexual_abuse_minors'");
    expect(FUNCTIONS).toContain("'caseId'   => $case_id");
    expect(RATE_LIMIT).toMatch(/hash_hmac\( 'sha256'.*wp_salt\( 'auth' \)/);
    expect(RATE_LIMIT).not.toMatch(/\$bucket\s*=.*md5\(/);
    expect(FUNCTIONS).toMatch(/function eb_content_reports_cleanup/);
    expect(FUNCTIONS).toMatch(/3 \* YEAR_IN_SECONDS/);
    expect(FUNCTIONS).toContain("status <> 'legal_hold'");
    expect(FUNCTIONS.indexOf("$wpdb->insert( $wpdb->prefix . 'eb_content_reports'")).toBeLessThan(
      FUNCTIONS.indexOf("$mail_sent = wp_mail(")
    );
  });

  test('Meldeformular uebernimmt das konkrete Inserat und die Gutglaubenserklaerung', () => {
    expect(SHELL).toContain('id="contentReportTarget" readonly');
    expect(SHELL).toContain('value="ai_undeclared"');
    expect(SHELL).toContain('id="contentReportGoodFaith" required');
    expect(DETAIL).toContain("listing.title + ' · /detail/' + listing.id");
    expect(DETAIL).toContain("'listings/' + listing._dbId + '/report'");
  });

  test('Richtlinien erklaeren Kennzeichnung, Grenzen und Meldedaten', () => {
    expect(SHELL).toContain('Art. 50 VO (EU) 2024/1689');
    expect(SHELL).toContain('Eine KI-Kennzeichnung macht irreführende, rechtswidrige oder rechtsverletzende Inhalte nicht zulässig.');
    expect(SHELL).toContain('Inhaltsmeldungen und Moderation');
    expect(SHELL).toContain('Beschwerde- und Moderationsvorgänge werden grundsätzlich drei Jahre gespeichert');
  });

  test('regelbasierte Medienfunktion gibt sich nicht als KI-Modell aus', () => {
    expect(VISION).toContain('KEIN KI-FOTOMODELL');
    expect(VISION).toContain('Digital erstellt · kein KI-Fotomodell');
  });
});
