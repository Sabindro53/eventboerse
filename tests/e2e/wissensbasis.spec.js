// Wissensbasis-Tests: Fachfragen beantwortet, Off-Topic abgelehnt, 0 Leckage.
//
// Die Wissensbasis (assets/eb-knowledge.json) wird aus share:public-Notizen
// gebaut (Whitelist + Verbotsmuster, siehe vault/00-Kern/Sicherheits-
// Klassifikation.md). Diese Suite prüft drei Verträge:
//   1. Fachfragen erhalten einen belastbaren Treffer (_ebKbGoodHit).
//   2. Off-Topic wird ehrlich abgelehnt (kein Schein-Treffer).
//   3. KEINE Leckage: nur 10-Produkt-Quellen, keine Verbotsmuster im Export.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openApp } = require('./helpers');

const KB_PATH = path.join(__dirname, '..', '..', 'assets', 'eb-knowledge.json');

// Fachfragen → erwartetes Themen-Schlagwort im gefundenen Abschnitt
const FACHFRAGEN = [
  { frage: 'Wie hoch ist die Provision?',                 erwartet: /provision|gebühr/i },
  { frage: 'Wer trägt die Stripe-Gebühren?',              erwartet: /gebühr|stripe|zahlung/i },
  { frage: 'Wie funktioniert die Bezahlung?',             erwartet: /zahlung|buchung/i },
  { frage: 'Wie erstelle ich ein Inserat?',               erwartet: /inserat/i },
  { frage: 'Was ist das Planungsboard?',                  erwartet: /board|planung/i },
  { frage: 'Wie kann ich einen Dienstleister kontaktieren?', erwartet: /kontakt|nachricht/i },
  { frage: 'Sind meine Zahlungsdaten sicher?',            erwartet: /sicher|zahlung/i },
];

const OFF_TOPIC = [
  'Wie wird das Wetter morgen in Berlin?',
  'Schreib mir ein Gedicht über Katzen',
];

async function kbReady(page) {
  await page.evaluate(() => _ebKbLoad());
  await page.waitForFunction(() => window._ebKbState === 'ready', null, { timeout: 10000 });
}

test.describe('Wissensbasis: Antworten & Abgrenzung', () => {
  for (const { frage, erwartet } of FACHFRAGEN) {
    test(`Fachfrage "${frage}" wird beantwortet`, async ({ page }) => {
      await openApp(page);
      await kbReady(page);
      const hit = await page.evaluate((q) => {
        const e = _ebKbGoodHit(q);
        return e ? { title: e.title, heading: e.heading, source: e.source } : null;
      }, frage);
      expect(hit, `"${frage}" muss einen KB-Treffer liefern`).not.toBeNull();
      expect(`${hit.title} ${hit.heading}`, `Treffer muss thematisch passen`).toMatch(erwartet);
    });
  }

  for (const frage of OFF_TOPIC) {
    test(`Off-Topic "${frage}" wird abgelehnt`, async ({ page }) => {
      await openApp(page);
      await kbReady(page);
      const hit = await page.evaluate((q) => _ebKbGoodHit(q), frage);
      expect(hit, 'Off-Topic darf keinen Schein-Treffer bekommen').toBeNull();
    });
  }
});

test.describe('Wissensbasis: Leckage-Schutz', () => {
  test('Export enthält ausschließlich Quellen aus 10-Produkt (public-Layer)', () => {
    const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
    expect(Array.isArray(kb.entries)).toBe(true);
    expect(kb.entries.length).toBeGreaterThan(50);
    const fremdeQuellen = kb.entries
      .map((e) => String(e.source || ''))
      .filter((s) => !s.startsWith('10-Produkt/'));
    expect(fremdeQuellen, 'Nicht-öffentliche Vault-Ebenen dürfen NIE exportiert werden').toEqual([]);
  });

  test('Export enthält keine Verbotsmuster (Keys, Zugangsdaten, Infrastruktur)', () => {
    const raw = fs.readFileSync(KB_PATH, 'utf8');
    // Muster aus vault/00-Kern/Sicherheits-Klassifikation.md
    const VERBOTEN = [
      /sk_live/i, /sk_test/i, /pk_live/i,
      /-----BEGIN/i, /PRIVATE KEY/i,
      /passwort\s*:/i, /password/i, /api[_-]?key/i, /bearer\s+[a-z0-9]/i,
      /wp-config/i,
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/,          // IP-Adressen
      /sftp:\/\//i,
    ];
    for (const muster of VERBOTEN) {
      expect(raw, `Verbotsmuster ${muster} darf nicht im Export stehen`).not.toMatch(muster);
    }
  });

  test('build-knowledge --check läuft sauber durch (Whitelist-Filter intakt)', () => {
    const out = execFileSync('node', ['scripts/build-knowledge.mjs', '--check'], {
      cwd: path.join(__dirname, '..', '..'),
      encoding: 'utf8',
    });
    // Der Build meldet aufgenommene public-Notizen und lehnt alle anderen ab
    expect(out).toMatch(/Aufgenommen \(public\)/);
    expect(out).toMatch(/share ≠ public \(share: secret\)/);
  });

  test('Security-Notizen (share: secret) sind vollständig vom Export ausgeschlossen', () => {
    const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
    const text = JSON.stringify(kb).toLowerCase();
    // Stichproben aus 40-Governance/Security — dürfen als Quelle nie auftauchen
    expect(text).not.toContain('40-governance');
    expect(text).not.toContain('rate-limit.php');
    expect(text).not.toContain('webhook-signatur');
  });
});
