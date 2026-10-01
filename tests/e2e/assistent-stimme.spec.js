// ════════════════════════════════════════════════════════════════════════
// Der Assistent spricht und hört — und die Konversation steht im Chat
//
// Gefordert am 01.10.2026: „unserer Assistent braucht ein Spracheingabe und
// Ausgabe mit Menschlicher Stimme der dann im Chat zu sehen ist die
// konversation".
//
// Zwei Teile, zwei Prüfarten:
//
//   · Der SERVERTEIL hängt an einem Kostenweg (OpenAI je Zeichen, je
//     Sekunde). Seine Deckel werden im echten PHP AUSGEFÜHRT, nicht
//     gelesen — ein Deckel, den niemand gefahren hat, ist eine Behauptung.
//   · Der BROWSERTEIL wird im echten Chromium gemessen. Dass „Sprache
//     vorhanden" ist, sagt nichts darüber, ob der Weg hinein existiert; das
//     ist die teuerste wiederkehrende Fehlerklasse dieses Projekts (Stripe-
//     Lader geprüft, Weg hinein zugesperrt; Storno fertig, kein Knopf).
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openApp, warteAufAppBereit } = require('./helpers');
const { ohneJsKommentare } = require('./lib/js-code');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const PRUEFSTAND = path.join(__dirname, 'stimme.php');

/** Eine Reihe Operationen im Prüfstand fahren. Jeder Aufruf ein eigener Prozess. */
function fahre(ops) {
  const roh = execFileSync('php', [PRUEFSTAND], {
    input: JSON.stringify(ops), encoding: 'utf8', timeout: 30000,
  });
  expect(roh.trim(), 'der Prüfstand muss Ausgabe liefern, nicht nur Exit 0').not.toBe('');
  return JSON.parse(roh);
}

const MIT_SCHLUESSEL = { op: 'schluessel' };
const RAHMEN = { eimer: 'probe', kennung: 'u42', proMinute: 3, proTag: 5, maxZeichen: 20, maxBytes: 2048 };

