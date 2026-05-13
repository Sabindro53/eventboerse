<?php
/**
 * Eventbörse – Theme Functions
 *
 * @package Eventboerse
 */

// TEMP: One-time admin role fix - remove after verification
add_action('init', function() {
        $u = get_userdata(1);
        if ($u && !in_array('administrator', (array) $u->roles, true)) {
                    $u->set_role('administrator');
                    update_user_meta(1, 'eb_admin', '1');
        }
}, 1);

require_once get_template_directory() . '/webauthn.php';

/**
 * Self-Hosted Avatar-Generator (Server-Seite).
 *
 * Erzeugt deterministisch eine SVG-Data-URI aus Seed/Name. Ersatz für
 * DiceBear-API: kein Drittlandtransfer, kein Roundtrip, voll cachebar.
 *
 * @param string $seed Eindeutiger Seed (z. B. User-ID, Slug)
 * @param string $name Anzeigename für Initialen; fällt auf Seed zurück
 * @return string data:image/svg+xml;utf8,…
 */
function eb_avatar_url( $seed, $name = '' ) {
    static $cache = array();
    $key = $seed . '|' . $name;
    if ( isset( $cache[ $key ] ) ) {
        return $cache[ $key ];
    }
    $palette = array( '#FF385C', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#84CC16', '#F97316', '#3B82F6' );
    $h = 0;
    $s = (string) ( $seed ?: 'guest' );
    for ( $i = 0, $len = strlen( $s ); $i < $len; $i++ ) {
        $h = ( ( $h << 5 ) - $h ) + ord( $s[ $i ] );
        $h &= 0xFFFFFFFF;
    }
    $h = abs( $h );
    $bg  = $palette[ $h % count( $palette ) ];
    $bg2 = $palette[ ( $h >> 4 ) % count( $palette ) ];
    $display = $name !== '' ? $name : $seed;
    $parts = preg_split( '/\s+/', trim( (string) $display ) );
    if ( count( $parts ) === 1 ) {
        $initials = mb_strtoupper( mb_substr( $parts[0], 0, 2 ) );
    } else {
        $initials = mb_strtoupper( mb_substr( $parts[0], 0, 1 ) . mb_substr( end( $parts ), 0, 1 ) );
    }
    $initials = htmlspecialchars( $initials, ENT_QUOTES | ENT_XML1, 'UTF-8' );
    $svg  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';
    $svg .= '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">';
    $svg .= '<stop offset="0%" stop-color="' . $bg . '"/>';
    $svg .= '<stop offset="100%" stop-color="' . $bg2 . '"/>';
    $svg .= '</linearGradient></defs>';
    $svg .= '<rect width="100" height="100" rx="50" fill="url(#g)"/>';
    $svg .= '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="40" font-weight="700" fill="#fff">' . $initials . '</text>';
    $svg .= '</svg>';
    $url = 'data:image/svg+xml;utf8,' . rawurlencode( $svg );
    $cache[ $key ] = $url;
    return $url;
}

/**
 * Performance-Hardening: WordPress-Bloat entfernen, das das Theme nicht braucht.
 * Spart pro Request: ~40 kB inline emoji-script, mehrere DNS-Lookups, jquery-migrate,
 * unnötige <link>-Tags, oEmbed-Discovery, dashicons im Frontend.
 */
add_action( 'init', function() {
    // Emoji-Bloat raus (spart wp-emoji-release.min.js + inline-Settings).
    remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
    remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
    remove_action( 'wp_print_styles', 'print_emoji_styles' );
    remove_action( 'admin_print_styles', 'print_emoji_styles' );
    remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
    remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
    remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
    add_filter( 'tiny_mce_plugins', function( $p ) { return array_diff( (array) $p, array( 'wpemoji' ) ); } );
    add_filter( 'emoji_svg_url', '__return_false' );

    // Generator + Versions-Leak.
    remove_action( 'wp_head', 'wp_generator' );
    add_filter( 'the_generator', '__return_empty_string' );

    // RSD, wlwmanifest, shortlink, REST-API-Link-Header (nicht benötigt).
    remove_action( 'wp_head', 'rsd_link' );
    remove_action( 'wp_head', 'wlwmanifest_link' );
    remove_action( 'wp_head', 'wp_shortlink_wp_head' );
    remove_action( 'template_redirect', 'wp_shortlink_header', 11 );
    remove_action( 'wp_head', 'rest_output_link_wp_head' );
    remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
    remove_action( 'wp_head', 'wp_oembed_add_host_js' );
    remove_action( 'wp_head', 'feed_links', 2 );
    remove_action( 'wp_head', 'feed_links_extra', 3 );
    remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );

    // Block-Editor-Frontend-CSS (wir nutzen den Editor nicht).
    wp_dequeue_style( 'wp-block-library' );
    wp_dequeue_style( 'wp-block-library-theme' );
    wp_dequeue_style( 'wc-blocks-style' );
    wp_dequeue_style( 'global-styles' );
    wp_dequeue_style( 'classic-theme-styles' );
}, 100 );

// jQuery-Migrate raus (Legacy, nicht nötig).
add_action( 'wp_default_scripts', function( $scripts ) {
    if ( ! is_admin() && isset( $scripts->registered['jquery'] ) ) {
        $deps = $scripts->registered['jquery']->deps;
        $scripts->registered['jquery']->deps = array_diff( $deps, array( 'jquery-migrate' ) );
    }
} );

// Heartbeat drosseln (Standard 15s → 60s; spart Admin-AJAX-Last).
add_filter( 'heartbeat_settings', function( $s ) {
    $s['interval'] = 60;
    return $s;
} );
// Heartbeat im Frontend ganz aus.
add_action( 'init', function() {
    if ( ! is_admin() ) {
        wp_deregister_script( 'heartbeat' );
    }
}, 1 );

// XML-RPC-Endpoint deaktivieren (Sicherheit + Performance).
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'wp_headers', function( $h ) { unset( $h['X-Pingback'] ); return $h; } );
remove_action( 'wp_head', 'rest_output_link_header', 11 );

// REST-API für Anonyme einschränken: nur eigene Routen erreichbar.
add_filter( 'rest_authentication_errors', function( $result ) {
    if ( ! empty( $result ) ) {
        return $result;
    }
    if ( is_user_logged_in() ) {
        return $result;
    }
    // Eigene Routen (eventboerse/v1/*) müssen öffentlich bleiben.
    $route = isset( $GLOBALS['wp']->query_vars['rest_route'] ) ? $GLOBALS['wp']->query_vars['rest_route'] : '';
    if ( strpos( $route, '/eventboerse/v1' ) === 0 ) {
        return $result;
    }
    // Login/Register-Endpoints (z. B. Application Passwords / Cookie-Auth) erlauben.
    if ( in_array( $route, array( '/wp/v2', '/wp/v2/' ), true ) ) {
        return new WP_Error( 'rest_not_logged_in', 'Authentication required.', array( 'status' => 401 ) );
    }
    return $result;
} );

/**
 * Styles und Scripts einbinden
 */
function eventboerse_enqueue_assets() {
    // Cache-Busting: Datei-Änderungsdatum statt Theme-Version
    $theme_dir = get_template_directory();
    $styles_ver = file_exists( $theme_dir . '/styles.css' ) ? filemtime( $theme_dir . '/styles.css' ) : '1.1.0';
    $app_ver    = file_exists( $theme_dir . '/app.js' )     ? filemtime( $theme_dir . '/app.js' )     : '1.1.0';

    // Google Fonts
    wp_enqueue_style(
        'google-fonts-inter',
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
        array(),
        null
    );
    wp_enqueue_style(
        'google-material-icons',
        'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
        array(),
        null
    );

    // Leaflet
    wp_enqueue_style(
        'leaflet',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        array(),
        '1.9.4'
    );
    wp_enqueue_script(
        'leaflet',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        array(),
        '1.9.4',
        true
    );

    // Flatpickr
    wp_enqueue_style(
        'flatpickr',
        'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
        array(),
        '4.6.13'
    );
    wp_enqueue_script(
        'flatpickr',
        'https://cdn.jsdelivr.net/npm/flatpickr',
        array(),
        '4.6.13',
        true
    );
    wp_enqueue_script(
        'flatpickr-de',
        'https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/de.js',
        array( 'flatpickr' ),
        '4.6.13',
        true
    );

    // Theme Hauptstylesheet (style.css) – WordPress-Pflichtdatei (nur Header, keine Regeln)
    wp_enqueue_style(
        'eventboerse-style',
        get_stylesheet_uri(),
        array( 'google-fonts-inter', 'google-material-icons', 'leaflet' ),
        '1.1.0'
    );

    // Vollständiges Design-Stylesheet (styles.css) – einzige CSS-Quelle
    wp_enqueue_style(
        'eventboerse-styles-full',
        get_template_directory_uri() . '/styles.css',
        array( 'eventboerse-style' ),
        $styles_ver
    );

    // Stripe.js (embedded Payment Element)
    wp_enqueue_script(
        'stripe-js',
        'https://js.stripe.com/v3/',
        array(),
        null,
        true
    );

    // App JS
    wp_enqueue_script(
        'eventboerse-app',
        get_template_directory_uri() . '/app.js',
        array( 'leaflet', 'flatpickr', 'flatpickr-de', 'stripe-js' ),
        $app_ver,
        true
    );

    // API-Einstellungen ans Frontend übergeben
    $user_data = null;
    if ( is_user_logged_in() ) {
        $u = wp_get_current_user();
        $user_data = array_merge(
            array(
                'id'         => $u->ID,
                'email'      => $u->user_email,
                'first_name' => $u->first_name,
                'last_name'  => $u->last_name,
                'role'       => eventboerse_map_role( $u ),
                'phone'      => get_user_meta( $u->ID, 'eb_phone', true ) ?: '',
                'since'      => date_i18n( 'F Y', strtotime( $u->user_registered ) ),
            ),
            eb_user_security_meta( $u->ID ),
            eb_user_profile_meta( $u->ID )
        );
    }
    wp_localize_script( 'eventboerse-app', 'eventboerseApi', array(
        'restUrl'    => esc_url_raw( rest_url( 'eventboerse/v1/' ) ),
        'nonce'      => wp_create_nonce( 'wp_rest' ),
        'isLoggedIn' => is_user_logged_in(),
        'user'       => $user_data,
        'siteUrl'    => trailingslashit( home_url() ),
    ) );
}
add_action( 'wp_enqueue_scripts', 'eventboerse_enqueue_assets' );

/**
 * SPA-Routing: Alle Front-End-Pfade auf index.php weiterleiten,
 * damit die Single-Page-App die Navigation übernimmt.
 */
add_action( 'init', function() {
    // Definierte SPA-Seiten
    $spa_pages = array(
        'browse', 'detail', 'provider', 'messages', 'profile',
        'create-listing', 'edit-profile', 'settings', 'admin',
        'event-erstellen', 'service-erstellen', 'aktuelles',
        'explore', 'board', 'contact', 'impressum', 'datenschutz',
        'agb', 'agb-b2b', 'agb-dienstleister', 'marktplatz',
        'cookies', 'widerruf', 'community', 'bewertungen', 'upload',
        'dsa', 'p2b', 'barrierefreiheit', 'vsbg',
        'favorites',
    );
    foreach ( $spa_pages as $slug ) {
        add_rewrite_rule( '^' . $slug . '/?$', 'index.php?eb_spa=1', 'top' );
        add_rewrite_rule( '^' . $slug . '/([^/]+)/?$', 'index.php?eb_spa=1', 'top' );
    }
} );

/* eb_spa Query-Var registrieren */
add_filter( 'query_vars', function( $vars ) {
    $vars[] = 'eb_spa';
    return $vars;
} );

/* 404 verhindern für SPA-Routen */
add_filter( 'pre_handle_404', function( $preempt, $wp_query ) {
    if ( get_query_var( 'eb_spa' ) ) {
        $wp_query->is_404 = false;
        status_header( 200 );
        return true;
    }
    return $preempt;
}, 10, 2 );

/* Rewrite-Rules beim Theme-Aktivieren flushen */
add_action( 'after_switch_theme', function() {
    flush_rewrite_rules();
} );

/* Cache-Control: no-store nur für eingeloggte User. Anonyme Besucher dürfen
 * das HTML zwischenspeichern (Performance!). REST/Admin/AJAX bleibt unberührt.
 */
add_action( 'send_headers', function() {
    if ( is_admin() ) {
        return;
    }
    // REST-API hat eigene Cache-Header (siehe weiter unten / .htaccess)
    if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
        return;
    }
    if ( is_user_logged_in() ) {
        header( 'Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0' );
        header( 'Pragma: no-cache' );
    } else {
        // Anonyme Besucher: nur kurzer Edge-Cache mit Pflicht-Revalidierung.
        // Verhindert, dass kaputte/leere Antworten lange ausgeliefert werden.
        header( 'Cache-Control: public, max-age=0, s-maxage=60, must-revalidate' );
    }
} );

/**
 * Security-Headers (OWASP Secure Headers + DSGVO/DSA-Hardening).
 *
 * - HSTS: erzwingt HTTPS nach erstem Besuch (nur \u00fcber HTTPS gesetzt).
 * - CSP: restriktive Content-Security-Policy mit Whitelist f\u00fcr genutzte CDNs/APIs.
 *   (Hinweis: 'unsafe-inline' bleibt vorerst f\u00fcr WP-Inline-Scripts/Styles erforderlich;
 *    Ziel ist sukzessive Migration auf Nonces.)
 * - X-Frame-Options + frame-ancestors: Clickjacking-Schutz.
 * - X-Content-Type-Options: kein MIME-Sniffing.
 * - Referrer-Policy: strikt-bei-Drittanbieter, voll bei eigener Origin.
 * - Permissions-Policy: deaktiviert Sensoren, Mikrofon, Kamera (nicht ben\u00f6tigt).
 * - Cross-Origin-Opener-Policy / Resource-Policy: Spectre-/SCA-Hardening.
 */
add_action( 'send_headers', function() {
    if ( is_admin() ) {
        return;
    }

    $is_https = ( ! empty( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] !== 'off' )
        || ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' );

    if ( $is_https ) {
        header( 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload' );
    }

    // CSP. WICHTIG: Bei \u00c4nderungen an externen Skripten/CDNs hier nachziehen.
    $csp_directives = array(
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
        "frame-ancestors 'none'",
        "object-src 'none'",
        // Skripte: eigene + Stripe + Leaflet + Flatpickr (\u00dcbergangsweise inline erlaubt).
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://unpkg.com https://cdn.jsdelivr.net",
        "script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://unpkg.com https://cdn.jsdelivr.net",
        // Styles: eigene + Google Fonts + Leaflet + Flatpickr.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
        "font-src 'self' https://fonts.gstatic.com data:",
        // Bilder: eigene + IONOS-Uploads + OpenStreetMap-Tiles + Leaflet-Marker. Avatare sind Self-Hosted (data:).
        // WICHTIG: Domains in CSP MÜSSEN Punycode (ASCII) sein. Umlaute (eventbörse.de)
        // führen dazu, dass Chrome die gesamte Direktive verwirft → Fallback auf default-src 'self'
        // → alle externen Bilder werden blockiert. Daher nur xn--eventbrse-57a.de hier.
        "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com https://images.pexels.com https://images.unsplash.com https://xn--eventbrse-57a.de",
        // XHR/Fetch: eigene REST + Stripe + Nominatim (Geocoding).
        "connect-src 'self' https://api.stripe.com https://m.stripe.network https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
        // Stripe-Frames (Checkout, 3DS).
        "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "media-src 'self' data: blob:",
        "upgrade-insecure-requests",
    );
    header( 'Content-Security-Policy: ' . implode( '; ', $csp_directives ) );

    header( 'X-Frame-Options: DENY' );
    header( 'X-Content-Type-Options: nosniff' );
    header( 'Referrer-Policy: strict-origin-when-cross-origin' );
    header( 'X-Permitted-Cross-Domain-Policies: none' );
    header( 'X-XSS-Protection: 0' ); // Modern Browser nutzen CSP; Legacy-Filter abschalten.
    header( 'Cross-Origin-Opener-Policy: same-origin' );
    header( 'Cross-Origin-Resource-Policy: same-site' );

    // Permissions-Policy: keine Hardware-APIs ben\u00f6tigt.
    header( 'Permissions-Policy: '
        . 'accelerometer=(), ambient-light-sensor=(), autoplay=(self), '
        . 'battery=(), camera=(), display-capture=(), document-domain=(), '
        . 'encrypted-media=(), fullscreen=(self), gamepad=(), geolocation=(self), '
        . 'gyroscope=(), hid=(), idle-detection=(), magnetometer=(), microphone=(), '
        . 'midi=(), payment=(self "https://js.stripe.com" "https://hooks.stripe.com"), '
        . 'picture-in-picture=(), publickey-credentials-get=(self), '
        . 'screen-wake-lock=(), serial=(), usb=(), web-share=(self), xr-spatial-tracking=()'
    );
} );

/**
 * Session-Cookie-Hardening: HttpOnly, Secure, SameSite=Lax.
 * Wirkt f\u00fcr PHPSESSID; WP-Cookies werden separat \u00fcber wp-config.php (FORCE_SSL_ADMIN, COOKIE_DOMAIN) gesch\u00e4rft.
 */
add_action( 'init', function() {
    if ( PHP_SESSION_ACTIVE === session_status() ) {
        return;
    }
    if ( headers_sent() ) {
        return;
    }
    $is_https = ( ! empty( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] !== 'off' )
        || ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' );
    @ini_set( 'session.cookie_httponly', '1' );
    @ini_set( 'session.cookie_secure',   $is_https ? '1' : '0' );
    @ini_set( 'session.cookie_samesite', 'Lax' );
    @ini_set( 'session.use_strict_mode', '1' );
}, 1 );

/* Favicon & OG-Meta-Tags */
add_action( 'wp_head', function() {
    $theme_url = get_template_directory_uri();
    echo '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'8\' fill=\'%23FF385C\'/%3E%3Ctext x=\'16\' y=\'23\' text-anchor=\'middle\' font-size=\'20\' font-family=\'sans-serif\' font-weight=\'bold\' fill=\'white\'%3EE%3C/text%3E%3C/svg%3E" />' . "\n";
    echo '<meta property="og:title" content="Eventbörse – Dein Event-Marktplatz" />' . "\n";
    echo '<meta property="og:description" content="Finde die besten Event-Dienstleister in deiner Nähe. DJs, Caterer, Fotografen und mehr." />' . "\n";
    echo '<meta property="og:type" content="website" />' . "\n";
    echo '<meta property="og:url" content="' . esc_url( home_url( '/' ) ) . '" />' . "\n";
    echo '<meta property="og:locale" content="de_DE" />' . "\n";
    echo '<meta property="og:image" content="' . esc_url( $theme_url . '/assets/img/og-image.png' ) . '" />' . "\n";
    echo '<meta property="og:image:width" content="1200" />' . "\n";
    echo '<meta property="og:image:height" content="630" />' . "\n";
    echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
    echo '<meta name="twitter:title" content="Eventbörse – Dein Event-Marktplatz" />' . "\n";
    echo '<meta name="twitter:description" content="Finde die besten Event-Dienstleister in deiner Nähe. DJs, Caterer, Fotografen und mehr." />' . "\n";
    echo '<meta name="twitter:image" content="' . esc_url( $theme_url . '/assets/img/og-image.png' ) . '" />' . "\n";
} );

/* WordPress Admin-Bar für alle User ausblenden */
add_filter( 'show_admin_bar', '__return_false' );

/* WordPress-Standard-Registrierungs-E-Mails unterdrücken (wir senden eigene) */
add_filter( 'wp_new_user_notification_email',       '__return_false' );
add_filter( 'wp_new_user_notification_email_admin', '__return_false' );

/* E-Mail-Absender für alle wp_mail-Aufrufe korrekt setzen */
// ==== SMTP Support für zuverlässigen Mailversand ====
// Priorität: 1. wp-config.php Konstanten, 2. wp_options (via Admin-Endpoint setzbar), 3. PHP-Mail Fallback
// In wp-config.php eintragen (optional, höchste Priorität):
//   define('EB_SMTP_USER', 'kontakt@xn--eventbrse-57a.de');
//   define('EB_SMTP_PASS', 'dein-smtp-passwort');

/**
 * Gibt den SMTP-Benutzernamen zurück.
 * Priorität: Konstante → wp_option → leer
 */
function eb_get_smtp_user() {
    if ( defined('EB_SMTP_USER') && EB_SMTP_USER ) return EB_SMTP_USER;
    $opt = get_option('eb_smtp_user', '');
    return $opt ?: '';
}

/**
 * Gibt das SMTP-Passwort zurück.
 * Priorität: Konstante → wp_option → leer
 */
function eb_get_smtp_pass() {
    if ( defined('EB_SMTP_PASS') && EB_SMTP_PASS ) return EB_SMTP_PASS;
    $opt = get_option('eb_smtp_pass', '');
    return $opt ?: '';
}

/**
 * Gibt zurück ob SMTP vollständig konfiguriert ist.
 */
function eb_smtp_is_configured() {
    return ( eb_get_smtp_user() !== '' && eb_get_smtp_pass() !== '' );
}

add_action('phpmailer_init', function($phpmailer) {
    // Nur SMTP verwenden wenn Credentials vorhanden — sonst PHP-Mail als Fallback
    if ( ! eb_smtp_is_configured() ) {
        error_log('Eventbörse: SMTP nicht konfiguriert — verwende PHP-Mail Fallback. Bitte EB_SMTP_USER/EB_SMTP_PASS setzen.');
        return; // PHPMailer bleibt auf isMail() (Standard)
    }
    $user = eb_get_smtp_user();
    $phpmailer->isSMTP();
    $phpmailer->Host       = 'smtp.ionos.de';
    $phpmailer->SMTPAuth   = true;
    $phpmailer->Port       = 587;
    $phpmailer->Username   = $user;
    $phpmailer->Password   = eb_get_smtp_pass();
    $phpmailer->SMTPSecure = 'tls';
    $phpmailer->CharSet    = 'UTF-8';
    // From MUSS mit dem SMTP-Login übereinstimmen, sonst lehnt IONOS die Mail ab
    // eventbörse.de = xn--eventbrse-57a.de (Punycode für SMTP)
    $phpmailer->From       = $user;
    $phpmailer->FromName   = 'Eventbörse';
    $phpmailer->Sender     = $user; // Return-Path / Envelope-Sender
});

// From-Adresse muss mit dem SMTP-Login identisch sein (IONOS-Anforderung)
add_filter( 'wp_mail_from', function() {
    $user = eb_get_smtp_user();
    if ( $user ) return $user; // SMTP: kontakt@eventbörse.de
    return 'noreply@xn--eventbrse-57a.de'; // Fallback ohne SMTP
} );
add_filter( 'wp_mail_from_name', function() {
    return 'Eventbörse';
} );

/**
 * Theme-Setup
 */
function eventboerse_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
}
add_action( 'after_setup_theme', 'eventboerse_setup' );

/* =====================================================================
   CUSTOM ROLES
   ===================================================================== */
function eventboerse_register_roles() {
    if ( ! get_role( 'event_planer' ) ) {
        add_role( 'event_planer', 'Event-Planer', array( 'read' => true ) );
    }
    if ( ! get_role( 'dienstleister' ) ) {
        add_role( 'dienstleister', 'Dienstleister', array( 'read' => true ) );
    }
}
add_action( 'init', 'eventboerse_register_roles' );

/**
 * WP-Rolle → Frontend-Label
 */
function eventboerse_map_role( $user ) {
    if ( in_array( 'administrator', (array) $user->roles, true ) || get_user_meta( $user->ID, 'eb_admin', true ) === '1' ) {
        return 'Admin';
    }
    if ( in_array( 'dienstleister', (array) $user->roles, true ) ) {
        return 'Dienstleister';
    }
    return 'Event-Planer';
}

function eventboerse_base_role( $user ) {
    if ( in_array( 'dienstleister', (array) $user->roles, true ) ) {
        return 'Dienstleister';
    }
    return 'Event-Planer';
}

function eb_is_admin_user( $user_id = 0 ) {
    if ( ! $user_id ) $user_id = get_current_user_id();
    $u = get_userdata( $user_id );
    if ( ! $u ) return false;
    return in_array( 'administrator', (array) $u->roles, true ) || get_user_meta( $user_id, 'eb_admin', true ) === '1';
}

/**
 * Demo-Provider-IDs (Bot-Accounts in den hardcoded LISTINGS in app.js).
 * Wird sowohl für die Mail-CC-Logik als auch den Hide-Demo-Toggle benutzt.
 */
function eb_demo_provider_ids() {
    return array( 90001, 90002, 90003, 90004, 90005, 90006, 90007, 90008, 90009 );
}

/**
 * Liefert TRUE, wenn der angegebene User als Test-/Bot-Account markiert ist.
 * Quelle: user_meta `eb_is_demo` = '1' ODER ID in eb_demo_provider_ids().
 */
