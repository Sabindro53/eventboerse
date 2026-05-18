```php
<?php
/**
 * EventBörse Theme Functions
 * WordPress Theme: REST API (67+ Endpoints), Asset-Registrierung
 */

// ============================================================
// THEME SETUP & ASSETS
// ============================================================

function eb_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
}
add_action('after_setup_theme', 'eb_theme_setup');

function eb_enqueue_assets() {
    $ver = '2.9.4';
    wp_enqueue_style('eb-styles', get_template_directory_uri() . '/styles.css', [], $ver);
    wp_enqueue_script('eb-app', get_template_directory_uri() . '/app.js', [], $ver, true);

    // Pass runtime config to JS
    wp_localize_script('eb-app', 'eventboerseApi', [
        'restUrl'   => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'siteUrl'   => esc_url_raw(home_url()),
        'userId'    => get_current_user_id(),
        'isLoggedIn'=> is_user_logged_in(),
        'stripeKey' => defined('EB_STRIPE_PUBLIC_KEY') ? EB_STRIPE_PUBLIC_KEY : '',
        'avatarUrl' => esc_url_raw(get_template_directory_uri() . '/avatar.php'),
    ]);
}
add_action('wp_enqueue_scripts', 'eb_enqueue_assets');

// Remove WP bloat
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_script('wp-embed');
}, 100);
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');

// ============================================================
// SPA REWRITES
// ============================================================

function eb_add_rewrite_rules() {
    $spa_pages = [
        'browse', 'login', 'register', 'forgot-password', 'reset-password',
        'verify-email', 'messages', 'chat', 'profile', 'settings', 'favorites',
        'board', 'inserat-erstellen', 'meine-inserate', 'admin',
        'agb', 'agb-b2b', 'agb-dienstleister', 'datenschutz', 'impressum',
        'cookies', 'widerruf', 'community', 'bewertungen', 'upload', 'dsa',
        'p2b', 'marktplatz', 'barrierefreiheit', 'vsbg',
    ];
    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . $page . '/?$', 'index.php', 'top');
    }
    add_rewrite_rule('^listing/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^provider/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^kategorie/([a-z0-9-]+)/?$', 'index.php', 'top');
}
add_action('init', 'eb_add_rewrite_rules');

// ============================================================
// DATABASE — ensure tables exist
// ============================================================

function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $listings = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_listings (
        id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id       BIGINT UNSIGNED NOT NULL,
        title         VARCHAR(255)    NOT NULL DEFAULT '',
        description   LONGTEXT,
        category      VARCHAR(100)    DEFAULT '',
        category_label VARCHAR(100)   DEFAULT '',
        price_model   VARCHAR(50)     DEFAULT '',
        price_label   VARCHAR(100)    DEFAULT '',
        price_from    DECIMAL(10,2)   DEFAULT 0,
        price_to      DECIMAL(10,2)   DEFAULT 0,
        location      VARCHAR(255)    DEFAULT '',
        region        VARCHAR(100)    DEFAULT '',
        lat           DECIMAL(10,7)   DEFAULT NULL,
        lng           DECIMAL(10,7)   DEFAULT NULL,
        features      LONGTEXT,
        tags          LONGTEXT,
        images        LONGTEXT,
        date_from     DATE            DEFAULT NULL,
        date_to       DATE            DEFAULT NULL,
        time_from     TIME            DEFAULT NULL,
        time_to       TIME            DEFAULT NULL,
        status        ENUM('active','inactive','pending') DEFAULT 'active',
        created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY category (category),
        KEY status (status),
        FULLTEXT KEY ft_search (title, description, location, tags)
    ) $charset;";

    $reviews = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_reviews (
        id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id  BIGINT UNSIGNED NOT NULL,
        author_id   BIGINT UNSIGNED NOT NULL,
        rating      TINYINT UNSIGNED NOT NULL DEFAULT 5,
        comment     TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY listing_id (listing_id),
        KEY author_id (author_id)
    ) $charset;";

    $conversations = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_conversations (
        id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_a     BIGINT UNSIGNED NOT NULL,
        user_b     BIGINT UNSIGNED NOT NULL,
        listing_id BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_pair (user_a, user_b),
        KEY listing_id (listing_id)
    ) $charset;";

    $messages = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_messages (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id       BIGINT UNSIGNED NOT NULL,
        body            LONGTEXT,
        type            VARCHAR(50) DEFAULT 'text',
        meta            LONGTEXT,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY conversation_id (conversation_id),
        KEY sender_id (sender_id)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($listings);
    dbDelta($reviews);
    dbDelta($conversations);
    dbDelta($messages);
}
add_action('after_switch_theme', 'eb_create_tables');
add_action('init', function() {
    if (get_option('eb_db_version') !== '1.3') {
        eb_create_tables();
        update_option('eb_db_version', '1.3');
    }
});

// ============================================================
// HELPERS
// ============================================================

function eb_is_admin_user() {
    return current_user_can('administrator');
}

function eb_current_user_id() {
    return get_current_user_id();
}

function eb_json_decode_meta($value, $default = []) {
    if (empty($value)) return $default;
    $decoded = json_decode($value, true);
    return (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : $default;
}

function eb_format_listing($row) {
    if (!$row) return null;
    return [
        'id'             => (int)$row->id,
        'user_id'        => (int)$row->user_id,
        'title'          => $row->title,
        'description'    => $row->description,
        'category'       => $row->category,
        'category_label' => $row->category_label,
        'price_model'    => $row->price_model,
        'price_label'    => $row->price_label,
        'price_from'     => (float)$row->price_from,
        'price_to'       => (float)$row->price_to,
        'location'       => $row->location,
        'region'         => $row->region,
        'lat'            => $row->lat !== null ? (float)$row->lat : null,
        'lng'            => $row->lng !== null ? (float)$row->lng : null,
        'features'       => eb_json_decode_meta($row->features),
        'tags'           => eb_json_decode_meta($row->tags),
        'images'         => eb_json_decode_meta($row->images),
        'date_from'      => $row->date_from,
        'date_to'        => $row->date_to,
        'time_from'      => $row->time_from,
        'time_to'        => $row->time_to,
        'status'         => $row->status,
        'created_at'     => $row->created_at,
        'updated_at'     => $row->updated_at,
        'provider'       => eb_get_provider_info((int)$row->user_id),
        'avg_rating'     => eb_get_avg_rating((int)$row->id),
        'review_count'   => eb_get_review_count((int)$row->id),
    ];
}

function eb_get_provider_info($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return null;
    return [
        'id'        => $user_id,
        'name'      => $user->display_name,
        'email'     => $user->user_email,
        'company'   => get_user_meta($user_id, 'eb_company', true),
        'photo_url' => get_user_meta($user_id, 'eb_photo_url', true),
        'role'      => get_user_meta($user_id, 'eb_role', true),
    ];
}

function eb_get_avg_rating($listing_id) {
    global $wpdb;
    $avg = $wpdb->get_var($wpdb->prepare(
        "SELECT AVG(rating) FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d",
        $listing_id
    ));
    return $avg ? round((float)$avg, 1) : null;
}

function eb_get_review_count($listing_id) {
    global $wpdb;
    return (int)$wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d",
        $listing_id
    ));
}

// ============================================================
// REST API REGISTRATION
// ============================================================

add_action('rest_api_init', function() {

    $ns = 'eventboerse/v1';

    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------

    register_rest_route($ns, '/register', [
        'methods'             => 'POST',
        'callback'            => 'eb_register',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/register/verify', [
        'methods'             => 'POST',
        'callback'            => 'eb_register_verify',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/register/resend', [
        'methods'             => 'POST',
        'callback'            => 'eb_register_resend',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/login', [
        'methods'             => 'POST',
        'callback'            => 'eb_login',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/logout', [
        'methods'             => 'POST',
        'callback'            => 'eb_logout',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route($ns, '/me', [
        'methods'             => 'GET',
        'callback'            => 'eb_me',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route($ns, '/forgot-password', [
        'methods'             => 'POST',
        'callback'            => 'eb_forgot_password',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/verify-email', [
        'methods'             => 'POST',
        'callback'            => 'eb_verify_email',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/reset-password', [
        'methods'             => 'POST',
        'callback'            => 'eb_reset_password',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/resend-verification', [
        'methods'             => 'POST',
        'callback'            => 'eb_resend_verification',
        'permission_callback' => '__return_true',
    ]);

    // ----------------------------------------------------------
    // OTP / 2FA
    // ----------------------------------------------------------

    register_rest_route($ns, '/otp/send', [
        'methods'             => 'POST',
        'callback'            => 'eb_otp_send',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/otp/verify', [
        'methods'             => 'POST',
        'callback'            => 'eb_otp_verify',
        'permission_callback' => '__return_true',
    ]);

    // ----------------------------------------------------------
    // PROFILE & SETTINGS
    // ----------------------------------------------------------

    register_rest_route($ns, '/me', [
        'methods'             => 'GET',
        'callback'            => 'eb_me',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route($ns, '/profile', [
        'methods'             => ['GET', 'PUT'],
        'callback'            => 'eb_profile',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route($ns, '/provider/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'eb_get_provider',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/settings', [
        'methods'             => ['GET', 'PUT'],
        'callback'            => 'eb_settings',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route($ns, '/settings/password', [
        'methods'             => 'POST',
        'callback'            => 'eb_settings_password',