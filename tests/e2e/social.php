#!/usr/bin/env php
<?php
/**
 * social.php — Freunde und Gruppen wirklich ausführen, nicht nur lesen.
 *
 * Aufgerufen von tests/e2e/social.spec.js. Dieselbe Anordnung wie
 * ratelimit-proxy.php, csp-nonce.php und aasa.php: der Quelltext wird
 * eingebunden, die WordPress-Aufrufe werden gestellt, und dann laufen die
 * echten Handler.
 *
 * ── WARUM DAS DEN AUFWAND WERT IST ──────────────────────────────────────
 *
 * Eine Rechteprüfung, die nur GELESEN wird, ist nicht geprüft. Der teure
 * Fehler in dieser Ecke ist nicht der Syntaxfehler, sondern der Handler,
 * der eine Prüfung vergisst — und der sieht im Diff genauso aus wie einer,
 * der sie hat. Hier wird deshalb ausgeführt: fremder Nutzer, fremde
 * Gruppe, und die Antwort muss 403 oder 404 sein.
 *
 * ── DIE GESTELLTE DATENBANK MELDET, WAS SIE NICHT VERSTEHT ──────────────
 *
 * `$wpdb` ist hier eine Handvoll Arrays. Sie kennt genau die Abfragen, die
 * der Quelltext stellt, und BRICHT AB, sobald eine unbekannte kommt. Ein
 * Prüfstand, der eine unverstandene Abfrage mit `null` beantwortet, gibt
 * Entwarnung für Code, den er nie ausgeführt hat — dieselbe Fehlerklasse
 * wie ein Scanner ohne Subjekt.
 *
 * Gibt JSON auf stdout aus; Exit 1, sobald etwas nicht auffindbar ist.
 */

$wurzel = __DIR__ . '/../..';

/* ── WordPress, so viel wie nötig ────────────────────────────────────── */

define( 'ABSPATH', $wurzel . '/' );
define( 'HOUR_IN_SECONDS', 3600 );
define( 'DAY_IN_SECONDS', 86400 );
define( 'ARRAY_A', 'ARRAY_A' );

class WP_Error {
    private $code; private $msg; private $data;
    public function __construct( $code = '', $msg = '', $data = array() ) {
        $this->code = $code; $this->msg = $msg; $this->data = $data;
    }
    public function get_error_message() { return $this->msg; }
    public function get_error_code() { return $this->code; }
}
function is_wp_error( $x ) { return $x instanceof WP_Error; }

class WP_REST_Response {
    public $data; public $status;
    public function __construct( $data = null, $status = 200 ) {
        $this->data = $data; $this->status = $status;
    }
}

class WP_REST_Request implements ArrayAccess {
    private $body; private $params;
    public function __construct( $body = array(), $params = array() ) {
        $this->body = $body; $this->params = $params;
    }
    public function get_json_params() { return $this->body; }
    public function get_param( $k ) { return $this->params[ $k ] ?? null; }
    #[\ReturnTypeWillChange] public function offsetExists( $o ) { return isset( $this->params[ $o ] ); }
    #[\ReturnTypeWillChange] public function offsetGet( $o ) { return $this->params[ $o ] ?? null; }
    #[\ReturnTypeWillChange] public function offsetSet( $o, $v ) { $this->params[ $o ] = $v; }
    #[\ReturnTypeWillChange] public function offsetUnset( $o ) { unset( $this->params[ $o ] ); }
}

function absint( $v ) { return abs( (int) $v ); }
function wp_strip_all_tags( $s ) { return strip_tags( (string) $s ); }
function current_time( $t ) { return gmdate( 'Y-m-d H:i:s' ); }
function add_action( $h, $f ) { /* nicht gebraucht */ }
function register_rest_route( $ns, $route, $args ) { $GLOBALS['routen'][] = array( $ns, $route, $args ); }
function is_user_logged_in() { return $GLOBALS['ich'] > 0; }
function eb_avatar_url( $seed, $name = '' ) { return 'data:image/svg+xml;base64,AAAA'; }

/* Rate-Limit: hier immer erlaubt. Der Eimer selbst hat eine eigene Suite
   (ratelimit-proxy.spec.js); hier geht es um die Rechte. Ein Aufruf wird
   trotzdem MITGEZÄHLT, damit ein Test belegen kann, dass er stattfindet. */
