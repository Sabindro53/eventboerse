#!/usr/bin/env php
<?php
/**
 * webp.php — prüft die WebP-Umsetzung gegen den ECHTEN Code.
 *
 * Aufgerufen von tests/e2e/webp.spec.js. Die Funktionen werden aus
 * functions.php herausgeschnitten und mit ECHTEN Bilddateien ausgeführt —
 * dieselbe Anordnung wie in csp-nonce.php. Eine Nachbildung würde beweisen,
 * dass die Nachbildung stimmt, und sonst nichts; und gerade bei Bildern
 * entscheidet nicht die Logik, sondern was GD wirklich herausschreibt.
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

$teile = array();
foreach ( array( 'eb_ini_bytes', 'eb_webp_pfad', 'eb_webp_marker_pfad',
                 'eb_webp_passt_in_speicher', 'eb_webp_erzeugen' ) as $n ) {
    $teile[] = funktion( $src, $n );
}
eval( implode( "\n", $teile ) );

/* ------------------------------------------------------------------ */

$tmp = sys_get_temp_dir() . '/eb-webp-' . bin2hex( random_bytes( 6 ) );
mkdir( $tmp, 0700, true );
register_shutdown_function( function () use ( $tmp ) {
    foreach ( glob( $tmp . '/*' ) as $f ) { @unlink( $f ); }
    @rmdir( $tmp );
} );

/** Rauschbild — wie ein Foto, nicht wie eine Grafik. */
function rauschen( $b, $h, $saat = 1234 ) {
    mt_srand( $saat );
    $im = imagecreatetruecolor( $b, $h );
    for ( $y = 0; $y < $h; $y++ ) {
        for ( $x = 0; $x < $b; $x++ ) {
            imagesetpixel( $im, $x, $y, imagecolorallocate( $im,
                mt_rand( 0, 255 ), mt_rand( 0, 255 ), mt_rand( 0, 255 ) ) );
        }
    }
    return $im;
}

$ergebnis = array( 'gd' => function_exists( 'imagewebp' ) );

/* 1) Ein Foto: WebP muss kleiner sein und das Original unberührt lassen. */
$foto = $tmp . '/foto.jpg';
$im = rauschen( 400, 300 );
imagejpeg( $im, $foto, 90 );
imagedestroy( $im );
$vorher = filesize( $foto );
$vorherHash = md5_file( $foto );

$ergebnis['foto'] = array(
    'stand'        => eb_webp_erzeugen( $foto ),
    'originalByte' => $vorher,
    'webpByte'     => file_exists( eb_webp_pfad( $foto ) ) ? filesize( eb_webp_pfad( $foto ) ) : null,
    'originalUnberuehrt' => md5_file( $foto ) === $vorherHash,
    'markerDa'     => file_exists( eb_webp_marker_pfad( $foto ) ),
    'zielName'     => basename( eb_webp_pfad( $foto ) ),
);

/* 2) Zweiter Aufruf: vorhanden, kein erneutes Schreiben. */
$webpHash = file_exists( eb_webp_pfad( $foto ) ) ? md5_file( eb_webp_pfad( $foto ) ) : '';
$ergebnis['zweiterAufruf'] = array(
    'stand'      => eb_webp_erzeugen( $foto ),
    'unveraendert' => file_exists( eb_webp_pfad( $foto ) )
                      && md5_file( eb_webp_pfad( $foto ) ) === $webpHash,
);

/* 3) WebP fällt GRÖSSER aus: es muss wieder weg, und der Merkzettel kommt.
 *    Erzwungen über ein stark komprimiertes JPEG gegen WebP bei Qualität 100. */
$klein = $tmp . '/klein.jpg';
$im = rauschen( 300, 300, 99 );
imagejpeg( $im, $klein, 25 );
imagedestroy( $im );
$ergebnis['groesser'] = array(
    'stand'       => eb_webp_erzeugen( $klein, 100 ),
    'webpGeloescht' => ! file_exists( eb_webp_pfad( $klein ) ),
    'markerDa'    => file_exists( eb_webp_marker_pfad( $klein ) ),
);

/* 4) PNG mit Transparenz: die Alphakanäle müssen überleben. */
// Bewusst RAUSCHEN im deckenden Teil, nicht eine Fläche: eine flächige
// Grafik ist als PNG kleiner als als lossy WebP, dann greift zu Recht
// 'groesser' — und der Alphatest liefe gar nicht. Das ist genau der Fall,
// in dem ein Test grün aussieht, ohne etwas geprüft zu haben.
$png = $tmp . '/alpha.png';
$im = imagecreatetruecolor( 200, 200 );
imagealphablending( $im, false );
imagesavealpha( $im, true );
imagefill( $im, 0, 0, imagecolorallocatealpha( $im, 0, 0, 0, 127 ) );  // ganz durchsichtig
mt_srand( 4242 );
for ( $y = 20; $y < 200; $y++ ) {
    for ( $x = 20; $x < 200; $x++ ) {
        imagesetpixel( $im, $x, $y, imagecolorallocatealpha( $im,
            mt_rand( 0, 255 ), mt_rand( 0, 255 ), mt_rand( 0, 255 ), 0 ) );
    }
}
imagepng( $im, $png );
imagedestroy( $im );

