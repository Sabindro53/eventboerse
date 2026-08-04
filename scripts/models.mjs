#!/usr/bin/env node
/**
 * models.mjs — das Modell-Ensemble des HQ.
 *
 * Erzeugt `assets/eb-models.json`: welche Modelle welche Aufgabe haben, welchem
 * Bereich sie zuarbeiten, und über welchen Weg sie erreichbar wären.
 *
 * Dieselbe Trennung wie beim Connector-Katalog: hier steht, was ein Modell
 * KANN und WOFÜR es gedacht ist. Ob es gerade antwortet, entscheidet
 * ausschließlich ein echter Aufruf zur Laufzeit. Ein Ensemble, das sich selbst
 * als „aktiv" beschreibt, ist eine Bühnendekoration.
 *
 * Warum offene Modelle: sie lassen sich selbst betreiben. Was heute über
 * OpenRouter läuft, kann morgen auf eigener Hardware laufen, ohne dass eine
 * Zeile Aufgabenlogik sich ändert — die Rolle bleibt, der Anbieter ist
 * austauschbar. Genau deshalb steht in jedem Eintrag die Rolle vor dem Namen.
 *
 * Jede Rolle ist als STELLE beschrieben, nicht als Spielerei: sie hat einen
 * Auslöser (wann sie arbeitet), eine Schicht (welcher Workflow sie ausführt)
 * und einen Gehaltsvergleich. Letzterer ist ausdrücklich ein Vergleichswert
 * für dieselbe Aufgabe als menschliche Stelle — keine Behauptung, dass ein
 * Modell einen Menschen ersetzt. Er macht sichtbar, welchen Umfang an Arbeit
 * hier automatisch läuft.
 *
 * Nutzung:
 *   node scripts/models.mjs           # Katalog schreiben
 *   node scripts/models.mjs --check   # prüfen (CI)
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEHEIMNISSE, ersterTreffer } from './lib/verbotsmuster.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'eb-models.json');
const CHECK = process.argv.includes('--check');

/**
 * Die sechs Bereiche des HQ und ihre Autonomie.
 *
 * Das Kriterium ist **Reversibilität**, nicht Vorsicht: ein falscher Deploy
 * ist in einer Minute zurückgerollt, eine Überweisung nicht, und ein Beitrag
 * unter unserem Namen steht im Netz, auch wenn wir ihn löschen.
 *
 *   voll       handelt ohne Rückfrage
 *   vorletzt   macht alles bis zum letzten Schritt nach außen
 *   vorbereit  bereitet vor, löst nie aus
 */
const BEREICHE = [
  {
    id: 'architektur', label: 'Architektur', emoji: '🧩', farbe: '#a855f7',
    aufgabe: 'Code lesen, Abhängigkeiten prüfen, Umbauten vorschlagen.',
    autonomie: 'voll',
    begruendung: 'Ein Vorschlag ist ein Draft-PR. Nichts davon erreicht die Seite, '
      + 'bevor jemand mergt — und ein Merge ist rückholbar.',
  },
  {
    id: 'betrieb', label: 'Betrieb', emoji: '⚙️', farbe: '#22d3ee',
    aufgabe: 'Deploys, Tests, Selbstcheck, Erreichbarkeit.',
    autonomie: 'voll',
    begruendung: 'Ein falscher Deploy ist in einer Minute zurückgerollt. '
      + 'Die Testsuite steht als Gate davor.',
  },
  {
    id: 'intelligence', label: 'Intelligence', emoji: '🧠', farbe: '#f472b6',
    aufgabe: 'Recherche, Wissensbasis, Wissenslücken, Event-Universum.',
    autonomie: 'voll',
    begruendung: 'Externer Zufluss landet in Quarantäne und erreicht die Website '
      + 'nicht. Die Freigabe auf public bleibt ein menschlicher Commit.',
  },
  {
    id: 'community', label: 'Community', emoji: '💬', farbe: '#4ade80',
    aufgabe: 'Beiträge entwerfen, Antworten vorbereiten, Stimmung lesen.',
    autonomie: 'vorletzt',
    begruendung: 'Ein Beitrag unter unserem Namen steht im Netz, auch wenn wir ihn '
      + 'löschen. Der Entwurf ist automatisch, das Absenden nicht.',
  },
  {
    id: 'sales', label: 'Sales', emoji: '📈', farbe: '#fbbf24',
    aufgabe: 'Anfragen sichten, Angebote vorbereiten, Nachfassen planen.',
    autonomie: 'vorletzt',
    begruendung: 'Eine Zusage an einen Kunden bindet uns. Alles bis dahin läuft '
      + 'ohne Rückfrage.',
  },
  {
    id: 'finance', label: 'Finance', emoji: '💶', farbe: '#f87171',
    aufgabe: 'Gebühren rechnen, Auszahlungen vorbereiten, Abweichungen melden.',
    autonomie: 'vorbereit',
    begruendung: 'Eine Überweisung ist nicht rückholbar. Hier bereitet die Automatik '
      + 'vor und legt vor — auslösen tut ein Mensch.',
  },
];

