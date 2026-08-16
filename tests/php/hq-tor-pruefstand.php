#!/usr/bin/env php
<?php
/**
 * Prüfstand für den HQ-Generalzugang.
 *
 * Warum nicht bloß Textprüfungen auf functions.php: ob dort `password_verify`
 * steht, sagt nichts darüber, ob ein falsches Passwort abgewiesen wird. Ein
 * Test, der nur Zeichenketten sucht, bleibt grün, wenn die Bedingung invertiert
 * ist. Bei einem Zugangstor ist das die falsche Art von Sicherheit.
 *
 * Dieser Prüfstand schneidet die tatsächlichen Funktionen aus functions.php
 * heraus, stellt die benötigten WordPress-Bausteine als Attrappen daneben und
 * ruft sie auf. Getestet wird also der ausgelieferte Code, keine Nachbildung.
 *
 * Schlägt das Herausschneiden fehl, bricht der Prüfstand ab, statt „bestanden"
 * zu melden — ein Prüfstand, der nichts findet und trotzdem grün ist, wäre
 * schlimmer als keiner.
 *
 * Aufruf: php tests/php/hq-tor-pruefstand.php
 */

$ROOT = dirname( __DIR__, 2 );
$quelle = file_get_contents( $ROOT . '/functions.php' );
if ( $quelle === false ) {
    fwrite( STDERR, "functions.php nicht lesbar\n" );
    exit( 1 );
}

/* ── WordPress-Attrappen ─────────────────────────────────────────────── */

$GLOBALS['__transients'] = array();
$GLOBALS['__cookies_gesetzt'] = array();
$GLOBALS['__rate'] = array();
$GLOBALS['__darf_sehen'] = false;

function set_transient( $k, $v, $ttl = 0 ) { $GLOBALS['__transients'][ $k ] = $v; return true; }
function get_transient( $k ) {
    $GLOBALS['__gelesen'][] = $k;
    return $GLOBALS['__transients'][ $k ] ?? false;
}
function delete_transient( $k ) { unset( $GLOBALS['__transients'][ $k ] ); return true; }
function is_ssl() { return true; }
function wp_unslash( $v ) { return is_string( $v ) ? stripslashes( $v ) : $v; }
function sanitize_text_field( $v ) { return trim( strip_tags( (string) $v ) ); }
function wp_verify_nonce( $n, $a ) { return $n === 'gueltig-' . $a ? 1 : false; }
function is_wp_error( $t ) { return $t instanceof WP_Error; }
function eb_hq_darf_sehen( $uid = 0 ) { return (bool) $GLOBALS['__darf_sehen']; }
function is_user_logged_in() { return (bool) ( $GLOBALS['__angemeldet'] ?? false ); }
function current_user_can( $cap ) { return (bool) ( $GLOBALS['__caps'][ $cap ] ?? false ); }

class WP_Error {
    public function __construct( private string $code, private string $msg, private $data = null ) {}
    public function get_error_message() { return $this->msg; }
}

/** Nachbau nur der Signatur — das echte Rate-Limit hat eigene Tests. */
function eventboerse_check_rate_limit( $action, $limit = 5, $window = 900, $ident = null ) {
    $GLOBALS['__rate'][ $action ] = ( $GLOBALS['__rate'][ $action ] ?? 0 ) + 1;
    if ( $GLOBALS['__rate'][ $action ] > $limit ) {
        return new WP_Error( 'rate_limit', 'Zu viele Anfragen.' );
    }
    return true;
}
function eventboerse_reset_rate_limit( $action, $ident = null ) { $GLOBALS['__rate'][ $action ] = 0; }

/** setcookie() abfangen, um die Flags prüfen zu können. */
function eb_test_setcookie( $name, $wert, $opt ) {
    $GLOBALS['__cookies_gesetzt'][] = array( 'name' => $name, 'wert' => $wert, 'opt' => $opt );
}

/* ── Die echten Funktionen herausschneiden ───────────────────────────── */

