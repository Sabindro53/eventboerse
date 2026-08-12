/**
 * verbotsmuster.mjs — eine Quelle der Wahrheit für „das darf da nicht rein".
 *
 * Zwei Klassen, weil sie unterschiedliche Reichweite haben:
 *
 *   GEHEIMNISSE      Zugangsdaten, Schlüssel, Infrastruktur, personenbezogene
 *                    Daten. Diese haben NIRGENDS etwas verloren — weder im
 *                    öffentlichen Export noch in einer internen Recherche-Notiz.
 *                    Ein Stripe-Key wird nicht dadurch harmlos, dass die Notiz
 *                    `share: internal` trägt.
 *
 *   ANGRIFFSFLAECHE  Abwehrmechanismen beim Namen nennen (Signaturlogik,
 *                    Rate-Limit-Schwellen, Session-Interna). Intern ist das
 *                    nötiges Betriebswissen — im öffentlichen Export ist es
 *                    eine Landkarte für Angreifer.
 *
 * Regeln dazu: vault/00-Kern/Sicherheits-Klassifikation.md
 */

/**
 * Wie viel einer Aufgaben-Datei tatsächlich an den Anbieter geht.
 *
 * Steht hier, weil zwei Stellen dieselbe Zahl brauchen: `agent.mjs` schneidet
 * beim Bauen des Kontexts zu, `models.mjs --check` muss beim Prüfen denselben
 * Ausschnitt ansehen. Liefen die auseinander, ginge eine Aufgabe durchs Tor
 * und stürbe nachts in der Schicht — genau das ist am 07.08. passiert.
 */
export const AUFGABEN_AUSSCHNITT = 3000;

/** Gilt überall im Vault — auch für `internal` und `secret`. */
export const GEHEIMNISSE = [
  { re: /\bsk_(live|test)_[A-Za-z0-9]/i,        why: 'Stripe-Secret-Key-Muster' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,   why: 'Privater Schlüssel' },
  { re: /\b(api[_-]?key|apikey)\s*[:=]\s*\S+/i, why: 'API-Key-Zuweisung' },
  { re: /\bbearer\s+[A-Za-z0-9._-]{12,}/i,      why: 'Bearer-Token' },
  { re: /\b(passwor[dt]|secret)\s*[:=]\s*\S+/i, why: 'Passwort/Secret-Zuweisung' },
  { re: /\bwp-config\b/i,                       why: 'WordPress-Konfiguration' },
  { re: /\b\d{1,3}(\.\d{1,3}){3}\b/,            why: 'IP-Adresse' },
  { re: /\bsftp:\/\/|\bssh:\/\/|\bmysql:\/\//i, why: 'Infrastruktur-Zugang' },
  // E-Mail-Adressen, ausgenommen die offizielle Support-Adresse
  { re: /(?!kontakt@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, why: 'E-Mail-Adresse' },
];

/** Gilt zusätzlich für alles, was die Website erreicht (`share: public`). */
export const ANGRIFFSFLAECHE = [
  { re: /webhook-?signatur/i, why: 'Webhook-Signaturlogik (Angriffsfläche)' },
  { re: /rate-?limit/i,       why: 'Rate-Limit-Interna (Angriffsfläche)' },
  { re: /\bnonce\b/i,         why: 'Nonce-/Session-Interna (Angriffsfläche)' },
];

/** Was der öffentliche Export prüfen muss: beides. */
export const OEFFENTLICH_VERBOTEN = [...GEHEIMNISSE, ...ANGRIFFSFLAECHE];

/**
 * Prompt-Injection-Signaturen. Fremdtext ist Daten, keine Anweisung
 * (MCP-Architektur §4.4) — deshalb ist ein Treffer INNERHALB des
 * Fremdtext-Blocks kein Fehler, sondern erwartbar. Ein Treffer AUSSERHALB
 * bedeutet, dass die Anweisung aus der Quelle in unseren eigenen Text
 * gewandert ist. Das ist der Fall, den wir abfangen.
 */
export const INJEKTIONS_SIGNATUREN = [
  { re: /ignorier[ea]?\s+(alle\s+)?(deine|vorherige|bisherige|obige)/i, why: '„ignoriere deine Anweisungen"' },
  { re: /vergiss\s+(alle[sn]?\s+)?(deine|vorherige|bisherige)/i,        why: '„vergiss deine Anweisungen"' },
  { re: /\b(system[- ]?prompt|systemanweisung)\b/i,                     why: 'Verweis auf den System-Prompt' },
  { re: /\bdu\s+bist\s+(jetzt|ab\s+sofort)\b/i,                         why: 'Rollenübernahme („du bist jetzt …")' },
  { re: /\bdisregard\s+(all\s+)?(previous|prior|above)/i,               why: '„disregard previous instructions"' },
  { re: /\bignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,  why: '„ignore previous instructions"' },
];

/** Erster Treffer oder null. */
export function ersterTreffer(text, muster) {
  const s = String(text || '');
  return muster.find((m) => m.re.test(s)) || null;
}

/** Alle Treffer (für Berichte, in denen mehr als der erste zählt). */
export function alleTreffer(text, muster) {
  const s = String(text || '');
  return muster.filter((m) => m.re.test(s));
}

/**
 * Ordner, deren Inhalt das Repo nie in Richtung eines fremden Dienstes
 * verlässt — unabhängig davon, was drinsteht.
 *
 * Der Grund steht in `vault/00-Kern/Sicherheits-Klassifikation.md`: der
 * gesamte Security-Ordner ist `share: secret`. Ein Musterscan reicht dafür
 * NICHT. Diese Notizen enthalten nachweislich keine Zugangsdaten, sondern
 * Beschreibungen — sie würden jeden Geheimnis-Scan anstandslos passieren und
 * wären trotzdem eine Landkarte der Angriffsfläche in fremder Hand.
 *
 * Deshalb wird hier am Pfad entschieden, nicht am Inhalt.
 */
export const GESPERRTE_PFADE = [
  'vault/40-Governance/Security',
  '.git',
  'node_modules',
];

/**
 * Darf diese Repo-Datei an ein externes Modell gehen?
 *
 * Prüft drei Dinge, jedes für sich ein K.-o.:
 *   1. Pfad verlässt das Repo (`/…`, `..`)
 *   2. Pfad liegt in einem gesperrten Ordner
 *   3. Frontmatter der Datei führt `share: secret`
 *
 * Punkt 3 fängt den Fall ab, dass eine Notiz später als geheim eingestuft
 * wird, ohne in den Security-Ordner zu wandern.
 *
 * @returns {null|{why: string}} null = darf raus.
 */
export function darfNichtRaus(pfad, inhalt) {
  const p = String(pfad || '').replace(/\\/g, '/');
  if (!p || p.startsWith('/') || p.split('/').includes('..')) {
    return { why: `Pfad verlässt das Repo: ${p}` };
  }
  for (const g of GESPERRTE_PFADE) {
    if (p === g || p.startsWith(`${g}/`)) return { why: `gesperrter Ordner: ${g}` };
  }
  // Nur den Frontmatter-Kopf ansehen — „share: secret" irgendwo im Fließtext
  // ist eine Erwähnung, keine Einstufung.
  const kopf = String(inhalt || '').slice(0, 400);
  if (/^---[\s\S]*?^share:\s*secret\s*$/m.test(kopf)) {
    return { why: `Notiz ist share: secret (${p})` };
  }
  return null;
}
