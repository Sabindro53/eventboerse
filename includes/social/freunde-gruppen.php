<?php
/**
 * Freunde und Gruppen — gemeinsame Vorhaben.
 *
 * „Seine Freunde suchen und Gruppen für Events zusammenstellen können für
 * ein gemeinsames Vorhaben." Bis zum 09.09.2026 gab es davon nichts: was
 * danach aussah, war es nicht. `'musikgruppe'` ist eine Kategorie,
 * `_feedRadarGruppen` ist Karten-Clustering, und `/collaborations`
 * (`eb_collaborations_v1` im user_meta) ist eine Referenzliste
 * Dienstleister→Dienstleister, keine gemeinsame Planung.
 *
 * ── WARUM EIGENE TABELLEN UND NICHT DAS BOARD ───────────────────────────
 *
 * `eb_board_projects` ist EIN JSON-Blob je Nutzer, den der Besitzer als
 * Ganzes zurückschreibt (`update_user_meta`). Zwei Personen am selben
 * Projekt überschreiben sich gegenseitig — der letzte Schreibvorgang
 * gewinnt, die Arbeit des anderen ist weg, und niemand bekommt eine
 * Meldung. Ein „geteiltes" Projekt in diesem Speicher wäre keine
 * Zusammenarbeit, sondern ein Datenverlust mit Einladung.
 *
 * Deshalb: eigene Tabellen, mit Fremdschlüsseln statt Kopien.
 *
 * ── DIE VIER SICHERHEITSENTSCHEIDUNGEN ──────────────────────────────────
 *
 * 1. KEINE NUTZER-AUFZÄHLUNG. Gesucht wird ausschliesslich nach einem
 *    selbstgewählten Handle, und nur wer eins gesetzt hat, ist auffindbar.
 *    Das Setzen IST die Einwilligung. Eine Suche nach E-Mail wäre ein
 *    Orakel: „gibt es hier ein Konto zu dieser Adresse" ist genau die
 *    Frage, die ein Angreifer stellt, und die Antwort ist bei einem
 *    Marktplatz besonders wertvoll.
 * 2. NIE OHNE ZUSTIMMUNG. Eine Freundschaft entsteht durch Annehmen,
 *    nie durch Anfragen. Eine Gruppenmitgliedschaft ebenso.
 * 3. SPERREN GEHT VOR. Wer blockiert ist, kann nicht erneut anfragen —
 *    und erfährt es nicht, sonst wäre die Sperre ein Signal.
 * 4. GEDECKELT. Anfragen sind ein Spam-Weg. Sie hängen an einem
 *    KONTOGEBUNDENEN Eimer, nicht an der IP: hinter einem Proxy meint
 *    `REMOTE_ADDR` alle gemeinsam, und dann wäre das Limit entweder
 *    wirkungslos oder es sperrte Unbeteiligte.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Der gemeinsame Plan bringt eine vierte Tabelle mit, und
// `eb_social_tabellen_sql()` unten sammelt sie ein. Geladen wird sie
// deshalb HIER und nicht erst in functions.php: wer diese Datei allein
// einbindet — der Migrations-Prüfstand tut genau das —, bekäme sonst eine
// Tabelle zu wenig, ohne dass es irgendwo auffiele.
require_once __DIR__ . '/plan.php';

/** Höchstzahl Gruppen je Nutzer — ein Deckel, kein Geschäftsmodell. */
if ( ! defined( 'EB_MAX_GRUPPEN' ) ) {
    define( 'EB_MAX_GRUPPEN', 50 );
}

/** Höchstzahl Mitglieder je Gruppe. */
if ( ! defined( 'EB_MAX_GRUPPE_MITGLIEDER' ) ) {
    define( 'EB_MAX_GRUPPE_MITGLIEDER', 60 );
}

/** Wie lange ein Einladungscode gilt. */
if ( ! defined( 'EB_EINLADUNG_GUELTIG' ) ) {
    define( 'EB_EINLADUNG_GUELTIG', 14 * DAY_IN_SECONDS );
}

/* ══════════════════════════════════════════════════════════════════════
   HANDLE — die Einwilligung, gefunden zu werden
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Ist das ein brauchbarer Handle?
 *
 * Bewusst eng: Kleinbuchstaben, Ziffern, Punkt, Unterstrich, 3–24 Zeichen.
 * Kein Grossbuchstabe, damit „Anna" und „anna" nicht zwei Konten sind, die
 * man verwechseln kann — Namensverwechslung ist bei einer Freundesliste
 * kein Schönheitsfehler, sondern der Weg, an fremde Planung zu kommen.
 */
