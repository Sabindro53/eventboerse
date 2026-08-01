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
