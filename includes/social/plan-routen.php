<?php
/**
 * REST-Routen des gemeinsamen Plans.
 *
 * Die Begruendungen zum Rechtemodell und zu den drei Konfliktarten stehen in
 * `plan.php`. Hier steht, was jede Route damit macht — und wo eine Pruefung
 * fehlen wuerde, faellt `plan.spec.js` durch, weil sie das PHP wirklich
 * ausfuehrt.
 *
 * Alle Routen haengen an `is_user_logged_in`. Das ist die AEUSSERE Tuer, nie
 * die einzige: jeder Handler prueft zusaetzlich die Mitgliedschaft, denn
 * angemeldet zu sein sagt nichts darueber, in welcher Gruppe jemand ist.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Gruppe und Berechtigung in einem Griff.
 *
 * Gibt entweder die Gruppen-ID zurueck oder den fertigen Fehler. Ein Nein
 * sagt dabei nicht, warum: „gibt es nicht" gilt auch fuer eine Gruppe, die
 * es gibt und die den Fragenden nichts angeht — wer 404 von 403
 * unterscheiden kann, kann Gruppen zaehlen.
 *
 * Das schliesst EINGELADENE ein: fuer sie existiert der Plan nicht. Sie
 * sehen die Gruppe (Name, Anlass, Personenzahl), damit sie entscheiden
 * koennen — den Inhalt bekommen sie erst mit dem Zusagen.
 */
function eb_plan_zugang( $request, $ich ) {
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_plan_darf( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    return $gid;
}

/** Titel, Kategorie und Notiz saeubern — fremder Text wird nie zu Markup. */
function eb_plan_feld( $roh, $max ) {
    return eb_social_gruppenfeld( $roh, $max );
}

/**
 * Ein Betrag in Cent.
 *
 * Negative Betraege werden auf 0 gezogen statt abgelehnt: ein Tippfehler im
 * Minuszeichen soll den Posten nicht verlieren. Der Deckel bei 100 Mio. Cent
 * (1 Mio. Euro) ist keine Geschaeftsregel, sondern verhindert, dass eine
 * versehentlich eingetippte Zahlenwueste die Bilanz unlesbar macht.
 */
function eb_plan_betrag( $roh ) {
    $n = (int) round( (float) $roh );
    if ( $n < 0 ) {
        $n = 0;
    }
    return min( $n, 100000000 );
}

/** Den Plan lesen. */
function eb_plan_lesen( WP_REST_Request $request ) {
    $ich = get_current_user_id();
    $gid = eb_plan_zugang( $request, $ich );
    if ( $gid instanceof WP_REST_Response ) {
        return $gid;   // eb_plan_zugang() hat schon abgelehnt
    }
    $posten = eb_plan_liste( $gid );
    return new WP_REST_Response( array(
        'items'  => $posten,
        'bilanz' => eb_plan_bilanz( $posten ),
    ), 200 );
}

/**
 * Einen Posten anlegen.
 *
 * Kollidiert nie: zwei INSERTs sind zwei Posten. Wer hier sperrt, loest ein
 * Problem, das es nicht gibt — und macht das gemeinsame Sammeln umstaendlich,
 * also genau das, wofuer der Plan da ist.
 */
function eb_plan_anlegen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = eb_plan_zugang( $request, $ich );
    if ( $gid instanceof WP_REST_Response ) {
        return $gid;   // eb_plan_zugang() hat schon abgelehnt
    }

    $params = (array) $request->get_json_params();
    $titel  = eb_plan_feld( $params['titel'] ?? '', 120 );
    if ( $titel === '' ) {
        return eb_social_fehler( 'titel_fehlt', 400, 'Der Posten braucht einen Namen.' );
    }

    $tab    = $wpdb->prefix . 'eb_group_plan_items';
    $anzahl = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$tab} WHERE group_id = %d", $gid
    ) );
    if ( $anzahl >= EB_MAX_PLAN_POSTEN ) {
        return eb_social_fehler( 'zu_viele', 409,
            sprintf( 'Mehr als %d Posten gehen nicht.', EB_MAX_PLAN_POSTEN ) );
    }

    // Am KONTO gedeckelt, nicht an der IP: hinter einem Proxy meint
    // REMOTE_ADDR alle Besucher gemeinsam, und dann sperrte der Deckel
    // Unbeteiligte statt des Vielschreibers.
    $rl = eventboerse_check_rate_limit( 'social_plan', 120, HOUR_IN_SECONDS, 'u' . $ich );
    if ( is_wp_error( $rl ) ) {
        return eb_social_fehler( 'rate_limit', 429, $rl->get_error_message() );
    }

    $jetzt = current_time( 'mysql' );
    $wpdb->insert( $tab, array(
        'group_id'     => $gid,
        'titel'        => $titel,
        'kategorie'    => eb_plan_feld( $params['kategorie'] ?? '', 60 ),
        'status'       => 'offen',
        // AUSDRUECKLICH 0, nicht dem Spalten-Standard ueberlassen: auf genau
        // diesem Wert steht die Bedingung des UPDATE beim Uebernehmen. Eine
        // Spalte, deren Anfangswert woanders festgelegt wird, ist bei einer
        // Wettlauf-Bedingung die falsche Sorte Fernwirkung.
        'zustaendig_id' => 0,
        'notiz'        => eb_plan_feld( $params['notiz'] ?? '', 500 ),
        'betrag_cent'  => eb_plan_betrag( $params['betragCent'] ?? 0 ),
        'listing_id'   => eb_plan_listing( $params['listingId'] ?? 0 ),
        'rev'          => 1,
        'erstellt_von' => $ich,
        'created_at'   => $jetzt,
        'updated_at'   => $jetzt,
    ), array( '%d', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%d', '%d', '%s', '%s' ) );

    $neu = eb_plan_posten_laden( (int) $wpdb->insert_id );
    return new WP_REST_Response( array( 'item' => eb_plan_karte( $neu ) ), 201 );
}

/**
 * Ein verknuepftes Inserat — oder 0.
 *
 * Geprueft wird, ob es das Inserat WIRKLICH gibt. Ohne diese Probe zeigte
 * der Plan eine Karte, hinter der nichts steht, und der Fehler faellt erst
 * dem auf, der darauf klickt.
 */
function eb_plan_listing( $roh ) {
    global $wpdb;
    $id = absint( $roh );
    if ( ! $id ) {
        return 0;
    }
    $tab = $wpdb->prefix . 'eb_listings';
    $da  = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$tab} WHERE id = %d", $id
    ) );
    return $da ?: 0;
}

