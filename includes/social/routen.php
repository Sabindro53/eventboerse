<?php
/**
 * REST-Routen für Freunde und Gruppen.
 *
 * Regeln, die für JEDE Route hier gelten und deshalb nur einmal dastehen:
 *
 * · ANGEMELDET IST NICHT BERECHTIGT. `is_user_logged_in` ist die Tür, nicht
 *   die Erlaubnis. Jede Route prüft zusätzlich die Beziehung — Freundschaft,
 *   Mitgliedschaft, Rolle —, und zwar im Handler, nicht im
 *   `permission_callback`: der kennt die Kennung aus dem Rumpf noch nicht.
 *
 * · EIN NEIN SAGT NICHT, WARUM. „Gruppe nicht gefunden" gilt auch für eine
 *   Gruppe, die es gibt und die den Fragenden nichts angeht. Die
 *   Unterscheidung wäre ein Orakel: wer 404 von 403 unterscheiden kann,
 *   kann Gruppen zählen.
 *
 * · GESCHRIEBEN WIRD NUR MIT ZUSTIMMUNG. Es gibt keine Route, die jemanden
 *   ohne seine Handlung zum Freund oder zum Mitglied macht.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Einheitliche Fehlerantwort — der Text sagt nie mehr als nötig. */
function eb_social_fehler( $code, $status, $text ) {
    return new WP_REST_Response( array( 'error' => $code, 'message' => $text ), $status );
}

/** Die Kennung aus dem Rumpf, geprüft: eine echte, andere, existierende. */
function eb_social_gegenueber( $params, $ich ) {
    $id = isset( $params['userId'] ) ? absint( $params['userId'] ) : 0;
    if ( ! $id || $id === (int) $ich ) {
        return 0;
    }
    return get_userdata( $id ) ? $id : 0;
}

/* ══════════════════════════════════════════════════════════════════════
   HANDLE
   ══════════════════════════════════════════════════════════════════════ */

function eb_social_ich( WP_REST_Request $request ) {
    $ich = get_current_user_id();
    return new WP_REST_Response( array(
        'handle'     => eb_handle_von( $ich ),
        'auffindbar' => eb_handle_auffindbar( $ich ),
        'person'     => eb_person_karte( $ich ),
        'friends'    => count( eb_freunde_ids( $ich ) ),
    ), 200 );
}

/** Ein WP_Error aus dem Schreibweg in eine Antwort mit passendem Status. */
function eb_social_handle_fehler( WP_Error $e ) {
    $status = array(
        'handle_ungueltig' => 400,
        'handle_gesperrt'  => 409,
        'handle_vergeben'  => 409,
        'handle_sperre'    => 503,
    );
    $code = $e->get_error_code();
    return eb_social_fehler( $code, $status[ $code ] ?? 400, $e->get_error_message() );
}

/**
 * Nickname setzen, ändern oder löschen — und die Auffindbarkeit dazu.
 *
 * `auffindbar` ist optional: fehlt es, bleibt die bisherige Entscheidung
 * stehen. Ein Namenswechsel darf niemanden still sichtbar machen.
 *
 * Ein leerer Handle ist weiterhin der Rückzug: kein Nickname, nicht
 * auffindbar. Ohne diesen Weg wäre die Einwilligung einmalig und
 * unwiderruflich, und das wäre keine.
 *
 * Nur ein WECHSEL des Namens zählt gegen die Bremse — die Auffindbarkeit
 * umzuschalten, ist kein Missbrauchsweg, und wer nur sie ändert, darf nicht
 * an einem Deckel scheitern, den er mit Tippfehlern verbraucht hat.
 */
function eb_social_handle_setzen( WP_REST_Request $request ) {
    $ich        = get_current_user_id();
    $params     = (array) $request->get_json_params();
    $handle     = strtolower( trim( (string) ( $params['handle'] ?? '' ) ) );
    $handle     = ltrim( $handle, '@' );
    // JSON false must never become consent through PHP's truthy "false" string.
    // Reject malformed values before changing either the nickname or visibility.
    if ( array_key_exists( 'auffindbar', $params ) && ! is_bool( $params['auffindbar'] ) ) {
        return eb_social_fehler( 'auffindbarkeit_ungueltig', 400,
            'Auffindbarkeit muss ausdrücklich als wahr oder falsch angegeben werden.' );
    }
    $auffindbar = $params['auffindbar'] ?? null;

    if ( $handle === '' ) {
        // LEER schreiben, nicht loeschen. Der Nachtrag sucht Konten, bei
        // denen der Schluessel FEHLT — ein geloeschter Schluessel sah fuer
        // ihn aus wie „hatte nie einen", und wer sich bewusst zurueckgezogen
        // hatte, bekam beim naechsten Lauf doch einen Namen. Der Kommentar am
        // Nachtrag versprach seit dem 15.09.2026 das Gegenteil.
        update_user_meta( $ich, 'eb_handle', '' );
        update_user_meta( $ich, 'eb_handle_auffindbar', '0' );
        return new WP_REST_Response( array( 'handle' => '', 'auffindbar' => false, 'success' => true ), 200 );
    }

    if ( $handle !== eb_handle_von( $ich ) ) {
        $rl = eventboerse_check_rate_limit( 'social_handle', 10, DAY_IN_SECONDS, 'u' . $ich );
        if ( is_wp_error( $rl ) ) {
            return eb_social_fehler( 'rate_limit', 429,
                'Du hast deinen Nickname heute schon oft geändert. Morgen geht es wieder.' );
        }
    }

    $ok = eb_handle_beanspruchen( $ich, $handle, $auffindbar );
    if ( is_wp_error( $ok ) ) {
        return eb_social_handle_fehler( $ok );
    }
    return new WP_REST_Response( array(
        'handle'     => $handle,
        'auffindbar' => eb_handle_auffindbar( $ich ),
        'success'    => true,
    ), 200 );
}