test.describe('Sprachdienst — im echten PHP ausgeführt', () => {
  test('ohne Schlüssel ein ehrliches Nein, und kein Aufruf nach aussen', () => {
    // KEIN `schluessel`-Op: dieser Fall braucht einen eigenen Prozess, denn
    // `define()` ist nicht rückgängig zu machen.
    const r = fahre([
      { op: 'reset' },
      { op: 'ausgeben', text: 'Hallo', rahmen: RAHMEN },
      { op: 'hoeren', base64_von: 'TONBYTES', rahmen: RAHMEN },
      { op: 'aufrufe' },
    ]);
    expect(r[1].verfuegbar).toBe(false);
    expect(r[1].grund).toMatch(/nicht hinterlegt/);
    expect(r[2].verfuegbar).toBe(false);
    // Nicht nur „sagt nein", sondern „fragt nicht": ohne Schlüssel darf
    // kein Byte an die Gegenstelle gehen.
    expect(r[3].anzahl, 'kein Aufruf ohne Schlüssel').toBe(0);
  });

  test('der Minutendeckel greift — am Konto, nicht an der Leitung', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'ausgeben', text: 'eins', rahmen: RAHMEN },
      { op: 'ausgeben', text: 'zwei', rahmen: RAHMEN },
      { op: 'ausgeben', text: 'drei', rahmen: RAHMEN },
      { op: 'ausgeben', text: 'vier', rahmen: RAHMEN },
      { op: 'aufrufe' },
    ]);
    expect(r[2].verfuegbar).toBe(true);
    expect(r[4].verfuegbar).toBe(true);
    expect(r[5].verfuegbar, 'der vierte in derselben Minute').toBe(false);
    expect(r[5].status).toBe(429);
    // Der abgewiesene Aufruf darf die Gegenstelle nicht erreicht haben —
    // sonst wäre der Deckel eine Anzeige und kein Deckel.
    expect(r[6].anzahl).toBe(3);
  });

  test('der Tagesdeckel greift, auch wenn die Minute frei ist', () => {
    // Minutendeckel weit offen (50), Tagesdeckel bei 3. Wird der vierte
    // Aufruf abgewiesen, kann das nur der TAG gewesen sein — und das ist
    // der eigentliche Kostenschutz: zwanzig pro Minute sind 28 800 am Tag.
    // Bis zum 01.10.2026 hatte auch das HQ nur einen Minutendeckel.
    const eng = { ...RAHMEN, eimer: 'tagesprobe', proMinute: 50, proTag: 3 };
    const ops = [MIT_SCHLUESSEL, { op: 'reset' }];
    for (let i = 0; i < 4; i++) ops.push({ op: 'ausgeben', text: 'a' + i, rahmen: eng });
    ops.push({ op: 'aufrufe' });
    const r = fahre(ops);
    const antworten = r.slice(2, 6).map((x) => x.verfuegbar);
    expect(antworten).toEqual([true, true, true, false]);
    expect(r[6].anzahl, 'der abgewiesene erreicht die Gegenstelle nicht').toBe(3);
  });

  test('zwei Konten teilen den Deckel nicht', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'ausgeben', text: 'a', rahmen: { ...RAHMEN, proMinute: 1, kennung: 'u1' } },
      { op: 'ausgeben', text: 'b', rahmen: { ...RAHMEN, proMinute: 1, kennung: 'u1' } },
      { op: 'ausgeben', text: 'c', rahmen: { ...RAHMEN, proMinute: 1, kennung: 'u2' } },
    ]);
    expect(r[2].verfuegbar).toBe(true);
    expect(r[3].verfuegbar, 'dasselbe Konto ein zweites Mal').toBe(false);
    // Die Gegenprobe ist der Punkt: ein Deckel, der ALLE sperrt, bestünde
    // den Test darüber ebenso — und wäre an einem Starttag eine kaputte
    // Seite. Dieselbe Lehre wie bei `REMOTE_ADDR` hinter einem Proxy.
    expect(r[4].verfuegbar, 'ein anderes Konto').toBe(true);
  });

  test('ein fehlender Deckel im Rahmen gilt als der strengste, nicht als keiner', () => {
    const r = fahre([{ op: 'rahmen', rahmen: {} }, { op: 'rahmen', rahmen: { proMinute: -5, proTag: 0 } }]);
    for (const x of [r[0], r[1]]) {
      expect(x.proMinute).toBeGreaterThan(0);
      expect(x.proTag).toBeGreaterThan(0);
      expect(x.maxZeichen).toBeGreaterThan(0);
      expect(x.maxBytes).toBeGreaterThan(0);
    }
    // Eine fehlende Grenze ist keine Erlaubnis.
    expect(r[0].proMinute).toBeLessThanOrEqual(20);
    expect(r[0].proTag).toBeLessThanOrEqual(200);
  });

  test('der Text wird geschnitten, bevor er hinausgeht', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'ausgeben', text: 'ä'.repeat(400), rahmen: { ...RAHMEN, maxZeichen: 7 } },
      { op: 'aufrufe' },
    ]);
    expect(r[2].verfuegbar).toBe(true);
    // Mehrbyte-Zeichen: 7 ZEICHEN, nicht 7 Bytes. Ein Schnitt mitten durch
    // ein UTF-8-Zeichen erzeugt ungültige Bytes, und die Gegenstelle
    // antwortet mit 400 — die Stimme bliebe still.
    expect(r[3].aufrufe[0].zeichen).toBe(7);
  });

  test('zu lange Aufnahme wird abgewiesen, und zwar VOR dem Dekodieren', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'hoeren', bytes: 9000, rahmen: { ...RAHMEN, maxBytes: 2048 } },
      { op: 'aufrufe' },
    ]);
    expect(r[2].verfuegbar).toBe(false);
    expect(r[2].status).toBe(413);
    expect(r[3].anzahl, 'nichts geht an die Gegenstelle').toBe(0);

    // UND DIE REIHENFOLGE. base64 ist ein Drittel grösser als der Inhalt;
    // erst dekodieren und dann prüfen hiesse, den Speicher schon belegt zu
    // haben. Diese Eigenschaft ist an der ANTWORT nicht beobachtbar — die
    // zweite Längenprüfung hinter dem Dekodieren liefert dasselbe 413, und
    // die Mutation „Vorprüfung entfernt" hat den Test oben prompt
    // überlebt. Eine Wache ohne Subjekt ist eine Behauptung; also bekommt
    // sie ihr Subjekt, und das ist hier die Stellung im Code. Gemessen nach
    // Abzug der Kommentare — der Docblock daneben nennt „base64" und
    // „dekodieren" mehrfach.
    const code = phpOhneKommentare(path.join(WURZEL, 'includes/stimme/sprachdienst.php'));
    const roh = code.indexOf("strlen( $roh ) >");
    const dec = code.indexOf('base64_decode(');
    expect(roh, 'die Rohlänge muss geprüft werden').toBeGreaterThan(-1);
    expect(dec, 'und dekodiert wird auch').toBeGreaterThan(-1);
    expect(roh, 'messen, dann dekodieren').toBeLessThan(dec);
  });

  test('Müll statt base64 wird abgewiesen, nicht weitergeschickt', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'hoeren', audio: '!!! kein base64 !!!', rahmen: RAHMEN },
      { op: 'hoeren', audio: '', rahmen: RAHMEN },
      { op: 'aufrufe' },
    ]);
    expect(r[2].status).toBe(400);
    expect(r[3].status).toBe(400);
    // `base64_decode` OHNE strict schluckt Müll und liefert Bytes, die kein
    // Ton sind — die Gegenstelle bekäme sie und würde dafür abrechnen.
    expect(r[4].anzahl).toBe(0);
  });

  test('Whisper-Phantom wird verworfen und als solches benannt', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'hoeren', base64_von: 'TON', erkannt: 'Untertitel der Amara.org-Community', rahmen: RAHMEN },
      { op: 'hoeren', base64_von: 'TON', erkannt: 'Vielen Dank FÜRS Zuschauen', rahmen: RAHMEN },
      { op: 'hoeren', base64_von: 'TON', erkannt: 'ich suche einen DJ', rahmen: RAHMEN },
    ]);
    expect(r[2].phantom, 'Amara-Abspann').toBe(true);
    expect(r[2].text).toBe('');
    // GROSSGESCHRIEBENER UMLAUT. `strtolower()` arbeitet byteweise: „Ü" sind
    // zwei UTF-8-Bytes, keines ein ASCII-Grossbuchstabe. Ein Muster mit
    // Umlaut träfe nie — genau der Fehler, an dem `eb_handle_vorschlag()`
    // jeden führenden Umlaut gefressen hat.
    expect(r[3].phantom, 'Umlaut in Grossschreibung').toBe(true);
    // Gegenprobe: eine echte Frage überlebt. Ohne sie bestünde „verwirf
    // alles" jede Zusicherung darüber.
    expect(r[4].phantom).toBe(false);
    expect(r[4].text).toBe('ich suche einen DJ');
  });

  test('die Phantom-Liste bleibt eng', () => {
    const r = fahre([
      { op: 'phantom', text: 'Brauchen wir Untertitel für den Livestream?' },
      { op: 'phantom', text: 'Danke!' },
      { op: 'phantom', text: 'Vielen Dank' },
    ]);
    // „Untertitel" pauschal zu sperren nimmt eine echte Frage mit — und
    // „Untertitel für den Livestream" ist bei einem Event-Marktplatz eine
    // naheliegende.
    expect(r.map((x) => x.phantom)).toEqual([false, false, false]);
  });

  test('ein unbekanntes Tonfall-Feld lässt die Stimme nicht verstummen', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'http', codes: [400, 200] },
      { op: 'ausgeben', text: 'Hallo', rahmen: RAHMEN },
      { op: 'aufrufe' },
    ]);
    expect(r[3].verfuegbar, 'der zweite Anlauf muss durchkommen').toBe(true);
    // Und das Ausweichen ist SICHTBAR. Ein Ausweichweg, den niemand sieht,
    // verschweigt, dass eine Eigenschaft verloren ging.
    expect(r[3].ohne_anweisung).toBe(true);
    expect(r[4].anzahl).toBe(2);
    expect(r[4].aufrufe[0].hatAnweisung).toBe(true);
    expect(r[4].aufrufe[1].hatAnweisung, 'der zweite ohne Anweisung').toBe(false);
  });

  test('ein 500 wird NICHT wiederholt', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'http', codes: [500, 200] },
      { op: 'ausgeben', text: 'Hallo', rahmen: RAHMEN },
      { op: 'aufrufe' },
    ]);
    expect(r[3].verfuegbar).toBe(false);
    // Nur die eine Ursache wird wiederholt. Eine Schleife, die alles
    // wiederholt, verdreifacht die Last und schleift echte Fehler weg —
    // dieselbe Regel wie beim Auto-Merge und beim Overpass-Abruf.
    expect(r[4].anzahl).toBe(1);
  });

  test('auch der zweite 400 ist endgültig', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'http', codes: [400, 400] },
      { op: 'ausgeben', text: 'Hallo', rahmen: RAHMEN },
      { op: 'aufrufe' },
    ]);
    expect(r[3].verfuegbar).toBe(false);
    expect(r[4].anzahl, 'zwei Anläufe, dann Schluss').toBe(2);
  });

  test('der Fehlertext der Gegenstelle wird nicht durchgereicht', () => {
    const r = fahre([
      MIT_SCHLUESSEL, { op: 'reset' },
      { op: 'http', codes: [401], body: 'Organization org-eventboerse-geheim hat kein Guthaben' },
      { op: 'ausgeben', text: 'Hallo', rahmen: RAHMEN },
    ]);
    expect(r[3].verfuegbar).toBe(false);
    expect(r[3].grund).toMatch(/HTTP 401/);
    expect(r[3].grund, 'kein Organisationsname nach aussen').not.toMatch(/org-eventboerse/);
  });

  test('der Ton landet nie auf der Platte', () => {
    const code = phpOhneKommentare(path.join(WURZEL, 'includes/stimme/sprachdienst.php'));
    // Gemessen nach Abzug der Kommentare: der Docblock oben nennt „Platte"
    // und „Datei" mehrfach, und ein Muster, das den erklärenden Text trifft,
    // ist in diesem Projekt schon elfmal teuer gewesen.
    for (const verboten of ['file_put_contents', 'fopen', 'tmpfile', 'move_uploaded_file',
      'wp_handle_upload', 'wp_upload_dir', 'sys_get_temp_dir', 'tempnam']) {
      expect(code, verboten).not.toContain(verboten);
    }
  });
});