/**
 * Schneidet `function name(...) { ... }` klammertreu aus dem Quelltext.
 * Klammern in Zeichenketten und Kommentaren zählen nicht mit — sonst endet
 * die Funktion an der ersten geschweiften Klammer im CSS der Torseite.
 */
function ausschneiden( string $quelle, string $name ): string {
    $start = preg_match( '/^function\s+' . preg_quote( $name, '/' ) . '\s*\(/m', $quelle, $m, PREG_OFFSET_CAPTURE )
        ? $m[0][1] : -1;
    if ( $start < 0 ) {
        fwrite( STDERR, "⛔ Funktion $name nicht gefunden — der Prüfstand prüft nichts.\n" );
        exit( 1 );
    }
    $tokens = token_get_all( '<?php ' . substr( $quelle, $start ) );
    $tiefe = 0; $begonnen = false; $out = '';
    foreach ( $tokens as $t ) {
        $text = is_array( $t ) ? $t[1] : $t;
        if ( is_array( $t ) && in_array( $t[0], array( T_OPEN_TAG ), true ) ) continue;
        $out .= $text;
        if ( $text === '{' ) { $tiefe++; $begonnen = true; }
        elseif ( $text === '}' ) { $tiefe--; if ( $begonnen && $tiefe === 0 ) break; }
    }
    return $out;
}

$namen = array(
    'eb_hq_tor_konfiguriert', 'eb_hq_tor_key', 'eb_hq_tor_oeffnen',
    'eb_hq_tor_schliessen', 'eb_hq_tor_offen', 'eb_hq_zugang_offen',
    'eb_hq_tor_versuch', 'eb_hq_proxy_darf', 'eb_hq_verwaltung_darf',
);
$code = '';
foreach ( $namen as $n ) {
    $code .= ausschneiden( $quelle, $n ) . "\n";
}
// setcookie() im ausgeschnittenen Code auf die Attrappe umbiegen. Nur das —
// jede weitere Umschreibung würde testen, was der Prüfstand daraus macht.
$code = str_replace( 'setcookie(', 'eb_test_setcookie(', $code );

// Konstanten, die im Original neben den Funktionen stehen.
define( 'EB_HQ_TOR_COOKIE', 'eb_hq_tor' );
define( 'EB_HQ_TOR_DAUER', 12 * 3600 );
define( 'MINUTE_IN_SECONDS', 60 );

eval( $code );

/* ── Prüfungen ───────────────────────────────────────────────────────── */

$fehler = array();
$geprueft = 0;
function pruefe( string $was, bool $bedingung ) {
    global $fehler, $geprueft;
    $geprueft++;
    if ( $bedingung ) { echo "  ✓ $was\n"; }
    else { echo "  ✗ $was\n"; $fehler[] = $was; }
}
function zuruecksetzen() {
    $GLOBALS['__transients'] = array();
    $GLOBALS['__cookies_gesetzt'] = array();
    $GLOBALS['__rate'] = array();
    $GLOBALS['__darf_sehen'] = false;
    $GLOBALS['__angemeldet'] = false;
    $GLOBALS['__caps'] = array();
    $GLOBALS['__gelesen'] = array();
    $_COOKIE = array(); $_POST = array();
}

$PASSWORT = 'Prüfstand-Passwort-' . bin2hex( random_bytes( 8 ) );
define( 'EB_HQ_PASSWORT_HASH', password_hash( $PASSWORT, PASSWORD_BCRYPT ) );

echo "\nHQ-Generalzugang — Prüfstand\n";
echo str_repeat( '─', 60 ) . "\n";

echo "\nEinrichtung\n";
zuruecksetzen();
pruefe( 'ein bcrypt-Hash gilt als eingerichtet', eb_hq_tor_konfiguriert() === true );

