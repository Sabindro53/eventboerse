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
$asset_ver = '2.4.8'; // cache-bust;
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
<?php wp_head(); ?>
</head>
<body>

  <!-- ============ NAVIGATION ============ -->
  <nav id="navbar">
    <div class="nav-inner">
      <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo" onclick="navigateTo('browse');return false;">
        <span class="logo-icon material-icons-round">celebration</span>
        <span class="logo-text">Event<span class="accent">börse</span></span>
      </a>
      <div class="nav-search" id="navSearchBar">
        <button class="nav-search-segment nav-search-ai" onclick="openNavAiSearch()">
          <span class="ai-glow-dot"></span>
          <span class="label"><span class="material-icons-round ai-spark">auto_awesome</span> Suche</span>
          <span class="value" id="navAiTyping">Beschreib dein Event…</span>
        </button>
        <span class="nav-search-divider"></span>
        <div class="nav-search-segment-wrap">
          <button class="nav-search-segment" onclick="toggleNavDatePicker(event)" id="navWannBtn">
            <span class="label">Wann?</span>
            <span class="value" id="navDateValue">Zeitraum</span>
          </button>
          <div class="nav-cat-dropdown" id="navCatDropdown"></div>
        </div>
        <span class="nav-search-divider"></span>
        <button class="nav-search-segment" onclick="toggleMapOverlay()" id="navWoBtn">
          <span class="label">Wo?</span>
          <span class="value" id="navWoValue">Region</span>
        </button>
        <button class="nav-clear-search" id="navClearSearch" onclick="clearNavAiSearch()" title="Suche löschen" style="display:none">
          <span class="material-icons-round">close</span>
        </button>
        <button class="nav-search-btn" onclick="performNavSearch()">
          <span class="material-icons-round">search</span>
        </button>
      </div>
      <!-- AI Search Overlay -->
      <div class="nav-ai-overlay" id="navAiOverlay">
        <div class="nav-ai-overlay-inner">
          <div class="nav-ai-header">
            <span class="material-icons-round ai-spark-lg">auto_awesome</span>
            <span>Suche</span>
            <button class="nav-ai-close" onclick="closeNavAiSearch()"><span class="material-icons-round">close</span></button>
          </div>
          <div class="nav-ai-input-wrap">
            <span class="material-icons-round nav-ai-input-icon">search</span>
            <input type="text" id="navAiInput" class="nav-ai-input" placeholder="Was suchst du? z.B. DJ, Fotograf, Catering…" autocomplete="off" oninput="onNavAiInput()" onkeydown="if(event.key==='Enter'){submitNavAiSearch();}" />
            <div class="nav-ai-input-glow"></div>
          </div>
          <div class="nav-ai-quick-row">
            <button type="button" class="nav-ai-quick" id="navAiQuickWann" onclick="closeNavAiSearch();setTimeout(function(){toggleNavDatePicker(event)},150);">
              <span class="material-icons-round">event</span>
              <span class="nav-ai-quick-label">Wann?</span>
              <span class="nav-ai-quick-value" id="navAiQuickWannValue">Zeitraum</span>
            </button>
            <button type="button" class="nav-ai-quick" id="navAiQuickWo" onclick="closeNavAiSearch();setTimeout(function(){toggleMapOverlay()},150);">
              <span class="material-icons-round">place</span>
              <span class="nav-ai-quick-label">Wo?</span>
              <span class="nav-ai-quick-value" id="navAiQuickWoValue">Region</span>
            </button>
          </div>
          <div class="nav-ai-body" id="navAiBody">
          </div>
          <div class="nav-ai-footer">
            <button class="nav-ai-submit" onclick="submitNavAiSearch()">
              <span class="material-icons-round">search</span> Suchen
            </button>
          </div>
        </div>
      </div>
      <div class="nav-actions">
        <a href="#" class="nav-link" onclick="navigateTo('create-listing')">Inserieren</a>
        <button class="nav-icon-btn" onclick="navigateTo('messages')" title="Nachrichten">
          <span class="material-icons-round">chat_bubble_outline</span>
          <span class="badge" id="msgBadge" style="display:none"></span>
        </button>
        <button class="nav-avatar" id="avatarBtn" onclick="toggleUserMenu()">
          <span class="material-icons-round">menu</span>
          <img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2250%22%20fill%3D%22%23FF385C%22%2F%3E%3Ctext%20x%3D%2250%22%20y%3D%2250%22%20dominant-baseline%3D%22central%22%20text-anchor%3D%22middle%22%20font-size%3D%2240%22%20font-weight%3D%22700%22%20fill%3D%22%23fff%22%20font-family%3D%22sans-serif%22%3EU%3C%2Ftext%3E%3C%2Fsvg%3E" alt="User" />
          <span class="nav-admin-label" id="navAdminLabel">Admin</span>
        </button>
      </div>
    </div>
    <!-- User Dropdown -->
    <div class="user-menu" id="userMenu">
      <!-- Dark Mode Toggle (always visible) -->
      <div class="user-menu-darkmode">
        <span class="material-icons-round" id="darkModeIcon">dark_mode</span>
        <span id="darkModeLabel">Dunkelmodus</span>
        <label class="toggle-switch toggle-sm">
          <input type="checkbox" id="darkModeToggle" onchange="toggleDarkMode(this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <hr class="user-menu-hr" />
      <div class="user-menu-section" id="loggedOutMenu">
        <button onclick="openModal('loginModal')">Anmelden</button>
        <button onclick="openModal('registerModal')">Registrieren</button>
      </div>
      <div class="user-menu-section" id="loggedInMenu" style="display:none">
        <button onclick="navigateTo('profile')"><span class="material-icons-round">person</span> Mein Profil</button>
        <button onclick="navigateTo('messages')"><span class="material-icons-round">chat</span> Nachrichten</button>
        <button onclick="navigateTo('create-listing')"><span class="material-icons-round">add_circle</span> Inserat erstellen</button>
        <hr />
        <button onclick="navigateTo('my-listings')"><span class="material-icons-round">storefront</span> Meine Inserate</button>
        <button onclick="navigateTo('favorites')"><span class="material-icons-round">favorite</span> Favoriten</button>
        <button onclick="navigateTo('settings')"><span class="material-icons-round">settings</span> Einstellungen</button>
        <button id="adminMenuBtn" style="display:none" onclick="navigateTo('admin')" class="admin-menu-btn"><span class="material-icons-round">admin_panel_settings</span> Admin-Bereich</button>
        <hr />
        <button onclick="logout()"><span class="material-icons-round">logout</span> Abmelden</button>
      </div>
    </div>
  </nav>

<?php
// SPA-Inhalt aus der statischen index.html einbetten.
// WICHTIG: app.js erwartet Map-Overlay, mobile Nav und alle #page-* Sektionen im DOM.
$template_dir = get_template_directory();
$html_file = $template_dir . '/index.html';

if ( file_exists( $html_file ) && is_readable( $html_file ) ) {
    $html = file_get_contents( $html_file );
    if ( is_string( $html ) && $html !== '' ) {
        // Nach der Navigation einsteigen (Map-Overlay + alle App-Pages).
        $start = strpos( $html, '<!-- ============ MAP OVERLAY' );
        // Fallback: falls Marker fehlt, ab <main> einsteigen.
        if ( $start === false ) {
            $start = strpos( $html, '<main>' );
        }
        $end = stripos( $html, '</body>' );

        if ( $start !== false && $end !== false && $end > $start ) {
            $content = substr( $html, $start, $end - $start );
            // Externes app.js aus dem statischen Snapshot entfernen;
            // im WP-Theme wird app.js bereits via wp_enqueue_script geladen.
            $content = preg_replace(
                '#<script\b[^>]*src=["\'][^"\']*app\.js[^"\']*["\'][^>]*>\s*</script>#i',
                '',
                $content
            );
            // Direkter Output: trusted Theme-Datei mit bewusstem HTML-Markup.
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            echo $content;
        }
    }
}
?>

<?php wp_footer(); ?>
</body>
</html>