function eb_handle_gueltig( $handle ) {
    return (bool) preg_match( '/^[a-z0-9._]{3,24}$/', (string) $handle );
}

/** Handles, die niemand bekommen darf — sie sähen nach uns aus. */
function eb_handle_gesperrt() {
    return array(
        'admin', 'administrator', 'eventboerse', 'eventboerse_de', 'support',
        'hilfe', 'team', 'moderator', 'system', 'root', 'kontakt', 'info',
        'sicherheit', 'security', 'billing', 'zahlung', 'noreply',
    );
}

/** Den Handle eines Nutzers lesen (leer = nicht auffindbar). */
function eb_handle_von( $user_id ) {
    $h = get_user_meta( absint( $user_id ), 'eb_handle', true );
    return is_string( $h ) ? $h : '';
}

/** Wem gehört dieser Handle? 0 = niemandem. */
function eb_handle_besitzer( $handle ) {
    $handle = strtolower( trim( (string) $handle ) );
    if ( ! eb_handle_gueltig( $handle ) ) {
        return 0;
    }
    $treffer = get_users( array(
        'meta_key'   => 'eb_handle',
        'meta_value' => $handle,
        'number'     => 1,
        'fields'     => 'ID',
    ) );
    return $treffer ? (int) $treffer[0] : 0;
}

/**
 * Die öffentliche Karte eines Nutzers.
 *
 * Was hier NICHT drinsteht, ist die Entscheidung: keine E-Mail, kein
 * Klarname über den Anzeigenamen hinaus, keine Rolle, kein Ort. Eine
 * Freundessuche darf nicht mehr preisgeben als eine Visitenkarte.
 */
function eb_person_karte( $user_id ) {
    $user = get_userdata( absint( $user_id ) );
    if ( ! $user ) {
        return null;
    }
    $name = $user->display_name ?: 'Nutzer';
    return array(
        'id'       => (int) $user->ID,
        'handle'   => eb_handle_von( $user->ID ),
        'name'     => $name,
        'photoUrl' => get_user_meta( $user->ID, 'eb_photo_url', true )
            ?: eb_avatar_url( $name, $name ),
    );
}

/* ══════════════════════════════════════════════════════════════════════
   FREUNDSCHAFTEN
   ══════════════════════════════════════════════════════════════════════ */

/** Das Paar immer in derselben Reihenfolge — sonst steht es zweimal da. */
function eb_freund_paar( $a, $b ) {
    $a = absint( $a );
    $b = absint( $b );
    return $a < $b ? array( $a, $b ) : array( $b, $a );
}

/**
 * Der Stand zwischen zwei Nutzern.
 *
 * Gibt die Zeile zurück oder null. `status` ist 'pending', 'accepted'
 * oder 'blocked'; `requester_id` sagt, wer angefragt bzw. blockiert hat.
 */
function eb_freundschaft( $a, $b ) {
    global $wpdb;
    list( $klein, $gross ) = eb_freund_paar( $a, $b );
    if ( ! $klein || ! $gross || $klein === $gross ) {
        return null;
    }
    $tab = $wpdb->prefix . 'eb_friendships';
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE user_low = %d AND user_high = %d",
        $klein, $gross
    ), ARRAY_A );
    return $row ?: null;
}

/** Sind die beiden befreundet? */
function eb_sind_freunde( $a, $b ) {
    $f = eb_freundschaft( $a, $b );
    return $f && $f['status'] === 'accepted';
}

/**
 * Ist der Weg von $von zu $zu gesperrt?
 *
 * Eine Sperre wirkt in BEIDE Richtungen. Wer jemanden blockiert, will
 * nicht, dass der ihn über eine Anfrage in umgekehrter Richtung wieder
 * erreicht — sonst wäre die Sperre eine Unbequemlichkeit statt einer Grenze.
 */
function eb_freund_gesperrt( $von, $zu ) {
    $f = eb_freundschaft( $von, $zu );
    return $f && $f['status'] === 'blocked';
}

