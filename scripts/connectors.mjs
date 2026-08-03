#!/usr/bin/env node
/**
 * connectors.mjs — das Connector-Verzeichnis (HQ 3A).
 *
 * Erzeugt `assets/eb-connectors.json`: den **Katalog** aller Systeme, die das
 * HQ anbinden kann oder soll. Bewusst getrennt vom **Zustand**:
 *
 *   Katalog (hier, versioniert)   Was es gibt, wie man es verbindet, welche
 *                                 Berechtigungen nötig sind, welche Fähigkeiten
 *                                 der Anbieter überhaupt hergibt, wohin die
 *                                 offiziellen Einrichtungsseiten führen.
 *
 *   Zustand (Laufzeit, im HQ)     Verbunden oder nicht, letzte erfolgreiche
 *                                 Prüfung, letzter Fehler, Kontingent. Entsteht
 *                                 NUR aus echten Aufrufen. Nichts davon steht
 *                                 in dieser Datei — sonst stünde hier ein
 *                                 „verbunden", das niemand geprüft hat.
 *
 * Geheimnisse gehören nirgends hier hinein. Das Skript prüft das selbst.
 *
 * Nutzung:
 *   node scripts/connectors.mjs            # Katalog schreiben
 *   node scripts/connectors.mjs --check    # prüfen (CI)
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEHEIMNISSE, ersterTreffer } from './lib/verbotsmuster.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'eb-connectors.json');
const CHECK = process.argv.includes('--check');

/**
 * Verbindungsmethoden in der Rangfolge der Spezifikation. `rang` ist die
 * Priorität — kleiner ist besser. Der Katalog nennt pro Connector die
 * tatsächlich möglichen Methoden, nicht die wünschenswerten.
 */
const METHODEN = {
  oauth:   { rang: 1, label: 'OAuth 2.1 (PKCE)' },
  api:     { rang: 2, label: 'Offizielle API' },
  mcp:     { rang: 3, label: 'MCP-Server' },
  webhook: { rang: 4, label: 'Webhook' },
  datei:   { rang: 5, label: 'Lokaler Dateizugriff' },
  schluessel: { rang: 6, label: 'API-Schlüssel' },
  manuell: { rang: 7, label: 'Manueller Import' },
};

/**
 * Die 15 HQ-Standardfunktionen. Jeder Connector deklariert pro Funktion
 * einen der drei Werte — es gibt kein „vielleicht":
 *
 *   ja        Der Anbieter kann das, und das HQ kann es von hier aus aufrufen.
 *   proxy     Der Anbieter kann das, das HQ aber nicht aus dem Browser heraus
 *             (CORS, oder der Schlüssel läge im Seitenkontext). Braucht eine
 *             Serverseite, die es noch nicht gibt.
 *   nein      Gibt es beim Anbieter nicht.
 */
const FUNKTIONEN = ['connect', 'disconnect', 'healthCheck', 'getCapabilities',
  'getUsage', 'getQuota', 'getResetTime', 'getRecentActivity', 'search',
  'read', 'create', 'update', 'execute', 'subscribe', 'resumeTask'];

/** Kurzschreibweise: alles `nein`, dann gezielt überschreiben. */
const f = (overrides) => {
  const o = {};
  for (const k of FUNKTIONEN) o[k] = overrides[k] || 'nein';
  return o;
};

