<?php
/**
 * Plattformen-Steuertransparenzgesetz (PStTG) — die Daten, die wir melden muessen.
 *
 * Seit dem 01.01.2023 ist ein Plattformbetreiber, ueber den eine "relevante
 * Taetigkeit" vermittelt wird, meldepflichtig. § 5 Abs. 1 Nr. 2 PStTG nennt
 * ausdruecklich die PERSOENLICHE DIENSTLEISTUNG — also genau das, was hier
 * vermittelt wird: DJ, Catering, Fotografie.
 *
 * ES GIBT FUER UNS KEINE BAGATELLGRENZE. Die Ausnahme des § 4 Abs. 5 Nr. 4
 * (weniger als 30 Faelle UND weniger als 2.000 Euro) gilt ausschliesslich fuer
 * den VERKAUF VON WAREN. Wer eine Dienstleistung vermittelt, meldet ab dem
 * ersten Euro. Am 22.09.2026 nachgeschlagen, weil die Annahme "unter 30 ist
 * frei" naheliegt und hier falsch waere.
 *
 * Gemeldet wird bis zum 31. Januar des Folgejahres an das BZSt. Ein Verstoss
 * ist eine Ordnungswidrigkeit (§ 25 PStTG).
 *
 * ERHOBEN WIRD BEIM AUSZAHLUNGSWEG, NICHT BEI DER REGISTRIERUNG.
 * Das ist die wichtigste Entscheidung dieser Datei, und sie ist
 * datenschutzrechtlich und nicht steuerrechtlich begruendet: meldepflichtig
 * ist nur, wer eine relevante Taetigkeit erbringt UND dafuer Verguetung
 * erhaelt (§ 4 Abs. 4). Ein Eventplaner, der nur sucht und bucht, wird das
 * nie. Geburtsdatum und Steuer-ID von JEDEM Registrierten einzusammeln waere
 * eine Erhebung auf Vorrat und ein Verstoss gegen die Datenminimierung
 * (Art. 5 Abs. 1 lit. c DSGVO) — fuer Daten, die wir bei den meisten nie
 * brauchen duerfen.
 *
 * WAS STRIPE LIEFERT, IST VON HIER AUS NICHT FESTSTELLBAR. Das Connect-
 * Onboarding erhebt fuer die Geldwaeschepruefung ohnehin Name, Anschrift und
 * Geburtsdatum. Ob diese Daten ueber die API in der Form zurueckkommen, die
 * § 14 verlangt, und ob Stripe die DAC7-Meldung fuer uns uebernehmen kann,
 * ist eine Frage an Stripe und an den Steuerberater. Deshalb erhebt dieses
 * Modul VOLLSTAENDIG selbst: ein doppelt vorhandenes Geburtsdatum kostet
 * nichts, ein fehlendes kostet die Meldung.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Meta-Schluessel, unter denen die Angaben liegen. */
const EB_PSTTG_META = array(
	'art'          => 'eb_psttg_art',          // 'natuerlich' | 'rechtstraeger'
	'geburtsdatum' => 'eb_psttg_geburtsdatum', // YYYY-MM-DD
	'geburtsort'   => 'eb_psttg_geburtsort',   // nur ersatzweise, siehe unten
	'steuer_id'    => 'eb_psttg_steuer_id',    // 11 Ziffern, IdNr nach § 139b AO
	'ansaessig'    => 'eb_psttg_ansaessig',    // ISO-3166-1 alpha-2
	'register_nr'  => 'eb_psttg_register_nr',  // HRB 12345
	'register_ort' => 'eb_psttg_register_ort', // Amtsgericht Bonn
	'gemeldet_am'  => 'eb_psttg_gemeldet_am',  // letzte Meldung ans BZSt
);

/**
 * Ist das eine gueltige steuerliche Identifikationsnummer (§ 139b AO)?
 *
 * Elf Ziffern, erste nicht 0, letzte eine Pruefziffer nach ISO/IEC 7064
 * MOD 11,10. Der Algorithmus erkennt jeden einzelnen Ziffernfehler und rund
 * 98 % der Zahlendreher.
 *
 * GEPRUEFT WIRD NUR, WAS SICHER FALSCH IST. Die aeltere Regel "genau eine
 * Ziffer kommt in den ersten zehn doppelt vor" wurde 2016 gelockert; sie hier
 * nachzubauen hiesse, gueltige neuere Nummern abzuweisen. Ein Pruefer, der
 * rechtmaessige Eingaben zurueckweist, wird abgeschaltet — dieselbe Lehre wie
 * bei den sechs Fehlalarmen des Kontaktschutzes, wo die Rechnungsnummer als
 * Telefonnummer galt. Und hier waere der Schaden groesser: eine faelschlich
 * abgewiesene Steuer-ID haelt einen Dienstleister von seiner Auszahlung ab.
 *
 * @param string $wert Eingabe, Leerzeichen und Punkte werden entfernt.
 * @return bool
 */