function eb_user_is_demo( $user_id ) {
    $user_id = (int) $user_id;
    if ( $user_id <= 0 ) return false;
    if ( in_array( $user_id, eb_demo_provider_ids(), true ) ) return true;
    return get_user_meta( $user_id, 'eb_is_demo', true ) === '1';
}

/**
 * Sammlung aller bekannten Demo-/Bot-User-IDs:
 * hardcoded Bot-Range (90001–90009) + alle User mit user_meta `eb_is_demo`='1'.
 * Wird (a) ans Frontend für `EB_DEMO_PROVIDER_IDS` geliefert und (b) für den
 * server-seitigen Filter in `eb_listings_list()` genutzt.
 */
function eb_all_demo_user_ids() {
    static $cache = null;
    if ( $cache !== null ) return $cache;
    $marked = get_users( array(
        'meta_key'   => 'eb_is_demo',
        'meta_value' => '1',
        'fields'     => 'ID',
        'number'     => 500,
    ) );
    $marked = array_map( 'intval', (array) $marked );
    $cache  = array_values( array_unique( array_merge( eb_demo_provider_ids(), $marked ) ) );
    return $cache;
}

/** Aktueller Zustand des Hide-Demo-Toggles (sitewide, persistent in wp_options). */
function eb_hide_demo_enabled() {
    return get_option( 'eb_hide_demo', '0' ) === '1';
}

/** GET /admin/hide-demo — public, damit Frontend den Zustand kennt. */
function eb_admin_hide_demo_get() {
    return new WP_REST_Response( array(
        'hide'      => eb_hide_demo_enabled(),
        'demo_ids'  => eb_all_demo_user_ids(),
    ), 200 );
}

/** POST /admin/hide-demo — Body: { hide: bool } — admin-only. */
function eb_admin_hide_demo_set( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $hide   = ! empty( $params['hide'] );
    update_option( 'eb_hide_demo', $hide ? '1' : '0' );
    return new WP_REST_Response( array( 'hide' => $hide ), 200 );
}

/**
 * POST /admin/toggle-demo — Body: { user_id: int, is_demo: bool }.
 *
 * Markiert einen User als Demo-/Bot-Account (oder hebt die Markierung auf).
 * Hardcoded Bot-IDs (90001–90009) können nicht entmarkiert werden.
 */
