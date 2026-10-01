#!/usr/bin/env php
<?php
/**
 * live-stand.php — fuehrt eb_shell_inhalt()/eb_shell_stand() WIRKLICH aus.
 *
 * Aufgerufen von tests/e2e/live-stand.spec.js, ein Fall je Prozess. Der
 * Grund fuer getrennte Prozesse ist die statische Zwischenspeicherung in
 * eb_shell_inhalt(): sie liest die Huelle genau einmal je Prozess, und
 * genau das ist eine der geprueften Eigenschaften. Zwei Faelle in einem
 * Prozess wuerden sich dieselbe gelesene Huelle teilen, und der Test
 * belegte dann die Zwischenspeicherung des Pruefstands statt die des
 * Codes.
 *
 * Die Funktionen werden aus functions.php HERAUSGESCHNITTEN und in einem
 * Namespace ausgefuehrt — dieselbe Anordnung wie csp-nonce.php und
 * csp-hq.php. Eine Nachbildung der Rechnung im Test wuerde beweisen, dass
 * die Nachbildung stimmt, und sonst nichts.
 *
 * Geschrieben wird in ein echtes Verzeichnis statt ge-eval-t, weil
 * eb_shell_inhalt() `__DIR__ . '/app-shell.html'` liest. In ge-eval-tem
 * Code zeigt __DIR__ auf das Verzeichnis der aufrufenden Datei, und dann
 * pruefte der Pruefstand eine andere Datei als die, die er gestellt hat.
 *
 * Gibt JSON auf stdout aus; Exit 1, sobald etwas nicht auffindbar ist.
 */

$wurzel = __DIR__ . '/../..';
$src    = file_get_contents( $wurzel . '/functions.php' );

/** Schneidet eine Funktion samt Rumpf heraus (Klammern zaehlen). */
function funktion( $src, $name ) {
    $start = strpos( $src, "function $name(" );
    if ( $start === false ) {
        fwrite( STDERR, "Funktion $name nicht gefunden\n" );
        exit( 1 );
    }
    $i     = strpos( $src, '{', $start );
    $tiefe = 0;
    for ( $j = $i; $j < strlen( $src ); $j++ ) {
        if ( $src[ $j ] === '{' ) { $tiefe++; }
        elseif ( $src[ $j ] === '}' ) { $tiefe--; if ( ! $tiefe ) { break; } }
    }
    return substr( $src, $start, $j - $start + 1 );
}

$modus = $argv[1] ?? 'echt';

$tmp = sys_get_temp_dir() . '/eb-stand-' . bin2hex( random_bytes( 6 ) );
mkdir( $tmp, 0700 );
register_shutdown_function( function () use ( $tmp ) {
    foreach ( glob( $tmp . '/*' ) as $f ) { @unlink( $f ); }
    @rmdir( $tmp );
} );

/* Die Huellen der Faelle. Jede traegt einen eindeutigen Marker UND ein
 * Inline-Skript — letzteres, damit eb_shell_ausgeben() denselben Weg geht
 * wie im Betrieb (Nonce-Einsetzung) und nicht einen vereinfachten. */
$huelleA = "<div id=\"page-home\">HUELLE-A</div>\n<script>var a=1;</script>\n";
$huelleB = "<div id=\"page-home\">HUELLE-B</div>\n<script>var b=2;</script>\n";

switch ( $modus ) {
    case 'echt':
        copy( $wurzel . '/app-shell.html', $tmp . '/app-shell.html' );
        break;
    case 'geaendert':
        copy( $wurzel . '/app-shell.html', $tmp . '/app-shell.html' );
        file_put_contents( $tmp . '/app-shell.html', "\n<!-- ein Byte mehr -->", FILE_APPEND );
        break;
    case 'leer':
        file_put_contents( $tmp . '/app-shell.html', '' );
        break;
    case 'fehlt':
        // Keine Datei. file_get_contents warnt dann — die Warnung gehoert
        // auf dem Server ins Log und hier nicht in die JSON-Ausgabe. Der
        // Produktionscode bekommt KEIN @ davor: ein stummer Lesefehler
        // waere genau die Entwarnung, die dieses Tor verhindern soll.
        set_error_handler( function () { return true; } );
        break;
    case 'geteilt':
        file_put_contents( $tmp . '/app-shell.html', $huelleA );
        break;
    default:
        fwrite( STDERR, "unbekannter Modus: $modus\n" );
        exit( 1 );
}

file_put_contents( $tmp . '/pruefstand.php', "<?php\n"
    . 'namespace EBTest;'
    . 'function esc_attr($s){ return htmlspecialchars((string)$s, ENT_QUOTES); }'
    . 'function eb_csp_nonce(){ return "NONCE-PRUEFSTAND"; }'
    . funktion( $src, 'eb_shell_inhalt' )
    . funktion( $src, 'eb_shell_stand' )
    . funktion( $src, 'eb_inline_nonce_setzen' )
    . funktion( $src, 'eb_shell_ausgeben' )
);
require $tmp . '/pruefstand.php';

$stand = \EBTest\eb_shell_stand();

$ergebnis = array(
    'modus'  => $modus,
    'stand'  => $stand,
    'laenge' => strlen( $stand ),
);

if ( $modus === 'echt' || $modus === 'geaendert' ) {
    // Die Gegenrechnung steht hier bewusst DANEBEN und nicht im Code:
    // gemessen wird, ob eb_shell_stand() dasselbe liefert wie sha256 ueber
    // die Datei — also genau das, was der Deploy-Schritt erwartet.
    $datei                 = file_get_contents( $tmp . '/app-shell.html' );
    $ergebnis['erwartet']  = substr( hash( 'sha256', $datei ), 0, 12 );
    $ergebnis['dateiBytes'] = strlen( $datei );
}

if ( $modus === 'geteilt' ) {
    /* Der Kern: EINE Lesung, EINE Wahrheit.
     *
     * Der Fingerabdruck ist oben schon gebildet. Jetzt wird die Datei
     * UNTER DEM LAUFENDEN PROZESS ausgetauscht. Liest eb_shell_ausgeben()
     * die Datei selbst noch einmal, liefert es Huelle B aus, waehrend im
     * Kopf der Fingerabdruck von Huelle A steht — ein Kopf, der ueber
     * einen Koerper Auskunft gibt, den er nicht gesehen hat. Genau diese
     * Mutation soll rot werden. */
    file_put_contents( $tmp . '/app-shell.html', $huelleB );
    ob_start();
    \EBTest\eb_shell_ausgeben();
    $aus = ob_get_clean();

    $ergebnis['standVonA']    = substr( hash( 'sha256', $huelleA ), 0, 12 );
    $ergebnis['standVonB']    = substr( hash( 'sha256', $huelleB ), 0, 12 );
    $ergebnis['ausgabeHatA']  = strpos( $aus, 'HUELLE-A' ) !== false;
    $ergebnis['ausgabeHatB']  = strpos( $aus, 'HUELLE-B' ) !== false;
    // Gegenprobe, dass ueberhaupt der echte Weg gegangen wurde: ohne
    // Nonce-Einsetzung waere die Ausgabe nicht die des Betriebs.
    $ergebnis['ausgabeNonce'] = strpos( $aus, 'nonce="NONCE-PRUEFSTAND"' ) !== false;
}

echo json_encode( $ergebnis ), "\n";
