#!/usr/bin/env node
/**
 * aktivitaeten.mjs — was ist in meiner Nähe los?
 *
 * Erster Baustein der Entdeckungs-Ebene (vault/10-Produkt/Vision-Plattform.md,
 * Schritt 3). Sammelt Aktivitäten im Umkreis **mehrerer Städte** aus
 * **sauberen** Quellen und schreibt sie nach `assets/eb-aktivitaeten.json`.
 *
 * ── DIE DATEI SAGT, WORÜBER SIE ETWAS SAGT ──────────────────────────────
 *
 * `gebiete` führt die Städte, für die wirklich eine Antwort vorlag. Alles
 * ausserhalb ist **nicht erfasst** — und die Ansicht sagt das dann auch,
 * statt „hier ist nichts los". Der Unterschied ist derselbe wie zwischen
 * „geprüft und sauber" und „nicht geprüft".
 *
 * ZWEI QUELLEN, bewusst wenige:
 *   · OpenLigaDB   — Heimspiele des 1. FC Köln (frei, ohne Schlüssel)
 *   · OpenStreetMap/Overpass — Orte mit Erlebniswert: Kino, Escape-Room,
 *     Kletterhalle, Schwimmbad, Museum, Theater, Zoo (ODbL, Namensnennung)
 *
 * NICHT dabei und warum: **Facebook** hat die öffentliche Events-API 2018
 * abgeschaltet — es gibt keinen legalen Weg dorthin. **Google Places**
 * liefert Orte ohne Termine und verbietet in der Lizenz ausdrücklich, daraus
 * eine eigene Datenbank zu bauen. Beide standen in der ursprünglichen Idee;
 * beide tragen nicht.
 *
 * ── WARUM ES EINEN --aus-SCHALTER GIBT ──────────────────────────────────
 *
 * Der Abruf braucht Netz. Die Agent-Umgebung hat keins (`403 to CONNECT`
 * für beide Hosts). Genau daran ist `scripts/localize-demo-images.mjs`
 * gestorben: es wurde geschrieben, konnte nie ausgeführt werden und ist
 * **nie gelaufen** — steht heute als Warnung in CLAUDE.md.
 *
 * Deshalb ist dieses Skript zweigeteilt: **Holen** braucht Netz und läuft
 * in der Tagesroutine, **Umwandeln und Prüfen** läuft überall. `--aus`
 * nimmt eine gespeicherte Rohantwort und erzeugt daraus dieselbe Ausgabe
 * wie der echte Abruf. Damit ist die ganze Logik prüfbar, ohne einen
 * einzigen Netzaufruf.
 *
 * Nutzung:
 *   node scripts/aktivitaeten.mjs --holen        # abrufen (braucht Netz)
 *   node scripts/aktivitaeten.mjs --aus roh.json # aus Rohdaten erzeugen
 *   node scripts/aktivitaeten.mjs --check        # CI-Tor
 *   node scripts/aktivitaeten.mjs                # Bericht
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'eb-aktivitaeten.json');

/**
 * Die erfassten Gebiete.
 *
 * ── WARUM DAS EINE LISTE IST UND KEIN PUNKT ─────────────────────────────
 *
 * Bis zum 09.09.2026 stand hier ein einziger Punkt: Köln. Die Ansicht
 * meldete jedem Besucher ausserhalb dieses Kreises „im Umkreis von 50 km
 * ist gerade nichts eingetragen" — ein Satz ÜBER DIE GEGEND, abgegeben
 * über eine Gegend, in die wir nie gesehen haben. Wer in Berlin steht,
 * bekam die Auskunft, in Berlin sei nichts los.
 *
 * Das ist dieselbe Fehlerklasse wie der tote Gitleaks-Scan, nur an der
 * Oberfläche: eine Entwarnung, die der Prüfer nicht decken kann.
 *
 * `verein` entscheidet, welches Heimspiel zu welchem Gebiet gehört.
 * OpenLigaDB liefert alle Spiele der Liga; ohne diese Zuordnung landete
 * ein Auswärtsspiel als Vorschlag in der falschen Stadt.
 */
