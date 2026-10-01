// ════════════════════════════════════════════════════════════════════════
// Der QA-Bot gibt die gefragte Kategorie an die Suche weiter
//
// Gemeldet am 01.10.2026 vom Inhaber, mit Bild: „Wenn ich dem Assistenten
// die Aufgabe gebe ‚Suche alle DJs', dann soll, wenn er danach die Suche
// vorschlägt, auch die DJs anzeigen — und nicht nur die Suche leer lassen
// und auf der Startseite spawnen."
//
// Im echten Browser nachgemessen, VOR der Behebung:
//
//   _guideCategoryFor('Zeige alle DJ auf')   →  'dj'      (erkannt!)
//   Knopf „Suche öffnen"                     →  browse, data = (keine)
//   nach dem Klick                           →  15 Inserate, kein Chip
//
// Die ganze Kette war fertig: der Erkenner wusste es, `runQaAction` reicht
// `daten` seit dem 15.09. an `navigateTo` weiter, und `navigateTo` filtert
// seit dem 01.10. **Es fehlte allein die Verbindung** — dieselbe Klasse wie
// die Hochzeit-Bausteine, der Aktivitäten-Bestand neben der erfundenen
// Terminliste und der Storno-Vorgang ohne Knopf.
//
// Das ist der ZWEITE Assistent. Am Vormittag wurde `ai/50-planungs-
// assistent.js` repariert (der Chat im Board); gemeldet war jetzt
// `ui/31-modals-toast-qabot.js` — das Overlay auf der Landeseite. Eine
// Fundstelle zu beheben verhindert die nächste nicht.
//
// GEMESSEN WIRD DIE WIRKUNG: geklickt wird der echte Knopf der echten
// Antwort, nachgesehen wird im gefilterten Raster. Ein Test auf „der Knopf
// trägt data-data" wäre bei einer gebrochenen Navigation grün.
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, warteAufAppBereit } = require('./helpers');
const { ohneJsKommentare } = require('./lib/js-code');

const WURZEL = path.join(__dirname, '..', '..');

/** Die Knöpfe der ZULETZT gesendeten Bot-Antwort. */
async function knoepfeDerAntwort(page, frage) {
  await page.evaluate((f) => { openQaBot(); _qaAnswer(f); }, frage);
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const letzte = [...document.querySelectorAll('#qaMessages .eb-qa-msg.bot')].pop();
    if (!letzte) return [];
    return [...letzte.querySelectorAll('.eb-qa-action')].map((b) => ({
      // Die Ligatur des Icons steht im Textinhalt davor — sie gehört nicht
      // zur Beschriftung. Dieselbe Falle wie beim Vorlesetext des
      // Assistenten und bei den vier Icon-Spans der Barrierefreiheit.
      label: b.textContent.trim().replace(/^[a-z_]+/, ''),
      ziel: b.dataset.target || '',
      daten: b.dataset.data || '',
      kind: b.dataset.kind || '',
    }));
  });
}

