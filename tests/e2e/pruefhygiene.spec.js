// Was die Prüfungen selbst einhalten müssen.
//
// Diese Suite prüft keinen Produktivcode. Sie bewacht Muster, die in diesem
// Projekt nachweislich wiederkehren und alle dieselbe Wirkung haben: ein Test,
// der grün aussieht und nichts geprüft hat.
//
// (Hier stand „zwei Muster", während darunter schon fünf aufgezählt waren —
// eine Zahl, die ihre eigene Liste nicht mehr trifft, ist der Anfang genau der
// Drift, die diese Datei bekämpft. Deshalb zählt der Kopf nicht mehr mit.)
//
// 1. HTML-KOMMENTARE WEGSCHNEIDEN. CodeQL meldete `.replace(/<!--…-->/g, '')`
//    am 01.09.2026 in auslieferung.spec.js — und am 02.09. erneut in
//    app-store.spec.js, also in der Datei, die den ERSTEN Befund beheben
//    sollte. Eine Fundstelle zu beheben verhindert die nächste nicht, solange
//    jede Suite den Griff von Hand nachbaut.
//
// 1a. HTML-TAGS WEGSCHNEIDEN. Dieselbe Klasse, dasselbe Werkzeug, vierzehn
//    Tage später: CodeQL meldete am 15.09.2026 `.replace(/<[^>]*>/g, '')` in
//    barrierefreiheit.spec.js — in einer Prüfung, die ich selbst zur Behebung
//    eines anderen Befunds geschrieben hatte. Ein Tag ist ein mehrzeichiges
//    Konstrukt; ein einmaliger Schnitt daran lässt bei Verschachtelung einen
//    Rest stehen. Der Griff heisst textAusHtml() und SAMMELT, statt zu
//    schneiden.
//
// 2. test.skip. Ein übersprungener Test zählt in keiner Bilanz als Fehler.
//    Am 31.08.2026 standen drei davon in such-icons.spec.js, alle selbst
//    eingebaut, einer davon aus einem Grund, der längst behoben war.
//
// Alle Regeln gelten für die Prüfungen, nicht für die Prosa: geprüft wird
// nach Abzug der Kommentare. Diese Datei erklärt jedes Muster im Klartext und
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

