<?php
/**
 * EventBörse Theme Functions
 * REST API: 67+ Endpoints
 * SSE: /conversations/{id}/stream added
 */

// Prevent direct access
if (!defined('ABSPATH')) exit;

// ============================================================
// THEME SETUP
// ============================================================

function eventboerse_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
}
add_action('after_setup_theme', 'eventboerse_setup');

function eventboerse_enqueue_scripts() {
    $version = '2.9.1';
    wp_enqueue_style('eventboerse-style', get_template_directory_uri() . '/styles.css', [], $version);
    wp_enqueue_script('eventboerse-app', get_template_directory_uri() . '/app.js', [], $version, true);

    // Pass REST URL + Nonce to frontend
    wp_localize_script('eventboerse-app', 'eventboerseApi', [
        'restUrl' => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'   => wp_create_nonce('wp_rest'),
        'userId'  => get_current_user_id(),
        'sseSupported' => true, // hint to frontend
    ]);
}
add_action('wp_enqueue_scripts', 'eventboerse_enqueue_scripts');

// Remove WordPress bloat
add_action('init', function() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'rsd_link');
});

// ============================================================
// SPA ROUTING - Rewrite Rules
// ============================================================

function eventboerse_add_rewrite_rules() {
    $spa_pages = [
        'browse', 'listing', 'provider', 'kategorie',
        'messages', 'chat', 'profile', 'settings',
        'favorites', 'board', 'inserat-erstellen', 'meine-inserate',
        'admin', 'login', 'register', 'forgot-password',
        'reset-password', 'verify-email',
        'agb', 'agb-b2b', 'agb-dienstleister', 'datenschutz',
        'impressum', 'cookies', 'widerruf', 'community',
        'bewertungen', 'upload', 'dsa', 'p2b', 'marktplatz',
        'barrierefreiheit', 'vsbg',
    ];
    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . $page . '(/.*)?$', 'index.php', 'top');
    }
}
add_action('init', 'eventboerse_add_rewrite_rules');

// ============================================================
// DATABASE SETUP
// ============================================================

function eventboerse_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $listings_table = $wpdb->prefix . 'eb_listings';
    $reviews_table  = $wpdb->prefix . 'eb_reviews';
    $conv_table     = $wpdb->prefix . 'eb_conversations';
    $msg_table      = $wpdb->prefix . 'eb_messages';

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    dbDelta("CREATE TABLE $listings_table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        description LONGTEXT,
        category VARCHAR(100),
        category_label VARCHAR(100),
        price_model VARCHAR(50),
        price_label VARCHAR(100),
        price DECIMAL(10,2) DEFAULT 0,
        location VARCHAR(255),
        region VARCHAR(100),
        features JSON,
        tags JSON,
        images JSON,
        date_from DATE,
        date_to DATE,
        time_from TIME,
        time_to TIME,
        status ENUM('active','inactive','pending') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY category (category),
        KEY status (status)
    ) $charset;");

    dbDelta("CREATE TABLE $reviews_table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        author_id BIGINT UNSIGNED NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY listing_id (listing_id),
        KEY author_id (author_id)
    ) $charset;");

    dbDelta("CREATE TABLE $conv_table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_a BIGINT UNSIGNED NOT NULL,
        user_b BIGINT UNSIGNED NOT NULL,
        listing_id BIGINT UNSIGNED,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_pair (user_a, user_b),
        KEY listing_id (listing_id)
    ) $charset;");

    dbDelta("CREATE TABLE $msg_table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        type ENUM('text','offer','system') DEFAULT 'text',
        content TEXT NOT NULL,
        offer_amount DECIMAL(10,2),
        offer_status ENUM('pending','accepted','rejected') DEFAULT 'pending',
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY conversation_id (conversation_id),
        KEY sender_id (sender_id),
        KEY created_at (created_at)
    ) $charset;");
}
register_activation_hook(__FILE__, 'eventboerse_create_tables');
add_action('after_switch_theme', 'eventboerse_create_tables');

// ============================================================
// HELPERS
// ============================================================

