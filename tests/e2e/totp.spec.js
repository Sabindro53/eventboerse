// Zweiter Faktor per Authenticator-App (RFC 6238).
//
// Das bisherige „2FA" der Seite war ein per E-Mail verschickter Code — der
// schützt gegen ein geknacktes Passwort nur so gut wie das Postfach. Ein
// Authenticator-Geheimnis verlässt das Gerät nie.
//
// Selbstgebautes TOTP bricht fast immer an denselben drei Stellen: falsche
// Codeableitung, Wiederverwendung eines abgelesenen Codes, und ein Vergleich,
// der über die Laufzeit verrät wie viele Stellen stimmten. Alle drei werden
// hier festgehalten.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

/** Die TOTP-Funktionen aus functions.php in einer PHP-Sandbox ausführen. */
function php(schnipsel) {
  const anfang = FUNCTIONS.indexOf('const EB_TOTP_STEP');
  const ende = FUNCTIONS.indexOf('function eb_totp_aktiv');
  const kern = FUNCTIONS.slice(anfang, ende);
  const datei = path.join(require('node:os').tmpdir(), `totp-${Date.now()}-${Math.random()}.php`);
  fs.writeFileSync(datei, `<?php\n${kern}\n${schnipsel}\n`, 'utf8');
  try {
    return execFileSync('php', [datei], { encoding: 'utf8' }).trim();
  } finally { fs.unlinkSync(datei); }
}