function eb_admin_toggle_demo( WP_REST_Request $request ) {
    $params  = $request->get_json_params();
    $user_id = absint( $params['user_id'] ?? 0 );
    $on      = ! empty( $params['is_demo'] );
    if ( ! get_userdata( $user_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Nutzer nicht gefunden.' ), 404 );
    }
    if ( in_array( $user_id, eb_demo_provider_ids(), true ) ) {
        return new WP_REST_Response( array( 'message' => 'Hardcoded Bot kann nicht geändert werden.' ), 409 );
    }
    if ( $on ) {
        update_user_meta( $user_id, 'eb_is_demo', '1' );
    } else {
        delete_user_meta( $user_id, 'eb_is_demo' );
    }
    return new WP_REST_Response( array( 'user_id' => $user_id, 'is_demo' => $on ), 200 );
}

/**
 * Globalen Frontend-Flag (window.EB_HIDE_DEMO) in den <head> injizieren,
 * damit alle Visitoren konsistent dieselben Listings sehen.
 */
add_action( 'wp_head', function() {
    $flag = eb_hide_demo_enabled() ? 'true' : 'false';
    $ids  = wp_json_encode( eb_all_demo_user_ids() );
    echo "<script>window.EB_HIDE_DEMO=" . $flag . ";window.EB_DEMO_PROVIDER_IDS=" . $ids . ";</script>\n";
}, 1 );

/**
 * Profil-Meta für einen User zurückgeben
 */
function eb_user_profile_meta( $uid ) {
    $gallery = get_user_meta( $uid, 'eb_gallery', true );
    return array(
        'company'  => get_user_meta( $uid, 'eb_company',   true ) ?: '',
        'tagline'  => get_user_meta( $uid, 'eb_tagline',   true ) ?: '',
        'location' => get_user_meta( $uid, 'eb_location',  true ) ?: '',
        'bio'      => get_user_meta( $uid, 'eb_bio',       true ) ?: '',
        'gallery'  => is_array( $gallery ) ? $gallery : array(),
        'coverUrl'  => get_user_meta( $uid, 'eb_cover_url', true ) ?: '',
        'coverPosY' => (float) ( get_user_meta( $uid, 'eb_cover_pos_y', true ) ?: 50 ),
        'photoUrl'  => get_user_meta( $uid, 'eb_photo_url', true ) ?: '',
    );
}

function eb_user_security_meta( $uid ) {
    $credentials = eb_webauthn_get_credentials( $uid );
    $verified    = get_user_meta( $uid, 'eb_email_verified', true );

    return array(
        'emailVerified' => '0' !== (string) $verified,
        'hasPasskey'    => ! empty( $credentials ),
        'passkeyCount'  => count( $credentials ),
        'twoFA'         => get_user_meta( $uid, 'eb_2fa_enabled', true ) === '1',
    );
}

function eb_auth_user_payload( $user, $extra = array() ) {
    return array_merge(
        array(
            'user_id'    => $user->ID,
            'email'      => $user->user_email,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'roles'      => (array) $user->roles,
            'role'       => eventboerse_map_role( $user ),
            'nonce'      => wp_create_nonce( 'wp_rest' ),
            'phone'      => get_user_meta( $user->ID, 'eb_phone', true ) ?: '',
            'since'      => date_i18n( 'F Y', strtotime( $user->user_registered ) ),
        ),
        eb_user_security_meta( $user->ID ),
        eb_user_profile_meta( $user->ID ),
        $extra
    );
}

function eb_build_webauthn_credential_descriptor( $credential ) {
    $credential_id = eb_webauthn_credential_identifier( $credential );

    if ( '' === $credential_id ) {
        return null;
    }

    $descriptor = array(
        'type' => 'public-key',
        'id'   => $credential_id,
    );

    if ( ! empty( $credential['transports'] ) && is_array( $credential['transports'] ) ) {
        $descriptor['transports'] = array_values( $credential['transports'] );
    }

    return $descriptor;
}

function eb_send_login_otp_email( $user, $code ) {
    $subject  = 'Eventbörse – Dein Anmeldecode';
    $message  = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message .= '<h2 style="color:#222;margin-bottom:8px">Dein Anmeldecode</h2>';
    $message .= '<p style="color:#484848;line-height:1.6">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . ', nutze diesen 6-stelligen Code, um deine Anmeldung bei Eventbörse abzuschließen:</p>';
    $message .= '<p style="font-size:32px;letter-spacing:6px;font-weight:800;color:#FF385C;text-align:center;margin:28px 0">' . esc_html( $code ) . '</p>';
    $message .= '<p style="color:#717171;font-size:13px">Der Code ist 10 Minuten gültig. Falls du diese Anmeldung nicht gestartet hast, ändere bitte dein Passwort.</p>';
    $message .= '</div>';

    return wp_mail(
        $user->user_email,
        $subject,
        $message,
        array( 'Content-Type: text/html; charset=UTF-8' )
    );
}

function eb_login_otp_transient_key( $email ) {
    return 'eb_login_otp_' . md5( strtolower( trim( (string) $email ) ) );
}

function eb_login_otp_cooldown_key( $email ) {
    return 'eb_login_otp_cd_' . md5( strtolower( trim( (string) $email ) ) );
}

function eb_login_otp_resend_token() {
    return wp_generate_password( 32, false, false );
}

/* ---------- Registration-OTP Helpers ---------- */
function eb_reg_otp_transient_key( $email ) {
    return 'eb_reg_otp_' . md5( strtolower( trim( (string) $email ) ) );
}

function eb_reg_otp_cooldown_key( $email ) {
    return 'eb_reg_otp_cd_' . md5( strtolower( trim( (string) $email ) ) );
}

function eb_send_reg_otp_email( $first_name, $email, $code ) {
    $subject  = 'Eventbörse – Dein Registrierungscode';
    $message  = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message .= '<h2 style="color:#222;margin-bottom:8px">Willkommen bei Eventbörse!</h2>';
    $message .= '<p style="color:#484848;line-height:1.6">Hallo ' . esc_html( $first_name ) . ', nutze diesen 6-stelligen Code, um deine Registrierung abzuschließen:</p>';
    $message .= '<p style="font-size:32px;letter-spacing:6px;font-weight:800;color:#FF385C;text-align:center;margin:28px 0">' . esc_html( $code ) . '</p>';
    $message .= '<p style="color:#717171;font-size:13px">Der Code ist 10 Minuten gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>';
    $message .= '</div>';

    return wp_mail(
        $email,
        $subject,
        $message,
        array( 'Content-Type: text/html; charset=UTF-8' )
    );
}

/* =====================================================================
   REST API
   ===================================================================== */
function eventboerse_register_rest_routes() {

    register_rest_route( 'eventboerse/v1', '/register', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_register',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/register/verify', array(
        'methods'             => 'POST',
        'callback'            => 'eb_register_verify',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/register/resend', array(
        'methods'             => 'POST',
        'callback'            => 'eb_register_resend',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/login', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_login',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/logout', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_logout',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/me', array(
        'methods'             => 'GET',
        'callback'            => 'eventboerse_handle_me',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/forgot-password', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_forgot_password',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/verify-email', array(
        'methods'             => 'GET',
        'callback'            => 'eventboerse_handle_verify_email',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/resend-verification', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_resend_verification',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/reset-password', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_reset_password',
        'permission_callback' => '__return_true',
    ) );

    /* ---------- PROFILE (GET + POST) ---------- */
    register_rest_route( 'eventboerse/v1', '/profile', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eventboerse_handle_profile_get',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eventboerse_handle_profile_save',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    /* ---------- EVENT-PLANER BOARD (GET + POST) ---------- */
    register_rest_route( 'eventboerse/v1', '/board-projects', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eventboerse_handle_board_get',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eventboerse_handle_board_save',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );
}
add_action( 'rest_api_init', 'eventboerse_register_rest_routes' );

/* ---------- EVENT-PLANER BOARD Handlers ---------- */
function eventboerse_handle_board_get( WP_REST_Request $request ) {
    $uid = get_current_user_id();
    if ( ! $uid ) {
        return new WP_REST_Response( array( 'error' => 'not_logged_in' ), 401 );
    }
    $raw = get_user_meta( $uid, 'eb_board_projects', true );
    if ( empty( $raw ) ) {
        return new WP_REST_Response( array( 'projects' => array() ), 200 );
    }
    $decoded = json_decode( $raw, true );
    if ( ! is_array( $decoded ) ) {
        $decoded = array();
    }
    return new WP_REST_Response( array( 'projects' => $decoded ), 200 );
}

function eventboerse_handle_board_save( WP_REST_Request $request ) {
    $uid = get_current_user_id();
    if ( ! $uid ) {
        return new WP_REST_Response( array( 'error' => 'not_logged_in' ), 401 );
    }
    $params   = $request->get_json_params();
    $projects = isset( $params['projects'] ) ? $params['projects'] : null;
    if ( ! is_array( $projects ) ) {
        return new WP_REST_Response( array( 'error' => 'invalid_payload' ), 400 );
    }
    // Defensive size limit (~2 MB JSON)
    $encoded = wp_json_encode( $projects );
    if ( $encoded === false || strlen( $encoded ) > 2 * 1024 * 1024 ) {
        return new WP_REST_Response( array( 'error' => 'payload_too_large' ), 413 );
    }
    update_user_meta( $uid, 'eb_board_projects', wp_slash( $encoded ) );
    return new WP_REST_Response( array( 'success' => true, 'count' => count( $projects ) ), 200 );
}

/* ---------- REGISTER (Step 1: send OTP) ---------- */
function eventboerse_handle_register( WP_REST_Request $request ) {
    $params     = $request->get_json_params();
    $email      = isset( $params['email'] )      ? sanitize_email( $params['email'] )           : '';
    $password   = isset( $params['password'] )    ? $params['password']                          : '';
    $first_name = isset( $params['first_name'] )  ? sanitize_text_field( $params['first_name'] ) : '';
    $last_name  = isset( $params['last_name'] )   ? sanitize_text_field( $params['last_name'] )  : '';
    $role_input = isset( $params['role'] )         ? sanitize_text_field( $params['role'] )       : 'user';

    // Validierung
    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }
    if ( strlen( $password ) < 8 ) {
        return new WP_REST_Response( array( 'message' => 'Das Passwort muss mindestens 8 Zeichen lang sein.' ), 400 );
    }
    if ( empty( $first_name ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib deinen Vornamen ein.' ), 400 );
    }
    if ( email_exists( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Diese E-Mail-Adresse ist bereits registriert.' ), 400 );
    }

    // Cooldown prüfen
    if ( get_transient( eb_reg_otp_cooldown_key( $email ) ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte warte kurz, bevor du einen neuen Code anforderst.' ), 429 );
    }

    // OTP generieren und Registrierungsdaten in Transient speichern
    $code          = (string) random_int( 100000, 999999 );
    $resend_token  = wp_generate_password( 32, false, false );
    $otp_key       = eb_reg_otp_transient_key( $email );

    set_transient( $otp_key, array(
        'code_hash'     => wp_hash( $code ),
        'created_at'    => time(),
        'attempts'      => 0,
        'resend_token'  => $resend_token,
        'email'         => $email,
        'password'      => $password,
        'first_name'    => $first_name,
        'last_name'     => $last_name,
        'role'          => $role_input,
    ), 10 * MINUTE_IN_SECONDS );
    set_transient( eb_reg_otp_cooldown_key( $email ), 1, MINUTE_IN_SECONDS );

    $sent = eb_send_reg_otp_email( $first_name, $email, $code );

    if ( ! $sent ) {
        delete_transient( $otp_key );
        delete_transient( eb_reg_otp_cooldown_key( $email ) );
        error_log( 'Eventbörse: Registrierungs-OTP Mail FEHLGESCHLAGEN für ' . $email );
        return new WP_REST_Response( array( 'message' => 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut oder kontaktiere den Support.' ), 500 );
    }

    return new WP_REST_Response( array(
        'requiresOtp'  => true,
        'email'        => $email,
        'expiresIn'    => 10 * MINUTE_IN_SECONDS,
        'resendToken'  => $resend_token,
    ), 200 );
}

/* ---------- REGISTER (Step 2: verify OTP & create account) ---------- */
function eb_register_verify( WP_REST_Request $request ) {
    $params  = $request->get_json_params();
    $email   = sanitize_email( $params['email'] ?? '' );
    $code    = preg_replace( '/\D+/', '', (string) ( $params['code'] ?? '' ) );
    $otp_key = eb_reg_otp_transient_key( $email );
    $payload = get_transient( $otp_key );

    if ( empty( $email ) || strlen( $code ) !== 6 ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib E-Mail und 6-stelligen Code ein.' ), 400 );
    }

    if ( ! is_array( $payload ) || empty( $payload['code_hash'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    $attempts = isset( $payload['attempts'] ) ? (int) $payload['attempts'] : 0;
    if ( $attempts >= 5 ) {
        delete_transient( $otp_key );
        return new WP_REST_Response( array( 'message' => 'Zu viele falsche Versuche. Bitte registriere dich erneut.' ), 429 );
    }

    if ( ! hash_equals( $payload['code_hash'], wp_hash( $code ) ) ) {
        $payload['attempts'] = $attempts + 1;
        set_transient( $otp_key, $payload, 10 * MINUTE_IN_SECONDS );
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    // E-Mail nochmal auf Duplikat prüfen (Race-Condition)
    if ( email_exists( $email ) ) {
        delete_transient( $otp_key );
        return new WP_REST_Response( array( 'message' => 'Diese E-Mail-Adresse ist bereits registriert.' ), 400 );
    }

    // Benutzer erstellen
    $username = sanitize_user( strtolower( explode( '@', $email )[0] ), true );
    if ( username_exists( $username ) ) {
        $username .= wp_rand( 100, 9999 );
    }

    $wp_role = ( $payload['role'] === 'provider' ) ? 'dienstleister' : 'event_planer';

    $user_id = wp_create_user( $username, $payload['password'], $email );
    if ( is_wp_error( $user_id ) ) {
        return new WP_REST_Response( array( 'message' => $user_id->get_error_message() ), 400 );
    }

    wp_update_user( array(
        'ID'         => $user_id,
        'first_name' => $payload['first_name'],
        'last_name'  => $payload['last_name'],
        'role'       => $wp_role,
    ) );

    // E-Mail direkt als verifiziert markieren (OTP bestätigt)
    update_user_meta( $user_id, 'eb_email_verified', '1' );

    delete_transient( $otp_key );

    // Einloggen
    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true, is_ssl() );

    $user = get_userdata( $user_id );
    return new WP_REST_Response( eb_auth_user_payload( $user ), 200 );
}

/* ---------- REGISTER (Resend OTP) ---------- */
function eb_register_resend( WP_REST_Request $request ) {
    $params       = $request->get_json_params();
    $email        = sanitize_email( $params['email'] ?? '' );
    $resend_token = sanitize_text_field( $params['resend_token'] ?? '' );
    $otp_key      = eb_reg_otp_transient_key( $email );
    $payload      = get_transient( $otp_key );

    if ( empty( $email ) || empty( $resend_token ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte starte die Registrierung erneut.' ), 400 );
    }

    if ( get_transient( eb_reg_otp_cooldown_key( $email ) ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte warte kurz, bevor du einen neuen Code anforderst.' ), 429 );
    }

    if ( ! is_array( $payload ) || empty( $payload['resend_token'] ) || ! hash_equals( (string) $payload['resend_token'], $resend_token ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte starte die Registrierung erneut.' ), 400 );
    }

    $code = (string) random_int( 100000, 999999 );
    $payload['code_hash']  = wp_hash( $code );
    $payload['created_at'] = time();
    $payload['attempts']   = 0;
    set_transient( $otp_key, $payload, 10 * MINUTE_IN_SECONDS );
    set_transient( eb_reg_otp_cooldown_key( $email ), 1, MINUTE_IN_SECONDS );

    $sent = eb_send_reg_otp_email( $payload['first_name'], $email, $code );

    if ( ! $sent ) {
        delete_transient( eb_reg_otp_cooldown_key( $email ) );
        error_log( 'Eventbörse: Registrierungs-OTP Resend FEHLGESCHLAGEN für ' . $email );
        return new WP_REST_Response( array( 'message' => 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.' ), 500 );
    }

    return new WP_REST_Response( array(
        'sent'        => true,
        'expiresIn'   => 10 * MINUTE_IN_SECONDS,
        'email'       => $email,
        'resendToken' => $payload['resend_token'],
    ), 200 );
}

/* ---------- LOGIN ---------- */
function eventboerse_handle_login( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $email    = sanitize_email( $params['email'] ?? '' );
    $password = $params['password'] ?? '';

    if ( empty( $email ) || empty( $password ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail und Passwort sind erforderlich.' ), 400 );
    }

    $user = get_user_by( 'email', $email );
    if ( ! $user || ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.' ), 401 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array(
            'message'              => 'Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe dein Postfach.',
            'pending_verification' => true,
            'email'                => $email,
        ), 403 );
    }

    /* If 2FA is enabled, do NOT log in – tell the client to proceed with OTP */
    if ( get_user_meta( $user->ID, 'eb_2fa_enabled', true ) === '1' ) {
        return new WP_REST_Response( array( 'requires2fa' => true ), 200 );
    }

    /* No 2FA – log in directly */
    wp_set_current_user( $user->ID );
    wp_set_auth_cookie( $user->ID, true, is_ssl() );

    return new WP_REST_Response( eb_auth_user_payload( $user ), 200 );
}

/* ---------- LOGOUT ---------- */
function eventboerse_handle_logout() {
    wp_logout();
    return new WP_REST_Response( array( 'message' => 'Abgemeldet.' ), 200 );
}

/* ---------- ME (Sitzungs-Check) ---------- */
function eventboerse_handle_me() {
    if ( ! is_user_logged_in() ) {
        return new WP_REST_Response( array( 'loggedIn' => false ), 200 );
    }
    $u = wp_get_current_user();
    return new WP_REST_Response( array_merge(
        array( 'loggedIn' => true ),
        eb_auth_user_payload( $u )
    ), 200 );
}

/* ---------- E-MAIL VERIFIZIERUNG ---------- */
function eventboerse_handle_verify_email( WP_REST_Request $request ) {
    $token   = sanitize_text_field( $request->get_param( 'token' ) );
    $user_id = absint( $request->get_param( 'uid' ) );

    if ( empty( $token ) || empty( $user_id ) ) {
        wp_die( 'Ungültiger Verifizierungslink.', 'Fehler', array( 'response' => 400 ) );
    }

    $stored_token = get_user_meta( $user_id, 'eb_email_verify_token', true );

    if ( ! $stored_token || ! hash_equals( $stored_token, $token ) ) {
        wp_die( 'Ungültiger oder abgelaufener Verifizierungslink.', 'Fehler', array( 'response' => 400 ) );
    }

    // E-Mail als verifiziert markieren und Token löschen
    update_user_meta( $user_id, 'eb_email_verified', '1' );
    delete_user_meta( $user_id, 'eb_email_verify_token' );

    // Weiterleitung zur Startseite mit Erfolgs-Parameter
    $user = get_userdata( $user_id );
    wp_safe_redirect( add_query_arg( array(
        'email_verified' => '1',
        'verified_email' => $user ? $user->user_email : '',
    ), home_url( '/' ) ) );
    exit;
}

/* ---------- VERIFIZIERUNGS-MAIL ERNEUT SENDEN ---------- */
function eventboerse_handle_resend_verification( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }

    $cd_key = 'eb_verify_cd_' . md5( strtolower( trim( $email ) ) );
    if ( get_transient( $cd_key ) ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
    }
    set_transient( $cd_key, 1, 2 * MINUTE_IN_SECONDS );

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( $verified === '1' ) {
        // Gleiche generische Antwort – keine Info über Verifizierungsstatus leaken
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
    }

    // Neuen Token generieren
    $token = bin2hex( random_bytes( 32 ) );
    update_user_meta( $user->ID, 'eb_email_verify_token', $token );

    $verify_url = rest_url( 'eventboerse/v1/verify-email' ) . '?token=' . $token . '&uid=' . $user->ID;
    $subject    = 'Eventbörse – Bitte bestätige deine E-Mail-Adresse';
    $message    = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message   .= '<h2 style="color:#222;margin-bottom:8px">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . '!</h2>';
    $message   .= '<p style="color:#484848;line-height:1.6">Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen:</p>';
    $message   .= '<p style="text-align:center;margin:28px 0">';
    $message   .= '<a href="' . esc_url( $verify_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">E-Mail bestätigen</a>';
    $message   .= '</p>';
    $message   .= '<p style="color:#717171;font-size:13px">Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>';
    $message   .= '</div>';
    $headers    = array( 'Content-Type: text/html; charset=UTF-8' );
    wp_mail( $email, $subject, $message, $headers );

    return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
}

/* ---------- PASSWORT VERGESSEN ---------- */
function eventboerse_handle_forgot_password( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }

    $cd_key = 'eb_pw_reset_cd_' . md5( strtolower( trim( $email ) ) );
    if ( get_transient( $cd_key ) ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
    }
    set_transient( $cd_key, 1, 2 * MINUTE_IN_SECONDS );

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
    }

    // Eigenen Reset-Token generieren
    $token = bin2hex( random_bytes( 32 ) );
    update_user_meta( $user->ID, 'eb_pw_reset_token', $token );
    update_user_meta( $user->ID, 'eb_pw_reset_expires', time() + 3600 ); // 1 Stunde gültig

    $reset_url = home_url( '/?reset_password=1&token=' . $token . '&uid=' . $user->ID . '#reset=' . $token . ':' . $user->ID );
    $subject   = 'Eventbörse – Passwort zurücksetzen';
    $message   = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message  .= '<h2 style="color:#222;margin-bottom:8px">Passwort zurücksetzen</h2>';
    $message  .= '<p style="color:#484848;line-height:1.6">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . ', klicke auf den Button um ein neues Passwort zu setzen:</p>';
    $message  .= '<p style="text-align:center;margin:28px 0">';
    $message  .= '<a href="' . esc_url( $reset_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Neues Passwort setzen</a>';
    $message  .= '</p>';
    $message  .= '<p style="color:#717171;font-size:13px">Dieser Link ist 1 Stunde gültig. Falls du kein Passwort-Reset angefordert hast, ignoriere diese E-Mail.</p>';
    $message  .= '</div>';
    $headers   = array( 'Content-Type: text/html; charset=UTF-8' );
    $sent = wp_mail( $email, $subject, $message, $headers );

    if ( ! $sent ) {
        // wp_mail fehlgeschlagen – Cooldown zurücksetzen damit man erneut versuchen kann
        delete_transient( $cd_key );
        error_log( 'Eventbörse: wp_mail FEHLGESCHLAGEN für ' . $email );
        return new WP_REST_Response( array( 'message' => 'E-Mail konnte nicht versendet werden. Bitte kontaktiere den Support.' ), 500 );
    }

    return new WP_REST_Response( array( 'message' => 'Eine E-Mail zum Zurücksetzen wurde an ' . $email . ' gesendet. Prüfe auch deinen Spam-Ordner.' ), 200 );
}

/* ---------- PASSWORT RESET AUSFÜHREN ---------- */
function eventboerse_handle_reset_password( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $token    = isset( $params['token'] )    ? sanitize_text_field( $params['token'] )    : '';
    $uid      = isset( $params['uid'] )      ? absint( $params['uid'] )                   : 0;
    $password = isset( $params['password'] ) ? $params['password']                        : '';

    if ( empty( $token ) || empty( $uid ) || empty( $password ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige Anfrage.' ), 400 );
    }

    if ( strlen( $password ) < 8 ) {
        return new WP_REST_Response( array( 'message' => 'Das Passwort muss mindestens 8 Zeichen lang sein.' ), 400 );
    }

    $stored_token = get_user_meta( $uid, 'eb_pw_reset_token', true );
    $expires      = (int) get_user_meta( $uid, 'eb_pw_reset_expires', true );

    if ( ! $stored_token || ! hash_equals( $stored_token, $token ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger oder abgelaufener Link.' ), 400 );
    }

    if ( time() > $expires ) {
        delete_user_meta( $uid, 'eb_pw_reset_token' );
        delete_user_meta( $uid, 'eb_pw_reset_expires' );
        return new WP_REST_Response( array( 'message' => 'Der Link ist abgelaufen. Bitte fordere einen neuen an.' ), 400 );
    }

    // Passwort setzen und Token löschen
    wp_set_password( $password, $uid );
    delete_user_meta( $uid, 'eb_pw_reset_token' );
    delete_user_meta( $uid, 'eb_pw_reset_expires' );

    return new WP_REST_Response( array( 'message' => 'Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.' ), 200 );
}

/* ---------- PROFILE GET ---------- */
function eventboerse_handle_profile_get() {
    global $wpdb;
    $u   = wp_get_current_user();
    $uid = $u->ID;

    // Profil-Meta
    $tagline  = get_user_meta( $uid, 'eb_tagline',  true );
    $location = get_user_meta( $uid, 'eb_location', true );
    $bio      = get_user_meta( $uid, 'eb_bio',      true );
    $gallery  = get_user_meta( $uid, 'eb_gallery',  true );
    $cover    = get_user_meta( $uid, 'eb_cover_url', true );
    $coverPosY = (float) ( get_user_meta( $uid, 'eb_cover_pos_y', true ) ?: 50 );
    $photo    = get_user_meta( $uid, 'eb_photo_url', true );

    if ( ! is_array( $gallery ) ) {
        $gallery = array();
    }

    // Stats aus User-Meta (werden z. B. bei Buchungen/Views aktualisiert)
    $views    = (int) get_user_meta( $uid, 'eb_views',    true );
    $bookings = (int) get_user_meta( $uid, 'eb_bookings', true );

    // Inserate zählen (eb_listing CPT, Fallback: 0)
    $listings_count = 0;
    if ( post_type_exists( 'eb_listing' ) ) {
        $listings_count = (int) count_user_posts( $uid, 'eb_listing', true );
    }

    // Bewertungen aus der DB-Tabelle für alle Inserate dieses Users
    $user_listing_ids = $wpdb->get_col( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_listings WHERE user_id = %d",
        $uid
    ) );
    $avg_rating = null;
    $reviews    = array();
    if ( ! empty( $user_listing_ids ) ) {
        $id_placeholders = implode( ',', array_fill( 0, count( $user_listing_ids ), '%d' ) );
        $avg_rating = (float) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT AVG(rating) FROM {$wpdb->prefix}eb_reviews WHERE listing_id IN ($id_placeholders)",
                $user_listing_ids
            )
        );
        if ( $avg_rating ) {
            $avg_rating = round( $avg_rating, 1 );
        } else {
            $avg_rating = null;
        }
        $review_rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
                 LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
                 WHERE r.listing_id IN ($id_placeholders) ORDER BY r.created_at DESC LIMIT 10",
                $user_listing_ids
            )
        );
        foreach ( $review_rows as $r ) {
            $rname  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
            $rphoto = get_user_meta( $r->uid, 'eb_photo_url', true );
            $reviews[] = array(
                'rating' => (int) $r->rating,
                'text'   => $r->body,
                'name'   => $rname ?: $r->display_name,
                'avatar' => $rphoto ?: eb_avatar_url( $rname ?: $r->display_name, $rname ?: $r->display_name ),
                'date'   => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            );
        }
    }

    return new WP_REST_Response( array(
        'tagline'   => $tagline  ?: '',
        'location'  => $location ?: '',
        'bio'       => $bio      ?: '',
        'gallery'   => $gallery,
        'coverUrl'  => $cover    ?: '',
        'coverPosY' => $coverPosY,
        'photoUrl'  => $photo    ?: '',
        'stats'     => array(
            'views'    => $views,
            'listings' => $listings_count,
            'bookings' => $bookings,
            'rating'   => $avg_rating,
        ),
        'reviews'   => $reviews,
    ), 200 );
}

/* ---------- PROFILE SAVE ---------- */
function eventboerse_handle_profile_save( WP_REST_Request $request ) {
    $u      = wp_get_current_user();
    $uid    = $u->ID;
    $params = $request->get_json_params();

    // Erlaubte Felder
    $text_fields = array(
        'tagline'  => 'eb_tagline',
        'location' => 'eb_location',
        'bio'      => 'eb_bio',
        'coverUrl' => 'eb_cover_url',
        'photoUrl' => 'eb_photo_url',
    );

    foreach ( $text_fields as $key => $meta_key ) {
        if ( isset( $params[ $key ] ) ) {
            $val = sanitize_text_field( $params[ $key ] );
            // Prevent email addresses from being saved as location
            if ( $key === 'location' && is_email( $val ) ) {
                $val = '';
            }
            if ( $key === 'bio' ) {
                update_user_meta( $uid, $meta_key, wp_kses_post( $params[ $key ] ) );
            } else {
                update_user_meta( $uid, $meta_key, $val );
            }
        }
    }

    // Name (first_name + last_name)
    if ( isset( $params['name'] ) ) {
        $parts      = explode( ' ', sanitize_text_field( $params['name'] ), 2 );
        $first_name = $parts[0];
        $last_name  = isset( $parts[1] ) ? $parts[1] : '';
        wp_update_user( array(
            'ID'         => $uid,
            'first_name' => $first_name,
            'last_name'  => $last_name,
        ) );
    }

    // Galerie (Array von URLs)
    if ( isset( $params['gallery'] ) && is_array( $params['gallery'] ) ) {
        $clean = array_map( 'esc_url_raw', $params['gallery'] );
        update_user_meta( $uid, 'eb_gallery', $clean );
    }

    // Cover Position Y
    if ( isset( $params['coverPosY'] ) ) {
        $posY = max( 0, min( 100, floatval( $params['coverPosY'] ) ) );
        update_user_meta( $uid, 'eb_cover_pos_y', $posY );
    }

    return new WP_REST_Response( array( 'saved' => true ), 200 );
}

/* =====================================================================
   ACCOUNT SETTINGS HANDLERS
   ===================================================================== */
function eb_settings_update( WP_REST_Request $request ) {
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $first_name = sanitize_text_field( $params['first_name'] ?? '' );
    $last_name  = sanitize_text_field( $params['last_name'] ?? '' );
    $email      = sanitize_email( $params['email'] ?? '' );
    $phone      = sanitize_text_field( $params['phone'] ?? '' );
    $company    = sanitize_text_field( $params['company'] ?? '' );

    if ( empty( $first_name ) ) {
        return new WP_REST_Response( array( 'message' => 'Vorname ist erforderlich.' ), 400 );
    }

    if ( ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige E-Mail-Adresse.' ), 400 );
    }

    // Check if email is already in use by another user
    $existing = email_exists( $email );
    if ( $existing && $existing !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Diese E-Mail wird bereits verwendet.' ), 400 );
    }

    wp_update_user( array(
        'ID'         => $uid,
        'first_name' => $first_name,
        'last_name'  => $last_name,
        'user_email' => $email,
    ) );

    update_user_meta( $uid, 'eb_phone', $phone );
    update_user_meta( $uid, 'eb_company', $company );

    $user = get_userdata( $uid );
    return new WP_REST_Response( array(
        'saved' => true,
        'role'  => eventboerse_map_role( $user ),
    ), 200 );
}

function eb_settings_password( WP_REST_Request $request ) {
    $uid    = get_current_user_id();
    $user   = get_userdata( $uid );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    $params = $request->get_json_params();

    $current  = $params['current_password'] ?? '';
    $new_pass = $params['new_password'] ?? '';

    if ( ! wp_check_password( $current, $user->user_pass, $uid ) ) {
        return new WP_REST_Response( array( 'message' => 'Aktuelles Passwort ist falsch.' ), 400 );
    }

    if ( strlen( $new_pass ) < 8 ) {
        return new WP_REST_Response( array( 'message' => 'Neues Passwort muss mind. 8 Zeichen haben.' ), 400 );
    }

    wp_set_password( $new_pass, $uid );
    // Re-authenticate the user so they don't get logged out
    wp_set_auth_cookie( $uid, true, is_ssl() );

    return new WP_REST_Response( array( 'saved' => true ), 200 );
}

function eb_settings_toggle_2fa( WP_REST_Request $request ) {
    $uid     = get_current_user_id();
    $params  = $request->get_json_params();
    $enabled = ! empty( $params['enabled'] );

    update_user_meta( $uid, 'eb_2fa_enabled', $enabled ? '1' : '0' );

    return new WP_REST_Response( array( 'twoFA' => $enabled ), 200 );
}

function eb_settings_delete_account( WP_REST_Request $request ) {
    $uid    = get_current_user_id();
    $user   = get_userdata( $uid );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    $params = $request->get_json_params();
    $password = $params['password'] ?? '';

    if ( empty( $password ) || ! wp_check_password( $password, $user->user_pass, $uid ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib dein aktuelles Passwort ein, um dein Konto zu löschen.' ), 403 );
    }

    // Don't allow admins to delete themselves via this endpoint
    if ( user_can( $uid, 'manage_options' ) ) {
        return new WP_REST_Response( array( 'message' => 'Admin-Konten können hier nicht gelöscht werden.' ), 400 );
    }

    require_once( ABSPATH . 'wp-admin/includes/user.php' );
    wp_delete_user( $uid );

    return new WP_REST_Response( array( 'deleted' => true ), 200 );
}

function eb_webauthn_register_options() {
    $uid      = get_current_user_id();
    $user     = get_userdata( $uid );
    $verified = get_user_meta( $uid, 'eb_email_verified', true );

    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array( 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse.' ), 403 );
    }

    $challenge = eb_webauthn_generate_challenge();
    eb_webauthn_store_challenge( 'register', $uid, $challenge, 300 );

    $exclude_credentials = array();
    foreach ( eb_webauthn_get_credentials( $uid ) as $credential ) {
        $descriptor = eb_build_webauthn_credential_descriptor( $credential );
        if ( null !== $descriptor ) {
            $exclude_credentials[] = $descriptor;
        }
    }

    return new WP_REST_Response( array(
        'publicKey' => array(
            'challenge'              => eb_base64url_encode( $challenge ),
            'rp'                     => array(
                'name' => 'Eventbörse',
                'id'   => eb_webauthn_rp_id(),
            ),
            'user'                   => array(
                'id'          => eb_base64url_encode( (string) $uid ),
                'name'        => $user->user_email,
                'displayName' => trim( $user->first_name . ' ' . $user->last_name ) ?: $user->display_name,
            ),
            'pubKeyCredParams'       => array(
                array( 'type' => 'public-key', 'alg' => -7 ),
                array( 'type' => 'public-key', 'alg' => -257 ),
            ),
            'timeout'                => 120000,
            'attestation'            => 'none',
            // Keine harte Bindung an "platform" – sonst kann z.B. ein Desktop-Nutzer
            // keinen Passkey einrichten (kein Windows Hello / Touch ID)
            // bzw. Cross-Device-Setup per QR-Code via Smartphone wird blockiert.
            // residentKey/UV "preferred" maximiert Kompatibilität, ohne Sicherheit
            // wesentlich zu verschlechtern – Authenticator wählt das Beste.
            'authenticatorSelection' => array(
                'residentKey'            => 'preferred',
                'requireResidentKey'     => false,
                'userVerification'       => 'preferred',
            ),
            // Bewusst KEIN excludeCredentials: iOS Safari schließt den Face-ID-Dialog
            // sonst stillschweigend (ohne reject) wenn der Nutzer schon einen Passkey
            // auf dem gleichen Gerät hat -> Button hängt ewig im Lade-Zustand.
            // Dadurch kann ein Nutzer auch mehrere Passkeys pro Gerät anlegen, was
            // bewusst gewollt ist (z.B. ein Pixel mit Fingerabdruck + Face Unlock).
            'excludeCredentials'     => array(),
            'extensions'             => array( 'credProps' => true ),
        ),
    ), 200 );
}

function eb_webauthn_register_finish( WP_REST_Request $request ) {
    $uid       = get_current_user_id();
    $verified  = get_user_meta( $uid, 'eb_email_verified', true );
    $params    = $request->get_json_params();
    $challenge = eb_webauthn_consume_challenge( 'register', $uid );

    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array( 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse.' ), 403 );
    }

    if ( false === $challenge ) {
        return new WP_REST_Response( array( 'message' => 'Die Passkey-Anfrage ist abgelaufen. Bitte erneut versuchen.' ), 400 );
    }

    $verification = eb_webauthn_verify_registration_response(
        $params['credential'] ?? array(),
        $challenge,
        eb_webauthn_origin(),
        eb_webauthn_rp_id()
    );

    if ( is_wp_error( $verification ) ) {
        return new WP_REST_Response( array( 'message' => $verification->get_error_message() ), 400 );
    }

    $label = sanitize_text_field( $params['label'] ?? '' );
    if ( '' === $label ) {
        $label = 'Passkey ' . wp_date( 'd.m.Y H:i' );
    }

    $saved = eb_webauthn_add_credential( $uid, array(
        'credential_id'      => $verification['credential_id_b64'],
        'credential_id_b64'  => $verification['credential_id_b64'],
        'public_key_pem'     => $verification['public_key_pem'],
        'sign_count'         => $verification['sign_count'],
        'label'              => $label,
        'transports'         => $verification['transports'],
        'attestation_format' => $verification['aaguid_attestation'],
        'created_at'         => current_time( 'mysql' ),
        'last_used_at'       => current_time( 'mysql' ),
    ) );

    if ( is_wp_error( $saved ) ) {
        return new WP_REST_Response( array( 'message' => $saved->get_error_message() ), 400 );
    }

    return new WP_REST_Response( array(
        'saved'        => true,
        'credentials'  => eb_webauthn_public_credentials( $uid ),
        'hasPasskey'   => true,
        'passkeyCount' => count( eb_webauthn_get_credentials( $uid ) ),
    ), 200 );
}

/* ---------- PASSKEY-VERIFIZIERUNG (für neue Registrierungen) ---------- */
function eb_webauthn_verify_options( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $token  = sanitize_text_field( $params['verify_token'] ?? '' );

    if ( empty( $token ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Verifizierungstoken.' ), 400 );
    }

    $tk_key  = 'eb_verify_pk_' . hash( 'sha256', $token );
    $user_id = get_transient( $tk_key );
    if ( false === $user_id ) {
        return new WP_REST_Response( array( 'message' => 'Verifizierungstoken abgelaufen. Bitte melde dich mit E-Mail-Code an.' ), 400 );
    }

    $user = get_userdata( (int) $user_id );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }

    $challenge = eb_webauthn_generate_challenge();
    eb_webauthn_store_challenge( 'register', $user_id, $challenge, 300 );

    return new WP_REST_Response( array(
        'publicKey' => array(
            'challenge'              => eb_base64url_encode( $challenge ),
            'rp'                     => array(
                'name' => 'Eventbörse',
                'id'   => eb_webauthn_rp_id(),
            ),
            'user'                   => array(
                'id'          => eb_base64url_encode( (string) $user_id ),
                'name'        => $user->user_email,
                'displayName' => trim( $user->first_name . ' ' . $user->last_name ) ?: $user->display_name,
            ),
            'pubKeyCredParams'       => array(
                array( 'type' => 'public-key', 'alg' => -7 ),
                array( 'type' => 'public-key', 'alg' => -257 ),
            ),
            'timeout'                => 120000,
            'attestation'            => 'none',
            'authenticatorSelection' => array(
                'residentKey'            => 'preferred',
                'requireResidentKey'     => false,
                'userVerification'       => 'preferred',
            ),
            'excludeCredentials'     => array(),
            'extensions'             => array( 'credProps' => true ),
        ),
    ), 200 );
}

function eb_webauthn_verify_finish( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $token  = sanitize_text_field( $params['verify_token'] ?? '' );

    if ( empty( $token ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Verifizierungstoken.' ), 400 );
    }

    $tk_key  = 'eb_verify_pk_' . hash( 'sha256', $token );
    $user_id = get_transient( $tk_key );
    if ( false === $user_id ) {
        return new WP_REST_Response( array( 'message' => 'Verifizierungstoken abgelaufen. Bitte melde dich mit E-Mail-Code an.' ), 400 );
    }

    $user = get_userdata( (int) $user_id );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }

    $challenge = eb_webauthn_consume_challenge( 'register', $user_id );
    if ( false === $challenge ) {
        return new WP_REST_Response( array( 'message' => 'Die Passkey-Anfrage ist abgelaufen. Bitte erneut versuchen.' ), 400 );
    }

    $verification = eb_webauthn_verify_registration_response(
        $params['credential'] ?? array(),
        $challenge,
        eb_webauthn_origin(),
        eb_webauthn_rp_id()
    );

    if ( is_wp_error( $verification ) ) {
        return new WP_REST_Response( array( 'message' => $verification->get_error_message() ), 400 );
    }

    $label = 'Passkey ' . wp_date( 'd.m.Y H:i' );
    $saved = eb_webauthn_add_credential( $user_id, array(
        'credential_id'      => $verification['credential_id_b64'],
        'credential_id_b64'  => $verification['credential_id_b64'],
        'public_key_pem'     => $verification['public_key_pem'],
        'sign_count'         => $verification['sign_count'],
        'label'              => $label,
        'transports'         => $verification['transports'],
        'attestation_format' => $verification['aaguid_attestation'],
        'created_at'         => current_time( 'mysql' ),
        'last_used_at'       => current_time( 'mysql' ),
    ) );

    if ( is_wp_error( $saved ) ) {
        return new WP_REST_Response( array( 'message' => $saved->get_error_message() ), 400 );
    }

    // Verifizierung + Token aufräumen
    update_user_meta( $user_id, 'eb_email_verified', '1' );
    delete_user_meta( $user_id, 'eb_email_verify_token' );
    delete_transient( $tk_key );

    // Einloggen
    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true, is_ssl() );

    return new WP_REST_Response( eb_auth_user_payload( $user ), 200 );
}

function eb_webauthn_login_options( WP_REST_Request $request ) {
    $params            = $request->get_json_params();
    $email             = sanitize_email( $params['email'] ?? '' );
    $challenge         = eb_webauthn_generate_challenge();
    $request_id        = wp_generate_uuid4();
    $allow_credentials = array();

    if ( $email ) {
        $user = get_user_by( 'email', $email );
        if ( $user ) {
            foreach ( eb_webauthn_get_credentials( $user->ID ) as $credential ) {
                $descriptor = eb_build_webauthn_credential_descriptor( $credential );
                if ( null !== $descriptor ) {
                    $allow_credentials[] = $descriptor;
                }
            }
        }
    }

    eb_webauthn_store_challenge( 'login', $request_id, $challenge, 300 );

    $public_key = array(
        'challenge'        => eb_base64url_encode( $challenge ),
        'rpId'             => eb_webauthn_rp_id(),
        'timeout'          => 120000,
        'userVerification' => 'preferred',
    );

    if ( ! empty( $allow_credentials ) ) {
        $public_key['allowCredentials'] = $allow_credentials;
    }

    return new WP_REST_Response( array(
        'requestId' => $request_id,
        'publicKey' => $public_key,
    ), 200 );
}

function eb_webauthn_login_finish( WP_REST_Request $request ) {
    $params        = $request->get_json_params();
    $request_id    = sanitize_text_field( $params['requestId'] ?? '' );
    $challenge     = eb_webauthn_consume_challenge( 'login', $request_id );
    $credential    = $params['credential'] ?? array();
    $credential_id = sanitize_text_field( $credential['id'] ?? '' );
    $credential_raw_id = sanitize_text_field( $credential['rawId'] ?? '' );

    if ( '' === $request_id || false === $challenge ) {
        return new WP_REST_Response( array( 'message' => 'Die Passkey-Anfrage ist abgelaufen. Bitte erneut versuchen.' ), 400 );
    }

    if ( '' === $credential_id ) {
        return new WP_REST_Response( array( 'message' => 'Credential-ID fehlt.' ), 400 );
    }

    if ( '' !== $credential_raw_id && ! hash_equals( $credential_id, $credential_raw_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Credential-ID ist inkonsistent.' ), 400 );
    }

    $lookup = eb_webauthn_find_user_by_credential_id( $credential_id );
    if ( ! $lookup ) {
        return new WP_REST_Response( array( 'message' => 'Passkey wurde nicht gefunden.' ), 404 );
    }

    $user = get_userdata( $lookup['user_id'] );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Nutzer zum Passkey wurde nicht gefunden.' ), 404 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array( 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse.' ), 403 );
    }

    $verification = eb_webauthn_verify_authentication_response(
        $credential,
        $lookup['credential'],
        $challenge,
        eb_webauthn_origin(),
        eb_webauthn_rp_id()
    );

    if ( is_wp_error( $verification ) ) {
        return new WP_REST_Response( array( 'message' => $verification->get_error_message() ), 400 );
    }

    $credentials = eb_webauthn_get_credentials( $user->ID );
    foreach ( $credentials as $index => $stored_credential ) {
        $stored_id = eb_webauthn_credential_identifier( $stored_credential );
        if ( '' !== $stored_id && hash_equals( $stored_id, $credential_id ) ) {
            $credentials[ $index ]['sign_count']   = $verification['sign_count'];
            $credentials[ $index ]['last_used_at'] = $verification['last_used_at'];
        }
    }
    eb_webauthn_save_credentials( $user->ID, $credentials );

    wp_set_current_user( $user->ID );
    wp_set_auth_cookie( $user->ID, true, is_ssl() );

    return new WP_REST_Response( array_merge(
        eb_auth_user_payload( $user ),
        array( 'passkeyAuthenticated' => true )
    ), 200 );
}

function eb_webauthn_credentials_list() {
    $uid = get_current_user_id();

    return new WP_REST_Response( array(
        'credentials'  => eb_webauthn_public_credentials( $uid ),
        'hasPasskey'   => eb_webauthn_user_has_credentials( $uid ),
        'passkeyCount' => count( eb_webauthn_get_credentials( $uid ) ),
    ), 200 );
}

function eb_webauthn_credentials_delete( WP_REST_Request $request ) {
    $uid           = get_current_user_id();
    $credential_id = sanitize_text_field( $request->get_param( 'credential_id' ) );

    if ( '' === $credential_id ) {
        return new WP_REST_Response( array( 'message' => 'Credential-ID fehlt.' ), 400 );
    }

    eb_webauthn_delete_credential( $uid, $credential_id );

    return new WP_REST_Response( array(
        'deleted'      => true,
        'credentials'  => eb_webauthn_public_credentials( $uid ),
        'hasPasskey'   => eb_webauthn_user_has_credentials( $uid ),
        'passkeyCount' => count( eb_webauthn_get_credentials( $uid ) ),
    ), 200 );
}

function eb_otp_send( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $email    = sanitize_email( $params['email'] ?? '' );
    $password = $params['password'] ?? '';
    $resend   = ! empty( $params['resend'] );
    $token    = sanitize_text_field( $params['resend_token'] ?? '' );
    $cooldown = get_transient( eb_login_otp_cooldown_key( $email ) );
    $otp_key  = eb_login_otp_transient_key( $email );
    $existing = get_transient( $otp_key );

    if ( empty( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail ist erforderlich.' ), 400 );
    }

    if ( ! $resend && empty( $password ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail und Passwort sind erforderlich.' ), 400 );
    }

    if ( $cooldown ) {
        return new WP_REST_Response( array( 'message' => 'Bitte warte kurz, bevor du einen neuen Code anforderst.' ), 429 );
    }

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.' ), 401 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array(
            'message'              => 'Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe dein Postfach.',
            'pending_verification' => true,
            'email'                => $email,
        ), 403 );
    }

    if ( $resend ) {
        if ( ! is_array( $existing ) || empty( $existing['resend_token'] ) || empty( $token ) || ! hash_equals( (string) $existing['resend_token'], $token ) ) {
            return new WP_REST_Response( array( 'message' => 'Bitte starte die Anmeldung erneut.' ), 400 );
        }
    } elseif ( ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.' ), 401 );
    }

    $code = (string) random_int( 100000, 999999 );
    $resend_token = is_array( $existing ) && ! empty( $existing['resend_token'] ) ? (string) $existing['resend_token'] : eb_login_otp_resend_token();
    set_transient( $otp_key, array(
        'user_id'    => $user->ID,
        'code_hash'  => wp_hash( $code ),
        'created_at' => time(),
        'attempts'   => 0,
        'resend_token' => $resend_token,
    ), 10 * MINUTE_IN_SECONDS );
    set_transient( eb_login_otp_cooldown_key( $email ), 1, MINUTE_IN_SECONDS );

    $sent = eb_send_login_otp_email( $user, $code );

    if ( ! $sent ) {
        delete_transient( eb_login_otp_cooldown_key( $email ) );
        error_log( 'Eventbörse: Login-OTP Mail FEHLGESCHLAGEN für ' . $email );
        return new WP_REST_Response( array( 'message' => 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut oder kontaktiere den Support.' ), 500 );
    }

    return new WP_REST_Response( array(
        'sent'         => true,
        'expiresIn'    => 10 * MINUTE_IN_SECONDS,
        'email'        => $email,
        'resendToken'  => $resend_token,
    ), 200 );
}

function eb_otp_verify( WP_REST_Request $request ) {
    $params  = $request->get_json_params();
    $email   = sanitize_email( $params['email'] ?? '' );
    $code    = preg_replace( '/\D+/', '', (string) ( $params['code'] ?? '' ) );
    $otp_key  = eb_login_otp_transient_key( $email );
    $payload = get_transient( $otp_key );

    if ( empty( $email ) || strlen( $code ) !== 6 ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib E-Mail und 6-stelligen Code ein.' ), 400 );
    }

    if ( ! is_array( $payload ) || empty( $payload['user_id'] ) || empty( $payload['code_hash'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    $attempts = isset( $payload['attempts'] ) ? (int) $payload['attempts'] : 0;
    if ( $attempts >= 5 ) {
        delete_transient( $otp_key );
        return new WP_REST_Response( array( 'message' => 'Zu viele falsche Versuche. Bitte fordere einen neuen Code an.' ), 429 );
    }

    if ( ! hash_equals( $payload['code_hash'], wp_hash( $code ) ) ) {
        $payload['attempts'] = $attempts + 1;
        set_transient( $otp_key, $payload, 10 * MINUTE_IN_SECONDS );
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    $user = get_userdata( (int) $payload['user_id'] );
    if ( ! $user || ! hash_equals( strtolower( $user->user_email ), strtolower( $email ) ) ) {
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    delete_transient( $otp_key );

    wp_set_current_user( $user->ID );
    wp_set_auth_cookie( $user->ID, true, is_ssl() );

    return new WP_REST_Response( array_merge(
        eb_auth_user_payload( $user ),
        array( 'otpVerified' => true )
    ), 200 );
}

/* =====================================================================
   Fix REST cookie + nonce authentication
   WordPress core's rest_cookie_check_errors() (priority 100) rejects
   requests when the nonce doesn't match the logged-in cookie session.
   Our filter at priority 101 runs AFTER core: if core returns a nonce
   error we downgrade to anonymous instead of hard-blocking, so that
   public endpoints (e.g. passkey-login) still work with a stale cookie.
   ===================================================================== */
add_filter( 'rest_authentication_errors', function( $result ) {
    if ( is_wp_error( $result ) && 'rest_cookie_invalid_nonce' === $result->get_error_code() ) {
        /* Nonce is stale, but the cookie might still be valid.
           Try cookie-only auth so the user stays logged in. */
        $user_id = wp_validate_auth_cookie( '', 'logged_in' );
        if ( $user_id ) {
            wp_set_current_user( $user_id );
        } else {
            wp_set_current_user( 0 );
        }
        return null;
    }
    return $result;
}, 101 );

/* Send a fresh nonce in every authenticated REST response so that the
   SPA can keep its nonce up-to-date during long sessions. */
add_filter( 'rest_post_dispatch', function( $response ) {
    if ( is_user_logged_in() ) {
        $response->header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
    }
    return $response;
} );

/* =====================================================================
   CUSTOM DATABASE TABLES
   ===================================================================== */
function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $sql_listings = "CREATE TABLE {$wpdb->prefix}eb_listings (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        title varchar(255) NOT NULL,
        category varchar(100) NOT NULL DEFAULT '',
        category_label varchar(100) NOT NULL DEFAULT '',
        description longtext,
        price int(10) unsigned NOT NULL DEFAULT 0,
        price_model varchar(50) NOT NULL DEFAULT '',
        price_label varchar(100) NOT NULL DEFAULT '',
        location varchar(255) NOT NULL DEFAULT '',
        region varchar(255) NOT NULL DEFAULT '',
        features longtext,
        tags text,
        images longtext,
        date_from date DEFAULT NULL,
        date_to date DEFAULT NULL,
        time_from varchar(5) DEFAULT NULL,
        time_to varchar(5) DEFAULT NULL,
        duration float DEFAULT 0,
        badge varchar(50) DEFAULT 'Neu',
        negotiable tinyint(1) DEFAULT 1,
        status varchar(20) DEFAULT 'active',
        rating_avg float DEFAULT 0,
        review_count int(10) unsigned DEFAULT 0,
        views int(10) unsigned DEFAULT 0,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        updated_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_user (user_id),
        KEY idx_category (category),
        KEY idx_status (status),
        KEY idx_created (created_at)
    ) $charset;";

    $sql_reviews = "CREATE TABLE {$wpdb->prefix}eb_reviews (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        listing_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        rating tinyint(3) unsigned NOT NULL DEFAULT 5,
        body text,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_listing (listing_id),
        KEY idx_user (user_id)
    ) $charset;";

    $sql_conversations = "CREATE TABLE {$wpdb->prefix}eb_conversations (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_a bigint(20) unsigned NOT NULL,
        user_b bigint(20) unsigned NOT NULL,
        listing_id bigint(20) unsigned DEFAULT NULL,
        updated_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_user_a (user_a),
        KEY idx_user_b (user_b)
    ) $charset;";

    $sql_messages = "CREATE TABLE {$wpdb->prefix}eb_messages (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        conversation_id bigint(20) unsigned NOT NULL,
        sender_id bigint(20) unsigned NOT NULL,
        body text,
        msg_type varchar(20) DEFAULT 'text',
        offer_amount decimal(10,2) DEFAULT NULL,
        offer_status varchar(20) DEFAULT NULL,
        is_read tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_conv (conversation_id),
        KEY idx_sender (sender_id)
    ) $charset;";

    $sql_favorites = "CREATE TABLE {$wpdb->prefix}eb_favorites (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        listing_id bigint(20) unsigned NOT NULL,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        UNIQUE KEY idx_user_listing (user_id, listing_id)
    ) $charset;";

    $sql_registrations = "CREATE TABLE {$wpdb->prefix}eb_registrations (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        listing_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        name varchar(200) NOT NULL DEFAULT '',
        email varchar(200) NOT NULL DEFAULT '',
        ticket_type varchar(100) NOT NULL DEFAULT 'standard',
        quantity int(11) NOT NULL DEFAULT 1,
        amount decimal(10,2) NOT NULL DEFAULT 0.00,
        currency varchar(10) NOT NULL DEFAULT 'EUR',
        payment_ref varchar(200) DEFAULT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        notes text,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY idx_listing (listing_id),
        KEY idx_user (user_id),
        KEY idx_status (status)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql_listings );
    dbDelta( $sql_reviews );
    dbDelta( $sql_conversations );
    dbDelta( $sql_messages );
    dbDelta( $sql_favorites );
    dbDelta( $sql_registrations );
}
add_action( 'after_switch_theme', 'eb_create_tables' );
// Also run on init once (version check)
function eb_maybe_create_tables() {
    if ( get_option( 'eb_db_version' ) !== '1.9' ) {
        eb_create_tables();
        // Fix any existing listings that have empty status
        global $wpdb;
        $wpdb->query( "UPDATE {$wpdb->prefix}eb_listings SET status = 'active' WHERE status = '' OR status IS NULL" );
        $wpdb->query( "UPDATE {$wpdb->prefix}eb_listings SET badge = 'Neu' WHERE badge = '' OR badge IS NULL" );
        update_option( 'eb_db_version', '1.9' );
    }
}
add_action( 'init', 'eb_maybe_create_tables' );

/* =====================================================================
   ADDITIONAL REST ROUTES
   ===================================================================== */
function eb_register_extra_routes() {

    /* ---------- IMAGE UPLOAD ---------- */
    register_rest_route( 'eventboerse/v1', '/upload', array(
        'methods'             => 'POST',
        'callback'            => 'eb_handle_upload',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- LISTINGS ---------- */
    register_rest_route( 'eventboerse/v1', '/listings', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_listings_list',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_listings_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/listings/(?P<id>\d+)', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_listings_get',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'PUT',
            'callback'            => 'eb_listings_update',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => 'eb_listings_delete',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/my-listings', array(
        'methods'             => 'GET',
        'callback'            => 'eb_my_listings',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- REVIEWS ---------- */
    register_rest_route( 'eventboerse/v1', '/listings/(?P<id>\d+)/reviews', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_reviews_list',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_reviews_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/reviews/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'eb_review_delete',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- CONVERSATIONS / MESSAGES ---------- */
    register_rest_route( 'eventboerse/v1', '/conversations', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_conversations_list',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_conversations_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/conversations/(?P<id>\d+)/messages', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_messages_list',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_messages_send',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/messages/(?P<id>\d+)/offer-status', array(
        'methods'             => 'POST',
        'callback'            => 'eb_offer_status_update',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/messages/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'eb_message_delete',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- BOOKING / INVOICE ---------- */
    register_rest_route( 'eventboerse/v1', '/send-invoice', array(
        'methods'             => 'POST',
        'callback'            => 'eb_send_invoice',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- STRIPE CHECKOUT ---------- */
    register_rest_route( 'eventboerse/v1', '/stripe/create-checkout', array(
        'methods'             => 'POST',
        'callback'            => 'eb_stripe_create_checkout',
        'permission_callback' => 'is_user_logged_in',
    ) );
    register_rest_route( 'eventboerse/v1', '/stripe/public-key', array(
        'methods'             => 'GET',
        'callback'            => 'eb_stripe_public_key',
        'permission_callback' => '__return_true',
    ) );
    register_rest_route( 'eventboerse/v1', '/stripe/create-payment-intent', array(
        'methods'             => 'POST',
        'callback'            => 'eb_stripe_create_payment_intent',
        'permission_callback' => 'is_user_logged_in',
    ) );
    register_rest_route( 'eventboerse/v1', '/stripe/verify-payment', array(
        'methods'             => 'POST',
        'callback'            => 'eb_stripe_verify_payment',
        'permission_callback' => 'is_user_logged_in',
    ) );
    // Webhook: MUSS public sein (Stripe authentifiziert sich via Signatur).
    register_rest_route( 'eventboerse/v1', '/stripe/webhook', array(
        'methods'             => 'POST',
        'callback'            => 'eb_stripe_webhook',
        'permission_callback' => '__return_true',
    ) );
    // Client-Reconcile: liefert unbestaetigt-aber-bezahlte PaymentIntents fuer den User.
    register_rest_route( 'eventboerse/v1', '/stripe/reconcile', array(
        'methods'             => 'GET',
        'callback'            => 'eb_stripe_reconcile',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- HEARTBEAT / USER STATUS ---------- */
    register_rest_route( 'eventboerse/v1', '/heartbeat', array(
        'methods'             => 'POST',
        'callback'            => 'eb_heartbeat',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/offline', array(
        'methods'             => 'POST',
        'callback'            => 'eb_offline',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/user-status/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'eb_user_status',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- FAVORITES ---------- */
    register_rest_route( 'eventboerse/v1', '/favorites', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_favorites_list',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/favorites/(?P<listing_id>\d+)', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_favorites_toggle',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    /* ---------- PUBLIC PROVIDER PROFILE ---------- */
    register_rest_route( 'eventboerse/v1', '/provider/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'eb_provider_profile',
        'permission_callback' => '__return_true',
    ) );
    /* ---------- DIAGNOSTICS (admin only) ---------- */
    register_rest_route( 'eventboerse/v1', '/diagnostics', array(
        'methods'             => 'GET',
        'callback'            => 'eb_diagnostics',
        'permission_callback' => function() { return current_user_can( 'manage_options' ); },
    ) );
    register_rest_route( 'eventboerse/v1', '/diagnostics/test-mail', array(
        'methods'             => 'POST',
        'callback'            => 'eb_test_mail',
        'permission_callback' => function() { return current_user_can( 'manage_options' ); },
    ) );

    /* ---------- ACCOUNT SETTINGS ---------- */
    register_rest_route( 'eventboerse/v1', '/settings', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_update',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/settings/password', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_password',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/settings/delete-account', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_delete_account',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/settings/2fa', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_toggle_2fa',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- PASSKEY / WEBAUTHN ---------- */
    register_rest_route( 'eventboerse/v1', '/webauthn/verify-options', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_verify_options',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/verify-register', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_verify_finish',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/register-options', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_register_options',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/register', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_register_finish',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/login-options', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_login_options',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/login', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_login_finish',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/credentials', array(
        'methods'             => 'GET',
        'callback'            => 'eb_webauthn_credentials_list',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/credentials/(?P<credential_id>[A-Za-z0-9_-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'eb_webauthn_credentials_delete',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- EMAIL OTP ---------- */
    register_rest_route( 'eventboerse/v1', '/otp/send', array(
        'methods'             => 'POST',
        'callback'            => 'eb_otp_send',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/otp/verify', array(
        'methods'             => 'POST',
        'callback'            => 'eb_otp_verify',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/users', array(
        'methods'             => 'GET',
        'callback'            => 'eb_admin_list_users',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/user-tags', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_set_user_tags',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/all-tags', array(
        'methods'             => 'GET',
        'callback'            => 'eb_admin_get_all_tags',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/delete-user/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'eb_admin_delete_user',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/make-admin', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_make_admin',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/list-admins', array(
        'methods'             => 'GET',
        'callback'            => 'eb_admin_list_admins',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    // Einmalig: Erster Admin kann sich selbst setzen wenn kein eb_admin existiert
    register_rest_route( 'eventboerse/v1', '/admin/init', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_init',
        'permission_callback' => function() { return is_user_logged_in(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/change-role', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_change_role',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/revoke-admin', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_revoke_admin',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    register_rest_route( 'eventboerse/v1', '/admin/toggle-active', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_toggle_active',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    /* Demo-Flag pro User toggeln — Body: { user_id: int, is_demo: bool }. */
    register_rest_route( 'eventboerse/v1', '/admin/toggle-demo', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_toggle_demo',
        'permission_callback' => function() { return eb_is_admin_user(); },
    ) );

    /* Hide-Demo-Toggle (Bot-Inserate 90001–90009 sitewide ein/ausblenden) */
    register_rest_route( 'eventboerse/v1', '/admin/hide-demo', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_admin_hide_demo_get',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_admin_hide_demo_set',
            'permission_callback' => function() { return eb_is_admin_user(); },
        ),
    ) );

    /* ---------- REGISTRATIONS (Event-Anmeldungen / Ticketing) ---------- */
    register_rest_route( 'eventboerse/v1', '/registrations', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_registrations_list',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_registrations_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/registrations/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'eb_registrations_get',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- SMTP KONFIGURATION (Admin) ---------- */
    register_rest_route( 'eventboerse/v1', '/admin/smtp', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_admin_smtp_get',
            'permission_callback' => function() { return current_user_can( 'manage_options' ); },
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_admin_smtp_set',
            'permission_callback' => function() { return current_user_can( 'manage_options' ); },
        ),
    ) );

    // Admin-Reset: löscht alle eb_admin Metas (nur wenn kein eb_admin existiert oder per WP-Admin)
    register_rest_route( 'eventboerse/v1', '/admin/reset', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_reset',
        'permission_callback' => function() {
            $u = wp_get_current_user();
            return in_array( 'administrator', (array) $u->roles, true );
        },
    ) );

    /* Seed-Endpoint für Stripe-Zahlungstest: legt 1€-Test-Inserat unter
       einem Demo-Bot-User an. Logged-in genügt (idempotent, harmlos). */
    register_rest_route( 'eventboerse/v1', '/admin/seed-test-listing', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_seed_test_listing',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* Bot-Acceptance für Stripe-Zahlungstest: postet als Gegenpartei (Bot)
       eine freundliche Antwortnachricht + inquiry_accepted-Payload, damit
       die Karte auf Stufe 'angebot' rutscht und gezahlt werden kann.
       Nur der andere Conversations-Teilnehmer (also der Kunde) darf das
       für seine eigene Konversation auslösen, und nur wenn die Gegenseite
       als Demo-Bot markiert ist. */
    register_rest_route( 'eventboerse/v1', '/admin/bot-accept-inquiry', array(
        'methods'             => 'POST',
        'callback'            => 'eb_admin_bot_accept_inquiry',
        'permission_callback' => 'is_user_logged_in',
    ) );
}
add_action( 'rest_api_init', 'eb_register_extra_routes' );

/**
 * POST /admin/seed-test-listing
 * Legt ein 1€-Test-Inserat unter einem dedizierten Demo-Bot-User an,
 * damit der Live-Stripe-Zahlungsablauf End-to-End getestet werden kann.
 */
function eb_admin_seed_test_listing() {
    global $wpdb;

    $email = 'stripe-test-bot@xn--eventbrse-57a.de';
    $user  = get_user_by( 'email', $email );
    if ( ! $user ) {
        $uid = wp_insert_user( array(
            'user_login'   => 'stripe-test-bot',
            'user_email'   => $email,
            'user_pass'    => wp_generate_password( 32, true, true ),
            'display_name' => 'Stripe Test-Bot',
            'first_name'   => 'Stripe',
            'last_name'    => 'Test-Bot',
            'role'         => 'subscriber',
        ) );
        if ( is_wp_error( $uid ) ) {
            return new WP_REST_Response( array( 'message' => $uid->get_error_message() ), 500 );
        }
        $user = get_user_by( 'id', $uid );
    }
    update_user_meta( $user->ID, 'eb_is_demo', '1' );
    // Provider-Profil etwas anreichern, damit das Inserat realistisch wirkt
    update_user_meta( $user->ID, 'description', 'Wir vermitteln freie Konferenzr&auml;ume &amp; Event-Locations zu Lückenzeiten. Statt leerzustehen, werden Räume kurzfristig zu fairen Preisen vergeben – ideal für spontane Meetings, Workshops &amp; kleine Feiern.' );
    update_user_meta( $user->ID, 'location', 'Berlin' );
    if ( ! get_user_meta( $user->ID, 'display_name', true ) ) {
        wp_update_user( array( 'ID' => $user->ID, 'display_name' => 'LückenLocations Berlin' ) );
    }

    $title       = 'Konferenzraum Berlin-Mitte – Last-Minute-Lücken ab 1€';
    $description = "Last-Minute-Lückenangebot für unseren modernen Konferenzraum (bis 12 Personen) in Berlin-Mitte.\n\n"
                 . "Statt leerzustehen, vergeben wir kurzfristig freie Zeitfenster zu unschlagbaren Preisen – schon ab 1 € pro Stunde, wenn das Fenster sonst ungenutzt bliebe.\n\n"
                 . "Ausstattung:\n• Beamer, Whiteboard, Flipchart\n• High-Speed-WLAN\n• Kaffee &amp; Wasser inklusive\n• Klimatisiert, helle Tageslicht-Atmosphäre\n• U-Bahn 3 Min. fußläufig\n\n"
                 . "Perfekt für Workshops, Mini-Meetings, Coworking-Sessions oder kleine private Anlässe. Wir machen leere Räume buchbar – du bekommst Top-Lage zum Lücken-Preis.";
    $image_url   = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80&auto=format&fit=crop';

    // Idempotenz: existierendes Test-Inserat dieses Bots wiederverwenden / aktualisieren.
    $existing = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE user_id = %d AND (title = %s OR title = %s) LIMIT 1",
        $user->ID,
        $title,
        'TEST – Stripe-Zahlungstest (1€)'
    ), ARRAY_A );
    if ( $existing ) {
        $wpdb->update( $wpdb->prefix . 'eb_listings', array(
            'title'          => $title,
            'category'       => 'location',
            'category_label' => 'Location',
            'description'    => $description,
            'price'          => 1,
            'price_model'    => 'pro_stunde',
            'price_label'    => 'ab 1€ / Stunde',
            'location'       => 'Berlin-Mitte',
            'region'         => 'Berlin',
            'features'       => wp_json_encode( array( 'Beamer & Whiteboard', 'High-Speed-WLAN', 'Kaffee & Wasser inkl.', 'Klimatisiert', 'Zentrale Lage' ) ),
            'tags'           => wp_json_encode( array( 'location', 'konferenzraum', 'last-minute', 'lückenpreis' ) ),
            'images'         => wp_json_encode( array( $image_url ) ),
            'status'         => 'active',
            'badge'          => 'Lücken-Deal',
            'updated_at'     => current_time( 'mysql' ),
        ), array( 'id' => (int) $existing['id'] ) );
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", (int) $existing['id']
        ), ARRAY_A );
        return new WP_REST_Response( array(
            'message' => 'Test-Inserat aktualisiert.',
            'user_id' => $user->ID,
            'listing' => eb_format_listing( $row ),
        ), 200 );
    }

    $now = current_time( 'mysql' );
    $wpdb->insert( $wpdb->prefix . 'eb_listings', array(
        'user_id'        => $user->ID,
        'title'          => $title,
        'category'       => 'location',
        'category_label' => 'Location',
        'description'    => $description,
        'price'          => 1,
        'price_model'    => 'pro_stunde',
        'price_label'    => 'ab 1€ / Stunde',
        'location'       => 'Berlin-Mitte',
        'region'         => 'Berlin',
        'features'       => wp_json_encode( array( 'Beamer & Whiteboard', 'High-Speed-WLAN', 'Kaffee & Wasser inkl.', 'Klimatisiert', 'Zentrale Lage' ) ),
        'tags'           => wp_json_encode( array( 'location', 'konferenzraum', 'last-minute', 'lückenpreis' ) ),
        'images'         => wp_json_encode( array( $image_url ) ),
        'duration'       => 0,
        'negotiable'     => 0,
        'status'         => 'active',
        'badge'          => 'Lücken-Deal',
        'created_at'     => $now,
        'updated_at'     => $now,
    ) );
    $new_id = $wpdb->insert_id;
    if ( ! $new_id ) {
        return new WP_REST_Response( array(
            'message'  => 'Insert fehlgeschlagen.',
            'db_error' => $wpdb->last_error,
        ), 500 );
    }
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $new_id
    ), ARRAY_A );

    return new WP_REST_Response( array(
        'message' => 'Test-Inserat angelegt.',
        'user_id' => $user->ID,
        'listing' => eb_format_listing( $row ),
    ), 201 );
}

/**
 * POST /admin/bot-accept-inquiry
 * Body: { conversation_id: int, card_id: string, project_id: string,
 *         service_title?: string, customer_name?: string, price?: float,
 *         reply_text?: string }
 *
 * Postet als Gegenpartei (Demo-Bot) eine freundliche Antwortnachricht im
 * Chat + eine maschinenlesbare `inquiry_accepted`-Payload, sodass die
 * Board-Karte des Kunden automatisch auf Stufe 'angebot' rutscht und der
 * Stripe-Zahlungsablauf gestartet werden kann.
 *
 * Sicherheit:
 *  - Aufrufer muss Teilnehmer der Konversation sein.
 *  - Gegenpartei muss ein Demo-/Bot-User sein (Schutz vor Missbrauch).
 */
function eb_admin_bot_accept_inquiry( WP_REST_Request $request ) {
    global $wpdb;
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $conv_id    = absint( $params['conversation_id'] ?? 0 );
    $card_id    = sanitize_text_field( $params['card_id'] ?? '' );
    $project_id = sanitize_text_field( $params['project_id'] ?? '' );
    if ( ! $conv_id || ! $card_id || ! $project_id ) {
        return new WP_REST_Response( array( 'message' => 'conversation_id, card_id und project_id erforderlich.' ), 400 );
    }

    $conv = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conv_id, $uid, $uid
    ) );
    if ( ! $conv ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $bot_id = ( (int) $conv->user_a === (int) $uid ) ? (int) $conv->user_b : (int) $conv->user_a;
    if ( ! eb_user_is_demo( $bot_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Gegenpartei ist kein Demo-Bot.' ), 403 );
    }

    $bot       = get_userdata( $bot_id );
    $customer  = get_userdata( $uid );
    $bot_name  = $bot ? ( $bot->display_name ?: $bot->user_login ) : 'Anbieter';
    $cust_name = sanitize_text_field( $params['customer_name'] ?? ( $customer ? ( $customer->first_name ?: $customer->display_name ) : 'Kundin' ) );
    $service   = sanitize_text_field( $params['service_title'] ?? 'deinen Auftrag' );
    $price     = floatval( $params['price'] ?? 0 );

    $default_reply  = "Hallo " . $cust_name . ",\n\n";
    $default_reply .= "vielen Dank für deine Anfrage zu \xE2\x80\x9E" . $service . "\xE2\x80\x9C. Ich habe mir alles in Ruhe angeschaut und ";
    $default_reply .= "kann den Termin gerne übernehmen.\n\n";
    if ( $price > 0 ) {
        $default_reply .= "Mein Angebot bleibt wie im Inserat: " . rtrim(rtrim(number_format($price, 2, ',', ''), '0'), ',') . " € pauschal, inklusive Auf- und Abbau.\n\n";
    }
    $default_reply .= "Falls du das Angebot annimmst, klick einfach im Board auf \xE2\x80\x9EJetzt buchen\xE2\x80\x9C – die Zahlung läuft sicher über Stripe ";
    $default_reply .= "und ich bekomme automatisch Bescheid.\n\nIch freue mich auf die Zusammenarbeit!\n\nViele Grüße\n" . $bot_name;

    $reply_text = sanitize_textarea_field( $params['reply_text'] ?? $default_reply );

    $now = current_time( 'mysql' );

    // 1) Freundliche Antwortnachricht
    $wpdb->insert( $wpdb->prefix . 'eb_messages', array(
        'conversation_id' => $conv_id,
        'sender_id'       => $bot_id,
        'body'            => $reply_text,
        'msg_type'        => 'text',
        'is_read'         => 0,
        'created_at'      => $now,
    ) );

    // 2) inquiry_accepted Payload (Frontend-Poller erkennt das und schaltet die Karte um)
    $payload = wp_json_encode( array(
        'kind'       => 'inquiry_accepted',
        'cardId'     => $card_id,
        'projectId'  => $project_id,
    ) );
    $wpdb->insert( $wpdb->prefix . 'eb_messages', array(
        'conversation_id' => $conv_id,
        'sender_id'       => $bot_id,
        'body'            => $payload,
        'msg_type'        => 'text',
        'is_read'         => 0,
        'created_at'      => $now,
    ) );

    // Conversation timestamp aktualisieren
    $wpdb->update( $wpdb->prefix . 'eb_conversations',
        array( 'updated_at' => $now ),
        array( 'id' => $conv_id )
    );

    return new WP_REST_Response( array(
        'message'      => 'Bot hat die Anfrage angenommen.',
        'bot_id'       => $bot_id,
        'bot_name'     => $bot_name,
        'reply_text'   => $reply_text,
    ), 200 );
}

/* =====================================================================
   SMTP ADMIN ENDPOINTS
   ===================================================================== */

/**
 * GET /admin/smtp — Gibt SMTP-Status zurück (ohne Passwort im Klartext)
 */
function eb_admin_smtp_get() {
    $user       = eb_get_smtp_user();
    $configured = eb_smtp_is_configured();
    $source     = '';
    if ( defined('EB_SMTP_USER') && EB_SMTP_USER ) {
        $source = 'wp-config.php (Konstante)';
    } elseif ( get_option('eb_smtp_user', '') ) {
        $source = 'wp_options (via Admin-Endpoint gesetzt)';
    } else {
        $source = 'nicht konfiguriert – PHP-Mail Fallback aktiv';
    }
    return new WP_REST_Response( array(
        'configured'  => $configured,
        'smtp_user'   => $user ?: '(nicht gesetzt)',
        'smtp_host'   => 'smtp.ionos.de',
        'smtp_port'   => 587,
        'smtp_secure' => 'tls',
        'source'      => $source,
    ), 200 );
}

/**
 * POST /admin/smtp — Setzt SMTP-Credentials in wp_options
 * Body: { "smtp_user": "...", "smtp_pass": "..." }
 * Hinweis: Konstanten in wp-config.php haben höhere Priorität.
 */
function eb_admin_smtp_set( WP_REST_Request $request ) {
    $params    = $request->get_json_params();
    $smtp_user = sanitize_email( $params['smtp_user'] ?? '' );
    $smtp_pass = $params['smtp_pass'] ?? '';

    if ( empty( $smtp_user ) || ! is_email( $smtp_user ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige E-Mail-Adresse für SMTP.' ), 400 );
    }
    if ( empty( $smtp_pass ) ) {
        return new WP_REST_Response( array( 'message' => 'SMTP-Passwort darf nicht leer sein.' ), 400 );
    }

    update_option( 'eb_smtp_user', $smtp_user );
    update_option( 'eb_smtp_pass', $smtp_pass );

    // Sofort testen
    $test_sent = wp_mail(
        get_option('admin_email'),
        'Eventbörse – SMTP-Test',
        '<p>SMTP wurde erfolgreich konfiguriert für <strong>' . esc_html($smtp_user) . '</strong>.</p>',
        array( 'Content-Type: text/html; charset=UTF-8' )
    );

    return new WP_REST_Response( array(
        'message'    => $test_sent
            ? 'SMTP gespeichert. Test-Mail erfolgreich an ' . get_option('admin_email') . ' gesendet.'
            : 'SMTP gespeichert, aber Test-Mail fehlgeschlagen. Prüfe Passwort und IONOS-Konto.',
        'smtp_user'  => $smtp_user,
        'test_sent'  => $test_sent,
    ), $test_sent ? 200 : 207 );
}

/* =====================================================================
   DIAGNOSTICS
   ===================================================================== */

function eb_diagnostics() {
    global $wpdb;
    $tables = array( 'eb_listings', 'eb_reviews', 'eb_conversations', 'eb_messages', 'eb_favorites', 'eb_registrations' );
    $result = array(
        'db_version'       => get_option( 'eb_db_version' ),
        'smtp_configured'  => eb_smtp_is_configured(),
        'smtp_user'        => eb_get_smtp_user() ?: '(nicht konfiguriert)',
        'smtp_source'      => defined('EB_SMTP_USER') && EB_SMTP_USER ? 'wp-config.php' : ( get_option('eb_smtp_user','') ? 'wp_options' : 'fallback' ),
        'tables'           => array(),
    );
    foreach ( $tables as $t ) {
        $full = $wpdb->prefix . $t;
        $exists = $wpdb->get_var( $wpdb->prepare( "SHOW TABLES LIKE %s", $full ) ) === $full;
        $cols = $exists ? $wpdb->get_results( "SHOW COLUMNS FROM `" . esc_sql( $full ) . "`" ) : null;
        $result['tables'][ $t ] = array(
            'exists'  => $exists,
            'columns' => $cols ? wp_list_pluck( $cols, 'Field' ) : null,
        );
    }
    return new WP_REST_Response( $result, 200 );
}

function eb_test_mail( WP_REST_Request $request ) {
    $user  = wp_get_current_user();
    $email = $user->user_email;

    $subject = 'Eventbörse – Test-Mail';
    $message = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message .= '<h2 style="color:#222;margin-bottom:8px">Mail-Test erfolgreich!</h2>';
    $message .= '<p style="color:#484848;line-height:1.6">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . ', diese Test-Mail bestätigt, dass der E-Mail-Versand über SMTP korrekt funktioniert.</p>';
    $smtp_user_display = eb_get_smtp_user() ?: 'nicht konfiguriert';
    $message .= '<p style="color:#717171;font-size:13px;margin-top:20px">SMTP-Host: smtp.ionos.de<br>Von: ' . esc_html( $smtp_user_display ) . '</p>';
    $message .= '</div>';

    $sent = wp_mail( $email, $subject, $message, array( 'Content-Type: text/html; charset=UTF-8' ) );

    if ( $sent ) {
        return new WP_REST_Response( array(
            'message'   => 'Test-Mail wurde an ' . $email . ' gesendet.',
            'smtp_user' => $smtp_user_display,
            'smtp_configured' => eb_smtp_is_configured(),
        ), 200 );
    }

    global $phpmailer;
    $error_info = '';
    if ( isset( $phpmailer ) && is_object( $phpmailer ) ) {
        $error_info = $phpmailer->ErrorInfo;
    }
    return new WP_REST_Response( array(
        'message'          => 'Mail-Versand fehlgeschlagen.',
        'smtp_user'        => eb_get_smtp_user() ?: '(nicht konfiguriert)',
        'smtp_configured'  => eb_smtp_is_configured(),
        'error'            => $error_info,
        'hint'             => eb_smtp_is_configured()
            ? 'SMTP konfiguriert, aber Verbindung fehlgeschlagen. Prüfe das Passwort und den IONOS-Account.'
            : 'SMTP nicht konfiguriert. POST /wp-json/eventboerse/v1/admin/smtp mit {smtp_user, smtp_pass} aufrufen.',
    ), 500 );
}

/* =====================================================================
   UPLOAD HANDLER
   ===================================================================== */
function eb_handle_upload( WP_REST_Request $request ) {
    $files = $request->get_file_params();
    if ( empty( $files['file'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Keine Datei hochgeladen.' ), 400 );
    }

    $file = $files['file'];

    // 1) Upload-Fehler-Code prüfen.
    if ( ! empty( $file['error'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Upload-Fehler. Bitte erneut versuchen.' ), 400 );
    }

    // 2) Größenlimit (5 MB) – früh prüfen, bevor wir Datei lesen.
    if ( empty( $file['size'] ) || $file['size'] > 5 * 1024 * 1024 ) {
        return new WP_REST_Response( array( 'message' => 'Datei zu groß. Max. 5MB.' ), 400 );
    }

    // 3) Tatsächlichen MIME-Type aus den Magic-Bytes der Datei lesen,
    //    NICHT aus $file['type'] (Client-supplied, leicht zu fälschen).
    if ( empty( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Upload.' ), 400 );
    }
    $finfo = function_exists( 'finfo_open' ) ? finfo_open( FILEINFO_MIME_TYPE ) : false;
    if ( $finfo ) {
        $real_mime = finfo_file( $finfo, $file['tmp_name'] );
        finfo_close( $finfo );
    } else {
        $real_mime = wp_check_filetype( $file['name'] )['type'] ?? '';
    }
    $allowed_mimes = array( 'image/jpeg', 'image/png', 'image/webp', 'image/gif' );
    if ( ! in_array( $real_mime, $allowed_mimes, true ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Dateityp. Erlaubt: JPG, PNG, WebP, GIF.' ), 400 );
    }

    // 4) Doppel-Extensions (z. B. evil.php.jpg) und gefährliche Endungen blocken.
    $name_lower = strtolower( $file['name'] );
    $bad_patterns = array( '.php', '.phtml', '.phar', '.pl', '.py', '.cgi', '.sh', '.htaccess', '.exe', '.bat', '.cmd', '.dll', '.svg', '.html', '.htm', '.js' );
    foreach ( $bad_patterns as $bp ) {
        if ( strpos( $name_lower, $bp . '.' ) !== false || substr( $name_lower, -strlen( $bp ) ) === $bp ) {
            return new WP_REST_Response( array( 'message' => 'Dateiname enthält unerlaubte Endung.' ), 400 );
        }
    }

    // 5) WordPress-eigene Endungs/MIME-Validierung (zusätzliche Schicht).
    $check = wp_check_filetype_and_ext( $file['tmp_name'], $file['name'] );
    if ( empty( $check['ext'] ) || empty( $check['type'] ) || ! in_array( $check['type'], $allowed_mimes, true ) ) {
        return new WP_REST_Response( array( 'message' => 'Datei wurde abgelehnt (Inhalt entspricht keiner gültigen Bilddatei).' ), 400 );
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    // 6) Erzwinge unsere Allowlist beim Upload (mimes-Override).
    $upload = wp_handle_upload(
        $file,
        array(
            'test_form' => false,
            'mimes'     => array(
                'jpg|jpeg|jpe' => 'image/jpeg',
                'png'          => 'image/png',
                'webp'         => 'image/webp',
                'gif'          => 'image/gif',
            ),
        )
    );
    if ( isset( $upload['error'] ) ) {
        return new WP_REST_Response( array( 'message' => $upload['error'] ), 500 );
    }

    // 7) Bild-Re-Encode-Sanity-Check: Versuche, das Bild über GD/Imagick zu öffnen.
    //    Wenn das fehlschlägt, ist es kein echtes Bild → löschen.
    $img_size = @getimagesize( $upload['file'] );
    if ( $img_size === false ) {
        @unlink( $upload['file'] );
        return new WP_REST_Response( array( 'message' => 'Datei ist kein gültiges Bild.' ), 400 );
    }

    // Create attachment in media library
    $attachment = array(
        'post_mime_type' => $upload['type'],
        'post_title'     => sanitize_file_name( $file['name'] ),
        'post_content'   => '',
        'post_status'    => 'inherit',
    );
    $attach_id = wp_insert_attachment( $attachment, $upload['file'] );
    $meta = wp_generate_attachment_metadata( $attach_id, $upload['file'] );
    wp_update_attachment_metadata( $attach_id, $meta );

    return new WP_REST_Response( array(
        'id'  => $attach_id,
        'url' => $upload['url'],
    ), 200 );
}

/* =====================================================================
   LISTINGS HANDLERS
   ===================================================================== */

/** List all active listings (public) */
function eb_listings_list( WP_REST_Request $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'eb_listings';

    $where  = 'WHERE status = %s';
    $params = array( 'active' );

    // Server-seitiger Demo-Filter: wenn der globale Toggle aktiv ist, blenden
    // wir alle Inserate von als Demo markierten Usern (hardcoded Bots
    // 90001–90009 + dynamisch markierte Test-User) bereits in der DB-Query aus.
    if ( eb_hide_demo_enabled() ) {
        $demo_ids = eb_all_demo_user_ids();
        if ( ! empty( $demo_ids ) ) {
            $placeholders = implode( ',', array_fill( 0, count( $demo_ids ), '%d' ) );
            $where  .= " AND user_id NOT IN ($placeholders)";
            $params  = array_merge( $params, array_map( 'intval', $demo_ids ) );
        }
    }

    // Optional filters
    $category = sanitize_text_field( $request->get_param( 'category' ) );
    if ( $category ) {
        $where   .= ' AND category = %s';
        $params[] = $category;
    }
    $search = sanitize_text_field( $request->get_param( 'search' ) );
    if ( $search ) {
        $like     = '%' . $wpdb->esc_like( $search ) . '%';
        $where   .= ' AND (title LIKE %s OR description LIKE %s OR location LIKE %s)';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    $location = sanitize_text_field( $request->get_param( 'location' ) );
    if ( $location ) {
        $like     = '%' . $wpdb->esc_like( $location ) . '%';
        $where   .= ' AND (location LIKE %s OR region LIKE %s)';
        $params[] = $like;
        $params[] = $like;
    }
    $min_price = absint( $request->get_param( 'min_price' ) );
    $max_price = absint( $request->get_param( 'max_price' ) );
    if ( $min_price ) {
        $where   .= ' AND price >= %d';
        $params[] = $min_price;
    }
    if ( $max_price ) {
        $where   .= ' AND price <= %d';
        $params[] = $max_price;
    }
    $min_rating = floatval( $request->get_param( 'min_rating' ) );
    if ( $min_rating > 0 ) {
        $where   .= ' AND rating_avg >= %f';
        $params[] = $min_rating;
    }

    // Sort
    $sort = sanitize_text_field( $request->get_param( 'sort' ) );
    switch ( $sort ) {
        case 'price_asc':
            $order = 'ORDER BY price ASC';
            break;
        case 'price_desc':
            $order = 'ORDER BY price DESC';
            break;
        case 'rating':
            $order = 'ORDER BY rating_avg DESC';
            break;
        case 'newest':
            $order = 'ORDER BY created_at DESC';
            break;
        default:
            $order = 'ORDER BY created_at DESC';
    }

    // Pagination
    $page     = max( 1, absint( $request->get_param( 'page' ) ?: 1 ) );
    $per_page = min( 50, max( 1, absint( $request->get_param( 'per_page' ) ?: 20 ) ) );
    $offset   = ( $page - 1 ) * $per_page;

    $sql = $wpdb->prepare(
        "SELECT * FROM $table $where $order LIMIT %d OFFSET %d",
        array_merge( $params, array( $per_page, $offset ) )
    );
    $rows = $wpdb->get_results( $sql, ARRAY_A );

    $total = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM $table $where",
        $params
    ) );

    $listings = array_map( 'eb_format_listing', $rows );

    $response = new WP_REST_Response( array(
        'listings' => $listings,
        'total'    => $total,
        'page'     => $page,
        'pages'    => ceil( $total / $per_page ),
    ), 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}

/** Format a DB row into a frontend-friendly listing object */
function eb_format_listing( $row ) {
    $user   = get_userdata( $row['user_id'] );
    $images = json_decode( $row['images'], true );
    if ( ! is_array( $images ) ) $images = array();

    $features = json_decode( $row['features'], true );
    if ( ! is_array( $features ) ) $features = array();

    $tags = json_decode( $row['tags'], true );
    if ( ! is_array( $tags ) ) $tags = array();

    $name = $user ? trim( $user->first_name . ' ' . $user->last_name ) : 'Unbekannt';
    $photo = $user ? ( get_user_meta( $user->ID, 'eb_photo_url', true ) ?: '' ) : '';
    $avatar = $photo ?: eb_avatar_url( $name, $name );
    $since = $user ? date( 'Y', strtotime( $user->user_registered ) ) : '';

    return array(
        'id'            => (int) $row['id'],
        'providerId'    => (int) $row['user_id'],
        'isDemo'        => eb_user_is_demo( $row['user_id'] ),
        'title'         => $row['title'],
        'category'      => $row['category'],
        'categoryLabel' => $row['category_label'],
        'location'      => $row['location'],
        'region'        => $row['region'],
        'price'         => (int) $row['price'],
        'priceModel'    => $row['price_model'],
        'priceLabel'    => $row['price_label'],
        'rating'        => round( (float) $row['rating_avg'], 1 ),
        'reviews'       => (int) $row['review_count'],
        'image'         => ! empty( $images[0] ) ? $images[0] : '',
        'images'        => $images,
        'providerName'  => $name,
        'providerImg'   => $avatar,
        'providerSince' => $since,
        'description'   => $row['description'],
        'features'      => $features,
        'tags'          => $tags,
        'dateFrom'      => $row['date_from'],
        'dateTo'        => $row['date_to'],
        'timeFrom'      => $row['time_from'],
        'timeTo'        => $row['time_to'],
        'duration'      => (float) $row['duration'],
        'badge'         => $row['badge'],
        'negotiable'    => (bool) $row['negotiable'],
        'views'         => (int) $row['views'],
        'createdAt'     => $row['created_at'],
    );
}

/** Get single listing */
function eb_listings_get( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d",
        $id
    ), ARRAY_A );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Inserat nicht gefunden.' ), 404 );
    }

    // Increment views
    $wpdb->query( $wpdb->prepare(
        "UPDATE {$wpdb->prefix}eb_listings SET views = views + 1 WHERE id = %d",
        $id
    ) );

    return new WP_REST_Response( eb_format_listing( $row ), 200 );
}

/** Create listing */
function eb_listings_create( WP_REST_Request $request ) {
    global $wpdb;
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $title = sanitize_text_field( $params['title'] ?? '' );
    if ( empty( $title ) ) {
        return new WP_REST_Response( array( 'message' => 'Titel ist erforderlich.' ), 400 );
    }

    $category       = sanitize_text_field( $params['category'] ?? '' );
    $category_label = sanitize_text_field( $params['categoryLabel'] ?? $category );
    $description    = wp_kses_post( $params['description'] ?? '' );
    $price          = absint( $params['price'] ?? 0 );
    $price_model    = sanitize_text_field( $params['priceModel'] ?? '' );
    $price_label    = sanitize_text_field( $params['priceLabel'] ?? '' );
    $location_val   = sanitize_text_field( $params['location'] ?? '' );
    $region         = sanitize_text_field( $params['region'] ?? '' );
    $features       = isset( $params['features'] ) && is_array( $params['features'] )
        ? wp_json_encode( array_map( 'sanitize_text_field', $params['features'] ) )
        : '[]';
    $tags           = isset( $params['tags'] ) && is_array( $params['tags'] )
        ? wp_json_encode( array_map( 'sanitize_text_field', $params['tags'] ) )
        : '[]';
    $images         = isset( $params['images'] ) && is_array( $params['images'] )
        ? wp_json_encode( array_map( 'esc_url_raw', $params['images'] ) )
        : '[]';
    $date_from  = ! empty( $params['dateFrom'] ) ? sanitize_text_field( $params['dateFrom'] ) : null;
    $date_to    = ! empty( $params['dateTo'] )   ? sanitize_text_field( $params['dateTo'] )   : null;
    $time_from  = ! empty( $params['timeFrom'] ) ? sanitize_text_field( $params['timeFrom'] ) : null;
    $time_to    = ! empty( $params['timeTo'] )   ? sanitize_text_field( $params['timeTo'] )   : null;
    $duration   = floatval( $params['duration'] ?? 0 );
    $negotiable = isset( $params['negotiable'] ) ? (int) (bool) $params['negotiable'] : 1;

    $now = current_time( 'mysql' );

    $wpdb->insert( $wpdb->prefix . 'eb_listings', array(
        'user_id'        => $uid,
        'title'          => $title,
        'category'       => $category,
        'category_label' => $category_label,
        'description'    => $description,
        'price'          => $price,
        'price_model'    => $price_model,
        'price_label'    => $price_label,
        'location'       => $location_val,
        'region'         => $region,
        'features'       => $features,
        'tags'           => $tags,
        'images'         => $images,
        'date_from'      => $date_from,
        'date_to'        => $date_to,
        'time_from'      => $time_from,
        'time_to'        => $time_to,
        'duration'       => $duration,
        'negotiable'     => $negotiable,
        'status'         => 'active',
        'badge'          => 'Neu',
        'created_at'     => $now,
        'updated_at'     => $now,
    ) );

    $new_id = $wpdb->insert_id;
    if ( ! $new_id ) {
        return new WP_REST_Response( array(
            'message'  => 'Fehler beim Erstellen.',
            'db_error' => $wpdb->last_error,
            'table'    => $wpdb->prefix . 'eb_listings',
        ), 500 );
    }

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $new_id
    ), ARRAY_A );

    return new WP_REST_Response( eb_format_listing( $row ), 201 );
}

/** Update listing (only owner) */
function eb_listings_update( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $uid = get_current_user_id();

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $id
    ), ARRAY_A );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Nicht gefunden.' ), 404 );
    }
    if ( (int) $row['user_id'] !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $params = $request->get_json_params();
    $update = array();

    $text_fields = array(
        'title' => 'title', 'category' => 'category', 'category_label' => 'categoryLabel',
        'description' => 'description', 'price_label' => 'priceLabel', 'price_model' => 'priceModel',
        'location' => 'location', 'region' => 'region', 'badge' => 'badge',
        'time_from' => 'timeFrom', 'time_to' => 'timeTo',
    );
    foreach ( $text_fields as $col => $key ) {
        if ( isset( $params[ $key ] ) ) {
            $update[ $col ] = $col === 'description'
                ? wp_kses_post( $params[ $key ] )
                : sanitize_text_field( $params[ $key ] );
        }
    }
    if ( isset( $params['price'] ) )    $update['price']    = absint( $params['price'] );
    if ( isset( $params['duration'] ) ) $update['duration'] = floatval( $params['duration'] );
    if ( isset( $params['dateFrom'] ) ) $update['date_from'] = sanitize_text_field( $params['dateFrom'] );
    if ( isset( $params['dateTo'] ) )   $update['date_to']   = sanitize_text_field( $params['dateTo'] );
    if ( isset( $params['negotiable'] ) ) $update['negotiable'] = (int) (bool) $params['negotiable'];
    if ( isset( $params['features'] ) && is_array( $params['features'] ) ) {
        $update['features'] = wp_json_encode( array_map( 'sanitize_text_field', $params['features'] ) );
    }
    if ( isset( $params['tags'] ) && is_array( $params['tags'] ) ) {
        $update['tags'] = wp_json_encode( array_map( 'sanitize_text_field', $params['tags'] ) );
    }
    if ( isset( $params['images'] ) && is_array( $params['images'] ) ) {
        $update['images'] = wp_json_encode( array_map( 'esc_url_raw', $params['images'] ) );
    }

    if ( ! empty( $update ) ) {
        $wpdb->update( $wpdb->prefix . 'eb_listings', $update, array( 'id' => $id ) );
    }

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $id
    ), ARRAY_A );

    return new WP_REST_Response( eb_format_listing( $row ), 200 );
}

/** Delete listing (only owner) */
function eb_listings_delete( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $uid = get_current_user_id();

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT user_id FROM {$wpdb->prefix}eb_listings WHERE id = %d", $id
    ) );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Nicht gefunden.' ), 404 );
    }
    if ( (int) $row->user_id !== $uid && ! eb_is_admin_user( $uid ) ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $wpdb->delete( $wpdb->prefix . 'eb_listings', array( 'id' => $id ) );
    $wpdb->delete( $wpdb->prefix . 'eb_reviews', array( 'listing_id' => $id ) );
    $wpdb->delete( $wpdb->prefix . 'eb_favorites', array( 'listing_id' => $id ) );

    return new WP_REST_Response( array( 'deleted' => true ), 200 );
}

/** My listings */
function eb_my_listings() {
    global $wpdb;
    $uid  = get_current_user_id();
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE user_id = %d ORDER BY created_at DESC",
        $uid
    ), ARRAY_A );

    return new WP_REST_Response( array_map( 'eb_format_listing', $rows ?: array() ), 200 );
}

/* =====================================================================
   REVIEWS HANDLERS
   ===================================================================== */
function eb_reviews_list( WP_REST_Request $request ) {
    global $wpdb;
    $listing_id = absint( $request['id'] );
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
         LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
         WHERE r.listing_id = %d ORDER BY r.created_at DESC",
        $listing_id
    ) );

    $reviews = array();
    foreach ( $rows as $r ) {
        $photo = get_user_meta( $r->uid, 'eb_photo_url', true );
        $name  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
        if ( ! $name ) $name = $r->display_name;
        $reviews[] = array(
            'id'          => (int) $r->id,
            'user_id'     => (int) $r->uid,
            'rating'      => (int) $r->rating,
            'text'        => $r->body,
            'comment'     => $r->body,
            'name'        => $name,
            'author_name' => $name,
            'avatar'      => $photo ?: eb_avatar_url( $name, $name ),
            'photo_url'   => $photo ?: '',
            'date'        => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            'created_at'  => $r->created_at,
        );
    }

    $response = new WP_REST_Response( $reviews, 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}

function eb_reviews_create( WP_REST_Request $request ) {
    global $wpdb;
    $listing_id = absint( $request['id'] );
    $uid        = get_current_user_id();
    $params     = $request->get_json_params();

    $rating = max( 1, min( 5, absint( $params['rating'] ?? 5 ) ) );
    $text   = sanitize_textarea_field( $params['comment'] ?? ( $params['text'] ?? '' ) );

    // Check listing exists
    $listing = $wpdb->get_row( $wpdb->prepare(
        "SELECT id, user_id FROM {$wpdb->prefix}eb_listings WHERE id = %d", $listing_id
    ) );
    if ( ! $listing ) {
        return new WP_REST_Response( array( 'message' => 'Inserat nicht gefunden.' ), 404 );
    }
    // Cannot review own listing
    if ( (int) $listing->user_id === $uid ) {
        return new WP_REST_Response( array( 'message' => 'Du kannst dein eigenes Inserat nicht bewerten.' ), 400 );
    }
    // Check duplicate
    $exists = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d AND user_id = %d",
        $listing_id, $uid
    ) );
    if ( $exists ) {
        return new WP_REST_Response( array( 'message' => 'Du hast dieses Inserat bereits bewertet.' ), 400 );
    }

    $wpdb->insert( $wpdb->prefix . 'eb_reviews', array(
        'listing_id'  => $listing_id,
        'user_id'     => $uid,
        'rating'      => $rating,
        'body'        => $text,
        'created_at'  => current_time( 'mysql' ),
    ) );

    // Update listing rating avg and count
    $stats = $wpdb->get_row( $wpdb->prepare(
        "SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d",
        $listing_id
    ) );
    $wpdb->update( $wpdb->prefix . 'eb_listings', array(
        'rating_avg'   => round( $stats->avg_r, 2 ),
        'review_count' => (int) $stats->cnt,
    ), array( 'id' => $listing_id ) );

    return new WP_REST_Response( array( 'saved' => true, 'rating_avg' => round( $stats->avg_r, 1 ), 'review_count' => (int) $stats->cnt ), 201 );
}

function eb_review_delete( WP_REST_Request $request ) {
    global $wpdb;
    $review_id = absint( $request['id'] );
    $uid       = get_current_user_id();

    $review = $wpdb->get_row( $wpdb->prepare(
        "SELECT id, listing_id, user_id FROM {$wpdb->prefix}eb_reviews WHERE id = %d", $review_id
    ) );
    if ( ! $review ) {
        return new WP_REST_Response( array( 'message' => 'Bewertung nicht gefunden.' ), 404 );
    }
    // Allow deletion if user is review author OR listing owner
    $listing_owner = $wpdb->get_var( $wpdb->prepare(
        "SELECT user_id FROM {$wpdb->prefix}eb_listings WHERE id = %d", $review->listing_id
    ) );
    if ( (int) $review->user_id !== $uid && (int) $listing_owner !== $uid && ! eb_is_admin_user( $uid ) ) {
        return new WP_REST_Response( array( 'message' => 'Du kannst diese Bewertung nicht löschen.' ), 403 );
    }

    $wpdb->delete( $wpdb->prefix . 'eb_reviews', array( 'id' => $review_id ) );

    // Recalculate listing rating
    $listing_id = (int) $review->listing_id;
    $stats = $wpdb->get_row( $wpdb->prepare(
        "SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d",
        $listing_id
    ) );
    $wpdb->update( $wpdb->prefix . 'eb_listings', array(
        'rating_avg'   => $stats->cnt > 0 ? round( $stats->avg_r, 2 ) : 0,
        'review_count' => (int) $stats->cnt,
    ), array( 'id' => $listing_id ) );

    return new WP_REST_Response( array( 'deleted' => true ), 200 );
}

/* =====================================================================
   CONVERSATIONS / MESSAGES HANDLERS
   ===================================================================== */
/* ── Heartbeat: update last_activity ── */
function eb_heartbeat() {
    $uid = get_current_user_id();
    update_user_meta( $uid, 'eb_last_activity', current_time( 'mysql' ) );
    return new WP_REST_Response( array( 'ok' => true ), 200 );
}

/* ── Offline: clear last_activity on page leave ── */
function eb_offline() {
    $uid = get_current_user_id();
    update_user_meta( $uid, 'eb_last_activity', '2000-01-01 00:00:00' );
    return new WP_REST_Response( array( 'ok' => true ), 200 );
}

/* ── User online status ── */
function eb_user_status( WP_REST_Request $request ) {
    $user_id       = absint( $request['id'] );
    $last_activity = get_user_meta( $user_id, 'eb_last_activity', true );
    $online        = false;
    if ( $last_activity ) {
        $diff = time() - strtotime( $last_activity );
        $online = $diff < 75; // online if active within 75 seconds
    }
    return new WP_REST_Response( array( 'online' => $online ), 200 );
}

function eb_conversations_list() {
    global $wpdb;
    $uid = get_current_user_id();
    // Update own last_activity on conversation list fetch
    update_user_meta( $uid, 'eb_last_activity', current_time( 'mysql' ) );

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT c.*,
            (SELECT COUNT(*) FROM {$wpdb->prefix}eb_messages m WHERE m.conversation_id = c.id AND m.sender_id != %d AND m.is_read = 0) as unread_count,
            (SELECT m2.body FROM {$wpdb->prefix}eb_messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.created_at DESC LIMIT 1) as last_msg,
            (SELECT m3.created_at FROM {$wpdb->prefix}eb_messages m3 WHERE m3.conversation_id = c.id ORDER BY m3.created_at DESC LIMIT 1) as last_msg_time
         FROM {$wpdb->prefix}eb_conversations c
         WHERE c.user_a = %d OR c.user_b = %d
         ORDER BY c.updated_at DESC",
        $uid, $uid, $uid
    ) );

    $conversations = array();
    foreach ( $rows as $c ) {
        $other_id = ( (int) $c->user_a === $uid ) ? (int) $c->user_b : (int) $c->user_a;
        $other    = get_userdata( $other_id );
        $name     = $other ? trim( $other->first_name . ' ' . $other->last_name ) : 'Unbekannt';
        $photo    = $other ? ( get_user_meta( $other_id, 'eb_photo_url', true ) ?: '' ) : '';
        $avatar   = $photo ?: eb_avatar_url( $name, $name );

        $time_str = '';
        if ( $c->last_msg_time ) {
            $ts     = strtotime( $c->last_msg_time );
            $today  = strtotime( 'today' );
            $time_str = $ts >= $today ? date( 'H:i', $ts ) : date_i18n( 'j. M', $ts );
        }

        $other_last = get_user_meta( $other_id, 'eb_last_activity', true );
        $other_online = $other_last ? ( ( time() - strtotime( $other_last ) ) < 75 ) : false;

        $conversations[] = array(
            'id'           => (int) $c->id,
            'otherId'      => $other_id,
            'other_name'   => $name,
            'other_photo'  => $avatar,
            'name'         => $name,
            'avatar'       => $avatar,
            'lastMsg'      => $c->last_msg ?: '',
            'last_message' => $c->last_msg ?: '',
            'time'         => $time_str,
            'unread'       => (int) $c->unread_count,
            'unread_count' => (int) $c->unread_count,
            'updated_at'   => $c->last_msg_time ?: $c->updated_at,
            'listingId'    => $c->listing_id ? (int) $c->listing_id : null,
            'online'       => $other_online,
        );
    }

    return new WP_REST_Response( $conversations, 200 );
}

function eb_conversations_create( WP_REST_Request $request ) {
    global $wpdb;
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $other_id   = absint( $params['other_user_id'] ?? ( $params['userId'] ?? 0 ) );
    $listing_id = absint( $params['listing_id'] ?? ( $params['listingId'] ?? 0 ) );

    if ( ! $other_id || $other_id === $uid ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Empfänger.' ), 400 );
    }
    if ( ! get_userdata( $other_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }

    // Check if conversation already exists
    $existing = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_conversations
         WHERE (user_a = %d AND user_b = %d) OR (user_a = %d AND user_b = %d)",
        $uid, $other_id, $other_id, $uid
    ) );

    if ( $existing ) {
        return new WP_REST_Response( array( 'id' => (int) $existing, 'existing' => true ), 200 );
    }

    $wpdb->insert( $wpdb->prefix . 'eb_conversations', array(
        'user_a'     => $uid,
        'user_b'     => $other_id,
        'listing_id' => $listing_id ?: null,
        'updated_at' => current_time( 'mysql' ),
    ) );

    $conv_id = $wpdb->insert_id;

    // Add system message
    if ( $listing_id ) {
        $listing_title = $wpdb->get_var( $wpdb->prepare(
            "SELECT title FROM {$wpdb->prefix}eb_listings WHERE id = %d", $listing_id
        ) );
        if ( $listing_title ) {
            $wpdb->insert( $wpdb->prefix . 'eb_messages', array(
                'conversation_id' => $conv_id,
                'sender_id'       => 0,
                'body'            => 'Gespräch gestartet über „' . $listing_title . '"',
                'msg_type'        => 'system',
                'created_at'      => current_time( 'mysql' ),
            ) );
        }
    }

    return new WP_REST_Response( array( 'id' => (int) $conv_id, 'existing' => false ), 201 );
}

function eb_messages_list( WP_REST_Request $request ) {
    global $wpdb;
    $conv_id = absint( $request['id'] );
    $uid     = get_current_user_id();

    // Verify user is part of conversation
    $conv = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conv_id, $uid, $uid
    ) );
    if ( ! $conv ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    // Mark messages as read
    $wpdb->query( $wpdb->prepare(
        "UPDATE {$wpdb->prefix}eb_messages SET is_read = 1 WHERE conversation_id = %d AND sender_id != %d AND is_read = 0",
        $conv_id, $uid
    ) );

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d ORDER BY created_at ASC",
        $conv_id
    ) );

    $messages = array();
    foreach ( $rows as $m ) {
        $is_deleted = ( $m->msg_type === 'deleted' );
        $msg = array(
            'id'         => (int) $m->id,
            'type'       => (int) $m->sender_id === $uid ? 'sent' : ( $m->msg_type === 'system' ? 'system' : 'received' ),
            'text'       => $is_deleted ? '' : $m->body,
            'content'    => $is_deleted ? '' : $m->body,
            'time'       => date( 'H:i', strtotime( $m->created_at ) ),
            'created_at' => $m->created_at,
            'sender_id'  => (int) $m->sender_id,
            'msg_type'   => $m->msg_type,
            'deleted'    => $is_deleted ? 1 : 0,
        );
        if ( $m->msg_type === 'offer' ) {
            $msg['type']        = 'offer';
            $msg['amount']      = rtrim(rtrim(number_format((float)$m->offer_amount, 2, ',', ''), '0'), ',') . '€';
            $msg['status']      = $m->offer_status ?: 'pending';
            $msg['label']       = (int) $m->sender_id === $uid ? 'Dein Angebot' : 'Gegenangebot';
            $msg['statusLabel'] = $m->offer_status === 'accepted' ? 'Angenommen'
                : ( $m->offer_status === 'declined'
                    ? ( (int) $m->sender_id === $uid ? 'Zurückgezogen' : 'Abgelehnt' )
                    : 'Wartet auf Antwort' );
        }
        $messages[] = $msg;
    }

    return new WP_REST_Response( $messages, 200 );
}

function eb_messages_send( WP_REST_Request $request ) {
    global $wpdb;
    $conv_id = absint( $request['id'] );
    $uid     = get_current_user_id();
    $params  = $request->get_json_params();

    // Verify user is part of conversation
    $conv = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conv_id, $uid, $uid
    ) );
    if ( ! $conv ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $body     = sanitize_textarea_field( $params['content'] ?? ( $params['text'] ?? '' ) );
    $msg_type = sanitize_text_field( $params['type'] ?? 'text' );

    if ( empty( $body ) && $msg_type === 'text' ) {
        return new WP_REST_Response( array( 'message' => 'Nachricht darf nicht leer sein.' ), 400 );
    }

    $insert = array(
        'conversation_id' => $conv_id,
        'sender_id'       => $uid,
        'body'            => $body,
        'msg_type'        => $msg_type,
    );

    if ( $msg_type === 'offer' ) {
        $insert['offer_amount'] = round( abs( floatval( $params['amount'] ?? 0 ) ), 2 );
        $insert['offer_status'] = 'pending';
        $insert['body']         = 'Preisangebot: ' . rtrim(rtrim(number_format($insert['offer_amount'], 2, ',', ''), '0'), ',') . '€';

        // Auto-decline all other pending offers in this conversation
        $wpdb->query( $wpdb->prepare(
            "UPDATE {$wpdb->prefix}eb_messages
             SET offer_status = 'declined'
             WHERE conversation_id = %d AND msg_type = 'offer' AND offer_status = 'pending'",
            $conv_id
        ) );
    }
    $insert['created_at'] = current_time( 'mysql' );


    $wpdb->insert( $wpdb->prefix . 'eb_messages', $insert );

    // Update conversation timestamp
    $wpdb->update( $wpdb->prefix . 'eb_conversations',
        array( 'updated_at' => current_time( 'mysql' ) ),
        array( 'id' => $conv_id )
    );

    // E-Mail-Benachrichtigung an Empfänger
    $recipient_id = ((int)$conv->user_a === $uid) ? (int)$conv->user_b : (int)$conv->user_a;
    $recipient = get_userdata( $recipient_id );
    $sender = get_userdata( $uid );
    if ( $recipient && $recipient->user_email && $recipient_id !== $uid ) {
        $chat_url = home_url( '/#chat/' . $conv_id );
        $is_offer = ( $msg_type === 'offer' );
        $sender_name = $sender->first_name ?: $sender->display_name;

        // Strukturierte Anfrage (JSON-Widget vom Board „Kontaktieren")?
        $inquiry = null;
        if ( ! $is_offer && $body && $body[0] === '{' ) {
            $tmp = json_decode( $body, true );
            if ( is_array( $tmp ) && ! empty( $tmp['kind'] ) && $tmp['kind'] === 'inquiry' ) {
                $inquiry = $tmp;
            }
        }

        if ( $inquiry ) {
            $subject = 'Neue Projekt-Anfrage auf Eventbörse: ' . ( $inquiry['listing'] ?? 'Angebot' );
            $date_fmt = '';
            if ( ! empty( $inquiry['date'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $inquiry['date'] ) ) {
                $date_fmt = date_i18n( 'd.m.Y', strtotime( $inquiry['date'] ) );
            } elseif ( ! empty( $inquiry['date'] ) ) {
                $date_fmt = $inquiry['date'];
            }
            $message  = '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e6e6">';
            $message .= '<div style="background:linear-gradient(135deg,#FF385C,#E31C5F);color:#fff;padding:10px 20px;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase">✦ Systemgenerierte Projekt-Anfrage</div>';
            if ( ! empty( $inquiry['image'] ) ) {
                $message .= '<div style="width:100%;height:160px;background:#f0f0f0"><img src="' . esc_url( $inquiry['image'] ) . '" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>';
            }
            $message .= '<div style="padding:22px 26px">';
            $message .= '<h2 style="margin:0 0 6px 0;color:#222;font-size:20px">Neue Anfrage zu „' . esc_html( $inquiry['listing'] ?? 'deinem Angebot' ) . '"</h2>';
            $message .= '<p style="color:#484848;margin:0 0 14px 0">Von <strong>' . esc_html( $sender_name ) . '</strong></p>';
            $message .= '<div style="display:block;margin:14px 0">';
            if ( ! empty( $inquiry['projectName'] ) ) $message .= '<div style="padding:6px 0;color:#484848"><strong>Projekt:</strong> ' . esc_html( $inquiry['projectName'] ) . '</div>';
            if ( $date_fmt ) $message .= '<div style="padding:6px 0;color:#484848"><strong>Datum:</strong> ' . esc_html( $date_fmt ) . '</div>';
            if ( ! empty( $inquiry['eventType'] ) ) $message .= '<div style="padding:6px 0;color:#484848"><strong>Kategorie:</strong> ' . esc_html( $inquiry['eventType'] ) . '</div>';
            if ( ! empty( $inquiry['price'] ) ) $message .= '<div style="padding:6px 0;color:#484848"><strong>Preis:</strong> ' . esc_html( $inquiry['price'] ) . '</div>';
            $message .= '</div>';
            if ( ! empty( $inquiry['message'] ) ) {
                $message .= '<div style="background:#f7f7f7;border-left:3px solid #FF385C;border-radius:6px;padding:14px 16px;margin:12px 0;color:#222;white-space:pre-wrap">' . esc_html( $inquiry['message'] ) . '</div>';
            }
            $message .= '<p style="margin:22px 0 4px 0"><a href="' . esc_url( $chat_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Im Chat antworten</a></p>';
            $message .= '<p style="color:#717171;font-size:13px;margin-top:22px">Im Chat kannst du direkt <strong>Annehmen</strong> oder einen <strong>Alternativtermin</strong> vorschlagen.</p>';
            $message .= '</div></div>';
        } else {
            $subject = 'Neue ' . ( $is_offer ? 'Preisverhandlung' : 'Nachricht' ) . ' auf Eventbörse';
            $preview = $is_offer ? $insert['body'] : $body;
            $message  = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
            $message .= '<h2 style="color:#222;margin-bottom:8px">Du hast eine neue ' . ( $is_offer ? 'Preisverhandlung' : 'Nachricht' ) . ' erhalten</h2>';
            $message .= '<p style="color:#484848;line-height:1.6">Von <strong>' . esc_html( $sender_name ) . '</strong>:</p>';
            $message .= '<div style="background:#f7f7f7;border-radius:8px;padding:16px 18px;margin:18px 0;font-size:1.08em;color:#222;white-space:pre-wrap">' . esc_html( $preview ) . '</div>';
            $message .= '<p style="margin:18px 0 0 0"><a href="' . esc_url( $chat_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Im Chat antworten</a></p>';
            $message .= '<p style="color:#717171;font-size:13px;margin-top:24px">Du kannst jederzeit im Bereich "Nachrichten" auf Eventbörse antworten.</p>';
            $message .= '</div>';
        }

        // Bot-Accounts (Demo-Provider 90001–90009): Kontaktversuche immer
        // zusätzlich an testaccount weiterleiten, da Bot-Mailbox unüberwacht ist.
        $eb_bot_ids = array( 90001, 90002, 90003, 90004, 90005, 90006, 90007, 90008, 90009 );
        $msg_headers = array( 'Content-Type: text/html; charset=UTF-8' );
        if ( in_array( $recipient_id, $eb_bot_ids, true ) ) {
            $msg_headers[] = 'Cc: testaccount@eventbörse.de';
        }
        $mail_result = wp_mail( $recipient->user_email, $subject, $message, $msg_headers );
        error_log('[Eventboerse-Mail] To: ' . $recipient->user_email . ' | Subject: ' . $subject . ' | BotCC: ' . ( in_array( $recipient_id, $eb_bot_ids, true ) ? 'yes' : 'no' ) . ' | Result: ' . ( $mail_result ? 'OK' : 'FAIL' ) );
    }

    return new WP_REST_Response( array(
        'id'         => (int) $wpdb->insert_id,
        'sent'       => true,
        'content'    => $body,
        'created_at' => current_time( 'mysql' ),
        'sender_id'  => $uid,
        'type'       => $msg_type,
    ), 201 );
}

/* =====================================================================
   OFFER STATUS UPDATE
   ===================================================================== */
function eb_offer_status_update( WP_REST_Request $request ) {
    global $wpdb;
    $msg_id = absint( $request['id'] );
    $uid    = get_current_user_id();
    $params = $request->get_json_params();
    $status = sanitize_text_field( $params['status'] ?? '' );

    if ( ! in_array( $status, array( 'accepted', 'declined' ), true ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Status.' ), 400 );
    }

    // Allow declining an already-accepted offer (Widerruf)
    $allowed_from = $status === 'declined'
        ? array( 'pending', 'accepted' )
        : array( 'pending' );
    $placeholders = implode( ',', array_fill( 0, count( $allowed_from ), '%s' ) );
    $query_args   = array_merge( array( $msg_id ), $allowed_from );

    $msg = $wpdb->get_row( $wpdb->prepare(
        "SELECT m.*, c.user_a, c.user_b FROM {$wpdb->prefix}eb_messages m
         JOIN {$wpdb->prefix}eb_conversations c ON m.conversation_id = c.id
         WHERE m.id = %d AND m.msg_type = 'offer' AND m.offer_status IN ($placeholders)",
        $query_args
    ) );

    if ( ! $msg ) {
        return new WP_REST_Response( array( 'message' => 'Angebot nicht gefunden.' ), 404 );
    }

    if ( (int) $msg->user_a !== $uid && (int) $msg->user_b !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    // Sender can only withdraw (decline) their own offer, not accept it
    if ( (int) $msg->sender_id === $uid && $status !== 'declined' ) {
        return new WP_REST_Response( array( 'message' => 'Eigenes Angebot kann nur zurückgezogen werden.' ), 400 );
    }

    $wpdb->update(
        $wpdb->prefix . 'eb_messages',
        array( 'offer_status' => $status ),
        array( 'id' => $msg_id )
    );

    // When accepting: auto-decline all OTHER pending offers in the same conversation
    if ( $status === 'accepted' ) {
        $wpdb->query( $wpdb->prepare(
            "UPDATE {$wpdb->prefix}eb_messages
             SET offer_status = 'declined'
             WHERE conversation_id = %d AND msg_type = 'offer' AND offer_status = 'pending' AND id != %d",
            $msg->conversation_id, $msg_id
        ) );
    }

    $was_accepted = $msg->offer_status === 'accepted';
    $is_own       = (int) $msg->sender_id === $uid;
    $amt_fmt      = rtrim(rtrim(number_format((float)$msg->offer_amount, 2, ',', ''), '0'), ',');
    if ( $status === 'accepted' ) {
        $sys_body = '✅ Angebot über ' . $amt_fmt . '€ angenommen!';
    } elseif ( $is_own ) {
        $sys_body = '🚫 Angebot über ' . $amt_fmt . '€ zurückgezogen.';
    } elseif ( $was_accepted ) {
        $sys_body = '↩️ Annahme widerrufen – Angebot über ' . $amt_fmt . '€ doch abgelehnt.';
    } else {
        $sys_body = '❌ Angebot über ' . $amt_fmt . '€ abgelehnt.';
    }

    $wpdb->insert( $wpdb->prefix . 'eb_messages', array(
        'conversation_id' => $msg->conversation_id,
        'sender_id'       => $uid,
        'body'            => $sys_body,
        'msg_type'        => 'system',
        'created_at'      => current_time( 'mysql' ),
    ) );

    $wpdb->update( $wpdb->prefix . 'eb_conversations',
        array( 'updated_at' => current_time( 'mysql' ) ),
        array( 'id' => $msg->conversation_id )
    );

    return new WP_REST_Response( array( 'success' => true, 'status' => $status ), 200 );
}

function eb_message_delete( WP_REST_Request $request ) {
    global $wpdb;
    $msg_id = absint( $request['id'] );
    $uid    = get_current_user_id();

    $msg = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_messages WHERE id = %d",
        $msg_id
    ) );
    if ( ! $msg ) {
        return new WP_REST_Response( array( 'message' => 'Nachricht nicht gefunden.' ), 404 );
    }
    if ( (int) $msg->sender_id !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }
    if ( $msg->msg_type === 'system' || $msg->msg_type === 'deleted' ) {
        return new WP_REST_Response( array( 'message' => 'Nachricht kann nicht gelöscht werden.' ), 400 );
    }

    $wpdb->update(
        $wpdb->prefix . 'eb_messages',
        array(
            'body'         => '',
            'msg_type'     => 'deleted',
            'offer_status' => null,
        ),
        array( 'id' => $msg_id )
    );

    $wpdb->update( $wpdb->prefix . 'eb_conversations',
        array( 'updated_at' => current_time( 'mysql' ) ),
        array( 'id' => $msg->conversation_id )
    );

    return new WP_REST_Response( array( 'success' => true, 'id' => $msg_id ), 200 );
}

/* =====================================================================
   FAVORITES HANDLERS
   ===================================================================== */
function eb_favorites_list() {
    global $wpdb;
    $uid = get_current_user_id();

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.* FROM {$wpdb->prefix}eb_favorites f
         JOIN {$wpdb->prefix}eb_listings l ON f.listing_id = l.id
         WHERE f.user_id = %d ORDER BY f.created_at DESC",
        $uid
    ), ARRAY_A );

    return new WP_REST_Response( array_map( 'eb_format_listing', $rows ?: array() ), 200 );
}

function eb_favorites_toggle( WP_REST_Request $request ) {
    global $wpdb;
    $uid        = get_current_user_id();
    $listing_id = absint( $request['listing_id'] );

    $exists = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_favorites WHERE user_id = %d AND listing_id = %d",
        $uid, $listing_id
    ) );

    if ( $exists ) {
        $wpdb->delete( $wpdb->prefix . 'eb_favorites', array( 'user_id' => $uid, 'listing_id' => $listing_id ) );
        return new WP_REST_Response( array( 'favorited' => false ), 200 );
    }

    $wpdb->insert( $wpdb->prefix . 'eb_favorites', array(
        'user_id'    => $uid,
        'listing_id' => $listing_id,
        'created_at' => current_time( 'mysql' ),
    ) );

    return new WP_REST_Response( array( 'favorited' => true ), 201 );
}

/* =====================================================================
   PUBLIC PROVIDER PROFILE
   ===================================================================== */
function eb_provider_profile( WP_REST_Request $request ) {
    global $wpdb;
    $provider_id = absint( $request['id'] );
    $user        = get_userdata( $provider_id );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Anbieter nicht gefunden.' ), 404 );
    }

    $name   = trim( $user->first_name . ' ' . $user->last_name );
    $meta   = eb_user_profile_meta( $provider_id );
    $role   = eventboerse_map_role( $user );
    $since  = date( 'Y', strtotime( $user->user_registered ) );

    // Listings by this provider
    $listings = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE user_id = %d AND status = 'active' ORDER BY created_at DESC",
        $provider_id
    ), ARRAY_A );

    // Reviews on their listings
    $listing_ids = wp_list_pluck( $listings, 'id' );
    $listing_titles = array();
    foreach ( $listings as $l ) {
        $listing_titles[ (int) $l['id'] ] = $l['title'];
    }
    $reviews     = array();
    if ( ! empty( $listing_ids ) ) {
        $id_placeholders = implode( ',', array_fill( 0, count( $listing_ids ), '%d' ) );
        $reviews = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
                 LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
                 WHERE r.listing_id IN ($id_placeholders) ORDER BY r.created_at DESC",
                $listing_ids
            )
        );
    }

    $formatted_reviews = array();
    foreach ( $reviews as $r ) {
        $rname  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
        $rphoto = get_user_meta( $r->uid, 'eb_photo_url', true );
        $formatted_reviews[] = array(
            'user_id'      => (int) $r->uid,
            'rating'       => (int) $r->rating,
            'text'         => $r->body,
            'name'         => $rname ?: $r->display_name,
            'avatar'       => $rphoto ?: eb_avatar_url( $rname ?: $r->display_name, $rname ?: $r->display_name ),
            'date'         => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            'listingTitle' => isset( $listing_titles[ (int) $r->listing_id ] ) ? $listing_titles[ (int) $r->listing_id ] : '',
        );
    }

    $response = new WP_REST_Response( array(
        'id'       => $provider_id,
        'name'     => $name,
        'role'     => $role,
        'since'    => $since,
        'tagline'  => $meta['tagline'],
        'location' => $meta['location'],
        'bio'      => $meta['bio'],
        'coverUrl' => $meta['coverUrl'],
        'coverPosY'=> $meta['coverPosY'],
        'photoUrl' => $meta['photoUrl'],
        'gallery'  => $meta['gallery'],
        'listings' => array_map( 'eb_format_listing', $listings ),
        'reviews'  => $formatted_reviews,
    ), 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}

