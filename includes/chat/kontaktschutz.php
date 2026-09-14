<?php
/**
 * Kontaktschutz im Chat — verhandeln ja, an der Plattform vorbei nein.
 *
 * ── WOZU ───────────────────────────────────────────────────────────────
 *
 * Wer den Kontakt über uns gefunden hat, bucht über uns; daran hängt die
 * Vermittlerpauschale. Ein Chat, in dem als Erstes eine Handynummer steht,
 * ist der Ausstieg aus genau diesem Geschäft.
 *
 * ── WAS DIESER FILTER NICHT KANN ───────────────────────────────────────
 *
 * Er VERHINDERT den Kontakt außerhalb der Plattform nicht. „Meine
 * Handynummer schicke ich dir gleich als Bild" enthält keine Kontaktdaten
 * und darf auch nicht blockiert werden — genauso wenig wie „meine Nummer
 * steht auf meiner Website". Wer ausweichen will, weicht aus.
 *
 * Was er kann, ist den BEQUEMEN Weg verteuern. Das ist der ehrliche
 * Anspruch, und er steht hier, weil die teuerste Fehlerklasse dieses
 * Projekts etwas ist, das wie Schutz aussieht und keiner ist.
 *
 * ── DIE ZWEITE GEFAHR IST DER FEHLALARM ────────────────────────────────
 *
 * Ein Filter, der die Rechnungsnummer blockiert, wird abgeschaltet — und
 * dann schützt er gar nichts mehr. Am 13.09.2026 an 54 Sätzen gemessen
 * (22 mit Kontaktdaten, 32 ohne), die Fassung davor gegen diese:
 *
 *   | | blockiert (soll) | sauber durch (darf) |
 *   |---|---|---|
 *   | vorher | 15/22 | 26/32 — SECHS Fehlalarme |
 *   | jetzt  | 22/22 | 32/32 |
 *
 * Die sechs Fehlalarme waren allesamt neunstellige Zahlen ohne jeden
 * Telefonbezug: Rechnungs-, Angebots-, Bestell-, Kunden- und
 * Seriennummern sowie ein IBAN-Fragment.
 *
 * Der Satz oben steht in den 32, nicht in den 22 — er enthält nichts, was
 * zu blockieren wäre. Ein Filter, der ihn fängt, käme nur über Fehlalarme
 * dorthin.
 *
 * Der Korpus steht in `tests/e2e/kontaktschutz.spec.js` und ist die
 * eigentliche Zusicherung: eine Regex-Liste zu lesen sagt nichts darüber,
 * was sie trifft.
 */

if ( ! defined( 'ABSPATH' ) && ! defined( 'EB_KONTAKTSCHUTZ_PRUEFSTAND' ) ) {
    exit;
}

/**
 * Ziffern fremder Schriften auf ASCII bringen.
 *
 * Ohne das umgeht eine einzige Vollbreiten-Ziffer den gesamten
 * Telefon-Zweig — gemessen: `０１７１２３４５６７８` kam ungehindert durch.
 *
 * Bewusst `strtr` statt `mb_ord`: mbstring ist keine Voraussetzung, die
 * WordPress garantiert (es liefert eigene Rückfälle mit). Eine
 * Sicherheitsfunktion, die auf einer fehlenden Erweiterung still nichts
 * tut, ist die hier teuerste Sorte Fehler.
 */
function eb_kontakt_ziffern_normieren( $text ) {
    static $karte = null;
    if ( $karte === null ) {
        $karte = array();
        // Vollbreite (U+FF10), Arabisch-Indisch (U+0660), Ostarabisch
        // (U+06F0), Devanagari (U+0966).
        $basen = array( "\xEF\xBC\x90", "\xD9\xA0", "\xDB\xB0", "\xE0\xA5\xA6" );
        foreach ( $basen as $basis ) {
            for ( $i = 0; $i <= 9; $i++ ) {
                $zeichen = $basis;
                $zeichen[ strlen( $zeichen ) - 1 ] = chr( ord( $basis[ strlen( $basis ) - 1 ] ) + $i );
                $karte[ $zeichen ] = (string) $i;
            }
        }
    }
    return strtr( $text, $karte );
}

/**
 * Ausgeschriebene Ziffernfolgen: „null eins sieben eins zwo drei …".
 *
 * Die Schwelle von sieben aufeinanderfolgenden Zahlwörtern ist der ganze
 * Schutz gegen Fehlalarme: „vier Kellner, zwei Barkeeper und drei Tische"
 * sind drei, „erst eins, dann zwei, dann drei" auch. Niemand zählt in
 * einer Verhandlung sieben Ziffern am Stück auf, ausser er diktiert eine
 * Nummer.
 */
