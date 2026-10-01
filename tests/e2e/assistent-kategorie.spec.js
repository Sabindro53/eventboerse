// ════════════════════════════════════════════════════════════════════════
// Der Assistent gibt die Kategorie an die Suche weiter
//
// Gemeldet am 01.10.2026: „wenn ich dj suche, und über die Verlinkung Suche
// gehe dann sollen dj Erscheinen". Nachgemessen war die Kette an ZWEI
// Stellen durchtrennt — der Assistent gab nichts mit
// (`onclick="navigateTo('browse')"`, ohne Argument), und die Suche hätte
// nichts annehmen können (`case 'browse':` las `data` gar nicht).
//
// Dazu lagen VIER gepflegte Fassungen derselben Zuordnung im Projekt:
// `AI_CATEGORIES` (10 Chips der Suche), `_AI_CATS` (8 Knöpfe des
// Assistenten — `pyro` und `planung` fehlten), `_aiCatFromText` (8 Ausdrücke)
// und `_GUIDE_CAT_RULES` (10 Ausdrücke). Die beiden Erkenner waren NICHT
// ineinander enthalten: am Korpus gemessen 32/45 gegen 35/45, jeder verfehlte
// etwas, das der andere kannte.
//
// Gemessen wird deshalb die BEDINGUNG, nicht der Einzelfall: eine Zuordnung,
// ein Satz Keys, und der Weg wird geklickt statt im Markup gesucht.
//
// ── Nachtrag vom selben Tag: es waren NEUN, nicht vier ─────────────────
//
// Am Abend desselben Tages standen noch zwei weitere Fassungen in
// `search/11-suche-ki.js`, beide ÜBER der autoritativen Tabelle und
// deshalb beim ersten Durchgang nicht mitgezählt:
//
//   `_EB_CAT_GRAMMAR`    11 Einträge, eigenes Muster je Kategorie
//   `EB_KATEGORIE_ICON`  11 Einträge, reine Kopie der Icon-Spalte
//
// Der elfte war in BEIDEN `wellness` — eine Kategorie, die kein Inserat
// tragen kann, weil `#createCategory` sie nicht anbietet. Wer „massage"
// tippte, bekam den fertigen Satz „Ich suche ein Wellness-Angebot für meine
// Hochzeit in Köln" und danach garantiert null Treffer; und
// `_ebTasteBump('cats', …)` schrieb den Schlüssel ins Geschmacksprofil, von
// wo aus er die Vorgabe für JEDE weitere Vervollständigung war.
//
// Die achte Fassung trug ausserdem BEIDE Fehler, die am Vormittag an den
// anderen behoben wurden — `pyrotechnik` → licht und der unverankerte
// `/r[äa]um/`. Am erweiterten Korpus gemessen:
//
//   achte Fassung    49/64 Treffer · 1 Fehlalarm
//   AI_CATEGORIES    48/64 Treffer · 0 Fehlalarme
//   zusammengeführt  64/64 Treffer · 0 Fehlalarme
//
// Wieder nicht ineinander enthalten. Der Korpus steht deshalb NUR hier:
// ein zweiter wäre die zehnte Fassung.
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { openApp, warteAufAppBereit } = require('./helpers');
const { ohneJsKommentare } = require('./lib/js-code');

const MODULE = path.join(__dirname, '..', '..', 'js', 'modules');

// Was ein Planer wirklich tippt → welche Kategorie gemeint ist.
const TREFFER = [
  ['dj', 'dj'], ['ich suche einen DJ', 'dj'], ['brauche Musik für die Party', 'dj'],
  ['live band gesucht', 'dj'], ['wer macht das line-up', 'dj'], ['playlist', 'dj'],
  ['catering', 'catering'], ['wer macht das Essen', 'catering'],
  ['buffet für 80 Gäste', 'catering'], ['menü', 'catering'], ['getränke', 'catering'],
  ['torte', 'catering'],
  ['fotograf', 'foto'], ['fotos vom Abend', 'foto'], ['kamera', 'foto'],
  ['videograf', 'foto'], ['video', 'foto'],
  ['florist', 'florist'], ['blumen', 'florist'], ['brautstrauß', 'florist'],
  ['location', 'location'], ['saal', 'location'], ['halle', 'location'],
  ['räume für 100 Leute', 'location'], ['brauche einen Raum', 'location'],
  ['schloss', 'location'], ['venue', 'location'], ['gelände', 'location'],
  ['meetingraum', 'location'],
  ['licht', 'licht'], ['technik', 'licht'], ['ton', 'licht'], ['bühne', 'licht'],
  ['strom', 'licht'], ['livestream', 'licht'],
  ['feuerwerk', 'pyro'], ['pyrotechnik', 'pyro'],
  ['koordinator', 'planung'], ['planer', 'planung'], ['komplettplanung', 'planung'],
  ['moderation', 'moderation'], ['moderator', 'moderation'], ['sprecher', 'moderation'],
  ['deko', 'deko'], ['dekoration', 'deko'],

  // ── Das Vokabular, das bis zum 01.10.2026 NUR die achte Fassung kannte ──
  // Keines davon war an der Oberfläche erreichbar: `_EB_CAT_GRAMMAR` steuerte
  // allein die Vervollständigung, und die autoritative Tabelle hat diese
  // Wörter nie gesehen. Sie stehen jetzt dort, und das hier ist der Nachweis.
  ['wer kann beats auflegen', 'dj'], ['jemand zum auflegen gesucht', 'dj'],
  ['wir brauchen einen Koch', 'catering'], ['foodtruck für das Sommerfest', 'catering'],
  ['food truck', 'catering'],
  ['blumendeko für die Tische', 'florist'],
  ['tischdeko', 'deko'], ['ballons für den Kindergeburtstag', 'deko'],
  ['funken', 'pyro'],
  ['wer macht den sound', 'licht'],
  ['wer übernimmt die organisation', 'planung'],
  ['wedding planner gesucht', 'planung'], ['eventplanung', 'planung'],
  ['wir brauchen einen redner', 'moderation'], ['wer ist der host', 'moderation'],
  ['scheune für die Feier', 'location'], ['bauernhof als Location', 'location'],
  ['gutshof', 'location'],

  // ── Reihenfolge-Beweise: zwei Muster könnten greifen, eines muss ───────
  // „Beschallung für den Saal" nennt Technik UND Ort. `licht` steht vor
  // `location`, also gewinnt die Technik — vor dem 01.10.2026 ergab derselbe
  // Satz in BEIDEN Fassungen `location`.
  ['beschallung für den Saal', 'licht'],
  // „die Lichter funkeln" — `funken` darf „funkeln" nicht treffen, sonst
  // wäre das ein Feuerwerk (`pyro` steht vor `licht`). Deshalb `funken`
  // und nicht `funke`.
  ['die Lichter funkeln so schön', 'licht'],
];

