// Bezeichnet REMOTE_ADDR einen Besucher — oder alle?
//
// Jedes IP-Limit der Anwendung setzt still voraus, dass REMOTE_ADDR den
// einzelnen Client bezeichnet. Steht ein Reverse-Proxy davor, stimmt das
// nicht: dann trägt JEDE Anfrage dieselbe Adresse, und aus
//
//   „3 Registrierungen pro IP und Stunde"
//
// wird „3 Registrierungen pro Stunde für die ganze Website". Am Starttag sähe
// das aus wie eine kaputte Seite — die vierte Person der Stunde bekommt eine
// Fehlermeldung über ein Limit, das sie nie erreicht hat, und niemand wüsste
// warum.
//
// Ob bei IONOS ein Proxy davorsteht, lässt sich von hier nicht messen. Muss es
// auch nicht: eine private oder reservierte Adresse KANN kein Internet-Client
// sein. Steht sie in REMOTE_ADDR, sitzt etwas dazwischen — das genügt als
// Erkennung, und der Code richtet sich selbst danach.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');

function pruefstand() {
  return JSON.parse(execFileSync('php', [path.join(__dirname, 'ratelimit-proxy.php')],
    { cwd: ROOT, encoding: 'utf8' }));
}

test.describe('Rate-Limits hinter einem Proxy', () => {
  test('eine öffentliche Adresse bezeichnet einen Client — Limits bleiben scharf', () => {
    const r = pruefstand();
    for (const fall of ['oeffentlich_v4', 'oeffentlich_v6']) {
      expect(r.faelle[fall].identifiziert, `${fall} gilt nicht als Client`).toBe(true);
      expect(r.faelle[fall].limit3, `${fall} wurde geweitet`).toBe(3);
      expect(r.faelle[fall].limit20, `${fall} wurde geweitet`).toBe(20);
    }
  });

  test('private, reservierte und kaputte Adressen bezeichnen niemanden', () => {
    const r = pruefstand();
    const proxy = ['privat_10', 'privat_172', 'privat_192', 'loopback',
      'loopback_v6', 'privat_v6', 'linklocal', 'muell', 'leer', 'fehlt'];
    for (const fall of proxy) {
      expect(r.faelle[fall].identifiziert, `${fall} gilt fälschlich als Client`)
        .toBe(false);
    }
  });

  test('hinter einem Proxy wird geweitet, nicht abgeschaltet', () => {
    // Ganz ohne Bremse wäre eine Anmeldemaske ohne jeden Flutschutz. Wer 500
    // Fehlanmeldungen in einer Viertelstunde macht, ist kein Besucher.
    const r = pruefstand();
    expect(r.faktor, 'kein Faktor gefunden').toBeGreaterThan(1);
    expect(r.faelle.privat_10.limit3).toBe(3 * r.faktor);
    expect(r.faelle.privat_10.limit20).toBe(20 * r.faktor);
    expect(r.faelle.privat_10.limit3, 'die Weitung ist zu klein für einen Starttag')
      .toBeGreaterThanOrEqual(50);
  });

  test('ein Eimer mit eigenem Identifier wird NIE geweitet', () => {
    // Das ist die Grenze, die wirklich ein Konto schützt: 5 Fehlversuche je
    // E-Mail. Sie hängt am Konto, nicht an der Leitung — ein Proxy darf sie
    // nicht anfassen, sonst hat der Angreifer plötzlich 125 Versuche.
    const r = pruefstand();
    for (const fall of Object.keys(r.faelle)) {
      expect(r.faelle[fall].limitEigen, `kontogebundenes Limit geweitet bei ${fall}`)
        .toBe(5);
    }
  });
});

test.describe('Die Weitung ist auch wirklich verdrahtet', () => {
  // Die Regel zu prüfen genügt nicht. Genau diese Lücke — Regel geprüft,
  // Verdrahtung nicht — hat in diesem Projekt schon mehrfach eine Mutation
  // überleben lassen.
  test('das Registrierungs-Limit fragt die Weitung', () => {
    expect(pruefstand().verdrahtung.registrierung,
      'in functions.php steht weiterhin die feste 3').toBe(true);
  });

  test('der globale Login-Eimer fragt die Weitung', () => {
    expect(pruefstand().verdrahtung.login_ip,
      'in functions.php steht weiterhin die feste 20').toBe(true);
  });

  test('der Login-Eimer je Konto bleibt fest bei 5', () => {
    expect(pruefstand().verdrahtung.login_konto_fest,
      'das kontogebundene Limit wurde mitgeweitet — das schützt dann nichts mehr')
      .toBe(true);
  });

  test('der geteilte Limiter weitet nur ohne eigenen Identifier', () => {
    expect(pruefstand().verdrahtung.limiter,
      'eventboerse_check_rate_limit weitet gar nicht oder auch kontogebundene Eimer')
      .toBe(true);
  });
});

test.describe('X-Forwarded-For bleibt ungeglaubt', () => {
  test('der Header wird nirgends als Client-Identität benutzt', () => {
    // Er ist frei wählbar, solange nicht feststeht, welcher Proxy ihn setzt
    // und ob er ihn überschreibt. Ein Angreifer, der ihn selbst füllt, hätte
    // beliebig viele Identitäten — schlechter als der heutige Zustand.
    const fs = require('node:fs');
    for (const datei of ['functions.php', 'includes/security/rate-limit.php']) {
      const t = fs.readFileSync(path.join(ROOT, datei), 'utf8');
      // Erwähnung im Kommentar ist erlaubt, Benutzung als Wert nicht.
      const code = t.split('\n')
        .filter((z) => !/^\s*(\/\/|\*|\/\*|#)/.test(z))
        .join('\n');
      expect(code, `${datei} liest HTTP_X_FORWARDED_FOR`)
        .not.toMatch(/\$_SERVER\s*\[\s*['"]HTTP_X_FORWARDED_FOR/);
      expect(code, `${datei} liest HTTP_CLIENT_IP`)
        .not.toMatch(/\$_SERVER\s*\[\s*['"]HTTP_CLIENT_IP/);
    }
  });
});
