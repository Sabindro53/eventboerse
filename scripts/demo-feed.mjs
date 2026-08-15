#!/usr/bin/env node
/**
 * demo-feed.mjs — täglich frische, ehrliche Demo-Inhalte.
 *
 * Warum es das gibt: Die Demo-Beiträge im Feed hingen an einem fest
 * einprogrammierten Anker (`EB_DEMO_ANCHOR_MS`). Der altert — nach einem
 * halben Jahr steht unter jedem Beitrag „vor 6 Monaten" und die Seite wirkt
 * verlassen. Die naheliegende Abhilfe (Zeiten auf „jetzt" setzen) wäre eine
 * Lüge: es wurde nichts gepostet.
 *
 * Dieses Skript löst beides: Es erzeugt jeden Tag einen neuen Satz Beiträge
 * aus dem gesamten Event-Universum und gibt ihnen Erstellzeiten, die
 * **mindestens 10 Tage** zurückliegen. Der Feed bleibt lebendig, ohne je
 * „gestern" zu behaupten.
 *
 * Deterministisch: derselbe Tag ⇒ dieselbe Ausgabe. Ein erneuter Lauf am
 * gleichen Tag erzeugt keinen Diff, die Routine committet also nichts umsonst.
 *
 * Nutzung:
 *   node scripts/demo-feed.mjs                 # für heute erzeugen
 *   node scripts/demo-feed.mjs --datum 2026-08-01
 *   node scripts/demo-feed.mjs --check         # vorhandene Datei prüfen (CI)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'eb-demo-feed.json');
const UNIVERSUM_DATEI = join(ROOT, 'js', 'modules', 'search', '11-suche-ki.js');

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const datumArg = argv[argv.indexOf('--datum') + 1];
const DATUM = /^\d{4}-\d{2}-\d{2}$/.test(datumArg || '') ? datumArg : new Date().toISOString().slice(0, 10);

/** Nichts darf frischer wirken als das. Der Kern der Ehrlichkeitsregel. */
const MIN_TAGE_ZURUECK = 10;
const MAX_TAGE_ZURUECK = 74;
const ANZAHL = 9;

