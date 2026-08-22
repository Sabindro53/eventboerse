// Bild-Upload: was im Backend ankommt und was abgewiesen wird.
//
// Die Strecke war ungetestet, obwohl sie die gefährlichste der Plattform ist:
// hier lädt ein fremder Mensch eine Datei auf unseren Server. Sieben Schichten
// prüfen sie, und jede einzelne hat einen Grund. Diese Suite hält sie fest —
// nicht die Formulierung, sondern die Eigenschaft.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
const BASIS = fs.readFileSync(path.join(ROOT, 'js', 'modules', 'core', '00-basis.js'), 'utf8');

/** Rumpf von eb_handle_upload, ohne Kommentare — gemessen wird Code. */
const HANDLER = (() => {
  const von = FUNCTIONS.indexOf('function eb_handle_upload');
  const bis = FUNCTIONS.indexOf('\n/* ====', von);
  return FUNCTIONS.slice(von, bis > von ? bis : von + 6000)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
})();

test.describe('Bild-Upload landet in WordPress', () => {
  test('nur angemeldete Nutzer dürfen hochladen', () => {
    const reg = FUNCTIONS.slice(FUNCTIONS.indexOf("'/upload'"));
    expect(reg.slice(0, reg.indexOf(') );') + 4))
      .toMatch(/'permission_callback'\s*=>\s*'is_user_logged_in'/);
  });

  test('die Datei landet in der Mediathek, nicht bloss im Dateisystem', () => {
    // Das ist der Kern der Anforderung: WordPress verwaltet das Bild, es liegt
    // in wp-content/uploads auf IONOS und hat einen Datenbankeintrag.
    expect(HANDLER, 'kein wp_handle_upload').toMatch(/wp_handle_upload\(/);
    expect(HANDLER, 'kein Mediathek-Eintrag').toMatch(/wp_insert_attachment\(/);
    expect(HANDLER, 'keine Bildgrößen erzeugt').toMatch(/wp_generate_attachment_metadata\(/);
  });

  test('jedes Bild bekommt einen Besitzer', () => {
    // Ohne Zuordnung liesse sich später weder Löschen noch Auskunft erteilen.
    expect(HANDLER).toMatch(/update_post_meta\([^)]*_eb_owner_id/);
    expect(HANDLER).toMatch(/'post_author'\s*=>\s*get_current_user_id\(\)/);
  });

  test('der Dateityp kommt aus den Magic Bytes, nicht vom Client', () => {
    // $file['type'] schickt der Browser. Wer eine PHP-Datei als image/jpeg
    // deklariert, käme sonst durch.
    expect(HANDLER, 'kein finfo').toMatch(/finfo_file\(/);
    const mimeZeile = HANDLER.slice(HANDLER.indexOf('$real_mime'), HANDLER.indexOf('$allowed_mimes'));
    expect(mimeZeile, 'der Client-MIME wird geglaubt').not.toMatch(/\$file\['type'\]/);
  });

  test('der Upload muss ein echter Upload sein', () => {
    // Ohne is_uploaded_file liesse sich ein beliebiger Serverpfad angeben.
    expect(HANDLER).toMatch(/is_uploaded_file\(\s*\$file\['tmp_name'\]\s*\)/);
  });

  test('gefährliche Endungen werden geblockt — auch doppelte', () => {
    // evil.php.jpg ist der klassische Fall.
    expect(HANDLER).toMatch(/\.php/);
    expect(HANDLER).toMatch(/\.phtml/);
    expect(HANDLER, 'SVG erlaubt — SVG kann Skript enthalten').toMatch(/\.svg/);
    // Die Prüfung muss BEIDES können: Endung am Schluss und mitten im Namen.
    expect(HANDLER).toMatch(/strpos\(\s*\$name_lower[\s\S]{0,80}substr\(\s*\$name_lower/);
  });

  test('drei unabhängige Schichten prüfen den Inhalt', () => {
    // Eine Schicht kann man umgehen; drei zusammen sind der Grund, warum
    // dieser Endpunkt vertretbar ist.
    expect(HANDLER, 'finfo fehlt').toMatch(/finfo_file/);
    expect(HANDLER, 'WordPress-Prüfung fehlt').toMatch(/wp_check_filetype_and_ext\(/);
    expect(HANDLER, 'Bild-Gegenprobe fehlt').toMatch(/getimagesize\(/);
    // Und die Allowlist wird beim Schreiben erzwungen, nicht nur davor geprüft.
    expect(HANDLER).toMatch(/wp_handle_upload\([\s\S]{0,400}'mimes'\s*=>/);
  });

  test('was die Gegenprobe nicht besteht, bleibt nicht liegen', () => {
    // Eine abgelehnte Datei, die im Uploads-Ordner verbleibt, ist genau das,
    // was der ganze Prüfaufwand verhindern soll.
    const nachGetimagesize = HANDLER.slice(HANDLER.indexOf('getimagesize'));
    expect(nachGetimagesize.slice(0, 400), 'abgelehnte Datei wird nicht gelöscht')
      .toMatch(/unlink\(/);
    // Auch wenn der Mediathek-Eintrag scheitert.
    const nachInsert = HANDLER.slice(HANDLER.indexOf('wp_insert_attachment'));
    expect(nachInsert.slice(0, 400)).toMatch(/is_wp_error[\s\S]{0,120}unlink\(/);
  });

  test('Server und Browser teilen dieselbe Grössengrenze', () => {
    // Zwei Zahlen, die auseinanderlaufen, erzeugen einen Upload, den der
    // Browser zulässt und der Server ablehnt — ohne verständlichen Grund.
    expect(HANDLER).toMatch(/EB_MAX_IMAGE_BYTES/);
    expect(BASIS).toMatch(/EB_MAX_IMAGE_BYTES\s*=/);
    const php = (FUNCTIONS.match(/define\(\s*'EB_MAX_IMAGE_BYTES'\s*,\s*([^)]+)\)/)
      || FUNCTIONS.match(/const\s+EB_MAX_IMAGE_BYTES\s*=\s*([^;]+);/) || [, ''])[1];
    const js = (BASIS.match(/EB_MAX_IMAGE_BYTES\s*=\s*([^;]+);/) || [, ''])[1];
    const zahl = (s) => {
      const m = String(s).match(/(\d+)\s*\*\s*1024\s*\*\s*1024/);
      return m ? Number(m[1]) : null;
    };
    expect(zahl(php), `PHP-Grenze nicht lesbar: ${php}`).not.toBeNull();
    expect(zahl(js), `JS-Grenze nicht lesbar: ${js}`).not.toBeNull();
    expect(zahl(php), 'Server und Browser erlauben verschiedene Grössen').toBe(zahl(js));
  });

  test('überschreitet der Request das Hosting-Limit, sagt der Server welches', () => {
    // PHP verwirft den Body bei post_max_size, bevor der Handler läuft: $_FILES
    // ist leer. Ohne diesen Zweig sähe der Nutzer nur "Keine Datei hochgeladen".
    expect(HANDLER).toMatch(/CONTENT_LENGTH/);
    expect(HANDLER).toMatch(/post_max_size/);
    expect(HANDLER).toMatch(/413/);
  });
});

/* ── Demo-Bilder in die eigene Mediathek ──────────────────────────────────
   Die hardcodierten Demo-Daten hotlinken auf Pexels. Sie zu holen geht nur
   dort, wo Pexels erreichbar ist — der Webserver kann es, die
   Entwicklungsumgebung nicht. Deshalb laeuft der Import als Route.

   Was hier NICHT geprueft werden kann, ist das Herunterladen selbst. Geprueft
   werden die Eigenschaften drumherum: wer darf, was akzeptiert wird, ob der
   Aufruf wiederholbar ist und ob eine fehlende Zuordnung ehrlich durchreicht. */
const IMPORT = (() => {
  const von = FUNCTIONS.indexOf('function eb_hq_demo_bilder_holen');
  const bis = FUNCTIONS.indexOf('\n}\n', von + 100);
  return FUNCTIONS.slice(von, bis > von ? bis + 3 : von + 6000)
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
})();

test.describe('Demo-Bilder in die eigene Mediathek', () => {
  test('nur ein angemeldeter Administrator darf importieren', () => {
    // Strenger als die uebrigen HQ-Routen: das schreibt dauerhaft in die
    // Datenbank und laedt von fremden Hosts.
    const reg = FUNCTIONS.slice(FUNCTIONS.indexOf("'/hq/demo-bilder'"));
    expect(reg.slice(0, reg.indexOf(') );') + 4))
      .toMatch(/'permission_callback'\s*=>\s*'eb_hq_verwaltung_darf'/);
  });

  test('der Inhalt entscheidet, nicht die Adresse', () => {
    // Derselbe Massstab wie beim Nutzer-Upload. Ein Fremdhost, der etwas
    // anderes als ein Bild liefert, darf hier so wenig durch wie ein Besucher.
    expect(IMPORT, 'kein Typ aus den Bytes').toMatch(/finfo_buffer\(/);
    expect(IMPORT, 'keine Bild-Gegenprobe').toMatch(/getimagesize\(/);
    expect(IMPORT, 'kein Groessenlimit').toMatch(/EB_MAX_IMAGE_BYTES/);
    // Und was durchfaellt, bleibt nicht liegen.
    expect(IMPORT).toMatch(/getimagesize[\s\S]{0,160}unlink\(/);
  });

  test('das Bild landet in der Mediathek wie ein hochgeladenes', () => {
    expect(IMPORT).toMatch(/wp_upload_bits\(/);
    expect(IMPORT).toMatch(/wp_insert_attachment\(/);
    expect(IMPORT).toMatch(/wp_generate_attachment_metadata\(/);
  });

  test('der Aufruf ist wiederholbar und laeuft nicht ins Zeitlimit', () => {
    // Ein Import, den man nicht zweimal starten darf, wird beim ersten
    // Fehlschlag zur Sackgasse.
    expect(IMPORT, 'bereits Geholtes wird erneut geladen').toMatch(/isset\(\s*\$map\[\s*\$url\s*\]\s*\)[\s\S]{0,60}continue/);
    expect(IMPORT, 'keine Obergrenze je Aufruf').toMatch(/\$limit\s*=\s*\d+/);
    expect(IMPORT).toMatch(/\$neu\s*>=\s*\$limit[\s\S]{0,40}break/);
  });

  test('die Restzahl wird ehrlich gemeldet', () => {
    // Erst wenn "offen" null ist, geht nichts mehr an den Fremdhost. Eine
    // Erfolgsmeldung ohne diese Zahl liesse einen halben Import wie einen
    // fertigen aussehen.
    expect(IMPORT).toMatch(/eb_demo_bilder_stand\(/);
    expect(IMPORT).toMatch(/'fehler'\s*=>/);
  });

  test('die Restzahl zaehlt die Schnittmenge, nicht die Eintraege', () => {
    // Gemessen am AUSGEFUEHRTEN Code, nicht am Text: die Funktion wird aus
    // functions.php geschnitten und mit PHP wirklich aufgerufen.
    //
    // Der Fall, der es braucht: nach einem neuen Demo-Feed stehen alte
    // Adressen weiter in der Zuordnung. Wer die Eintraege zaehlt, meldet
    // dann zu wenig Offene — im schlimmsten Fall eine 0, waehrend noch
    // Bilder an Pexels gehen.
    const von = FUNCTIONS.indexOf('function eb_demo_bilder_stand');
    expect(von, 'eb_demo_bilder_stand fehlt').toBeGreaterThan(-1);
    const quelle = FUNCTIONS.slice(von, FUNCTIONS.indexOf('\n}\n', von) + 2);

    const datei = path.join(os.tmpdir(), 'eb-stand-' + process.pid + '.php');
    fs.writeFileSync(datei, '<?php\n' + quelle + '\n' + `
      $adressen = array( 'a', 'b', 'c' );
      echo json_encode( array(
        'leer'   => eb_demo_bilder_stand( array(), $adressen ),
        'halb'   => eb_demo_bilder_stand( array( 'a' => 'x' ), $adressen ),
        // Zwei Eintraege, aber nur einer davon ist noch eine Adresse.
        'veraltet' => eb_demo_bilder_stand( array( 'a' => 'x', 'weg' => 'y' ), $adressen ),
        'fertig' => eb_demo_bilder_stand( array( 'a' => 'x', 'b' => 'y', 'c' => 'z' ), $adressen ),
      ) );`);
    let roh;
    try {
      roh = execFileSync('php', [datei], { encoding: 'utf8' });
    } finally {
      fs.unlinkSync(datei);
    }
    const d = JSON.parse(roh);

    expect(d.leer.offen, 'nichts geholt heisst alles offen').toBe(3);
    expect(d.halb.offen).toBe(2);
    expect(d.halb.in_mediathek).toBe(1);
    // Der eigentliche Punkt: der veraltete Eintrag darf die Restzahl nicht
    // druecken. Mit count($map) staende hier 1.
    expect(d.veraltet.offen, 'ein veralteter Eintrag zaehlt als geholt').toBe(2);
    expect(d.fertig.offen).toBe(0);
    expect(d.fertig.gefunden).toBe(3);
  });

  test('nachsehen laedt nichts und schreibt nichts', () => {
    // Ein Blick, der Nebenwirkungen hat, wird seltener geworfen als er
    // sollte — und ein GET, der von einem Fremdhost laedt, ist ausserdem
    // eine Route, die jeder Neuladen-Reflex teuer macht.
    const getZweig = IMPORT.slice(IMPORT.indexOf("get_method()"));
    const bisReturn = getZweig.slice(0, getZweig.indexOf('$neu = 0'));
    expect(bisReturn, 'der GET-Zweig kehrt nicht zurueck').toMatch(/return new WP_REST_Response/);
    expect(bisReturn, 'GET laedt von aussen').not.toMatch(/wp_remote_get/);
    expect(bisReturn, 'GET schreibt in die Datenbank').not.toMatch(/update_option/);
  });

  test('die Adressen kommen aus dem ausgelieferten Stand, nicht aus einer Liste', () => {
    // Eine gepflegte Liste waere am Tag des naechsten Demo-Feeds unvollstaendig.
    const quellen = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_demo_bilder_quellen'),
      FUNCTIONS.indexOf('function eb_hq_demo_bilder_holen'));
    expect(quellen).toMatch(/eb-demo-feed\.json/);
    expect(quellen).toMatch(/app\.js/);
    expect(quellen, 'die Adressen sind fest eingetippt').not.toMatch(/pexels\.com\/photos/);
  });

  test('die Zuordnung erreicht das Frontend', () => {
    expect(FUNCTIONS).toMatch(/'demoBilder'\s*=>[\s\S]{0,120}EB_DEMO_BILDER_OPTION/);
    expect(BASIS).toMatch(/ebDemoBilderUmschreiben/);
  });

  test('eine fehlende Zuordnung reicht unveraendert durch', () => {
    // Ein stillschweigend veraendertes Bild waere schlimmer als eines, das
    // weiterhin von aussen kommt.
    const fn = BASIS.slice(BASIS.indexOf('window.ebDemoBilderUmschreiben'),
      BASIS.indexOf('window.EB_IMG_LAZY_ATTR'));
    expect(fn).toMatch(/hasOwnProperty\.call\(map, v\)/);
    expect(fn, 'unbekannte Adresse wird nicht durchgereicht').toMatch(/return v;/);
  });

  test('umgeschrieben wird einmal beim Start, nicht bei jedem Rendern', () => {
    // 191 Bildausgaben je Seite — eine Ersetzung pro Ausgabe waere dieselbe
    // Arbeit 191-mal und bei jedem neuen Render-Ort vergessen.
    const letzte = fs.readFileSync(
      path.join(ROOT, 'js', 'modules', 'ui', '52-release-vision.js'), 'utf8');
    expect(letzte, 'die Umschreibung wird nie aufgerufen').toMatch(/ebDemoBilderUmschreiben\(LISTINGS\)/);
    // Und ein Fehlschlag darf die Seite nicht aufhalten.
    expect(letzte.slice(letzte.indexOf('ebDemoBilderUmschreiben')), 'ohne Absicherung')
      .toMatch(/catch\s*\(/);
  });
});

/* ── Der Knopf im HQ ───────────────────────────────────────────────────
   Die Route gab es seit #182, den Weg sie zu bedienen nicht. Geprueft wird
   der ausgefuehrte Code: der Block wird aus hq.html geschnitten und in
   einer leeren Seite mit gefaelschtem fetch wirklich laufen gelassen.
   Ein Textabgleich wuerde hier genau das verfehlen, worauf es ankommt —
   wann die Schleife aufhoert. */
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
const KNOPF_CODE = (() => {
  const marke = "const block = document.getElementById('demo-bilder-block');";
  const von = HQ.lastIndexOf('(function () {', HQ.indexOf(marke));
  const bis = HQ.indexOf('\n})();', von);
  return HQ.slice(von, bis + 6);
})();

const GERUEST = `
  <div id="demo-bilder-block" hidden>
    <div id="demo-bilder-badge">–</div>
    <div id="demo-bilder-stand"></div>
    <button id="demo-bilder-start">holen</button>
    <ul id="demo-bilder-fehler"></ul>
  </div>`;

/** Legt eine Seite mit gefaelschtem fetch an; `runden` sind die POST-Antworten. */
async function baueSeite(page, runden, admin = true) {
  await page.setContent('<!doctype html><meta charset="utf-8">' + GERUEST);
  await page.evaluate(([runden, admin]) => {
    window.HQ_IST_ADMIN = admin;
    window.HQ_REST_NONCE = 'test';
    window.__rufe = [];
    let i = 0;
    window.fetch = function (url, opt) {
      const methode = (opt && opt.method) || 'GET';
      window.__rufe.push(methode + ' ' + url);
      const d = methode === 'GET'
        ? { gefunden: 3, in_mediathek: 0, offen: 3, geholt: 0, fehler: [] }
        : runden[Math.min(i++, runden.length - 1)];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(d) });
    };
  }, [runden, admin]);
  await page.addScriptTag({ content: KNOPF_CODE });
}

test.describe('Demo-Bilder: der Knopf im HQ', () => {
  test('der Stand steht da, ohne dass man etwas anfasst', async ({ page }) => {
    await baueSeite(page, []);
    await expect.poll(() => page.evaluate(() => window.__rufe))
      .toEqual(['GET /wp-json/eventboerse/v1/hq/demo-bilder']);
    await expect(page.locator('#demo-bilder-stand')).toContainText('3 offen');
  });

  test('geholt wird, bis nichts mehr offen ist', async ({ page }) => {
    await baueSeite(page, [
      { gefunden: 3, in_mediathek: 1, offen: 2, geholt: 1, fehler: [] },
      { gefunden: 3, in_mediathek: 2, offen: 1, geholt: 1, fehler: [] },
      { gefunden: 3, in_mediathek: 3, offen: 0, geholt: 1, fehler: [] },
    ]);
    await page.click('#demo-bilder-start');
    await expect(page.locator('#demo-bilder-badge')).toHaveText('vollständig');
    const rufe = await page.evaluate(() => window.__rufe);
    // Ein GET beim Laden, drei POST — und danach keiner mehr.
    expect(rufe.filter(r => r.startsWith('POST')).length).toBe(3);
  });

  test('eine Runde ohne Fortschritt beendet den Lauf', async ({ page }) => {
    // Ohne diese Bedingung stoesst ein dauerhaft nicht erreichbarer
    // Fremdhost den Server zehnmal umsonst an — und die Oberflaeche
    // sieht dabei aus, als arbeite sie.
    await baueSeite(page, [
      { gefunden: 3, in_mediathek: 0, offen: 3, geholt: 0,
        fehler: [{ url: 'https://images.pexels.com/x.jpg', grund: 'HTTP 429' }] },
    ]);
    await page.click('#demo-bilder-start');
    await expect(page.locator('#demo-bilder-stand')).toContainText('keine Fortschritte');
    const rufe = await page.evaluate(() => window.__rufe);
    expect(rufe.filter(r => r.startsWith('POST')).length,
      'die Schleife laeuft trotz Stillstand weiter').toBe(1);
    // Und der Grund steht da, statt still verschluckt zu werden.
    await expect(page.locator('#demo-bilder-fehler')).toContainText('HTTP 429');
  });

  test('wer kein Administrator ist, sieht den Knopf nicht', async ({ page }) => {
    await baueSeite(page, [], false);
    expect(await page.locator('#demo-bilder-block').count()).toBe(0);
    // Und es wird auch nichts abgefragt.
    expect(await page.evaluate(() => window.__rufe)).toEqual([]);
  });
});
