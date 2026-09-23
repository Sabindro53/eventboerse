<?php
/**
 * REST-Routen fuer die PStTG-Angaben.
 *
 * Regeln, die fuer alle Routen hier gelten und deshalb nur einmal dastehen:
 *
 * · JEDER SIEHT NUR SEINE EIGENEN ANGABEN. Geburtsdatum und
 *   Steueridentifikationsnummer sind besonders sensibel; eine Route, die sie
 *   nach einer Nutzer-ID herausgibt, waere ein Auskunftsdienst. Die Kennung
 *   kommt deshalb NIE aus dem Rumpf, immer aus der Sitzung.
 *
 * · DIE MELDEDATEN SIND ADMIN-ONLY. `/psttg/meldung` gibt die Angaben ALLER
 *   Anbieter aus — das ist die Datei fuer den Steuerberater und sonst
 *   niemanden. Sie haengt an `manage_options`, nicht an einer Rolle, die man
 *   sich im Profil geben kann.
 *
 * · DIE STEUER-ID WIRD NIE ZURUECKGEGEBEN. Auch nicht dem Eigentuemer.
 *   Angezeigt wird, DASS sie hinterlegt ist, und die letzten vier Ziffern —
 *   genug, um zu erkennen, ob die richtige dasteht, zu wenig, um sie aus
 *   einer uebernommenen Sitzung mitzunehmen. Dieselbe Regel wie beim
 *   Geheimnis-Scanner, der sechs Zeichen und die Laenge meldet.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Die letzten vier Ziffern, der Rest maskiert. Nie die ganze Nummer. */
function eb_psttg_maske( $nummer ) {
	$n = (string) $nummer;
	if ( strlen( $n ) < 4 ) {
		return '';
	}
	return str_repeat( '•', strlen( $n ) - 4 ) . substr( $n, -4 );
}

/**
 * Der eigene Stand: was fehlt noch, bevor eine Auszahlung gemeldet werden kann?
 */
function eb_psttg_route_stand( WP_REST_Request $request ) {
	$uid = get_current_user_id();
	if ( ! $uid ) {
		return new WP_REST_Response( array( 'message' => 'Nicht angemeldet.' ), 401 );
	}

	$stand = eb_psttg_stand( $uid );
	$id    = (string) get_user_meta( $uid, EB_PSTTG_META['steuer_id'], true );

	return new WP_REST_Response(
		array(
			'art'          => $stand['art'],
			'vollstaendig' => $stand['vollstaendig'],
			'fehlt'        => $stand['fehlt'],
			'steuerIdMaske' => eb_psttg_maske( $id ),
			'geburtsdatum' => (string) get_user_meta( $uid, EB_PSTTG_META['geburtsdatum'], true ),
			'ansaessig'    => (string) get_user_meta( $uid, EB_PSTTG_META['ansaessig'], true ),
			'registerNr'   => (string) get_user_meta( $uid, EB_PSTTG_META['register_nr'], true ),
			'registerOrt'  => (string) get_user_meta( $uid, EB_PSTTG_META['register_ort'], true ),
		),
		200
	);
}

/** Die eigenen Angaben setzen. */
function eb_psttg_route_speichern( WP_REST_Request $request ) {
	$uid = get_current_user_id();
	if ( ! $uid ) {
		return new WP_REST_Response( array( 'message' => 'Nicht angemeldet.' ), 401 );
	}

	$p = (array) $request->get_json_params();

	// Die Kennung kommt aus der Sitzung, nie aus dem Rumpf. Ein `user_id` im
	// Body waere der Weg, fremde Steuerdaten zu ueberschreiben.
	$r = eb_psttg_speichern( $uid, $p );

	if ( ! $r['ok'] ) {
		return new WP_REST_Response(
			array(
				'message' => 'Bitte pruefe die markierten Angaben.',
				'fehler'  => $r['fehler'],
			),
			422
		);
	}

	return eb_psttg_route_stand( $request );
}

/**
 * Die Meldedaten fuer das BZSt — nur Administratoren.
 *
 * Gibt fuer jeden Anbieter mit hinterlegten Angaben die Felder des § 14
 * aus. Die eigentliche Uebermittlung laeuft ueber das BZStOnline-Portal und
 * ist Sache des Steuerberaters; diese Route liefert die Grundlage dafuer,
 * damit sie nicht aus der Datenbank zusammengesucht werden muss.
 *
 * WER OHNE ANGABEN DASTEHT, WIRD MITGEZAEHLT. Eine Ausgabe, die nur die
 * vollstaendigen Anbieter fuehrt, sieht im Januar vollstaendig aus und ist es
 * nicht — dieselbe Klasse wie ein Journal, das nur Erfolge kennt.
 */
function eb_psttg_route_meldung( WP_REST_Request $request ) {
	$jahr = (int) ( $request->get_param( 'jahr' ) ?: gmdate( 'Y' ) - 1 );

	$anbieter = array();
	$offen    = array();

	foreach ( get_users( array( 'fields' => array( 'ID', 'display_name' ) ) ) as $u ) {
		$uid = (int) $u->ID;

		// Nur wer ein Connect-Konto hat, kann Verguetung erhalten haben —
		// und nur dann entsteht die Meldepflicht.
		$connect = (string) get_user_meta( $uid, 'eb_stripe_account_id', true );
		if ( '' === $connect ) {
			continue;
		}

		$stand = eb_psttg_stand( $uid );
		if ( ! $stand['vollstaendig'] ) {
			$offen[] = array(
				'userId' => $uid,
				'name'   => (string) $u->display_name,
				'fehlt'  => $stand['fehlt'],
			);
			continue;
		}

		$anbieter[] = array_merge(
			array(
				'userId' => $uid,
				'name'   => (string) $u->display_name,
			),
			eb_psttg_anbieterdaten( $uid )
		);
	}

	return new WP_REST_Response(
		array(
			'jahr'        => $jahr,
			'anbieter'    => $anbieter,
			'ohneAngaben' => $offen,
			'hinweis'     => 'Fuer vermittelte persoenliche Dienstleistungen gilt keine '
				. 'Bagatellgrenze (§ 4 Abs. 5 Nr. 4 PStTG betrifft nur Warenverkauf). '
				. 'Meldefrist: 31. Januar des Folgejahres.',
		),
		200
	);
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'eventboerse/v1',
			'/psttg/stand',
			array(
				'methods'             => 'GET',
				'callback'            => 'eb_psttg_route_stand',
				'permission_callback' => 'is_user_logged_in',
			)
		);

		register_rest_route(
			'eventboerse/v1',
			'/psttg/stand',
			array(
				'methods'             => 'POST',
				'callback'            => 'eb_psttg_route_speichern',
				'permission_callback' => 'is_user_logged_in',
			)
		);

		register_rest_route(
			'eventboerse/v1',
			'/psttg/meldung',
			array(
				'methods'             => 'GET',
				'callback'            => 'eb_psttg_route_meldung',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);