$GLOBALS['rl_aufrufe'] = array();
function eventboerse_check_rate_limit( $action, $limit = 5, $window = 900, $ident = null ) {
    $GLOBALS['rl_aufrufe'][] = array( 'action' => $action, 'limit' => $limit, 'ident' => $ident );
    if ( ! empty( $GLOBALS['rl_blockiert'][ $action ] ) ) {
        return new WP_Error( 'rate_limit', 'Zu viele Anfragen.', array( 'status' => 429 ) );
    }
    return true;
}

/* ── Nutzer ──────────────────────────────────────────────────────────── */

$GLOBALS['ich']      = 0;
$GLOBALS['nutzer']   = array();   // id => ['display_name' => …]
$GLOBALS['usermeta'] = array();   // id => [key => value]

function get_current_user_id() { return (int) $GLOBALS['ich']; }
function get_userdata( $id ) {
    $id = (int) $id;
    if ( ! isset( $GLOBALS['nutzer'][ $id ] ) ) { return false; }
    return (object) array( 'ID' => $id, 'display_name' => $GLOBALS['nutzer'][ $id ]['display_name'] );
}
function get_user_meta( $id, $key, $single = false ) {
    return $GLOBALS['usermeta'][ (int) $id ][ $key ] ?? '';
}
function update_user_meta( $id, $key, $val ) { $GLOBALS['usermeta'][ (int) $id ][ $key ] = $val; }
function delete_user_meta( $id, $key ) { unset( $GLOBALS['usermeta'][ (int) $id ][ $key ] ); }
function get_users( $args ) {
    $key     = $args['meta_key'] ?? '';
    $wert    = (string) ( $args['meta_value'] ?? '' );
    $vergl   = $args['meta_compare'] ?? '=';
    $treffer = array();
    foreach ( $GLOBALS['usermeta'] as $uid => $meta ) {
        $hat = (string) ( $meta[ $key ] ?? '' );
        if ( $hat === '' ) { continue; }
        $passt = ( $vergl === 'LIKE' ) ? ( strpos( $hat, $wert ) !== false ) : ( $hat === $wert );
        if ( $passt ) { $treffer[] = (int) $uid; }
    }
    sort( $treffer );
    return array_slice( $treffer, 0, (int) ( $args['number'] ?? 100 ) );
}

/* ── Die gestellte Datenbank ─────────────────────────────────────────── */

class EB_Fake_WPDB {
    public $prefix = 'wp_';
    public $insert_id = 0;
    public $tabellen = array( 'eb_friendships' => array(), 'eb_groups' => array(), 'eb_group_members' => array() );
    private $auto = array( 'eb_friendships' => 0, 'eb_groups' => 0, 'eb_group_members' => 0 );

    public function prepare( $sql, ...$args ) {
        if ( count( $args ) === 1 && is_array( $args[0] ) ) { $args = $args[0]; }
        $i = 0;
        return preg_replace_callback( '/%[ds]/', function ( $m ) use ( &$i, $args ) {
            $v = $args[ $i++ ] ?? '';
            return $m[0] === '%d' ? (string) (int) $v : "'" . addslashes( (string) $v ) . "'";
        }, $sql );
    }

    /** Abfrage auf einen Fingerabdruck bringen: Zahlen raus, Leerraum weg. */
    private function form( $sql ) {
        $s = preg_replace( '/\s+/', ' ', trim( (string) $sql ) );
        $s = str_replace( $this->prefix, '', $s );
        $s = preg_replace( "/= *'[^']*'/", "= ?", $s );
        $s = preg_replace( '/= *-?\d+/', '= ?', $s );
        return $s;
    }

    /** Die Zahlen und Zeichenketten der Abfrage, in ihrer Reihenfolge. */
    private function werte( $sql ) {
        preg_match_all( "/= *(?:'([^']*)'|(-?\d+))/", (string) $sql, $m, PREG_SET_ORDER );
        $raus = array();
        foreach ( $m as $t ) { $raus[] = $t[1] !== '' ? $t[1] : ( $t[2] ?? '' ); }
        return $raus;
    }

    private function unbekannt( $sql ) {
        fwrite( STDERR, "Der Pruefstand kennt diese Abfrage nicht:\n  " . $this->form( $sql ) . "\n"
            . "Eine unverstandene Abfrage mit null zu beantworten waere eine\n"
            . "Entwarnung fuer Code, der nie ausgefuehrt wurde.\n" );
        exit( 1 );
    }

