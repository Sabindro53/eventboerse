<?php
/** Server-owned booking terms and payment/refund audit. No escrow claim. */
if ( ! defined( 'ABSPATH' ) ) exit;

function eb_booking_listing( $id ) {
    global $wpdb;
    $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", (int) $id ) );
    // Legacy display ids. All new API calls use the canonical _dbId.
    if ( ! $row && (int) $id > 10000 ) $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", (int) $id - 10000 ) );
    return $row;
}

function eb_booking_money_cents( $amount ) {
    if ( ! is_scalar( $amount ) || ! is_numeric( $amount ) || ! is_finite( (float) $amount ) ) return 0;
    $value = (float) $amount;
    if ( $value < 0.50 || $value > 999999.99 || abs( round( $value * 100 ) - $value * 100 ) > 0.00001 ) return 0;
    return (int) round( $value * 100 );
}

/** Scope an agreement to one buyer, listing and message, never just a provider. */
function eb_booking_payment_terms( $uid, $p ) {
    global $wpdb;
    $listing = eb_booking_listing( $p['listing_id'] ?? 0 );
    if ( ! $uid || ! $listing || $listing->status !== 'active' ) return new WP_Error( 'listing_unavailable', 'Das Inserat ist nicht mehr buchbar.' );
    if ( (int) $listing->user_id === (int) $uid ) return new WP_Error( 'own_listing', 'Du kannst dein eigenes Inserat nicht buchen.' );
    if ( strtolower( $p['currency'] ?? 'eur' ) !== 'eur' ) return new WP_Error( 'currency_invalid', 'Buchungen werden in Euro abgerechnet.' );
    $amount = eb_booking_money_cents( $p['amount'] ?? null );
    if ( ! $amount ) return new WP_Error( 'amount_invalid', 'Bitte einen gültigen Gesamtbetrag ab 0,50 € mit höchstens zwei Nachkommastellen angeben.' );
    $offer_id = absint( $p['offer_id'] ?? 0 );
    $offer_filter = $offer_id ? $wpdb->prepare( ' AND m.id = %d', $offer_id ) : '';
    $offers = $wpdb->get_results( $wpdb->prepare(
        "SELECT m.*, c.listing_id, c.user_a, c.user_b FROM {$wpdb->prefix}eb_messages m JOIN {$wpdb->prefix}eb_conversations c ON c.id = m.conversation_id WHERE m.msg_type = 'offer' AND m.offer_status = 'accepted' AND c.listing_id = %d AND ((c.user_a = %d AND c.user_b = %d) OR (c.user_b = %d AND c.user_a = %d)) {$offer_filter} ORDER BY m.id DESC LIMIT 1",
        $listing->id, $uid, $listing->user_id, $uid, $listing->user_id
    ) );
    $offer = ! empty( $offers ) ? $offers[0] : null;
    if ( $offer && ( ! $offer_id || (int) $offer->id === $offer_id ) ) {
        $agreed = eb_booking_money_cents( $offer->offer_amount );
        if ( $amount !== $agreed ) return new WP_Error( 'agreement_amount_changed', 'Der Betrag weicht vom angenommenen Angebot ab. Bitte das aktuelle Angebot im Chat öffnen.' );
        return array( 'listing' => $listing, 'amount' => $agreed, 'offer_id' => (int) $offer->id, 'conversation_id' => (int) $offer->conversation_id, 'key' => 'offer_' . $offer->id );
    }
    return new WP_Error( 'agreement_required', 'Bitte zuerst den Gesamtpreis und Termin mit dem Anbieter im Chat vereinbaren und sein Angebot annehmen. Danach kannst du verbindlich bezahlen.' );
}

/** Only the actual provider may accept an actual customer's inquiry. */
function eb_booking_validate_message( $conv, $uid, $body, $type ) {
    if ( ! in_array( $type, array( 'text', 'message', 'offer', 'image' ), true ) ) return new WP_Error( 'message_type_invalid', 'Dieser Nachrichtentyp ist nicht erlaubt.' );
    if ( strlen( $body ) > 16000 ) return new WP_Error( 'message_too_long', 'Die Nachricht ist zu lang.' );
    if ( trim( $body ) === '' && $type !== 'offer' ) return new WP_Error( 'message_empty', 'Bitte eine Nachricht eingeben.' );
    $data = json_decode( $body, true );
    if ( ! is_array( $data ) || empty( $data['kind'] ) ) return true;
    $kind = $data['kind'];
    if ( ! in_array( $kind, array( 'inquiry', 'inquiry_accepted', 'inquiry_rejected', 'inquiry_cancelled' ), true ) ) return new WP_Error( 'message_kind_invalid', 'Diese Systemaktion ist nicht erlaubt.' );
    $listing = eb_booking_listing( $conv->listing_id );
    if ( ! $listing ) return new WP_Error( 'inquiry_listing_required', 'Bitte die Anfrage über ein verfügbares Inserat starten.' );
    if ( $kind === 'inquiry' ) {
        if ( (int) $listing->user_id === (int) $uid ) return new WP_Error( 'inquiry_customer_required', 'Eine Buchungsanfrage wird vom Kunden gestartet.' );
        return true;
    }
    $provider_action = in_array( $kind, array( 'inquiry_accepted', 'inquiry_rejected' ), true );
    if ( $provider_action !== ( (int) $listing->user_id === (int) $uid ) ) return new WP_Error( 'inquiry_wrong_actor', 'Du kannst nur Anfragen zu deinen eigenen Inseraten beantworten.' );
    global $wpdb;
    $rows = $wpdb->get_results( $wpdb->prepare( "SELECT sender_id, body FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d AND msg_type IN ('text','message') ORDER BY id DESC LIMIT 200", $conv->id ) );
    foreach ( $rows as $m ) {
        $original = json_decode( $m->body, true );
        if ( ! is_array( $original ) || ( $original['kind'] ?? '' ) !== 'inquiry' ) continue;
        if ( (int) $m->sender_id === (int) $listing->user_id ) continue;
        if ( (string) ( $original['cardId'] ?? '' ) !== (string) ( $data['cardId'] ?? '' ) || (string) ( $original['projectId'] ?? '' ) !== (string) ( $data['projectId'] ?? '' ) ) continue;
        if ( ! $provider_action && (int) $m->sender_id !== (int) $uid ) continue;
        return true;
    }
    return new WP_Error( 'inquiry_not_found', 'Die ursprüngliche Anfrage wurde nicht gefunden. Bitte im Chat eine neue Anfrage senden.' );
}

