#!/usr/bin/env node
/**
 * pulse.mjs — Impuls-Strom des Brains messen und in den Vault schreiben.
 *
 * Erzeugt `vault/00-Kern/Impuls-Strom.md`: eine Notiz, die den LEBENDEN
 * Zustand des Systems zeigt statt einer Momentaufnahme von Hand —
 * Wissensfluss, Freigabe-Bilanz, Event-Abdeckung, Code-Bewegung.
 *
 * Die Notiz ist bewusst `share: internal`: sie beschreibt Interna und
 * darf nie in die Website-Wissensbasis fließen.
 *
 * Aufruf:
 *   node scripts/pulse.mjs           # messen + Notiz schreiben
 *   node scripts/pulse.mjs --print   # nur ausgeben, nichts schreiben
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = join(ROOT, 'vault');
const OUT = join(VAULT, '00-Kern', 'Impuls-Strom.md');
const PRINT_ONLY = process.argv.includes('--print');

const sh = (cmd, fallback = '') => {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return fallback; }
};

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/* ── 1) Vault-Schichtung & Freigabe-Bilanz ───────────────────────────── */
const notes = await walk(VAULT);
const layers = {}, shares = { public: 0, internal: 0, secret: 0, fehlt: 0 };
for (const file of notes) {
  const text = await readFile(file, 'utf8');
  const fm = text.startsWith('---\n') ? text.slice(4, Math.max(4, text.indexOf('\n---', 4))) : '';
  const layer = (fm.match(/^layer:\s*(\S+)/m) || [, '—'])[1];
  const share = (fm.match(/^share:\s*(\S+)/m) || [, ''])[1];
  layers[layer] = (layers[layer] || 0) + 1;
  if (share === 'public' || share === 'internal' || share === 'secret') shares[share]++;
  else shares.fehlt++;
}

/* ── 2) Wissensbasis (Impuls 5: was die Website-KI weiß) ─────────────── */
let kb = { entries: [] };
try { kb = JSON.parse(await readFile(join(ROOT, 'assets', 'eb-knowledge.json'), 'utf8')); } catch {}
const kbSources = [...new Set(kb.entries.map(e => e.source))];
const kbTopics = [...new Set(kb.entries.map(e => e.title))];

