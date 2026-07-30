#!/usr/bin/env node
/**
 * Eventbörse — Proposal-Generator
 *
 * Nimmt die Findings aus audit/latest.json und produziert daraus eine
 * konkrete, verwertbare Vorschlagsliste in audit/proposals.json.
 *
 * Jeder Vorschlag hat einen Status, den das HQ zum Approve/Reject rendert:
 *   - status: "ready"      → Es gibt einen konkreten Patch, kann per PR gemergt werden
 *   - status: "manual"     → Fix erfordert menschliche Entscheidung
 *   - status: "wontfix"    → Bewusst offen gelassen (mit Grund)
 *
 * Kein LLM-Aufruf, keine Netzwerkzugriffe, deterministisch — läuft in CI.
 *
 * Aufruf:
 *   node scripts/propose-fixes.mjs           # schreibt audit/proposals.json
 *   node scripts/propose-fixes.mjs --print   # zusätzlich JSON auf stdout
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const rel = (p) => path.relative(ROOT, p);

function loadAudit() {
  if (!exists('audit/latest.json')) {
    throw new Error('audit/latest.json fehlt — vorher `node scripts/self-audit.mjs` laufen lassen.');
  }
  return JSON.parse(read('audit/latest.json'));
}

// Katalog: Wie wird ein Finding zu einem konkreten Vorschlag?
// Erweiterbar — jeder neue Handler mappt eine Finding-ID auf einen Vorschlag.
const HANDLERS = {
  'no-tests': (f, ctx) => {
    const done = ctx.hasSmokeSuite;
    return {
      title: 'Playwright-Smoke-Suite für SPA-Regressionen',
      rationale:
        'Deckt den P0-Schutz gegen Listings-/Board-Regressionen ab. Läuft offline mit gemockten API-Antworten, kein Backend nötig.',
      files: ['tests/smoke.spec.js', 'playwright.config.js', 'package.json', '.github/workflows/smoke-tests.yml'],
      how: 'Playwright-Config + 3 Smoke-Tests + CI-Workflow angelegt. Erwartete Laufzeit < 30 s in Actions.',
      status: done ? 'ready' : 'manual',
      command: 'npm install && npx playwright install chromium && npm run test:smoke',
      risk: 'niedrig — Tests sind additiv, keine Änderung am Auslieferungscode.',
    };
  },
  'console-noise': (f) => {
    const count = (f.evidence && f.evidence.count) || 0;
    return {
      title: `${count} console.*-Aufrufe hinter EB_DEBUG-Flag stellen`,
      rationale:
        'Konsolen-Ausgaben landen im Browser der Nutzer. Ein Debug-Flag hält Prod-Konsolen sauber, ohne die Debug-Fähigkeit zu verlieren.',
      files: ['app.js'],
      how: 'Neue Hilfsfunktion `_dbg = () => (window.EB_DEBUG && console.log)` und schrittweise Ersatz der bestehenden Calls.',
      status: 'manual',
      risk: 'niedrig — reines Kosmetik-Refactor.',
    };
  },
  'size-app.js-watch': (f) => ({
    title: 'app.js schrittweise in Module aufteilen',
    rationale:
      'Monolith-Risiko wächst (>20k Zeilen). Splitting in Router/API/Board/Chat verbessert Wartbarkeit deutlich.',
    files: ['app.js', 'js/'],
    how: 'Ein Modul pro Sprint (z. B. zuerst `js/api.js` mit `_apiUrl`, `_apiHeaders`, `loadDbListings`).',
    status: 'manual',
    risk: 'mittel — Reihenfolge/Sichtbarkeit von globalen Vars muss beachtet werden.',
  }),
  'size-functions.php-watch': () => ({
    title: 'functions.php in Sub-Includes aufteilen',
    rationale: 'REST-Routen wachsen (>6k Zeilen). Grouping nach Feature (Auth, Listings, Payments) senkt Kognitionslast.',
    files: ['functions.php', 'includes/'],
    how: 'Weitere `includes/rest/*.php` extrahieren, in functions.php per require_once einbinden.',
    status: 'manual',
    risk: 'niedrig — Verhalten bleibt gleich, nur Datei-Layout ändert sich.',
  }),
  'size-styles.css-watch': () => ({
    title: 'styles.css sektionsweise dokumentieren',
    rationale: 'CSS-Monolith. Ein Section-Index oben in der Datei hilft, bevor Splitting nötig wird.',
    files: ['styles.css'],
    how: 'Kommentar-Kopf mit „Contents:" und Anker-Kommentaren pro Sektion.',
    status: 'manual',
    risk: 'kein Runtime-Impact.',
  }),
  'dsgvo-analytics-inert': () => ({
    title: 'analytics.php nach Deploy-Verifikation entfernen',
    rationale: 'Datei ist inert, kann sauber gelöscht werden.',
    files: ['analytics.php'],
    how: '`git rm analytics.php` in einem separaten chore-PR, nachdem Live-Traffic bestätigt hat, dass niemand mehr darauf zeigt.',
    status: 'manual',
    risk: 'niedrig — nur wenn wirklich niemand referenziert.',
  }),
  'route-admin-mod-missing': () => ({
    title: 'Admin-Moderationsrouten mit Vault abgleichen',
    rationale: 'Vault erwähnt Routen, die im Code fehlen — Drift zwischen Doku und Realität.',
    files: ['functions.php', 'vault/50-Evolution/Roadmap/Bekannte-Bugs.md'],
    how: 'Entweder Routen wiederherstellen oder Vault-Notiz aktualisieren.',
    status: 'manual',
    risk: 'niedrig, aber Vault muss mitgehen.',
  }),
  'index-html-drift': () => ({
    title: 'index.html neu aus app-shell.html bauen',
    rationale: 'Lokale Dev-Shell hängt hinterher.',
    files: ['index.html'],
    how: '`./build-index-html.sh` ausführen und commiten.',
    status: 'ready',
    command: './build-index-html.sh',
    risk: 'sehr niedrig — deterministischer Build.',
  }),
  'stale-bak-files': () => ({
    title: 'Backup-/Temp-Dateien aufräumen',
    rationale: 'Ungetrackte `.bak`/`.tmp`-Dateien im Working Tree.',
    files: ['.gitignore'],
    how: 'Entweder löschen oder pattern in `.gitignore` aufnehmen.',
    status: 'manual',
    risk: 'kein Impact auf Live-Site.',
  }),
  'open-todos': (f) => ({
    title: `${(f.evidence && f.evidence.count) || '?'} TODO/FIXME-Marker sichten`,
    rationale: 'Sammel-Notizen im Code, die noch nicht in die Roadmap überführt sind.',
    files: ['vault/50-Evolution/Roadmap/Bekannte-Bugs.md'],
    how: '`grep -rInE "TODO|FIXME" --include=*.js` durchgehen, je Zeile entscheiden: erledigen, streichen, oder als Bekannter-Bug festhalten.',
    status: 'manual',
    risk: 'kein Runtime-Impact.',
  }),
};

function detectContext() {
  return {
    hasSmokeSuite:
      exists('tests/smoke.spec.js') && exists('playwright.config.js') && exists('package.json'),
  };
}

function main() {
  const audit = loadAudit();
  const ctx = detectContext();
  const proposals = [];

  for (const f of audit.findings || []) {
    // OK-Findings sind kein Vorschlag — die Arbeit ist erledigt.
    if (f.severity === 'ok' && f.status === 'fixed') {
      proposals.push({
        id: `p-${f.id}`,
        source: f.id,
        title: f.title,
        rationale: f.detail || '',
        area: f.area || 'general',
        severity: 'ok',
        status: 'done',
        priority: 3,
      });
      continue;
    }

    const build = HANDLERS[f.id];
    if (!build) {
      // Unbekanntes Finding — sichtbar als „needs mapping".
      proposals.push({
        id: `p-${f.id}`,
        source: f.id,
        title: f.title,
        rationale: f.detail || '',
        area: f.area || 'general',
        severity: f.severity || 'info',
        status: 'unmapped',
        suggestion: f.suggestion || '',
        priority: severityPriority(f.severity),
      });
      continue;
    }

    const p = build(f, ctx) || {};
    proposals.push({
      id: `p-${f.id}`,
      source: f.id,
      title: p.title || f.title,
      rationale: p.rationale || f.detail || '',
      area: f.area || 'general',
      severity: f.severity || 'info',
      status: p.status || 'manual',
      files: p.files || [],
      how: p.how || '',
      command: p.command || null,
      risk: p.risk || '',
      priority: severityPriority(f.severity),
    });
  }

  proposals.sort((a, b) => a.priority - b.priority);

  const counts = {
    total: proposals.length,
    ready: proposals.filter((p) => p.status === 'ready').length,
    manual: proposals.filter((p) => p.status === 'manual').length,
    unmapped: proposals.filter((p) => p.status === 'unmapped').length,
    done: proposals.filter((p) => p.status === 'done').length,
  };

  let head = null;
  try {
    head = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {}

  const result = {
    schema: 'eb-proposals/v1',
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    commit: head,
    auditCommit: audit.commit || null,
    counts,
    proposals,
  };

  const outDir = path.join(ROOT, 'audit');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'proposals.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(
    `✔ proposals: ${counts.total} (ready:${counts.ready} manual:${counts.manual} unmapped:${counts.unmapped} done:${counts.done}) → ${rel(outPath)}\n`,
  );
  if (process.argv.includes('--print')) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
}

function severityPriority(sev) {
  return { error: 0, warn: 1, info: 2, ok: 3 }[sev || 'info'] ?? 9;
}

main();
