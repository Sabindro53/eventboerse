// YAML ohne Kommentare — der gemeinsame Griff.
//
// ── WARUM ES IHN GIBT ──────────────────────────────────────────────────
//
// In diesem Projekt sind schon mehrere Pruefungen daran gescheitert, dass
// ihr Muster das erklaerende Wort im Kommentar getroffen hat statt die
// Zeile im Code: `recht.mjs`, `kontext.mjs`, die Mutationsproben, der
// Kontaktschutz, die Erstattungsregel, der Storno-Knopf. Fuer JS, PHP, CSS
// und HTML gibt es dafuer je einen gemeinsamen Griff — fuer YAML fehlte er.
//
// Gebraucht wird er zuerst fuer die Workflow-Dateien: `tagesroutine.yml`
// nennt `auftragsstrom` in seinen erklaerenden Absaetzen mehrfach. Ein
// Ausdruck ueber die rohe Datei ist dort gruen, sobald jemand den Schritt
// entfernt und den Kommentar stehen laesst — und das ist die
// wahrscheinlichste Gestalt genau dieses Unfalls.
//
// ── WARUM ZEICHENWEISE UND NICHT PER AUSDRUCK ──────────────────────────
//
// `.replace(/#.*$/gm, '')` sieht richtig aus und schneidet mitten aus
// `color: '#b45309'` oder `sed 's/#//'`. In YAML beginnt ein Kommentar nur
// dort, wo `#` am Zeilenanfang steht oder ein Leerzeichen davor — und nie
// innerhalb einer Zeichenkette. Beides laesst sich nur zeichenweise
// entscheiden.
//
// Eine Zeichenkette endet hier spaetestens am Zeilenende. YAML erlaubt
// mehrzeilige Anfuehrungen; das kaeme einer unbalancierten Anfuehrung in
// einem Shell-Block aber teuer zu stehen — dann waere der ganze Rest der
// Datei „Zeichenkette" und kein Kommentar mehr auffindbar. Zeilenweise zu
// schliessen irrt hoechstens ueber eine Zeile, nie ueber die Datei.

/**
 * Entfernt YAML-Kommentare und laesst Zeichenketten unangetastet.
 * Die Laenge bleibt erhalten (Kommentare werden durch Leerzeichen ersetzt),
 * damit Zeilennummern und Positionen einer Fehlermeldung weiter stimmen.
 *
 * @param {string} text YAML-Quelltext
 * @returns {string} derselbe Text, Kommentare durch Leerraum ersetzt
 */
function ohneYamlKommentare(text) {
  const s = String(text);
  let aus = '';
  let i = 0;
  let zeilenAnfang = true;
  while (i < s.length) {
    const c = s[i];
    if (c === '\n') { aus += c; i++; zeilenAnfang = true; continue; }

    if (c === '"' || c === "'") {
      const ende = c;
      aus += c;
      i++;
      while (i < s.length && s[i] !== '\n') {
        if (ende === '"' && s[i] === '\\') { aus += s.slice(i, i + 2); i += 2; continue; }
        aus += s[i];
        i++;
        if (s[i - 1] === ende) break;
      }
      zeilenAnfang = false;
      continue;
    }

    // Kommentar nur am Zeilenanfang (nach Leerraum) oder nach Leerraum.
    if (c === '#' && (zeilenAnfang || s[i - 1] === ' ' || s[i - 1] === '\t')) {
      while (i < s.length && s[i] !== '\n') { aus += ' '; i++; }
      continue;
    }

    if (c !== ' ' && c !== '\t') zeilenAnfang = false;
    aus += c;
    i++;
  }
  return aus;
}

module.exports = { ohneYamlKommentare };
