<?php
/**
 * Sprachdienst — EINE Fassung von Sprachausgabe und Spracherkennung.
 *
 * Bis zum 01.10.2026 standen beide ausschliesslich im HQ
 * (`eb_hq_stimme()` / `eb_hq_gehoer()`, rund 160 Zeilen in `functions.php`).
 * Der Assistent auf der Website brauchte dasselbe. Ihn mit einer Kopie zu
 * bedienen waere der kuerzere Weg und der falsche: in diesem Projekt sind
 * schon eine Sicherheitsliste, eine Testzahl, eine Icon-Liste, ein
 * Privacy-Manifest und eine Kategorientabelle auseinandergelaufen, weil
 * jemand dieselbe Sache zweimal gepflegt hat. Eine Kopie einer
 * Grenzwertliste driftet immer, und die Frage ist nur, in welche Richtung.
 *
 * Deshalb liegt die Mechanik hier und der RAHMEN beim Aufrufer. Was das HQ
 * und der Assistent unterscheidet, sind genau fuenf Zahlen und ein
 * Eimername — nicht die Logik.
 *
 * Die Eigenschaften, die beide Wege durchhalten:
 *
 * 1. DER SCHLUESSEL ERREICHT DEN BROWSER NIE. Text hin, Audio zurueck;
 *    Audio hin, Text zurueck.
 *
 * 2. OHNE SCHLUESSEL EIN EHRLICHES NEIN. Kein Fehler, kein leerer Klang:
 *    die Antwort sagt „nicht hinterlegt", und der Browser faellt sichtbar
 *    (bzw. hoerbar) auf die Stimme des Betriebssystems zurueck. Eine
 *    Sprachausgabe, die still bleibt, ist fuer den Nutzer von einem Absturz
 *    nicht zu unterscheiden.
 *
 * 3. DER TON LANDET NIE AUF DER PLATTE. Eine Sprachaufnahme, die als Datei
 *    liegen bleibt, ist ein personenbezogenes Datum mit unklarer
 *    Loeschfrist. Sie existiert hier nur fuer die Dauer des Aufrufs.
 *
 * 4. DER FEHLERTEXT DER GEGENSTELLE WIRD NICHT DURCHGEREICHT. Er nennt
 *    Organisationsnamen und Kontodetails.
 *
 * 5. GEDECKELT WIRD JE MINUTE **UND** JE TAG. Ein Minutendeckel allein
 *    laesst ein einzelnes Konto den Schluessel den ganzen Tag abbrennen —
 *    zwanzig pro Minute sind 28 800 am Tag. Sprachausgabe kostet je
 *    Zeichen, Erkennung je Sekunde; ein offenes Feld ist eine offene
 *    Rechnung.
 *
 * 6. DER EIMER HAENGT AM KONTO, NICHT AN DER LEITUNG — sofern der Aufrufer
 *    eine Kennung mitgibt. Hinter einem Reverse-Proxy bezeichnet
 *    `REMOTE_ADDR` alle Besucher gemeinsam; ein IP-gebundener Deckel waere
 *    dort entweder wirkungslos oder er sperrte Unbeteiligte. Dieselbe
 *    Begruendung wie bei den vier Sozial-Eimern.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Die Stimme steht an EINER Stelle.
 *
 * Nicht gemessen und ausdruecklich so benannt: wie eine Stimme klingt, kann
 * aus dieser Umgebung niemand hoeren — es gibt hier keinen Schluessel und
 * keinen Lautsprecher. `nova` ist bei OpenAI als warm und natuerlich
 * beschrieben; die Wahl ist eine Geschmacksentscheidung des Inhabers und
 * mit dieser einen Zeile zu aendern. Eine Behauptung ueber den Klang stuende
 * hier sonst ohne Deckung, und genau solche Saetze kosten in diesem Projekt
 * am meisten.
 */
const EB_STIMME_STIMME = 'nova';

/**
 * Tonfall-Anweisung — das Feld, das aus einer Vorlesestimme ein Gespraech macht.
 *
 * `gpt-4o-mini-tts` nimmt neben dem Text eine Anweisung zur Sprechweise an;
 * das aeltere `tts-1` nicht. Dass das Feld angenommen wird, steht in der
 * Dokumentation — GEMESSEN ist es von hier aus nicht (kein Schluessel, und
 * api.openai.com ist aus dieser Umgebung nicht erreichbar). Deshalb ist der
 * Ausfall eingebaut statt vorausgesetzt: lehnt die Gegenstelle die Anfrage
 * mit 400 ab, laeuft sie EIN zweites Mal ohne Anweisung
 * (`eb_sprachdienst_ausgeben()`, Zweig `$ohne_anweisung`). Ein unbekanntes
 * Feld kann den Assistenten damit nicht verstummen lassen.
 *
 * Und das Ausweichen ist nie unsichtbar: die Antwort traegt
 * `ohne_anweisung: true`. Ein Ausweichweg, den niemand sieht, verschweigt,
 * dass eine Eigenschaft verloren ging.
 */