test.describe('QA-Bot: die Kategorie kommt in der Suche an', () => {
  test('„Zeige alle DJ auf" filtert wirklich — vom Knopf bis zum Raster', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);

    const vorher = await page.evaluate(
      () => document.getElementById('browseGrid').children.length);
    // Gegenprobe: ohne sie belegt „2 Treffer" nichts — vielleicht gibt es
    // nur zwei Inserate.
    expect(vorher, 'der Prüfstand hat gar keine Inserate').toBeGreaterThan(5);

    await knoepfeDerAntwort(page, 'Zeige alle DJ auf');
    await page.locator('#qaMessages .eb-qa-msg.bot').last()
      .locator('.eb-qa-action').first().click();
    await page.waitForTimeout(900);

    const r = await page.evaluate(() => ({
      gewaehlt: [...selectedCategories],
      raster: document.getElementById('browseGrid').children.length,
      pfad: location.pathname,
      seite: document.querySelector('.page.active').id,
    }));
    expect(r.gewaehlt, 'die Kategorie kam in der Suche nicht an').toEqual(['dj']);
    expect(r.raster, 'das Raster ist ungefiltert geblieben').toBeLessThan(vorher);
    expect(r.raster, 'das Raster ist leer — gefiltert, aber auf nichts').toBeGreaterThan(0);
    expect(r.seite).toBe('page-browse');
    // Teilbar: wer den Link weitergibt, landet wieder bei den DJs.
    expect(r.pfad).toBe('/browse/dj');
  });

  test('Beschriftung und Ziel wandern zusammen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const k = await knoepfeDerAntwort(page, 'Suche alle DJs');
    const such = k.find((b) => b.ziel === 'browse');
    expect(such, 'es gibt keinen Such-Knopf').toBeTruthy();
    expect(such.daten).toBe('dj');
    // „Suche öffnen" über einem gefilterten Ziel wäre ein Knopf, der
    // woandershin führt, als er verspricht.
    expect(such.label).toContain('DJ');
    expect(such.label).not.toBe('Suche öffnen');
  });

  test('ohne erkannte Kategorie bleibt alles, wie es war', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const k = await knoepfeDerAntwort(page, 'Wie hoch ist die Provision?');
    const such = k.find((b) => b.ziel === 'browse');
    if (such) {
      expect(such.daten, 'eine Kategorie wurde erfunden').toBe('');
    }
    // Gegenprobe: die Antwort trägt überhaupt Knöpfe — sonst belegt der
    // Test nur, dass nichts da ist.
    expect(k.length).toBeGreaterThan(0);
  });

  test('ein Knopf mit eigenem Unterkanal wird NICHT überschrieben', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // „Radar öffnen" trägt `aktuelles/radar` seit dem 15.09.2026. Würde die
    // Kategorie blind über jeden Knopf gelegt, verlöre er sein Ziel — und
    // der Befund von damals wäre zurück.
    const k = await knoepfeDerAntwort(page, 'Wie funktioniert der Radar im Umkreis?');
    const radar = k.find((b) => b.ziel === 'aktuelles');
    expect(radar, 'der Radar-Knopf fehlt').toBeTruthy();
    expect(radar.daten).toBe('radar');
  });

  test('nur `browse` bekommt die Kategorie, nicht jedes Ziel', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const k = await knoepfeDerAntwort(page, 'Zeige alle DJ auf');
    expect(k.some((b) => b.ziel === 'browse' && b.daten === 'dj')).toBe(true);

    // DIE GEGENPROBE IST DER GANZE TEST. Ohne sie überlebte die Mutation
    // „jedes Ziel bekommt die Kategorie": sie macht aus allen drei Knöpfen
    // einen `browse`-Knopf, die Schleife darunter findet dann kein Subjekt
    // mehr und läuft nullmal durch — grün, ohne etwas zu belegen.
    const andere = k.filter((b) => b.ziel !== 'browse');
    expect(andere.length, 'alle Knöpfe zeigen auf browse — das Ziel ging verloren')
      .toBeGreaterThan(0);
    for (const b of andere) {
      expect(b.daten, `${b.ziel} hat eine Kategorie bekommen`).not.toBe('dj');
    }
  });

  test('ein browse-Knopf mit EIGENER Kategorie wird nicht überschrieben', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // Diese Wache hat an der Oberfläche heute KEIN Subjekt: kein Thema
    // trägt einen `browse`-Knopf mit eigenem `data`. Eine Wache ohne
    // Subjekt ist eine Behauptung — dieselbe Lage wie bei
    // `ebAuftragSchluessel()` hinter seiner Gruppierung. Gemessen wird
    // deshalb die AUSGABE des Helfers, nicht die gerenderte Antwort.
    const r = await page.evaluate(() => _qaAktionenMitKategorie([
      { label: 'Catering ansehen', icon: 'restaurant', kind: 'page', target: 'browse', data: 'catering' },
      { label: 'Suche öffnen', icon: 'search', kind: 'page', target: 'browse' },
    ], 'dj').map((a) => a.target + '/' + (a.data || '')));
    expect(r[0], 'die eigene Kategorie wurde überschrieben').toBe('browse/catering');
    expect(r[1], 'der leere Knopf bekam die Kategorie nicht').toBe('browse/dj');
  });

  test('die geteilten Thema-Aktionen werden nicht vergiftet', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    // `topic.actions` sind modulweite Konstanten, die JEDE spätere Antwort
    // wiederverwendet. Wer sie beschreibt statt zu kopieren, hängt den
    // DJ-Filter an die nächste Frage nach dem Impressum.
    await knoepfeDerAntwort(page, 'Zeige alle DJ auf');
    await knoepfeDerAntwort(page, 'Ich brauche einen Fotografen');
    const original = await page.evaluate(() =>
      QA_TOPICS.find((t) => t.id === 'search').actions
        .map((a) => (a.label || '') + '|' + (a.data || '')).join(' · '));
    expect(original, 'die Vorlage trägt jetzt eine Kategorie')
      .toBe('Suche öffnen| · Feed ansehen| · Board planen|');
  });

  test('eine zweite Frage überschreibt die erste Kategorie', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await knoepfeDerAntwort(page, 'Zeige alle DJ auf');
    const k = await knoepfeDerAntwort(page, 'Ich brauche einen Fotografen');
    const such = k.find((b) => b.ziel === 'browse');
    expect(such.daten, 'die alte Kategorie klebt an der neuen Antwort').toBe('foto');
  });

  test('keine tote typeof-Wache auf den gemeinsamen Helfern', () => {
    // `AI_CATEGORIES` ist `const` im selben verketteten Skript: `typeof`
    // WIRFT dort in der TDZ, statt `'undefined'` zu liefern. Genau daran
    // war der Ersatzzweig in `_getNavAiCategories()` toter Code.
    const code = ohneJsKommentare(
      fs.readFileSync(path.join(WURZEL, 'js/modules/ui/31-modals-toast-qabot.js'), 'utf8'));
    expect(code).not.toMatch(/typeof\s+AI_CATEGORIES/);
    expect(code).not.toMatch(/typeof\s+_guideCategoryFor/);
    expect(code).not.toMatch(/typeof\s+ebKategorieBekannt/);
    // Gegenprobe: die Helfer werden überhaupt benutzt.
    expect(code).toContain('_guideCategoryFor(');
    expect(code).toContain('ebKategorieBekannt(');
  });

  test('die Kategorie wird an EINER Stelle angewandt, nicht je Antwortweg', () => {
    // Eine Regel, die man an jedem neuen Zweig wiederholen muss, wird beim
    // nächsten vergessen — dann führt genau dieser Knopf wieder ins Leere.
    const code = ohneJsKommentare(
      fs.readFileSync(path.join(WURZEL, 'js/modules/ui/31-modals-toast-qabot.js'), 'utf8'));
    const treffer = code.match(/_qaAktionenMitKategorie\(/g) || [];
    // Einmal die Definition, einmal die Anwendung — mehr nicht.
    expect(treffer.length).toBe(2);
  });
});