    private function zeilen( $sql ) {
        $f = $this->form( $sql );
        $w = $this->werte( $sql );

        if ( $f === 'SELECT * FROM eb_friendships WHERE user_low = ? AND user_high = ?' ) {
            return array_values( array_filter( $this->tabellen['eb_friendships'], function ( $r ) use ( $w ) {
                return (int) $r['user_low'] === (int) $w[0] && (int) $r['user_high'] === (int) $w[1];
            } ) );
        }
        if ( $f === "SELECT user_low, user_high FROM eb_friendships WHERE status = ? AND ( user_low = ? OR user_high = ? )" ) {
            return array_values( array_filter( $this->tabellen['eb_friendships'], function ( $r ) use ( $w ) {
                return $r['status'] === $w[0]
                    && ( (int) $r['user_low'] === (int) $w[1] || (int) $r['user_high'] === (int) $w[2] );
            } ) );
        }
        if ( $f === 'SELECT * FROM eb_friendships WHERE user_low = ? OR user_high = ? ORDER BY updated_at DESC' ) {
            return array_values( array_filter( $this->tabellen['eb_friendships'], function ( $r ) use ( $w ) {
                return (int) $r['user_low'] === (int) $w[0] || (int) $r['user_high'] === (int) $w[1];
            } ) );
        }
        if ( $f === 'SELECT role FROM eb_group_members WHERE group_id = ? AND user_id = ?' ) {
            return array_values( array_filter( $this->tabellen['eb_group_members'], function ( $r ) use ( $w ) {
                return (int) $r['group_id'] === (int) $w[0] && (int) $r['user_id'] === (int) $w[1];
            } ) );
        }
        if ( $f === 'SELECT * FROM eb_groups WHERE id = ?' ) {
            return array_values( array_filter( $this->tabellen['eb_groups'], function ( $r ) use ( $w ) {
                return (int) $r['id'] === (int) $w[0];
            } ) );
        }
        if ( $f === 'SELECT * FROM eb_groups WHERE invite_code = ?' ) {
            return array_values( array_filter( $this->tabellen['eb_groups'], function ( $r ) use ( $w ) {
                return (string) $r['invite_code'] === (string) $w[0];
            } ) );
        }
        if ( $f === 'SELECT user_id, role, joined_at FROM eb_group_members WHERE group_id = ? ORDER BY joined_at ASC' ) {
            return array_values( array_filter( $this->tabellen['eb_group_members'], function ( $r ) use ( $w ) {
                return (int) $r['group_id'] === (int) $w[0];
            } ) );
        }
        if ( $f === "SELECT user_id, role FROM eb_group_members WHERE group_id = ? AND role != ? ORDER BY joined_at ASC" ) {
            return array_values( array_filter( $this->tabellen['eb_group_members'], function ( $r ) use ( $w ) {
                return (int) $r['group_id'] === (int) $w[0] && $r['role'] !== $w[1];
            } ) );
        }
        if ( $f === 'SELECT COUNT(*) FROM eb_group_members WHERE group_id = ?' ) {
            return array( array( 'c' => count( array_filter( $this->tabellen['eb_group_members'],
                function ( $r ) use ( $w ) { return (int) $r['group_id'] === (int) $w[0]; } ) ) ) );
        }
        if ( $f === "SELECT COUNT(*) FROM eb_group_members WHERE user_id = ? AND role != ?" ) {
            return array( array( 'c' => count( array_filter( $this->tabellen['eb_group_members'],
                function ( $r ) use ( $w ) {
                    return (int) $r['user_id'] === (int) $w[0] && $r['role'] !== $w[1];
                } ) ) ) );
        }
        if ( $f === 'SELECT g.* FROM eb_groups g INNER JOIN eb_group_members m ON m.group_id = g.id WHERE m.user_id = ? ORDER BY g.updated_at DESC' ) {
            $gids = array();
            foreach ( $this->tabellen['eb_group_members'] as $m ) {
                if ( (int) $m['user_id'] === (int) $w[0] ) { $gids[] = (int) $m['group_id']; }
            }
            return array_values( array_filter( $this->tabellen['eb_groups'], function ( $r ) use ( $gids ) {
                return in_array( (int) $r['id'], $gids, true );
            } ) );
        }
        $this->unbekannt( $sql );
    }

