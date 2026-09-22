<?php
/**
 * Pruefstand fuer die Provisionsrechnung — fuehrt den echten Quelltext aus.
 *
 * Eine Rechnung, deren Pflichtangaben nur GELESEN werden, ist nicht geprueft.
 * Der teure Fehler ist nicht der Syntaxfehler, sondern der Beleg, dem eine
 * Pflichtangabe fehlt — und der sieht im Diff genauso aus wie ein richtiger.
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

$GLOBALS['optionen'] = array();

function get_option( $name, $vorgabe = false ) {
	return array_key_exists( $name, $GLOBALS['optionen'] ) ? $GLOBALS['optionen'][ $name ] : $vorgabe;
}
function add_option( $name, $wert, $x = '', $autoload = 'yes' ) {
	if ( ! array_key_exists( $name, $GLOBALS['optionen'] ) ) {
		$GLOBALS['optionen'][ $name ] = $wert;
	}
	return true;
}
function wp_cache_delete( $k, $g = '' ) {
	return true;
}

/** Minimale $wpdb-Attrappe: das atomare UPDATE wirklich ausfuehren. */
class EB_Wpdb_Test {
	public $options = 'wp_options';

	public function prepare( $sql, ...$args ) {
		foreach ( $args as $a ) {
			$sql = preg_replace( '/%s/', "'" . $a . "'", $sql, 1 );
		}
		return $sql;
	}

	public function query( $sql ) {
		// Wir bilden genau das eine Statement nach, das das Modul fährt.
		if ( preg_match( "/SET option_value = option_value \+ 1 WHERE option_name = '([^']+)'/", $sql, $m ) ) {
			$GLOBALS['optionen'][ $m[1] ] = (string) ( (int) ( $GLOBALS['optionen'][ $m[1] ] ?? 0 ) + 1 );
			return 1;
		}
		// Ein Pruefstand, der eine unverstandene Abfrage mit null beantwortet,
		// gibt Entwarnung fuer Code, den er nie ausgefuehrt hat.
		throw new Exception( 'Unerwartete Abfrage im Pruefstand: ' . $sql );
	}
}
$GLOBALS['wpdb'] = new EB_Wpdb_Test();

// Die Konstanten setzt der Aufrufer ueber die Umgebung — so kann derselbe
// Pruefstand den Fall "nicht eingerichtet" fahren.
if ( getenv( 'EB_TEST_OHNE_STEUERNUMMER' ) !== '1' ) {
	define( 'EB_UST_ID', 'DE123456789' );
	define( 'EB_STEUERNUMMER', '220/5678/1234' );
}

require_once __DIR__ . '/../../includes/steuer/provisionsrechnung.php';

$GLOBALS['faelle'] = array();
function pruefe( $name, $ist, $soll ) {
	$GLOBALS['faelle'][] = array(
		'name' => $name,
		'ok'   => $ist === $soll,
		'ist'  => $ist,
		'soll' => $soll,
	);
}

$basis = array(
	'user_id'        => 7,
	'provision_cent' => 11900,
	'leistungsdatum' => '2026-08-01',
	'bezeichnung'    => 'Vermittlung DJ-Buchung',
	'land'           => 'DE',
	'ust_id'         => '',
	'empfaenger'     => 'Muster Events GmbH, Beispielweg 1, 50667 Koeln',
);