// ── Zufall, der sich wiederholt ─────────────────────────────────────────────
// Ein fester Startwert pro Tag: gleicher Tag ⇒ gleiche Ausgabe ⇒ kein Diff.
function saat(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function wuerfel(startwert) {
  let s = startwert || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ── Das Event-Universum aus dem Frontend lesen ──────────────────────────────
// Eine Quelle der Wahrheit: die Liste steht in js/modules/search/11-suche-ki.js.
// Wird dort ein Event-Typ ergänzt, taucht er ohne Zutun im Demo-Feed auf.
async function eventUniversum() {
  const quelle = await readFile(UNIVERSUM_DATEI, 'utf8');
  const m = quelle.match(/var EB_EVENT_UNIVERSE = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error('EB_EVENT_UNIVERSE nicht gefunden in ' + relative(ROOT, UNIVERSUM_DATEI));
  const liste = new Function('return ' + m[1])();
  return liste.filter((e) => e.key !== 'custom');
}

// ── Bausteine ───────────────────────────────────────────────────────────────

// `gesucht` ist die Formulierung nach „Suche …". Ohne sie entsteht
// „suche eine Eventplanung" — grammatisch korrekt, aber niemand redet so.
const DIENSTE = [
  { key: 'dj',         label: 'DJ',              hash: 'DJ',           von: 400, bis: 1200, gesucht: 'einen DJ' },
  { key: 'catering',   label: 'Catering',        hash: 'Catering',     von: 25,  bis: 85, proPerson: true, gesucht: 'ein Catering' },
  { key: 'foto',       label: 'Fotografie',      hash: 'Fotograf',     von: 600, bis: 2200, gesucht: 'jemanden für die Fotos' },
  { key: 'location',   label: 'Location',        hash: 'Location',     von: 800, bis: 4500, gesucht: 'eine Location' },
  { key: 'deko',       label: 'Dekoration',      hash: 'Deko',         von: 250, bis: 1500, gesucht: 'Unterstützung bei der Deko' },
  { key: 'licht',      label: 'Licht & Technik', hash: 'Eventtechnik', von: 350, bis: 2000, gesucht: 'jemanden für Licht und Ton' },
  { key: 'moderation', label: 'Moderation',      hash: 'Moderation',   von: 300, bis: 1400, gesucht: 'jemanden für die Moderation' },
  { key: 'florist',    label: 'Floristik',       hash: 'Floristik',    von: 200, bis: 1200, gesucht: 'Floristik' },
  { key: 'planung',    label: 'Eventplanung',    hash: 'Eventplanung', von: 500, bis: 3500, gesucht: 'Unterstützung bei der Planung' },
  { key: 'pyro',       label: 'Pyrotechnik',     hash: 'Pyro',         von: 400, bis: 2500, gesucht: 'jemanden für Pyrotechnik' },
];

const STAEDTE = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Leipzig', 'Dresden', 'Hannover', 'Nürnberg', 'Bremen', 'Münster', 'Freiburg',
];

// Jeder Demo-Beitrag gehört zu genau einem stabilen Demo-Account. Die IDs und
// Avatar-Seeds dürfen sich weder mit der Position im Feed noch mit dem Datum
// ändern: Sonst würde derselbe Name morgen auf ein anderes Profil zeigen oder
// sogar zweimal am selben Tag zwei verschiedene Accounts erhalten.
const PLANER = [
  { id: 91101, name: 'Julia & Mark',                  role: 'Private Eventplanung', location: 'Berlin' },
  { id: 91102, name: 'Familie Weber',                 role: 'Private Eventplanung', location: 'Hamburg' },
  { id: 91103, name: 'Sarah L.',                      role: 'Eventplanerin',         location: 'München' },
  { id: 91104, name: 'Tobias R.',                     role: 'Eventplaner',           location: 'Köln' },
  { id: 91105, name: 'Anne & Jonas',                  role: 'Private Eventplanung', location: 'Hamburg' },
  { id: 91106, name: 'Kulturverein Nordstadt',        role: 'Kulturveranstalter',    location: 'Hannover' },
  { id: 91107, name: 'Mira P.',                       role: 'Eventplanerin',         location: 'Stuttgart' },
  { id: 91108, name: 'Team Nordlicht',                role: 'Eventteam',             location: 'Hamburg' },
  { id: 91109, name: 'Daniel H.',                     role: 'Eventplaner',           location: 'Frankfurt' },
  { id: 91110, name: 'Lena & Ben',                    role: 'Private Eventplanung', location: 'Leipzig' },
  { id: 91111, name: 'Elternbeirat Grundschule Ost',  role: 'Schulveranstalter',     location: 'Dresden' },
  { id: 91112, name: 'Jasmin K.',                     role: 'Eventplanerin',         location: 'Düsseldorf' },
  { id: 91113, name: 'Studio Hellwach',               role: 'Kreativteam',           location: 'Frankfurt' },
  { id: 91114, name: 'Familie Öztürk',                role: 'Private Eventplanung', location: 'Bremen' },
];

const ANBIETER = [
  { id: 91201, name: 'Beat Republic',             role: 'DJ & Musik',          location: 'Berlin' },
  { id: 91202, name: 'Tafelrunde Catering',        role: 'Catering',            location: 'Nürnberg' },
  { id: 91203, name: 'Lichtwerk Events',           role: 'Licht & Technik',     location: 'Köln' },
  { id: 91204, name: 'Studio Nordlicht',           role: 'Foto & Video',        location: 'Münster' },
  { id: 91205, name: 'Salon Blütenzeit',           role: 'Floristik',           location: 'Freiburg' },
  { id: 91206, name: 'Pixelherz Fotografie',       role: 'Fotografie',          location: 'München' },
  { id: 91207, name: 'Bühne frei Moderation',      role: 'Moderation',          location: 'Düsseldorf' },
  { id: 91208, name: 'Halle 7 Eventräume',         role: 'Eventlocation',       location: 'Leipzig' },
  { id: 91209, name: 'Konfetti & Co.',             role: 'Dekoration',          location: 'Frankfurt' },
  { id: 91210, name: 'Nordstern Technik',          role: 'Eventtechnik',        location: 'Hamburg' },
  { id: 91211, name: 'Feuerlinie Pyro',            role: 'Pyrotechnik',         location: 'Dresden' },
];

const DEMO_ACCOUNTS = [...PLANER, ...ANBIETER].map((account) => ({
  ...account,
  avatarSeed: `demo-account-${account.id}`,
  since: '2026',
  description: `${account.name} ist ein Demo-Account für Beispielbeiträge im `
    + 'Eventbörse-Community-Feed. Das Profil zeigt die Zuordnung des Beitrags '
    + 'und stellt keine echte Person oder Firma dar.',
  tags: ['Demo-Account', 'Community'],
  _isDemo: true,
}));

/** Sucht-Beiträge: Planer beschreibt ein Vorhaben. */
const SUCHE_VORLAGEN = [
  (e, d, o) => `Wir planen ${e.artikelAkk} ${e.kurz} in ${o} und suchen noch ${d.gesucht}. Wer hat Erfahrung mit dem Format?`,
  (e, d, o) => `${e.artikelNomGross} ${e.kurz} steht an — ${o}, überschaubarer Rahmen. Beim Thema ${d.kurz} sind wir noch offen. Empfehlungen sehr willkommen!`,
  // Ohne den Punkt nach `gesucht` entsteht „Suche jemanden für die Moderation
  // für eine Abschlussfeier" — das doppelte „für" fällt sofort auf.
  (e, d, o) => `Suche ${d.gesucht}. Anlass ist ${e.artikelNom} ${e.kurz} in ${o}. Termin steht, Budget ist verhandelbar, Qualität geht vor.`,
  (e, d, o) => `Zum ersten Mal ${e.artikelAkk} ${e.kurz} auf die Beine gestellt. ${d.beim} brauchen wir jemanden, der uns berät statt nur ausführt. Raum ${o}.`,
  (e, d, o) => `Anfrage: ${d.kurz} für ${e.artikelAkk} ${e.kurz}, ${o}. Wir sind flexibel bei Uhrzeit und Aufbau, brauchen aber jemanden mit eigenem Material.`,
];

/** Biete-Beiträge: Dienstleister stellt sich vor. */
const BIETE_VORLAGEN = [
  (e, d, o) => `${d.kurz} mit Schwerpunkt auf ${e.kurz}-Formaten. Raum ${o} und Umgebung, eigenes Equipment, Auf- und Abbau inklusive.`,
  (e, d, o) => `Noch Termine frei: ${d.kurz} in ${o}. Besonders vertraut mit dem Format ${e.label} — dort zählen andere Details als bei Standardveranstaltungen.`,
  (e, d, o) => `Wir übernehmen ${d.kurz} für ${e.label} und ähnliche Formate im Raum ${o}. Referenzen und Ablaufplan gibt es vorab, damit nichts überrascht.`,
  (e, d, o) => `${d.kurz} aus ${o}. Das Format ${e.label} liegt uns besonders — kleine Runden genauso wie volle Häuser.`,
];

/** Kennengelernt-Beiträge: Rückblick auf ein gelaufenes Event. */
const MET_VORLAGEN = [
  (e, d, o) => `Rückblick auf ${e.artikelAkk} ${e.kurz} in ${o}: Die Zusammenarbeit beim Thema ${d.kurz} war unkompliziert und hat den Abend getragen.`,
  (e, d, o) => `${e.artikelNomGross} ${e.kurz} in ${o} ist durch. Ohne das Team für ${d.kurz} wäre es halb so schön geworden — danke dafür.`,
  (e, d, o) => `Nach ${e.artikelDat} ${e.kurz} in ${o}: Wir nehmen mit, wie viel gutes ${d.kurz} ausmacht. Klare Empfehlung.`,
];

/** Deutsche Artikel — ohne sie klingen erzeugte Sätze sofort maschinell. */
const GENUS = {
  hochzeit: 'f', verlobung: 'f', geburtstag: 'm', kinderfest: 'n', taufe: 'f',
  jubilaeum: 'n', abschluss: 'f', trauerfeier: 'f', firmenfeier: 'f', konferenz: 'f',
  messe: 'f', produktlaunch: 'm', workshop: 'm', netzwerk: 'n', konzert: 'n',
  festival: 'n', theater: 'm', vernissage: 'f', filmabend: 'm', tabletop: 'f',
  lan: 'f', cosplay: 'n', quiz: 'm', escape: 'n', sportevent: 'n', outdoor: 'n',
  retreat: 'n', saison: 'n', privatfeier: 'f',
  // Genus folgt der PROSA-Form, nicht dem Label: „Tabletop-Runde" ist
  // feminin, „LAN-Party" ebenso, „Cosplay-Treffen" neutrum.

};
const DIENST_GENUS = {
  dj: 'm', catering: 'n', foto: 'f', location: 'f', deko: 'f', licht: 'f',
  moderation: 'f', florist: 'f', planung: 'f', pyro: 'f',
};
const NOM = { m: 'ein', f: 'eine', n: 'ein' };
const AKK = { m: 'einen', f: 'eine', n: 'ein' };
const DAT = { m: 'einem', f: 'einer', n: 'einem' };
const NOM_GROSS = { m: 'Ein', f: 'Eine', n: 'Ein' };

/** „Messe & Ausstellung" liest sich im Fließtext schlecht — hier zählt der Kern. */
function kurzform(label) {
  return String(label).split(/\s*[&·]\s*/)[0].trim();
}

/**
 * Für ein paar Event-Typen greift die Kurzform daneben: „Ein Outdoor steht an"
 * sagt niemand. Diese Handvoll bekommt eine eigene Fließtext-Form; alle
 * anderen fahren weiter mit kurzform().
 */
const PROSA = {
  outdoor: 'Outdoor-Event', lan: 'LAN-Party', netzwerk: 'Netzwerk-Event',
  escape: 'Krimidinner', theater: 'Theaterabend', saison: 'Saisonfest',
  sportevent: 'Sport-Event', cosplay: 'Cosplay-Treffen', tabletop: 'Tabletop-Runde',
  quiz: 'Quizabend', privatfeier: 'private Feier', abschluss: 'Abschlussfeier',
  taufe: 'Taufe', filmabend: 'Filmabend', retreat: 'Retreat',
};
const prosaform = (ev) => PROSA[ev.key] || kurzform(ev.label);

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
  'August', 'September', 'Oktober', 'November', 'Dezember'];

function deutschesDatum(d) {
  return `${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function euro(n) {
  return n.toLocaleString('de-DE');
}

// ── Erzeugung ───────────────────────────────────────────────────────────────

function baue(datum, universum) {
  const r = wuerfel(saat('eb-demo-feed:' + datum));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const zahl = (von, bis) => von + Math.floor(r() * (bis - von + 1));

  const anker = new Date(`${datum}T10:00:00.000Z`);
  const zutaten = [];
  const belegteTage = new Set();

  for (let i = 0; i < ANZAHL; i++) {
    const ev = pick(universum);
    const dienst = pick(DIENSTE);
    const ort = pick(STAEDTE);

    const g = GENUS[ev.key] || 'n';
    const dg = DIENST_GENUS[dienst.key] || 'n';
    const e = { ...ev, kurz: prosaform(ev), artikelNom: NOM[g], artikelAkk: AKK[g],
      artikelDat: DAT[g], artikelNomGross: NOM_GROSS[g] };
    const dKurz = kurzform(dienst.label);
    const d = { ...dienst, kurz: dKurz, artikelNom: NOM[dg], artikelAkk: AKK[dg],
      artikelDat: DAT[dg],
      // „beim DJ" / „bei der Location" — bestimmter Dativ, fertig formuliert.
      beim: (dg === 'f' ? 'Bei der ' : 'Beim ') + dKurz };

    // Typ-Mischung: mehr Gesuche als Angebote, wenige Rückblicke.
    const w = r();
    const type = w < 0.5 ? 'suche-dienstleister' : (w < 0.85 ? 'suche-events' : 'met');

    // Ehrlichkeitsregel: nie frischer als MIN_TAGE_ZURUECK. Jeder Beitrag
    // bekommt einen eigenen Tag, damit die Zeitachse nicht klumpt.
    let tage = zahl(MIN_TAGE_ZURUECK, MAX_TAGE_ZURUECK);
    while (belegteTage.has(tage)) tage = tage < MAX_TAGE_ZURUECK ? tage + 1 : MIN_TAGE_ZURUECK;
    belegteTage.add(tage);
    const zeit = new Date(anker.getTime() - tage * 86400000);

    // Eventtermin liegt in der Zukunft — ein Gesuch für gestern ergibt keinen Sinn.
    const terminIn = zahl(28, 300);
    const termin = new Date(anker.getTime() + terminIn * 86400000);

    const proPerson = dienst.proPerson;
    const budgetZahl = zahl(dienst.von, dienst.bis);
    const budget = type === 'suche-dienstleister'
      ? `bis ${euro(Math.round(budgetZahl / 50) * 50)} €${proPerson ? ' / Person' : ''}`
      : `ab ${euro(Math.round(dienst.von / 10) * 10)} €${proPerson ? ' / Person' : ''}`;

    const autor = type === 'suche-dienstleister' ? pick(PLANER)
      : type === 'suche-events' ? pick(ANBIETER) : pick(PLANER);

    zutaten.push({
      type, e, d, ev, dienst, ort, autor, tage, zeit, termin, budget,
      vorlagenWunsch: Math.floor(r() * 5),
      likes: zahl(3, 96),
      comments: zahl(0, 14),
    });
  }

  // Erst sortieren, dann texten. Reiner Zufall setzt sonst gern zwei Beiträge
  // mit derselben Satzvorlage direkt untereinander — im Feed liest sich das
  // sofort maschinell. Die Vorlage wird deshalb in ANZEIGE-Reihenfolge
  // vergeben und rückt weiter, wenn der Vorgänger dieselbe hatte.
  zutaten.sort((a, b) => a.tage - b.tage); // neueste zuerst

  const zuletzt = new Map();
  const posts = zutaten.map((z, i) => {
    const satzArt = z.type === 'suche-dienstleister' ? 'suche'
      : z.type === 'suche-events' ? 'biete' : 'met';
    const satzSet = satzArt === 'suche' ? SUCHE_VORLAGEN
      : satzArt === 'biete' ? BIETE_VORLAGEN : MET_VORLAGEN;
    let idx = z.vorlagenWunsch % satzSet.length;
    if (zuletzt.get(satzArt) === idx) idx = (idx + 1) % satzSet.length;
    zuletzt.set(satzArt, idx);

    const text = satzSet[idx](z.e, z.d, z.ort);
    const hashtags = `#${z.ev.label.replace(/[^A-Za-zÄÖÜäöüß]/g, '')} #${z.d.hash} #${z.ort}`;

    return {
      id: `df-${datum}-${i + 1}`,
      type: z.type,
      author: z.autor.name,
      authorId: z.autor.id,
      avatarSeed: `demo-account-${z.autor.id}`,
      title: z.type === 'met' ? null
        : z.type === 'suche-dienstleister'
          ? `${z.dienst.label} für ${z.ev.label} gesucht`
          : `${z.dienst.label} für ${z.ev.label} — Termine frei`,
      category: z.dienst.label,
      categoryKey: z.dienst.key,
      eventKey: z.ev.key,
      eventLabel: z.ev.label,
      emoji: z.ev.emoji,
      location: `${z.ort}${z.type === 'suche-events' ? ' & Umgebung' : ''}`,
      date: z.type === 'met' ? null : deutschesDatum(z.termin),
      budget: z.type === 'met' ? null : z.budget,
      content: `${text} ${hashtags}`,
      image: null,
      tageZurueck: z.tage,
      time: z.zeit.toISOString(),
      likes: z.likes,
      comments: z.comments,
      metAt: z.type === 'met'
        ? { eventName: `${z.ev.label} ${z.ort}`, date: z.zeit.toISOString().slice(0, 10) }
        : null,
      _isDemo: true,
    };
  });

  return {
    version: 2,
    generated: datum,
    anchor: anker.toISOString(),
    minTageZurueck: MIN_TAGE_ZURUECK,
    note: 'Automatisch erzeugt von scripts/demo-feed.mjs. Demo-Inhalte, keine echten '
      + 'Beiträge — deshalb liegt jede Erstellzeit mindestens '
      + MIN_TAGE_ZURUECK + ' Tage zurück. Nicht von Hand bearbeiten.',
    // Die Profile reisen zusammen mit dem Feed. So kann jeder Beitrag auch
    // ohne echten WordPress-Testnutzer zuverlässig sein Demo-Profil öffnen.
    accounts: DEMO_ACCOUNTS,
    posts,
  };
}