export const STAEDTE = [
  { stadt: 'Köln', lat: 50.9413, lon: 6.9583, umkreisKm: 50, verein: /FC Köln/i },
  { stadt: 'Düsseldorf', lat: 51.2277, lon: 6.7735, umkreisKm: 50, verein: /Fortuna Düsseldorf/i },
  { stadt: 'Dortmund', lat: 51.5136, lon: 7.4653, umkreisKm: 50, verein: /Borussia Dortmund|Schalke/i },
  { stadt: 'Berlin', lat: 52.5200, lon: 13.4050, umkreisKm: 50, verein: /Union Berlin|Hertha/i },
  { stadt: 'Hamburg', lat: 53.5511, lon: 9.9937, umkreisKm: 50, verein: /Hamburger SV|St\. Pauli/i },
  { stadt: 'München', lat: 48.1372, lon: 11.5755, umkreisKm: 50, verein: /Bayern München|1860 München/i },
  { stadt: 'Frankfurt', lat: 50.1109, lon: 8.6821, umkreisKm: 50, verein: /Eintracht Frankfurt/i },
  { stadt: 'Stuttgart', lat: 48.7758, lon: 9.1829, umkreisKm: 50, verein: /VfB Stuttgart/i },
];

/**
 * Höchstens so viele Orte je Gebiet.
 *
 * Der Deckel ist eine Auslieferungsentscheidung, keine Datenfrage: die
 * Datei geht als Ganzes an den Browser. Sechs Gebiete ohne Deckel wären
 * einige tausend Einträge — für eine Ansicht, die 24 je Abschnitt zeigt.
 * Genommen wird das Nächstgelegene, nicht das Erstbeste.
 */
export const MAX_JE_GEBIET = 100;

/** Rückwärtskompatibel: das erste Gebiet ist die Mitte der Datei. */
export const MITTE = { stadt: STAEDTE[0].stadt, lat: STAEDTE[0].lat, lon: STAEDTE[0].lon };
export const UMKREIS_KM = STAEDTE[0].umkreisKm;

/** Ein Gebiet, wie es in die Datei kommt — ohne den Vereins-Ausdruck. */
export function gebietOhneRegex(s) {
  return { stadt: s.stadt, lat: s.lat, lon: s.lon, umkreisKm: s.umkreisKm };
}

/** Ortsarten mit Erlebniswert. Der Schlüssel ist die OSM-Etikettierung. */
export const OSM_ARTEN = [
  ['amenity', 'cinema', 'Kino'],
  ['leisure', 'escape_game', 'Escape-Room'],
  ['leisure', 'climbing', 'Kletterhalle'],
  ['leisure', 'water_park', 'Erlebnisbad'],
  ['tourism', 'museum', 'Museum'],
  ['tourism', 'zoo', 'Zoo'],
  ['amenity', 'theatre', 'Theater'],
];

export const QUELLEN = {
  openligadb: {
    name: 'OpenLigaDB',
    lizenz: 'frei (openligadb.de)',
    heim: 'https://www.openligadb.de/',
  },
  osm: {
    name: 'OpenStreetMap',
    lizenz: 'ODbL — © OpenStreetMap-Mitwirkende',
    heim: 'https://www.openstreetmap.org/copyright',
  },
};

