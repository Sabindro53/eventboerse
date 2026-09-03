// Der Auto-Merge darf nicht mit dem Branch-Schutz um die Wette laufen.
//
// #204 lag vom 25.08. 20:26 bis zum 26.08. 06:33 grün und ungemerged da.
// Der Auto-Merge hatte alle EIGENEN Tore bestanden — Label, Branch,
// Whitelist, Diffgröße — und scheiterte an GitHub:
//
//   HttpError: Repository rule violations found
//   Required status check "PR Check / PR-Validierung (pull_request)" is
//   expected.
//
// Die Zeitleiste erklärt es: Autopilot fertig 20:26:12, Auto-Merge gestartet
// 20:26:15, Merge-Versuch 20:26:24 — und die E2E-Suite des PRs wurde erst um
// 20:30:56 fertig. Der Versuch konnte nicht gelingen, es gab keinen zweiten,
// und der Grund stand nur im Log eines Workflows, den niemand ansieht.
//
// Geprüft wird das AM VERHALTEN: das Skript aus dem Workflow wird wirklich
// ausgeführt, mit gestelltem GitHub-Client. Eine Prüfung auf den Wortlaut
// würde nicht zeigen, ob der Merge wirklich erst nach den Prüfungen kommt —
// und genau die Reihenfolge war der Fehler.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const WF_PFAD = path.join(ROOT, '.github', 'workflows', 'openrouter-auto-merge.yml');
const WF = fs.readFileSync(WF_PFAD, 'utf8');

/**
 * Das `script:` des github-script-Schritts, so wie GitHub es ausfuehrt.
 *
 * Von Hand geschnitten statt mit einer YAML-Bibliothek: fuer einen Test eine
 * Abhaengigkeit aufzunehmen waere Lieferkette gegen Bequemlichkeit getauscht.
 * Der Block ist eindeutig — `script: |` und alles, was tiefer eingerueckt
 * folgt.
 */