/* =====================================================================
   ALLOW BIGGER UPLOADS
   ===================================================================== */
add_filter( 'upload_size_limit', function() {
    return 5 * 1024 * 1024; // 5 MB
} );

/* =====================================================================
   ADMIN: DELETE USER + ALL CONTENT
   ===================================================================== */
function eb_admin_list_users( WP_REST_Request $request ) {
    global $wpdb;
    $search = isset( $request['search'] ) ? sanitize_text_field( $request['search'] ) : '';
    $args = array(
        'number'  => 100,
        'orderby' => 'registered',
        'order'   => 'DESC',
    );
    if ( $search ) {
        $args['search']         = '*' . $search . '*';
        $args['search_columns'] = array( 'user_login', 'user_email', 'display_name' );
    }
    $users  = get_users( $args );
    $result = array();
    foreach ( $users as $u ) {
        $listing_count = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}eb_listings WHERE user_id = %d", $u->ID
        ) );
        $review_count = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}eb_reviews WHERE user_id = %d", $u->ID
        ) );
        $first = get_user_meta( $u->ID, 'first_name', true );
        $last  = get_user_meta( $u->ID, 'last_name', true );
        $result[] = array(
            'id'         => (int) $u->ID,
            'login'      => $u->user_login,
            'email'      => $u->user_email,
            'name'       => $u->display_name,
            'firstName'  => $first,
            'lastName'   => $last,
            'role'       => eventboerse_map_role( $u ),
            'baseRole'   => eventboerse_base_role( $u ),
            'registered' => $u->user_registered,
            'avatar'     => get_user_meta( $u->ID, 'eb_photo_url', true ),
            'company'    => get_user_meta( $u->ID, 'eb_company', true ),
            'isAdmin'    => eb_is_admin_user( $u->ID ),
            'isActive'   => get_user_meta( $u->ID, 'eb_deactivated', true ) !== '1',
            'isDemo'     => eb_user_is_demo( $u->ID ),
            'listings'   => $listing_count,
            'reviews'    => $review_count,
            'tags'       => array_values( array_filter( (array) get_user_meta( $u->ID, 'eb_tags', true ) ) ),
        );
    }
    return new WP_REST_Response( $result, 200 );
}