// ── Textbehandlung: fremder Text ist Daten, nie Markup ──────────────────
//
// Titel und Ortsnamen kommen von Fremden. Sie landen in der Oberfläche und
// dürfen dort nichts sein als Text. Wir schneiden nicht "gefährliche"
// Zeichen heraus (eine Verbotsliste vergisst immer eines), sondern lassen
// nur zu, was ein Name sein kann.
const MAX_TEXT = 120;
export function textSaeubern(roh) {
  if (typeof roh !== 'string') return '';
  return roh
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')  // Steuerzeichen
    .replace(/[<>]/g, ' ')                     // niemals Markup
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

/** Entfernung in km (Haversine). Für 50 km genügt das bei Weitem. */
export function entfernungKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const b = (g) => (g * Math.PI) / 180;
  const dLat = b(lat2 - lat1);
  const dLon = b(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(b(lat1)) * Math.cos(b(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// ── Umwandlung: Rohantwort → unser Format ───────────────────────────────

/**
 * OpenLigaDB-Spiele → Aktivitäten.
 *
 * Nur HEIMSPIELE: ein Auswärtsspiel in München ist keine Aktivität im
 * Umkreis von Köln. Und nur künftige: ein Spiel von gestern ist kein
 * Vorschlag, sondern ein Ärgernis.
 */
export function ausOpenLigaDB(spiele, jetzt = new Date(), gebiete = STAEDTE) {
  if (!Array.isArray(spiele)) return [];
  const raus = [];
  for (const s of spiele) {
    if (!s || typeof s !== 'object') continue;
    const heim = textSaeubern(s.team1?.teamName);
    const gast = textSaeubern(s.team2?.teamName);
    if (!heim || !gast) continue;
    // Nur HEIMSPIELE, und nur in einem Gebiet, das wir wirklich erfassen.
    // Ohne die Zuordnung stünde ein Spiel in München im Kölner Umkreis.
    const gebiet = gebiete.find((g) => g.verein && g.verein.test(heim));
    if (!gebiet) continue;
    const wann = s.matchDateTimeUTC || s.matchDateTime;
    const d = wann ? new Date(wann) : null;
    if (!d || Number.isNaN(d.getTime()) || d <= jetzt) continue;

    raus.push({
      id: 'openligadb:' + String(s.matchID ?? `${heim}-${wann}`),
      art: 'sport',
      titel: `${heim} – ${gast}`,
      beginn: d.toISOString(),
      gebiet: gebiet.stadt,
      ort: {
        name: textSaeubern(s.location?.locationStadium) || 'Stadion',
        stadt: textSaeubern(s.location?.locationCity) || gebiet.stadt,
        // OpenLigaDB liefert keine Koordinaten. Die Stadtmitte ist eine
        // ehrliche Näherung, SOLANGE sie als solche gekennzeichnet ist —
        // `ungefaehr` ist genau diese Kennzeichnung. Vorher stand hier
        // `null`, und die Ansicht fiel auf die Mitte der ganzen DATEI
        // zurück: bei einem Gebiet richtig, bei sechs falsch.
        lat: gebiet.lat,
        lon: gebiet.lon,
        ungefaehr: true,
      },
      quelle: {
        name: QUELLEN.openligadb.name,
        url: QUELLEN.openligadb.heim,
        lizenz: QUELLEN.openligadb.lizenz,
      },
      partner: false,
    });
  }
  return raus;
}

/**
 * Overpass-Elemente → Aktivitäten.
 *
 * Orte haben keinen Termin (`beginn: null`). Das ist kein fehlender Wert,
 * sondern eine Aussage: „jederzeit". Wer hier eine Uhrzeit erfindet, damit
 * die Ansicht einheitlich aussieht, hat Daten erfunden.
 */
export function ausOverpass(antwort, gebiet = STAEDTE[0]) {
  const mitte = gebiet;
  const umkreisKm = gebiet.umkreisKm ?? UMKREIS_KM;
  const elemente = Array.isArray(antwort?.elements) ? antwort.elements : [];
  const raus = [];
  for (const e of elemente) {
    if (!e || typeof e !== 'object') continue;
    const t = e.tags || {};
    const name = textSaeubern(t.name);
    if (!name) continue;                            // ohne Namen kein Vorschlag

    let label = '';
    for (const [k, v, l] of OSM_ARTEN) { if (t[k] === v) { label = l; break; } }
    if (!label) continue;

    const lat = typeof e.lat === 'number' ? e.lat : e.center?.lat;
    const lon = typeof e.lon === 'number' ? e.lon : e.center?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    const km = entfernungKm(mitte.lat, mitte.lon, lat, lon);
    if (km > umkreisKm) continue;                   // Overpass kann grosszügig sein

    raus.push({
      id: `osm:${e.type || 'node'}/${e.id}`,
      art: 'ort',
      titel: name,
      kategorie: label,
      beginn: null,
      gebiet: gebiet.stadt,
      ort: {
        name,
        stadt: textSaeubern(t['addr:city']) || '',
        lat: Math.round(lat * 1e5) / 1e5,
        lon: Math.round(lon * 1e5) / 1e5,
      },
      entfernungKm: Math.round(km * 10) / 10,
      quelle: {
        name: QUELLEN.osm.name,
        url: `https://www.openstreetmap.org/${e.type || 'node'}/${e.id}`,
        lizenz: QUELLEN.osm.lizenz,
      },
      partner: false,
    });
  }
  return raus;
}

/**
 * Die Overpass-Antworten je Gebiet — und die alte Form als Sonderfall.
 *
 * Neu: `{ overpass: { 'Köln': …, 'Berlin': … } }`, eine Antwort je Gebiet.
 * Alt: `{ overpass: { elements: [ … ] } }` — eine einzige Antwort. Die gilt
 * als Antwort des ERSTEN Gebiets. Gespeicherte Rohdaten aus der Zeit vor
 * der Mehrstadt-Umstellung bleiben damit brauchbar, statt still als
 * „nichts gefunden" durchzulaufen.
 */
export function antwortenJeGebiet(overpass) {
  if (!overpass || typeof overpass !== 'object') return new Map();
  if (Array.isArray(overpass.elements)) return new Map([[STAEDTE[0].stadt, overpass]]);
  const raus = new Map();
  for (const g of STAEDTE) {
    const a = overpass[g.stadt];
    if (a && Array.isArray(a.elements)) raus.set(g.stadt, a);
  }
  return raus;
}

/**
 * Orte aus allen Gebieten — gedeckelt und entdoppelt.
 *
 * Die Kreise überlappen (Köln und Düsseldorf liegen 40 km auseinander).
 * Ein Kino kann deshalb in zwei Antworten stehen; ohne Entdoppelung
 * bräche `bestandBauen` mit „doppelte Kennung" ab. Behalten wird der
 * Eintrag des NÄHEREN Gebiets — sonst entschiede die Reihenfolge der
 * Städteliste, welcher Stadt ein Ort zugeschlagen wird.
 */
export function orteAusGebieten(overpass, max = MAX_JE_GEBIET) {
  const antworten = antwortenJeGebiet(overpass);
  const nachId = new Map();
  for (const g of STAEDTE) {
    const a = antworten.get(g.stadt);
    if (!a) continue;
    const teil = ausOverpass(a, g)
      .sort((x, y) => x.entfernungKm - y.entfernungKm)
      .slice(0, max);
    for (const e of teil) {
      const alt = nachId.get(e.id);
      if (!alt || e.entfernungKm < alt.entfernungKm) nachId.set(e.id, e);
    }
  }
  return [...nachId.values()];
}

/**
 * Aus beiden Rohteilen die fertige Datei bauen.
 *
 * `gebiete` führt die Städte, für die WIRKLICH eine Antwort vorlag — nicht
 * die, die wir abfragen wollten. Der Unterschied ist der ganze Punkt: die
 * Ansicht sagt anhand dieser Liste „diese Gegend ist noch nicht erfasst"
 * statt „hier ist nichts los". Eine Absichtserklärung an dieser Stelle
 * wäre wieder eine Entwarnung ohne Deckung.
 */
export function bestandBauen(roh, jetzt = new Date()) {
  const antworten = antwortenJeGebiet(roh?.overpass);
  const gebiete = STAEDTE.filter((g) => antworten.has(g.stadt));
  const sport = ausOpenLigaDB(roh?.openligadb, jetzt, gebiete);
  const orte = orteAusGebieten(roh?.overpass);
  const eintraege = [...sport, ...orte];
  // Doppelte Kennungen wären ein Fehler im Zusammenbau, kein Datenproblem.
  const gesehen = new Set();
  for (const e of eintraege) {
    if (gesehen.has(e.id)) throw new Error('doppelte Kennung: ' + e.id);
    gesehen.add(e.id);
  }
  return {
    version: 2,
    hinweis: 'Erzeugt von scripts/aktivitaeten.mjs. Nicht von Hand bearbeiten.',
    stand: jetzt.toISOString(),
    gebiete: gebiete.map(gebietOhneRegex),
    mitte: MITTE,
    umkreisKm: UMKREIS_KM,
    quellen: Object.values(QUELLEN).map((q) => ({ name: q.name, lizenz: q.lizenz, url: q.heim })),
    anzahl: { gesamt: eintraege.length, sport: sport.length, orte: orte.length },
    eintraege,
  };
}

/**
 * Die ehrliche Ausgangslage: noch nie abgerufen.
 *
 * `stand: null` heisst NIE ABGERUFEN und ist etwas anderes als „abgerufen
 * und nichts gefunden". Genau diese Verwechslung liess den toten
 * Gitleaks-Scan vier Monate wie Schutz aussehen. Deshalb steht hier `null`
 * und keine Uhrzeit, und deshalb sagt der Bericht es in Worten.
 */
export function leererBestand() {
  return {
    version: 2,
    hinweis: 'Erzeugt von scripts/aktivitaeten.mjs. Nicht von Hand bearbeiten.',
    stand: null,
    // Nie abgerufen heisst: KEIN Gebiet erfasst. Hier die geplanten Städte
    // einzutragen wäre die Absichtserklärung, vor der `bestandBauen` warnt.
    gebiete: [],
    mitte: MITTE,
    umkreisKm: UMKREIS_KM,
    quellen: Object.values(QUELLEN).map((q) => ({ name: q.name, lizenz: q.lizenz, url: q.heim })),
    anzahl: { gesamt: 0, sport: 0, orte: 0 },
    eintraege: [],
  };
}

// ── Prüfung ─────────────────────────────────────────────────────────────

/**
 * Prüft den Bestand und gibt `{ beanstandungen, hinweise }` zurück.
 *
 * ── WARUM ZWEI LISTEN ───────────────────────────────────────────────────
 *
 * **Beanstandungen blockieren, Hinweise nicht.** Es blockiert nur, was
 * derselbe Commit beheben kann — dieselbe Regel wie in `recht.mjs`.
 *
 * Ein **abgelaufenes Spiel** ist der Fall, der beides trennt. Es entsteht
 * nicht durch eine Änderung am Code, sondern dadurch, dass die Tagesroutine
 * eine Weile nicht lief. Als Beanstandung geführt, würde das den PR-Check
 * eines völlig unbeteiligten Commits rot machen — mit einer Meldung, die
 * niemand in seinem Diff wiederfindet. Nach dem dritten Mal schaltet jemand
 * das Tor ab, und dann fehlt auch die Prüfung auf fehlende Herkunft.
 *
 * Ein Prüfer, der aus dem falschen Grund rot meldet, kostet mehr als keiner.
 *
 * `stand: null` ist ebenfalls KEINE Beanstandung — eine Datei, die sagt
 * „noch nie abgerufen", ist ehrlich. Beanstandet wird, wer Einträge führt
 * und dabei behauptet, nie gelaufen zu sein: das wären Daten ohne Herkunft.
 */
export function beanstanden(datei, jetzt = new Date()) {
  const f = [];
  const h = [];
  if (!datei || typeof datei !== 'object') {
    return { beanstandungen: ['Datei ist kein Objekt'], hinweise: [] };
  }
  const e = Array.isArray(datei.eintraege) ? datei.eintraege : null;
  if (!e) {
    return { beanstandungen: ['eintraege fehlt oder ist keine Liste'], hinweise: [] };
  }

  if (datei.stand === null && e.length > 0) {
    f.push('Einträge ohne Abrufzeitpunkt — woher kommen sie?');
  }
  if (datei.anzahl?.gesamt !== e.length) {
    f.push(`anzahl.gesamt (${datei.anzahl?.gesamt}) passt nicht zu ${e.length} Einträgen`);
  }

  // ── Die Abdeckung muss die Einträge decken ────────────────────────────
  //
  // `gebiete` ist die Grundlage für den Satz „diese Gegend ist noch nicht
  // erfasst". Fehlt die Liste, während Einträge dastehen, kann die Ansicht
  // erfasst und unerfasst nicht mehr unterscheiden — und fällt auf genau
  // die Auskunft zurück, die dieser Umbau beseitigt hat.
  const gebiete = Array.isArray(datei.gebiete) ? datei.gebiete : null;
  if (!gebiete) {
    if (e.length > 0) f.push('gebiete fehlt — dann ist unbekannt, worüber die Datei etwas aussagt');
  } else {
    const namen = new Set();
    for (const g of gebiete) {
      if (typeof g?.stadt !== 'string' || !g.stadt.trim()) f.push('Gebiet ohne Stadtnamen');
      else if (namen.has(g.stadt)) f.push('doppeltes Gebiet: ' + g.stadt);
      else namen.add(g.stadt);
      if (typeof g?.lat !== 'number' || typeof g?.lon !== 'number'
        || typeof g?.umkreisKm !== 'number' || !(g.umkreisKm > 0)) {
        f.push(`${g?.stadt || '(ohne Namen)'}: Gebiet ohne brauchbare Mitte oder Umkreis`);
      }
    }
    if (e.length > 0 && namen.size === 0) {
      f.push('Einträge ohne ein einziges erfasstes Gebiet');
    }
    for (const x of e) {
      if (x?.gebiet && !namen.has(x.gebiet)) {
        f.push(`${x.id || '(ohne Kennung)'}: liegt im Gebiet „${x.gebiet}", das nicht erfasst ist`);
      }
    }
  }

  const ids = new Set();
  let abgelaufen = 0;
  for (const x of e) {
    const wo = x?.id || '(ohne Kennung)';
    if (!x?.id) f.push('Eintrag ohne Kennung');
    else if (ids.has(x.id)) f.push('doppelte Kennung: ' + x.id);
    else ids.add(x.id);

    if (!x?.quelle?.name || !x?.quelle?.url || !x?.quelle?.lizenz) {
      f.push(`${wo}: Quelle unvollständig — ohne Herkunft ist ein Eintrag erfunden`);
    }
    if (typeof x?.titel !== 'string' || !x.titel.trim()) {
      f.push(`${wo}: kein Titel`);
    } else if (/[<>]/.test(x.titel)) {
      f.push(`${wo}: Markup im Titel — fremder Text ist Daten, nie Markup`);
    }
    if (x?.beginn !== null) {
      const d = new Date(x.beginn);
      // Ein unlesbarer Zeitpunkt ist ein Fehler der Umwandlung (blockiert),
      // ein vergangener nur ein alter Abruf (blockiert nicht).
      if (Number.isNaN(d.getTime())) f.push(`${wo}: Beginn ist kein Zeitpunkt`);
      else if (d < jetzt) abgelaufen++;
    }
    if (x?.partner !== false && x?.partner !== true) {
      f.push(`${wo}: partner ist weder true noch false`);
    }
  }
  if (abgelaufen > 0) {
    h.push(`${abgelaufen} Termin(e) liegen in der Vergangenheit — der Abruf ist alt. `
      + 'Die Tagesroutine holt neu; die Ansicht blendet Vergangenes aus.');
  }
  return { beanstandungen: f, hinweise: h };
}

/**
 * Darf dieser Bestand geschrieben werden? Gibt den Grund zurück, sonst null.
 *
 * Ein Abruf, der 200 liefert und trotzdem nichts enthält, darf einen
 * gefüllten Bestand nicht überschreiben. Auf der Seite sähe das aus wie
 * „heute ist nichts los" und wäre in Wahrheit ein stiller Quellenausfall —
 * ein leerer Bildschirm, den niemand als Fehler erkennt. Lieber der alte
 * Bestand und ein roter Lauf, den jemand sieht.
 */
export function schreibVerweigert(neu, alt) {
  if (neu?.anzahl?.gesamt === 0 && alt && alt.anzahl?.gesamt > 0) {
    return `Der Abruf ergab 0 Einträge, der bisherige Bestand hat ${alt.anzahl.gesamt}. `
      + 'Das ist ein Quellenausfall, kein leerer Tag — der vorhandene Bestand bleibt stehen.';
  }
  // ── Die Abdeckung darf nicht schrumpfen ───────────────────────────────
  //
  // Overpass antwortet nicht immer. Fällt der Abruf für EIN Gebiet aus,
  // wäre die neue Datei für alle anderen Gebiete richtig — und für dieses
  // eine hiesse sie ab sofort „noch nicht erfasst". Ein Besucher in Berlin
  // bekäme also die Auskunft, wir hätten dort nie hingesehen, weil ein
  // fremder Server eine Minute lang überlastet war.
  //
  // Das ist derselbe Fall wie oben, nur teilweise: ein Quellenausfall darf
  // keine Aussage über die Welt werden. Also stehenbleiben und rot melden.
  const alteGebiete = Array.isArray(alt?.gebiete) ? alt.gebiete : [];
  if (alteGebiete.length) {
    const neueNamen = new Set((Array.isArray(neu?.gebiete) ? neu.gebiete : []).map((g) => g.stadt));
    const verloren = alteGebiete.map((g) => g.stadt).filter((s) => !neueNamen.has(s));
    if (verloren.length) {
      return `Der Abruf deckt ${verloren.join(', ')} nicht mehr ab, der bisherige Bestand schon. `
        + 'Ein ausgefallenes Gebiet ist ein Quellenausfall, keine unerfasste Gegend — '
        + 'der vorhandene Bestand bleibt stehen.';
    }
  }
  return null;
}

// ── Abruf (braucht Netz) ────────────────────────────────────────────────

const KOPF = {
  // Overpass verlangt eine erkennbare Kennung; anonyme Massenabrufe werden
  // gesperrt, und das zu Recht.
  'User-Agent': 'Eventboerse/1.0 (+https://xn--eventbrse-57a.de; kontakt@eventboerse.de)',
  Accept: 'application/json',
};

export function overpassAbfrage(gebiet = STAEDTE[0]) {
  const r = Math.round((gebiet.umkreisKm ?? UMKREIS_KM) * 1000);
  const teile = OSM_ARTEN.map(([k, v]) =>
    `  nwr["${k}"="${v}"](around:${r},${gebiet.lat},${gebiet.lon});`).join('\n');
  return `[out:json][timeout:90];\n(\n${teile}\n);\nout center 400;`;
}

/**
 * Ein Gebiet nach dem anderen — nicht alle in einer Abfrage.
 *
 * Sechs Städte × sieben Ortsarten in einem Aufruf wären eine Abfrage, die
 * Overpass zu Recht abweist. Und ein einziger `out`-Deckel über allem
 * schnitte willkürlich ab: die Städte am Ende der Liste kämen nie vor.
 * Also je Gebiet eine Abfrage, mit Pause dazwischen — Overpass ist ein
 * gespendeter Dienst, kein Selbstbedienungsladen.
 */
async function overpassHolen(gebiet) {
  const antwort = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { ...KOPF, 'Content-Type': 'text/plain' },
    body: overpassAbfrage(gebiet),
  });
  if (!antwort.ok) throw new Error(`Overpass HTTP ${antwort.status} für ${gebiet.stadt}`);
  return antwort.json();
}

const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));

