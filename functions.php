<?php
/**
 * Eventbörse – Theme Functions
 *
 * @package Eventboerse
 */

/**
 * Styles und Scripts einbinden
 */
function eventboerse_enqueue_assets() {
    // Cache-Busting: Datei-Änderungsdatum statt Theme-Version
    $theme_dir = get_template_directory();
    $styles_ver = file_exists( $theme_dir . '/styles.css' ) ? filemtime( $theme_dir . '/styles.css' ) : '1.1.0';
    $app_ver    = file_exists( $theme_dir . '/app.js' )     ? filemtime( $theme_dir . '/app.js' )     : '1.1.0';

    // Google Fonts
    wp_enqueue_style(
        'google-fonts-inter',
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
        array(),
        null
    );
    wp_enqueue_style(
        'google-material-icons',
        'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
        array(),
        null
    );

    // Leaflet
    wp_enqueue_style(
        'leaflet',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        array(),
        '1.9.4'
    );
    wp_enqueue_script(
        'leaflet',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        array(),
        '1.9.4',
        true
    );

    // Theme Hauptstylesheet (style.css) – WordPress-Pflichtdatei (nur Header, keine Regeln)
    wp_enqueue_style(
        'eventboerse-style',
        get_stylesheet_uri(),
        array( 'google-fonts-inter', 'google-material-icons', 'leaflet' ),
        '1.1.0'
    );

    // Vollständiges Design-Stylesheet (styles.css) – einzige CSS-Quelle
    wp_enqueue_style(
        'eventboerse-styles-full',
        get_template_directory_uri() . '/styles.css',
        array( 'eventboerse-style' ),
        $styles_ver
    );

    // App JS
    wp_enqueue_script(
        'eventboerse-app',
        get_template_directory_uri() . '/app.js',
        array( 'leaflet' ),
        $app_ver,
        true
    );

    // API-Einstellungen ans Frontend übergeben
    $user_data = null;
    if ( is_user_logged_in() ) {
        $u = wp_get_current_user();
        $user_data = array_merge(
            array(
                'id'         => $u->ID,
                'email'      => $u->user_email,
                'first_name' => $u->first_name,
                'last_name'  => $u->last_name,
                'role'       => eventboerse_map_role( $u ),
            ),
            eb_user_profile_meta( $u->ID )
        );
    }
    wp_localize_script( 'eventboerse-app', 'eventboerseApi', array(
        'restUrl'    => esc_url_raw( rest_url( 'eventboerse/v1/' ) ),
        'nonce'      => wp_create_nonce( 'wp_rest' ),
        'isLoggedIn' => is_user_logged_in(),
        'user'       => $user_data,
    ) );
}
add_action( 'wp_enqueue_scripts', 'eventboerse_enqueue_assets' );

/**
 * Theme-Setup
 */
function eventboerse_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
}
add_action( 'after_setup_theme', 'eventboerse_setup' );

/* =====================================================================
   CUSTOM ROLES
   ===================================================================== */
function eventboerse_register_roles() {
    if ( ! get_role( 'event_planer' ) ) {
        add_role( 'event_planer', 'Event-Planer', array( 'read' => true ) );
    }
    if ( ! get_role( 'dienstleister' ) ) {
        add_role( 'dienstleister', 'Dienstleister', array( 'read' => true ) );
    }
}
add_action( 'init', 'eventboerse_register_roles' );

/**
 * WP-Rolle → Frontend-Label
 */
function eventboerse_map_role( $user ) {
    if ( in_array( 'dienstleister', (array) $user->roles, true ) ) {
        return 'Dienstleister';
    }
    return 'Event-Planer';
}

/**
 * Profil-Meta für einen User zurückgeben
 */
function eb_user_profile_meta( $uid ) {
    $gallery = get_user_meta( $uid, 'eb_gallery', true );
    return array(
        'tagline'  => get_user_meta( $uid, 'eb_tagline',   true ) ?: '',
        'location' => get_user_meta( $uid, 'eb_location',  true ) ?: '',
        'bio'      => get_user_meta( $uid, 'eb_bio',       true ) ?: '',
        'gallery'  => is_array( $gallery ) ? $gallery : array(),
        'coverUrl' => get_user_meta( $uid, 'eb_cover_url', true ) ?: '',
        'photoUrl' => get_user_meta( $uid, 'eb_photo_url', true ) ?: '',
    );
}

/* =====================================================================
   REST API
   ===================================================================== */
