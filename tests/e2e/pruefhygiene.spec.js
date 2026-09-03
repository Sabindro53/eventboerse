// Was die Prüfungen selbst einhalten müssen.
//
// Diese Suite prüft keinen Produktivcode. Sie bewacht zwei Muster, die in
// diesem Projekt nachweislich wiederkehren und beide dieselbe Wirkung haben:
// ein Test, der grün aussieht und nichts geprüft hat.
//
// 1. HTML-KOMMENTARE WEGSCHNEIDEN. CodeQL meldete `.replace(/<!--…-->/g, '')`
//    am 01.09.2026 in auslieferung.spec.js — und am 02.09. erneut in
//    app-store.spec.js, also in der Datei, die den ERSTEN Befund beheben
//    sollte. Eine Fundstelle zu beheben verhindert die nächste nicht, solange
//    jede Suite den Griff von Hand nachbaut.
//
// 2. test.skip. Ein übersprungener Test zählt in keiner Bilanz als Fehler.
//    Am 31.08.2026 standen drei davon in such-icons.spec.js, alle selbst
//    eingebaut, einer davon aus einem Grund, der längst behoben war.
//
// Beide Regeln gelten für die Prüfungen, nicht für die Prosa: geprüft wird
// nach Abzug der Kommentare. Diese Datei erklärt beide Muster im Klartext und
// dürfte sich sonst selbst melden — genau die Verwechslung, um die es geht.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const E2E = __dirname;

// Diese Datei ist von ihren eigenen zwei Regeln ausgenommen, und zwar nicht
// aus Bequemlichkeit: die Suchmuster `/\.replace\(\s*\/<!--/` und
// `/\btest\.skip\b/` sind Code, kein Kommentar — der Wächter fände sich sonst
// selbst und meldete bei jedem Lauf zwei Verstösse, die keine sind.
//
// Die Ausnahme gilt für GENAU diese eine Datei, nicht für ein Muster. Eine
// Ausnahmeliste, die wachsen kann, wäre der Anfang vom Ende der Regel.
const SELBST = 'pruefhygiene.spec.js';

/** Alle Prüfdateien, samt der gemeinsamen Griffe unter lib/. */
function pruefdateien() {
  const aus = [];
  for (const eintrag of fs.readdirSync(E2E, { withFileTypes: true })) {
    if (eintrag.isFile() && eintrag.name.endsWith('.js')) {
      aus.push(path.join(E2E, eintrag.name));
    }
    if (eintrag.isDirectory() && eintrag.name === 'lib') {
      for (const f of fs.readdirSync(path.join(E2E, 'lib'))) {
        if (f.endsWith('.js')) aus.push(path.join(E2E, 'lib', f));
      }
    }
  }
  return aus;
}

/**
 * Entfernt JS-Kommentare, damit die Prüfung Code trifft und nicht Prosa.
 *
 * Zeichenweise statt per Ersetzung: ein regulärer Ausdruck über
 * Kommentargrenzen ist genau der Griff, den diese Datei verbietet. Der Zustand
 * unterscheidet Zeichenkette, Zeilenkommentar, Blockkommentar und regulären
 * Ausdruck — ohne Letzteres würde `/<!--/` als Divisionszeichen gelesen.
 */
function ohneJsKommentare(quelle) {
  let aus = '';
  let i = 0;
  let zustand = 'code';
  let anfuehrung = '';
  while (i < quelle.length) {
    const z = quelle[i];
    const zz = quelle.slice(i, i + 2);
    if (zustand === 'code') {
      if (zz === '//') { zustand = 'zeile'; i += 2; continue; }
      if (zz === '/*') { zustand = 'block'; i += 2; continue; }
      if (z === '"' || z === "'" || z === '`') {
        zustand = 'text'; anfuehrung = z; aus += z; i++; continue;
      }
      aus += z; i++; continue;
    }
    if (zustand === 'zeile') {
      if (z === '\n') { zustand = 'code'; aus += z; }
      i++; continue;
    }
    if (zustand === 'block') {
      if (zz === '*/') { zustand = 'code'; i += 2; continue; }
      if (z === '\n') aus += z;            // Zeilennummern bleiben brauchbar
      i++; continue;
    }
    // Zeichenkette
    if (z === '\\') { aus += quelle.slice(i, i + 2); i += 2; continue; }
    if (z === anfuehrung) { zustand = 'code'; }
    aus += z; i++;
  }
  return aus;
}