$standPng = eb_webp_erzeugen( $png );
$alphaOk = null;
if ( $standPng === 'erzeugt' && function_exists( 'imagecreatefromwebp' ) ) {
    $w = @imagecreatefromwebp( eb_webp_pfad( $png ) );
    if ( $w ) {
        $ecke = imagecolorat( $w, 1, 1 );                 // muss durchsichtig sein
        $mitte = imagecolorat( $w, 30, 30 );              // muss deckend sein
        $alphaEcke  = ( $ecke >> 24 ) & 0x7F;
        $alphaMitte = ( $mitte >> 24 ) & 0x7F;
        $alphaOk = ( $alphaEcke > 100 && $alphaMitte < 20 );
        imagedestroy( $w );
    }
}
$ergebnis['png'] = array( 'stand' => $standPng, 'alphaErhalten' => $alphaOk );

/* 4b) PALETTEN-PNG mit transparentem Index.
 *
 * Der eigentliche Grund für imagepalettetotruecolor(). Ein truecolor-PNG
 * kommt auch ohne die Zeile durch — genau daran überlebte die erste
 * Mutationsprobe. Ein 8-Bit-PNG mit transparentem Farbindex ist der Fall,
 * den GD ohne Umwandlung nicht sauber nach WebP schreibt, und es ist der
 * verbreitetste PNG-Typ aus Grafikprogrammen. */
$pal = $tmp . '/palette.png';
$im = imagecreate( 200, 200 );                    // palettenbasiert, nicht truecolor
$durchsichtig = imagecolorallocate( $im, 255, 0, 255 );
imagecolortransparent( $im, $durchsichtig );
imagefilledrectangle( $im, 0, 0, 199, 199, $durchsichtig );
mt_srand( 777 );
$farben = array();
for ( $i = 0; $i < 200; $i++ ) {
    $farben[] = imagecolorallocate( $im, mt_rand( 0, 255 ), mt_rand( 0, 255 ), mt_rand( 0, 255 ) );
}
for ( $y = 20; $y < 200; $y++ ) {
    for ( $x = 20; $x < 200; $x++ ) {
        imagesetpixel( $im, $x, $y, $farben[ mt_rand( 0, 199 ) ] );
    }
}
imagepng( $im, $pal );
$warPalette = ! imageistruecolor( $im );
imagedestroy( $im );

$standPal = eb_webp_erzeugen( $pal );
$palAlpha = null;
if ( $standPal === 'erzeugt' && function_exists( 'imagecreatefromwebp' ) ) {
    $w = @imagecreatefromwebp( eb_webp_pfad( $pal ) );
    if ( $w ) {
        $aEcke  = ( imagecolorat( $w, 1, 1 ) >> 24 ) & 0x7F;
        $aMitte = ( imagecolorat( $w, 100, 100 ) >> 24 ) & 0x7F;
        $palAlpha = ( $aEcke > 100 && $aMitte < 20 );
        imagedestroy( $w );
    }
}
$ergebnis['palettePng'] = array(
    'warPalette'     => $warPalette,
    'stand'          => $standPal,
    'alphaErhalten'  => $palAlpha,
);

/* 5) GIF wird nicht angefasst — aber der Merkzettel verhindert die Endlosrunde. */
$gif = $tmp . '/bild.gif';
$im = imagecreatetruecolor( 20, 20 );
imagegif( $im, $gif );
imagedestroy( $im );
$ergebnis['gif'] = array(
    'stand'    => eb_webp_erzeugen( $gif ),
    'markerDa' => file_exists( eb_webp_marker_pfad( $gif ) ),
    'keinWebp' => ! file_exists( eb_webp_pfad( $gif ) ),
);

/* 6) Kein Bild, aber .jpg im Namen: Typ kommt aus dem Inhalt, nicht der Endung. */
$luege = $tmp . '/luege.jpg';
file_put_contents( $luege, 'das ist kein Bild' );
$ergebnis['keinBild'] = array(
    'stand'    => eb_webp_erzeugen( $luege ),
    'markerDa' => file_exists( eb_webp_marker_pfad( $luege ) ),
);

/* 7) Speicherschranke: ein absurd grosses Bild darf nicht geladen werden. */
$ergebnis['speicher'] = array(
    'winzigPasst'  => eb_webp_passt_in_speicher( 100, 100 ),
    'riesigNicht'  => eb_webp_passt_in_speicher( 60000, 60000 ),
);

/* 8) Namensschema: die Begleitdatei hängt an, sie ersetzt nicht. */
$ergebnis['namen'] = array(
    'webp'   => eb_webp_pfad( '/x/foo.jpg' ),
    'marker' => eb_webp_marker_pfad( '/x/foo.jpg' ),
);

echo json_encode( $ergebnis, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ), "\n";
