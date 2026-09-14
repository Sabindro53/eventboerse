<?php
/**
 * REST-Routen für den Storno-Vorgang.
 *
 * Regeln, die für jede Route hier gelten und deshalb nur einmal dastehen:
 *
 * · ANGEMELDET IST NICHT BERECHTIGT. `is_user_logged_in` ist die Tür, nicht
 *   die Erlaubnis. Wer beantragen darf, entscheidet `eb_storno_darf_
 *   beantragen()` am PaymentIntent von Stripe — nicht die Kennung aus dem
 *   Rumpf. Wer entscheiden darf, entscheidet `eb_erstattung_darf()`.
 *
 * · ES GIBT GENAU EINE STELLE, DIE GELD BEWEGT. Die Annahme ruft die
 *   bestehende Route `eb_stripe_refund()` mit dem Aufrufer als
 *   Dienstleister. Hier wird kein zweiter Weg zu Stripe gebaut — zwei Wege
 *   auf dasselbe Konto sind genau die Angriffsfläche, die man sich nicht
 *   ohne Not schafft, und die Rechteregel wäre doppelt zu pflegen.
 *
 * · EIN NEIN SAGT NICHT, WARUM. Ob es die Zahlung gibt und ob sie einem
 *   anderen gehört, ist dieselbe Antwort — sonst könnte man mit
 *   `pi_`-Kennungen fremde Buchungen abfragen.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function eb_storno_fehler( $code, $status, $text ) {
    return new WP_REST_Response( array( 'error' => $code, 'message' => $text ), $status );
}

/** Der PaymentIntent von Stripe — oder null. Kein Raten aus dem Rumpf. */
function eb_storno_pi_holen( $pi_id ) {
    if ( ! function_exists( 'eb_stripe_api' ) ) {
        return null;
    }
    $res = eb_stripe_api( 'GET', 'payment_intents/' . rawurlencode( $pi_id ), array() );
    if ( ! is_array( $res ) || empty( $res['ok'] ) || empty( $res['data']['id'] ) ) {
        return null;
    }
    return $res['data'];
}

/** Eine Zeile für die Ausgabe — nie mehr, als der Betrachter angeht. */
function eb_storno_karte( $row, $jetzt_ts ) {
    return array(
        'id'             => (int) $row['id'],
        'payment_intent' => (string) $row['payment_intent'],
        'betrag_cents'   => (int) $row['betrag_cents'],
        'waehrung'       => (string) $row['waehrung'],
        'grund'          => (string) $row['grund'],
        'antwort'        => (string) ( $row['antwort'] ?? '' ),
        'zustand'        => eb_storno_zustand( $row, $jetzt_ts ),
        'frist'          => (string) ( $row['frist'] ?? '' ),
        'erstellt'       => (string) ( $row['erstellt'] ?? '' ),
        'entschieden'    => (string) ( $row['entschieden'] ?? '' ),
    );
}

/**
 * POST /storno — der Planer beantragt.
 *
 * Der Antrag bewegt kein Geld. Er setzt eine Frist und macht den
 * Dienstleister zuständig.
 */