    /**
     * Auf die ausgewählten Spalten beschneiden.
     *
     * ── WARUM DAS NICHT KOSMETIK IST ──────────────────────────────────
     *
     * Ohne diesen Schritt gab `get_var()` für `SELECT role FROM …` das
     * ERSTE Feld der Zeile zurück, nicht `role` — also `group_id`. Die
     * Rolle des Eigentümers lautete damit „1", `eb_gruppe_ist_mitglied()`
     * sagte nein, die Mitgliederliste kam leer zurück, und beim Verlassen
     * hielt sich die Gruppe für verwaist und löschte sich.
     *
     * Der Prüfstand hätte also vier erfundene Fehler gemeldet — und
     * schlimmer: ein Test, der auf „members ist leer" prüft, wäre grün
     * gewesen und hätte das für die Regel gehalten.
     */
    private function projizieren( $sql, $zeilen ) {
        $f = $this->form( $sql );
        if ( ! preg_match( '/^SELECT (.+?) FROM /', $f, $m ) ) { return $zeilen; }
        $liste = trim( $m[1] );
        if ( $liste === '*' || $liste === 'g.*' || stripos( $liste, 'COUNT(' ) === 0 ) {
            return $zeilen;
        }
        $spalten = array_map( 'trim', explode( ',', $liste ) );
        $raus    = array();
        foreach ( $zeilen as $z ) {
            $neu = array();
            foreach ( $spalten as $s ) {
                if ( ! array_key_exists( $s, $z ) ) {
                    fwrite( STDERR, "Spalte $s gibt es in dieser Zeile nicht.\n" );
                    exit( 1 );
                }
                $neu[ $s ] = $z[ $s ];
            }
            $raus[] = $neu;
        }
        return $raus;
    }

    public function get_row( $sql, $out = null ) {
        $r = $this->projizieren( $sql, $this->zeilen( $sql ) );
        return $r ? $r[0] : null;
    }
    public function get_results( $sql, $out = null ) {
        return $this->projizieren( $sql, $this->zeilen( $sql ) );
    }
    public function get_var( $sql ) {
        $r = $this->projizieren( $sql, $this->zeilen( $sql ) );
        if ( ! $r ) { return null; }
        $erste = $r[0];
        return is_array( $erste ) ? reset( $erste ) : $erste;
    }
    public function get_charset_collate() { return ''; }

    private function tab( $name ) { return substr( $name, strlen( $this->prefix ) ); }

    public function insert( $table, $daten, $format = null ) {
        $t = $this->tab( $table );
        if ( ! isset( $this->tabellen[ $t ] ) ) { $this->unbekannt( "INSERT $table" ); }
        $daten['id']           = ++$this->auto[ $t ];
        $this->insert_id       = $daten['id'];
        $this->tabellen[ $t ][] = $daten;
        return 1;
    }
    public function update( $table, $daten, $wo, $f = null, $wf = null ) {
        $t = $this->tab( $table );
        if ( ! isset( $this->tabellen[ $t ] ) ) { $this->unbekannt( "UPDATE $table" ); }
        $n = 0;
        foreach ( $this->tabellen[ $t ] as $i => $r ) {
            $passt = true;
            foreach ( $wo as $k => $v ) { if ( (string) ( $r[ $k ] ?? '' ) !== (string) $v ) { $passt = false; break; } }
            if ( $passt ) { $this->tabellen[ $t ][ $i ] = array_merge( $r, $daten ); $n++; }
        }
        return $n;
    }
    public function delete( $table, $wo, $f = null ) {
        $t = $this->tab( $table );
        if ( ! isset( $this->tabellen[ $t ] ) ) { $this->unbekannt( "DELETE $table" ); }
        $n = 0;
        foreach ( $this->tabellen[ $t ] as $i => $r ) {
            $passt = true;
            foreach ( $wo as $k => $v ) { if ( (string) ( $r[ $k ] ?? '' ) !== (string) $v ) { $passt = false; break; } }
            if ( $passt ) { unset( $this->tabellen[ $t ][ $i ] ); $n++; }
        }
        $this->tabellen[ $t ] = array_values( $this->tabellen[ $t ] );
        return $n;
    }
}

$GLOBALS['wpdb'] = new EB_Fake_WPDB();

require_once $wurzel . '/includes/social/freunde-gruppen.php';
require_once $wurzel . '/includes/social/routen.php';

/* ── Werkzeug ────────────────────────────────────────────────────────── */

function als( $id ) { $GLOBALS['ich'] = (int) $id; }

function ruf( $fn, $body = array(), $params = array() ) {
    $antwort = $fn( new WP_REST_Request( $body, $params ) );
    return array( 'status' => $antwort->status, 'body' => $antwort->data );
}

function nutzer_anlegen( $id, $name, $handle = '' ) {
    $GLOBALS['nutzer'][ $id ] = array( 'display_name' => $name );
    $GLOBALS['usermeta'][ $id ] = array();
    if ( $handle !== '' ) { $GLOBALS['usermeta'][ $id ]['eb_handle'] = $handle; }
}

$ergebnis = array();

/* ══════════════════════════════════════════════════════════════════════
   1 · HANDLE — das Setzen ist die Einwilligung
   ══════════════════════════════════════════════════════════════════════ */

