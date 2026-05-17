```php
<?php
/**
 * EventBörse Theme Functions
 * WordPress REST API + SSE Endpoint
 */

// ============================================================
// THEME SETUP
// ============================================================

function eventboerse_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
}
add_action('after_setup_theme', 'eventboerse_setup');

function eventboerse_scripts() {
    $ver = '2.9.4';
    wp_enqueue_style('eventboerse-style', get_template_directory_uri() . '/styles.css', [], $ver);
    wp_enqueue_script('eventboerse-app', get_template_directory_uri() . '/app.js', [], $ver, true);

    // Pass nonce + REST URL to frontend
    wp_localize_script('eventboerse-app', 'eventboerseApi', [
        'restUrl' => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'   => wp_create_nonce('wp_rest'),
        'sseUrl'  => esc_url_raw(home_url('/eb-sse/')),
        'userId'  => get_current_user_id(),
    ]);
}
add_action('wp_enqueue_scripts', 'eventboerse_scripts');

// Remove WordPress bloat
add_action('init', function () {
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'rsd_link');
});
add_filter('the_generator', '__return_empty_string');

// Disable emojis
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_scripts', 'print_emoji_detection_script');
remove_action('wp_print_styles', 'print_emoji_styles');

// ============================================================
// SPA REWRITES
// ============================================================

function eventboerse_rewrite_rules() {
    $spa_pages = [
        'browse', 'listing', 'provider', 'messages', 'chat',
        'profile', 'settings', 'admin', 'board', 'favoriten',
        'inserat-erstellen', 'meine-inserate', 'kategorie',
        'login', 'register', 'forgot-password', 'reset-password',
        'verify-email', 'agb', 'agb-b2b', 'agb-dienstleister',
        'datenschutz', 'impressum', 'cookies', 'widerruf',
        'community', 'bewertungen', 'upload', 'dsa', 'p2b',
        'marktplatz', 'barrierefreiheit', 'vsbg',
    ];
    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . $page . '(/.*)?$', 'index.php', 'top');
    }
}
add_action('init', 'eventboerse_rewrite_rules');

// ============================================================
// SSE ENDPOINT (via template_redirect — bypasses WP REST buffer)
// ============================================================

add_action('init', function () {
    add_rewrite_rule('^eb-sse/?$', 'index.php?eb_sse=1', 'top');
    add_rewrite_tag('%eb_sse%', '1');
});

add_action('template_redirect', function () {
    if (!get_query_var('eb_sse')) {
        return;
    }
    eb_sse_handler();
    exit;
});

function eb_sse_handler() {
    // --- Auth check ---
    // Support nonce via query param (EventSource can't set custom headers)
    $nonce = isset($_GET['nonce']) ? sanitize_text_field($_GET['nonce']) : '';
    if (!wp_verify_nonce($nonce, 'wp_rest')) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $user_id = get_current_user_id();
    if (!$user_id) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not logged in']);
        return;
    }

    $conversation_id = isset($_GET['conversation_id']) ? intval($_GET['conversation_id']) : 0;
    if (!$conversation_id) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Missing conversation_id']);
        return;
    }

    // Verify user is part of this conversation
    global $wpdb;
    $conv = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conversation_id, $user_id, $user_id
    ));
    if (!$conv) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Forbidden']);
        return;
    }

    // --- SSE Headers ---
    // Disable output buffering (multiple layers)
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('X-Accel-Buffering: no');   // Nginx (some IONOS configs)
    header('Connection: keep-alive');
    // CORS if needed (same origin should be fine)
    header('Access-Control-Allow-Origin: ' . esc_url_raw(home_url()));

    // Increase execution time (shared hosting may ignore this)
    @set_time_limit(0);
    @ini_set('max_execution_time', 0);

    // Get last_id from client (for resumption)
    $last_id = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;

    // Send initial connection event
    eb_sse_send('connected', json_encode([
        'conversation_id' => $conversation_id,
        'last_id'         => $last_id,
    ]));

    $tick          = 0;
    $max_ticks     = 12;   // 12 × 2s = 24s, then reconnect (within PHP timeout)
    $poll_interval = 2;    // seconds between DB checks

    while ($tick < $max_ticks) {
        if (connection_aborted()) {
            break;
        }

        // Check for new messages since last_id
        $messages = $wpdb->get_results($wpdb->prepare(
            "SELECT m.*, u.display_name as sender_name
             FROM {$wpdb->prefix}eb_messages m
             LEFT JOIN {$wpdb->users} u ON u.ID = m.sender_id
             WHERE m.conversation_id = %d AND m.id > %d
             ORDER BY m.id ASC
             LIMIT 20",
            $conversation_id, $last_id
        ));

        if (!empty($messages)) {
            foreach ($messages as $msg) {
                $payload = [
                    'id'              => intval($msg->id),
                    'conversation_id' => intval($msg->conversation_id),
                    'sender_id'       => intval($msg->sender_id),
                    'sender_name'     => $msg->sender_name,
                    'content'         => $msg->content,
                    'type'            => $msg->type ?? 'text',
                    'offer_amount'    => $msg->offer_amount ?? null,
                    'offer_status'    => $msg->offer_status ?? null,
                    'created_at'      => $msg->created_at,
                ];
                eb_sse_send('message', json_encode($payload), $msg->id);
                $last_id = max($last_id, intval($msg->id));
            }
        }

        // Heartbeat every 4 ticks (~8s)
        if ($tick % 4 === 3) {
            eb_sse_send('heartbeat', json_encode(['ts' => time()]));
        }

        sleep($poll_interval);
        $tick++;
    }

    // Tell client to reconnect cleanly
    eb_sse_send('reconnect', json_encode(['last_id' => $last_id]));
}

/**
 * Emit a single SSE event.
 *
 * @param string   $event Event name
 * @param string   $data  JSON string
 * @param int|null $id    Optional event ID (for Last-Event-ID)
 */
function eb_sse_send($event, $data, $id = null) {
    if ($id !== null) {
        echo 'id: ' . intval($id) . "\n";
    }
    echo 'event: ' . esc_attr($event) . "\n";
    // SSE data must be single-line; newlines in JSON are fine as \n in strings
    echo 'data: ' . $data . "\n\n";

    if (function_exists('fastcgi_finish_request')) {
        // Not applicable for streaming, but safe to call
    }
    flush();
}

// ============================================================
// DATABASE TABLES
// ============================================================

function eb_create_tables() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();

    $sql_conversations = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_conversations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_a BIGINT UNSIGNED NOT NULL,
        user_b BIGINT UNSIGNED NOT NULL,
        listing_id BIGINT UNSIGNED DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_user_a (user_a),
        KEY idx_user_b (user_b)
    ) $charset_collate;";

    $sql_messages = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id BIGINT UNSIGNED NOT NULL,
        sender_id BIGINT UNSIGNED NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        offer_amount DECIMAL(10,2) DEFAULT NULL,
        offer_status VARCHAR(20) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_conversation (conversation_id),
        KEY idx_sender (sender_id)
    ) $charset_collate;";

    $sql_listings = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_listings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
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
        date_from DATE DEFAULT NULL,
        date_to DATE DEFAULT NULL,
        time_from TIME DEFAULT NULL,
        time_to TIME DEFAULT NULL,
        status ENUM('active','inactive','pending') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_user (user_id),
        KEY idx_status (status),
        KEY idx_category (category)
    ) $charset_collate;";

    $sql_reviews = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}eb_reviews (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id BIGINT UNSIGNED NOT NULL,
        author_id BIGINT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_listing (listing_id),
        KEY idx_author (author_id)
    ) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql_conversations);
    dbDelta($sql_messages);
    dbDelta($sql_listings);
    dbDelta($sql_reviews);
}
add_action('after_switch_theme', 'eb_create_tables');
add_action('init', function () {
    if (get_option('eb_db_version') !== '1.3') {
        eb_create_tables();
        update_option('eb_db_version', '1.3');
    }
});

// ============================================================
// HELPERS
// ============================================================

function _apiUrl($endpoint) {
    return rest_url('eventboerse/v1/' . ltrim($endpoint, '/'));
}

function _apiHeaders() {
    return [
        'Content-Type'  => 'application/json',
        'X-WP-Nonce'    => wp_create_nonce('wp_rest'),
    ];
}

function eb_current_user_can_access_conversation($conversation_id) {
    global $wpdb;
    $user_id = get_current_user_id();
    if (!$user_id) return false;
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conversation_id, $user_id, $user_id
    ));
}

function eb