// Der Entferner lag bis zum 13.09.2026 HIER, als lokale Kopie — also genau
// als der Griff, den diese Datei verbietet, nur eine Ebene höher. Aufgefallen
// ist es, als eine Prüfung im Storno-PR den Funktionsnamen im erklärenden
// Kommentar mitzählte und die Mutation „Knopf entfernt" überlebte. Er liegt
// jetzt neben den anderen beiden gemeinsamen Griffen.
const { ohneJsKommentare } = require('./lib/js-code');

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

  test('keine Prüfung schneidet HTML-Tags per replace heraus', () => {
    // Dieselbe Klasse wie eine Regel weiter oben, an einem anderen
    // mehrzeichigen Konstrukt: `<<b>script>x` behält nach einem Durchlauf
    // sein `<script>`, und `<img alt="a > b">` wird am falschen `>`
    // zerschnitten. lib/html-text.js sammelt den Text, statt zu schneiden.
    //
    // Das `lib/`-Verzeichnis ist ausgenommen: dort steht der Griff selbst.
    const treffer = [];
    for (const datei of pruefdateien()) {
      if (path.basename(datei) === SELBST) continue;
      if (path.basename(path.dirname(datei)) === 'lib') continue;
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      if (/\.replace\(\s*\/<\[\^>\]\*>/.test(code)) treffer.push(path.basename(datei));
    }
    expect(treffer, `schneidet HTML-Tags selbst heraus statt `
      + `lib/html-text.js zu benutzen: ${treffer.join(', ')}`).toHaveLength(0);
  });

  test('der Text-Griff sammelt, statt zu schneiden', () => {
    // Die Gegenprobe zur Regel darüber. Ohne sie wäre „benutze den Griff"
    // erfüllbar, indem der Griff dasselbe falsch tut wie die Kopien.
    const { textAusHtml } = require('./lib/html-text');
    expect(textAusHtml('<b>Hallo</b> Welt')).toBe('Hallo Welt');
    // Verschachtelt: ein einmaliger Schnitt liesse hier `<script>x` stehen.
    expect(textAusHtml('<<b>script>x')).toBe('script>x');
    // Ein `>` im Attributwert beendet das Tag nicht.
    expect(textAusHtml('<img alt="a > b">Text')).toBe('Text');
    // Ein Tag trennt Wörter, sonst würde daraus „ab".
    expect(textAusHtml('<p>a</p><p>b</p>')).toBe('a b');
    // Ein unfertiges Tag am Ende verschluckt den Rest, statt ihn auszugeben.
    expect(textAusHtml('<div')).toBe('');
  });

  test('keine Prüfung baut den JS-Kommentar-Entferner selbst nach', () => {
    // Dieselbe Regel wie eine Zeile darüber, nur für JavaScript — und sie
    // fehlte, weil der Entferner bis zum 13.09.2026 als lokale Kopie in
    // GENAU DIESER DATEI stand. Die Regel gegen Kopien hatte eine Kopie.
    //
    // Der Schaden ist nicht theoretisch: eine Suite ohne den Entferner
    // misst Prosa statt Code, und in diesem Projekt sind daran schon der
    // `require_once`-Pfad des Kontaktschutzes, `$owner_match` in der
    // Erstattungsprüfung, das Wort „npx" neben dem Aufruf und die Frage
    // nach dem Storno-Knopf gescheitert.
    // ── DIE GRENZE IST `lib/`, KEINE AUSNAHMELISTE (15.09.2026) ────────
    //
    // Hier stand `lib/js-code.js` als einzelner Pfad. Als am 15.09.2026
    // `lib/css-code.js` dazukam — der gemeinsame Griff für CSS-Kommentare,
    // gebraucht, weil ein Token-Wächter seinen eigenen Erklärkommentar als
    // Fund meldete — schlug diese Regel an: sie hielt den neuen GRIFF für
    // eine KOPIE.
    //
    // Die Regel meint „keine Prüfung baut ihn selbst nach". `lib/` ist
    // nicht Prüfung, sondern der Ort, an dem die Griffe wohnen. Die Grenze
    // ist deshalb dieses Verzeichnis und nicht eine Liste, die mit jedem
    // neuen Griff wächst — genau davor warnt CLAUDE.md.
    const IN_LIB = path.sep + 'lib' + path.sep;
    const treffer = [];
    for (const datei of pruefdateien()) {
      if (datei.includes(IN_LIB)) continue;           // dort gehören sie hin
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      if (/function\s+ohne\w*Kommentare\s*\(/.test(code)) treffer.push(path.basename(datei));
    }
    expect(treffer, `baut einen Kommentar-Entferner selbst nach statt den Griff `
      + `aus tests/e2e/lib/ zu benutzen: ${treffer.join(', ')}`).toHaveLength(0);

    // Gegenprobe 1: der gemeinsame Griff für JS ist wirklich da. Ohne sie
    // wäre die Regel dadurch erfüllt, dass niemand mehr Kommentare abzieht.
    expect(pruefdateien().some((d) => d.includes(path.join('lib', 'js-code.js'))),
      'der gemeinsame Griff für JS-Kommentare fehlt').toBe(true);

    // Gegenprobe 2: `lib/` darf kein Versteck werden. JEDER dort exportierte
    // Griff muss von mindestens einer Datei ausserhalb benutzt werden — sonst
    // wäre die aufgeweichte Grenze der bequeme Weg, eine ungenutzte Kopie
    // abzulegen. Dieselbe Klasse wie ein Prüfer ohne Subjekt.
    //
    // Gemessen wird der EXPORT, nicht `function ohne…Kommentare`. Die alte
    // Fassung kannte nur die Entferner und liess jeden anderen Griff
    // ungeprüft — ein Wächter, dessen Subjekt nur ein Ausschnitt ist, gibt
    // eine Entwarnung, die er nicht decken kann. Beim Verallgemeinern fiel
    // sofort einer auf: js-code.js exportierte `istRegexAnfang`, das
    // ausserhalb von lib/ niemand benutzt.
    // Gemessen wird der Nutzerkreis NACH ABZUG DER KOMMENTARE. Der erste
    // Anlauf las den Rohtext — und die Mutation „ungenutzter Export kehrt
    // zurück" überlebte prompt, weil der erklärende Kommentar sechs Zeilen
    // weiter oben `istRegexAnfang` beim Namen nennt. Ein Prüfer, der die
    // Prosa über seinen Gegenstand für dessen Benutzung hält, winkt genau
    // den Fall durch, den er finden soll. Neunte Fundstelle dieser Klasse
    // in diesem Projekt, und die erste in der Datei, die sie bewacht.
    const nutzer = pruefdateien().filter((d) => !d.includes(IN_LIB))
      .map((d) => ohneJsKommentare(fs.readFileSync(d, 'utf8'))).join('\n');
    let exporte = 0;
    for (const datei of pruefdateien().filter((d) => d.includes(IN_LIB))) {
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      const block = code.match(/module\.exports\s*=\s*\{([^}]*)\}/);
      expect(block, `${path.basename(datei)} exportiert nichts`).toBeTruthy();
      for (const roh of block[1].split(',')) {
        const name = roh.split(':')[0].trim();
        if (!name) continue;
        exporte += 1;
        expect(nutzer.includes(name),
          `${path.basename(datei)} exportiert ${name}(), aber keine Prüfung benutzt es`).toBe(true);
      }
    }
    // Gegenprobe zur Gegenprobe: ohne sie wäre die Regel dadurch erfüllt,
    // dass der Ausdruck nichts mehr findet.
    expect(exporte, 'es wurde kein einziger Griff geprüft').toBeGreaterThan(4);
  });

  test('der Entferner überlebt reguläre Ausdrücke und Adressen', () => {
    // Die zwei Fälle, an denen ein naiver Entferner scheitert — und beide
    // kommen in diesem Projekt wirklich vor: `/<!--…-->/` in
    // auslieferung.spec.js und `'https://api.stripe.com/…'` in
    // functions.php-Prüfungen. Wer `//` stumpf bis zum Zeilenende
    // wegschneidet, frisst die halbe Adresse.
    const probe = [
      'const re = /<!--[\\s\\S]*?-->/g;',
      "const u = 'https://api.stripe.com/v1/refunds';",
      'const d = summe / anzahl / 2;',
      '// echter Kommentar',
    ].join('\n');
    const rein = ohneJsKommentare(probe);
    expect(rein, 'der reguläre Ausdruck wurde angeschnitten').toContain('/<!--[\\s\\S]*?-->/g');
    expect(rein, 'die Adresse wurde ab `//` verschluckt').toContain('api.stripe.com/v1/refunds');
    expect(rein, 'eine Division wurde als Ausdruck gelesen').toContain('summe / anzahl / 2');
    expect(rein, 'der echte Kommentar überlebt').not.toContain('echter Kommentar');
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

  test('keine Prüfung verlässt sich auf Playwrights reducedMotion-Option', () => {
    // AM 10.09.2026 NACHGEMESSEN: die Option erreicht die Seite in diesem
    // Aufbau nicht. In einem Test ohne jedes `test.use` meldete
    // `matchMedia('(prefers-reduced-motion: reduce)').matches` **false** —
    // unmittelbar danach, im selben Browser auf derselben Seite, ergab
    // `page.emulateMedia({ reducedMotion: 'reduce' })` **true**.
    //
    // `playwright.config.js` trug sie seit jeher mit der Begründung
    // „Animationen beruhigen → stabile Tests", und `leerlauf.spec.js`
    // überschrieb sie. Beides war wirkungslos, und beides las sich, als täte
    // es etwas. Dieselbe Klasse wie der tote Gitleaks-Scan.
    //
    // Wer Bewegungsreduktion braucht, ruft `page.emulateMedia(...)` VOR dem
    // `goto` — `stimme.spec.js` macht es so, und es ist gemessen.
    //
    // Gesucht wird die DEKLARATION, nicht das Wort: die Kommentare in
    // `playwright.config.js` und `leerlauf.spec.js` nennen `reducedMotion:`
    // mehrfach, und ein Muster, das den erklärenden Text trifft statt der
    // Zeile, ist in diesem Projekt schon mehrfach teuer gewesen.
    const muster = /(?:test\.use\s*\(\s*\{[^}]*|use\s*:\s*\{[^}]*)\breducedMotion\s*:/;
    const treffer = [];
    for (const datei of pruefdateien().concat([path.join(E2E, '..', '..', 'playwright.config.js')])) {
      if (path.basename(datei) === SELBST) continue;
      if (!fs.existsSync(datei)) continue;
      const code = ohneJsKommentare(fs.readFileSync(datei, 'utf8'));
      if (muster.test(code)) treffer.push(path.basename(datei));
    }
    expect(treffer, `deklariert Playwrights wirkungslose reducedMotion-Option: `
      + `${treffer.join(', ')}. Sie erreicht die Seite nicht — gemessen, nicht `
      + `vermutet. Der Weg, der trägt, ist page.emulateMedia() vor dem goto`)
      .toHaveLength(0);
  });

  test('und der Weg, der trägt, wird auch benutzt', async ({ page }) => {
    // DIE GEGENPROBE ZUR REGEL DARÜBER. Ohne sie wäre „gar keine
    // Bewegungsreduktion mehr prüfen" der bequemste Weg zu einem grünen
    // Lauf — und die Zusicherung, dass ein Besucher mit dieser Einstellung
    // keine Dauerschleife bekommt, hätte kein Subjekt mehr.
    await page.goto('/index.html');
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      'ohne Zutun meldet die Seite bereits Bewegungsreduktion — dann ist der '
      + 'Befund von oben überholt, und die Regel darüber gehört neu bewertet')
      .toBe(false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      'page.emulateMedia() wirkt nicht mehr — dann gibt es keinen Weg mehr, '
      + 'Bewegungsreduktion zu prüfen, und leerlauf.spec.js misst still den '
      + 'Normalfall').toBe(true);
  });
});
