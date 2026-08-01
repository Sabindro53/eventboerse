// Gebühren-Tests: Brutto = Provision + Stripe-Gebühr + Auszahlung, centgenau.
//
// Modell (Leitplanke 4): Kunde zahlt brutto; Provision 3 % UND Stripe-Gebühr
// trägt der Dienstleister. calculatePayout (app.js) und
// eb_stripe_calculate_fee_quote (functions.php) müssen dasselbe rechnen —
// sonst zeigt das Frontend andere Beträge als Stripe später abbucht.
//
// Die PHP-Seite wird direkt aus functions.php extrahiert (Brace-Matching)
// und per php-CLI ausgeführt — kein WordPress nötig, keine Code-Kopie,
// die veralten könnte.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openApp } = require('./helpers');

// Testbeträge in Euro — decken Kleinst-, Normal- und Großbeträge sowie
// Rundungs-Grenzfälle ab (…,99 / …,005-Kandidaten).
const BETRAEGE_EURO = [0, 0.01, 0.5, 10, 33.33, 450, 999.99, 1000, 1234.56, 25000];

/** PHP-Funktion per Brace-Matching aus functions.php ausschneiden. */
function extractPhpFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`PHP-Funktion ${name} nicht in functions.php gefunden`);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error(`PHP-Funktion ${name}: schließende Klammer nicht gefunden`);
}

/** Gebühren-Quote der PHP-Seite für alle Testbeträge berechnen (php-CLI). */
function phpQuotes(amountsCents) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'functions.php'), 'utf8');
  const fns = [
    'eb_stripe_platform_fee_rate',
    'eb_stripe_processing_fee_rate',
    'eb_stripe_processing_fee_fixed_cents',
    'eb_stripe_processing_fee_estimate_cents',
    'eb_stripe_calculate_fee_quote',
  ].map((n) => extractPhpFunction(src, n)).join('\n');

  const harness = `<?php
// Minimaler WP-Stub — nur was die Gebühren-Funktionen brauchen
function sanitize_text_field($s) { return trim(strip_tags((string)$s)); }
${fns}
$amounts = json_decode($argv[1], true);
$out = array();
foreach ($amounts as $a) { $out[] = eb_stripe_calculate_fee_quote($a); }
echo json_encode($out);
`;
  const tmp = path.join(os.tmpdir(), `eb-fee-harness-${process.pid}.php`);
  fs.writeFileSync(tmp, harness);
  try {
    const raw = execFileSync('php', [tmp, JSON.stringify(amountsCents)], { encoding: 'utf8' });
    return JSON.parse(raw);
  } finally {
    fs.unlinkSync(tmp);
  }
}

test.describe('Gebühren: centgenaue Abrechnung', () => {
  test('PHP: Brutto = Provision + Stripe-Gebühr + Auszahlung (centgenau, alle Beträge)', async () => {
    const cents = BETRAEGE_EURO.map((e) => Math.round(e * 100));
    const quotes = phpQuotes(cents);
    quotes.forEach((q, i) => {
      const gross = cents[i];
      // Kern-Invariante des Geldmodells:
      expect(q.platform_fee_cents + q.stripe_fee_cents + q.provider_payout_before_adjustments_cents,
        `Betrag ${BETRAEGE_EURO[i]} €: Summe muss centgenau aufgehen`).toBe(gross);
      // Provision exakt 3 % (gerundet), nie über brutto
      expect(q.platform_fee_cents).toBe(Math.min(gross, Math.round(gross * 0.03)));
      // Auszahlung nie negativ
      expect(q.provider_payout_before_adjustments_cents).toBeGreaterThanOrEqual(0);
      // Gebühr trägt der Dienstleister — vertraglich zugesichertes Modell
      expect(q.stripe_fee_payer).toBe('provider');
    });
  });

  test('JS: calculatePayout spiegelt das PHP-Modell centgenau (Paritätstest)', async ({ page }) => {
    await openApp(page);
    const cents = BETRAEGE_EURO.map((e) => Math.round(e * 100));
    const phpSide = phpQuotes(cents);
    const jsSide = await page.evaluate((amounts) => amounts.map((a) => calculatePayout(a)), BETRAEGE_EURO);

    BETRAEGE_EURO.forEach((euro, i) => {
      const js = jsSide[i];
      const php = phpSide[i];
      const toCents = (x) => Math.round(x * 100);
      expect(toCents(js.platformFeeAmount), `Provision bei ${euro} €`).toBe(php.platform_fee_cents);
      expect(toCents(js.stripeFeeAmount), `Stripe-Gebühr bei ${euro} €`).toBe(php.stripe_fee_cents);
      expect(toCents(js.netPayoutAmount), `Auszahlung bei ${euro} €`).toBe(php.provider_payout_before_adjustments_cents);
      // JS-interne Invariante: brutto = Gebühren + Auszahlung
      expect(toCents(js.grossAmount)).toBe(toCents(js.totalFeeAmount) + toCents(js.netPayoutAmount));
    });
  });

  test('Referenzbeispiel aus dem Vault: 1.000 € → 30 € Provision, 15,25 € Stripe, 954,75 € Auszahlung', async ({ page }) => {
    await openApp(page);
    const q = await page.evaluate(() => calculatePayout(1000));
    expect(q.platformFeeAmount).toBe(30);
    expect(q.stripeFeeAmount).toBe(15.25);
    expect(q.netPayoutAmount).toBe(954.75);
  });
});