test.describe('TOTP rechnet nach RFC 6238', () => {
  // Ohne diese Vektoren wäre „es erzeugt sechs Ziffern" die einzige
  // Zusicherung — und die erfüllt auch ein Zufallsgenerator.
  const VEKTOREN = [
    [59, '287082'], [1111111109, '081804'], [1111111111, '050471'],
    [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130'],
  ];

  test('offizielle Testvektoren stimmen', () => {
    const aus = php(`
      $s = eb_totp_base32_encode('12345678901234567890');
      foreach ([59,1111111109,1111111111,1234567890,2000000000,20000000000] as $t) {
        echo eb_totp_code($s, (int) floor($t / 30)), "\\n";
      }`).split('\n');
    VEKTOREN.forEach(([t, erwartet], i) => {
      expect(aus[i], `RFC-Vektor T=${t}`).toBe(erwartet);
    });
  });

  test('Base32 ist Authenticator-kompatibel', () => {
    // Falsches Base32 heißt: die App zeigt Codes an, die nie passen.
    expect(php(`echo eb_totp_base32_encode('12345678901234567890');`))
      .toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  test('Toleranz bleibt eng', () => {
    // ±1 Schritt gegen Uhrendrift. Ein größeres Fenster verlängert die Zeit,
    // in der ein abgelesener Code noch gilt.
    expect(FUNCTIONS).toMatch(/EB_TOTP_FENSTER\s*=\s*1\b/);
    const aus = php(`
      $s = eb_totp_base32_encode('12345678901234567890');
      $j = (int) floor(time() / 30);
      echo eb_totp_pruefen($s, eb_totp_code($s, $j)),      "\\n";  // jetzt
      echo eb_totp_pruefen($s, eb_totp_code($s, $j - 1)),  "\\n";  // 30 s alt
      echo eb_totp_pruefen($s, eb_totp_code($s, $j - 3)),  "\\n";  // 90 s alt
      echo eb_totp_pruefen($s, '000000'),                  "\\n";`).split('\n');
    expect(Number(aus[0]), 'aktueller Code muss gelten').toBeGreaterThan(0);
    expect(Number(aus[1]), 'ein Schritt Drift muss toleriert werden').toBeGreaterThan(0);
    expect(Number(aus[2]), 'drei Schritte alt darf NICHT mehr gelten').toBe(0);
    expect(Number(aus[3]), 'Unsinn darf nie gelten').toBe(0);
  });
});

test.describe('Die drei üblichen Fehler sind ausgeschlossen', () => {
  test('ein Code lässt sich nur einmal einlösen', () => {
    // Ohne Verbrauchsmarke bleibt ein abgelesener Code bis zu 90 Sekunden
    // gültig und mehrfach einlösbar — der häufigste TOTP-Fehler überhaupt.
    expect(FUNCTIONS).toMatch(/function eb_totp_schritt_verbrauchen/);
    expect(FUNCTIONS, 'kein Schutz gegen Wiederverwendung')
      .toMatch(/if \(\s*\$schritt <= \$letzter\s*\)\s*return false/);
    // Und die Anmeldung muss ihn auch aufrufen, nicht nur prüfen.
    const anmelden = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_totp_anmelden'));
    expect(anmelden.slice(0, 1600)).toMatch(/!\s*eb_totp_schritt_verbrauchen\(/);
  });

  test('der Vergleich ist zeitkonstant', () => {
    // Ein zeichenweiser Vergleich verrät über die Laufzeit, wie viele Stellen
    // stimmten — damit wird aus einer Million Möglichkeiten eine Handvoll.
    const pruefen = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_totp_pruefen'),
      FUNCTIONS.indexOf('function eb_totp_schritt_verbrauchen'));
    expect(pruefen, 'Vergleich muss hash_equals nutzen').toMatch(/hash_equals\(/);
    expect(pruefen, 'kein ==-Vergleich auf dem Code').not.toMatch(/\$eingabe\s*===?\s*eb_totp_code/);
  });

  test('Durchprobieren ist begrenzt', () => {
    // Sechs Stellen sind eine Million Möglichkeiten. Ohne Bremse reichen die
    // Versuche eines Tages, um zu treffen.
    const anmelden = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_totp_anmelden'));
    expect(anmelden.slice(0, 900)).toMatch(/eventboerse_check_rate_limit\(\s*'totp_login'/);
    // Falsch und schon-benutzt müssen dieselbe Antwort geben.
    expect(anmelden.slice(0, 2200)).toMatch(/Code ungültig oder bereits verbraucht/);
  });
});

test.describe('Einrichtung und Zugang', () => {
  test('das Geheimnis wird erst nach Beweis scharf geschaltet', () => {
    // Sonst sperrt ein fehlgeschlagener Scan den Nutzer aus.
    const ein = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_totp_einrichten'),
      FUNCTIONS.indexOf('function eb_totp_bestaetigen'));
    expect(ein, 'Geheimnis darf noch nicht aktiv sein').toMatch(/eb_totp_secret_vorlaeufig/);
    expect(ein, 'Einrichtung darf nicht sofort aktivieren').not.toMatch(/'eb_totp_aktiv', '1'/);
    const best = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_totp_bestaetigen'));
    expect(best.slice(0, 1800), 'Aktivierung erst nach gültigem Code').toMatch(/'eb_totp_aktiv', '1'/);
  });

  test('das Geheimnis verlässt den Server nur bei der Einrichtung', () => {
    // Der Status darf es nie mitliefern — sonst genügt ein XSS im HQ.
    const status = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_totp_status'),
      FUNCTIONS.indexOf("add_action( 'rest_api_init', function () {\n    $angemeldet"));
    expect(status, 'Status gibt das Geheimnis preis').not.toMatch(/eb_totp_secret/);
  });

  test('160 Bit Geheimnis, wie RFC 4226 empfiehlt', () => {
    expect(FUNCTIONS).toMatch(/eb_totp_base32_encode\(\s*random_bytes\(\s*20\s*\)\s*\)/);
  });

  test('der Mitarbeiter braucht zwingend einen zweiten Faktor', () => {
    // Eine Fähigkeit ohne zweiten Faktor wäre ein Passwort-Zugang mit
    // Extraschritten — und genau davor sollte TOTP schützen.
    const tor = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_darf_sehen'),
      FUNCTIONS.indexOf('function eb_totp_einrichten'));
    expect(tor).toMatch(/if \( eb_totp_aktiv\( \$user_id \) \) return eb_hq_sitzung_offen\( \$user_id \);/);
    expect(tor, 'ohne TOTP darf nur der Admin durch').toMatch(/return \$admin;/);
  });
});

test.describe('Codeabfrage und Freischaltung', () => {
  test('Berechtigte bekommen eine Codeabfrage, Unberechtigte eine 404', () => {
    // Ohne diese Trennung wäre der zweite Faktor eine Sackgasse: wer
    // berechtigt ist, aber noch keinen Code vorgelegt hat, bekäme 404 und
    // hätte nirgends die Möglichkeit, sich auszuweisen.
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_serve_hq'),
      FUNCTIONS.indexOf("add_action( 'template_redirect'", FUNCTIONS.indexOf('function eb_serve_hq')));
    expect(fn, 'Codeabfrage-Zweig fehlt').toMatch(/eb_hq_grundrecht\(\)/);
    expect(fn, 'Codeabfrage wird nicht ausgeliefert').toMatch(/eb_hq_zweiter_faktor_ausliefern\(\)/);
    // Und der Zweig muss VOR der 404 stehen, sonst greift er nie.
    expect(fn.indexOf('eb_hq_zweiter_faktor_ausliefern'))
      .toBeLessThan(fn.indexOf('404.php'));
  });

  test('vor dem zweiten Faktor fließen keine Betriebsdaten', () => {
    // Die Codeabfrage ist eine eigene, kleine Seite — nicht das HQ mit
    // Overlay. Sonst lägen Katalog, Journal und Kennzahlen im Browser von
    // jemandem, der sich noch gar nicht ausgewiesen hat.
    const seite = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_zweiter_faktor_ausliefern'),
      FUNCTIONS.indexOf('function eb_hq_mitarbeiter'));
    for (const verraeter of ['eb-connectors.json', 'eb-arbeit.json', 'eb-models.json', 'hq.html']) {
      expect(seite, `Codeabfrage lädt ${verraeter}`).not.toContain(verraeter);
    }
    // Sie darf auch nicht indexiert werden.
    expect(seite).toMatch(/X-Robots-Tag.*noindex/);
  });

  test('das Geheimnis steht nur bei der Ersteinrichtung auf der Seite', () => {
    const seite = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_zweiter_faktor_ausliefern'),
      FUNCTIONS.indexOf('function eb_hq_mitarbeiter'));
    // Es wird per Route geholt, nicht ins HTML gerendert — sonst stünde es
    // auch im Verlauf und im Cache jedes Zwischenspeichers.
    expect(seite, 'Geheimnis darf nicht serverseitig ins HTML').not.toMatch(/eb_totp_secret/);
    expect(seite).toMatch(/totp\/einrichten/);
  });

  test('Zugang entziehen beendet die laufende Sitzung sofort', () => {
    // Ohne das bliebe der Zugang bis zu zwölf Stunden bestehen, obwohl er
    // entzogen wurde — genau dann, wenn Eile geboten ist.
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_mitarbeiter'));
    expect(fn.slice(0, 2000)).toMatch(/delete_transient\(\s*eb_hq_sitzung_key\(/);
  });

  test('nur Administratoren vergeben den Zugang', () => {
    const block = FUNCTIONS.slice(FUNCTIONS.indexOf("'/hq/mitarbeiter'"));
    expect(block.slice(0, 400)).toMatch(/'permission_callback'\s*=>\s*'eb_hq_proxy_darf'/);
  });
});