function eb_storno_beantragen( WP_REST_Request $request ) {
    $uid = get_current_user_id();
    if ( ! $uid ) {
        return eb_storno_fehler( 'not_logged_in', 401, 'Nicht angemeldet.' );
    }
    $p  = $request->get_json_params();
    $pi = isset( $p['payment_intent'] ) ? sanitize_text_field( $p['payment_intent'] ) : '';
    if ( ! preg_match( '/^pi_[A-Za-z0-9_]+$/', $pi ) ) {
        return eb_storno_fehler( 'bad_request', 400, 'Ungültige Zahlungs-Kennung.' );
    }

    $grund = eb_storno_grund_pruefen( $p['grund'] ?? '' );
    if ( is_string( $grund ) && strlen( $grund ) > 0 && $grund[0] === '!' ) {
        return eb_storno_fehler( 'bad_grund', 400, substr( $grund, 1 ) );
    }

    $pi_data = eb_storno_pi_holen( $pi );
    // Nicht gefunden und nicht der eigene sagen dasselbe.
    if ( ! $pi_data || ! eb_storno_darf_beantragen( $uid, $pi_data ) ) {
        return eb_storno_fehler( 'not_found', 404, 'Zu dieser Buchung ist kein Storno möglich.' );
    }

    global $wpdb;
    $tab = $wpdb->prefix . 'eb_storno';
    $jetzt = time();

    // Ein Antrag je Zahlung — sonst waere das Beantragen ein Weg, den
    // Dienstleister zuzuschuetten. Der UNIQUE-Schluessel traegt die Regel,
    // diese Abfrage nur die freundliche Antwort.
    $vorhanden = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE payment_intent = %s", $pi ), ARRAY_A );
    if ( $vorhanden ) {
        return eb_storno_fehler( 'exists', 409,
            'Zu dieser Buchung läuft bereits ein Storno-Antrag.' );
    }

    $ok = $wpdb->insert( $tab, array(
        'payment_intent' => $pi,
        'besteller_id'   => $uid,
        'anbieter_konto' => eb_erstattung_ziel( $pi_data ),
        'betrag_cents'   => (int) ( $pi_data['amount_received'] ?? $pi_data['amount'] ?? 0 ),
        'waehrung'       => strtoupper( (string) ( $pi_data['currency'] ?? 'eur' ) ),
        'grund'          => $grund,
        'status'         => 'offen',
        'frist'          => eb_storno_frist_ab( $jetzt ),
        'erstellt'       => gmdate( 'Y-m-d H:i:s', $jetzt ),
    ) );
    if ( ! $ok ) {
        return eb_storno_fehler( 'db', 500, 'Der Antrag konnte nicht gespeichert werden.' );
    }
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE id = %d", (int) $wpdb->insert_id ), ARRAY_A );
    return new WP_REST_Response( array( 'storno' => eb_storno_karte( $row, $jetzt ) ), 201 );
}

/** GET /storno — was mich angeht: meine Anträge und die an mich. */
function eb_storno_liste( WP_REST_Request $request ) {
    $uid = get_current_user_id();
    if ( ! $uid ) {
        return eb_storno_fehler( 'not_logged_in', 401, 'Nicht angemeldet.' );
    }
    global $wpdb;
    $tab   = $wpdb->prefix . 'eb_storno';
    $konto = (string) get_user_meta( $uid, 'eb_stripe_connect_id', true );
    $jetzt = time();

    $meine = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE besteller_id = %d ORDER BY id DESC LIMIT 100",
        $uid ), ARRAY_A ) ?: array();
    // Ein leeres Konto darf NIE auf ein leeres Ziel treffen — sonst saehe
    // jeder Angemeldete ohne Connect-Konto alle Antraege ohne Ziel.
    $an_mich = ( $konto !== '' ) ? ( $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE anbieter_konto = %s ORDER BY id DESC LIMIT 100",
        $konto ), ARRAY_A ) ?: array() ) : array();

    return new WP_REST_Response( array(
        'meine'   => array_map( function ( $r ) use ( $jetzt ) { return eb_storno_karte( $r, $jetzt ); }, $meine ),
        'an_mich' => array_map( function ( $r ) use ( $jetzt ) { return eb_storno_karte( $r, $jetzt ); }, $an_mich ),
        'frist_stunden' => EB_STORNO_FRIST_STUNDEN,
    ), 200 );
}

/**
 * POST /storno/{id}/entscheiden — der Dienstleister antwortet.
 *
 * Annehmen erstattet über die bestehende Route. Ablehnen braucht eine
 * Begründung: eine Absage ohne Grund ist für den Planer dasselbe wie keine
 * Antwort, nur endgültig.
 */
