```php
<?php
/**
 * Eventbörse Theme Functions
 * WordPress REST API + Theme Setup
 */

// Prevent direct access
if (!defined('ABSPATH')) exit;

// ─────────────────────────────────────────────
// THEME SETUP
// ─────────────────────────────────────────────

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
});

// Remove WordPress bloat
add_action('init', function () {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'rsd_link');
});

add_action('wp_enqueue_scripts', function () {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('global-styles');
});

// ─────────────────────────────────────────────
// ASSET REGISTRATION
// ─────────────────────────────────────────────

add_action('wp_enqueue_scripts', function () {
    $theme_uri = get_stylesheet_directory_uri();
    $version   = '2.9.4';

    wp_enqueue_style('eventboerse-style', $theme_uri . '/styles.css', [], $version);
    wp_enqueue_script('eventboerse-app', $theme_uri . '/app.js', [], $version, true);

    // Pass WordPress data to JS
    wp_localize_script('eventboerse-app', 'eventboerseApi', [
        'restUrl'   => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'siteUrl'   => get_site_url(),
        'themeUrl'  => $theme_uri,
        'userId'    => get_current_user_id(),
        'isLoggedIn'=> is_user_logged_in(),
    ]);
});

// ─────────────────────────────────────────────
// SPA REWRITES
// ─────────────────────────────────────────────

add_action('init', function () {
    $spa_pages = [
        'browse', 'board', 'profile', 'settings', 'admin',
        'messages', 'favorites', 'inserat-erstellen', 'meine-inserate',
        'login', 'register', 'forgot-password', 'reset-password', 'verify-email',
        'agb', 'agb-b2b', 'agb-dienstleister', 'datenschutz', 'impressum',
        'cookies', 'widerruf', 'community', 'bewertungen', 'upload',
        'dsa', 'p2b', 'marktplatz', 'barrierefreiheit', 'vsbg',
    ];

    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . $page . '/?$', 'index.php', 'top');
    }

    add_rewrite_rule('^listing/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^provider/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^chat/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^kategorie/([a-z0-9-]+)/?$', 'index.php', 'top');
});

// ─────────────────────────────────────────────
// DATABASE TABLES
// ─────────────────────────────────────────────

function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    // Listings table
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_listings (
        id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id     BIGINT UNSIGNED NOT NULL,
        title       VARCHAR(255)    NOT NULL DEFAULT '',
        description LONGTEXT,
        category    VARCHAR(100)    NOT NULL DEFAULT '',
        category_label VARCHAR(100) NOT NULL DEFAULT '',
        price_model VARCHAR(50)     NOT NULL DEFAULT 'pauschal',
        price_label VARCHAR(100)    NOT NULL DEFAULT '',
        price_value DECIMAL(10,2)   DEFAULT NULL,
        location    VARCHAR(255)    NOT NULL DEFAULT '',
        region      VARCHAR(100)    NOT NULL DEFAULT '',
        features    LONGTEXT,
        tags        LONGTEXT,
        images      LONGTEXT,
        date_from   DATE            DEFAULT NULL,
        date_to     DATE            DEFAULT NULL,
        time_from   TIME            DEFAULT NULL,
        time_to     TIME            DEFAULT NULL,
        status      ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
        created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY status (status),
        KEY category (category)
    ) $charset");

    // Conversations table
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_conversations (
        id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_a     BIGINT UNSIGNED NOT NULL,
        user_b     BIGINT UNSIGNED NOT NULL,
        listing_id BIGINT UNSIGNED DEFAULT NULL,
        status     ENUM('active','archived','completed') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_a (user_a),
        KEY user_b (user_b)
    ) $charset");

    // Messages table
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_messages (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id       BIGINT UNSIGNED NOT NULL,
        type            ENUM('text','offer','system') NOT NULL DEFAULT 'text',
        content         LONGTEXT,
        offer_amount    DECIMAL(10,2)   DEFAULT NULL,
        offer_status    ENUM('pending','accepted','rejected','countered') DEFAULT NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY conversation_id (conversation_id),
        KEY sender_id (sender_id)
    ) $charset");

    // Reviews table
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_reviews (
        id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        author_id  BIGINT UNSIGNED NOT NULL,
        rating     TINYINT UNSIGNED NOT NULL DEFAULT 5,
        comment    TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY listing_id (listing_id),
        KEY author_id (author_id),
        UNIQUE KEY one_review_per_user (listing_id, author_id)
    ) $charset");

    // Board projects table
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_board_projects (
        id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id    BIGINT UNSIGNED NOT NULL,
        data       LONGTEXT        NOT NULL,
        updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_id (user_id)
    ) $charset");
}

// ─────────────────────────────────────────────
// REST API REGISTRATION
// ─────────────────────────────────────────────

add_action('rest_api_init', function () {

    $ns = 'eventboerse/v1';

    // ── Auth ──────────────────────────────────
    register_rest_route($ns, '/register',           ['methods' => 'POST', 'callback' => 'eb_register',             'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/verify',    ['methods' => 'POST', 'callback' => 'eb_register_verify',      'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/resend',    ['methods' => 'POST', 'callback' => 'eb_register_resend',      'permission_callback' => '__return_true']);
    register_rest_route($ns, '/login',              ['methods' => 'POST', 'callback' => 'eb_login',                'permission_callback' => '__return_true']);
    register_rest_route($ns, '/logout',             ['methods' => 'POST', 'callback' => 'eb_logout',               'permission_callback' => '__return_true']);
    register_rest_route($ns, '/me',                 ['methods' => 'GET',  'callback' => 'eb_me',                   'permission_callback' => '__return_true']);
    register_rest_route($ns, '/forgot-password',    ['methods' => 'POST', 'callback' => 'eb_forgot_password',      'permission_callback' => '__return_true']);
    register_rest_route($ns, '/verify-email',       ['methods' => 'POST', 'callback' => 'eb_verify_email_token',   'permission_callback' => '__return_true']);
    register_rest_route($ns, '/reset-password',     ['methods' => 'POST', 'callback' => 'eb_reset_password',       'permission_callback' => '__return_true']);
    register_rest_route($ns, '/resend-verification',['methods' => 'POST', 'callback' => 'eb_resend_verification',  'permission_callback' => '__return_true']);
    register_rest_route($ns, '/user-status/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_user_status',     'permission_callback' => '__return_true']);
    register_rest_route($ns, '/heartbeat',          ['methods' => 'GET',  'callback' => 'eb_heartbeat',            'permission_callback' => '__return_true']);

    // ── Profile & Settings ────────────────────
    register_rest_route($ns, '/profile',            ['methods' => 'GET,PUT', 'callback' => 'eb_profile',           'permission_callback' => 'eb_is_logged_in']);
    register_rest_route($ns, '/provider/(?P<id>\d+)', ['methods' => 'GET',  'callback' => 'eb_provider_profile',   'permission_callback' => '__return_true']);
    register_rest_route($ns, '/settings',           ['methods' => 'GET,PUT','callback' => 'eb_settings',           'permission_callback' => 'eb_is_logged_in']);
    register_rest_route($ns, '/settings/password',  ['methods' => 'POST',   'callback' => 'eb_change_password',    'permission_callback' => 'eb_is_logged_in']);
    register_rest_route($ns, '/settings/delete-account', ['methods' => 'DELETE', 'callback' => 'eb_delete_account','permission_callback' => 'eb_is_logged_in']);
    register_rest_route($ns, '/settings/2fa',       ['methods' => 'POST,DELETE', 'callback' => 'eb_toggle_2fa',    'permission_callback' => 'eb_is_logged_in']);

    // ── OTP ───────────────────────────────────
    register_rest_route($ns, '/otp/send',           ['methods' => 'POST', 'callback' => 'eb_otp_send',             'permission_callback' => '__return_true']);
    register_rest_route($ns, '/otp/verify',         ['methods' => 'POST', 'callback' => 'eb_otp_verify',           'permission_callback' => '__return_true']);

    // ── WebAuthn ──────────────────────────────
    register_rest_route($ns, '/webauthn/register-options', ['methods' => 'POST', 'callback' => 'eb_webauthn_register_options', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/register',         ['methods' => 'POST', 'callback' => 'eb_webauthn_register',         'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/verify-register',  ['methods' => 'POST', 'callback' => 'eb_webauthn_verify_register',  'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/login-options',    ['methods' => 'POST', 'callback' => 'eb_webauthn_login_options',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/login',            ['methods' => 'POST', 'callback' => 'eb_webauthn_login',            'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/verify-options',   ['methods' => 'POST', 'callback' => 'eb_webauthn_verify_options',   'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/credentials',      ['methods' => 'GET',  'callback' => 'eb_webauthn_credentials',      'permission_callback' => 'eb_is_logged_in']);
    register_rest_route($ns, '/webauthn/credentials/(?P<credential_id>[A-Za-z0-9_-]+)', ['methods' => 'DELETE', 'callback' => 'eb