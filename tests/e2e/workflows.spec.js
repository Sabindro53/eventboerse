// Ein Workflow, den GitHub als „active" führt, dessen Datei aber nirgends
// liegt, ist der gefährlichste Zustand von allen: er sieht aus wie Schutz.
//
// Bei Eventbörse betraf das vier Einträge, zwei davon Sicherheits-Workflows.
// Der Gitleaks-Scanner stand vier Monate im Repository und hat nie gesucht.
//
// Geprüft wird die REGEL, nicht der HTTP-Aufruf: `vergleiche()` bekommt eine
// gestellte API-Antwort. Die Suite läuft damit weiter ohne Netz — und was
// schiefgehen kann, ist ohnehin die Regel, nicht das Abrufen.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');

/** ESM aus einer CommonJS-Testdatei. */
const laden = () => import(path.join(ROOT, 'scripts', 'workflows.mjs'));

/** Ein Eintrag, wie die GitHub-API ihn liefert. */
const eintrag = (datei, anzeige = datei) =>
  ({ name: anzeige, path: `.github/workflows/${datei}`, state: 'active' });

test.describe('Phantom-Workflows: aktiv gemeldet, Datei nirgends', () => {
  test('ein registrierter Workflow ohne Datei fällt auf', async () => {
    const { vergleiche } = await laden();
    const r = vergleiche(
      [eintrag('pr-check.yml'), eintrag('security-codeql.yml', 'Security – CodeQL')],
      new Set(['pr-check.yml']),
    );
    expect(r.phantome.map((p) => p.name)).toEqual(['security-codeql.yml']);
  });

  test('ein bewusst stillgelegter Workflow ist kein Phantom, aber sichtbar', async () => {
    // Der Unterschied zwischen „vergessen" und „abgeschafft" ist der Grund.
    // Ohne diese Trennung müsste man das Tor abschalten, sobald man etwas
    // absichtlich entfernt — und dann prüft es nie wieder.
    const { vergleiche, STILLGELEGT } = await laden();
    const r = vergleiche([eintrag('smoke-tests.yml')], new Set());
    expect(r.phantome, 'ein stillgelegter Workflow blockiert').toHaveLength(0);
    expect(r.stillgelegt).toHaveLength(1);
    expect(r.stillgelegt[0].grund, 'stillgelegt ohne Begründung')
      .toMatch(/pr-check/);
    // Jeder Eintrag nennt wirklich einen Grund — eine leere Zeichenkette
    // wäre eine Ausnahme ohne Rechtfertigung.
    for (const [name, grund] of Object.entries(STILLGELEGT)) {
      expect(String(grund).length, `${name} ohne Grund`).toBeGreaterThan(30);
    }
  });

  test('GitHub-eigene Einträge sind kein Befund', async () => {
    // `dynamic/copilot-swe-agent/copilot` und `dynamic/pages/…` haben nie
    // eine Datei im Repo. Ein Tor, das sie meldet, wird abgeschaltet.
    const { vergleiche } = await laden();
    const r = vergleiche([
      { name: 'Copilot cloud agent', path: 'dynamic/copilot-swe-agent/copilot' },
      { name: 'pages-build-deployment', path: 'dynamic/pages/pages-build-deployment' },
    ], new Set());
    expect(r.phantome).toHaveLength(0);
  });

  test('eine neue Datei, die GitHub noch nicht kennt, ist kein Fehler', async () => {
    const { vergleiche } = await laden();
    const r = vergleiche([], new Set(['ganz-neu.yml']));
    expect(r.phantome).toHaveLength(0);
    expect(r.unbekannt).toEqual(['ganz-neu.yml']);
  });

  test('ohne Token wird nicht still durchgewunken', () => {
    // Der Kern: ein Tor, das sein Subjekt nicht findet, darf nicht grün
    // aussehen. Genau diese Verwechslung hat den Gitleaks-Scan vier Monate
    // lang wie einen laufenden Schutz aussehen lassen.
    let code = 0;
    let aus = '';
    const umgebung = { ...process.env };
    delete umgebung.GH_TOKEN;
    delete umgebung.GITHUB_TOKEN;
    try {
      aus = execFileSync('node', [path.join(ROOT, 'scripts', 'workflows.mjs'), '--check'],
        { cwd: ROOT, encoding: 'utf8', env: umgebung });
    } catch (e) {
      code = e.status ?? 1;
      aus = String(e.stdout || '') + String(e.stderr || '');
    }
    expect(code, 'ohne Token meldet das Tor Erfolg').toBe(1);
    expect(aus).toMatch(/Nicht geprüft/);
  });

  test('CodeQL analysiert die Quelle, nicht das erzeugte app.js', () => {
    // app.js ist eine Verkettung von js/modules/**. Ohne Ausschluss meldete
    // CodeQL jeden Befund zweimal — und ein Bericht mit doppelten Befunden
    // wird nicht gelesen.
    const konfig = fs.readFileSync(
      path.join(ROOT, '.github', 'codeql', 'codeql-config.yml'), 'utf8');
    expect(konfig, 'das erzeugte app.js wird mitanalysiert').toMatch(/^\s*-\s*app\.js\s*$/m);
    expect(konfig, 'Fremdbibliotheken werden mitanalysiert').toMatch(/assets\/lib/);

    const wf = fs.readFileSync(path.join(WF_DIR, 'security-codeql.yml'), 'utf8');
    expect(wf, 'die Konfiguration wird nicht eingebunden')
      .toMatch(/config-file:\s*\.\/\.github\/codeql\/codeql-config\.yml/);
    // autobuild kann fehlschlagen und analysiert für JS nichts. Ein roter
    // Sicherheits-Workflow, der nie eine Analyse gemacht hat, ist schlimmer
    // als keiner.
    expect(wf, 'autobuild ist wieder drin').not.toMatch(/codeql-action\/autobuild/);
  });

  test('der Code-Prüfer trennt "nichts gefunden" von "nicht nachgesehen"', () => {
    // Bei #220 am 30.08. brach `git diff origin/main...HEAD` im flachen
    // Checkout ab ("fatal: no merge base"), und der Schritt meldete
    // „Kein Code-Diff — nichts gegenzulesen". Der Prüfer hatte sein
    // Subjekt NICHT GEFUNDEN und sah aus, als hätte er nichts gefunden —
    // dieselbe Verwechslung, die den toten Gitleaks-Scan vier Monate wie
    // Schutz aussehen liess.
    const wf = fs.readFileSync(path.join(WF_DIR, 'pr-check.yml'), 'utf8');
    expect(wf, 'es gibt keinen eigenen Zweig für den fehlenden Vergleichspunkt')
      .toMatch(/Code-Pruefer uebersprungen/);
    expect(wf, 'der Vergleichspunkt wird nicht explizit bestimmt')
      .toMatch(/git merge-base/);
    // Und die naive Form, die genau daran scheiterte, darf nicht zurück.
    expect(wf, 'die Drei-Punkt-Form ohne merge-base-Prüfung ist zurück')
      .not.toMatch(/git diff origin\/\$\{\{ github\.base_ref \}\}\.\.\.HEAD/);
  });

  test('für den Vergleichspunkt werden BEIDE Seiten vertieft', () => {
    // Nur die Basis zu vertiefen genügt nicht — der PR-Zweig bleibt dann
    // bei Tiefe 1 und es gibt weiterhin keinen gemeinsamen Vorfahren.
    // Das war der erste, wirkungslose Versuch dieser Reparatur.
    const wf = fs.readFileSync(path.join(WF_DIR, 'pr-check.yml'), 'utf8');
    expect(wf, 'der flache Checkout wird nicht aufgelöst')
      .toMatch(/is-shallow-repository[\s\S]{0,200}fetch --unshallow/);
  });

  test('die Tagesroutine meldet einen abgelehnten Auto-Merge sichtbar', () => {
    // Bis zum 30.08. ging der Ausgang nur in die Step-Summary. Dort sieht
    // ihn niemand — sichtbar wurde der Ausfall erst daran, dass sich vier
    // grüne Routine-PRs stapelten, der älteste seit dem 27.08.
    const wf = fs.readFileSync(path.join(WF_DIR, 'tagesroutine.yml'), 'utf8');
    const block = wf.slice(wf.indexOf('gh pr merge'));
    expect(block, 'der Ausgang geht wieder nur in die Step-Summary')
      .toMatch(/tee -a "\$GITHUB_STEP_SUMMARY"/);
    expect(block, 'ein abgelehnter Auto-Merge nennt keine Ursache')
      .toMatch(/Allow auto-merge/);
  });

  test('jeder Workflow im Repo hat eine gültige YAML-Struktur und Berechtigungen', () => {
    // Ein Workflow ohne `permissions` bekommt die Repo-Vorgabe — bei einem
    // oeffentlichen Repo mit Deploy-Rechten ist das zu viel.
    const dateien = fs.readdirSync(WF_DIR).filter((d) => /\.ya?ml$/.test(d));
    expect(dateien.length).toBeGreaterThan(10);
    const ohne = dateien.filter((d) => {
      const t = fs.readFileSync(path.join(WF_DIR, d), 'utf8');
      return !/^permissions:/m.test(t) && !/^\s{4,}permissions:/m.test(t);
    });
    expect(ohne, `Workflows ohne permissions-Block: ${ohne.join(', ')}`).toEqual([]);
  });
});