const CONNECTORS = [
  {
    id: 'github',
    anbieter: 'GitHub',
    dienst: 'Repository, Actions, Issues, Pull Requests',
    logo: '🐙',
    zweck: 'Rückgrat der Auslieferung: Code, CI, Deploys, Aufgabenstrom.',
    methoden: ['api', 'oauth', 'webhook'],
    methodeAktiv: 'api',
    hinweisMethode: 'Persönlicher Token (fein granular) im Browser, nur für diese Sitzung. '
      + 'Eine eigene GitHub App mit minimalen Rechten wäre der nächste Schritt.',
    berechtigungen: ['repo (lesend)', 'workflow (Dispatch für Rollback/Bots)'],
    leseZugriffe: ['Commits', 'Pull Requests', 'Issues', 'Actions-Läufe', 'Dateien'],
    schreibZugriffe: ['workflow_dispatch (Rollback, Bot-Trigger)'],
    freigabegrenzen: ['Rollback und Deploy verlangen weiterhin eine Bestätigung im HQ'],
    faehigkeiten: f({
      connect: 'ja', disconnect: 'ja', healthCheck: 'ja', getCapabilities: 'ja',
      getUsage: 'ja', getQuota: 'ja', getResetTime: 'ja', getRecentActivity: 'ja',
      search: 'ja', read: 'ja', execute: 'ja',
    }),
    kontingent: {
      ueberApiAbrufbar: true,
      quelle: 'GET /rate_limit',
      hinweis: 'Echtes Rest-Kontingent und Reset-Zeitpunkt kommen direkt von GitHub.',
    },
    geheimnisAblage: 'sessionStorage (nur diese Sitzung, nie im Repo)',
    links: {
      einrichten: 'https://github.com/settings/tokens',
      nutzung: 'https://docs.github.com/rest/rate-limit',
      doku: 'https://docs.github.com/rest',
    },
  },
  {
    id: 'copilot',
    anbieter: 'GitHub',
    dienst: 'GitHub Copilot',
    logo: '🤖',
    zweck: 'Implementierungshilfe in der IDE.',
    methoden: ['api'],
    methodeAktiv: 'api',
    hinweisMethode: 'Lizenzstatus über die GitHub-API. Das persönliche Rest-Kontingent '
      + 'ist bei GitHub nicht als öffentliche Schnittstelle vorgesehen.',
    berechtigungen: ['copilot (lesend, sofern verfügbar)'],
    leseZugriffe: ['Lizenzstatus'],
    schreibZugriffe: [],
    freigabegrenzen: [],
    faehigkeiten: f({
      connect: 'ja', disconnect: 'ja', healthCheck: 'ja', getCapabilities: 'ja',
    }),
    kontingent: {
      ueberApiAbrufbar: false,
      quelle: null,
      // Wortlaut aus der Spezifikation — bewusst nicht umformuliert.
      hinweis: 'Genauer Kontingentstand nicht über die API verfügbar. '
        + 'Letzter bekannter Zustand: Kontingent erschöpft.',
    },
    geheimnisAblage: 'teilt sich den GitHub-Token',
    links: {
      einrichten: 'https://github.com/settings/copilot',
      nutzung: 'https://docs.github.com/en/copilot/concepts/copilot-usage-metrics/copilot-metrics',
      doku: 'https://docs.github.com/en/rest/copilot',
    },
  },
  {
    id: 'anthropic',
    anbieter: 'Anthropic',
    dienst: 'Claude API',
    logo: '🧠',
    zweck: 'Architekturprüfung, Analyse, die Routinen in GitHub Actions.',
    methoden: ['api', 'schluessel'],
    methodeAktiv: 'schluessel',
    hinweisMethode: 'Der Schlüssel liegt als GitHub-Secret (ANTHROPIC_API_KEY) und wird '
      + 'ausschließlich in Actions verwendet. Das HQ ruft die API NICHT direkt auf — '
      + 'ein Schlüssel im Browser wäre ein Schlüssel in der Seite.',
    berechtigungen: ['Messages API (in CI)'],
    leseZugriffe: [],
    schreibZugriffe: [],
    freigabegrenzen: ['Routinen öffnen Draft-PRs, sie veröffentlichen nichts'],
    faehigkeiten: f({
      connect: 'ja', disconnect: 'ja',
      healthCheck: 'proxy', getUsage: 'proxy', getQuota: 'proxy', getResetTime: 'proxy',
      getCapabilities: 'ja', execute: 'proxy',
    }),
    kontingent: {
      ueberApiAbrufbar: false,
      quelle: 'https://console.anthropic.com/settings/usage',
      hinweis: 'Verbrauch und Guthaben stehen in der Console. Aus dem Browser nicht '
        + 'abrufbar, ohne den Schlüssel preiszugeben.',
    },
    geheimnisAblage: 'GitHub Secret (ANTHROPIC_API_KEY)',
    unterscheidung: {
      titel: 'Abonnement ist nicht gleich API-Guthaben',
      punkte: [
        'Claude-Abonnement — die Chat-Oberfläche, für HQ-Aufrufe nicht verwendbar',
        'Anthropic-API-Zugang — eigener Vertrag, eigene Abrechnung',
        'API-Nutzung — zählt nur, was über den Schlüssel läuft',
        'Für HQ nutzbar sind ausschließlich Modelle des API-Zugangs',
      ],
    },
    links: {
      einrichten: 'https://console.anthropic.com/settings/keys',
      nutzung: 'https://console.anthropic.com/settings/usage',
      doku: 'https://docs.anthropic.com',
    },
  },
  {
    id: 'openai',
    anbieter: 'OpenAI',
    dienst: 'ChatGPT / OpenAI API',
    logo: '⚡',
    zweck: 'Operative Planung, Textarbeit — noch nicht angebunden.',
    methoden: ['api', 'schluessel'],
    methodeAktiv: null,
    hinweisMethode: 'Nicht eingerichtet. Ein Schlüssel gehört als GitHub-Secret hinterlegt '
      + 'und in Actions verwendet, nicht in diese Seite.',
    berechtigungen: [],
    leseZugriffe: [],
    schreibZugriffe: [],
    freigabegrenzen: [],
    faehigkeiten: f({
      connect: 'ja', disconnect: 'ja',
      healthCheck: 'proxy', getUsage: 'proxy', getQuota: 'proxy', execute: 'proxy',
      getCapabilities: 'ja',
    }),
    kontingent: {
      ueberApiAbrufbar: false,
      quelle: 'https://platform.openai.com/usage',
      hinweis: 'Verbrauch steht im OpenAI-Dashboard. Aus dem Browser nicht abrufbar, '
        + 'ohne den Schlüssel preiszugeben.',
    },
    geheimnisAblage: 'noch keine',
    unterscheidung: {
      titel: 'Abonnement ist nicht gleich API-Guthaben',
      punkte: [
        'ChatGPT-Abonnement — die Chat-Oberfläche, für HQ-Aufrufe nicht verwendbar',
        'OpenAI-API-Zugang — eigener Vertrag, eigenes Guthaben',
        'API-Guthaben und API-Nutzung — unabhängig vom Abo',
        'Für HQ nutzbar sind ausschließlich Modelle des API-Zugangs',
      ],
    },
    links: {
      einrichten: 'https://platform.openai.com/api-keys',
      nutzung: 'https://platform.openai.com/usage',
      doku: 'https://platform.openai.com/docs',
    },
  },
  {
    id: 'obsidian',
    anbieter: 'Obsidian',
    dienst: 'Vault (vault/ im Repo)',
    logo: '🗄️',
    zweck: 'Das Gedächtnis: 98 Notizen in sechs Ebenen.',
    methoden: ['datei', 'api'],
    methodeAktiv: 'datei',
    hinweisMethode: 'Der Vault liegt versioniert im Repo — Zugriff läuft über den '
      + 'GitHub-Connector. obsidian:// öffnet eine Notiz lokal auf diesem Rechner. '
      + 'Ein Obsidian-MCP wäre eine Fehlerquelle ohne neue Fähigkeit.',
    berechtigungen: ['Dateizugriff über das Repo'],
    leseZugriffe: ['Notizen', 'Freigabe-Bilanz', 'Impuls-Strom'],
    schreibZugriffe: ['nur über Git-Commits mit Historie'],
    freigabegrenzen: [
      'share: internal → public ist eine menschliche Entscheidung mit eigenem Commit',
      '40-Governance/Security/ verlässt den Vault nie',
    ],
    faehigkeiten: f({
      connect: 'ja', disconnect: 'ja', healthCheck: 'ja', getCapabilities: 'ja',
      search: 'ja', read: 'ja', getRecentActivity: 'ja',
    }),
    kontingent: { ueberApiAbrufbar: false, quelle: null, hinweis: 'Kein Kontingent — eigene Dateien.' },
    geheimnisAblage: 'keine',
    links: {
      einrichten: 'https://help.obsidian.md/Extending+Obsidian/Obsidian+URI',
      nutzung: null,
      doku: 'https://help.obsidian.md/Extending+Obsidian/Obsidian+URI',
    },
  },
  {
    id: 'eventboerse',
    anbieter: 'Eventbörse',
    dienst: 'eventbörse.de (WordPress + SPA)',
    logo: '🎪',
    zweck: 'Das Produkt selbst.',
    methoden: ['api'],
    methodeAktiv: 'api',
    hinweisMethode: 'Erreichbarkeitsprüfung vom Browser aus. Die REST-Routen verlangen '
      + 'eine angemeldete Sitzung.',
    berechtigungen: ['öffentliche Erreichbarkeit'],
    leseZugriffe: ['HTTP-Status', 'Wissensbasis (assets/eb-knowledge.json)'],
    schreibZugriffe: [],
    freigabegrenzen: ['Deploys laufen ausschließlich über GitHub Actions'],
    faehigkeiten: f({
      connect: 'ja', healthCheck: 'ja', getCapabilities: 'ja', read: 'ja',
    }),
    kontingent: { ueberApiAbrufbar: false, quelle: null, hinweis: 'Kein Kontingent.' },
    geheimnisAblage: 'keine',
    links: {
      einrichten: null,
      nutzung: null,
      doku: 'https://xn--eventbrse-57a.de',
    },
  },
  {
    id: 'deployment',
    anbieter: 'IONOS / GitHub Actions',
    dienst: 'Hosting und Auslieferung',
    logo: '🚀',
    zweck: 'Push auf main → SFTP-Deploy.',
    methoden: ['api'],
    methodeAktiv: 'api',
    hinweisMethode: 'Status kommt über die GitHub-Actions-API. Die SFTP-Zugangsdaten '
      + 'liegen als GitHub-Secrets und erreichen weder HQ noch Browser.',
    berechtigungen: ['actions (lesend)', 'workflow_dispatch für Rollback'],
    leseZugriffe: ['Deploy-Läufe', 'Erfolg/Fehler', 'Dauer'],
    schreibZugriffe: ['Rollback auslösen'],
    freigabegrenzen: ['Rollback verlangt eine ausdrückliche Bestätigung im HQ'],
    faehigkeiten: f({
      connect: 'ja', healthCheck: 'ja', getCapabilities: 'ja',
      getRecentActivity: 'ja', read: 'ja', execute: 'ja',
    }),
    kontingent: {
      ueberApiAbrufbar: true,
      quelle: 'GitHub Actions Minuten (Konto-Ebene)',
      hinweis: 'Läuft über denselben GitHub-Token.',
    },
    geheimnisAblage: 'GitHub Secrets (IONOS_FTP_*)',
    links: {
      einrichten: 'https://docs.github.com/actions',
      nutzung: 'https://docs.github.com/en/rest/actions/workflow-runs',
      doku: 'https://docs.github.com/actions',
    },
  },
  {
    id: 'monitoring',
    anbieter: 'GitHub Actions',
    dienst: 'Site Monitor (alle 30 Minuten)',
    logo: '📡',
    zweck: 'Erreichbarkeit prüfen, bei Ausfall ein Issue öffnen.',
    methoden: ['api'],
    methodeAktiv: 'api',
    hinweisMethode: 'site-monitor.yml. Kein externer Dienst, keine zusätzlichen Zugangsdaten.',
    berechtigungen: ['actions (lesend)', 'issues (schreibend, durch den Workflow)'],
    leseZugriffe: ['Monitor-Läufe', 'gemeldete Ausfälle'],
    schreibZugriffe: [],
    freigabegrenzen: [],
    faehigkeiten: f({
      connect: 'ja', healthCheck: 'ja', getCapabilities: 'ja',
      getRecentActivity: 'ja', read: 'ja',
    }),
    kontingent: { ueberApiAbrufbar: false, quelle: null, hinweis: 'Teil der Actions-Minuten.' },
    geheimnisAblage: 'keine',
    links: {
      einrichten: null,
      nutzung: null,
      doku: 'https://docs.github.com/actions',
    },
  },
  {
    id: 'analytics',
    anbieter: '—',
    dienst: 'Analytics',
    logo: '📊',
    zweck: 'Reichweite und Nutzung messen — bewusst noch nicht eingerichtet.',
    methoden: ['api', 'schluessel'],
    methodeAktiv: null,
    hinweisMethode: 'Kein Analytics-Dienst angebunden. Bei der Auswahl zählt neben den '
      + 'Zahlen, was der Dienst über unsere Besucher erfährt.',
    berechtigungen: [],
    leseZugriffe: [],
    schreibZugriffe: [],
    freigabegrenzen: [],
    faehigkeiten: f({ connect: 'ja', getCapabilities: 'ja' }),
    kontingent: { ueberApiAbrufbar: false, quelle: null, hinweis: 'Nicht eingerichtet.' },
    geheimnisAblage: 'noch keine',
    links: { einrichten: null, nutzung: null, doku: null },
  },
  {
    id: 'mail-kalender',
    anbieter: '—',
    dienst: 'E-Mail und Kalender',
    logo: '📬',
    zweck: 'Kontaktanfragen als Ereignis ins HQ holen — noch nicht eingerichtet.',
    methoden: ['oauth', 'mcp'],
    methodeAktiv: null,
    hinweisMethode: 'Nicht verbunden. Wenn, dann ausschließlich lesend und eng gefiltert — '
      + 'ein Postfach ist die Summe fremder personenbezogener Daten.',
    berechtigungen: [],
    leseZugriffe: [],
    schreibZugriffe: [],
    freigabegrenzen: ['nur lesend', 'keine Inhalte in den Vault'],
    faehigkeiten: f({ connect: 'ja', getCapabilities: 'ja' }),
    kontingent: { ueberApiAbrufbar: false, quelle: null, hinweis: 'Nicht eingerichtet.' },
    geheimnisAblage: 'noch keine',
    links: { einrichten: null, nutzung: null, doku: null },
  },
];