/**
 * Einen Posten bearbeiten — mit Revision.
 *
 * Das ist die einzige Stelle mit echtem Lesen-Aendern-Schreiben, und darum
 * die einzige mit optimistischem Sperren. Wer mit einer veralteten Revision
 * schreibt, wird abgewiesen UND bekommt den aktuellen Stand zurueck: eine
 * Ablehnung ohne ihn zwingt zu einem zweiten Abruf und sieht fuer den Nutzer
 * aus wie ein Fehler statt wie „jemand war schneller".
 *
 * Das UPDATE traegt die Revision in seiner WHERE-Bedingung. Sie vorher zu
 * vergleichen und danach zu schreiben waere genau das Rennen, das hier
 * verhindert werden soll.
 */
function eb_plan_aendern( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = eb_plan_zugang( $request, $ich );
    if ( $gid instanceof WP_REST_Response ) {
        return $gid;   // eb_plan_zugang() hat schon abgelehnt
    }

    $posten = eb_plan_posten_laden( absint( $request['item'] ) );
    if ( ! $posten || (int) $posten['group_id'] !== $gid ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diesen Posten gibt es nicht.' );
    }

    $params = (array) $request->get_json_params();
    $rev    = absint( $params['rev'] ?? 0 );
    if ( ! $rev ) {
        return eb_social_fehler( 'rev_fehlt', 400, 'Ohne Revision wird nicht geschrieben.' );
    }

    $felder = array( 'updated_at' => current_time( 'mysql' ) );
    $format = array( '%s' );
    if ( array_key_exists( 'titel', $params ) ) {
        $titel = eb_plan_feld( $params['titel'], 120 );
        if ( $titel === '' ) {
            return eb_social_fehler( 'titel_fehlt', 400, 'Der Posten braucht einen Namen.' );
        }
        $felder['titel'] = $titel;
        $format[]        = '%s';
    }
    if ( array_key_exists( 'kategorie', $params ) ) {
        $felder['kategorie'] = eb_plan_feld( $params['kategorie'], 60 );
        $format[]            = '%s';
    }
    if ( array_key_exists( 'notiz', $params ) ) {
        $felder['notiz'] = eb_plan_feld( $params['notiz'], 500 );
        $format[]        = '%s';
    }
    if ( array_key_exists( 'betragCent', $params ) ) {
        $felder['betrag_cent'] = eb_plan_betrag( $params['betragCent'] );
        $format[]              = '%d';
    }
    if ( array_key_exists( 'listingId', $params ) ) {
        $felder['listing_id'] = eb_plan_listing( $params['listingId'] );
        $format[]             = '%d';
    }
    if ( array_key_exists( 'status', $params ) ) {
        $status = (string) $params['status'];
        if ( ! in_array( $status, eb_plan_status_erlaubt(), true ) ) {
            return eb_social_fehler( 'status_ungueltig', 400, 'Diesen Zustand gibt es nicht.' );
        }
        $felder['status'] = $status;
        $format[]         = '%s';
    }

    $tab = $wpdb->prefix . 'eb_group_plan_items';
    $ok  = $wpdb->update(
        $tab,
        array_merge( $felder, array( 'rev' => (int) $posten['rev'] + 1 ) ),
        array( 'id' => (int) $posten['id'], 'rev' => $rev ),
        array_merge( $format, array( '%d' ) ),
        array( '%d', '%d' )
    );

    if ( ! $ok ) {
        // Der aktuelle Stand kommt mit. Ohne ihn muesste der Aufrufer
        // nachfragen, und bis dahin zeigt er weiter den veralteten.
        $jetzt = eb_plan_posten_laden( (int) $posten['id'] );
        return new WP_REST_Response( array(
            'code'    => 'veraltet',
            'message' => 'Jemand war schneller — hier ist der aktuelle Stand.',
            'item'    => $jetzt ? eb_plan_karte( $jetzt ) : null,
        ), 409 );
    }

    return new WP_REST_Response(
        array( 'item' => eb_plan_karte( eb_plan_posten_laden( (int) $posten['id'] ) ) ), 200 );
}

