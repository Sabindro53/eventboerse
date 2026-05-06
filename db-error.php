<?php
/**
 * WordPress lädt diese Datei automatisch, wenn keine DB-Verbindung möglich ist.
 * Liegt im Theme-Root, weil das Repo das Theme deployt; bei Bedarf zusätzlich
 * nach /wp-content/db-error.php verschieben (von WP zuerst gesucht).
 *
 * Zweck: kein Stack-Trace, kein WP-Branding, klare Nutzerinformation.
 */
http_response_code( 503 );
header( 'Content-Type: text/html; charset=utf-8' );
header( 'Retry-After: 300' );
header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
?><!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Eventbörse – Wartungsarbeiten</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: linear-gradient(135deg, #fff 0%, #fff5f7 100%);
    color: #222;
    padding: 24px;
  }
  .card {
    max-width: 520px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    padding: 40px 32px;
    text-align: center;
  }
  .icon {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: #ff385c;
    color: #fff;
    display: inline-grid; place-items: center;
    font-size: 32px; font-weight: 700;
    margin-bottom: 16px;
  }
  h1 { font-size: 1.4rem; margin: 0 0 8px; }
  p { line-height: 1.6; color: #555; margin: 8px 0; }
  .ref { font-size: 0.8rem; color: #999; margin-top: 16px; }
  a { color: #ff385c; text-decoration: none; font-weight: 600; }
  a:hover { text-decoration: underline; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #eee; }
    .card { background: #2a2a2a; }
    p { color: #bbb; }
    .ref { color: #777; }
  }
</style>
</head>
<body>
  <main class="card" role="main">
    <div class="icon" aria-hidden="true">E</div>
    <h1>Kurz nicht erreichbar</h1>
    <p>Wir führen gerade Wartungsarbeiten durch. Bitte versuche es in wenigen Minuten erneut.</p>
    <p>Bei dringenden Anliegen erreichst du uns unter <a href="mailto:kontakt@eventbörse.de">kontakt@eventbörse.de</a>.</p>
    <p class="ref">Status&nbsp;503 · <?php echo gmdate( 'Y-m-d H:i' ); ?>&nbsp;UTC</p>
  </main>
</body>
</html>