/**
 * Ist dieser Nickname frei? — für die Registrierung, also OHNE Anmeldung.
 *
 * ── WAS DIESE ROUTE VERRÄT, UND WARUM DAS VERTRETBAR IST ────────────────
 *
 * Sie sagt, ob ein NAME vergeben ist, nie an wen. Das ist jeder Namensraum
 * mit eindeutigen Namen: wer „max.mustermann" registrieren will und
 * „vergeben" liest, weiss, dass jemand so heisst. Er erfährt weder das
 * Konto noch ob es auffindbar ist — dafür gibt es die Suche, und die zeigt
 * Verborgene nicht.
 *
 * Gedeckelt an der Leitung, weil es kein Konto gibt, an das man den Eimer
 * hängen könnte. Hinter einem Proxy weitet `eventboerse_check_rate_limit`
 * den Deckel selbst.
 *
 * „Frei" ist eine Vorschau, kein Versprechen: entschieden wird beim
 * Speichern, unter der Sperre.
 */
function eb_social_handle_frei( WP_REST_Request $request ) {
    $ich = get_current_user_id();
    $h   = ltrim( strtolower( trim( (string) $request->get_param( 'h' ) ) ), '@' );

    $rl = eventboerse_check_rate_limit( 'social_handle_frei', 60, HOUR_IN_SECONDS, $ich ? 'u' . $ich : null );
    if ( is_wp_error( $rl ) ) {
        return eb_social_fehler( 'rate_limit', 429, 'Zu viele Prüfungen. Bitte warte einen Moment.' );
    }

    if ( ! eb_handle_gueltig( $h ) ) {
        return new WP_REST_Response( array( 'status' => 'ungueltig', 'vorschlaege' => array() ), 200 );
    }
    if ( $h !== eb_handle_von( $ich ) && eb_handle_reserviert( $h ) ) {
        return new WP_REST_Response( array(
            'status'      => 'gesperrt',
            'vorschlaege' => array(),
        ), 200 );
    }
    $besitzer = eb_handle_besitzer( $h );
    if ( $besitzer && $besitzer !== (int) $ich ) {
        return new WP_REST_Response( array(
            'status'      => 'vergeben',
            'vorschlaege' => eb_handle_vorschlaege( $h, $ich ),
        ), 200 );
    }
    return new WP_REST_Response( array( 'status' => 'frei', 'vorschlaege' => array() ), 200 );
}

/**
 * Suche — ausschliesslich nach Handle.
 *
 * ── WARUM NICHT NACH NAME ODER E-MAIL ───────────────────────────────────
 *
 * Eine Suche nach E-Mail beantwortet die Frage „gibt es hier ein Konto zu
 * dieser Adresse". Das ist ein Orakel, und bei einem Marktplatz ein
 * wertvolles: es verrät, wer hier Geschäfte macht. Eine Suche nach
 * Anzeigenamen ist dasselbe eine Stufe unschärfer — jeder hat einen, und
 * niemand hat ihm zugestimmt, gefunden zu werden.
 *
 * Gefunden wird nur, wer es will: seit dem 15.10.2026 hat jedes Konto einen
 * Nickname, aber nur wer `eb_handle_auffindbar()` erfüllt, steht in der
 * Trefferliste — auch beim genauen Namen. Bestandskonten, die ihren Handle
 * selbst gesetzt haben, bleiben auffindbar; ein vom Nachtrag vergebener
 * Name ist es nicht. Die Einwilligung ist zurücknehmbar.
 *
 * Gesperrte bleiben unsichtbar — sonst wäre die Sperre umgehbar, indem man
 * einfach wieder sucht.
 */
