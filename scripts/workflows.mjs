#!/usr/bin/env node
/**
 * workflows.mjs — führt GitHub wirklich aus, was es als „active" anzeigt?
 *
 * DIE FEHLERKLASSE. GitHub registriert einen Workflow, sobald seine Datei auf
 * IRGENDEINEM Zweig einmal gepusht wurde. Wird dieser Zweig nie gemergt oder
 * die Datei später gelöscht, bleibt der Eintrag trotzdem stehen: `state:
 * active`, ein Link auf `blob/main/…`, der ins Leere zeigt, und keine einzige
 * Ausführung. Nichts an der Oberfläche sagt, dass er tot ist.
 *
 * Bei Eventbörse betraf das vier Workflows, zwei davon Sicherheits-Workflows:
 *
 *   Security – CodeQL Analyse          registriert 05.05.2026, nie gelaufen
 *   Security – Secret Scan (Gitleaks)  registriert 05.05.2026, 2 Läufe am
 *                                      Tag der Registrierung, danach nie
 *   E2E Smoke (Playwright)             registriert 22.07.2026
 *   Smoke-Tests (Playwright)           registriert 30.07.2026
 *
 * Vier Monate lang stand im Repository ein Secret-Scanner, der nie gesucht
 * hat. Ein abgeschalteter Schutz ist gefährlicher als ein fehlender: den
 * fehlenden vermisst man.
 *
 *   node scripts/workflows.mjs           Bericht
 *   node scripts/workflows.mjs --check   Tor: Exit 1 bei einem Phantom
 *
 * Braucht ein Token (GH_TOKEN oder GITHUB_TOKEN) und Netz — die Liste, um die
 * es geht, liegt bei GitHub und nirgends sonst. Ohne Token wird NICHT still
 * durchgewunken: ein Tor, das sein Subjekt nicht findet, ist kein bestandener
 * Test.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Workflows, die es bewusst nicht mehr gibt.
 *
 * Ein Phantom verschwindet nicht dadurch, dass man es kennt — GitHub bietet
 * keinen Weg, einen registrierten Workflow ohne Datei zu löschen. Also wird
 * er hier benannt, mit Grund. Der Unterschied zwischen „vergessen" und
 * „abgeschafft" ist genau diese Zeile.
 */
export const STILLGELEGT = {
  'security-secret-scan.yml':
    'ersetzt durch scripts/geheimnisse.mjs (pr-check + tagesroutine). Die alte '
    + 'Fassung hing an gitleaks/gitleaks-action@v2 — eine fremde Action im '
    + 'Sicherheits-Workflow, die security.yml aus Lieferkettengründen meidet.',
  'e2e.yml':
    'aufgegangen in pr-check.yml, das die vollständige Playwright-Suite fährt '
    + 'und PRs blockiert. Ein zweiter, kleinerer Lauf sagte nichts Zusätzliches.',
  'smoke-tests.yml':
    'aufgegangen in pr-check.yml (npm run test:smoke ist Teil der Suite).',
};

/** Welche Workflow-Dateien liegen wirklich hier? */
export function dateienImRepo(wurzel = ROOT) {
  return new Set(
    readdirSync(join(wurzel, '.github', 'workflows'))
      .filter((d) => /\.ya?ml$/.test(d)),
  );
}

/**
 * Vergleicht GitHubs Liste mit den Dateien.
 *
 * `registriert` ist die API-Antwort (Feld `workflows`). Getrennt von der
 * Netzabfrage, damit es ohne Netz prüfbar bleibt — die Regel ist das, was
 * schiefgehen kann, nicht der HTTP-Aufruf.
 */
export function vergleiche(registriert, dateien) {
  const phantome = [];
  const stillgelegt = [];
  for (const w of registriert) {
    // `dynamic/…` sind GitHub-eigene Einträge (Copilot, Pages). Sie haben
    // nie eine Datei im Repo und sind kein Befund.
    if (!w.path || !w.path.startsWith('.github/workflows/')) continue;
    const name = w.path.slice('.github/workflows/'.length);
    if (dateien.has(name)) continue;
    (STILLGELEGT[name] ? stillgelegt : phantome).push({
      name, anzeige: w.name, grund: STILLGELEGT[name] || null,
    });
  }
  // Der umgekehrte Fall: eine Datei, die GitHub (noch) nicht kennt. Das ist
  // normal für einen brandneuen Workflow auf einem Zweig und deshalb kein
  // Fehler — nur eine Notiz.
  const unbekannt = [...dateien].filter(
    (d) => !registriert.some((w) => w.path === `.github/workflows/${d}`),
  );
  return { phantome, stillgelegt, unbekannt };
}

async function hole() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { fehler: 'kein Token (GH_TOKEN / GITHUB_TOKEN)' };
  let nwo = process.env.GITHUB_REPOSITORY;
  if (!nwo) {
    try {
      const url = execFileSync('git', ['remote', 'get-url', 'origin'],
        { cwd: ROOT, encoding: 'utf8' }).trim();
      nwo = url.replace(/\.git$/, '').split(/[:/]/).slice(-2).join('/');
    } catch { return { fehler: 'kein Repository bestimmbar' }; }
  }
  try {
    const r = await fetch(`https://api.github.com/repos/${nwo}/actions/workflows?per_page=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return { fehler: `GitHub antwortet ${r.status}` };
    const d = await r.json();
    return { workflows: d.workflows || [] };
  } catch (e) {
    return { fehler: `Abruf fehlgeschlagen: ${e.message}` };
  }
}

// Nur ausführen, wenn direkt aufgerufen — die Tests importieren `vergleiche`.
if (process.argv[1] && process.argv[1].endsWith('workflows.mjs')) {
  const tor = process.argv.includes('--check');
  console.log('── Registrierte Workflows gegen Dateien ──────────');

  const antwort = await hole();
  if (antwort.fehler) {
    // Nicht still durchwinken. Ohne Liste ist nichts geprüft, und das muss
    // anders aussehen als „alles in Ordnung".
    console.log(`⚠  Nicht geprüft: ${antwort.fehler}`);
    console.log('─────────────────────────────────────────────────');
    process.exit(tor ? 1 : 0);
  }

  const { phantome, stillgelegt, unbekannt } = vergleiche(antwort.workflows, dateienImRepo());
  console.log(`Registriert         : ${antwort.workflows.length}`);
  console.log(`Stillgelegt (bekannt): ${stillgelegt.length}`);
  console.log(`Noch nicht bei GitHub: ${unbekannt.length}`);

  for (const s of stillgelegt) console.log(`  ○ ${s.anzeige} — ${s.grund}`);
  for (const u of unbekannt) console.log(`  + ${u} (neu, noch nie gepusht)`);

  if (phantome.length) {
    console.log('');
    for (const p of phantome) {
      console.log(`  ⛔ „${p.anzeige}" (${p.name})`);
      console.log('     GitHub führt ihn als aktiv — die Datei liegt nirgends.');
    }
    console.log('');
    console.log('Entweder die Datei fehlt (dann zurückholen) oder der Workflow');
    console.log('ist abgeschafft (dann in STILLGELEGT eintragen, mit Grund).');
    console.log('─────────────────────────────────────────────────');
    process.exit(tor ? 1 : 0);
  }

  console.log('✓ Kein Phantom — jeder aktive Workflow hat seine Datei.');
  console.log('─────────────────────────────────────────────────');
}
