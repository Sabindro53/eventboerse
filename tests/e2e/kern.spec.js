// Neuronaler Kern, Autonomie und Modell-Ensemble.
//
// Die tragende Regel dieser Oberfläche: **ein Impuls entspricht einem echten
// Ereignis**. Eine Dauer-Animation wäre bequemer und sähe lebendiger aus —
// und wäre genau dann wertlos, wenn man sich auf die Anzeige verlässt, weil
// ein stillstehendes System dann aussieht wie ein arbeitendes.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const KATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'eb-models.json'), 'utf8'));
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');

test.describe('Ensemble-Katalog', () => {
  test('Prüfung läuft sauber durch', () => {
    const out = execFileSync('node', ['scripts/models.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/Rollen eindeutig, jede Grenze begründet/);
  });

  test('ausschließlich offene Modelle', () => {
    // Der Grund, warum es diese Liste gibt: was heute über einen Anbieter
    // läuft, muss morgen auf eigener Hardware laufen können.
    for (const m of KATALOG.modelle) {
      expect(m.offen, `${m.id} ist nicht offen`).toBe(true);
      expect(m.lizenz, `${m.id} ohne Lizenz`).toBeTruthy();
    }
  });

  test('jedes Modell hat genau eine Rolle, jeder Bereich mindestens ein Modell', () => {
    const rollen = KATALOG.modelle.map((m) => m.rolle);
    for (const m of KATALOG.modelle) {
      expect(m.rolle, `${m.id} ohne Rolle`).toBeTruthy();
      expect(m.aufgabe.length, `${m.id}: Aufgabe zu vage`).toBeGreaterThan(25);
    }
    // Ein Allrounder wäre im Betrieb nicht nachvollziehbar: fällt er aus,
    // weiß niemand, was genau fehlt.
    expect(new Set(rollen).size, 'Rollen müssen unterscheidbar sein').toBe(rollen.length);
    for (const b of KATALOG.bereiche) {
      expect(KATALOG.modelle.some((m) => m.bereich === b.id), `${b.id} ohne Modell`).toBe(true);
    }
  });

  test('jede Autonomie-Grenze ist begründet', () => {
    for (const b of KATALOG.bereiche) {
      expect(Object.keys(KATALOG.autonomieStufen)).toContain(b.autonomie);
      // Eine Grenze ohne Begründung wird irgendwann verschoben, weil niemand
      // mehr weiß, warum sie da war.
      expect(b.begruendung.length, `${b.id}: Begründung zu dünn`).toBeGreaterThan(40);
    }
  });

  test('Geld löst nichts von allein aus', () => {
    const finance = KATALOG.bereiche.find((b) => b.id === 'finance');
    expect(finance.autonomie, 'eine Überweisung ist nicht rückholbar').toBe('vorbereit');
  });

  test('jede besetzte Stelle hat Auslöser, echte Schicht und Gehaltsvergleich', () => {
    const workflows = fs.readdirSync(path.join(ROOT, '.github', 'workflows'));
    for (const m of KATALOG.modelle) {
      expect(m.ausloeser, `${m.id} ohne Auslöser`).toBeTruthy();
      expect(m.vergleichsstelle, `${m.id} ohne Vergleichsstelle`).toBeTruthy();
      if (m.schicht) {
        // Eine erfundene Schicht wäre genau die Sorte Behauptung, die dieses
        // Dashboard vermeiden soll — der Workflow muss es wirklich geben.
        expect(workflows, `${m.id}: Workflow ${m.schicht} existiert nicht`).toContain(m.schicht);
        expect(KATALOG.schichten[m.schicht], `${m.id}: Schicht nicht beschrieben`).toBeTruthy();
        expect(m.gehaltVergleich, `${m.id}: Stelle ohne Gehaltsvergleich`).toBeGreaterThan(0);
      } else {
        // Ohne Schicht keine Stelle — und dann auch kein Gehalt.
        expect(m.gehaltVergleich, `${m.id}: Gehalt ohne Schicht`).toBe(0);
      }
    }
  });

  test('Katalog behauptet keinen Laufzeit-Zustand', () => {
    for (const m of KATALOG.modelle) {
      expect(m).not.toHaveProperty('status');
      expect(m).not.toHaveProperty('aktiv');
      expect(m).not.toHaveProperty('verbunden');
    }
  });
});

test.describe('Neuronaler Kern', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2200);
  });

  test('Kern zeichnet drei Ebenen: Bereiche, Mitarbeiter, Werkzeuge', async ({ page }) => {
    const r = await page.evaluate(() => ({
      bereiche: document.querySelectorAll('[data-bereich]').length,
      agenten: document.querySelectorAll('[data-modell]').length,
      werkzeuge: document.querySelectorAll('[data-werkzeug]').length,
      orb: !!document.getElementById('nn-orb'),
      karten: document.querySelectorAll('.bereich').length,
      mitarbeiterkarten: document.querySelectorAll('.modell').length,
    }));
    expect(r.bereiche, 'sechs Bereiche im inneren Ring').toBe(6);
    expect(r.agenten, 'zehn Mitarbeiter im mittleren Ring').toBe(10);
    expect(r.werkzeuge, 'Werkzeuge im äußeren Ring').toBeGreaterThan(0);
    expect(r.orb).toBe(true);
    expect(r.karten).toBe(6);
    expect(r.mitarbeiterkarten).toBe(10);
  });

  test('die Dichte des Wissenskerns folgt der echten Wissensbasis', async ({ page }) => {
    const r = await page.evaluate(() => ({
      punkte: document.querySelectorAll('#nn circle[fill="#f0abfc"]').length,
      kopf: document.getElementById('neural-sub').textContent,
    }));
    // Ein dichter Kern bei leerem Vault wäre Dekoration.
    expect(r.punkte, 'der Kern besteht aus so vielen Punkten wie es Abschnitte gibt').toBeGreaterThan(10);
    expect(r.kopf).toMatch(/\d+ Wissens-Abschnitte/);
  });

  test('Werkzeuge sind echte Connectors, keine Deko', async ({ page }) => {
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll('[data-werkzeug]')].map((n) => n.dataset.werkzeug));
    const katalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'eb-connectors.json'), 'utf8'));
    const bekannt = katalog.connectors.map((c) => c.id);
    for (const id of ids) {
      expect(bekannt, `Werkzeug ${id} steht nicht im Connector-Katalog`).toContain(id);
    }
  });

  test('Impulse sind einmalig und verschwinden wieder', async ({ page }) => {
    const vorher = await page.evaluate(() => document.querySelectorAll('.nn-impuls').length);
    await page.evaluate(() => ebImpuls('betrieb', 'gut'));
    const waehrend = await page.evaluate(() => document.querySelectorAll('.nn-impuls').length);
    await page.waitForTimeout(1400);
    const nachher = await page.evaluate(() => document.querySelectorAll('.nn-impuls').length);

    expect(waehrend, 'ein Impuls muss sichtbar werden').toBeGreaterThan(vorher);
    // Der Kern der Regel: nach dem Ereignis ist die Bahn wieder leer.
    expect(nachher, 'ein Impuls darf nicht endlos weiterlaufen').toBe(0);
  });

  test('nichts im Kern animiert dauerhaft ohne echten Anlass', async ({ page }) => {
    // Bahnen und Impulse dürfen nie dauerschleifen.
    const dauer = HQ.match(/\.nn-(bahn|impuls)[^}]*infinite/g) || [];
    expect(dauer, 'Bahnen und Impulse dürfen nicht dauerschleifen').toEqual([]);

    // Genau zwei Dauer-Animationen sind erlaubt, und beide hängen an einem
    // echten Zustand: der Hör-Ring läuft nur bei offenem Mikrofon, der
    // Arbeits-Puls nur, solange ein Workflow in_progress ist.
    expect(HQ).toMatch(/\.neural\.hoert .nn-orb-ring\s*\{\s*animation/);
    expect(HQ).toMatch(/\.nn-node\.arbeitet .nn-ring\s*\{\s*animation/);

    // Ohne laufenden Workflow trägt kein Knoten die Arbeits-Klasse.
    const arbeitend = await page.evaluate(() => document.querySelectorAll('.nn-node.arbeitet').length);
    expect(arbeitend, 'ohne echten Lauf darf nichts „arbeitet gerade" zeigen').toBe(0);
  });

  test('Arbeitsstand kommt aus echten Workflow-Läufen', async ({ page }) => {
    // Ohne Token gibt es keine Läufe — dann steht dort „unbekannt", nicht
    // „bereit". Eine Rolle, die nie lief, darf nicht wie eine aussehen, die
    // gerade fertig wurde.
    const staende = await page.evaluate(() =>
      [...document.querySelectorAll('.modell .stand')].map((s) => s.textContent.trim()));
    expect(staende.length).toBe(10);
    const erfunden = staende.filter((t) => /bereit|aktiv|läuft$/i.test(t));
    expect(erfunden, `kein Stand darf Bereitschaft behaupten: ${staende.join(' | ')}`).toEqual([]);
    expect(staende.some((t) => /unbekannt|lokal|zuletzt|arbeitet/i.test(t))).toBe(true);
  });

  test('Klick auf die Mitte startet die Stimme, nicht nur ein Textfeld', async ({ page }) => {
    // Vorher öffnete der Kreis bloß den Chat in der Ecke — das ist die
    // Bedienung eines Eingabefelds, nicht einer Stimme. Wer auf einen
    // sprechenden Kreis tippt, will reden.
    expect(HQ).toMatch(/sprich:\s*function/);
    const r = await page.evaluate(() => {
      let mikro = false;
      const echt = window.ebCircleAPI.sprechen;
      window.ebCircleAPI.sprechen = () => { mikro = true; };
      // sprich() ruft intern toggleMic — hier zählt, dass der Klick beides
      // auslöst: Oberfläche auf UND Mikrofon an.
      document.getElementById('nn-orb').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      window.ebCircleAPI.sprechen = echt;
      return { offen: !!document.querySelector('#eb-circle-panel.open') };
    });
    expect(r.offen, 'die Sprachoberfläche muss aufgehen').toBe(true);
    // Der Aufruf muss beides tun — im Test-Browser gibt es keine echte
    // Spracherkennung, deshalb wird die Verdrahtung im Quelltext geprüft.
    const sprich = HQ.slice(HQ.indexOf('sprich: function'), HQ.indexOf('sprich: function') + 260);
    expect(sprich).toMatch(/open\(\)/);
    expect(sprich).toMatch(/toggleMic\(\)/);
  });

  test('Bereiche klappen in ihr eigenes Teilnetz auf und wieder zu', async ({ page }) => {
    const auf = await page.evaluate(() => {
      nnOeffne('intelligence');
      return {
        modelle: document.querySelectorAll('[data-modell]').length,
        bereiche: document.querySelectorAll('[data-bereich]').length,
        zurueck: !!document.getElementById('nn-zurueck'),
        orb: !!document.getElementById('nn-orb'),
      };
    });
    const erwartet = KATALOG.modelle.filter((m) => m.bereich === 'intelligence').length;
    expect(auf.modelle, 'im Bereich stehen seine Rollen').toBe(erwartet);
    expect(auf.bereiche, 'die Bereichsknoten weichen den Rollen').toBe(0);
    // Baum statt Ring: die Rollen stehen in einer Reihe über dem Bereich.
    expect(auf.zurueck, 'die Mitte wird zum Rückweg').toBe(true);
    expect(auf.orb, 'im Teilnetz gibt es keinen Sprech-Kreis').toBe(false);

    const zu = await page.evaluate(() => {
      document.getElementById('nn-zurueck').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return {
        bereiche: document.querySelectorAll('[data-bereich]').length,
        orb: !!document.getElementById('nn-orb'),
      };
    });
    expect(zu.bereiche).toBe(6);
    expect(zu.orb).toBe(true);
  });

  test('jeder Bereich lässt sich aufklappen', async ({ page }) => {
    for (const b of KATALOG.bereiche) {
      const n = await page.evaluate((id) => {
        nnOeffne(id);
        return document.querySelectorAll('[data-modell]').length;
      }, b.id);
      expect(n, `${b.id} zeigt keine Rollen`).toBeGreaterThan(0);
    }
  });

  test('„Wartet auf dich" listet genau die Bereiche mit Grenze', async ({ page }) => {
    const n = await page.evaluate(() => document.querySelectorAll('.wartet-item').length);
    const erwartet = KATALOG.bereiche.filter((b) => b.autonomie !== 'voll').length;
    expect(n).toBe(erwartet);
    // Die Grenze steht mit Begründung da, nicht als stille Sperre.
    const text = await page.evaluate(() => document.getElementById('wartet').textContent);
    expect(text).toContain('Reversibilität');
    for (const b of KATALOG.bereiche.filter((x) => x.autonomie !== 'voll')) {
      expect(text).toContain(b.label);
    }
  });

  test('Bereichs-Knoten sind mit der Tastatur erreichbar', async ({ page }) => {
    const ok = await page.evaluate(() =>
      [...document.querySelectorAll('.nn-node, #nn-orb')].every(
        (n) => n.getAttribute('tabindex') === '0' && !!n.getAttribute('aria-label'))
    );
    expect(ok, 'Knoten und Kreis brauchen tabindex und Label').toBe(true);
  });
});
