<?php
/**
 * Pruefstand fuer den Sprachdienst.
 *
 * Bindet `includes/stimme/sprachdienst.php` IM ORIGINAL ein. Die Deckel
 * dieser Datei sind kein Komfort, sondern der Kostenschutz des
 * OpenAI-Schluessels — und ein Deckel, den niemand ausgefuehrt hat, ist eine
 * Behauptung. Der teure Fehler ist nicht der Syntaxfehler, sondern die
 * Grenze, die jemand beim Umbau vergisst, und die sieht im Diff genauso aus
 * wie eine, die da ist.
 *
 * Gegenstelle gestellt, Deckel echt: `wp_remote_post` ist eine Attrappe, die
 * zaehlt und auf Kommando scheitert. Alles davor — Laengenschnitt,
 * base64-Pruefung, Minuten- und Tagesdeckel, Phantom-Filter, der zweite
 * Anlauf ohne Tonfall-Anweisung — laeuft wirklich.
 *
 * Aufruf:  php stimme.php     (JSON auf stdin)
 * Ausgabe: JSON-Array der Ergebnisse.
 */

// ── WordPress-Minimum ───────────────────────────────────────────────────
define( 'MINUTE_IN_SECONDS', 60 );
define( 'DAY_IN_SECONDS', 86400 );
define( 'HOUR_IN_SECONDS', 3600 );

$GLOBALS['eb_transients'] = array();
function get_transient( $k ) {
    if ( ! isset( $GLOBALS['eb_transients'][ $k ] ) ) return false;
    $e = $GLOBALS['eb_transients'][ $k ];
    if ( $e['bis'] <= time() ) { unset( $GLOBALS['eb_transients'][ $k ] ); return false; }
    return $e['wert'];
}
function set_transient( $k, $wert, $dauer ) {
    $GLOBALS['eb_transients'][ $k ] = array( 'wert' => $wert, 'bis' => time() + max( 1, (int) $dauer ) );
    return true;
}
function delete_transient( $k ) { unset( $GLOBALS['eb_transients'][ $k ] ); return true; }
function wp_salt( $s = '' ) { return 'pruefstand-salt-' . $s; }
function wp_generate_password( $n = 12, $sonder = true ) { return str_repeat( 'a', (int) $n ); }
function wp_json_encode( $d ) { return json_encode( $d ); }

class WP_Error {
    private $c, $m, $d;
    public function __construct( $c = '', $m = '', $d = array() ) { $this->c = $c; $this->m = $m; $this->d = $d; }
    public function get_error_message() { return $this->m; }
    public function get_error_code() { return $this->c; }
}
function is_wp_error( $x ) { return $x instanceof WP_Error; }

// ── Gegenstelle: zaehlt, und scheitert auf Kommando ─────────────────────
//
// `eb_http_codes` ist eine Schlange: jeder Aufruf nimmt den naechsten Code.
// Nur so ist der zweite Anlauf ohne Tonfall-Anweisung messbar — ein fester
// Rueckgabewert koennte 400-dann-200 nicht abbilden.
$GLOBALS['eb_http'] = array();
$GLOBALS['eb_http_codes'] = array();
$GLOBALS['eb_http_fehler'] = false;
$GLOBALS['eb_http_body'] = 'MP3BYTES';
function wp_remote_post( $url, $args = array() ) {
    $GLOBALS['eb_http'][] = array( 'url' => $url, 'args' => $args );
    if ( ! empty( $GLOBALS['eb_http_fehler'] ) ) {
        return new WP_Error( 'http', 'Netz weg' );
    }
    $code = count( $GLOBALS['eb_http_codes'] ) ? (int) array_shift( $GLOBALS['eb_http_codes'] ) : 200;
    return array( 'code' => $code, 'body' => $GLOBALS['eb_http_body'] );
}
function wp_remote_retrieve_response_code( $r ) { return is_array( $r ) ? $r['code'] : 0; }
function wp_remote_retrieve_body( $r ) { return is_array( $r ) ? $r['body'] : ''; }

// ── Rate-Limit: das ECHTE Modul ─────────────────────────────────────────
//
// Nicht nachgebaut. Der Deckel ist der Gegenstand dieser Pruefung; eine
// Attrappe davon pruefte den Pruefstand und nicht den Code. Das Modul
// braucht `$_SERVER['REMOTE_ADDR']` und zwei Filterfunktionen.
$_SERVER['REMOTE_ADDR'] = '203.0.113.7';
function apply_filters( $tag, $wert ) { return $wert; }
function add_filter() { return true; }
function add_action() { return true; }
function do_action() { return true; }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function __( $s, $d = null ) { return $s; }

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

foreach ( array( '/includes/security/rate-limit.php', '/includes/stimme/sprachdienst.php' ) as $rel ) {
    $datei = dirname( __DIR__, 2 ) . $rel;
    if ( ! is_readable( $datei ) ) { fwrite( STDERR, "Datei fehlt: {$datei}\n" ); exit( 2 ); }
    require_once $datei;
}