/**
 * Einen Posten uebernehmen — „ich kuemmere mich drum".
 *
 * Ein Wettlauf um EINEN Platz, und deshalb ein BEDINGTES UPDATE: die
 * Bedingung `zustaendig_id = 0` steht in der Abfrage, nicht in einem
 * vorherigen `if`. Zwei gleichzeitige Uebernahmen enden damit sauber — einer
 * gewinnt, der andere bekommt einen ehrlichen Hinweis mit dem Namen dessen,
 * der schneller war.
 *
 * Optimistisches Sperren waere hier SCHWAECHER: es setzt voraus, dass der
 * Aufrufer den Zustand vorher gelesen hat, und genau dieses Lesen ist der
 * Moment, in dem das Rennen entsteht.
 */
function eb_plan_uebernehmen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = eb_plan_zugang( $request, $ich );
    if ( $gid instanceof WP_REST_Response ) {
        return $gid;   // eb_plan_zugang() hat schon abgelehnt
    }

    $posten = eb_plan_posten_laden( absint( $request['item'] ) );
    if ( ! $posten || (int) $posten['group_id'] !== $gid ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diesen Posten gibt es nicht.' );
    }

    $tab = $wpdb->prefix . 'eb_group_plan_items';
    $ok  = $wpdb->update(
        $tab,
        array(
            'zustaendig_id' => $ich,
            'status'        => 'vergeben',
            'rev'           => (int) $posten['rev'] + 1,
            'updated_at'    => current_time( 'mysql' ),
        ),
        array( 'id' => (int) $posten['id'], 'zustaendig_id' => 0 ),
        array( '%d', '%s', '%d', '%s' ),
        array( '%d', '%d' )
    );

    if ( ! $ok ) {
        $jetzt = eb_plan_posten_laden( (int) $posten['id'] );
        $wer   = $jetzt ? (int) $jetzt['zustaendig_id'] : 0;
        return new WP_REST_Response( array(
            'code'    => 'schon_vergeben',
            'message' => $wer === $ich
                ? 'Du kümmerst dich schon darum.'
                : 'Jemand anderes kümmert sich schon darum.',
            'item'    => $jetzt ? eb_plan_karte( $jetzt ) : null,
        ), 409 );
    }

    return new WP_REST_Response(
        array( 'item' => eb_plan_karte( eb_plan_posten_laden( (int) $posten['id'] ) ) ), 200 );
}