nutzer_anlegen( 1, 'Anna' );
nutzer_anlegen( 2, 'Ben' );
nutzer_anlegen( 3, 'Cem' );
nutzer_anlegen( 4, 'Dana' );

als( 1 );
$ergebnis['handle_gross']    = ruf( 'eb_social_handle_setzen', array( 'handle' => 'AnNa' ) );
$ergebnis['handle_kurz']     = ruf( 'eb_social_handle_setzen', array( 'handle' => 'ab' ) );
$ergebnis['handle_zeichen']  = ruf( 'eb_social_handle_setzen', array( 'handle' => 'anna b!' ) );
$ergebnis['handle_gesperrt'] = ruf( 'eb_social_handle_setzen', array( 'handle' => 'admin' ) );
// Zuletzt der gueltige — die Faelle darueber duerfen ihn nicht ueberschreiben.
$ergebnis['handle_setzen']   = ruf( 'eb_social_handle_setzen', array( 'handle' => 'anna.b' ) );
$ergebnis['handle_von_anna'] = eb_handle_von( 1 );

als( 2 );
// Der Konflikt braucht einen wirklich belegten Namen. Die erste Fassung
// dieses Prueffalls kam durch, weil ein Fall darueber Annas Handle
// stillschweigend auf „anna" geaendert hatte — „anna.b" war frei, und der
// Test belegte das Gegenteil dessen, was er behauptete.
$ergebnis['handle_vergeben'] = ruf( 'eb_social_handle_setzen', array( 'handle' => 'anna.b' ) );
$ergebnis['handle_ben']      = ruf( 'eb_social_handle_setzen', array( 'handle' => 'ben_k' ) );

// Zurueckziehen: ohne diesen Weg waere die Einwilligung unwiderruflich.
als( 3 );
ruf( 'eb_social_handle_setzen', array( 'handle' => 'cem99' ) );
$ergebnis['handle_leeren'] = ruf( 'eb_social_handle_setzen', array( 'handle' => '' ) );
$ergebnis['handle_nach_leeren'] = eb_handle_von( 3 );

/* ══════════════════════════════════════════════════════════════════════
   2 · SUCHE — kein Orakel
   ══════════════════════════════════════════════════════════════════════ */

als( 1 );
$ergebnis['suche_treffer']  = ruf( 'eb_social_suche', array(), array( 'q' => 'ben_k' ) );
$ergebnis['suche_kurz']     = ruf( 'eb_social_suche', array(), array( 'q' => 'be' ) );
// Wer keinen Handle hat, ist nicht auffindbar — auch nicht ueber den Namen.
$ergebnis['suche_ohne_handle'] = ruf( 'eb_social_suche', array(), array( 'q' => 'dana' ) );
// Und nicht ueber die Adresse: das waere die Frage „gibt es hier ein Konto".
$ergebnis['suche_email']    = ruf( 'eb_social_suche', array(), array( 'q' => 'ben@example.com' ) );
$ergebnis['suche_selbst']   = ruf( 'eb_social_suche', array(), array( 'q' => 'anna.b' ) );

/* ══════════════════════════════════════════════════════════════════════
   3 · FREUNDE — nie ohne Zustimmung
   ══════════════════════════════════════════════════════════════════════ */

als( 1 );
$ergebnis['anfrage']         = ruf( 'eb_social_freund_anfragen', array( 'userId' => 2 ) );
$ergebnis['anfrage_selbst']  = ruf( 'eb_social_freund_anfragen', array( 'userId' => 1 ) );
$ergebnis['anfrage_geist']   = ruf( 'eb_social_freund_anfragen', array( 'userId' => 999 ) );
// Die eigene Anfrage annehmen: der Weg, sich selbst in fremde Listen zu schreiben.
$ergebnis['selbst_annehmen'] = ruf( 'eb_social_freund_antwort', array( 'userId' => 2, 'annehmen' => true ) );
$ergebnis['nach_selbst']     = eb_sind_freunde( 1, 2 );

als( 2 );
$ergebnis['annehmen']    = ruf( 'eb_social_freund_antwort', array( 'userId' => 1, 'annehmen' => true ) );
$ergebnis['sind_freunde'] = eb_sind_freunde( 1, 2 );

// Ablehnen loescht die Anfrage, statt sie stehen zu lassen.
als( 1 );
ruf( 'eb_social_freund_anfragen', array( 'userId' => 3 ) );
als( 3 );
$ergebnis['ablehnen']      = ruf( 'eb_social_freund_antwort', array( 'userId' => 1, 'annehmen' => false ) );
$ergebnis['nach_ablehnen'] = eb_freundschaft( 1, 3 );