/* ── 3) Event-Abdeckung (die Vision: jede Art von Event) ─────────────── */
let eventCount = 0, eventGroups = 0;
try {
  const app = await readFile(join(ROOT, 'app.js'), 'utf8');
  const block = app.slice(app.indexOf('var EB_EVENT_UNIVERSE'), app.indexOf('/** Event-Typ aus Freitext'));
  eventCount = (block.match(/key:\s*'/g) || []).length;
  eventGroups = new Set(block.match(/group:\s*'[^']+'/g) || []).size;
} catch {}

/* ── 4) Code-Bewegung (Impuls 2+3: was zuletzt floss) ────────────────── */
const commits7 = +sh('git log --since="7 days ago" --oneline | wc -l', '0');
const commits30 = +sh('git log --since="30 days ago" --oneline | wc -l', '0');
const lastCommit = sh('git log -1 --pretty=format:"%h · %s" ', '—').slice(0, 100);
const lastDate = sh('git log -1 --date=short --pretty=format:%ad', '—');
const topFiles = sh('git log --since="30 days ago" --name-only --pretty=format: | grep -v "^$" | sort | uniq -c | sort -rn | head -5', '');

/* ── 5) Codegröße ───────────────────────────────────────────────────── */
const size = f => { try { return +sh(`wc -l < ${f}`, '0'); } catch { return 0; } };
const code = {
  'app.js': size('app.js'), 'styles.css': size('styles.css'),
  'functions.php': size('functions.php'), 'app-shell.html': size('app-shell.html')
};

const bar = (n, max, w = 22) => '█'.repeat(Math.max(0, Math.round((n / (max || 1)) * w))).padEnd(w, '·');
const maxLayer = Math.max(...Object.values(layers), 1);
const today = new Date().toISOString().slice(0, 10);

const md = `---
layer: L0
domain: kern
share: internal
tags: [layer/L0, domain/kern, share/internal, typ/messung]
---

# ⚡ Impuls-Strom — der lebende Zustand

> **Automatisch erzeugt** von \`scripts/pulse.mjs\` · Stand: **${today}**
> Nicht von Hand bearbeiten — jeder Lauf überschreibt die Datei.
> Diese Notiz misst, was im Netz tatsächlich fließt. Die Ströme selbst
> sind in [[00-Kern/Wissensstroeme]] beschrieben.

## 🧠 Schichtung des Brains

| Ebene | Notizen | Verteilung |
|-------|---------|------------|
${['L0', 'L1', 'L2', 'L3', 'L4', 'L5'].map(l =>
  `| **${l}** | ${layers[l] || 0} | \`${bar(layers[l] || 0, maxLayer)}\` |`).join('\n')}

**Gesamt: ${notes.length} Notizen**

## 🔒 Freigabe-Bilanz (Impuls 5 + L4-Veto)

| Klasse | Notizen | Bedeutung |
|--------|---------|-----------|
| 🟢 \`public\` | **${shares.public}** | fließt zur Website-KI |
| 🟡 \`internal\` | ${shares.internal} | bleibt im Vault |
| 🔴 \`secret\` | ${shares.secret} | verlässt den Vault nie |
| ⚠️ fehlt | ${shares.fehlt} | ${shares.fehlt === 0 ? 'keine — sauber' : '**prüfen!** (gilt als nicht öffentlich)'} |

\`\`\`mermaid
graph LR
  V["🗄️ Vault<br/>${notes.length} Notizen"] -->|"${shares.public} public"| K["📦 Wissensbasis<br/>${kb.entries.length} Abschnitte"]
  V -->|"${shares.internal + shares.secret} intern/secret"| X["🔒 bleibt drin"]
  K --> W["🌐 KI-Bot · Board · EB Circle"]
  W -.->|"Wissenslücke"| V
  classDef ok fill:#22c55e,stroke:#16a34a,color:#fff
  classDef block fill:#ef4444,stroke:#dc2626,color:#fff
  classDef sys fill:#3b82f6,stroke:#2563eb,color:#fff
  class K,W ok
  class X block
  class V sys
\`\`\`

## 📚 Was die Website-KI weiß

- **${kb.entries.length} Abschnitte** aus **${kbSources.length} Notizen**
- Themen: ${kbTopics.map(t => `\`${t}\``).join(' · ') || '—'}
- Quellordner: ${[...new Set(kbSources.map(s => s.split('/').slice(0, 2).join('/')))].join(', ') || '—'}

## 🎉 Event-Abdeckung

**${eventCount} Event-Typen** in **${eventGroups} Gruppen** — von der Hochzeit
bis zum Tabletop-Abend. Die Vision „jede Art von Event" misst sich hier.

## 🔁 Bewegung im Code

| Kennzahl | Wert |
|----------|------|
| Commits (7 Tage) | **${commits7}** |
| Commits (30 Tage) | ${commits30} |
| Letzter Commit | \`${lastCommit}\` (${lastDate}) |

**Meistbewegte Dateien (30 Tage):**
\`\`\`
${topFiles || '—'}
\`\`\`

**Codegröße:**
${Object.entries(code).map(([f, n]) => `- \`${f}\` — ${n.toLocaleString('de-DE')} Zeilen`).join('\n')}

## Verwandt
- [[00-Kern/Wissensstroeme]] — die sechs Impulse
- [[00-Kern/Synergie-Pipeline]] — der Weg zur Website
- [[00-Kern/Sicherheits-Klassifikation]] — warum ${shares.secret} Notizen nie hinausgehen
- [[00-Kern/Neural-Map]] — dasselbe Netz visuell
`;

if (PRINT_ONLY) {
  console.log(md);
} else {
  await writeFile(OUT, md, 'utf8');
  console.log(`✓ ${relative(ROOT, OUT)} aktualisiert`);
}
console.log(`  Notizen ${notes.length} · public ${shares.public} · KB ${kb.entries.length} Abschnitte · Events ${eventCount} · Commits/7T ${commits7}`);
if (shares.fehlt > 0) {
  console.error(`⚠️  ${shares.fehlt} Notiz(en) ohne share-Feld — gelten als nicht öffentlich, sollten aber gesetzt werden.`);
}
