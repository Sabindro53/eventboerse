<?php
/**
 * Pruefstand fuer den Storno-Vorgang.
 *
 * Bindet den ECHTEN Quelltext ein — samt `erstattung-rechte.php`, denn
 * `eb_storno_darf_entscheiden()` gibt die Frage bewusst dorthin weiter.
 * Wer die Weitergabe im Pruefstand nachbaut, prueft seine eigene Kopie.
 *
 * Aufruf:  php storno.php          (JSON auf stdin)
 * Eingabe: { "op": "...", ... }[]
 * Ausgabe: JSON-Array der Ergebnisse.
 */

define( 'EB_STORNO_PRUEFSTAND', true );
define( 'EB_ERSTATTUNG_PRUEFSTAND', true );

/**
 * Minimale $wpdb-Attrappe — nur fuer die Tabellendefinition.
 *
 * Sie kann genau zwei Dinge, und mehr soll sie nicht koennen: ein Praefix
 * und eine Zeichensatz-Klausel. Eine Attrappe, die jede Abfrage
 * beantwortet, gibt Entwarnung fuer Code, den sie nie ausgefuehrt hat.
 */
class EB_Storno_WPDB_Attrappe {
    public $prefix = 'wptest_';
    public function get_charset_collate() { return 'DEFAULT CHARSET=utf8mb4'; }
}
$GLOBALS['wpdb'] = new EB_Storno_WPDB_Attrappe();

$basis = dirname( __DIR__, 2 ) . '/includes/payments/';
foreach ( array( 'erstattung-rechte.php', 'storno.php' ) as $datei ) {
    if ( ! is_readable( $basis . $datei ) ) {
        fwrite( STDERR, "Datei fehlt: {$basis}{$datei}\n" );
        exit( 2 );
    }
    require $basis . $datei;
}

foreach ( array( 'eb_storno_grund_pruefen', 'eb_storno_zustand',
                 'eb_storno_darf_beantragen', 'eb_storno_darf_entscheiden',
                 'eb_storno_entscheidbar', 'eb_storno_frist_ab' ) as $f ) {
    if ( ! function_exists( $f ) ) {
        fwrite( STDERR, "Funktion fehlt: $f\n" );
        exit( 2 );
    }
}

$faelle = json_decode( stream_get_contents( STDIN ), true );
if ( ! is_array( $faelle ) ) {
    fwrite( STDERR, "Kein gueltiges JSON-Array auf stdin\n" );
    exit( 2 );
}

$aus = array();
foreach ( $faelle as $f ) {
    $op = isset( $f['op'] ) ? (string) $f['op'] : '';
    switch ( $op ) {
        case 'grund':
            $aus[] = eb_storno_grund_pruefen( $f['text'] ?? null );
            break;
        case 'zustand':
            $aus[] = eb_storno_zustand( $f['zeile'] ?? array(), (int) ( $f['jetzt'] ?? 0 ) );
            break;
        case 'beantragen':
            $aus[] = (bool) eb_storno_darf_beantragen( $f['user'] ?? 0, $f['pi'] ?? array() );
            break;
        case 'entscheiden':
            $aus[] = (bool) eb_storno_darf_entscheiden(
                ! empty( $f['admin'] ),
                isset( $f['konto'] ) ? (string) $f['konto'] : '',
                $f['pi'] ?? array()
            );
            break;
        case 'entscheidbar':
            $aus[] = (bool) eb_storno_entscheidbar( (string) ( $f['zustand'] ?? '' ) );
            break;
        case 'frist':
            $aus[] = eb_storno_frist_ab( (int) ( $f['jetzt'] ?? 0 ) );
            break;
        case 'sql':
            // Minimale $wpdb-Attrappe: der Pruefstand will nur sehen, DASS
            // eine Tabellendefinition entsteht und wie sie heisst.
            $aus[] = eb_storno_tabelle_sql();
            break;
        default:
            fwrite( STDERR, "Unbekannte Operation: $op\n" );
            exit( 2 );
    }
}
echo json_encode( $aus, JSON_UNESCAPED_UNICODE );