const EB_STIMME_ANWEISUNG = 'Sprich freundlich, ruhig und natürlich — wie eine hilfsbereite Person '
    . 'am Telefon, die sich mit Eventplanung auskennt. Kein Werbeton, kein Vorlesen. '
    . 'Normales Sprechtempo, kurze Pausen an Satzenden.';

/**
 * Rahmen eines Aufrufers vervollstaendigen und gegen Unsinn absichern.
 *
 * Die Deckel kommen vom Aufrufer, aber ein Aufrufer, der `proTag` vergisst,
 * darf nicht unbegrenzt fahren. Fehlt eine Zahl, gilt der STRENGSTE Wert,
 * nicht der groesszuegigste — eine fehlende Grenze ist keine Erlaubnis.
 */
function eb_sprachdienst_rahmen( array $rahmen ) {
    $zahl = static function ( $wert, $vorgabe ) {
        $n = (int) $wert;
        return $n > 0 ? $n : $vorgabe;
    };
    return array(
        'eimer'      => isset( $rahmen['eimer'] ) && $rahmen['eimer'] !== '' ? (string) $rahmen['eimer'] : 'stimme',
        // null heisst „an die IP binden"; dann weitet `eventboerse_check_rate_limit()`
        // den Deckel hinter einem Proxy selbst. Eine Kennung wird NIE geweitet.
        'kennung'    => isset( $rahmen['kennung'] ) && $rahmen['kennung'] !== null ? (string) $rahmen['kennung'] : null,
        'proMinute'  => $zahl( isset( $rahmen['proMinute'] ) ? $rahmen['proMinute'] : 0, 10 ),
        'proTag'     => $zahl( isset( $rahmen['proTag'] ) ? $rahmen['proTag'] : 0, 100 ),
        'maxZeichen' => $zahl( isset( $rahmen['maxZeichen'] ) ? $rahmen['maxZeichen'] : 0, 600 ),
        'maxBytes'   => $zahl( isset( $rahmen['maxBytes'] ) ? $rahmen['maxBytes'] : 0, 1024 * 1024 ),
    );
}

/**
 * Beide Deckel pruefen — Minute und Tag.
 *
 * Reihenfolge ist Absicht: der Minutendeckel zuerst, weil er der haeufigere
 * Fall ist und der billigere Test. Beide zaehlen bei JEDEM Aufruf hoch, auch
 * wenn der andere schon abgelehnt hat — ein Angreifer soll den Tagesdeckel
 * nicht dadurch umgehen koennen, dass er in die Minutensperre laeuft.
 */
function eb_sprachdienst_deckel( array $r ) {
    $minute = eventboerse_check_rate_limit( $r['eimer'] . '_min', $r['proMinute'], MINUTE_IN_SECONDS, $r['kennung'] );
    $tag    = eventboerse_check_rate_limit( $r['eimer'] . '_tag', $r['proTag'], DAY_IN_SECONDS, $r['kennung'] );
    if ( is_wp_error( $minute ) ) {
        return $minute;
    }
    if ( is_wp_error( $tag ) ) {
        return $tag;
    }
    return true;
}

/** Gemeinsame Absage-Gestalt. `verfuegbar: false` ist der einzige Zustand, den der Browser auswertet. */
function eb_sprachdienst_nein( $grund, $status = 200 ) {
    return array( array( 'verfuegbar' => false, 'grund' => $grund ), (int) $status );
}

/**
 * Sprachausgabe. Gibt `array( $daten, $status )` zurueck.
 */
