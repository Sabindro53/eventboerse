<?php
/**
 * Pruefstand fuer die PStTG-Datenerhebung — fuehrt den echten Quelltext aus.
 *
 * Dieselbe Anordnung wie social.php, erstattung-rechte und csp-nonce.php:
 * nur die Griffe stellen, die das Modul wirklich braucht. Je mehr ein
 * Pruefstand stellt, desto weniger prueft er.
 */

$GLOBALS['meta'] = array();

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

function get_user_meta( $uid, $key, $single = false ) {
	return $GLOBALS['meta'][ $uid ][ $key ] ?? '';
}

function update_user_meta( $uid, $key, $value ) {
	$GLOBALS['meta'][ $uid ][ $key ] = $value;
	return true;
}

function sanitize_text_field( $s ) {
	return trim( strip_tags( (string) $s ) );
}

require_once __DIR__ . '/../../includes/steuer/psttg.php';

$faelle = array();
function pruefe( $name, $ist, $soll ) {
	$GLOBALS['faelle'][] = array(
		'name' => $name,
		'ok'   => $ist === $soll,
		'ist'  => $ist,
		'soll' => $soll,
	);
}

// ── 1 · Pruefziffer der Steuer-ID ────────────────────────────────────────
// 02476291358 ist die Beispielnummer aus der amtlichen Dokumentation zur
// IdNr nach § 139b AO. Sie MUSS durchgehen, sonst weist der Pruefstand
// rechtmaessige Eingaben ab — und das ist die gefaehrliche Richtung.
pruefe( 'amtliche Beispielnummer gilt', eb_steuer_id_gueltig( '02476291358' ), true );
pruefe( 'mit Leerzeichen gilt auch', eb_steuer_id_gueltig( '024 762 913 58' ), true );
pruefe( 'falsche Pruefziffer faellt durch', eb_steuer_id_gueltig( '02476291359' ), false );
pruefe( 'zehn Ziffern sind zu wenig', eb_steuer_id_gueltig( '0247629135' ), false );
// Eine fuehrende Null ist erlaubt — die amtliche Beispielnummer hat eine.
// Der erste Entwurf verbot sie und wies damit genau diese Nummer ab.
pruefe( 'lauter Nullen hat die falsche Pruefziffer', eb_steuer_id_gueltig( '00000000000' ), false );
pruefe( 'zweite gueltige Nummer gilt', eb_steuer_id_gueltig( '12345678903' ), true );
pruefe( 'dritte gueltige Nummer gilt', eb_steuer_id_gueltig( '86123456784' ), true );
pruefe( 'Buchstaben sind keine Nummer', eb_steuer_id_gueltig( 'DE123456789' ), false );
pruefe( 'leer ist keine Nummer', eb_steuer_id_gueltig( '' ), false );

// Zahlendreher: MOD 11,10 erkennt rund 98 % davon. Der Dreher 24 -> 42 an
// Position 2/3 muss auffallen.
pruefe( 'Zahlendreher faellt auf', eb_steuer_id_gueltig( '04276291358' ), false );

// ── 2 · Pflichtfelder haengen an der Anbieterart ─────────────────────────
$nat = eb_psttg_pflichtfelder( 'natuerlich' );
$jur = eb_psttg_pflichtfelder( 'rechtstraeger' );
pruefe( 'natuerliche Person braucht das Geburtsdatum', in_array( 'geburtsdatum', $nat, true ), true );
pruefe( 'natuerliche Person braucht keine Registernummer', in_array( 'register_nr', $nat, true ), false );
pruefe( 'Rechtstraeger braucht die Registernummer', in_array( 'register_nr', $jur, true ), true );
pruefe( 'Rechtstraeger braucht kein Geburtsdatum', in_array( 'geburtsdatum', $jur, true ), false );
pruefe( 'beide brauchen die Steuer-ID', in_array( 'steuer_id', $nat, true ) && in_array( 'steuer_id', $jur, true ), true );
pruefe( 'beide brauchen den Ansaessigkeitsstaat', in_array( 'ansaessig', $nat, true ) && in_array( 'ansaessig', $jur, true ), true );

