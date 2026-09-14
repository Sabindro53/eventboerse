<?php
/**
 * Storno-Vorgang — der Weg des Planers zu seinem Geld.
 *
 * ── WOZU ───────────────────────────────────────────────────────────────
 *
 * Beauftragt am 13.09.2026: *„wenn er das nicht erfüllen kann, muss er
 * Bescheid geben und Geld zurückzahlen, ähnlich wie ein Pizzalieferant, der
 * zu spät bei Lieferando eine Bestellung bekommt … das muss immer sauber
 * ablaufen."*
 *
 * Vorher gab es dafür **nichts**. Gemessen am selben Tag: der Planer hatte
 * keinen Weg zu einer Erstattung ausser über den Dienstleister persönlich
 * oder den Betreiber — und die eine Route, die es gab, war ein Loch (siehe
 * `erstattung-rechte.php`).
 *
 * ── WARUM EINE EIGENE TABELLE ──────────────────────────────────────────
 *
 * Buchungen liegen in `eb_board_projects` — EIN JSON-Blob je Nutzer, den
 * sein Besitzer als Ganzes zurückschreibt. Ein Storno ist aber
 * **zweiseitig**: der Planer beantragt, der Dienstleister entscheidet.
 * Beide müssten in denselben Blob schreiben, und der letzte Schreibvorgang
 * gewänne — die Entscheidung des einen wäre weg, ohne Meldung. Dieselbe
 * Begründung, aus der Freunde, Gruppen und der gemeinsame Plan eigene
 * Tabellen bekommen haben.
 *
 * ── DIE ENTSCHEIDUNG, AN DER ALLES HÄNGT ───────────────────────────────
 *
 * **Ein Antrag erstattet nichts.** Er ist eine Bitte mit Frist. Erst die
 * Annahme durch den Dienstleister löst die Erstattung aus, und die läuft
 * über denselben Weg wie bisher — `eb_erstattung_darf()`. Der Planer
 * bekommt damit einen **Vorgang**, keinen Knopf auf fremdes Geld. Genau
 * daran ist die alte Fassung gescheitert: sie gab ihm den Knopf.
 *
 * **Die Frist erstattet auch nicht automatisch.** Ein Antrag, der nach
 * 72 Stunden von selbst Geld bewegt, wäre eine Geldentscheidung ohne einen
 * Menschen darin. Nach Ablauf steht er auf `abgelaufen` und ist damit für
 * den Betreiber sichtbar — der entscheidet. Das ist die ehrliche Fassung:
 * die Frist erzeugt eine Zuständigkeit, keine Zahlung.
 *
 * **Ein Antrag je Zahlung.** Sonst wäre das Beantragen ein Weg, den
 * Dienstleister zuzuschütten.
 *
 * ── WAS HIER NICHT ENTSCHIEDEN WIRD ────────────────────────────────────
 *
 * Die Höhe. Ein Storno ist immer der volle Betrag; eine Teil-Erstattung
 * (Anzahlung behalten, Rest zurück) ist eine Geschäftsentscheidung mit
 * AGB-Folgen und gehört dem Inhaber, nicht diesem Modul.
 */

if ( ! defined( 'ABSPATH' ) && ! defined( 'EB_STORNO_PRUEFSTAND' ) ) {
    exit;
}

/** Wie lange der Dienstleister Zeit hat, bevor der Betreiber zuständig wird. */
if ( ! defined( 'EB_STORNO_FRIST_STUNDEN' ) ) {
    define( 'EB_STORNO_FRIST_STUNDEN', 72 );
}

/** Obergrenze für die Begründung — fremder Text landet in unserer Oberfläche. */
if ( ! defined( 'EB_STORNO_GRUND_MAX' ) ) {
    define( 'EB_STORNO_GRUND_MAX', 600 );
}

/** Mindestlänge: „nein" ist keine Begründung, und der Gegenüber soll antworten können. */
if ( ! defined( 'EB_STORNO_GRUND_MIN' ) ) {
    define( 'EB_STORNO_GRUND_MIN', 10 );
}

function eb_storno_tabelle_sql() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    return "CREATE TABLE {$wpdb->prefix}eb_storno (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        payment_intent varchar(190) NOT NULL DEFAULT '',
        besteller_id bigint(20) unsigned NOT NULL,
        anbieter_konto varchar(190) NOT NULL DEFAULT '',
        betrag_cents int(11) NOT NULL DEFAULT 0,
        waehrung varchar(10) NOT NULL DEFAULT 'EUR',
        grund text,
        antwort text,
        status varchar(20) NOT NULL DEFAULT 'offen',
        frist datetime DEFAULT NULL,
        erstellt datetime DEFAULT CURRENT_TIMESTAMP,
        entschieden datetime DEFAULT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY idx_pi (payment_intent),
        KEY idx_besteller (besteller_id, status),
        KEY idx_konto (anbieter_konto, status)
    ) $charset;";
}

/**
 * Die Begründung des Planers — Pflicht, gedeckelt, entschärft.
 *
 * Gibt bei Erfolg den bereinigten Text zurück, sonst eine Zeichenkette mit
 * dem Grund der Ablehnung, erkennbar am führenden `!`.
 */
