// Der Radar verschwand auf „Entdecken" — und die Reiter dorthin liefen um die Wette.
//
// Gemeldet am 31.08.2026: „bei Entdecken verschwindet der Radar". Er war
// nicht kaputt, er hatte dort schlicht keinen Einstieg: die Reiterleiste auf
// `#page-aktuelles` trägt einen Radar-Knopf, die auf `#page-explore` trug
// keinen.
//
// Beim Nachsehen kam ein zweiter, älterer Fehler mit heraus. Die
// Entdecken-Reiter führten auf eine andere Seite und taten das so:
//
//   navigateTo('aktuelles');
//   setTimeout(() => switchFeedTab(knopf), 80);
//
// `navigateTo('aktuelles')` rendert aber erst NACH `loadDbListings()` —
// asynchron. Dauert das Laden länger als 80 ms, kommt:
//
//   80 ms   switchFeedTab('gesuche')  → Liste zeigt Gesuche
//   300 ms  renderFeed('foryou')      → Liste zeigt „Für dich"
//
// Der Reiter bleibt markiert, darunter steht etwas anderes. Das sieht nicht
// nach einem Fehler aus, sondern nach einer Seite, die einen nicht versteht.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

/** Lädt die App und sammelt Seitenfehler — ein stiller Absturz zählt nicht als Erfolg. */
async function appOeffnen(page) {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.navigateTo === 'function');
  return fehler;
}

test.describe('Der Radar ist von „Entdecken" aus erreichbar', () => {
  test('die Entdecken-Leiste hat einen Radar-Einstieg', async ({ page }) => {
    await appOeffnen(page);
    const knopf = page.locator('#page-explore .feed-tab-radar');
    await expect(knopf, 'auf Entdecken fehlt der Radar').toHaveCount(1);
    await expect(knopf).toContainText('Radar');
  });

  test('ein Klick dort öffnet wirklich den Radar-Kanal', async ({ page }) => {
    // Das ist der gemeldete Fehler, am Verhalten geprüft: nicht „gibt es
    // den Knopf", sondern „kommt man damit an".
    const fehler = await appOeffnen(page);
    await page.evaluate(() => navigateTo('explore'));
    await page.click('#page-explore .feed-tab-radar');
    await page.waitForFunction(
      () => document.getElementById('page-aktuelles')
        && document.getElementById('page-aktuelles').classList.contains('active'),
      null, { timeout: 10000 });
    await page.waitForFunction(
      () => !!document.querySelector('#feedRadarMap'), null, { timeout: 10000 });
    expect(fehler, `Seitenfehler: ${fehler.join(' | ')}`).toHaveLength(0);
  });

  test('der Radar-Reiter auf „Aktuelles" ist danach markiert', async ({ page }) => {
    // Reiter und Inhalt müssen zusammenpassen. Genau das taten sie nicht.
    await appOeffnen(page);
    await page.evaluate(() => navigateTo('explore'));
    await page.click('#page-explore .feed-tab-radar');
    await page.waitForFunction(
      () => !!document.querySelector('#feedRadarMap'), null, { timeout: 10000 });
    await expect(page.locator('#page-aktuelles .feed-tab-radar')).toHaveClass(/active/);
  });
});

test.describe('Reiter und Inhalt laufen nicht mehr um die Wette', () => {
  test('auch bei langsamem Laden zeigt die Liste den markierten Kanal', async ({ page }) => {
    // Der Kern des alten Fehlers. `loadDbListings` wird künstlich verzögert;
    // mit dem alten setTimeout(…,80) hätte `foryou` den gewählten Kanal
    // überschrieben, nachdem der Reiter schon markiert war.
    await appOeffnen(page);
    await page.evaluate(() => {
      const echt = window.loadDbListings;
      window.loadDbListings = function () {
        return new Promise((r) => setTimeout(() => r(echt.apply(this, arguments)), 600));
      };
    });
    await page.evaluate(() => navigateTo('explore'));
    await page.click('#page-explore .feed-tab[onclick*="gesuche"]');
    await page.waitForFunction(
      () => document.getElementById('page-aktuelles')
        && document.getElementById('page-aktuelles').classList.contains('active'),
      null, { timeout: 10000 });
    // Lange genug warten, dass die verzögerte Ladung ihr Rendern nachgeholt hat.
    await page.waitForTimeout(1200);
    const zustand = await page.evaluate(() => {
      const aktiv = document.querySelector('#page-aktuelles .feed-tab.active');
      return { markiert: aktiv && aktiv.dataset.feed };
    });
    expect(zustand.markiert, 'der markierte Reiter ist nicht der gewählte')
      .toBe('gesuche');
  });

  test('kein Reiter benutzt noch das setTimeout-Wettrennen', () => {
    // Ein Muster, das nur meistens funktioniert, kehrt gern zurück.
    const shell = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');
    expect(shell, 'ein Reiter rennt wieder gegen das Laden an')
      .not.toMatch(/navigateTo\('aktuelles'\);\s*setTimeout/);
  });

  test('der Kanal geht über navigateTo, nicht über einen Zeitgeber', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'app-shell.html'), 'utf8');
    for (const kanal of ['gesuche', 'events', 'newest', 'popular', 'radar']) {
      expect(shell, `Kanal ${kanal} wird nicht mitgegeben`)
        .toContain(`navigateTo('aktuelles','${kanal}')`);
    }
  });
});

