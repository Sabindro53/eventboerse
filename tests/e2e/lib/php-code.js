// PHP-Quelltext ohne Kommentare — der gemeinsame Griff.
//
// WARUM ES DEN GEBEN MUSS. In diesem Projekt sind schon mehrfach Prüfungen
// wertlos geworden, weil ihr Muster den erklärenden Kommentar traf statt
// der Zeile im Code. Die Regel „dieser Zweig ist weg" ist dabei besonders
// anfällig: wer einen entfernten Zweig ordentlich dokumentiert — und genau
// das verlangt dieses Projekt —, schreibt seinen Namen in einen Kommentar
// direkt daneben, und die Prüfung findet ihn dort wieder.
//
// WARUM NICHT MIT EINEM AUSDRUCK GESCHNITTEN WIRD. Ein regulärer Ausdruck
// über `//` trifft auch das in `'https://api.stripe.com/…'` und wirft den
// Rest der Zeile weg — samt echtem Code, der dort stehen könnte. Eine
// Prüfung, die ihr Subjekt beschädigt, misst sich selbst.
//
// Gefragt wird deshalb PHP selbst: `token_get_all()` kennt den Unterschied
// zwischen einem Kommentar und einem Doppelslash in einer Zeichenkette.
const { execFileSync } = require('node:child_process');

const SKRIPT = `
$q = file_get_contents($argv[1]);
$aus = '';
foreach (token_get_all($q) as $t) {
  if (is_array($t)) {
    if ($t[0] === T_COMMENT || $t[0] === T_DOC_COMMENT) {
      // Zeilenumbrüche erhalten, damit Zeilennummern und Zeilengrenzen
      // stimmen — sonst rücken zwei Zeilen zusammen und ein Muster
      // trifft über eine Grenze hinweg, die es im Original nicht gibt.
      $aus .= str_repeat("\\n", substr_count($t[1], "\\n"));
      continue;
    }
    $aus .= $t[1];
  } else {
    $aus .= $t;
  }
}
echo $aus;
`;

/**
 * Liest eine PHP-Datei und gibt sie ohne Kommentare zurück.
 * Zeichenketten, Zahlen und Code bleiben unverändert.
 */
function phpOhneKommentare(datei) {
  return execFileSync('php', ['-r', SKRIPT, datei], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

module.exports = { phpOhneKommentare };
