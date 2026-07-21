#!/usr/bin/env node
/**
 * Eventbörse — Self-Audit
 *
 * Statische, schreibfreie Health-Checks über das Repo. Schreibt das Ergebnis
 * nach audit/latest.json — das HQ-Dashboard (hq.html) liest die Datei und
 * zeigt jedes Finding mit Status + Vorschlag. Approve/Ablehnen läuft über
 * GitHub: jeder Vorschlag wird vom KI-Worker als PR aufgemacht, der Nutzer
 * mergt oder schliesst ihn.
 *
 * Aufruf:
 *   node scripts/self-audit.mjs            # schreibt audit/latest.json
 *   node scripts/self-audit.mjs --print    # zusätzlich JSON auf stdout
 *
 * Keine externen Abhängigkeiten, läuft auf Node 18+.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rel = p => path.relative(ROOT, p);
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const lines = s => s.split(/\r?\n/).length;
const byteSize = p => fs.statSync(path.join(ROOT, p)).size;

const findings = [];
const add = (f) => findings.push({
  id: f.id,
  title: f.title,
  area: f.area || 'general',
  severity: f.severity || 'info',   // ok | info | warn | error
  status: f.status || 'open',       // open | review | fixed
  detail: f.detail || '',
  suggestion: f.suggestion || '',
  evidence: f.evidence || null,
});

/* ─── 1. DSGVO: analytics.php muss inerte No-Op sein ─────────────── */
try {
  const src = read('analytics.php');
  const writesIP = /\$_SERVER\[.REMOTE_ADDR.\]|file_put_contents|fopen|fwrite/.test(src);
  const declaredInert = /DEAKTIVIERT|inerte? No-?Op|return;\s*$/i.test(src);
  if (writesIP) add({
    id: 'dsgvo-analytics-active',
    title: 'analytics.php verarbeitet wieder personenbezogene Daten',
    area: 'security',
    severity: 'error',
    detail: 'Datei enthält wieder IP-/Logging-Aufrufe. Verstösst gegen Datenschutzerklärung.',
    suggestion: 'analytics.php auf No-Op zurücksetzen oder Datei komplett löschen.',
  }); else if (declaredInert) add({
    id: 'dsgvo-analytics-inert',
    title: 'analytics.php ist inert (kein Tracking)',
    area: 'security',
    severity: 'ok',
    status: 'fixed',
    detail: 'Keine Verarbeitung personenbezogener Daten — kann nach Deploy-Verifikation gelöscht werden.',
    suggestion: 'Datei nach Live-Verifikation entfernen (chore-PR).',
  });
} catch { /* file gone is fine */ }