// Darf KEINE Kategorie ergeben. Ein Fehlalarm ist hier die teurere Hälfte:
// der Assistent beantwortet dann eine Frage, die niemand gestellt hat.
// „wer hilft beim aufräumen" traf vor dem 01.10.2026 `location`, weil der
// Ausdruck `/räum/` unverankert war — jetzt hält `\br[äa]um` den Wortanfang.
const DURCHLASS = [
  'hallo', 'danke', 'was kostet die Nutzung', 'wie viele Tage noch',
  'status', 'übersicht', 'was fehlt noch', 'hilfe',
  'wer hilft beim aufräumen', 'ich plane eine Hochzeit',
  'mein budget ist 5000 euro', 'wie funktioniert die Buchung',
  // Dazugekommen mit der Zusammenführung vom 01.10.2026 — jeder Satz ist
  // die Begründung dafür, dass ein Wort der achten Fassung DRAUSSEN blieb:
  'wir treffen uns am Bahnhof',   // bares `hof` hätte „Bahnhof" getroffen
  'technische Ausstattung',       // `ausstattung` in deko hätte licht geschlagen
  'was ist mit dem Filmabend',    // `film` in foto hätte den Event-Typ getroffen
  'wie funktioniert der Chat',    // `funken` darf „funktioniert" nicht treffen
  // `\bhost\b` statt `host`: ohne die Wortgrenze wäre eine Hostess ein
  // Moderator. Dieser Satz ist dazugekommen, WEIL die Mutation „host ohne
  // Wortgrenze" ohne ihn überlebte — die Zusicherung hatte kein Subjekt.
  'die Hostess am Eingang',
];

/** Die zehn Keys, die ein Anbieter im Formular wirklich wählen kann. */
function keysAusFormular() {
  const shell = fs.readFileSync(path.join(__dirname, '..', '..', 'app-shell.html'), 'utf8');
  const i = shell.indexOf('id="createCategory"');
  expect(i, '#createCategory muss es in der Shell geben').toBeGreaterThan(-1);
  const block = shell.slice(i, shell.indexOf('</select>', i));
  return [...block.matchAll(/<option\s+value="([a-z]+)"/g)].map((m) => m[1]).filter((v) => v);
}

async function assistentOeffnen(page) {
  await page.evaluate(() => window.navigateTo('board'));
  await page.waitForFunction(() => !!document.querySelector('[data-planning-action="assistant"]'), null, { timeout: 15000 });
  await page.evaluate(() => document.querySelector('[data-planning-action="assistant"]').click());
  await page.waitForSelector('#baiChat', { state: 'attached', timeout: 15000 });
}

test.describe('Eine Kategorientabelle', () => {
  test('die Chips der Suche sind genau das, was ein Anbieter wählen kann', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const chips = await page.evaluate(() => AI_CATEGORIES.map((c) => c.key));
    // Nicht „mindestens" und nicht „höchstens": GENAU. Ein Chip ohne
    // Formular-Gegenstück filtert auf eine Kategorie, die kein Inserat
    // tragen kann; ein Formularwert ohne Chip ist unsuchbar.
    expect(chips.slice().sort()).toEqual(keysAusFormular().slice().sort());
    expect(chips.length).toBe(10);
  });

  test('Assistent und Suche führen dieselben Keys — keine zweite Liste', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const r = await page.evaluate(() => ({
      chips: AI_CATEGORIES.map((c) => c.key),
      knoepfe: _AI_CATS.map((c) => c.key),
      regeln: _GUIDE_CAT_RULES.map((p) => p[1]),
    }));
    // Vor dem 01.10.2026: 10 Chips, 8 Knöpfe. Nach Pyrotechnik zu fragen war
    // im Assistenten unmöglich, während die Suche daneben einen Chip anbot.
    expect(r.knoepfe).toEqual(r.chips);
    expect(r.regeln).toEqual(r.chips);
  });

  test('die abgeleiteten Listen sind wirklich abgeleitet, nicht abgeschrieben', () => {
    // Gemessen wird die ABLEITUNG, nicht ihre Schreibweise: eine Kopie, die
    // zufällig dieselben zehn Keys führt, besteht den Test darüber — bis
    // jemand einen elften hinzufügt. Kommentare werden abgezogen; die
    // Erklärung daneben nennt `AI_CATEGORIES` mehrfach.
    for (const [rel, name] of [
      ['ai/50-planungs-assistent.js', '_AI_CATS'],
      ['board/42-guide-social-feed.js', '_GUIDE_CAT_RULES'],
    ]) {
      const code = ohneJsKommentare(fs.readFileSync(path.join(MODULE, rel), 'utf8'));
      const zeile = new RegExp('var\\s+' + name + '\\s*=([\\s\\S]{0,400}?);', 'm').exec(code);
      expect(zeile, `${name} muss in ${rel} definiert sein`).not.toBeNull();
      expect(zeile[1], `${name} muss aus AI_CATEGORIES entstehen`).toContain('AI_CATEGORIES');
    }
  });

  test('kein typeof-Schutz auf der const-Tabelle', () => {
    // `AI_CATEGORIES` ist `const`. `typeof` auf eine Variable in der TDZ
    // WIRFT, statt 'undefined' zu liefern — ein Schutz, der im Ernstfall
    // nicht greift, ist schlimmer als keiner, weil er einen vortäuscht.
    // Bricht die Reihenfolge in `modules.list`, soll app.js laut scheitern.
    for (const rel of ['ai/50-planungs-assistent.js', 'board/42-guide-social-feed.js']) {
      const code = ohneJsKommentare(fs.readFileSync(path.join(MODULE, rel), 'utf8'));
      expect(code, rel).not.toMatch(/typeof\s+AI_CATEGORIES/);
    }
  });

  test('search/11 lädt vor board/42 und ai/50', () => {
    const liste = fs.readFileSync(path.join(MODULE, 'modules.list'), 'utf8')
      .split('\n').map((z) => z.trim()).filter((z) => z && !z.startsWith('#'));
    const i = (n) => liste.indexOf(n);
    expect(i('search/11-suche-ki.js')).toBeGreaterThan(-1);
    expect(i('search/11-suche-ki.js')).toBeLessThan(i('board/42-guide-social-feed.js'));
    expect(i('search/11-suche-ki.js')).toBeLessThan(i('ai/50-planungs-assistent.js'));
  });
});

