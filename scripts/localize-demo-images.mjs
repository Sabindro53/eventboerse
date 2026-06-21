#!/usr/bin/env node
/**
 * localize-demo-images.mjs
 * ------------------------------------------------------------------
 * Lädt alle externen Demo-Bilder (Pexels/Unsplash) aus app.js herunter,
 * speichert sie unter assets/demo/ und schreibt die URLs in app.js auf
 * lokale Pfade um. Damit werden nie wieder einzelne Demo-Bilder fehlen,
 * wenn ein externer Anbieter eine URL entfernt — und es ist DSGVO-sauberer
 * (kein Hotlink/IP-Abfluss an Pexels/Unsplash beim Seitenaufruf).
 *
 * Auf deinem PC ausführen (Node 18+, keine Abhängigkeiten nötig):
 *
 *   node scripts/localize-demo-images.mjs            # herunterladen + app.js umschreiben
 *   node scripts/localize-demo-images.mjs --dry-run  # nur anzeigen, nichts ändern
 *   node scripts/localize-demo-images.mjs --force    # vorhandene Dateien neu laden
 *
 * Danach: heruntergeladene Bilder + app.js committen.
 *   git add assets/demo app.js && git commit -m "chore: Demo-Bilder lokal hosten"
 *
 * Sicherheit:
 *  - Legt vor dem Schreiben ein Backup app.js.bak an.
 *  - Ersetzt NUR Bild-URLs der bekannten Demo-Hosts (Pexels/Unsplash).
 *  - Schlägt ein Download fehl, bleibt die Original-URL erhalten (kein Bruch).
 *  - Mehrfach ausführbar (idempotent): bereits lokale URLs werden übersprungen.
 *
 * Hinweis zur Auflösung der Pfade: Das Skript fügt einmalig window.EB_ASSET_BASE
 * in app.js ein. Diese Basis wird zur Laufzeit aus dem <script src=".../app.js">
 * abgeleitet, sodass die lokalen Bilder sowohl lokal (index.html) als auch im
 * WordPress-Theme (get_template_directory_uri()) korrekt laden.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const APP_JS = resolve(ROOT, 'app.js');
const DEMO_DIR = resolve(ROOT, 'assets', 'demo');
const DEMO_REL = 'assets/demo/'; // relativ zur Asset-Basis

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// Nur diese Hosts werden lokalisiert (bekannte Demo-Bildquellen).
const URL_RE = /(['"])(https:\/\/images\.(?:pexels|unsplash)\.com\/[^'"]+)\1/g;

const EB_ASSET_BASE_SNIPPET =
`// Asset-Basis für lokal gehostete Demo-Bilder (von scripts/localize-demo-images.mjs gesetzt).
// Wird aus dem app.js-Script-Tag abgeleitet, damit Pfade sowohl lokal (index.html)
// als auch im WordPress-Theme (get_template_directory_uri()) korrekt auflösen.
window.EB_ASSET_BASE = window.EB_ASSET_BASE || (function () {
  try {
    var s = document.querySelector('script[src*="app.js"]');
    if (s && s.src) return s.src.replace(/app\\.js.*$/, '');
  } catch (e) {}
  return '';
})();
`;

function log(...a) { console.log(...a); }

function fileNameFor(url) {
  // Lesbarer Basis-Name aus dem Pfad + kurzer Hash (unterscheidet Größen-Varianten).
  let base = 'img';
  const m = url.match(/\/(pexels-photo-\d+|photo-[0-9a-f-]+)/i);
  if (m) base = m[1].toLowerCase();
  let ext = 'jpg';
  const em = url.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i);
  if (em) ext = em[1].toLowerCase().replace('jpeg', 'jpg');
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
  return `${base}-${hash}.${ext}`;
}

async function download(url, destPath) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Referer': new URL(url).origin + '/',
      'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) throw new Error('zu klein (' + buf.length + ' B) – evtl. kein Bild');
  writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  let src = readFileSync(APP_JS, 'utf8');

  // Eindeutige URLs sammeln.
  const urls = new Set();
  for (const m of src.matchAll(URL_RE)) urls.add(m[2]);
  log(`Gefundene externe Demo-Bild-URLs: ${urls.size}`);
  if (urls.size === 0) { log('Nichts zu tun – bereits lokalisiert?'); return; }

  if (!DRY_RUN) mkdirSync(DEMO_DIR, { recursive: true });

  const map = new Map();   // url -> lokaler Dateiname
  let downloaded = 0, skipped = 0, failed = 0;
  const failures = [];

  for (const url of urls) {
    const fname = fileNameFor(url);
    const dest = resolve(DEMO_DIR, fname);
    if (!FORCE && existsSync(dest) && statSync(dest).size > 512) {
      map.set(url, fname); skipped++;
      continue;
    }
    if (DRY_RUN) { map.set(url, fname); continue; }
    try {
      const bytes = await download(url, dest);
      map.set(url, fname); downloaded++;
      log(`  ✓ ${fname}  (${(bytes / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed++; failures.push(`${url} → ${e.message}`);
      log(`  ✗ FEHLER: ${fname}  (${e.message}) – URL bleibt unverändert`);
    }
  }

  log(`\nDownload: ${downloaded} neu, ${skipped} vorhanden, ${failed} fehlgeschlagen.`);
  if (DRY_RUN) {
    log('\n[--dry-run] app.js wird NICHT geändert. Beispiel-Mapping:');
    let i = 0;
    for (const [u, f] of map) { if (i++ >= 5) break; log(`  ${u}\n    → ${DEMO_REL}${f}`); }
    return;
  }

  // EB_ASSET_BASE einmalig einfügen (vor const LISTINGS).
  if (!/window\.EB_ASSET_BASE\s*=/.test(src)) {
    const anchor = src.indexOf('const LISTINGS');
    if (anchor !== -1) {
      src = src.slice(0, anchor) + EB_ASSET_BASE_SNIPPET + '\n' + src.slice(anchor);
      log('EB_ASSET_BASE in app.js eingefügt.');
    } else {
      log('WARNUNG: "const LISTINGS" nicht gefunden – EB_ASSET_BASE nicht eingefügt.');
    }
  }

  // Nur erfolgreich geladene URLs ersetzen.
  let replaced = 0;
  src = src.replace(URL_RE, (full, quote, url) => {
    const f = map.get(url);
    if (!f) return full; // Download fehlgeschlagen -> Original behalten
    replaced++;
    return `EB_ASSET_BASE + ${quote}${DEMO_REL}${f}${quote}`;
  });

  // Backup + schreiben.
  writeFileSync(APP_JS + '.bak', readFileSync(APP_JS));
  writeFileSync(APP_JS, src, 'utf8');
  log(`\napp.js umgeschrieben: ${replaced} URL-Vorkommen lokalisiert. Backup: app.js.bak`);

  if (failures.length) {
    log(`\n${failures.length} Download(s) fehlgeschlagen (URLs unverändert gelassen):`);
    failures.forEach(f => log('  - ' + f));
    log('\nTipp: Skript erneut ausführen (Netzwerk/Rate-Limit) oder diese Bilder manuell ersetzen.');
  }
  log('\nFertig. Prüfen & committen:\n  git add assets/demo app.js && git commit -m "chore: Demo-Bilder lokal hosten"');
}

main().catch(e => { console.error('Abbruch:', e); process.exit(1); });