/**
 * Einen Posten wieder freigeben.
 *
 * Nur der Zustaendige selbst oder die Verwaltung. Sonst koennte jedes
 * Mitglied jedem anderen die Zusage entziehen, und die Uebernahme waere
 * keine Zusage mehr, sondern eine Absichtserklaerung.
 */
function eb_plan_freigeben( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = eb_plan_zugang( $request, $ich );
    if ( $gid instanceof WP_REST_Response ) {
        return $gid;   // eb_plan_zugang() hat schon abgelehnt
    }

    $posten = eb_plan_posten_laden( absint( $request['item'] ) );
    if ( ! $posten || (int) $posten['group_id'] !== $gid ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diesen Posten gibt es nicht.' );
    }
    if ( (int) $posten['zustaendig_id'] !== $ich && ! eb_gruppe_darf_verwalten( $gid, $ich ) ) {
        return eb_social_fehler( 'nicht_erlaubt', 403,
            'Nur wer zugesagt hat, kann wieder abgeben.' );
    }

    $wpdb->update(
        $wpdb->prefix . 'eb_group_plan_items',
        array(
            'zustaendig_id' => 0,
            'status'        => 'offen',
            'rev'           => (int) $posten['rev'] + 1,
            'updated_at'    => current_time( 'mysql' ),
        ),
        array( 'id' => (int) $posten['id'] ),
        array( '%d', '%s', '%d', '%s' ),
        array( '%d' )
    );

    return new WP_REST_Response(
        array( 'item' => eb_plan_karte( eb_plan_posten_laden( (int) $posten['id'] ) ) ), 200 );
}

/**
 * Einen Posten loeschen.
 *
 * Nur wer ihn angelegt hat — oder die Verwaltung. Duerfte jedes Mitglied
 * jeden Posten entfernen, koennte einer die Arbeit aller anderen wegraeumen,
 * und die Gruppe haette keinen Weg zurueck.
 */
function eb_plan_loeschen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = eb_plan_zugang( $request, $ich );
    if ( $gid instanceof WP_REST_Response ) {
        return $gid;   // eb_plan_zugang() hat schon abgelehnt
    }

    $posten = eb_plan_posten_laden( absint( $request['item'] ) );
    if ( ! $posten || (int) $posten['group_id'] !== $gid ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diesen Posten gibt es nicht.' );
    }
    if ( (int) $posten['erstellt_von'] !== $ich && ! eb_gruppe_darf_verwalten( $gid, $ich ) ) {
        return eb_social_fehler( 'nicht_erlaubt', 403,
            'Nur wer den Posten angelegt hat, kann ihn entfernen.' );
    }

    $wpdb->delete( $wpdb->prefix . 'eb_group_plan_items',
        array( 'id' => (int) $posten['id'] ), array( '%d' ) );
    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/* ══════════════════════════════════════════════════════════════════════
   REGISTRIERUNG
   ══════════════════════════════════════════════════════════════════════ */

function eb_plan_routen_registrieren() {
    $ns  = 'eventboerse/v1';
    $auf = 'is_user_logged_in';

    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/plan', array(
        'methods'             => 'GET',
        'callback'            => 'eb_plan_lesen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/plan', array(
        'methods'             => 'POST',
        'callback'            => 'eb_plan_anlegen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/plan/(?P<item>\d+)', array(
        'methods'             => 'POST',
        'callback'            => 'eb_plan_aendern',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/plan/(?P<item>\d+)/uebernehmen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_plan_uebernehmen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/plan/(?P<item>\d+)/freigeben', array(
        'methods'             => 'POST',
        'callback'            => 'eb_plan_freigeben',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/plan/(?P<item>\d+)/loeschen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_plan_loeschen',
        'permission_callback' => $auf,
    ) );
}
add_action( 'rest_api_init', 'eb_plan_routen_registrieren' );