function eventboerse_register_rest_routes() {

    register_rest_route( 'eventboerse/v1', '/register', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_register',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/login', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_login',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/logout', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_logout',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/me', array(
        'methods'             => 'GET',
        'callback'            => 'eventboerse_handle_me',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/forgot-password', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_forgot_password',
        'permission_callback' => '__return_true',
    ) );

    /* ---------- PROFILE (GET + POST) ---------- */
    register_rest_route( 'eventboerse/v1', '/profile', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eventboerse_handle_profile_get',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eventboerse_handle_profile_save',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );
}
add_action( 'rest_api_init', 'eventboerse_register_rest_routes' );

/* ---------- REGISTER ---------- */
function eventboerse_handle_register( WP_REST_Request $request ) {
    $params     = $request->get_json_params();
    $email      = isset( $params['email'] )      ? sanitize_email( $params['email'] )           : '';
    $password   = isset( $params['password'] )    ? $params['password']                          : '';
    $first_name = isset( $params['first_name'] )  ? sanitize_text_field( $params['first_name'] ) : '';
    $last_name  = isset( $params['last_name'] )   ? sanitize_text_field( $params['last_name'] )  : '';
    $role_input = isset( $params['role'] )         ? sanitize_text_field( $params['role'] )       : 'user';

    // Validierung
    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }
    if ( strlen( $password ) < 8 ) {
        return new WP_REST_Response( array( 'message' => 'Das Passwort muss mindestens 8 Zeichen lang sein.' ), 400 );
    }
    if ( empty( $first_name ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib deinen Vornamen ein.' ), 400 );
    }
    if ( email_exists( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Diese E-Mail-Adresse ist bereits registriert.' ), 400 );
    }

    // Username = E-Mail-Prefix + zufällige Ziffern (falls Kollision)
    $username = sanitize_user( strtolower( explode( '@', $email )[0] ), true );
    if ( username_exists( $username ) ) {
        $username .= wp_rand( 100, 9999 );
    }

    $wp_role = ( $role_input === 'provider' ) ? 'dienstleister' : 'event_planer';

    $user_id = wp_create_user( $username, $password, $email );
    if ( is_wp_error( $user_id ) ) {
        return new WP_REST_Response( array( 'message' => $user_id->get_error_message() ), 400 );
    }

    // Meta + Rolle setzen
    wp_update_user( array(
        'ID'         => $user_id,
        'first_name' => $first_name,
        'last_name'  => $last_name,
        'role'       => $wp_role,
    ) );

    // Direkt einloggen
    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true );

    return new WP_REST_Response( array_merge(
        array(
            'user_id'    => $user_id,
            'email'      => $email,
            'first_name' => $first_name,
            'last_name'  => $last_name,
            'role'       => ( $wp_role === 'dienstleister' ) ? 'Dienstleister' : 'Event-Planer',
            'nonce'      => wp_create_nonce( 'wp_rest' ),
        ),
        eb_user_profile_meta( $user_id )
    ), 200 );
}

/* ---------- LOGIN ---------- */
function eventboerse_handle_login( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $email    = isset( $params['email'] )    ? sanitize_email( $params['email'] )    : '';
    $password = isset( $params['password'] ) ? $params['password']                   : '';

    if ( empty( $email ) || empty( $password ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail und Passwort sind erforderlich.' ), 400 );
    }

    // E-Mail → Username auflösen
    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Kein Konto mit dieser E-Mail gefunden.' ), 401 );
    }

    $creds = array(
        'user_login'    => $user->user_login,
        'user_password' => $password,
        'remember'      => true,
    );

    $signed_in = wp_signon( $creds, is_ssl() );
    if ( is_wp_error( $signed_in ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail oder Passwort ist falsch.' ), 401 );
    }

    wp_set_current_user( $signed_in->ID );

    return new WP_REST_Response( array_merge(
        array(
            'user_id'    => $signed_in->ID,
            'email'      => $signed_in->user_email,
            'first_name' => $signed_in->first_name,
            'last_name'  => $signed_in->last_name,
            'roles'      => (array) $signed_in->roles,
            'role'       => eventboerse_map_role( $signed_in ),
            'nonce'      => wp_create_nonce( 'wp_rest' ),
        ),
        eb_user_profile_meta( $signed_in->ID )
    ), 200 );
}

/* ---------- LOGOUT ---------- */
function eventboerse_handle_logout() {
    wp_logout();
    return new WP_REST_Response( array( 'message' => 'Abgemeldet.' ), 200 );
}

/* ---------- ME (Sitzungs-Check) ---------- */
function eventboerse_handle_me() {
    if ( ! is_user_logged_in() ) {
        return new WP_REST_Response( array( 'loggedIn' => false ), 200 );
    }
    $u = wp_get_current_user();
    return new WP_REST_Response( array_merge(
        array(
            'loggedIn'   => true,
            'user_id'    => $u->ID,
            'email'      => $u->user_email,
            'first_name' => $u->first_name,
            'last_name'  => $u->last_name,
            'role'       => eventboerse_map_role( $u ),
            'nonce'      => wp_create_nonce( 'wp_rest' ),
        ),
        eb_user_profile_meta( $u->ID )
    ), 200 );
}

/* ---------- PASSWORT VERGESSEN ---------- */
function eventboerse_handle_forgot_password( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        // Aus Sicherheitsgründen gleiche Antwort, auch wenn Konto nicht existiert
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
    }

    $result = retrieve_password( $user->user_login );
    if ( is_wp_error( $result ) ) {
        return new WP_REST_Response( array( 'message' => 'Fehler beim Senden der E-Mail. Bitte versuche es später erneut.' ), 500 );
    }

    return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
}