const AUTONOMIE_TEXT = {
  voll:      { label: 'handelt selbst',       kurz: 'ohne Rückfrage' },
  vorletzt:  { label: 'stoppt vor dem Senden', kurz: 'alles außer dem letzten Schritt' },
  vorbereit: { label: 'bereitet nur vor',      kurz: 'löst nie aus' },
};

/**
 * Das Ensemble. Jedes Modell hat GENAU EINE Rolle — ein Allrounder, der alles
 * ein bisschen macht, ist im Betrieb nicht nachvollziehbar. Fällt ein Modell
 * aus, weiß man dann auch, was genau fehlt.
 *
 * `offen: true` heißt: Gewichte sind frei verfügbar, das Modell ließe sich
 * selbst betreiben. Das ist der Grund, warum es hier steht.
 */
const MODELLE = [
  {
    id: 'llama-arch', werkzeuge: ['github','openrouter'], person: 'Ada Brenner', name: 'Llama 3.3 70B', modellId: 'meta-llama/llama-3.3-70b-instruct', anbieter: 'Meta', offen: true,
    lizenz: 'Llama Community License', bereich: 'architektur',
    rolle: 'Architektur-Gegenleser',
    aufgabe: 'Liest Diffs und benennt, was ein Umbau an anderer Stelle kaputt macht.',
    warum: 'Großer Kontext, belastbar bei langen Dateien — hier zählt Überblick '
      + 'mehr als Geschwindigkeit.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Plant jeden autonomen Verbesserungs-Lauf gegen.',
    gehaltVergleich: 78000,
    vergleichsstelle: 'Senior-Entwickler:in im Review',
  },
  {
    id: 'deepseek-code', werkzeuge: ['github','openrouter'], person: 'Kito Sarr', name: 'DeepSeek V4 Flash', modellId: 'deepseek/deepseek-v4-flash', anbieter: 'DeepSeek', offen: true,
    lizenz: 'MIT (Gewichte)', bereich: 'architektur',
    rolle: 'Unabhängiger Code-Prüfer',
    aufgabe: 'Gibt einen KI-Patch nur mit hoher Sicherheit für die Testsuite frei.',
    warum: 'Auf Code trainiert, findet Klassen von Fehlern, die generische Modelle übersehen.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Prüft jeden autonomen Patch vor dem Anwenden.',
    gehaltVergleich: 72000,
    vergleichsstelle: 'Code-Reviewer:in',
  },
  {
    id: 'mistral-ops', werkzeuge: ['deployment','github','openrouter'], person: 'Nils Falk', name: 'Mistral Small 3.2 24B', modellId: 'mistralai/mistral-small-3.2-24b-instruct', anbieter: 'Mistral AI', offen: true,
    lizenz: 'Apache 2.0', bereich: 'betrieb',
    rolle: 'Architektur-Fallback',
    aufgabe: 'Übernimmt die Planung, wenn das Primärmodell nicht erreichbar ist.',
    warum: 'Schnell und günstig. Der Lauf bleibt verfügbar, ohne die Qualitätsgrenze aufzugeben.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Springt bei Modell- oder Provider-Ausfall automatisch ein.',
    gehaltVergleich: 55000,
    vergleichsstelle: 'DevOps-Bereitschaft',
  },
  {
    id: 'qwen-wissen', werkzeuge: ['openrouter'], person: 'Mira Yun', name: 'Qwen3 30B MoE Instruct', modellId: 'qwen/qwen3-30b-a3b-instruct-2507', anbieter: 'Alibaba', offen: true,
    lizenz: 'Apache 2.0', bereich: 'intelligence',
    rolle: 'Plan-Gegenleser',
    aufgabe: 'Übernimmt Architektur und Review, wenn ein Primärmodell ausfällt.',
    warum: 'Großer Kontext und strukturierte Ausgaben eignen sich für Plan und Gegenprüfung.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Springt bei Modell- oder Provider-Ausfall automatisch ein.',
    gehaltVergleich: 62000,
    vergleichsstelle: 'Marktrecherche',
  },
  {
    id: 'gemma-sort', werkzeuge: ['obsidian','openrouter'], person: 'Ela Voss', name: 'Gemma 3 12B', modellId: 'google/gemma-3-12b-it', anbieter: 'Google', offen: true,
    lizenz: 'Gemma Terms of Use', bereich: 'intelligence',
    rolle: 'Verbesserungs-Scout',
    aufgabe: 'Wählt genau eine kleine, risikoarme Website-Verbesserung aus.',
    warum: 'Klein und günstig, gut für Klassifikation und konsequente Scope-Begrenzung.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Startet jeden autonomen Wochenlauf.',
    gehaltVergleich: 48000,
    vergleichsstelle: 'Content-Redaktion',
  },
  {
    id: 'phi-kurz', werkzeuge: ['openrouter'], person: 'Timo Rast', name: 'Qwen3 Coder 30B', modellId: 'qwen/qwen3-coder-30b-a3b-instruct', anbieter: 'Alibaba', offen: true,
    lizenz: 'Apache 2.0', bereich: 'community',
    rolle: 'Patch-Schreiber',
    aufgabe: 'Schreibt einen kleinen Unified-Diff innerhalb der freigegebenen Dateien.',
    warum: 'Auf Code spezialisiert; der Patch bleibt klein und wird nie ungeprüft angewendet.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Arbeitet erst nach freigegebenem Architekturplan.',
    gehaltVergleich: 44000,
    vergleichsstelle: 'Community-Betreuung',
  },
  {
    id: 'mixtral-sales', werkzeuge: ['openrouter'], person: 'Jana Krohn', name: 'Mistral Nemo', modellId: 'mistralai/mistral-nemo', anbieter: 'Mistral AI', offen: true,
    lizenz: 'Apache 2.0', bereich: 'sales',
    rolle: 'Anfragen-Sichter',
    aufgabe: 'Liest Anfragen und schlägt Kategorie, Dringlichkeit und Preisrahmen vor.',
    warum: 'Mixture-of-Experts: viel Leistung pro Aufruf, ohne ein 70B-Modell zu bezahlen.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Springt als günstiger Scout-Fallback ein.',
    gehaltVergleich: 58000,
    vergleichsstelle: 'Vertriebsinnendienst',
  },
  {
    id: 'llama-finance', werkzeuge: ['openrouter'], person: 'Ben Oduya', name: 'Llama 3.1 8B', modellId: 'meta-llama/llama-3.1-8b-instruct', anbieter: 'Meta', offen: true,
    lizenz: 'Llama Community License', bereich: 'finance',
    rolle: 'Abweichungs-Melder',
    aufgabe: 'Vergleicht erwartete und tatsächliche Gebühren und meldet Differenzen.',
    warum: 'Klein und schnell. Die Rechnung selbst macht der Code centgenau — '
      + 'das Modell erklärt nur, was auffällt.',
    weg: 'openrouter',
    schicht: 'openrouter-autopilot.yml',
    ausloeser: 'Springt als konservativer Scout-Fallback ein.',
    gehaltVergleich: 65000,
    vergleichsstelle: 'Buchhaltung',
  },
  {
    id: 'whisper', werkzeuge: [], person: 'Sena Ilk', name: 'Whisper large-v3', anbieter: 'OpenAI (offene Gewichte)', offen: true,
    lizenz: 'MIT', bereich: 'intelligence',
    rolle: 'Zuhörer',
    aufgabe: 'Wandelt Gesprochenes in Text, wenn die Browser-Erkennung nicht reicht.',
    warum: 'Offene Gewichte, selbst betreibbar. Sprache muss den Rechner nicht verlassen.',
    weg: 'lokal',
    schicht: null,
    ausloeser: 'Wird aktiv, sobald du sprichst.',
    gehaltVergleich: 0,
    vergleichsstelle: 'läuft lokal, keine Stelle',
  },
  {
    id: 'kokoro', werkzeuge: [], person: 'Lea Kimm', name: 'Kokoro TTS', anbieter: 'Community', offen: true,
    lizenz: 'Apache 2.0', bereich: 'betrieb',
    rolle: 'Stimme',
    aufgabe: 'Spricht Lageberichte aus. Heute übernimmt das die Browser-Stimme.',
    warum: 'Klein und natürlich klingend. Der Wechsel kostet genau eine Funktion — '
      + 'der sprechbare Text ist die Datenquelle, nicht die Oberfläche.',
    weg: 'lokal',
    schicht: null,
    ausloeser: 'Spricht, wenn du eine Antwort hören willst.',
    gehaltVergleich: 0,
    vergleichsstelle: 'läuft lokal, keine Stelle',
  },
];

