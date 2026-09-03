#!/usr/bin/env php
<?php
/**
 * aasa.php — prüft die Apple-Zuordnungsdatei gegen den ECHTEN Code.
 *
 * Aufgerufen von tests/e2e/aasa.spec.js. Die Funktionen werden aus
 * functions.php herausgeschnitten und in einem Namespace ausgeführt, in dem
 * `header()`, `status_header()` und `wp_json_encode()` auf Testfassungen
 * zeigen — dieselbe Anordnung wie in csp-nonce.php.
 *
 * Jeder Fall läuft in einem EIGENEN PROZESS: die Ausgabefunktion endet mit
 * `exit`, und `exit` lässt sich nicht stubben. Ein Prüfstand, der das
 * umgehen wollte, prüfte eine Nachbildung statt des echten Codes.
 *
 * Gibt JSON auf stdout aus; Exit 1, sobald etwas nicht auffindbar ist.
 */

$wurzel = __DIR__ . '/../..';
$src    = file_get_contents( $wurzel . '/functions.php' );

/** Schneidet eine Funktion samt Rumpf heraus (Klammern zählen). */
function funktion( $src, $name ) {
    $start = strpos( $src, "function $name(" );
    if ( $start === false ) {
        fwrite( STDERR, "Funktion $name nicht gefunden\n" );
        exit( 1 );
    }
    $i = strpos( $src, '{', $start );
    $tiefe = 0;
    for ( $j = $i; $j < strlen( $src ); $j++ ) {
        if ( $src[ $j ] === '{' ) { $tiefe++; }
        elseif ( $src[ $j ] === '}' ) { $tiefe--; if ( ! $tiefe ) { break; } }
    }
    return substr( $src, $start, $j - $start + 1 );
}

/* ── Ein einzelner Fall: als Unterprozess aufgerufen ────────────────── */
$fall = getenv( 'EB_AASA_FALL' );
if ( $fall !== false ) {
    $teile = array(
        funktion( $src, 'eb_apple_app_id' ),
        funktion( $src, 'eb_apple_zuordnung_ausliefern' ),
    );

    // Die Konstanten SETZEN, bevor der Code läuft — genau wie wp-config.php.
    if ( $fall !== 'ohne' && $fall !== '' ) {
        define( 'EB_APPLE_TEAM_ID', $fall );
    }
    if ( getenv( 'EB_AASA_BUNDLE' ) ) {
        define( 'EB_APPLE_BUNDLE_ID', getenv( 'EB_AASA_BUNDLE' ) );
    }

    $stubs = '
    namespace EbTest;
    $GLOBALS["eb_kopf"] = array();
    $GLOBALS["eb_status"] = null;
    function header( $h, $ersetzen = true, $code = 0 ) { $GLOBALS["eb_kopf"][] = $h; }
    function status_header( $c ) { $GLOBALS["eb_status"] = $c; }
    function wp_json_encode( $d ) { return json_encode( $d ); }
    ';
    eval( $stubs . "\n" . implode( "\n", $teile ) );

    // Auch bei `exit` noch berichten.
    register_shutdown_function( function () {
        $rumpf = ob_get_clean();
        echo json_encode( array(
            'status' => $GLOBALS['eb_status'],
            'kopf'   => $GLOBALS['eb_kopf'],
            'rumpf'  => $rumpf,
            'appId'  => \EbTest\eb_apple_app_id(),
        ) );
    } );
    ob_start();
    \EbTest\eb_apple_zuordnung_ausliefern();
    exit( 0 );   // erreicht, wenn die Funktion NICHT ausgeliefert hat
}

/* ── Der Orchestrator ───────────────────────────────────────────────── */
function fall( $teamId, $bundle = null ) {
    $php = PHP_BINARY . ' ' . escapeshellarg( __FILE__ );
    $env = 'EB_AASA_FALL=' . escapeshellarg( $teamId );
    if ( $bundle !== null ) { $env .= ' EB_AASA_BUNDLE=' . escapeshellarg( $bundle ); }
    $aus = shell_exec( $env . ' ' . $php . ' 2>/dev/null' );
    $d = json_decode( (string) $aus, true );
    return is_array( $d ) ? $d : array( 'fehler' => 'unlesbar', 'roh' => $aus );
}

$ergebnis = array(
    'ohneTeamId'     => fall( 'ohne' ),
    'platzhalter'    => fall( 'YOUR_TEAM' ),      // Unterstrich, zu kurz
    'zuKurz'         => fall( 'ABC123' ),
    'gueltig'        => fall( 'A1B2C3D4E5' ),
    'fremdesBundle'  => fall( 'A1B2C3D4E5', 'de.beispiel.anders' ),
    'boesesBundle'   => fall( 'A1B2C3D4E5', 'de.x/../../etc' ),
);

echo json_encode( $ergebnis, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), "\n";
