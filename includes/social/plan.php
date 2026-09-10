<?php
/**
 * Der gemeinsame Plan einer Gruppe — „ein gemeinsames Vorhaben".
 *
 * Die Gruppen gibt es seit dem 09.09.2026, den Plan darin nicht: der Knopf
 * „Vorhaben planen" führte ins Board und sagte ehrlich, dass dort noch nicht
 * gemeinsam geplant wird. Das ist der Teil, der das nachholt.
 *
 * ── WARUM NICHT DAS BOARD, UND WARUM KEIN JSON-FELD ─────────────────────
 *
 * `eb_board_projects` ist EIN JSON-Blob je Nutzer, den der Besitzer als
 * Ganzes zurueckschreibt. Zwei Personen am selben Projekt ueberschreiben
 * sich gegenseitig — der letzte Schreibvorgang gewinnt, die Arbeit des
 * anderen ist weg, und niemand bekommt eine Meldung.
 *
 * Dieselbe Falle stuende in einem `plan`-JSON-Feld an der Gruppe: auch das
 * ist ein Lesen, Aendern, Zurueckschreiben. Deshalb ZEILEN — dann arbitriert
 * die Datenbank, und nicht der zuletzt Angekommene.
 *
 * ── DREI ARTEN VON KONFLIKT, DREI ANTWORTEN ─────────────────────────────
 *
 * 1. HINZUFUEGEN kollidiert nie: zwei INSERTs sind zwei Posten. Wer beim
 *    Anlegen sperrt, loest ein Problem, das es nicht gibt.
 * 2. UEBERNEHMEN („ich kuemmere mich drum") ist ein Wettlauf um EINEN
 *    Platz. Geloest mit einem bedingten UPDATE (`WHERE zustaendig_id = 0`) —
 *    die Datenbank entscheidet, nicht ein Zustand, den der Aufrufer vorher
 *    gelesen hat. Optimistisches Sperren waere hier schwaecher, weil es
 *    genau dieses Lesen voraussetzt.
 * 3. BEARBEITEN ist echtes Lesen-Aendern-Schreiben (Titel, Notiz, Betrag).
 *    Nur hier traegt der Posten eine Revision: wer mit einer veralteten
 *    schreibt, wird abgewiesen UND bekommt den aktuellen Stand zurueck.
 *    Eine Ablehnung ohne den aktuellen Stand zwingt zu einem zweiten Abruf
 *    und sieht fuer den Nutzer aus wie ein Fehler.
 *
 * ── WER DARF WAS ────────────────────────────────────────────────────────
 *
 * Sehen und schreiben duerfen MITGLIEDER — nicht Eingeladene. Der Plan ist
 * der Inhalt der Gruppe; wer ihn schon vor dem Zusagen lesen koennte, muesste
 * nur eine Einladung annehmen wollen, um ihn abzuholen. Dieselbe Grenze wie
 * bei der Mitgliederliste, aus demselben Grund.
 *
 * Schreiben duerfen ALLE Mitglieder, nicht nur die Verwaltung: ein
 * gemeinsames Vorhaben, an dem nur der Eigentuemer arbeiten darf, ist keins.
 *
 * LOESCHEN darf nur, wer den Posten angelegt hat — oder die Verwaltung.
 * Sonst raeumt ein Mitglied die Arbeit aller anderen weg, und die Gruppe
 * haette keinen Weg, das rueckgaengig zu machen.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Hoechstzahl Posten je Gruppe — ein Deckel, kein Geschaeftsmodell. */
if ( ! defined( 'EB_MAX_PLAN_POSTEN' ) ) {
    define( 'EB_MAX_PLAN_POSTEN', 60 );
}

/**
 * Die Zustaende eines Postens.
 *
 * Eine feste Liste, keine Freitextspalte: ein Status, den sich jeder selbst
 * ausdenkt, laesst sich weder zaehlen noch anzeigen, und die Oberflaeche
 * muesste jeden unbekannten Wert irgendwie darstellen.
 */
function eb_plan_status_erlaubt() {
    return array( 'offen', 'vergeben', 'gebucht', 'erledigt' );
}

/**
 * Darf dieser Nutzer den Plan sehen und daran arbeiten?
 *
 * Bewusst `eb_gruppe_ist_mitglied()` und nicht `eb_gruppe_darf_sehen()`:
 * letzteres schliesst `invited` ein, und genau der soll den Plan nicht
 * bekommen.
 */