/**
 * Schichten: welcher echte Workflow diese Rolle ausführt. Das HQ liest die
 * letzten Läufe über die Actions-API — dadurch steht auf jeder Mitarbeiter-
 * Karte, wann sie ZULETZT TATSÄCHLICH gearbeitet hat, nicht wann sie sollte.
 */
const SCHICHTEN = {
  'openrouter-autopilot.yml': { takt: 'mittwochs 02:11 UTC', label: 'OpenRouter Autopilot' },
  'tagesroutine.yml':      { takt: 'täglich 03:17 UTC', label: 'Tagesroutine' },
  'recherche.yml':         { takt: 'donnerstags 06:23 UTC', label: 'Recherche' },
  'claude-improve.yml':    { takt: 'montags 05:00 UTC', label: 'Verbesserungs-Routine' },
  'claude-auto-audit.yml': { takt: 'montags 04:00 UTC', label: 'Auto-Audit' },
  'pr-check.yml':          { takt: 'bei jedem Pull Request', label: 'PR-Gate' },
  'ionos-deploy.yml':      { takt: 'bei jedem Push auf main', label: 'Deploy' },
  'site-monitor.yml':      { takt: 'alle 30 Minuten', label: 'Erreichbarkeit' },
};

const WEGE = {
  openrouter: {
    label: 'OpenRouter',
    hinweis: 'Ein Zugang, viele offene Modelle. Der Aufruf läuft serverseitig über '
      + '/wp-json/eventboerse/v1/hq/probe/openrouter — der Schlüssel erreicht den '
      + 'Browser nie.',
    doku: 'https://openrouter.ai/docs',
  },
  lokal: {
    label: 'Lokal / im Browser',
    hinweis: 'Läuft auf diesem Rechner. Nichts wird übertragen. Heute über die '
      + 'Web-Speech-API des Browsers, später über die genannten Gewichte.',
    doku: null,
  },
};

