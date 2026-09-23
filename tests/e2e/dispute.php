<?php
/**
 * Pruefstand fuer die Chargeback-Erfassung.
 *
 * Bindet `includes/booking.php` IM ORIGINAL ein. Eine Funktion, die auf einem
 * Geldweg sitzt, gehoert ausgefuehrt und nicht gelesen — der teure Fehler ist
 * nicht der Syntaxfehler, sondern die Wache, die jemand vergisst, und die
 * sieht im Diff genauso aus wie eine, die da ist.
 *
 * Aufruf:  php dispute.php     (JSON auf stdin)
 * Eingabe: { "op": "...", ... }[]
 * Ausgabe: JSON-Array der Ergebnisse.
 */

// ── Optionen-Speicher ───────────────────────────────────────────────────
$GLOBALS['eb_optionen'] = array();

function get_option( $name, $vorgabe = false ) {
    return array_key_exists( $name, $GLOBALS['eb_optionen'] ) ? $GLOBALS['eb_optionen'][ $name ] : $vorgabe;
}
function update_option( $name, $wert, $autoload = null ) {
    $GLOBALS['eb_optionen'][ $name ] = $wert;
    return true;
}
function add_option( $name, $wert, $x = '', $autoload = null ) {
    if ( array_key_exists( $name, $GLOBALS['eb_optionen'] ) ) return false;
    $GLOBALS['eb_optionen'][ $name ] = $wert;
    return true;
}

function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_key( $s ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $s ) ); }
function sanitize_textarea_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function wp_strip_all_tags( $s ) { return strip_tags( (string) $s ); }

function eb_ops_notify_address() { return 'betrieb@example.test'; }

// ── Mail-Attrappe ───────────────────────────────────────────────────────
//
// Sie zaehlt und merkt sich den Text. `eb_mail_faellt_aus` laesst sie
// scheitern — ohne diesen Schalter waere die Regel "nicht zugestellt heisst
// nicht gemeldet" eine Behauptung ohne Probe.
$GLOBALS['eb_mails'] = array();
$GLOBALS['eb_mail_faellt_aus'] = false;
function wp_mail( $an, $betreff, $text, $header = array() ) {
    if ( ! empty( $GLOBALS['eb_mail_faellt_aus'] ) ) return false;
    $GLOBALS['eb_mails'][] = array( 'an' => $an, 'betreff' => $betreff, 'text' => $text );
    return true;
}

// ── $wpdb-Attrappe ──────────────────────────────────────────────────────
//
// Sie bricht bei jeder Abfrage ab. eb_booking_record_dispute() darf die
// Datenbank gar nicht anfassen; ein Pruefstand, der eine unverstandene
// Abfrage mit null beantwortet, gaebe Entwarnung fuer Code, den er nie
// ausgefuehrt hat.
class EB_Dispute_WPDB_Attrappe {
    public $prefix = 'wptest_';
    public function __call( $name, $args ) {
        fwrite( STDERR, "Unerwartete DB-Abfrage: {$name}\n" );
        exit( 3 );
    }
}
$GLOBALS['wpdb'] = new EB_Dispute_WPDB_Attrappe();

// booking.php traegt `if ( ! defined( 'ABSPATH' ) ) exit;` — der Waechter, der
// den direkten Web-Aufruf verhindert. Er steigt mit Status 0 aus: ohne diese
// Zeile sieht der Pruefstand erfolgreich aus und liefert nur nichts.
// Der Waechter bleibt, wo er ist; der Pruefstand stellt die Bedingung her.
define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

$datei = dirname( __DIR__, 2 ) . '/includes/booking.php';
if ( ! is_readable( $datei ) ) {
    fwrite( STDERR, "Datei fehlt: {$datei}\n" );
    exit( 2 );
}
require_once $datei;

// ── Faelle ──────────────────────────────────────────────────────────────
$eingabe = json_decode( stream_get_contents( STDIN ), true );
if ( ! is_array( $eingabe ) ) { fwrite( STDERR, "Keine Faelle.\n" ); exit( 2 ); }

$aus = array();
foreach ( $eingabe as $fall ) {
    $op = $fall['op'] ?? '';

    if ( 'reset' === $op ) {
        $GLOBALS['eb_optionen'] = array();
        $GLOBALS['eb_mails'] = array();
        $GLOBALS['eb_mail_faellt_aus'] = ! empty( $fall['mail_faellt_aus'] );
        $aus[] = array( 'ok' => true );
        continue;
    }

    if ( 'dispute' === $op ) {
        eb_booking_record_dispute( $fall['objekt'] ?? array() );
        $aus[] = array( 'ok' => true );
        continue;
    }

    if ( 'refund' === $op ) {
        eb_booking_record_refund( $fall['objekt'] ?? array() );
        $aus[] = array( 'ok' => true );
        continue;
    }

    if ( 'stand' === $op ) {
        $pi = sanitize_key( (string) ( $fall['pi'] ?? '' ) );
        $aus[] = array(
            'disputes' => array_values( get_option( 'eb_booking_dispute_' . $pi, array() ) ),
            'refunds'  => array_values( get_option( 'eb_booking_refund_' . $pi, array() ) ),
            'mails'    => $GLOBALS['eb_mails'],
            'schluessel' => array_keys( $GLOBALS['eb_optionen'] ),
        );
        continue;
    }

    $aus[] = array( 'ok' => false, 'fehler' => 'unbekannte Operation: ' . $op );
}

echo json_encode( $aus );