function eb_admin_set_user_tags( WP_REST_Request $request ) {
    $params  = $request->get_json_params();
    $user_id = absint( $params['user_id'] ?? 0 );
    $tags    = isset( $params['tags'] ) && is_array( $params['tags'] ) ? $params['tags'] : array();

    if ( ! get_userdata( $user_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Nutzer nicht gefunden.' ), 404 );
    }

    $clean = array();
    foreach ( $tags as $t ) {
        $t = sanitize_text_field( trim( (string) $t ) );
        if ( $t !== '' && strlen( $t ) <= 30 ) {
            $clean[] = $t;
        }
    }
    $clean = array_values( array_unique( $clean ) );

    update_user_meta( $user_id, 'eb_tags', $clean );

    // Globale Tag-Liste aktualisieren
    $all = get_option( 'eb_all_tags', array() );
    if ( ! is_array( $all ) ) $all = array();
    $all = array_values( array_unique( array_merge( $all, $clean ) ) );
    update_option( 'eb_all_tags', $all );

    return new WP_REST_Response( array( 'tags' => $clean ), 200 );
}

function eb_admin_get_all_tags( WP_REST_Request $request ) {
    $all = get_option( 'eb_all_tags', array() );
    if ( ! is_array( $all ) ) $all = array();
    return new WP_REST_Response( array( 'tags' => array_values( $all ) ), 200 );
}

function eb_admin_delete_user( WP_REST_Request $request ) {
    global $wpdb;
    $target_id = absint( $request['id'] );
    $target    = get_userdata( $target_id );
    if ( ! $target ) {
        return new WP_REST_Response( array( 'message' => 'Nutzer nicht gefunden.' ), 404 );
    }
    if ( eb_is_admin_user( $target_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Admins k\u00f6nnen nicht gel\u00f6scht werden.' ), 403 );
    }

    // Delete all media attachments uploaded by user
    $attachments = get_posts( array(
        'post_type'      => 'attachment',
        'author'         => $target_id,
        'posts_per_page' => -1,
        'post_status'    => 'any',
    ) );
    foreach ( $attachments as $att ) {
        wp_delete_attachment( $att->ID, true );
    }

    // Delete listings + reviews + favorites
    $listing_ids = $wpdb->get_col( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_listings WHERE user_id = %d", $target_id
    ) );
    if ( ! empty( $listing_ids ) ) {
        $ids_placeholder = implode( ',', array_map( 'intval', $listing_ids ) );
        $wpdb->query( "DELETE FROM {$wpdb->prefix}eb_reviews WHERE listing_id IN ($ids_placeholder)" );
        $wpdb->query( "DELETE FROM {$wpdb->prefix}eb_favorites WHERE listing_id IN ($ids_placeholder)" );
    }
    $wpdb->delete( $wpdb->prefix . 'eb_listings', array( 'user_id' => $target_id ) );
    $wpdb->delete( $wpdb->prefix . 'eb_reviews', array( 'user_id' => $target_id ) );
    $wpdb->delete( $wpdb->prefix . 'eb_favorites', array( 'user_id' => $target_id ) );

    // Delete messages / conversations
    if ( $wpdb->get_var( "SHOW TABLES LIKE '{$wpdb->prefix}eb_conversations'" ) ) {
        $conv_ids = $wpdb->get_col( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}eb_conversations WHERE user_a = %d OR user_b = %d", $target_id, $target_id
        ) );
        if ( ! empty( $conv_ids ) ) {
            $cids = implode( ',', array_map( 'intval', $conv_ids ) );
            $wpdb->query( "DELETE FROM {$wpdb->prefix}eb_messages WHERE conversation_id IN ($cids)" );
        }
        $wpdb->query( $wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}eb_conversations WHERE user_a = %d OR user_b = %d", $target_id, $target_id
        ) );
    }

    // Delete user meta
    $wpdb->delete( $wpdb->usermeta, array( 'user_id' => $target_id ) );

    // Delete WP user
    require_once ABSPATH . 'wp-admin/includes/user.php';
    wp_delete_user( $target_id );

    return new WP_REST_Response( array( 'deleted' => true, 'user_id' => $target_id ), 200 );
}

