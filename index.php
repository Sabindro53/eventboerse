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

if ( preg_match('#^/listing/(\d+)#', $request_uri, $m) ) {
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
$site_url    = 'https://xn--eventbrse-q5a.de'; // IDN: eventbörse.de
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
        $canonical   = $site_url . '/listing/' . $listing_id;

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
$asset_ver = '2.4.2'; // cache-bust;
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

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
    <script type="application/ld+json"><?php echo $schema_json; ?></script>
    <?php endif; ?>

    <!-- ── Favicons ── -->
    <link rel="icon" type="image/svg+xml" href="<?php echo get_template_directory_uri(); ?>/favicon.svg">
    <link rel="apple-touch-icon" href="<?php echo get_template_directory_uri(); ?>/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#6C63FF">

    <!-- ── Preconnect für externe Ressourcen ── -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://js.stripe.com">

    <!-- ── Fonts (display:swap, kein Flash) ── -->
    <link rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
    <link rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons">

    <!-- ── App CSS ── -->
    <link rel="stylesheet"
          href="<?php echo get_template_directory_uri(); ?>/styles.css?v=<?php echo $asset_ver; ?>">

    <!-- ── WordPress Nonce (passed to app.js via inline script) ── -->
    <script>
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
</head>
<body>

<!-- App-Root (SPA rendert hier) -->
<div id="app">
    <!-- Loading Overlay -->
    <div id="app-loader" class="app-loader" role="status" aria-label="EventBörse wird geladen…">
        <div class="loader-inner">
            <div class="loader-logo">🎉</div>
            <div class="loader-spinner"></div>
        </div>
    </div>
</div>

<!-- App JS (defer: DOM first, then script) -->
<script src="<?php echo get_template_directory_uri(); ?>/app.js?v=<?php echo $asset_ver; ?>" defer></script>

<?php wp_footer(); ?>
</body>
</html>