// ── Prüfung ─────────────────────────────────────────────────────────────────

function pruefen(liste) {
  const fehler = [];
  const ids = new Set();

  for (const c of liste) {
    const melde = (t) => fehler.push(`${c.id || '(ohne id)'}: ${t}`);

    if (!c.id || !/^[a-z][a-z0-9-]*$/.test(c.id)) melde('id fehlt oder ist kein Kleinbuchstaben-Slug');
    if (ids.has(c.id)) melde('id doppelt vergeben');
    ids.add(c.id);

    for (const feld of ['anbieter', 'dienst', 'zweck', 'geheimnisAblage', 'hinweisMethode']) {
      if (!c[feld]) melde(`Pflichtfeld „${feld}" fehlt`);
    }

    if (!Array.isArray(c.methoden) || !c.methoden.length) melde('keine Verbindungsmethode angegeben');
    for (const m of c.methoden || []) {
      if (!METHODEN[m]) melde(`unbekannte Verbindungsmethode „${m}"`);
    }
    if (c.methodeAktiv && !c.methoden.includes(c.methodeAktiv)) {
      melde(`methodeAktiv „${c.methodeAktiv}" steht nicht in methoden`);
    }

    // Fähigkeiten: vollständig und nur mit den drei erlaubten Werten. Ein
    // fehlender Eintrag wäre eine Lücke, in die sich später ein „ja" schleicht.
    for (const fn of FUNKTIONEN) {
      const v = c.faehigkeiten && c.faehigkeiten[fn];
      if (!v) melde(`Fähigkeit „${fn}" nicht deklariert`);
      else if (!['ja', 'nein', 'proxy'].includes(v)) melde(`Fähigkeit „${fn}": unzulässiger Wert „${v}"`);
    }

    // Ein Connector ohne aktive Methode kann nichts können.
    if (!c.methodeAktiv) {
      const behauptet = FUNKTIONEN.filter((fn) => c.faehigkeiten[fn] === 'ja'
        && !['connect', 'disconnect', 'getCapabilities'].includes(fn));
      if (behauptet.length) {
        melde(`nicht eingerichtet, behauptet aber: ${behauptet.join(', ')}`);
      }
    }

    if (!c.kontingent || typeof c.kontingent.ueberApiAbrufbar !== 'boolean') {
      melde('kontingent.ueberApiAbrufbar muss true oder false sein');
    } else if (c.kontingent.ueberApiAbrufbar && !c.kontingent.quelle) {
      melde('Kontingent gilt als abrufbar, nennt aber keine Quelle');
    }

    for (const [name, url] of Object.entries(c.links || {})) {
      if (url && !/^https:\/\//.test(url)) melde(`Link „${name}" ist nicht https`);
    }

    // Geheimnisse: nicht im Katalog, nirgends. Auch nicht „nur als Beispiel".
    const treffer = ersterTreffer(JSON.stringify(c), GEHEIMNISSE);
    if (treffer) melde(`Verbotsmuster im Katalogeintrag: ${treffer.why}`);

    // Ein Katalog darf keinen Status behaupten — der entsteht zur Laufzeit.
    if ('status' in c || 'letzteSynchronisierung' in c || 'letzterFehler' in c) {
      melde('Laufzeit-Zustand gehört nicht in den Katalog (status/letzteSynchronisierung/letzterFehler)');
    }
  }
  return fehler;
}

// ── Los ─────────────────────────────────────────────────────────────────────

const katalog = {
  version: 1,
  erzeugt: new Date().toISOString().slice(0, 10),
  hinweis: 'Katalog, kein Zustand. Erzeugt von scripts/connectors.mjs — nicht von Hand '
    + 'bearbeiten. Ob eine Verbindung steht, entscheidet ausschließlich eine echte '
    + 'Prüfung zur Laufzeit.',
  methoden: METHODEN,
  funktionen: FUNKTIONEN,
  connectors: CONNECTORS,
};

if (CHECK) {
  const fehler = pruefen(CONNECTORS);
  let ausgeliefert = null;
  try {
    ausgeliefert = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    fehler.push('assets/eb-connectors.json fehlt oder ist kaputt — bitte neu erzeugen.');
  }
  if (ausgeliefert && JSON.stringify(ausgeliefert) !== JSON.stringify(katalog)) {
    // Nur das Datum unterscheidet sich? Dann ist es kein Drift.
    const a = { ...ausgeliefert, erzeugt: null };
    const b = { ...katalog, erzeugt: null };
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      fehler.push('ausgelieferter Katalog weicht von den Definitionen ab — '
        + 'node scripts/connectors.mjs ausführen und mitcommitten.');
    }
  }

  console.log('── Connector-Verzeichnis ────────────────────────');
  console.log(`Connectors          : ${CONNECTORS.length}`);
  console.log(`Eingerichtet        : ${CONNECTORS.filter((c) => c.methodeAktiv).length}`);
  console.log(`Kontingent per API  : ${CONNECTORS.filter((c) => c.kontingent.ueberApiAbrufbar).length}`);
  if (fehler.length) {
    console.log(`\n⛔ ${fehler.length} Verstoß(e):`);
    for (const x of fehler) console.log(`   ✗ ${x}`);
    console.log('─────────────────────────────────────────────────');
    process.exit(1);
  }
  console.log('✓ Katalog vollständig, keine Geheimnisse, kein vorgetäuschter Zustand.');
  console.log('─────────────────────────────────────────────────');
} else {
  const fehler = pruefen(CONNECTORS);
  if (fehler.length) {
    console.error('⛔ Katalog fehlerhaft — nichts geschrieben:');
    for (const x of fehler) console.error(`   ✗ ${x}`);
    process.exit(1);
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(katalog), 'utf8');
  console.log(`✓ ${relative(ROOT, OUT)} — ${CONNECTORS.length} Connectors`);
}