/* ─── 2. WordPress REST-Routen zählen + mit Vault abgleichen ─────── */
try {
  const fns = read('functions.php');
  const routes = (fns.match(/register_rest_route\s*\(/g) || []).length;
  const ctx = exists('vault/AI-Gedaechtnis/Claude-Kontext.md') ? read('vault/AI-Gedaechtnis/Claude-Kontext.md') : '';
  const m = ctx.match(/\((\d+)\s*Route-Registrierungen/);
  const documented = m ? parseInt(m[1], 10) : null;
  if (documented !== null && documented !== routes) add({
    id: 'docs-routes-drift',
    title: `Vault-Doku zählt ${documented} REST-Routen, Code hat ${routes}`,
    area: 'docs',
    severity: 'info',
    detail: 'vault/AI-Gedaechtnis/Claude-Kontext.md weicht von functions.php ab.',
    suggestion: `In Claude-Kontext.md auf „${routes} Route-Registrierungen" aktualisieren.`,
    evidence: { documented, actual: routes },
  });
  // 3. Vault erwähnt Admin-Moderationsrouten in der OFFEN-Sektion, die im Code fehlen.
  //    Historische Erwähnungen unter "## Behoben" sind absichtlich als Erinnerung an
  //    den früheren Bug drin — die dürfen kein neues Warning triggern.
  if (!/admin\/listings|my-listing-moderation/.test(fns)) {
    const bugs = exists('vault/Roadmap/Bekannte-Bugs.md') ? read('vault/Roadmap/Bekannte-Bugs.md') : '';
    const openSection = bugs.split(/^##\s+Behoben/mi)[0]; // nur der offene Teil
    if (/admin\/listings|my-listing-moderation/.test(openSection)) add({
      id: 'route-admin-mod-missing',
      title: 'Admin-Moderationsrouten im Vault dokumentiert, aber nicht im Code',
      area: 'backend',
      severity: 'warn',
      detail: '`/admin/listings/{id}/hide` und `/my-listing-moderation` werden im Vault erwähnt, fehlen aber in functions.php.',
      suggestion: 'Entweder die Routen wiederherstellen oder die Vault-Notiz korrigieren.',
    });
  }
} catch {}

/* ─── 4. Datei-Stack-Size Warnungen ──────────────────────────────── */
const sizeCheck = (file, warnLines, errLines) => {
  if (!exists(file)) return;
  const n = lines(read(file));
  if (n >= errLines) add({
    id: `size-${file}`,
    title: `${file} ist mit ${n} Zeilen sehr gross`,
    area: 'maintainability',
    severity: 'warn',
    detail: 'Monolith — Splitting in Module würde Lesbarkeit und Hot-Reload deutlich verbessern.',
    suggestion: 'Inkrementell Module rausziehen (z. B. router, api, board, chat). Nicht in einem Schritt.',
    evidence: { lines: n, threshold: errLines },
  });
  else if (n >= warnLines) add({
    id: `size-${file}-watch`,
    title: `${file} wächst (${n} Zeilen)`,
    area: 'maintainability',
    severity: 'info',
    detail: 'Wachsendes Monolith-Risiko, noch nicht kritisch.',
    suggestion: 'Beim nächsten Feature prüfen, ob ein Teil als Modul ausgelagert werden kann.',
    evidence: { lines: n, threshold: warnLines },
  });
};
sizeCheck('app.js', 20000, 30000);
sizeCheck('functions.php', 6000, 10000);
sizeCheck('styles.css', 12000, 20000);

/* ─── 5. console.* in Produktions-JS ─────────────────────────────── */
try {
  const js = read('app.js');
  const consoleCalls = (js.match(/console\.(log|warn|debug|info)\(/g) || []).length;
  if (consoleCalls > 0) add({
    id: 'console-noise',
    title: `${consoleCalls} console.*-Aufrufe in app.js`,
    area: 'cleanup',
    severity: consoleCalls > 50 ? 'warn' : 'info',
    detail: 'Aufrufe landen in der Browser-Konsole der Nutzer. Für Production wäre ein Debug-Flag sauberer.',
    suggestion: 'Kosmetik: console-Aufrufe hinter einen `EB_DEBUG`-Flag stellen oder in production strippen.',
    evidence: { count: consoleCalls },
  });
} catch {}

/* ─── 6. TODO / FIXME Marker ─────────────────────────────────────── */
try {
  const out = execSync('grep -rInE "TODO|FIXME|HACK|XXX" --include=*.js --include=*.php --include=*.html --include=*.css . 2>/dev/null || true', { cwd: ROOT }).toString();
  const todos = out.trim() ? out.trim().split('\n').length : 0;
  if (todos > 0) add({
    id: 'open-todos',
    title: `${todos} offene TODO/FIXME-Marker im Code`,
    area: 'cleanup',
    severity: 'info',
    detail: 'Sammlung an Notizen, die noch nicht in Bekannte-Bugs.md überführt wurden.',
    suggestion: 'Beim nächsten Sweep abklären: erledigt → entfernen, sonst in vault/Roadmap/Bekannte-Bugs.md überführen.',
    evidence: { count: todos },
  });
} catch {}

/* ─── 7. Automatisierte Tests vorhanden? ─────────────────────────── */
const hasTests = ['tests', 'test', '__tests__'].some(d => exists(d))
              || (exists('package.json') && /"(jest|vitest|playwright|mocha|cypress)"/.test(read('package.json')));
if (!hasTests) add({
  id: 'no-tests',
  title: 'Keine automatisierten Tests im Repo',
  area: 'quality',
  severity: 'warn',
  detail: 'Bekannte Schwäche aus CLAUDE.md. Ein paar Smoke-Tests gegen die SPA wären schon viel wert.',
  suggestion: 'Playwright-Smoke-Suite für browse/detail/board/chat (regression-Schutz P0).',
});

/* ─── 8. Service Worker registriert? ─────────────────────────────── */
if (exists('sw.js')) {
  try {
    const sw = read('sw.js');
    if (!/self\.addEventListener\(['"]install/.test(sw)) add({
      id: 'sw-incomplete',
      title: 'Service Worker ohne install-Handler',
      area: 'pwa',
      severity: 'info',
      detail: 'sw.js existiert, aber install-Lifecycle scheint unvollständig.',
      suggestion: 'Optional — bei PWA-Push-Roadmap mit ausbauen.',
    });
  } catch {}
}

/* ─── 9. Index-Drift: index.html aus app-shell.html generiert? ───── */
try {
  if (exists('app-shell.html') && exists('index.html') && exists('build-index-html.sh')) {
    const shell = read('app-shell.html');
    const idx = read('index.html');
    if (!idx.includes(shell.slice(200, 800))) add({
      id: 'index-html-drift',
      title: 'index.html scheint nicht aus app-shell.html neu gebaut',
      area: 'build',
      severity: 'warn',
      detail: 'Lokale Dev-Shell weicht von der kanonischen app-shell.html ab.',
      suggestion: '`./build-index-html.sh` ausführen und commiten.',
    });
  }
} catch {}

/* ─── 10. Git-Hygiene: ungetrackte Bak-Dateien? ──────────────────── */
try {
  const out = execSync('git ls-files --others --exclude-standard 2>/dev/null || true', { cwd: ROOT }).toString().trim();
  const baks = out.split('\n').filter(l => /\.(bak|orig|tmp|old)$/.test(l));
  if (baks.length) add({
    id: 'stale-bak-files',
    title: `${baks.length} ungetrackte Backup-/Temp-Dateien im Working Tree`,
    area: 'cleanup',
    severity: 'info',
    detail: baks.slice(0, 5).join(', '),
    suggestion: 'Entweder löschen oder ins .gitignore aufnehmen.',
  });
} catch {}

/* ─── Meta + Output ──────────────────────────────────────────────── */
let head = null;
try { head = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}

const counts = {
  total: findings.length,
  error: findings.filter(f => f.severity === 'error').length,
  warn:  findings.filter(f => f.severity === 'warn').length,
  info:  findings.filter(f => f.severity === 'info').length,
  ok:    findings.filter(f => f.severity === 'ok').length,
};

const result = {
  schema: 'eb-self-audit/v1',
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  commit: head,
  counts,
  findings,
};

const outDir = path.join(ROOT, 'audit');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'latest.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(`✔ self-audit: ${counts.total} Findings (err:${counts.error} warn:${counts.warn} info:${counts.info} ok:${counts.ok}) → ${rel(outPath)}\n`);
if (process.argv.includes('--print')) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