// ── Prüfung ─────────────────────────────────────────────────────────────────

function pruefen() {
  const fehler = [];
  const ids = new Set();
  const bereichIds = new Set(BEREICHE.map((b) => b.id));

  for (const b of BEREICHE) {
    if (!AUTONOMIE_TEXT[b.autonomie]) fehler.push(`${b.id}: unbekannte Autonomiestufe „${b.autonomie}"`);
    // Eine Grenze ohne Begründung ist eine Willkür — dann verschiebt man sie
    // irgendwann, weil niemand mehr weiß, warum sie da war.
    if (!b.begruendung || b.begruendung.length < 40) {
      fehler.push(`${b.id}: Autonomiestufe ohne tragfähige Begründung`);
    }
  }

  for (const m of MODELLE) {
    const melde = (t) => fehler.push(`${m.id || '(ohne id)'}: ${t}`);
    if (!m.id || ids.has(m.id)) melde('id fehlt oder ist doppelt');
    ids.add(m.id);
    for (const feld of ['name', 'anbieter', 'lizenz', 'rolle', 'aufgabe', 'warum', 'weg',
                        'ausloeser', 'vergleichsstelle', 'person']) {
      if (!m[feld]) melde(`Pflichtfeld „${feld}" fehlt`);
    }
    // Das Ensemble ist ausdrücklich offen — ein geschlossenes Modell hier wäre
    // ein stiller Bruch mit dem Grund, warum es diese Liste gibt.
    if (m.offen !== true) melde('nur offene Modelle gehören ins Ensemble');
    if (!bereichIds.has(m.bereich)) melde(`unbekannter Bereich „${m.bereich}"`);
    if (!WEGE[m.weg]) melde(`unbekannter Weg „${m.weg}"`);
    if (m.weg === 'openrouter' && !m.modellId) melde('OpenRouter-Modell ohne modellId');
    if (typeof m.gehaltVergleich !== 'number') melde('gehaltVergleich fehlt (0 = keine Stelle)');
    // Ein Name macht die Rolle ansprechbar — er darf aber nie verdecken,
    // welches Modell dahintersteht. Beides steht immer zusammen auf der Karte.
    if (m.person && m.person === m.name) melde('person darf nicht der Modellname sein');
    if (!Array.isArray(m.werkzeuge)) melde('werkzeuge fehlt (leeres Array = arbeitet lokal)');
    // Eine Schicht muss ein ECHTER Workflow sein. Ein erfundener Auslöser
    // wäre genau die Sorte Behauptung, die dieses Dashboard vermeiden soll.
    if (m.schicht !== null && !SCHICHTEN[m.schicht]) melde(`unbekannte Schicht „${m.schicht}"`);
    // Wer eine Schicht hat, arbeitet — und hat dann auch einen Vergleichswert.
    if (m.schicht && m.gehaltVergleich <= 0) melde('Rolle mit Schicht ohne Gehaltsvergleich');
    if (!m.schicht && m.gehaltVergleich !== 0) melde('Rolle ohne Schicht darf kein Gehalt führen');
    if ('status' in m || 'aktiv' in m || 'verbunden' in m) {
      melde('Laufzeit-Zustand gehört nicht in den Katalog');
    }
    const t = ersterTreffer(JSON.stringify(m), GEHEIMNISSE);
    if (t) melde(`Verbotsmuster: ${t.why}`);
  }

  // Jeder Bereich braucht mindestens ein Modell, sonst ist der Knoten im
  // neuronalen Kern eine leere Behauptung.
  for (const b of BEREICHE) {
    if (!MODELLE.some((m) => m.bereich === b.id)) fehler.push(`${b.id}: kein Modell zugeordnet`);
  }
  return fehler;
}

