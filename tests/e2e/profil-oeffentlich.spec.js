// Die öffentliche Profil-Route — N01, PRODUCT_REDESIGN.md Abschnitt 9.
//
// ── DER BEFUND (16.10.2026, Live-Seite, ohne Anmeldung) ──────────────────
//
// `GET provider/{id}` antwortete für fortlaufende IDs mit Name, Rolle, Ort,
// Bio und Galerie — auch für Konten ohne ein einziges Inserat. Damit war
// (a) die Rolle „Admin" für jedes Konto abfragbar: wer angreifen will, fand
// die Verwaltungskonten ohne zu raten, und (b) jeder Event-Planer, der nie
// etwas veröffentlicht hat, öffentlich mit Namen auffindbar. Das widerspricht
// der eigenen Regel „keine Nutzer-Aufzählung" (Freunde & Gruppen,
// Entscheidung 1).
//
// ── DIE REGEL (Entscheidung des Inhabers) ────────────────────────────────
//
// Öffentlich ist ein Profil, wenn es etwas Öffentliches hat: Basisrolle
// Dienstleister, ein aktives Inserat oder Gesuch, oder eine abgegebene
// Bewertung. Sonst sehen es nur das Konto selbst, Admins und der
// Gesprächspartner aus dem Chat. Alle anderen bekommen DIESELBE 404 wie für
// eine ID, die es nicht gibt — sonst ließe sich weiter zählen.
//
// Der Suchname zählt bewusst NICHT: er ist seit dem 15.09.2026 Pflicht bei
// der Registrierung und wäre damit keine Einwilligung mehr.
//
// Gemessen wird im echten PHP (profil-oeffentlich.php führt den Handler aus).
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const PRUEFSTAND = path.join(__dirname, 'profil-oeffentlich.php');
const ROUTE = path.join(WURZEL, 'includes', 'profil', 'profil-route.php');
const FUNCTIONS = path.join(WURZEL, 'functions.php');

/** Konten des Prüfstands. Rollen wie in WordPress. */
const KONTEN = {
  1: { rollen: ['administrator'], inserate: 2 },          // Admin mit Inseraten
  2: { rollen: ['administrator'], inserate: 0 },          // Admin ohne alles
  3: { rollen: ['dienstleister'], inserate: 1 },          // Anbieter
  4: { rollen: ['dienstleister'], inserate: 0 },          // Anbieter ohne Inserat
  5: { rollen: ['subscriber'], inserate: 0 },             // Planer ohne alles
  6: { rollen: ['subscriber'], inserate: 1 },             // Planer mit Gesuch
  7: { rollen: ['subscriber'], inserate: 0, bewertungen: 2 }, // Planer, hat bewertet
  8: { rollen: ['subscriber'], inserate: 0, gespraech_mit: [3] }, // Planer im Chat mit 3
  9: { rollen: ['administrator', 'dienstleister'], inserate: 1 }, // Admin, der auch anbietet
};

function fahre(faelle) {
  const r = spawnSync('php', [PRUEFSTAND], {
    input: JSON.stringify({ konten: KONTEN, faelle }), encoding: 'utf8',
  });
  expect(r.status, `Prüfstand brach ab:\n${r.stderr}`).toBe(0);
  expect(r.stdout.trim().length, `Prüfstand lieferte nichts:\n${r.stderr}`).toBeGreaterThan(0);
  return JSON.parse(r.stdout);
}

test.describe('Die Rolle „Admin" ist nie öffentlich', () => {
  test('ein Admin mit Inseraten erscheint als das, was er öffentlich ist', () => {
    const [a, b] = fahre([{ profil: 1 }, { profil: 9 }]);
    expect(a.status).toBe(200);
    expect(a.role).toBe('Event-Planer');
    expect(b.role).toBe('Dienstleister');
  });

  test('auch nicht für einen angemeldeten Fremden', () => {
    const [a] = fahre([{ profil: 1, betrachter: 3 }]);
    expect(a.role).not.toBe('Admin');
  });

  test('kein Feld der Antwort trägt die Verwaltungsrolle unter anderem Namen', () => {
    const [a] = fahre([{ profil: 1 }]);
    expect(a.felder).not.toContain('isAdmin');
    expect(a.felder).not.toContain('roles');
  });
});

test.describe('Ohne öffentliche Inhalte: dieselbe 404 wie für eine ID, die es nicht gibt', () => {
  test('Planer ohne alles, Admin ohne alles und eine unbekannte ID sind ununterscheidbar', () => {
    const [planer, admin, gibtsNicht] = fahre([{ profil: 5 }, { profil: 2 }, { profil: 999 }]);
    for (const r of [planer, admin, gibtsNicht]) {
      expect(r.status).toBe(404);
      expect(r.felder).toEqual(['message']);
    }
    expect(planer.message).toBe(gibtsNicht.message);
    expect(admin.message).toBe(gibtsNicht.message);
  });

  test('ein angemeldeter Fremder sieht den Planer auch nicht', () => {
    const [r] = fahre([{ profil: 5, betrachter: 3 }]);
    expect(r.status).toBe(404);
  });
});