test.describe('Text → Kategorie', () => {
  test('beide Erkenner treffen den ganzen Korpus', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const r = await page.evaluate(([treffer]) => {
      const fehlerText = [], fehlerGuide = [], fehlerSuche = [];
      treffer.forEach(([satz, soll]) => {
        const a = _aiCatFromText(String(satz).toLowerCase());
        if (a !== soll) fehlerText.push(`${satz} → ${a} (soll ${soll})`);
        const g = _guideCategoryFor(satz);
        if (g !== soll) fehlerGuide.push(`${satz} → ${g} (soll ${soll})`);
        // Der DRITTE Erkenner. Er hatte bis zum 01.10.2026 eine eigene
        // Schleife über eine eigene Tabelle und wurde hier nie gemessen.
        const s = _ebGuessCategory(satz);
        if (s !== soll) fehlerSuche.push(`${satz} → ${s} (soll ${soll})`);
      });
      return { fehlerText, fehlerGuide, fehlerSuche };
    }, [TREFFER]);
    // Vorher: 32/45 im Assistenten, 35/45 am Inserat. „getränke", „torte",
    // „venue", „gelände", „strom", „livestream", „feuerwerk", „koordinator"
    // liefen im Assistenten ins Leere.
    expect(r.fehlerText, 'getippter Text').toEqual([]);
    expect(r.fehlerGuide, 'Inseratstext').toEqual([]);
    // Vorher 49/64 — und zwar mit „pyrotechnik" → licht und einem Fehlalarm.
    expect(r.fehlerSuche, 'Vervollständigung der Suche').toEqual([]);
  });

  test('keine Fehlalarme — eine harmlose Frage bleibt ohne Kategorie', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const falsch = await page.evaluate(([durchlass]) => {
      const out = [];
      durchlass.forEach((satz) => {
        const a = _aiCatFromText(String(satz).toLowerCase());
        if (a) out.push(`_aiCatFromText: ${satz} → ${a}`);
        const g = _guideCategoryFor(satz);
        if (g) out.push(`_guideCategoryFor: ${satz} → ${g}`);
        const s = _ebGuessCategory(satz);
        if (s) out.push(`_ebGuessCategory: ${satz} → ${s}`);
      });
      return out;
    }, [DURCHLASS]);
    expect(falsch).toEqual([]);
  });

  test('„pyrotechnik" ist Pyrotechnik, nicht Technik', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Die Reihenfolge der Tabelle IST die Logik: „pyrotechnik" enthält
    // „technik". Vor dem 01.10.2026 gewann `licht` in beiden Erkennern.
    // Dieser Fall steht eigens da, weil er an der Sortierung hängt und beim
    // nächsten alphabetischen Aufräumen still wieder kaputtgeht.
    expect(await page.evaluate(() => _aiCatFromText('pyrotechnik'))).toBe('pyro');
    expect(await page.evaluate(() => _guideCategoryFor('Pyrotechnik Show'))).toBe('pyro');
    const reihenfolge = await page.evaluate(() => AI_CATEGORIES.map((c) => c.key));
    expect(reihenfolge.indexOf('pyro')).toBeLessThan(reihenfolge.indexOf('licht'));
  });

  test('„Beschallung für den Saal" ist Technik, nicht der Saal', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Die zweite Reihenfolge-Bedingung, mit der Zusammenführung dazu-
    // gekommen: `beschallung` steht in `licht`, `saal` in `location`. Beide
    // greifen, also entscheidet die Stellung. Vor dem 01.10.2026 ergab
    // dieser Satz in BEIDEN Fassungen `location` — der Fragende bekam
    // Schlösser für eine Tonanlage.
    for (const satz of ['beschallung für den Saal', 'Beschallung Saal 200 Gäste']) {
      expect(await page.evaluate((s) => _guideCategoryFor(s), satz), satz).toBe('licht');
    }
    const r = await page.evaluate(() => AI_CATEGORIES.map((c) => c.key));
    expect(r.indexOf('licht')).toBeLessThan(r.indexOf('location'));
  });
});

