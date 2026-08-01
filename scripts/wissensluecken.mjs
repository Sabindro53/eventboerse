#!/usr/bin/env node
/**
 * wissensluecken.mjs — Impuls 6: aus echten Fragen werden neue Notizen.
 *
 * Die Bots merken sich Fragen, auf die sie keine Antwort hatten
 * (`eb_kb_misses`). Diese Liste liegt bewusst NUR im Browser des Nutzers —
 * Suchbegriffe wandern nicht an unseren Server. Damit das Netz trotzdem an
 * echten Fragen lernt, exportiert der EB Circle im HQ die Liste als Datei,
 * und dieses Skript macht daraus eine Aufgabenliste im Vault.
 *
 * Der Kreis schließt sich also über einen Menschen. Das ist langsamer als
 * eine automatische Übertragung — und der Grund, warum niemand mitliest.
 *
 * Nutzung:
 *   node scripts/wissensluecken.mjs --datei eb-wissensluecken-2026-08-01.json
 *   node scripts/wissensluecken.mjs --datei … --trocken   # nur anzeigen
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEHEIMNISSE, ersterTreffer } from './lib/verbotsmuster.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = join(ROOT, 'vault', '50-Evolution', 'AI-Gedaechtnis', 'Wissensluecken.md');

const argv = process.argv.slice(2);
const wert = (f) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const TROCKEN = argv.includes('--trocken');
const DATEI = wert('--datei');

if (!DATEI) {
  console.error('Nutzung: node scripts/wissensluecken.mjs --datei <export.json> [--trocken]');
  process.exit(2);
}

let roh;
try {
  roh = JSON.parse(await readFile(resolve(ROOT, DATEI), 'utf8'));
} catch (e) {
  console.error(`Export nicht lesbar: ${e.message}`);
  process.exit(1);
}

const fragen = Array.isArray(roh.fragen) ? roh.fragen : Array.isArray(roh) ? roh : [];
if (!fragen.length) {
  console.error('Der Export enthält keine Fragen.');
  process.exit(1);
}

// Zählen, normalisieren, säubern.
const zaehler = new Map();
let verworfen = 0;
for (const eintrag of fragen) {
  const frage = String((eintrag && eintrag.q) || eintrag || '').trim();
  if (frage.length < 3) continue;

  // Eine unbeantwortete Frage kann alles enthalten, was jemand eingetippt hat —
  // inklusive einer versehentlich hineinkopierten Zugangskennung. Solche
  // Einträge landen nicht im Repo.
  if (ersterTreffer(frage, GEHEIMNISSE)) { verworfen++; continue; }

  const schluessel = frage.toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
  zaehler.set(schluessel, (zaehler.get(schluessel) || 0) + 1);
}

const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const heute = new Date().toISOString().slice(0, 10);

const zeilen = sortiert.map(([frage, n]) =>
  `- [ ] **${frage}**${n > 1 ? ` — ${n}× gefragt` : ''}`);

const notiz = `---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, typ/aufgaben]
---

# Wissenslücken — Fragen ohne Antwort

> Erzeugt von \`scripts/wissensluecken.mjs\` am ${heute} aus einem HQ-Export
> vom ${roh.exportiert || 'unbekannt'}. Jede Zeile ist eine Frage, auf die
> QA-Bot oder Board-Assistent keine Antwort hatten.

Diese Liste ist **Rohmaterial**, keine Freigabe. Der Weg zu einer Antwort auf
der Website führt über eine eigene Notiz unter \`10-Produkt/Wissen/\`, die
bewusst auf \`share: public\` gehoben wird — mit eigenem Commit.
Siehe [[00-Kern/Sicherheits-Klassifikation]].

**Erhebung:** rein lokal im Browser (\`eb_kb_misses\`). Es wird nichts an den
Server übertragen; der Export geschieht von Hand über den EB Circle im HQ.

## Offene Fragen (${sortiert.length})

${zeilen.join('\n')}

## Verwandt
- [[00-Kern/Wissensstroeme]] — Impuls 6
- [[30-Betrieb/MCP-Architektur]] — §5, Feedback-Loop schließen
- [[00-Kern/Synergie-Pipeline]] — Vault → Website
`;

console.log('── Wissenslücken ────────────────────────────────');
console.log(`Export vom          : ${roh.exportiert || 'unbekannt'}`);
console.log(`Fragen im Export    : ${fragen.length}`);
console.log(`Verschieden         : ${sortiert.length}`);
if (verworfen) console.log(`Verworfen (Geheimnis-Muster): ${verworfen}`);
for (const [f, n] of sortiert.slice(0, 10)) console.log(`   • ${f}${n > 1 ? ` (${n}×)` : ''}`);
console.log('─────────────────────────────────────────────────');

if (TROCKEN) {
  console.log('(trocken — nichts geschrieben)');
} else {
  await mkdir(dirname(ZIEL), { recursive: true });
  await writeFile(ZIEL, notiz, 'utf8');
  console.log(`✓ ${relative(ROOT, ZIEL)} geschrieben — ${sortiert.length} offene Fragen.`);
}
