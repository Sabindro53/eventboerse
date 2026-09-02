#!/usr/bin/env node
/**
 * recht.mjs — Rechtliches wird gemessen, nicht behauptet.
 *
 * Die Lücke, die das schließt: der Vault beschreibt seit Mai 2026, welche
 * Speicherschlüssel gesetzt werden, welche Pflichtseiten es gibt und wann
 * eine Einwilligung greift. Der Code hat sich seitdem bewegt, die Notiz
 * nicht. Eine Compliance-Notiz, die einen anderen Stand beschreibt als die
 * Software, ist schlimmer als keine: sie lässt den Inhaber glauben, er sei
 * abgedeckt.
 *
 * Dieses Skript vergleicht vier Aussagen mit dem Code und schreibt das
 * Ergebnis nach vault/40-Governance/Legal/Rechtliche-Lage.md.
 *
 * 1. SPEICHER (TDDDG § 25, DSGVO Art. 13). Jeder localStorage-/
 *    sessionStorage-Schlüssel im Frontend muss in der Cookie-Liste stehen.
 *    Beide Richtungen zählen: ein undokumentierter Schlüssel ist eine
 *    Informationslücke, ein dokumentierter ohne Code beschreibt eine
 *    Website, die es nicht gibt.
 *
 * 2. EINWILLIGUNG (TDDDG § 25 Abs. 1). Ein Banner, das fragt und dessen
 *    Antwort niemand liest, ist keine Einwilligung — er ist ihre
 *    Nachahmung. Gemessen wird, ob überhaupt eine Schreibstelle die
 *    Antwort prüft.
 *
 * 3. PFLICHTSEITEN (DDG § 5, DSGVO Art. 13, DSA, P2B). Jeder Slug aus der
 *    Compliance-Übersicht muss in functions.php als Route existieren.
 *
 * 4. KI-TRANSPARENZ (EU AI Act Art. 50, DSA, UWG § 5). Wenn Inhalte als
 *    KI-erzeugt gekennzeichnet werden, muss der Vault beschreiben, was die
 *    Kennzeichnung bedeutet — sonst steht eine Rechtsaussage nur im Code.
 *
 * Was dieses Skript NICHT tut: es bewertet nicht, ob eine Klausel wirksam
 * ist. Das ist Rechtsberatung und braucht einen Menschen mit Zulassung.
 * Es prüft nur, ob Beschreibung und Software dasselbe sagen.
 *
 * Aufrufe:
 *   node scripts/recht.mjs           misst und schreibt die Lage-Notiz
 *   node scripts/recht.mjs --check   CI-Tor: bricht bei Drift ab
 *   node scripts/recht.mjs --print   nur ausgeben, nichts schreiben
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_DIR = join(ROOT, 'js', 'modules');
const COOKIE_LISTE = join(ROOT, 'vault', '40-Governance', 'Legal', 'Cookie-Liste.md');
const COMPLIANCE = join(ROOT, 'vault', '40-Governance', 'Legal', 'Compliance-Overview.md');
const KI_NOTIZ = join(ROOT, 'vault', '40-Governance', 'Legal', 'KI-Transparenz.md');
const FUNCTIONS = join(ROOT, 'functions.php');
const SHELL = join(ROOT, 'app-shell.html');
const ZIEL = join(ROOT, 'vault', '40-Governance', 'Legal', 'Rechtliche-Lage.md');

/** Platzhalter für einen Schlüssel, dessen Ende erst zur Laufzeit feststeht. */
const DYNAMISCH = '<dynamisch>';

/**
 * Schlüssel, die bewusst nicht in der Nutzer-Cookie-Liste stehen müssen:
 * Sie werden nie im Browser eines Besuchers gesetzt. Jeder Eintrag braucht
 * einen Grund — eine Ausnahmeliste ohne Begründung ist eine Hintertür.
 */
export const NICHT_IM_BROWSER = {
  // (derzeit leer — jede Aufnahme ist eine bewusste Entscheidung)
};

/* ── Quelltext einlesen ──────────────────────────────────────────────── */

