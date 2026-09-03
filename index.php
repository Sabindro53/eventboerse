<?php
/**
 * EventBörse – Main SPA Template
 * WordPress renders this for all routes. Meta tags are set dynamically
 * based on the requested path so crawlers see meaningful content.
 */

// Determine current route from request URI
$request_uri   = isset($_SERVER['REQUEST_URI']) ? strtok($_SERVER['REQUEST_URI'], '?') : '/';
$request_uri   = rtrim($request_uri, '/') ?: '/';

// Extract listing/provider ID from URL for structured data
$listing_id    = 0;
$provider_id   = 0;
$page_type     = 'home';

if ( preg_match('#^/detail/(\d+)#', $request_uri, $m) ) {
    $url_id     = (int) $m[1];
    $listing_id = $url_id > 10000 ? $url_id - 10000 : $url_id; // Frontend nutzt +10000-Offset
    $page_type  = 'listing';
} elseif ( preg_match('#^/listing/(\d+)#', $request_uri, $m) ) {
    $listing_id = (int) $m[1];
    $page_type  = 'listing';
} elseif ( preg_match('#^/provider/(\d+)#', $request_uri, $m) ) {
    $provider_id = (int) $m[1];
    $page_type   = 'provider';
} elseif ( strpos($request_uri, '/browse') === 0 ) {
    $page_type = 'browse';
} elseif ( strpos($request_uri, '/board') === 0 ) {
    $page_type = 'board';
}

// Default SEO values
$site_name   = 'EventBörse';
$site_url    = rtrim( home_url(), '/' ); // IDN-Domain aus WP — nie hardcoden (vermeidet falsches Punycode)
$og_image    = $site_url . '/wp-content/themes/eventboerse/og-image.jpg';
$meta_title  = 'EventBörse – Dein Event-Marktplatz für Deutschland';
$meta_desc   = 'Finde DJs, Catering, Fotografen, Locations und mehr für dein nächstes Event. Deutschlands größter Marktplatz für Event-Dienstleister.';
$canonical   = $site_url . $request_uri;
$schema_json = '';

// Per-page overrides
if ( $page_type === 'browse' ) {
    $meta_title = 'Dienstleister entdecken – EventBörse';
    $meta_desc  = 'Durchsuche hunderte von Event-Dienstleistern: DJs, Catering, Fotografen, Locations, Floristen und mehr. Jetzt auf EventBörse.';
    $canonical  = $site_url . '/browse';
}

