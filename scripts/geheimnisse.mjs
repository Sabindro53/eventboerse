#!/usr/bin/env node
/**
 * geheimnisse.mjs — sucht Zugangsdaten im Quelltext UND in der Historie.
 *
 * Warum es das gibt: das Repository ist öffentlich, und der Gitleaks-Scan,
 * den GitHub als „active" führt, ist seit dem 05.05.2026 kein einziges Mal
 * gelaufen. Er wurde auf einem Zweig eingeführt, der nie nach main gemergt
 * wurde. GitHub registriert Workflows von jedem Zweig; ob ihre Datei auf
 * main liegt, prüft niemand. Vier Monate scheinbarer Schutz.
 *
 * WARUM AUCH DIE HISTORIE. Ein Geheimnis, das committet und im nächsten
 * Commit gelöscht wurde, ist nicht weg — es steht in einem Blob, den jeder
 * mit `git clone` bekommt. Ein Scanner, der nur den Arbeitsbaum ansieht,
 * gibt für ein öffentliches Repository eine Entwarnung, die er nicht decken
 * kann.
 *
 *   node scripts/geheimnisse.mjs           Bericht über den Arbeitsbaum
 *   node scripts/geheimnisse.mjs --historie  zusätzlich jeden je committeten Blob
 *   node scripts/geheimnisse.mjs --check     CI-Tor (Arbeitsbaum, Exit 1 bei Fund)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUELLTEXT_GEHEIMNISSE, QUELLTEXT_AUSNAHMEN } from './lib/verbotsmuster.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/**
 * Binärdateien und Fremdbestand bleiben draußen.
 *
 * `assets/lib/` sind selbst gehostete Bibliotheken (Leaflet, Flatpickr) —
 * minifiziert, und ihre Zufallszeichenketten erzeugen Fehlalarme, ohne dass
 * je ein eigenes Geheimnis dort landen könnte.
 */
const UEBERSPRINGEN = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|pdf|zip|mp4)$/i;
const FREMD = /^(assets\/lib\/|assets\/fonts\/|node_modules\/)/;

const ausgenommen = (pfad) =>
  UEBERSPRINGEN.test(pfad) || FREMD.test(pfad) || QUELLTEXT_AUSNAHMEN.includes(pfad);

/** Sucht in einem Text; gibt Fundstellen mit Zeile und gekürztem Beleg. */
function pruefe(text, herkunft) {
  const funde = [];
  const zeilen = text.split('\n');
  for (let i = 0; i < zeilen.length; i += 1) {
    // Sehr lange Zeilen sind minifizierter oder erzeugter Inhalt. Ein echter
    // Schlüssel steht dort nicht, ein Zufallstreffer schon.
    if (zeilen[i].length > 2000) continue;
    // Eine Zeile, die ihren Wert ERZEUGT, enthält kein Geheimnis. Der
    // Prüfstand des HQ-Tors schrieb
    //   $PASSWORT = 'Prüfstand-Passwort-' . bin2hex( random_bytes( 8 ) );
    // und wurde gemeldet — ein Fehlalarm, der bei jedem Lauf wiederkehrt und
    // den Bericht damit wertlos macht.
    if (/\b(random_bytes|randomBytes|wp_generate_password|bin2hex|uniqid|Math\.random|crypto\.getRandomValues)\b/
      .test(zeilen[i])) continue;
    for (const { re, why } of QUELLTEXT_GEHEIMNISSE) {
      const t = zeilen[i].match(re);
      if (!t) continue;
      // Nie den ganzen Treffer ausgeben: ein Bericht, der das Geheimnis
      // zitiert, trägt es in das nächste Log.
      funde.push({ herkunft, zeile: i + 1, why, spur: `${t[0].slice(0, 6)}…${t[0].length} Zeichen` });
    }
  }
  return funde;
}

