#!/usr/bin/env node
/**
 * Amtliche Rechtsquellen fuer die HQ-Rechtsablage beobachten.
 *
 * Das Skript aendert niemals einen Vertrag. Es erkennt nur, dass sich eine
 * amtliche Quelle seit der letzten menschlich akzeptierten Fassung geaendert
 * hat. Erst nach fachlicher Pruefung darf `--accept <id>` die neue Fassung als
 * Baseline markieren.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = join(ROOT, 'assets', 'eb-rechtsquellen.json');

export const QUELLEN = [
  {
    id: 'bgb-356a',
    titel: '§ 356a BGB – elektronische Widerrufsfunktion',
    url: 'https://www.gesetze-im-internet.de/bgb/__356a.html',
    dokumente: ['B04', 'B09', 'B10'],
  },
  {
    id: 'ai-2026-1744',
    titel: 'VO (EU) 2026/1744 – AI-Act-Übergangsregeln',
    url: 'https://eur-lex.europa.eu/eli/reg/2026/1744/oj?locale=de',
    dokumente: ['09', '13', '14', 'B02', 'B11', 'B13', 'C01', 'C07'],
  },
  {
    id: 'bfsg-3',
    titel: '§ 3 BFSG – Barrierefreiheit und Kleinstunternehmen',
    url: 'https://www.gesetze-im-internet.de/bfsg/__3.html',
    dokumente: ['14', 'B18'],
  },
  {
    id: 'tdddg-25',
    titel: '§ 25 TDDDG – Schutz der Endeinrichtung',
    // Die amtliche Sammlung fuehrt das umbenannte TDDDG weiterhin unter dem
    // historischen Verzeichnisnamen `ttdsg`.
    url: 'https://www.gesetze-im-internet.de/ttdsg/__25.html',
    dokumente: ['B02', 'B03', 'C01'],
  },
  {
    id: 'dsa',
    titel: 'VO (EU) 2022/2065 – Digital Services Act',
    url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=de',
    dokumente: ['13', '14', 'B11', 'B14', 'B15', 'B16'],
  },
  {
    id: 'p2b',
    titel: 'VO (EU) 2019/1150 – P2B-Verordnung',
    url: 'https://eur-lex.europa.eu/eli/reg/2019/1150/oj?locale=de',
    dokumente: ['13', '14', 'B06', 'B08', 'B17'],
  },
  {
    id: 'gmbhg-5a',
    titel: '§ 5a GmbHG – Unternehmergesellschaft',
    url: 'https://www.gesetze-im-internet.de/gmbhg/__5a.html',
    dokumente: ['01', '06', '10', '11'],
  },
  {
    id: 'ddg-5',
    titel: '§ 5 DDG – Allgemeine Informationspflichten',
    url: 'https://www.gesetze-im-internet.de/ddg/__5.html',
    dokumente: ['B01', 'B10'],
  },
];

function zustandLesen() {
  try {
    const roh = JSON.parse(readFileSync(ZIEL, 'utf8'));
    return roh && Array.isArray(roh.quellen) ? roh : { version: 1, quellen: [] };
  } catch {
    return { version: 1, quellen: [] };
  }
}

function textNormalisieren(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(text) {
  return createHash('sha256').update(text).digest('hex');
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function pruefen(zustand) {
  const ids = new Set();
  const fehler = [];
  for (const q of zustand.quellen || []) {
    const definition = QUELLEN.find((x) => x.id === q.id);
    if (!definition) fehler.push(`Unbekannte Quelle: ${q.id}`);
    if (ids.has(q.id)) fehler.push(`Doppelte Quelle: ${q.id}`);
    ids.add(q.id);
    if (!/^https:\/\/(www\.gesetze-im-internet\.de|eur-lex\.europa\.eu)\//.test(q.url || '')) {
      fehler.push(`Nicht-amtliche Adresse: ${q.id}`);
    }
    if (definition) {
      for (const feld of ['titel', 'url']) {
        if (q[feld] !== definition[feld]) fehler.push(`${q.id}: ${feld} weicht von der Monitor-Definition ab`);
      }
      if (JSON.stringify(q.dokumente || []) !== JSON.stringify(definition.dokumente)) {
        fehler.push(`${q.id}: betroffene Dokumente weichen von der Monitor-Definition ab`);
      }
    }
    for (const feld of ['akzeptierterHash', 'aktuellerHash']) {
      if (!/^[a-f0-9]{64}$/.test(q[feld] || '')) fehler.push(`${q.id}: ${feld} fehlt`);
    }
    if (!['aktuell', 'pruefung', 'nicht_erreichbar'].includes(q.status)) fehler.push(`${q.id}: unbekannter Status ${q.status}`);
    if (q.status === 'aktuell' && q.akzeptierterHash !== q.aktuellerHash) fehler.push(`${q.id}: als aktuell markiert, aber Hashes unterscheiden sich`);
    if (q.status === 'pruefung' && q.akzeptierterHash === q.aktuellerHash) fehler.push(`${q.id}: Pruefauftrag ohne erkannte Aenderung`);
  }
  for (const q of QUELLEN) if (!ids.has(q.id)) fehler.push(`Quelle fehlt: ${q.id}`);
  return fehler;
}

async function abrufen(def) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(def.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Eventboerse-Rechtsmonitor/1.0 (+https://eventbörse.de)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = textNormalisieren(await res.text());
    if (text.length < 300) throw new Error('amtliche Seite enthielt zu wenig Text');
    return hash(text);
  } finally {
    clearTimeout(timer);
  }
}

async function aktualisieren({ bootstrap = false } = {}) {
  const alt = zustandLesen();
  const nachId = new Map((alt.quellen || []).map((q) => [q.id, q]));
  const quellen = [];

  for (const def of QUELLEN) {
    const vorher = nachId.get(def.id) || {};
    try {
      const aktuell = await abrufen(def);
      const akzeptiert = vorher.akzeptierterHash || (bootstrap ? aktuell : '');
      quellen.push({
        ...def,
        akzeptierterHash: akzeptiert,
        aktuellerHash: aktuell,
        status: akzeptiert === aktuell ? 'aktuell' : 'pruefung',
      });
    } catch (error) {
      quellen.push({
        ...def,
        akzeptierterHash: vorher.akzeptierterHash || '',
        aktuellerHash: vorher.aktuellerHash || '',
        status: 'nicht_erreichbar',
        fehler: String(error && error.message ? error.message : error).slice(0, 180),
      });
    }
  }

  const neu = { version: 1, geprueftAm: heute(), quellen };
  writeFileSync(ZIEL, JSON.stringify(neu, null, 2) + '\n');
  const offen = quellen.filter((q) => q.status !== 'aktuell');
  console.log(`✓ ${quellen.length} amtliche Rechtsquellen geprüft · ${offen.length} benötigen Aufmerksamkeit.`);
  if (offen.length) console.log(offen.map((q) => `  - ${q.id}: ${q.status}`).join('\n'));
}

function akzeptieren(id) {
  const zustand = zustandLesen();
  const q = zustand.quellen.find((x) => x.id === id);
  if (!q || !/^[a-f0-9]{64}$/.test(q.aktuellerHash || '')) {
    throw new Error(`Keine geprüfte aktuelle Fassung für ${id}.`);
  }
  q.akzeptierterHash = q.aktuellerHash;
  q.status = 'aktuell';
  delete q.fehler;
  zustand.geprueftAm = heute();
  writeFileSync(ZIEL, JSON.stringify(zustand, null, 2) + '\n');
  console.log(`✓ ${id} als fachlich geprüft markiert.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const fehler = pruefen(zustandLesen());
    if (fehler.length) {
      console.error('⛔ Rechtsquellen-Katalog:\n' + fehler.map((x) => `  - ${x}`).join('\n'));
      process.exit(1);
    }
    console.log('✓ Rechtsquellen-Katalog vollständig und ausschließlich amtlich.');
    return;
  }
  const acceptAt = args.indexOf('--accept');
  if (acceptAt !== -1) {
    akzeptieren(args[acceptAt + 1]);
    return;
  }
  await aktualisieren({ bootstrap: args.includes('--bootstrap') });
}

if (process.argv[1] && process.argv[1].endsWith('rechtsquellen.mjs')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