function eb_social_suche( WP_REST_Request $request ) {
    $ich = get_current_user_id();
    $q   = ltrim( strtolower( trim( (string) $request->get_param( 'q' ) ) ), '@' );

    // Unter drei Zeichen ist keine Suche, sondern ein Abzug der Liste.
    if ( strlen( $q ) < 3 || ! preg_match( '/^[a-z0-9._]{3,24}$/', $q ) ) {
        return new WP_REST_Response( array( 'results' => array() ), 200 );
    }

    $rl = eventboerse_check_rate_limit( 'social_suche', 60, HOUR_IN_SECONDS, 'u' . $ich );
    if ( is_wp_error( $rl ) ) {
        return eb_social_fehler( 'rate_limit', 429, $rl->get_error_message() );
    }

    // Der genaue Treffer zuerst und unabhaengig vom Deckel: bei zehn
    // „anna…"-Konten fiel „anna" sonst genau dann heraus, wenn jemand den
    // vollstaendigen Namen kannte.
    $genau   = eb_handle_besitzer( $q );
    $treffer = get_users( array(
        'meta_key'     => 'eb_handle',
        'meta_value'   => $q,
        'meta_compare' => 'LIKE',
        'number'       => 10,
        'fields'       => 'ID',
    ) );
    $treffer = array_values( array_unique( array_merge(
        $genau ? array( (int) $genau ) : array(),
        array_map( 'intval', (array) $treffer )
    ) ) );
    $treffer = array_slice( $treffer, 0, 10 );

    $raus = array();
    foreach ( (array) $treffer as $uid ) {
        $uid = (int) $uid;
        if ( $uid === (int) $ich ) {
            continue;
        }
        if ( eb_freund_gesperrt( $ich, $uid ) ) {
            continue;   // eine Sperre, die man umsuchen kann, ist keine
        }
        if ( ! eb_handle_auffindbar( $uid ) ) {
            continue;   // ein vergebener Name ist keine Zustimmung, gefunden zu werden
        }
        $karte = eb_person_karte( $uid );
        if ( ! $karte || $karte['handle'] === '' ) {
            continue;
        }
        $stand          = eb_freundschaft( $ich, $uid );
        $karte['state'] = $stand ? (string) $stand['status'] : 'none';
        $karte['mine']  = $stand ? ( (int) $stand['requester_id'] === (int) $ich ) : false;
        $raus[]         = $karte;
    }
    return new WP_REST_Response( array( 'results' => $raus ), 200 );
}

/* ══════════════════════════════════════════════════════════════════════
   FREUNDE
   ══════════════════════════════════════════════════════════════════════ */

function eb_social_freunde( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $tab = $wpdb->prefix . 'eb_friendships';

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE user_low = %d OR user_high = %d ORDER BY updated_at DESC",
        $ich, $ich
    ), ARRAY_A );

    $freunde = array();
    $ein     = array();
    $aus     = array();
    $sperren = array();

    foreach ( (array) $rows as $r ) {
        $anderer = ( (int) $r['user_low'] === (int) $ich ) ? (int) $r['user_high'] : (int) $r['user_low'];
        $karte   = eb_person_karte( $anderer );
        if ( ! $karte ) {
            continue;
        }
        if ( $r['status'] === 'accepted' ) {
            $freunde[] = $karte;
        } elseif ( $r['status'] === 'blocked' ) {
            // Nur der SPERRENDE sieht die Sperre. Der Gesperrte bekommt
            // sie nirgends zu sehen — eine sichtbare Sperre ist eine
            // Nachricht, und genau die wollte der Sperrende nicht senden.
            if ( (int) $r['requester_id'] === (int) $ich ) {
                $sperren[] = $karte;
            }
        } elseif ( $r['status'] === 'pending' ) {
            if ( (int) $r['requester_id'] === (int) $ich ) {
                $aus[] = $karte;
            } else {
                $ein[] = $karte;
            }
        }
    }

    return new WP_REST_Response( array(
        'friends'  => $freunde,
        'incoming' => $ein,
        'outgoing' => $aus,
        'blocked'  => $sperren,
    ), 200 );
}

function eb_social_freund_anfragen( WP_REST_Request $request ) {
    global $wpdb;
    $ich    = get_current_user_id();
    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }

    // Kontogebunden, nicht IP-gebunden: hinter einem Proxy meint
    // REMOTE_ADDR alle gemeinsam, und dann sperrte das Limit Unbeteiligte.
    $rl = eventboerse_check_rate_limit( 'social_anfrage', 30, HOUR_IN_SECONDS, 'u' . $ich );
    if ( is_wp_error( $rl ) ) {
        return eb_social_fehler( 'rate_limit', 429, $rl->get_error_message() );
    }

    $stand = eb_freundschaft( $ich, $du );

    if ( $stand && $stand['status'] === 'blocked' ) {
        // Eine gesperrte Anfrage sieht aus wie eine gesendete. Der
        // Gesperrte darf nicht erfahren, dass er gesperrt ist.
        return new WP_REST_Response( array( 'success' => true, 'state' => 'pending' ), 200 );
    }
    if ( $stand && $stand['status'] === 'accepted' ) {
        return new WP_REST_Response( array( 'success' => true, 'state' => 'accepted' ), 200 );
    }
    if ( $stand && $stand['status'] === 'pending' ) {
        // Die Gegenanfrage ist die Zustimmung: wer angefragt wird und
        // selbst anfragt, hat zugestimmt. Alles andere wäre eine
        // Sackgasse, aus der nur ein Zufall herausführt.
        if ( (int) $stand['requester_id'] !== (int) $ich ) {
            return eb_social_freund_setzen( $ich, $du, 'accepted' );
        }
        return new WP_REST_Response( array( 'success' => true, 'state' => 'pending' ), 200 );
    }

    list( $klein, $gross ) = eb_freund_paar( $ich, $du );
    $wpdb->insert( $wpdb->prefix . 'eb_friendships', array(
        'user_low'     => $klein,
        'user_high'    => $gross,
        'requester_id' => (int) $ich,
        'status'       => 'pending',
        'created_at'   => current_time( 'mysql' ),
        'updated_at'   => current_time( 'mysql' ),
    ), array( '%d', '%d', '%d', '%s', '%s', '%s' ) );

    return new WP_REST_Response( array( 'success' => true, 'state' => 'pending' ), 200 );
}