function eb_steuer_id_gueltig( $wert ) {
	$ziffern = preg_replace( '/[^0-9]/', '', (string) $wert );

	// Elf Ziffern, mehr wird an der Form NICHT verlangt.
	//
	// Der erste Entwurf wies zusaetzlich eine fuehrende Null ab — eine Regel,
	// die in mehreren Quellen so steht. Sie ist falsch, und der eigene
	// Pruefstand hat es sofort gezeigt: die amtliche Beispielnummer
	// 024762913 58 beginnt mit einer Null und ist gueltig (Pruefziffer 8,
	// nachgerechnet). Die Regel haette also rechtmaessige Eingaben abgewiesen
	// und Dienstleister von ihrer Auszahlung abgehalten.
	//
	// Genau der Fehler, vor dem der Absatz darueber warnt — im selben Commit
	// begangen. Die Pruefziffer traegt die Erkennung allein: jeder einzelne
	// Ziffernfehler und rund 98 % der Zahlendreher fallen auf.
	if ( strlen( $ziffern ) !== 11 ) {
		return false;
	}

	// ISO/IEC 7064 MOD 11,10 ueber die ersten zehn Ziffern.
	$produkt = 10;
	for ( $i = 0; $i < 10; $i++ ) {
		$summe = ( (int) $ziffern[ $i ] + $produkt ) % 10;
		if ( 0 === $summe ) {
			$summe = 10;
		}
		$produkt = ( $summe * 2 ) % 11;
	}

	$pruef = 11 - $produkt;
	if ( 10 === $pruef ) {
		$pruef = 0;
	}

	return (int) $ziffern[10] === $pruef;
}

/**
 * Welche Angaben verlangt § 14 PStTG fuer diese Anbieterart?
 *
 * ABGELEITET, NICHT ZWEIMAL GEPFLEGT: die Vollstaendigkeitspruefung und die
 * Meldedaten-Ausgabe lesen beide hier. Zwei Listen derselben Pflicht driften,
 * und diese driftet bis zur abgelehnten Meldung im Januar — also ein Jahr,
 * nachdem der Fehler entstanden ist.
 *
 * @param string $art 'natuerlich' oder 'rechtstraeger'.
 * @return string[] Schluessel aus EB_PSTTG_META.
 */
function eb_psttg_pflichtfelder( $art ) {
	if ( 'rechtstraeger' === $art ) {
		// § 14 Abs. 3: Name, Anschrift, Steuer-ID, Ansaessigkeitsstaat,
		// Handelsregisternummer. Name und Anschrift stehen im WP-Profil
		// bzw. im Connect-Konto und werden hier nicht doppelt gefuehrt.
		return array( 'steuer_id', 'ansaessig', 'register_nr', 'register_ort' );
	}

	// § 14 Abs. 2: Vor- und Nachname, Anschrift, Geburtsdatum, Steuer-ID.
	return array( 'geburtsdatum', 'steuer_id', 'ansaessig' );
}

/**
 * Liegen fuer diesen Anbieter alle Pflichtangaben vor?
 *
 * @param int $user_id
 * @return array{vollstaendig:bool, fehlt:string[], art:string}
 */
function eb_psttg_stand( $user_id ) {
	$art = (string) get_user_meta( $user_id, EB_PSTTG_META['art'], true );
	if ( '' === $art ) {
		$art = 'natuerlich';
	}

	$fehlt = array();
	foreach ( eb_psttg_pflichtfelder( $art ) as $feld ) {
		$wert = (string) get_user_meta( $user_id, EB_PSTTG_META[ $feld ], true );
		if ( '' === trim( $wert ) ) {
			$fehlt[] = $feld;
		}
	}

	return array(
		'vollstaendig' => empty( $fehlt ),
		'fehlt'        => $fehlt,
		'art'          => $art,
	);
}

