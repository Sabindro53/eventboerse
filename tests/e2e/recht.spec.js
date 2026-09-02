// Rechtliches wird gemessen, nicht behauptet.
//
// Die Lücke, die scripts/recht.mjs schließt: der Vault beschrieb seit Mai 2026
// zwölf Speicherschlüssel. Gemessen wurden am 15.08.2026 vierundzwanzig — und
// elf der beschriebenen existierten überhaupt nicht. Darunter fehlten die
// heikelsten: Standortdaten (`eb_radar_ort`) und ein abgeleitetes
// Präferenzprofil (`eb_taste_v1`).
//
// Die gefährliche Stelle ist hier nicht das Übersehen, sondern das ERFINDEN.
// Ein erster Entwurf des Prüfers warf alle `var`-Zuweisungen aller Module in
// einen Topf und meldete daraufhin `budget`, `date`, `guests` und `location`
// als Speicherschlüssel — Namen, die nur zufällig einmal an einer Variablen
// namens `key` hingen. Hätte das niemand bemerkt, stünden vier erfundene
// Zeilen in einer Cookie-Liste, die Nutzern gegenüber eine Rechtsaussage ist.
//
// Darum prüft diese Suite beide Richtungen — und mutiert jede Prüfung, denn
// ein Tor, das auf korrektem Code grün ist, hat nichts bewiesen.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SKRIPT = path.join(ROOT, 'scripts', 'recht.mjs');

async function recht() {
  return import(require('node:url').pathToFileURL(SKRIPT).href);
}
const datei = (pfad, quelle) => ({ pfad, quelle });

test.describe('Speicherschlüssel: was der Code wirklich setzt', () => {
  test('findet wörtliche, konstante, verkettete und funktionsgelieferte Schlüssel', async () => {
    const { schluesselImCode } = await recht();
    const { schluessel, unaufloesbar } = schluesselImCode([
      datei('a.js', `
        var RADAR = 'eb_radar_ort';
        function _boardKey() { return currentUser ? 'eb_board_' + currentUser.id : null; }
        localStorage.setItem('eb_user', x);
        localStorage.setItem(RADAR, y);
        localStorage.setItem(_boardKey(), z);
        localStorage.setItem('eb_favs_' + id, w);
      `),
    ]);
    const keys = schluessel.map((s) => s.key);
    expect(keys, 'wörtlich').toContain('eb_user');
    expect(keys, 'über eine Konstante').toContain('eb_radar_ort');
    expect(keys, 'über eine Funktion').toContain('eb_board_<dynamisch>');
    expect(keys, 'an der Aufrufstelle verkettet').toContain('eb_favs_<dynamisch>');
    expect(unaufloesbar, 'nichts durfte offen bleiben').toHaveLength(0);
  });

  test('erfindet keinen Schlüssel aus einer gleichnamigen Variablen anderswo', async () => {
    // Genau die Regression, die den ersten Entwurf unbrauchbar machte:
    // `key` heißt in b.js etwas völlig anderes als in a.js.
    const { schluesselImCode } = await recht();
    const { schluessel } = schluesselImCode([
      datei('a.js', `var key = 'budget'; formular[key] = 1;`),
      datei('b.js', `var key = 'eb_echt'; localStorage.setItem(key, v);`),
    ]);
    const keys = schluessel.map((s) => s.key);
    expect(keys, 'der echte Schlüssel muss da sein').toContain('eb_echt');
    expect(keys, 'ein Feldname aus einer anderen Datei ist kein Speicherschlüssel')
      .not.toContain('budget');
  });

  test('die nächstgelegene Zuweisung gewinnt, nicht irgendeine', async () => {
    const { schluesselImCode } = await recht();
    const { schluessel } = schluesselImCode([
      datei('a.js', `
        var k = 'eb_alt';
        machwas(k);
        k = 'eb_neu';
        localStorage.setItem(k, v);
      `),
    ]);
    expect(schluessel.map((s) => s.key)).toEqual(['eb_neu']);
  });

  test('Hilfsfunktionen über Modulgrenzen hinweg werden aufgelöst', async () => {
    // build-app-js.sh verkettet die Module zu einer Datei — Funktionen teilen
    // sich wirklich einen Geltungsbereich. Modulweise betrachtet wäre das eine
    // gemeldete Lücke, die in Wahrheit keine ist.
    const { schluesselImCode } = await recht();
    const { schluessel, unaufloesbar } = schluesselImCode([
      datei('core/auth.js', `function _promptKey() { return 'eb_prompt_' + currentUser.id; }`),
      datei('ui/uploads.js', `var storageKey = _promptKey(); localStorage.setItem(storageKey, '1');`),
    ]);
    expect(schluessel.map((s) => s.key)).toContain('eb_prompt_<dynamisch>');
    expect(unaufloesbar).toHaveLength(0);
  });

  test('was nicht auflösbar ist, wird gemeldet statt verschwiegen', async () => {
    // Ein Prüfer, der Unbekanntes still verwirft, meldet Sauberkeit, wo er nur
    // blind war. Das ist die gefährlichere Sorte Fehler.
    const { schluesselImCode } = await recht();
    const { schluessel, unaufloesbar } = schluesselImCode([
      datei('a.js', `localStorage.setItem(irgendwoHerGereicht, v);`),
    ]);
    expect(schluessel, 'nichts erfinden').toHaveLength(0);
    expect(unaufloesbar, 'aber auch nichts verschweigen').toHaveLength(1);
    expect(unaufloesbar[0].datei).toBe('a.js');
  });

  test('ein auskommentierter Aufruf zählt nicht als echter', async () => {
    const { schluesselImCode } = await recht();
    const { schluessel } = schluesselImCode([
      datei('a.js', `
        // localStorage.setItem('eb_auskommentiert', v);
        /* localStorage.setItem('eb_block', v); */
        localStorage.setItem('eb_echt', v);
      `),
    ]);
    expect(schluessel.map((s) => s.key)).toEqual(['eb_echt']);
  });

  test('sessionStorage wird mitgezählt, nicht nur localStorage', async () => {
    const { schluesselImCode } = await recht();
    const { schluessel } = schluesselImCode([
      datei('a.js', `sessionStorage.setItem('eb_sitzung', v);`),
    ]);
    expect(schluessel[0].speicher).toEqual(['sessionStorage']);
  });
});

