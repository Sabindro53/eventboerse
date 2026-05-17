```php
<?php
/**
 * EventBörse – Analytics Module
 * Tracks listing page views (privacy-first: hashed IP, no personal data stored)
 *
 * DSGVO-Hinweis: IP-Adressen werden mit einem server-seitigen Salt gehasht
 * (SHA-256). Gehashte IPs können technisch nicht direkt re-identifiziert werden,
 * jedoch ist eine De-Anonymisierung durch Kombination mit anderen Logs nicht
 * vollständig ausschließbar. Die Speicherung erfolgt auf Grundlage von Art. 6
 * Abs. 1 lit. f DSGVO (berechtigtes Interesse: Plattformoptimierung).
 * Retention: 90 Tage. Kein Tracking über Listings hinaus.
 *
 * Endpoints:
 *   POST /analytics/view              – Aufruf tracken
 *   GET  /analytics/listing/{id}      – Stats für ein Listing (Owner/Admin)
 *   GET  /analytics/overview          – Plattform-Übersicht (Admin)
 */

defined('ABSPATH') || exit;

// ---------------------------------------------------------------------------
// 1. DB-Tabelle erstellen
// ---------------------------------------------------------------------------

function eb_analytics_create_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'eb_listing_views';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        listing_id  BIGINT UNSIGNED NOT NULL,
        view_date   DATE            NOT NULL,
        ip_hash     VARCHAR(64)     NOT NULL DEFAULT '',
        user_agent  VARCHAR(255)    NOT NULL DEFAULT '',
        PRIMARY KEY (id),
        INDEX idx_listing_date (listing_id, view_date),
        INDEX idx_date         (view_date)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);

    update_option('eb_analytics_db_version', '1.0');
}

/**
 * Soft-Migration: Tabelle anlegen falls noch nicht vorhanden.
 * Wird bei jedem Request geprüft (nur 1 Query wenn Version bereits gesetzt).
 */
function eb_maybe_create_views_table() {
    if ( get_option('eb_analytics_db_version') === '1.0' ) {
        return;
    }
    eb_analytics_create_table();
}
add_action('init', 'eb_maybe_create_views_table');

// ---------------------------------------------------------------------------
// 2. Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Gibt eine gehashte, nicht direkt re-identifizierbare IP zurück.
 * Salt ist server-seitig und rotiert täglich → kein dauerhaftes Fingerprinting.
 */
function eb_hash_ip( $ip ) {
    // Tages-Salt: verhindert tagesübergreifende Verknüpfung
    $daily_salt = wp_hash( 'eb_ip_salt_' . gmdate('Y-m-d') );
    return hash( 'sha256', $ip . $daily_salt );
}

function eb_get_client_ip() {
    $keys = [
        'HTTP_CF_CONNECTING_IP',   // Cloudflare
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_REAL_IP',
        'REMOTE_ADDR',
    ];
    foreach ( $keys as $key ) {
        if ( ! empty( $_SERVER[ $key ] ) ) {
            // Bei X-Forwarded-For nur die erste IP nehmen
            $ip = trim( explode( ',', sanitize_text_field( $_SERVER[ $key ] ) )[0] );
            if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

function eb_get_user_agent_snippet() {
    $ua = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( $_SERVER['HTTP_USER_AGENT'] ) : '';
    return substr( $ua, 0, 200 ); // kürzen
}

// ---------------------------------------------------------------------------
// 3. Endpoints registrieren
// ---------------------------------------------------------------------------

add_action( 'rest_api_init', 'eb_register_analytics_routes' );

function eb_register_analytics_routes() {
    $ns = 'eventboerse/v1';

    // POST /analytics/view
    register_rest_route( $ns, '/analytics/view', [
        'methods'             => WP_REST_Server::CREATABLE,
        'callback'            => 'eb_analytics_track_view',
        'permission_callback' => '__return_true',
        'args'                => [
            'listing_id' => [
                'required'          => true,
                'validate_callback' => function( $v ) { return is_numeric($v) && (int)$v > 0; },
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);

    // GET /analytics/listing/{id}
    register_rest_route( $ns, '/analytics/listing/(?P<id>\d+)', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'eb_analytics_get_listing_stats',
        'permission_callback' => 'eb_analytics_can_view_listing_stats',
        'args'                => [
            'id'   => [ 'validate_callback' => function($v){ return is_numeric($v); }, 'sanitize_callback' => 'absint' ],
            'days' => [ 'default' => 30, 'sanitize_callback' => function($v){ return min(365, max(1, absint($v))); } ],
        ],
    ]);

    // GET /analytics/overview  (Admin only)
    register_rest_route( $ns, '/analytics/overview', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'eb_analytics_get_overview',
        'permission_callback' => function() { return current_user_can('administrator'); },
        'args'                => [
            'days' => [ 'default' => 30, 'sanitize_callback' => function($v){ return min(365, max(1, absint($v))); } ],
        ],
    ]);
}

// ---------------------------------------------------------------------------
// 4. Callback: View tracken
// ---------------------------------------------------------------------------

function eb_analytics_track_view( WP_REST_Request $req ) {
    global $wpdb;

    $listing_id = $req->get_param('listing_id');
    $table      = $wpdb->prefix . 'eb_listing_views';

    // Listing existiert?
    $listing_table = $wpdb->prefix . 'eb_listings';
    $exists = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$listing_table} WHERE id = %d AND status = 'active' LIMIT 1",
        $listing_id
    ));
    if ( ! $exists ) {
        return new WP_Error( 'not_found', 'Listing nicht gefunden.', [ 'status' => 404 ] );
    }

    $ip       = eb_get_client_ip();
    $ip_hash  = eb_hash_ip( $ip );
    $ua       = eb_get_user_agent_snippet();
    $today    = gmdate('Y-m-d');

    // De-Duplizierung: Pro IP-Hash + Listing + Tag nur 1 View
    $already = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$table}
         WHERE listing_id = %d AND view_date = %s AND ip_hash = %s
         LIMIT 1",
        $listing_id, $today, $ip_hash
    ));

    if ( $already ) {
        return rest_ensure_response([ 'tracked' => false, 'reason' => 'duplicate' ]);
    }

    $inserted = $wpdb->insert( $table, [
        'listing_id' => $listing_id,
        'view_date'  => $today,
        'ip_hash'    => $ip_hash,
        'user_agent' => $ua,
    ], [ '%d', '%s', '%s', '%s' ] );

    if ( $inserted === false ) {
        return new WP_Error( 'db_error', 'Datenbankfehler.', [ 'status' => 500 ] );
    }

    return rest_ensure_response([ 'tracked' => true ]);
}

// ---------------------------------------------------------------------------
// 5. Permission: Listing-Stats (Owner oder Admin)
// ---------------------------------------------------------------------------

function eb_analytics_can_view_listing_stats( WP_REST_Request $req ) {
    if ( ! is_user_logged_in() ) {
        return new WP_Error( 'unauthorized', 'Nicht eingeloggt.', [ 'status' => 401 ] );
    }
    if ( current_user_can('administrator') ) {
        return true;
    }
    global $wpdb;
    $listing_id    = absint( $req->get_param('id') );
    $listing_table = $wpdb->prefix . 'eb_listings';
    $owner = $wpdb->get_var( $wpdb->prepare(
        "SELECT user_id FROM {$listing_table} WHERE id = %d LIMIT 1",
        $listing_id
    ));
    if ( (int) $owner !== get_current_user_id() ) {
        return new WP_Error( 'forbidden', 'Kein Zugriff.', [ 'status' => 403 ] );
    }
    return true;
}

// ---------------------------------------------------------------------------
// 6. Callback: Listing-Stats
// ---------------------------------------------------------------------------

function eb_analytics_get_listing_stats( WP_REST_Request $req ) {
    global $wpdb;

    $listing_id  = absint( $req->get_param('id') );
    $days        = (int) $req->get_param('days');
    $table       = $wpdb->prefix . 'eb_listing_views';
    $since       = gmdate('Y-m-d', strtotime("-{$days} days"));

    // Gesamt-Views im Zeitraum
    $total = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table}
         WHERE listing_id = %d AND view_date >= %s",
        $listing_id, $since
    ));

    // Unique Views (unique ip_hash im Zeitraum)
    $unique = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(DISTINCT ip_hash) FROM {$table}
         WHERE listing_id = %d AND view_date >= %s",
        $listing_id, $since
    ));

    // Täglich (für Chart)
    $daily_rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT view_date AS date, COUNT(*) AS views
         FROM {$table}
         WHERE listing_id = %d AND view_date >= %s
         GROUP BY view_date
         ORDER BY view_date ASC",
        $listing_id, $since
    ), ARRAY_A );

    // Gesamt aller Zeiten
    $total_ever = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE listing_id = %d",
        $listing_id
    ));

    return rest_ensure_response([
        'listing_id'  => $listing_id,
        'period_days' => $days,
        'total_views' => $total,
        'unique_views'=> $unique,
        'total_ever'  => $total_ever,
        'daily'       => $daily_rows,
    ]);
}

// ---------------------------------------------------------------------------
// 7. Callback: Platform-Übersicht (Admin)
// ---------------------------------------------------------------------------

function eb_analytics_get_overview( WP_REST_Request $req ) {
    global $wpdb;

    $days        = (int) $req->get_param('days');
    $table       = $wpdb->prefix . 'eb_listing_views';
    $listing_tbl = $wpdb->prefix . 'eb_listings';
    $since       = gmdate('Y-m-d', strtotime("-{$days} days"));

    // Gesamt-Views Plattform
    $total = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE view_date >= %s", $since
    ));

    $unique = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(DISTINCT ip_hash) FROM {$table} WHERE view_date >= %s", $since
    ));

    // Top 10 Listings nach Views
    $top_listings = $wpdb->get_results( $wpdb->prepare(
        "SELECT v.listing_id, l.title, COUNT(*) AS views
         FROM {$table} v
         LEFT JOIN {$listing_tbl} l ON l.id = v.listing_id
         WHERE v.view_date >= %s
         GROUP BY v.listing_id, l.title
         ORDER BY views DESC
         LIMIT 10",
        $since
    ), ARRAY_A );

    // Täglich Plattform
    $daily_rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT view_date AS date, COUNT(*) AS views
         FROM {$table}
         WHERE view_date >= %s
         GROUP BY view_date
         ORDER BY view_date ASC",
        $since
    ), ARRAY_A );

    // Bereinigung alter Daten (Retention 90 Tage), asynchron-ähnlich
    $retention_cutoff = gmdate('Y-m-d', strtotime('-90 days'));
    $wpdb->query( $wpdb->prepare(
        "DELETE FROM {$table} WHERE view_date < %s",
        $retention_cutoff
    ));

    return rest_ensure_response([
        'period_days'  => $days,
        'total_views'  => $total,
        'unique_views' => $unique,
        'top_listings' => $top_listings,
        'daily'        => $daily_rows,
    ]);
}
```

Jetzt die functions.php-Änderungen: Nur der Include und der Activation-Hook werden ergänzt. Da ich die vollständige functions.php nicht habe, liefere ich einen präzisen Diff-Patch als Kommentar-markierte Einfügung — und eine vollständige functions.php wäre 4400 Zeilen blind. Stattdessen: minimaler sicherer Eingriff.