// ── 3 · Speichern prueft, und zwar alles oder nichts ─────────────────────
$r = eb_psttg_speichern( 1, array(
	'art'          => 'natuerlich',
	'geburtsdatum' => '1990-05-17',
	'steuer_id'    => '02476291358',
	'ansaessig'    => 'de',
) );
pruefe( 'gueltiger Satz wird angenommen', $r['ok'], true );
pruefe( 'Laendercode wird gross geschrieben', get_user_meta( 1, 'eb_psttg_ansaessig', true ), 'DE' );
pruefe( 'Satz ist danach vollstaendig', eb_psttg_stand( 1 )['vollstaendig'], true );

// Eine kaputte Steuer-ID darf NICHTS schreiben — auch nicht das gueltige
// Geburtsdatum daneben. Sonst stuende der Anbieter halb erfasst da und die
// Vollstaendigkeitspruefung melde "fertig".
$r = eb_psttg_speichern( 2, array(
	'art'          => 'natuerlich',
	'geburtsdatum' => '1990-05-17',
	'steuer_id'    => '02476291359',
	'ansaessig'    => 'DE',
) );
pruefe( 'kaputte Steuer-ID wird abgewiesen', $r['ok'], false );
pruefe( 'der Fehler nennt das Feld', isset( $r['fehler']['steuer_id'] ), true );
pruefe( 'nichts wurde halb geschrieben', get_user_meta( 2, 'eb_psttg_geburtsdatum', true ), '' );

// ── 4 · Grenzen der einzelnen Felder ─────────────────────────────────────
$r = eb_psttg_speichern( 3, array(
	'art'          => 'natuerlich',
	'geburtsdatum' => '2020-01-01',
	'steuer_id'    => '02476291358',
	'ansaessig'    => 'DE',
) );
pruefe( 'Minderjaehriger wird abgewiesen', isset( $r['fehler']['geburtsdatum'] ), true );

$r = eb_psttg_speichern( 4, array(
	'art'          => 'natuerlich',
	'geburtsdatum' => '17.05.1990',
	'steuer_id'    => '02476291358',
	'ansaessig'    => 'DE',
) );
pruefe( 'deutsches Datumsformat wird abgewiesen', isset( $r['fehler']['geburtsdatum'] ), true );

$r = eb_psttg_speichern( 5, array(
	'art'          => 'rechtstraeger',
	'steuer_id'    => '02476291358',
	'ansaessig'    => 'DE',
	'register_nr'  => 'hrb 12345',
	'register_ort' => 'Amtsgericht Bonn',
) );
pruefe( 'Rechtstraeger wird angenommen', $r['ok'], true );
pruefe( 'Registernummer wird normiert', get_user_meta( 5, 'eb_psttg_register_nr', true ), 'HRB 12345' );

$r = eb_psttg_speichern( 6, array(
	'art'          => 'rechtstraeger',
	'steuer_id'    => '02476291358',
	'ansaessig'    => 'DE',
	'register_nr'  => 'irgendwas',
	'register_ort' => 'Amtsgericht Bonn',
) );
pruefe( 'unsinnige Registernummer faellt durch', isset( $r['fehler']['register_nr'] ), true );

// ── 5 · Der Stand eines unerfassten Anbieters ────────────────────────────
$stand = eb_psttg_stand( 99 );
pruefe( 'unerfasst ist nicht vollstaendig', $stand['vollstaendig'], false );
pruefe( 'unerfasst nennt die fehlenden Felder', count( $stand['fehlt'] ) >= 3, true );

// ── 6 · Die Meldedaten fuehren nur die Pflicht ───────────────────────────
$daten = eb_psttg_anbieterdaten( 1 );
pruefe( 'Meldedaten tragen die Steuer-ID', $daten['steuer_id'], '02476291358' );
pruefe( 'Meldedaten tragen kein Registerfeld bei natuerlicher Person', isset( $daten['register_nr'] ), false );

echo json_encode( $GLOBALS['faelle'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT );
