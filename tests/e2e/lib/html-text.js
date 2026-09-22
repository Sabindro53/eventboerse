// „Welcher Text steht in diesem HTML?" — gesammelt, nicht geschnitten.
//
// CodeQL meldete am 15.09.2026 „Incomplete multi-character sanitization" an
//   roh.slice(…).replace(/<[^>]*>/g, '')
// in barrierefreiheit.spec.js. Der Melder hat sachlich recht, und der Grund
// ist derselbe wie bei den HTML-Kommentaren: ein Tag ist ein MEHRZEICHIGES
// Konstrukt, und ein einmaliger Schnitt daran lässt bei Verschachtelung einen
// Rest stehen.
//
//   <<b>script>x   →  ein Durchlauf entfernt <b>, übrig bleibt  <script>x
//   <img alt="a > b">Text  →  schneidet am ERSTEN >, übrig bleibt  b">Text
//
// Für einen Prüfer, der Beschriftungstexte misst, ist beides falsch: er liest
// Zeichen als Text, die Markup sind, und verliert Zeichen, die Text sind.
//
// Deshalb wird hier GESAMMELT statt geschnitten: ein Zeichenlauf, der Tags
// überspringt und dabei Anführungszeichen achtet. Ein Tag trennt Wörter, also
// hinterlässt es ein Leerzeichen — sonst würde aus <p>a</p><p>b</p> „ab".
//
// Vierter CodeQL-Befund in Folge an eigenem Testcode, und der vierte derselben
// Sorte: eine schnelle Zeichenketten-Prüfung, wo eine strukturierte gehört.
// Deshalb steht der Griff hier einmal, statt in jeder Suite neu — genau wie
// ohneHtmlKommentare(), ohneJsKommentare() und istHost() daneben.

/** Der sichtbare Text eines HTML-Ausschnitts, ohne Tags. */
function textAusHtml(html) {
  const s = String(html);
  let aus = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '<') {
      aus += s[i];
      i += 1;
      continue;
    }
    i += 1; // das '<' selbst
    let anfuehrung = '';
    while (i < s.length) {
      const z = s[i];
      i += 1;
      if (anfuehrung) {
        if (z === anfuehrung) anfuehrung = '';
        continue;
      }
      if (z === '"' || z === "'") {
        anfuehrung = z;
        continue;
      }
      if (z === '>') break;
    }
    aus += ' '; // ein Tag trennt Wörter
  }
  return aus.replace(/\s+/g, ' ').trim();
}

module.exports = { textAusHtml };
