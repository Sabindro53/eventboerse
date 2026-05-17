```php
<?php
/**
 * EventBörse Theme Functions
 * WordPress Theme + REST API (67 Endpoints)
 *
 * NOTE: SSE endpoints added at bottom — search "SSE_ENDPOINTS"
 */

// ─── Theme Setup ────────────────────────────────────────────────────────────

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
});

// ─── Asset Registration ──────────────────────────────────────────────────────

add_action('wp_enqueue_scripts', function () {
    $ver = '2.9.4';
    wp_enqueue_style('eb-styles', get_template_directory_uri() . '/styles.css', [], $ver);
    wp_enqueue_script('eb-app', get_template_directory_uri() . '/app.js', [], $ver, true);

    // Pass config to frontend
    wp_localize_script('eb-app', 'eventboerseApi', [
        'restUrl'   => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'sseUrl'    => esc_url_raw(rest_url('eventboerse/v1/sse/')),
        'currentUser' => is_user_logged_in() ? [
            'id'    => get_current_user_id(),
            'name'  => wp_get_current_user()->display_name,
            'email' => wp_get_current_user()->user_email,
            'role'  => get_user_meta(get_current_user_id(), 'eb_role', true),
        ] : null,
    ]);
});

// Disable WordPress bloat
add_action('wp_enqueue_scripts', function () {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_script('wp-embed');
}, 100);

remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');

// ─── SPA Rewrites ───────────────────────────────────────────────────────────

add_action('init', function () {
    $spa_pages = [
        'browse', 'nachrichten', 'profil', 'einstellungen',
        'favoriten', 'board', 'admin', 'login', 'registrieren',
        'inserat-erstellen', 'meine-inserate', 'passwort-vergessen',
        'passwort-zuruecksetzen', 'email-bestaetigen',
        // Legal
        'agb', 'agb-b2b', 'agb-dienstleister', 'datenschutz',
        'impressum', 'cookies', 'widerruf', 'community',
        'bewertungen', 'upload', 'dsa', 'p2b', 'marktplatz',
        'barrierefreiheit', 'vsbg',
    ];

    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . $page . '/?$', 'index.php', 'top');
    }

    add_rewrite_rule('^listing/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^provider/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^kategorie/([a-z0-9-]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^chat/([0-9]+)/?$', 'index.php', 'top');
});

// ─── Database Tables ─────────────────────────────────────────────────────────

function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $sql = "
    CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_listings (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        title varchar(255) NOT NULL,
        description longtext,
        category varchar(100),
        category_label varchar(100),
        price_model varchar(50),
        price_label varchar(100),
        price decimal(10,2),
        location varchar(255),
        region varchar(100),
        features longtext,
        tags longtext,
        images longtext,
        date_from date,
        date_to date,
        time_from time,
        time_to time,
        status enum('active','inactive','pending') DEFAULT 'active',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY status (status),
        KEY category (category)
    ) $charset;

    CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_reviews (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        listing_id bigint(20) unsigned NOT NULL,
        author_id bigint(20) unsigned NOT NULL,
        rating tinyint(1) NOT NULL,
        comment text,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY listing_id (listing_id),
        KEY author_id (author_id)
    ) $charset;

    CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_conversations (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_a bigint(20) unsigned NOT NULL,
        user_b bigint(20) unsigned NOT NULL,
        listing_id bigint(20) unsigned,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_pair (user_a, user_b),
        KEY listing_id (listing_id)
    ) $charset;

    CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_messages (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        conversation_id bigint(20) unsigned NOT NULL,
        sender_id bigint(20) unsigned NOT NULL,
        type varchar(50) DEFAULT 'text',
        content longtext,
        offer_amount decimal(10,2),
        offer_status varchar(50),
        is_read tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY conversation_id (conversation_id),
        KEY sender_id (sender_id),
        KEY is_read (is_read),
        KEY created_at (created_at)
    ) $charset;

    CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_board_projects (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        data longtext NOT NULL,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id)
    ) $charset;
    ";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}

add_action('after_switch_theme', 'eb_create_tables');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function eb_avatar_url(int $user_id, int $size = 80): string {
    $photo = get_user_meta($user_id, 'eb_photo_url', true);
    if ($photo) return esc_url($photo);

    $user  = get_userdata($user_id);
    $name  = $user ? $user->display_name : 'U';
    $seed  = substr(md5($name), 0, 8);
    $hue   = hexdec(substr($seed, 0, 2)) % 360;
    $letter = strtoupper(mb_substr($name, 0, 1));
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" viewBox="0 0 ' . $size . ' ' . $size . '">'
         . '<circle cx="' . ($size/2) . '" cy="' . ($size/2) . '" r="' . ($size/2) . '" fill="hsl(' . $hue . ',60%,50%)"/>'
         . '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="' . round($size*0.4) . '" font-family="Inter,sans-serif" fill="#fff">' . esc_html($letter) . '</text>'
         . '</svg>';
    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}

function eb_current_user_id(): int {
    return get_current_user_id();
}

function eb_is_admin(): bool {
    return current_user_can('administrator');
}

function eb_error(string $code, string $message, int $status = 400): WP_Error {
    return new WP_Error($code, $message, ['status' => $status]);
}

/**
 * Check if a user is a participant in a conversation.
 */
function eb_user_in_conversation(int $conv_id, int $user_id): bool {
    global $wpdb;
    $conv = $wpdb->get_row($wpdb->prepare(
        "SELECT user_a, user_b FROM {$wpdb->prefix}eb_conversations WHERE id = %d",
        $conv_id
    ));
    if (!$conv) return false;
    return ((int)$conv->user_a === $user_id || (int)$conv->user_b === $user_id);
}

// ─── REST API Bootstrap ──────────────────────────────────────────────────────

add_action('rest_api_init', function () {
    $ns = 'eventboerse/v1';

    // ── Auth ──────────────────────────────────────────────────────────────────

    register_rest_route($ns, '/register', [
        'methods'             => 'POST',
        'callback'            => 'eb_register',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/register/verify', [
        'methods'             => 'POST',
        'callback'            => 'eb_verify_registration',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/register/resend', [
        'methods'             => 'POST',
        'callback'            => 'eb_resend_verification',
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

    register_rest_route($ns, '/reset-password', [
        'methods'             => 'POST',
        'callback'            => 'eb_reset_password',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/verify-email', [
        'methods'             => 'POST',
        'callback'            => 'eb_verify_email',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route($ns, '/resend-verification', [
        'methods'             => 'POST',
        'callback'            => 'eb_resend_verification',
        'permission_callback' => '__return_true',
    ]);

    // ── OTP ───────────────────────────────────────────────────────────────────

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

    // ── Profile & Settings ────────────────────────────────────────────────────

    register_rest_route($ns, '/profile', [
        [
            'methods'             => 'GET',
            'callback'            => 'eb_get_profile',
            'permission_callback' => 'is_user_logged_in',
        ],
        [
            'methods'             => 'PUT',
            'callback'            => 'eb_update_profile',
            'permission_callback' => 'is_user_logged_in',
        ],
    ]);

    register_rest_route($ns, '/settings', [
        [
            'methods'             => 'GET',
            'callback'            => 'eb_get_settings',
            'permission_callback' => 'is_user_logged_in',
        ],
        [
            'methods'             => 'PUT',
            'callback'            => 'eb_update_settings',
            'permission_callback' => 'is_user_logged_in',
        ],
    ]);

    register_rest_route($ns, '/settings/password', [
        'methods'             => 'POST',
        'callback'            => 'eb_change_password',
        'permission_callback' => 'is_user_logged_in',
    ]);

    register_rest_route($ns, '/settings/delete-account', [