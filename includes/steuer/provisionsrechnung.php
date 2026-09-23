<?php
/**
 * Die Rechnung ueber unsere Vermittlungsprovision (§ 14 UStG).
 *
 * BEFUND VOM 22.09.2026: Die Provision wurde ueber `application_fee_amount`
 * von Stripe abgezogen und NIE in Rechnung gestellt. Es floss Geld fuer eine
 * Leistung, fuer die kein Beleg existierte. `eb_send_invoice()` ist die
 * Buchungsbestaetigung ueber die EVENTLEISTUNG, `downloadBusinessInvoice()`
 * eine Selbstauskunft des Dienstleisters mit einer Abzugszeile — beide sind
 * keine Rechnung von uns an ihn.
 *
 * Die Folge hatte zwei Seiten: der Dienstleister konnte die Provision nicht
 * als Vorsteuer ziehen, und wir hatten keinen Ausgangsbeleg fuer unsere
 * eigene Buchhaltung.
 *
 * OHNE STEUERNUMMER WIRD KEINE RECHNUNG ERZEUGT. § 14 Abs. 4 Nr. 2 verlangt
 * die Steuernummer oder die USt-IdNr des Leistenden. Beide hat eine UG in
 * Gruendung noch nicht. Eine Rechnung ohne sie ist keine Rechnung im Sinne
 * des Gesetzes — sie berechtigt den Empfaenger nicht zum Vorsteuerabzug und
 * muesste spaeter berichtigt werden. Deshalb faellt dieses Modul
 * ausdruecklich aus, statt einen Beleg zu erzeugen, der aussieht wie einer.
 *
 * Derselbe Opt-in-Weg wie bei EB_APPLE_TEAM_ID: die Konstanten stehen in
 * `wp-config.php`, nicht im Repo, und "nicht eingerichtet" sieht anders aus
 * als "eingerichtet".
 *
 *     define( 'EB_STEUERNUMMER', '220/5678/1234' );   // oder
 *     define( 'EB_UST_ID',       'DE123456789' );
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Regelsteuersatz. Die UG rechnet nach Regelbesteuerung ab, nicht nach § 19. */
const EB_PROVISION_UST_SATZ = 0.19;

/** Praefix der Rechnungsnummer. Aenderung bricht die Fortlaufendheit — siehe unten. */
const EB_PROVISION_NR_PRAEFIX = 'EB-P';

/**
 * Sind die Pflichtangaben des Leistenden ueberhaupt da?
 *
 * @return array{bereit:bool, fehlt:string[]}
 */
function eb_provision_absender() {
	$fehlt = array();

	$steuernummer = defined( 'EB_STEUERNUMMER' ) ? trim( (string) EB_STEUERNUMMER ) : '';
	$ust_id       = defined( 'EB_UST_ID' ) ? trim( (string) EB_UST_ID ) : '';

	// § 14 Abs. 4 Nr. 2: eines von beiden genuegt, aber eines muss da sein.
	if ( '' === $steuernummer && '' === $ust_id ) {
		$fehlt[] = 'EB_STEUERNUMMER oder EB_UST_ID';
	}

	// Eine USt-IdNr, die nicht wie eine aussieht, ist schlimmer als keine:
	// sie steht auf jedem Beleg und faellt erst beim Empfaenger auf.
	if ( '' !== $ust_id && ! preg_match( '/^DE\d{9}$/', $ust_id ) ) {
		$fehlt[] = 'EB_UST_ID hat nicht die Form DE + 9 Ziffern';
	}

	return array(
		'bereit' => empty( $fehlt ),
		'fehlt'  => $fehlt,
	);
}

