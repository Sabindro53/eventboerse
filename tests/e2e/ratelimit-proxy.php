#!/usr/bin/env php
<?php
/**
 * ratelimit-proxy.php — bezeichnet REMOTE_ADDR einen Client oder alle?
 *
 * Aufgerufen von tests/e2e/ratelimit-proxy.spec.js. Die Funktionen werden aus
 * includes/security/rate-limit.php herausgeschnitten und mit gestellten
 * WordPress-Aufrufen ausgefuehrt — dieselbe Anordnung wie csp-hq.php und
 * csp-nonce.php.
 *
 * Gibt JSON auf stdout aus; Exit 1, sobald etwas nicht auffindbar ist.
 */

$wurzel = __DIR__ . '/../..';
$src    = file_get_contents( $wurzel . '/includes/security/rate-limit.php' );
$fnPhp  = file_get_contents( $wurzel . '/functions.php' );

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

preg_match( '/const EB_RL_PROXY_FAKTOR = (\d+);/', $src, $fm );
$faktor = (int) ( $fm[1] ?? 0 );

eval(
    'namespace EBRL;'
    . 'const EB_RL_PROXY_FAKTOR = ' . $faktor . ';'
    . 'function apply_filters($n,$v){ return $GLOBALS["filter"] ?? $v; }'
    . funktion( $src, 'eventboerse_get_client_ip' )
    . funktion( $src, 'eventboerse_ip_identifiziert' )
    . funktion( $src, 'eventboerse_rl_limit' )
);

/** Setzt REMOTE_ADDR und fragt beides ab. */
$pruefe = function ( $addr ) {
    if ( $addr === null ) { unset( $_SERVER['REMOTE_ADDR'] ); }
    else { $_SERVER['REMOTE_ADDR'] = $addr; }
    return array(
        'identifiziert' => \EBRL\eventboerse_ip_identifiziert(),
        'limit3'        => \EBRL\eventboerse_rl_limit( 3 ),
        'limit20'       => \EBRL\eventboerse_rl_limit( 20 ),
        // Mit eigenem Identifier (E-Mail) darf NIE geweitet werden:
        // dieser Eimer haengt am Konto, nicht an der Leitung.
        'limitEigen'    => \EBRL\eventboerse_rl_limit( 5, false ),
    );
};

$faelle = array(
    // Echte Internet-Adressen — bezeichnen einen Client.
    //
    // BEWUSST KEINE Dokumentations-Praefixe. Der erste Entwurf nahm
    // 203.0.113.7 (TEST-NET-3) und 2001:db8::1 (RFC 3849) — Adressen, die
    // es per Definition nie im echten Verkehr gibt. Lokal (PHP 8.4) galten
    // beide als oeffentlich, in CI zaehlte PHP 2001:db8::/32 zu den
    // reservierten Bereichen: derselbe Test, zwei Ergebnisse, und der
    // Unterschied lag in der PHP-Version, nicht im Code.
    //
    // Genommen wird deshalb global geroutetes Unicast, das keine
    // PHP-Fassung als Sonderfall fuehrt.
    'oeffentlich_v4'  => '93.184.216.34',
    'oeffentlich_v6'  => '2606:4700:4700::1111',
    // Privat/reserviert — es sitzt ein Proxy dazwischen.
    'privat_10'       => '10.0.0.5',
    'privat_172'      => '172.16.4.9',
    'privat_192'      => '192.168.1.20',
    'loopback'        => '127.0.0.1',
    'loopback_v6'     => '::1',
    'privat_v6'       => 'fd00::1',
    'linklocal'       => '169.254.10.1',
    // Unbrauchbar.
    'muell'           => 'nicht-ip',
    'leer'            => '',
);
$ergebnis = array();
foreach ( $faelle as $name => $addr ) {
    $ergebnis[ $name ] = $pruefe( $addr );
    // Die Adresse mitgeben: nur so kann der Test pruefen, dass als
    // "oeffentlich" auch etwas gewaehlt wurde, das oeffentlich SEIN kann.
    $ergebnis[ $name ]['adresse'] = (string) $addr;
}
$ergebnis['fehlt'] = $pruefe( null );

/* ---- Wird das Geweitete auch WIRKLICH benutzt? ---- */
// Die Regel zu pruefen genuegt nicht — sie muss an den Stellen stehen,
// an denen heute noch feste Zahlen standen.
$verdrahtung = array(
    'registrierung' => (bool) preg_match(
        '/\$ip_count >= eventboerse_rl_limit\(\s*3\s*\)/', $fnPhp ),
    'login_ip'      => (bool) preg_match(
        "/get_transient\(\s*\\\$k\['ip'\]\s*\)\s*>= eventboerse_rl_limit\(\s*20\s*\)/", $fnPhp ),
    // Der Eimer je KONTO darf nicht geweitet worden sein.
    'login_konto_fest' => (bool) preg_match(
        "/get_transient\(\s*\\\$k\['pair'\]\s*\)\s*>= 5\b/", $fnPhp ),
);

// Und im geteilten Limiter: nur ohne eigenen Identifier weiten.
$verdrahtung['limiter'] = (bool) preg_match(
    '/\$limit = eventboerse_rl_limit\(\s*\$limit,\s*\$identifier_override === null\s*\);/', $src );

echo json_encode( array(
    'faktor'      => $faktor,
    'faelle'      => $ergebnis,
    'verdrahtung' => $verdrahtung,
), JSON_UNESCAPED_SLASHES );