/**
 * Der ARBEITSBAUM — und zwar wirklich die Platte.
 *
 * HIER STAND `git show HEAD:${d}`, ALSO DER COMMITTETE STAND. Für den
 * PR-Check war das richtig (dort IST HEAD der Vorschlag, und der Checkout
 * gleicht ihm byteweise), lokal war es eine Falle: eine geänderte, noch
 * nicht committete Datei blieb unsichtbar, und der Bericht sah grün aus.
 * Genau darauf bin ich am 23.09.2026 hereingefallen — der Fund stand weiter
 * im Bericht, nachdem die Zeile längst geändert war.
 *
 * Ein Sicherheitsprüfer, dessen Subjekt ein anderes ist als sein Name sagt,
 * gibt eine Entwarnung, die er nicht decken kann. Gelesen wird deshalb die
 * Datei, nicht der Blob. In CI ändert das **nichts** (der Baum ist der
 * Checkout von HEAD); lokal macht es den Prüfer erst zu dem, was draufsteht.
 *
 * NEU HINZUGEKOMMEN SIND UNVERFOLGTE DATEIEN. Eine frisch angelegte Datei
 * mit einem Schlüssel ist die wahrscheinlichste Gestalt eines Unfalls — und
 * sie war für BEIDE Wege unsichtbar. `--exclude-standard` hält dabei alles
 * draußen, was `.gitignore` deckt: `.env` und `node_modules` sollen den
 * Bericht nicht bei jedem Lauf füllen. Ein Scanner, der dreimal grundlos
 * anschlägt, wird abgeschaltet.
 */
function arbeitsbaum() {
  const verfolgt = git('ls-files').split('\n').filter(Boolean);
  const unverfolgt = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
  const dateien = [...new Set([...verfolgt, ...unverfolgt])].filter((d) => !ausgenommen(d));
  const funde = [];
  let gelesen = 0;
  for (const d of dateien) {
    let inhalt = '';
    // Eine verfolgte, aber gelöschte Datei steht nicht mehr im Baum — sie
    // gehört der Historie, und die hat ihren eigenen Durchgang.
    try { inhalt = readFileSync(join(ROOT, d), 'utf8'); } catch { continue; }
    gelesen += 1;
    funde.push(...pruefe(inhalt, d));
  }
  return { gepruft: gelesen, unverfolgt: unverfolgt.length, funde };
}

function historie() {
  const commits = git('rev-list', 'HEAD').split('\n').filter(Boolean);
  const gesehen = new Set();
  const funde = [];
  for (const c of commits) {
    const aus = git('diff-tree', '--no-commit-id', '-r', '--root', c);
    for (const zeile of aus.split('\n')) {
      const teile = zeile.split(/\s+/);
      if (teile.length < 6) continue;
      const [, , , blob, , ...rest] = teile;
      const pfad = rest.join(' ');
      if (!blob || blob.startsWith('0000') || gesehen.has(blob) || ausgenommen(pfad)) continue;
      gesehen.add(blob);
      let inhalt = '';
      try { inhalt = git('cat-file', '-p', blob); } catch { continue; }
      funde.push(...pruefe(inhalt, `${c.slice(0, 8)} ${pfad}`));
    }
  }
  return { commits: commits.length, blobs: gesehen.size, funde };
}

const args = process.argv.slice(2);
const tor = args.includes('--check');

console.log('── Geheimnisse im Repository ─────────────────────');
const baum = arbeitsbaum();
console.log(`Arbeitsbaum         : ${baum.gepruft} Dateien auf der Platte`
  + `${baum.unverfolgt ? ` (davon ${baum.unverfolgt} unverfolgt)` : ''}`
  + `, ${baum.funde.length} Fund(e)`);

let alle = [...baum.funde];
if (args.includes('--historie')) {
  const h = historie();
  console.log(`Historie            : ${h.commits} Commits, ${h.blobs} Blobs, ${h.funde.length} Fund(e)`);
  alle = alle.concat(h.funde);
}

if (alle.length) {
  console.log('');
  for (const f of alle.slice(0, 40)) {
    console.log(`  ⛔ ${f.why}`);
    console.log(`     ${f.herkunft}:${f.zeile}  (${f.spur})`);
  }
  if (alle.length > 40) console.log(`  … und ${alle.length - 40} weitere`);
  console.log('');
  console.log('Ein Geheimnis im Verlauf ist mit einem Commit nicht behoben:');
  console.log('es bleibt in der Historie abrufbar. Schlüssel zuerst beim');
  console.log('Anbieter zurückziehen, dann erst über die Historie reden.');
  console.log('─────────────────────────────────────────────────');
  process.exit(tor ? 1 : 0);
}

console.log('✓ Kein Zugangsdatum gefunden.');
console.log('─────────────────────────────────────────────────');
