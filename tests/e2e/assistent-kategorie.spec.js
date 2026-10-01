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
      const fehlerText = [], fehlerGuide = [];
      treffer.forEach(([satz, soll]) => {
        const a = _aiCatFromText(String(satz).toLowerCase());
        if (a !== soll) fehlerText.push(`${satz} → ${a} (soll ${soll})`);
        const g = _guideCategoryFor(satz);
        if (g !== soll) fehlerGuide.push(`${satz} → ${g} (soll ${soll})`);
      });
      return { fehlerText, fehlerGuide };
    }, [TREFFER]);
    // Vorher: 32/45 im Assistenten, 35/45 am Inserat. „getränke", „torte",
    // „venue", „gelände", „strom", „livestream", „feuerwerk", „koordinator"
    // liefen im Assistenten ins Leere.
    expect(r.fehlerText, 'getippter Text').toEqual([]);
    expect(r.fehlerGuide, 'Inseratstext').toEqual([]);
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