if ( getenv( 'EB_TEST_OHNE_STEUERNUMMER' ) === '1' ) {
	// ── Fall: die UG hat noch keine Steuernummer ─────────────────────────
	$r = eb_provision_rechnung_aufbauen( $basis );
	pruefe( 'ohne Steuernummer wird keine Rechnung erzeugt', $r['ok'], false );
	pruefe( 'der Grund nennt die Konstante', (bool) strpos( $r['fehler'], 'EB_STEUERNUMMER' ), true );
	pruefe( 'und es wurde keine Nummer verbraucht', (int) get_option( 'eb_provision_rechnungsnr', 0 ), 0 );
	echo json_encode( $GLOBALS['faelle'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT );
	exit;
}

// ── 1 · Der Inlandsfall ──────────────────────────────────────────────────
$r = eb_provision_rechnung_aufbauen( $basis );
pruefe( 'Inlandsrechnung wird erzeugt', $r['ok'], true );
$re = $r['rechnung'];
pruefe( 'Steuerfall ist Inland', $re['steuerfall'], 'inland' );
// 119,00 brutto = 100,00 netto + 19,00 Steuer. Die Provision IST der
// Bruttobetrag — Stripe zieht genau ihn ab.
pruefe( 'Netto wird herausgerechnet, nicht aufgeschlagen', $re['nettoCent'], 10000 );
pruefe( 'Steuerbetrag stimmt', $re['steuerCent'], 1900 );
pruefe( 'Brutto bleibt der abgezogene Betrag', $re['bruttoCent'], 11900 );
pruefe( 'Netto plus Steuer ergibt Brutto', $re['nettoCent'] + $re['steuerCent'], $re['bruttoCent'] );
pruefe( 'Satz wird ausgewiesen', $re['satz'], 0.19 );
pruefe( 'kein Reverse-Charge-Hinweis im Inland', isset( $re['hinweis'] ), false );
pruefe( 'alle Pflichtangaben liegen vor', eb_provision_pflichtangaben_fehlen( $re ), array() );

// ── 2 · Die Rechnungsnummer ──────────────────────────────────────────────
pruefe( 'erste Nummer ist 1', $re['laufend'], 1 );
$r2 = eb_provision_rechnung_aufbauen( $basis );
pruefe( 'zweite Nummer ist 2', $r2['rechnung']['laufend'], 2 );
pruefe( 'die Nummern sind verschieden', $re['nummer'] === $r2['rechnung']['nummer'], false );
pruefe( 'die Nummer hat die vereinbarte Form',
	(bool) preg_match( '/^EB-P-\d{4}-\d{6}$/', $re['nummer'] ), true );

// ── 3 · Ein Fruehausstieg darf KEINE Nummer verbrauchen ──────────────────
$vorher = (int) get_option( 'eb_provision_rechnungsnr', 0 );
$r = eb_provision_rechnung_aufbauen( array_merge( $basis, array( 'provision_cent' => 0 ) ) );
pruefe( 'ohne Provision keine Rechnung', $r['ok'], false );
$r = eb_provision_rechnung_aufbauen( array_merge( $basis, array( 'leistungsdatum' => '' ) ) );
pruefe( 'ohne Leistungsdatum keine Rechnung', $r['ok'], false );
$r = eb_provision_rechnung_aufbauen( array_merge( $basis, array( 'land' => 'US' ) ) );
pruefe( 'unklarer Steuerfall wird abgewiesen', $r['ok'], false );
pruefe( 'und KEINE Nummer wurde dabei verbraucht',
	(int) get_option( 'eb_provision_rechnungsnr', 0 ), $vorher );

// ── 4 · Reverse Charge ───────────────────────────────────────────────────
$r = eb_provision_rechnung_aufbauen( array_merge( $basis, array(
	'land'   => 'AT',
	'ust_id' => 'ATU12345678',
) ) );
pruefe( 'EU-Anbieter mit USt-IdNr: Reverse Charge', $r['rechnung']['steuerfall'], 'reverse_charge' );
pruefe( 'keine Steuer ausgewiesen', $r['rechnung']['steuerCent'], 0 );
pruefe( 'Netto ist der volle Betrag', $r['rechnung']['nettoCent'], 11900 );
pruefe( 'der Pflichthinweis steht im Wortlaut', $r['rechnung']['hinweis'],
	'Steuerschuldnerschaft des Leistungsempfaengers' );
pruefe( 'auch hier sind die Pflichtangaben vollstaendig',
	eb_provision_pflichtangaben_fehlen( $r['rechnung'] ), array() );

// ── 5 · Steuerfall-Einordnung fuer sich ──────────────────────────────────
pruefe( 'DE ist Inland', eb_provision_steuerfall( 'DE', '' ), 'inland' );
pruefe( 'de klein geschrieben auch', eb_provision_steuerfall( 'de', '' ), 'inland' );
pruefe( 'EU ohne USt-IdNr ist unklar', eb_provision_steuerfall( 'AT', '' ), 'unklar' );
pruefe( 'EU mit fremder USt-IdNr ist unklar', eb_provision_steuerfall( 'AT', 'DE123456789' ), 'unklar' );
pruefe( 'Drittland ist unklar', eb_provision_steuerfall( 'CH', 'CHE123456789' ), 'unklar' );
pruefe( 'leeres Land ist unklar', eb_provision_steuerfall( '', '' ), 'unklar' );

// ── 6 · Der Pflichtangaben-Pruefer findet wirklich etwas ─────────────────
// Gegenprobe: ohne sie waere "alle Pflichtangaben liegen vor" auch dann
// gruen, wenn der Pruefer nie etwas meldet.
$kaputt = $re;
unset( $kaputt['empfaenger'] );
pruefe( 'fehlender Empfaenger faellt auf',
	count( eb_provision_pflichtangaben_fehlen( $kaputt ) ) > 0, true );
$kaputt = $re;
$kaputt['nummer'] = '';
pruefe( 'fehlende Rechnungsnummer faellt auf',
	count( eb_provision_pflichtangaben_fehlen( $kaputt ) ) > 0, true );
$kaputt = $re;
$kaputt['leistungsdatum'] = '';
pruefe( 'fehlendes Leistungsdatum faellt auf',
	count( eb_provision_pflichtangaben_fehlen( $kaputt ) ) > 0, true );
$kaputt = $r['rechnung'];
unset( $kaputt['hinweis'] );
pruefe( 'Reverse Charge ohne Pflichthinweis faellt auf',
	count( eb_provision_pflichtangaben_fehlen( $kaputt ) ) > 0, true );

// ── 7 · Rundung bleibt centgenau ─────────────────────────────────────────
foreach ( array( 1, 7, 333, 999, 1234, 99999 ) as $cent ) {
	$x = eb_provision_rechnung_aufbauen( array_merge( $basis, array( 'provision_cent' => $cent ) ) );
	$re2 = $x['rechnung'];
	pruefe( "Netto+Steuer=Brutto bei {$cent} Cent",
		$re2['nettoCent'] + $re2['steuerCent'], $cent );
}

echo json_encode( $GLOBALS['faelle'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT );
