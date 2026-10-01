<?php
/**
 * Sprachrouten des Assistenten — dieselbe Mechanik wie im HQ, engerer Rahmen.
 *
 * Der Unterschied zum HQ ist nicht die Logik, sondern WER davorsteht:
 *
 *   HQ        · eine Handvoll Administratoren mit zweitem Faktor
 *   Assistent · jeder angemeldete Nutzer der Plattform
 *
 * Daraus folgen die vier Entscheidungen dieser Datei.
 *
 * 1 · NUR ANGEMELDET. `permission_callback => 'is_user_logged_in'`.
 *     Eine offene Sprachroute ist ein Kostenverstaerker: wer sie ohne Konto
 *     in eine Schleife legt, schreibt eine Rechnung auf meinen
 *     OpenAI-Schluessel, und es gibt niemanden, den man dafuer deckeln
 *     koennte. Dasselbe Argument steht im HQ-Docblock als „offene
 *     Rechnung" — hier eine Ebene exponierter.
 *
 *     Der Preis ist ehrlich benannt: ein Besucher ohne Konto kann den
 *     Assistenten nicht BESPRECHEN. Er kann ihn weiter tippen, und die
 *     Oberflaeche sagt das auch — sie blendet das Mikrofon nicht
 *     wortlos aus.
 *
 * 2 · GEDECKELT AM KONTO, NICHT AN DER IP. `'u' . get_current_user_id()`.
 *     Hinter einem Reverse-Proxy bezeichnet `REMOTE_ADDR` alle Besucher
 *     gemeinsam; ein IP-gebundener Deckel waere dort entweder wirkungslos
 *     oder er sperrte Unbeteiligte. Dieselbe Begruendung wie bei den vier
 *     Sozial-Eimern. Und eine Kennung wird von `EB_RL_PROXY_FAKTOR` NIE
 *     geweitet — genau diese Eimer schuetzen wirklich.
 *
 * 3 · JE MINUTE UND JE TAG. Zwanzig pro Minute allein sind 28 800 am Tag.
 *     Der Tagesdeckel ist der eigentliche Kostenschutz; der Minutendeckel
 *     haelt nur die Schleife auf.
 *
 * 4 · KUERZER ALS IM HQ. Der Assistent beantwortet „ich suche einen DJ in
 *     Koeln", nicht einen Lagebericht: 600 Zeichen Ausgabe und 1 MB Ton
 *     (rund fuenf Minuten bei 24 kbit/s) statt 1200 Zeichen und 4 MB.
 *     Kuerzer ist billiger, und was niemand spricht, muss niemand
 *     bezahlen.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/** Zwanzig Aeusserungen je Minute reichen fuer ein Gespraech. */
const EB_ASSISTENT_STIMME_PRO_MINUTE = 20;
/** Zweihundert am Tag je Konto — der eigentliche Kostendeckel. */
const EB_ASSISTENT_STIMME_PRO_TAG    = 200;
/** 600 Zeichen sind rund eine Minute Sprache. Laenger hoert im Chat niemand zu. */
const EB_ASSISTENT_STIMME_ZEICHEN    = 600;
/** 1 MB Opus ≈ fuenf Minuten. Eine Suchanfrage braucht fuenf Sekunden. */
const EB_ASSISTENT_GEHOER_MAX        = 1024 * 1024;

/**
 * Der Rahmen steht an EINER Stelle, damit Ausgabe und Erkennung nicht
 * auseinanderlaufen. Die Kennung wird bei jedem Aufruf frisch geholt —
 * sie darf nicht aus einem Zustand kommen, der von einem anderen Request
 * stammen koennte.
 */
function eb_assistent_sprachrahmen( $eimer, array $extra = array() ) {
    return array_merge( array(
        'eimer'      => $eimer,
        'kennung'    => 'u' . (int) get_current_user_id(),
        'proMinute'  => EB_ASSISTENT_STIMME_PRO_MINUTE,
        'proTag'     => EB_ASSISTENT_STIMME_PRO_TAG,
        'maxZeichen' => EB_ASSISTENT_STIMME_ZEICHEN,
        'maxBytes'   => EB_ASSISTENT_GEHOER_MAX,
    ), $extra );
}

add_action( 'rest_api_init', function () {
    register_rest_route( 'eventboerse/v1', '/assistent/stimme', array(
        'methods'             => 'POST',
        'callback'            => 'eb_assistent_stimme',
        'permission_callback' => 'is_user_logged_in',
        'args'                => array(
            'text' => array( 'required' => true, 'type' => 'string' ),
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/assistent/gehoer', array(
        'methods'             => 'POST',
        'callback'            => 'eb_assistent_gehoer',
        'permission_callback' => 'is_user_logged_in',
        'args'                => array(
            'audio' => array( 'required' => true, 'type' => 'string' ),
        ),
    ) );
} );

function eb_assistent_stimme( WP_REST_Request $request ) {
    list( $daten, $status ) = eb_sprachdienst_ausgeben(
        $request->get_param( 'text' ),
        eb_assistent_sprachrahmen( 'assistent_stimme' )
    );
    return new WP_REST_Response( $daten, $status );
}

function eb_assistent_gehoer( WP_REST_Request $request ) {
    list( $daten, $status ) = eb_sprachdienst_hoeren(
        $request->get_param( 'audio' ),
        eb_assistent_sprachrahmen( 'assistent_gehoer' )
    );
    return new WP_REST_Response( $daten, $status );
}
