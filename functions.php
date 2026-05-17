```php
<?php
/**
 * EventBörse Theme Functions
 * WordPress REST API + SSE Notifications
 *
 * @package eventboerse
 */

// ─── Prevent direct access ────────────────────────────────────────────────────
if (!defined('ABSPATH')) exit;

// ─── Theme Setup ──────────────────────────────────────────────────────────────
function eb_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
}
add_action('after_setup_theme', 'eb_theme_setup');

// ─── Asset Registration ───────────────────────────────────────────────────────
function eb_enqueue_scripts() {
    $ver = '2.9.1';
    wp_enqueue_style('eb-styles', get_template_directory_uri() . '/styles.css', [], $ver);
    wp_enqueue_script('eb-app', get_template_directory_uri() . '/app.js', [], $ver, true);

    // Pass config to frontend
    wp_localize_script('eb-app', 'eventboerseApi', [
        'restUrl'   => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'userId'    => get_current_user_id(),
        'isLoggedIn'=> is_user_logged_in(),
        'siteUrl'   => get_site_url(),
    ]);
}
add_action('wp_enqueue_scripts', 'eb_enqueue_scripts');

// ─── Remove WordPress bloat ───────────────────────────────────────────────────
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_scripts', 'print_emoji_detection_script');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
add_filter('show_admin_bar', '__return_false');

// ─── SPA Rewrites ─────────────────────────────────────────────────────────────
function eb_add_rewrites() {
    // FIX 1: Vollständiges $spa_pages Array mit korrekter schließender Klammer
    $spa_pages = [
        'browse',
        'messages',
        'chat',
        'profile',
        'settings',
        'favorites',
        'board',
        'inserat-erstellen',
        'meine-inserate',
        'admin',
        'login',
        'register',
        'forgot-password',
        'reset-password',
        'verify-email',
        'agb',
        'agb-b2b',
        'agb-dienstleister',
        'datenschutz',
        'impressum',
        'cookies',
        'widerruf',
        'community',
        'bewertungen',
        'upload',
        'dsa',
        'p2b',
        'marktplatz',
        'barrierefreiheit',
        'vsbg',
    ]; // ← schließende Klammer für $spa_pages Array

    foreach ($spa_pages as $page) {
        add_rewrite_rule('^' . preg_quote($page, '/') . '/?$', 'index.php', 'top');
    }

    // Dynamic routes
    add_rewrite_rule('^listing/([0-9]+)/?$',    'index.php?eb_listing=$1',  'top');
    add_rewrite_rule('^provider/([0-9]+)/?$',   'index.php?eb_provider=$1', 'top');
    add_rewrite_rule('^kategorie/([a-z0-9-]+)/?$', 'index.php?eb_category=$1', 'top');
}
add_action('init', 'eb_add_rewrites');

function eb_register_query_vars($vars) {
    $vars[] = 'eb_listing';
    $vars[] = 'eb_provider';
    $vars[] = 'eb_category';
    return $vars;
}
add_filter('query_vars', 'eb_register_query_vars');

// ─── REST API Registration ────────────────────────────────────────────────────
add_action('rest_api_init', 'eb_register_routes');

function eb_register_routes() {
    $ns = 'eventboerse/v1';

    // ── Auth ──────────────────────────────────────────────────────────────────
    register_rest_route($ns, '/register',           ['methods' => 'POST', 'callback' => 'eb_register',           'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/verify',    ['methods' => 'POST', 'callback' => 'eb_register_verify',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/resend',    ['methods' => 'POST', 'callback' => 'eb_register_resend',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/login',              ['methods' => 'POST', 'callback' => 'eb_login',              'permission_callback' => '__return_true']);
    register_rest_route($ns, '/logout',             ['methods' => 'POST', 'callback' => 'eb_logout',             'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/me',                 ['methods' => 'GET',  'callback' => 'eb_me',                 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/forgot-password',    ['methods' => 'POST', 'callback' => 'eb_forgot_password',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/verify-email',       ['methods' => 'POST', 'callback' => 'eb_verify_email',       'permission_callback' => '__return_true']);
    register_rest_route($ns, '/reset-password',     ['methods' => 'POST', 'callback' => 'eb_reset_password',     'permission_callback' => '__return_true']);
    register_rest_route($ns, '/resend-verification',['methods' => 'POST', 'callback' => 'eb_resend_verification','permission_callback' => '__return_true']);

    // ── Profile / Settings ────────────────────────────────────────────────────
    register_rest_route($ns, '/profile',            ['methods' => ['GET','PUT'], 'callback' => 'eb_profile',         'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings',           ['methods' => ['GET','PUT'], 'callback' => 'eb_settings',        'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/password',  ['methods' => 'POST',        'callback' => 'eb_change_password', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/2fa',       ['methods' => ['POST','DELETE'], 'callback' => 'eb_toggle_2fa', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/delete-account', ['methods' => 'DELETE', 'callback' => 'eb_delete_account', 'permission_callback' => 'is_user_logged_in']);

    // ── OTP ───────────────────────────────────────────────────────────────────
    register_rest_route($ns, '/otp/send',   ['methods' => 'POST', 'callback' => 'eb_otp_send',   'permission_callback' => '__return_true']);
    register_rest_route($ns, '/otp/verify', ['methods' => 'POST', 'callback' => 'eb_otp_verify', 'permission_callback' => '__return_true']);

    // ── WebAuthn ──────────────────────────────────────────────────────────────
    register_rest_route($ns, '/webauthn/register-options', ['methods' => 'POST', 'callback' => 'eb_webauthn_register_options', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/register',         ['methods' => 'POST', 'callback' => 'eb_webauthn_register',         'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/verify-register',  ['methods' => 'POST', 'callback' => 'eb_webauthn_verify_register',  'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/login-options',    ['methods' => 'POST', 'callback' => 'eb_webauthn_login_options',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/login',            ['methods' => 'POST', 'callback' => 'eb_webauthn_login',            'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/verify-options',   ['methods' => 'POST', 'callback' => 'eb_webauthn_verify_options',   'permission_callback' => '__return_true']);
    register_rest_route($ns, '/webauthn/credentials',      ['methods' => 'GET',  'callback' => 'eb_webauthn_credentials',      'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/webauthn/credentials/(?P<credential_id>[A-Za-z0-9_-]+)', ['methods' => 'DELETE', 'callback' => 'eb_webauthn_delete_credential', 'permission_callback' => 'is_user_logged_in']);

    // ── Listings ──────────────────────────────────────────────────────────────
    register_rest_route($ns, '/listings',           ['methods' => ['GET','POST'], 'callback' => 'eb_listings',        'permission_callback' => 'eb_listings_permission']);
    register_rest_route($ns, '/listings/(?P<id>\d+)',['methods' => ['GET','PUT','DELETE'], 'callback' => 'eb_listing_single', 'permission_callback' => 'eb_listing_permission']);
    register_rest_route($ns, '/listings/(?P<id>\d+)/reviews', ['methods' => 'GET', 'callback' => 'eb_listing_reviews', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/my-listings',        ['methods' => 'GET', 'callback' => 'eb_my_listings',     'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/provider/(?P<id>\d+)',['methods' => 'GET', 'callback' => 'eb_provider_profile','permission_callback' => '__return_true']);

    // ── Reviews ───────────────────────────────────────────────────────────────
    register_rest_route($ns, '/reviews/(?P<id>\d+)', ['methods' => ['GET','POST'], 'callback' => 'eb_reviews', 'permission_callback' => 'eb_reviews_permission']);

    // ── Messaging ─────────────────────────────────────────────────────────────
    register_rest_route($ns, '/conversations',              ['methods' => ['GET','POST'], 'callback' => 'eb_conversations',       'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/conversations/(?P<id>\d+)/messages', ['methods' => ['GET','POST'], 'callback' => 'eb_conversation_messages', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/messages/(?P<id>\d+)',       ['methods' => ['GET','PUT'], 'callback' => 'eb_message_single',      'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/messages/(?P<id>\d+)/offer-status', ['methods' => 'PUT', 'callback' => 'eb_offer_status',         'permission_callback' => 'is_user_logged_in']);

    // ── SSE Notifications (FIX 3: Explizite Auth-Permission) ──────────────────
    register_rest_route($ns, '/notifications/stream', [
        'methods'             => 'GET',
        'callback'            => 'eb_sse_stream',
        'permission_callback' => 'eb_sse_permission', // ← explizite Funktion, nicht __return_true
    ]);

    // ── Unread-Count (polling fallback) ───────────────────────────────────────
    register_rest_route($ns, '/notifications/unread-count', [
        'methods'             => 'GET',
        'callback'            => 'eb_get_unread_count',
        'permission_callback' => 'is_user_logged_in',
    ]);

    // ── Board ─────────────────────────────────────────────────────────────────
    register_rest_route($ns, '/board-projects', ['methods' => ['GET','POST','PUT','DELETE'], 'callback' => 'eb_board_projects', 'permission_callback' => 'is_user_logged_in']);

    // ── Favorites ─────────────────────────────────────────────────────────────
    register_rest_route($ns, '/favorites',              ['methods' => ['GET','POST'], 'callback' => 'eb_favorites',       'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/favorites/(?P<listing_id>\d+)', ['methods' => 'DELETE', 'callback' => 'eb_favorite_delete', 'permission_callback' => 'is_user_logged_in']);

    // ── Payments ──────────────────────────────────────────────────────────────
    register_rest_route($ns, '/stripe/public-key',         ['methods