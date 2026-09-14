#!/usr/bin/env node
/**
 * Die Tore des PR-Checks — lokal, und ABGELEITET statt abgeschrieben.
 *
 * ── DER BEFUND, AUS DEM DIESES SKRIPT ENTSTAND ─────────────────────────
 *
 * Am 13.09.2026 fiel PR #270 in CI durch, nachdem lokal „alle Tore grün"
 * gemeldet worden war. Beides stimmte: lokal liefen **vier** Tore, der
 * Workflow fährt **dreizehn**. Rot war `rechtsunterlagen.mjs --check` —
 * eine erzeugte Datei trägt die Zahl der Frontend-Module, und das neue
 * Storno-Modul machte aus 27 achtundzwanzig.
 *
 * Daneben stand `npm run gate` in `package.json`: eine von Hand gepflegte
 * Kette von **acht** Toren. Sie war nicht falsch, sie war unvollständig —
 * und sie sah vollständig aus. Genau die Krankheit, an der hier schon eine
 * Sicherheitsliste, eine Testzahl, eine Icon-Liste und ein
 * Privacy-Manifest auseinandergelaufen sind: **zwei gepflegte Fassungen
 * derselben Sache driften immer**, und diese driftete in die Richtung, in
 * der man es erst im CI merkt.
 *
 * ── DIE REGEL, DIE DAS TRÄGT ───────────────────────────────────────────
 *
 * **Ausgeführt wird, was im Workflow steht.** Nicht, was hier aufgezählt
 * ist. Ein neues Tor in `pr-check.yml` läuft hier ohne eine Zeile Arbeit
 * mit — das ist der ganze Zweck.
 *
 * **Der Vorgabewert ist LAUFEN, nicht Überspringen.** Übersprungen werden
 * genau drei Befehle, und sie sind keine Tore, sondern Vorbereitung bzw.
 * die Suite selbst (`npm ci`, `playwright install`, `playwright test`).
 * Wäre die Liste andersherum gebaut — „diese hier ausführen" —, fiele
 * jedes neue Tor stillschweigend heraus. So fällt höchstens etwas
 * **hinein**, und das meldet sich laut.
 *
 * **Was übersprungen wird, steht im Bericht.** Ein stiller Übersprung ist
 * dasselbe wie ein fehlendes Tor, nur mit gutem Gewissen.
 *
 * ── WARUM `bash -eo pipefail` ──────────────────────────────────────────
 *
 * Sechs Tore pipen ihren Befund in `$GITHUB_STEP_SUMMARY`. Ohne
 * `pipefail` ist der Rückgabewert der Pipe der von `tee` — und `tee`
 * gelingt immer. Genau daran waren am 09.09.2026 sechs Tore entwaffnet.
 * Der Workflow setzt das über `defaults: run: shell: bash` am Job; wer
 * hier ohne fährt, misst ein anderes Verhalten als das geprüfte.
 *
 * Aufruf:  node scripts/tore.mjs           (alle Tore)
 *          node scripts/tore.mjs --liste   (nur zeigen, nichts ausführen)
 */
import { readFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'pr-check.yml');

/**
 * Befehle, die im Tor-Job stehen, aber keine Tore sind.
 *
 * Bewusst genau drei, bewusst als Teilzeichenfolge des BEFEHLS und nicht
 * als Schrittname: ein Name lässt sich umformulieren, ohne dass jemand an
 * diese Datei denkt, und dann liefe ein Tor nicht mehr — oder schlimmer,
 * ein Nicht-Tor liefe mit und `npm ci` löschte lokal die Abhängigkeiten.
 */
export const KEINE_TORE = [
  'npm ci',                // Abhängigkeiten stehen lokal schon
  'playwright install',    // Browser sind lokal schon da
  'playwright test',       // die Suite ist ein eigener, langer Lauf
];

/**
 * Ein Befehl mit `${{ … }}` ist ein Actions-Ausdruck und kann ausserhalb
 * von GitHub gar nicht laufen — die Zeichenfolge bliebe stehen und der
 * Befehl liefe ins Leere oder gegen den falschen Zweig.
 *
 * Das trifft heute genau den Code-Pruefer, und der ist ausdruecklich kein
 * Tor: er kommentiert und macht den PR nie rot (`|| true` auf jedem Pfad).
 * Geprueft wird die EIGENSCHAFT, nicht sein Name — ein Schrittname laesst
 * sich umformulieren, ohne dass jemand an diese Datei denkt.
 */
