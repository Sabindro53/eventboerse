// Ein gekürzter Kontext muss sich als gekürzt zu erkennen geben.
//
// Am 30.08.2026 meldete der Code-Prüfer am PR #220 zwei Befunde, die beide
// falsch waren und beide konkret klangen:
//
//   „Zeile 1080: `// Firefox kennt nur report-ur` — Satz ist unvollständig
//    abgeschnitten … Dies führt zu einem Syntaxfehler."
//   „eb_csp_report_empfangen und eb_csp_report_lesen sind definiert, aber
//    nirgends per register_rest_route() angemeldet."
//
// `php -l` war grün, und die Registrierung stand in Zeile 3952. Die Ursache
// war dieselbe für beide: der Diff war 95 607 Zeichen lang, das Modell bekam
// die ersten 12 000 — still abgeschnitten. Es las bis zur Schnittkante und
// beschrieb, was dort steht. Es hat nicht falsch geraten; ihm wurde nur nicht
// gesagt, dass sein Text mitten im Wort endet.
//
// Ein Prüfer, der zweimal grundlos anschlägt, wird abgeschaltet — und der eine
// echte Befund, den er irgendwann hat, geht mit ihm.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const laden = () => import(path.join(ROOT, 'scripts', 'lib', 'kontextgrenze.mjs'));

test.describe('Kontextgrenze: gekürzt heißt gesagt', () => {
  test('kurzer Text geht unverändert durch', async () => {
    const { kontextKuerzen } = await laden();
    const t = 'nur ein bisschen Text';
    expect(kontextKuerzen(t)).toBe(t);
    // Kein Hinweis, wo nichts gekürzt wurde — sonst misstraut das Modell
    // einem vollständigen Kontext.
    expect(kontextKuerzen(t)).not.toMatch(/AUSSCHNITT/);
  });

  test('genau an der Grenze wird nicht gekürzt', async () => {
    const { kontextKuerzen, KONTEXT_MAX } = await laden();
    const t = 'x'.repeat(KONTEXT_MAX);
    expect(kontextKuerzen(t)).toBe(t);
  });

  test('ein Zeichen darüber wird gekürzt UND vermerkt', async () => {
    const { kontextKuerzen, KONTEXT_MAX } = await laden();
    const aus = kontextKuerzen('x'.repeat(KONTEXT_MAX + 1));
    expect(aus, 'still abgeschnitten — genau der Fehler vom 30.08.')
      .toMatch(/AUSSCHNITT/);
  });

  test('der Hinweis nennt beide Zahlen', async () => {
    // „Gekürzt" allein genügt nicht: erst der Anteil sagt, ob man einem
    // Urteil über das Ganze trauen darf. 12 000 von 13 000 ist etwas
    // anderes als 12 000 von 400 000.
    const { kontextKuerzen, KONTEXT_MAX } = await laden();
    const voll = 95607;
    const aus = kontextKuerzen('y'.repeat(voll));
    expect(aus, 'die Grenze fehlt im Hinweis').toContain(String(KONTEXT_MAX));
    expect(aus, 'die wahre Länge fehlt im Hinweis').toContain(String(voll));
  });

  test('der Hinweis sagt, dass der Bruch KEIN Quelltextfehler ist', async () => {
    // Das ist der Satz, der die beiden erfundenen Befunde verhindert hätte.
    const { kontextKuerzen } = await laden();
    const aus = kontextKuerzen('z'.repeat(50000));
    expect(aus).toMatch(/KEIN Fehler im Quelltext/);
  });

  test('der echte Inhalt bleibt vorne vollständig erhalten', async () => {
    const { kontextKuerzen, KONTEXT_MAX } = await laden();
    const anfang = 'ANFANG-MARKE';
    const aus = kontextKuerzen(anfang + 'q'.repeat(KONTEXT_MAX * 2));
    expect(aus.startsWith(anfang), 'der Anfang wurde beschnitten').toBe(true);
    expect(aus.length, 'es wurde mehr durchgelassen als erlaubt')
      .toBeLessThan(KONTEXT_MAX + 400);
  });

  test('agent.mjs benutzt die geteilte Regel, nicht ein eigenes slice()', async () => {
    // Eine Kopie einer solchen Regel driftet — und diese driftet unbemerkt,
    // weil ein stilles Kürzen ja nichts kaputtmacht, was auffällt.
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
    expect(src, 'agent.mjs kürzt wieder selbst').toMatch(/kontextKuerzen\(/);
    expect(src, 'das stille slice() ist zurück')
      .not.toMatch(/kontext\s*=\s*kontext\.slice\(\s*0\s*,\s*\d+\s*\)/);
  });
});

test.describe('Der Prüfer bekommt nicht die erzeugten Dateien', () => {
  test('app.js und index.html sind aus dem Prüfer-Diff ausgeschlossen', () => {
    // Beide sind erzeugt (Verkettung von js/modules/** bzw. app-shell.html).
    // Ändert sich ein Modul, ändert sich app.js mit — der Prüfer bekäme jede
    // Zeile zweimal, einmal als Quelle und einmal als Kopie. Dieselbe
    // Begründung wie beim CodeQL-Ausschluss; hier kommt hinzu, dass der
    // Platz ohnehin knapp ist.
    const wf = fs.readFileSync(
      path.join(ROOT, '.github', 'workflows', 'pr-check.yml'), 'utf8');
    const block = wf.slice(wf.indexOf('Code-Prüfer liest den Diff'));
    expect(block, 'app.js landet wieder im Prüfer-Diff')
      .toMatch(/:\(exclude\)app\.js/);
    expect(block, 'index.html landet wieder im Prüfer-Diff')
      .toMatch(/:\(exclude\)index\.html/);
  });
});