test.describe('Ein Deep-Link auf einen Kanal funktioniert', () => {
  test('/aktuelles/radar öffnet den Radar direkt', async ({ page }) => {
    // Fällt als Zugabe ab: `_spaPath` und `_readSpaRoute` reichen das zweite
    // Pfadsegment ohnehin in beide Richtungen durch.
    await appOeffnen(page);
    await page.evaluate(() => navigateTo('aktuelles', 'radar'));
    await page.waitForFunction(
      () => !!document.querySelector('#feedRadarMap'), null, { timeout: 10000 });
    await expect(page.locator('#page-aktuelles .feed-tab-radar')).toHaveClass(/active/);
  });

  test('ohne Kanal bleibt es bei „Für dich"', async ({ page }) => {
    await appOeffnen(page);
    await page.evaluate(() => navigateTo('aktuelles'));
    await page.waitForFunction(
      () => !!document.querySelector('#page-aktuelles .feed-tab.active'), null, { timeout: 10000 });
    const feed = await page.evaluate(
      () => document.querySelector('#page-aktuelles .feed-tab.active').dataset.feed);
    expect(feed).toBe('foryou');
  });
});

test.describe('Keine toten Doppelgänger im Feed-Code', () => {
  /** Jede Funktionsdeklaration auf oberster Ebene, mit ihren Fundorten. */
  function funktionsorte() {
    const liste = fs.readFileSync(path.join(ROOT, 'js', 'modules', 'modules.list'), 'utf8')
      .split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
    const wo = new Map();
    for (const p of liste) {
      const t = fs.readFileSync(path.join(ROOT, 'js', 'modules', p), 'utf8');
      // `async function` gehört dazu — die erste Fassung dieses Tests las nur
      // `function` und hätte eine doppelte async-Funktion nicht gesehen.
      for (const m of t.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
        if (!wo.has(m[1])) wo.set(m[1], []);
        wo.get(m[1]).push(p);
      }
    }
    return wo;
  }

  test('die Erhebung findet die Module und ihre Funktionen', () => {
    const wo = funktionsorte();
    expect(wo.size, 'keine Funktionen gefunden — der Test prüft nichts')
      .toBeGreaterThan(500);
  });

  test('KEINE Funktion ist zweimal deklariert', () => {
    // Verallgemeinert am 02.09.2026. Vorher standen hier zwei Namen —
    // renderFeed und switchFeedTab, die beiden, die schon aufgefallen waren.
    // Ein Test, der die bekannten Fälle aufzählt, findet nie einen neuen.
    //
    // Er fand sofort einen: `_fetchWithTimeout` stand in core/00-basis.js UND
    // core/30-auth.js, und die Auth-Fassung gewann für alle Aufrufer — mit
    // halbem Standard-Zeitlimit (15 s statt 30 s), ohne den
    // AbortController-Rückfall, und sie VERÄNDERTE das options-Objekt des
    // Aufrufers statt es zu kopieren.
    //
    // app.js ist eine VERKETTUNG: bei zwei gleichnamigen Deklarationen gewinnt
    // die spätere, lautlos. Die frühere — die, die man zuerst findet — ist
    // wirkungslos, und ihr Verhalten steht trotzdem im Code und in jedem
    // Kommentar darüber.
    const doppelt = [...funktionsorte()]
      .filter(([, orte]) => orte.length > 1)
      .map(([name, orte]) => `${name} (${orte.join(' + ')}, es gewinnt ${orte[orte.length - 1]})`);
    expect(doppelt, `doppelt deklariert: ${doppelt.join('; ')}`).toHaveLength(0);
  });
});