function eb_sprachdienst_ausgeben( $text, array $rahmen ) {
    if ( ! defined( 'EB_OPENAI_API_KEY' ) || ! EB_OPENAI_API_KEY ) {
        return eb_sprachdienst_nein( 'EB_OPENAI_API_KEY ist auf dem Server nicht hinterlegt.' );
    }
    $r    = eb_sprachdienst_rahmen( $rahmen );
    $text = trim( (string) $text );
    if ( $text === '' ) {
        return eb_sprachdienst_nein( 'Kein Text.', 400 );
    }
    // mb_substr, nicht substr: ein Schnitt mitten durch ein Mehrbyte-Zeichen
    // erzeugt ungueltiges UTF-8, und die Gegenstelle antwortet dann mit 400.
    $text = function_exists( 'mb_substr' )
        ? mb_substr( $text, 0, $r['maxZeichen'] )
        : substr( $text, 0, $r['maxZeichen'] );

    $limit = eb_sprachdienst_deckel( $r );
    if ( is_wp_error( $limit ) ) {
        return eb_sprachdienst_nein( $limit->get_error_message(), 429 );
    }

    $ohne_anweisung = false;
    for ( $versuch = 0; $versuch < 2; $versuch++ ) {
        $nutzlast = array(
            'model'           => 'gpt-4o-mini-tts',
            'voice'           => EB_STIMME_STIMME,
            'input'           => $text,
            'response_format' => 'mp3',
        );
        if ( ! $ohne_anweisung ) {
            $nutzlast['instructions'] = EB_STIMME_ANWEISUNG;
        }

        $res = wp_remote_post( 'https://api.openai.com/v1/audio/speech', array(
            'timeout' => 25,
            'headers' => array(
                'Authorization' => 'Bearer ' . EB_OPENAI_API_KEY,
                'Content-Type'  => 'application/json',
            ),
            'body' => wp_json_encode( $nutzlast ),
        ) );

        if ( is_wp_error( $res ) ) {
            return eb_sprachdienst_nein( 'Sprachdienst nicht erreichbar: ' . $res->get_error_message() );
        }
        $code = (int) wp_remote_retrieve_response_code( $res );
        if ( $code === 200 ) {
            break;
        }
        // 400 beim ERSTEN Versuch ist der Fall, fuer den dieser zweite da
        // ist: eine Gegenstelle, die `instructions` nicht kennt. Jeder andere
        // Code und jeder zweite Versuch sind endgueltig — eine Schleife, die
        // alles wiederholt, verdreifacht nur die Last.
        if ( $code === 400 && ! $ohne_anweisung ) {
            $ohne_anweisung = true;
            continue;
        }
        return eb_sprachdienst_nein( 'Sprachdienst antwortete mit HTTP ' . $code . '.' );
    }

    $audio = wp_remote_retrieve_body( $res );
    if ( $audio === '' ) {
        return eb_sprachdienst_nein( 'Leere Antwort.' );
    }
    return array( array(
        'verfuegbar' => true,
        'format'     => 'mp3',
        'stimme'     => EB_STIMME_STIMME,
        // Sichtbar, nicht still: ging die Tonfall-Anweisung verloren, soll
        // das in der Antwort stehen und nicht nur im Klang.
        'ohne_anweisung' => $ohne_anweisung,
        'audio'      => base64_encode( $audio ),
    ), 200 );
}

/**
 * Spracherkennung. Gibt `array( $daten, $status )` zurueck.
 */
function eb_sprachdienst_hoeren( $roh, array $rahmen ) {
    if ( ! defined( 'EB_OPENAI_API_KEY' ) || ! EB_OPENAI_API_KEY ) {
        return eb_sprachdienst_nein( 'EB_OPENAI_API_KEY ist auf dem Server nicht hinterlegt.' );
    }
    $r   = eb_sprachdienst_rahmen( $rahmen );
    $roh = (string) $roh;

    // VOR dem Dekodieren messen, nicht danach: base64 ist rund ein Drittel
    // groesser als der Inhalt, und erst dekodieren, dann pruefen hiesse, den
    // Speicher schon belegt zu haben.
    if ( strlen( $roh ) > (int) ceil( $r['maxBytes'] * 4 / 3 ) + 1024 ) {
        return eb_sprachdienst_nein( 'Aufnahme zu lang.', 413 );
    }
    // strict: sonst schluckt PHP Muell und liefert Bytes, die kein Ton sind.
    $audio = base64_decode( $roh, true );
    if ( $audio === false || $audio === '' ) {
        return eb_sprachdienst_nein( 'Keine gültige Aufnahme.', 400 );
    }
    if ( strlen( $audio ) > $r['maxBytes'] ) {
        return eb_sprachdienst_nein( 'Aufnahme zu lang.', 413 );
    }

    $limit = eb_sprachdienst_deckel( $r );
    if ( is_wp_error( $limit ) ) {
        return eb_sprachdienst_nein( $limit->get_error_message(), 429 );
    }

    // multipart von Hand: wp_remote_post kennt keinen Datei-Upload.
    $grenze = 'eb' . wp_generate_password( 24, false );
    $teil   = static function ( $name, $wert ) use ( $grenze ) {
        return "--{$grenze}\r\nContent-Disposition: form-data; name=\"{$name}\"\r\n\r\n{$wert}\r\n";
    };
    $body  = $teil( 'model', 'whisper-1' );
    // Sprache fest auf Deutsch: ohne Angabe raet Whisper mit, und bei kurzen
    // Aeusserungen („ja", „stopp") raet es regelmaessig auf Englisch.
    $body .= $teil( 'language', 'de' );
    $body .= "--{$grenze}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"ton.webm\"\r\n"
           . "Content-Type: audio/webm\r\n\r\n" . $audio . "\r\n";
    $body .= "--{$grenze}--\r\n";

    $res = wp_remote_post( 'https://api.openai.com/v1/audio/transcriptions', array(
        'timeout' => 30,
        'headers' => array(
            'Authorization' => 'Bearer ' . EB_OPENAI_API_KEY,
            'Content-Type'  => 'multipart/form-data; boundary=' . $grenze,
        ),
        'body' => $body,
    ) );

    if ( is_wp_error( $res ) ) {
        return eb_sprachdienst_nein( 'Erkennung nicht erreichbar: ' . $res->get_error_message() );
    }
    $code = (int) wp_remote_retrieve_response_code( $res );
    if ( $code !== 200 ) {
        return eb_sprachdienst_nein( 'Erkennung antwortete mit HTTP ' . $code . '.' );
    }

    $d    = json_decode( wp_remote_retrieve_body( $res ), true );
    $text = is_array( $d ) && isset( $d['text'] ) ? trim( (string) $d['text'] ) : '';

    // Das Phantom wird HIER verworfen, nicht beim Aufrufer. Ein Filter, an
    // den jeder neue Aufrufer denken muss, wird beim zweiten vergessen — und
    // dann beantwortet der Assistent einen Untertitel-Abspann als Frage.
    $phantom = eb_sprachdienst_phantom( $text );
    return array( array(
        'verfuegbar' => true,
        // Leer ist eine gueltige Antwort: es wurde nichts gesagt. Das ist
        // etwas anderes als ein Fehler, und der Browser behandelt es anders.
        'text'       => $phantom ? '' : $text,
        'phantom'    => $phantom,
    ), 200 );
}