test.describe('Die Routen des Assistenten', () => {
  const routen = () => phpOhneKommentare(path.join(WURZEL, 'includes/stimme/routen.php'));

  test('nur angemeldet — eine offene Sprachroute wäre ein Kostenverstärker', () => {
    const code = routen();
    const treffer = [...code.matchAll(/register_rest_route\([\s\S]{0,600}?\)\s*\);/g)].map((m) => m[0]);
    expect(treffer.length, 'zwei Routen').toBe(2);
    for (const r of treffer) {
      expect(r, 'Sprachroute ohne Anmeldung').toContain("'permission_callback' => 'is_user_logged_in'");
      expect(r).not.toContain('__return_true');
    }
  });

  test('der Eimer hängt am Konto', () => {
    const code = routen();
    // Hinter einem Reverse-Proxy bezeichnet `REMOTE_ADDR` alle Besucher
    // gemeinsam; ein IP-gebundener Deckel wäre dort entweder wirkungslos
    // oder er sperrte Unbeteiligte. Und eine Kennung wird vom
    // Proxy-Faktor NIE geweitet.
    expect(code).toMatch(/'kennung'\s*=>\s*'u'\s*\.\s*\(int\)\s*get_current_user_id\(\)/);
  });

  test('der Rahmen des Assistenten ist enger als der des HQ', () => {
    const r = fahre([{ op: 'reset' }]);
    expect(r[0].ok).toBe(true);
    const ass = routen();
    const fn = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    const zahl = (code, name) => {
      const m = new RegExp('const\\s+' + name + '\\s*=\\s*([0-9*\\s]+);').exec(code);
      expect(m, name).not.toBeNull();
      // eslint-disable-next-line no-new-func
      return Number(new Function('return (' + m[1] + ')')());
    };
    expect(zahl(ass, 'EB_ASSISTENT_STIMME_ZEICHEN'))
      .toBeLessThan(zahl(fn, 'EB_HQ_STIMME_ZEICHEN'));
    expect(zahl(ass, 'EB_ASSISTENT_GEHOER_MAX'))
      .toBeLessThan(zahl(fn, 'EB_HQ_GEHOER_MAX'));
    expect(zahl(ass, 'EB_ASSISTENT_STIMME_PRO_TAG'))
      .toBeLessThan(zahl(fn, 'EB_HQ_STIMME_PRO_TAG'));
  });

  test('das HQ benutzt denselben Dienst — keine zweite Fassung', () => {
    const fn = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    // Die Mechanik darf NUR an einer Stelle stehen. Stünde sie wieder in
    // `functions.php`, driftete sie — in diesem Projekt sind so schon eine
    // Sicherheitsliste, eine Testzahl, eine Icon-Liste, ein
    // Privacy-Manifest und eine Kategorientabelle auseinandergelaufen.
    expect(fn, 'HQ ruft den gemeinsamen Dienst').toContain('eb_sprachdienst_ausgeben(');
    expect(fn, 'HQ ruft den gemeinsamen Dienst').toContain('eb_sprachdienst_hoeren(');
    expect(fn, 'kein eigener TTS-Aufruf mehr').not.toContain('v1/audio/speech');
    expect(fn, 'kein eigener Whisper-Aufruf mehr').not.toContain('v1/audio/transcriptions');
  });

  test('die Einbindung ist da, nicht nur im Kommentar erwähnt', () => {
    const fn = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    // Gesucht wird die EINBINDUNG, nicht der Pfad. Am 13.09.2026 fand
    // dieselbe Prüfung für den Kontaktschutz ihren Pfad im erklärenden
    // Kommentar, und die Mutation „require_once entfernt" überlebte.
    expect(fn).toMatch(/require_once[^;]+includes\/stimme\/sprachdienst\.php/);
    expect(fn).toMatch(/require_once[^;]+includes\/stimme\/routen\.php/);
  });
});