/* ---------- PROFILE GET ---------- */
function eventboerse_handle_profile_get() {
    $u   = wp_get_current_user();
    $uid = $u->ID;

    // Profil-Meta
    $tagline  = get_user_meta( $uid, 'eb_tagline',  true );
    $location = get_user_meta( $uid, 'eb_location', true );
    $bio      = get_user_meta( $uid, 'eb_bio',      true );
    $gallery  = get_user_meta( $uid, 'eb_gallery',  true );
    $cover    = get_user_meta( $uid, 'eb_cover_url', true );
    $photo    = get_user_meta( $uid, 'eb_photo_url', true );

    if ( ! is_array( $gallery ) ) {
        $gallery = array();
    }

    // Stats aus User-Meta (werden z. B. bei Buchungen/Views aktualisiert)
    $views    = (int) get_user_meta( $uid, 'eb_views',    true );
    $bookings = (int) get_user_meta( $uid, 'eb_bookings', true );

    // Inserate zählen (eb_listing CPT, Fallback: 0)
    $listings_count = 0;
    if ( post_type_exists( 'eb_listing' ) ) {
        $listings_count = (int) count_user_posts( $uid, 'eb_listing', true );
    }

    // Durchschnittsbewertung (gespeichert als Meta)
    $avg_rating = get_user_meta( $uid, 'eb_avg_rating', true );
    $avg_rating = ( $avg_rating !== '' && $avg_rating !== false ) ? (float) $avg_rating : null;

    // Bewertungen aus User-Meta (JSON-Array)
    $reviews_raw = get_user_meta( $uid, 'eb_reviews', true );
    $reviews     = is_array( $reviews_raw ) ? $reviews_raw : array();

    return new WP_REST_Response( array(
        'tagline'   => $tagline  ?: '',
        'location'  => $location ?: '',
        'bio'       => $bio      ?: '',
        'gallery'   => $gallery,
        'coverUrl'  => $cover    ?: '',
        'photoUrl'  => $photo    ?: '',
        'stats'     => array(
            'views'    => $views,
            'listings' => $listings_count,
            'bookings' => $bookings,
            'rating'   => $avg_rating,
        ),
        'reviews'   => $reviews,
    ), 200 );
}

/* ---------- PROFILE SAVE ---------- */
function eventboerse_handle_profile_save( WP_REST_Request $request ) {
    $u      = wp_get_current_user();
    $uid    = $u->ID;
    $params = $request->get_json_params();

    // Erlaubte Felder
    $text_fields = array(
        'tagline'  => 'eb_tagline',
        'location' => 'eb_location',
        'bio'      => 'eb_bio',
        'coverUrl' => 'eb_cover_url',
        'photoUrl' => 'eb_photo_url',
    );

    foreach ( $text_fields as $key => $meta_key ) {
        if ( isset( $params[ $key ] ) ) {
            update_user_meta( $uid, $meta_key, sanitize_text_field( $params[ $key ] ) );
        }
    }

    // Name (first_name + last_name)
    if ( isset( $params['name'] ) ) {
        $parts      = explode( ' ', sanitize_text_field( $params['name'] ), 2 );
        $first_name = $parts[0];
        $last_name  = isset( $parts[1] ) ? $parts[1] : '';
        wp_update_user( array(
            'ID'         => $uid,
            'first_name' => $first_name,
            'last_name'  => $last_name,
        ) );
    }

    // Galerie (Array von URLs)
    if ( isset( $params['gallery'] ) && is_array( $params['gallery'] ) ) {
        $clean = array_map( 'esc_url_raw', $params['gallery'] );
        update_user_meta( $uid, 'eb_gallery', $clean );
    }

    return new WP_REST_Response( array( 'saved' => true ), 200 );
}

/* =====================================================================
   Allow REST auth cookies on same origin
   ===================================================================== */
add_filter( 'rest_authentication_errors', function( $result ) {
    if ( true === $result || is_wp_error( $result ) ) {
        return $result;
    }
    if ( ! is_user_logged_in() ) {
        return $result;
    }
    return $result;
} );