function eb_plan_darf( $group_id, $user_id ) {
    return eb_gruppe_ist_mitglied( $group_id, $user_id );
}

/** Einen Posten laden — ohne Rechtepruefung, die machen die Aufrufer. */
function eb_plan_posten_laden( $item_id ) {
    global $wpdb;
    $tab = $wpdb->prefix . 'eb_group_plan_items';
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE id = %d", absint( $item_id )
    ), ARRAY_A );
    return $row ?: null;
}

/**
 * Ein Posten als Antwort.
 *
 * `zustaendig` ist eine Personenkarte, keine blosse ID: die Oberflaeche
 * soll einen Namen zeigen koennen, ohne fuer jede Zeile nachzufragen.
 */
function eb_plan_karte( $row ) {
    $zu = (int) $row['zustaendig_id'];
    return array(
        'id'         => (int) $row['id'],
        'titel'      => (string) $row['titel'],
        'kategorie'  => (string) $row['kategorie'],
        'status'     => (string) $row['status'],
        'notiz'      => (string) $row['notiz'],
        'betragCent' => (int) $row['betrag_cent'],
        'listingId'  => (int) $row['listing_id'] ?: null,
        'rev'        => (int) $row['rev'],
        'zustaendig' => $zu ? eb_person_karte( $zu ) : null,
        'erstelltVon'=> eb_person_karte( (int) $row['erstellt_von'] ),
        'erstelltAm' => (string) $row['created_at'],
    );
}

/**
 * Der ganze Plan einer Gruppe.
 *
 * Sortiert nach Status und Alter: offene Posten zuerst, denn das ist die
 * Arbeit, die noch jemand uebernehmen muss. Eine Liste, die Erledigtes
 * obenauf zeigt, laesst die Gruppe fertiger aussehen, als sie ist.
 */
function eb_plan_liste( $group_id ) {
    global $wpdb;
    $tab  = $wpdb->prefix . 'eb_group_plan_items';
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$tab} WHERE group_id = %d
         ORDER BY FIELD(status, 'offen', 'vergeben', 'gebucht', 'erledigt'), id ASC",
        absint( $group_id )
    ), ARRAY_A );
    return array_map( 'eb_plan_karte', $rows ?: array() );
}

/**
 * Was der Plan zusammenzaehlt.
 *
 * Die Summe steht bewusst NEBEN der Liste und wird nicht im Browser
 * gerechnet: zwei Rechenwege fuer dieselbe Zahl driften, und diese Zahl
 * ist Geld.
 */
function eb_plan_bilanz( $posten ) {
    $summe = 0;
    $offen = 0;
    foreach ( $posten as $p ) {
        $summe += (int) $p['betragCent'];
        if ( $p['status'] === 'offen' ) {
            $offen++;
        }
    }
    return array(
        'posten'     => count( $posten ),
        'offen'      => $offen,
        'summeCent'  => $summe,
    );
}

/**
 * Das SQL der Plan-Tabelle.
 *
 * Steht BEI DER LOGIK, nicht im Installer — eine Tabellendefinition, die
 * getrennt von ihrem Code gepflegt wird, driftet, und diese driftet
 * unbemerkt bis zum ersten Schreibversuch im Betrieb.
 *
 * `eb_social_tabellen_sql()` fasst diese Rueckgabe mit den uebrigen
 * zusammen; die Migration leitet ihre Nachweisliste daraus ab und deckt
 * diese Tabelle damit ohne weiteres Zutun mit ab.
 */
function eb_plan_tabellen_sql() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $items = "CREATE TABLE {$wpdb->prefix}eb_group_plan_items (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        group_id bigint(20) unsigned NOT NULL,
        titel varchar(120) NOT NULL DEFAULT '',
        kategorie varchar(60) NOT NULL DEFAULT '',
        status varchar(20) NOT NULL DEFAULT 'offen',
        zustaendig_id bigint(20) unsigned NOT NULL DEFAULT 0,
        listing_id bigint(20) unsigned NOT NULL DEFAULT 0,
        notiz text NULL,
        betrag_cent bigint(20) NOT NULL DEFAULT 0,
        rev int(10) unsigned NOT NULL DEFAULT 1,
        erstellt_von bigint(20) unsigned NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY idx_gruppe (group_id, status),
        KEY idx_zustaendig (zustaendig_id)
    ) $charset;";

    return array( $items );
}
