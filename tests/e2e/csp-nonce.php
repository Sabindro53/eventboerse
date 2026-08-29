#!/usr/bin/env php
<?php
/**
 * csp-nonce.php — prüft die Nonce-Migration gegen den ECHTEN Code.
 *
 * Aufgerufen von tests/e2e/csp-nonce.spec.js. Die Funktionen werden aus
 * functions.php herausgeschnitten und in einem Namespace ausgeführt, in dem
 * die WordPress-Aufrufe auf Testfassungen zeigen — dieselbe Anordnung wie in
 * csp-hq.php. Eine Nachbildung der Logik im Test würde beweisen, dass die
 * Nachbildung stimmt, und sonst nichts.
 *
 * Gibt JSON auf stdout aus; Exit 1, sobald etwas nicht auffindbar ist.
 */

$wurzel = __DIR__ . '/../..';
$src    = file_get_contents( $wurzel . '/functions.php' );

/** Schneidet eine Funktion samt Rumpf heraus (Klammern zählen). */
function funktion( $src, $name ) {
    $start = strpos( $src, "function $name(" );
    if ( $start === false ) {
        fwrite( STDERR, "Funktion $name nicht gefunden\n" );
        exit( 1 );
    }
    $i = strpos( $src, '{', $start );
    $tiefe = 0;
    for ( $j = $i; $j < strlen( $src ); $j++ ) {
        if ( $src[ $j ] === '{' ) { $tiefe++; }
        elseif ( $src[ $j ] === '}' ) { $tiefe--; if ( ! $tiefe ) { break; } }
    }
    return substr( $src, $start, $j - $start + 1 );
}

/* ---- Die echte Direktivenliste ---- */
if ( ! preg_match( '/\$csp_directives\s*=\s*array\((.*?)\n\s*\);/s', $src, $m ) ) {
    fwrite( STDERR, "csp_directives nicht gefunden\n" );
    exit( 1 );
}
preg_match_all( '/"([^"]+)"/', $m[1], $dm );
$durchgesetzt = $dm[1];

/* ---- Der echte Ableitungsblock für die beobachtende Fassung ---- */
if ( ! preg_match( '/\$streng = array\(\);.*?\$streng\[\] = \'report-to csp\';/s', $src, $sm ) ) {
    fwrite( STDERR, "Ableitung der strengen CSP nicht gefunden\n" );
    exit( 1 );
}

/* ---- Konstanten ---- */
preg_match( '/const EB_CSP_MAX_MELDUNGEN = (\d+);/', $src, $cm );
preg_match( '/const EB_CSP_MAX_BERICHT\s*= (\d+);/', $src, $bm );
$maxMeldungen = (int) ( $cm[1] ?? 0 );
$maxBericht   = (int) ( $bm[1] ?? 0 );

$GLOBALS['transient'] = array();

/* Die Funktionen werden in eine DATEI geschrieben und eingebunden, nicht
 * ge-eval-t. Grund: `eb_shell_ausgeben()` liest `__DIR__ . '/app-shell.html'`,
 * und `__DIR__` zeigt in ge-eval-tem Code auf das Verzeichnis der
 * aufrufenden Datei. Nur so lässt sich die Funktion prüfen, die im Betrieb
 * wirklich läuft — statt nur der Hilfsfunktion, die sie benutzt. Genau
 * dieser Unterschied ist einer Mutation aufgefallen: „Shell bekommt kein
 * Nonce" blieb grün, weil der Test die Verdrahtung übersprang. */