// Gegenanfrage IST Zustimmung.
als( 1 );
ruf( 'eb_social_freund_anfragen', array( 'userId' => 4 ) );
als( 4 );
$ergebnis['gegenanfrage'] = ruf( 'eb_social_freund_anfragen', array( 'userId' => 1 ) );
$ergebnis['nach_gegen']   = eb_sind_freunde( 1, 4 );

// Sperren: der Gesperrte merkt nichts und kommt nicht wieder herein.
//
// Dana bekommt hier erst ihren Handle. Ohne ihn belegte der Suchtest
// unten gar nichts: „nicht gefunden" waere schon deshalb richtig, weil
// sie nie auffindbar war — ein Test ohne Subjekt, der aussieht wie ein
// Beweis. Deshalb zuerst die GEGENPROBE, dass sie gefunden WIRD.
update_user_meta( 4, 'eb_handle', 'dana4' );
als( 1 );
$ergebnis['suche_vor_sperre'] = ruf( 'eb_social_suche', array(), array( 'q' => 'dana4' ) );

als( 4 );
$ergebnis['sperren'] = ruf( 'eb_social_freund_sperren', array( 'userId' => 1 ) );
als( 1 );
$ergebnis['anfrage_gesperrt'] = ruf( 'eb_social_freund_anfragen', array( 'userId' => 4 ) );
$ergebnis['stand_gesperrt']   = eb_freundschaft( 1, 4 )['status'];
$ergebnis['liste_gesperrter'] = ruf( 'eb_social_freunde' );
// Der Gesperrte darf die Sperre nicht selbst wegraeumen.
$ergebnis['sperre_wegnehmen'] = ruf( 'eb_social_freund_entfernen', array( 'userId' => 4 ) );
$ergebnis['stand_danach']     = eb_freundschaft( 1, 4 )['status'];
$ergebnis['entsperren_fremd'] = ruf( 'eb_social_freund_sperren', array( 'userId' => 4, 'sperren' => false ) );
// Gesperrte tauchen in der Suche nicht auf.
$ergebnis['suche_gesperrt'] = ruf( 'eb_social_suche', array(), array( 'q' => 'dana4' ) );

als( 4 );
$ergebnis['liste_sperrender'] = ruf( 'eb_social_freunde' );
$ergebnis['entsperren']       = ruf( 'eb_social_freund_sperren', array( 'userId' => 1, 'sperren' => false ) );
$ergebnis['nach_entsperren']  = eb_freundschaft( 1, 4 );

/* ══════════════════════════════════════════════════════════════════════
   4 · GRUPPEN
   ══════════════════════════════════════════════════════════════════════ */

als( 1 );
$ergebnis['gruppe_anlegen'] = ruf( 'eb_social_gruppe_anlegen', array(
    'name' => '  Hochzeit <b>Anna</b> & Ben  ', 'eventType' => 'Hochzeit', 'eventDate' => '2027-06-12',
) );
$gid = (int) ( $ergebnis['gruppe_anlegen']['body']['group']['id'] ?? 0 );

$ergebnis['gruppe_ohne_name'] = ruf( 'eb_social_gruppe_anlegen', array( 'name' => '   ' ) );
$ergebnis['gruppe_datum_muell'] = ruf( 'eb_social_gruppe_anlegen', array(
    'name' => 'Zweite', 'eventDate' => '2027-02-30',
) );

// Ein Fremder sieht die Gruppe nicht — und erfaehrt nicht, dass es sie gibt.
als( 3 );
$ergebnis['fremd_lesen']     = ruf( 'eb_social_gruppe_lesen', array(), array( 'id' => $gid ) );
$ergebnis['fremd_aendern']   = ruf( 'eb_social_gruppe_aendern', array( 'name' => 'Meins' ), array( 'id' => $gid ) );
// EINE ANDERE, ECHTE PERSON. Die erste Fassung liess den Fremden SICH
// SELBST einladen — das scheitert schon an `eb_social_gegenueber()` mit
// 404, eine Zeile vor der Rechtepruefung. Der Test war gruen, die
// Mutation „Rechtepruefung entfernt" ueberlebte, und die Zusicherung
// „ein Fremder kann nicht einladen" war unbelegt.
$ergebnis['fremd_einladen']  = ruf( 'eb_social_gruppe_einladen', array( 'userId' => 2 ), array( 'id' => $gid ) );
$ergebnis['fremd_code']      = ruf( 'eb_social_gruppe_code_neu', array(), array( 'id' => $gid ) );
$ergebnis['fremd_entfernen'] = ruf( 'eb_social_gruppe_entfernen', array( 'userId' => 1 ), array( 'id' => $gid ) );