export function istActionsAusdruck(befehl) {
  return befehl.includes('${{');
}

/** Den Job aus der Workflow-Datei schneiden (zeilenweise, kein YAML-Parser). */
function jobBlock(text, name) {
  const zeilen = text.split('\n');
  const von = zeilen.findIndex((z) => z === `  ${name}:`);
  if (von < 0) return null;
  let bis = zeilen.length;
  for (let i = von + 1; i < zeilen.length; i++) {
    // Ein neuer Job beginnt auf derselben Einrückungsebene.
    if (/^ {2}\S/.test(zeilen[i])) { bis = i; break; }
  }
  return zeilen.slice(von, bis);
}

/**
 * Die `run:`-Schritte eines Jobs, in ihrer Reihenfolge.
 *
 * Beide Schreibweisen: `run: befehl` einzeilig und `run: |` als Block.
 * Ein Parser, der nur eine kennt, überspringt die andere still — und
 * `rechtsunterlagen.mjs --check`, an dem dieser ganze Abschnitt hängt,
 * steht ausgerechnet in einem Block.
 *
 * **Ein Block ist EIN Befehl, keine Liste.** Der erste Entwurf dieser
 * Funktion zerlegte ihn zeilenweise — aus dem Code-Prüfer-Schritt wurden
 * 45 „Tore", darunter Kommentarzeilen und ein `fi` ohne sein `if`. Ein
 * Parser, der sein Subjekt zerschneidet, misst etwas anderes als das
 * Geprüfte; und `bash` hätte die Bruchstücke einzeln ausgeführt.
 */
export function schritteLesen(text, jobName = 'tests') {
  const zeilen = jobBlock(text, jobName);
  if (!zeilen) return null;
  const schritte = [];
  let name = '';
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    const mName = z.match(/^\s*-\s+name:\s*(.+?)\s*$/);
    if (mName) { name = mName[1]; continue; }

    const mBlock = z.match(/^(\s*)run:\s*\|\s*$/);
    if (mBlock) {
      const tiefer = mBlock[1].length;
      const teile = [];
      for (let j = i + 1; j < zeilen.length; j++) {
        if (zeilen[j].trim() === '') { teile.push(''); i = j; continue; }
        const ein = zeilen[j].match(/^(\s*)/)[1].length;
        if (ein <= tiefer) break;
        // Die Einrückung des Blocks abziehen, die des Skripts behalten —
        // sonst geht die Struktur von if/fi und Heredocs verloren.
        teile.push(zeilen[j].slice(tiefer + 2));
        i = j;
      }
      const befehl = teile.join('\n').trim();
      if (befehl) schritte.push({ name, befehl });
      continue;
    }

    const mEin = z.match(/^\s*run:\s*(.+?)\s*$/);
    if (mEin) schritte.push({ name, befehl: mEin[1] });
  }
  return schritte;
}

/** Warum ein Schritt kein Tor ist — oder leer, wenn er eines ist. */
export function kleinGrund(befehl) {
  const k = KEINE_TORE.find((x) => befehl.includes(x));
  if (k) return `Vorbereitung bzw. die Suite selbst (${k})`;
  if (istActionsAusdruck(befehl)) return 'Actions-Ausdruck ${{ … }} — läuft nur in GitHub, und blockiert dort nie';
  return '';
}

/** Ist dieser Befehl ein Tor — oder Vorbereitung? */
export function istTor(befehl) {
  return kleinGrund(befehl) === '';
}

export function plan(text) {
  const alle = schritteLesen(text);
  if (!alle) return null;
  return {
    tore: alle.filter((s) => istTor(s.befehl)),
    uebersprungen: alle.filter((s) => !istTor(s.befehl))
      .map((s) => ({ ...s, grund: kleinGrund(s.befehl) })),
  };
}