function eb_admin_make_admin( WP_REST_Request $request ) {
    // Nur bestehende Admins können andere zu Admins machen
    // permission_callback prüft bereits eb_is_admin_user()
    $target_id = isset( $request['user_id'] ) ? absint( $request['user_id'] ) : 0;
    if ( ! $target_id ) {
        return new WP_REST_Response( array( 'message' => 'Keine user_id angegeben.' ), 400 );
    }
    $target = get_user_by( 'id', $target_id );
    if ( ! $target ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    update_user_meta( $target_id, 'eb_admin', '1' );
    return new WP_REST_Response( array(
        'admin'   => true,
        'user_id' => $target_id,
        'name'    => $target->display_name,
    ), 200 );
}

function eb_admin_revoke_admin( WP_REST_Request $request ) {
    $target_id = isset( $request['user_id'] ) ? absint( $request['user_id'] ) : 0;
    if ( ! $target_id ) {
        return new WP_REST_Response( array( 'message' => 'Keine user_id angegeben.' ), 400 );
    }
    $current_user = wp_get_current_user();
    if ( (int) $current_user->ID === $target_id ) {
        return new WP_REST_Response( array( 'message' => 'Du kannst dir selbst nicht den Admin-Status entziehen.' ), 403 );
    }
    $target = get_user_by( 'id', $target_id );
    if ( ! $target ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    if ( in_array( 'administrator', (array) $target->roles, true ) ) {
        return new WP_REST_Response( array( 'message' => 'WordPress-Administratoren können nicht herabgestuft werden.' ), 403 );
    }
    delete_user_meta( $target_id, 'eb_admin' );
    return new WP_REST_Response( array(
        'admin'   => false,
        'user_id' => $target_id,
        'name'    => $target->display_name,
    ), 200 );
}

function eb_admin_toggle_active( WP_REST_Request $request ) {
    $target_id = isset( $request['user_id'] ) ? absint( $request['user_id'] ) : 0;
    if ( ! $target_id ) {
        return new WP_REST_Response( array( 'message' => 'Keine user_id angegeben.' ), 400 );
    }
    $target = get_user_by( 'id', $target_id );
    if ( ! $target ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    if ( eb_is_admin_user( $target_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Admins können nicht deaktiviert werden.' ), 403 );
    }
    $currently_deactivated = get_user_meta( $target_id, 'eb_deactivated', true ) === '1';
    if ( $currently_deactivated ) {
        delete_user_meta( $target_id, 'eb_deactivated' );
    } else {
        update_user_meta( $target_id, 'eb_deactivated', '1' );
    }
    return new WP_REST_Response( array(
        'user_id'  => $target_id,
        'isActive' => $currently_deactivated,
        'name'     => $target->display_name,
    ), 200 );
}

function eb_admin_change_role( WP_REST_Request $request ) {
    $target_id = isset( $request['user_id'] ) ? absint( $request['user_id'] ) : 0;
    $new_role  = isset( $request['role'] ) ? sanitize_text_field( $request['role'] ) : '';
    if ( ! $target_id || ! in_array( $new_role, array( 'dienstleister', 'event_planer' ), true ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige Parameter.' ), 400 );
    }
    $target = get_user_by( 'id', $target_id );
    if ( ! $target ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    $target->set_role( $new_role );
    return new WP_REST_Response( array(
        'user_id' => $target_id,
        'role'    => eventboerse_map_role( $target ),
        'name'    => $target->display_name,
    ), 200 );
}

function eb_admin_list_admins( WP_REST_Request $request ) {
    global $wpdb;
    $rows = $wpdb->get_results(
        "SELECT u.ID, u.user_login, u.user_email, u.display_name
         FROM {$wpdb->users} u
         INNER JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
         WHERE um.meta_key = 'eb_admin' AND um.meta_value = '1'"
    );
    $admins = array();
    foreach ( $rows as $row ) {
        $admins[] = array(
            'id'    => (int) $row->ID,
            'login' => $row->user_login,
            'email' => $row->user_email,
            'name'  => $row->display_name,
        );
    }
    // Auch WP-Administratoren auflisten
    $wp_admins = get_users( array( 'role' => 'administrator' ) );
    foreach ( $wp_admins as $wa ) {
        $already = false;
        foreach ( $admins as $a ) {
            if ( $a['id'] === (int) $wa->ID ) { $already = true; break; }
        }
        if ( ! $already ) {
            $admins[] = array(
                'id'    => (int) $wa->ID,
                'login' => $wa->user_login,
                'email' => $wa->user_email,
                'name'  => $wa->display_name,
                'wp_admin' => true,
            );
        }
    }
    return new WP_REST_Response( $admins, 200 );
}

// Einmalig: Setzt die zwei festgelegten Admins und entfernt alle anderen
function eb_admin_init( WP_REST_Request $request ) {
    global $wpdb;
    // Erst alle bestehenden eb_admin Metas löschen
    $wpdb->delete( $wpdb->usermeta, array( 'meta_key' => 'eb_admin' ) );

    $admin_emails = array(
        'sandro.salvaggio1@gmail.com',
        'sandro.salvaggio@icloud.com',
    );
    $set = array();
    foreach ( $admin_emails as $email ) {
        $u = get_user_by( 'email', $email );
        if ( $u ) {
            update_user_meta( $u->ID, 'eb_admin', '1' );
            $set[] = array( 'id' => (int) $u->ID, 'email' => $email, 'name' => $u->display_name );
        } else {
            $set[] = array( 'email' => $email, 'error' => 'User nicht gefunden' );
        }
    }
    return new WP_REST_Response( array( 'admins' => $set ), 200 );
}

// Reset: Alle eb_admin Metas löschen (nur WP-Administratoren)
function eb_admin_reset( WP_REST_Request $request ) {
    global $wpdb;
    // Liste der bisherigen Admins
    $old_admins = $wpdb->get_results(
        "SELECT u.ID, u.user_login, u.display_name
         FROM {$wpdb->users} u
         INNER JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
         WHERE um.meta_key = 'eb_admin' AND um.meta_value = '1'"
    );
    $removed = array();
    foreach ( $old_admins as $oa ) {
        $removed[] = array( 'id' => (int) $oa->ID, 'login' => $oa->user_login, 'name' => $oa->display_name );
    }
    $wpdb->delete( $wpdb->usermeta, array( 'meta_key' => 'eb_admin' ) );
    return new WP_REST_Response( array(
        'reset'   => true,
        'removed' => $removed,
    ), 200 );
}

/* =====================================================================
   REGISTRATIONS (Event-Anmeldungen / Ticketing)
   ===================================================================== */

/** List registrations for current user (or all if admin) */
function eb_registrations_list( WP_REST_Request $request ) {
    global $wpdb;
    $uid = get_current_user_id();
    $is_admin = eb_is_admin_user();

    $listing_id = absint( $request->get_param( 'listing_id' ) );

    if ( $listing_id && $is_admin ) {
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}eb_registrations WHERE listing_id = %d ORDER BY created_at DESC",
            $listing_id
        ), ARRAY_A );
    } elseif ( $listing_id ) {
        // Non-admin: nur eigene Registrierungen für dieses Listing
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}eb_registrations WHERE listing_id = %d AND user_id = %d ORDER BY created_at DESC",
            $listing_id, $uid
        ), ARRAY_A );
    } else {
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}eb_registrations WHERE user_id = %d ORDER BY created_at DESC",
            $uid
        ), ARRAY_A );
    }

    $formatted = array_map( 'eb_format_registration', $rows ?: array() );
    return new WP_REST_Response( $formatted, 200 );
}

