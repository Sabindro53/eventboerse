<?php
/**
 * Permission-Callbacks fuer Eventboerse REST-Endpoints.
 *
 * Datei: includes/security/permissions.php
 * Aufruf: in functions.php am Ende einbinden mit
 *   require_once __DIR__ . '/includes/security/permissions.php';
 *
 * Audit-Issue: #13 (P0.1  Fehlende Autorisierungspruefung auf REST-Endpoint-Ebene).
 *
 * Konvention: Jeder register_rest_route() MUSS einen permission_callback haben.
 * Default ist NICHT '__return_true' (das ist ein Code-Smell).
 *
 * Stattdessen: nutze einen der untenstehenden Helper, der genau dokumentiert,
 * was die Bedingung ist:
 *
 *   // Public Read-only (z.B. Listings-Liste, Suche)
 *   'permission_callback' => 'eventboerse_perm_public',
 *
 *   // Eingeloggte Nutzer (z.B. eigenes Profil, Buchungen anlegen)
 *   'permission_callback' => 'eventboerse_perm_authenticated',
 *
 *   // Admin (z.B. User-Management, Site-Settings)
 *   'permission_callback' => 'eventboerse_perm_admin',
 *
 *   // Owner-Check (Listing bearbeiten / loeschen): Closure mit Datensatz-Check
 *   'permission_callback' => function ( $request ) {
 *       return eventboerse_perm_owner( $request, 'listings', $request['id'] );
 *   },
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Public-Endpoints: jeder darf lesen.
 * NUR fuer wirklich oeffentliche Daten (z.B. Listings-Index, Kategorien).
 */
function eventboerse_perm_public() {
    return true;
}

/**
 * Authenticated-Endpoint: User muss eingeloggt sein.
 * Nutzt WP-Cookie-Auth bzw. Application-Passwords — Setup wird von WP geregelt.
 */
function eventboerse_perm_authenticated() {
    if ( ! is_user_logged_in() ) {
        return new WP_Error( 'rest_forbidden', 'Login erforderlich.', array( 'status' => 401 ) );
    }
    return true;
}

/**
 * Admin-Endpoint: User muss WP-'manage_options'-Capability haben.
 */
function eventboerse_perm_admin() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return new WP_Error( 'rest_forbidden', 'Admin-Rechte erforderlich.', array( 'status' => 403 ) );
    }
    return true;
}

/**
 * Capability-Check.
 *
 * @param string $cap WordPress-Capability, z.B. 'edit_posts', 'eventboerse_create_listing'.
 * @return callable Permission-Callback.
 */
function eventboerse_perm_capability( $cap ) {
    return function () use ( $cap ) {
        if ( ! current_user_can( $cap ) ) {
            return new WP_Error( 'rest_forbidden', 'Fehlende Berechtigung.', array( 'status' => 403 ) );
        }
        return true;
    };
}

/**
 * Owner-Check via Custom-Post-Type.
 *
 * Pruefung: post existiert, post_type matcht, post_author == current_user_id.
 * Admins duerfen immer.
 *
 * @param WP_REST_Request $request
 * @param string $post_type  z.B. 'listings', 'reviews', 'bookings'.
 * @param int $post_id
 * @return true|WP_Error
 */
function eventboerse_perm_owner( $request, $post_type, $post_id ) {
    if ( ! is_user_logged_in() ) {
        return new WP_Error( 'rest_forbidden', 'Login erforderlich.', array( 'status' => 401 ) );
    }
    if ( current_user_can( 'manage_options' ) ) {
        return true; // Admin-Override
    }
    $post = get_post( (int) $post_id );
    if ( ! $post || $post->post_type !== $post_type ) {
        return new WP_Error( 'not_found', 'Datensatz nicht gefunden.', array( 'status' => 404 ) );
    }
    if ( (int) $post->post_author !== get_current_user_id() ) {
        return new WP_Error( 'rest_forbidden', 'Kein Zugriff auf fremden Datensatz.', array( 'status' => 403 ) );
    }
    return true;
}

/**
 * Sicherheits-Logger fuer Endpoints, die ohne permission_callback registriert wurden.
 * Aktiv nur wenn WP_DEBUG = true.
 */
if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
    add_action( 'rest_api_init', function () {
        $server = rest_get_server();
        $routes = $server->get_routes();
        foreach ( $routes as $route => $handlers ) {
            if ( strpos( $route, '/eventboerse/' ) !== 0 ) continue;
            foreach ( $handlers as $handler ) {
                if ( empty( $handler['permission_callback'] ) ) {
                    error_log( sprintf( '[eb-perm-audit] Route %s ohne permission_callback', $route ) );
                }
            }
        }
    }, 100 );
}
