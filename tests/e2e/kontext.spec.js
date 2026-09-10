// Stimmen die Zahlen in CLAUDE.md noch?
//
// CLAUDE.md ist die Datei, die jede Sitzung zuerst liest — und war die
// einzige, die niemand nachmisst. Am 22.08.2026 waren vier Angaben veraltet,
// darunter eine „bekannte Schwäche", die es seit Langem nicht mehr gibt. Wer
// sie liest, sucht ein behobenes Problem; ein veraltetes Steuerungsdokument
// kostet mehr als gar keins, weil es Vertrauen geniesst.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SKRIPT = path.join(ROOT, 'scripts', 'kontext.mjs');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');
const SPRINT_MD = path.join(ROOT, 'vault', '50-Evolution', 'Roadmap', 'Current-Sprint.md');

/** Führt das Tor aus; gibt Erfolg und Ausgabe zurück, ohne zu werfen. */
function tor() {
  try {
    return { ok: true, aus: execFileSync('node', [SKRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' }) };
  } catch (e) {
    return { ok: false, aus: String(e.stdout || '') + String(e.stderr || '') };
  }
}

/** Ändert CLAUDE.md vorübergehend und stellt den Stand danach wieder her. */
function mitGeaenderterNotiz(alt, neu, fn) {
  return mitGeaendertenDateien([[CLAUDE_MD, alt, neu]], fn);
}

/**
 * Dasselbe für mehrere Dateien gleichzeitig.
 *
 * Nötig für die Gegenprobe zur Handzahl: der teure Fall ist der, in dem
 * BEIDE Dokumente dieselbe falsche Zahl nennen. Wer nur eines ändern kann,
 * kann ihn nicht herstellen — und genau er blieb bis zum 10.09.2026 grün.
 */
function mitGeaendertenDateien(aenderungen, fn) {
  const vorher = aenderungen.map(([datei]) => [datei, fs.readFileSync(datei, 'utf8')]);
  for (const [datei, alt, neu] of aenderungen) {
    const inhalt = fs.readFileSync(datei, 'utf8');
    expect(inhalt.includes(alt), `Muster nicht in ${path.basename(datei)}: ${alt}`).toBe(true);
    fs.writeFileSync(datei, inhalt.replace(alt, neu));
  }
  try { return fn(); } finally { vorher.forEach(([d, i]) => fs.writeFileSync(d, i)); }
}

// Diese Tests schreiben CLAUDE.md kurzzeitig um. Sie MÜSSEN nacheinander
// laufen: bei `fullyParallel` änderte ein Test die Datei, während ein anderer
// sie prüfte — zwei Fehlschläge, die nichts mit dem Prüfer zu tun hatten.
test.describe.configure({ mode: 'serial' });

test.describe('Kontext: CLAUDE.md gegen den Code', () => {
  test('der ausgelieferte Stand ist stimmig', () => {
    const r = tor();
    expect(r.ok, r.aus).toBe(true);
    expect(r.aus).toMatch(/Alle prüfbaren Angaben stimmen/);
  });

  test('eine falsche Zahl fällt auf', () => {
    // DIE ZAHL WIRD GELESEN, NICHT VERDRAHTET. Hier stand „24 Module" fest —
    // beim 25. Modul fiel der Test aus, und zwar an der Zahl statt an der
    // Eigenschaft, die er prüft. Ein Test, der bei jeder normalen Änderung
    // rot wird, wird irgendwann nur noch nachgezogen statt gelesen; der
    // Nachbartest daneben macht es längst richtig.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const jetzt = (md.match(/Quelle des Frontends: (\d+) Module/) || []);
    expect(jetzt[0], 'die Modulzahl steht nicht mehr in CLAUDE.md').toBeTruthy();
    // Um eins daneben ist per Konstruktion falsch — eine feste Zahl könnte
    // eines Tages zufällig die richtige sein, und dann prüfte der Test nichts.
    const falsch = 'Quelle des Frontends: ' + (Number(jetzt[1]) + 1) + ' Module';
    const r = mitGeaenderterNotiz(jetzt[0], falsch, tor);
    expect(r.ok, 'eine erfundene Modulzahl kommt durch').toBe(false);
    expect(r.aus).toMatch(/Frontend-Module/);
  });

  test('eine umformulierte Aussage gilt nicht als bestanden', () => {
    // Der gefährlichste Fall: der Sucher greift ins Leere und das Tor sieht
    // grün aus, obwohl es nichts mehr prüft. Deshalb ist „nicht gefunden"
    // ein Fehler und kein Durchwinken.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const jetzt = (md.match(/REST API \(\d+ Routen\)/) || [])[0];
    expect(jetzt, 'die Routenzahl steht nicht mehr in CLAUDE.md').toBeTruthy();
    const r = mitGeaenderterNotiz(jetzt, 'REST API (viele Routen)', tor);
    expect(r.ok, 'eine verschwundene Aussage wird stillschweigend übergangen').toBe(false);
    expect(r.aus).toMatch(/nicht mehr gefunden/);
  });

  test('eine mehrdeutige Aussage gilt nicht als bestanden', () => {
    // Passiert beim Dokumentieren von selbst: der Fliesstext zitiert die
    // alte Zahl, und das Muster greift plötzlich zwei Stellen. Dann misst
    // der Prüfer nicht die Aussage, sondern die Reihenfolge im Dokument —
    // und meldete beim Bauen prompt einen Fehler, den es nicht gab.
    const r = mitGeaenderterNotiz('### Der Kontext wird nachgemessen',
      '### Der Kontext wird nachgemessen\n\nFrüher: REST API (86 Routen).', tor);
    expect(r.ok, 'eine doppelt getroffene Aussage kommt durch').toBe(false);
    expect(r.aus).toMatch(/mehrdeutig/);
  });

  test('eine erfundene Testzahl fällt auf', () => {
    // Die aktuelle Zahl aus der Datei lesen statt sie hier zu verdrahten —
    // sonst bricht dieser Test bei jedem neuen Test in der Suite.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const jetzt = (md.match(/(\d+ Tests in \d+ Suiten)/) || [])[1];
    expect(jetzt, 'die Testzahl steht nicht mehr in CLAUDE.md').toBeTruthy();
    const r = mitGeaenderterNotiz(jetzt, jetzt.replace(/^\d+/, '999'), tor);
    expect(r.ok, 'eine erfundene Testzahl kommt durch').toBe(false);
    expect(r.aus).toMatch(/Tests \(CLAUDE\.md\)/);
  });

  test('zwei einige Dokumente sind kein Beleg — gemessen wird gegen Playwright', () => {
    // ── DER BEFUND VOM 10.09.2026 ────────────────────────────────────────
    //
    // Bis dahin verglich das Tor die Testzahl in CLAUDE.md mit der in
    // Current-Sprint.md: ZWEI HANDZAHLEN MITEINANDER. Nennen beide dieselbe
    // falsche Zahl, meldete es „Testzahl einig" und war grün — eine
    // Entwarnung über eine Suite, in die es nie gesehen hat.
    //
    // Dieser Test stellt genau den Zustand her. Mit dem alten Abgleich ist
    // er grün, mit der Messung rot; ohne ihn kann die Prüfung jederzeit
    // wieder zum Abgleich zweier Notizen werden.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const jetzt = (md.match(/(\d+) Tests in \d+ Suiten/) || [])[1];
    expect(jetzt, 'die Testzahl steht nicht mehr in CLAUDE.md').toBeTruthy();
    const falsch = String(Number(jetzt) + 7);
    const r = mitGeaendertenDateien([
      [CLAUDE_MD, `${jetzt} Tests in`, `${falsch} Tests in`],
      [SPRINT_MD, `Playwright-Suite: ${jetzt} Tests`, `Playwright-Suite: ${falsch} Tests`],
    ], tor);
    expect(r.ok, 'zwei Dokumente mit derselben falschen Zahl kommen durch').toBe(false);
    // Beide müssen auffallen, nicht nur eines — sonst bliebe die eine Hälfte
    // weiterhin ungemessen und nur zufällig richtig.
    expect(r.aus, 'CLAUDE.md wird nicht gemessen').toMatch(/✗ Tests \(CLAUDE\.md\)/);
    expect(r.aus, 'Current-Sprint wird nicht gemessen').toMatch(/✗ Tests \(Current-Sprint\)/);
  });

  test('eine gedriftete Suitenzahl fällt auf', () => {
    // Der Beleg für den Befund: `# 44 Tests` neben social.spec.js (echt 43)
    // und `# 14 Tests` neben aasa.spec.js (echt 18) standen monatelang in
    // CLAUDE.md, mit grünem Haken daneben — diese Zeilen wurden gar nicht
    // geprüft. Gemessen wird jetzt jede von ihnen.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const treffer = (md.match(/tests\/e2e\/[\w.-]+\.spec\.js[^\n#]*#\s*\d+\s+Tests/) || [])[0];
    expect(treffer, 'keine Suitenzahl mehr in CLAUDE.md').toBeTruthy();
    const r = mitGeaenderterNotiz(treffer, treffer.replace(/#\s*\d+/, '# 999'), tor);
    expect(r.ok, 'eine erfundene Suitenzahl kommt durch').toBe(false);
    expect(r.aus).toMatch(/\.spec\.js\s+behauptet\s+999/);
  });

  test('ohne Messung wird nicht durchgewunken', () => {
    // Nicht messen ist kein Bestehen. Genau diese Verwechslung liess den
    // toten Gitleaks-Scan vier Monate wie Schutz aussehen: er suchte nie und
    // meldete nichts, und beides sah gleich aus.
    //
    // Hergestellt, indem `npx` unauffindbar wird — dann kann das Tor die
    // Suite nicht befragen und MUSS rot melden, statt die Handzahlen
    // stillschweigend gelten zu lassen.
    //
    // Node wird dabei über `process.execPath` gestartet, nicht über den
    // PATH. Der erste Entwurf leerte den PATH ganz — dann fand die Shell
    // auch `node` nicht, das Tor lief nie an, und der Test belegte statt
    // seiner Zusicherung nur, dass ein Aufruf ins Leere fehlschlägt.
    const leer = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'kein-npx-'));
    let r;
    try {
      r = { ok: true, aus: execFileSync(process.execPath, [SKRIPT, '--check'],
        { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PATH: leer } }) };
    } catch (e) {
      r = { ok: false, aus: String(e.stdout || '') + String(e.stderr || '') };
    }
    expect(r.ok, 'ohne messbare Suite meldet das Tor trotzdem Erfolg').toBe(false);
    expect(r.aus).toMatch(/Testzahl nicht messbar/);
  });

  test('die überholte Polling-Angabe kommt nicht zurück', () => {
    // Sie beschrieb eine Schwäche, die es nicht mehr gibt: das Polling
    // beginnt bei 5 s, fällt bis 20 s zurück und pausiert bei verstecktem
    // Tab. Gemessen am Code, nicht an der Notiz.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    expect(md, 'die veraltete 3-Sekunden-Angabe steht wieder da')
      .not.toMatch(/Polling \(alle 3s\)/);
    const chat = fs.readFileSync(
      path.join(ROOT, 'js', 'modules', 'chat', '20-chat-nachrichten.js'), 'utf8');
    const basis = Number((chat.match(/_CHAT_POLL_BASE\s*=\s*(\d+)/) || [, 0])[1]);
    const deckel = Number((chat.match(/_CHAT_POLL_CAP\s*=\s*(\d+)/) || [, 0])[1]);
    expect(basis, 'der Takt ist wieder aggressiver als beschrieben').toBeGreaterThanOrEqual(5000);
    expect(deckel, 'ohne Rückfall pollt ein offener Chat dauerhaft').toBeGreaterThan(basis);
    // Und die Pause bei verstecktem Tab ist der Teil, der den PHP-Pool schont.
    expect(chat, 'kein Anhalten bei verstecktem Tab').toMatch(/document\.hidden/);
  });
});
