// Die Tore des PR-Checks — abgeleitet, nicht abgeschrieben.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// Am 13.09.2026 fiel PR #270 in CI durch, nachdem lokal „alle vier Tore
// grün" gemeldet worden war. Beides stimmte: lokal liefen vier Tore, der
// Workflow fährt sechzehn. Rot war `rechtsunterlagen.mjs --check` — eine
// erzeugte Datei trägt die Zahl der Frontend-Module, und das neue
// Storno-Modul machte aus 27 achtundzwanzig.
//
// Daneben stand `npm run gate`: eine von Hand gepflegte Kette von ACHT
// Toren, die vollständig aussah. Genau die Krankheit, an der hier schon
// eine Sicherheitsliste, eine Testzahl, eine Icon-Liste und ein
// Privacy-Manifest auseinandergelaufen sind.
//
// Diese Suite hält die EIGENSCHAFT fest, nicht die Zahl: was der Workflow
// als Tor fährt, fährt `scripts/tore.mjs` auch — und was es überspringt,
// nennt seinen Grund.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..', '..');
const WORKFLOW = path.join(WURZEL, '.github', 'workflows', 'pr-check.yml');

let tore;
test.beforeAll(async () => { tore = await import(path.join(WURZEL, 'scripts', 'tore.mjs')); });

function workflowText() {
  return fs.readFileSync(WORKFLOW, 'utf8');
}

/**
 * Zweite, UNABHÄNGIGE Lesung der Workflow-Datei.
 *
 * Bewusst nicht über den Parser aus `tore.mjs` — ein Prüfer, der sein
 * Subjekt mit demselben Werkzeug liest, das er prüft, bestätigt nur sich
 * selbst. Dieselbe Verwechslung liess die Testzahl monatelang zwei
 * Notizen miteinander vergleichen.
 */
function gateSkripteImWorkflow() {
  const text = workflowText();
  const treffer = text.match(/node scripts\/[\w-]+\.mjs\s+--(?:check|self-test)/g) || [];
  return [...new Set(treffer)];
}

