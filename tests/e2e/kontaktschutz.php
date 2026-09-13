<?php
/**
 * Pruefstand fuer den Kontaktschutz im Chat.
 *
 * Bindet den ECHTEN Quelltext ein — dieselbe Anordnung wie social.php,
 * aasa.php und csp-nonce.php. Ein Pruefstand, der die Regeln nachbaut,
 * belegt seine eigene Kopie und nicht den Code, der im Betrieb laeuft.
 *
 * Aufruf: php kontaktschutz.php  (JSON-Array von Texten auf stdin)
 * Ausgabe: JSON-Array von Booleans, gleiche Reihenfolge.
 */

define( 'EB_KONTAKTSCHUTZ_PRUEFSTAND', true );

// Der einzige WordPress-Griff, den die Datei braucht. Bewusst hier und
// nicht als Attrappe fuer halb WordPress: je mehr ein Pruefstand stellt,
// desto weniger prueft er.
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
    function wp_strip_all_tags( $text ) {
        return strip_tags( (string) $text );
    }
}

$datei = dirname( __DIR__, 2 ) . '/includes/chat/kontaktschutz.php';
if ( ! is_readable( $datei ) ) {
    fwrite( STDERR, "Kontaktschutz-Datei nicht gefunden: $datei\n" );
    exit( 2 );
}
require $datei;

if ( ! function_exists( 'eb_message_contains_off_platform_contact' ) ) {
    fwrite( STDERR, "eb_message_contains_off_platform_contact fehlt\n" );
    exit( 2 );
}

$roh = stream_get_contents( STDIN );
$texte = json_decode( $roh, true );
if ( ! is_array( $texte ) ) {
    fwrite( STDERR, "Kein gueltiges JSON-Array auf stdin\n" );
    exit( 2 );
}

$aus = array();
foreach ( $texte as $t ) {
    $aus[] = (bool) eb_message_contains_off_platform_contact( (string) $t );
}
echo json_encode( $aus );