const katalog = {
  version: 1,
  erzeugt: new Date().toISOString().slice(0, 10),
  hinweis: 'Katalog, kein Zustand. Erzeugt von scripts/models.mjs — nicht von Hand '
    + 'bearbeiten. Ob ein Modell antwortet, entscheidet ein echter Aufruf.',
  autonomieStufen: AUTONOMIE_TEXT,
  wege: WEGE,
  schichten: SCHICHTEN,
  bereiche: BEREICHE,
  modelle: MODELLE,
};

const fehler = pruefen();
if (fehler.length) {
  console.error('⛔ Ensemble fehlerhaft:');
  for (const f of fehler) console.error(`   ✗ ${f}`);
  process.exit(1);
}

if (CHECK) {
  let da = null;
  try { da = JSON.parse(await readFile(OUT, 'utf8')); } catch {
    console.error('⛔ assets/eb-models.json fehlt — node scripts/models.mjs ausführen.');
    process.exit(1);
  }
  if (JSON.stringify({ ...da, erzeugt: null }) !== JSON.stringify({ ...katalog, erzeugt: null })) {
    console.error('⛔ ausgelieferter Katalog weicht ab — neu erzeugen und mitcommitten.');
    process.exit(1);
  }
  console.log('── Modell-Ensemble ──────────────────────────────');
  console.log(`Bereiche            : ${BEREICHE.length}`);
  console.log(`Modelle (alle offen): ${MODELLE.length}`);
  for (const [stufe, t] of Object.entries(AUTONOMIE_TEXT)) {
    const n = BEREICHE.filter((b) => b.autonomie === stufe).length;
    console.log(`   ${t.label.padEnd(22)}: ${n} Bereich(e)`);
  }
  const summe = MODELLE.reduce((a, m) => a + (m.gehaltVergleich || 0), 0);
  console.log(`Besetzte Stellen    : ${MODELLE.filter(m => m.schicht).length}`);
  console.log(`Gehaltsvergleich    : ${summe.toLocaleString('de-DE')} € / Jahr (Marktwert derselben Aufgaben)`);
  console.log('✓ Rollen eindeutig, jede Grenze begründet, kein Zustand im Katalog.');
  console.log('─────────────────────────────────────────────────');
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(katalog), 'utf8');
  const summe = MODELLE.reduce((a, m) => a + (m.gehaltVergleich || 0), 0);
  console.log(`✓ ${relative(ROOT, OUT)} — ${MODELLE.length} Rollen in ${BEREICHE.length} Bereichen, `
    + `${MODELLE.filter(m => m.schicht).length} mit Schicht (${summe.toLocaleString('de-DE')} € Vergleichswert)`);
}
