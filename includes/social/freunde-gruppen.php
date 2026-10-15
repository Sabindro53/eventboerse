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

/**
 * Darf dieser Handle NEU vergeben werden?
 *
 * Die Liste oben trifft nur den genauen Namen — „eventboerse.support" oder
 * „admin_team" kamen durch und sähen in einer Trefferliste aus wie wir.
 * Ein Nickname ist nie ein Verifizierungszeichen; er darf also auch nicht
 * so aussehen.
 *
 * Gilt nur beim Beanspruchen, nicht rückwirkend: ein Bestandskonto, das
 * schon so heisst, verliert seinen Namen dadurch nicht.
 */
function eb_handle_reserviert( $handle ) {
    $handle = (string) $handle;
    if ( in_array( $handle, eb_handle_gesperrt(), true ) ) {
        return true;
    }
    return (bool) preg_match( '/^(eventb(oe|o)rse|admin|administrator|support|moderator)([._0-9]|$)/', $handle );
}

/** Den Handle eines Nutzers lesen (leer = kein Nickname; auffindbar: eb_handle_auffindbar). */
function eb_handle_von( $user_id ) {
    $h = get_user_meta( absint( $user_id ), 'eb_handle', true );
    return is_string( $h ) ? $h : '';
}

/**
 * Einen Nickname aus einem Namen bauen.
 *
 * Kleinbuchstaben, Ziffern, Punkt, Unterstrich — dieselbe Regel wie
 * `eb_handle_gueltig()`, nur von der anderen Seite. Umlaute werden
 * ausgeschrieben, sonst faellt aus „Müller" ein „mller".
 */
function eb_handle_vorschlag( $name ) {
    // ── UMSCHRIFT VOR DEM KLEINSCHREIBEN ────────────────────────────────
    //
    // Hier stand `strtolower( trim( $name ) )` ZUERST und die Tabelle
    // danach — mit ausschliesslich kleinen Umlauten. `strtolower()`
    // arbeitet aber BYTEWEISE: „Ä" sind zwei UTF-8-Bytes, und keines davon
    // ist ein ASCII-Grossbuchstabe. Der Umlaut kam also unveraendert bei
    // einer Tabelle an, die nur „ä" kennt, und fiel eine Zeile spaeter dem
    // `[^a-z0-9._]`-Filter zum Opfer.
    //
    // Am Pruefstand gemessen, nicht vermutet:
    //
    //     „Änne Großmann"  ->  nne.grossmann      (das Ä fehlt ganz)
    //     „Bo Ötzi"        ->  bo.tzi
    //
    // Das traf JEDEN Namen, der mit einem Umlaut beginnt — und der Handle
    // ist das, wonach andere diese Person suchen. Aufgefallen ist es erst,
    // als der Nachtrag wirklich AUSGEFUEHRT wurde statt gelesen.
    //
    // `mb_strtolower` waere der kuerzere Weg und der unsicherere: mbstring
    // ist keine Voraussetzung, die WordPress garantiert — dieselbe
    // Begruendung wie beim Kontaktschutz.
    $roh = strtr( trim( (string) $name ), array(
        'Ä' => 'ae', 'Ö' => 'oe', 'Ü' => 'ue', 'ẞ' => 'ss',
        'Á' => 'a', 'À' => 'a', 'Â' => 'a', 'É' => 'e', 'È' => 'e', 'Ê' => 'e',
        'Í' => 'i', 'Ì' => 'i', 'Ó' => 'o', 'Ò' => 'o', 'Ô' => 'o',
        'Ú' => 'u', 'Ù' => 'u', 'Ç' => 'c', 'Ñ' => 'n',
        'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss',
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e',
        'í' => 'i', 'ì' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o',
        'ú' => 'u', 'ù' => 'u', 'ç' => 'c', 'ñ' => 'n',
    ) );
    $roh = strtolower( $roh );
    $roh = preg_replace( '/[^a-z0-9._]+/', '.', $roh );
    $roh = trim( (string) $roh, '._' );
    $roh = preg_replace( '/\.{2,}/', '.', (string) $roh );
    if ( strlen( $roh ) > 24 ) {
        $roh = rtrim( substr( $roh, 0, 24 ), '._' );
    }
    return (string) $roh;
}

/**
 * Einen freien Nickname finden — nie einen fremden ueberschreiben.
 *
 * Kollisionen bekommen eine Zahl. Der Zaehler ist gedeckelt: eine Schleife
 * ohne Ausstieg waere auf einem geteilten PHP-Pool genau die Sorte Last,
 * die am 22.08.2026 die Website haengen liess.
 */