function jsDateien(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...jsDateien(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/**
 * Kommentare und Zeichenketten-freie Betrachtung ist hier bewusst NICHT
 * gewollt: ein Schlüssel steht immer in einer Zeichenkette. Entfernt werden
 * nur Kommentare, damit ein auskommentierter Aufruf nicht als echt zählt.
 */
function ohneKommentare(quelle) {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Schneidet das erste Argument eines Aufrufs heraus — klammertreu.
 *
 * Eine naive Suche bis zum ersten `)` verstümmelt `setItem(_aiKey(), …)`
 * zu `_aiKey(` und meldet das dann als unauflösbar. Der Prüfer sähe eine
 * Lücke, wo nur sein eigener Ausdruck falsch war.
 */
export function erstesArgument(text, ab) {
  let tiefe = 0, quote = null, start = ab;
  for (let i = ab; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) return text.slice(start, i).trim(); tiefe--; }
    else if (c === ',' && tiefe === 0) return text.slice(start, i).trim();
  }
  return null;
}

/**
 * Löst einen Ausdruck zu möglichen Schlüsselnamen auf.
 *
 * Erkannt werden die Formen, die im Projekt wirklich vorkommen:
 *   'eb_user'                              → wörtlich
 *   RADAR_SPEICHER                         → Konstante
 *   _boardStorageKey()                     → Funktion mit festem Anfang
 *   'eb_favs_' + currentUser.id            → Anfang + Laufzeitanteil
 *   currentUser ? 'eb_favs_' + id : 'eb_favs_guest'  → beide Zweige
 *
 * Ein Ausdruck kann mehrere Schlüssel ergeben (Ternär) — deshalb ein
 * Array. `null` heißt: nicht auflösbar, und das wird gemeldet statt
 * stillschweigend als „sauber" verbucht.
 */
export function aufloesen(expr, konstanten, funktionen, tiefe = 0) {
  const e = String(expr || '').trim();
  if (!e || tiefe > 4) return null;

  // Ternär auf oberster Ebene: beide Zweige zählen.
  const frage = obersterOperator(e, '?');
  if (frage > 0) {
    const doppel = obersterOperator(e, ':', frage + 1);
    if (doppel > 0) {
      const a = aufloesen(e.slice(frage + 1, doppel), konstanten, funktionen, tiefe + 1);
      const b = aufloesen(e.slice(doppel + 1), konstanten, funktionen, tiefe + 1);
      if (!a && !b) return null;
      return [...(a || []), ...(b || [])];
    }
  }

  const wörtlich = e.match(/^(['"])([^'"]*)\1$/);
  if (wörtlich) return wörtlich[2] ? [wörtlich[2]] : [];   // '' ist kein Schlüssel

  // 'prefix' + irgendwas → fester Anfang, Rest zur Laufzeit
  const plus = obersterOperator(e, '+');
  if (plus > 0) {
    const links = aufloesen(e.slice(0, plus), konstanten, funktionen, tiefe + 1);
    if (links && links.length) return links.map((k) => k + DYNAMISCH);
    return null;
  }

  const bezeichner = e.match(/^([A-Za-z_$][\w$]*)$/);
  if (bezeichner) {
    if (konstanten.has(bezeichner[1])) return konstanten.get(bezeichner[1]);
    return null;
  }

  const aufruf = e.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (aufruf && funktionen.has(aufruf[1])) return funktionen.get(aufruf[1]);

  if (/^(null|undefined)$/.test(e)) return [];
  return null;
}

/** Position eines Operators auf Klammer-Ebene 0, außerhalb von Zeichenketten. */
function obersterOperator(text, op, ab = 0) {
  let tiefe = 0, quote = null;
  for (let i = ab; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) tiefe++;
    else if (')]}'.includes(c)) tiefe--;
    else if (tiefe === 0 && c === op) {
      // `?.` und `::` sind keine Ternär-Operatoren.
      if (op === '?' && text[i + 1] === '.') continue;
      if (op === ':' && (text[i + 1] === ':' || text[i - 1] === ':')) continue;
      return i;
    }
  }
  return -1;
}

/**
 * Findet Speicherschlüssel in einer Datei.
 *
 * Läuft in zwei Runden: erst werden Konstanten, Hilfsfunktionen und lokale
 * Zuweisungen aufgelöst (Funktionen können einander benutzen), dann die
 * Aufrufstellen. Was danach offen bleibt, wird als `unaufloesbar` geführt —
 * nicht verschwiegen. Ein Prüfer, der Unbekanntes still verwirft, meldet
 * Sauberkeit, wo er nur blind war.
 */
/**
 * Sammelt NUR benannte Funktionen und ihre return-Zweige.
 *
 * Warum nur Funktionen über Dateigrenzen hinweg gelten dürfen: `app.js`
 * entsteht durch reine Verkettung der Module, Funktionen teilen sich also
 * wirklich einen Geltungsbereich. Eine lokale Variable `key` tut das nicht.
 * Ein erster Entwurf hat alle `var`-Zuweisungen global zusammengeworfen und
 * daraufhin `budget`, `date`, `guests` und `location` als Speicherschlüssel
 * gemeldet — Namen, die nur zufällig auch mal an einer Variablen namens
 * `key` hingen. Ein Prüfer, der Schlüssel erfindet, ist schlimmer als
 * einer, der welche übersieht: er lässt Speicher dokumentieren, den es
 * nicht gibt, und macht die Cookie-Liste unglaubwürdig.
 */
export function funktionenSammeln(text, rueckgaben = new Map()) {
  for (const m of text.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) {
    const koerper = text.slice(m.index + m[0].length, m.index + m[0].length + 600);
    const ende = koerper.search(/\n\}/);
    const rumpf = ende > 0 ? koerper.slice(0, ende) : koerper;
    const zweige = [...rumpf.matchAll(/\breturn\s+([^;\n]+)/g)].map((r) => r[1].trim());
    if (zweige.length) {
      if (!rueckgaben.has(m[1])) rueckgaben.set(m[1], []);
      rueckgaben.get(m[1]).push(...zweige);
    }
  }
  return rueckgaben;
}

/** Fixpunkt: Funktionen dürfen einander benutzen. */
export function funktionenAufloesen(rueckgaben) {
  const funktionen = new Map();
  const leer = new Map();
  for (let runde = 0; runde < 3; runde++) {
    for (const [name, zweige] of rueckgaben) {
      const keys = zweige.flatMap((z) => aufloesen(z, leer, funktionen) || []);
      if (keys.length) funktionen.set(name, [...new Set(keys)]);
    }
  }
  return funktionen;
}

/**
 * Die letzte Zuweisung an `name` VOR der Stelle `vorIndex`, in derselben
 * Datei. Das bildet den Geltungsbereich einer lokalen Variablen deutlich
 * ehrlicher ab als eine dateiübergreifende Namensliste.
 */
export function letzteZuweisung(text, name, vorIndex) {
  const re = new RegExp(`\\b(?:var|let|const)?\\s*${name}\\s*=\\s*([^;\\n]+)`, 'g');
  let treffer = null;
  for (const m of text.matchAll(re)) {
    if (m.index >= vorIndex) break;
    treffer = m[1].trim();
  }
  return treffer;
}

export function schluesselFinden(quelle, datei = '', funktionen = null) {
  const text = ohneKommentare(quelle);
  const gefunden = [];
  const unaufloesbar = [];
  const fn = funktionen || funktionenAufloesen(funktionenSammeln(text));
  const leer = new Map();

  // Die Huellen selbst benennen keinen Schluessel — sie nehmen einen entgegen.
  //
  // `ebSpeichern(key, wert)` enthaelt `localStorage.setItem(key, wert)`, und
  // `key` ist dort ein Parameter. Der Aufloeser suchte die naechstgelegene
  // Zuweisung an `key` und fand `var key = kind === 'media' ? 'aiMedia…'`
  // aus einer voellig anderen Funktion weiter oben in derselben Datei — und
  // meldete `aiMediaDisclosure` als Speicherschluessel. Wer die Huellen
  // mitliest, bekommt Schluessel, die es nicht gibt.
  const huellen = ['ebSpeichern', 'ebDarfSpeichern', 'ebSpeicherKlasse', 'ebSpeicherAufraeumen'];
  const gesperrt = [];
  for (const name of huellen) {
    const von = text.indexOf(`function ${name}(`);
    if (von === -1) continue;
    const rumpf = text.slice(von);
    const bis = rumpf.indexOf('\n}');
    gesperrt.push([von, von + (bis === -1 ? rumpf.length : bis + 2)]);
  }
  const inHuelle = (i) => gesperrt.some(([a, b]) => i >= a && i < b);

  // `ebSpeichern(` zaehlt als Schreibstelle: seit der Einwilligung laufen die
  // nicht-essenziellen Schluessel darueber, und ein Pruefer, der nur
  // localStorage.setItem kennt, saehe sie ab sofort gar nicht mehr.
  const aufruf = /\b(?:(localStorage|sessionStorage)\s*\.\s*(?:setItem|getItem|removeItem)|(ebSpeichern))\s*\(/g;
  for (const m of text.matchAll(aufruf)) {
    if (inHuelle(m.index)) continue;
    const speicher = m[1] || 'localStorage';
    const arg = erstesArgument(text, m.index + m[0].length);
    let keys = arg === null ? null : aufloesen(arg, leer, fn);

    // Ein blanker Name: die nächstgelegene Zuweisung davor entscheidet.
    if (keys === null && /^[A-Za-z_$][\w$]*$/.test(String(arg))) {
      const quelltext = letzteZuweisung(text, arg, m.index);
      if (quelltext) keys = aufloesen(quelltext, leer, fn);
    }

    if (keys === null) {
      unaufloesbar.push({ ausdruck: String(arg).replace(/\s+/g, ' ').slice(0, 80), speicher, datei });
      continue;
    }
    for (const key of keys) gefunden.push({ key, speicher, datei });
  }
  return { gefunden, unaufloesbar };
}

/**
 * Alle Schlüssel des Frontends, zusammengefasst pro Schlüsselnamen.
 *
 * Erst werden Namen über ALLE Module gesammelt, dann aufgelöst. Das bildet
 * ab, wie der Code wirklich läuft: `build-app-js.sh` hängt die Module zu
 * einer Datei aneinander, sie teilen sich also einen Geltungsbereich.
 * `22-inserat-settings-uploads.js` ruft `_passkeyPromptStorageKey()` auf,
 * das in `core/30-auth.js` steht — modulweise betrachtet wäre das eine
 * gemeldete Lücke, die in Wahrheit keine ist.
 */
export function schluesselImCode(dateien) {
  const rueckgaben = new Map();
  for (const { quelle } of dateien) funktionenSammeln(ohneKommentare(quelle), rueckgaben);
  const funktionen = funktionenAufloesen(rueckgaben);

  const proKey = new Map();
  const unaufloesbar = [];
  for (const { pfad, quelle } of dateien) {
    const r = schluesselFinden(quelle, pfad, funktionen);
    for (const f of r.gefunden) {
      const eintrag = proKey.get(f.key) || { key: f.key, speicher: new Set(), dateien: new Set() };
      eintrag.speicher.add(f.speicher);
      eintrag.dateien.add(f.datei);
      proKey.set(f.key, eintrag);
    }
    unaufloesbar.push(...r.unaufloesbar);
  }
  const liste = [...proKey.values()]
    .map((e) => ({ key: e.key, speicher: [...e.speicher].sort(), dateien: [...e.dateien].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return { schluessel: liste, unaufloesbar };
}

/* ── Dokumentierte Seite ─────────────────────────────────────────────── */

/**
 * Liest die dokumentierten Schlüssel aus der Cookie-Liste.
 * Erkannt wird die erste Tabellenspalte in Backticks. `<userId>` und
 * ähnliche Platzhalter werden auf denselben Marker normalisiert wie im
 * Code, damit `eb_ai_chat_v1_<userId>` und `eb_ai_chat_v1_<dynamisch>`
 * als dieselbe Aussage gelten.
 */
export function schluesselInNotiz(markdown) {
  const keys = new Map();
  // Nur die Abschnitte, die WIRKLICH Browser-Speicher beschreiben.
  //
  // Die Notiz führt daneben HTTP-Cookies und Drittanbieter. Ein früherer
  // Entwurf las jede Tabelle und meldete daraufhin `eb_hq_tor` — ein Cookie,
  // das PHP setzt — als „steht in der Liste, kommt im Frontend nicht vor".
  // Das ist keine Abweichung, sondern eine andere Speicherart. Ein Prüfer,
  // der Kategorien verwechselt, erzeugt Meldungen, die man abgewöhnt zu
  // lesen — und dann übersieht man die echte.
  let drin = false;
  for (const zeile of markdown.split('\n')) {
    const ueberschrift = zeile.match(/^#{2,3}\s+(.+?)\s*$/);
    if (ueberschrift) {
      drin = /^(localStorage|sessionStorage)$/i.test(ueberschrift[1].trim());
      continue;
    }
    if (!drin) continue;
    const m = zeile.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]*)\|/);
    if (!m) continue;
    const key = normalisiere(m[1].trim());
    if (!/^(eb_|eventboerse_)/.test(key)) continue;   // WP- und Fremdcookies: nicht unser Code
    keys.set(key, (m[2] || '').trim());
  }
  return keys;
}

/**
 * Bringt beide Seiten auf dieselbe Form.
 *
 * Alles ab dem ersten Platzhalter wird zu einem einzigen Marker. Vom Code
 * ist nie mehr bekannt als der feste Anfang: aus
 * `'eb_stripe_onboarding_prompt_' + context + '_' + currentUser.id` liest
 * der Prüfer genau diesen Anfang. Die Notiz darf trotzdem
 * `<kontext>_<userId>` schreiben — für einen Menschen ist das die
 * nützlichere Angabe. Verglichen wird der gemeinsame feste Teil.
 */
export function normalisiere(key) {
  const i = key.indexOf('<');
  return i === -1 ? key : key.slice(0, i) + DYNAMISCH;
}

/* ── Die vier Prüfungen ──────────────────────────────────────────────── */

/**
 * Klassen aus `EB_SPEICHER_KLASSEN` in js/modules/core/00-basis.js lesen.
 *
 * Diese Tabelle entscheidet zur Laufzeit, ob ein Schluessel ohne Einwilligung
 * geschrieben werden darf. Sie muss mit der Cookie-Liste uebereinstimmen —
 * sonst sagt die Notiz „profilbildend, einwilligungspflichtig", waehrend der
 * Code den Schluessel als essenziell durchwinkt. Das waere die schlimmste
 * Sorte Abweichung: eine, die genau dort auseinanderlaeuft, wo es rechtlich
 * zaehlt, und die niemand sieht.
 */
export function klassenImCode(quelle) {
  const block = quelle.match(/var EB_SPEICHER_KLASSEN\s*=\s*\{([\s\S]*?)\n\};/);
  const map = new Map();
  if (!block) return map;
  for (const m of block[1].matchAll(/^\s*([A-Za-z_][\w]*)\s*:\s*'(essenziell|funktional|profil)'/gm)) {
    map.set(m[1], m[2]);   // roh — die Praefix-Logik steckt in klasseFuer()
  }
  return map;
}

/** Klassen aus der Cookie-Liste — zweite Spalte der Speicher-Tabellen. */
export function klassenInNotiz(markdown) {
  const map = new Map();
  let drin = false;
  for (const zeile of markdown.split('\n')) {
    const u = zeile.match(/^#{2,3}\s+(.+?)\s*$/);
    if (u) { drin = /^(localStorage|sessionStorage)$/i.test(u[1].trim()); continue; }
    if (!drin) continue;
    const m = zeile.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]*)\|/);
    if (!m) continue;
    const key = m[1].trim().replace(/<[^>]*>.*$/, '');
    if (!/^(eb_|eventboerse_)/.test(key)) continue;
    const roh = m[2].trim().toLowerCase();
    map.set(key, roh.startsWith('essenziell') ? 'essenziell'
      : roh.startsWith('profil') ? 'profil'
      : roh.startsWith('funktional') ? 'funktional' : roh);
  }
  return map;
}

/**
 * Dieselbe Zuordnung wie `ebSpeicherKlasse()` im Browser: laengster
 * passender Eintrag gewinnt.
 *
 * Ein erster Entwurf verglich exakt und meldete daraufhin `eb_favs_guest`
 * als „ohne Klasse" — obwohl der Praefix `eb_favs_` ihn zur Laufzeit
 * einwandfrei als funktional einordnet. Ein Pruefer, der die Laufzeit
 * vereinfacht statt sie abzubilden, meldet Luecken, die es nicht gibt; und
 * wer solche Meldungen wegzudruecken lernt, uebersieht die echte.
 */
export function klasseFuer(key, klassen) {
  const k = String(key).replace(/<[^>]*>/g, '');
  let treffer = '';
  for (const muster of klassen.keys()) {
    if ((k === muster || k.startsWith(muster)) && muster.length > treffer.length) treffer = muster;
  }
  return treffer ? klassen.get(treffer) : null;
}

export function klassenPruefen(imCode, codeKlassen, notizKlassen) {
  const ohneKlasse = [];
  const uneinig = [];
  for (const e of imCode) {
    const c = klasseFuer(e.key, codeKlassen);
    const n = klasseFuer(e.key, notizKlassen);
    // Ohne Eintrag behandelt ebSpeicherKlasse() den Schluessel als 'profil'
    // — zurueckhaltend, aber unbeabsichtigt. Das gehoert gemeldet.
    if (!c) { ohneKlasse.push(e.key); continue; }
    if (n && n !== c) uneinig.push({ key: e.key, code: c, notiz: n });
  }
  return { ohneKlasse, uneinig };
}

export function speicherPruefen(imCode, inNotiz) {
  const undokumentiert = [];
  const ohneCode = [];
  for (const e of imCode) {
    if (!inNotiz.has(normalisiere(e.key))) undokumentiert.push(e);
  }
  const codeKeys = new Set(imCode.map((e) => normalisiere(e.key)));
  for (const k of inNotiz.keys()) {
    if (!codeKeys.has(k)) ohneCode.push(k);
  }
  return { undokumentiert, ohneCode };
}

/**
 * Prüft, ob die Einwilligung überhaupt etwas bewirkt.
 *
 * Gemessen wird nicht, ob das Wort „consent" vorkommt — sondern ob eine
 * Datei, die einen nicht-essenziellen Schlüssel SCHREIBT, die Antwort
 * liest. Die Datei, die das Banner selbst baut, zählt nicht: dass sie
 * ihre eigene Antwort kennt, sagt nichts über die Wirkung.
 */
export function einwilligungPruefen(dateien, consentKey = 'eb_cookie_consent') {
  const schreiber = [];
  let bannerDatei = null;
  for (const { pfad, quelle } of dateien) {
    const text = ohneKommentare(quelle);
    const schreibt = /\b(?:localStorage|sessionStorage)\s*\.\s*setItem\s*\(/.test(text);
    const setztConsent = new RegExp(`setItem\\s*\\(\\s*['"]${consentKey}['"]`).test(text);
    if (setztConsent) { bannerDatei = pfad; continue; }
    if (schreibt) {
      const liestConsent = new RegExp(`${consentKey}|_getCookieConsent|hatEinwilligung`).test(text);
      schreiber.push({ pfad, liestConsent });
    }
  }
  const pruefend = schreiber.filter((s) => s.liestConsent);
  return {
    bannerDatei,
    schreiberGesamt: schreiber.length,
    schreiberMitPruefung: pruefend.length,
    ungeprueft: schreiber.filter((s) => !s.liestConsent).map((s) => s.pfad),
    // Kern der Aussage: fragt das Haus etwas, das niemand liest?
    wirkungslos: !!bannerDatei && pruefend.length === 0,
  };
}

export function pflichtseitenPruefen(complianceMd, functionsPhp) {
  const gefordert = [];
  for (const zeile of complianceMd.split('\n')) {
    const m = zeile.match(/^\|\s*`\/([a-z0-9-]+)`\s*\|\s*([^|]*)\|\s*([^|]*)\|/);
    if (m) gefordert.push({ slug: m[1], inhalt: m[2].trim(), basis: m[3].trim() });
  }
  const block = functionsPhp.match(/\$spa_pages\s*=\s*array\(([\s\S]*?)\);/);
  const vorhanden = new Set(
    block ? [...block[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]) : []
  );
  return {
    gefordert,
    routenGefunden: !!block,
    fehlend: gefordert.filter((g) => !vorhanden.has(g.slug)),
    routen: [...vorhanden].sort(),
  };
}

/**
 * Wie ein fremder Host in der Datenschutzerklärung heißen darf.
 *
 * Der reine Hostname taugt nicht als Suchbegriff: kein Mensch schreibt
 * „fonts.googleapis.com" in einen Rechtstext, sondern „Google Fonts". Jeder
 * Eintrag ordnet dem Host darum die Bezeichnungen zu, die dort tatsächlich
 * stehen dürfen — eine davon muss vorkommen.
 *
 * Ein Host, der hier NICHT steht, gilt als unbekannt und wird gemeldet. Ihn
 * stillschweigend durchzulassen wäre genau die Lücke, die diese Prüfung
 * schließen soll.
 */
export const DRITTANBIETER_NAMEN = {
  'fonts.googleapis.com': ['Google Fonts', 'Google Ireland', 'Google LLC'],
  'fonts.gstatic.com':    ['Google Fonts', 'Google Ireland', 'Google LLC'],
  'js.stripe.com':        ['Stripe'],
  'unpkg.com':            ['unpkg'],
  'cdn.jsdelivr.net':     ['jsDelivr'],
  'api.dicebear.com':     ['DiceBear'],
};

/**
 * Jeder Host, den die Website WIRKLICH lädt, muss in der
 * Datenschutzerklärung stehen.
 *
 * Gelesen werden die `wp_enqueue_*`- und `wp_register_*`-Aufrufe in
 * functions.php — also das, was ausgeliefert wird, nicht das, woran sich
 * jemand erinnert. Am 21.08.2026 fehlten so `unpkg.com` und
 * `cdn.jsdelivr.net` in beiden Listen, und die Erklärung behauptete
 * zusätzlich, Schriften und Symbole lägen lokal, während sie von Google
 * kamen. Das ist keine Formalie: eine Falschangabe über einen
 * Drittlandtransfer ist ein Verstoß gegen Art. 13 Abs. 1 lit. f DSGVO.
 */
export function drittanbieterPruefen(functionsPhp, datenschutzHtml, jsQuelle = '') {
  const ohneKommentar = functionsPhp
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const hosts = new Set();
  // Nur URLs, die wirklich eingebunden werden — nicht jede erwähnte Adresse.
  for (const m of ohneKommentar.matchAll(/wp_(?:enqueue|register)_(?:script|style)\s*\(([\s\S]{0,400}?)\)\s*;/g)) {
    for (const u of m[1].matchAll(/https:\/\/([a-z0-9.-]+)\//g)) hosts.add(u[1]);
  }

  /* Auch nachgeladene Skripte zählen.
   *
   * Am 02.09.2026 wurde Stripe.js von `wp_enqueue_script` auf einen
   * bedarfsgesteuerten Lader umgestellt — richtig für den Datenschutz, denn
   * vorher ging die IP jedes Besuchers an Stripe. Nur sah dieser Prüfer den
   * Host danach nicht mehr und meldete **„0 geladen"** für eine Seite, die
   * bei jeder Zahlung Stripe kontaktiert.
   *
   * Eine Verbesserung, die einem Tor sein Subjekt wegnimmt, macht das Tor
   * still wertlos — dieselbe Mechanik wie beim toten Gitleaks-Scan. Wer den
   * Ladeweg ändert, ändert nicht die Meldepflicht.
   *
   * Gesucht wird die Zuweisung an `.src`, also das, was wirklich eine
   * Anfrage auslöst — nicht jede im Code erwähnte Adresse. */
  const jsOhneKommentar = String(jsQuelle)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  for (const m of jsOhneKommentar.matchAll(
    /\.src\s*=\s*['"`]https:\/\/([a-z0-9.-]+)\//g)) {
    hosts.add(m[1]);
  }

  const fehlend = [];
  const unbekannt = [];
  for (const host of [...hosts].sort()) {
    const namen = DRITTANBIETER_NAMEN[host];
    if (!namen) { unbekannt.push(host); continue; }
    if (!namen.some((n) => datenschutzHtml.includes(n))) fehlend.push({ host, namen });
  }
  return { hosts: [...hosts].sort(), fehlend, unbekannt };
}

export function kiTransparenzPruefen(dateien, notizVorhanden) {
  const zustaende = new Set();
  let kennzeichnung = false;
  for (const { quelle } of dateien) {
    const text = ohneKommentare(quelle);
    if (/_aiDisclosureLabelsHtml\s*\(/.test(text)) kennzeichnung = true;
    for (const m of text.matchAll(/\bstate:\s*'(none|assisted|generated|open|undeclared)'/g)) zustaende.add(m[1]);
  }
  return {
    kennzeichnungImCode: kennzeichnung,
    zustaende: [...zustaende].sort(),
    notizVorhanden,
    // Eine Rechtsaussage, die nur im Code steht, ist nicht dokumentiert.
    luecke: kennzeichnung && !notizVorhanden,
  };
}

/* ── Zusammenführen ──────────────────────────────────────────────────── */

export function lageErheben() {
  const dateien = jsDateien(MODULE_DIR).map((pfad) => ({
    pfad: relative(ROOT, pfad),
    quelle: readFileSync(pfad, 'utf8'),
  }));
  const { schluessel, unaufloesbar } = schluesselImCode(dateien);
  const dokumentiert = schluesselInNotiz(readFileSync(COOKIE_LISTE, 'utf8'));

  return {
    erzeugt: new Date().toISOString(),
    dateienGeprueft: dateien.length,
    speicher: {
      imCode: schluessel, dokumentiert, unaufloesbar,
      ...speicherPruefen(schluessel, dokumentiert),
      ...klassenPruefen(
        schluessel,
        klassenImCode(readFileSync(join(MODULE_DIR, 'core', '00-basis.js'), 'utf8')),
        klassenInNotiz(readFileSync(COOKIE_LISTE, 'utf8')),
      ),
    },
    einwilligung: einwilligungPruefen(dateien),
    pflichtseiten: pflichtseitenPruefen(readFileSync(COMPLIANCE, 'utf8'), readFileSync(FUNCTIONS, 'utf8')),
    ki: kiTransparenzPruefen(dateien, existsSync(KI_NOTIZ)),
    // Die Module kommen mit: seit dem 02.09.2026 wird Stripe.js dort
    // nachgeladen statt in functions.php eingebunden. Ohne diese Quelle
    // meldete der Prüfer „0 geladen" für eine Seite, die bei jeder Zahlung
    // Stripe kontaktiert.
    drittanbieter: drittanbieterPruefen(
      readFileSync(FUNCTIONS, 'utf8'),
      readFileSync(SHELL, 'utf8'),
      dateien.map((d) => d.quelle).join('\n'),
    ),
  };
}

/**
 * Was ein Tor blockiert und was es nur meldet.
 *
 * Blockierend ist, was durch einen Commit ENTSTEHT und durch denselben
 * Commit behebbar ist: ein neuer Schlüssel ohne Eintrag, eine gestrichene
 * Route, eine fehlende KI-Notiz.
 *
 * Nicht blockierend ist die wirkungslose Einwilligung: sie ist ein
 * bestehender Befund, dessen Behebung Verhalten der Website ändert. Ein
 * Tor, das jeden PR blockiert, bis eine Produktentscheidung getroffen ist,
 * wird abgeschaltet — und dann prüft es gar nichts mehr. Sie steht darum
 * als Befund in der Notiz und im Auftragsstrom, nicht in der Sperre.
 */
export function befunde(lage) {
  const blockierend = [];
  const meldend = [];

  for (const e of lage.speicher.undokumentiert) {
    blockierend.push(`\`${e.key}\` wird in ${e.dateien.join(', ')} gesetzt, steht aber in keiner Cookie-Liste (TDDDG § 25, DSGVO Art. 13).`);
  }
  for (const k of lage.speicher.ohneCode) {
    meldend.push(`\`${k}\` steht in der Cookie-Liste, wird im Frontend aber nirgends benutzt — die Notiz beschreibt eine ältere Website.`);
  }
  for (const k of lage.speicher.ohneKlasse || []) {
    blockierend.push(`\`${k}\` hat keine Klasse in EB_SPEICHER_KLASSEN — ohne Eintrag gilt er als profilbildend, und das war vermutlich nicht gemeint.`);
  }
  for (const u of lage.speicher.uneinig || []) {
    blockierend.push(`\`${u.key}\`: Code sagt „${u.code}", die Cookie-Liste sagt „${u.notiz}" — genau hier darf nichts auseinanderlaufen.`);
  }
  for (const u of lage.speicher.unaufloesbar) {
    meldend.push(`Schlüssel in ${u.datei} nicht auflösbar: \`${u.ausdruck}\` — von Hand prüfen.`);
  }
  if (!lage.pflichtseiten.routenGefunden) {
    blockierend.push('In functions.php ist kein `$spa_pages`-Array auffindbar — die Pflichtseiten lassen sich nicht prüfen.');
  }
  for (const f of lage.pflichtseiten.fehlend) {
    blockierend.push(`Pflichtseite \`/${f.slug}\` (${f.basis}) hat keine Route in functions.php.`);
  }
  for (const f of lage.drittanbieter?.fehlend || []) {
    blockierend.push(`\`${f.host}\` wird ausgeliefert, steht aber in keiner Datenschutzerklärung (DSGVO Art. 13 Abs. 1 lit. f) — erwartet als „${f.namen[0]}".`);
  }
  for (const h of lage.drittanbieter?.unbekannt || []) {
    // BLOCKIEREND, nicht bloss gemeldet. Ein unbekannter Host im
    // Auslieferungspfad ist ein NEUER Datenfluss an einen Dritten — der
    // gefaehrlichste Fall, nicht der harmloseste. Ein erster Entwurf hat ihn
    // nur gemeldet, mit der Begruendung, der Pruefer koenne den richtigen
    // Namen nicht kennen. Das ist wahr und trotzdem kein Grund
    // durchzuwinken: derselbe Commit kann ihn eintragen.
    blockierend.push(`\`${h}\` wird ausgeliefert und ist dem Prüfer unbekannt — in DRITTANBIETER_NAMEN eintragen und in der Datenschutzerklärung nennen (DSGVO Art. 13 Abs. 1 lit. f).`);
  }
  if (lage.ki.luecke) {
    blockierend.push('Der Code kennzeichnet KI-Inhalte, der Vault beschreibt die Kennzeichnung nicht (EU AI Act Art. 50).');
  }
  if (lage.einwilligung.wirkungslos) {
    meldend.push(`Die Einwilligung wird erhoben (${lage.einwilligung.bannerDatei}), aber von keiner der ${lage.einwilligung.schreiberGesamt} schreibenden Dateien gelesen — sie bewirkt derzeit nichts (TDDDG § 25 Abs. 1).`);
  }
  return { blockierend, meldend };
}

/* ── Notiz schreiben ─────────────────────────────────────────────────── */

function tabelle(zeilen) {
  return zeilen.length ? zeilen.join('\n') : '| — | — | — |';
}

export function notizBauen(lage, b) {
  const s = lage.speicher;
  const dok = [...s.dokumentiert.keys()];
  return `---
layer: L4
domain: governance
share: internal
tags: [layer/L4, domain/governance, share/internal]
---

# Rechtliche Lage — gemessen

> **Erzeugt von \`scripts/recht.mjs\`. Nicht von Hand bearbeiten.**
> Stand: ${lage.erzeugt.slice(0, 16).replace('T', ' ')} UTC · ${lage.dateienGeprueft} Frontend-Module geprüft.

Diese Notiz vergleicht, was der Vault über die Plattform behauptet, mit dem,
was der Code tut. Sie ersetzt keine Rechtsberatung: sie prüft nur, ob
Beschreibung und Software dasselbe sagen.

## Lage in einem Satz

${b.blockierend.length
  ? `**${b.blockierend.length} Abweichung${b.blockierend.length === 1 ? '' : 'en'}, die ein PR beheben kann** — dazu ${b.meldend.length} Befund${b.meldend.length === 1 ? '' : 'e'} zur Kenntnis.`
  : (b.meldend.length
    ? `Keine Abweichung, die ein PR beheben kann — aber **${b.meldend.length} Befund${b.meldend.length === 1 ? '' : 'e'} zur Kenntnis**.`
    : 'Beschreibung und Code sagen dasselbe.')}

${b.blockierend.length ? '### Blockierend\n\n' + b.blockierend.map((x) => `- ${x}`).join('\n') + '\n' : ''}
${b.meldend.length ? '### Zur Kenntnis\n\n' + b.meldend.map((x) => `- ${x}`).join('\n') + '\n' : ''}
## Speicherschlüssel im Frontend (TDDDG § 25)

${s.imCode.length} Schlüssel im Code, ${dok.length} in der Cookie-Liste beschrieben.

| Schlüssel | Speicher | Modul |
|---|---|---|
${tabelle(s.imCode.map((e) => `| \`${e.key}\` | ${e.speicher.join(', ')} | ${e.dateien.map((d) => d.replace('js/modules/', '')).join(', ')} |`))}

${s.unaufloesbar.length
  ? `> ⚠︎ ${s.unaufloesbar.length} Aufruf(e) konnten nicht aufgelöst werden. Sie sind oben **nicht** enthalten — die Liste ist insoweit unvollständig, und das steht hier, statt Vollständigkeit zu behaupten.`
  : '> Alle Aufrufe waren auflösbar — die Liste ist vollständig.'}

## Einwilligung (TDDDG § 25 Abs. 1)

| Frage | Messung |
|---|---|
| Wo wird die Antwort gesetzt? | ${lage.einwilligung.bannerDatei || '— nirgends'} |
| Dateien, die Speicher schreiben | ${lage.einwilligung.schreiberGesamt} |
| davon prüfen die Antwort | **${lage.einwilligung.schreiberMitPruefung}** |

${lage.einwilligung.wirkungslos
  ? 'Die Einwilligung wird erhoben und von keiner Schreibstelle gelesen. Rechtlich ist das der ungünstigste Zustand: das Banner belegt, dass die Einwilligungspflicht erkannt wurde, und die Software hält sie nicht ein. Die Behebung ändert sichtbares Verhalten (abgelehnte Einwilligung = kein gespeichertes Theme, keine gemerkte Suche) und ist deshalb eine Entscheidung des Inhabers, kein automatischer Patch.'
  : 'Mindestens eine Schreibstelle richtet sich nach der Antwort.'}

## Pflichtseiten

${lage.pflichtseiten.gefordert.length} gefordert, ${lage.pflichtseiten.fehlend.length} ohne Route.

| Slug | Rechtsgrundlage | Route |
|---|---|---|
${tabelle(lage.pflichtseiten.gefordert.map((g) => `| \`/${g.slug}\` | ${g.basis} | ${lage.pflichtseiten.fehlend.some((f) => f.slug === g.slug) ? '**fehlt**' : 'vorhanden'} |`))}

## KI-Transparenz (EU AI Act Art. 50, DSA, UWG § 5)

| Frage | Messung |
|---|---|
| Kennzeichnet der Code KI-Inhalte? | ${lage.ki.kennzeichnungImCode ? 'ja' : 'nein'} |
| Deklarationszustände | ${lage.ki.zustaende.length ? lage.ki.zustaende.map((z) => `\`${z}\``).join(', ') : '—'} |
| Beschreibt der Vault sie? | ${lage.ki.notizVorhanden ? 'ja → [[40-Governance/Legal/KI-Transparenz]]' : '**nein**'} |

## Drittanbieter im Auslieferungspfad (DSGVO Art. 13 Abs. 1 lit. f)

Jeder Host, den \`wp_enqueue_*\` wirklich einbindet — nicht der, an den man sich
erinnert. Beim Abruf erfährt der Betreiber die IP des Besuchers.

| Host | In der Datenschutzerklärung |
|---|---|
${(lage.drittanbieter?.hosts || []).length
  ? tabelle(lage.drittanbieter.hosts.map((h) => `| \`${h}\` | ${lage.drittanbieter.fehlend.some((f) => f.host === h) ? '**fehlt**' : lage.drittanbieter.unbekannt.includes(h) ? '⚠︎ Prüfer kennt ihn nicht' : 'genannt'} |`))
  : '| — | nicht erhoben |'}

## Verknüpft

- [[40-Governance/Legal/Compliance-Overview]]
- [[40-Governance/Legal/Cookie-Liste]]
- [[40-Governance/Legal/KI-Transparenz]]
- [[40-Governance/Legal/Auftragsverarbeiter]]
`;
}

/* ── Einstieg ────────────────────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  const lage = lageErheben();
  const b = befunde(lage);

  if (args.includes('--check')) {
    console.log('── Rechtliche Lage ──────────────────────────────');
    console.log(`Frontend-Module      : ${lage.dateienGeprueft}`);
    console.log(`Speicherschlüssel    : ${lage.speicher.imCode.length} im Code, ${lage.speicher.dokumentiert.size} beschrieben`);
    console.log(`Pflichtseiten        : ${lage.pflichtseiten.gefordert.length} gefordert, ${lage.pflichtseiten.fehlend.length} ohne Route`);
    console.log(`Einwilligung wirksam : ${lage.einwilligung.wirkungslos ? 'nein' : 'ja'}`);
    console.log(`Fremde Hosts         : ${lage.drittanbieter.hosts.length} geladen, ${lage.drittanbieter.fehlend.length} ohne Eintrag`);
    for (const m of b.meldend) console.log(`   ℹ ${m}`);
    if (b.blockierend.length) {
      console.error('⛔ Recht:\n' + b.blockierend.map((f) => `   - ${f}`).join('\n'));
      console.error('   → node scripts/recht.mjs ausführen und die Cookie-Liste ergänzen.');
      process.exit(1);
    }
    console.log('✓ Beschreibung und Code sagen dasselbe (blockierende Prüfungen).');
    console.log('─────────────────────────────────────────────────');
    return;
  }

  const notiz = notizBauen(lage, b);
  if (args.includes('--print')) { console.log(notiz); return; }
  writeFileSync(ZIEL, notiz);
  console.log(`✓ vault/40-Governance/Legal/Rechtliche-Lage.md — ${b.blockierend.length} blockierend, ${b.meldend.length} zur Kenntnis.`);
}

if (process.argv[1] && process.argv[1].endsWith('recht.mjs')) main();
