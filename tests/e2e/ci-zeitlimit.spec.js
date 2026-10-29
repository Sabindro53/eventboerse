// Jeder Job des PR-Checks hat ein Zeitlimit.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// VORSORGE, kein Nachtrag zu einem Vorfall: in diesem Repository ist noch
// kein PR-Check haengengeblieben. Das gehoert hierher, weil der erste
// Entwurf dieser Datei einen Haenger von „ueber 51 Minuten" behauptete.
// Den gab es nicht — die Zahl entstand, weil ich die aktuelle Zeit
// GESCHAETZT statt gelesen habe. Nachgemessen lief der betroffene Lauf
// 40947709948 genau 14 min 20 s (20:17:33 -> 20:31:53) und war damit in
// der Norm; abgebrochen hat ihn mein eigener Eingriff. Eine Begruendung
// aus einer erfundenen Messung ist schlimmer als keine.
//
// Der echte Grund ist GitHubs Vorgabe: ohne `timeout-minutes` darf ein Job
// SECHS STUNDEN laufen, und `pr-check.yml` trug keines. Der Job `check`
// ist der EINZIGE Kontext, den das Ruleset auf `main` verlangt — steht er
// auf `in_progress`, bleibt `mergeable_state` auf `blocked`. Ein
// haengender Pflicht-Check blockiert den Merge also genauso wirksam wie
// ein roter, nur ohne Befund. Eine `concurrency`-Gruppe, die einen
// ueberholten Lauf abbraeche, gibt es ebenfalls nicht.
//
// Dieselbe Fehlerklasse wie der Deploy-Haenger vom 03.09.2026, der mit
// `timeout` und `timeout-minutes` behoben wurde; der PR-Check hat diese
// Behandlung nie bekommen.
//
// ── WARUM NACH ABZUG DER KOMMENTARE GEMESSEN WIRD ──────────────────────
//
// Der erklaerende Block in `pr-check.yml` nennt `timeout-minutes` mehrfach
// im Fliesstext — er muss es, denn er begruendet die Zahl. Ein Ausdruck
// ueber die rohe Datei ist deshalb gruen, sobald jemand die Zeile entfernt
// und den Kommentar stehen laesst, und das ist die wahrscheinlichste
// Gestalt genau dieses Unfalls. In diesem Projekt sind an derselben Stelle
// schon `recht.mjs`, `kontext.mjs`, der Kontaktschutz, die
// Erstattungsregel und der Storno-Knopf gescheitert.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { ohneYamlKommentare } = require('./lib/yaml-code');
const { workflowJobs } = require('./lib/workflow-schritte');

const WURZEL = path.join(__dirname, '..', '..');
const WORKFLOW = path.join(WURZEL, '.github', 'workflows', 'pr-check.yml');

/** Die Jobs des PR-Checks, Rumpf ohne YAML-Kommentare. */
function jobs() {
  return workflowJobs(WORKFLOW).map((j) => ({
    id: j.id,
    block: ohneYamlKommentare(j.block),
  }));
}

// Ein Job-Schluessel steht auf vier Leerzeichen (`  jobid:` plus zwei).
// Alles tiefer liegt in `steps:` — ein Limit dort deckt den naechsten
// neuen Schritt nicht, und genau darum geht es hier.
const AM_JOB = /^ {4}timeout-minutes:[ \t]*(\d+)[ \t]*$/m;

// Gemessene Norm des Suite-Jobs: 11 bis 14 Minuten (#348 11 min 11 s,
// #339 14 min 17 s). Ein Limit unter 20 loeste bei Runner-Schwankung aus
// und waere in zwei Wochen entfernt. Nach oben begrenzt NICHT ein
// beobachteter Haenger — es gab keinen —, sondern der Zweck: ab einer
// Stunde ist die Zeile gegenueber GitHubs sechs Stunden eine Formalie und
// kein Limit mehr.
const NORM_MIN = 20;
const NORM_MAX = 60;

test.describe('Der PR-Check kann nicht sechs Stunden haengen', () => {
  test('die Zerlegung findet ueberhaupt Jobs', () => {
    // Gegenprobe. Ohne sie waere „jeder Job hat ein Limit" bei NULL Jobs
    // erfuellt — eine leere Schleife, die nichts belegt. Genau so hat in
    // diesem Projekt schon eine Mutation ueberlebt, weil der gepruefte
    // Zweig nullmal durchlief.
    const alle = jobs();
    expect(alle.length, 'in pr-check.yml wurde kein Job gefunden — dann '
      + 'prueft diese Suite nichts und sieht dabei gruen aus').toBeGreaterThanOrEqual(2);
    expect(alle.map((j) => j.id)).toContain('tests');
  });

  test('jeder Job traegt ein Zeitlimit — am Job, nicht je Schritt', () => {
    // Abgeleitet, nicht aufgezaehlt: ein neuer Job bekommt seine Pruefung
    // geschenkt. Eine Handliste fiele beim naechsten Job stillschweigend
    // auseinander — dieselbe Lehre wie bei der Icon-Liste, die sich mit
    // sich selbst verglich, und bei `npm run gate`.
    for (const j of jobs()) {
      const m = j.block.match(AM_JOB);
      expect(m, `der Job \`${j.id}\` in pr-check.yml hat kein `
        + '`timeout-minutes` auf Job-Ebene. Ohne das gilt GitHubs Vorgabe von '
        + 'sechs Stunden, und ein haengender Pflicht-Check blockiert den Merge '
        + 'ohne Befund: `mergeable_state` bleibt `blocked`.').not.toBeNull();
      expect(Number(m[1]),
        `das Zeitlimit des Jobs \`${j.id}\` ist keine sinnvolle Zahl`)
        .toBeGreaterThan(0);
    }
  });

  test('das Limit des Suite-Jobs faengt einen Haenger und toetet keinen gesunden Lauf', () => {
    // Welcher Job die Suite faehrt, entscheidet `npx playwright test` —
    // NICHT der Jobname. Ein Name laesst sich umbenennen, ohne dass jemand
    // an diese Datei denkt, und genau eine Umbenennung hat den
    // Pflicht-Check-Fehler vom 14.09.2026 ueberhaupt wirksam gemacht.
    const suite = jobs().find((j) => /npx playwright test/.test(j.block));
    expect(suite, 'kein Job faehrt `npx playwright test` — dann hat diese '
      + 'Pruefung kein Subjekt').toBeTruthy();

    const m = suite.block.match(AM_JOB);
    expect(m, `der Job \`${suite.id}\` faehrt die Suite und hat kein Zeitlimit`)
      .not.toBeNull();

    const min = Number(m[1]);
    expect(min, `das Limit des Suite-Jobs liegt bei ${min} min. Unter `
      + `${NORM_MIN} min loest es bei Runner-Schwankung aus (gemessene Norm: `
      + '11 bis 14 min) — ein Tor, das grundlos rot wird, ist in zwei Wochen '
      + 'abgeschaltet.').toBeGreaterThanOrEqual(NORM_MIN);
    expect(min, `das Limit des Suite-Jobs liegt bei ${min} min. Ab `
      + `${NORM_MAX + 1} min ist es gegenueber GitHubs Vorgabe von sechs `
      + 'Stunden eine Formalie und kein Limit mehr.')
      .toBeLessThanOrEqual(NORM_MAX);
  });
});