test.describe('Die Wissensnotiz nennt die Kategorien, die es wirklich gibt', () => {
  // Die gemeldete Antwort kam aus dieser Notiz, nicht aus Code: sie nannte
  // „Wellness" (das kein Inserat tragen kann) und verschwieg „Pyrotechnik".
  // Eine siebte gepflegte Fassung derselben Zuordnung — diesmal in Prosa,
  // und sichtbar für jeden Besucher. Sie bekommt hier ihr Subjekt.
  const NOTIZ = fs.readFileSync(
    path.join(WURZEL, 'vault/10-Produkt/Wissen/Suchen-und-Finden.md'), 'utf8');

  /** Die Labels, die ein Anbieter im Formular wirklich wählen kann. */
  function echteLabels() {
    const shell = fs.readFileSync(path.join(WURZEL, 'app-shell.html'), 'utf8');
    const i = shell.indexOf('id="createCategory"');
    const seg = shell.slice(i, shell.indexOf('</select>', i));
    const keys = [...seg.matchAll(/value="([^"]+)"/g)].map((m) => m[1]);

    const src = fs.readFileSync(path.join(WURZEL, 'js/modules/search/11-suche-ki.js'), 'utf8');
    const j = src.indexOf('const AI_CATEGORIES = [');
    const blk = src.slice(j, src.indexOf('\n];', j));
    const tab = {};
    for (const m of blk.matchAll(/key:\s*'([a-z]+)',\s*label:\s*'([^']+)'/g)) tab[m[1]] = m[2];
    return keys.map((k) => tab[k]);
  }

  test('jede genannte Kategorie kann ein Inserat wirklich tragen', () => {
    const labels = echteLabels();
    expect(labels.length, 'das Formular hat keine Kategorien mehr').toBe(10);
    expect(labels.every(Boolean), 'ein Formularwert fehlt in AI_CATEGORIES').toBe(true);

    const i = NOTIZ.indexOf('## Welche Kategorien gibt es?');
    expect(i, 'der Abschnitt heißt anders').toBeGreaterThan(-1);
    const abschnitt = NOTIZ.slice(i, NOTIZ.indexOf('\n## ', i + 5));

    for (const label of labels) {
      expect(abschnitt, `„${label}" fehlt in der Notiz`).toContain(label);
    }
  });

  test('keine Kategorie wird genannt, die es nicht gibt', () => {
    const i = NOTIZ.indexOf('## Welche Kategorien gibt es?');
    const abschnitt = NOTIZ.slice(i, NOTIZ.indexOf('\n## ', i + 5));
    // „Wellness" war der gemeldete Fall: im Formular nicht wählbar, in der
    // Antwort an jeden Besucher genannt. Wer danach sucht, findet nichts.
    expect(abschnitt).not.toMatch(/Wellness/i);
    // „Eventplanung" hiess im Formular nie so — die Kategorie heisst
    // „Planung". Ein Besucher sucht sonst nach einem Chip, den es nicht gibt.
    expect(abschnitt).not.toMatch(/Eventplanung/i);
  });

  test('die ausgelieferte Wissensbasis trägt denselben Stand', () => {
    // Die Notiz ist die Quelle, `eb-knowledge.json` das Ausgelieferte. Wer
    // die Notiz ändert und `build-knowledge.mjs` vergisst, repariert einen
    // Text, den der Bot nie sagt.
    const kb = JSON.parse(fs.readFileSync(path.join(WURZEL, 'assets/eb-knowledge.json'), 'utf8'));
    const eintrag = kb.entries.find((e) => e.heading === 'Welche Kategorien gibt es?');
    expect(eintrag, 'der Abschnitt steht nicht in der Wissensbasis').toBeTruthy();
    expect(eintrag.text).not.toMatch(/Wellness/i);
    expect(eintrag.text).toContain('Pyrotechnik');
  });
});
