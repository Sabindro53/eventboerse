<?php
/**
 * Öffentliche Profil-Route `GET provider/{id}` (N01, PRODUCT_REDESIGN.md 9).
 *
 * Bis zum 16.10.2026 antwortete die Route für JEDE Nutzer-ID mit Name,
 * Rolle, Ort und Bio — ohne Anmeldung, über fortlaufende IDs aufzählbar.
 * Die Rolle „Admin“ verriet die Verwaltungskonten, und Event-Planer, die nie
 * etwas veröffentlicht haben, standen trotzdem mit Namen im Netz.
 *
 * Seitdem gilt (Entscheidung des Inhabers):
 *   - öffentlich nur die Basisrolle, also „Dienstleister“ oder „Event-Planer“,
 *     NIE „Admin“;
 *   - ein Profil ohne öffentliche Inhalte gibt DIESELBE 404 wie eine ID, die
 *     es nicht gibt, sonst ließe sich weiter zählen.
 * Der Suchname zählt bewusst nicht als öffentlicher Inhalt: er ist seit dem
 * 15.09.2026 Pflicht und damit keine Einwilligung mehr.
 *
 * Ausgeführt wird das in tests/e2e/profil-oeffentlich.php, nicht gelesen.
 */
if ( ! defined( 'ABSPATH' ) ) exit;

/** Einheitliche Absage für „gibt es nicht“ UND „nicht öffentlich“. */
function eb_profil_nicht_gefunden() {
    return new WP_REST_Response( array( 'message' => 'Anbieter nicht gefunden.' ), 404 );
}

/**
 * Darf $betrachter_id das Profil sehen?
 * Billige Prüfungen zuerst; die zwei Zählabfragen nur, wenn nötig.
 */
function eb_profil_sichtbar( $user, $hat_inserate, $betrachter_id ) {
    global $wpdb;
    $pid = (int) $user->ID;
    $betrachter_id = (int) $betrachter_id;
    if ( $betrachter_id && $betrachter_id === $pid ) return true;
    if ( $betrachter_id && eb_is_admin_user( $betrachter_id ) ) return true;
    if ( in_array( 'dienstleister', (array) $user->roles, true ) ) return true;
    if ( $hat_inserate ) return true;
    $bewertet = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}eb_reviews WHERE user_id = %d", $pid
    ) );
    if ( $bewertet > 0 ) return true;
    if ( $betrachter_id ) {
        $gespraech = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}eb_conversations WHERE (user_a = %d AND user_b = %d) OR (user_a = %d AND user_b = %d)",
            $pid, $betrachter_id, $betrachter_id, $pid
        ) );
        if ( $gespraech > 0 ) return true;
    }
    return false;
}

function eb_provider_profile( WP_REST_Request $request ) {
    global $wpdb;
    $provider_id = absint( $request['id'] );
    $user        = get_userdata( $provider_id );
    if ( ! $user ) {
        return eb_profil_nicht_gefunden();
    }

    $name   = trim( $user->first_name . ' ' . $user->last_name );
    $meta   = eb_user_profile_meta( $provider_id );
    // Öffentlich nur die Basisrolle, nie „Admin“ (N01).
    $role   = eventboerse_base_role( $user );
    $since  = date( 'Y', strtotime( $user->user_registered ) );

    // Listings by this provider
    $listings = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE user_id = %d AND status = 'active' ORDER BY created_at DESC",
        $provider_id
    ), ARRAY_A );

    if ( ! eb_profil_sichtbar( $user, ! empty( $listings ), get_current_user_id() ) ) {
        return eb_profil_nicht_gefunden();
    }

    // Reviews on their listings
    $listing_ids = wp_list_pluck( $listings, 'id' );
    $listing_titles = array();
    foreach ( $listings as $l ) {
        $listing_titles[ (int) $l['id'] ] = $l['title'];
    }
    $reviews     = array();
    if ( ! empty( $listing_ids ) ) {
        $id_placeholders = implode( ',', array_fill( 0, count( $listing_ids ), '%d' ) );
        $reviews = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
                 LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
                 WHERE r.listing_id IN ($id_placeholders) ORDER BY r.created_at DESC",
                $listing_ids
            )
        );
    }

    $formatted_reviews = array();
    foreach ( $reviews as $r ) {
        $rname  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
        $rphoto = get_user_meta( $r->uid, 'eb_photo_url', true );
        $formatted_reviews[] = array(
            'user_id'      => (int) $r->uid,
            'rating'       => (int) $r->rating,
            'text'         => $r->body,
            'name'         => $rname ?: $r->display_name,
            'avatar'       => $rphoto ?: eb_avatar_url( $rname ?: $r->display_name, $rname ?: $r->display_name ),
            'date'         => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            'listingTitle' => isset( $listing_titles[ (int) $r->listing_id ] ) ? $listing_titles[ (int) $r->listing_id ] : '',
        );
    }

    $response = new WP_REST_Response( array(
        'id'       => $provider_id,
        'name'     => $name,
        'role'     => $role,
        'since'    => $since,
        'tagline'  => $meta['tagline'],
        'location' => $meta['location'],
        'bio'      => $meta['bio'],
        'coverUrl' => $meta['coverUrl'],
        'coverPosY'=> $meta['coverPosY'],
        'photoUrl' => $meta['photoUrl'],
        'gallery'  => $meta['gallery'],
        'socialLinks' => $meta['socialLinks'],
        'collaborations' => eb_collaborations_enriched( $provider_id, true ),
        'listings' => array_map( 'eb_format_listing', $listings ),
        'reviews'  => $formatted_reviews,
    ), 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}
