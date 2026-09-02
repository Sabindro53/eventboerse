// Apples Zuordnungsdatei — ohne sie gibt es in der App keine Passkeys.
//
// `/.well-known/apple-app-site-association` ist die Datei, mit der iOS lernt,
// dass diese App zu dieser Domain gehört. Fehlt sie, bietet das System in der
// App keinen gespeicherten Passkey der Domain an — und `webauthn.php` IST die
// Anmeldung. Das ist kein Komfortverlust, sondern eine App, in der man sich
// nicht anmelden kann.
//
// Apple ist in drei Punkten unnachgiebig: genau dieser Pfad ohne Endung,
// Content-Type application/json, keine Weiterleitung davor.
//
// Der heikelste Punkt ist ein anderer: Apple holt die Datei EINMAL beim
// Installieren ab und merkt sich das Ergebnis. Eine Datei mit Platzhalter
// fällt deshalb erst beim Nutzer auf, und dann ist sie schon
// zwischengespeichert. Ohne gültige Team-ID wird darum NICHTS ausgeliefert.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const FUNCTIONS = lies('functions.php');

let zwischenspeicher = null;
function pruefstand() {
  if (!zwischenspeicher) {
    zwischenspeicher = JSON.parse(execFileSync('php', [path.join(__dirname, 'aasa.php')],
      { cwd: ROOT, encoding: 'utf8' }));
  }
  return zwischenspeicher;
}

test.describe('Ohne Team-ID wird nichts ausgeliefert', () => {
  test('nicht eingerichtet sieht anders aus als eingerichtet', () => {
    // Der Kern der Entscheidung. Eine Datei mit Platzhalter wäre schlimmer
    // als keine: Apple speichert sie zwischen, und der Fehler zeigt sich
    // erst beim Nutzer.
    const r = pruefstand().ohneTeamId;
    expect(r.status, 'ohne Team-ID wird trotzdem etwas ausgeliefert').toBeNull();
    expect(r.rumpf, 'ohne Team-ID kommt ein Rumpf zurück').toBe('');
  });

  test('ein Platzhalter kommt nicht durch', () => {
    // „YOUR_TEAM" ist genau das, was jemand aus einer Anleitung kopiert und
    // zu ersetzen vergisst.
    expect(pruefstand().platzhalter.rumpf, 'ein Platzhalter erzeugt eine Datei')
      .toBe('');
  });

  test('eine zu kurze Team-ID kommt nicht durch', () => {
    // Apple vergibt zehn alphanumerische Zeichen. Ein Tippfehler soll nicht
    // in einer zwischengespeicherten Zuordnung enden.
    expect(pruefstand().zuKurz.rumpf, 'eine zu kurze Team-ID erzeugt eine Datei')
      .toBe('');
  });

  test('ein Bundle mit Pfadzeichen kommt nicht durch', () => {
    expect(pruefstand().boesesBundle.rumpf,
      'ein Bundle mit ../ erzeugt eine Datei').toBe('');
  });
});

test.describe('Mit Team-ID stimmt die Datei', () => {
  test('Statuscode und Inhaltstyp sind die von Apple verlangten', () => {
    const r = pruefstand().gueltig;
    expect(r.status).toBe(200);
    // GENAU application/json. Ein Zusatz wie „; charset=UTF-8" ist bei
    // anderen Dateien richtig und hier eine Quelle für Ärger — die Datei
    // trägt keine Endung, der Server rät also nichts dazu.
    expect(r.kopf, 'der Inhaltstyp fehlt oder trägt einen Zusatz')
      .toContain('Content-Type: application/json');
    expect(r.kopf.join(' '), 'nosniff fehlt').toMatch(/X-Content-Type-Options: nosniff/);
  });

  test('der Rumpf ist gültiges JSON', () => {
    // Apple parst die Datei; kaputtes JSON heisst „keine Zuordnung", ohne
    // dass irgendwo ein Fehler steht.
    expect(() => JSON.parse(pruefstand().gueltig.rumpf)).not.toThrow();
  });

  test('webcredentials trägt die App — sonst keine Passkeys', () => {
    const d = JSON.parse(pruefstand().gueltig.rumpf);
    expect(d.webcredentials, 'der webcredentials-Block fehlt').toBeTruthy();
    expect(d.webcredentials.apps, 'keine App unter webcredentials')
      .toContain('A1B2C3D4E5.de.eventboerse.app');
  });

  test('die App-Kennung ist Team-ID PUNKT Bundle-ID', () => {
    expect(pruefstand().gueltig.appId).toBe('A1B2C3D4E5.de.eventboerse.app');
  });

  test('das HQ ist ausgeschlossen, und zwar VOR dem Auffangmuster', () => {
    // Apple wertet die Komponenten von oben nach unten aus, und der erste
    // Treffer gewinnt. Ein Ausschluss NACH `/*` wäre wirkungslos — die
    // Reihenfolge ist hier die ganze Logik, nicht die Kosmetik.
    const d = JSON.parse(pruefstand().gueltig.rumpf);
    const teile = d.applinks.details[0].components;
    const hq = teile.findIndex((c) => c['/'] === '/hq/*' && c.exclude === true);
    const alle = teile.findIndex((c) => c['/'] === '/*');
    expect(hq, 'das HQ ist gar nicht ausgeschlossen').toBeGreaterThanOrEqual(0);
    expect(alle, 'es gibt kein Auffangmuster').toBeGreaterThanOrEqual(0);
    expect(hq, 'der HQ-Ausschluss steht NACH dem Auffangmuster und ist damit '
      + 'wirkungslos').toBeLessThan(alle);
  });

  test('die WordPress-Pfade sind ebenfalls ausgeschlossen', () => {
    const d = JSON.parse(pruefstand().gueltig.rumpf);
    const teile = d.applinks.details[0].components;
    const alle = teile.findIndex((c) => c['/'] === '/*');
    for (const p of ['/wp-admin/*', '/wp-json/*', '/wp-login.php']) {
      const i = teile.findIndex((c) => c['/'] === p && c.exclude === true);
      expect(i, `${p} ist nicht ausgeschlossen`).toBeGreaterThanOrEqual(0);
      expect(i, `${p} steht nach dem Auffangmuster`).toBeLessThan(alle);
    }
  });
});

