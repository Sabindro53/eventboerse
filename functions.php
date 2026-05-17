```php
<?php
/**
 * EventBörse Theme Functions
 * WordPress REST API – alle Endpoints
 *
 * Search-Update: GET /listings unterstützt jetzt
 *   ?search=, ?category=, ?location=, ?region=,
 *   ?price_min=, ?price_max=, ?sort=, ?page=, ?per_page=
 */

// ─── Sicherheit ────────────────────────────────────────────────────────────
if (!defined('ABSPATH')) exit;

// ─── Theme-Setup ───────────────────────────────────────────────────────────
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
});

// ─── Assets ────────────────────────────────────────────────────────────────
add_action('wp_enqueue_scripts', function () {
    $v = '2.9.1'; // bump bei JS/CSS-Änderungen
    wp_enqueue_style('eb-styles',  get_template_directory_uri() . '/styles.css', [], $v);
    wp_enqueue_script('eb-app',    get_template_directory_uri() . '/app.js',     [], $v, true);

    // Nonce + API-URL für app.js
    wp_localize_script('eb-app', 'eventboerseApi', [
        'restUrl' => esc_url_raw(rest_url('eventboerse/v1/')),
        'nonce'   => wp_create_nonce('wp_rest'),
        'userId'  => get_current_user_id(),
        'siteUrl' => get_site_url(),
    ]);

    // WordPress-Bloat entfernen
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('global-styles');
});

// ─── REST API registrieren ──────────────────────────────────────────────────
add_action('rest_api_init', function () {

    $ns = 'eventboerse/v1';

    // ── Auth ─────────────────────────────────────────────────────────────
    register_rest_route($ns, '/register',         ['methods' => 'POST', 'callback' => 'eb_register',           'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/verify',  ['methods' => 'POST', 'callback' => 'eb_verify_register',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/register/resend',  ['methods' => 'POST', 'callback' => 'eb_resend_verify',      'permission_callback' => '__return_true']);
    register_rest_route($ns, '/login',            ['methods' => 'POST', 'callback' => 'eb_login',              'permission_callback' => '__return_true']);
    register_rest_route($ns, '/logout',           ['methods' => 'POST', 'callback' => 'eb_logout',             'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/me',               ['methods' => 'GET',  'callback' => 'eb_me',                 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/forgot-password',  ['methods' => 'POST', 'callback' => 'eb_forgot_password',    'permission_callback' => '__return_true']);
    register_rest_route($ns, '/verify-email',     ['methods' => 'POST', 'callback' => 'eb_verify_email',       'permission_callback' => '__return_true']);
    register_rest_route($ns, '/reset-password',   ['methods' => 'POST', 'callback' => 'eb_reset_password',     'permission_callback' => '__return_true']);
    register_rest_route($ns, '/resend-verification', ['methods' => 'POST', 'callback' => 'eb_resend_verification', 'permission_callback' => '__return_true']);

    // ── OTP / 2FA ─────────────────────────────────────────────────────────
    register_rest_route($ns, '/otp/send',         ['methods' => 'POST', 'callback' => 'eb_otp_send',           'permission_callback' => '__return_true']);
    register_rest_route($ns, '/otp/verify',       ['methods' => 'POST', 'callback' => 'eb_otp_verify',         'permission_callback' => '__return_true']);
    register_rest_route($ns, '/settings/2fa',     ['methods' => ['POST','DELETE'], 'callback' => 'eb_2fa_toggle', 'permission_callback' => 'is_user_logged_in']);

    // ── Profil / Settings ─────────────────────────────────────────────────
    register_rest_route($ns, '/profile',          ['methods' => ['GET','PUT'], 'callback' => 'eb_profile',     'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings',         ['methods' => ['GET','PUT'], 'callback' => 'eb_settings',    'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/password',['methods' => 'POST', 'callback' => 'eb_change_password',   'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/settings/delete-account', ['methods' => 'DELETE', 'callback' => 'eb_delete_account', 'permission_callback' => 'is_user_logged_in']);

    // ── Listings ──────────────────────────────────────────────────────────
    register_rest_route($ns, '/listings', [
        ['methods' => 'GET',  'callback' => 'eb_get_listings',    'permission_callback' => '__return_true'],
        ['methods' => 'POST', 'callback' => 'eb_create_listing',  'permission_callback' => 'is_user_logged_in'],
    ]);
    register_rest_route($ns, '/listings/(?P<id>\d+)', [
        ['methods' => 'GET', 'callback' => 'eb_get_listing',      'permission_callback' => '__return_true'],
        ['methods' => 'PUT', 'callback' => 'eb_update_listing',   'permission_callback' => 'is_user_logged_in'],
        ['methods' => 'DELETE', 'callback' => 'eb_delete_listing','permission_callback' => 'is_user_logged_in'],
    ]);
    register_rest_route($ns, '/listings/(?P<id>\d+)/reviews', ['methods' => 'GET', 'callback' => 'eb_get_listing_reviews', 'permission_callback' => '__return_true']);
    register_rest_route($ns, '/my-listings',      ['methods' => 'GET',  'callback' => 'eb_my_listings',       'permission_callback' => 'is_user_logged_in']);

    // ── Provider ──────────────────────────────────────────────────────────
    register_rest_route($ns, '/provider/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_get_provider',   'permission_callback' => '__return_true']);

    // ── Reviews ───────────────────────────────────────────────────────────
    register_rest_route($ns, '/reviews/(?P<id>\d+)', [
        ['methods' => 'POST',   'callback' => 'eb_post_review',   'permission_callback' => 'is_user_logged_in'],
        ['methods' => 'DELETE', 'callback' => 'eb_delete_review', 'permission_callback' => 'is_user_logged_in'],
    ]);

    // ── Messaging ─────────────────────────────────────────────────────────
    register_rest_route($ns, '/conversations',    ['methods' => ['GET','POST'], 'callback' => 'eb_conversations', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/conversations/(?P<id>\d+)/messages', ['methods' => ['GET','POST'], 'callback' => 'eb_messages', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/messages/(?P<id>\d+)',              ['methods' => 'GET',  'callback' => 'eb_get_message',      'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/messages/(?P<id>\d+)/offer-status', ['methods' => 'PUT',  'callback' => 'eb_offer_status',     'permission_callback' => 'is_user_logged_in']);

    // ── Favorites ─────────────────────────────────────────────────────────
    register_rest_route($ns, '/favorites',                  ['methods' => 'GET',    'callback' => 'eb_get_favorites',    'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/favorites/(?P<listing_id>\d+)', [
        ['methods' => 'POST',   'callback' => 'eb_add_favorite',    'permission_callback' => 'is_user_logged_in'],
        ['methods' => 'DELETE', 'callback' => 'eb_remove_favorite', 'permission_callback' => 'is_user_logged_in'],
    ]);

    // ── Board ─────────────────────────────────────────────────────────────
    register_rest_route($ns, '/board-projects', [
        ['methods' => 'GET',  'callback' => 'eb_get_board_projects',    'permission_callback' => 'is_user_logged_in'],
        ['methods' => 'POST', 'callback' => 'eb_save_board_projects',   'permission_callback' => 'is_user_logged_in'],
    ]);

    // ── Payments / Stripe ─────────────────────────────────────────────────
    register_rest_route($ns, '/stripe/public-key',          ['methods' => 'GET',  'callback' => 'eb_stripe_public_key',      'permission_callback' => '__return_true']);
    register_rest_route($ns, '/stripe/create-checkout',     ['methods' => 'POST', 'callback' => 'eb_stripe_create_checkout', 'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/stripe/create-payment-intent',['methods' => 'POST','callback' => 'eb_stripe_create_intent',   'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/stripe/verify-payment',      ['methods' => 'POST', 'callback' => 'eb_stripe_verify',          'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/stripe/reconcile',           ['methods' => 'POST', 'callback' => 'eb_stripe_reconcile',       'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/stripe/webhook',             ['methods' => 'POST', 'callback' => 'eb_stripe_webhook',         'permission_callback' => '__return_true']);
    register_rest_route($ns, '/send-invoice',               ['methods' => 'POST', 'callback' => 'eb_send_invoice',           'permission_callback' => 'is_user_logged_in']);

    // ── Upload ────────────────────────────────────────────────────────────
    register_rest_route($ns, '/upload',           ['methods' => 'POST', 'callback' => 'eb_handle_upload',      'permission_callback' => 'is_user_logged_in']);

    // ── User-Status ───────────────────────────────────────────────────────
    register_rest_route($ns, '/user-status/(?P<id>\d+)', ['methods' => 'GET', 'callback' => 'eb_user_status',  'permission_callback' => '__return_true']);

    // ── Registrations ─────────────────────────────────────────────────────
    register_rest_route($ns, '/registrations',            ['methods' => ['GET','POST'], 'callback' => 'eb_registrations',       'permission_callback' => 'is_user_logged_in']);
    register_rest_route($ns, '/registrations/(?P<id>\d+)',['methods' => ['PUT','DELETE'],'callback' => 'eb_registration_item',  'permission_callback' => 'is_user_logged_in']);

    // ── Admin ─────────────────────────────────────────────────────────────
    register_rest_route($ns, '/admin/users',              ['methods' => 'GET',    'callback' => 'eb_admin_users',       'permission_callback' => 'eb_is_admin']);
    register_rest_route($ns, '/admin/user-tags',          ['methods' => ['GET','PUT'], 'callback' => 'eb_admin_user_tags', 'permission_callback' => 'eb_is_admin']);
    register_rest_route($ns, '/admin/all-tags',           ['methods' => 'GET',    'callback' => 'eb_admin_all_tags',    'permission_callback' => 'eb_is_admin']);
    register_rest_route($ns, '/admin/delete-