<?php
/**
 * Stripe Webhook — Signaturverifizierter Endpoint.
 *
 * Datei: includes/security/stripe-webhook.php
 * Aufruf: in functions.php am Ende einbinden mit
 *   require_once __DIR__ . '/includes/security/stripe-webhook.php';
 *
 * Konfiguration: WP-Option `eventboerse_stripe_webhook_secret` setzen,
 * z.B. ueber WP-CLI:  wp option update eventboerse_stripe_webhook_secret "whsec_xxx"
 * oder einmalig per `update_option` in einem Migrations-Snippet.
 *
 * Verifikation ist pure-PHP (HMAC-SHA256) — keine Stripe-PHP-Library noetig.
 * Idempotenz via WP-Transient mit Stripe-Event-ID (24h TTL).
 *
 * Verarbeitung: jeder verifizierte Event triggert
 *   do_action( "eventboerse_stripe_event_{$type}", $event_data )
 * z.B. eventboerse_stripe_event_payment_intent_succeeded.
 * Andere Plugins/Module koennen sich daran haengen.
 *
 * Audit-Issue: #13 (P0.3 — Stripe-Webhook ohne Signaturverifikation).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! defined( 'EVENTBOERSE_STRIPE_WEBHOOK_TOLERANCE' ) ) {
    // Stripe-Empfehlung: 5 Minuten Replay-Schutz.
    define( 'EVENTBOERSE_STRIPE_WEBHOOK_TOLERANCE', 300 );
}

/**
 * Registriert den Webhook-Endpoint.
 */
add_action( 'rest_api_init', function () {
    register_rest_route(
        'eventboerse/v1',
        '/stripe/webhook',
        array(
            'methods'             => 'POST',
            'callback'            => 'eventboerse_stripe_webhook_handler',
            'permission_callback' => '__return_true', // Public — Auth via HMAC.
        )
    );
} );

/**
 * Handler: liest Raw-Body, verifiziert HMAC, dispatcht das Event.
 *
 * @return WP_REST_Response
 */
function eventboerse_stripe_webhook_handler() {
    $secret = (string) get_option( 'eventboerse_stripe_webhook_secret', '' );

    if ( $secret === '' ) {
        error_log( '[stripe-webhook] eventboerse_stripe_webhook_secret nicht gesetzt' );
        return new WP_REST_Response( array( 'error' => 'webhook_misconfigured' ), 503 );
    }

    $payload = file_get_contents( 'php://input' );
    $sig_header = isset( $_SERVER['HTTP_STRIPE_SIGNATURE'] ) ? (string) $_SERVER['HTTP_STRIPE_SIGNATURE'] : '';

    if ( $payload === false || $payload === '' || $sig_header === '' ) {
        return new WP_REST_Response( array( 'error' => 'missing_payload_or_signature' ), 400 );
    }

    if ( ! eventboerse_stripe_verify_signature( $payload, $sig_header, $secret ) ) {
        error_log( '[stripe-webhook] Signaturverifikation fehlgeschlagen' );
        return new WP_REST_Response( array( 'error' => 'invalid_signature' ), 400 );
    }

    $event = json_decode( $payload, true );
    if ( ! is_array( $event ) || empty( $event['id'] ) || empty( $event['type'] ) ) {
        return new WP_REST_Response( array( 'error' => 'malformed_event' ), 400 );
    }

    // Idempotenz: jeder Event wird nur einmal verarbeitet (Stripe sendet bei
    // Timeouts gerne mehrfach).
    $idem_key = 'eb_stripe_evt_' . md5( $event['id'] );
    if ( get_transient( $idem_key ) ) {
        return new WP_REST_Response( array( 'status' => 'duplicate_ignored' ), 200 );
    }
    set_transient( $idem_key, 1, DAY_IN_SECONDS );

    $type = preg_replace( '/[^a-z0-9_\.]/i', '_', (string) $event['type'] );
    $hook = 'eventboerse_stripe_event_' . str_replace( '.', '_', $type );

    do_action( $hook, $event );
    do_action( 'eventboerse_stripe_event_any', $event );

    return new WP_REST_Response( array( 'status' => 'received' ), 200 );
}

/**
 * HMAC-SHA256-Verifikation der Stripe-Signatur.
 *
 * Header-Format: t=TIMESTAMP,v1=SIG[,v0=SIG_OLD,v1=SIG_ALT]
 * Signed-Payload: TIMESTAMP + "." + RAW_BODY
 *
 * @param string $payload   Raw POST body.
 * @param string $sig_header Wert von HTTP_STRIPE_SIGNATURE.
 * @param string $secret    Webhook-Secret (whsec_...).
 * @return bool
 */
function eventboerse_stripe_verify_signature( $payload, $sig_header, $secret ) {
    $timestamp = '';
    $signatures = array();

    foreach ( explode( ',', $sig_header ) as $part ) {
        $kv = explode( '=', $part, 2 );
        if ( count( $kv ) !== 2 ) {
            continue;
        }
        list( $k, $v ) = $kv;
        $k = trim( $k );
        $v = trim( $v );
        if ( $k === 't' ) {
            $timestamp = $v;
        } elseif ( $k === 'v1' ) {
            $signatures[] = $v;
        }
    }

    if ( $timestamp === '' || empty( $signatures ) ) {
        return false;
    }

    // Replay-Schutz: Timestamp darf nicht zu alt sein.
    if ( abs( time() - (int) $timestamp ) > EVENTBOERSE_STRIPE_WEBHOOK_TOLERANCE ) {
        error_log( '[stripe-webhook] Timestamp ausserhalb der Toleranz' );
        return false;
    }

    $signed_payload = $timestamp . '.' . $payload;
    $expected = hash_hmac( 'sha256', $signed_payload, $secret );

    foreach ( $signatures as $sig ) {
        if ( hash_equals( $expected, $sig ) ) {
            return true;
        }
    }
    return false;
}