function eb_get_user_data($user_id) {
    $user = get_userdata($user_id);
    if (!$user) return null;
    return [
        'id'       => $user->ID,
        'name'     => $user->display_name,
        'email'    => $user->user_email,
        'role'     => get_user_meta($user->ID, 'eb_role', true) ?: 'Event-Planer',
        'photo'    => get_user_meta($user->ID, 'eb_photo_url', true) ?: '',
        'company'  => get_user_meta($user->ID, 'eb_company', true) ?: '',
        'bio'      => get_user_meta($user->ID, 'eb_bio', true) ?: '',
        'active'   => (bool)(get_user_meta($user->ID, 'eb_active', true) !== '0'),
    ];
}

function eb_current_user_id() {
    return get_current_user_id();
}

function eb_is_admin($user_id = null) {
    if (!$user_id) $user_id = get_current_user_id();
    return user_can($user_id, 'administrator') || get_user_meta($user_id, 'eb_role', true) === 'Admin';
}

function eb_sanitize_html($content) {
    return wp_kses_post($content);
}

function eb_avatar_url($user_id) {
    $photo = get_user_meta($user_id, 'eb_photo_url', true);
    if ($photo) return $photo;
    return '';
}

// Rate limiting helper
function eb_check_rate_limit($key, $limit = 5, $window = 60) {
    $transient_key = 'eb_rl_' . md5($key);
    $count = (int) get_transient($transient_key);
    if ($count >= $limit) return false;
    set_transient($transient_key, $count + 1, $window);
    return true;
}

// ============================================================
// REST API REGISTRATION
// ============================================================

add_action('rest_api_init', function() {

    $ns = 'eventboerse/v1';

    // --- AUTH ---
    register_rest_route($ns, '/register', ['methods' => 'POST', 'callback' => 'eb_register', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/verify', ['methods' => 'POST', 'callback' => 'eb_register_verify', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/resend', ['methods' => 'POST', 'callback' => 'eb_register_resend', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/login', ['methods' => 'POST', 'callback' => 'eb_login', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/logout', ['methods' => 'POST', 'callback' => 'eb_logout', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/me', ['methods' => 'GET', 'callback' => 'eb_me', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/forgot-password', ['methods' => 'POST', 'callback' => 'eb_forgot_password', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/verify-email', ['methods' => 'POST', 'callback' => 'eb_verify_email', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/reset-password', ['methods' => 'POST', 'callback' => 'eb_reset_password', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/resend-verification', ['methods' => 'POST', 'callback' => 'eb_register_resend', 'permission_callback' => '__return_true']);

    // --- USER ---
    register_rest_route($ns, '/profile', ['methods' => ['GET','PUT'], 'callback' => 'eb_profile', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings', ['methods' => ['GET','PUT'], 'callback' => 'eb_settings', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/password', ['methods' => 'POST', 'callback' => 'eb_settings_password', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/delete-account', ['methods' => 'DELETE', 'callback' => 'eb_delete_account', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/2fa', ['methods' => ['POST','DELETE'], 'callback' => 'eb_settings_2fa', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/provider/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_get_provider', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/user-status/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_user_status', 'permission_callback' => '__return_true']);

    // --- OTP ---
    register_rest_route($ns, '/otp/send', ['methods' => 'POST', 'callback' => 'eb_otp_send', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/otp/verify', ['methods' => 'POST', 'callback' => 'eb_otp_verify', 'permission_callback' => '__return_true']);

    // --- WEBAUTHN ---
    register_rest_route($ns, '/webauthn/register-options', ['methods' => 'POST', 'callback' => 'eb_webauthn_register_options', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/register', ['methods' => 'POST', 'callback' => 'eb_webauthn_register', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/verify-register', ['methods' => 'POST', 'callback' => 'eb_webauthn_verify_register', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/login-options', ['methods' => 'POST', 'callback' => 'eb_webauthn_login_options', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/login', ['methods' => 'POST', 'callback' => 'eb_webauthn_login', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/verify-login', ['methods' => 'POST', 'callback' => 'eb_webauthn_verify_login', 'permission_callback' => '__return_true']);

});