// CSS ohne Kommentare — der gemeinsame Griff.
//
// ── WARUM ES IHN GIBT ──────────────────────────────────────────────────
//
// Am 15.09.2026 hat der Token-Waechter in `design-system.spec.js` einen
// Fehler gemeldet, den es nicht gab: `styles.css: --x`. Die Fundstelle war
// ein ERKLAERENDER KOMMENTAR, der `var(--x, literal)` als Beispiel nennt —
// geschrieben in derselben Sitzung, in der der Waechter repariert wurde.
//
// Das ist in diesem Projekt der siebte Fall derselben Klasse: ein Muster
// trifft das Wort im Kommentar statt die Zeile im Code. Fuer JS, PHP und
// HTML gibt es dafuer laengst je einen gemeinsamen Griff
// (`lib/js-code.js`, `lib/php-code.js`, `lib/html-kommentare.js`); fuer CSS
// fehlte er, und jede kuenftige CSS-Pruefung haette ihn neu gebaut.
//
// ── WARUM ZEICHENWEISE UND NICHT PER AUSDRUCK ──────────────────────────
//
// `.replace(/\/\*[\s\S]*?\*\//g, '')` sieht richtig aus und schneidet in
// `content: "/*"` mitten in eine Zeichenkette. CSS erlaubt `/*` in Strings,
// und `url(...)` darf ebenfalls Zeichen tragen, die wie ein Kommentaranfang
// aussehen. Ein Ausdruck ueber Kommentargrenzen ist genau der Griff, den
// `pruefhygiene.spec.js` verbietet.
//
// CSS-Kommentare schachteln nicht: das erste `*/` beendet den Kommentar.

/**
 * Entfernt alle CSS-Kommentare und laesst dabei Zeichenketten unangetastet.
 * Die Laenge bleibt erhalten (Kommentare werden durch Leerzeichen ersetzt),
 * damit Zeilennummern und Positionen einer Fehlermeldung weiter stimmen.
 *
 * @param {string} text CSS-Quelltext
 * @returns {string} derselbe Text, Kommentare durch Leerraum ersetzt
 */
function ohneCssKommentare(text) {
  const s = String(text);
  let aus = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    // Zeichenkette: bis zum passenden Anfuehrungszeichen unveraendert
    // uebernehmen. Ein `\` maskiert das naechste Zeichen.
    if (c === '"' || c === "'") {
      const ende = c;
      aus += c;
      i++;
      while (i < s.length) {
        if (s[i] === '\\') { aus += s.slice(i, i + 2); i += 2; continue; }
        aus += s[i];
        if (s[i] === ende) { i++; break; }
        // Eine unbeendete Zeichenkette endet in CSS an der Zeile.
        if (s[i] === '\n') { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      const ende = s.indexOf('*/', i + 2);
      const bis = ende === -1 ? s.length : ende + 2;
      // Zeilenumbrueche behalten, damit Zeilennummern stimmen.
      for (let k = i; k < bis; k++) aus += s[k] === '\n' ? '\n' : ' ';
      i = bis;
      continue;
    }
    aus += c;
    i++;
  }
  return aus;
}

module.exports = { ohneCssKommentare };