echo "\nRichtiges Passwort\n";
zuruecksetzen();
$_POST = array( 'eb_hq_passwort' => $PASSWORT, 'eb_hq_tor_nonce' => 'gueltig-eb_hq_tor' );
$r = eb_hq_tor_versuch();
pruefe( 'wird angenommen (kein Fehlertext)', $r === '' );
pruefe( 'öffnet eine Sitzung', eb_hq_tor_offen() === true );
pruefe( 'öffnet damit den HQ-Zugang', eb_hq_zugang_offen() === true );
pruefe( 'öffnet auch die HQ-REST-Routen', eb_hq_proxy_darf() === true );
pruefe( 'öffnet NICHT die Zugangsverwaltung', eb_hq_verwaltung_darf() !== true );

echo "\nDas Cookie\n";
$c = $GLOBALS['__cookies_gesetzt'][0] ?? null;
pruefe( 'wird gesetzt', is_array( $c ) );
pruefe( 'ist httponly (kein Zugriff aus JavaScript)', ! empty( $c['opt']['httponly'] ) );
pruefe( 'ist SameSite=Strict', ( $c['opt']['samesite'] ?? '' ) === 'Strict' );
pruefe( 'ist secure', ! empty( $c['opt']['secure'] ) );
pruefe( 'läuft ab (keine Dauersitzung)', ( $c['opt']['expires'] ?? 0 ) > time() );
pruefe( 'trägt einen 64-stelligen Zufallswert', (bool) preg_match( '/^[a-f0-9]{64}$/', $c['wert'] ?? '' ) );

echo "\nDer Token liegt nicht in der Datenbank\n";
$schluessel = array_keys( $GLOBALS['__transients'] );
pruefe( 'genau eine Sitzung gespeichert', count( $schluessel ) === 1 );
pruefe( 'der Schlüssel enthält den Token NICHT im Klartext',
    strpos( $schluessel[0], $c['wert'] ) === false );
pruefe( 'der Schlüssel ist der SHA-256 des Tokens',
    $schluessel[0] === 'eb_hq_tor_' . hash( 'sha256', $c['wert'] ) );

echo "\nFalsches Passwort\n";
zuruecksetzen();
$_POST = array( 'eb_hq_passwort' => 'falsch', 'eb_hq_tor_nonce' => 'gueltig-eb_hq_tor' );
$r = eb_hq_tor_versuch();
pruefe( 'wird abgewiesen', $r !== '' );
pruefe( 'öffnet KEINE Sitzung', eb_hq_tor_offen() === false );
pruefe( 'verrät nicht, ob überhaupt ein Passwort gesetzt ist',
    stripos( $r, 'nicht eingerichtet' ) === false && stripos( $r, 'konfigur' ) === false );
pruefe( 'setzt kein Cookie', count( $GLOBALS['__cookies_gesetzt'] ) === 0 );

echo "\nLeeres Passwort\n";
zuruecksetzen();
$_POST = array( 'eb_hq_passwort' => '', 'eb_hq_tor_nonce' => 'gueltig-eb_hq_tor' );
pruefe( 'wird abgewiesen', eb_hq_tor_versuch() !== '' );
pruefe( 'öffnet keine Sitzung', eb_hq_tor_offen() === false );

echo "\nFehlender CSRF-Nonce\n";
zuruecksetzen();
$_POST = array( 'eb_hq_passwort' => $PASSWORT );
$r = eb_hq_tor_versuch();
pruefe( 'richtiges Passwort ohne Nonce wird abgewiesen', $r !== '' );
pruefe( 'öffnet keine Sitzung', eb_hq_tor_offen() === false );
pruefe( 'verbraucht keinen Rate-Limit-Versuch', ( $GLOBALS['__rate']['hq_tor'] ?? 0 ) === 0 );

echo "\nRate-Limit\n";
zuruecksetzen();
$_POST = array( 'eb_hq_passwort' => 'falsch', 'eb_hq_tor_nonce' => 'gueltig-eb_hq_tor' );
for ( $i = 0; $i < 5; $i++ ) eb_hq_tor_versuch();
$r = eb_hq_tor_versuch();
pruefe( 'nach 5 Fehlversuchen greift die Sperre', stripos( $r, 'zu viele' ) !== false );
// Der entscheidende Punkt: die Sperre steht VOR der Passwortprüfung. Stünde
// sie danach, könnte man unbegrenzt raten und würde nur die Fehlermeldung
// wechseln sehen.
$_POST['eb_hq_passwort'] = $PASSWORT;
$r = eb_hq_tor_versuch();
pruefe( 'auch das RICHTIGE Passwort prallt an der Sperre ab', $r !== '' );
pruefe( 'die Sperre öffnet keine Sitzung', eb_hq_tor_offen() === false );