test.describe('Die Route sitzt richtig', () => {
  test('genau der Pfad, den Apple verlangt — ohne Endung', () => {
    // `.json` anzuhängen ist der verbreitetste Fehler; Apple findet die
    // Datei dann nicht, und es gibt keine Fehlermeldung.
    expect(FUNCTIONS, 'die Route fehlt')
      .toMatch(/'\/\.well-known\/apple-app-site-association'\s*===\s*\$path/);
    expect(FUNCTIONS, 'die Route trägt eine .json-Endung')
      .not.toMatch(/apple-app-site-association\.json/);
  });

  test('sie wird vor dem HQ und den Datendateien abgefragt', () => {
    // Reihenfolge im Dispatcher: der Pfad beginnt nicht mit /hq und nicht
    // mit /assets, aber ein spaeter eingefuegter Auffangzweig koennte ihn
    // schlucken. Der Test haelt die Position fest.
    const aasa = FUNCTIONS.indexOf("'/.well-known/apple-app-site-association' === $path");
    const hq = FUNCTIONS.indexOf("preg_match( '#^/hq(/.*)?$#', $path )");
    expect(aasa, 'die Route fehlt').toBeGreaterThan(-1);
    expect(hq, 'der HQ-Zweig fehlt').toBeGreaterThan(-1);
    expect(aasa, 'die Apple-Route steht nach dem HQ-Zweig').toBeLessThan(hq);
  });

  test('die Bundle-ID stimmt mit der Capacitor-Konfiguration überein', () => {
    // Zwei Orte, dieselbe Kennung. Driften sie, meldet Apple die Zuordnung
    // als ungültig — und die App lässt sich nicht mehr anmelden, während
    // beide Dateien für sich richtig aussehen.
    const cap = JSON.parse(lies('native', 'capacitor.config.json'));
    const ausPhp = FUNCTIONS.match(
      /EB_APPLE_BUNDLE_ID[\s\S]{0,120}?:\s*'([a-z0-9.\-]+)'/i);
    expect(ausPhp, 'der Standardwert der Bundle-ID ist nicht auffindbar').toBeTruthy();
    expect(ausPhp[1], `functions.php sagt ${ausPhp && ausPhp[1]}, `
      + `capacitor.config.json sagt ${cap.appId}`).toBe(cap.appId);
  });

  test('die Team-ID steht nicht im Repo', () => {
    // Sie ist kein Geheimnis, aber sie gehört zur Bereitstellung, nicht in
    // die Quelle — wie EB_OPENAI_API_KEY. Ein fest eingetragener Wert wäre
    // beim nächsten Entwicklerkonto falsch und fiele niemandem auf.
    expect(FUNCTIONS, 'die Team-ID ist fest eingetragen')
      .toMatch(/defined\(\s*'EB_APPLE_TEAM_ID'\s*\)/);
    expect(FUNCTIONS, 'es steht ein fester zehnstelliger Wert im Code')
      .not.toMatch(/EB_APPLE_TEAM_ID['"\s]*[,=]\s*['"][A-Z0-9]{10}['"]/);
  });
});