/** Status einer bestehenden Beziehung setzen. */
function eb_social_freund_setzen( $ich, $du, $status ) {
    global $wpdb;
    list( $klein, $gross ) = eb_freund_paar( $ich, $du );
    $wpdb->update(
        $wpdb->prefix . 'eb_friendships',
        array( 'status' => $status, 'requester_id' => (int) $ich, 'updated_at' => current_time( 'mysql' ) ),
        array( 'user_low' => $klein, 'user_high' => $gross ),
        array( '%s', '%d', '%s' ),
        array( '%d', '%d' )
    );
    return new WP_REST_Response( array( 'success' => true, 'state' => $status ), 200 );
}

/**
 * Eine eingehende Anfrage annehmen oder ablehnen.
 *
 * Nur der ANGEFRAGTE darf das. Ohne diese Prüfung könnte der Anfragende
 * seine eigene Anfrage annehmen — und sich damit selbst in fremde
 * Freundeslisten schreiben.
 */
function eb_social_freund_antwort( WP_REST_Request $request ) {
    global $wpdb;
    $ich    = get_current_user_id();
    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }
    $annehmen = ! empty( $params['annehmen'] );

    $stand = eb_freundschaft( $ich, $du );
    if ( ! $stand || $stand['status'] !== 'pending' ) {
        return eb_social_fehler( 'keine_anfrage', 404, 'Dazu liegt keine Anfrage vor.' );
    }
    if ( (int) $stand['requester_id'] === (int) $ich ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Die eigene Anfrage kann man nicht annehmen.' );
    }

    if ( ! $annehmen ) {
        list( $klein, $gross ) = eb_freund_paar( $ich, $du );
        $wpdb->delete( $wpdb->prefix . 'eb_friendships',
            array( 'user_low' => $klein, 'user_high' => $gross ), array( '%d', '%d' ) );
        return new WP_REST_Response( array( 'success' => true, 'state' => 'none' ), 200 );
    }

    // `requester_id` bleibt beim Anfragenden — wer angefragt hat, ist Teil
    // der Geschichte und nicht wer zuletzt geschrieben hat.
    $wpdb->update(
        $wpdb->prefix . 'eb_friendships',
        array( 'status' => 'accepted', 'updated_at' => current_time( 'mysql' ) ),
        array( 'user_low' => min( (int) $ich, $du ), 'user_high' => max( (int) $ich, $du ) ),
        array( '%s', '%s' ),
        array( '%d', '%d' )
    );
    return new WP_REST_Response( array( 'success' => true, 'state' => 'accepted' ), 200 );
}

function eb_social_freund_entfernen( WP_REST_Request $request ) {
    global $wpdb;
    $ich    = get_current_user_id();
    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }
    $stand = eb_freundschaft( $ich, $du );
    if ( $stand && $stand['status'] === 'blocked' && (int) $stand['requester_id'] !== (int) $ich ) {
        // Der Gesperrte darf die Sperre nicht wegräumen. Sonst wäre sie
        // eine Bitte.
        return new WP_REST_Response( array( 'success' => true, 'state' => 'none' ), 200 );
    }
    list( $klein, $gross ) = eb_freund_paar( $ich, $du );
    $wpdb->delete( $wpdb->prefix . 'eb_friendships',
        array( 'user_low' => $klein, 'user_high' => $gross ), array( '%d', '%d' ) );
    return new WP_REST_Response( array( 'success' => true, 'state' => 'none' ), 200 );
}

function eb_social_freund_sperren( WP_REST_Request $request ) {
    global $wpdb;
    $ich    = get_current_user_id();
    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }
    $sperren = ! isset( $params['sperren'] ) || ! empty( $params['sperren'] );
    $stand   = eb_freundschaft( $ich, $du );

    if ( ! $sperren ) {
        // Entsperren darf nur, wer gesperrt hat.
        if ( ! $stand || $stand['status'] !== 'blocked' || (int) $stand['requester_id'] !== (int) $ich ) {
            return eb_social_fehler( 'nicht_erlaubt', 403, 'Das lässt sich nicht aufheben.' );
        }
        list( $klein, $gross ) = eb_freund_paar( $ich, $du );
        $wpdb->delete( $wpdb->prefix . 'eb_friendships',
            array( 'user_low' => $klein, 'user_high' => $gross ), array( '%d', '%d' ) );
        return new WP_REST_Response( array( 'success' => true, 'state' => 'none' ), 200 );
    }

    // Sperren überschreibt jeden Stand — auch eine bestehende Freundschaft.
    if ( $stand ) {
        return eb_social_freund_setzen( $ich, $du, 'blocked' );
    }
    list( $klein, $gross ) = eb_freund_paar( $ich, $du );
    $wpdb->insert( $wpdb->prefix . 'eb_friendships', array(
        'user_low'     => $klein,
        'user_high'    => $gross,
        'requester_id' => (int) $ich,
        'status'       => 'blocked',
        'created_at'   => current_time( 'mysql' ),
        'updated_at'   => current_time( 'mysql' ),
    ), array( '%d', '%d', '%d', '%s', '%s', '%s' ) );
    return new WP_REST_Response( array( 'success' => true, 'state' => 'blocked' ), 200 );
}