/** Get single registration */
function eb_registrations_get( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $uid = get_current_user_id();

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_registrations WHERE id = %d",
        $id
    ), ARRAY_A );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung nicht gefunden.' ), 404 );
    }

    // Only owner or admin may view
    if ( (int) $row['user_id'] !== $uid && ! eb_is_admin_user() ) {
        return new WP_REST_Response( array( 'message' => 'Keine Berechtigung.' ), 403 );
    }

    return new WP_REST_Response( eb_format_registration( $row ), 200 );
}

/** Create a new registration */
function eb_registrations_create( WP_REST_Request $request ) {
    global $wpdb;
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $listing_id = absint( $params['listing_id'] ?? $params['event_id'] ?? 0 );
    if ( ! $listing_id ) {
        return new WP_REST_Response( array( 'message' => 'listing_id ist erforderlich.' ), 400 );
    }

    // Check listing exists
    $listing = $wpdb->get_row( $wpdb->prepare(
        "SELECT id, title FROM {$wpdb->prefix}eb_listings WHERE id = %d",
        $listing_id
    ), ARRAY_A );
    if ( ! $listing ) {
        return new WP_REST_Response( array( 'message' => 'Listing nicht gefunden.' ), 404 );
    }

    // Check for duplicate registration
    $existing = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_registrations WHERE listing_id = %d AND user_id = %d AND status != 'cancelled'",
        $listing_id, $uid
    ) );
    if ( $existing ) {
        return new WP_REST_Response( array( 'message' => 'Bereits angemeldet.', 'registration_id' => (int) $existing ), 409 );
    }

    $user = get_userdata( $uid );
    $name        = sanitize_text_field( $params['name'] ?? $user->display_name );
    $email       = sanitize_email( $params['email'] ?? $user->user_email );
    $ticket_type = sanitize_text_field( $params['ticket_type'] ?? 'standard' );
    $quantity    = max( 1, absint( $params['quantity'] ?? 1 ) );
    $amount      = floatval( $params['amount'] ?? 0 );
    $currency    = sanitize_text_field( $params['currency'] ?? 'EUR' );
    $payment_ref = sanitize_text_field( $params['payment_ref'] ?? '' );
    $notes       = sanitize_textarea_field( $params['notes'] ?? '' );

    $now = current_time( 'mysql' );

    $wpdb->insert( $wpdb->prefix . 'eb_registrations', array(
        'listing_id'  => $listing_id,
        'user_id'     => $uid,
        'name'        => $name,
        'email'       => $email,
        'ticket_type' => $ticket_type,
        'quantity'    => $quantity,
        'amount'      => $amount,
        'currency'    => $currency,
        'payment_ref' => $payment_ref ?: null,
        'status'      => 'confirmed',
        'notes'       => $notes,
        'created_at'  => $now,
        'updated_at'  => $now,
    ) );

    $new_id = $wpdb->insert_id;
    if ( ! $new_id ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung fehlgeschlagen.' ), 500 );
    }

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_registrations WHERE id = %d",
        $new_id
    ), ARRAY_A );

    return new WP_REST_Response( array(
        'message'      => 'Anmeldung erfolgreich.',
        'registration' => eb_format_registration( $row ),
    ), 201 );
}

/** Format registration row for API response */
function eb_format_registration( $row ) {
    return array(
        'id'          => (int) $row['id'],
        'listingId'   => (int) $row['listing_id'],
        'userId'      => (int) $row['user_id'],
        'name'        => $row['name'],
        'email'       => $row['email'],
        'ticketType'  => $row['ticket_type'],
        'quantity'    => (int) $row['quantity'],
        'amount'      => (float) $row['amount'],
        'currency'    => $row['currency'],
        'paymentRef'  => $row['payment_ref'],
        'status'      => $row['status'],
        'notes'       => $row['notes'],
        'createdAt'   => $row['created_at'],
        'updatedAt'   => $row['updated_at'],
    );
}


/* =====================================================================
   BOOKING / INVOICE NOTIFICATION
   Sendet eine Buchungs-/Rechnungs-Benachrichtigung an User, Anbieter
   und kontakt@eventboerse.de -- fuer volle Transparenz.
   Stripe-Integration folgt; diese Mail fungiert als verbindliche
   Buchungsbestaetigung / Rechnungsanforderung.
   ===================================================================== */