test.describe('Die achte und neunte Fassung derselben Zuordnung', () => {
  test('beide sind abgeleitet, nicht abgeschrieben — und zwar LAZY', () => {
    // `AI_CATEGORIES` ist ein `const` WEITER UNTEN in derselben Datei. Eine
    // Ableitung an der alten Zeile würde beim Laden in die TDZ greifen und
    // die ganze Datei zerlegen; `typeof` hilft dort nicht, es wirft selbst.
    // Deshalb wird im FUNKTIONSRUMPF abgeleitet und gemerkt.
    const code = ohneJsKommentare(
      fs.readFileSync(path.join(MODULE, 'search/11-suche-ki.js'), 'utf8'));

    for (const name of ['_EB_CAT_GRAMMAR', 'EB_KATEGORIE_ICON']) {
      expect(code, `${name} ist als Tabelle zurück`)
        .not.toMatch(new RegExp('var\\s+' + name + '\\s*='));
    }

    // Gegenprobe: die Ableitung steht wirklich da. Ohne sie wäre „die
    // Tabelle ist weg" auch erfüllt, indem jemand die Funktion leert.
    const ikon = /function ebKategorieIcon\([\s\S]{0,400}?\n\}/.exec(code);
    expect(ikon, 'ebKategorieIcon() ist verschwunden').not.toBeNull();
    expect(ikon[0], 'ebKategorieIcon() leitet nicht aus AI_CATEGORIES ab')
      .toContain('AI_CATEGORIES');

    const eintrag = /function ebKategorieEintrag\([\s\S]{0,400}?\n\}/.exec(code);
    expect(eintrag, 'ebKategorieEintrag() ist verschwunden').not.toBeNull();
    expect(eintrag[0], 'ebKategorieEintrag() liest nicht aus AI_CATEGORIES')
      .toContain('AI_CATEGORIES');
  });

  test('ein unbekannter Key ergibt null — kein erfundener Ersatz', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Gemessen wird die AUSGABE des Helfers, nicht seine Wirkung an der
    // Oberfläche: dort hat der `null`-Zweig heute kein Subjekt, weil jeder
    // Aufrufer seinen Key entweder aus der Tabelle nimmt oder vorher
    // `ebKategorieBekannt()` fragt. Genau deshalb überlebte die Mutation
    // „erfindet einen Eintrag" den ersten Durchgang — dieselbe Lehre wie
    // bei `ebAuftragSchluessel()` hinter seiner Gruppierung.
    //
    // Ein erfundener Ersatz wäre die schlechtere Antwort: er trägt Label und
    // Icon und sieht an jeder Aufrufstelle echt aus, bis jemand auf eine
    // Kategorie filtert, die kein Inserat tragen kann.
    const r = await page.evaluate(() => ({
      wellness: ebKategorieEintrag('wellness'),
      quatsch: ebKategorieEintrag('quatsch'),
      leer: ebKategorieEintrag(''),
      // Gegenprobe: für einen echten Key kommt der echte Eintrag. Sonst
      // bestünde „gibt immer null" jede Zusicherung darüber.
      pyro: ebKategorieEintrag('pyro'),
    }));
    expect(r.wellness, 'eine Kategorie ohne Formularwert bekommt einen Eintrag').toBeNull();
    expect(r.quatsch).toBeNull();
    expect(r.leer).toBeNull();
    expect(r.pyro && r.pyro.label).toBe('Pyrotechnik');
    expect(r.pyro && r.pyro.akk).toBe('ein Feuerwerk');
  });

  test('der Chip des Assistenten nennt keine Kategorie ohne Inserate', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistentOeffnen(page);
    // Das Geschmacksprofil liegt im localStorage und überlebt die Behebung.
    // Vor dem 01.10.2026 las der Chip sein Label aus `_EB_CAT_GRAMMAR` — bei
    // `wellness` im Profil stand dort „Zeig mir Wellness & Spa", hinter dem
    // garantiert null Inserate liegen.
    const r = await page.evaluate(() => {
      const echt = window._ebTasteTop;
      const lese = () => {
        const el = document.getElementById('baiSuggests');
        return el ? el.textContent : '';
      };
      try {
        window._ebTasteTop = (art) => (art === 'cats' ? ['wellness'] : []);
        _aiRenderSuggests();
        const erfunden = lese();
        // Gegenprobe: ein ECHTER Key muss den Chip erzeugen, sonst wäre
        // „zeichne nie einen Kategorie-Chip" eine bestehende Erklärung.
        window._ebTasteTop = (art) => (art === 'cats' ? ['pyro'] : []);
        _aiRenderSuggests();
        return { erfunden, echtKey: lese() };
      } finally { window._ebTasteTop = echt; }
    });
    expect(r.erfunden, 'der Chip nennt eine Kategorie, die es nicht gibt')
      .not.toMatch(/wellness/i);
    expect(r.echtKey, 'der Chip erscheint gar nicht mehr — die Gegenprobe greift nicht')
      .toContain('Pyrotechnik');
  });

  test('der Erkenner der Suche hat keine eigene Schleife mehr', () => {
    // Gemessen wird der RUMPF, nicht die Datei: die Erklärung daneben nennt
    // `_EB_CAT_GRAMMAR` und `AI_CATEGORIES` mehrfach, und ein Ausdruck über
    // den rohen Text hätte an genau dieser Stelle schon mehrfach den
    // Kommentar statt des Codes getroffen.
    const code = ohneJsKommentare(
      fs.readFileSync(path.join(MODULE, 'search/11-suche-ki.js'), 'utf8'));
    const rumpf = /function _ebGuessCategory\([\s\S]{0,300}?\n\}/.exec(code);
    expect(rumpf, '_ebGuessCategory() ist verschwunden').not.toBeNull();
    expect(rumpf[0], 'der Erkenner der Suche ruft nicht den gemeinsamen')
      .toContain('_guideCategoryFor');
    expect(rumpf[0], 'der Erkenner hat wieder eine eigene Schleife')
      .not.toMatch(/\bfor\s*\(/);
  });

  test('jede Kategorie trägt ihren Akkusativ — er war der Grund für die achte', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const akk = await page.evaluate(() => AI_CATEGORIES.map((c) => [c.key, c.akk]));
    expect(akk.length).toBe(10);
    for (const [key, a] of akk) {
      expect(typeof a === 'string' && a.trim().length > 2,
        `${key} hat keinen Akkusativ — die Vervollständigung sagt „Ich suche undefined"`)
        .toBe(true);
    }
    // Und er kommt wirklich in der Vervollständigung an.
    const satz = await page.evaluate(() => _ebSuggest('ich brauche').full);
    expect(satz, 'der Akkusativ erreicht die Vervollständigung nicht')
      .toMatch(/einen DJ|ein Catering|einen Fotografen|eine Location/);
  });

  test('eine erfundene Kategorie aus dem Geschmacksprofil wird nicht vorgeschlagen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Das Profil liegt im localStorage und ÜBERLEBT die Behebung: wer vor
    // dem 01.10.2026 einmal nach „massage" gesucht hat, trägt `wellness`
    // weiter mit sich. Ohne die Wache wäre die Vorgabe jeder weiteren
    // Vervollständigung eine Kategorie, die garantiert nichts findet.
    const r = await page.evaluate(() => {
      const echt = window._ebTasteTop;
      try {
        window._ebTasteTop = function (art, n) {
          if (art === 'cats') return ['wellness', 'dj'];
          return echt ? echt(art, n) : [];
        };
        const s = _ebSuggest('ich brauche');
        return { full: s.full, erkannt: _ebGuessCategory('massage buchen') };
      } finally { window._ebTasteTop = echt; }
    });
    expect(r.full, 'die erfundene Kategorie steht wieder im Vorschlag')
      .not.toMatch(/wellness/i);
    expect(r.full, 'statt der erfundenen kommt gar nichts — auch falsch')
      .toMatch(/einen DJ/);
    // Und sie entsteht auch nicht neu: `massage` ergibt keine Kategorie.
    expect(r.erkannt, '„massage" erzeugt wieder eine Kategorie ohne Inserate')
      .not.toBe('wellness');
  });
});