function eb_handle_freier( $wunsch, $user_id = 0 ) {
    $basis = eb_handle_vorschlag( $wunsch );
    if ( strlen( $basis ) < 3 ) {
        $basis = 'eb.' . absint( $user_id );
        $basis = eb_handle_vorschlag( $basis );
    }
    if ( strlen( $basis ) < 3 ) {
        return '';
    }
    for ( $i = 0; $i <= 50; $i++ ) {
        $kandidat = $i === 0 ? $basis : rtrim( substr( $basis, 0, 21 ), '._' ) . $i;
        if ( ! eb_handle_gueltig( $kandidat ) ) {
            continue;
        }
        if ( eb_handle_reserviert( $kandidat ) ) {
            continue;
        }
        $besitzer = eb_handle_besitzer( $kandidat );
        if ( ! $besitzer || (int) $besitzer === (int) $user_id ) {
            return $kandidat;
        }
    }
    // Ein Name, aus dem sich nichts Freies machen laesst („Support Team"
    // ist reserviert, mit jeder Zahl dahinter), bekommt einen neutralen —
    // sonst bliebe genau dieses Konto fuer immer ohne Nickname.
    $neutral = 'eventfan.' . absint( $user_id );
    if ( absint( $user_id ) && eb_handle_gueltig( $neutral ) && $neutral !== $basis ) {
        $besitzer = eb_handle_besitzer( $neutral );
        if ( ! $besitzer || (int) $besitzer === (int) $user_id ) {
            return $neutral;
        }
    }
    return '';
}

/**
 * Bestandsnutzer bekommen einen Nickname (DB 3.2).
 *
 * ── WARUM DAS EINE ENTSCHEIDUNG IST, KEINE AUFRAEUMARBEIT ───────────────
 *
 * Bis hierher galt: „Das Setzen IST die Einwilligung" — wer keinen Handle
 * hatte, war in der Personensuche nicht auffindbar, und das war Absicht.
 * Ein Nachtrag macht Bestandsnutzer auffindbar, OHNE dass sie dem
 * zugestimmt haetten. Der Inhaber hat das am 15.09.2026 ausdruecklich so
 * beauftragt („die die wir schon haben kriegen jetzt einfach ein
 * passenden"), weil die Personensuche sonst leer bleibt.
 *
 * Drei Grenzen halten den Eingriff klein:
 *
 *  1. NUR wo nichts steht. Ein vorhandener Handle wird nie ueberschrieben —
 *     auch kein bewusst geleerter, denn `get_user_meta` liefert dann '' und
 *     der Eintrag existiert; geprueft wird deshalb auf die Existenz des
 *     Meta-Schluessels, nicht auf seinen Wert. Wer sich unauffindbar
 *     gemacht hat, bleibt es.
 *  2. Gedeckelt je Lauf. Ein Durchlauf ueber ALLE Nutzer in einem
 *     `init`-Hook ist genau die Sorte Eingriff, die hier schon einmal
 *     teuer war. Der Rest kommt beim naechsten Lauf.
 *  3. Nur zusaetzlich. Es wird ausschliesslich ein Meta-Schluessel
 *     geschrieben, nie einer geloescht oder geaendert.
 */
