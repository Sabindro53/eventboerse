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
const { spawnSync } = require('node:child_process');
const { ohneJsKommentare } = require('./lib/js-code');

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

  test('der Läufer verschweigt nicht, was er selbst schreibt', () => {
    // ── WARUM DIESE REGEL ENTSTAND ─────────────────────────────────────
    //
    // Der Auftragsstrom-Schritt lautet `node scripts/auftragsstrom.mjs &&
    // … --check`: er ERZEUGT erst und prüft dann. In CI ist der Baum
    // wegwerfbar; lokal bleibt danach eine geänderte Datei stehen.
    //
    // Vor `npm run gate` hat diesen Schritt lokal niemand gefahren — jetzt
    // fährt ihn jeder, und eine Datei, die sich beim Prüfen von selbst
    // ändert, sieht aus wie eine vergessene Änderung. Beim ersten Mal war
    // sie das NICHT: das committete Artefakt widersprach seiner eigenen
    // Quelle, und der Unterschied trug einen echten Befund.
    //
    // Ein Läufer, der das verschweigt, erzieht dazu, solche Änderungen
    // blind zurückzusetzen — und dann verschwindet der nächste echte
    // Stand still. Geprüft wird die Existenz des Griffs im Code, nicht
    // sein Wortlaut.
    const quelle = ohneJsKommentare(
      fs.readFileSync(path.join(WURZEL, 'scripts', 'tore.mjs'), 'utf8'));
    expect(quelle, 'der Läufer sieht den Arbeitsbaum gar nicht an — was ein Tor '
      + 'erzeugt, bleibt unerwähnt').toMatch(/git['"],\s*\[['"]status['"]/);
    expect(quelle, 'der Baum wird nur EINMAL gemessen — ohne Vorher/Nachher '
      + 'ist jede vorher schon geänderte Datei ein Fehlalarm')
      .toMatch(/baumStand\s*\(\s*\)[\s\S]*baumStand\s*\(\s*\)/);
    // Und die Gegenprobe: er setzt NICHTS zurück. Ein Läufer, der
    // aufräumt, löscht irgendwann einen echten neuen Stand.
    //
    // Gemessen wird die BEDINGUNG, nicht die Schreibweise: der erste
    // Versuch verbot die Zeichenfolgen `checkout --`, `git clean` und so
    // fort — und die Mutation `['checkout', '--', '.']` schrieb dieselbe
    // Anweisung als Array und überlebte. Dieselbe Klasse wie ein Muster,
    // das den Kommentar trifft: das Wort gefunden, die Sache verfehlt.
    //
    // Die Regel lautet: der Läufer darf git FRAGEN, nie ihm etwas sagen.
    const gitRufe = [...quelle.matchAll(/spawnSync\s*\(\s*['"]git['"]\s*,\s*\[([^\]]*)\]/g)]
      .map((m) => (m[1].match(/['"]([^'"]+)['"]/) || [])[1]);
    expect(gitRufe.length, 'der Läufer ruft git gar nicht mehr').toBeGreaterThan(0);
    for (const unterbefehl of gitRufe) {
      expect(unterbefehl, `der Läufer ruft \`git ${unterbefehl}\` — er darf den `
        + `Arbeitsbaum LESEN, nie verändern; sonst verschwindet irgendwann ein `
        + `echter neuer Stand`).toBe('status');
    }
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

/**
 * Zerlegt `pr-check.yml` in seine Jobs.
 *
 * Geschnitten wird ab `jobs:`, nicht über die ganze Datei: `on:` trägt
 * einen Schlüssel `pull_request`, und der sieht auf zwei Ebenen Einrückung
 * aus wie ein Job. Genau daran hat ein erster Entwurf einen Job erfunden,
 * der keiner ist.
 */
function jobBloecke() {
  const text = workflowText();
  const ab = text.indexOf('\njobs:');
  if (ab < 0) return [];
  const rumpf = text.slice(ab);
  const kopf = [...rumpf.matchAll(/^ {2}([A-Za-z0-9_-]+):[ \t]*$/gm)];
  return kopf.map((m, i) => ({
    id: m[1],
    block: rumpf.slice(m.index + m[0].length,
      i + 1 < kopf.length ? kopf[i + 1].index : rumpf.length),
  }));
}

/** Die `run: |`-Blöcke eines Jobs, Einrückung abgezogen. */
function laufBloecke(block) {
  const aus = [];
  for (const m of block.matchAll(/^([ \t]+)run:[ \t]*\|[ \t]*\n/gm)) {
    const tiefer = new RegExp(`^(?:${m[1]}[ \\t]|[ \\t]*$)`);
    const zeilen = [];
    for (const z of block.slice(m.index + m[0].length).split('\n')) {
      if (!tiefer.test(z)) break;
      zeilen.push(z.slice(m[1].length));
    }
    aus.push(zeilen.join('\n'));
  }
  return aus;
}

test.describe('Der erzwungene Check trägt das Urteil der Suite', () => {
  // ── WARUM ES DIESEN BLOCK GIBT ─────────────────────────────────────
  //
  // Am 14.09.2026 nachgemessen: das Ruleset auf `main` verlangt genau
  // EINEN Kontext, `PR Check / PR-Validierung (pull_request)`. Das ist
  // der Job `check` — PHP-Syntax und zwei Kommentare, neun Sekunden.
  // Die sechzehn Tore und die 1122 Tests liegen im Job `tests`, und der
  // ist NICHT erzwungen.
  //
  // Ein PR mit roter Suite und roten Toren war damit mergefähig, sobald
  // PHP parst. Dieselbe Klasse wie der tote Gitleaks-Scan, nur eine
  // Ebene höher: der Prüfer läuft wirklich, er findet auch — und sein
  // Fund hat keine Folge, weil ihn niemand abfragt.
  //
  // Die Regel wird am BEFEHL festgemacht, nicht am Jobnamen: welcher Job
  // die Suite fährt, entscheidet `npx playwright test`. Ein Name lässt
  // sich umbenennen, ohne dass jemand an diese Datei denkt — und genau
  // eine Umbenennung hat den Fehler überhaupt erst wirksam gemacht.

  function suiteJob() {
    return jobBloecke().find((j) => /npx playwright test/.test(j.block));
  }

  test('genau ein Job fährt die Suite — und die anderen hängen an ihm', () => {
    const jobs = jobBloecke();
    expect(jobs.length, 'in pr-check.yml wurde kein Job gefunden — der '
      + 'Parser hat sein Subjekt verloren').toBeGreaterThanOrEqual(2);
    const suite = suiteJob();
    expect(suite, 'kein Job fährt `npx playwright test` — dann prüft dieser '
      + 'Workflow die Anwendung gar nicht mehr').toBeTruthy();

    for (const j of jobs) {
      if (j.id === suite.id) continue;
      expect(j.block, `der Job \`${j.id}\` hängt nicht von \`${suite.id}\` ab. `
        + `Er kann damit grün werden, während die Suite rot ist — und wenn `
        + `das Ruleset IHN verlangt, ist der Merge-Schutz wirkungslos`)
        .toMatch(new RegExp(`needs:\\s*(\\[\\s*)?['"]?${suite.id}\\b`));
      // Ohne `always()` wird der Job bei rotem `tests` ÜBERSPRUNGEN — und
      // ein übersprungener Pflicht-Check gilt bei GitHub als bestanden.
      // Die Abhängigkeit allein macht das Loch also nicht zu, sie
      // verschiebt es nur.
      expect(j.block, `der Job \`${j.id}\` trägt kein \`if: always()\`. Bei `
        + `roter Suite wird er übersprungen, und ein übersprungener `
        + `Pflicht-Check zählt bei GitHub als bestanden`)
        .toMatch(/if:\s*always\(\)/);
    }
  });

  test('der Torschritt wird wirklich rot — ausgeführt, nicht gelesen', () => {
    // Gemessen wird das VERHALTEN. Ein Test auf „irgendwo steht exit 1"
    // überlebt jede Mutation, die den Vergleich umdreht: das Wort stünde
    // weiter da. Deshalb wird der Schritt aus dem Workflow geschnitten,
    // der Actions-Ausdruck ersetzt und mit bash gefahren — dieselbe
    // Anordnung wie beim csso-Schritt des Deploys.
    const suite = suiteJob();
    const jobs = jobBloecke().filter((j) => j.id !== suite.id);
    expect(jobs.length, 'es gibt keinen zweiten Job mehr').toBeGreaterThan(0);

    for (const j of jobs) {
      const skripte = laufBloecke(j.block)
        .filter((s) => new RegExp(`needs\\.${suite.id}\\.result`).test(s));
      expect(skripte.length, `der Job \`${j.id}\` liest das Ergebnis von `
        + `\`${suite.id}\` nirgends. Er hängt davon ab und zieht daraus `
        + `keine Folge — ein Prüfer ohne Konsequenz`).toBeGreaterThan(0);

      const fahren = (ergebnis) => {
        const skript = skripte.join('\n')
          .replace(/\$\{\{\s*needs\.\w+\.result\s*\}\}/g, ergebnis)
          .replace(/\$\{\{[^}]*\}\}/g, '');
        return spawnSync('bash', ['-eo', 'pipefail', '-c', skript],
          { encoding: 'utf8', cwd: WURZEL });
      };

      expect(fahren('success').status, `bei grüner Suite bricht \`${j.id}\` `
        + `trotzdem ab — ein Tor, das immer rot ist, wird abgeschaltet`).toBe(0);

      // Die drei Ausgänge, die NICHT Erfolg sind. `skipped` ist der
      // gefährlichste: ohne `always()` ist er der Normalfall bei roter
      // Suite, und er sieht aus wie „nichts zu tun".
      for (const schlecht of ['failure', 'skipped', 'cancelled']) {
        expect(fahren(schlecht).status, `\`${j.id}\` wird bei `
          + `\`${suite.id}: ${schlecht}\` NICHT rot. Ist dies der erzwungene `
          + `Check, ist ein PR mit roter Suite mergefähig`).not.toBe(0);
      }
    }
  });
});
