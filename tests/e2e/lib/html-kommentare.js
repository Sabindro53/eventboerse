// HTML-Kommentare berücksichtigen, ohne sie aus dem Text zu schneiden.
//
// Warum das eine eigene Datei ist:
//
// Am 01.09.2026 meldete CodeQL „Incomplete multi-character sanitization" an
// `.replace(/<!--[\s\S]*?-->/g, '')` in auslieferung.spec.js. Ein einmaliger
// Schnitt an einem mehrzeichigen Konstrukt kann bei Verschachtelung einen Rest
// stehen lassen. Ich habe die Stelle umgebaut — und am 02.09. dieselbe Zeile
// in app-store.spec.js NEU geschrieben, im Fix für genau diesen Befund.
//
// Eine einzelne Fundstelle zu beheben verhindert die nächste nicht. Solange
// jede Suite den Griff von Hand nachbaut, kommt er zurück; die Frage ist nur,
// nach wie vielen Tagen. Deshalb steht er hier einmal, richtig.
//
// Der Unterschied: Bereiche werden GEMESSEN, nicht herausgeschnitten. Wer nur
// misst, hat das Problem des unvollständigen Schnitts nicht — und er verliert
// auch keine Positionen, was das Melden von Fundstellen erst möglich macht.
//
// Eine Sicherheitslücke war keine dieser Stellen: der Text kommt aus dem
// eigenen Repository und wird nie gerendert. Trotzdem geändert statt
// weggeklickt — ein Scanner, der grundlos anschlägt, wird nach dem dritten Mal
// abgeschaltet, und dann geht der eine echte Befund mit ihm.

/** Zeichenbereiche `[von, bis)` aller HTML-Kommentare. */
function kommentarBereiche(text) {
  return [...String(text).matchAll(/<!--[\s\S]*?-->/g)]
    .map((m) => [m.index, m.index + m[0].length]);
}

/** Liegt die Position innerhalb eines Kommentars? */
function imKommentar(bereiche, pos) {
  return bereiche.some(([a, b]) => pos >= a && pos < b);
}

/**
 * Alle Treffer eines Musters, die NICHT in einem Kommentar stehen.
 *
 * Gibt `{ text, index }` je Treffer zurück — die Position bleibt erhalten,
 * damit eine Fehlermeldung sagen kann, wo etwas steht.
 *
 * Das Muster muss global (`g`) sein; sonst liefert `matchAll` einen Fehler,
 * und ein Test, der wegen eines vergessenen Flags nichts findet, sähe grün
 * aus.
 */
function trefferAusserhalbKommentaren(text, muster) {
  if (!muster.global) {
    throw new Error('Das Muster braucht das g-Flag, sonst findet matchAll nichts.');
  }
  const bereiche = kommentarBereiche(text);
  return [...String(text).matchAll(muster)]
    .filter((m) => !imKommentar(bereiche, m.index))
    .map((m) => ({ text: m[0], index: m.index }));
}

module.exports = { kommentarBereiche, imKommentar, trefferAusserhalbKommentaren };