/* ══════════════════════════════════════════════════════════════════════
   GRUPPEN
   ══════════════════════════════════════════════════════════════════════ */

function eb_social_gruppen( WP_REST_Request $request ) {
    global $wpdb;
    $ich   = get_current_user_id();
    $tab_g = $wpdb->prefix . 'eb_groups';
    $tab_m = $wpdb->prefix . 'eb_group_members';

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT g.* FROM {$tab_g} g
         INNER JOIN {$tab_m} m ON m.group_id = g.id
         WHERE m.user_id = %d
         ORDER BY g.updated_at DESC",
        $ich
    ), ARRAY_A );

    $meine        = array();
    $einladungen  = array();
    foreach ( (array) $rows as $r ) {
        $karte = eb_gruppe_karte( $r, $ich );
        if ( $karte['role'] === 'invited' ) {
            $einladungen[] = $karte;
        } else {
            $meine[] = $karte;
        }
    }
    return new WP_REST_Response( array( 'groups' => $meine, 'invitations' => $einladungen ), 200 );
}

function eb_social_gruppe_lesen( WP_REST_Request $request ) {
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    // Ein Nein sagt nicht, warum: „nicht gefunden" gilt auch für eine
    // Gruppe, die es gibt und die den Fragenden nichts angeht.
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( $row, $ich ) ), 200 );
}

/** Name und Anlass säubern — fremder Text wird nie zu Markup. */
function eb_social_gruppenfeld( $roh, $max ) {
    $s = wp_strip_all_tags( (string) $roh );
    $s = preg_replace( '/[\x00-\x1F\x7F]/u', ' ', $s );
    $s = trim( preg_replace( '/\s+/u', ' ', $s ) );
    return function_exists( 'mb_substr' ) ? mb_substr( $s, 0, $max ) : substr( $s, 0, $max );
}

/** Ein Datum oder null — ein unlesbares Datum wird nicht geraten. */
function eb_social_datum( $roh ) {
    $s = trim( (string) $roh );
    if ( $s === '' || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $s ) ) {
        return null;
    }
    list( $j, $m, $t ) = array_map( 'intval', explode( '-', $s ) );
    return checkdate( $m, $t, $j ) ? $s : null;
}

function eb_social_gruppe_anlegen( WP_REST_Request $request ) {
    global $wpdb;
    $ich    = get_current_user_id();
    $params = (array) $request->get_json_params();

    $name = eb_social_gruppenfeld( $params['name'] ?? '', 120 );
    if ( $name === '' ) {
        return eb_social_fehler( 'name_fehlt', 400, 'Die Gruppe braucht einen Namen.' );
    }

    $tab_m  = $wpdb->prefix . 'eb_group_members';
    $anzahl = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$tab_m} WHERE user_id = %d AND role != 'invited'", $ich
    ) );
    if ( $anzahl >= EB_MAX_GRUPPEN ) {
        return eb_social_fehler( 'zu_viele', 409,
            sprintf( 'Mehr als %d Gruppen gehen nicht.', EB_MAX_GRUPPEN ) );
    }

    $rl = eventboerse_check_rate_limit( 'social_gruppe', 20, HOUR_IN_SECONDS, 'u' . $ich );
    if ( is_wp_error( $rl ) ) {
        return eb_social_fehler( 'rate_limit', 429, $rl->get_error_message() );
    }

    $jetzt = current_time( 'mysql' );
    $wpdb->insert( $wpdb->prefix . 'eb_groups', array(
        'owner_id'       => (int) $ich,
        'name'           => $name,
        'event_type'     => eb_social_gruppenfeld( $params['eventType'] ?? '', 60 ),
        'event_date'     => eb_social_datum( $params['eventDate'] ?? '' ),
        'invite_code'    => eb_einladungscode(),
        'invite_expires' => gmdate( 'Y-m-d H:i:s', time() + EB_EINLADUNG_GUELTIG ),
        'created_at'     => $jetzt,
        'updated_at'     => $jetzt,
    ), array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ) );

    $gid = (int) $wpdb->insert_id;
    if ( ! $gid ) {
        return eb_social_fehler( 'nicht_angelegt', 500, 'Die Gruppe konnte nicht angelegt werden.' );
    }
    $wpdb->insert( $tab_m, array(
        'group_id'  => $gid,
        'user_id'   => (int) $ich,
        'role'      => 'owner',
        'joined_at' => $jetzt,
    ), array( '%d', '%d', '%s', '%s' ) );

    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( eb_gruppe_laden( $gid ), $ich ) ), 201 );
}

