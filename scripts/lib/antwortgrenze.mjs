/**
 * Die Antwortgrenze der Schicht-Rollen — eine Zahl, zwei Seiten.
 *
 * Der Auftrag an jede Rolle endet mit „in höchstens N Wörtern"; das
 * Token-Budget im selben Aufruf muss diese N Wörter tragen können. Bis zum
 * 26.08.2026 standen beide Zahlen in verschiedenen Dateien und widersprachen
 * sich: der Auftrag erlaubte 90 Wörter, sechs der elf Rollen bekamen 180 bis
 * 240 Token. Wer der Anweisung folgte, wurde abgeschnitten.
 *
 * Gemessen an den Läufen 905, 908 und 910 — vier Antworten, die durchkamen:
 *
 *   Noah Stern   62 Wörter in ≤ 180 Token   ≤ 2,90 Token/Wort
 *   Rhea Malik   77 Wörter in ≤ 220 Token   ≤ 2,86 Token/Wort
 *   Ela Voss     58 Wörter in ≤ 200 Token   ≤ 3,45 Token/Wort
 *   Lina Okafor  69 Wörter in ≤ 180 Token   ≤ 2,61 Token/Wort
 *
 * Keine dieser Antworten kam auch nur in die Nähe von 90 Wörtern — die Werte
 * sind Obergrenzen, keine Messwerte, der wahre Bedarf liegt darüber. Deutsche
 * Komposita und das Markdown, das die Rollen benutzen (Fettung, Aufzählungen,
 * Belegzeilen), kosten mit. Deshalb wird mit dem OBEREN Rand gerechnet: eine
 * zu knappe Schätzung erzeugt genau den Fehler wieder, den sie beheben soll,
 * und zwar unsichtbar — abgeschnitten wird erst im Betrieb.
 *
 * Die Kosten dieser Aufstockung sind gemessen, nicht geschätzt: ein
 * Rollenaufruf kostete laut Journal $0,0001–0,00017 bei 1200–2100 Token.
 * Rund 120 Token mehr je Rolle sind bei 11 Rollen und 48 Läufen am Tag
 * höchstens ~$0,005 täglich gegen ein Tagesbudget von $0,50 — und nur dort,
 * wo heute abgeschnitten wird, also wo ohnehin voll bezahlt und nichts
 * geliefert wird. Nach oben begrenzt die Wortgrenze die Länge, nicht das
 * Token-Budget: eine Rolle, die 70 Wörter schreibt, wird davon nicht länger.
 */

/** Wortgrenze aus dem Auftragstext. Ändern heißt: beide Seiten ändern. */
export const WORTGRENZE = 90;

/**
 * Oberer Rand der gemessenen Spanne (2,61–3,45). Bewusst der obere: das
 * Budget darf großzügig sein, die Anweisung hält die Länge.
 */
export const TOKEN_JE_WORT = 3.5;

/** Was die Wortgrenze mindestens kostet. */
export const MIN_ANTWORT_TOKENS = Math.ceil(WORTGRENZE * TOKEN_JE_WORT);

/**
 * Der Satz, der die Wortgrenze in den Auftrag trägt. Er kommt aus derselben
 * Konstante wie das Budget — sonst driften Anweisung und Spielraum wieder
 * auseinander, und der Bruch fällt erst im Betrieb auf.
 */
export const WORTGRENZE_SATZ =
  ` Antworte auf Deutsch, konkret und in höchstens ${WORTGRENZE} Wörtern.`;
