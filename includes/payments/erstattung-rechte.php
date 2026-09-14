<?php
/**
 * Wer darf eine Zahlung erstatten?
 *
 * ── DER BEFUND, AUS DEM DIESE DATEI ENTSTEHT ───────────────────────────
 *
 * Der Docblock von `eb_stripe_refund()` nennt seit jeher genau zwei
 * Berechtigte:
 *
 *     - der Anbieter, dem das Geld zugeflossen ist (Connect-Account des PI)
 *     - Plattform-Admins
 *
 * Der Code hatte einen dritten Zweig:
 *
 *     $owner_uid   = intval( $pi_data['metadata']['user_id'] );
 *     $owner_match = ( $owner_uid && $owner_uid === (int) $user->ID );
 *
 * Der Kommentar daneben erklärte ihn mit *„falls die App den Owner dort
 * hinterlegt hat"* — gemeint war der Anbieter. Geschrieben wird dort aber
 * der **Zahler**: `functions.php` setzt beim Anlegen des PaymentIntents
 * `'metadata[user_id]' => (string) $user->ID`, und das ist der angemeldete
 * Kunde, der gerade bucht.
 *
 * Zwei Stellen, eine Annahme, auseinandergelaufen — dieselbe Klasse wie
 * jede andere Drift in diesem Projekt, nur auf einem Geldweg.
 *
 * ── WAS DAS BEDEUTETE ──────────────────────────────────────────────────
 *
 * Die Route steht auf `permission_callback => 'is_user_logged_in'`. Ein
 * angemeldeter Kunde konnte damit **jederzeit** und **einseitig** seine
 * eigene Zahlung in voller Höhe erstatten — auch nach erbrachter Leistung.
 * Und weil die Erstattung `reverse_transfer=true` setzt, wird das Geld aus
 * dem Connect-Konto des Dienstleisters zurückgeholt. Der hat die Arbeit
 * dann gemacht und bekommt nichts.
 *
 * **Aufgehalten hat das nur, dass es keinen Knopf dafür gab.** Gemessen am
 * 13.09.2026: null Aufrufe der Route in `js/modules/**`, null in `hq.html`,
 * null irgendwo sonst im ausgelieferten Code. Eine REST-Route ist damit
 * nicht unerreichbar — sie ist nur unbeworben. Schutz durch einen
 * fehlenden Knopf ist genau die Sorte Schutz, die in diesem Projekt
 * mehrfach teuer war.
 *
 * ── WAS DIESE DATEI NICHT ENTSCHEIDET ──────────────────────────────────
 *
 * Ob ein Eventplaner selbst stornieren können soll, ist eine
 * Produktentscheidung des Inhabers — und wenn ja, dann als eigener Vorgang
 * mit Frist, Begründung und Benachrichtigung des Dienstleisters, nicht als
 * stiller Vollzugriff auf `POST /stripe/refund`. Hier wird ausschliesslich
 * die Regel wiederhergestellt, die der Docblock der Funktion seit jeher
 * beschreibt. Die Prüfung wird dabei **enger**, nie weiter.
 */

if ( ! defined( 'ABSPATH' ) && ! defined( 'EB_ERSTATTUNG_PRUEFSTAND' ) ) {
    exit;
}

/**
 * Das Connect-Konto, dem die Zahlung zugeflossen ist.
 *
 * Stripe liefert es je nach Ladungsart unter `transfer_data.destination`
 * oder unter `on_behalf_of`; beim Abruf über die API kann es als Zeichenkette
 * oder als eingebettetes Objekt kommen. Wer nur einen der Fälle liest,
 * bekommt einen leeren Wert — und ein leerer Wert darf nie zu einem
 * Treffer führen.
 */
function eb_erstattung_ziel( $pi_data ) {
    foreach ( array( 'transfer_data', 'on_behalf_of' ) as $feld ) {
        if ( empty( $pi_data[ $feld ] ) ) {
            continue;
        }
        $wert = $pi_data[ $feld ];
        if ( $feld === 'transfer_data' ) {
            $wert = is_array( $wert ) ? ( $wert['destination'] ?? '' ) : '';
        }
        if ( is_array( $wert ) ) {
            $wert = $wert['id'] ?? '';
        }
        $wert = is_string( $wert ) ? trim( $wert ) : '';
        if ( $wert !== '' ) {
            return $wert;
        }
    }
    return '';
}

/**
 * Darf dieser Aufrufer diese Zahlung erstatten?
 *
 * @param bool   $ist_admin       Plattform-Administrator.
 * @param string $konto_aufrufer  Connect-Konto des Aufrufers (`eb_stripe_connect_id`).
 * @param array  $pi_data         PaymentIntent, wie Stripe ihn liefert.
 * @return bool
 */
function eb_erstattung_darf( $ist_admin, $konto_aufrufer, $pi_data ) {
    if ( $ist_admin ) {
        return true;
    }

    $konto_aufrufer = is_string( $konto_aufrufer ) ? trim( $konto_aufrufer ) : '';
    if ( $konto_aufrufer === '' ) {
        return false;
    }

    $ziel = eb_erstattung_ziel( is_array( $pi_data ) ? $pi_data : array() );
    if ( $ziel === '' ) {
        return false;
    }

    // Beide Seiten sind hier nachweislich nicht leer. Ohne diese zwei
    // Rueckgaben oben wuerde '' === '' zu einem Treffer — und dann duerfte
    // jeder Angemeldete ohne Connect-Konto jede Zahlung ohne Ziel erstatten.
    return hash_equals( $ziel, $konto_aufrufer );
}
