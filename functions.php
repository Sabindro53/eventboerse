```php
<?php
/**
 * Eventbörse Theme Functions
 * WordPress REST API (67 Endpoints) + SSE Messaging Stream
 */

// ─── Theme Setup ────────────────────────────────────────────────────────────
add_action('after_setup_theme', function() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
});

// ─── Assets ─────────────────────────────────────────────────────────────────
add_action('wp_enqueue_scripts', function() {
    $ver = '2.9.1';
    wp_enqueue_style('eb-styles', get_template_directory_uri() . '/styles.css', [], $ver);
    wp_enqueue_script('eb-app', get_template_directory_uri() . '/app.js', [], $ver, true);
    wp_localize_script('eb-app', 'eventboerseApi', [
        'restUrl'   => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'siteUrl'   => esc_url_raw(home_url()),
        'userId'    => get_current_user_id(),
        'isAdmin'   => current_user_can('administrator'),
        'stripeKey' => get_option('eb_stripe_public_key', ''),
    ]);
});

// ─── SPA Rewrites ───────────────────────────────────────────────────────────
add_action('init', function() {
    $spa_pages = [
        'browse', 'messages', 'chat', 'profile', 'settings',
        'favorites', 'board', 'admin', 'login', 'register',
        'inserat-erstellen', 'meine-inserate', 'agb', 'datenschutz',
        'impressum', 'cookies', 'widerruf', 'community',
        'bewertungen', 'upload', 'dsa', 'p2b', 'marktplatz',
        'barrierefreiheit', 'vsbg', 'agb-b2b', 'agb-dienstleister',
    ];
    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . preg_quote($page) . '/?$', 'index.php', 'top');
        add_rewrite_rule('^' . preg_quote($page) . '/(.+)/?$', 'index.php', 'top');
    }
    add_rewrite_rule('^listing/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^provider/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^kategorie/([^/]+)/?$', 'index.php', 'top');
});

// ─── Remove WordPress Bloat ─────────────────────────────────────────────────
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_script('wp-embed');
}, 100);

// ─── DB Table Creation ──────────────────────────────────────────────────────
register_activation_hook(__FILE__, 'eb_create_tables');
add_action('after_switch_theme', 'eb_create_tables');

function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $listings = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_listings (
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
        KEY status (status),
        KEY category (category)
    ) $charset;";

    $reviews = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_reviews (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        author_id BIGINT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY listing_id (listing_id),
        KEY author_id (author_id)
    ) $charset;";

    $conversations = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_conversations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_a BIGINT UNSIGNED NOT NULL,
        user_b BIGINT UNSIGNED NOT NULL,
        listing_id BIGINT UNSIGNED,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_a (user_a),
        KEY user_b (user_b),
        UNIQUE KEY unique_conversation (user_a, user_b, listing_id)
    ) $charset;";

    $messages = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'text',
        offer_amount DECIMAL(10,2),
        offer_status VARCHAR(50),
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY conversation_id (conversation_id),
        KEY sender_id (sender_id),
        KEY created_at (created_at)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($listings);
    dbDelta($reviews);
    dbDelta($conversations);
    dbDelta($messages);
}

// ─── Helper: API URL ─────────────────────────────────────────────────────────
function eb_api_base() {
    return 'eventboerse/v1';
}

// ─── Helper: Current User Check ──────────────────────────────────────────────
function eb_get_current_user_id() {
    // Support cookie auth for SSE (EventSource can't set headers)
    if (!is_user_logged_in()) {
        // Try token auth for SSE
        $token = isset($_GET['_eb_token']) ? sanitize_text_field($_GET['_eb_token']) : '';
        if ($token) {
            $user_id = eb_verify_sse_token($token);
            if ($user_id) {
                wp_set_current_user($user_id);
                return $user_id;
            }
        }
        return 0;
    }
    return get_current_user_id();
}

// ─── Helper: SSE Token ───────────────────────────────────────────────────────
function eb_generate_sse_token($user_id) {
    $token = wp_generate_password(32, false);
    $expires = time() + 3600; // 1 hour
    set_transient('eb_sse_token_' . $token, ['user_id' => $user_id, 'expires' => $expires], 3600);
    return $token;
}

function eb_verify_sse_token($token) {
    if (empty($token) || strlen($token) > 64) {
        return 0;
    }
    $data = get_transient('eb_sse_token_' . $token);
    if (!$data || !isset($data['user_id']) || !isset($data['expires'])) {
        return 0;
    }
    if ($data['expires'] < time()) {
        delete_transient('eb_sse_token_' . $token);
        return 0;
    }
    return intval($data['user_id']);
}

// ─── REST API Registration ───────────────────────────────────────────────────
add_action('rest_api_init', function() {
    $ns = eb_api_base();

    // ── Auth ──────────────────────────────────────────────────────────────────
    register_rest_route($ns, '/register', ['methods' => 'POST', 'callback' => 'eb_register', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/verify', ['methods' => 'POST', 'callback' => 'eb_register_verify', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/resend', ['methods' => 'POST', 'callback' => 'eb_register_resend', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/login', ['methods' => 'POST', 'callback' => 'eb_login', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/logout', ['methods' => 'POST', 'callback' => 'eb_logout', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/me', ['methods' => 'GET', 'callback' => 'eb_me', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/forgot-password', ['methods' => 'POST', 'callback' => 'eb_forgot_password', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/verify-email', ['methods' => 'POST', 'callback' => 'eb_verify_email', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/reset-password', ['methods' => 'POST', 'callback' => 'eb_reset_password', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/resend-verification', ['methods' => 'POST', 'callback' => 'eb_resend_verification', 'permission_callback' => '__return_true']);

    // ── OTP ───────────────────────────────────────────────────────────────────
    register_rest_route($ns, '/otp/send', ['methods' => 'POST', 'callback' => 'eb_otp_send', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/otp/verify', ['methods' => 'POST', 'callback' => 'eb_otp_verify', 'permission_callback' => '__return_true']);

    // ── Profile / Settings ────────────────────────────────────────────────────
    register_rest_route($ns, '/profile', ['methods' => ['GET','PUT'], 'callback' => 'eb_profile', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings', ['methods' => ['GET','PUT'], 'callback' => 'eb_settings', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/password', ['methods' => 'POST', 'callback' => 'eb_settings_password', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/delete-account', ['methods' => 'DELETE', 'callback' => 'eb_settings_delete_account', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/2fa', ['methods' => ['POST','DELETE'], 'callback' => 'eb_settings_2fa', 'permission_callback' => 'is_user_logged_in']);

    // ── Listings ──────────────────────────────────────────────────────────────
    register_rest_route($ns, '/listings', ['methods' => 'GET', 'callback' => 'eb_get_listings', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/listings', ['methods' => 'POST', 'callback' => 'eb_create_listing', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/listings/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_get_listing', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/listings/(?P<id>\d+)', ['methods' => 'PUT', 'callback' => 'eb_update_listing', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/listings/(?P<id>\d+)', ['methods' => 'DELETE', 'callback' => 'eb_delete_listing', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/listings/(?P<id>\d+)/reviews', ['methods' => 'GET', 'callback' => 'eb_get_listing_reviews', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/my-listings', ['methods' => 'GET', 'callback' => 'eb_my_listings', 'permission_callback' => 'is_user_logged_in']);

    // ── Provider ──────────────────────────────────────────────────────────────
    register_rest_route($ns, '/provider/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_get_provider', 'permission_callback' => '__return_true']);

    // ── Messaging ─────────────────────────────────────────────────────────────
    register_rest_route($ns, '/conversations', ['methods' => ['GET','POST'], 'callback' => 'eb_conversations', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/conversations/(?P<id>\d+)/messages', ['methods' => ['GET','POST'], 'callback' => 'eb_conversation_messages', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/messages/(?P<id>\d+)', ['methods' => ['GET','PUT'], 'callback' => 'eb_message', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/messages/(?P<id>\d+)/offer-status', ['methods' => 'PUT', 'callback' => 'eb_message_offer_status', 'permission_callback' => 'is_user_logged_in']);

    // ── SSE Stream (GET