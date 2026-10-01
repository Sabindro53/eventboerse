// In der Suche stehen Icons, keine Emojis.
//
// Gemeldet am 31.08.2026. Ein Emoji wird von der Schrift des Systems
// gezeichnet: auf Android anders als auf iOS, auf Windows anders als auf
// beiden, und in mancher Linux-Umgebung gar nicht — dort steht ein leeres
// Rechteck. Es lässt sich nicht einfärben, nicht an die Textfarbe koppeln
// und im Dunkelmodus nicht abdunkeln.
//
// Die Icon-Schrift liegt im Theme, ist auf die benutzten Symbole
// zugeschnitten und sieht überall gleich aus.
//
// Geprüft wird am GERENDERTEN Ergebnis, nicht am Quelltext: dass ein Icon
// im Markup steht, heisst noch nicht, dass die Schrift es zeichnen kann.
// Genau dafür gibt es icons.spec.js — hier geht es darum, dass in der Suche
// überhaupt keine Emojis mehr auftauchen.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { ohneJsKommentare } = require('./lib/js-code');

const ROOT = path.join(__dirname, '..', '..');
const SUCHE_KI = path.join(ROOT, 'js', 'modules', 'search', '11-suche-ki.js');

/** Piktogramme, Symbole, Dingbats — und die Variantenselektoren dazu. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

async function appOeffnen(page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.navigateTo === 'function');
}

test.describe('Suchvorschläge tragen Icons', () => {
  test('die Alternativen zeigen ein Icon, kein Emoji', async ({ page }) => {
    await appOeffnen(page);
    const zeilen = await page.evaluate(() => {
      const s = window._ebSuggest && window._ebSuggest('Ich suche einen DJ');
      if (!s || !s.alternatives) return null;
      return s.alternatives.map((a) => ({ icon: a.icon, hatEmoji: 'emoji' in a }));
    });
    expect(zeilen, 'die Vorschlagsmaschine liefert keine Alternativen — Test prüft nichts')
      .toBeTruthy();
    expect(zeilen.length).toBeGreaterThan(0);
    for (const z of zeilen) {
      expect(z.hatEmoji, 'eine Alternative trägt weiterhin ein emoji-Feld').toBe(false);
      expect(z.icon, 'eine Alternative hat kein Icon').toMatch(/^[a-z_]+$/);
    }
  });

  test('im gerenderten Vorschlagsfeld steht kein Emoji', async ({ page }) => {
    await appOeffnen(page);
    const text = await page.evaluate(() => {
      const feld = document.getElementById('heroSearchInput')
        || document.querySelector('input[id*="earch"]');
      if (!feld) return null;
      feld.value = 'Ich suche einen DJ';
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      const panel = document.querySelector('.eb-sug-panel, #ebSuggestPanel');
      return panel ? panel.textContent : '';
    });
    // Kein Skip: findet der Test sein Suchfeld nicht, hat er nichts geprüft —
    // und das muss anders aussehen als „keine Emojis gefunden".
    expect(text, 'kein Suchfeld gefunden — der Test prüfte nichts').not.toBeNull();
    expect(EMOJI.test(text), `Emoji im Vorschlagsfeld: ${text.slice(0, 120)}`).toBe(false);
  });
});

test.describe('Die Kategorie-Auswahl trägt Icons', () => {
  test('jeder Chip hat ein Icon-Element und kein Emoji', async ({ page }) => {
    await appOeffnen(page);
    const r = await page.evaluate(() => {
      const liste = document.getElementById('aiSuggestionsList');
      if (!liste || typeof window.renderCategoryPicker !== 'function') return null;
      window.renderCategoryPicker();
      const chips = [...liste.querySelectorAll('.ai-cat-chip')];
      return {
        anzahl: chips.length,
        ohneIcon: chips.filter((c) => !c.querySelector('.material-icons-round')).length,
        text: chips.map((c) => c.textContent).join(' '),
      };
    });
    expect(r, 'die Kategorie-Auswahl ist nicht erreichbar — der Test prüfte nichts')
      .toBeTruthy();
    expect(r.anzahl, 'keine Chips gerendert — Test prüft nichts').toBeGreaterThan(0);
    expect(r.ohneIcon, 'ein Chip hat kein Icon').toBe(0);
    // Der Icon-NAME steht als Text im Span (Ligatur) — Emojis dürfen nicht.
    expect(EMOJI.test(r.text), `Emoji in den Chips: ${r.text.slice(0, 120)}`).toBe(false);
  });
});

test.describe('Eine Zuordnung, nicht drei Listen', () => {
  test('jede Kategorie trägt Icon UND Akkusativ — in EINER Tabelle', async ({ page }) => {
    // Bis zum 01.10.2026 standen beide Angaben woanders: das Icon ein
    // zweites Mal in `EB_KATEGORIE_ICON`, der Akkusativ in
    // `_EB_CAT_GRAMMAR`. Letztere war der Grund, dass es die zweite Tabelle
    // überhaupt gab — und sie führte `wellness`, eine Kategorie, die kein
    // Inserat tragen kann. Der Akkusativ gehört zur Kategorie, nicht in
    // eine Nebentabelle, die niemand gegen diese hier misst.
    await appOeffnen(page);
    const r = await page.evaluate(() => {
      if (typeof AI_CATEGORIES === 'undefined') return null;
      return AI_CATEGORIES.map((c) => ({ key: c.key, icon: c.icon, akk: c.akk }));
    });
    expect(r, 'die Tabelle ist nicht erreichbar — der Test prüfte nichts')
      .toBeTruthy();
    expect(r.length, 'die Tabelle ist leer').toBeGreaterThan(5);
    for (const e of r) {
      expect(e.icon, `${e.key} hat kein Icon`).toMatch(/^[a-z_]+$/);
      // Ohne Akkusativ steht in der Vervollständigung „Ich suche undefined".
      expect(typeof e.akk === 'string' && e.akk.trim().length > 2,
        `${e.key} hat keinen Akkusativ für die Vervollständigung`).toBe(true);
    }
  });

  test('die zwei abgeschriebenen Tabellen sind weg und kommen nicht zurück', async ({ page }) => {
    // Gemessen am geladenen Skript, nicht am Quelltext: beide waren `var`
    // auf oberster Ebene und damit `window`-Eigenschaften. Wer eine davon
    // neu anlegt, gewinnt in der Verkettung — `app.js` ist eine blosse
    // Verkettung, und bei zwei `var` gleichen Namens zählt die spätere.
    await appOeffnen(page);
    const r = await page.evaluate(() => ({
      gram: typeof window._EB_CAT_GRAMMAR,
      ikon: typeof window.EB_KATEGORIE_ICON,
      // Gegenprobe: die Ableitung trägt wirklich, sonst wäre „beide weg"
      // auch erfüllt, wenn das Icon gar nicht mehr gefunden wird.
      pyro: ebKategorieIcon('pyro'),
      unbekannt: ebKategorieIcon('wellness'),
    }));
    expect(r.gram, '_EB_CAT_GRAMMAR ist zurück').toBe('undefined');
    expect(r.ikon, 'EB_KATEGORIE_ICON ist zurück').toBe('undefined');
    expect(r.pyro, 'die Ableitung findet das Icon nicht mehr')
      .toBe('local_fire_department');
    // `wellness` ist kein Formularwert. Ein Icon dafür wäre ein Glyph an
    // einem Schlüssel, der nie ankommt — der Rückfall ist die Wahrheit.
    expect(r.unbekannt, 'eine Kategorie ohne Formularwert bekommt ein Icon')
      .toBe('push_pin');
  });

  test('CATEGORY_EMOJI existiert nicht mehr', () => {
    // Es war eine dritte Liste derselben Kategorien mit eigenen Emojis —
    // Floristik war dort 🌸 und im Suchvokabular 💐. Dieselbe Kategorie,
    // zwei Zeichen, je nachdem welche Liste gerade dran war.
    const module = fs.readFileSync(
      path.join(ROOT, 'js', 'modules', 'ui', '32-consent-init-map.js'), 'utf8');
    const code = module.split('\n')
      .filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z)).join('\n');
    expect(code, 'CATEGORY_EMOJI ist zurück').not.toMatch(/const CATEGORY_EMOJI\s*=/);
  });

  test('jede Kategorie der Auswahl bekommt ihr Icon wirklich geliefert', async ({ page }) => {
    await appOeffnen(page);
    const r = await page.evaluate(() => {
      // Bare Bezeichner, NICHT window.*: AI_CATEGORIES ist ein `const` auf
      // oberster Ebene: in einem klassischen Skript legt das keine
      // window-Eigenschaft an. `var` tut es, `const` nicht — und ein Test,
      // der daran scheitert, übersprang sich vorher selbst.
      if (typeof AI_CATEGORIES === 'undefined') return { fehler: 'AI_CATEGORIES fehlt' };
      if (typeof ebKategorieIcon !== 'function') return { fehler: 'ebKategorieIcon fehlt' };
      // Gemessen wird der AUSGELIEFERTE Wert, nicht das Vorhandensein eines
      // Schlüssels in einer zweiten Tabelle. Vorher stand hier
      // `!EB_KATEGORIE_ICON[c.key]` — seit die Zuordnung abgeleitet ist,
      // wäre das wahr, ohne etwas zu belegen.
      return { falsch: AI_CATEGORIES
                 .filter((c) => ebKategorieIcon(c.key) !== c.icon)
                 .map((c) => c.key),
               anzahl: AI_CATEGORIES.length };
    });
    expect(r.fehler, `Subjekt nicht gefunden: ${r.fehler}`).toBeUndefined();
    expect(r.anzahl, 'die Auswahl ist leer — der Test prüfte nichts')
      .toBeGreaterThan(5);
    expect(r.falsch, `falsches Icon geliefert: ${(r.falsch || []).join(', ')}`)
      .toHaveLength(0);
  });
});

test.describe('Wo ein Icon nicht geht, bleibt das Emoji', () => {
  test('die Event-Auswahl behält ihre Emojis — <option> erlaubt kein Markup', () => {
    // Das ist keine Nachlässigkeit, sondern die Grenze der Technik: in einer
    // nativen Auswahlliste erscheint ein <span> als Text oder gar nicht.
    // Ein Test, der hier Icons verlangte, erzwänge einen kaputten Zustand.
    const modul = fs.readFileSync(
      path.join(ROOT, 'js', 'modules', 'search', '11-suche-ki.js'), 'utf8');
    expect(modul, 'die Ausnahme steht ohne Begründung da')
      .toMatch(/BLEIBT EIN EMOJI[\s\S]{0,400}<option>/);
    expect(modul, 'die Event-Auswahl rendert kein Zeichen mehr')
      .toMatch(/ev\.emoji \+ ' ' \+ _escHtml\(ev\.label\)/);
  });
});

test.describe('Die benutzten Icons sind auch ausgeliefert', () => {
  test('jedes Icon der Zuordnung steht in der zugeschnittenen Schrift', () => {
    // Ein Icon, das im Code steht, aber im Zuschnitt fehlt, erscheint im
    // Betrieb als leerer Kasten — sichtbar für jeden Besucher, unsichtbar
    // für jeden anderen Test.
    // Nach Abzug der Kommentare, über den gemeinsamen Griff. Das ist hier
    // VORSORGE, nicht ein belegter Befund: die Erklärung über der Ableitung
    // nennt den gelöschten Eintrag `wellness: 'spa'` wörtlich, aber sie
    // steht ausserhalb des geschnittenen Blocks — die Mutation „Kommentare
    // nicht abgezogen" überlebt deshalb, und das steht hier, statt dass der
    // Abzug eine Wirkung behauptet, die er beim heutigen Schnitt nicht hat.
    // Er bleibt, weil ein breiterer Schnitt sonst still den Kommentar misst.
    const modul = ohneJsKommentare(fs.readFileSync(SUCHE_KI, 'utf8'));
    const i = modul.indexOf('const AI_CATEGORIES = [');
    expect(i, 'die Tabelle ist verschwunden').toBeGreaterThan(-1);
    const block = modul.slice(i, modul.indexOf('\n];', i));
    const icons = [...block.matchAll(/icon:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect(icons.length, 'die Tabelle führt keine Icons mehr').toBeGreaterThan(5);

    const benutzt = new Set(fs.readFileSync(
      path.join(ROOT, 'scripts', 'lib', 'material-icons-benutzt.txt'), 'utf8')
      .split('\n').map((s) => s.trim()).filter(Boolean));
    for (const i of icons) {
      expect(benutzt.has(i), `${i} wurde nicht in den Zuschnitt aufgenommen`).toBe(true);
    }
  });
});