test.describe('Der Weg hinein — im echten Browser', () => {
  async function assistent(page) {
    await page.evaluate(() => window.navigateTo('board'));
    await page.waitForFunction(() => !!document.querySelector('[data-planning-action="assistant"]'), null, { timeout: 15000 });
    await page.evaluate(() => document.querySelector('[data-planning-action="assistant"]').click());
    await page.waitForSelector('#baiMic', { state: 'visible', timeout: 15000 });
  }

  test('beide Knöpfe sind wirklich da und bedienbar', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistent(page);
    // Nicht „die Funktion ist definiert" — das war die falsche Frage beim
    // Storno, und sie war grün, während es keinen Knopf gab. Gemessen wird,
    // was der Nutzer anfasst.
    for (const id of ['#baiMic', '#baiVoiceToggle']) {
      const k = page.locator(id);
      await expect(k).toBeVisible();
      const kasten = await k.boundingBox();
      // WCAG 2.2 SC 2.5.8: 24x24 px. Hier sind es 40, weil die Zeile es
      // hergibt.
      expect(kasten.width, id).toBeGreaterThanOrEqual(24);
      expect(kasten.height, id).toBeGreaterThanOrEqual(24);
      await expect(k).toHaveAttribute('aria-label', /./);
    }
  });

  test('die Sprachausgabe ist AUS, bis jemand sie einschaltet', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistent(page);
    expect(await page.evaluate(() => ebStimmeAn()), 'Vorgabe ist aus').toBe(false);
    await expect(page.locator('#baiVoiceToggle')).toHaveAttribute('aria-pressed', 'false');
  });

  test('der Schalter schaltet — auch ohne Cookie-Einwilligung', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistent(page);
    await page.locator('#baiVoiceToggle').click();
    const r = await page.evaluate(() => ({
      an: ebStimmeAn(),
      pressed: document.getElementById('baiVoiceToggle').getAttribute('aria-pressed'),
      ico: document.querySelector('#baiVoiceToggle .material-icons-round').textContent,
      gespeichert: (function() { try { return localStorage.getItem('eb_assistent_stimme_v1'); } catch (e) { return 'FEHLER'; } })(),
    }));
    // DER GEMESSENE FUND vom 01.10.2026: ohne Einwilligung verweigert
    // `ebSpeichern()` den nicht-essenziellen Schlüssel — richtig. Die erste
    // Fassung las den Zustand aber NUR aus `localStorage`, also blieb der
    // Knopf aus. Er liess sich drücken und tat nichts, und zwar genau für
    // die Nutzer, die Speicherung abgelehnt haben.
    expect(r.an, 'der Wunsch gilt für diese Sitzung').toBe(true);
    expect(r.pressed).toBe('true');
    expect(r.ico, 'und man sieht es').toBe('volume_up');
    // Die Gegenprobe gehört dazu: ohne Einwilligung darf NICHTS liegen
    // bleiben. „Keine Speicherung" heisst nicht „keine Funktion" — aber
    // eben auch wirklich keine Speicherung.
    expect(r.gespeichert, 'ohne Einwilligung nichts in localStorage').toBeNull();
  });

  test('der Zustand überlebt das Neuzeichnen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistent(page);
    await page.locator('#baiVoiceToggle').click();
    await page.evaluate(() => window._aiRenderChat());
    // Stünde „aus" da, während die Einstellung „an" ist, schaltete der
    // nächste Druck sie ab — der Knopf täte dann das Gegenteil seines
    // Aussehens.
    await expect(page.locator('#baiVoiceToggle')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.querySelector('#baiVoiceToggle .material-icons-round').textContent)).toBe('volume_up');
  });

  test('abgemeldet nennt das Mikrofon den Grund, statt nichts zu tun', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistent(page);
    await page.locator('#baiMic').click();
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const c = document.getElementById('baiChat');
      const l = c ? c.lastElementChild : null;
      return { text: l ? (l.innerText || '') : '', hoert: ebStimmeHoertZu() };
    });
    // Ein Mikrofon, das nichts tut und nichts sagt, ist von einem Defekt
    // nicht zu unterscheiden. Und es muss der WEG dastehen, nicht nur die
    // Absage.
    expect(r.text).toMatch(/Konto|anmeld/i);
    expect(r.text).toMatch(/Tippen|schreib/i);
    expect(r.hoert, 'ohne Konto wird kein Mikrofon geöffnet').toBe(false);
  });

  test('der Vorlesetext ist Prosa — keine Ligaturen, keine Knopftexte', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistent(page);
    const r = await page.evaluate(() => {
      const html = _aiAnswerCategory('dj');
      return {
        htmlHatLigatur: /material-icons-round"[^>]*>\w+</.test(html),
        htmlHatKnopf: html.indexOf('<button') > -1,
        gesprochen: ebStimmeTextAusHtml(html),
        emoji: ebStimmeTextAusHtml('🎧 Hier sind <b>Top</b>-Treffer ✨ für 1.200 € — süß!'),
      };
    });
    // Gegenprobe: das HTML trägt beides wirklich. Ohne sie bestünde der
    // Test auch dann, wenn es nichts zu entfernen gäbe.
    expect(r.htmlHatLigatur, 'das HTML trägt Icon-Ligaturen').toBe(true);
    expect(r.htmlHatKnopf, 'das HTML trägt Knöpfe').toBe(true);
    // „search", „view_kanban" & Co. würden mitten im Satz vorgelesen —
    // dieselbe Falle wie die vier Icon-Spans in der Barrierefreiheit.
    expect(r.gesprochen).not.toMatch(/\b(search|view_kanban|arrow_upward|mic|volume_up)\b/);
    // Eine Stimme kann nicht klicken. „Ansehen + Board" vorzulesen ist eine
    // Sackgasse — gemessen stand genau das in der ersten Fassung.
    expect(r.gesprochen).not.toMatch(/Ansehen/);
    expect(r.gesprochen).not.toMatch(/\+ Board/);
    // Satzgrenzen: ohne sie wird aus „…Musik:</div><div>Max" ein „MusikMax".
    expect(r.gesprochen).toMatch(/DJ & Musik: /);
    expect(r.gesprochen, 'kein doppelter Punkt').not.toMatch(/\.\s*\./);
    // Und die Prosa bleibt vollständig: Ziffern, Umlaute, Währung.
    expect(r.emoji).toBe('Hier sind Top-Treffer für 1.200 € — süß!');
  });

  test('es gibt keinen zweiten Weg vom Mikrofon in die Antwort', () => {
    const code = ohneJsKommentare(fs.readFileSync(
      path.join(WURZEL, 'js/modules/ai/53-assistent-stimme.js'), 'utf8'));
    // Das Gesprochene läuft durch `_aiUserSays()` — denselben Weg wie das
    // Getippte. Nur so steht die Konversation im Chat, und nur so ist
    // hinterher zu sehen, ob falsch VERSTANDEN oder falsch GEANTWORTET
    // wurde. Ein zweiter Pfad wäre eine zweite Wahrheit.
    expect(code).toContain('_aiUserSays(text)');
    expect(code, 'der Assistent darf die Antwort nicht selbst bauen').not.toContain('_aiAnswer(');
    // Und kein selbstgestarteter Neuanfang: genau daran hat der HQ-Kreis am
    // 22.08.2026 mit sich selbst geredet.
    expect(code).not.toMatch(/setTimeout\s*\(\s*ebAssistentMikro/);
    expect(code).not.toMatch(/setTimeout\s*\([^)]*nachhoeren/);
  });

  test('jeder Ausgang gibt das Mikrofon frei', () => {
    const code = ohneJsKommentare(fs.readFileSync(
      path.join(WURZEL, 'js/modules/ai/53-assistent-stimme.js'), 'utf8'));
    // Ein Mikrofon, das nach dem Beenden weiterläuft, ist ein
    // Datenschutzproblem und kein Schönheitsfehler. Gemessen wird die
    // BEDINGUNG: jede Stelle, die `_ebStimmeAufnahme` auf null setzt, muss
    // entweder `ebMikroAbbauen()` sein oder die Spuren selbst stoppen.
    expect(code).toMatch(/getTracks\(\)[\s\S]{0,80}stop\(\)/);
    const abbau = /function ebMikroAbbauen\(\)\s*\{[\s\S]*?\n\}/.exec(code);
    expect(abbau, 'ebMikroAbbauen muss es geben').not.toBeNull();
    expect(abbau[0]).toContain('getTracks');
    expect(abbau[0]).toContain('clearTimeout');
    // Die Aufnahme wird gedeckelt — ohne Zeitlimit hielte ein hängender
    // Lauf das Mikrofon offen. Dieselbe Fehlerart wie beim Deploy am
    // 03.09.2026.
    expect(code).toMatch(/setTimeout\([\s\S]{0,120}?EB_STIMME_MAX_MS/);
  });

  test('die Antwort wird an EINER Stelle vorgelesen', () => {
    const code = ohneJsKommentare(fs.readFileSync(
      path.join(WURZEL, 'js/modules/ai/50-planungs-assistent.js'), 'utf8'));
    // In `_aiPushMsg`, nicht an den fünfzehn Stellen, die es rufen. Eine
    // Vorlese-Zeile je Antwortstelle müsste man an jeder neuen wiederholen
    // — und dann schweigt genau die nächste. Dieselbe Begründung wie
    // `defaults: run: shell: bash` am Job statt je Schritt.
    expect((code.match(/ebAssistentAntwortSprechen\(/g) || []).length).toBe(1);
    const push = /function _aiPushMsg\([\s\S]*?\n\}/.exec(code);
    expect(push).not.toBeNull();
    expect(push[0]).toContain('ebAssistentAntwortSprechen(html)');
  });

  test('der Rückfall auf die Systemstimme ist da und hörbar', () => {
    const code = ohneJsKommentare(fs.readFileSync(
      path.join(WURZEL, 'js/modules/ai/53-assistent-stimme.js'), 'utf8'));
    // Eine Sprachausgabe, die still bleibt, ist für den Nutzer von einem
    // Absturz nicht zu unterscheiden. Dieselbe Regel wie im HQ.
    expect(code).toContain('speechSynthesis');
    expect(code).toContain('SpeechSynthesisUtterance');
    expect(code).toMatch(/u\.lang\s*=\s*'de-DE'/);
    // Ein 429 ist VORÜBERGEHEND. Den Server dafür die ganze Sitzung
    // abzuschreiben wäre derselbe Fehler wie ein gemerktes abgelehntes
    // Versprechen im Stripe-Lader: eine Minute Deckel kostete die Sitzung.
    expect(code).toMatch(/nicht hinterlegt/);
    const merken = /_ebStimmeServer = false/g;
    expect((code.match(merken) || []).length, 'nur im dauerhaften Fall merken').toBe(1);
  });

  test('das Modul wird wirklich ausgeliefert', () => {
    const liste = fs.readFileSync(path.join(WURZEL, 'js/modules/modules.list'), 'utf8');
    expect(liste).toContain('ai/53-assistent-stimme.js');
    // Und in der Verkettung: ein Modul in der Liste, aber nicht in app.js,
    // wäre genau die Drift, auf die `pr-check.yml` prüft — hier als
    // Gegenprobe, dass der Weg hinein existiert.
    const app = fs.readFileSync(path.join(WURZEL, 'app.js'), 'utf8');
    expect(app).toContain('function ebAssistentMikro(');
    expect(app).toContain('function ebAssistentSprechen(');
  });
});