/**
 * Wie ist die Provision an diesen Anbieter umsatzsteuerlich zu behandeln?
 *
 * Drei Faelle, und der dritte wird NICHT geraten:
 *
 * · `inland`         — Anbieter in Deutschland: 19 % ausweisen.
 * · `reverse_charge` — Anbieter im uebrigen EU-Gemeinschaftsgebiet MIT
 *                      gueltiger USt-IdNr: die Steuerschuld geht auf ihn
 *                      ueber (§ 13b UStG / Art. 196 MwStSystRL). Der Hinweis
 *                      "Steuerschuldnerschaft des Leistungsempfaengers" ist
 *                      dann Pflichtangabe nach § 14a Abs. 5 UStG.
 * · `unklar`         — alles andere. Drittland, fehlende oder unplausible
 *                      USt-IdNr, unbekannter Staat.
 *
 * DER DRITTE FALL WIRD GEMELDET, NICHT GESCHAETZT. Eine falsch angewandte
 * Reverse-Charge-Regel ist keine Formalie: wer sie zu Unrecht anwendet,
 * schuldet die Steuer trotzdem und hat sie nicht eingenommen. Lieber ein
 * Posten, den ein Mensch ansieht, als ein Beleg, der falsch aussieht wie
 * ein richtiger.
 *
 * @param string $land   ISO-3166-1 alpha-2 des Anbieters.
 * @param string $ust_id USt-IdNr des Anbieters, falls vorhanden.
 * @return string 'inland' | 'reverse_charge' | 'unklar'
 */
function eb_provision_steuerfall( $land, $ust_id ) {
	$land   = strtoupper( trim( (string) $land ) );
	$ust_id = strtoupper( preg_replace( '/\s+/', '', (string) $ust_id ) );

	if ( 'DE' === $land ) {
		return 'inland';
	}

	// Stand 2026. Eine Liste, die man pflegen muss — aber eine falsche
	// Zugehoerigkeit faellt als `unklar` auf, nicht als falscher Beleg.
	$eu = array(
		'AT', 'BE', 'BG', 'CY', 'CZ', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
		'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT',
		'RO', 'SE', 'SI', 'SK',
	);

	if ( in_array( $land, $eu, true ) && preg_match( '/^' . preg_quote( $land, '/' ) . '[0-9A-Z]{8,12}$/', $ust_id ) ) {
		return 'reverse_charge';
	}

	return 'unklar';
}

/**
 * Die naechste Rechnungsnummer — fortlaufend und einmalig (§ 14 Abs. 4 Nr. 4).
 *
 * "Fortlaufend" heisst nicht "irgendwie aufsteigend". Zwei Eigenschaften
 * muessen halten, und beide gehen leicht kaputt:
 *
 * · EINMALIG. Zwei gleichzeitige Buchungen duerfen nicht dieselbe Nummer
 *   bekommen. Ein `get_option` + `update_option` hat genau dieses Rennen:
 *   beide lesen 41, beide schreiben 42. Deshalb zaehlt EIN atomares
 *   UPDATE hoch, und der neue Wert wird danach gelesen — die Datenbank
 *   arbitriert, nicht der zuletzt Angekommene. Dieselbe Begruendung wie
 *   beim bedingten UPDATE des gemeinsamen Plans.
 *
 * · LUECKENLOS, soweit es geht. Die Nummer wird erst vergeben, wenn die
 *   Rechnung wirklich angelegt wird. Scheitert der Schreibvorgang danach,
 *   entsteht eine Luecke — das ist hinnehmbar und muss dokumentiert sein,
 *   denn eine Luecke, die niemand erklaeren kann, sieht bei einer Pruefung
 *   aus wie eine geloeschte Rechnung. `eb_provision_luecken()` findet sie.
 *
 * @return int
 */
function eb_provision_naechste_nummer() {
	global $wpdb;

	$name = 'eb_provision_rechnungsnr';

	// Anlegen, falls es den Zaehler noch nicht gibt. autoload = no: der Wert
	// wird nur beim Abrechnen gebraucht, nicht bei jedem Seitenaufruf.
	if ( false === get_option( $name, false ) ) {
		add_option( $name, '0', '', 'no' );
	}

	// EIN Statement. Kein Lesen, Rechnen, Schreiben.
	$wpdb->query(
		$wpdb->prepare(
			"UPDATE {$wpdb->options} SET option_value = option_value + 1 WHERE option_name = %s",
			$name
		)
	);

	wp_cache_delete( $name, 'options' );

	return (int) get_option( $name, 0 );
}