// Einladen geht nur an Freunde.
als( 1 );
$ergebnis['einladen_fremd']  = ruf( 'eb_social_gruppe_einladen', array( 'userId' => 3 ), array( 'id' => $gid ) );
$ergebnis['einladen_freund'] = ruf( 'eb_social_gruppe_einladen', array( 'userId' => 2 ), array( 'id' => $gid ) );

// Der Eingeladene sieht die Gruppe, aber NICHT die Mitgliederliste.
als( 2 );
$ergebnis['eingeladen_sicht'] = ruf( 'eb_social_gruppe_lesen', array(), array( 'id' => $gid ) );
$ergebnis['eingeladen_liste'] = ruf( 'eb_social_gruppen' );
$ergebnis['eingeladen_annehmen'] = ruf( 'eb_social_gruppe_annehmen', array(), array( 'id' => $gid ) );
$ergebnis['mitglied_sicht']   = ruf( 'eb_social_gruppe_lesen', array(), array( 'id' => $gid ) );

// Ein Mitglied darf nicht verwalten.
$ergebnis['mitglied_aendern']  = ruf( 'eb_social_gruppe_aendern', array( 'name' => 'Meins' ), array( 'id' => $gid ) );
$ergebnis['mitglied_einladen'] = ruf( 'eb_social_gruppe_einladen', array( 'userId' => 4 ), array( 'id' => $gid ) );

// Eine Einladung ohne Einladung annehmen.
als( 3 );
$ergebnis['annehmen_ohne'] = ruf( 'eb_social_gruppe_annehmen', array(), array( 'id' => $gid ) );

// Beitritt ueber den Code.
als( 1 );
$code = (string) ( ruf( 'eb_social_gruppe_lesen', array(), array( 'id' => $gid ) )['body']['group']['inviteCode'] ?? '' );
als( 3 );
$ergebnis['beitritt_falsch'] = ruf( 'eb_social_gruppe_beitreten', array( 'code' => str_repeat( 'a', 18 ) ) );
$ergebnis['beitritt_muell']  = ruf( 'eb_social_gruppe_beitreten', array( 'code' => 'kurz' ) );
$ergebnis['beitritt']        = ruf( 'eb_social_gruppe_beitreten', array( 'code' => $code ) );
$ergebnis['rolle_nach_code'] = eb_gruppe_rolle( $gid, 3 );

// Ein ABGELAUFENER Code gilt nicht mehr.
//
// Das ist ein anderer Fall als der zurueckgezogene darunter: der alte Code
// steht dann gar nicht mehr in der Tabelle, ein abgelaufener sehr wohl.
// Ohne diesen Fall ueberlebte die Mutation „Ablauf ignoriert" — der Code
// waere unbegrenzt gueltig, und die Zusicherung „gilt 14 Tage" unbelegt.
foreach ( $GLOBALS['wpdb']->tabellen['eb_groups'] as $i => $g ) {
    if ( (int) $g['id'] === $gid ) {
        $GLOBALS['wpdb']->tabellen['eb_groups'][ $i ]['invite_expires'] = gmdate( 'Y-m-d H:i:s', time() - 60 );
    }
}
als( 4 );
$ergebnis['abgelaufener_code'] = ruf( 'eb_social_gruppe_beitreten', array( 'code' => $code ) );
$ergebnis['rolle_nach_ablauf'] = eb_gruppe_rolle( $gid, 4 );

// Und die Gegenprobe: mit gueltigem Ablauf geht derselbe Code wieder.
foreach ( $GLOBALS['wpdb']->tabellen['eb_groups'] as $i => $g ) {
    if ( (int) $g['id'] === $gid ) {
        $GLOBALS['wpdb']->tabellen['eb_groups'][ $i ]['invite_expires'] = gmdate( 'Y-m-d H:i:s', time() + 600 );
    }
}
$ergebnis['code_wieder_gueltig'] = ruf( 'eb_social_gruppe_beitreten', array( 'code' => $code ) );
ruf( 'eb_social_gruppe_verlassen', array(), array( 'id' => $gid ) );

// Ein Handle ohne Konto dahinter faellt aus der Suche.
//
// Das kommt vor: ein geloeschtes Konto kann sein user_meta hinterlassen.
// Ohne den Riegel stuende in der Trefferliste eine Person, die es nicht
// mehr gibt — mit erfundenem Namen und erfundenem Bild.
$GLOBALS['usermeta'][777] = array( 'eb_handle' => 'geist77' );
als( 1 );
$ergebnis['suche_geist'] = ruf( 'eb_social_suche', array(), array( 'q' => 'geist77' ) );
unset( $GLOBALS['usermeta'][777] );

