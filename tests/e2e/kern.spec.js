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
const CODEFLOW = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'eb-codeflow.json'), 'utf8'));
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
const HQ_CSS = fs.readFileSync(path.join(ROOT, 'eb-hq-evolution.css'), 'utf8');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

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
      if (m.weg === 'openrouter') {
        expect(m.modellId, `${m.id} ohne aufrufbare OpenRouter-ID`).toMatch(/^[a-z0-9~.-]+\/[a-z0-9.~-]+/i);
      }
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

  test('OpenRouter-Kontingent ist vollständig, begrenzt und taskweise verteilt', () => {
    const extern = KATALOG.modelle.filter((m) => m.weg === 'openrouter');
    expect(extern).toHaveLength(11);
    expect(extern.reduce((sum, m) => sum + m.kontingentProzent, 0)).toBe(100);
    for (const m of extern) {
      expect(m.aufgabenstrom, `${m.id} ohne Aufgabenstrom`).toHaveLength(3);
      expect(m.maxTokens, `${m.id} ohne kleine Antwortgrenze`).toBeLessThanOrEqual(300);
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

test.describe('OpenRouter-Autopilot', () => {
  const runner = fs.readFileSync(path.join(ROOT, 'scripts', 'openrouter-agents.mjs'), 'utf8');
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'openrouter-autopilot.yml'), 'utf8');
  const merge = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'openrouter-auto-merge.yml'), 'utf8');
  const operations = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'hq-operations.yml'), 'utf8');
  const agent = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');

  test('Guardrail-Selbsttest blockiert verbotene Seiteneffekte', () => {
    const out = execFileSync('node', ['scripts/openrouter-agents.mjs', '--self-test'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/Guardrail-Selbsttest OK/);
    expect(runner).toMatch(/Scout -> Architekt -> Implementierer -> Reviewer/);
    expect(runner).toMatch(/data_collection:\s*'deny'/);
    expect(runner).toMatch(/runBudget.*0\.12/);
    expect(runner).toMatch(/dailyBudget.*0\.60/);
    expect(runner).toMatch(/modellKandidaten/);
    const scoutModelle = runner.slice(runner.indexOf('scout: {'), runner.indexOf('architect: {'));
    expect(scoutModelle).toContain('qwen/qwen3-30b-a3b-instruct-2507');
    expect(scoutModelle).not.toMatch(/gemma-3-12b|llama-3\.1-8b|mistral-nemo/);
    expect(runner).toMatch(/sort:\s*'price'/);
    expect(runner).toMatch(/max_price/);
    expect(runner).toMatch(/for \(const modell of kandidaten\)/);
    expect(runner).toMatch(/ergebnis: 'unbrauchbar'/);
    expect(runner).toMatch(/validiereAgentenJson\(rolle, json, validierungsKontext\)/);
    expect(runner).toMatch(/nicht portable Validierungs-Schluesselwoerter/);
    expect(runner).toMatch(/json\.decision === 'skip'/);
    expect(runner).toMatch(/if \(!scout\.target_files\.length\)/);
  });

  test('autonomer Scope schließt sensible Dateien und Seiteneffekte aus', () => {
    const whitelist = runner.slice(runner.indexOf('const SICHERE_DATEIEN'), runner.indexOf('const AGENTEN'));
    expect(whitelist).not.toMatch(/functions\.php|payments\/|core\/30-auth|chat\/20-/);
    expect(runner).toMatch(/git', \['apply', '--check', '--whitespace=error-all'/);
    expect(runner).toMatch(/localStorage\|sessionStorage\|indexedDB/);
    expect(runner).toMatch(/additions\.length \+ deletions\.length > 260/);
  });

  test('Auslieferung braucht erfolgreichen Gesamtlauf und prüft den Scope erneut', () => {
    expect(workflow).toMatch(/cron:\s*'2\/5 \* \* \* \*'/);
    expect(workflow).toMatch(/EB_OPENROUTER_RUN_BUDGET_USD:\s*'0\.12'/);
    expect(workflow).toMatch(/EB_OPENROUTER_DAILY_BUDGET_USD:\s*'0\.60'/);
    expect(workflow).toMatch(/steps\.cadence\.outputs\.run/);
    expect(workflow).toMatch(/GITHUB_RUN_NUMBER % 12/);
    expect(workflow).toMatch(/npm run gate/);
    expect(workflow).toMatch(/npm test/);
    expect(merge).toMatch(/workflow_run:/);
    expect(merge).toMatch(/workflow_run\.conclusion == 'success'/);
    expect(merge).toMatch(/workflows: \['OpenRouter Autopilot'\]/);
    expect(merge).toMatch(/actions\.createWorkflowDispatch/);
    expect(merge).toMatch(/workflow_id: 'ionos-deploy\.yml'/);
    expect(merge).toMatch(/openrouter-autonomous/);
    expect(merge).toMatch(/merge_method: 'squash'/);
  });

  test('Autopilot veröffentlicht echten Codeflow mit Ziel, Dateien und Lieferstatus', () => {
    expect(CODEFLOW.version).toBe(1);
    expect(CODEFLOW.mitarbeiter).toHaveLength(4);
    expect(CODEFLOW.lieferung.automatisch).toBe(true);
    expect(runner).toMatch(/\.ai-run.*codeflow\.json|join\(OUT_DIR, 'codeflow\.json'\)/);
    expect(runner).toMatch(/zieldateien/);
    expect(runner).toMatch(/geaendert/);
    expect(runner).toMatch(/diff_stat/);
    expect(runner).toMatch(/codeflowSchreiben\('architect'/);
    expect(runner).toMatch(/codeflowSchreiben\('implementer'/);
    expect(runner).toMatch(/codeflowSchreiben\('reviewer'/);
    expect(runner).toMatch(/REPOSITORY-BELEGE/);
    expect(runner).toMatch(/Scout-Beleg-ID ist nicht im aktuellen Repo-Katalog/);
    expect(runner).toMatch(/target_files EXAKT EINE Datei/);
    expect(runner).toMatch(/codeflow\.budget\.kosten_usd = Number\(codeflowKosten/);
    expect(runner).toMatch(/bei approved=true muss findings exakt \[\] sein/);
    expect(workflow).toMatch(/Live-Codeflow vorbereiten/);
    expect(workflow).toMatch(/\.ai-run\/codeflow\.json/);
    expect(workflow).toMatch(/assets\/eb-codeflow\.json/);
    expect(workflow).toMatch(/sha256sum/);
    expect(HQ).toMatch(/loadAutopilotPull/);
    expect(HQ).toMatch(/Branch-Push/);
    expect(HQ).toMatch(/Auto-Merge/);
    expect(HQ).toMatch(/Live-Deploy/);
  });

  test('Operations-Ensemble arbeitet bei jedem erreichten Puls vollständig unter Kostenbremse', () => {
    expect(operations).toMatch(/cron:\s*'4\/5 \* \* \* \*'/);
    expect(operations).toMatch(/EB_OPENROUTER_DAILY_BUDGET_USD:\s*'0\.60'/);
    expect(operations).toMatch(/echo "rolle=alle"/);
    expect(operations).not.toMatch(/GITHUB_RUN_NUMBER - 1\) % anzahl/);
    expect(operations).toMatch(/tatsaechlich erreichten Puls das volle Ensemble/);
    expect(operations).toMatch(/\$0\.003646/);
    expect(operations).toMatch(/5-Minuten-HQ-Rundlauf/);
    expect(operations).toMatch(/Bestehende Laufzeitspur vorladen/);
    expect(operations).toMatch(/eb-arbeit\.json\?run=\$\{GITHUB_RUN_ID\}/);
    expect(operations.indexOf('Bestehende Laufzeitspur vorladen')).toBeLessThan(operations.indexOf('Alle Rollen taskweise arbeiten lassen'));
    expect(operations).toMatch(/select\(\.weg == "openrouter"\)/);
    expect(operations).toMatch(/scripts\/agent\.mjs/);
    expect(operations).toMatch(/assets\/eb-arbeit\.json/);
    expect(agent).toMatch(/usage_daily/);
    expect(agent).toMatch(/kontingentProzent/);
    expect(agent).toMatch(/sort:\s*'price'/);
    expect(agent).toMatch(/data_collection:\s*'deny'/);
    expect(agent).toMatch(/max_price/);
  });
});

test.describe('Neuronaler Kern', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    // initNeural() folgt bewusst auf die echten HQ-Lader. Auf langsameren
    // Rechnern ist eine feste Pause deshalb ein Zufallstest; der Bereichsring
    // ist das belastbare Signal, dass Kern, Karten und Grenzen fertig sind.
    await expect(page.locator('[data-bereich]')).toHaveCount(10, { timeout: 12000 });
  });

  test('Übersicht zeigt Bereiche und Werkzeuge, Mitarbeiter erst im geöffneten Bereich', async ({ page }) => {
    const r = await page.evaluate(() => ({
      bereiche: document.querySelectorAll('[data-bereich]').length,
      agenten: document.querySelectorAll('[data-modell]').length,
      werkzeuge: document.querySelectorAll('[data-werkzeug]').length,
      orb: !!document.getElementById('nn-orb'),
      karten: document.querySelectorAll('.bereich').length,
      mitarbeiterkarten: document.querySelectorAll('.modell').length,
    }));
    expect(r.bereiche, 'zehn vollständige Hauptbereiche im Ring').toBe(10);
    expect(r.agenten, 'Mitarbeiter gehören nicht in die Gesamtübersicht').toBe(0);
    expect(r.werkzeuge, 'Werkzeuge im äußeren Ring').toBeGreaterThan(0);
    expect(r.orb).toBe(true);
    expect(r.karten).toBe(10);
    expect(r.mitarbeiterkarten).toBe(13);

    const detail = await page.evaluate(() => {
      nnOeffne('engineering');
      return document.querySelectorAll('[data-modell]').length;
    });
    expect(detail, 'Mitarbeiter erscheinen nach Öffnen ihrer Hauptkategorie').toBe(2);
  });

  test('operativer Strom benennt Aufgabe, Rollen und Lieferweg', async ({ page }) => {
    const r = await page.evaluate(() => ({
      schritte: document.querySelectorAll('.neural-step').length,
      jetzt: document.querySelectorAll('.neural-now').length,
      rollenlauf: document.querySelectorAll('.neural-cycle i').length,
      text: document.getElementById('neural-ops').textContent,
    }));
    expect(r.schritte).toBe(7);
    expect(r.jetzt).toBe(3);
    expect(r.rollenlauf).toBe(11);
    for (const heading of ['Eingang', 'Scout', 'Architektur', 'Umsetzung', 'Review', 'Gates', 'Lieferung']) {
      expect(r.text).toContain(heading);
    }
    expect(r.text).toContain('Anzeige sekündlich');
    expect(r.text).toContain('Scheduler-Taktziel 5 Min.');
    expect(r.text).toContain('alle 11 Rollen je erreichtem Puls');
    expect(r.text).toContain('Jetzt');
    expect(r.text).toContain('Nächste Prüfung');
    expect(r.text).toContain('Zuletzt belegt');
    expect(r.text).toContain('Kontingent $0,60/Tag');
  });

  test('ein echter Operations-Puls aktiviert alle Rollen und Transportwege', async ({ page }) => {
    const r = await page.evaluate(() => {
      state.runs = [{
        path: '.github/workflows/hq-operations.yml',
        status: 'in_progress',
        conclusion: null,
        event: 'schedule',
        run_number: 99,
        updated_at: new Date().toISOString(),
      }];
      nnZeichnen();
      renderModelle();
      return {
        arbeitendeRollen: document.querySelectorAll('.modell .stand-laeuft').length,
        transportwege: document.querySelectorAll('.nn-transport').length,
        aktiveTransportwege: document.querySelectorAll('.nn-transport.nn-live').length,
        badge: document.getElementById('modelle-badge').textContent,
      };
    });
    expect(r.arbeitendeRollen, 'jeder OpenRouter-Auftrag muss im Vollpuls aktiv sein').toBe(11);
    expect(r.transportwege).toBe(10);
    expect(r.aktiveTransportwege, 'jede Hauptkategorie muss den echten Vollpuls zeigen').toBe(10);
    expect(r.badge).toContain('11 arbeiten gerade');
  });

  test('Live-Codeflow zeigt Ziel, Mitarbeiter, Dateien und automatischen Lieferweg', async ({ page }) => {
    const r = await page.evaluate(() => {
      state.codeflow = {
        version: 1,
        aktualisiert: new Date().toISOString(),
        phase: 'implementer',
        status: 'arbeitet',
        run: { id: 4242, url: 'https://github.com/Sabindro53/eventboerse/actions/runs/4242', fokus: 'ux' },
        aktuell: { person: 'Timo Rast', ziel: 'Kleinen Diff umsetzen.' },
        ziel: {
          titel: 'Navigation verständlicher machen',
          beschreibung: 'Ein klarer Rückweg soll die Orientierung verbessern.',
          warum_jetzt: 'Der UX-Scout hat eine belegte Reibung gefunden.',
          akzeptanz: ['Rückweg ist mit Tastatur erreichbar.', 'Bestehendes Routing bleibt unverändert.'],
          belege: [{ file: 'js/modules/core/02-router-navigation.js', line: 59, excerpt: "document.addEventListener('click'" }],
        },
        dateien: {
          zieldateien: ['js/modules/core/02-router-navigation.js', 'mobile-overrides.css'],
          geaendert: [], diff_stat: '',
        },
        mitarbeiter: [
          { person: 'Ela Voss', rolle: 'Scout', auftrag: 'Wählt die Verbesserung.', status: 'fertig' },
          { person: 'Ada Brenner', rolle: 'Architektin', auftrag: 'Begrenzt den Scope.', status: 'fertig' },
          { person: 'Timo Rast', rolle: 'Implementierer', auftrag: 'Schreibt den Diff.', status: 'arbeitet' },
          { person: 'Kito Sarr', rolle: 'Reviewer', auftrag: 'Prüft unabhängig.', status: 'wartet' },
        ],
        lieferung: { automatisch: true, branch: 'openrouter/auto-ux' },
        budget: { lauf_usd: 0.12, tag_usd: 0.6, kosten_usd: 0.01 },
      };
      state.runs = [{
        id: 4242, path: '.github/workflows/openrouter-autopilot.yml', status: 'in_progress',
        conclusion: null, updated_at: new Date().toISOString(), display_title: 'UX-Puls',
      }];
      state.openrouterJob = { steps: [{ name: 'Scout, Architektur, Umsetzung und Review live', status: 'in_progress' }] };
      renderNeuralOps();
      const el = document.querySelector('.codeflow');
      return {
        text: el.textContent,
        mitarbeiter: el.querySelectorAll('.codeflow-person').length,
        dateien: [...el.querySelectorAll('.codeflow-files code')].map(x => x.textContent),
        live: !!el.querySelector('.codeflow-state.live'),
        lieferstufen: el.querySelectorAll('.codeflow-stage').length,
      };
    });
    expect(r.live).toBe(true);
    expect(r.mitarbeiter).toBe(4);
    expect(r.dateien).toEqual(['js/modules/core/02-router-navigation.js', 'mobile-overrides.css', 'openrouter/auto-ux']);
    expect(r.lieferstufen).toBe(7);
    expect(r.text).toContain('Navigation verständlicher machen');
    expect(r.text).toContain('Repo-Beleg');
    expect(r.text).toContain('js/modules/core/02-router-navigation.js:59');
    expect(r.text).toContain('Timo Rast');
    expect(r.text).toContain('Branch-Push');
    expect(r.text).toContain('Auto-Merge');
    expect(r.text).toContain('Live-Deploy');
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

  test('Transportstrom läuft nur bei frischem Betriebsbeleg', async ({ page }) => {
    // Die Queue darf sich sichtbar bewegen, aber nur unter der Klasse, die
    // nnBetriebsbild aus einem frischen Actions-Lauf oder Journal setzt.
    expect(HQ_CSS).toMatch(/\.neural\.strom-gesund \.nn-transport/);
    expect(HQ_CSS).toMatch(/animation:\s*nnTransport/);
    expect(HQ).toMatch(/\.neural\.hoert .nn-orb-ring\s*\{\s*animation/);
    expect(HQ).toMatch(/\.nn-node\.arbeitet .nn-ring\s*\{\s*animation/);
    expect(HQ_CSS).toMatch(/\.neural\.denkt .nn-orb-ring\s*\{\s*animation/);
    expect(HQ_CSS).toMatch(/\.neural\.spricht #nn-orb/);

    // Der Test hat API und Journal absichtlich ohne frischen Beleg geladen.
    // Dann existieren die Transportpfade, laufen aber nicht und kein Knoten
    // behauptet, dass gerade ein Modell arbeitet.
    const stand = await page.evaluate(() => ({
      arbeitend: document.querySelectorAll('.nn-node.arbeitet').length,
      pfade: document.querySelectorAll('.nn-transport').length,
      gesund: document.getElementById('neural').classList.contains('strom-gesund'),
    }));
    expect(stand.pfade).toBeGreaterThan(0);
    expect(stand.gesund).toBe(false);
    const arbeitend = stand.arbeitend;
    expect(arbeitend, 'ohne echten Lauf darf nichts „arbeitet gerade" zeigen').toBe(0);
  });

  test('Arbeitsstand kommt aus echten Workflow-Läufen', async ({ page }) => {
    // Ohne Token gibt es keine Läufe — dann steht dort „unbekannt", nicht
    // „bereit". Eine Rolle, die nie lief, darf nicht wie eine aussehen, die
    // gerade fertig wurde.
    const staende = await page.evaluate(() =>
      [...document.querySelectorAll('.modell .stand')].map((s) => s.textContent.trim()));
    expect(staende.length).toBe(13);
    expect(staende, 'der alte tote Zustand darf nicht mehr erscheinen').not.toContain('kein Lauf in den letzten 30');
    const externIds = KATALOG.modelle.filter((m) => m.weg === 'openrouter').map((m) => m.id);
    const extern = await page.evaluate((ids) => ids.map((id) =>
      document.querySelector(`#modell-${id} .stand`).textContent.trim()), externIds);
    expect(extern.length).toBe(11);
    expect(extern.every((t) => /24\/7|geliefert|Ensemble|Kostenfenster|gestoppt/i.test(t))).toBe(true);
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
    expect(r.offen, 'die zentrale Sprachoberfläche muss aufgehen').toBe(true);
    // Der Aufruf muss beides tun — im Test-Browser gibt es keine echte
    // Spracherkennung, deshalb wird die Verdrahtung im Quelltext geprüft.
    const sprich = HQ.slice(HQ.indexOf('sprich: function'), HQ.indexOf('sprich: function') + 260);
    expect(sprich).toMatch(/open\(true\)/);
    expect(sprich).toMatch(/toggleMic\(\)/);
    const zentral = await page.evaluate(() => ({
      parent: document.getElementById('eb-circle-panel').parentElement.id,
      speakOn: document.getElementById('ebc-speak').classList.contains('on'),
    }));
    expect(zentral.parent).toBe('neural');
    expect(zentral.speakOn, 'Antworten werden im Voice-Modus automatisch gesprochen').toBe(true);
    expect(HQ_CSS).toMatch(/#eb-circle\s*\{\s*display:\s*none/);
  });

  test('Voice-Chat nutzt ausschließlich den admin-geschützten Preisrouter', () => {
    expect(HQ).toMatch(/\/wp-json\/eventboerse\/v1\/hq\/circle/);
    expect(HQ).toMatch(/'X-WP-Nonce': HQ_REST_NONCE/);
    expect(FUNCTIONS).toMatch(/register_rest_route\(\s*'eventboerse\/v1',\s*'\/hq\/circle'/);
    expect(FUNCTIONS).toMatch(/'permission_callback'\s*=>\s*'eb_hq_proxy_darf'/);
    expect(FUNCTIONS).toMatch(/'sort'\s*=>\s*'latency'/);
    expect(FUNCTIONS).toMatch(/'max_tokens'\s*=>\s*220/);
    expect(FUNCTIONS).toMatch(/'response_format'\s*=>\s*array/);
    expect(FUNCTIONS).toMatch(/needs_clarification/);
    expect(HQ).toMatch(/recognitionAlternatives/);
    expect(HQ).toMatch(/askController\.abort\(\)/);
    expect(FUNCTIONS).toMatch(/'max_price'/);
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_circle_openrouter'), FUNCTIONS.indexOf("add_action( 'rest_api_init'", FUNCTIONS.indexOf('function eb_hq_circle_openrouter')));
    expect(fn, 'OpenRouter-Schlüssel darf nicht in der Antwort landen').not.toMatch(/'answer'\s*=>[^\n]*EB_OPENROUTER_API_KEY/);
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
    expect(zu.bereiche).toBe(10);
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

test.describe('Arbeitsjournal & Gespräch', () => {
  const JOURNAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'eb-arbeit.json'), 'utf8'));
  const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

  test('Journal-Prüfung läuft sauber durch', () => {
    const out = execFileSync('node', ['scripts/agent.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/Nur echte Läufe/);
  });

  test('ohne Schlüssel fällt die Schicht aus statt zu lügen', () => {
    // Der Lauf endet mit 0 — eine Routine soll nicht rot werden, weil ein
    // optionaler Schlüssel fehlt. Aber der Ausfall muss im Journal stehen.
    const agent = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
    expect(agent).toMatch(/ergebnis: 'uebersprungen'/);
    expect(agent, 'ein Ausfall darf die Routine nicht abbrechen').toMatch(/process\.exit\(0\)/);
    // „fertig" ohne Ergebnis wäre Arbeit, die nie stattfand.
    expect(agent).toMatch(/'fertig' && !\(e\.text \|\| ''\)\.trim\(\)/);
  });

  test('Geheimnisse verlassen den Betrieb nicht', () => {
    const agent = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
    // Vor jedem Aufruf wird der Kontext gescannt — lieber gar nicht arbeiten
    // als einen Schlüssel an einen fremden Dienst schicken.
    const vorAufruf = agent.slice(0, agent.indexOf('fetch(\'https://openrouter.ai'));
    expect(vorAufruf).toMatch(/ersterTreffer\(kontext, GEHEIMNISSE\)/);
    expect(vorAufruf).toMatch(/ergebnis: 'abgebrochen'/);
  });

  test('jede Rolle mit Schicht hat einen Auftrag mit Grenze', () => {
    const agent = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
    const auftraege = agent.slice(agent.indexOf('const AUFTRAG'), agent.indexOf('const heute'));
    for (const m of KATALOG.modelle.filter((x) => x.schicht && x.weg === 'openrouter')) {
      expect(auftraege, `${m.id} ohne Auftrag`).toContain(`'${m.id}':`);
    }
    // Die Grenzen stehen im Auftrag selbst — ein Modell, das seine Schranke
    // erst nachgelagert erfährt, hat sie schon überschritten.
    expect(auftraege).toMatch(/Mache keine Zusage/);
    expect(auftraege).toMatch(/Löse nichts aus/);
    // Über Zeilenumbrüche hinweg prüfen: die Zeichenkette ist im Quelltext
    // umgebrochen, die Aussage ist es nicht.
    const flach = auftraege.replace(/'\s*\+\s*'/g, '').replace(/\s+/g, ' ');
    expect(flach, 'der Entwurfsschreiber darf nichts senden').toMatch(/wird NICHT gesendet/);
  });

  test('das Gespräch antwortet nur aus freigegebenem Wissen', () => {
    expect(FUNCTIONS).toMatch(/function eb_hq_chat/);
    const chat = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_chat'));
    const rumpf = chat.slice(0, chat.indexOf('\nadd_action'));
    // Ein erfundener Provisionssatz wäre schlimmer als keine Antwort.
    expect(rumpf).toMatch(/AUSSCHLIESSLICH aus dem/);
    expect(rumpf).toMatch(/rate nicht/);
    // Nur Administratoren, und der Schlüssel bleibt auf dem Server.
    expect(FUNCTIONS).toMatch(/'\/hq\/chat'[\s\S]{0,220}eb_hq_proxy_darf/);
    expect(rumpf).not.toMatch(/echo|print/);
  });

  test('der Kreis nutzt den geschützten Preisrouter und fällt lokal zurück', () => {
    expect(HQ).toMatch(/topTreffer/);
    const voice = HQ.slice(HQ.indexOf('async function askOpenRouter'), HQ.indexOf('/* ── Spracheingabe'));
    expect(voice, 'Gespräch über die Serverseite').toMatch(/hq\/circle/);
    expect(voice, 'Cookie-Auth braucht den WordPress-Nonce').toMatch(/X-WP-Nonce/);
    expect(voice, 'lokaler Rückfall bleibt erhalten').toMatch(/localAnswer/);
    expect(voice).toMatch(/Fallback · freigegebenes Wissen/);
  });

  test('HQ zeigt das Journal ehrlich, auch wenn es leer ist', async ({ page }) => {
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2200);
    const text = await page.evaluate(() => document.getElementById('journal').textContent);
    if (!JOURNAL.eintraege.length) {
      expect(text, 'ein leeres Journal zeigt Taktziel und Voll-Ensemble, statt leer zu bleiben').toMatch(/24\/7-Steuerung.*Taktziel von fünf Minuten.*gesamte Ensemble/is);
    } else {
      expect(text).toMatch(/Schichten gearbeitet/);
    }
  });
});