async function holen(saison) {
  const jahr = saison || (new Date().getMonth() >= 6
    ? new Date().getFullYear() : new Date().getFullYear() - 1);

  // Erste UND zweite Liga: Hertha, Fortuna, St. Pauli und 1860 spielen
  // nicht in der ersten. Ohne bl2 stünden für die halbe Städteliste
  // Vereins-Ausdrücke da, die nie greifen können — eine Zuordnung, die
  // aussieht, als deckte sie etwas ab.
  const ligen = ['bl1', 'bl2'];
  const spiele = [];
  for (const liga of ligen) {
    const teil = await fetch(`https://api.openligadb.de/getmatchdata/${liga}/${jahr}`, { headers: KOPF })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`OpenLigaDB HTTP ${r.status} für ${liga}`))));
    if (Array.isArray(teil)) spiele.push(...teil);
  }

  // Ein ausgefallenes Gebiet reisst den Lauf NICHT mit: die übrigen Städte
  // sind deswegen nicht weniger erfasst. Ob die Datei trotzdem geschrieben
  // werden darf, entscheidet `schreibVerweigert()` — dort und nur dort.
  const overpass = {};
  const ausfaelle = [];
  for (const g of STAEDTE) {
    try {
      overpass[g.stadt] = await overpassHolen(g);
    } catch (e) {
      ausfaelle.push(`${g.stadt}: ${e.message}`);
    }
    await schlafen(2000);
  }
  for (const a of ausfaelle) console.error('⚠ Gebiet nicht abgerufen — ' + a);
  if (!Object.keys(overpass).length) throw new Error('Kein einziges Gebiet abgerufen');

  return { openligadb: spiele, overpass };
}

