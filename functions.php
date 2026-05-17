```php
<?php
/**
 * EventBörse Theme Functions
 * WordPress REST API + Push Notifications
 */

// ============================================================
// VAPID KEYS (Web Push)
// Generate once: openssl ecparam -name prime256v1 -genkey -noout -out vapid_private.pem
// Then base64url-encode both keys. These are EXAMPLE keys — replace with real ones.
// To generate: run eb_generate_vapid_keys() once in WP admin, save output to constants below.
// ============================================================
if (!defined('EB_VAPID_PUBLIC_KEY')) {
    define('EB_VAPID_PUBLIC_KEY', get_option('eb_vapid_public_key', ''));
}
if (!defined('EB_VAPID_PRIVATE_KEY')) {
    define('EB_VAPID_PRIVATE_KEY', get_option('eb_vapid_private_key', ''));
}
if (!defined('EB_VAPID_SUBJECT')) {
    define('EB_VAPID_SUBJECT', 'mailto:info@eventboerse.de');
}

// ============================================================
// THEME SETUP
// ============================================================

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
    add_filter('show_admin_bar', '__return_false');
});

// Enqueue assets
add_action('wp_enqueue_scripts', function () {
    $v = '2.9.4';
    wp_enqueue_style('eventboerse-style', get_template_directory_uri() . '/styles.css', [], $v);
    wp_enqueue_script('eventboerse-app', get_template_directory_uri() . '/app.js', [], $v, true);

    // Pass data to JS
    wp_localize_script('eventboerse-app', 'eventboerseApi', [
        'restUrl'      => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'        => wp_create_nonce('wp_rest'),
        'userId'       => get_current_user_id(),
        'siteUrl'      => get_site_url(),
        'themeUrl'     => get_template_directory_uri(),
        'vapidPublicKey' => EB_VAPID_PUBLIC_KEY,
        'swUrl'        => get_template_directory_uri() . '/sw.js',
    ]);
});

// Add manifest.json link to head
add_action('wp_head', function () {
    echo '<link rel="manifest" href="' . get_template_directory_uri() . '/manifest.json">' . "\n";
    echo '<meta name="theme-color" content="#6C47FF">' . "\n";
});

// ============================================================
// URL REWRITES (SPA Routes)
// ============================================================

add_action('init', function () {
    $spa_pages = [
        'browse', 'detail', 'chat', 'board', 'profile', 'settings',
        'admin', 'login', 'register', 'messages', 'favorites',
        'inserat-erstellen', 'meine-inserate', 'provider',
        'agb', 'agb-b2b', 'agb-dienstleister', 'datenschutz',
        'impressum', 'cookies', 'widerruf', 'community',
        'bewertungen', 'upload', 'dsa', 'p2b', 'marktplatz',
        'barrierefreiheit', 'vsbg', 'offline',
    ];
    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . $page . '(/.*)?$', 'index.php', 'top');
    }
    add_rewrite_rule('^listing/([0-9]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^kategorie/([^/]+)/?$', 'index.php', 'top');
});

add_filter('query_vars', function ($vars) {
    $vars[] = 'spa_page';
    return $vars;
});

// ============================================================
// DATABASE SETUP
// ============================================================

register_activation_hook(__FILE__, 'eb_create_tables');
add_action('init', 'eb_maybe_create_tables');

function eb_maybe_create_tables() {
    if (get_option('eb_db_version') !== '1.9') {
        eb_create_tables();
    }
}

function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $listings_sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_listings (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        title varchar(255) NOT NULL,
        description longtext,
        category varchar(100),
        category_label varchar(100),
        price_model varchar(50),
        price_label varchar(100),
        price_amount decimal(10,2) DEFAULT 0,
        location varchar(255),
        region varchar(100),
        features longtext,
        tags longtext,
        images longtext,
        date_from date,
        date_to date,
        time_from time,
        time_to time,
        status varchar(20) DEFAULT 'active',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY category (category),
        KEY status (status)
    ) $charset;";

    $reviews_sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_reviews (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        listing_id bigint(20) NOT NULL,
        author_id bigint(20) NOT NULL,
        rating tinyint(1) NOT NULL,
        comment text,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY listing_id (listing_id),
        KEY author_id (author_id)
    ) $charset;";

    $conversations_sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_conversations (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_a bigint(20) NOT NULL,
        user_b bigint(20) NOT NULL,
        listing_id bigint(20),
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_a (user_a),
        KEY user_b (user_b)
    ) $charset;";

    $messages_sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_messages (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        conversation_id bigint(20) NOT NULL,
        sender_id bigint(20) NOT NULL,
        message_type varchar(50) DEFAULT 'text',
        content longtext,
        metadata longtext,
        offer_status varchar(20),
        read_at datetime,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY conversation_id (conversation_id),
        KEY sender_id (sender_id)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($listings_sql);
    dbDelta($reviews_sql);
    dbDelta($conversations_sql);
    dbDelta($messages_sql);

    update_option('eb_db_version', '1.9');
}

// ============================================================
// CORS + REST API HEADERS
// ============================================================

add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        $allowed = [get_site_url()];
        if (in_array($origin, $allowed) || (defined('WP_DEBUG') && WP_DEBUG)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        }
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-WP-Nonce, Authorization');
        return $value;
    });
});

// ============================================================
// HELPERS
// ============================================================

function eb_current_user_id() {
    return get_current_user_id();
}

function eb_is_logged_in() {
    return is_user_logged_in();
}

function eb_json_error($message, $code = 400, $data = []) {
    return new WP_Error('eb_error', $message, array_merge(['status' => $code], $data));
}

function eb_get_user_meta($user_id, $key) {
    return get_user_meta($user_id, $key, true);
}

function eb_update_user_meta($user_id, $key, $value) {
    return update_user_meta($user_id, $key, $value);
}

function eb_format_user($user_id) {
    $user = get_userdata($user_id