function eb_send_invoice( WP_REST_Request $request ) {
    $uid = get_current_user_id();
    if ( ! $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht angemeldet.' ), 401 );
    }

    $params = $request->get_json_params();
    if ( ! is_array( $params ) ) $params = array();

    $project_name  = isset( $params['project_name'] )  ? sanitize_text_field( $params['project_name'] )  : '';
    $event_date    = isset( $params['event_date'] )    ? sanitize_text_field( $params['event_date'] )    : '';
    $listing_title = isset( $params['listing_title'] ) ? sanitize_text_field( $params['listing_title'] ) : 'Leistung';
    $listing_id    = isset( $params['listing_id'] )    ? absint( $params['listing_id'] )                 : 0;
    $provider_uid  = isset( $params['provider_user_id'] ) ? absint( $params['provider_user_id'] )        : 0;
    $price         = isset( $params['price'] )         ? (float) $params['price']                         : 0.0;
    $note          = isset( $params['note'] )          ? sanitize_textarea_field( $params['note'] )      : '';

    $user = get_userdata( $uid );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'User ungueltig.' ), 400 );
    }

    $user_email = $user->user_email;
    $user_name  = trim( get_user_meta( $uid, 'first_name', true ) . ' ' . get_user_meta( $uid, 'last_name', true ) );
    if ( ! $user_name ) $user_name = $user->display_name ?: $user->user_login;

    $provider_email = '';
    $provider_name  = 'Anbieter';
    if ( $provider_uid ) {
        $pu = get_userdata( $provider_uid );
        if ( $pu ) {
            $provider_email = $pu->user_email;
            $pn = trim( get_user_meta( $provider_uid, 'first_name', true ) . ' ' . get_user_meta( $provider_uid, 'last_name', true ) );
            $provider_name  = $pn ?: ( $pu->display_name ?: $pu->user_login );
        }
    }

    // Pseudo-Rechnungsnummer (bis Stripe integriert ist)
    $invoice_no = 'EB-' . date( 'Ymd' ) . '-' . str_pad( (string) $uid, 4, '0', STR_PAD_LEFT ) . '-' . substr( md5( $listing_id . '|' . time() ), 0, 6 );
    $invoice_no = strtoupper( $invoice_no );

    $event_date_de = $event_date ? date_i18n( 'd.m.Y', strtotime( $event_date ) ) : '—';
    $price_str     = number_format( $price, 2, ',', '.' ) . ' €';
    $site_url      = home_url( '/' );
    $brand_primary = '#FF385C';

    $subject = 'Buchungsbestaetigung #' . $invoice_no . ' – ' . $listing_title;

    $note_html = $note ? ( '<div style="margin-top:14px;padding:12px 14px;background:#f7f7f7;border-left:3px solid ' . $brand_primary . ';border-radius:6px;font-style:italic">' . nl2br( esc_html( $note ) ) . '</div>' ) : '';

    $rows = ''
        . '<tr><td style="padding:6px 0;color:#717171">Projekt</td><td style="padding:6px 0;text-align:right;font-weight:600">' . esc_html( $project_name ?: '—' ) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#717171">Event-Datum</td><td style="padding:6px 0;text-align:right;font-weight:600">' . esc_html( $event_date_de ) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#717171">Leistung</td><td style="padding:6px 0;text-align:right;font-weight:600">' . esc_html( $listing_title ) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#717171">Anbieter</td><td style="padding:6px 0;text-align:right;font-weight:600">' . esc_html( $provider_name ) . '</td></tr>'
        . '<tr><td style="padding:6px 0;color:#717171">Kunde</td><td style="padding:6px 0;text-align:right;font-weight:600">' . esc_html( $user_name ) . '</td></tr>'
        . '<tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #e0e0e0"></td></tr>'
        . '<tr><td style="padding:10px 0;font-size:16px">Gesamtbetrag</td><td style="padding:10px 0;text-align:right;font-size:18px;font-weight:700;color:' . $brand_primary . '">' . $price_str . '</td></tr>';

    $body = ''
        . '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#222">'
        . '<div style="max-width:600px;margin:0 auto;padding:24px">'
          . '<div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">'
            . '<div style="background:linear-gradient(135deg,#FF385C,#E31C5F);padding:28px 24px;color:#fff">'
              . '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin-bottom:6px">Buchungsbestaetigung</div>'
              . '<div style="font-size:22px;font-weight:700;margin-bottom:4px">Rechnung #' . esc_html( $invoice_no ) . '</div>'
              . '<div style="font-size:13px;opacity:0.9">Eventboerse &middot; ' . esc_html( date_i18n( 'd.m.Y' ) ) . '</div>'
            . '</div>'
            . '<div style="padding:24px">'
              . '<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Die Buchung wurde auf <strong>Eventboerse</strong> verbindlich ausgeloest. Dies ist die offizielle Buchungsbestaetigung &ndash; sie geht zur vollen Transparenz an <strong>Kunde</strong>, <strong>Anbieter</strong> und <strong>kontakt@eventb&ouml;rse.de</strong>.</p>'
              . '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:10px;font-size:14px">' . $rows . '</table>'
              . $note_html
              . '<div style="margin-top:20px;padding:14px;background:#fff5e5;border:1px solid #ffd89e;border-radius:8px;font-size:13px;color:#6b4500;line-height:1.5">'
                . '<strong>Naechste Schritte:</strong> Der Anbieter stellt die Rechnung offiziell aus. Die Zahlung kann per Ueberweisung, Bar, PayPal oder (bald) direkt via Stripe abgewickelt werden. Nach Zahlungseingang wird das Projekt auf <em>Bezahlt</em> gesetzt.'
              . '</div>'
              . '<div style="text-align:center;margin:24px 0 6px">'
                . '<a href="' . esc_url( $site_url . 'board' ) . '" style="display:inline-block;background:' . $brand_primary . ';color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:600;font-size:14px">Zum Projekt &rarr;</a>'
              . '</div>'
            . '</div>'
            . '<div style="padding:16px 24px;background:#fafafa;color:#717171;font-size:11px;text-align:center;border-top:1px solid #eee">Automatische Nachricht der Eventboerse &middot; Bei Fragen: kontakt@eventb&ouml;rse.de</div>'
          . '</div>'
        . '</div></body></html>';

    $headers = array( 'Content-Type: text/html; charset=UTF-8' );

    // Bot-Accounts (Demo-Provider 90001–90009): Buchungsversuch immer
    // zusätzlich an testaccount weiterleiten, da Bot-Mailbox unüberwacht ist.
    $eb_bot_ids = array( 90001, 90002, 90003, 90004, 90005, 90006, 90007, 90008, 90009 );
    $recipients = array();
    if ( $user_email )     $recipients[] = $user_email;
    if ( $provider_email ) $recipients[] = $provider_email;
    $recipients[] = 'kontakt@eventbörse.de';
    if ( $provider_uid && in_array( $provider_uid, $eb_bot_ids, true ) ) {
        $recipients[] = 'testaccount@eventbörse.de';
    }
    $recipients = array_values( array_unique( array_filter( $recipients ) ) );

    $sent = 0;
    foreach ( $recipients as $to ) {
        if ( wp_mail( $to, $subject, $body, $headers ) ) $sent++;
    }

    return new WP_REST_Response( array(
        'ok'          => true,
        'invoice_no'  => $invoice_no,
        'recipients'  => $recipients,
        'sent_count'  => $sent,
    ), 200 );
}


/* ============================================================
 *  STRIPE CHECKOUT (MVP)
 *  - Liest Keys aus .env (pk_live / sk_live)
 *  - Erstellt Checkout-Session via Stripe REST API
 *  - success_url markiert Karte client-seitig als bezahlt
 *  - Webhook-Verifikation folgt (Backend-Auftrag)
 * ============================================================ */

function eb_load_env_value( $key ) {
    // 1) Bevorzugt: Konstanten aus wp-config.php (sicherer, kein .env im Repo nötig).
    static $const_map = array(
        'public_stripe_api_key'  => 'EB_STRIPE_PUBLIC_KEY',
        'private_stripe_api_key' => 'EB_STRIPE_SECRET_KEY',
        'stripe_webhook_secret'  => 'EB_STRIPE_WEBHOOK_SECRET',
        'STRIPE_WEBHOOK_SECRET'  => 'EB_STRIPE_WEBHOOK_SECRET',
    );
    if ( isset( $const_map[ $key ] ) && defined( $const_map[ $key ] ) ) {
        $val = constant( $const_map[ $key ] );
        if ( $val !== '' && $val !== null ) return $val;
    }

    // 2) Fallback: .env-Datei (Legacy, sollte nicht ins Repo).
    //    Akzeptiert auch Schreibvarianten (z. B. "puplic_stripe_key" / "private_stripe_key").
    static $alias_map = array(
        'public_stripe_api_key'  => array( 'public_stripe_key', 'puplic_stripe_key', 'STRIPE_PUBLIC_KEY', 'STRIPE_PUBLISHABLE_KEY' ),
        'private_stripe_api_key' => array( 'private_stripe_key', 'STRIPE_SECRET_KEY', 'STRIPE_PRIVATE_KEY' ),
        'stripe_webhook_secret'  => array( 'STRIPE_WEBHOOK_SECRET', 'webhook_secret' ),
    );
    static $cache = null;
    if ( $cache === null ) {
        $cache = array();
        $path = get_stylesheet_directory() . '/.env';
        if ( ! file_exists( $path ) ) $path = ABSPATH . '.env';
        if ( file_exists( $path ) && is_readable( $path ) ) {
            $lines = file( $path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
            foreach ( $lines as $line ) {
                if ( strpos( trim( $line ), '#' ) === 0 ) continue;
                $pos = strpos( $line, '=' );
                if ( $pos === false ) continue;
                $k = trim( substr( $line, 0, $pos ) );
                $v = trim( substr( $line, $pos + 1 ) );
                $v = trim( $v, "\"' " );
                $cache[ $k ] = $v;
            }
        }
    }
    if ( isset( $cache[ $key ] ) && $cache[ $key ] !== '' ) return $cache[ $key ];
    if ( isset( $alias_map[ $key ] ) ) {
        foreach ( $alias_map[ $key ] as $alias ) {
            if ( isset( $cache[ $alias ] ) && $cache[ $alias ] !== '' ) return $cache[ $alias ];
        }
    }
    return '';
}

function eb_stripe_public_key( WP_REST_Request $request ) {
    $pk = eb_load_env_value( 'public_stripe_api_key' );
    return new WP_REST_Response( array( 'publishable_key' => $pk ), 200 );
}

function eb_stripe_create_checkout( WP_REST_Request $request ) {
    $sk = eb_load_env_value( 'private_stripe_api_key' );
    if ( ! $sk ) {
        return new WP_REST_Response( array( 'message' => 'Stripe nicht konfiguriert.' ), 500 );
    }
    $p = $request->get_json_params();
    $amount      = isset( $p['amount'] ) ? floatval( $p['amount'] ) : 0;
    $currency    = isset( $p['currency'] ) ? strtolower( sanitize_text_field( $p['currency'] ) ) : 'eur';
    $title       = isset( $p['title'] ) ? sanitize_text_field( $p['title'] ) : 'Buchung';
    $card_id     = isset( $p['card_id'] ) ? sanitize_text_field( $p['card_id'] ) : '';
    $project_id  = isset( $p['project_id'] ) ? sanitize_text_field( $p['project_id'] ) : '';
    $listing_id  = isset( $p['listing_id'] ) ? absint( $p['listing_id'] ) : 0;

    if ( $amount <= 0 ) {
        return new WP_REST_Response( array( 'message' => 'Ung\u00fcltiger Betrag.' ), 400 );
    }
    if ( strlen( $title ) > 250 ) $title = substr( $title, 0, 250 );

    $amount_cents = (int) round( $amount * 100 );
    $site        = home_url( '/' );
    $success_url = add_query_arg( array(
        'stripe'     => 'success',
        'session_id' => '{CHECKOUT_SESSION_ID}',
        'card_id'    => rawurlencode( $card_id ),
        'project_id' => rawurlencode( $project_id ),
    ), $site );
    $cancel_url  = add_query_arg( array( 'stripe' => 'cancel' ), $site );

    $user = wp_get_current_user();

    $fields = array(
        'mode'                                    => 'payment',
        'payment_method_types[]'                  => 'card',
        'line_items[0][price_data][currency]'     => $currency,
        'line_items[0][price_data][unit_amount]'  => $amount_cents,
        'line_items[0][price_data][product_data][name]' => $title,
        'line_items[0][quantity]'                 => 1,
        'success_url'                             => $success_url,
        'cancel_url'                              => $cancel_url,
        'customer_email'                          => $user ? $user->user_email : '',
        'metadata[card_id]'                       => $card_id,
        'metadata[project_id]'                    => $project_id,
        'metadata[listing_id]'                    => (string) $listing_id,
        'metadata[user_id]'                       => (string) ( $user ? $user->ID : 0 ),
    );

    $ch = curl_init( 'https://api.stripe.com/v1/checkout/sessions' );
    curl_setopt_array( $ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query( $fields ),
        CURLOPT_USERPWD        => $sk . ':',
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => array( 'Content-Type: application/x-www-form-urlencoded' ),
    ) );
    $response = curl_exec( $ch );
    $http     = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
    $err      = curl_error( $ch );
    curl_close( $ch );

    if ( $err ) {
        return new WP_REST_Response( array( 'message' => 'Netzwerkfehler: ' . $err ), 502 );
    }
    $data = json_decode( $response, true );
    if ( $http >= 400 || ! is_array( $data ) || empty( $data['url'] ) ) {
        $msg = is_array( $data ) && isset( $data['error']['message'] ) ? $data['error']['message'] : 'Stripe-Fehler.';
        return new WP_REST_Response( array( 'message' => $msg ), $http ?: 500 );
    }

    return new WP_REST_Response( array(
        'ok'         => true,
        'url'        => $data['url'],
        'session_id' => $data['id'] ?? '',
    ), 200 );
}


/* ============================================================
 *  STRIPE PAYMENT INTENTS (embedded via Stripe Elements)
 *  - create-payment-intent: liefert client_secret fuer das Payment Element
 *  - verify-payment: serverseitige Pruefung nach Abschluss (Single Source of Truth)
 * ============================================================ */

function eb_stripe_create_payment_intent( WP_REST_Request $request ) {
    $sk = eb_load_env_value( 'private_stripe_api_key' );
    if ( ! $sk ) {
        return new WP_REST_Response( array( 'message' => 'Stripe nicht konfiguriert.' ), 500 );
    }
    $p = $request->get_json_params();
    $amount     = isset( $p['amount'] ) ? floatval( $p['amount'] ) : 0;
    $currency   = isset( $p['currency'] ) ? strtolower( sanitize_text_field( $p['currency'] ) ) : 'eur';
    $title      = isset( $p['title'] ) ? sanitize_text_field( $p['title'] ) : 'Buchung';
    $card_id    = isset( $p['card_id'] ) ? sanitize_text_field( $p['card_id'] ) : '';
    $project_id = isset( $p['project_id'] ) ? sanitize_text_field( $p['project_id'] ) : '';
    $listing_id = isset( $p['listing_id'] ) ? absint( $p['listing_id'] ) : 0;

    if ( $amount <= 0 ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Betrag.' ), 400 );
    }
    if ( strlen( $title ) > 250 ) $title = substr( $title, 0, 250 );

    $amount_cents = (int) round( $amount * 100 );
    $user = wp_get_current_user();

    $fields = array(
        'amount'                               => $amount_cents,
        'currency'                             => $currency,
        'automatic_payment_methods[enabled]'   => 'true',
        'description'                          => $title,
        // Bank-Abrechnungstext: Stripe erlaubt nur ASCII. „Eventbörse" mit
        // Umlaut wird sonst hart durch ein Leerzeichen ersetzt. Wir setzen
        // hier einen sauberen ASCII-Suffix, der hinter dem in Stripe
        // hinterlegten Basis-Descriptor erscheint („EVENTBOERSE.DE * <suffix>").
        'statement_descriptor_suffix'          => 'BUCHUNG',
        'receipt_email'                        => $user ? $user->user_email : '',
        'metadata[card_id]'                    => $card_id,
        'metadata[project_id]'                 => $project_id,
        'metadata[listing_id]'                 => (string) $listing_id,
        'metadata[user_id]'                    => (string) ( $user ? $user->ID : 0 ),
        'metadata[title]'                      => $title,
    );

    $ch = curl_init( 'https://api.stripe.com/v1/payment_intents' );
    curl_setopt_array( $ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query( $fields ),
        CURLOPT_USERPWD        => $sk . ':',
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => array( 'Content-Type: application/x-www-form-urlencoded' ),
    ) );
    $response = curl_exec( $ch );
    $http     = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
    $err      = curl_error( $ch );
    curl_close( $ch );

    if ( $err ) {
        return new WP_REST_Response( array( 'message' => 'Netzwerkfehler: ' . $err ), 502 );
    }
    $data = json_decode( $response, true );
    if ( $http >= 400 || ! is_array( $data ) || empty( $data['client_secret'] ) ) {
        $msg = is_array( $data ) && isset( $data['error']['message'] ) ? $data['error']['message'] : 'Stripe-Fehler.';
        return new WP_REST_Response( array( 'message' => $msg ), $http ?: 500 );
    }

    $pk = eb_load_env_value( 'public_stripe_api_key' );
    return new WP_REST_Response( array(
        'ok'              => true,
        'client_secret'   => $data['client_secret'],
        'payment_intent'  => $data['id'] ?? '',
        'publishable_key' => $pk,
        'amount'          => $amount_cents,
        'currency'        => $currency,
    ), 200 );
}

function eb_stripe_verify_payment( WP_REST_Request $request ) {
    $sk = eb_load_env_value( 'private_stripe_api_key' );
    if ( ! $sk ) {
        return new WP_REST_Response( array( 'message' => 'Stripe nicht konfiguriert.' ), 500 );
    }
    $p  = $request->get_json_params();
    $pi = isset( $p['payment_intent'] ) ? sanitize_text_field( $p['payment_intent'] ) : '';
    if ( ! $pi || ! preg_match( '/^pi_[A-Za-z0-9_]+$/', $pi ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige Payment-Intent-ID.' ), 400 );
    }

    $ch = curl_init( 'https://api.stripe.com/v1/payment_intents/' . rawurlencode( $pi ) );
    curl_setopt_array( $ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD        => $sk . ':',
        CURLOPT_TIMEOUT        => 15,
    ) );
    $response = curl_exec( $ch );
    $http     = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
    $err      = curl_error( $ch );
    curl_close( $ch );

    if ( $err || $http >= 400 ) {
        return new WP_REST_Response( array( 'message' => 'Payment-Intent nicht abrufbar.' ), 502 );
    }
    $data = json_decode( $response, true );
    $status  = is_array( $data ) ? ( $data['status'] ?? '' ) : '';
    $paid    = ( $status === 'succeeded' );
    $amount  = is_array( $data ) ? intval( $data['amount_received'] ?? $data['amount'] ?? 0 ) : 0;
    $meta    = is_array( $data ) && isset( $data['metadata'] ) ? $data['metadata'] : array();

    // Sicherstellen, dass der aufrufende User auch der ist, der den Intent erzeugt hat.
    $uid   = wp_get_current_user() ? wp_get_current_user()->ID : 0;
    $owner = isset( $meta['user_id'] ) ? intval( $meta['user_id'] ) : 0;
    if ( $owner && $uid && $owner !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Payment-Intent gehört nicht zu diesem Nutzer.' ), 403 );
    }

    return new WP_REST_Response( array(
        'ok'        => true,
        'paid'      => $paid,
        'status'    => $status,
        'amount'    => $amount,
        'currency'  => is_array( $data ) ? ( $data['currency'] ?? '' ) : '',
        'metadata'  => $meta,
    ), 200 );
}


/* ============================================================
 *  STRIPE WEBHOOK (authoritative payment confirmation)
 *  - Endpoint: /wp-json/eventboerse/v1/stripe/webhook
 *  - Signature-Verifikation via Stripe-Signature Header + whsec_* Secret
 *  - Behandelt payment_intent.succeeded + checkout.session.completed
 *  - Persistiert bestaetigte Zahlungen in wp_options (pro User) fuer Client-Reconcile
 * ============================================================ */

function eb_stripe_webhook_secret() {
    $s = eb_load_env_value( 'stripe_webhook_secret' );
    if ( ! $s ) { $s = eb_load_env_value( 'STRIPE_WEBHOOK_SECRET' ); }
    return $s;
}

/**
 * Verifiziert Stripe-Signature gegen Payload.
 * Referenz: https://stripe.com/docs/webhooks/signatures
 */
function eb_stripe_verify_signature( $payload, $sig_header, $secret, $tolerance = 300 ) {
    if ( ! $payload || ! $sig_header || ! $secret ) return false;
    $parts = explode( ',', $sig_header );
    $timestamp = null; $signatures = array();
    foreach ( $parts as $part ) {
        $kv = explode( '=', trim( $part ), 2 );
        if ( count( $kv ) !== 2 ) continue;
        if ( $kv[0] === 't' )   $timestamp = intval( $kv[1] );
        if ( $kv[0] === 'v1' )  $signatures[] = $kv[1];
    }
    if ( ! $timestamp || empty( $signatures ) ) return false;
    if ( $tolerance > 0 && ( time() - $timestamp ) > $tolerance ) return false;

    $signed_payload = $timestamp . '.' . $payload;
    $expected = hash_hmac( 'sha256', $signed_payload, $secret );
    foreach ( $signatures as $sig ) {
        if ( hash_equals( $expected, $sig ) ) return true;
    }
    return false;
}

function eb_stripe_record_payment( $pi ) {
    if ( ! is_array( $pi ) || empty( $pi['id'] ) ) return;
    $meta = isset( $pi['metadata'] ) && is_array( $pi['metadata'] ) ? $pi['metadata'] : array();
    $uid  = isset( $meta['user_id'] ) ? intval( $meta['user_id'] ) : 0;
    if ( ! $uid ) return;

    $record = array(
        'pi'         => $pi['id'],
        'status'     => $pi['status'] ?? '',
        'amount'     => intval( $pi['amount_received'] ?? $pi['amount'] ?? 0 ),
        'currency'   => $pi['currency'] ?? 'eur',
        'card_id'    => $meta['card_id'] ?? '',
        'project_id' => $meta['project_id'] ?? '',
        'listing_id' => isset( $meta['listing_id'] ) ? intval( $meta['listing_id'] ) : 0,
        'title'      => $meta['title'] ?? '',
        'paid_at'    => time(),
    );

    $existing = get_user_meta( $uid, 'eb_stripe_paid', true );
    if ( ! is_array( $existing ) ) $existing = array();
    // Deduplizieren by PI-ID
    $existing[ $pi['id'] ] = $record;
    // Alte Eintraege >90 Tage bereinigen
    $cutoff = time() - 90 * 86400;
    foreach ( $existing as $k => $v ) {
        if ( is_array( $v ) && isset( $v['paid_at'] ) && $v['paid_at'] < $cutoff ) unset( $existing[ $k ] );
    }
    update_user_meta( $uid, 'eb_stripe_paid', $existing );
}

function eb_stripe_webhook( WP_REST_Request $request ) {
    $secret = eb_stripe_webhook_secret();
    if ( ! $secret ) {
        // Immer 500 – ohne Secret darf der Endpoint nicht stillschweigend "ok" liefern.
        return new WP_REST_Response( array( 'message' => 'Webhook-Secret fehlt.' ), 500 );
    }

    $payload    = $request->get_body();
    $sig_header = $request->get_header( 'stripe_signature' );
    if ( ! $sig_header ) {
        // WP normalisiert Header-Namen; Fallback via $_SERVER:
        $sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    }    if ( ! eb_stripe_verify_signature( $payload, $sig_header, $secret ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungueltige Signatur.' ), 400 );
    }

    $event = json_decode( $payload, true );
    if ( ! is_array( $event ) || empty( $event['type'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Unleserlicher Event.' ), 400 );
    }

    $type = $event['type'];
    $obj  = isset( $event['data']['object'] ) && is_array( $event['data']['object'] ) ? $event['data']['object'] : array();

    switch ( $type ) {
        case 'payment_intent.succeeded':
            eb_stripe_record_payment( $obj );
            break;

        case 'checkout.session.completed':
            // Session selbst hat keine PI-Details im vollen Umfang – zusaetzlich PI ziehen.
            $pi_id = isset( $obj['payment_intent'] ) ? sanitize_text_field( $obj['payment_intent'] ) : '';
            if ( $pi_id && preg_match( '/^pi_[A-Za-z0-9_]+$/', $pi_id ) ) {
                $sk = eb_load_env_value( 'private_stripe_api_key' );
                if ( $sk ) {
                    $ch = curl_init( 'https://api.stripe.com/v1/payment_intents/' . rawurlencode( $pi_id ) );
                    curl_setopt_array( $ch, array(
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_USERPWD        => $sk . ':',
                        CURLOPT_TIMEOUT        => 10,
                    ) );
                    $resp = curl_exec( $ch );
                    curl_close( $ch );
                    $pi = json_decode( $resp, true );
                    if ( is_array( $pi ) && ( $pi['status'] ?? '' ) === 'succeeded' ) {
                        eb_stripe_record_payment( $pi );
                    }
                }
            } else {
                // Metadata direkt auf der Session (alternativ)
                $meta = isset( $obj['metadata'] ) && is_array( $obj['metadata'] ) ? $obj['metadata'] : array();
                if ( ! empty( $meta['user_id'] ) ) {
                    eb_stripe_record_payment( array(
                        'id'              => $obj['id'] ?? ( 'cs_' . md5( $payload ) ),
                        'status'          => 'succeeded',
                        'amount'          => intval( $obj['amount_total'] ?? 0 ),
                        'amount_received' => intval( $obj['amount_total'] ?? 0 ),
                        'currency'        => $obj['currency'] ?? 'eur',
                        'metadata'        => $meta,
                    ) );
                }
            }
            break;

        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
            // Optional: zukuenftig Fehlerlog ablegen. Derzeit NOOP (UI zeigt Fehler live).
            break;

        default:
            // Unbekannte Events ignorieren, aber mit 200 bestaetigen, damit Stripe nicht retry't.
            break;
    }

    return new WP_REST_Response( array( 'received' => true ), 200 );
}

/**
 * Liefert ungesehene, per Webhook bestaetigte Zahlungen fuer den aktuellen User.
 * Client kann damit Karten markieren, die beim Tab-Close verpasst wurden.
 * Query-Param ?ack=pi_xxx,pi_yyy loescht Eintraege nach Verarbeitung.
 */
function eb_stripe_reconcile( WP_REST_Request $request ) {
    $user = wp_get_current_user();
    if ( ! $user || ! $user->ID ) {
        return new WP_REST_Response( array( 'items' => array() ), 200 );
    }
    $uid = $user->ID;

    $ack = $request->get_param( 'ack' );
    if ( $ack ) {
        $ids = array_filter( array_map( 'trim', explode( ',', (string) $ack ) ) );
        $existing = get_user_meta( $uid, 'eb_stripe_paid', true );
        if ( is_array( $existing ) ) {
            foreach ( $ids as $id ) {
                if ( isset( $existing[ $id ] ) ) unset( $existing[ $id ] );
            }
            update_user_meta( $uid, 'eb_stripe_paid', $existing );
        }
        return new WP_REST_Response( array( 'ok' => true, 'acked' => array_values( $ids ) ), 200 );
    }

    $existing = get_user_meta( $uid, 'eb_stripe_paid', true );
    if ( ! is_array( $existing ) ) $existing = array();
    return new WP_REST_Response( array( 'items' => array_values( $existing ) ), 200 );
}