test.describe('Die Prüfungen halten sich an die eigenen Regeln', () => {
  test('die Erhebung findet überhaupt Prüfdateien', () => {
    // Eine leere Liste verstösst gegen nichts. Ohne diese Zusicherung wäre ein
    // kaputter Verzeichnispfad ein bestandener Lauf.
    const dateien = pruefdateien();
    expect(dateien.length, 'keine Prüfdateien gefunden — dieser Test prüft nichts')
      .toBeGreaterThan(30);
    expect(dateien.some((d) => d.includes(path.join('lib', 'html-kommentare.js'))),
      'der gemeinsame Griff für HTML-Kommentare fehlt').toBe(true);
  });

  test('der Kommentar-Entferner trifft Code und nicht Prosa', () => {
    // Er ist selbst das Werkzeug dieser Suite. Ein Entferner, der zu viel oder
    // zu wenig wegnimmt, macht beide folgenden Prüfungen wertlos.
    const probe = [
      'const a = 1; // .replace(/<!--x-->/g, "")',
      '/* auch hier: test.skip */',
      'const s = "text mit // darin";',
      'const echt = quelle.replace(/<!--/g, "");',
    ].join('\n');
    const rein = ohneJsKommentare(probe);
    expect(rein, 'ein Zeilenkommentar überlebt').not.toMatch(/\/\/ \.replace/);
    expect(rein, 'ein Blockkommentar überlebt').not.toMatch(/auch hier/);
    expect(rein, 'eine Zeichenkette wurde zerstört').toContain('"text mit // darin"');
    expect(rein, 'echter Code wurde entfernt').toContain('quelle.replace(/<!--/g');
  });

  test('keine Prüfung schneidet HTML-Kommentare per replace heraus', () => {
    // Ein einmaliger Schnitt an einem mehrzeichigen Konstrukt lässt bei
    // Verschachtelung einen Rest stehen. Wer Bereiche nur MISST, hat das
    // Problem nicht — dafür gibt es lib/html-kommentare.js.
    const treffer = [];
    for (const datei of pruefdateien()) {
      if (path.basename(datei) === SELBST) continue;
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      if (/\.replace\(\s*\/<!--/.test(code)) treffer.push(path.basename(datei));
    }
    expect(treffer, `schneidet HTML-Kommentare selbst heraus statt `
      + `lib/html-kommentare.js zu benutzen: ${treffer.join(', ')}`).toHaveLength(0);
  });

  test('keine Prüfung fragt einen Host per Teilstring ab', () => {
    // CodeQL meldete am 02.09.2026 „Incomplete URL substring sanitization" an
    // `r.url().includes('js.stripe.com')`. Der Melder hat sachlich recht: die
    // Zeichenfolge kann überall in der Adresse stehen —
    // `https://boese.example/?ref=js.stripe.com` enthält sie, geht aber nicht
    // an Stripe, und `https://js.stripe.com.boese.example/` erst recht nicht.
    //
    // Dritter Befund derselben Sorte an eigenem Testcode: eine schnelle
    // Zeichenketten-Prüfung, wo eine strukturierte gehört. Dafür gibt es
    // lib/url-host.js.
    const treffer = [];
    for (const datei of pruefdateien()) {
      if (path.basename(datei) === SELBST) continue;
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      if (/\.url\(\)\s*\.includes\(/.test(code)) treffer.push(path.basename(datei));
    }
    expect(treffer, `fragt einen Host per Teilstring ab statt über `
      + `lib/url-host.js: ${treffer.join(', ')}`).toHaveLength(0);
  });

  test('der Host-Vergleich trifft genau den Host', () => {
    // Der Griff ist selbst das Werkzeug der Regel darüber. Zwei Fälle, die
    // ein Teilstring beide falsch beantwortet.
    const { istHost } = require('./lib/url-host');
    expect(istHost('https://js.stripe.com/v3/', 'js.stripe.com'),
      'die echte Adresse wird nicht erkannt').toBe(true);
    expect(istHost('https://boese.example/?ref=js.stripe.com', 'js.stripe.com'),
      'eine Adresse mit dem Host im Querystring gilt als Treffer').toBe(false);
    expect(istHost('https://js.stripe.com.boese.example/x', 'js.stripe.com'),
      'eine Subdomain-Attrappe gilt als Treffer').toBe(false);
    expect(istHost('data:text/plain,x', 'js.stripe.com'),
      'eine data-URL wirft statt false zu liefern').toBe(false);
  });

  test('keine Prüfung überspringt sich selbst', () => {
    // Ein übersprungener Test zählt in keiner Bilanz als Fehler. Findet ein
    // Test sein Subjekt nicht, gehört das eine harte Zusicherung — „nicht
    // nachgesehen" muss anders aussehen als „nichts gefunden".
    const treffer = [];
    for (const datei of pruefdateien()) {
      if (path.basename(datei) === SELBST) continue;
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      if (/\btest\.skip\b|\btest\.fixme\b/.test(code)) treffer.push(path.basename(datei));
    }
    expect(treffer, `überspringt Prüfungen: ${treffer.join(', ')}`).toHaveLength(0);
  });
});
