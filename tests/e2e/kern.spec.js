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
      // Nicht mehr auf genau drei festgenagelt: die Zahl war eine
      // Momentaufnahme, keine Zusicherung, und sie hat die Erweiterung
      // blockiert, mit der frontend-nahe Rollen den Autopiloten beliefern
      // können. Die Eigenschaft ist: es gibt mehr als eine Aufgabe, sonst
      // bedeutet die Rotation nichts — und nicht so viele, dass eine Rolle
      // ihren Zuschnitt verliert.
      expect(m.aufgabenstrom.length, `${m.id}: Aufgabenstrom ohne Rotation`).toBeGreaterThan(1);
      expect(m.aufgabenstrom.length, `${m.id}: Aufgabenstrom ausgeufert`).toBeLessThanOrEqual(8);
      expect(m.maxTokens, `${m.id} ohne kleine Antwortgrenze`).toBeLessThanOrEqual(300);
    }
  });

  test('jede Aufgabe nennt ihr Ziel und echte Dateien', () => {
    // „Welcher Mitarbeiter ist an welcher Datei dran, mit welchem Ziel" lässt
    // sich nur beantworten, wenn beides im Katalog steht. Und die Datei muss
    // existieren — sonst zeigt das HQ Arbeit an einer Datei, die es nicht
    // gibt, und das ist von echter Arbeit nicht zu unterscheiden.
    const fs = require('node:fs');
    const path = require('node:path');
    const wurzel = path.join(__dirname, '..', '..');
    for (const m of KATALOG.modelle.filter((x) => x.weg === 'openrouter')) {
      for (const a of m.aufgabenstrom) {
        expect(typeof a.ziel, `${m.id}: Aufgabe ohne Ziel`).toBe('string');
        expect(a.ziel.length, `${m.id}: Ziel zu knapp für eine Überschrift`).toBeGreaterThan(19);
        expect(Array.isArray(a.dateien) && a.dateien.length, `${m.id}: Aufgabe ohne Datei`).toBeTruthy();
        for (const d of a.dateien) {
          expect(d, `${m.id}: Pfad verlässt das Repo`).not.toMatch(/^\/|\.\./);
          expect(fs.existsSync(path.join(wurzel, d)), `${m.id}: „${d}" gibt es nicht`).toBe(true);
        }
      }
    }
  });

  test('der Agent liest die Dateien wirklich und schreibt sie ins Journal', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const AGENT = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'agent.mjs'), 'utf8');
    // Ohne echtes Einlesen wäre `dateien` nur ein Etikett am Eintrag.
    expect(AGENT, 'Aufgaben-Dateien werden nicht gelesen').toMatch(/const aufgabenDateien\s*=/);
    expect(AGENT, 'Dateiinhalt landet nicht im Kontext').toMatch(/DATEIEN ZUR AUFGABE/);
    // Die Pfadprüfung sitzt inzwischen in darfNichtRaus() — sie deckt neben
    // dem Ausbruch aus dem Repo auch gesperrte Ordner und share: secret ab.
    // Geprüft wird, DASS sie aufgerufen wird, nicht wie sie geschrieben ist.
    expect(AGENT, 'Pfad-/Vertraulichkeitsprüfung fehlt').toMatch(/darfNichtRaus\(d,\s*inhalt\)/);
    // Jeder Journaleintrag führt die Dateien mit — auch der ausgefallene,
    // sonst verschwindet beim Ausfall die Information, woran gearbeitet wurde.
    const eintraege = AGENT.match(/dateien: aufgabenDateien/g) || [];
    expect(eintraege.length, 'nicht alle Journaleinträge führen die Dateien').toBeGreaterThanOrEqual(4);
  });

  test('das HQ verträgt beide Katalog-Formen', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const HQ = fs.readFileSync(path.join(__dirname, '..', '..', 'hq.html'), 'utf8');
    // Der Katalog führte früher Zeichenketten, heute Objekte. Ohne diese
    // Weiche stünde nach dem Wechsel lautlos „[object Object]" im Netz.
    expect(HQ).toMatch(/typeof roh === 'string' \? roh : \(roh && roh\.ziel\)/);
    expect(HQ, 'Dateien werden im Netz nicht gezeigt').toMatch(/function nnAufgabenDateien/);
    expect(HQ, 'nn-datei ohne Stilregel bliebe unformatiert').toMatch(/\.nn-datei\s*\{/);
    expect(HQ, 'nn-task ohne Stilregel rendert schwarz und linksbündig').toMatch(/\.nn-task\s*\{/);
  });

  test('eine Aufgabe wird fortgesetzt, nicht übersprungen', () => {
    // Der konkrete Fehler: der Aufgabenindex kam aus der Uhr
    // (`Date.now()/3600000 % n`). Greift die Kostenbremse bei Aufgabe 1, stand
    // eine Stunde später Aufgabe 2 an — Aufgabe 1 fiel aus, während das
    // Journal „bleibt eingeplant" behauptete. Bei knappem Kontingent konnte
    // dieselbe Aufgabe dauerhaft ausfallen.
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { execFileSync } = require('node:child_process');
    const wurzel = path.join(__dirname, '..', '..');
    const journal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ebj-')), 'j.json');

    const setzen = (eintraege) => fs.writeFileSync(journal,
      JSON.stringify({ version: 1, eintraege }), 'utf8');
    const naechste = () => JSON.parse(execFileSync('node',
      [path.join(wurzel, 'scripts', 'agent.mjs'), '--naechste', 'llama-arch'],
      { cwd: wurzel, env: { ...process.env, EB_JOURNAL: journal } }).toString()).aufgabeIndex;
    const eintrag = (aufgabeIndex, ergebnis) => ({
      rolle: 'llama-arch', aufgabeIndex, ergebnis, zeit: '2026-08-06T10:00:00Z' });

    setzen([]);
    expect(naechste(), 'ohne Historie bei Aufgabe 0 beginnen').toBe(0);

    // Kontingent erschöpft: dieselbe Aufgabe, beliebig oft. Hier wurde nichts
    // verbraucht, also darf auch nichts verfallen.
    setzen(Array.from({ length: 20 }, () => eintrag(0, 'uebersprungen')));
    expect(naechste(), 'Kostenbremse darf die Aufgabe nicht verfallen lassen').toBe(0);

    // Erst Erledigung rückt weiter.
    setzen([eintrag(0, 'fertig')]);
    expect(naechste(), 'nach „fertig" die nächste Aufgabe').toBe(1);

    // Ein echter Fehler wird wiederholt — aber nicht endlos, sonst käme die
    // Rolle nie zu ihren übrigen Aufträgen.
    setzen(Array.from({ length: 4 }, () => eintrag(0, 'fehler')));
    expect(naechste(), 'Fehler wird erneut versucht').toBe(0);
    setzen(Array.from({ length: 5 }, () => eintrag(0, 'fehler')));
    expect(naechste(), 'nach fünf Fehlversuchen weiterrücken').toBe(1);
  });

  test('HQ und Agent wählen die Aufgabe nach derselben Regel', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const wurzel = path.join(__dirname, '..', '..');
    const HQ = fs.readFileSync(path.join(wurzel, 'hq.html'), 'utf8');
    const AGENT = fs.readFileSync(path.join(wurzel, 'scripts', 'agent.mjs'), 'utf8');
    // Zeigte das Netz eine andere Aufgabe als die laufende, wäre das
    // schlimmer als gar keine Anzeige.
    expect(HQ, 'HQ rechnet die Aufgabe noch aus der Uhr').not.toMatch(/aufgabenstrom[\s\S]{0,200}Date\.now\(\) \/ 3600000/);
    expect(HQ, 'HQ liest den Fortschritt nicht aus dem Journal').toMatch(/Number\.isInteger\(e\.aufgabeIndex\)/);
    expect(AGENT, 'Agent rechnet die Aufgabe noch aus der Uhr').not.toMatch(/aufgabeIndex = Math\.floor\(Date\.now\(\)/);
    // Beide Seiten müssen dieselbe Obergrenze führen.
    const hqMax = (HQ.match(/NN_MAX_VERSUCHE\s*=\s*(\d+)/) || [])[1];
    const agMax = (AGENT.match(/MAX_VERSUCHE\s*=\s*(\d+)/) || [])[1];
    expect(hqMax, 'HQ ohne Obergrenze').toBeTruthy();
    expect(hqMax, 'HQ und Agent geben unterschiedlich schnell auf').toBe(agMax);
  });

  test('kein Moderations-Klassifikator in einer Analyse-Rolle', () => {
    // Noah Stern lief auf Llama Guard 4 — einem Modell, das ausschließlich
    // „safe"/„unsafe" ausgibt. Im Journal stand deshalb bei jedem Lauf
    // wörtlich `safe`, gebucht als „fertig". Eine Sicherheitsrolle, die immer
    // „sicher" antwortet, sieht aus wie eine bestandene Prüfung und ist keine.
    for (const m of KATALOG.modelle.filter((x) => x.weg === 'openrouter')) {
      expect(m.modellId, `${m.person} nutzt einen Moderations-Klassifikator`)
        .not.toMatch(/guard|moderation|shield/i);
    }
  });

  test('Denk-Tokens sind abgeschaltet und der Abbruch ist nicht zu knapp', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const AGENT = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'agent.mjs'), 'utf8');
    // Reasoning-Modelle verbrauchten das ganze max_tokens-Budget beim Denken
    // und lieferten leere Antworten — bezahlt wurde trotzdem.
    expect(AGENT, 'Reasoning frisst das Antwortbudget').toMatch(/reasoning:\s*\{\s*enabled:\s*false\s*\}/);
    const timeout = Number((AGENT.match(/AbortSignal\.timeout\((\d+)\)[\s\S]{0,40}\}\);/) || [])[1]
      || (AGENT.match(/signal: AbortSignal\.timeout\((\d+)\)/g) || []).length);
    expect(AGENT, 'Abbruch nach 30 s war zu knapp').not.toMatch(/signal: AbortSignal\.timeout\(30000\)/);
  });

  test('der Sprint nennt den heutigen Stand vor der Historie', () => {
    // Die Rollen bekommen die ersten 180 Zeilen dieser Datei als Kontext.
    // Stand der Ist-Wert weiter unten, meldeten Modelle alte Zahlen als aktuell.
    const fs = require('node:fs');
    const path = require('node:path');
    const sprint = fs.readFileSync(
      path.join(__dirname, '..', '..', 'vault', '50-Evolution', 'Roadmap', 'Current-Sprint.md'), 'utf8');
    const kopf = sprint.split('\n').slice(0, 30).join('\n');
    expect(kopf, 'kein Ist-Stand im Kopf der Datei').toMatch(/Stand heute/);
    // Den HÖCHSTEN Wert prüfen, nicht den ersten: der Erklärtext nennt
    // absichtlich eine alte Zahl als Beispiel, und ein Test auf den ersten
    // Treffer findet genau die. Dieselbe Falle wie beim Quarantäne-Tor, das
    // über die zitierte Injektion stolperte.
    const zahlen = [...kopf.matchAll(/(\d+) Tests/g)].map((m) => Number(m[1]));
    expect(Math.max(...zahlen, 0), 'Ist-Stand im Kopf ist veraltet').toBeGreaterThanOrEqual(160);
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
  const autopilot = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'openrouter-autopilot.yml'), 'utf8');
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

  test('ein Patch darf Schutzkonstrukte nicht wegnehmen', async () => {
    // Die Musterprüfung sah nur hinzugefügte Zeilen. Der gefährlichste Fall
    // rutschte damit durch:
    //
    //     -  `<b>${escHtml(name)}</b>`
    //     +  `<b>${name}</b>`
    //
    // Die neue Zeile trifft kein verbotenes Muster — weder `.innerHTML =`
    // noch `eval`. Die entfernte enthält die Maskierung. Ergebnis: eine
    // XSS-Lücke, mechanisch nicht erkannt.
    const { patchPruefen } = await import(
      require('node:url').pathToFileURL(path.join(ROOT, 'scripts', 'openrouter-agents.mjs')).href);
    const ziel = 'js/modules/ui/43-showcase.js';
    const diff = (minus, plus) => [
      `diff --git a/${ziel} b/${ziel}`, `--- a/${ziel}`, `+++ b/${ziel}`,
      '@@ -1,1 +1,1 @@', `-${minus}`, `+${plus}`,
    ].join('\n');

    const gefaehrlich = [
      ['HTML-Maskierung', 'h += `<b>${escHtml(n)}</b>`;', 'h += `<b>${n}</b>`;'],
      ['Fehlerbehandlung', '} catch (e) { melde(e); }', '}'],
      ['Aufräumen von Standortdaten', 'localStorage.removeItem(RADAR_SPEICHER);', '// spaeter'],
      ['noopener-Schutz', 'a.rel = "noopener noreferrer";', 'a.rel = "";'],
      ['Identitätsprüfung', 'if (!currentUser) return;', '// jeder darf'],
    ];
    for (const [was, minus, plus] of gefaehrlich) {
      expect(() => patchPruefen(diff(minus, plus), [ziel]),
        `entferntes Schutzkonstrukt bleibt unbemerkt: ${was}`).toThrow();
    }

    // Verschieben bleibt erlaubt — sonst wäre jede Umformatierung blockiert,
    // die eine solche Zeile berührt, und der Autopilot in diesen Dateien
    // praktisch handlungsunfähig.
    expect(() => patchPruefen(
      diff('const s = escHtml(n);', 'const sicher = escHtml(n);'), [ziel]))
      .not.toThrow();
  });

  test('autonomer Scope schließt sensible Dateien und Seiteneffekte aus', () => {
    // Die Liste liegt seit der Auslagerung in scripts/lib/sichere-dateien.mjs.
    // Vorher las dieser Test sie per indexOf aus dem Runner — nach dem Umzug
    // lieferte indexOf -1, der Slice wurde LEER, und die Zusicherung lief
    // gegen einen leeren String. Sie hat also monatelang nichts mehr
    // verboten, ohne je rot zu werden.
    //
    // Deshalb hier zwei Dinge: die richtige Quelle UND ein Nachweis, dass
    // überhaupt etwas geprüft wird. Eine Zusicherung, die leer laufen kann,
    // ist schlimmer als keine — sie beruhigt.
    const whitelist = fs.readFileSync(path.join(ROOT, 'scripts', 'lib', 'sichere-dateien.mjs'), 'utf8');
    expect(whitelist.length, 'die Whitelist-Quelle ist leer — die Prüfung liefe ins Nichts')
      .toBeGreaterThan(200);
    expect(whitelist, 'die Whitelist enthält keine einzige Datei').toMatch(/js\/modules\//);
    expect(whitelist).not.toMatch(/functions\.php|payments\/|core\/30-auth|chat\/20-/);
    // Der Runner darf keine zweite, eigene Liste mehr führen.
    expect(runner, 'der Runner hält wieder eine eigene Whitelist')
      .not.toMatch(/const SICHERE_DATEIEN\s*=\s*Object\.freeze/);
    expect(runner).toMatch(/git', \['apply', '--check', '--whitespace=error-all'/);
    expect(runner).toMatch(/localStorage\|sessionStorage\|indexedDB/);
    expect(runner).toMatch(/additions\.length \+ deletions\.length > 260/);
  });

  test('Auslieferung braucht erfolgreichen Gesamtlauf und prüft den Scope erneut', () => {
    expect(workflow).toMatch(/cron:\s*'2\/5 \* \* \* \*'/);
    expect(workflow).toMatch(/EB_OPENROUTER_RUN_BUDGET_USD:\s*'0\.12'/);
    // Nicht mehr auf den Literalwert festgenagelt: $0.60 war eine Einstellung,
    // keine Zusicherung — sie zu ändern ist eine erlaubte Entscheidung, sie
    // wegzulassen nicht. Geprüft wird deshalb, DASS ein hartes Tagesbudget
    // steht; die vereinbarte Obergrenze über beide Töpfe prüft der Takt-Test.
    expect(Number((workflow.match(/EB_OPENROUTER_DAILY_BUDGET_USD:\s*'([\d.]+)'/) || [])[1]),
      'kein hartes Tagesbudget im Autopiloten').toBeGreaterThan(0);
    expect(workflow).toMatch(/steps\.cadence\.outputs\.run/);
    // Kein Zaehlwerk mehr: `GITHUB_RUN_NUMBER % 12` sollte "stuendlich"
    // bedeuten und bedeutete rund ACHTSTUENDLICH, weil GitHub geplante Laeufe
    // best-effort feuert (gemessen 30–65 Min. statt 5). Ein Zaehlwerk, das
    // steuert, was es nicht steuern kann, ist schlechter als keines.
    //
    // Geprueft wird jetzt die Bremse, die nachweislich greift: das
    // Tagesbudget stoppt VOR dem ersten Modellaufruf und gilt ueber alle
    // Laeufe des Tages, weil es OpenRouters usage_daily liest.
    // Nur ausgefuehrte Zeilen, keine Kommentare: der Workflow ERKLAERT das
    // entfernte Zaehlwerk und wuerde sich sonst an der eigenen Begruendung
    // stossen. Eine Zusicherung, die Kommentare mitliest, zwingt dazu, die
    // Geschichte zu loeschen statt sie aufzuschreiben.
    const wirksam = workflow.split('\n').filter((z) => !/^\s*#/.test(z)).join('\n');
    expect(wirksam, 'das Zählwerk ist zurück').not.toMatch(/GITHUB_RUN_NUMBER % \d+/);
    expect(agent, 'kein Tagesbudget vor dem ersten Modellaufruf')
      .toMatch(/usage_daily[\s\S]{0,400}>= dailyBudget/);
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

  test('der Auto-Merge liest den Rahmen, statt ihn abzuschreiben', async () => {
    // Bis zum 15.08. stand die Dateiliste im Auto-Merge ein zweites Mal. Beim
    // Weiten auf 15 Dateien blieb die Kopie bei 13 — der Auto-Merge haette
    // einen regelkonformen Autopilot-PR abgewiesen, sein Label entfernt und
    // den Lauf rot gemacht. Eine Kopie einer Sicherheitsliste driftet immer.
    const wirksam = merge.split('\n').filter((z) => !/^\s*#/.test(z)).join('\n');
    expect(wirksam, 'die Liste darf nur an einer Stelle stehen')
      .toMatch(/sichere-dateien\.mjs/);

    // Kein zweiter Satz Modulpfade im Workflow — das waere die Kopie zurück.
    const pfadeImYml = [...wirksam.matchAll(/'(js\/modules\/[^']+)'/g)].map((m) => m[1]);
    expect(pfadeImYml, `abgeschriebene Pfade: ${pfadeImYml.join(', ')}`).toHaveLength(0);

    // Die Liste muss aus main kommen, nie aus dem PR: sonst könnte ein Patch
    // seinen eigenen Rahmen weiten.
    expect(wirksam, 'der Rahmen muss aus main geladen werden').toMatch(/ref:\s*main/);

    // Und eine leer geladene Liste darf nicht alles durchwinken: `forbidden`
    // wäre dann trivial leer. Genau diese Falle hatte der Scope-Wächter schon.
    expect(wirksam).toMatch(/safeSources\.size\s*<\s*\d+[\s\S]{0,200}setFailed/);
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
    expect(runner).toMatch(/zeilen\.slice\(index, index \+ 3\)/);
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
    // Der Puls erzeugt Lagebilder, der Autopilot erzeugt Arbeit. Als beide
    // sich EIN Budget teilten, hatte der Puls es aufgebraucht, bevor der
    // Autopilot dazu kam — rund 2 Mio Token ohne Wirkung. Der Konflikt lag
    // nie am Takt, sondern an zwei Stellen an einem Topf. Geprüft wird
    // deshalb die Aussage, nicht die Uhrzeit: der Puls fährt nicht auf den
    // 5-Minuten-Takt des Autopiloten hoch und bekommt den kleineren Topf.
    expect(operations, 'Puls darf nicht auf den Autopilot-Takt hoch').not.toMatch(/cron:\s*'\d*\/5 \* \* \* \*'/);
    const pulsBudget = Number((operations.match(/EB_OPENROUTER_DAILY_BUDGET_USD:\s*'([\d.]+)'/) || [])[1]);
    const autoBudget = Number((autopilot.match(/EB_OPENROUTER_DAILY_BUDGET_USD:\s*'([\d.]+)'/) || [])[1]);
    expect(pulsBudget, 'Puls ohne eigenes Budget').toBeGreaterThan(0);
    expect(pulsBudget, 'der Puls darf dem Autopiloten das Budget nicht wegessen')
      .toBeLessThan(autoBudget);
    expect(operations).toMatch(/echo "rolle=alle"/);
    expect(operations).not.toMatch(/GITHUB_RUN_NUMBER - 1\) % anzahl/);
    // Vorher standen hier zwei Zusicherungen auf Kommentar-Wortlaut
    // („tatsaechlich erreichten Puls…", „$0.003646"). Ein Kommentar ist keine
    // Zusicherung: er ändert sich mit der Begründung, ohne dass sich das
    // Verhalten ändert. Die Aussage dahinter — jeder erreichte Lauf arbeitet
    // das VOLLE Ensemble ab, keine Rolle wird durch einen Zähler übersprungen
    // — steht in den beiden Prüfungen darüber und darunter.
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

  test('der Katalog nennt den Takt, der wirklich läuft', () => {
    // Der Katalog behauptete „Scheduler-Taktziel 5 Min.", während der Cron
    // `17 2,8,14,20` stand — viermal am Tag. Wer aufs HQ schaut, sieht dann
    // einen Betrieb, den es nicht gibt, und hält den Stillstand für eine
    // Anzeigeverzögerung. Eine Takt-Angabe ist eine Zusicherung.
    const cronMinuten = (cron) => {
      const [min, std] = cron.trim().split(/\s+/);
      const schritt = min.match(/^(?:\*|\d+)\/(\d+)$/);
      if (schritt) return Number(schritt[1]);
      if (/^\d+$/.test(min) && /,/.test(std)) return (24 / std.split(',').length) * 60;
      if (/^\d+$/.test(min) && std === '*') return 60;
      return null;
    };
    const taktMinuten = (t) => {
      const m = t.match(/(\d+)\s*[-\s]?Min\./);
      return m ? Number(m[1]) : null;
    };
    const budgetAus = (yml) => Number((yml.match(/EB_OPENROUTER_DAILY_BUDGET_USD:\s*'([\d.]+)'/) || [])[1]);
    const budgetTakt = (t) => {
      const m = t.match(/\$(\d+),(\d+)/);
      return m ? Number(`${m[1]}.${m[2]}`) : null;
    };

    for (const [datei, yml] of [['hq-operations.yml', operations], ['openrouter-autopilot.yml', autopilot]]) {
      const takt = KATALOG.schichten[datei].takt;
      const cron = (yml.match(/cron:\s*'([^']+)'/) || [])[1];
      expect(cron, `${datei}: kein Cron gefunden`).toBeTruthy();

      const echt = cronMinuten(cron);
      const behauptet = taktMinuten(takt);
      expect(echt, `${datei}: Cron "${cron}" nicht auswertbar`).toBeTruthy();
      expect(behauptet, `${datei}: der Katalog nennt keinen Takt in Minuten — "${takt}"`).toBeTruthy();
      expect(behauptet, `${datei}: Katalog sagt ${behauptet} Min., Cron läuft alle ${echt} Min.`).toBe(echt);

      expect(budgetTakt(takt), `${datei}: Katalog sagt $${budgetTakt(takt)}, Workflow setzt $${budgetAus(yml)}`)
        .toBe(budgetAus(yml));
    }

    // Die vereinbarte Obergrenze über BEIDE Töpfe. Einzeln darf jede Stelle
    // ihren Rahmen verschieben, zusammen nicht über das, was freigegeben ist —
    // sonst wächst die Tagesrechnung in zwei kleinen Schritten, von denen
    // jeder für sich harmlos aussieht.
    const summe = budgetAus(operations) + budgetAus(autopilot);
    expect(summe, `Puls $${budgetAus(operations)} + Autopilot $${budgetAus(autopilot)} = $${summe.toFixed(2)} über der Freigabe`)
      .toBeLessThanOrEqual(2.0);

    // Und die Oberflaeche selbst. Der Katalog-Test allein hat nicht gereicht:
    // hq.html trug an DREI Stellen hartkodiert „Lagebild 4×/Tag" und
    // „$0,15/Tag hart" weiter, nachdem der Cron längst auf 30 Minuten stand.
    // Wer aufs HQ schaut, liest den Text — nicht die JSON.
    const hq = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
    const pulsMin = cronMinuten((operations.match(/cron:\s*'([^']+)'/) || [])[1]);
    for (const m of hq.matchAll(/Lagebild\s+(?:alle\s+(\d+)\s*Min\.|(\d+)×\/Tag)/g)) {
      const behauptet = m[1] ? Number(m[1]) : (24 * 60) / Number(m[2]);
      expect(behauptet, `hq.html sagt „${m[0]}", der Cron läuft alle ${pulsMin} Min.`).toBe(pulsMin);
    }
    // Jede Budgetangabe im HQ muss zu IHREM Workflow passen. Die alte Regel
    // verlangte das Wort „hart" dahinter — und übersah damit die Bot-Karte des
    // Autopiloten, die „$0,60/Tag" behauptete, nachdem der Topf auf $1,50
    // gestiegen war. Eine Zusicherung, die nur eine Schreibweise kennt, ist
    // ein Loch mit Zaun drumherum.
    const budgets = { 'hq-operations.yml': budgetAus(operations), 'openrouter-autopilot.yml': budgetAus(autopilot) };
    for (const zeile of hq.split('\n')) {
      const geld = zeile.match(/\$(\d+),(\d+)\s*(?:\/Tag|-Tagesbudget)/);
      if (!geld) continue;
      const datei = Object.keys(budgets).find((f) => zeile.includes(f));
      // Zeilen ohne erkennbaren Workflow-Bezug prüfen wir nicht — sie könnten
      // ein Laufbudget oder einen Beispielwert nennen.
      if (!datei) continue;
      expect(Number(`${geld[1]}.${geld[2]}`),
        `hq.html sagt „${geld[0]}" bei ${datei}, der Workflow setzt $${budgets[datei]}`)
        .toBe(budgets[datei]);
    }
    // Und kein fest eingetippter Tagesbudget-Betrag mehr in der Oberfläche:
    // die Werte kommen aus dem Katalogfeld budgetUsd.
    expect(hq, 'das Kontingent steht wieder als fester Text').not.toMatch(/Kontingent \$\d+,\d+\/Tag/);
    expect(hq, 'das Rollen-Kontingent nennt einen festen Betrag').not.toMatch(/vom \$\d+,\d+-Tagesbudget/);
    expect(hq, 'hq.html behauptet weiter „viermal täglich"').not.toMatch(/viermal täglich/);
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
    // Kein Literal: „Lagebild 4×/Tag" war eine Wort-Zusicherung und hat die
    // veraltete Behauptung mitkonserviert, als der Cron auf 30 Min. wechselte.
    // Geprüft wird die Eigenschaft — der Strom nennt SEINEN Takt. Ob die Zahl
    // stimmt, prüft „der Katalog nennt den Takt, der wirklich läuft".
    expect(r.text, 'der Strom nennt keinen Takt').toMatch(/Lagebild (alle \d+ Min\.|\d+×\/Tag)/);
    expect(r.text).toContain('alle 11 Rollen je Lauf');
    expect(r.text).toContain('Jetzt');
    expect(r.text).toContain('Nächste Prüfung');
    expect(r.text).toContain('Zuletzt belegt');
    // Kein Literal: „Kontingent $0,60/Tag" hat den veralteten Betrag
    // konserviert, nachdem Puls und Autopilot getrennte Töpfe bekamen.
    // Geprüft wird, DASS der Strom sein Kontingent nennt — und dass die Zahl
    // die des Katalogs ist, nicht irgendeine.
    const budgetPuls = KATALOG.schichten['hq-operations.yml'].budgetUsd;
    expect(budgetPuls, 'der Katalog nennt kein Puls-Budget').toBeGreaterThan(0);
    expect(r.text, 'der Strom nennt sein Kontingent nicht')
      .toContain(`Kontingent $${budgetPuls.toFixed(2).replace('.', ',')}/Tag`);
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
    // Auslösen und Nachsehen im SELBEN Tick. Über zwei page.evaluate hinweg
    // war das ein Wettlauf gegen die 900-ms-Animation: unter Last kam der
    // zweite Aufruf erst an, als onfinish den Impuls schon entfernt hatte —
    // der Test wurde dann rot, obwohl der Impuls korrekt gelaufen war.
    const { vorher, waehrend } = await page.evaluate(() => {
      const v = document.querySelectorAll('.nn-impuls').length;
      ebImpuls('betrieb', 'gut');
      return { vorher: v, waehrend: document.querySelectorAll('.nn-impuls').length };
    });
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

    // Das Journal wird hier bewusst LEER untergeschoben, statt sich auf die
    // committete Datei zu verlassen.
    //
    // Vorher tat der Test genau das — und war grün, solange die Belegschaft
    // stillstand. Mit dem ersten echten Lauf (12.08.) wurde das Journal frisch
    // und der Test rot, ohne dass sich an der geprüften Regel etwas geändert
    // hätte. Ein Test, der von der Datenlage im Repo abhängt, misst den
    // Zufall mit.
    await page.route('**/eb-arbeit.json*', (r) => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: 1, hinweis: 'Testvorgabe', eintraege: [] }),
    }));
    await page.reload();
    await expect(page.locator('[data-bereich]')).toHaveCount(10, { timeout: 12000 });

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

  test('mit frischem Betriebsbeleg läuft der Strom wirklich', async ({ page }) => {
    // Die Gegenprobe zum Test darüber, und erst seit dem 12.08. überhaupt
    // sinnvoll: vorher gab es nie einen frischen Beleg, mit dem sich die
    // andere Hälfte der Regel prüfen ließe. Ein Impuls entspricht einem
    // echten Ereignis — also muss ein echtes Ereignis auch ankommen, sonst
    // wäre die Anzeige nur vorsichtig statt ehrlich.
    await page.route('**/eb-arbeit.json*', (r) => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 1,
        hinweis: 'Testvorgabe',
        eintraege: [{
          zeit: new Date().toISOString(),
          rolle: 'mistral-ops', person: 'Nils Falk', rollenname: 'Reliability-Wächter',
          modell: 'Mistral Small 3.2 24B', bereich: 'betrieb', anlass: 'Test',
          aufgabe: 'Lagebild verdichten.', dateien: ['audit/latest.json'],
          ergebnis: 'fertig', text: 'Betriebszustand unauffällig.',
          tokens: 2073, kostenUsd: 0.00017,
        }],
        aktualisiert: new Date().toISOString(),
      }),
    }));
    await page.reload();
    await expect(page.locator('[data-bereich]')).toHaveCount(10, { timeout: 12000 });

    const stand = await page.evaluate(() => ({
      gesund: document.getElementById('neural').classList.contains('strom-gesund'),
      pfade: document.querySelectorAll('.nn-transport').length,
    }));
    expect(stand.pfade, 'die Transportpfade fehlen').toBeGreaterThan(0);
    expect(stand.gesund, 'ein frischer Lauf muss den Strom als gesund zeigen').toBe(true);
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
    const sprich = HQ.slice(HQ.indexOf('sprich: function'), HQ.indexOf('sprich: function') + 360);
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

  test('ein zweiter Klick auf die Mitte beendet das Gespräch vollständig', async ({ page }) => {
    const r = await page.evaluate(() => {
      const orb = document.getElementById('nn-orb');
      const panel = document.getElementById('eb-circle-panel');
      orb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const nachStart = {
        offen: panel.classList.contains('open'),
        label: orb.getAttribute('aria-label'),
        gedrueckt: orb.getAttribute('aria-pressed'),
      };
      document.getElementById('ebc-input').value = 'nicht mehr absenden';
      orb.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return {
        nachStart,
        offen: panel.classList.contains('open'),
        label: orb.getAttribute('aria-label'),
        gedrueckt: orb.getAttribute('aria-pressed'),
        entwurf: document.getElementById('ebc-input').value,
        zustand: document.getElementById('ebc-state').textContent,
      };
    });
    expect(r.nachStart).toEqual({ offen: true, label: 'Gespräch beenden', gedrueckt: 'true' });
    expect(r.offen).toBe(false);
    expect(r.label).toBe('Sprechen — KI-Kreis starten');
    expect(r.gedrueckt).toBe('false');
    expect(r.entwurf, 'ein abgebrochener Sprachentwurf darf nicht nachgesendet werden').toBe('');
    expect(r.zustand).toBe('Gespräch beendet');
  });

  test('operative Fragen bleiben ohne OpenRouter vollständig beantwortbar', async ({ page }) => {
    let providerAufrufe = 0;
    await page.route('**/wp-json/eventboerse/v1/hq/circle', (route) => {
      providerAufrufe += 1;
      return route.abort();
    });
    await page.evaluate(() => window.ebCircleAPI.oeffnen());
    await page.locator('#ebc-input').fill('Woran arbeiten die Agents gerade?');
    await page.locator('#ebc-input').press('Enter');
    await expect(page.locator('#ebc-log .ebc-msg.ai').last()).toContainText('Rolle');
    await expect(page.locator('#ebc-log .ebc-msg.ai').last()).not.toContainText('OpenRouter');
    expect(providerAufrufe, 'Betriebsdaten dürfen nicht vom Sprachdienst abhängen').toBe(0);

    const lieferung = await page.evaluate(() =>
      window.ebCircleAPI.operativeAntwort('Was wurde in der neuen PR gemacht?'));
    expect(lieferung.answer).toMatch(/main|Commits sind nicht geladen/);
    expect(lieferung.answer).toMatch(/Deploy|Release-Stand/);
    expect(lieferung.source).toBe('Live-Betriebsdaten');
    const produktfrage = await page.evaluate(() =>
      window.ebCircleAPI.operativeAntwort('Was macht ein gutes Inserat aus?'));
    expect(produktfrage, 'Produktfragen dürfen nicht als Betriebsfrage umgedeutet werden').toBeNull();
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
    expect(FUNCTIONS).toMatch(/compatibility-fallback/);
    expect(FUNCTIONS).toMatch(/mistralai\/mistral-nemo/);
    expect(FUNCTIONS).toMatch(/'data_collection'\s*=>\s*'deny'/);
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

  test('der Lagebericht nennt Betriebsdaten und trennt „nicht geladen" von „null"', async ({ page }) => {
    // Der Kreis antwortete auf „wie steht es?" mit HQ-SHA und Commander-Level.
    // Das war keine Antwort, sondern eine Ausweichbewegung.
    const bericht = await page.evaluate(() => window.ebCircleAPI.statusAntwort('wie steht es?'));
    expect(bericht, 'auf eine Lage-Frage kommt kein Bericht').toBeTruthy();
    // Er benennt die Quellen, die es gibt — nicht bloß eine Versionsnummer.
    for (const feld of ['Deploy', 'Puls', 'Arbeitsjournal', 'Selbstcheck', 'Wissensbasis']) {
      expect(bericht, `der Bericht sagt nichts über ${feld}`).toContain(feld);
    }

    // Die tragende Regel: eine NICHT geladene Quelle wird als „nicht geladen"
    // gemeldet, nicht als Null. „0 Schichten gearbeitet" heißt „der Betrieb
    // lief und tat nichts"; „nicht geladen" heißt „ich weiß es nicht". Wer
    // beides zusammenfallen lässt, handelt nach einer Lage, die es nicht gibt.
    const ohne = await page.evaluate(() => {
      const journalVorher = nnJournal, auditVorher = state.audit, laeufeVorher = state.runs;
      nnJournal = null; state.audit = null; state.runs = [];
      const t = window.ebCircleAPI.statusAntwort('lagebericht');
      nnJournal = journalVorher; state.audit = auditVorher; state.runs = laeufeVorher;
      return t;
    });
    expect(ohne, 'ein fehlendes Journal wird nicht als solches gemeldet')
      .toMatch(/Arbeitsjournal: nicht geladen/);
    expect(ohne, 'ein fehlender Selbstcheck wird nicht als solcher gemeldet')
      .toMatch(/Selbstcheck: nicht geladen/);
    expect(ohne, 'fehlende Läufe werden nicht als solche gemeldet')
      .toMatch(/Workflow-Läufe: nicht geladen/);
    // Und genau NICHT als Zahl: keine Null-Aussage über etwas Unbekanntes.
    expect(ohne, 'fehlende Daten erscheinen als Null-Aussage')
      .not.toMatch(/0 Einträge|0 Befunde|Journal: 0|keine? (Schicht|Befund) /i);

    // Umgekehrt: ein GELADENES, aber leeres Journal darf das sagen — leer ist
    // eine Aussage über den Betrieb, fehlend ist keine.
    const leer = await page.evaluate(() => {
      const v = nnJournal;
      nnJournal = { version: 1, eintraege: [] };
      const t = window.ebCircleAPI.statusAntwort('lagebericht');
      nnJournal = v;
      return t;
    });
    expect(leer, 'ein leeres Journal wird mit einem fehlenden verwechselt')
      .toMatch(/geladen, aber leer/);
  });

  test('eine Lage-Frage wird als Lagebericht beantwortet, nicht als Wissensabschnitt', async ({ page }) => {
    // Nicht hqStatus() allein prüfen, sondern was der Kreis wirklich sagt:
    // in ask() setzte ein Wissenstreffer die lokale Antwort bedingungslos neu,
    // die Lage kam also nie beim Fragenden an. Ohne diesen Test wäre die
    // Rückkehr zu `if (hit)` unbemerkt geblieben.
    await page.evaluate(() => window.ebCircleAPI.oeffnen());
    await page.fill('#ebc-input', 'wie steht es?');
    await page.press('#ebc-input', 'Enter');
    // Textmodus mit lokaler Antwort bleibt tokenfrei — kein Netz im Spiel.
    await expect(page.locator('#ebc-log')).toContainText('Lagebericht', { timeout: 8000 });
    await expect(page.locator('#ebc-log')).toContainText('Arbeitsjournal');
  });

  test('eine Produktfrage bekommt Wissen, keinen Lagebericht', async ({ page }) => {
    // Das alte Muster fing „seite", „hq", „system", „live" — damit hätte
    // jede Produktfrage einen Betriebsbericht ausgelöst.
    for (const frage of ['Wie läuft eine Buchung ab?', 'Was kostet die Plattform?', 'Wie bezahle ich?']) {
      const s = await page.evaluate((f) => window.ebCircleAPI.statusAntwort(f), frage);
      expect(s, `„${frage}" löst einen Lagebericht aus`).toBeNull();
    }
    // Und die Lage-Fragen greifen weiterhin.
    for (const frage of ['wie steht es?', 'Lagebericht', 'status', 'letzter Deploy?']) {
      const s = await page.evaluate((f) => window.ebCircleAPI.statusAntwort(f), frage);
      expect(s, `„${frage}" löst keinen Lagebericht aus`).toBeTruthy();
    }
  });

  test('der geöffnete Bereich nennt je Mitarbeiter Ziel und Datei — ungekürzt', async ({ page }) => {
    // Im SVG ist das Ziel auf 52 Zeichen und die Dateiliste auf 44 gekappt.
    // Ein halbes Ziel beantwortet „woran arbeitet der gerade" nicht, deshalb
    // muss das Panel den vollen Text tragen.
    for (const bid of ['engineering', 'betrieb', 'experience']) {
      const rollen = KATALOG.modelle.filter((m) => m.bereich === bid);
      const gesehen = await page.evaluate((id) => {
        nnOeffne(id);
        const p = document.getElementById('nn-detail');
        return {
          sichtbar: !!p && !p.hidden,
          karten: document.querySelectorAll('#nn-detail .nnd-karte').length,
          ziele: [...document.querySelectorAll('#nn-detail .nnd-ziel')].map((n) => n.textContent.trim()),
          dateien: [...document.querySelectorAll('#nn-detail .nnd-datei')].map((n) => n.textContent.trim()),
        };
      }, bid);

      expect(gesehen.sichtbar, `${bid}: Panel bleibt zu`).toBe(true);
      expect(gesehen.karten, `${bid}: eine Karte je Mitarbeiter`).toBe(rollen.length);

      for (const m of rollen) {
        const strom = m.aufgabenstrom || [];
        if (!strom.length) continue;
        // Irgendeine Aufgabe des Stroms ist die aktuelle — welche, entscheidet
        // dieselbe Regel wie beim Agenten. Geprüft wird: das angezeigte Ziel
        // ist eines davon und steht VOLLSTÄNDIG da, nicht angeschnitten.
        const treffer = gesehen.ziele.find((z) => strom.some((a) => a.ziel === z));
        expect(treffer, `${m.person}: kein vollständiges Ziel im Panel — gesehen: ${gesehen.ziele.join(' | ')}`)
          .toBeTruthy();
        const aufgabe = strom.find((a) => a.ziel === treffer);
        for (const d of aufgabe.dateien || []) {
          expect(gesehen.dateien, `${m.person}: Datei ${d} fehlt oder ist gekürzt`).toContain(d);
        }
      }
    }
  });

  test('der geöffnete Bereich zeigt alle Aufgaben — und kein Ziel endet mitten im Wort', async ({ page }) => {
    // Vorher trug die mittlere Ebene EINE Aufgabe je Mitarbeiter, hart nach
    // 52 Zeichen geschnitten: „…als ein Produkt betrachten und die". Ein Satz,
    // der mitten im Wort endet, liest sich wie ein Fehler, nicht wie eine
    // Kürzung — und ein Bereich mit einem Mitarbeiter war ein einzelner Punkt
    // auf leerer Fläche, obwohl sein Aufgabenstrom im Katalog steht.
    for (const bid of ['produkt', 'engineering', 'experience']) {
      const gesehen = await page.evaluate((id) => {
        nnOeffne(id);
        return {
          aufgaben: [...document.querySelectorAll('#nn .nn-aufgabe')].map((g) =>
            [...g.querySelectorAll('text')].map((t) => t.textContent).join(' ').trim()),
          dateien: document.querySelectorAll('#nn .nn-dateiknoten').length,
        };
      }, bid);

      const ziele = KATALOG.modelle.filter((m) => m.bereich === bid)
        .flatMap((m) => (m.aufgabenstrom || []).map((a) => a.ziel));
      expect(gesehen.aufgaben.length, `${bid}: nicht jede Aufgabe hat einen Knoten`)
        .toBe(Math.min(ziele.length, 4 * KATALOG.modelle.filter((m) => m.bereich === bid).length));

      for (const beschriftung of gesehen.aufgaben) {
        const sichtbar = beschriftung.replace(/\s*…\s*$/, '').trim();
        const echtesZiel = ziele.find((t) => t.startsWith(sichtbar));
        expect(echtesZiel, `${bid}: „${sichtbar}" ist kein Wort-Präfix eines echten Ziels`).toBeTruthy();
        // Falls gekürzt wurde: an einer Wortgrenze, nie mitten im Wort.
        if (sichtbar !== echtesZiel) {
          expect(echtesZiel[sichtbar.length], `${bid}: „…${sichtbar.slice(-24)}" endet mitten im Wort`)
            .toBe(' ');
        }
      }
      if (ziele.length) {
        expect(gesehen.dateien, `${bid}: keine Datei-Knoten trotz Aufgaben mit Dateien`)
          .toBeGreaterThan(0);
      }
    }
  });

  test('zurück zur Übersicht schließt das Panel wieder', async ({ page }) => {
    const zu = await page.evaluate(() => {
      nnOeffne('betrieb');
      document.getElementById('nnd-zu').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const p = document.getElementById('nn-detail');
      return { versteckt: !!p && p.hidden, bereiche: document.querySelectorAll('[data-bereich]').length };
    });
    expect(zu.versteckt, 'das Panel bleibt über der Übersicht stehen').toBe(true);
    expect(zu.bereiche, 'die Übersicht kommt nicht zurück').toBe(10);
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
    expect(voice).toMatch(/Lokaler, belegter Rückfall/);
    expect(voice, 'Betriebsfragen bleiben im Sprachmodus lokal').toMatch(/if \(localAnswer\)/);
  });

  test('HQ zeigt das Journal ehrlich, auch wenn es leer ist', async ({ page }) => {
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2200);
    const text = await page.evaluate(() => document.getElementById('journal').textContent);
    if (!JOURNAL.eintraege.length) {
      expect(text, 'ein leeres Journal zeigt Taktziel und Voll-Ensemble, statt leer zu bleiben').toMatch(/Lagebild-Lauf startet viermal täglich.*gesamte Ensemble/is);
    } else {
      expect(text).toMatch(/Schichten gearbeitet/);
    }
  });
});

test.describe('Befunde bestimmen die Arbeit', () => {
  // Der teuerste Befund dieser Sitzung: rund 2 Mio Token verbraucht, ohne dass
  // Seite oder HQ sich verbessert hätten. Ursache war nicht die Qualität der
  // Modelle, sondern die Verkabelung — elf Rollen benannten stündlich konkrete
  // Probleme, und die einzige Stelle, die Code ändert, wählte ihren Fokus nach
  // KALENDERWOCHE. Die Befunde blieben im Journal liegen.
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const wurzel = path.join(__dirname, '..', '..');

  // Eigenes Journal je Aufruf. Die echte assets/eb-arbeit.json anzufassen
  // wäre ein Fehler: Playwright läuft parallel, und ein anderer Test lädt
  // gleichzeitig die HQ-Seite, die genau diese Datei liest. Geteilter
  // veränderlicher Zustand macht Tests unzuverlässig, nicht gründlich.
  const fokusFuer = (eintraege) => {
    const journal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ebf-')), 'j.json');
    fs.writeFileSync(journal, JSON.stringify({ version: 1, eintraege }), 'utf8');
    return JSON.parse(execFileSync('node',
      [path.join(wurzel, 'scripts', 'openrouter-agents.mjs'), '--zeige-fokus'],
      { cwd: wurzel, env: { ...process.env, EB_JOURNAL: journal } }).toString());
  };
  const jetzt = () => new Date().toISOString();
  const befund = (text, ergebnis = 'fertig', zeit = jetzt()) => ({ ergebnis, zeit, aufgabe: text, text });

  test('frische Befunde bestimmen den Fokus', () => {
    const a = fokusFuer([befund('Kontrast zu niedrig, barrierefrei nachbessern'),
                         befund('Screenreader-Label fehlt'), befund('Tastaturbedienung fehlt')]);
    expect(a.fokus).toBe('accessibility');
    expect(a.grund, 'Grund muss die Befunde nennen').toMatch(/Befund/);

    const p = fokusFuer([befund('Ladezeit zu hoch, Bundle zu gross'), befund('cache greift nicht')]);
    expect(p.fokus).toBe('performance');
  });

  test('ohne Befund wird der Rückfall als solcher ausgewiesen', () => {
    // Der Kalender ist keine schlechtere Wahl, nur eine unbegründete — und
    // darf deshalb nicht wie ein Befund aussehen.
    const leer = fokusFuer([]);
    expect(leer.grund).toMatch(/Kalenderwoche/);
  });

  test('alte Befunde und Fehlschläge zählen nicht', () => {
    const alt = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    expect(fokusFuer([befund('barrierefrei Kontrast', 'fertig', alt)]).grund).toMatch(/Kalenderwoche/);
    // Ein Ausfall ist kein Befund.
    expect(fokusFuer([befund('barrierefrei Kontrast', 'fehler')]).grund).toMatch(/Kalenderwoche/);
  });
});

test.describe('Der Verbrauch muss nachvollziehbar sein', () => {
  // Aus der Kostenprüfung über 12,1 Mio Token: 0 % Cache, ~90 % als
  // „Unknown App" nicht zuzuordnen, mehrere am Tokenlimit abgeschnittene
  // Antworten — und die zählten als erledigte Arbeit.
  const fs = require('node:fs');
  const path = require('node:path');
  const AGENT = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'agent.mjs'), 'utf8');

  test('jeder Aufruf ist einer App zuzuordnen', () => {
    // Ohne HTTP-Referer bucht OpenRouter auf „Unknown App"; eine
    // Kostenprüfung, die 90 % nicht zuordnen kann, ist keine Prüfung.
    expect(AGENT, 'Puls ohne App-Zuordnung').toMatch(/'HTTP-Referer':/);
  });

  test('eine abgeschnittene Antwort gilt nicht als erledigt', () => {
    // Vorher genügte Boolean(text): ein am Limit abgebrochener Halbsatz wurde
    // „fertig" gebucht und der Aufgabenzeiger rückte weiter.
    expect(AGENT, 'finish_reason wird nicht ausgewertet').toMatch(/finish_reason/);
    expect(AGENT, 'Abschneiden muss das Ergebnis entwerten')
      .toMatch(/const hatErgebnis = Boolean\(text\) && !abgeschnitten/);
  });

  test('Cache-Anteil und Abbruchgrund landen im Journal', () => {
    // Ohne Messung bleibt „0 % Cache" eine Vermutung statt eines Befunds.
    expect(AGENT, 'Cache-Anteil wird nicht erfasst').toMatch(/cacheTokens:/);
    expect(AGENT, 'Abbruchgrund wird nicht erfasst').toMatch(/abbruchGrund:/);
  });
});

test.describe('Frontier-Modelle nur dort, wo Urteil zählt', () => {
  // Der Nutzer will die stärksten Modelle. Sie kosten aber ein Vielfaches —
  // im stündlichen Elf-Rollen-Puls wäre das Tagesbudget in einem Lauf weg.
  // Deshalb: nur die beiden Urteilsrollen des Autopiloten, und nur dort ein
  // höherer Preisdeckel.
  const fs = require('node:fs');
  const path = require('node:path');
  const wurzel = path.join(__dirname, '..', '..');
  const AUTO = fs.readFileSync(path.join(wurzel, 'scripts', 'openrouter-agents.mjs'), 'utf8');
  const AGENT = fs.readFileSync(path.join(wurzel, 'scripts', 'agent.mjs'), 'utf8');

  test('nur Architekt und Reviewer dürfen teurer einkaufen', () => {
    expect(AUTO).toMatch(/FRONTIER_ROLLEN = new Set\(\['architect', 'reviewer'\]\)/);
    // Der Preisdeckel muss an der Rolle hängen, nicht global gelockert sein.
    expect(AUTO, 'Preisdeckel pauschal angehoben').toMatch(
      /FRONTIER_ROLLEN\.has\(rolle\)\s*\?\s*\{ prompt: [\d.]+, completion: [\d.]+ \}\s*:\s*\{ prompt: 0\.60, completion: 1\.20 \}/);
  });

  test('der häufige Lagebild-Puls bleibt auf offenen Gewichten', () => {
    // agent.mjs fährt 11 Rollen je Lauf. Ein Frontier-Modell dort wäre der
    // teuerste denkbare Ort dafür.
    expect(AGENT, 'Puls darf keine Frontier-Weiche haben').not.toMatch(/EB_FRONTIER_/);
    for (const m of KATALOG.modelle.filter((x) => x.weg === 'openrouter')) {
      expect(m.offen, `${m.person} im Puls ist kein offenes Modell`).toBe(true);
    }
  });

  test('ohne Konfiguration bleibt alles auf offenen Gewichten', () => {
    // Ein geratener Slug fiele still zurück; deshalb kommt der Bezeichner aus
    // der Umgebung und der Standard ist ausdrücklich das offene Modell.
    expect(AUTO).toMatch(/frontier\('EB_FRONTIER_ARCHITEKT', 'meta-llama\/llama-3\.3-70b-instruct'\)/);
    expect(AUTO).toMatch(/frontier\('EB_FRONTIER_REVIEWER', 'deepseek\/deepseek-v4-flash'\)/);
    // Und das offene Modell muss zusätzlich als Rückfall dastehen, sonst
    // bricht der Lauf ab, wenn der Slug nicht existiert.
    const arch = AUTO.slice(AUTO.indexOf('architect: {'), AUTO.indexOf('implementer: {'));
    expect(arch, 'kein offener Rückfall für den Architekten').toMatch(/fallbacks: \['meta-llama\/llama-3\.3-70b-instruct'/);
  });
});

// ── Die Schicht darf nicht still stehenbleiben ────────────────────────────
//
// Am 07.08. brach die Tagesroutine ab, am 10.08. der Ensemble-Puls. Elf Läufe
// in Folge, fünf Tage lang, und niemand hat es bemerkt. Der Grund war nicht
// ein Fehler, sondern vier Eigenschaften, die zusammen dafür sorgten, dass
// ein Ausfall wie Ruhe aussieht. Diese vier hält der Block hier fest.
test.describe('Der Ausfall muss sichtbar sein', () => {
  const HQ_OPS = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'hq-operations.yml'), 'utf8');
  const TAGES  = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'tagesroutine.yml'), 'utf8');
  const MODELS = fs.readFileSync(path.join(ROOT, 'scripts', 'models.mjs'), 'utf8');
  const AGENT  = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');

  test('keine Aufgabe nennt eine Datei, die die Schicht abbrechen lässt', () => {
    // Der eigentliche Auslöser. `mistral-ops` sollte den Releaseweg beurteilen
    // und bekam dafür ionos-deploy.yml — darin steht das SFTP-Deployziel, und
    // das Verbotsmuster „Infrastruktur-Zugang" greift zu Recht. Falsch war
    // nicht die Regel, sondern die Zuweisung.
    //
    // Geprüft wird über das echte Tor: models.mjs --check liest jede
    // Aufgaben-Datei und wendet dieselbe Prüfung an, die zur Laufzeit greift.
    const out = execFileSync('node', ['scripts/models.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out, 'das Tor meldet eine blockierende Aufgaben-Datei').not.toMatch(/⛔/);
    expect(MODELS, 'das Tor prüft den Inhalt nicht gegen GEHEIMNISSE')
      .toMatch(/ersterTreffer\(inhalt\.slice\(0, AUFGABEN_AUSSCHNITT\), GEHEIMNISSE\)/);
  });

  test('Tor und Laufzeit sehen denselben Ausschnitt', () => {
    // Zwei Zahlen, die auseinanderlaufen können, sind zwei Zahlen zu viel:
    // prüfte das Tor 2000 Zeichen und die Laufzeit 3000, käme eine Aufgabe
    // durch und stürbe nachts. Deshalb eine Konstante, von beiden benutzt.
    expect(MODELS).toMatch(/AUFGABEN_AUSSCHNITT/);
    expect(AGENT, 'agent.mjs schneidet mit einer eigenen Zahl zu')
      .toMatch(/inhalt\.slice\(0, AUFGABEN_AUSSCHNITT\)/);
    expect(AGENT, 'die Zahl steht wieder hart im Code').not.toMatch(/slice\(0, 3000\)/);
  });

  test('ein Rollen-Abbruch beendet nicht den ganzen Lauf', () => {
    // GitHub führt Schritte mit `bash -e` aus: der erste Exit-Code 1 in der
    // Schleife beendete den Schritt. mistral-ops steht an dritter Stelle von
    // elf — acht Rollen kamen dadurch nie an die Reihe.
    const schleife = HQ_OPS.slice(
      HQ_OPS.indexOf('for rolle in'), HQ_OPS.indexOf('ROLLEN_OK='));
    expect(schleife, 'der Aufruf hängt nicht an einer Bedingung').toMatch(/if node scripts\/agent\.mjs/);
    expect(schleife, 'ein Fehlschlag wird nicht aufgefangen').toMatch(/else/);
    expect(HQ_OPS, 'nur ein Totalausfall darf den Lauf rot machen')
      .toMatch(/if \[ "\$gearbeitet" -eq 0 \]/);
  });

  test('das Journal überlebt den Fehlschlag, den es festhalten soll', () => {
    // agent.mjs schreibt den Abbruch korrekt hinein — aber ohne `if: always()`
    // liefen die Schritte danach nie, und der Eintrag verschwand mit dem
    // Runner. Das HQ zeigte deshalb Leere statt elf Abbrüchen: genau das,
    // wovor CLAUDE.md warnt („ein Journal, das nur Erfolge führt …").
    const ab = HQ_OPS.indexOf('- name: Journal validieren');
    expect(ab, 'Journal-Schritt nicht gefunden').toBeGreaterThan(0);
    const rest = HQ_OPS.slice(ab);
    for (const schritt of ['Journal validieren', 'SFTP-Werkzeug einrichten', 'Echte Laufzeitspur veroeffentlichen']) {
      const i = rest.indexOf(`- name: ${schritt}`);
      expect(i, `Schritt fehlt: ${schritt}`).toBeGreaterThanOrEqual(0);
      expect(rest.slice(i, i + 220), `${schritt} läuft nach einem Fehlschlag nicht`)
        .toMatch(/if: always\(\)/);
    }
  });

  test('beide Routinen melden ihren eigenen Ausfall', () => {
    // Der Site-Monitor legt bei nicht erreichbarer Seite ein Issue an —
    // deshalb wüsstest du sofort, wenn die Seite weg wäre. Für die Belegschaft
    // gab es nichts Vergleichbares. Eine Automatik, deren Ausfall niemand
    // bemerkt, ist keine Automatik, sondern eine Annahme.
    for (const [name, quelle] of [['hq-operations', HQ_OPS], ['tagesroutine', TAGES]]) {
      expect(quelle, `${name}: keine Meldung bei Fehlschlag`).toMatch(/if: failure\(\)/);
      expect(quelle, `${name}: darf keine Issues anlegen`).toMatch(/issues: write/);
      expect(quelle, `${name}: legt kein Issue an`).toMatch(/issues\.create\(/);
      // Und es muss sich wieder schließen — ein Alarm, der stehen bleibt,
      // wird nach dem zweiten Mal ignoriert.
      expect(quelle, `${name}: schließt das Issue nie wieder`).toMatch(/state: 'closed'/);
    }
  });

  test('eine abgebrochene Schicht nimmt die Tagesarbeit nicht mit', () => {
    // Demo-Feed und Selbstcheck liefen jede Nacht sauber durch — sie wurden
    // nur nie committet, weil der Agent-Aufruf davor den Lauf beendete. Die
    // Dateien sahen dadurch sieben bis zehn Tage lang aktuell aus.
    // Geprüft wird jeder Schicht-Aufruf einzeln, ohne sich auf Abschnitts-
    // überschriften zu verlassen — die ändern sich, die Eigenschaft nicht.
    // `--check` ist ausgenommen: das ist die Journal-Prüfung, kein Modellaufruf,
    // und die SOLL den Lauf rot machen, wenn das Journal kaputt ist.
    const zeilen = TAGES.split('\n');
    const schichten = zeilen
      .map((z, i) => ({ z, i }))
      .filter(({ z }) => /node scripts\/agent\.mjs/.test(z) && !/--check/.test(z));
    expect(schichten.length, 'keine Schicht-Aufrufe gefunden').toBeGreaterThan(1);

    for (const { z, i } of schichten) {
      // Entweder steht das Auffangen auf derselben Zeile, oder der Aufruf
      // wird per Backslash fortgesetzt und fängt in der nächsten Zeile auf.
      const zusammen = /\\\s*$/.test(z) ? `${z}\n${zeilen[i + 1] ?? ''}` : z;
      expect(zusammen, `Schicht bricht den Lauf ab: ${z.trim().slice(0, 55)}`)
        .toMatch(/\|\|/);
    }
  });
});

// ── Der Kontext-Schritt darf nicht an einer Textlänge hängen ──────────────
//
// Nach der ersten Reparatur lief der Puls weiter rot — an einer ganz anderen
// Stelle. Der Schritt „Belegten Arbeitskontext bauen" schnitt den Ist-Stand
// mit `sed … | head -n 24` zu. GitHub fährt bash mit `-o pipefail`: sobald der
// Abschnitt länger wird als das Limit, schließt `head` die Pipe, `sed` stirbt
// an SIGPIPE (Exit 141), und der Schritt reißt den ganzen Lauf mit.
//
// Ausgelöst hat es meine eigene Sprint-Notiz — der Abschnitt wuchs von 22 auf
// 84 Zeilen. Ein Workflow, den man durch Schreiben umwerfen kann, ist eine
// Falle mit Zeitzünder.
test.describe('Der Arbeitskontext überlebt lange Notizen', () => {
  const { execFileSync } = require('node:child_process');
  const os = require('node:os');
  const HQ_OPS = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'hq-operations.yml'), 'utf8');

  /** Den `run:`-Block eines Schritts aus dem Workflow holen, ohne YAML-Parser. */
  function schrittBlock(name) {
    const von = HQ_OPS.indexOf(`- name: ${name}`);
    expect(von, `Schritt nicht gefunden: ${name}`).toBeGreaterThan(0);
    const rest = HQ_OPS.slice(von);
    const naechster = rest.indexOf('\n      - name:', 1);
    const block = naechster > 0 ? rest.slice(0, naechster) : rest;
    const r = block.indexOf('run: |');
    expect(r, `kein run-Block in: ${name}`).toBeGreaterThan(0);
    // Einrückung der Schritt-Ebene (10 Leerzeichen) entfernen.
    return block.slice(r + 'run: |'.length)
      .split('\n').map((z) => z.replace(/^ {10}/, '')).join('\n');
  }

  test('der Schritt läuft auch bei sehr langem Ist-Stand durch', () => {
    // Ausgeführt wird der echte Block aus dem Workflow, mit genau den
    // Shell-Optionen, die GitHub setzt — nicht ein Nachbau davon.
    let skript = schrittBlock('Belegten Arbeitskontext bauen');
    const ziel = path.join(os.tmpdir(), `ctx-${Date.now()}-${Math.random()}.txt`);
    skript = skript
      .replace(/\.ai-run\/ensemble-context\.txt/g, ziel)
      .replace(/mkdir -p \.ai-run/, 'true')
      .replace(/>> "\$GITHUB_STEP_SUMMARY"/g, '>/dev/null');

    // Die Sprint-Notiz künstlich aufblähen: genau der Fall, der es gerissen hat.
    const sprint = path.join(ROOT, 'vault', '50-Evolution', 'Roadmap', 'Current-Sprint.md');
    const original = fs.readFileSync(sprint, 'utf8');
    // Bewusst über 64 KB: SIGPIPE tritt nur auf, wenn der Schreiber nach dem
    // Ende des Lesers noch schreibt. Bei 300 Zeilen passt alles in den Puffer
    // der Pipe, `sed` ist fertig bevor `head` schließt — der Test lief dann
    // grün, obwohl der Fehler wieder drin war. Erst oberhalb der Puffergröße
    // ist der Fall sicher reproduzierbar.
    const fuellung = Array.from({ length: 5000 },
      (_, i) => `- Zeile ${i} des Ist-Stands, absichtlich lang genug, um den Pipe-Puffer zu fuellen`).join('\n');
    const aufgeblaeht = original.replace(/^## Stand heute.*$/m, (kopf) => `${kopf}\n${fuellung}`);
    try {
      fs.writeFileSync(sprint, aufgeblaeht, 'utf8');
      execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', skript],
        { cwd: ROOT, encoding: 'utf8' });
      // Und der Ausschnitt bleibt trotzdem klein — der Kontext ist der Verbrauch.
      const zeilen = fs.readFileSync(ziel, 'utf8').split('\n');
      expect(zeilen.length, 'der Kontext läuft ungebremst voll').toBeLessThan(60);
    } finally {
      fs.writeFileSync(sprint, original, 'utf8');
      try { fs.unlinkSync(ziel); } catch { /* nie geschrieben */ }
    }
  });

  test('kein Schritt schneidet mit einer Pipe nach head zu', () => {
    // Dieselbe Falle steckt in jedem `… | head`, sobald pipefail gilt.
    // `|| head` ist ein Rückfall und keine Pipe — nur ein einzelnes `|` zählt.
    const treffer = HQ_OPS.split('\n')
      .filter((z) => /(^|[^|])\|\s*head\b/.test(z) && !/^\s*#/.test(z));
    expect(treffer, `SIGPIPE-Falle: ${treffer.join(' / ')}`).toHaveLength(0);
  });
});