// ── Faelle fahren ───────────────────────────────────────────────────────
$eingabe = json_decode( stream_get_contents( STDIN ), true );
if ( ! is_array( $eingabe ) ) { fwrite( STDERR, "Eingabe ist kein JSON-Array\n" ); exit( 2 ); }

$aus = array();
foreach ( $eingabe as $fall ) {
    $op = isset( $fall['op'] ) ? $fall['op'] : '';

    if ( $op === 'reset' ) {
        $GLOBALS['eb_transients'] = array();
        $GLOBALS['eb_http'] = array();
        $GLOBALS['eb_http_codes'] = array();
        $GLOBALS['eb_http_fehler'] = false;
        $GLOBALS['eb_http_body'] = isset( $fall['body'] ) ? (string) $fall['body'] : 'MP3BYTES';
        $aus[] = array( 'ok' => true );
        continue;
    }
    if ( $op === 'schluessel' ) {
        // KEIN schluesselfoermiger Platzhalter. GitHubs Push Protection hat am
        // 23.09.2026 genau dafuer einen Push mit GH013 abprallen lassen, und
        // `geheimnisse.mjs` schlaegt bei jeder solchen Form an. Die GESTALT
        // ist fuer das, was hier gemessen wird, ohnehin belanglos: der Code
        // prueft nur, DASS die Konstante gesetzt ist.
        if ( ! defined( 'EB_OPENAI_API_KEY' ) ) {
            define( 'EB_OPENAI_API_KEY', 'pruefstand-kein-echter-wert' );
        }
        $aus[] = array( 'ok' => true );
        continue;
    }
    if ( $op === 'http' ) {
        $GLOBALS['eb_http_codes'] = isset( $fall['codes'] ) ? (array) $fall['codes'] : array();
        $GLOBALS['eb_http_fehler'] = ! empty( $fall['netzfehler'] );
        if ( isset( $fall['body'] ) ) $GLOBALS['eb_http_body'] = (string) $fall['body'];
        $aus[] = array( 'ok' => true );
        continue;
    }
    if ( $op === 'aufrufe' ) {
        $liste = array();
        foreach ( $GLOBALS['eb_http'] as $a ) {
            $k = isset( $a['args']['body'] ) ? $a['args']['body'] : '';
            $j = is_string( $k ) ? json_decode( $k, true ) : null;
            $liste[] = array(
                'url'          => $a['url'],
                'hatAnweisung' => is_array( $j ) ? array_key_exists( 'instructions', $j ) : ( strpos( (string) $k, 'instructions' ) !== false ),
                'stimme'       => is_array( $j ) && isset( $j['voice'] ) ? $j['voice'] : null,
                'zeichen'      => is_array( $j ) && isset( $j['input'] ) ? mb_strlen( $j['input'] ) : null,
                'bytes'        => is_string( $k ) ? strlen( $k ) : 0,
            );
        }
        $aus[] = array( 'aufrufe' => $liste, 'anzahl' => count( $liste ) );
        continue;
    }
    if ( $op === 'rahmen' ) {
        $aus[] = eb_sprachdienst_rahmen( isset( $fall['rahmen'] ) ? (array) $fall['rahmen'] : array() );
        continue;
    }
    if ( $op === 'phantom' ) {
        $aus[] = array( 'phantom' => eb_sprachdienst_phantom( isset( $fall['text'] ) ? $fall['text'] : '' ) );
        continue;
    }
    if ( $op === 'ausgeben' ) {
        list( $d, $st ) = eb_sprachdienst_ausgeben(
            isset( $fall['text'] ) ? $fall['text'] : '',
            isset( $fall['rahmen'] ) ? (array) $fall['rahmen'] : array()
        );
        // Das Audio selbst interessiert nicht — nur dass es da ist.
        if ( isset( $d['audio'] ) ) { $d['audioLaenge'] = strlen( $d['audio'] ); unset( $d['audio'] ); }
        $aus[] = array_merge( array( 'status' => $st ), $d );
        continue;
    }
    if ( $op === 'hoeren' ) {
        $roh = isset( $fall['audio'] ) ? (string) $fall['audio'] : '';
        if ( ! empty( $fall['base64_von'] ) ) $roh = base64_encode( (string) $fall['base64_von'] );
        if ( ! empty( $fall['bytes'] ) ) $roh = base64_encode( str_repeat( 'x', (int) $fall['bytes'] ) );
        $GLOBALS['eb_http_body'] = json_encode( array( 'text' => isset( $fall['erkannt'] ) ? $fall['erkannt'] : 'ich suche einen DJ' ) );
        list( $d, $st ) = eb_sprachdienst_hoeren(
            $roh,
            isset( $fall['rahmen'] ) ? (array) $fall['rahmen'] : array()
        );
        $aus[] = array_merge( array( 'status' => $st ), $d );
        continue;
    }

    fwrite( STDERR, "Unbekannte Operation: {$op}\n" );
    exit( 2 );
}

echo json_encode( $aus );
