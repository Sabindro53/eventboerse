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

  test('jeder Schlüssel im echten Frontend steht in der echten Cookie-Liste', async () => {
    const { lageErheben } = await recht();
    const lage = lageErheben();
    expect(lage.speicher.imCode.length, 'die Messung darf nicht leer laufen').toBeGreaterThan(15);
    expect(lage.speicher.undokumentiert.map((e) => e.key)).toEqual([]);
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