/**
 * Whisper erfindet bei Stille Text.
 *
 * Es hat mit Untertiteldateien gelernt und fuellt eine leere Aufnahme mit
 * deren Abspann — „Untertitel der Amara.org-Community", „Vielen Dank fuers
 * Zuschauen". Im HQ kam so ein Phantom am 23.08.2026 als angebliche Frage
 * des Inhabers an und WURDE BEANTWORTET; es sah aus wie eine Gegenfrage des
 * Kreises. Dort filtert `istPhantom()` im Browser.
 *
 * Hier steht die Liste auf dem SERVER, weil jeder Whisper-Aufruf durch
 * `eb_sprachdienst_hoeren()` geht — HQ und Assistent gemeinsam. Die Liste
 * ist bewusst ENG: „Untertitel" pauschal zu sperren nimmt eine echte Frage
 * mit.
 *
 * `istPhantom()` im HQ-Browser ist dazu KEINE Kopie, sondern ein anderes
 * Subjekt: es bewacht den Rueckfall auf `SpeechRecognition` des Browsers,
 * der den Server nie anfasst. Zwei Erkenner, zwei Wege — haette einer von
 * beiden keinen Filter, kaeme das Phantom genau dort durch.
 *
 * NORMIERT WIRD VOR DEM KLEINSCHREIBEN, nicht danach. `strtolower()`
 * arbeitet byteweise: „Ü" sind zwei UTF-8-Bytes, keines davon ein
 * ASCII-Grossbuchstabe. Ein Muster mit Umlaut traefe also nie, und der
 * Filter waere still wirkungslos — genau der Fehler, an dem
 * `eb_handle_vorschlag()` jeden fuehrenden Umlaut gefressen hat.
 * `mb_strtolower` waere der kuerzere Weg und der unsicherere: mbstring ist
 * keine Voraussetzung, die WordPress garantiert, und eine
 * Sicherheitsfunktion, die auf einer fehlenden Erweiterung nichts tut, ist
 * die teuerste Sorte Fehler. Die Muster stehen deshalb umlautfrei da.
 */
function eb_sprachdienst_phantom( $text ) {
    $t = trim( (string) $text );
    if ( $t === '' ) {
        return false;
    }
    $t = strtolower( strtr( $t, array(
        'Ä' => 'ae', 'ä' => 'ae', 'Ö' => 'oe', 'ö' => 'oe',
        'Ü' => 'ue', 'ü' => 'ue', 'ß' => 'ss',
    ) ) );
    $muster = array(
        'untertitel der amara',
        'untertitelung des zdf',
        'untertitel im auftrag des zdf',
        'vielen dank fuers zuschauen',
        'vielen dank fuer das zuschauen',
        'danke fuers zuschauen',
        'bis zum naechsten mal',
        'subtitles by the amara',
        'thanks for watching',
    );
    foreach ( $muster as $m ) {
        if ( strpos( $t, $m ) !== false ) {
            return true;
        }
    }
    return false;
}
