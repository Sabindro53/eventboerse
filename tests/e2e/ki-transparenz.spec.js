// KI-Transparenz: keine stillen Defaults, dezente Kennzeichnung ausserhalb
// der Bilder und ein belastbarer Meldeweg fuer falsche Deklarationen.
const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors } = require('./helpers');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
const SHELL = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');
const BASIS = fs.readFileSync(path.join(ROOT, 'js/modules/core/00-basis.js'), 'utf8');
const DEMOS = fs.readFileSync(path.join(ROOT, 'js/modules/core/01-demo-daten.js'), 'utf8');
const CARDS = fs.readFileSync(path.join(ROOT, 'js/modules/search/10-karten-home-feed.js'), 'utf8');
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

  test('bestaetigter Live-Bestand und Demo-Inserate sind korrekt nachdeklariert', () => {
    expect(FUNCTIONS).toMatch(/define\( 'EB_DB_VERSION', '2\.7' \)/);
    expect(FUNCTIONS).toMatch(/ai_text_disclosure varchar\(20\) NOT NULL DEFAULT 'undeclared'/);
    expect(FUNCTIONS).toMatch(/ai_media_disclosure varchar\(20\) NOT NULL DEFAULT 'undeclared'/);
    expect(FUNCTIONS).toMatch(/ai_text_disclosure = 'none', ai_media_disclosure = 'none' WHERE id IN \(5, 7, 8\)/);
    expect(FUNCTIONS).toMatch(/ai_text_disclosure = 'generated', ai_media_disclosure = 'generated' WHERE id IN \(9, 10, 12, 13\)/);
    expect(DEMOS).toContain("listing.aiTextDisclosure = 'generated'");
    expect(DEMOS).toContain("listing.aiMediaDisclosure = 'generated'");
  });
});

test.describe('Kennzeichnung bleibt dezent am Inhalt', () => {
  test('Helfer liefern eine kleine Textzeile und maschinenlesbare Werte', async ({ page }) => {
    const errors = await openApp(page);
    const result = await page.evaluate(() => {
      const ai = { aiTextDisclosure: 'assisted', aiMediaDisclosure: 'generated' };
      const human = { aiTextDisclosure: 'none', aiMediaDisclosure: 'none' };
      const legacy = {};
      return {
        attrs: _aiDisclosureAttrs(ai),
        labels: _aiDisclosureLabelsHtml(ai),
        humanLabels: _aiDisclosureLabelsHtml(human),
        legacyLabels: _aiDisclosureLabelsHtml(legacy),
      };
    });
    expect(result.attrs).toContain('data-ai-text="assisted"');
    expect(result.attrs).toContain('data-ai-media="generated"');
    expect(result.labels).toContain('KI-generierter Inhalt');
    expect(result.labels).not.toContain('material-icons-round');
    expect(result.humanLabels).toBe('');
    expect(result.legacyLabels).toContain('KI-Status offen');
    expectNoPageErrors(errors, 'KI-Kennzeichnungshelfer');
  });

  test('Inseratkarte zeigt den Text im Inhaltsteil und nie auf dem Bild', async ({ page }) => {
    const errors = await openApp(page);
    const result = await page.evaluate(() => {
      const host = document.createElement('div');
      host.innerHTML = renderListingCard({
        id: 991,
        title: 'Deklarierter Testinhalt',
        categoryLabel: 'Dekoration',
        location: 'Berlin',
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
      });
      const card = host.firstElementChild;
      return {
        text: card.textContent,
        imageText: card.querySelector('.listing-card-img').textContent,
        bodyText: card.querySelector('.listing-card-body').textContent,
        aiText: card.getAttribute('data-ai-text'),
        aiMedia: card.getAttribute('data-ai-media'),
      };
    });
    expect(result.aiText).toBe('generated');
    expect(result.aiMedia).toBe('assisted');
    expect(result.text).toContain('KI-generierter Inhalt');
    expect(result.imageText).not.toContain('KI');
    expect(result.bodyText).toContain('KI-generierter Inhalt');
    expectNoPageErrors(errors, 'KI-Inseratkarte');
  });

  test('Bilddateien und Bildflaechen bleiben frei von Wasserzeichen', () => {
    expect(BASIS).not.toContain('_aiMediaWatermarkHtml');
    expect(BASIS).not.toContain('_aiTextDisclosureHtml');
    expect(UPLOADS).not.toContain('_aiWatermarkBlob');
    expect(CARDS).not.toContain('_aiMediaWatermarkHtml');
    expect(CARDS).not.toContain('_aiTextDisclosureHtml');
    expect(UPLOADS).toMatch(/new File\(\[entry\.blob\]/);
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