function eb_social_gruppe_aendern( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    if ( ! eb_gruppe_darf_verwalten( $gid, $ich ) ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Das darf nur die Gruppenleitung.' );
    }

    $params = (array) $request->get_json_params();
    $felder = array( 'updated_at' => current_time( 'mysql' ) );
    $format = array( '%s' );

    if ( isset( $params['name'] ) ) {
        $name = eb_social_gruppenfeld( $params['name'], 120 );
        if ( $name === '' ) {
            return eb_social_fehler( 'name_fehlt', 400, 'Die Gruppe braucht einen Namen.' );
        }
        $felder['name'] = $name;
        $format[]       = '%s';
    }
    if ( isset( $params['eventType'] ) ) {
        $felder['event_type'] = eb_social_gruppenfeld( $params['eventType'], 60 );
        $format[]             = '%s';
    }
    if ( isset( $params['eventDate'] ) ) {
        $felder['event_date'] = eb_social_datum( $params['eventDate'] );
        $format[]             = '%s';
    }

    $wpdb->update( $wpdb->prefix . 'eb_groups', $felder, array( 'id' => $gid ), $format, array( '%d' ) );
    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( eb_gruppe_laden( $gid ), $ich ) ), 200 );
}

/**
 * Einladen — nur Freunde.
 *
 * Ohne diese Grenze wäre eine Gruppe der Weg um die Freundschaftsanfrage
 * herum: Fremde einladen, bis einer aus Versehen zustimmt. Eine Einladung
 * ist eine Nachricht, und Nachrichten an Fremde brauchen einen Grund.
 */
function eb_social_gruppe_einladen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    if ( ! eb_gruppe_darf_verwalten( $gid, $ich ) ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Das darf nur die Gruppenleitung.' );
    }

    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }
    if ( ! eb_sind_freunde( $ich, $du ) ) {
        return eb_social_fehler( 'nicht_befreundet', 403,
            'Einladen kannst du nur Leute, mit denen du befreundet bist.' );
    }
    if ( eb_gruppe_rolle( $gid, $du ) !== '' ) {
        return new WP_REST_Response( array( 'success' => true ), 200 );
    }

    $tab_m  = $wpdb->prefix . 'eb_group_members';
    $anzahl = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$tab_m} WHERE group_id = %d", $gid
    ) );
    if ( $anzahl >= EB_MAX_GRUPPE_MITGLIEDER ) {
        return eb_social_fehler( 'gruppe_voll', 409,
            sprintf( 'Mehr als %d Personen gehen nicht.', EB_MAX_GRUPPE_MITGLIEDER ) );
    }

    $wpdb->insert( $tab_m, array(
        'group_id'  => $gid,
        'user_id'   => $du,
        'role'      => 'invited',
        'joined_at' => current_time( 'mysql' ),
    ), array( '%d', '%d', '%s', '%s' ) );

    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/** Eine Einladung annehmen — nur der Eingeladene selbst. */
function eb_social_gruppe_annehmen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    if ( eb_gruppe_rolle( $gid, $ich ) !== 'invited' ) {
        return eb_social_fehler( 'keine_einladung', 404, 'Dazu liegt keine Einladung vor.' );
    }
    $wpdb->update(
        $wpdb->prefix . 'eb_group_members',
        array( 'role' => 'member', 'joined_at' => current_time( 'mysql' ) ),
        array( 'group_id' => $gid, 'user_id' => (int) $ich ),
        array( '%s', '%s' ),
        array( '%d', '%d' )
    );
    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( eb_gruppe_laden( $gid ), $ich ) ), 200 );
}

/**
 * Über den Code beitreten.
 *
 * Der Code IST die Zustimmung: wer ihn eintippt, hat sich selbst
 * entschieden. Deshalb wird hier direkt Mitglied und nicht „eingeladen".
 *
 * Ein abgelaufener Code ist derselbe Fall wie ein falscher — beide sagen
 * „passt nicht". Zu unterscheiden hiesse zu verraten, dass es diese
 * Gruppe gibt.
 */
function eb_social_gruppe_beitreten( WP_REST_Request $request ) {
    global $wpdb;
    $ich    = get_current_user_id();
    $params = (array) $request->get_json_params();
    $code   = strtolower( trim( (string) ( $params['code'] ?? '' ) ) );

    $rl = eventboerse_check_rate_limit( 'social_beitritt', 20, HOUR_IN_SECONDS, 'u' . $ich );
    if ( is_wp_error( $rl ) ) {
        return eb_social_fehler( 'rate_limit', 429, $rl->get_error_message() );
    }
    if ( ! preg_match( '/^[a-f0-9]{18}$/', $code ) ) {
        return eb_social_fehler( 'code_ungueltig', 404, 'Dieser Code passt nicht.' );
    }

    $tab_g = $wpdb->prefix . 'eb_groups';
    $row   = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$tab_g} WHERE invite_code = %s", $code
    ), ARRAY_A );
    if ( ! $row || strtotime( (string) $row['invite_expires'] ) < time() ) {
        return eb_social_fehler( 'code_ungueltig', 404, 'Dieser Code passt nicht.' );
    }

    $gid = (int) $row['id'];
    if ( eb_gruppe_ist_mitglied( $gid, $ich ) ) {
        return new WP_REST_Response( array( 'group' => eb_gruppe_karte( $row, $ich ) ), 200 );
    }

    $tab_m  = $wpdb->prefix . 'eb_group_members';
    $anzahl = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$tab_m} WHERE group_id = %d", $gid
    ) );
    if ( $anzahl >= EB_MAX_GRUPPE_MITGLIEDER ) {
        return eb_social_fehler( 'gruppe_voll', 409, 'Diese Gruppe ist voll.' );
    }

    if ( eb_gruppe_rolle( $gid, $ich ) === 'invited' ) {
        $wpdb->update( $tab_m,
            array( 'role' => 'member', 'joined_at' => current_time( 'mysql' ) ),
            array( 'group_id' => $gid, 'user_id' => (int) $ich ),
            array( '%s', '%s' ), array( '%d', '%d' ) );
    } else {
        $wpdb->insert( $tab_m, array(
            'group_id'  => $gid,
            'user_id'   => (int) $ich,
            'role'      => 'member',
            'joined_at' => current_time( 'mysql' ),
        ), array( '%d', '%d', '%s', '%s' ) );
    }
    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( eb_gruppe_laden( $gid ), $ich ) ), 200 );
}