$tmp = sys_get_temp_dir() . '/eb-csp-' . bin2hex( random_bytes( 6 ) );
mkdir( $tmp );
copy( $wurzel . '/app-shell.html', $tmp . '/app-shell.html' );
file_put_contents( $tmp . '/pruefstand.php', "<?php\n"
    . 'namespace EBTest;'
    . 'const EB_CSP_MAX_MELDUNGEN = ' . $maxMeldungen . ';'
    . 'const EB_CSP_MAX_BERICHT = ' . $maxBericht . ';'
    . 'const EB_CSP_ABLAGE = "eb_csp_verstoesse";'
    . 'const DAY_IN_SECONDS = 86400;'
    . 'function esc_attr($s){ return htmlspecialchars((string)$s, ENT_QUOTES); }'
    . 'function esc_url_raw($s){ return $s; }'
    . 'function wp_parse_url($u){ return parse_url($u); }'
    . 'function get_transient($k){ return $GLOBALS["transient"][$k] ?? false; }'
    . 'function set_transient($k,$v,$t){ $GLOBALS["transient"][$k] = $v; return true; }'
    . 'class WP_REST_Request { public $body = ""; function __construct($b=""){ $this->body = $b; }'
    . '  function get_body(){ return $this->body; } }'
    . 'class WP_REST_Response { public $data; public $status;'
    . '  function __construct($d=null,$s=200){ $this->data=$d; $this->status=$s; } }'
    . funktion( $src, 'eb_csp_nonce' )
    . funktion( $src, 'eb_inline_nonce_setzen' )
    . funktion( $src, 'eb_shell_ausgeben' )
    . funktion( $src, 'eb_csp_quelle_kuerzen' )
    . funktion( $src, 'eb_csp_report_empfangen' )
    . funktion( $src, 'eb_csp_report_lesen' )
);
require $tmp . '/pruefstand.php';
register_shutdown_function( function () use ( $tmp ) {
    @unlink( $tmp . '/pruefstand.php' );
    @unlink( $tmp . '/app-shell.html' );
    @rmdir( $tmp );
} );

/* ================= 1. Das Nonce ================= */
$nonce      = \EBTest\eb_csp_nonce();
$nonceWieder = \EBTest\eb_csp_nonce();

/* ================= 2. Inline-Skripte ================= */
// Über die Funktion, die WIRKLICH ausliefert — nicht über ihre Hilfsfunktion.
$shell = file_get_contents( $wurzel . '/app-shell.html' );
ob_start();
\EBTest\eb_shell_ausgeben();
$behandelt = ob_get_clean();

/** Zählt <script>-Tags ohne src und ohne nonce — die, die ausfallen würden. */
$ohneNonce = function ( $html ) {
    preg_match_all( '/<script(?![^>]*\ssrc\s*=)([^>]*)>/i', $html, $t );
    $n = 0;
    foreach ( $t[1] as $attr ) {
        if ( ! preg_match( '/\snonce\s*=/i', $attr ) ) { $n++; }
    }
    return $n;
};
$mitSrc = preg_match_all( '/<script[^>]*\ssrc\s*=/i', $behandelt );

// Kunstfälle: bereits gesetztes Nonce, Skript mit src, Grossschreibung.
$probe = '<script src="a.js"></script>'
       . '<SCRIPT>x</SCRIPT>'
       . '<script nonce="alt">y</script>'
       . '<script type="module">z</script>';
$probeAus = \EBTest\eb_inline_nonce_setzen( $probe, 'NEU' );
// Wie oft steht ein nonce= im Tag, das schon eins hatte? Zwei bedeutet:
// ueberschrieben (bzw. davorgesetzt) — der Browser nimmt dann das erste.
preg_match( '/<script[^>]*nonce="alt"[^>]*>/i', $probeAus, $altTag );
$altNonceAnzahl = $altTag ? preg_match_all( '/\snonce\s*=/i', $altTag[0] ) : 0;
$altTraegtNeu   = $altTag ? (bool) preg_match( '/nonce="NEU"/', $altTag[0] ) : false;

/* ================= 3. Die beobachtende CSP ================= */
$csp_directives = $durchgesetzt;
$GLOBALS['kopf'] = array();
eval(
    'namespace EBTest2;'
    . 'function rest_url($p){ return "https://example.invalid/wp-json/" . $p; }'
    . 'function esc_url_raw($s){ return $s; }'
    . 'function eb_csp_nonce(){ return "TESTNONCE"; }'
    . 'function header($h){ $GLOBALS["kopf"][] = $h; }'
    . 'function ableiten($csp_directives){ ' . $sm[0] . ' return $streng; }'
);
$streng = \EBTest2\ableiten( $durchgesetzt );

$holen = function ( $liste, $name ) {
    foreach ( $liste as $d ) {
        if ( strpos( $d, $name . ' ' ) === 0 ) { return $d; }
    }
    return '';
};

