<?php
/**
 * Pruefstand fuer die oeffentliche Profil-Route (N01, PRODUCT_REDESIGN.md 9).
 *
 * Bindet `includes/profil/profil-route.php` IM ORIGINAL ein und fuehrt
 * `eb_provider_profile()` wirklich aus. Eine Sichtbarkeitsregel, die nur
 * gelesen wird, ist nicht geprueft — der teure Fehler ist die vergessene
 * Wache, und die sieht im Diff aus wie eine, die da ist.
 *
 * Aufruf:  php profil-oeffentlich.php   (JSON auf stdin)
 * Eingabe: { "konten": {id: {...}}, "faelle": [{ "profil": id, "betrachter": id }] }
 * Ausgabe: JSON-Array, je Fall { status, role, felder }.
 */

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'ARRAY_A', 'ARRAY_A' );

$eingabe = json_decode( stream_get_contents( STDIN ), true );
$GLOBALS['eb_konten']     = $eingabe['konten'];
$GLOBALS['eb_betrachter'] = 0;

// ── WordPress-Griffe ────────────────────────────────────────────────────
function absint( $v ) { return abs( (int) $v ); }
function get_current_user_id() { return (int) $GLOBALS['eb_betrachter']; }
function get_userdata( $id ) {
    $k = $GLOBALS['eb_konten'][ (string) (int) $id ] ?? null;
    if ( ! $k ) return false;
    return (object) array(
        'ID' => (int) $id, 'roles' => $k['rollen'], 'first_name' => $k['name'] ?? 'Probe',
        'last_name' => '', 'display_name' => $k['name'] ?? 'Probe', 'user_registered' => '2026-01-01 00:00:00',
    );
}
function eb_is_admin_user( $id = 0 ) {
    $k = $GLOBALS['eb_konten'][ (string) (int) $id ] ?? null;
    return $k ? in_array( 'administrator', $k['rollen'], true ) : false;
}
// Nachbildung von eventboerse_map_role() aus functions.php — damit eine
// Rückkehr zur internen Rolle im Prüfstand als „Admin" sichtbar wird, statt
// ihn abstürzen zu lassen.
function eventboerse_map_role( $user ) {
    if ( in_array( 'administrator', (array) $user->roles, true ) ) return 'Admin';
    if ( in_array( 'dienstleister', (array) $user->roles, true ) ) return 'Dienstleister';
    return 'Event-Planer';
}
function eventboerse_base_role( $user ) {
    return in_array( 'dienstleister', (array) $user->roles, true ) ? 'Dienstleister' : 'Event-Planer';
}
function eb_user_profile_meta( $uid ) {
    return array( 'tagline' => '', 'location' => 'Köln', 'bio' => 'Bio', 'coverUrl' => '', 'coverPosY' => 50,
        'photoUrl' => '', 'gallery' => array(), 'socialLinks' => array() );
}
function eb_collaborations_enriched( $uid, $nur_oeffentlich = false ) { return array(); }
function eb_format_listing( $row ) { return array( 'id' => (int) $row['id'] ); }
function eb_avatar_url( $a, $b = '' ) { return ''; }
function date_i18n( $f, $t ) { return date( $f, $t ); }
function wp_list_pluck( $liste, $feld ) { return array_map( function( $r ) use ( $feld ) { return $r[ $feld ]; }, $liste ); }
function get_user_meta( $id, $k, $einzeln = false ) { return ''; }

class WP_REST_Request implements ArrayAccess {
    private $p;
    public function __construct( $p ) { $this->p = $p; }
    public function offsetExists( $k ): bool { return isset( $this->p[ $k ] ); }
    public function offsetGet( $k ): mixed { return $this->p[ $k ] ?? null; }
    public function offsetSet( $k, $v ): void { $this->p[ $k ] = $v; }
    public function offsetUnset( $k ): void { unset( $this->p[ $k ] ); }
}
class WP_REST_Response {
    public $data; public $status;
    public function __construct( $d, $s = 200 ) { $this->data = $d; $this->status = $s; }
    public function header( $k, $v ) {}
}

// ── $wpdb-Attrappe ──────────────────────────────────────────────────────
//
// Sie versteht genau die Abfragen der Route und bricht bei jeder anderen
// ab. Eine Attrappe, die Unbekanntes mit null beantwortet, gaebe Entwarnung
// fuer Code, den sie nie ausgefuehrt hat.
class EB_Profil_WPDB_Attrappe {
    public $prefix = 'wptest_';
    public $users = 'wptest_users';
    public function prepare( $sql, ...$args ) {
        if ( count( $args ) === 1 && is_array( $args[0] ) ) $args = $args[0];
        return vsprintf( str_replace( '%d', '%d', $sql ), array_map( 'intval', $args ) );
    }
    private function konto( $id ) { return $GLOBALS['eb_konten'][ (string) (int) $id ] ?? array(); }
    public function get_results( $sql, $art = null ) {
        if ( preg_match( "/FROM wptest_eb_listings WHERE user_id = (\\d+) AND status = 'active'/", $sql, $m ) ) {
            $n = (int) ( $this->konto( $m[1] )['inserate'] ?? 0 );
            $zeilen = array();
            for ( $i = 1; $i <= $n; $i++ ) $zeilen[] = array( 'id' => 900 + $i, 'title' => 'Inserat ' . $i );
            return $zeilen;
        }
        if ( strpos( $sql, 'FROM wptest_eb_reviews r' ) !== false ) return array();
        fwrite( STDERR, "Unerwartete Abfrage: {$sql}\n" );
        exit( 3 );
    }
    public function get_var( $sql ) {
        if ( preg_match( '/SELECT COUNT\(\*\) FROM wptest_eb_reviews WHERE user_id = (\d+)/', $sql, $m ) ) {
            return (string) (int) ( $this->konto( $m[1] )['bewertungen'] ?? 0 );
        }
        if ( preg_match( '/FROM wptest_eb_conversations WHERE \(user_a = (\d+) AND user_b = (\d+)\) OR \(user_a = (\d+) AND user_b = (\d+)\)/', $sql, $m ) ) {
            $a = (int) $m[1]; $b = (int) $m[2];
            $mit = $this->konto( $a )['gespraech_mit'] ?? array();
            $mit2 = $this->konto( $b )['gespraech_mit'] ?? array();
            return ( in_array( $b, $mit, true ) || in_array( $a, $mit2, true ) ) ? '1' : '0';
        }
        fwrite( STDERR, "Unerwartete Abfrage: {$sql}\n" );
        exit( 3 );
    }
}
$GLOBALS['wpdb'] = new EB_Profil_WPDB_Attrappe();

$datei = dirname( __DIR__, 2 ) . '/includes/profil/profil-route.php';
if ( ! is_readable( $datei ) ) {
    fwrite( STDERR, "Datei fehlt: {$datei}\n" );
    exit( 2 );
}
require_once $datei;

$aus = array();
foreach ( $eingabe['faelle'] as $f ) {
    $GLOBALS['eb_betrachter'] = (int) ( $f['betrachter'] ?? 0 );
    $r = eb_provider_profile( new WP_REST_Request( array( 'id' => $f['profil'] ) ) );
    $aus[] = array(
        'status' => $r->status,
        'role'   => $r->data['role'] ?? null,
        'felder' => array_keys( (array) $r->data ),
        'message'=> $r->data['message'] ?? null,
    );
}
echo json_encode( $aus );
