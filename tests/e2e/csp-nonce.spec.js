// Der Weg weg von `script-src 'unsafe-inline'`.
//
// Solange die CSP ein 'unsafe-inline' für Skripte trägt, ist sie als
// XSS-Schutz praktisch abgeschaltet: gelingt irgendwo eine HTML-Injektion,
// darf das eingeschleuste <script> laufen. Der enge Host-Katalog schützt dann
// nur noch gegen den Angreifer von aussen, nicht gegen den, der schon Text in
// die Seite bekommen hat.
//
// Umgestellt wird in ZWEI Schritten, und dieser Test bewacht beide: erst
// tragen alle Inline-Skripte ein Nonce und eine BEOBACHTENDE CSP meldet, wer
// keins hat; erst wenn über echten Verkehr nichts mehr gemeldet wird, wandert
// das Nonce in die durchgesetzte Fassung. Ein übersehenes Inline-Skript fällt
// in einer durchgesetzten CSP nicht auf, es fällt AUS — die Seite lädt, sieht
// heil aus, und ein Stück Verhalten fehlt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');

/** Fährt den PHP-Prüfstand gegen den echten Code in functions.php. */
function pruefstand() {
  const aus = execFileSync('php', [path.join(__dirname, 'csp-nonce.php')],
    { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(aus);
}

/** Inline-Skripte (ohne src) ohne Nonce — genau die würden ausfallen. */
function ohneNonce(html) {
  const treffer = html.match(/<script(?![^>]*\ssrc\s*=)([^>]*)>/gi) || [];
  return treffer.filter((t) => !/\snonce\s*=/i.test(t));
}

test.describe('CSP-Nonce: der Ausstieg aus unsafe-inline', () => {
  test('das Nonce ist zufällig, 16 Byte, und je Antwort eines', () => {
    const r = pruefstand();
    expect(r.nonceLaenge, 'zu kurzes Nonce').toBe(16);
    expect(r.nonceStabil, 'zwei Aufrufe derselben Antwort geben verschiedene Nonces')
      .toBe(true);

    // Über Antworten hinweg muss es sich ändern. Ein wiederkehrendes Nonce
    // ist keins: wer es einmal liest, schreibt es in seine Injektion.
    const zweiter = pruefstand();
    expect(zweiter.nonce, 'dasselbe Nonce in zwei Antworten')
      .not.toBe(r.nonce);
  });

  test('die echte app-shell.html hat danach kein nonce-loses Inline-Skript', () => {
    const r = pruefstand();
    expect(r.shellOhneNonceVor, 'die Shell hat gar keine Inline-Skripte — Test prüft nichts')
      .toBeGreaterThan(0);
    expect(r.shellOhneNonceNach, 'ein Inline-Skript der Shell bekäme kein Nonce')
      .toBe(0);
  });

  test('<script src=…> bleibt unangetastet, ein vorhandenes Nonce auch', () => {
    // Bei externen Skripten greift der Host-Katalog; ein Nonce dort wäre
    // wirkungslose Kosmetik. Und ein bereits gesetztes zu überschreiben
    // hiesse, fremde Absicht zu überstimmen.
    const r = pruefstand();
    expect(r.probeSrcUnberuehrt).toBe(true);
    expect(r.probeOhneNonce).toBe(0);
    // Genau EIN nonce= im Tag, das schon eines hatte. Bei zweien hat der
    // Setzer davorgeschrieben statt stehenzulassen — der Browser nimmt dann
    // das erste, und das fremde Skript liefe mit unserem Nonce.
    expect(r.probeAltAnzahl, 'ein vorhandenes Nonce wurde überschrieben').toBe(1);
    expect(r.probeAltTraegtNeu, 'das fremde Skript trägt jetzt unser Nonce').toBe(false);
  });

  test('index.php setzt an jedem eigenen Inline-Skript ein Nonce', () => {
    // Die Shell wird beim Ausliefern behandelt; index.php muss es selbst
    // tun, weil dort PHP läuft. Beide Wege müssen zu.
    const php = fs.readFileSync(path.join(ROOT, 'index.php'), 'utf8');
    const offen = ohneNonce(php);
    expect(offen, `Inline-Skript ohne Nonce in index.php:\n${offen.join('\n')}`)
      .toHaveLength(0);
    // Und die Shell darf nicht mehr roh durchgereicht werden.
    expect(php, 'die Shell geht per readfile raus — ohne Nonce')
      .not.toMatch(/readfile\(\s*__DIR__\s*\.\s*"\/app-shell\.html"/);
    expect(php).toMatch(/eb_shell_ausgeben\(\)/);
  });

  test('WordPress-eigene Inline-Skripte bekommen das Nonce ebenfalls', () => {
    // wp_localize_script schreibt das eventboerseApi-Objekt als
    // <script id="…-js-extra">. Ohne diese Filter fiele genau das aus, was
    // die App zum Start braucht — und erst auf dem Live-Server, weil die
    // Dev-Shell kein WordPress hat.
    const fn = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    for (const filter of ['wp_inline_script_attributes', 'wp_script_attributes']) {
      expect(fn, `Filter ${filter} fehlt`).toMatch(
        new RegExp(`add_filter\\(\\s*'${filter}'`));
    }
  });

  test('die beobachtende CSP ist abgeleitet, nicht abgeschrieben', () => {
    const r = pruefstand();
    // Nur die Skript-Direktiven unterscheiden sich, plus die zwei
    // Meldewege. Zwei gepflegte Fassungen einer Sicherheitsregel driften
    // immer — und die beobachtende driftet unbemerkt, weil sie nichts
    // blockiert, was auffallen könnte.
    expect(r.gleicheAnzahl, 'die strenge Fassung hat andere Direktiven verloren oder gewonnen')
      .toBe(true);
    for (const d of r.nurSkriptGeaendert) {
      expect(d, `Direktive ausserhalb von script-src geändert: ${d}`)
        .toMatch(/^(script-src(-elem)? |report-uri |report-to )/);
    }
  });

  test('in der strengen Fassung ist unsafe-inline für Skripte weg', () => {
    const r = pruefstand();
    expect(r.cspDurchgesetzt, 'die durchgesetzte Fassung hat kein unsafe-inline mehr — dann ist dieser Test blind')
      .toContain("'unsafe-inline'");
    for (const d of [r.cspStreng, r.cspStrengElem]) {
      expect(d, 'unsafe-inline in der strengen Fassung').not.toContain("'unsafe-inline'");
      expect(d, 'kein Nonce in der strengen Fassung').toMatch(/'nonce-[^']+'/);
      // Der Host-Katalog darf dabei nicht verlorengehen.
      expect(d).toContain('https://js.stripe.com');
      expect(d).toContain("'self'");
    }
    expect(r.strengHatBericht, 'eine Meldung, die nirgends ankommt, ist keine')
      .toBe(true);
  });

  test('die durchgesetzte CSP bleibt vorerst unverändert', () => {
    // Das ist der Sinn des ersten Schritts: es kann nichts brechen. Fällt
    // dieser Test, hat jemand den zweiten Schritt gemacht — dann muss er
    // belegt sein, nicht nebenbei passiert.
    const r = pruefstand();
    expect(r.cspDurchgesetzt).toContain("'unsafe-inline'");
  });
});

test.describe('CSP-Meldungen: der einzige offene Schreibpunkt', () => {
  test('gleiche Verstöße werden gezählt, nicht gesammelt', () => {
    const r = pruefstand();
    const inline = r.nachDrei.verstoesse.find((v) => v.quelle === 'inline');
    expect(inline, 'der Inline-Verstoß fehlt').toBeTruthy();
    expect(inline.anzahl, 'zwei gleiche Meldungen legten zwei Einträge an').toBe(2);
  });

  test('die blockierte Adresse wird nie vollständig gespeichert', () => {
    // Eine blockierte URL kann einen Token im Querystring tragen. Wer sie
    // vollständig ablegt, baut ein Leck in die eigene Diagnose — dieselbe
    // Regel wie beim Geheimnis-Scanner, der nie den Fund zitiert.
    const r = pruefstand();
    const roh = JSON.stringify(r.nachDrei);
    expect(roh, 'ein Token aus der Meldung landete in der Ablage')
      .not.toContain('GEHEIM123');
    const fremd = r.nachDrei.verstoesse.find((v) => v.direktive === 'img-src');
    expect(fremd.quelle, 'die Adresse wurde nicht auf Schema und Host gekürzt')
      .toBe('https://fremd.example');
  });

  test('eine Flut füllt keinen Speicher, sie erhöht einen Zähler', () => {
    // Die Route ist offen — sie muss es sein, der Browser meldet ohne
    // Anmeldung. Also darf 200-mal Unsinn nicht 200 Einträge anlegen.
    const r = pruefstand();
    expect(r.nachFlutAnzahl).toBe(r.maxMeldungen);
    expect(r.nachFlutVoll).toBe(true);
  });

  test('zu große, kaputte und direktivenlose Berichte werden verworfen', () => {
    const r = pruefstand();
    expect(r.nachMuellAnzahl, 'Müll landete in der Ablage').toBe(0);
  });

  test('die Direktivenprüfung ist ein Filter, keine Whitelist', () => {
    // Der Code-Prüfer las den alten Ausdruck `^[a-z-]+(-src)?[a-z-]*` als
    // Forderung nach einem `-src`-Suffix und meldete, `frame-src` werde
    // fälschlich akzeptiert. Es gibt gar keine erwartete Liste: jede echte
    // CSP-Direktive gehört aufgezeichnet, auch die ohne `-src`.
    const r = pruefstand();
    expect(r.echteDirektiven,
      'echte Direktiven ohne -src-Endung werden verworfen').toBe(3);
  });

  test('beide Meldeformate kommen an — Firefox und Chrome sind sich uneinig', () => {
    const r = pruefstand();
    expect(r.nachReportTo, 'das report-to-Format von Chrome kommt nicht an')
      .toHaveLength(1);
    expect(r.nachReportTo[0].direktive).toBe('script-src');
    expect(r.nachReportTo[0].quelle).toBe('eval');
  });

  test('die Route ist offen zum Schreiben und admin-only zum Lesen', () => {
    const fn = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    const block = fn.slice(fn.indexOf("'/csp-report'"), fn.indexOf("'/csp-report'") + 700);
    expect(block, 'POST ist nicht offen — dann käme nie eine Meldung an')
      .toMatch(/'methods'\s*=>\s*'POST',\s*'callback'\s*=>\s*'eb_csp_report_empfangen',\s*'permission_callback'\s*=>\s*'__return_true'/s);
    expect(block, 'GET ist nicht admin-only')
      .toMatch(/'methods'\s*=>\s*'GET'[\s\S]*?eb_is_admin_user/);
  });
});

// ── Schritt 2 ist NICHT eine Zeile ───────────────────────────────────────
//
// In CLAUDE.md stand bis zum 02.09.2026, das Nonce in die durchgesetzte
// Fassung zu tragen sei „eine Zeile". Das ist eine Falle.
//
// Sobald `script-src` ein Nonce trägt, IGNORIEREN Browser `'unsafe-inline'` —
// so ist CSP Level 2 definiert. Ein Inline-Event-Handler (`onclick=`) kann
// aber kein Nonce tragen: Nonces gelten für <script>-ELEMENTE, nicht für
// Attribute. Ohne ein ausdrückliches `script-src-attr` fällt die Prüfung der
// Handler auf `script-src` zurück — und dort steht dann das Nonce.
//
// app-shell.html trägt 459 solcher Handler (390 davon `onclick`). Die eine
// Zeile legte also mit einem Schlag jeden Knopf der Anwendung still, und
// zwar OHNE Fehlermeldung im Betrieb: die Seite lädt, sieht heil aus, und
// nichts reagiert. Genau die Schadensart, die CLAUDE.md beim Nonce-Umstieg
// selbst als teuerste benennt.
//
// Diese Suite macht den Griff unmöglich, statt vor ihm zu warnen.
test.describe('Der Nonce-Umstieg legt nicht die ganze Oberfläche still', () => {
  const FUNKTIONEN = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
  const SHELL = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');

  /** Die DURCHGESETZTE Fassung — das Array, aus dem der Header entsteht. */
  function durchgesetzt() {
    const m = FUNKTIONEN.match(/\$csp_directives\s*=\s*array\(([\s\S]*?)\n\s*\);/);
    expect(m, '$csp_directives ist nicht auffindbar — der Test prüft nichts')
      .toBeTruthy();
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  }

  /** Inline-Event-Handler in der Shell (onclick=, onchange=, …). */
  function inlineHandler() {
    return (SHELL.match(/ on[a-z]+=/g) || []).length;
  }

  test('die Erhebung findet beide Subjekte', () => {
    expect(durchgesetzt().length, 'keine Direktiven gefunden')
      .toBeGreaterThan(5);
    expect(inlineHandler(), 'keine Inline-Handler gefunden — dann prüft der '
      + 'Test darunter nichts').toBeGreaterThan(50);
  });

  test('solange Inline-Handler existieren, trägt die durchgesetzte CSP kein Nonce', () => {
    // Das ist die Sperre. Wer das Nonce einträgt, ohne die Handler zu
    // entfernen ODER `script-src-attr 'unsafe-inline'` ausdrücklich zu
    // setzen, bricht hier ab — nicht erst im Betrieb bei jedem Besucher.
    const skriptRegeln = durchgesetzt().filter((d) => /^script-src(-elem)?\s/.test(d));
    expect(skriptRegeln.length, 'es gibt keine script-src-Regel').toBeGreaterThan(0);

    const mitNonce = skriptRegeln.some((d) => d.includes('nonce-'));
    if (!mitNonce) return;   // Schritt 2 ist noch nicht gemacht — in Ordnung.

    // Schritt 2 IST gemacht. Dann muss einer der beiden Wege gegangen sein.
    const handlerFrei = inlineHandler() === 0;
    const attrErlaubt = durchgesetzt().some(
      (d) => /^script-src-attr\s/.test(d) && d.includes("'unsafe-inline'"));
    expect(handlerFrei || attrErlaubt,
      `die durchgesetzte CSP trägt ein Nonce, aber app-shell.html hat noch `
      + `${inlineHandler()} Inline-Handler und es gibt kein `
      + `script-src-attr 'unsafe-inline'. In diesem Zustand reagiert kein `
      + `einziger Knopf mehr, ohne dass irgendwo ein Fehler steht.`).toBe(true);
  });

  test('die beobachtende Fassung meldet genau diesen Zustand — sie ist die Probe', () => {
    // Sie ersetzt 'unsafe-inline' durch das Nonce. Fällt das weg, meldet sie
    // den Ernstfall nicht mehr und blockiert dabei weiterhin nichts — ein
    // Melder, der still zusieht, ist von einem kaputten nicht zu unterscheiden.
    const ableitung = FUNKTIONEN.match(/\$streng = array\(\);[\s\S]*?\$streng\[\] = 'report-to csp';/);
    expect(ableitung, 'die Ableitung der beobachtenden Fassung ist verschwunden')
      .toBeTruthy();
    expect(ableitung[0], 'die beobachtende Fassung ersetzt unsafe-inline nicht '
      + 'mehr durch das Nonce — dann meldet sie den Ernstfall nicht mehr')
      .toMatch(/'unsafe-inline'[\s\S]{0,120}nonce-/);
  });
});

// ── Der Melder hatte sein Subjekt verloren ───────────────────────────────
//
// `bereit` in eb_csp_report_lesen() ist die Freigabe für Schritt 2: es wird
// true, sobald über echten Verkehr KEIN Verstoß mehr gemeldet wird. Bis zum
// 07.09.2026 konnte es das nicht werden — und zwar strukturell, nicht
// vorübergehend.
//
// Die beobachtende Fassung ersetzt 'unsafe-inline' durch das Nonce, auch in
// `script-src`. Inline-Handler fallen mangels `script-src-attr` genau dorthin
// zurück. Also verstieß jeder der 459 Handler bei jedem Seitenaufruf gegen
// die beobachtende Fassung — gegen einen Zustand, den wir BEWUSST behalten.
//
// Das ist dieselbe Mechanik wie beim toten Gitleaks-Scan, nur andersherum:
// dort meldete ein Prüfer nie etwas und sah aus wie Schutz; hier meldet er
// dauerhaft etwas und sieht aus wie ein offener Posten. Beides führt dazu,
// dass niemand mehr hinsieht — und die eine Meldung, auf die es ankommt
// (`script-src-elem|inline`: ein Inline-<script> OHNE Nonce), geht darin unter.
//
// Behoben mit einer Direktive, die an der Durchsetzung nichts ändert.
test.describe('script-src-attr: die Durchsetzung bleibt, der Melder wird brauchbar', () => {
  const SEITE = `<!doctype html><html><body>
    <button id="k" onclick="window.__gedrueckt = true">x</button>
    <script nonce="ABC">window.__mitNonce = true;<\/script>
    <script>window.__ohneNonce = true;<\/script>
  </body></html>`;

  /** Fährt eine echte CSP gegen echtes Chromium. Prosa beweist hier nichts. */
  async function messen(page, csp) {
    await page.route('https://csp-probe.invalid/**', (route) => route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/html', 'content-security-policy': csp },
      body: SEITE,
    }));
    await page.goto('https://csp-probe.invalid/x');
    await page.click('#k');
    return page.evaluate(() => ({
      handler: !!window.__gedrueckt,
      mitNonce: !!window.__mitNonce,
      ohneNonce: !!window.__ohneNonce,
    }));
  }

  test('ein Nonce ohne script-src-attr legt jeden Knopf still', async ({ page }) => {
    // Die Falle, im Browser gemessen statt behauptet. Kein Fehler im Log der
    // Seite, kein sichtbarer Schaden: die Seite lädt, sieht heil aus, und
    // nichts reagiert.
    const r = await messen(page,
      "default-src 'self'; script-src 'self' 'nonce-ABC'; "
      + "script-src-elem 'self' 'nonce-ABC'");
    expect(r.handler, 'der Handler lief trotz Nonce ohne script-src-attr — '
      + 'dann misst dieser Test die Falle nicht mehr').toBe(false);
    expect(r.mitNonce, 'das genonc\'te Skript wurde blockiert').toBe(true);
    expect(r.ohneNonce, 'ein Skript ohne Nonce lief trotzdem').toBe(false);
  });

  test('mit script-src-attr laufen Knöpfe, eingeschleuste Skripte nicht', async ({ page }) => {
    // Das Ziel von Schritt 2: der Hauptweg für XSS (ein eingeschleustes
    // <script>) ist zu, die Oberfläche lebt.
    const r = await messen(page,
      "default-src 'self'; script-src 'self' 'nonce-ABC'; "
      + "script-src-elem 'self' 'nonce-ABC'; script-src-attr 'unsafe-inline'");
    expect(r.handler, 'script-src-attr rettet die Handler nicht').toBe(true);
    expect(r.ohneNonce, 'script-src-attr macht auch <script> wieder frei — '
      + 'dann wäre der ganze Umstieg wertlos').toBe(false);
  });

  test('die Direktive ändert an der heutigen Durchsetzung NICHTS', async ({ page }) => {
    // Der eigentliche Beleg dieser Änderung. Beide Fassungen müssen sich im
    // Browser identisch verhalten — sonst ist sie kein reiner Messfix,
    // sondern ein Eingriff in die laufende Seite.
    const ohne = await messen(page,
      "default-src 'self'; script-src 'self' 'unsafe-inline'; "
      + "script-src-elem 'self' 'unsafe-inline'");
    const mit = await messen(page,
      "default-src 'self'; script-src 'self' 'unsafe-inline'; "
      + "script-src-elem 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'");
    expect(ohne.handler, 'die heutige Fassung lässt keine Handler zu — '
      + 'dann vergleicht dieser Test nichts').toBe(true);
    expect(mit, 'script-src-attr verändert das Verhalten der durchgesetzten '
      + 'Fassung — die Änderung ist dann kein reiner Messfix').toEqual(ohne);
  });

  test('die durchgesetzte Fassung erlaubt Handler ausdrücklich', () => {
    const r = pruefstand();
    expect(r.cspDurchgesetztAttr, "script-src-attr 'unsafe-inline' fehlt in der "
      + 'durchgesetzten Fassung — dann nonc\'t die beobachtende wieder den '
      + 'Rückfallweg der Handler, und `bereit` ist erneut unerreichbar')
      .toBe("script-src-attr 'unsafe-inline'");
  });

  test('die beobachtende Fassung erbt sie unverändert — kein Nonce für Attribute', () => {
    // Die Ableitung trifft `script-src` und `script-src-elem`, nicht
    // `script-src-attr`. Wer das Muster auf /^script-src/ verkürzt, setzt das
    // Nonce auch hier — und der Melder ist wieder taub. In der durchgesetzten
    // Fassung wäre dieselbe Verkürzung der Totalausfall der Oberfläche.
    const r = pruefstand();
    expect(r.cspStrengAttr, 'die beobachtende Fassung hat script-src-attr verloren')
      .toBe("script-src-attr 'unsafe-inline'");
    expect(r.cspStrengAttr, 'das Nonce steht jetzt auch bei den Attributen')
      .not.toContain('nonce-');
  });

  test('so gemeldet wird nur noch der Ernstfall — und `bereit` ist erreichbar', () => {
    // Nach der Änderung verstößt ein Inline-Handler nicht mehr gegen die
    // beobachtende Fassung. Was bleibt, ist genau ein Fall: ein
    // Inline-<script> ohne Nonce. Bleibt der Bericht leer, heißt das jetzt
    // etwas — vorher hieß es nur, dass die Handler noch da sind.
    const r = pruefstand();
    // Attribute: erlaubt. Elemente: nur mit Nonce.
    expect(r.cspStrengAttr).toContain("'unsafe-inline'");
    expect(r.cspStrengElem, 'Elemente sind in der beobachtenden Fassung nicht '
      + 'genonc\'t — dann meldet sie den Ernstfall nicht').toMatch(/'nonce-[^']+'/);
    expect(r.cspStrengElem).not.toContain("'unsafe-inline'");
  });

  test('Schritt 2 ist noch NICHT gemacht — das Element trägt kein Nonce', () => {
    // Die Sperre oben lässt das Nonce zu, sobald script-src-attr steht; das
    // ist richtig, denn dann brechen die Knöpfe nicht mehr. Die zweite
    // Vorbedingung kann kein Test sehen: dass über ECHTEN Verkehr kein
    // `script-src-elem|inline` mehr gemeldet wird. Sie steht im HQ unter
    // `bereit`. Bis dahin bleibt die durchgesetzte Fassung, wie sie ist.
    const r = pruefstand();
    expect(r.cspDurchgesetztElem, 'die durchgesetzte Fassung trägt ein Nonce. '
      + 'Das ist Schritt 2 — er ist erst zulässig, wenn `bereit` im HQ true '
      + 'ist, und das ist eine Beobachtung über echten Verkehr, keine '
      + 'Code-Eigenschaft').not.toContain('nonce-');
    expect(r.cspDurchgesetztElem, 'die Element-Direktive ist verschwunden')
      .toContain("'unsafe-inline'");
  });
});