/* ================= 4. Der Sammler ================= */
$melden = function ( $rumpf ) {
    return \EBTest\eb_csp_report_empfangen( new \EBTest\WP_REST_Request( $rumpf ) );
};
$bericht = function ( $direktive, $quelle ) {
    return json_encode( array( 'csp-report' => array(
        'effective-directive' => $direktive,
        'blocked-uri'         => $quelle,
        'document-uri'        => 'https://example.invalid/seite?token=GEHEIM123',
    ) ) );
};

$GLOBALS['transient'] = array();
$melden( $bericht( 'script-src-elem', 'inline' ) );
$melden( $bericht( 'script-src-elem', 'inline' ) );          // gleiche → nur zählen
$melden( $bericht( 'img-src', 'https://fremd.example/a.png?token=GEHEIM123' ) );
$nachDrei = \EBTest\eb_csp_report_lesen()->data;

// Flut: mehr verschiedene Verstösse als der Deckel erlaubt.
for ( $i = 0; $i < 200; $i++ ) {
    $melden( $bericht( 'img-src', "https://flut$i.example/x.png" ) );
}
$nachFlut = \EBTest\eb_csp_report_lesen()->data;

// Zu grosser Bericht, Unsinn, und etwas, das keine Direktive nennt.
$GLOBALS['transient'] = array();
// Gueltiges JSON, das ohne Deckel angenommen wuerde — nur so prueft der
// Fall wirklich die Groesse und nicht den JSON-Parser.
$melden( json_encode( array( 'csp-report' => array(
    'effective-directive' => 'script-src',
    'blocked-uri'         => 'inline',
    'sample'              => str_repeat( 'A', $maxBericht ),
) ) ) );
$melden( 'kein json' );
$melden( json_encode( array( 'csp-report' => array( 'effective-directive' => '###' ) ) ) );
// Faengt nicht mit einem Buchstaben an, ueberlebt aber das Strippen als
// "fake-src". Ohne die Direktivenpruefung landete das in der Ablage.
$melden( json_encode( array( 'csp-report' => array(
    'effective-directive' => '9fake-src', 'blocked-uri' => 'inline',
) ) ) );
$nachMuell = \EBTest\eb_csp_report_lesen()->data;

// Das neue report-to-Format (Chrome).
$GLOBALS['transient'] = array();
$melden( json_encode( array( array(
    'type' => 'csp-violation',
    'body' => array( 'effectiveDirective' => 'script-src', 'blockedURL' => 'eval' ),
) ) ) );
$nachReportTo = \EBTest\eb_csp_report_lesen()->data;

echo json_encode( array(
    'nonce'              => $nonce,
    'nonceStabil'        => $nonce === $nonceWieder,
    'nonceLaenge'        => strlen( base64_decode( $nonce, true ) ?: '' ),
    'shellOhneNonceVor'  => $ohneNonce( $shell ),
    'shellOhneNonceNach' => $ohneNonce( $behandelt ),
    'shellMitSrc'        => $mitSrc,
    'probeOhneNonce'     => $ohneNonce( $probeAus ),
    'probeAltAnzahl'     => $altNonceAnzahl,
    'probeAltTraegtNeu'  => $altTraegtNeu,
    'probeSrcUnberuehrt' => (bool) preg_match( '/<script src="a\.js">/', $probeAus ),
    'cspDurchgesetzt'    => $holen( $durchgesetzt, 'script-src' ),
    'cspStreng'          => $holen( $streng, 'script-src' ),
    'cspStrengElem'      => $holen( $streng, 'script-src-elem' ),
    'strengHatBericht'   => (bool) $holen( $streng, 'report-uri' ),
    'gleicheAnzahl'      => count( $streng ) === count( $durchgesetzt ) + 2,
    // Alles ausser script-src muss Zeichen fuer Zeichen gleich sein.
    'nurSkriptGeaendert' => array_values( array_diff( $streng, $durchgesetzt ) ),
    'nachDrei'           => $nachDrei,
    'nachFlutAnzahl'     => count( $nachFlut['verstoesse'] ),
    'nachFlutVoll'       => $nachFlut['voll'],
    'nachMuellAnzahl'    => count( $nachMuell['verstoesse'] ),
    'nachReportTo'       => $nachReportTo['verstoesse'],
    'maxMeldungen'       => $maxMeldungen,
), JSON_UNESCAPED_SLASHES );