function eb_handles_nachtragen( $deckel = 200 ) {
    // ── OPT-IN, WEIL DIES EINE DATENSCHUTZ-AUSSAGE AENDERT ──────────────
    //
    // Die Doktrin zur Personensuche lautet seit dem 09.09.2026: „Das Setzen
    // IST die Einwilligung." Genau die hebt ein Nachtrag auf — bestehende
    // Konten werden auffindbar, ohne dass irgendjemand etwas gesetzt hat.
    // Das ist keine Aufraeumarbeit, sondern eine Aussage in der
    // Datenschutzerklaerung, und sie gehoert dorthin, BEVOR sie zutrifft.
    //
    // Deshalb derselbe Opt-in-Weg wie bei EB_APPLE_TEAM_ID: ohne die
    // Konstante bleibt alles, wie es ist, und „nicht eingerichtet" sieht
    // anders aus als „eingerichtet". Der Schalter wird in dem Augenblick
    // gesetzt, in dem die Datenschutzerklaerung den Nachtrag nennt —
    // dieselbe Hand, derselbe Moment.
    //
    // Der Code ist damit fertig und wartet; er ist nicht abgeschaltet.
    // Eine Zeile in wp-config.php startet ihn:
    //
    //     define( 'EB_HANDLE_NACHTRAG', true );
    if ( ! defined( 'EB_HANDLE_NACHTRAG' ) || ! EB_HANDLE_NACHTRAG ) {
        return 0;
    }

    // ── EIGENE MARKE, NICHT DIE DB-VERSION ──────────────────────────────
    //
    // `eb_maybe_create_tables()` laeuft bei JEDER Anfrage weiter, solange
    // eine Tabelle fehlt — dann stuende hier ein `get_users()` ueber 200
    // Konten in jedem Seitenaufruf. Auf dem kleinen PHP-Pool von IONOS ist
    // das genau die Last, die am 22.08.2026 die Website haengen liess.
    //
    // Die Marke ist deshalb eigenstaendig, wie beim 2.7-Backfill. Ein voller
    // Stapel bedeutet „da kann noch mehr sein" und laesst sie offen; ein
    // unvoller heisst fertig. Das konvergiert und hoert von selbst auf.
    if ( get_option( 'eb_handles_nachtrag_32' ) === 'fertig' ) {
        return 0;
    }
    if ( ! function_exists( 'get_users' ) ) {
        return 0;
    }
    $nutzer = get_users( array(
        'number'     => absint( $deckel ),
        'fields'     => array( 'ID', 'display_name', 'user_login' ),
        'meta_query' => array(
            array( 'key' => 'eb_handle', 'compare' => 'NOT EXISTS' ),
        ),
    ) );
    $gesetzt = 0;
    foreach ( $nutzer as $u ) {
        $name = trim( (string) $u->display_name );
        if ( $name === '' ) {
            $name = (string) $u->user_login;
        }
        $handle = eb_handle_freier( $name, $u->ID );
        if ( $handle === '' ) {
            continue;
        }
        // Ueber die Sperre, nicht an ihr vorbei — und VERBORGEN: ein
        // vergebener Name ist keine Zustimmung, gefunden zu werden. Wer
        // gefunden werden will, schaltet es selbst ein (Freunde, Einstellungen).
        // Ein Konflikt mit einer gleichzeitigen Registrierung ist kein
        // Fehler: das Konto bleibt ohne Namen und kommt beim naechsten Lauf.
        if ( eb_handle_beanspruchen( $u->ID, $handle, false ) !== true ) {
            continue;
        }
        $gesetzt++;
    }
    if ( count( $nutzer ) < absint( $deckel ) ) {
        update_option( 'eb_handles_nachtrag_32', 'fertig' );
    }
    return $gesetzt;
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
 * Ist dieser Nutzer über seinen Nickname auffindbar?
 *
 * ── NICKNAME UND AUFFINDBARKEIT SIND ZWEI ANGABEN ───────────────────────
 *
 * Bis zum 15.10.2026 waren sie eine: wer einen Handle hatte, war
 * auffindbar, und der Handle-Kasten versprach jedem ohne ihn ausdrücklich
 * „nicht auffindbar". Ein Nickname für JEDES Konto (Auftrag des Inhabers)
 * hätte dieses Versprechen still aufgehoben.
 *
 * Deshalb steht die Einwilligung jetzt daneben, in `eb_handle_auffindbar`:
 *
 *  · '0'    — verborgen. So schreibt der Nachtrag: ein vergebener Name ist
 *             keine Zustimmung, gefunden zu werden.
 *  · fehlt  — auffindbar. Das ist der Bestand: jeder, der bisher einen
 *             Handle hatte, hat ihn SELBST gesetzt, und genau das war die
 *             Einwilligung. Ein Rückfall auf „verborgen" machte über Nacht
 *             alle bisherigen Nutzer unsichtbar.
 *  · '1'    — ausdrücklich auffindbar.
 *
 * Ohne Handle ist niemand auffindbar, egal was hier steht.
 */
function eb_handle_auffindbar( $user_id ) {
    if ( eb_handle_von( $user_id ) === '' ) {
        return false;
    }
    return (string) get_user_meta( absint( $user_id ), 'eb_handle_auffindbar', true ) !== '0';
}

/**
 * Eine Sperre auf genau diesen Namen, über alle PHP-Prozesse hinweg.
 *
 * ── WARUM NICHT „ERST PRÜFEN, DANN SCHREIBEN" ───────────────────────────
 *
 * So stand es hier: `eb_handle_besitzer()` fragen, dann `update_user_meta()`.
 * Zwei Registrierungen, die im selben Augenblick denselben Namen wollen,
 * sehen beide „frei" und schreiben beide — danach heissen zwei Konten
 * gleich, und die Suche liefert für einen Namen zwei Menschen. Bei einer
 * Freundesliste ist das kein Schönheitsfehler, sondern der Weg, an eine
 * fremde Planung zu kommen.
 *
 * `usermeta` hat keinen eindeutigen Index, und einen anzulegen hiesse, eine
 * WordPress-Kerntabelle umzubauen. `GET_LOCK` ist die kleinere Antwort: die
 * Datenbank ordnet die beiden Anfragen hintereinander, und die zweite sieht
 * den Namen schon vergeben.
 *
 * Der Name der Sperre ist ein Hash: MySQL-Sperren gelten für den ganzen
 * Server, nicht nur für unsere Datenbank, und sind auf 64 Zeichen begrenzt.
 */
function eb_handle_sperrname( $handle ) {
    $db = defined( 'DB_NAME' ) ? DB_NAME : '';
    return 'eb_h_' . md5( $db . '|' . (string) $handle );
}

function eb_handle_sperre_holen( $handle ) {
    global $wpdb;
    $ok = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', eb_handle_sperrname( $handle ), 3 ) );
    return (string) $ok === '1';
}

function eb_handle_sperre_freigeben( $handle ) {
    global $wpdb;
    $wpdb->query( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', eb_handle_sperrname( $handle ) ) );
}

/**
 * Einen Nickname für einen Nutzer beanspruchen — der EINZIGE Schreibweg.
 *
 * Route, Registrierung und Nachtrag gehen alle hier durch; ein zweiter Weg
 * an der Sperre vorbei machte sie wertlos.
 *
 * Bekommt die Sperre niemand, ist das „gerade nicht prüfbar", nicht
 * „vergeben": wer eine Netzstörung als Konflikt meldet, schickt Menschen
 * auf die Suche nach einem anderen Namen, obwohl ihrer frei ist.
 *
 * @param bool|null $auffindbar null lässt die Einwilligung, wie sie ist.
 * @return true|WP_Error
 */
function eb_handle_beanspruchen( $user_id, $handle, $auffindbar = null ) {
    $user_id = absint( $user_id );
    $handle  = strtolower( trim( (string) $handle ) );

    if ( ! eb_handle_gueltig( $handle ) ) {
        return new WP_Error( 'handle_ungueltig',
            '3 bis 24 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt und Unterstrich.' );
    }
    $bisher = eb_handle_von( $user_id );
    if ( $handle !== $bisher && eb_handle_reserviert( $handle ) ) {
        return new WP_Error( 'handle_gesperrt', 'Dieser Name ist reserviert.' );
    }

    if ( ! eb_handle_sperre_holen( $handle ) ) {
        return new WP_Error( 'handle_sperre', 'Der Name kann gerade nicht geprüft werden. Bitte versuche es gleich noch einmal.' );
    }
    try {
        $besitzer = eb_handle_besitzer( $handle );
        if ( $besitzer && $besitzer !== $user_id ) {
            return new WP_Error( 'handle_vergeben', 'Dieser Name ist schon vergeben.' );
        }
        update_user_meta( $user_id, 'eb_handle', $handle );
        if ( $auffindbar !== null ) {
            update_user_meta( $user_id, 'eb_handle_auffindbar', $auffindbar ? '1' : '0' );
        }
    } finally {
        eb_handle_sperre_freigeben( $handle );
    }
    return true;
}

/**
 * Bis zu drei freie Varianten eines Wunschnamens.
 *
 * Ohne Vorschlag ist „schon vergeben" eine Sackgasse: der Nutzer rät, und
 * jeder Rateversuch kostet eine Prüfung. Reservierte Namen werden nie
 * vorgeschlagen — auch nicht als „admin1".
 */
function eb_handle_vorschlaege( $wunsch, $user_id = 0, $anzahl = 3 ) {
    $basis = eb_handle_vorschlag( $wunsch );
    if ( strlen( $basis ) < 3 ) {
        return array();
    }
    $raus = array();
    for ( $i = 1; $i <= 30 && count( $raus ) < $anzahl; $i++ ) {
        $kandidat = rtrim( substr( $basis, 0, 21 ), '._' ) . $i;
        if ( ! eb_handle_gueltig( $kandidat ) || eb_handle_reserviert( $kandidat ) ) {
            continue;
        }
        $besitzer = eb_handle_besitzer( $kandidat );
        if ( ! $besitzer || $besitzer === absint( $user_id ) ) {
            $raus[] = $kandidat;
        }
    }
    return $raus;
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
