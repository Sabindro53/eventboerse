#!/usr/bin/env node
/**
 * build-knowledge.mjs — Vault → Website-Wissensbasis (Impuls 5).
 *
 * Liest alle Vault-Notizen, nimmt AUSSCHLIESSLICH `share: public` auf,
 * prüft jede aufgenommene Notiz zusätzlich gegen Verbotsmuster und
 * schreibt daraus `assets/eb-knowledge.json` — die Wissensbasis, die der
 * KI-Bot und der Board-Planungs-Assistent auf der Website befragen.
 *
 * Fail-Safe: fehlt `share`, gilt die Notiz als NICHT öffentlich.
 *
 * Nutzung:
 *   node scripts/build-knowledge.mjs            # bauen
 *   node scripts/build-knowledge.mjs --report   # bauen + Freigabe-Bilanz
 *   node scripts/build-knowledge.mjs --check    # nur prüfen (CI, schreibt nicht)
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = join(ROOT, 'vault');
const OUT = join(ROOT, 'assets', 'eb-knowledge.json');

const REPORT = process.argv.includes('--report');
const CHECK_ONLY = process.argv.includes('--check');

/** Harte Ausschlusskriterien — siehe vault/00-Kern/Sicherheits-Klassifikation.md */
const FORBIDDEN = [
  { re: /\bsk_(live|test)_[A-Za-z0-9]/i,        why: 'Stripe-Secret-Key-Muster' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,   why: 'Privater Schlüssel' },
  { re: /\b(api[_-]?key|apikey)\s*[:=]\s*\S+/i, why: 'API-Key-Zuweisung' },
  { re: /\bbearer\s+[A-Za-z0-9._-]{12,}/i,      why: 'Bearer-Token' },
  { re: /\b(passwor[dt]|secret)\s*[:=]\s*\S+/i, why: 'Passwort/Secret-Zuweisung' },
  { re: /\bwp-config\b/i,                       why: 'WordPress-Konfiguration' },
  { re: /\b\d{1,3}(\.\d{1,3}){3}\b/,            why: 'IP-Adresse' },
  { re: /\bsftp:\/\/|\bssh:\/\/|\bmysql:\/\//i, why: 'Infrastruktur-Zugang' },
  // E-Mail-Adressen, ausgenommen die offizielle Support-Adresse
  { re: /(?!kontakt@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, why: 'E-Mail-Adresse' },
];

/** Sehr einfache, abhängigkeitsfreie Frontmatter-Auswertung. */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n+/, '');
  const data = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    data[m[1]] = v;
  }
  return { data, body };
}

/** Markdown → gut lesbarer Klartext (für Bot-Antworten). */
function toPlain(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')            // Codeblöcke raus
    .replace(/^\|.*\|$/gm, ' ')                  // Tabellen raus
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')          // Überschriften-Marker
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, (_, t) => String(t).split('/').pop())
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')     // MD-Links
    .replace(/[*_`>]/g, '')
    .replace(/^\s*[-–]\s+/gm, '• ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Notiz in beantwortbare Abschnitte zerlegen (H2-Ebene). */
function toSections(body) {
  const out = [];
  const parts = body.split(/\n(?=##\s+)/);
  for (const part of parts) {
    const m = part.match(/^##\s+(.+)/);
    const heading = m ? m[1].trim() : '';
    const text = toPlain(m ? part.replace(/^##\s+.+/, '') : part);
    if (text.length < 40) continue;
    out.push({ heading, text: text.slice(0, 900) });
  }
  return out;
}

const STOP = new Set(['und','oder','der','die','das','den','dem','des','ein','eine','einen','einem','einer',
  'ist','sind','war','wird','werden','kann','können','soll','sollen','muss','müssen','für','mit','von','vom',
  'auf','aus','bei','nach','über','unter','zum','zur','zu','im','in','an','als','auch','nicht','nur','man',
  'sich','dich','dein','deine','du','wir','ihr','sie','es','wenn','dann','beim','durch','wie','was','wer','wo'
]);

function keywords(...texts) {
  const freq = new Map();
  for (const t of texts) {
    // ab 2 Zeichen, damit Fachbegriffe wie „dj" als Schlüsselwort erhalten bleiben
    for (const w of String(t).toLowerCase().match(/[a-zäöüß][a-zäöüß0-9-]{1,}/g) || []) {
      if (STOP.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(e => e[0]);
}

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

const files = await walk(VAULT);
const entries = [];
const rejected = [];

for (const file of files) {
  const rel = relative(VAULT, file).replace(/\\/g, '/');
  const text = await readFile(file, 'utf8');
  const { data, body } = parseFrontmatter(text);

  // Schloss 1 — Whitelist. Kein/anderes share ⇒ nicht öffentlich.
  if (data.share !== 'public') {
    rejected.push({ rel, reason: `share: ${data.share || '(fehlt)'}` });
    continue;
  }

  // Schloss 2 — Inhaltsscan.
  const hit = FORBIDDEN.find(f => f.re.test(body));
  if (hit) {
    rejected.push({ rel, reason: `Verbotsmuster: ${hit.why}` });
    continue;
  }

  const title = (body.match(/^#\s+(.+)/m) || [, rel.split('/').pop().replace(/\.md$/, '')])[1].trim();
  const sections = toSections(body);
  if (!sections.length) {
    rejected.push({ rel, reason: 'kein verwertbarer Abschnitt' });
    continue;
  }

  for (const [i, s] of sections.entries()) {
    entries.push({
      id: `${rel.replace(/\.md$/, '')}#${i}`,
      title,
      heading: s.heading,
      layer: data.layer || 'L1',
      domain: data.domain || 'produkt',
      source: rel,
      text: s.text,
      keys: keywords(title, s.heading, s.text),
    });
  }
}

const kb = {
  version: 1,
  generated: new Date().toISOString().slice(0, 10),
  note: 'Automatisch erzeugt aus vault/ (nur share:public). Nicht von Hand bearbeiten.',
  entries,
};

if (REPORT || CHECK_ONLY) {
  console.log('── Freigabe-Bilanz ──────────────────────────────');
  console.log(`Notizen gesamt      : ${files.length}`);
  console.log(`Aufgenommen (public): ${new Set(entries.map(e => e.source)).size} Notizen → ${entries.length} Abschnitte`);
  console.log(`Abgelehnt           : ${rejected.length}`);
  const byReason = {};
  for (const r of rejected) {
    const k = r.reason.startsWith('Verbotsmuster') ? r.reason : `share ≠ public (${r.reason})`;
    byReason[k] = (byReason[k] || 0) + 1;
  }
  for (const [k, v] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${k}: ${v}`);
  }
  const blocked = rejected.filter(r => r.reason.startsWith('Verbotsmuster'));
  if (blocked.length) {
    console.log('\n⚠️  public-Notizen mit Verbotsmuster (NICHT exportiert):');
    for (const b of blocked) console.log(`   ✗ ${b.rel} — ${b.reason}`);
  }
  console.log('─────────────────────────────────────────────────');
}

if (CHECK_ONLY) {
  const blocked = rejected.filter(r => r.reason.startsWith('Verbotsmuster'));
  process.exit(blocked.length ? 1 : 0);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(kb), 'utf8');
console.log(`✓ ${relative(ROOT, OUT)} geschrieben — ${entries.length} Abschnitte aus ${new Set(entries.map(e => e.source)).size} Notizen`);