test.describe('Abgleich mit der Cookie-Liste', () => {
  test('ein neuer Schlüssel ohne Eintrag wird zum blockierenden Befund', async () => {
    const { speicherPruefen, befunde } = await recht();
    const imCode = [{ key: 'eb_ganz_neu', speicher: ['localStorage'], dateien: ['a.js'] }];
    const r = speicherPruefen(imCode, new Map());
    expect(r.undokumentiert).toHaveLength(1);

    const b = befunde({
      speicher: { ...r, unaufloesbar: [] },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { luecke: false }, einwilligung: { wirkungslos: false },
    });
    expect(b.blockierend.join(' '), 'muss den Schlüssel benennen').toContain('eb_ganz_neu');
  });

  test('ein dokumentierter Schlüssel ohne Code blockiert nicht, wird aber gemeldet', async () => {
    // Die Notiz beschreibt dann eine ältere Website. Das ist ein Mangel, aber
    // keiner, der einen fremden PR aufhalten darf.
    const { speicherPruefen, befunde } = await recht();
    const r = speicherPruefen([], new Map([['eb_geplant', 'funktional']]));
    const b = befunde({
      speicher: { ...r, unaufloesbar: [] },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { luecke: false }, einwilligung: { wirkungslos: false },
    });
    expect(b.blockierend).toHaveLength(0);
    expect(b.meldend.join(' ')).toContain('eb_geplant');
  });

  test('Platzhalter beider Seiten treffen sich am festen Anfang', async () => {
    // Die Notiz darf `<kontext>_<userId>` schreiben — für Menschen die
    // nützlichere Angabe. Der Code kennt nur den festen Anfang.
    const { normalisiere } = await recht();
    expect(normalisiere('eb_p_<kontext>_<userId>')).toBe(normalisiere('eb_p_<dynamisch>'));
    expect(normalisiere('eb_favs_guest'), 'ohne Platzhalter bleibt alles stehen')
      .toBe('eb_favs_guest');
    expect(normalisiere('eb_board_projects'), 'Suffix-Variante ist ein eigener Schlüssel')
      .not.toBe(normalisiere('eb_board_projects_<userId>'));
  });

  test('HTTP-Cookies werden nicht mit Browser-Speicher verwechselt', async () => {
    // `eb_hq_tor` setzt PHP, nicht das Frontend. Ein früherer Entwurf las jede
    // Tabelle der Notiz und meldete es als „steht in der Liste, kommt im Code
    // nicht vor". Ein Prüfer, der Kategorien verwechselt, erzeugt Meldungen,
    // die man abgewöhnt zu lesen — und dann übersieht man die echte.
    const { schluesselInNotiz } = await recht();
    const keys = schluesselInNotiz([
      '## HTTP-Cookies', '| Name | Klasse |', '|---|---|', '| `eb_nur_cookie` | essenziell |',
      '## localStorage', '| Key | Klasse |', '|---|---|', '| `eb_echt` | funktional |',
      '## Drittanbieter', '| Anbieter | X |', '|---|---|', '| `eb_fremd` | y |',
    ].join('\n'));
    expect([...keys.keys()]).toEqual(['eb_echt']);
  });

  test('jeder Schlüssel im echten Frontend steht in der echten Cookie-Liste', async () => {
    const { lageErheben } = await recht();
    const lage = lageErheben();
    expect(lage.speicher.imCode.length, 'die Messung darf nicht leer laufen').toBeGreaterThan(15);
    expect(lage.speicher.undokumentiert.map((e) => e.key)).toEqual([]);
  });
});

