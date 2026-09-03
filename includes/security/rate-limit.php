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
 * Key besteht aus Aktion + serverseitig geschuetztem IP-HMAC, sodass mehrere
 * Endpoints unabhaengige Buckets haben und die IP nicht aus einem einfachen
 * Hash-Woerterbuch zurueckgewonnen werden kann.
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

/* =====================================================================
   BEZEICHNET DIE ADRESSE EINEN CLIENT — ODER ALLE?
   =====================================================================

   Jedes IP-basierte Limit hier setzt still voraus, dass REMOTE_ADDR den
   einzelnen Besucher bezeichnet. Steht ein Reverse-Proxy davor, stimmt
   das nicht: dann traegt JEDE Anfrage dieselbe Adresse, und aus dem
   Limit "3 Registrierungen pro IP und Stunde" wird "3 Registrierungen
   pro Stunde fuer die ganze Website".

   Am Starttag saehe das aus wie eine kaputte Seite, und niemand wuesste
   warum — die vierte Person der Stunde bekommt eine Fehlermeldung ueber
   ein Limit, das sie nie erreicht hat.

   ERKANNT WIRD ES OHNE NACHFRAGE: eine private oder reservierte Adresse
   (10.x, 172.16–31.x, 192.168.x, 127.x, ::1, fc00::/7) KANN kein
   Internet-Client sein. Steht sie in REMOTE_ADDR, sitzt zwischen uns
   und dem Besucher etwas im selben Netz — und die Adresse bezeichnet
   niemanden.

   X-Forwarded-For wird trotzdem NICHT geglaubt. Der Header ist frei
   waehlbar, solange nicht feststeht, welcher Proxy ihn setzt und ob er
   ihn ueberschreibt. Ein Angreifer, der ihn selbst fuellt, haette
   beliebig viele Identitaeten — das waere schlechter als der heutige
   Zustand, nicht besser.
*/
function eventboerse_ip_identifiziert( $ip = null ) {
    if ( $ip === null ) {
        $ip = eventboerse_get_client_ip();
    }
    if ( ! is_string( $ip ) || $ip === '' ) {
        return false;
    }
    return (bool) filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    );
}

/**
 * Um wie viel ein IP-Limit geweitet wird, wenn die Adresse alle meint.
 *
 * NICHT abgeschaltet, sondern geweitet — ganz ohne Bremse waere eine
 * Anmeldemaske ohne jeden Flutschutz. Der Faktor ist so gewaehlt, dass
 * normaler Betrieb ihn nie sieht und ein Skript sofort:
 *
 *   Registrierung   3/h  →   75/h  fuer die ganze Seite
 *   Login          10/15m →  250/15m
 *
 * Wer 250 Fehlanmeldungen in einer Viertelstunde macht, ist kein
 * Besucher. Und die Grenzen, die WIRKLICH ein Konto schuetzen, haengen
 * an der E-Mail und bleiben davon unberuehrt: 5 Fehlversuche je Konto
 * je 15 Minuten gelten weiter, Proxy hin oder her.
 */
const EB_RL_PROXY_FAKTOR = 25;

/** Das wirksame Limit fuer einen IP-Eimer, Proxy-Lage beruecksichtigt. */
function eventboerse_rl_limit( $limit, $ip_gebunden = true ) {
    if ( ! $ip_gebunden || eventboerse_ip_identifiziert() ) {
        return $limit;
    }
    return $limit * EB_RL_PROXY_FAKTOR;
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
    $bucket   = 'eb_rl_' . hash_hmac( 'sha256', $action . '|' . $ident, wp_salt( 'auth' ) );

    // Ohne eigenen Identifier haengt der Eimer an der IP — und die
    // bezeichnet hinter einem Proxy alle Besucher gemeinsam. Dann wird
    // das Limit geweitet, statt die ganze Seite zu sperren.
    $limit = eventboerse_rl_limit( $limit, $identifier_override === null );

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
    $bucket = 'eb_rl_' . hash_hmac( 'sha256', $action . '|' . $ident, wp_salt( 'auth' ) );
    delete_transient( $bucket );
}