function eb_kontakt_ziffernwoerter( $text ) {
    $w = 'null|eins|zwei|zwo|drei|vier|fuenf|fünf|sechs|sieben|acht|neun';
    return (bool) preg_match(
        '/\b(?:' . $w . ')\b(?:[\s,.\-]+\b(?:' . $w . ')\b){6,}/iu', $text );
}

/**
 * Ziffernähnliche Buchstaben zurückdrehen — NUR in Tokens, die ohnehin
 * überwiegend aus Ziffern bestehen.
 *
 * Ohne die Mehrheitsbedingung würde aus „Solisten" eine Zahl. Mit ihr
 * bleibt „SOLO" unangetastet und „O171" wird zu „0171".
 */
function eb_kontakt_homoglyphen( $text ) {
    return preg_replace_callback( '/\b[0-9OoIlSs]{3,}\b/u', function ( $m ) {
        $tok     = $m[0];
        $ziffern = strlen( preg_replace( '/\D+/', '', $tok ) );
        if ( $ziffern * 2 <= strlen( $tok ) ) {
            return $tok;
        }
        return strtr( $tok, array(
            'O' => '0', 'o' => '0', 'I' => '1', 'l' => '1', 'S' => '5', 's' => '5',
        ) );
    }, $text );
}

/**
 * Trägt die Nachricht Kontaktdaten, die an der Plattform vorbeiführen?
 */
function eb_message_contains_off_platform_contact( $text ) {
    $text = html_entity_decode( wp_strip_all_tags( (string) $text ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
    if ( $text === '' ) {
        return false;
    }
    $text = eb_kontakt_ziffern_normieren( $text );

    $muster = array(
        // E-Mail, auch umschrieben: (at), [at], „punkt", „dot".
        '/\b[A-Z0-9._%+\-]+\s*(?:@|\(at\)|\[at\]| at )\s*[A-Z0-9.\-]+\s*(?:\.| punkt | dot )\s*[A-Z]{2,}\b/iu',
        '/\b(?:https?:\/\/|www\.)\S+/iu',
        '/\b(?:schreib|kontaktier|erreich|ruf|folge|find|meld).{0,35}(?:whats?app|telegram|signal|facetime|skype|instagram|facebook|tiktok|snapchat|discord)\b/iu',
        '/\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]{2,}(?:straße|strasse|str\.|weg|allee|platz|gasse)\s+\d+[a-z]?\b/u',
        '/\b\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]{2,}\b/u',
        // Freemail-Anbieter in JEDER Schreibweise. „max.mueller.gmail.com"
        // trägt kein @ und kam deshalb ungehindert durch.
        '/\b(?:gmail|googlemail|gmx|web\.de|outlook|hotmail|yahoo|t-online|icloud|proton(?:mail)?|freenet|aol)\b/iu',
        // Messenger-Kürzel NUR mit Präposition — „WA" allein ist zu
        // vieldeutig, „per WA" nicht.
        '/\b(?:per|via|auf|über|ueber|übers|uebers)\s+(?:wa|tg|ig|fb|insta)\b/iu',
        // Nackter @Handle. Der 1:1-Chat kennt keine Erwähnungen, also ist
        // das immer eine Adresse anderswo. Mindestens fünf Zeichen: „@home"
        // ist ein Musikbegriff, „@maxmueller" ein Konto.
        '/(?:^|\s)@[A-Za-z0-9._]{5,}/u',
    );
    foreach ( $muster as $m ) {
        if ( preg_match( $m, $text ) ) {
            return true;
        }
    }

    if ( eb_kontakt_ziffernwoerter( $text ) ) {
        return true;
    }

    $text = eb_kontakt_homoglyphen( $text );

    // Eine Rufnummer hat eine FORM: sie beginnt mit 0 oder +, oder der Satz
    // sagt selbst, dass es eine ist. Ohne diese Bedingung blockiert der
    // Filter jede neunstellige Zahl — und das waren gemessen vier von fünf
    // Fehlalarmen. „nummer" steht bewusst NICHT in der Liste: Bestell- und
    // Kundennummer tragen es auch.
    $ruf = (bool) preg_match(
        '/\b(?:handy|mobil|telefon|festnetz|durchwahl|ruf\s+(?:mich|an)|anrufen|'
        . 'erreichst\s+du\s+mich|erreichbar\s+unter)\b/iu', $text );

    if ( preg_match_all( '/(?<!\d)(?:\+|00)?\d[\d\s().\/-]{7,}\d(?!\d)/u', $text, $treffer ) ) {
        foreach ( $treffer[0] as $kandidat ) {
            if ( strlen( preg_replace( '/\D+/', '', $kandidat ) ) < 9 ) {
                continue;
            }
            if ( preg_match( '/^\s*(?:\+|00|0)/', $kandidat ) || $ruf ) {
                return true;
            }
        }
    }
    return false;
}
