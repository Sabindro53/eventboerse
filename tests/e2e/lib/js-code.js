// Der gemeinsame Griff: JavaScript ohne seine Kommentare.
//
// ── WARUM ER HIER LIEGT UND NICHT IN JEDER SUITE ───────────────────────
//
// In diesem Projekt ist der teuerste wiederkehrende Prüffehler ein Muster,
// das den **erklärenden Kommentar** trifft statt der Codezeile. Er hat
// getroffen: den `require_once`-Pfad des Kontaktschutzes, `$owner_match`
// in der Erstattungsprüfung, das Wort „npx" neben dem Aufruf, die
// Alkohol-Merkmalsliste — und am 13.09.2026 die Frage, ob
// `ebStornoBeantragen()` überhaupt einen Aufrufer hat: der Kommentar
// daneben nannte den Namen, die Mutation „Knopf entfernt" überlebte, und
// zehn Tests blieben grün über einem Vorgang ohne Eingang.
//
// Für HTML gibt es `lib/html-kommentare.js`, für PHP `lib/php-code.js` —
// beide entstanden aus demselben Befund. Für JavaScript stand der Griff
// bis heute **lokal in `pruefhygiene.spec.js`**, also genau als die Kopie,
// die diese Datei verhindern soll. Eine Fundstelle zu beheben verhindert
// die nächste nicht, solange jede Suite den Griff von Hand nachbaut.
//
// ── WARUM ZEICHENWEISE ─────────────────────────────────────────────────
//
// Ein regulärer Ausdruck über Kommentargrenzen ist genau der Griff, den
// `pruefhygiene.spec.js` verbietet: `'https://api.stripe.com/…'` enthält
// `//` und wäre ab dort verschluckt. Der Zustand unterscheidet deshalb
// Zeichenkette, Zeilenkommentar, Blockkommentar und regulären Ausdruck —
// ohne Letzteres würde `/<!--/` als Divisionszeichen gelesen.
//
// Zeilenumbrüche bleiben erhalten, damit Zeilennummern in Fehlermeldungen
// weiter brauchbar sind.

/**
 * Erkennt, ob ein `/` an dieser Stelle einen regulären Ausdruck eröffnet.
 *
 * Entschieden wird am letzten bedeutungstragenden Zeichen davor: nach
 * einem Wert (`)`, `]`, Name, Zahl) ist `/` eine Division, sonst der
 * Anfang eines Ausdrucks. Das ist die übliche Heuristik; sie irrt nur bei
 * Konstruktionen, die in diesem Projekt nicht vorkommen.
 */
function istRegexAnfang(aus) {
  for (let k = aus.length - 1; k >= 0; k--) {
    const z = aus[k];
    if (/\s/.test(z)) continue;
    if (/[)\]}]/.test(z)) return false;
    if (/[A-Za-z0-9_$]/.test(z)) {
      // `return /…/` und `typeof /…/` sind Ausdrücke, `x /…` ist Division.
      const wort = (aus.slice(0, k + 1).match(/[A-Za-z0-9_$]+$/) || [''])[0];
      return ['return', 'typeof', 'case', 'in', 'of', 'delete', 'void',
        'instanceof', 'new', 'do', 'else', 'yield', 'await'].includes(wort);
    }
    return true;
  }
  return true;
}

/**
 * Entfernt JS-Kommentare, damit eine Prüfung Code trifft und nicht Prosa.
 *
 * @param {string} quelle  JavaScript-Quelltext
 * @returns {string}       derselbe Text ohne Kommentare, Zeilen erhalten
 */
function ohneJsKommentare(quelle) {
  let aus = '';
  let i = 0;
  let zustand = 'code';
  let anfuehrung = '';
  while (i < quelle.length) {
    const z = quelle[i];
    const zz = quelle.slice(i, i + 2);
    if (zustand === 'code') {
      if (zz === '//') { zustand = 'zeile'; i += 2; continue; }
      if (zz === '/*') { zustand = 'block'; i += 2; continue; }
      if (z === '/' && istRegexAnfang(aus)) {
        zustand = 'regex'; aus += z; i++; continue;
      }
      if (z === '"' || z === "'" || z === '`') {
        zustand = 'text'; anfuehrung = z; aus += z; i++; continue;
      }
      aus += z; i++; continue;
    }
    if (zustand === 'zeile') {
      if (z === '\n') { zustand = 'code'; aus += z; }
      i++; continue;
    }
    if (zustand === 'block') {
      if (zz === '*/') { zustand = 'code'; i += 2; continue; }
      if (z === '\n') aus += z;            // Zeilennummern bleiben brauchbar
      i++; continue;
    }
    if (zustand === 'regex') {
      if (z === '\\') { aus += quelle.slice(i, i + 2); i += 2; continue; }
      // Eine Zeichenklasse darf ein unmaskiertes `/` tragen: /[a-z/]/
      if (z === '[') {
        const bis = quelle.indexOf(']', i);
        const ende = bis < 0 ? quelle.length : bis + 1;
        aus += quelle.slice(i, ende); i = ende; continue;
      }
      if (z === '/' || z === '\n') { zustand = 'code'; }
      aus += z; i++; continue;
    }
    // Zeichenkette
    if (z === '\\') { aus += quelle.slice(i, i + 2); i += 2; continue; }
    if (z === anfuehrung) { zustand = 'code'; }
    aus += z; i++;
  }
  return aus;
}

module.exports = { ohneJsKommentare, istRegexAnfang };