/** Die Nummer, wie sie auf dem Beleg steht. */
function eb_provision_nummer_formatieren( $laufend, $jahr = null ) {
	$jahr = $jahr ?: (int) gmdate( 'Y' );
	return sprintf( '%s-%d-%06d', EB_PROVISION_NR_PRAEFIX, $jahr, (int) $laufend );
}

/**
 * Eine Provisionsrechnung aufbauen.
 *
 * VERGIBT NUR DANN EINE NUMMER, WENN DIE RECHNUNG WIRKLICH ENTSTEHT. Jeder
 * Fruehausstieg hier steht VOR dem Hochzaehlen — sonst risse jeder
 * abgewiesene Aufruf eine Luecke in die Nummernfolge, und Luecken muss man
 * bei einer Pruefung erklaeren koennen.
 *
 * @param array $eingabe {
 *     @type int    $user_id         Dienstleister.
 *     @type int    $brutto_cent     Der Zahlbetrag des Kunden.
 *     @type int    $provision_cent  Die einbehaltene Application Fee.
 *     @type string $leistungsdatum  YYYY-MM-DD, Tag der Vermittlung.
 *     @type string $bezeichnung     Was vermittelt wurde.
 *     @type string $land            ISO-Laendercode des Anbieters.
 *     @type string $ust_id          USt-IdNr des Anbieters, falls vorhanden.
 *     @type string $empfaenger      Name und Anschrift des Anbieters.
 * }
 * @return array{ok:bool, fehler?:string, rechnung?:array}
 */
function eb_provision_rechnung_aufbauen( array $eingabe ) {
	$absender = eb_provision_absender();
	if ( ! $absender['bereit'] ) {
		return array(
			'ok'     => false,
			'fehler' => 'Die Steuernummer der Plattform ist nicht hinterlegt ('
				. implode( ', ', $absender['fehlt'] ) . '). Ohne sie waere der Beleg '
				. 'keine Rechnung im Sinne des § 14 UStG.',
		);
	}

	$provision = (int) ( $eingabe['provision_cent'] ?? 0 );
	if ( $provision <= 0 ) {
		return array(
			'ok'     => false,
			'fehler' => 'Kein Provisionsbetrag — es gibt nichts abzurechnen.',
		);
	}

	$leistungsdatum = (string) ( $eingabe['leistungsdatum'] ?? '' );
	if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $leistungsdatum ) ) {
		// § 14 Abs. 4 Nr. 6: der Zeitpunkt der Leistung ist Pflichtangabe.
		return array(
			'ok'     => false,
			'fehler' => 'Leistungsdatum fehlt oder hat nicht die Form JJJJ-MM-TT.',
		);
	}

	$fall = eb_provision_steuerfall(
		(string) ( $eingabe['land'] ?? '' ),
		(string) ( $eingabe['ust_id'] ?? '' )
	);

	if ( 'unklar' === $fall ) {
		return array(
			'ok'     => false,
			'fehler' => 'Die umsatzsteuerliche Behandlung ist nicht eindeutig '
				. '(Land oder USt-IdNr des Anbieters unklar). Dieser Posten gehoert '
				. 'vor einen Menschen, nicht auf einen automatischen Beleg.',
		);
	}

	// Der abgezogene Betrag IST der Bruttobetrag unserer Leistung: Stripe
	// zieht genau ihn vom Zahlbetrag ab. Die Steuer ist darin enthalten,
	// also herausgerechnet — nicht aufgeschlagen. Wer hier aufschlaegt,
	// stellt mehr in Rechnung, als eingenommen wurde.
	if ( 'reverse_charge' === $fall ) {
		$netto = $provision;
		$steuer = 0;
		$satz  = 0.0;
	} else {
		$netto  = (int) round( $provision / ( 1 + EB_PROVISION_UST_SATZ ) );
		$steuer = $provision - $netto;
		$satz   = EB_PROVISION_UST_SATZ;
	}

	// Erst hier wird gezaehlt: ab jetzt entsteht die Rechnung wirklich.
	$laufend = eb_provision_naechste_nummer();

	$rechnung = array(
		'nummer'         => eb_provision_nummer_formatieren( $laufend ),
		'laufend'        => $laufend,
		'datum'          => gmdate( 'Y-m-d' ),
		'leistungsdatum' => $leistungsdatum,
		'empfaenger'     => (string) ( $eingabe['empfaenger'] ?? '' ),
		'empfaengerUstId' => (string) ( $eingabe['ust_id'] ?? '' ),
		'bezeichnung'    => (string) ( $eingabe['bezeichnung'] ?? 'Vermittlungsleistung' ),
		'steuerfall'     => $fall,
		'nettoCent'      => $netto,
		'steuerCent'     => $steuer,
		'bruttoCent'     => $provision,
		'satz'           => $satz,
		'steuernummer'   => defined( 'EB_STEUERNUMMER' ) ? (string) EB_STEUERNUMMER : '',
		'ustId'          => defined( 'EB_UST_ID' ) ? (string) EB_UST_ID : '',
	);

	// § 14a Abs. 5 UStG: bei Reverse Charge ist dieser Hinweis Pflicht, und
	// zwar im Wortlaut. Ohne ihn ist die Rechnung fehlerhaft, auch wenn die
	// Steuer richtig behandelt wurde.
	if ( 'reverse_charge' === $fall ) {
		$rechnung['hinweis'] = 'Steuerschuldnerschaft des Leistungsempfaengers';
	}

	return array(
		'ok'        => true,
		'rechnung'  => $rechnung,
	);
}

