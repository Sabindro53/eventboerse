#!/usr/bin/env node
/**
 * Erzeugt den geschuetzten HQ-Katalog aus menschlichen Entscheidungen,
 * amtlichen Quellen und dem bereits vorhandenen Code-/Recht-Abgleich.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lageErheben, befunde } from './recht.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KATALOG_PFAD = join(ROOT, 'assets', 'eb-rechtsunterlagen-katalog.json');
const QUELLEN_PFAD = join(ROOT, 'assets', 'eb-rechtsquellen.json');
const ZIEL = join(ROOT, 'assets', 'eb-rechtsunterlagen.json');
const PHP_ZIEL = join(ROOT, 'assets', 'eb-rechtsunterlagen-data.php');
const ERLAUBTE_PERSONEN = new Set(['Sandro', 'Julian']);
const ERLAUBTER_BEDARF = new Set(['jetzt', 'vor_freigabe', 'anlage', 'archiv']);

function lesen(pfad) {
  return JSON.parse(readFileSync(pfad, 'utf8'));
}

function validieren(katalog, quellen) {
  const fehler = [];
  const ids = new Set();
  const dateien = new Set();
  for (const d of katalog.dokumente || []) {
    if (!d.id || ids.has(d.id)) fehler.push(`Dokument-ID fehlt/doppelt: ${d.id || '—'}`);
    if (!d.datei || dateien.has(d.datei)) fehler.push(`Dateiname fehlt/doppelt: ${d.datei || '—'}`);
    ids.add(d.id); dateien.add(d.datei);
    if (!ERLAUBTER_BEDARF.has(d.bedarf)) fehler.push(`${d.id}: unbekannter Bedarf ${d.bedarf}`);
    for (const p of d.verantwortlich || []) if (!ERLAUBTE_PERSONEN.has(p)) fehler.push(`${d.id}: unbekannte Person ${p}`);
    if (!d.aktion || d.aktion.length < 15) fehler.push(`${d.id}: keine klare Aktion`);
  }
  const taskIds = new Set();
  for (const a of katalog.aufgaben || []) {
    if (!a.id || taskIds.has(a.id)) fehler.push(`Aufgaben-ID fehlt/doppelt: ${a.id || '—'}`);
    taskIds.add(a.id);
    for (const p of a.verantwortlich || []) if (!ERLAUBTE_PERSONEN.has(p)) fehler.push(`${a.id}: unbekannte Person ${p}`);
    for (const id of a.dokumente || []) if (!ids.has(id)) fehler.push(`${a.id}: unbekanntes Dokument ${id}`);
  }
  for (const q of quellen.quellen || []) {
    for (const id of q.dokumente || []) if (!ids.has(id)) fehler.push(`${q.id}: unbekanntes Dokument ${id}`);
  }
  return fehler;
}

export function bauen(katalog, quellen) {
  const rechtslage = lageErheben();
  const codeBefunde = befunde(rechtslage);
  const quellAufgaben = (quellen.quellen || [])
    .filter((q) => q.status !== 'aktuell')
    .map((q) => ({
      id: `quelle-${q.id}`,
      prioritaet: q.status === 'pruefung' ? 'hoch' : 'mittel',
      verantwortlich: ['Sandro', 'Julian'],
      titel: q.status === 'pruefung' ? `Amtliche Quelle geändert: ${q.titel}` : `Amtliche Quelle nicht erreichbar: ${q.titel}`,
      beschreibung: q.status === 'pruefung'
        ? 'Änderung fachlich prüfen, betroffene Dokumente aktualisieren und erst danach die neue Quellenfassung akzeptieren.'
        : 'Abruf erneut prüfen. Solange die Quelle nicht erreichbar ist, wird Aktualität nicht behauptet.',
      frist: 'vor der nächsten Freigabe',
      dokumente: q.dokumente || [],
      automatisch: true,
      quelle: q.url,
      quellenStand: q.aktuellerHash || '',
    }));
  const dokumente = katalog.dokumente || [];
  const zaehler = dokumente.reduce((summe, d) => {
    summe[d.bedarf] = (summe[d.bedarf] || 0) + 1;
    return summe;
  }, {});
  return {
    version: 1,
    stand: [katalog.geprueftAm, quellen.geprueftAm].filter(Boolean).sort().at(-1) || katalog.paketStand,
    paket: katalog.paket,
    paketStand: katalog.paketStand,
    rechtshinweis: 'Arbeits- und Organisationshilfe, keine Rechtsberatung. Verbindliche Fassungen benötigen die dokumentierte Freigabe qualifizierter Fachleute.',
    sicherheit: 'Originaldateien liegen ausschließlich im privaten HQ-Speicher außerhalb des öffentlichen Web-Verzeichnisses.',
    zusammenfassung: {
      gesamt: dokumente.length,
      jetzt: zaehler.jetzt || 0,
      vorFreigabe: zaehler.vor_freigabe || 0,
      anlagen: zaehler.anlage || 0,
      archiv: zaehler.archiv || 0,
      aufgaben: (katalog.aufgaben || []).length + quellAufgaben.length,
    },
    technischerAbgleich: {
      module: rechtslage.dateienGeprueft,
      blockierend: codeBefunde.blockierend,
      hinweise: codeBefunde.meldend,
      status: codeBefunde.blockierend.length ? 'abweichung' : 'synchron',
    },
    quellen: quellen.quellen || [],
    aufgaben: [...(katalog.aufgaben || []), ...quellAufgaben],
    dokumente,
  };
}

function main() {
  const katalog = lesen(KATALOG_PFAD);
  const quellen = lesen(QUELLEN_PFAD);
  const fehler = validieren(katalog, quellen);
  if (fehler.length) {
    console.error('⛔ Rechtsunterlagen-Katalog:\n' + fehler.map((x) => `  - ${x}`).join('\n'));
    process.exit(1);
  }
  const inhalt = JSON.stringify(bauen(katalog, quellen), null, 2) + '\n';
  const phpInhalt = `<?php
// Erzeugt von scripts/rechtsunterlagen.mjs. Nicht von Hand bearbeiten.
if ( ! defined( 'ABSPATH' ) ) {
    http_response_code( 404 );
    header( 'Cache-Control: no-store, private' );
    exit;
}
return json_decode( base64_decode( '${Buffer.from(inhalt).toString('base64')}' ), true );
`;
  if (process.argv.includes('--check')) {
    const ist = readFileSync(ZIEL, 'utf8');
    const phpIst = readFileSync(PHP_ZIEL, 'utf8');
    if (ist !== inhalt || phpIst !== phpInhalt) {
      console.error('⛔ Rechtsunterlagen-Katalog oder geschuetzte PHP-Datendatei ist nicht aktuell.');
      process.exit(1);
    }
    console.log(`✓ ${katalog.dokumente.length} Rechtsunterlagen und ${katalog.aufgaben.length} Aufgaben konsistent.`);
    return;
  }
  writeFileSync(ZIEL, inhalt);
  writeFileSync(PHP_ZIEL, phpInhalt);
  console.log(`✓ Rechtsunterlagen-Katalog — ${katalog.dokumente.length} Dokumente.`);
}

if (process.argv[1] && process.argv[1].endsWith('rechtsunterlagen.mjs')) main();