/** Alle Kennungen der Freunde eines Nutzers. */
function eb_freunde_ids( $user_id ) {
    global $wpdb;
    $user_id = absint( $user_id );
    $tab     = $wpdb->prefix . 'eb_friendships';
    $rows    = $wpdb->get_results( $wpdb->prepare(
        "SELECT user_low, user_high FROM {$tab}
         WHERE status = 'accepted' AND ( user_low = %d OR user_high = %d )",
        $user_id, $user_id
    ), ARRAY_A );
    $raus = array();
    foreach ( (array) $rows as $r ) {
        $raus[] = ( (int) $r['user_low'] === $user_id ) ? (int) $r['user_high'] : (int) $r['user_low'];
    }
    return $raus;
}

/* ══════════════════════════════════════════════════════════════════════
   GRUPPEN
   ══════════════════════════════════════════════════════════════════════ */

/** Die Rolle eines Nutzers in einer Gruppe, oder '' wenn er nicht drin ist. */
function eb_gruppe_rolle( $group_id, $user_id ) {
    global $wpdb;
    $tab = $wpdb->prefix . 'eb_group_members';
    $r   = $wpdb->get_var( $wpdb->prepare(
        "SELECT role FROM {$tab} WHERE group_id = %d AND user_id = %d",
        absint( $group_id ), absint( $user_id )
    ) );
    return $r ? (string) $r : '';
}

/**
 * Vier Rollen, drei Stufen Einblick.
 *
 * `invited` ist die heikle: jemand ist eingeladen, hat aber noch nicht
 * zugestimmt. Er muss genug sehen, um zu entscheiden — Name, Anlass, wer
 * einlädt —, und ausdrücklich NICHT die Mitgliederliste. Sonst wäre eine
 * Einladung ein Weg, die Freundesliste eines Fremden auszulesen: einladen,
 * Liste abholen, wieder ausladen, und niemand hat je zugestimmt.
 */
function eb_gruppe_darf_sehen( $group_id, $user_id ) {
    return eb_gruppe_rolle( $group_id, $user_id ) !== '';
}

/** Ist der Nutzer wirklich dabei — oder erst gefragt? */
function eb_gruppe_ist_mitglied( $group_id, $user_id ) {
    $rolle = eb_gruppe_rolle( $group_id, $user_id );
    return $rolle === 'owner' || $rolle === 'admin' || $rolle === 'member';
}

/** Darf dieser Nutzer die Gruppe verwalten (einladen, umbenennen, entfernen)? */
function eb_gruppe_darf_verwalten( $group_id, $user_id ) {
    $rolle = eb_gruppe_rolle( $group_id, $user_id );
    return $rolle === 'owner' || $rolle === 'admin';
}

/** Eine Gruppe laden — ohne jede Rechteprüfung, die machen die Aufrufer. */
function eb_gruppe_laden( $group_id ) {
    global $wpdb;
    $tab = $wpdb->prefix . 'eb_groups';
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE id = %d", absint( $group_id )
    ), ARRAY_A );
    return $row ?: null;
}

/**
 * Ein neuer Einladungscode.
 *
 * Aus `random_bytes()`, nicht aus `wp_create_nonce()` — letzteres ist aus
 * Nutzer, Aktion und Tageszeit ABGELEITET und damit vorhersagbar, sobald
 * man die Eingänge kennt. Dieselbe Begründung wie beim CSP-Nonce.
 */
function eb_einladungscode() {
    return strtolower( bin2hex( random_bytes( 9 ) ) );   // 18 Zeichen
}