/** Einen neuen Code ziehen — der alte gilt damit nicht mehr. */
function eb_social_gruppe_code_neu( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    if ( ! eb_gruppe_darf_verwalten( $gid, $ich ) ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Das darf nur die Gruppenleitung.' );
    }
    $wpdb->update( $wpdb->prefix . 'eb_groups', array(
        'invite_code'    => eb_einladungscode(),
        'invite_expires' => gmdate( 'Y-m-d H:i:s', time() + EB_EINLADUNG_GUELTIG ),
        'updated_at'     => current_time( 'mysql' ),
    ), array( 'id' => $gid ), array( '%s', '%s', '%s' ), array( '%d' ) );
    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( eb_gruppe_laden( $gid ), $ich ) ), 200 );
}

/**
 * Verlassen — und was mit einer verwaisten Gruppe geschieht.
 *
 * Geht die Leitung, bleibt die Gruppe nicht führerlos zurück: sie geht an
 * das dienstälteste verbliebene Mitglied über (Verwaltung zuerst). Eine
 * Gruppe ohne Leitung liesse sich nie wieder verwalten und stünde für
 * immer in den Listen aller Beteiligten.
 *
 * Ist niemand mehr da, wird sie gelöscht — samt Mitgliederzeilen.
 */
function eb_social_gruppe_verlassen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }

    $tab_m = $wpdb->prefix . 'eb_group_members';
    $wpdb->delete( $tab_m, array( 'group_id' => $gid, 'user_id' => (int) $ich ), array( '%d', '%d' ) );

    $rest = $wpdb->get_results( $wpdb->prepare(
        "SELECT user_id, role FROM {$tab_m} WHERE group_id = %d AND role != 'invited' ORDER BY joined_at ASC",
        $gid
    ), ARRAY_A );

    if ( ! $rest ) {
        // ── AUCH DER PLAN GEHT MIT ─────────────────────────────────────
        //
        // Ohne diese Zeile blieben die Posten als verwaiste Reihen stehen:
        // Bezeichnungen, freie Notizen und die Angabe, wer sich um was
        // kümmern wollte — persoenliche Daten, deren Zusammenhang geloescht
        // ist und die niemand mehr erreichen kann. Sie fielen nie auf,
        // weil ohne Gruppe niemand mehr danach fragt, und die
        // Datenschutzerklaerung sagte etwas anderes zu.
        //
        // Zuerst der Plan, dann die Mitglieder, dann die Gruppe: bricht
        // etwas dazwischen ab, bleibt die Gruppe bestehen und mit ihr der
        // Weg zu dem, was noch da ist.
        $wpdb->delete( $wpdb->prefix . 'eb_group_plan_items', array( 'group_id' => $gid ), array( '%d' ) );
        $wpdb->delete( $tab_m, array( 'group_id' => $gid ), array( '%d' ) );
        $wpdb->delete( $wpdb->prefix . 'eb_groups', array( 'id' => $gid ), array( '%d' ) );
        return new WP_REST_Response( array( 'success' => true, 'deleted' => true ), 200 );
    }

    if ( (int) $row['owner_id'] === (int) $ich ) {
        $nachfolger = $rest[0];
        foreach ( $rest as $m ) {
            if ( $m['role'] === 'admin' ) { $nachfolger = $m; break; }
        }
        $wpdb->update( $wpdb->prefix . 'eb_groups',
            array( 'owner_id' => (int) $nachfolger['user_id'], 'updated_at' => current_time( 'mysql' ) ),
            array( 'id' => $gid ), array( '%d', '%s' ), array( '%d' ) );
        $wpdb->update( $tab_m, array( 'role' => 'owner' ),
            array( 'group_id' => $gid, 'user_id' => (int) $nachfolger['user_id'] ),
            array( '%s' ), array( '%d', '%d' ) );
    }
    return new WP_REST_Response( array( 'success' => true, 'deleted' => false ), 200 );
}

