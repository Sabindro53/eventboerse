#!/usr/bin/env php
<?php
/**
 * csp-hq.php — prüft die CSP-Erweiterung für /hq gegen die ECHTE Direktivenliste.
 *
 * Aufgerufen von tests/e2e/verbindungen.spec.js. Ohne diese Prüfung fällt erst
 * auf der Live-Seite auf, wenn connect-src GitHub nicht erlaubt: die
 * Playwright-Tests blockieren api.github.com absichtlich und sehen deshalb
 * denselben „Failed to fetch" wie ein CSP-Verstoß.
 *
 * Gibt JSON auf stdout aus; Exit 1, sobald eine Zusicherung bricht.
 */

$src = file_get_contents(__DIR__ . '/../../functions.php');

if (!preg_match('/\$csp_directives\s*=\s*array\((.*?)\n\s*\);/s', $src, $m)) {
    fwrite(STDERR, "csp_directives nicht gefunden\n");
    exit(1);
}
preg_match_all('/"([^"]+)"/', $m[1], $dm);
$echteCsp = implode('; ', $dm[1]);

if (!preg_match('/function eb_hq_csp_erweitern\(\)\s*\{.*?\n\}/s', $src, $fm)) {
    fwrite(STDERR, "eb_hq_csp_erweitern() nicht gefunden\n");
    exit(1);
}

// Im Namespace lösen headers_list()/header() auf die Testfassungen auf, ohne
// die eingebauten Funktionen anzutasten.
$GLOBALS['gesendet'] = [];
$GLOBALS['aktuell']  = ['Content-Security-Policy: ' . $echteCsp];
eval('namespace EBTest; '
   . 'function headers_list(){ return $GLOBALS["aktuell"]; } '
   . 'function header($h, $replace = true){ $GLOBALS["gesendet"][] = $h; } '
   . $fm[0]);

\EBTest\eb_hq_csp_erweitern();
$neu = $GLOBALS['gesendet']
    ? substr($GLOBALS['gesendet'][0], strlen('Content-Security-Policy: '))
    : $echteCsp;

// Zweiter Lauf auf dem Ergebnis: darf nichts mehr senden.
$GLOBALS['aktuell']  = ['Content-Security-Policy: ' . $neu];
$GLOBALS['gesendet'] = [];
\EBTest\eb_hq_csp_erweitern();
$idempotent = empty($GLOBALS['gesendet']);

$richtwert = function (string $csp, string $direktive): string {
    return preg_match('/(^|;\s*)' . preg_quote($direktive, '/') . '\s+([^;]*)/i', $csp, $t)
        ? trim($t[2]) : '';
};

echo json_encode([
    'vorher'          => $richtwert($echteCsp, 'connect-src'),
    'nachher'         => $richtwert($neu, 'connect-src'),
    'github'          => str_contains($neu, 'https://api.github.com'),
    'raw'             => str_contains($neu, 'https://raw.githubusercontent.com'),
    'stripe'          => str_contains($neu, 'https://api.stripe.com'),
    'nominatim'       => str_contains($neu, 'https://nominatim.openstreetmap.org'),
    'self'            => str_contains($neu, "connect-src 'self'"),
    'scriptSrcGleich' => $richtwert($echteCsp, 'script-src') === $richtwert($neu, 'script-src'),
    'imgSrcGleich'    => $richtwert($echteCsp, 'img-src') === $richtwert($neu, 'img-src'),
    'einConnectSrc'   => preg_match_all('/connect-src/', $neu) === 1,
    'gleicheAnzahl'   => count(explode(';', $neu)) === count(explode(';', $echteCsp)),
    'idempotent'      => $idempotent,
    // Was der öffentliche Header NICHT enthalten darf.
    'oeffentlichOhneGithub' => !str_contains($echteCsp, 'api.github.com'),
], JSON_UNESCAPED_SLASHES);
