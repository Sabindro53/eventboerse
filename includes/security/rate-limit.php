<?php
/**
 * Rate-Limit Helper fuer Eventboerse-Auth-Endpoints.
 *
 * Datei: includes/security/rate-limit.php
 * Aufruf: in functions.php am Ende einbinden mit
 *   require_once __DIR__ . '/includes/security/rate-limit.php';
 *
 * Verwendung im Endpoint-Callback:
 *   $check = eventboerse_check_rate_limit( 'login', 5, 15 * MINUTE_IN_SECONDS );
 *   if ( is_wp_error( $check ) ) return $check; // 429 Too Many Requests
 *
 * Audit-Issue: #13 (P0.4 — Fehlende Rate-Limiting auf Auth-Endpoints).
 *
 * Implementierung: WordPress-Transients als Sliding-Window-Counter.
 * Key besteht aus aktion + IP-Hash, sodass mehrere Endpoints unabhaengige Buckets haben.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Liefert eine moeglichst stabile Client-IP, auch hinter Reverse-Proxy.
 * In Produktion am besten ueber WordPress-Filter 'eventboerse_client_ip' justieren,
 * falls bekannte Proxy-Header benutzt werden sollen.
 */
function eventboerse_get_client_ip() {
    // Optionaler Override (z.B. wenn man CF-Connecting-IP trauen will)
    $ip = apply_filters( 'eventboerse_client_ip', null );
    if ( ! empty( $ip ) ) return $ip;

    // Defensive default: nur REMOTE_ADDR. X-Forwarded-For wird NICHT vertraut
    // (kann gefakt werden wenn kein Reverse-Proxy davorhaengt).
    if ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
        return (string) $_SERVER['REMOTE_ADDR'];
    }
    return 'unknown';
}

/**
 * Sliding-Window Rate-Limit-Check.
 *
 * @param string $action       Logischer Bucket-Name, z.B. 'login', 'register', 'pwreset'.
 * @param int    $limit        Erlaubte Versuche im Fenster.
 * @param int    $window_secs  Laenge des Fensters in Sekunden.
 * @param string|null $identifier_override  Optional fester Identifier (z.B. Username
 *                                          plus IP) statt nur IP — nuetzlich gegen
 *                                          Username-Enumeration.
 *
 * @return true|WP_Error  true wenn Limit nicht ueberschritten, sonst WP_Error mit
 *                        Code 'rate_limit' und HTTP-Status 429.
 */
function eventboerse_check_rate_limit( $action, $limit = 5, $window_secs = 900, $identifier_override = null ) {
    $ip       = eventboerse_get_client_ip();
    $ident    = $identifier_override !== null ? (string) $identifier_override : $ip;
    $bucket   = 'eb_rl_' . md5( $action . '|' . $ident );

    $entry = get_transient( $bucket );
    $now   = time();

    if ( ! is_array( $entry ) ) {
        $entry = array( 'count' => 0, 'reset' => $now + $window_secs );
    }

    // Fenster abgelaufen — zuruecksetzen.
    if ( $entry['reset'] <= $now ) {
        $entry = array( 'count' => 0, 'reset' => $now + $window_secs );
    }

    $entry['count']++;
    set_transient( $bucket, $entry, max( 1, $entry['reset'] - $now ) );

    if ( $entry['count'] > $limit ) {
        $retry_after = max( 1, $entry['reset'] - $now );
        return new WP_Error(
            'rate_limit',
            sprintf( 'Zu viele Anfragen. Bitte in %d Sekunden erneut versuchen.', $retry_after ),
            array(
                'status'      => 429,
                'retry_after' => $retry_after,
            )
        );
    }

    return true;
}

/**
 * Bei erfolgreichem Login einen Bucket leeren — verhindert dass ein legitimer Nutzer
 * nach falschen Versuchen mit korrektem Passwort dann gesperrt bleibt.
 */
function eventboerse_reset_rate_limit( $action, $identifier_override = null ) {
    $ident  = $identifier_override !== null ? (string) $identifier_override : eventboerse_get_client_ip();
    $bucket = 'eb_rl_' . md5( $action . '|' . $ident );
    delete_transient( $bucket );
}