/**
 * Eine Rolle vergeben — nur der Eigentümer, nur `admin` oder `member`.
 *
 * Ohne diesen Weg gäbe es die Rolle `admin` im Modell und keinen Weg
 * dorthin: eine Berechtigung, die niemand bekommen kann, ist keine, und
 * eine Gruppe mit zwanzig Leuten hängt sonst an einer einzigen Person.
 *
 * `owner` ist ausdrücklich nicht vergebbar. Die Eigentümerschaft wechselt
 * nur durch Verlassen — sonst gäbe es einen Weg, sich selbst zum
 * Eigentümer zu machen, und dieser Weg müsste dann seinerseits bewacht
 * werden. `invited` ebenso wenig: das ist ein Zustand, keine Rolle, und
 * ihn zu setzen hiesse, eine Zustimmung zurückzunehmen.
 */
function eb_social_gruppe_rolle_setzen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    if ( (int) $row['owner_id'] !== (int) $ich ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Das darf nur der Eigentümer der Gruppe.' );
    }
    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }
    $rolle = (string) ( $params['role'] ?? '' );
    if ( $rolle !== 'admin' && $rolle !== 'member' ) {
        return eb_social_fehler( 'rolle_ungueltig', 400, 'Möglich sind nur „admin" und „member".' );
    }
    $ist = eb_gruppe_rolle( $gid, $du );
    if ( $ist !== 'admin' && $ist !== 'member' ) {
        return eb_social_fehler( 'kein_mitglied', 404, 'Diese Person ist nicht in der Gruppe.' );
    }
    $wpdb->update( $wpdb->prefix . 'eb_group_members', array( 'role' => $rolle ),
        array( 'group_id' => $gid, 'user_id' => $du ), array( '%s' ), array( '%d', '%d' ) );
    return new WP_REST_Response( array( 'group' => eb_gruppe_karte( eb_gruppe_laden( $gid ), $ich ) ), 200 );
}

/** Jemanden entfernen — die Leitung darf das, aber nie sich selbst hier. */
function eb_social_gruppe_entfernen( WP_REST_Request $request ) {
    global $wpdb;
    $ich = get_current_user_id();
    $gid = absint( $request['id'] );
    $row = eb_gruppe_laden( $gid );
    if ( ! $row || ! eb_gruppe_darf_sehen( $gid, $ich ) ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Gruppe gibt es nicht.' );
    }
    if ( ! eb_gruppe_darf_verwalten( $gid, $ich ) ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Das darf nur die Gruppenleitung.' );
    }
    $params = (array) $request->get_json_params();
    $du     = eb_social_gegenueber( $params, $ich );
    if ( ! $du ) {
        return eb_social_fehler( 'unbekannt', 404, 'Diese Person gibt es nicht.' );
    }
    // Die Leitung ist nicht entfernbar — sonst könnte ein Admin den
    // Eigentümer aus seiner eigenen Gruppe werfen.
    if ( (int) $row['owner_id'] === $du ) {
        return eb_social_fehler( 'nicht_erlaubt', 403, 'Die Gruppenleitung lässt sich nicht entfernen.' );
    }
    $wpdb->delete( $wpdb->prefix . 'eb_group_members',
        array( 'group_id' => $gid, 'user_id' => $du ), array( '%d', '%d' ) );
    return new WP_REST_Response( array( 'success' => true ), 200 );
}

/* ══════════════════════════════════════════════════════════════════════
   REGISTRIERUNG
   ══════════════════════════════════════════════════════════════════════ */

function eb_social_routen_registrieren() {
    $ns  = 'eventboerse/v1';
    $auf = 'is_user_logged_in';

    register_rest_route( $ns, '/social/ich', array(
        'methods'             => 'GET',
        'callback'            => 'eb_social_ich',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/handle', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_handle_setzen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/handle/frei', array(
        'methods'             => 'GET',
        'callback'            => 'eb_social_handle_frei',
        // Offen, weil die Registrierung vor der Anmeldung prueft. Die Route
        // schreibt nichts und nennt nie einen Besitzer.
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( $ns, '/social/suche', array(
        'methods'             => 'GET',
        'callback'            => 'eb_social_suche',
        'permission_callback' => $auf,
    ) );

    register_rest_route( $ns, '/social/freunde', array(
        'methods'             => 'GET',
        'callback'            => 'eb_social_freunde',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/freunde/anfragen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_freund_anfragen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/freunde/antwort', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_freund_antwort',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/freunde/entfernen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_freund_entfernen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/freunde/sperren', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_freund_sperren',
        'permission_callback' => $auf,
    ) );

    register_rest_route( $ns, '/social/gruppen', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_social_gruppen',
            'permission_callback' => $auf,
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_social_gruppe_anlegen',
            'permission_callback' => $auf,
        ),
    ) );
    register_rest_route( $ns, '/social/gruppen/beitreten', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_beitreten',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_social_gruppe_lesen',
            'permission_callback' => $auf,
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_social_gruppe_aendern',
            'permission_callback' => $auf,
        ),
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/einladen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_einladen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/annehmen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_annehmen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/code', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_code_neu',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/verlassen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_verlassen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/rolle', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_rolle_setzen',
        'permission_callback' => $auf,
    ) );
    register_rest_route( $ns, '/social/gruppen/(?P<id>\d+)/entfernen', array(
        'methods'             => 'POST',
        'callback'            => 'eb_social_gruppe_entfernen',
        'permission_callback' => $auf,
    ) );
}
add_action( 'rest_api_init', 'eb_social_routen_registrieren' );