test.describe('Der Weg in die gefilterte Suche', () => {
  test('navigateTo(browse, key) filtert wirklich', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const alle = await page.evaluate(() => document.querySelectorAll('#browseGrid .listing-card, #browseGrid [data-listing-id]').length);
    expect(alle, 'die Landeseite muss überhaupt Inserate zeigen').toBeGreaterThan(2);

    for (const key of ['dj', 'location']) {
      await page.evaluate((k) => window.navigateTo('browse', k), key);
      await page.waitForFunction(
        (k) => {
          const chip = document.querySelector('.ai-cat-chip.selected .ai-cat-label');
          return !!chip && document.querySelector('.page.active') &&
            document.querySelector('.page.active').id === 'page-browse';
        },
        key, { timeout: 15000 }
      );
      const r = await page.evaluate(() => ({
        chips: Array.from(document.querySelectorAll('.ai-cat-chip.selected .ai-cat-label')).map((c) => c.textContent.trim()),
        karten: document.querySelectorAll('#browseGrid .listing-card, #browseGrid [data-listing-id]').length,
        pfad: location.pathname,
      }));
      // GENAU EIN Chip: `ebSucheKategorieSetzen()` ersetzt die Auswahl. Zwei
      // Filter übereinander ergäben eine leere Liste, und die sähe aus wie
      // „es gibt keine DJs" statt wie „zwei Filter schliessen sich aus".
      expect(r.chips.length, key).toBe(1);
      expect(r.karten, `${key} muss weniger als alle zeigen`).toBeLessThan(alle);
      expect(r.karten, `${key} muss etwas zeigen`).toBeGreaterThan(0);
      // Der Pfad ist teilbar. Ohne Segment wäre `/dj` von der SEITE `dj`
      // nicht zu unterscheiden, und ein geteilter Link endete auf 404.php.
      expect(r.pfad).toMatch(new RegExp('/browse/' + key + '$'));
    }
  });

  test('ein unbekannter Wert filtert nicht — und lässt keinen Chip stehen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => window.navigateTo('browse', 'location'));
    await page.waitForFunction(() => document.querySelectorAll('.ai-cat-chip.selected').length === 1, null, { timeout: 15000 });
    const gefiltert = await page.evaluate(() => document.querySelectorAll('#browseGrid .listing-card, #browseGrid [data-listing-id]').length);

    await page.evaluate(() => window.navigateTo('browse', 'quatsch'));
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({
      chips: document.querySelectorAll('.ai-cat-chip.selected').length,
      karten: document.querySelectorAll('#browseGrid .listing-card, #browseGrid [data-listing-id]').length,
    }));
    // Der GEMESSENE Fund vom 01.10.2026: die Frühabweisung liess den alten
    // Chip markiert über der ungefilterten Liste stehen. Markierung und
    // Inhalt widersprachen sich, lautlos.
    expect(r.chips, 'kein Chip darf markiert bleiben').toBe(0);
    expect(r.karten, 'unbekannt heisst: nicht filtern').toBeGreaterThan(gefiltert);
  });

  test('die Weitergabe geschieht NACH dem Grundaufbau', () => {
    // Gemessen wird die Reihenfolge im Code, weil sie am Ergebnis nur
    // sichtbar ist, wenn `loadDbListings()` langsam genug ist — genau das
    // Rennen, an dem `feedTabAktivieren()` am 31.08.2026 hing. Andersherum
    // überschreibt `renderBrowseGrid(LISTINGS)` das gefilterte Ergebnis.
    const code = ohneJsKommentare(fs.readFileSync(path.join(MODULE, 'core/02-router-navigation.js'), 'utf8'));
    const i = code.indexOf("case 'browse':");
    expect(i).toBeGreaterThan(-1);
    const block = code.slice(i, code.indexOf("case 'explore':", i));
    const render = block.indexOf('renderBrowseGrid(LISTINGS)');
    const setzen = block.indexOf('ebSucheKategorieSetzen(data)');
    expect(render, 'renderBrowseGrid muss im browse-Zweig stehen').toBeGreaterThan(-1);
    expect(setzen, 'die Weitergabe muss im browse-Zweig stehen').toBeGreaterThan(-1);
    expect(setzen, 'erst zeichnen, dann filtern').toBeGreaterThan(render);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Die Trending-Leiste und der Filter, der stehenblieb

   Am Abend des 01.10.2026 gemessen. Die Feed-Seitenleiste führt fünf
   Links — und alle fünf liefen an der gerade gebauten Weitergabe vorbei:

     <a onclick="navigateTo('browse');
        setTimeout(()=>{browseCategory.value='dj';filterListings();},100)">

   Zwei Fehler in einer Zeile. Das `setTimeout(…, 100)` ist ein Rennen
   gegen `loadDbListings()` — dieselbe Falle wie bei `feedTabAktivieren()`
   am 31.08.2026, und `navigateTo('browse', key)` tut es seit demselben Tag
   richtig und in der richtigen Reihenfolge.

   Und `#Hochzeit` setzte `browseCategory.value = 'hochzeit'`. Diese Option
   gibt es in diesem Auswahlfeld nicht — „Hochzeit" ist ein ANLASS, kein
   Gewerk. Ein `<select>` nimmt einen unbekannten Wert stillschweigend
   nicht an: `value` bleibt leer, `selectedIndex` wird −1. Gemessen zeigte
   der Link danach alle 15 Inserate, also filterte er auf NICHTS.

   Dazu der dritte Fund, derselbe Abend: `filterListings()` liest ZWEI
   Kategoriefilter und verknüpft sie mit UND. `ebSucheKategorieSetzen()`
   räumte nur die Chips. Stand im Auswahlfeld noch `dj` und kam der
   Assistent mit `location`, dann sagte die Seite

     0 Services gefunden
     „Für (DJ & Musik) konnten wir leider keine passenden Services finden"

   während der markierte Chip „Location" sagte. Genau der Fall, vor dem der
   Kommentar dieser Funktion selbst warnt — mit einer selbstbewusst
   falschen Begründung obendrauf.
   ══════════════════════════════════════════════════════════════════════ */
test.describe('Die Trending-Leiste und der Filter, der stehenblieb', () => {
  /**
   * SICHTBARE Karten.
   *
   * Bei null Treffern wird `#browseGrid` auf `display: none` gesetzt und
   * ein „keine Treffer"-Panel eingeblendet — der Grid behält dabei seine
   * alten Karten im DOM. Ein Zähler, der nur `querySelectorAll` nimmt,
   * meldet dann die Karten des VORHERIGEN Filters. Genau daran ist die
   * erste Messung dieses Befundes hängengeblieben.
   */
  async function sichtbareKarten(page) {
    return page.evaluate(() => {
      const grid = document.getElementById('browseGrid');
      if (!grid || getComputedStyle(grid).display === 'none') return 0;
      return grid.querySelectorAll('.listing-card, [data-listing-id]').length;
    });
  }

  test('kein Trending-Link rennt mehr gegen den Grundaufbau an', () => {
    // Gemessen wird die BEDINGUNG: kein `onclick` in der Leiste darf einen
    // Zeitgeber starten oder ein Auswahlfeld von Hand beschreiben. Ein Test
    // auf „steht da navigateTo" wäre beim nächsten Nachbau wieder blind.
    const shell = fs.readFileSync(path.join(__dirname, '..', '..', 'app-shell.html'), 'utf8');
    const i = shell.indexOf('id="sidebarTrending"');
    expect(i, 'die Trending-Leiste ist verschwunden').toBeGreaterThan(-1);
    const block = shell.slice(i, shell.indexOf('</div>', i));
    const links = [...block.matchAll(/onclick="([^"]*)"/g)].map((m) => m[1]);
    expect(links.length, 'keine Links in der Leiste — der Test prüft nichts')
      .toBeGreaterThan(3);
    for (const l of links) {
      expect(l, `Zeitgeber im Trending-Link: ${l}`).not.toMatch(/setTimeout|setInterval/);
      expect(l, `Auswahlfeld von Hand beschrieben: ${l}`).not.toMatch(/\.value\s*=/);
      expect(l, `führt nicht über den Router: ${l}`).toMatch(/navigateTo\('browse',\s*'[^']+'\)/);
    }
  });

  test('„#Hochzeit" filtert wirklich — GEKLICKT, nicht aufgerufen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const alle = await sichtbareKarten(page);
    expect(alle, 'die Landeseite muss Inserate zeigen').toBeGreaterThan(2);

    // GEKLICKT wird der echte Link. Der erste Entwurf rief
    // `navigateTo('browse','Hochzeit')` selbst auf — damit überlebte die
    // Mutation „der Link schreibt wieder 'hochzeit' klein", denn das
    // ARGUMENT des Links war nie Subjekt. Ein Prüfer, der die Kette hinter
    // dem Knopf misst und den Knopf überspringt, deckt genau den Fehler
    // nicht, der gemeldet war.
    await page.evaluate(() => {
      const leiste = document.getElementById('sidebarTrending');
      const link = Array.from(leiste.querySelectorAll('a'))
        .find((a) => a.textContent.trim() === '#Hochzeit');
      if (!link) throw new Error('#Hochzeit gibt es in der Leiste nicht');
      link.click();
    });
    await page.waitForFunction(
      () => document.getElementById('browseEventType').value === 'Hochzeit',
      null, { timeout: 15000 });
    const r = await page.evaluate(() => ({
      et: document.getElementById('browseEventType').value,
      kat: document.getElementById('browseCategory').value,
      chips: document.querySelectorAll('.ai-cat-chip.selected').length,
      chipLabel: (document.getElementById('browseEventType')
        .parentElement.querySelector('.chip-label') || {}).textContent,
    }));
    expect(r.et, 'der Anlass landet nicht im Event-Typ-Filter').toBe('Hochzeit');
    // Ein Anlass ist kein Gewerk: der Kategorie-Filter bleibt leer.
    expect(r.kat, 'der Anlass landet im Kategoriefilder').toBe('');
    expect(r.chips, 'ein Anlass darf keinen Kategorie-Chip markieren').toBe(0);
    // Die Beschriftung hängt am `change`-Ereignis, das eine Zuweisung per
    // Skript NICHT auslöst. Ohne den Aufruf stünde dort weiter „Event-Typ",
    // während gefiltert wird — Markierung und Inhalt wieder auseinander.
    expect(r.chipLabel, 'der Chip nennt den Anlass nicht').toMatch(/Hochzeit/);
    // Und es wird wirklich gefiltert, nicht nur markiert.
    expect(await sichtbareKarten(page), 'nichts gefiltert — genau der alte Zustand')
      .toBeLessThan(alle);
  });

  test('eine neue Absicht räumt den alten Filter mit', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Der alte Filter entsteht WIE IM BETRIEB: der Nutzer wählt im
    // sichtbaren Auswahlfeld, und das feuert `change`. Der erste Entwurf
    // setzte nur `.value` — damit war die Chip-Beschriftung nie auf
    // „DJ & Musik" gesetzt, und die Mutation „die Beschriftung wird beim
    // Räumen nicht nachgezogen" überlebte, weil es nichts nachzuziehen gab.
    await page.evaluate(() => {
      const sel = document.getElementById('browseCategory');
      sel.value = 'dj';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const beschriftungVorher = await page.evaluate(() =>
      (document.getElementById('browseCategory')
        .parentElement.querySelector('.chip-label') || {}).textContent);
    expect(beschriftungVorher, 'der Chip nennt den alten Filter nicht — kein Subjekt')
      .toBe('DJ & Musik');
    const nurDj = await sichtbareKarten(page);
    expect(nurDj, 'der alte Filter greift nicht — der Test hat kein Subjekt')
      .toBeGreaterThan(0);

    await page.evaluate(() => ebSucheKategorieSetzen('location'));
    const r = await page.evaluate(() => ({
      kat: document.getElementById('browseCategory').value,
      et: document.getElementById('browseEventType').value,
      beschriftung: (document.getElementById('browseCategory')
        .parentElement.querySelector('.chip-label') || {}).textContent,
      chips: Array.from(document.querySelectorAll('.ai-cat-chip.selected .ai-cat-label'))
        .map((c) => c.textContent.trim()),
      nores: getComputedStyle(document.getElementById('noResultsContainer')).display,
      text: document.getElementById('noResultsContainer').innerText,
    }));
    expect(r.kat, 'der alte Kategoriefilter steht noch').toBe('');
    expect(r.beschriftung, 'der Chip nennt weiter den geräumten Filter')
      .toBe('Kategorie');
    expect(r.chips, 'die neue Absicht ist nicht markiert').toEqual(['Location']);
    // Der eigentliche Schaden war die BEGRÜNDUNG: „keine Treffer für
    // DJ & Musik" über einem Chip, der Location sagt.
    expect(r.nores, 'die neue Absicht endet in der leeren Liste').toBe('none');
    expect(r.text, 'die alte Kategorie wird weiter genannt').not.toMatch(/DJ & Musik/);
    expect(await sichtbareKarten(page), 'es wird nichts gezeigt').toBeGreaterThan(0);
  });

  test('auch der Anlass wird geräumt, wenn ein Gewerk kommt', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => window.navigateTo('browse', 'Hochzeit'));
    await page.waitForFunction(
      () => document.getElementById('browseEventType').value === 'Hochzeit',
      null, { timeout: 15000 });
    await page.evaluate(() => window.navigateTo('browse', 'dj'));
    await page.waitForFunction(
      () => document.querySelectorAll('.ai-cat-chip.selected').length === 1,
      null, { timeout: 15000 });
    const r = await page.evaluate(() => ({
      et: document.getElementById('browseEventType').value,
      kat: document.getElementById('browseCategory').value,
      chips: Array.from(document.querySelectorAll('.ai-cat-chip.selected .ai-cat-label'))
        .map((c) => c.textContent.trim()),
    }));
    // „DJ für die Hochzeit" wäre eine andere, legitime Absicht — aber die
    // kommt dann über zwei Klicks, nicht dadurch, dass ein alter Filter
    // liegenbleibt und die Liste unerklärt leert.
    expect(r.et, 'der Anlass bleibt stehen und schneidet mit').toBe('');
    expect(r.chips).toEqual(['DJ & Musik']);
    expect(r.kat).toBe('');
  });

  test('ein unbekannter Wert räumt BEIDE Filter', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => {
      document.getElementById('browseCategory').value = 'dj';
      document.getElementById('browseEventType').value = 'Hochzeit';
      filterListings();
    });
    await page.evaluate(() => window.navigateTo('browse', 'quatsch'));
    await page.waitForFunction(
      () => document.getElementById('browseCategory').value === '' &&
            document.getElementById('browseEventType').value === '',
      null, { timeout: 15000 });
    const r = await page.evaluate(() => ({
      chips: document.querySelectorAll('.ai-cat-chip.selected').length,
      chipLabels: Array.from(document.querySelectorAll('#page-browse .chip-label'))
        .map((e) => e.textContent.trim()),
    }));
    expect(r.chips, 'kein Chip darf markiert bleiben').toBe(0);
    // Die Beschriftungen müssen mit: ein Chip, der „DJ & Musik" sagt, über
    // einer ungefilterten Liste ist derselbe Widerspruch wie vorher.
    expect(r.chipLabels, 'eine Beschriftung nennt noch den alten Filter')
      .not.toContain('DJ & Musik');
  });

  test('der Setzer sagt, ob der Anlass angekommen ist', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Gemessen wird die AUSGABE des Helfers. An der Oberfläche hat sie heute
    // kein Subjekt: der Router ruft ihn als Rückfall und sieht das Ergebnis
    // nicht an. Genau deshalb überlebte die Mutation „gibt immer true
    // zurück" — dieselbe Lehre wie bei `ebKategorieEintrag()` und bei
    // `ebAuftragSchluessel()` hinter seiner Gruppierung. Wer den Helfer
    // später verkettet, verlässt sich auf diese Antwort.
    const r = await page.evaluate(() => ({
      echt: ebSucheEventTypSetzen('Hochzeit'),
      klein: ebSucheEventTypSetzen('hochzeit'),
      quatsch: ebSucheEventTypSetzen('gibt-es-nicht'),
      leer: ebSucheEventTypSetzen(''),
      nachQuatsch: document.getElementById('browseEventType').value,
    }));
    expect(r.echt, 'ein echter Anlass wird nicht als angekommen gemeldet').toBe(true);
    // Die Kleinschreibung ist der gemeldete Fall: `#browseEventType` führt
    // „Hochzeit", nicht „hochzeit". Ein `<select>` nimmt das nicht an.
    expect(r.klein, 'die Kleinschreibung gilt als angekommen').toBe(false);
    expect(r.quatsch).toBe(false);
    expect(r.leer).toBe(false);
    expect(r.nachQuatsch, 'ein unbekannter Wert bleibt im Feld stehen').toBe('');
  });

  test('beide Auswahlfelder nennen die Kategorien so, wie die Tabelle sie nennt', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Die ZEHNTE Fassung: `#browseCategory` und `#createCategory` führen
    // ihre Labels von Hand. Die Keys stimmten, die Wörter nicht —
    // „Locations" gegen „Location", „Licht & Tech" gegen „Licht & Technik",
    // „Eventplanung" gegen „Planung". Der Inhaber hat in seiner eigenen
    // Meldung BEIDE Wörter benutzt („wenn ich nach Locations suche soll
    // dann auch im Filter Location finden lassen"). Wer einen Chip sucht,
    // den es unter diesem Namen nicht gibt, sucht vergeblich.
    const r = await page.evaluate(() => {
      const tab = {};
      AI_CATEGORIES.forEach((c) => { tab[c.key] = c.label; });
      const out = {};
      ['browseCategory', 'createCategory'].forEach((id) => {
        const sel = document.getElementById(id);
        if (!sel) { out[id] = null; return; }
        out[id] = Array.from(sel.options).filter((o) => o.value)
          .map((o) => [o.value, o.textContent.trim(), tab[o.value] || null]);
      });
      return out;
    });
    for (const id of ['browseCategory', 'createCategory']) {
      expect(r[id], `#${id} gibt es nicht mehr`).toBeTruthy();
      expect(r[id].length, `#${id} hat keine Kategorien`).toBe(10);
      for (const [key, gezeigt, erwartet] of r[id]) {
        expect(erwartet, `#${id}: „${key}" steht nicht in AI_CATEGORIES`).toBeTruthy();
        expect(gezeigt, `#${id}: „${key}" heisst hier anders als in der Tabelle`)
          .toBe(erwartet);
      }
    }
  });
});