// ── Ausführung ──────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const istHauptlauf = process.argv[1] && process.argv[1].endsWith('aktivitaeten.mjs');

async function lies() {
  try { return JSON.parse(await readFile(OUT, 'utf8')); } catch { return null; }
}

async function schreib(obj) {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function bericht(d) {
  console.log('── Aktivitäten im Umkreis ───────────────────────');
  if (!d) { console.log('✗ assets/eb-aktivitaeten.json fehlt'); return; }
  if (d.stand === null) {
    console.log('⚠ NIE ABGERUFEN — die Datei ist angelegt, aber der Abruf lief nie.');
    console.log('  Das ist etwas anderes als „nichts gefunden". Der Abruf braucht');
    console.log('  Netz und läuft in der Tagesroutine (node scripts/aktivitaeten.mjs --holen).');
  } else {
    console.log('Stand        : ' + d.stand);
  }
  // Die Abdeckung steht im Bericht, weil sie die Aussagekraft begrenzt.
  // Eine Zahl ohne die Gegend, für die sie gilt, lädt zum Fehlschluss ein.
  const gebiete = Array.isArray(d.gebiete) ? d.gebiete : [];
  if (gebiete.length) {
    console.log(`Erfasst      : ${gebiete.map((g) => `${g.stadt} (${g.umkreisKm} km)`).join(', ')}`);
    const fehlend = STAEDTE.filter((s) => !gebiete.some((g) => g.stadt === s.stadt));
    if (fehlend.length) {
      console.log(`Nicht erfasst: ${fehlend.map((s) => s.stadt).join(', ')} — geplant, aber ohne Antwort`);
    }
  } else {
    console.log('Erfasst      : KEIN Gebiet — die Datei sagt über keine Gegend etwas aus.');
  }
  console.log(`Einträge     : ${d.anzahl?.gesamt} (Sport ${d.anzahl?.sport}, Orte ${d.anzahl?.orte})`);
  for (const q of d.quellen || []) console.log(`Quelle       : ${q.name} — ${q.lizenz}`);
  console.log('─────────────────────────────────────────────────');
}

async function schreibGeprueft(gebaut) {
  const grund = schreibVerweigert(gebaut, await lies());
  if (grund) { console.error('✗ ' + grund); process.exit(1); }
  await schreib(gebaut);
  bericht(gebaut);
}

if (istHauptlauf) {
  const check = argv.includes('--check');
  const ausIdx = argv.indexOf('--aus');

  if (argv.includes('--holen')) {
    await schreibGeprueft(bestandBauen(await holen()));
  } else if (ausIdx >= 0) {
    const roh = JSON.parse(await readFile(argv[ausIdx + 1], 'utf8'));
    await schreibGeprueft(bestandBauen(roh));
  } else {
    const d = await lies();
    if (check) {
      if (!d) { console.error('✗ assets/eb-aktivitaeten.json fehlt'); process.exit(1); }
      const { beanstandungen, hinweise } = beanstanden(d);
      if (beanstandungen.length) {
        console.error('✗ Aktivitäten-Bestand beanstandet:');
        for (const x of beanstandungen) console.error('  · ' + x);
        process.exit(1);
      }
      bericht(d);
      for (const x of hinweise) console.log('⚠ ' + x);
      // Die Zahl gehört in die Erfolgsmeldung. „Alles in Ordnung" bei null
      // geprüften Einträgen ist keine Entwarnung, sondern eine leere Liste.
      console.log(`✓ ${d.eintraege.length} Einträge geprüft: jeder nennt Quelle, `
        + 'Adresse und Lizenz, kein Titel trägt Markup.');
      if (d.eintraege.length === 0) {
        console.log('  (Noch nichts abgerufen — geprüft wurde damit die Form, nicht der Inhalt.)');
      }
    } else {
      bericht(d);
    }
  }
}