/**
 * Traegt dieser Beleg alle Pflichtangaben des § 14 Abs. 4 UStG?
 *
 * Gebaut als PRUEFER, nicht als Kommentar: eine Aufzaehlung im Fliesstext
 * altert und niemand merkt es. Der Prueflauf laeuft im Test gegen echte
 * Belege.
 *
 * @param array $r
 * @return string[] Was fehlt. Leer = vollstaendig.
 */
function eb_provision_pflichtangaben_fehlen( array $r ) {
	$fehlt = array();

	if ( '' === trim( (string) ( $r['empfaenger'] ?? '' ) ) ) {
		$fehlt[] = 'Name und Anschrift des Leistungsempfaengers (Nr. 1)';
	}
	if ( '' === trim( (string) ( $r['steuernummer'] ?? '' ) ) && '' === trim( (string) ( $r['ustId'] ?? '' ) ) ) {
		$fehlt[] = 'Steuernummer oder USt-IdNr des Leistenden (Nr. 2)';
	}
	if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $r['datum'] ?? '' ) ) ) {
		$fehlt[] = 'Ausstellungsdatum (Nr. 3)';
	}
	if ( '' === trim( (string) ( $r['nummer'] ?? '' ) ) ) {
		$fehlt[] = 'fortlaufende Rechnungsnummer (Nr. 4)';
	}
	if ( '' === trim( (string) ( $r['bezeichnung'] ?? '' ) ) ) {
		$fehlt[] = 'Art der Leistung (Nr. 5)';
	}
	if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $r['leistungsdatum'] ?? '' ) ) ) {
		$fehlt[] = 'Zeitpunkt der Leistung (Nr. 6)';
	}
	if ( ! isset( $r['nettoCent'] ) || (int) $r['nettoCent'] <= 0 ) {
		$fehlt[] = 'Entgelt (Nr. 7)';
	}

	// Nr. 8: entweder Steuersatz UND Steuerbetrag, oder der Hinweis auf die
	// Steuerschuldnerschaft. Eines von beidem, nie keines.
	if ( 'reverse_charge' === ( $r['steuerfall'] ?? '' ) ) {
		if ( 'Steuerschuldnerschaft des Leistungsempfaengers' !== ( $r['hinweis'] ?? '' ) ) {
			$fehlt[] = 'Hinweis auf die Steuerschuldnerschaft (§ 14a Abs. 5)';
		}
	} elseif ( empty( $r['satz'] ) || ! isset( $r['steuerCent'] ) || (int) $r['steuerCent'] <= 0 ) {
		$fehlt[] = 'Steuersatz und Steuerbetrag (Nr. 8)';
	}

	return $fehlt;
}