test.describe('Der Assistent gibt die Kategorie mit', () => {
  test('mit Treffern führt die Antwort in die gefilterte Suche', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistentOeffnen(page);
    const html = await page.evaluate(() => _aiAnswerCategory('dj'));
    // Vorher stand hier `navigateTo('browse')` — ohne Argument, also ohne
    // Filter. Der Nutzer musste die Kategorie ein zweites Mal anklicken.
    expect(html).toContain("navigateTo('browse','dj')");
    expect(html).not.toMatch(/navigateTo\('browse'\)/);
  });

  test('auch ohne Treffer — der Assistent sieht weniger als die Suche', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistentOeffnen(page);
    // Eine Kategorie, in der die Demo-Daten nichts führen, erzwingen: der
    // leere Zweig ist der, in dem „schau in der Suche vorbei" stand.
    const html = await page.evaluate(() => {
      const echt = window._visibleListings;
      window._visibleListings = function() { return []; };
      try { return _aiAnswerCategory('location'); } finally { window._visibleListings = echt; }
    });
    expect(html).toContain('keine Inserate gefunden');
    expect(html).toContain("navigateTo('browse','location')");
  });

  test('der Knopf nennt die GANZE Zahl, nicht die drei gezeigten', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistentOeffnen(page);
    const html = await page.evaluate(() => {
      // Sieben DJs stellen: die Antwort zeigt drei Karten. „Alle 7 in der
      // Suche" ist die Zahl, auf die es ankommt — nach `.slice(0,3)`
      // stünde dort 3, und der Nutzer hielte die Liste für vollständig.
      const echt = window._visibleListings;
      window._visibleListings = function() {
        return Array.from({ length: 7 }, function(_, i) {
          return { id: 9000 + i, category: 'dj', providerName: 'DJ ' + i, rating: '4.5' };
        });
      };
      try { return _aiAnswerCategory('dj'); } finally { window._visibleListings = echt; }
    });
    const karten = (html.match(/class="bai-lcard"/g) || []).length;
    expect(karten, 'drei Karten').toBe(3);
    expect(html, 'aber sieben genannt').toContain('Alle 7 in der Suche');
  });

  test('ein erfundener Key erzeugt KEINEN Knopf und kein rohes Markup', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistentOeffnen(page);
    const html = await page.evaluate(() => _aiAnswerCategory("x'); alert(1); //<img src=x onerror=1>"));
    // Der Key landet in einem `onclick`-Attribut. Eine Weissliste ist dort
    // die einzige Form, die auch bei einem erfundenen Argument trägt —
    // dieselbe Begründung wie beim `pi_…`-Knopf des Stornos.
    expect(html, 'kein onclick mit dem erfundenen Key').not.toMatch(/navigateTo\('browse','x/);
    // Gemessen wird die MASKIERUNG, nicht die Abwesenheit der Zeichenfolge.
    // Dass „alert(1)" als Text in der Sprechblase steht, ist richtig — es
    // ist der Name, nach dem gefragt wurde. Gefährlich wäre erst, dass das
    // Anführungszeichen das Attribut verlässt oder `<img>` ein Element
    // wird. Der erste Entwurf dieses Tests verlangte das Verschwinden des
    // Wortes und wäre damit nur durch Wegwerfen der Eingabe zu erfüllen.
    expect(html, 'Apostroph maskiert').toContain('&#39;');
    expect(html, 'spitze Klammer maskiert').toContain('&lt;img src=x');
    expect(html, 'kein echtes Element').not.toMatch(/<img\s/);
    // Gegenprobe: im DOM darf daraus kein Knoten entstehen.
    const knoten = await page.evaluate((h) => {
      const d = document.createElement('div');
      d.innerHTML = h;
      return { imgs: d.querySelectorAll('img').length, onerror: d.innerHTML.indexOf('onerror=1>') };
    }, html);
    expect(knoten.imgs).toBe(0);
  });

  test('jeder Kategorieknopf des Assistenten führt zu einem echten Chip', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await assistentOeffnen(page);
    // Die Bedingung, nicht die zehn Fälle: wer einen elften Knopf anlegt,
    // bekommt die Prüfung geschenkt.
    const r = await page.evaluate(() => {
      const keys = Array.from(document.querySelectorAll('.bai-cat'))
        .map((b) => (b.getAttribute('onclick') || '').match(/_aiAskCategory\('([^']+)'\)/))
        .filter(Boolean).map((m) => m[1]);
      return { keys, unbekannt: keys.filter((k) => !ebKategorieBekannt(k)) };
    });
    expect(r.keys.length).toBe(10);
    expect(r.unbekannt).toEqual([]);
  });
});
