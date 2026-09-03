/**
 * Wie viel Kontext an ein Modell geht — und was passiert, wenn es zu viel ist.
 *
 * Ein Diff über tausende Zeilen kostet Geld und bringt keine bessere Antwort,
 * also wird gekürzt. Die Frage ist nur, ob das Modell davon erfährt.
 *
 * BIS ZUM 30.08.2026 ERFUHR ES NICHTS. `kontext.slice(0, 12000)` schnitt
 * still ab, und der Code-Prüfer meldete daraufhin am PR #220:
 *
 *   „Zeile 1080: `// Firefox kennt nur report-ur` — Satz ist unvollständig
 *    abgeschnitten. Der folgende Header-Aufruf fehlt. Dies führt zu einem
 *    Syntaxfehler."
 *
 * Der Diff war 95 607 Zeichen lang; das Modell sah die ersten 12 000, las bis
 * zur Schnittkante und beschrieb, was dort steht. Es hat nicht falsch geraten
 * — ihm wurde nur nicht gesagt, dass sein Text mitten im Wort endet. Dazu ein
 * zweiter Befund derselben Ursache: zwei REST-Routen seien „nirgends
 * registriert", weil ihre Registrierung hinter der Grenze lag.
 *
 * Beide Befunde waren falsch, und beide klangen konkret. Ein Prüfer, der
 * zweimal grundlos anschlägt, wird abgeschaltet — und der eine echte Befund,
 * den er irgendwann hat, geht mit ihm.
 */

/** Zeichen, die höchstens an den Anbieter gehen. */
export const KONTEXT_MAX = 12000;

/**
 * Kürzt und sagt es dazu.
 *
 * Der Hinweis nennt BEIDE Zahlen. „Gekürzt" allein genügt nicht: erst der
 * Anteil sagt, ob man einem Urteil über das Ganze trauen darf — 12 000 von
 * 13 000 ist etwas anderes als 12 000 von 400 000.
 */
export function kontextKuerzen(text, grenze = KONTEXT_MAX) {
  const voll = String(text || '');
  if (voll.length <= grenze) return voll;
  return `${voll.slice(0, grenze)}\n\n`
    + `[AUSSCHNITT — hier enden die ersten ${grenze} von ${voll.length} `
    + `Zeichen. Der Text bricht mitten im Inhalt ab; das ist die Grenze `
    + `dieses Ausschnitts und KEIN Fehler im Quelltext. Urteile nur über `
    + `das, was du wirklich siehst.]`;
}