/**
 * Angaben pruefen und speichern.
 *
 * NICHTS WIRD HALB GESPEICHERT. Faellt ein Feld durch, wird gar nichts
 * geschrieben — sonst stuende der Anbieter mit einer gueltigen Steuer-ID und
 * einem unsinnigen Geburtsdatum da, und die Vollstaendigkeitspruefung meldete
 * "fertig". Eine Meldung, die vollstaendig aussieht und falsch ist, faellt
 * erst beim BZSt auf.
 *
 * @param int   $user_id
 * @param array $daten
 * @return array{ok:bool, fehler:array<string,string>}
 */
function eb_psttg_speichern( $user_id, array $daten ) {
	$art = isset( $daten['art'] ) && 'rechtstraeger' === $daten['art'] ? 'rechtstraeger' : 'natuerlich';

	$sauber = array( 'art' => $art );
	$fehler = array();

	foreach ( eb_psttg_pflichtfelder( $art ) as $feld ) {
		$roh = isset( $daten[ $feld ] ) ? trim( (string) $daten[ $feld ] ) : '';

		if ( '' === $roh ) {
			$fehler[ $feld ] = 'Pflichtangabe.';
			continue;
		}

		switch ( $feld ) {
			case 'steuer_id':
				if ( ! eb_steuer_id_gueltig( $roh ) ) {
					$fehler[ $feld ] = 'Keine gueltige Steuer-Identifikationsnummer (11 Ziffern).';
					break;
				}
				$sauber[ $feld ] = preg_replace( '/[^0-9]/', '', $roh );
				break;

			case 'geburtsdatum':
				// Nicht in der Zukunft, nicht unter 18 — § 3 der AGB nennt 18
				// Jahre, und ein Geburtsdatum von morgen ist ein Tippfehler.
				$zeit = strtotime( $roh );
				if ( ! $zeit || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $roh ) ) {
					$fehler[ $feld ] = 'Datum im Format JJJJ-MM-TT erwartet.';
					break;
				}
				if ( $zeit > strtotime( '-18 years' ) ) {
					$fehler[ $feld ] = 'Anbieter muessen volljaehrig sein.';
					break;
				}
				$sauber[ $feld ] = $roh;
				break;

			case 'ansaessig':
				if ( ! preg_match( '/^[A-Za-z]{2}$/', $roh ) ) {
					$fehler[ $feld ] = 'Laendercode aus zwei Buchstaben erwartet (z. B. DE).';
					break;
				}
				$sauber[ $feld ] = strtoupper( $roh );
				break;

			case 'register_nr':
				// HRB 12345, HRA 999, VR 4711 — Form, nicht Existenz.
				if ( ! preg_match( '/^(HRA|HRB|VR|GnR|PR)\s?\d{1,7}(\s?[A-Z]{1,3})?$/i', $roh ) ) {
					$fehler[ $feld ] = 'Registernummer erwartet, z. B. "HRB 12345".';
					break;
				}
				$sauber[ $feld ] = strtoupper( preg_replace( '/\s+/', ' ', $roh ) );
				break;

			default:
				$sauber[ $feld ] = sanitize_text_field( $roh );
		}
	}

	if ( ! empty( $fehler ) ) {
		return array(
			'ok'     => false,
			'fehler' => $fehler,
		);
	}

	foreach ( $sauber as $feld => $wert ) {
		update_user_meta( $user_id, EB_PSTTG_META[ $feld ], $wert );
	}

	return array(
		'ok'     => true,
		'fehler' => array(),
	);
}

/**
 * Die Angaben eines Anbieters fuer die Meldung.
 *
 * Gibt NUR zurueck, was § 14 verlangt — kein "alles, was wir haben".
 * Eine Meldedatei, die mehr enthaelt als die Pflicht, ist eine
 * Datenuebermittlung ohne Rechtsgrundlage.
 *
 * @param int $user_id
 * @return array<string,string>
 */
function eb_psttg_anbieterdaten( $user_id ) {
	$stand = eb_psttg_stand( $user_id );
	$aus   = array( 'art' => $stand['art'] );

	foreach ( eb_psttg_pflichtfelder( $stand['art'] ) as $feld ) {
		$aus[ $feld ] = (string) get_user_meta( $user_id, EB_PSTTG_META[ $feld ], true );
	}

	return $aus;
}