// Ein neuer Code entwertet den alten.
als( 1 );
$ergebnis['code_neu'] = ruf( 'eb_social_gruppe_code_neu', array(), array( 'id' => $gid ) );
als( 4 );
$ergebnis['alter_code'] = ruf( 'eb_social_gruppe_beitreten', array( 'code' => $code ) );

// Rollen: nur der Eigentuemer vergibt, und nur admin/member.
als( 2 );
$ergebnis['rolle_durch_mitglied'] = ruf( 'eb_social_gruppe_rolle_setzen',
    array( 'userId' => 3, 'role' => 'admin' ), array( 'id' => $gid ) );
als( 1 );
$ergebnis['rolle_owner_vergeben'] = ruf( 'eb_social_gruppe_rolle_setzen',
    array( 'userId' => 3, 'role' => 'owner' ), array( 'id' => $gid ) );
$ergebnis['rolle_kein_mitglied']  = ruf( 'eb_social_gruppe_rolle_setzen',
    array( 'userId' => 4, 'role' => 'admin' ), array( 'id' => $gid ) );
$ergebnis['rolle_setzen']         = ruf( 'eb_social_gruppe_rolle_setzen',
    array( 'userId' => 3, 'role' => 'admin' ), array( 'id' => $gid ) );
$ergebnis['rolle_von_3']          = eb_gruppe_rolle( $gid, 3 );

// Ein Admin darf einladen — aber die Leitung nicht aus ihrer eigenen
// Gruppe werfen. Ohne diese Grenze reichte eine Befoerderung, um den
// Eigentuemer zu enteignen.
als( 3 );
$ergebnis['admin_darf_einladen']  = eb_gruppe_darf_verwalten( $gid, 3 );
$ergebnis['admin_wirft_leitung']  = ruf( 'eb_social_gruppe_entfernen',
    array( 'userId' => 1 ), array( 'id' => $gid ) );
$ergebnis['leitung_noch_da']      = eb_gruppe_rolle( $gid, 1 );

// Die Leitung entfernt ein Mitglied — das geht.
als( 1 );
$ergebnis['mitglied_entfernen'] = ruf( 'eb_social_gruppe_entfernen', array( 'userId' => 3 ), array( 'id' => $gid ) );
$ergebnis['rolle_nach_wurf']    = eb_gruppe_rolle( $gid, 3 );

// Geht die Leitung, bleibt die Gruppe nicht fuehrerlos.
$ergebnis['leitung_geht'] = ruf( 'eb_social_gruppe_verlassen', array(), array( 'id' => $gid ) );
$ergebnis['neuer_owner']  = (int) eb_gruppe_laden( $gid )['owner_id'];
$ergebnis['neue_rolle']   = eb_gruppe_rolle( $gid, 2 );

// Geht der Letzte, verschwindet die Gruppe — samt Mitgliederzeilen.
als( 2 );
$ergebnis['letzter_geht']  = ruf( 'eb_social_gruppe_verlassen', array(), array( 'id' => $gid ) );
$ergebnis['gruppe_weg']    = eb_gruppe_laden( $gid ) === null;
$ergebnis['zeilen_weg']    = count( array_filter( $GLOBALS['wpdb']->tabellen['eb_group_members'],
    function ( $r ) use ( $gid ) { return (int) $r['group_id'] === $gid; } ) );

/* ── Belegt: die Deckel haengen am Konto, nicht an der Leitung ───────── */

$ergebnis['rate_limits'] = array();
foreach ( $GLOBALS['rl_aufrufe'] as $a ) {
    $ergebnis['rate_limits'][ $a['action'] ] = $a['ident'];
}

/* ── Belegt: jede Route ist angemeldet-pflichtig ─────────────────────── */

$GLOBALS['routen'] = array();
eb_social_routen_registrieren();
$ergebnis['routen'] = array();
foreach ( $GLOBALS['routen'] as $r ) {
    list( $ns, $pfad, $args ) = $r;
    $eintraege = isset( $args['methods'] ) ? array( $args ) : $args;
    foreach ( $eintraege as $e ) {
        $ergebnis['routen'][] = array(
            'pfad'     => $pfad,
            'methoden' => $e['methods'],
            'erlaubnis' => is_string( $e['permission_callback'] ) ? $e['permission_callback'] : 'closure',
        );
    }
}

echo json_encode( $ergebnis, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ), "\n";