function eb_storno_entscheiden( WP_REST_Request $request ) {
    $uid = get_current_user_id();
    if ( ! $uid ) {
        return eb_storno_fehler( 'not_logged_in', 401, 'Nicht angemeldet.' );
    }
    $id = (int) $request->get_param( 'id' );
    global $wpdb;
    $tab = $wpdb->prefix . 'eb_storno';
    $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$tab} WHERE id = %d", $id ), ARRAY_A );
    if ( ! $row ) {
        return eb_storno_fehler( 'not_found', 404, 'Antrag nicht gefunden.' );
    }

    $pi_data = eb_storno_pi_holen( (string) $row['payment_intent'] );
    if ( ! $pi_data ) {
        return eb_storno_fehler( 'upstream', 502, 'Die Zahlung ist gerade nicht abrufbar.' );
    }
    $ist_admin = function_exists( 'eb_is_admin_user' ) ? eb_is_admin_user( $uid ) : false;
    $konto     = (string) get_user_meta( $uid, 'eb_stripe_connect_id', true );
    if ( ! eb_storno_darf_entscheiden( $ist_admin, $konto, $pi_data ) ) {
        return eb_storno_fehler( 'not_found', 404, 'Antrag nicht gefunden.' );
    }

    $jetzt   = time();
    $zustand = eb_storno_zustand( $row, $jetzt );
    if ( ! eb_storno_entscheidbar( $zustand ) ) {
        return eb_storno_fehler( 'entschieden', 409,
            'Über diesen Antrag ist bereits entschieden.' );
    }

    $p   = $request->get_json_params();
    $ent = isset( $p['entscheidung'] ) ? (string) $p['entscheidung'] : '';
    if ( ! in_array( $ent, array( 'annehmen', 'ablehnen' ), true ) ) {
        return eb_storno_fehler( 'bad_request', 400, 'Unbekannte Entscheidung.' );
    }

    if ( $ent === 'ablehnen' ) {
        $antwort = eb_storno_grund_pruefen( $p['antwort'] ?? '' );
        if ( is_string( $antwort ) && strlen( $antwort ) > 0 && $antwort[0] === '!' ) {
            return eb_storno_fehler( 'bad_grund', 400,
                'Bitte begründe die Ablehnung — ohne Grund ist sie für den '
                . 'Planer dasselbe wie keine Antwort.' );
        }
        $wpdb->update( $tab, array(
            'status'      => 'abgelehnt',
            'antwort'     => $antwort,
            'entschieden' => gmdate( 'Y-m-d H:i:s', $jetzt ),
        ), array( 'id' => $id, 'status' => 'offen' ) );
        $neu = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$tab} WHERE id = %d", $id ), ARRAY_A );
        return new WP_REST_Response( array( 'storno' => eb_storno_karte( $neu, $jetzt ) ), 200 );
    }

    // ANNEHMEN. Erstattet wird über die bestehende Route — eine einzige
    // Stelle bewegt Geld, und sie prueft die Rechte selbst noch einmal.
    if ( ! function_exists( 'eb_stripe_refund' ) ) {
        return eb_storno_fehler( 'nicht_bereit', 500, 'Erstattung ist nicht eingerichtet.' );
    }
    $req = new WP_REST_Request( 'POST', '/eventboerse/v1/stripe/refund' );
    $req->add_header( 'content-type', 'application/json' );
    $req->set_body( wp_json_encode( array(
        'payment_intent' => (string) $row['payment_intent'],
        'reason'         => 'requested_by_customer',
        'cancellation_reason' => (string) $row['grund'],
    ) ) );
    $antwort = eb_stripe_refund( $req );
    $status  = is_object( $antwort ) && method_exists( $antwort, 'get_status' )
        ? (int) $antwort->get_status() : 500;
    $refund_data = is_object( $antwort ) && method_exists( $antwort, 'get_data' ) ? $antwort->get_data() : array();
    if ( $status >= 300 || in_array( $refund_data['status'] ?? '', array( 'failed', 'canceled' ), true ) ) {
        // Der Antrag bleibt OFFEN. Ihn auf "angenommen" zu setzen, waehrend
        // kein Geld geflossen ist, waere die schlimmste Sorte Falschaussage
        // auf einem Geldweg.
        return eb_storno_fehler( 'erstattung_fehlgeschlagen', 502,
            'Die Erstattung ist fehlgeschlagen. Der Antrag bleibt offen.' );
    }

    $wpdb->update( $tab, array(
        'status'      => 'angenommen',
        'entschieden' => gmdate( 'Y-m-d H:i:s', $jetzt ),
    ), array( 'id' => $id, 'status' => 'offen' ) );
    $neu = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$tab} WHERE id = %d", $id ), ARRAY_A );
    return new WP_REST_Response( array( 'storno' => eb_storno_karte( $neu, $jetzt ) ), 200 );
}

add_action( 'rest_api_init', function () {
    register_rest_route( 'eventboerse/v1', '/storno', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_storno_beantragen',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_storno_liste',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );
    register_rest_route( 'eventboerse/v1', '/storno/(?P<id>\d+)/entscheiden', array(
        'methods'             => 'POST',
        'callback'            => 'eb_storno_entscheiden',
        'permission_callback' => 'is_user_logged_in',
    ) );
} );
