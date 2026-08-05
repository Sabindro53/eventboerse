#!/usr/bin/env node
/**
 * lage.mjs — der Kontext für den Lagemelder.
 *
 * Sammelt den Betriebszustand aus den erzeugten Dateien. Bewusst ein eigenes
 * Skript statt einer Kette in der Workflow-Datei: dort ist Zitieren fehleranfällig,
 * und der Lagebericht ist genau die Stelle, an der eine kaputte Zeile unbemerkt
 * zu einem leeren Kontext führen würde.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lies = async (p) => { try { return JSON.parse(await readFile(join(ROOT, p), 'utf8')); } catch { return null; } };

const audit = await lies('audit/latest.json');
const feed  = await lies('assets/eb-demo-feed.json');
const kb    = await lies('assets/eb-knowledge.json');
const conn  = await lies('assets/eb-connectors.json');

const zeilen = [`Stand: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, ''];

if (audit) {
  const c = audit.counts || {};
  zeilen.push(`Selbstcheck (${audit.generatedAt ? audit.generatedAt.slice(0, 10) : '?'}): `
    + `${(audit.findings || []).length} Befunde — ${c.error || 0} Fehler, ${c.warn || 0} Warnungen.`);
  for (const f of (audit.findings || []).slice(0, 6)) zeilen.push(`  [${f.severity}] ${f.title}`);
} else zeilen.push('Selbstcheck: keine Datei gefunden.');

if (feed) {
  const t = feed.posts.map((p) => p.tageZurueck);
  zeilen.push('', `Demo-Feed: ${feed.posts.length} Beiträge, ${Math.min(...t)}–${Math.max(...t)} Tage zurück.`);
}
if (kb) zeilen.push(`Wissensbasis: ${(kb.entries || []).length} Abschnitte, Stand ${kb.generated}.`);
if (conn) {
  const mit = conn.connectors.filter((c) => c.methodeAktiv).length;
  zeilen.push(`Connectors: ${conn.connectors.length} im Katalog, ${mit} eingerichtet.`);
}

console.log(zeilen.join('\n'));