// ── Prüfung ─────────────────────────────────────────────────────────────────

async function pruefen() {
  let feed;
  try {
    feed = JSON.parse(await readFile(OUT, 'utf8'));
  } catch (e) {
    console.error(`⛔ assets/eb-demo-feed.json fehlt oder ist kaputt: ${e.message}`);
    process.exit(1);
  }
  const fehler = [];
  if (feed.version !== 2) fehler.push(`unbekannte version: ${feed.version}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(feed.generated || '')) fehler.push('generated ist kein ISO-Datum');
  if (!Array.isArray(feed.posts) || !feed.posts.length) fehler.push('keine Beiträge enthalten');
  if (!Array.isArray(feed.accounts) || !feed.accounts.length) fehler.push('keine Demo-Accounts enthalten');

  const accountsById = new Map();
  const accountIdsByName = new Map();
  for (const account of feed.accounts || []) {
    if (!Number.isInteger(account.id) || account.id <= 0) {
      fehler.push(`Demo-Account ohne gültige ID: ${account.name || '(ohne Namen)'}`);
      continue;
    }
    if (!account.name || !account.avatarSeed || !account.description) {
      fehler.push(`Demo-Account ${account.id}: Profil ist unvollständig.`);
    }
    if (accountsById.has(account.id)) fehler.push(`Demo-Account-ID ${account.id} ist doppelt.`);
    if (accountIdsByName.has(account.name) && accountIdsByName.get(account.name) !== account.id) {
      fehler.push(`${account.name}: derselbe Autor hat mehrere Account-IDs.`);
    }
    accountsById.set(account.id, account);
    accountIdsByName.set(account.name, account.id);
  }

  const anker = Date.parse(feed.anchor);
  for (const p of feed.posts || []) {
    const account = accountsById.get(p.authorId);
    if (!account) {
      fehler.push(`${p.id}: authorId ${p.authorId} hat kein Demo-Profil.`);
    } else {
      if (p.author !== account.name) fehler.push(`${p.id}: Autorname passt nicht zum Demo-Account.`);
      if (p.avatarSeed !== account.avatarSeed) fehler.push(`${p.id}: Avatar passt nicht zum Demo-Account.`);
    }
    const t = Date.parse(p.time);
    if (isNaN(t)) { fehler.push(`${p.id}: time ist kein Zeitstempel`); continue; }
    const tage = (anker - t) / 86400000;
    // Die Ehrlichkeitsregel — der eigentliche Grund für diese Prüfung.
    if (tage < MIN_TAGE_ZURUECK) {
      fehler.push(`${p.id}: liegt nur ${tage.toFixed(1)} Tage zurück — Demo-Inhalte `
        + `dürfen nie frisch wirken (Minimum ${MIN_TAGE_ZURUECK}).`);
    }
    if (t > anker) fehler.push(`${p.id}: Erstellzeit liegt in der Zukunft.`);
    if (!p.content || p.content.length < 30) fehler.push(`${p.id}: Inhalt zu kurz.`);
  }

  // Determinismus: derselbe Tag muss dieselbe Datei ergeben, sonst produziert
  // die Tagesroutine jeden Lauf einen Diff und deployt umsonst.
  const neu = baue(feed.generated, await eventUniversum());
  if (JSON.stringify(neu) !== JSON.stringify(feed)) {
    fehler.push('nicht reproduzierbar — erneutes Erzeugen für '
      + feed.generated + ' liefert ein anderes Ergebnis.');
  }

  console.log('── Demo-Feed ────────────────────────────────────');
  console.log(`Erzeugt am          : ${feed.generated}`);
  console.log(`Beiträge            : ${(feed.posts || []).length}`);
  console.log(`Älteste/jüngste     : ${Math.max(...feed.posts.map(p => p.tageZurueck))} / `
    + `${Math.min(...feed.posts.map(p => p.tageZurueck))} Tage zurück`);
  if (fehler.length) {
    console.log(`\n⛔ ${fehler.length} Verstoß(e):`);
    for (const f of fehler) console.log(`   ✗ ${f}`);
    console.log('─────────────────────────────────────────────────');
    process.exit(1);
  }
  console.log('✓ Ehrlich (nichts wirkt frisch) und reproduzierbar.');
  console.log('─────────────────────────────────────────────────');
}

// ── Los ─────────────────────────────────────────────────────────────────────

if (CHECK) {
  await pruefen();
} else {
  const feed = baue(DATUM, await eventUniversum());
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(feed), 'utf8');
  console.log(`✓ ${relative(ROOT, OUT)} — ${feed.posts.length} Beiträge für ${DATUM}`);
  console.log(`  Zeitspanne: ${Math.min(...feed.posts.map(p => p.tageZurueck))}–`
    + `${Math.max(...feed.posts.map(p => p.tageZurueck))} Tage zurück (Minimum ${MIN_TAGE_ZURUECK}).`);
}