if ( $page_type === 'listing' && $listing_id > 0 ) {
    // Try to load listing data for richer meta
    global $wpdb;
    $table   = $wpdb->prefix . 'eb_listings';
    $listing = $wpdb->get_row( $wpdb->prepare(
        "SELECT title, description, category_label, location, images FROM {$table} WHERE id = %d AND status = 'active'",
        $listing_id
    ) );

    if ( $listing ) {
        $title_safe  = esc_html( $listing->title );
        $cat_safe    = esc_html( $listing->category_label );
        $loc_safe    = esc_html( $listing->location );
        $desc_text   = wp_strip_all_tags( $listing->description );
        $desc_short  = mb_substr( $desc_text, 0, 155 );

        $meta_title  = $title_safe . ' – ' . $cat_safe . ' | EventBörse';
        $meta_desc   = $desc_short ? $desc_short . '…' : 'Jetzt ' . $cat_safe . ' in ' . $loc_safe . ' auf EventBörse buchen.';
        $canonical   = $site_url . '/detail/' . ( 10000 + $listing_id );

        // Listing image for OG
        $images = json_decode( $listing->images, true );
        if ( ! empty( $images[0] ) ) {
            $og_image = esc_url( $images[0] );
        }

        // JSON-LD: Service schema
        $schema_json = json_encode([
            '@context' => 'https://schema.org',
            '@type'    => 'Service',
            'name'     => $listing->title,
            'description' => $desc_short,
            'areaServed' => [
                '@type' => 'Place',
                'name'  => $listing->location,
            ],
            'provider' => [
                '@type' => 'LocalBusiness',
                'name'  => $listing->title,
            ],
            'url' => $canonical,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

// Home page JSON-LD
if ( $page_type === 'home' ) {
    $schema_json = json_encode([
        '@context' => 'https://schema.org',
        '@type'    => 'WebSite',
        'name'     => 'EventBörse',
        'url'      => $site_url,
        'description' => $meta_desc,
        'potentialAction' => [
            '@type'       => 'SearchAction',
            'target'      => [
                '@type'       => 'EntryPoint',
                'urlTemplate' => $site_url . '/browse?q={search_term_string}',
            ],
            'query-input' => 'required name=search_term_string',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// Sanitize for HTML output
$meta_title_esc = esc_attr( $meta_title );
$meta_desc_esc  = esc_attr( $meta_desc );
$canonical_esc  = esc_url( $canonical );
$og_image_esc   = esc_url( $og_image );
$site_name_esc  = esc_attr( $site_name );

// Cache-version string for assets (increment manually on deploy)
$asset_ver = '2.5.1'; // cache-bust;
$release_css_ver = file_exists( __DIR__ . '/release-vision.css' )
    ? filemtime( __DIR__ . '/release-vision.css' )
    : $asset_ver;
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <!-- viewport-fit=cover schaltet env(safe-area-inset-*) ueberhaupt erst
         ein. styles.css rechnet an SECHS Stellen damit — untere Navigation,
         Buchungsleiste, Panels. Ohne dieses Attribut liefert jede dieser
         Abfragen 0, und zwar still: das Layout sieht auf dem Schreibtisch
         richtig aus und liegt auf einem iPhone mit Home-Indikator darunter.
         Die Behandlung war also da und war wirkungslos.

         Nachgetragen am 02.09.2026 im Zuge der App: in einem nativen
         Container ist das kein Schoenheitsfehler mehr, sondern der
         Unterschied zwischen bedienbar und nicht bedienbar. -->
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover">

    <!-- ── Primary SEO ── -->
    <title><?php echo $meta_title_esc; ?></title>
    <meta name="description" content="<?php echo $meta_desc_esc; ?>">
    <link rel="canonical" href="<?php echo $canonical_esc; ?>">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">

    <!-- ── Open Graph ── -->
    <meta property="og:type"        content="website">
    <meta property="og:site_name"   content="<?php echo $site_name_esc; ?>">
    <meta property="og:title"       content="<?php echo $meta_title_esc; ?>">
    <meta property="og:description" content="<?php echo $meta_desc_esc; ?>">
    <meta property="og:url"         content="<?php echo $canonical_esc; ?>">
    <meta property="og:image"       content="<?php echo $og_image_esc; ?>">
    <meta property="og:image:width"  content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale"      content="de_DE">

    <!-- ── Twitter Card ── -->
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:title"       content="<?php echo $meta_title_esc; ?>">
    <meta name="twitter:description" content="<?php echo $meta_desc_esc; ?>">
    <meta name="twitter:image"       content="<?php echo $og_image_esc; ?>">

    <!-- ── Structured Data ── -->
    <?php if ( $schema_json ) : ?>
    <script type="application/ld+json" nonce="<?php echo esc_attr( eb_csp_nonce() ); ?>"><?php echo $schema_json; ?></script>
    <?php endif; ?>

    <!-- ── Favicons ── -->
    <link rel="icon" type="image/svg+xml" href="<?php echo get_template_directory_uri(); ?>/favicon.svg">
    <link rel="apple-touch-icon" href="<?php echo get_template_directory_uri(); ?>/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="format-detection" content="telephone=no">

    <!-- ── Statusleisten-Farbe ──
         Hier stand bis zum 02.09.2026 ein einzelnes #6C63FF. Diese Farbe kommt
         im ganzen Projekt sonst nur noch in generate-icons.html vor, einem
         Werkzeug, das nichts ausliefert; die Marke ist #FF385C (62 Fundstellen
         in styles.css). Das Lila war also weder Marke noch Hintergrund, und im
         installierten oder nativen Betrieb faerbt genau dieser Wert den
         Bereich um die Statusleiste.

         Zwei Werte statt einem, wie in der Dev-Shell: der Kopf soll die Farbe
         des Seitenhintergrunds tragen, und der wechselt mit dem Farbmodus. Ein
         fester Wert ist in einem der beiden Modi immer falsch.

         Die theme_color der manifest.json (#FF385C) bleibt davon unberuehrt —
         sie faerbt den Splash und die App-Uebersicht, nicht den Seitenkopf. -->
    <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">

    <!-- ── Nativer Vollbildbetrieb (iOS) ──
         Ohne diese beiden zeigt iOS im Homescreen-Betrieb weiter die
         Safari-Leisten. `black-translucent` legt den Inhalt UNTER die
         Statusleiste — was nur zusammen mit viewport-fit=cover oben und den
         safe-area-Abstaenden in styles.css bedienbar bleibt. Die drei
         gehoeren zusammen; einzeln ist jedes davon ein Fehler. -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Eventbörse">

    <!-- ── Preconnect ── Schriften und Bibliotheken liegen im Theme. Die
         Demo-Bilder kommen weiterhin von Pexels; dort spart die vorgezogene
         Verbindung den DNS- und TLS-Aufbau vor dem ersten Bild. -->
    <!-- Kein preconnect auf js.stripe.com mehr. Seit dem 02.09.2026 wird die
         Bibliothek erst beim Oeffnen des Zahlungsdialogs geholt; eine
         vorgezogene Verbindung auf jeder Seite waere genau der
         Drittanbieter-Kontakt, den die Umstellung beseitigt — nur ohne den
         Nutzen, den sie frueher hatte. -->
    <link rel="preconnect" href="https://images.pexels.com" crossorigin>

    <!-- ── Schriften vorziehen ──
         Ohne Preload ist die Kette drei Runden lang: HTML → fonts.css →
         parsen → Schriftdatei. Der Browser erfährt erst nach dem Parsen des
         Stylesheets, dass er sie überhaupt braucht.

         Für Material Icons ist das mehr als eine Verzögerung: die Familie
         steht auf `font-display: block`, ihre Glyphen sind bis zum Laden
         also UNSICHTBAR. Jeder Knopf mit Symbol ist so lange leer.

         `crossorigin` ist Pflicht, auch bei eigener Herkunft — Schriften
         werden im CORS-Modus geholt, und ohne das Attribut lädt der Browser
         sie ein zweites Mal statt den Preload zu benutzen. -->
    <link rel="preload" as="font" type="font/woff2" crossorigin
          href="<?php echo get_template_directory_uri(); ?>/assets/fonts/inter-latin-wght-normal.woff2">
    <link rel="preload" as="font" type="font/woff2" crossorigin
          href="<?php echo get_template_directory_uri(); ?>/assets/fonts/material-icons-round.woff2">

    <!-- ── fonts.css und styles.css stehen NICHT hier ──
         Sie werden in eventboerse_enqueue_assets() eingebunden und landen ueber
         wp_head() weiter unten in diesem Kopf. Bis zum 01.09.2026 standen sie
         ZUSAETZLICH hier, und beide Fassungen wurden wirklich uebertragen: der
         Lighthouse-Lauf vom 31.08. zeigt styles.css?v=2.5.1 und
         styles.css?ver=1787748136 als zwei Anfragen zu je 68 KB, fonts.css
         ebenso. 70 KB doppelt, beide den Aufbau blockierend.

         Fuer die Schriften wurde genau dieser Fehler am 21.08.2026 schon einmal
         behoben — der Kommentar stand danach ueber der Zeile, die er beschrieb.
         Der zweite Weg blieb offen.

         Die feste Kopie war ausserdem die schlechtere: $asset_ver ist eine von
         Hand gepflegte Nummer, die seit 2.5.1 niemand hochgezaehlt hat. Nach
         einem Deploy liefert sie den alten Stand aus dem Zwischenspeicher,
         waehrend die eingebundene Fassung ueber filemtime frisch kommt.

         An der Kaskade aendert das Entfernen nichts: die eingebundene Fassung
         kam schon vorher zuletzt und hat damit ohnehin entschieden.

         Wer hier wieder ein <link> auf eine bereits eingebundene Datei setzt,
         laedt sie doppelt — pruefstand: tests/e2e/auslieferung.spec.js. -->

    <!-- ── App CSS: nur was NICHT ueber wp_enqueue_style laeuft ── -->
    <link rel="stylesheet"
          href="<?php echo get_template_directory_uri(); ?>/ui-enhancements.css?v=<?php echo $asset_ver; ?>">
    <link rel="stylesheet"
          href="<?php echo get_template_directory_uri(); ?>/release-vision.css?v=<?php echo esc_attr( $release_css_ver ); ?>">

    <!-- ── WordPress Nonce (passed to app.js via inline script) ── -->
    <script nonce="<?php echo esc_attr( eb_csp_nonce() ); ?>">
    window.eventboerseApi = {
        restUrl : <?php echo json_encode( esc_url_raw( rest_url('eventboerse/v1/') ) ); ?>,
        nonce   : <?php echo json_encode( wp_create_nonce('wp_rest') ); ?>,
        user    : <?php
            $current_user = wp_get_current_user();
            if ( $current_user->ID ) {
                echo json_encode([
                    'id'       => $current_user->ID,
                    'name'     => $current_user->display_name,
                    'email'    => $current_user->user_email,
                    'role'     => get_user_meta( $current_user->ID, 'eb_role', true ),
                    'photoUrl' => get_user_meta( $current_user->ID, 'eb_photo_url', true ),
                ]);
            } else {
                echo 'null';
            }
        ?>
    };
    </script>
<?php wp_head(); ?>
</head>
<body>
<?php eb_shell_ausgeben(); // wie readfile, setzt aber das CSP-Nonce ?>
<?php wp_footer(); ?>
</body>
</html>