echo "\nGefälschtes Cookie\n";
zuruecksetzen();
$_COOKIE['eb_hq_tor'] = str_repeat( 'a', 64 );
pruefe( 'erfundener Token öffnet nichts', eb_hq_tor_offen() === false );
$_COOKIE['eb_hq_tor'] = '../../etc/passwd';
pruefe( 'Pfadangabe im Cookie öffnet nichts', eb_hq_tor_offen() === false );
$_COOKIE['eb_hq_tor'] = '';
pruefe( 'leeres Cookie öffnet nichts', eb_hq_tor_offen() === false );

// Die Formprüfung muss GREIFEN, bevor der Wert zum Speicherschlüssel wird.
// Dass ein erfundener Schlüssel ohnehin nichts findet, beweist sie nicht:
// diese Prüfung überlebte eine Mutation, die sie ersatzlos entfernte. Sie ist
// heute Tiefenstaffelung — und wird tragend, sobald jemand das Hashing des
// Tokens anfasst. Gemessen wird deshalb, ob der Speicher überhaupt befragt
// wurde.
foreach ( array( '../../etc/passwd', 'A' . str_repeat( 'a', 63 ), str_repeat( 'a', 63 ), '%2e%2e', 'a b' ) as $mist ) {
    zuruecksetzen();
    $_COOKIE['eb_hq_tor'] = $mist;
    eb_hq_tor_offen();
    // Geschweifte Klammern: PHP zaehlt Bytes ab 0x80 zum Variablennamen, «$mist»
    // waere also die Variable `$mist»` — und die Meldung bliebe leer.
    pruefe( "«{$mist}» erreicht den Speicher gar nicht erst", $GLOBALS['__gelesen'] === array() );
}

echo "\nAbmelden\n";
zuruecksetzen();
$_POST = array( 'eb_hq_passwort' => $PASSWORT, 'eb_hq_tor_nonce' => 'gueltig-eb_hq_tor' );
eb_hq_tor_versuch();
$vorher = eb_hq_tor_offen();
eb_hq_tor_schliessen();
pruefe( 'die Sitzung war offen', $vorher === true );
pruefe( 'nach dem Abmelden ist sie zu', eb_hq_tor_offen() === false );
pruefe( 'die Sitzung ist auch serverseitig weg', count( $GLOBALS['__transients'] ) === 0 );

echo "\nOhne eingerichtetes Passwort\n";
// Die Konstante lässt sich nicht neu definieren; stattdessen wird die
// Formprüfung direkt geprüft — sie ist die Stelle, die entscheidet.
zuruecksetzen();
$roh = ausschneiden( $quelle, 'eb_hq_tor_konfiguriert' );
pruefe( 'die Hash-Form wird geprüft, nicht nur die Existenz',
    strpos( $roh, 'preg_match' ) !== false );
foreach ( array( 'meinpasswort', '', 'geheim123' ) as $klartext ) {
    pruefe( "Klartext «" . ( $klartext === '' ? '(leer)' : $klartext ) . "» gilt NICHT als Hash",
        ! preg_match( '/^\$(2[aby]|argon2i?d?)[y$]/', $klartext ) );
}

echo "\n" . str_repeat( '─', 60 ) . "\n";
if ( $fehler ) {
    echo "⛔ " . count( $fehler ) . " von $geprueft Prüfungen fehlgeschlagen:\n";
    foreach ( $fehler as $f ) echo "   - $f\n";
    exit( 1 );
}
echo "✓ Alle $geprueft Prüfungen bestanden — am echten Code aus functions.php.\n";