test.describe('Was ein Profil öffentlich macht', () => {
  test('Dienstleister — auch ohne Inserat', () => {
    const [mit, ohne] = fahre([{ profil: 3 }, { profil: 4 }]);
    expect(mit.status).toBe(200);
    expect(ohne.status).toBe(200);
  });

  test('ein aktives Gesuch macht den Planer öffentlich', () => {
    const [r] = fahre([{ profil: 6 }]);
    expect(r.status).toBe(200);
    expect(r.role).toBe('Event-Planer');
  });

  test('eine abgegebene Bewertung — dort steht der Name ohnehin', () => {
    const [r] = fahre([{ profil: 7 }]);
    expect(r.status).toBe(200);
  });
});

test.describe('Wer ein nicht öffentliches Profil trotzdem sieht', () => {
  test('das Konto selbst', () => {
    const [r] = fahre([{ profil: 5, betrachter: 5 }]);
    expect(r.status).toBe(200);
  });

  test('ein Admin (Moderation)', () => {
    const [r] = fahre([{ profil: 5, betrachter: 2 }]);
    expect(r.status).toBe(200);
  });

  test('der Gesprächspartner aus dem Chat — in beide Richtungen, aber kein Dritter', () => {
    const [partner, dritter] = fahre([{ profil: 8, betrachter: 3 }, { profil: 8, betrachter: 4 }]);
    expect(partner.status).toBe(200);
    expect(dritter.status).toBe(404);
  });
});

test.describe('Die interne Rolle verlässt nur Antworten an das eigene Konto oder an Admins', () => {
  // Beim Beheben von N01 gefunden: die Partnerliste im öffentlichen Profil
  // (eb_collaboration_partner) trug die interne Rolle ebenfalls. Geprüft wird
  // deshalb die BEDINGUNG, nicht die eine Stelle: jeder Aufruf von
  // eventboerse_map_role() steht in einer Funktion, die nur dem eigenen Konto
  // oder Admins antwortet. Ein neuer öffentlicher Aufruf macht diesen Test rot
  // und zwingt zur Entscheidung, statt still „Admin“ auszuliefern.
  const ERLAUBT = {
    eventboerse_enqueue_assets: 'eigenes Konto (eventboerseApi beim Laden)',
    eb_auth_user_payload: 'eigenes Konto (Anmeldung, /me)',
    eb_settings_update: 'eigenes Konto (Einstellungen)',
    eb_admin_list_users: 'Admin-Route (permission_callback eb_is_admin_user)',
    eb_admin_change_role: 'Admin-Route',
  };

  test('jeder Aufruf steht in einer erlaubten Funktion', () => {
    const code = phpOhneKommentare(FUNCTIONS);
    const funde = [];
    const re = /eventboerse_map_role\s*\(/g;
    let m;
    while ((m = re.exec(code))) {
      const davor = code.slice(0, m.index);
      if (/function\s+$/.test(davor)) continue; // die Definition selbst ist kein Aufruf
      const def = [...davor.matchAll(/function\s+([a-z_0-9]+)\s*\(/gi)].pop();
      const name = def ? def[1] : '(oberste Ebene)';
      funde.push(name);
    }
    const fremd = funde.filter((n) => !(n in ERLAUBT));
    expect(fremd, 'öffentliche Antwort mit interner Rolle').toEqual([]);
    // Gegenprobe: die Suche findet überhaupt etwas — sonst wäre sie still grün.
    expect(funde.length).toBeGreaterThanOrEqual(Object.keys(ERLAUBT).length);
  });

  test('die Partnerliste gibt die Basisrolle aus', () => {
    const code = phpOhneKommentare(FUNCTIONS);
    const rumpf = code.slice(code.indexOf('function eb_collaboration_partner'), code.indexOf('function eb_collaborations_enriched'));
    expect(rumpf).toMatch(/eventboerse_base_role\(\s*\$user\s*\)/);
  });
});

test.describe('Verdrahtung', () => {
  test('functions.php bindet die Route ein und definiert den Handler nicht zweimal', () => {
    const code = phpOhneKommentare(FUNCTIONS);
    expect(code).toMatch(/require_once[^;]*includes\/profil\/profil-route\.php/);
    expect(code).not.toMatch(/function\s+eb_provider_profile\s*\(/);
    expect(fs.existsSync(ROUTE)).toBe(true);
  });

  test('die Route-Datei trägt den Wächter gegen den direkten Aufruf', () => {
    expect(fs.readFileSync(ROUTE, 'utf8')).toMatch(/defined\(\s*'ABSPATH'\s*\)/);
  });

  test('die Profilseite zeigt bei 404 „nicht verfügbar", statt leer stehen zu bleiben', () => {
    const { ohneJsKommentare } = require('./lib/js-code');
    const js = ohneJsKommentare(fs.readFileSync(path.join(WURZEL, 'js', 'modules', 'search', '12-detail-provider.js'), 'utf8'));
    expect(js).toMatch(/if \(!data \|\| data\.message\) \{ _showProviderNotFound\(pid\); return; \}/);
  });
});