test.describe('Tor-Läufer: was CI fährt, fährt auch lokal', () => {
  test('der Läufer findet den Job und eine plausible Zahl Tore', () => {
    const p = tore.plan(workflowText());
    expect(p, 'der Job `tests` wurde in pr-check.yml nicht gefunden — der '
      + 'Läufer hat sein Subjekt verloren').not.toBeNull();
    // Eine untere Schranke, kein fester Wert: eine feste Zahl müsste bei
    // jedem neuen Tor nachgezogen werden und wäre damit wieder die
    // Handliste, die dieser Läufer gerade ersetzt.
    expect(p.tore.length, 'auffällig wenige Tore — der Parser trifft sein '
      + 'Subjekt vermutlich nicht mehr').toBeGreaterThanOrEqual(10);
  });

  test('JEDES Gate-Skript des Workflows steht im Plan', () => {
    // Das ist die Regel, an der #270 gescheitert ist: `rechtsunterlagen`
    // lief in CI und lokal nicht.
    const p = tore.plan(workflowText());
    const alleBefehle = p.tore.map((s) => s.befehl).join('\n');
    const fehlen = gateSkripteImWorkflow().filter((g) => !alleBefehle.includes(g));
    expect(fehlen, `diese Tore fährt der Workflow, der lokale Läufer aber nicht: `
      + `${fehlen.join(', ')}`).toEqual([]);
  });

  test('ein `run: |`-Block bleibt EIN Befehl', () => {
    // Der erste Entwurf zerlegte Blöcke zeilenweise. Aus dem
    // Code-Prüfer-Schritt wurden dabei 45 „Tore", darunter Kommentarzeilen
    // und ein `fi` ohne sein `if` — und `bash` hätte die Bruchstücke
    // einzeln ausgeführt.
    const p = tore.plan(workflowText());
    const block = p.tore.find((s) => s.befehl.includes('rechtsunterlagen.mjs'));
    expect(block, 'der Rechtsunterlagen-Schritt fehlt im Plan').toBeTruthy();
    expect(block.befehl, 'der Block wurde zerlegt — `rechtsquellen` und '
      + '`rechtsunterlagen` stehen in EINEM `run: |`, und nur zusammen '
      + 'verhalten sie sich wie in CI').toContain('rechtsquellen.mjs');
    // Gegenprobe: kein Tor besteht nur aus einer Kommentarzeile.
    const kommentare = p.tore.filter((s) => s.befehl.trim().startsWith('#'));
    expect(kommentare.map((s) => s.befehl), 'eine Kommentarzeile wurde als Tor '
      + 'gelesen — der Block-Parser schneidet sein Subjekt auf').toEqual([]);
  });

  test('jeder übersprungene Schritt nennt seinen Grund', () => {
    // Ein stiller Übersprung ist dasselbe wie ein fehlendes Tor, nur mit
    // gutem Gewissen — dieselbe Mechanik wie beim toten Gitleaks-Scan.
    const p = tore.plan(workflowText());
    expect(p.uebersprungen.length, 'gar nichts übersprungen? Dann liefe `npm ci` '
      + 'lokal mit').toBeGreaterThan(0);
    for (const s of p.uebersprungen) {
      expect(s.grund, `der Schritt „${s.name}" wird übersprungen, ohne dass `
        + `irgendwo steht warum`).toBeTruthy();
    }
  });

  test('übersprungen wird nur Vorbereitung, die Suite und Actions-Ausdrücke', () => {
    // Der Vorgabewert muss LAUFEN sein. Wäre die Liste andersherum gebaut
    // — „diese hier ausführen" —, fiele jedes neue Tor stillschweigend
    // heraus, und genau das ist am 13.09. passiert.
    const p = tore.plan(workflowText());
    for (const s of p.uebersprungen) {
      const erlaubt = tore.KEINE_TORE.some((k) => s.befehl.includes(k))
        || tore.istActionsAusdruck(s.befehl);
      expect(erlaubt, `„${s.name}" wird übersprungen, ist aber weder `
        + `Vorbereitung noch ein Actions-Ausdruck`).toBe(true);
    }
    expect(tore.KEINE_TORE.length, 'die Ausnahmeliste wächst — eine Ausnahmeliste, '
      + 'die wachsen kann, ist der Anfang vom Ende der Regel').toBeLessThanOrEqual(3);
  });

  test('ein echtes Tor gilt als Tor, ein Installationsschritt nicht', () => {
    // Gegenprobe: ohne sie wäre „istTor gibt immer false zurück" eine
    // Erklärung, die alle Tests oben besteht.
    expect(tore.istTor('node scripts/recht.mjs --check')).toBe(true);
    expect(tore.istTor('npm ci')).toBe(false);
    expect(tore.istTor('npx playwright test')).toBe(false);
    expect(tore.istTor('git fetch origin ${{ github.base_ref }}')).toBe(false);
  });

  test('`npm run gate` ist keine zweite Liste mehr', () => {
    // Das war der eigentliche Fund: zwei gepflegte Fassungen derselben
    // Sache. Die eine fuhr 8 Tore, die andere 16.
    const pkg = JSON.parse(fs.readFileSync(path.join(WURZEL, 'package.json'), 'utf8'));
    const gate = String(pkg.scripts.gate || '');
    expect(gate, '`npm run gate` fehlt').toBeTruthy();
    expect(gate, '`npm run gate` zählt die Tore wieder selbst auf — dann driftet '
      + 'es gegen pr-check.yml, und das merkt man erst in CI')
      .toContain('scripts/tore.mjs');
    const eigene = (gate.match(/scripts\/[\w-]+\.mjs/g) || [])
      .filter((x) => !x.includes('tore.mjs'));
    expect(eigene, `\`npm run gate\` nennt zusätzlich eigene Skripte `
      + `(${eigene.join(', ')}) — jede davon ist eine Zeile, die driften kann`)
      .toEqual([]);
  });
});