function skript() {
  const start = WF.indexOf('script: |');
  expect(start, 'kein github-script-Block im Workflow').toBeGreaterThan(-1);
  const zeilen = WF.slice(WF.indexOf('\n', start) + 1).split('\n');
  const tiefe = zeilen[0].length - zeilen[0].trimStart().length;
  const raus = [];
  for (const z of zeilen) {
    if (z.trim() && z.length - z.trimStart().length < tiefe) break;
    raus.push(z.slice(tiefe));
  }
  const code = raus.join('\n');
  expect(code, 'der Block enthaelt nicht den Merge-Aufruf').toContain('pulls.merge');
  return code;
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * Fährt das Workflow-Skript gegen einen gestellten GitHub-Client.
 *
 * `pruefungen` ist eine Liste von Antwortrunden für `checks.listForRef` —
 * so lässt sich „läuft noch, läuft noch, fertig" nachbilden und zeigen, dass
 * wirklich gewartet wird.
 */
async function lauf({ pruefungen, dateien, mergeFehler = [] }) {
  const protokoll = [];
  let runde = 0;
  let mergeVersuch = 0;

  // Pause UND Uhr stellen. Die Pause allein genuegt nicht: die 15-Minuten-
  // Frist des Skripts laeuft in echter Zeit, und eine Schleife mit
  // Null-Pausen wuerde sie 15 Minuten lang durchdrehen. Gemessen wird die
  // Reihenfolge, nicht die Uhr — also darf die Uhr springen.
  const echterTimeout = globalThis.setTimeout;
  const echtesNow = Date.now;
  globalThis.setTimeout = (fn) => echterTimeout(fn, 0);
  let uhr = echtesNow.call(Date);
  Date.now = () => { uhr += 20000; return uhr; };

  const github = {
    paginate: async () => dateien,
    rest: {
      pulls: {
        list: async () => ({ data: [{
          number: 204,
          head: { ref: 'openrouter/auto-x', sha: 'abc123', repo: { full_name: 'o/r' } },
          body: 'Lauf: https://github.com/o/r/actions/runs/999',
        }] }),
        get: async () => ({ data: {
          number: 204, draft: false, title: 'T',
          labels: [{ name: 'openrouter-autonomous' }],
          head: { ref: 'openrouter/auto-x', sha: 'abc123', repo: { full_name: 'o/r' } },
        } }),
        listFiles: () => {},
        merge: async () => {
          protokoll.push('MERGE');
          // `mergeFehler` bildet nach, was GitHub bei #221 geantwortet hat:
          // die ersten Anlaeufe scheitern, ein spaeterer geht durch.
          const f = mergeFehler[mergeVersuch];
          mergeVersuch += 1;
          if (f) throw Object.assign(new Error(f), { status: 405 });
          return { data: { merged: true, sha: 'neu' } };
        },
      },
      checks: {
        listForRef: async () => {
          protokoll.push('CHECKS');
          const r = pruefungen[Math.min(runde, pruefungen.length - 1)];
          runde += 1;
          return { data: { check_runs: r } };
        },
      },
      issues: {
        createComment: async ({ body }) => { protokoll.push(`KOMMENTAR: ${body}`); },
        removeLabel: async () => {},
      },
      repos: {
        getBranch: async () => ({ data: { commit: { sha: 'neu' } } }),
      },
      actions: {
        createWorkflowDispatch: async () => { protokoll.push('DEPLOY'); },
      },
    },
  };

  const context = {
    repo: { owner: 'o', repo: 'r' },
    payload: { workflow_run: {
      id: 999, head_branch: 'main', head_repository: { full_name: 'o/r' },
    } },
  };

  let gescheitert = null;
  const core = {
    notice: (m) => protokoll.push(`NOTIZ: ${m}`),
    setFailed: (m) => { gescheitert = m; protokoll.push(`FEHLER: ${m}`); },
  };

  try {
    await new AsyncFunction('github', 'context', 'core', 'process', skript())(
      github, context, core, { env: { GITHUB_WORKSPACE: ROOT } });
  } finally {
    globalThis.setTimeout = echterTimeout;
    Date.now = echtesNow;
  }
  return { protokoll, gescheitert };
}

/** Eine Datei, wie `pulls.listFiles` sie liefert. */
const datei = (filename, status = 'modified') =>
  ({ filename, status, additions: 2, deletions: 2 });

// Der Autopilot darf nur freigegebene Frontend-Dateien anfassen; `app.js`
// und der Auftragsstrom sind erzeugt und deshalb ebenfalls erlaubt.
const ERLAUBT = [
  datei('app.js'),
  datei('js/modules/core/02-router-navigation.js'),
  datei('assets/eb-auftragsstrom.json'),
];

const GRUEN = { name: 'PR-Validierung', status: 'completed', conclusion: 'success' };
const LAEUFT = { name: 'E2E-Testsuite (Playwright)', status: 'in_progress', conclusion: null };
const ROT = { name: 'E2E-Testsuite (Playwright)', status: 'completed', conclusion: 'failure' };

test.describe('Auto-Merge: erst die Prüfungen, dann der Merge', () => {
  test('es wird gewartet, bis die Prüfungen fertig sind', async () => {
    // Zwei Runden „läuft noch", dann grün — genau die Lage bei #204.
    const r = await lauf({
      dateien: ERLAUBT,
      pruefungen: [[GRUEN, LAEUFT], [GRUEN, LAEUFT], [GRUEN, { ...LAEUFT, status: 'completed', conclusion: 'success' }]],
    });
    const checksVorMerge = r.protokoll.filter((z) => z === 'CHECKS').length;
    expect(checksVorMerge, 'es wurde nur einmal nachgesehen — also nicht gewartet')
      .toBeGreaterThan(1);
    expect(r.protokoll).toContain('MERGE');
    // Und die REIHENFOLGE: kein Merge, bevor die Prüfungen fertig sind.
    expect(r.protokoll.indexOf('MERGE'))
      .toBeGreaterThan(r.protokoll.lastIndexOf('CHECKS'));
    expect(r.gescheitert, `unerwartet gescheitert: ${r.gescheitert}`).toBeNull();
  });

  test('nach dem Merge startet der Deploy weiterhin', async () => {
    // Der Merge bleibt bewusst in der Hand des Workflows. GitHubs eingebautes
    // Auto-Merge waere eleganter, aber dann fuehrt GitHub den Merge aus — und
    // der loest keinen Push-Workflow aus. Die Aenderung waere gemerged und
    // nie live.
    const r = await lauf({ dateien: ERLAUBT, pruefungen: [[GRUEN]] });
    expect(r.protokoll).toContain('DEPLOY');
    expect(r.protokoll.indexOf('DEPLOY'))
      .toBeGreaterThan(r.protokoll.indexOf('MERGE'));
  });

  test('eine rote Prüfung verhindert den Merge', async () => {
    const r = await lauf({ dateien: ERLAUBT, pruefungen: [[GRUEN, ROT]] });
    expect(r.protokoll, 'trotz roter Prüfung gemerged').not.toContain('MERGE');
    expect(r.gescheitert).toMatch(/rot/i);
    // Sichtbar am PR, nicht nur im Log — genau der Teil, der bei #204 zehn
    // Stunden gekostet hat.
    expect(r.protokoll.some((z) => z.startsWith('KOMMENTAR:')),
      'der Grund steht nur im Log').toBe(true);
  });

  test('laufen die Prüfungen nie fertig, wird nicht gemerged', async () => {
    const r = await lauf({ dateien: ERLAUBT, pruefungen: [[GRUEN, LAEUFT]] });
    expect(r.protokoll).not.toContain('MERGE');
    expect(r.gescheitert).toMatch(/noch nicht fertig/);
  });

  test('ohne jede Prüfung wird nicht gemerged', async () => {
    // Der gefährlichste Fall: eine leere Liste sähe aus wie „alles grün".
    const r = await lauf({ dateien: ERLAUBT, pruefungen: [[]] });
    expect(r.protokoll, 'ohne eine einzige Prüfung gemerged').not.toContain('MERGE');
    expect(r.gescheitert).toMatch(/keine einzige Pruefung/);
  });

  test('eine noch nicht verbuchte Prüfung wird nachgereicht, nicht aufgegeben', async () => {
    // Der Fall von #221 am 30.08.: alle Prüfungen fertig und grün, der
    // Merge elf Sekunden später abgelehnt mit
    //   Required status check "PR Check / PR-Validierung" is expected.
    // GitHub hatte den Check-Run als fertig gemeldet, ihn im Branch-Schutz
    // aber noch nicht verbucht. Auf fertige Prüfungen zu warten ist nicht
    // dasselbe wie zu warten, bis GitHub sie anerkennt.
    const r = await lauf({
      dateien: ERLAUBT,
      pruefungen: [[GRUEN]],
      mergeFehler: [
        'Repository rule violations found\nRequired status check "PR Check / PR-Validierung (pull_request)" is expected.',
        'Repository rule violations found\nRequired status check "PR Check / PR-Validierung (pull_request)" is expected.',
      ],
    });
    const versuche = r.protokoll.filter((z) => z === 'MERGE').length;
    expect(versuche, 'es gab nur einen Merge-Versuch — genau das war der Fehler')
      .toBeGreaterThan(1);
    expect(r.gescheitert, `trotz erfolgreichem Nachreichen gescheitert: ${r.gescheitert}`)
      .toBeNull();
    expect(r.protokoll, 'nach dem Merge lief der Deploy nicht').toContain('DEPLOY');
  });

  test('eine endgültige Ablehnung wird NICHT weggeschliffen', async () => {
    // Anlaeufe duerfen nur die eine Ursache abfangen. Ein Konflikt oder
    // eine fehlende Berechtigung wiederholt sich nicht von selbst — wer
    // darauf pocht, merged irgendwann etwas, das nicht gemerged gehoert.
    const r = await lauf({
      dateien: ERLAUBT,
      pruefungen: [[GRUEN]],
      mergeFehler: Array(9).fill('Resource not accessible by integration'),
    });
    const versuche = r.protokoll.filter((z) => z === 'MERGE').length;
    expect(versuche, 'eine endgültige Ablehnung wurde wiederholt').toBe(1);
    expect(r.gescheitert).toMatch(/abgelehnt/i);
    expect(r.protokoll).not.toContain('DEPLOY');
  });

  test('gibt GitHub dauerhaft nicht nach, steht der Grund am PR', async () => {
    const r = await lauf({
      dateien: ERLAUBT,
      pruefungen: [[GRUEN]],
      mergeFehler: Array(9).fill('Required status check is expected.'),
    });
    expect(r.protokoll).not.toContain('DEPLOY');
    expect(r.protokoll.some((z) => z.startsWith('KOMMENTAR:')),
      'der Grund steht wieder nur im Log').toBe(true);
    expect(r.gescheitert).toBeTruthy();
  });

  test('der Rahmen wird weiterhin vor dem Warten geprüft', async () => {
    // Die Scope-Prüfung darf durch den Umbau nicht nach hinten gerutscht
    // sein: eine nicht freigegebene Datei muss abgewiesen werden, ohne dass
    // überhaupt auf Prüfungen gewartet wird.
    const r = await lauf({
      dateien: [...ERLAUBT, datei('functions.php')],
      pruefungen: [[GRUEN]],
    });
    expect(r.protokoll).not.toContain('MERGE');
    expect(r.protokoll).not.toContain('CHECKS');
    expect(r.gescheitert).toMatch(/Scope verletzt/);
  });
});