/** Die Gruppe als Antwort — mit Mitgliedern, aber ohne den Einladungscode. */
function eb_gruppe_karte( $row, $betrachter_id ) {
    global $wpdb;
    $tab_m = $wpdb->prefix . 'eb_group_members';
    $gid   = (int) $row['id'];

    $mitglieder = $wpdb->get_results( $wpdb->prepare(
        "SELECT user_id, role, joined_at FROM {$tab_m} WHERE group_id = %d ORDER BY joined_at ASC",
        $gid
    ), ARRAY_A );

    $rolle          = eb_gruppe_rolle( $gid, $betrachter_id );
    $darf_verwalten = eb_gruppe_darf_verwalten( $gid, $betrachter_id );
    $ist_dabei      = eb_gruppe_ist_mitglied( $gid, $betrachter_id );

    $liste  = array();
    $anzahl = 0;
    foreach ( (array) $mitglieder as $m ) {
        if ( $m['role'] !== 'invited' ) {
            $anzahl++;
        }
        if ( ! $ist_dabei ) {
            continue;   // Eingeladene bekommen die Liste NICHT (siehe oben)
        }
        $karte_m = eb_person_karte( $m['user_id'] );
        if ( ! $karte_m ) {
            continue;   // geloeschtes Konto — kein Geist in der Liste
        }
        $karte_m['role'] = (string) $m['role'];
        $liste[]         = $karte_m;
    }

    $karte = array(
        'id'          => $gid,
        'name'        => (string) $row['name'],
        'eventType'   => (string) $row['event_type'],
        'eventDate'   => $row['event_date'] ? (string) $row['event_date'] : null,
        'ownerId'     => (int) $row['owner_id'],
        'owner'       => eb_person_karte( $row['owner_id'] ),
        'role'        => $rolle,
        'memberCount' => $anzahl,
        'members'     => $liste,
        'createdAt'   => (string) $row['created_at'],
    );

    // DER CODE IST EIN SCHLÜSSEL, KEINE EIGENSCHAFT. Wer ihn hat, kommt
    // in die Gruppe — er geht deshalb nur an die, die einladen dürfen.
    if ( $darf_verwalten ) {
        $karte['inviteCode']    = (string) $row['invite_code'];
        $karte['inviteExpires'] = (string) $row['invite_expires'];
    }
    return $karte;
}

/* ══════════════════════════════════════════════════════════════════════
   SCHEMA
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Die drei Tabellen.
 *
 * `user_low`/`user_high` statt `requester`/`addressee` als Schlüssel: eine
 * Freundschaft ist symmetrisch, und mit zwei Spalten in beliebiger
 * Reihenfolge stünde dasselbe Paar zweimal da — mit womöglich
 * widersprüchlichem Status. Wer angefragt hat, steht in `requester_id`.
 */
function eb_social_tabellen_sql() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $friendships = "CREATE TABLE {$wpdb->prefix}eb_friendships (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_low bigint(20) unsigned NOT NULL,
        user_high bigint(20) unsigned NOT NULL,
        requester_id bigint(20) unsigned NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY idx_paar (user_low, user_high),
        KEY idx_low (user_low, status),
        KEY idx_high (user_high, status)
    ) $charset;";

    $groups = "CREATE TABLE {$wpdb->prefix}eb_groups (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        owner_id bigint(20) unsigned NOT NULL,
        name varchar(120) NOT NULL DEFAULT '',
        event_type varchar(60) NOT NULL DEFAULT '',
        event_date date DEFAULT NULL,
        invite_code varchar(40) NOT NULL DEFAULT '',
        invite_expires datetime DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY idx_code (invite_code),
        KEY idx_owner (owner_id)
    ) $charset;";

    $members = "CREATE TABLE {$wpdb->prefix}eb_group_members (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        group_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        role varchar(20) NOT NULL DEFAULT 'member',
        joined_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY idx_mitglied (group_id, user_id),
        KEY idx_user (user_id)
    ) $charset;";

    // ── DIE LISTE WIRD EINGESAMMELT, NICHT AUFGEZÄHLT ──────────────────
    //
    // Diese Funktion ist die eine Stelle, aus der `eb_create_tables()` und
    // die Erfolgsprüfung der Migration ihre Tabellen ableiten. Wer eine
    // Social-Tabelle woanders definiert und hier nicht anhängt, bekäme sie
    // weder angelegt noch nachgewiesen — und `eb_db_version` spränge
    // trotzdem hoch. Genau der Fehler, der am 10.09.2026 behoben wurde,
    // nur eine Ebene höher.
    //
    // `social.spec.js` hält deshalb fest, dass JEDES `CREATE TABLE` unter
    // `includes/social/` hier ankommt.
    //
    // Kein `function_exists`-Vorbehalt: der wäre wieder eine still
    // verschwindende Tabelle — wer diese Datei allein einbindet (der
    // Migrations-Prüfstand tut genau das), bekäme drei statt vier und
    // merkte es nirgends. Die Datei lädt ihre Ergänzung deshalb selbst,
    // ganz oben.
    return array_merge( array( $friendships, $groups, $members ), eb_plan_tabellen_sql() );
}