function eb_booking_error_response( $error, $status = 400 ) {
    return new WP_REST_Response( array( 'code' => $error->get_error_code(), 'message' => $error->get_error_message() ), $status );
}

/** Immutable mapping survives browser resets and reconcile acknowledgements. */
function eb_booking_record_payment( $pi ) {
    if ( ( $pi['status'] ?? '' ) !== 'succeeded' || empty( $pi['id'] ) ) return;
    $key = 'eb_booking_payment_' . sanitize_key( $pi['id'] );
    if ( get_option( $key ) ) return;
    $meta = $pi['metadata'] ?? array();
    $record = array( 'payment_intent' => $pi['id'], 'buyer_id' => (int) ( $meta['user_id'] ?? 0 ), 'provider_id' => (int) ( $meta['provider_id'] ?? 0 ), 'listing_id' => (int) ( $meta['listing_id'] ?? 0 ), 'offer_id' => (int) ( $meta['offer_id'] ?? 0 ), 'conversation_id' => (int) ( $meta['conversation_id'] ?? 0 ), 'card_id' => $meta['card_id'] ?? '', 'project_id' => $meta['project_id'] ?? '', 'amount' => (int) ( $pi['amount_received'] ?? 0 ), 'currency' => $pi['currency'] ?? 'eur', 'paid_at' => time() );
    add_option( $key, $record, '', false );
    if ( $record['offer_id'] ) update_option( 'eb_booking_offer_pi_' . $record['offer_id'], $pi['id'], false );
}

/** Cancel an uncompleted checkout before withdrawing its agreement. */
function eb_booking_release_offer( $offer_id ) {
    $pi = get_option( 'eb_booking_offer_pi_' . (int) $offer_id );
    if ( ! $pi ) return true;
    $res = eb_stripe_api( 'GET', 'payment_intents/' . rawurlencode( $pi ) );
    if ( empty( $res['ok'] ) ) return new WP_Error( 'payment_check_failed', 'Der Zahlungsstatus ist gerade nicht prüfbar. Bitte später erneut versuchen.' );
    $status = $res['data']['status'] ?? '';
    if ( $status === 'succeeded' ) return new WP_Error( 'paid_agreement_locked', 'Diese Buchung ist bezahlt. Eine Stornierung muss über den Anbieter mit dokumentierter Erstattung erfolgen.' );
    if ( $status === 'canceled' ) return true;
    $cancel = eb_stripe_api( 'POST', 'payment_intents/' . rawurlencode( $pi ) . '/cancel', array(), 'withdraw_offer_' . (int) $offer_id );
    if ( empty( $cancel['ok'] ) ) return new WP_Error( 'payment_in_progress', 'Die Zahlung wird verarbeitet. Bitte den endgültigen Zahlungsstatus abwarten.' );
    return true;
}

/** Persist each Stripe refund state; signed webhooks refresh rather than invent settlement. */
function eb_booking_record_refund( $refund ) {
    if ( empty( $refund['id'] ) || empty( $refund['payment_intent'] ) ) return;
    $key = 'eb_booking_refund_' . sanitize_key( $refund['payment_intent'] );
    $existing = get_option( $key, array() );
    // A delayed creation webhook must not regress a confirmed outcome to pending.
    $previous = $existing[ $refund['id'] ]['status'] ?? '';
    if ( in_array( $previous, array( 'succeeded', 'failed', 'canceled' ), true ) && in_array( $refund['status'] ?? 'pending', array( 'pending', 'requires_action' ), true ) ) return;
    $existing[ $refund['id'] ] = array( 'id' => $refund['id'], 'status' => $refund['status'] ?? 'pending', 'amount' => (int) ( $refund['amount'] ?? 0 ), 'failure_reason' => $refund['failure_reason'] ?? '', 'updated_at' => time() );
    update_option( $key, $existing, false );
}

function eb_booking_refund_authorized( $pi, $uid, $admin, $connect_id ) {
    // Paying for a service does not authorize reclaiming money unilaterally.
    $destination = $pi['transfer_data']['destination'] ?? '';
    return $admin || ( $connect_id && $destination && hash_equals( (string) $destination, (string) $connect_id ) );
}

/** Serialize agreement changes and checkout creation on the same DB connection. */
function eb_booking_lock( $conversation_id ) {
    global $wpdb;
    $key = 'eb_booking_' . md5( $wpdb->prefix . ':' . (int) $conversation_id );
    if ( (int) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 3)', $key ) ) !== 1 ) return new WP_Error( 'booking_busy', 'Diese Buchung wird gerade aktualisiert. Bitte kurz warten und erneut versuchen.' );
    register_shutdown_function( function() use ( $key ) {
        global $wpdb;
        $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $key ) );
    } );
    return true;
}