function eb_storno_grund_pruefen( $roh ) {
    $t = is_string( $roh ) ? $roh : '';
    // Steuerzeichen und spitze Klammern raus — der Text geht in die
    // Oberflaeche des Gegenuebers. Entschaerfen, nicht verwerfen.
    $t = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $t );
    $t = str_replace( array( '<', '>' ), array( '‹', '›' ), $t );
    $t = trim( preg_replace( '/\s+/u', ' ', $t ) );

    if ( $t === '' ) {
        return '!Bitte gib einen Grund an — der Dienstleister muss wissen, worum es geht.';
    }
    // Laenge in ZEICHEN, nicht in Bytes: ein Umlaut ist zwei Bytes, und ein
    // Deckel in Bytes kappte deutschen Text willkuerlich frueher.
    $len = function_exists( 'mb_strlen' ) ? mb_strlen( $t, 'UTF-8' ) : strlen( $t );
    if ( $len < EB_STORNO_GRUND_MIN ) {
        return '!Bitte beschreibe kurz, warum du stornieren möchtest.';
    }
    if ( $len > EB_STORNO_GRUND_MAX ) {
        $t = function_exists( 'mb_substr' )
            ? mb_substr( $t, 0, EB_STORNO_GRUND_MAX, 'UTF-8' )
            : substr( $t, 0, EB_STORNO_GRUND_MAX );
    }
    return $t;
}

/** Die Frist als MySQL-Zeitstempel. */
function eb_storno_frist_ab( $jetzt_ts ) {
    return gmdate( 'Y-m-d H:i:s', (int) $jetzt_ts + EB_STORNO_FRIST_STUNDEN * 3600 );
}

/**
 * Der Zustand eines Antrags — abgeleitet, nicht gespeichert.
 *
 * `abgelaufen` steht bewusst NICHT in der Datenbank: sonst braeuchte es
 * einen Zeitgeber, der Zeilen umschreibt, und ein Antrag waere je nach
 * Laufzeit dieses Zeitgebers mal offen und mal abgelaufen. Abgeleitet ist
 * er zu jedem Zeitpunkt dasselbe.
 */
function eb_storno_zustand( $zeile, $jetzt_ts ) {
    $status = is_array( $zeile ) && isset( $zeile['status'] ) ? (string) $zeile['status'] : '';
    if ( $status !== 'offen' ) {
        return $status === '' ? 'unbekannt' : $status;
    }
    $frist = is_array( $zeile ) && ! empty( $zeile['frist'] ) ? (string) $zeile['frist'] : '';
    if ( $frist === '' ) {
        return 'offen';
    }
    $ts = strtotime( $frist . ' UTC' );
    if ( $ts === false ) {
        return 'offen';
    }
    return ( (int) $jetzt_ts > $ts ) ? 'abgelaufen' : 'offen';
}

/**
 * Darf dieser Nutzer für diese Zahlung ein Storno beantragen?
 *
 * Nur der Zahler — und zwar der, den Stripe im PaymentIntent führt. Die
 * Kennung aus dem Antrag zu glauben waere genau der Fehler, den die
 * Erstattungsroute gemacht hat, nur andersherum.
 */
function eb_storno_darf_beantragen( $user_id, $pi_data ) {
    $user_id = (int) $user_id;
    if ( $user_id <= 0 ) {
        return false;
    }
    if ( ! is_array( $pi_data ) ) {
        return false;
    }
    if ( ( $pi_data['status'] ?? '' ) !== 'succeeded' ) {
        return false;   // was nicht bezahlt ist, kann nicht storniert werden
    }
    $zahler = isset( $pi_data['metadata']['user_id'] ) ? (int) $pi_data['metadata']['user_id'] : 0;
    return ( $zahler > 0 && $zahler === $user_id );
}

/**
 * Darf dieser Nutzer über den Antrag entscheiden?
 *
 * Dieselbe Frage wie „darf er erstatten" — und deshalb dieselbe Funktion.
 * Zwei Fassungen derselben Rechteregel driften, und diese driftete auf
 * einem Geldweg.
 */
function eb_storno_darf_entscheiden( $ist_admin, $konto_aufrufer, $pi_data ) {
    if ( ! function_exists( 'eb_erstattung_darf' ) ) {
        return false;   // ohne die Regel wird nicht entschieden, nicht geraten
    }
    return eb_erstattung_darf( $ist_admin, $konto_aufrufer, $pi_data );
}

/**
 * Welche Entscheidungen sind aus welchem Zustand möglich?
 *
 * Abgeleitet statt aufgezaehlt: ein abgelaufener Antrag bleibt entscheidbar
 * (der Dienstleister darf sich auch spaet melden — nur ist ab dann auch der
 * Betreiber zustaendig), ein bereits entschiedener nicht mehr. Ohne diese
 * Grenze koennte eine Ablehnung spaeter in eine Annahme gedreht werden und
 * Geld bewegen, das laengst abgerechnet ist.
 */
function eb_storno_entscheidbar( $zustand ) {
    return in_array( $zustand, array( 'offen', 'abgelaufen' ), true );
}