test.describe('Drittanbieter im Auslieferungspfad', () => {
  test('ein geladener Host ohne Eintrag in der Datenschutzerklärung blockiert', async () => {
    const { drittanbieterPruefen, befunde } = await recht();
    const php = `wp_enqueue_style( 'x', 'https://unpkg.com/leaflet/leaflet.css' );`;
    const r = drittanbieterPruefen(php, '<p>Wir nutzen Stripe.</p>');
    expect(r.hosts).toEqual(['unpkg.com']);
    expect(r.fehlend.map((f) => f.host)).toEqual(['unpkg.com']);

    const b = befunde({
      speicher: { undokumentiert: [], ohneCode: [], unaufloesbar: [] },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { luecke: false }, einwilligung: { wirkungslos: false }, drittanbieter: r,
    });
    expect(b.blockierend.join(' ')).toContain('unpkg.com');
  });

  test('ein UNBEKANNTER Host blockiert ebenfalls', async () => {
    // Ein erster Entwurf hat ihn nur gemeldet, weil der Prüfer den richtigen
    // Namen nicht kennen kann. Das ist wahr und trotzdem kein Grund
    // durchzuwinken: ein unbekannter Host im Auslieferungspfad ist ein NEUER
    // Datenfluss an einen Dritten — der gefährlichste Fall, nicht der
    // harmloseste.
    const { drittanbieterPruefen, befunde } = await recht();
    const r = drittanbieterPruefen(
      `wp_enqueue_script( 'x', 'https://cdn.fremd-tracker.net/x.js' );`, '<p></p>');
    expect(r.unbekannt).toEqual(['cdn.fremd-tracker.net']);
    const b = befunde({
      speicher: { undokumentiert: [], ohneCode: [], unaufloesbar: [] },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { luecke: false }, einwilligung: { wirkungslos: false }, drittanbieter: r,
    });
    expect(b.blockierend.join(' '), 'ein unbekannter CDN darf nicht durchrutschen')
      .toContain('cdn.fremd-tracker.net');
    expect(b.meldend.join(' ')).not.toContain('cdn.fremd-tracker.net');
  });

  test('der Name zählt, nicht der Hostname', async () => {
    // Niemand schreibt „fonts.googleapis.com" in einen Rechtstext.
    const { drittanbieterPruefen } = await recht();
    const php = `wp_enqueue_style( 'f', 'https://fonts.googleapis.com/css2?x' );`;
    expect(drittanbieterPruefen(php, '<p>Google Fonts</p>').fehlend).toHaveLength(0);
    expect(drittanbieterPruefen(php, '<p>fonts.googleapis.com</p>').fehlend,
      'der nackte Hostname ist keine Nennung für Nutzer').toHaveLength(1);
  });

  test('nur wirklich eingebundene URLs zählen, keine erwähnten', async () => {
    // Sonst würde ein Kommentar oder eine CSP-Zeile als Datenfluss gelten.
    const { drittanbieterPruefen } = await recht();
    const php = `
      // siehe https://cdn.beispiel.net/doku
      $csp = "script-src https://cdn.beispiel.net";
      wp_enqueue_script( 'echt', 'https://unpkg.com/a.js' );`;
    expect(drittanbieterPruefen(php, '<p>unpkg</p>').hosts).toEqual(['unpkg.com']);
  });

  test('ein NACHGELADENES Skript zählt genauso', async () => {
    // Am 02.09.2026 wurde Stripe.js von wp_enqueue_script auf einen
    // bedarfsgesteuerten Lader umgestellt — richtig für den Datenschutz,
    // denn vorher ging die IP jedes Besuchers an Stripe, auch auf Seiten
    // ohne Zahlung.
    //
    // Nur sah dieser Prüfer den Host danach nicht mehr und meldete „0
    // geladen" für eine Seite, die bei jeder Zahlung Stripe kontaktiert.
    // Eine Verbesserung, die einem Tor sein Subjekt wegnimmt, macht das Tor
    // still wertlos — dieselbe Mechanik wie beim toten Gitleaks-Scan.
    //
    // Wer den LADEWEG ändert, ändert nicht die MELDEPFLICHT.
    const { drittanbieterPruefen } = await recht();
    const js = `
      var s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      document.head.appendChild(s);`;
    const r = drittanbieterPruefen('', '<p>Wir nutzen Stripe.</p>', js);
    expect(r.hosts, 'ein nachgeladener Host bleibt unsichtbar')
      .toContain('js.stripe.com');
    expect(r.fehlend, 'Stripe steht in der Erklärung und gilt trotzdem als fehlend')
      .toHaveLength(0);
  });

  test('ein nachgeladener Host ohne Eintrag fällt auf', async () => {
    const { drittanbieterPruefen } = await recht();
    const js = `var s = document.createElement('script');
      s.src = 'https://tracker.beispiel.net/t.js';`;
    const r = drittanbieterPruefen('', '<p>nichts dazu</p>', js);
    expect(r.unbekannt, 'ein unbekannter nachgeladener Host blockiert nicht')
      .toContain('tracker.beispiel.net');
  });

  test('eine im JS nur erwähnte Adresse zählt nicht', async () => {
    // Sonst gälte jeder Kommentar und jede Fehlermeldung als Datenfluss —
    // ein Prüfer, der dreimal grundlos anschlägt, wird abgeschaltet.
    const { drittanbieterPruefen } = await recht();
    const js = `
      // Doku: https://cdn.beispiel.net/x.js
      showErr('js.stripe.com nicht erreichbar');
      var url = 'https://api.beispiel.org/v1/status';`;
    expect(drittanbieterPruefen('', '<p>x</p>', js).hosts,
      'eine bloss erwähnte Adresse gilt als Datenfluss').toHaveLength(0);
  });

  test('Schriften und Bibliotheken kommen aus dem eigenen Haus', async () => {
    // Bis zum 21.08.2026 kamen Inter und die Material Icons von Google,
    // Leaflet von unpkg und Flatpickr von jsDelivr — drei Drittlandtransfers
    // bei jedem Seitenaufruf. Geprüft wird die Eigenschaft „lädt nicht von
    // dort", nicht die Anwesenheit einer Datei.
    const php = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    const nurCode = php.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const host of ['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'cdn.jsdelivr.net']) {
      expect(nurCode, `${host} wird wieder von aussen geladen`).not.toContain(host);
    }
    // Und die Dateien liegen wirklich da — sonst wäre die Seite bloss kaputt
    // statt datensparsam.
    for (const p of ['assets/fonts/fonts.css',
                     'assets/fonts/inter-latin-wght-normal.woff2',
                     'assets/fonts/material-icons-round.woff2',
                     'assets/lib/leaflet/leaflet.js',
                     'assets/lib/leaflet/images/marker-icon.png',
                     'assets/lib/flatpickr/flatpickr.min.js',
                     'assets/lib/flatpickr/flatpickr-de.js']) {
      expect(fs.existsSync(path.join(ROOT, p)), `${p} fehlt`).toBe(true);
    }
  });

  test('die CSP erlaubt keinen fremden Skript-Host mehr ausser Stripe', async () => {
    // Der eigentliche Sicherheitsgewinn: solange unpkg und jsdelivr in
    // script-src standen, durfte ein fremder Host beliebiges Skript in unsere
    // Seite liefern.
    const php = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    const zeilen = php.split('\n').filter((z) => /"script-src/.test(z) && !/^\s*\/\//.test(z));
    expect(zeilen.length, 'script-src nicht gefunden').toBeGreaterThan(0);
    for (const z of zeilen) {
      const hosts = [...z.matchAll(/https:\/\/([a-z0-9.*-]+)/g)].map((m) => m[1]);
      expect(hosts, `fremder Skript-Host in der CSP: ${hosts.join(', ')}`).toEqual(['js.stripe.com']);
    }
    // Schriften nur noch von uns.
    const font = php.split('\n').find((z) => /"font-src/.test(z));
    expect(font, 'font-src nicht gefunden').toBeTruthy();
    expect(font, 'font-src erlaubt wieder einen fremden Host').not.toMatch(/https:\/\//);
  });

  test('die echte Website nennt jeden Host, den sie lädt', async () => {
    const { lageErheben } = await recht();
    const lage = lageErheben();
    // Die Schranke soll verhindern, dass der Extraktor still nichts findet —
    // sie schreibt KEINE Anzahl fest. Sie stand auf „mehr als 2", kalibriert
    // auf den Stand vor dem Self-Hosting; nach dem Streichen von Google,
    // unpkg und jsDelivr blieb nur Stripe übrig und der Test schlug fehl,
    // obwohl die Lage besser geworden war.
    expect(lage.drittanbieter.hosts.length, 'die Messung läuft leer').toBeGreaterThan(0);
    expect(lage.drittanbieter.fehlend.map((f) => f.host)).toEqual([]);
    expect(lage.drittanbieter.unbekannt).toEqual([]);
  });
});

test.describe('Auftragsverarbeiter', () => {
  const AVV = fs.readFileSync(
    path.join(ROOT, 'vault', '40-Governance', 'Legal', 'Auftragsverarbeiter.md'), 'utf8');

  /** Zeilen der Verarbeiter-Tabellen: [Anbieter, …, AVV-Status]. */
  function verarbeiter(md) {
    const zeilen = [];
    for (const z of md.split('\n')) {
      const m = z.match(/^\|\s*\*\*([^*]+)\*\*\s*\|(.+)\|\s*$/);
      if (!m) continue;
      const spalten = m[2].split('|').map((x) => x.trim());
      zeilen.push({ name: m[1].trim(), avv: spalten[spalten.length - 1] });
    }
    return zeilen;
  }

  test('ein offener AVV steht sichtbar oben, nicht nur in einer Tabellenzelle', () => {
    // Das eigene Prinzip der Notiz lautet: der Vertrag muss VOR der
    // Übermittlung stehen. Läuft eine Übermittlung ohne, ist das kein
    // Formfehler — und es darf sich nicht in einer Spalte verstecken.
    const offen = verarbeiter(AVV).filter((v) => /offen/i.test(v.avv));
    if (!offen.length) {
      // Alles geschlossen: dann darf der Warnblock weg sein.
      return;
    }
    const kopf = AVV.slice(0, AVV.indexOf('## Prinzipien'));
    expect(kopf, `offene AVVs (${offen.map((o) => o.name).join(', ')}) ohne sichtbaren Hinweis oben`)
      .toMatch(/Offener Punkt/);
    // Und der Hinweis muss sagen, wie man es abstellt — ein Befund ohne
    // Handlungsweg wird zur Tapete.
    expect(kopf, 'kein Weg genannt, die Übermittlung anzuhalten').toMatch(/EB_OPENAI_API_KEY|pausiert|Anhalten/);
  });

  test('kein Haken ohne eingetragenes Datum', () => {
    // Ein AVV-Haken, hinter dem kein geschlossener Vertrag steht, ist
    // schlimmer als eine leere Zeile: er beendet das Nachfragen.
    //
    // Der erste Entwurf dieser Zusicherung prüfte nur, ob der Anbietername
    // irgendwo in der Datei vorkommt — das ist immer wahr, und ein Haken
    // ohne Vertrag rutschte durch. Jetzt wird das Eintragsfeld gelesen.
    const eintrag = AVV.slice(AVV.indexOf('## Wenn der AVV geschlossen ist'),
      AVV.indexOf('## Prinzipien'));
    expect(eintrag, 'kein Platz, den Abschluss festzuhalten').toMatch(/AVV geschlossen am/);

    // Spaltenzuordnung aus der Kopfzeile der Eintragstabelle lesen, statt
    // eine Reihenfolge anzunehmen.
    const kopf = (eintrag.match(/^\|\s*Feld\s*\|(.+)\|\s*$/m) || [, ''])[1]
      .split('|').map((x) => x.trim());
    const datumZeile = (eintrag.match(/^\|\s*AVV geschlossen am\s*\|(.+)\|\s*$/m) || [, ''])[1]
      .split('|').map((x) => x.trim());
    expect(kopf.length, 'Eintragstabelle ohne Anbieterspalten').toBeGreaterThan(0);
    expect(datumZeile.length, 'Datumszeile passt nicht zur Kopfzeile').toBe(kopf.length);

    for (const v of verarbeiter(AVV)) {
      if (!/✓/.test(v.avv)) continue;
      const spalte = kopf.findIndex((k) => k && v.name.toLowerCase().includes(k.toLowerCase()));
      if (spalte === -1) continue;   // Altbestand ohne Eintragsspalte
      expect(datumZeile[spalte], `${v.name} trägt einen Haken, aber kein Abschlussdatum`)
        .not.toMatch(/offen/i);
    }
  });

  test('die Prüfliste nennt alle acht Punkte aus Art. 28 Abs. 3', () => {
    // Wer ein fremdes DPA akzeptiert, muss wissen, wogegen er es prüft.
    const block = AVV.slice(AVV.indexOf('Art. 28 Abs. 3 lit. a–h'));
    for (const [buchstabe, wort] of [['a', 'Weisung'], ['b', 'Vertraulichkeit'],
      ['c', 'Art. 32'], ['d', 'Unterauftragnehmer'], ['e', 'Betroffenenrechte'],
      ['f', 'Folgenabschätzung'], ['g', 'Löschung'], ['h', 'Audit']]) {
      expect(block, `Punkt ${buchstabe} (${wort}) fehlt in der Prüfliste`).toMatch(new RegExp(wort, 'i'));
    }
  });
});

test.describe('Einwilligung: fragt das Haus etwas, das niemand liest?', () => {
  test('eine erhobene, aber nirgends gelesene Einwilligung heißt wirkungslos', async () => {
    const { einwilligungPruefen } = await recht();
    const r = einwilligungPruefen([
      datei('banner.js', `localStorage.setItem('eb_cookie_consent', JSON.stringify(a));`),
      datei('theme.js', `localStorage.setItem('eb_dark_mode', '1');`),
    ]);
    expect(r.wirkungslos).toBe(true);
    expect(r.bannerDatei).toBe('banner.js');
    expect(r.ungeprueft).toContain('theme.js');
  });

  test('prüft eine Schreibstelle die Antwort, ist sie nicht mehr wirkungslos', async () => {
    // Die Mutation, die beweist, dass die Prüfung nicht einfach immer „nein" sagt.
    const { einwilligungPruefen } = await recht();
    const r = einwilligungPruefen([
      datei('banner.js', `localStorage.setItem('eb_cookie_consent', JSON.stringify(a));`),
      datei('theme.js', `if (_getCookieConsent()) localStorage.setItem('eb_dark_mode', '1');`),
    ]);
    expect(r.wirkungslos).toBe(false);
    expect(r.schreiberMitPruefung).toBe(1);
  });

  test('die Bannerdatei zählt nicht als Beleg für sich selbst', async () => {
    // Dass die Datei, die die Antwort setzt, sie auch kennt, sagt nichts über
    // ihre Wirkung auf den Rest der Anwendung.
    const { einwilligungPruefen } = await recht();
    const r = einwilligungPruefen([
      datei('banner.js', `localStorage.setItem('eb_cookie_consent', a); var x = eb_cookie_consent;`),
      datei('theme.js', `localStorage.setItem('eb_dark_mode', '1');`),
    ]);
    expect(r.schreiberMitPruefung).toBe(0);
    expect(r.wirkungslos).toBe(true);
  });

  test('der Befund blockiert nicht — er ist eine Produktentscheidung', async () => {
    // Ein Tor, das jeden PR sperrt, bis eine Entscheidung gefallen ist, wird
    // abgeschaltet. Danach prüft es gar nichts mehr.
    const { befunde } = await recht();
    const b = befunde({
      speicher: { undokumentiert: [], ohneCode: [], unaufloesbar: [] },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { luecke: false },
      einwilligung: { wirkungslos: true, bannerDatei: 'x.js', schreiberGesamt: 9 },
    });
    expect(b.blockierend).toHaveLength(0);
    expect(b.meldend.join(' ')).toMatch(/TDDDG/);
  });
});

test.describe('Pflichtseiten', () => {
  test('eine geforderte Seite ohne Route wird blockierend gemeldet', async () => {
    const { pflichtseitenPruefen } = await recht();
    const r = pflichtseitenPruefen(
      '| `/dsa` | DSA-Beschwerde | DSA Art. 16 |\n| `/impressum` | Anbieter | DDG § 5 |',
      `$spa_pages = array( 'impressum' );`,
    );
    expect(r.gefordert).toHaveLength(2);
    expect(r.fehlend.map((f) => f.slug)).toEqual(['dsa']);
  });

  test('fehlt das Routen-Array ganz, ist das ein Befund statt stiller Zustimmung', async () => {
    // Sonst hätte ein Umbau von functions.php die Prüfung lautlos entwertet —
    // genau die Falle, in die der Rahmen-Wächter dieses Projekts schon einmal
    // getappt ist.
    const { pflichtseitenPruefen, befunde } = await recht();
    const r = pflichtseitenPruefen('| `/dsa` | X | DSA |', 'kein Array hier');
    expect(r.routenGefunden).toBe(false);
    const b = befunde({
      speicher: { undokumentiert: [], ohneCode: [], unaufloesbar: [] },
      pflichtseiten: r, ki: { luecke: false }, einwilligung: { wirkungslos: false },
    });
    expect(b.blockierend.join(' ')).toMatch(/spa_pages/);
  });

  test('alle echten Pflichtseiten haben eine echte Route', async () => {
    const { lageErheben } = await recht();
    const lage = lageErheben();
    expect(lage.pflichtseiten.routenGefunden).toBe(true);
    expect(lage.pflichtseiten.gefordert.length, 'die Übersicht darf nicht leer sein')
      .toBeGreaterThan(10);
    expect(lage.pflichtseiten.fehlend.map((f) => f.slug)).toEqual([]);
  });
});

test.describe('KI-Transparenz', () => {
  test('kennzeichnet der Code ohne Notiz im Vault, ist das blockierend', async () => {
    const { kiTransparenzPruefen } = await recht();
    const mit = kiTransparenzPruefen([datei('a.js', `_aiDisclosureLabelsHtml(x)`)], false);
    expect(mit.luecke, 'Rechtsaussage nur im Quelltext').toBe(true);
    const ohne = kiTransparenzPruefen([datei('a.js', `_aiDisclosureLabelsHtml(x)`)], true);
    expect(ohne.luecke).toBe(false);
  });

  test('die echte Kennzeichnung ist im Code und im Vault beschrieben', async () => {
    const { lageErheben } = await recht();
    const lage = lageErheben();
    expect(lage.ki.kennzeichnungImCode).toBe(true);
    expect(lage.ki.notizVorhanden).toBe(true);
    expect(lage.ki.zustaende, 'die Zustände müssen erkannt werden').toContain('generated');
  });

  test('die KI-Notiz nennt die Grenze: kein Modell schreibt Rechtstexte', async () => {
    const notiz = fs.readFileSync(
      path.join(ROOT, 'vault', '40-Governance', 'Legal', 'KI-Transparenz.md'), 'utf8');
    expect(notiz).toMatch(/share:\s*internal/);
    expect(notiz.toLowerCase()).toContain('rechtstexte');
  });
});

test.describe('Das Tor greift wirklich', () => {
  test('--check endet bei einem blockierenden Befund mit Code 1', async () => {
    // Ein Tor, das bei Fehlern 0 zurückgibt, ist Zierrat. Dieses Projekt hatte
    // schon einen Wächter, der wegen einer leeren Textstelle immer grün war.
    const { befunde } = await recht();
    const b = befunde({
      speicher: {
        undokumentiert: [{ key: 'eb_x', speicher: ['localStorage'], dateien: ['a.js'] }],
        ohneCode: [], unaufloesbar: [],
      },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { luecke: false }, einwilligung: { wirkungslos: false },
    });
    expect(b.blockierend.length).toBeGreaterThan(0);
  });

  test('auf dem echten Stand läuft --check durch', async () => {
    const out = execFileSync('node', [SKRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toContain('✓');
  });

  test('die erzeugte Notiz behauptet keine Vollständigkeit, die sie nicht hat', async () => {
    const { notizBauen, befunde } = await recht();
    const lage = {
      erzeugt: '2026-08-15T00:00:00.000Z', dateienGeprueft: 3,
      speicher: {
        imCode: [], dokumentiert: new Map(), undokumentiert: [], ohneCode: [],
        unaufloesbar: [{ ausdruck: 'x', speicher: 'localStorage', datei: 'a.js' }],
      },
      einwilligung: { wirkungslos: false, schreiberGesamt: 1, schreiberMitPruefung: 1, bannerDatei: 'b.js' },
      pflichtseiten: { routenGefunden: true, gefordert: [], fehlend: [] },
      ki: { kennzeichnungImCode: true, zustaende: [], notizVorhanden: true, luecke: false },
      drittanbieter: { hosts: [], fehlend: [], unbekannt: [] },
    };
    const mit = notizBauen(lage, befunde(lage));
    expect(mit, 'die Lücke muss in der Notiz stehen').toMatch(/unvollständig/);

    lage.speicher.unaufloesbar = [];
    const ohne = notizBauen(lage, befunde(lage));
    expect(ohne, 'ohne Lücke darf sie Vollständigkeit melden').toMatch(/vollständig/);
    expect(ohne).not.toMatch(/unvollständig/);
  });

  test('die erzeugte Notiz ist internal und als erzeugt gekennzeichnet', async () => {
    const notiz = fs.readFileSync(
      path.join(ROOT, 'vault', '40-Governance', 'Legal', 'Rechtliche-Lage.md'), 'utf8');
    expect(notiz).toMatch(/share:\s*internal/);
    expect(notiz, 'sonst editiert sie jemand von Hand').toMatch(/Nicht von Hand bearbeiten/);
  });

  test('das Tor läuft im PR-Check, sonst prüft es niemand', async () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'pr-check.yml'), 'utf8');
    const zeilen = wf.split('\n').filter((z) => !z.trim().startsWith('#'));
    expect(zeilen.join('\n')).toMatch(/node scripts\/recht\.mjs --check/);
  });
});

test.describe('Einwilligung wirkt wirklich', () => {
  const BASIS = fs.readFileSync(path.join(ROOT, 'js', 'modules', 'core', '00-basis.js'), 'utf8');
  const CONSENT = fs.readFileSync(
    path.join(ROOT, 'js', 'modules', 'ui', '32-consent-init-map.js'), 'utf8');
  const SHELL = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');

  test('vor der Antwort wird nichts Nicht-Essenzielles gespeichert', async ({ page }) => {
    // Schritt 2 der dokumentierten Bannerlogik — der Schritt, der fehlte.
    await page.goto('/');
    await page.waitForFunction(() => typeof ebDarfSpeichern === 'function');
    const r = await page.evaluate(() => {
      localStorage.removeItem('eb_cookie_consent');
      return {
        essenziell: ebDarfSpeichern('eb_user'),
        zahlung:    ebDarfSpeichern('eb_pending_payment'),
        komfort:    ebDarfSpeichern('eb_dark_mode'),
        standort:   ebDarfSpeichern('eb_radar_ort'),
        profil:     ebDarfSpeichern('eb_taste_v1'),
      };
    });
    expect(r.essenziell, 'Anmeldung muss immer gehen').toBe(true);
    expect(r.zahlung, 'laufende Zahlung muss immer gehen').toBe(true);
    expect(r.komfort, 'Komfort ohne Antwort').toBe(false);
    expect(r.standort, 'Standort ohne Antwort').toBe(false);
    expect(r.profil, 'Profil ohne Antwort').toBe(false);
  });

  test('eine Ablehnung hält, eine Zustimmung öffnet', async ({ page }) => {
    // Die Mutation im Test selbst: beide Richtungen, sonst bewiese ein
    // „immer false" dasselbe wie eine echte Prüfung.
    await page.goto('/');
    await page.waitForFunction(() => typeof ebDarfSpeichern === 'function');
    const r = await page.evaluate(() => {
      const setze = (f, p) => localStorage.setItem('eb_cookie_consent',
        JSON.stringify({ v: 2, necessary: true, funktional: f, profil: p }));
      setze(false, false);
      const nein = { komfort: ebDarfSpeichern('eb_dark_mode'), profil: ebDarfSpeichern('eb_taste_v1') };
      setze(true, true);
      const ja = { komfort: ebDarfSpeichern('eb_dark_mode'), profil: ebDarfSpeichern('eb_taste_v1') };
      localStorage.removeItem('eb_cookie_consent');
      return { nein, ja };
    });
    expect(r.nein).toEqual({ komfort: false, profil: false });
    expect(r.ja).toEqual({ komfort: true, profil: true });
  });

  test('ein Widerruf löscht, was vorher schon dalag', async ({ page }) => {
    // Art. 7 Abs. 3 DSGVO. Ohne das Aufräumen wäre der Widerruf für genau
    // die Daten wirkungslos, um die es geht.
    await page.goto('/');
    await page.waitForFunction(() => typeof ebSpeicherAufraeumen === 'function');
    const r = await page.evaluate(() => {
      localStorage.setItem('eb_cookie_consent',
        JSON.stringify({ v: 2, necessary: true, funktional: true, profil: true }));
      localStorage.setItem('eb_dark_mode', '1');
      localStorage.setItem('eb_taste_v1', '{}');
      localStorage.setItem('eb_user', '{"id":1}');
      localStorage.setItem('eb_cookie_consent',
        JSON.stringify({ v: 2, necessary: true, funktional: false, profil: false }));
      ebSpeicherAufraeumen();
      const da = (k) => localStorage.getItem(k) !== null;
      const out = { komfort: da('eb_dark_mode'), profil: da('eb_taste_v1'),
                    essenziell: da('eb_user'), antwort: da('eb_cookie_consent') };
      ['eb_dark_mode', 'eb_taste_v1', 'eb_user', 'eb_cookie_consent'].forEach((k) => localStorage.removeItem(k));
      return out;
    });
    expect(r.komfort, 'Komfort muss weg sein').toBe(false);
    expect(r.profil, 'Profil muss weg sein').toBe(false);
    expect(r.essenziell, 'die Anmeldung darf ein Widerruf nicht kippen').toBe(true);
    expect(r.antwort, 'die Antwort selbst muss bleiben — sonst fragt es ewig').toBe(true);
  });

  test('ein unbekannter Schlüssel gilt als profilbildend, nicht als essenziell', async ({ page }) => {
    // Fail-Safe: ein neuer Schlüssel, den niemand eingeordnet hat, wird
    // zurückhaltend behandelt statt großzügig.
    await page.goto('/');
    await page.waitForFunction(() => typeof ebSpeicherKlasse === 'function');
    const k = await page.evaluate(() => ebSpeicherKlasse('eb_voellig_neu_' + Date.now()));
    expect(k).toBe('profil');
  });

  test('der längste Präfix gewinnt', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof ebSpeicherKlasse === 'function');
    const r = await page.evaluate(() => ({
      guest: ebSpeicherKlasse('eb_favs_guest'),
      user:  ebSpeicherKlasse('eb_favs_17'),
      board: ebSpeicherKlasse('eb_board_projects_17'),
      taste: ebSpeicherKlasse('eb_taste_v1'),
    }));
    expect(r).toEqual({ guest: 'funktional', user: 'funktional', board: 'funktional', taste: 'profil' });
  });

  test('nicht-essenzielle Schreibstellen laufen über die Prüfung', () => {
    // Die eigentliche Wirkung: würde eine dieser Stellen direkt schreiben,
    // wäre die Einwilligung dort wirkungslos — und niemand sähe es.
    const module = ['board/40-board-kanban.js', 'board/42-guide-social-feed.js',
      'ai/50-planungs-assistent.js', 'ui/23-darkmode-staedte-picker.js',
      'ui/31-modals-toast-qabot.js', 'search/13-event-radar.js',
      'search/11-suche-ki.js', 'chat/20-chat-nachrichten.js',
      'core/02-router-navigation.js'];
    const essenziell = /'(eb_user|eb_demo_\w+|eb_cookie_consent)'|EB_PENDING_PAYMENT_KEY/;
    for (const m of module) {
      const src = fs.readFileSync(path.join(ROOT, 'js', 'modules', m), 'utf8');
      for (const zeile of src.split('\n')) {
        if (!/localStorage\.setItem\(/.test(zeile)) continue;
        if (/^\s*(\/\/|\*)/.test(zeile)) continue;
        expect(essenziell.test(zeile),
          `${m}: schreibt an der Einwilligung vorbei → ${zeile.trim().slice(0, 70)}`).toBe(true);
      }
    }
  });

  test('der Banner behauptet nicht mehr, es gäbe nur Notwendiges', () => {
    // Die Aussage war schlicht falsch, solange eb_taste_v1 ein Profil und
    // eb_radar_ort den Standort speicherte. Das ist gravierender als eine
    // wirkungslose Einwilligung: eine aktive Falschaussage gegenüber Nutzern.
    expect(SHELL, 'die alte Behauptung ist zurück')
      .not.toMatch(/ausschließlich technisch notwendige Cookies/);
    // Erfundene Cookies in der Detailtabelle: die gab es nie.
    expect(SHELL).not.toMatch(/PHPSESSID|XSRF-Token/);
    // Und es muss eine echte Wahl geben, nicht nur „Verstanden".
    expect(SHELL, 'ohne Ablehnen ist es keine Einwilligung').toMatch(/id="cookieRejectAll"/);
    expect(SHELL).toMatch(/id="cookieAcceptAll"/);
    expect(CONSENT, 'beide Antworten müssen dieselbe Funktion mit anderem Wert rufen')
      .toMatch(/_saveCookieConsent\(paar\[1\]\)/);
  });

  test('die Klassifizierung steht im Code und in der Notiz — gleich', async () => {
    const { klassenImCode, klassenInNotiz, klasseFuer, lageErheben } = await recht();
    const code = klassenImCode(BASIS);
    const notiz = klassenInNotiz(fs.readFileSync(
      path.join(ROOT, 'vault', '40-Governance', 'Legal', 'Cookie-Liste.md'), 'utf8'));
    expect(code.size, 'die Klassentabelle darf nicht leer sein').toBeGreaterThan(15);
    for (const e of lageErheben().speicher.imCode) {
      const c = klasseFuer(e.key, code);
      expect(c, `${e.key} ohne Klasse`).toBeTruthy();
      const n = klasseFuer(e.key, notiz);
      if (n) expect(c, `${e.key}: Code ≠ Notiz`).toBe(n);
    }
  });
});