function main() {
  const text = readFileSync(WORKFLOW, 'utf8');
  const p = plan(text);
  if (!p) {
    // Nicht messen ist kein Bestehen — dieselbe Regel wie in kontext.mjs.
    console.error('⛔ Der Job `tests` steht nicht in .github/workflows/pr-check.yml.');
    process.exit(1);
  }
  if (!p.tore.length) {
    console.error('⛔ Kein einziges Tor gefunden — der Parser trifft sein Subjekt nicht.');
    process.exit(1);
  }

  console.log(`── Tore des PR-Checks ───────────────────────────`);
  console.log(`Abgeleitet aus     : .github/workflows/pr-check.yml`);
  console.log(`Tore               : ${p.tore.length}`);
  for (const s of p.uebersprungen) {
    console.log(`übersprungen       : ${s.name || s.befehl.split('\n')[0]}`);
    console.log(`                     ${s.grund}`);
  }
  console.log(`─────────────────────────────────────────────────`);

  if (process.argv.includes('--liste')) {
    for (const [i, s] of p.tore.entries()) {
      console.log(`${String(i + 1).padStart(2)}. ${s.befehl.split('\n').join('\n    ')}`);
    }
    return;
  }

  // Die sechs gepipten Tore schreiben nach $GITHUB_STEP_SUMMARY. Ohne die
  // Variable liefe `tee -a ""` auf einen Fehler, und das Tor waere aus dem
  // falschen Grund rot.
  const summary = join(mkdtempSync(join(tmpdir(), 'eb-tore-')), 'summary.md');
  const umgebung = { ...process.env, GITHUB_STEP_SUMMARY: summary };

  // ── NICHT JEDES TOR IST NUR EIN PRÜFER ─────────────────────────────
  //
  // Der Auftragsstrom-Schritt lautet `node scripts/auftragsstrom.mjs &&
  // … --check`: er ERZEUGT erst und prüft dann. In CI ist der Baum
  // wegwerfbar, lokal bleibt danach eine geänderte Datei stehen.
  //
  // Vor `npm run gate` hat diesen Schritt lokal niemand gefahren. Jetzt
  // fährt ihn jeder — und eine Datei, die sich beim Prüfen von selbst
  // ändert, sieht aus wie eine vergessene Änderung. Deshalb wird sie
  // benannt, statt sie zu verschweigen oder zurückzusetzen: was ein Tor
  // erzeugt, kann ein echter neuer Stand sein (genau das war es hier —
  // das committete Artefakt widersprach seiner eigenen Quelle).
  const baumStand = () => {
    const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    return r.status === 0 ? r.stdout : null;
  };
  const vorher = baumStand();

  const rot = [];
  for (const [i, s] of p.tore.entries()) {
    console.log(`\n▶ ${i + 1}/${p.tore.length}  ${s.name || s.befehl}`);
    console.log(`  ${s.befehl}`);
    const r = spawnSync('bash', ['-eo', 'pipefail', '-c', s.befehl], {
      cwd: ROOT, env: umgebung, stdio: 'inherit',
    });
    if (r.status !== 0) rot.push({ ...s, status: r.status });
  }

  console.log(`\n─────────────────────────────────────────────────`);

  // Was der Lauf selbst geschrieben hat — vor dem Ergebnis, denn bei rot
  // sucht man sonst am falschen Ende.
  const nachher = baumStand();
  if (vorher !== null && nachher !== null && vorher !== nachher) {
    const alt = new Set(vorher.split('\n').filter(Boolean));
    const neu = nachher.split('\n').filter(Boolean).filter((z) => !alt.has(z));
    if (neu.length) {
      console.log(`ℹ Der Lauf hat den Arbeitsbaum verändert — ein Tor erzeugt,`);
      console.log(`  bevor es prüft. Ansehen, nicht blind zurücksetzen:`);
      for (const z of neu) console.log(`    ${z.trim()}`);
      console.log(`─────────────────────────────────────────────────`);
    }
  }

  if (rot.length) {
    console.error(`⛔ ${rot.length} von ${p.tore.length} Toren rot:`);
    for (const s of rot) console.error(`   - ${s.name || s.befehl}  (Exit ${s.status})`);
    process.exit(1);
  }
  console.log(`✓ Alle ${p.tore.length} Tore grün. Die Suite läuft getrennt: npx playwright test`);
}

if (process.argv[1] && process.argv[1].endsWith('tore.mjs')) main();