// ── Ein gescheiterter Push ist kein gruener Lauf ──────────────────────────
//
// Die Tagesroutine hat in ihrer gesamten Laufzeit kein einziges Mal
// committet — es gibt keinen einzigen `chore(routine)`-Commit. Sie meldete
// trotzdem jedes Mal Erfolg: die Push-Schleife brach nach vier Versuchen
// einfach ab, und der Schritt lief gruen weiter. Demo-Feed und Selbstcheck
// sahen dadurch aktuell aus und waren sieben bis zehn Tage alt.
test.describe('Die Routine darf Erfolg nicht vortäuschen', () => {
  const TAGES = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'tagesroutine.yml'), 'utf8');

  test('die Routine liefert über einen Pull Request, nicht direkt auf main', () => {
    // Der direkte Push war nie moeglich — ein Repository-Ruleset verlangt
    // „Changes must be made through a pull request". Die Regel wird nicht
    // umgangen, sondern eingehalten.
    const block = TAGES.slice(
      TAGES.indexOf('- name: Committen, falls geaendert'),
      TAGES.indexOf('- name: Ausfall melden'));
    expect(block, 'die Routine pusht weiter direkt auf main')
      .not.toMatch(/git push[^\n]*HEAD:main/);
    expect(block, 'kein eigener Zweig').toMatch(/git checkout -b "\$zweig"/);
    expect(block, 'kein Pull Request').toMatch(/gh pr create --base main/);
    expect(TAGES, 'ohne pull-requests: write kann sie keinen PR anlegen')
      .toMatch(/pull-requests: write/);
  });

  test('beide Liefer-Workflows nutzen die App, nicht GITHUB_TOKEN', () => {
    // Ein PR, den GITHUB_TOKEN anlegt, loest keine Workflow-Laeufe aus. Die im
    // Ruleset geforderte PR-Validierung laeuft dann nie an, und der PR kann
    // grundsaetzlich nicht mergen — bei der Tagesroutine wie beim Autopiloten
    // (PR #123 stand deshalb seit dem 11.08. offen).
    const AUTOPILOT = fs.readFileSync(
      path.join(ROOT, '.github', 'workflows', 'openrouter-autopilot.yml'), 'utf8');
    for (const [name, quelle] of [['tagesroutine', TAGES], ['autopilot', AUTOPILOT]]) {
      expect(quelle, `${name}: holt kein App-Token`)
        .toMatch(/uses: actions\/create-github-app-token@v\d/);
      expect(quelle, `${name}: der Merker fehlt (secrets ist in steps.*.if nicht verfügbar)`)
        .toMatch(/HAT_APP: \$\{\{ secrets\.EB_ROUTINE_APP_ID != '' \}\}/);
      // Kein Liefer-Token darf mehr fest auf GITHUB_TOKEN stehen — nur als
      // ausdruecklicher Rueckfall hinter dem App-Token.
      const feste = quelle.split('\n').filter((z) =>
        /^\s*token: \$\{\{ secrets\.GITHUB_TOKEN \}\}\s*$/.test(z));
      expect(feste, `${name}: Token fest auf GITHUB_TOKEN — ${feste.join(' / ')}`).toHaveLength(0);
    }
  });

  test('das Routine-Token ist optional, sein Fehlen aber nicht still', () => {
    // Mit GITHUB_TOKEN loest ein angelegter PR keine Workflow-Laeufe aus, also
    // laeuft die im Ruleset geforderte Pruefung nie an und der PR bliebe ewig
    // offen. Ohne das PAT muss die Routine das SAGEN — sonst waere es wieder
    // ein Ausfall, der wie Erfolg aussieht.
    expect(TAGES, 'kein Rückfall auf GITHUB_TOKEN')
      .toMatch(/steps\.apptoken\.outputs\.token \|\| secrets\.GITHUB_TOKEN/);
    expect(TAGES, 'der Push läuft nicht unter dem App-Token')
      .toMatch(/token: \$\{\{ steps\.apptoken\.outputs\.token/);
    expect(TAGES, 'die fehlende App wird nicht benannt')
      .toMatch(/Routine-App nicht eingerichtet/);
    // Und mit Token soll er von selbst zufallen, sobald die Prüfungen grün sind.
    expect(TAGES, 'kein Auto-Merge').toMatch(/gh pr merge --squash --auto/);
  });

  test('scheitert der Push, scheitert der Lauf', () => {
    const block = TAGES.slice(
      TAGES.indexOf('- name: Committen, falls geaendert'),
      TAGES.indexOf('- name: Ausfall melden'));
    expect(block, 'Commit-Schritt nicht gefunden').toContain('git push');
    // Der Erfolg muss festgehalten und danach geprüft werden — eine Schleife,
    // die nur `&& break` kennt, endet bei Totalausfall genauso wie bei Erfolg.
    expect(block, 'der Push-Erfolg wird nicht festgehalten').toMatch(/gepusht=1/);
    expect(block, 'ein gescheiterter Push beendet den Lauf nicht')
      .toMatch(/if \[ "\$gepusht" -ne 1 \][\s\S]{0,400}exit 1/);
  });

  test('zwei Läufe am selben Tag bekommen verschiedene Zweige', () => {
    // Der Zweig des 11:23-Laufs lag noch da — ein Squash-Merge löscht den
    // Kopf-Zweig nicht —, der 12:26-Lauf traf auf denselben Namen und wurde
    // vier Mal abgewiesen (Lauf 31596389869). „Ein Zweig pro Tag" trägt
    // nicht: ein Tag darf mehr als einen Lauf haben.
    //
    // Geprüft wird die Zuweisung, wie die Shell sie wirklich auswertet, nicht
    // wie sie aussieht.
    const zeile = TAGES.split('\n').map((z) => z.trim()).find((z) => z.startsWith('zweig='));
    expect(zeile, 'keine Zweig-Zuweisung im Workflow gefunden').toBeTruthy();
    const benennen = (lauf, versuch) => execFileSync('bash', ['-c',
      `${zeile.replace(/\$\{\{ github\.run_id \}\}/g, lauf)
        .replace(/\$\{\{ github\.run_attempt \}\}/g, versuch)}\nprintf '%s' "$zweig"`,
    ], { encoding: 'utf8' });

    const erster = benennen('111', '1');
    expect(erster, 'der Zweigname bleibt leer').toMatch(/^routine\/.+/);
    expect(benennen('222', '1'), 'zwei Läufe am selben Tag treffen denselben Zweig')
      .not.toBe(erster);
    expect(benennen('111', '2'), 'eine Wiederholung desselben Laufs trifft denselben Zweig')
      .not.toBe(erster);
  });

  test('der Routine-Zweig wird ohne Zwang gepusht', () => {
    // `--force-with-lease` prüft gegen den bekannten Remote-Stand. Der flache
    // Checkout kennt zum Routine-Zweig gar keinen, also lehnt Git mit
    // „stale info" ab — dauerhaft, nicht vorübergehend, weshalb die vier
    // Wiederholungen nichts als 32 Sekunden gekostet haben.
    //
    // Zu einem laufeigenen Zweig ist Zwang nie nötig. Steht er wieder da,
    // heißt das: entweder kann der Name doch kollidieren, oder genau dieser
    // Fehler ist zurück.
    const pushes = TAGES.split('\n').filter((z) => /git push/.test(z) && !/^\s*#/.test(z));
    expect(pushes.length, 'kein Push gefunden').toBeGreaterThan(0);
    for (const z of pushes) {
      expect(z, `erzwungener Push — ${z.trim()}`).not.toMatch(/--force/);
    }
  });

  test('kein Liefer-Schritt endet still nach der letzten Wiederholung', () => {
    // Dasselbe Muster wie oben, aber allgemein: jede `for … done`-Schleife um
    // einen Push herum braucht danach eine Auswertung. Sonst ist „vier Mal
    // vergeblich versucht" von „beim ersten Mal geklappt" nicht zu
    // unterscheiden — und genau das ist hier monatelang passiert.
    for (const [name, quelle] of [['tagesroutine', TAGES]]) {
      const schleifen = quelle.split('\n')
        .filter((z) => /git push/.test(z) && !/^\s*#/.test(z));
      expect(schleifen.length, `${name}: kein Push gefunden`).toBeGreaterThan(0);
      for (const z of schleifen) {
        expect(z, `${name}: Push ohne Erfolgsmerker — ${z.trim().slice(0, 50)}`)
          .toMatch(/if git push|gepusht/);
      }
    }
  });
});
