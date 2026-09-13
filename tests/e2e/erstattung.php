<?php
/**
 * Pruefstand fuer die Erstattungs-Berechtigung.
 *
 * Bindet den ECHTEN Quelltext ein. Eine Rechtepruefung, die nur GELESEN
 * wird, ist nicht geprueft — dieselbe Begruendung wie bei social.php.
 *
 * Aufruf: php erstattung.php   (JSON-Array von Faellen auf stdin)
 * Fall:   { "admin": bool, "konto": string, "pi": object }
 * Ausgabe: JSON-Array von Booleans.
 */

define( 'EB_ERSTATTUNG_PRUEFSTAND', true );

$datei = dirname( __DIR__, 2 ) . '/includes/payments/erstattung-rechte.php';
if ( ! is_readable( $datei ) ) {
    fwrite( STDERR, "Datei nicht gefunden: $datei\n" );
    exit( 2 );
}
require $datei;

if ( ! function_exists( 'eb_erstattung_darf' ) ) {
    fwrite( STDERR, "eb_erstattung_darf fehlt\n" );
    exit( 2 );
}

$faelle = json_decode( stream_get_contents( STDIN ), true );
if ( ! is_array( $faelle ) ) {
    fwrite( STDERR, "Kein gueltiges JSON-Array auf stdin\n" );
    exit( 2 );
}

$aus = array();
foreach ( $faelle as $f ) {
    $aus[] = (bool) eb_erstattung_darf(
        ! empty( $f['admin'] ),
        isset( $f['konto'] ) ? (string) $f['konto'] : '',
        isset( $f['pi'] ) && is_array( $f['pi'] ) ? $f['pi'] : array()
    );
}
echo json_encode( $aus );
