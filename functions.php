<?php
/**
 * Eventbörse – Theme Functions
 *
 * @package Eventboerse
 */

require_once get_template_directory() . '/webauthn.php';

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

    // Flatpickr
    wp_enqueue_style(
        'flatpickr',
        'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
        array(),
        '4.6.13'
    );
    wp_enqueue_script(
        'flatpickr',
        'https://cdn.jsdelivr.net/npm/flatpickr',
        array(),
        '4.6.13',
        true
    );
    wp_enqueue_script(
        'flatpickr-de',
        'https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/de.js',
        array( 'flatpickr' ),
        '4.6.13',
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
        array( 'leaflet', 'flatpickr', 'flatpickr-de' ),
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
                'phone'      => get_user_meta( $u->ID, 'eb_phone', true ) ?: '',
                'since'      => date_i18n( 'F Y', strtotime( $u->user_registered ) ),
            ),
            eb_user_security_meta( $u->ID ),
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

/* WordPress Admin-Bar für alle User ausblenden */
add_filter( 'show_admin_bar', '__return_false' );

/* WordPress-Standard-Registrierungs-E-Mails unterdrücken (wir senden eigene) */
add_filter( 'wp_new_user_notification_email',       '__return_false' );
add_filter( 'wp_new_user_notification_email_admin', '__return_false' );

/* E-Mail-Absender für alle wp_mail-Aufrufe korrekt setzen */
add_filter( 'wp_mail_from', function() {
    return 'noreply@' . wp_parse_url( home_url(), PHP_URL_HOST );
} );
add_filter( 'wp_mail_from_name', function() {
    return 'Eventbörse';
} );

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
        'company'  => get_user_meta( $uid, 'eb_company',   true ) ?: '',
        'tagline'  => get_user_meta( $uid, 'eb_tagline',   true ) ?: '',
        'location' => get_user_meta( $uid, 'eb_location',  true ) ?: '',
        'bio'      => get_user_meta( $uid, 'eb_bio',       true ) ?: '',
        'gallery'  => is_array( $gallery ) ? $gallery : array(),
        'coverUrl'  => get_user_meta( $uid, 'eb_cover_url', true ) ?: '',
        'coverPosY' => (float) ( get_user_meta( $uid, 'eb_cover_pos_y', true ) ?: 50 ),
        'photoUrl'  => get_user_meta( $uid, 'eb_photo_url', true ) ?: '',
    );
}

function eb_user_security_meta( $uid ) {
    $credentials = eb_webauthn_get_credentials( $uid );
    $verified    = get_user_meta( $uid, 'eb_email_verified', true );

    return array(
        'emailVerified' => '0' !== (string) $verified,
        'hasPasskey'    => ! empty( $credentials ),
        'passkeyCount'  => count( $credentials ),
    );
}

function eb_auth_user_payload( $user, $extra = array() ) {
    return array_merge(
        array(
            'user_id'    => $user->ID,
            'email'      => $user->user_email,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name,
            'roles'      => (array) $user->roles,
            'role'       => eventboerse_map_role( $user ),
            'nonce'      => wp_create_nonce( 'wp_rest' ),
            'phone'      => get_user_meta( $user->ID, 'eb_phone', true ) ?: '',
            'since'      => date_i18n( 'F Y', strtotime( $user->user_registered ) ),
        ),
        eb_user_security_meta( $user->ID ),
        eb_user_profile_meta( $user->ID ),
        $extra
    );
}

function eb_build_webauthn_credential_descriptor( $credential ) {
    $credential_id = eb_webauthn_credential_identifier( $credential );

    if ( '' === $credential_id ) {
        return null;
    }

    $descriptor = array(
        'type' => 'public-key',
        'id'   => $credential_id,
    );

    if ( ! empty( $credential['transports'] ) && is_array( $credential['transports'] ) ) {
        $descriptor['transports'] = array_values( $credential['transports'] );
    }

    return $descriptor;
}

function eb_send_login_otp_email( $user, $code ) {
    $subject  = 'Eventbörse – Dein Anmeldecode';
    $message  = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message .= '<h2 style="color:#222;margin-bottom:8px">Dein Anmeldecode</h2>';
    $message .= '<p style="color:#484848;line-height:1.6">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . ', nutze diesen 6-stelligen Code, um deine Anmeldung bei Eventbörse abzuschließen:</p>';
    $message .= '<p style="font-size:32px;letter-spacing:6px;font-weight:800;color:#FF385C;text-align:center;margin:28px 0">' . esc_html( $code ) . '</p>';
    $message .= '<p style="color:#717171;font-size:13px">Der Code ist 10 Minuten gültig. Falls du diese Anmeldung nicht gestartet hast, ändere bitte dein Passwort.</p>';
    $message .= '</div>';

    return wp_mail(
        $user->user_email,
        $subject,
        $message,
        array( 'Content-Type: text/html; charset=UTF-8' )
    );
}

function eb_login_otp_transient_key( $email ) {
    return 'eb_login_otp_' . md5( strtolower( trim( (string) $email ) ) );
}

function eb_login_otp_cooldown_key( $email ) {
    return 'eb_login_otp_cd_' . md5( strtolower( trim( (string) $email ) ) );
}

function eb_login_otp_resend_token() {
    return wp_generate_password( 32, false, false );
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

    register_rest_route( 'eventboerse/v1', '/verify-email', array(
        'methods'             => 'GET',
        'callback'            => 'eventboerse_handle_verify_email',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/resend-verification', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_resend_verification',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/reset-password', array(
        'methods'             => 'POST',
        'callback'            => 'eventboerse_handle_reset_password',
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

    // E-Mail-Verifizierung: Token generieren und speichern
    $token = bin2hex( random_bytes( 32 ) );
    update_user_meta( $user_id, 'eb_email_verify_token', $token );
    update_user_meta( $user_id, 'eb_email_verified', '0' );

    // Verifizierungs-E-Mail senden
    $verify_url = rest_url( 'eventboerse/v1/verify-email' ) . '?token=' . $token . '&uid=' . $user_id;
    $subject    = 'Eventbörse – Bitte bestätige deine E-Mail-Adresse';
    $message    = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message   .= '<h2 style="color:#222;margin-bottom:8px">Willkommen bei Eventbörse, ' . esc_html( $first_name ) . '!</h2>';
    $message   .= '<p style="color:#484848;line-height:1.6">Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und dein Konto zu aktivieren:</p>';
    $message   .= '<p style="text-align:center;margin:28px 0">';
    $message   .= '<a href="' . esc_url( $verify_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">E-Mail bestätigen</a>';
    $message   .= '</p>';
    $message   .= '<p style="color:#717171;font-size:13px">Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>';
    $message   .= '</div>';
    $headers    = array( 'Content-Type: text/html; charset=UTF-8' );
    $mail_sent  = wp_mail( $email, $subject, $message, $headers );

    // NICHT einloggen – erst nach Verifizierung
    $verify_passkey_token = bin2hex( random_bytes( 32 ) );
    set_transient( 'eb_verify_pk_' . hash( 'sha256', $verify_passkey_token ), $user_id, 10 * MINUTE_IN_SECONDS );

    return new WP_REST_Response( array(
        'pending_verification' => true,
        'message'              => 'Registrierung erfolgreich! Bitte überprüfe dein E-Mail-Postfach und bestätige deine E-Mail-Adresse.',
        'mail_sent'            => $mail_sent,
        'verify_token'         => $verify_passkey_token,
    ), 200 );
}

/* ---------- LOGIN ---------- */
function eventboerse_handle_login( WP_REST_Request $request ) {
    return new WP_REST_Response( array(
        'message'      => 'Direkter Passwort-Login ist deaktiviert. Bitte nutze den Zwei-Schritt-Login per E-Mail-Code oder einen Passkey.',
        'requires_otp' => true,
    ), 403 );
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
        array( 'loggedIn' => true ),
        eb_auth_user_payload( $u )
    ), 200 );
}

/* ---------- E-MAIL VERIFIZIERUNG ---------- */
function eventboerse_handle_verify_email( WP_REST_Request $request ) {
    $token   = sanitize_text_field( $request->get_param( 'token' ) );
    $user_id = absint( $request->get_param( 'uid' ) );

    if ( empty( $token ) || empty( $user_id ) ) {
        wp_die( 'Ungültiger Verifizierungslink.', 'Fehler', array( 'response' => 400 ) );
    }

    $stored_token = get_user_meta( $user_id, 'eb_email_verify_token', true );

    if ( ! $stored_token || ! hash_equals( $stored_token, $token ) ) {
        wp_die( 'Ungültiger oder abgelaufener Verifizierungslink.', 'Fehler', array( 'response' => 400 ) );
    }

    // E-Mail als verifiziert markieren und Token löschen
    update_user_meta( $user_id, 'eb_email_verified', '1' );
    delete_user_meta( $user_id, 'eb_email_verify_token' );

    // Weiterleitung zur Startseite mit Erfolgs-Parameter
    $user = get_userdata( $user_id );
    wp_safe_redirect( add_query_arg( array(
        'email_verified' => '1',
        'verified_email' => $user ? $user->user_email : '',
    ), home_url( '/' ) ) );
    exit;
}

/* ---------- VERIFIZIERUNGS-MAIL ERNEUT SENDEN ---------- */
function eventboerse_handle_resend_verification( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }

    $cd_key = 'eb_verify_cd_' . md5( strtolower( trim( $email ) ) );
    if ( get_transient( $cd_key ) ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
    }
    set_transient( $cd_key, 1, 2 * MINUTE_IN_SECONDS );

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( $verified === '1' ) {
        // Gleiche generische Antwort – keine Info über Verifizierungsstatus leaken
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
    }

    // Neuen Token generieren
    $token = bin2hex( random_bytes( 32 ) );
    update_user_meta( $user->ID, 'eb_email_verify_token', $token );

    $verify_url = rest_url( 'eventboerse/v1/verify-email' ) . '?token=' . $token . '&uid=' . $user->ID;
    $subject    = 'Eventbörse – Bitte bestätige deine E-Mail-Adresse';
    $message    = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message   .= '<h2 style="color:#222;margin-bottom:8px">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . '!</h2>';
    $message   .= '<p style="color:#484848;line-height:1.6">Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen:</p>';
    $message   .= '<p style="text-align:center;margin:28px 0">';
    $message   .= '<a href="' . esc_url( $verify_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">E-Mail bestätigen</a>';
    $message   .= '</p>';
    $message   .= '<p style="color:#717171;font-size:13px">Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>';
    $message   .= '</div>';
    $headers    = array( 'Content-Type: text/html; charset=UTF-8' );
    wp_mail( $email, $subject, $message, $headers );

    return new WP_REST_Response( array( 'message' => 'Falls ein Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet.' ), 200 );
}

/* ---------- PASSWORT VERGESSEN ---------- */
function eventboerse_handle_forgot_password( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';

    if ( empty( $email ) || ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.' ), 400 );
    }

    $cd_key = 'eb_pw_reset_cd_' . md5( strtolower( trim( $email ) ) );
    if ( get_transient( $cd_key ) ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
    }
    set_transient( $cd_key, 1, 2 * MINUTE_IN_SECONDS );

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
    }

    // Eigenen Reset-Token generieren
    $token = bin2hex( random_bytes( 32 ) );
    update_user_meta( $user->ID, 'eb_pw_reset_token', $token );
    update_user_meta( $user->ID, 'eb_pw_reset_expires', time() + 3600 ); // 1 Stunde gültig

    $reset_url = home_url( '/?reset_password=1&token=' . $token . '&uid=' . $user->ID );
    $subject   = 'Eventbörse – Passwort zurücksetzen';
    $message   = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">';
    $message  .= '<h2 style="color:#222;margin-bottom:8px">Passwort zurücksetzen</h2>';
    $message  .= '<p style="color:#484848;line-height:1.6">Hallo ' . esc_html( $user->first_name ?: $user->display_name ) . ', klicke auf den Button um ein neues Passwort zu setzen:</p>';
    $message  .= '<p style="text-align:center;margin:28px 0">';
    $message  .= '<a href="' . esc_url( $reset_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Neues Passwort setzen</a>';
    $message  .= '</p>';
    $message  .= '<p style="color:#717171;font-size:13px">Dieser Link ist 1 Stunde gültig. Falls du kein Passwort-Reset angefordert hast, ignoriere diese E-Mail.</p>';
    $message  .= '</div>';
    $headers   = array( 'Content-Type: text/html; charset=UTF-8' );
    wp_mail( $email, $subject, $message, $headers );

    return new WP_REST_Response( array( 'message' => 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.' ), 200 );
}

/* ---------- PASSWORT RESET AUSFÜHREN ---------- */
function eventboerse_handle_reset_password( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $token    = isset( $params['token'] )    ? sanitize_text_field( $params['token'] )    : '';
    $uid      = isset( $params['uid'] )      ? absint( $params['uid'] )                   : 0;
    $password = isset( $params['password'] ) ? $params['password']                        : '';

    if ( empty( $token ) || empty( $uid ) || empty( $password ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige Anfrage.' ), 400 );
    }

    if ( strlen( $password ) < 8 ) {
        return new WP_REST_Response( array( 'message' => 'Das Passwort muss mindestens 8 Zeichen lang sein.' ), 400 );
    }

    $stored_token = get_user_meta( $uid, 'eb_pw_reset_token', true );
    $expires      = (int) get_user_meta( $uid, 'eb_pw_reset_expires', true );

    if ( ! $stored_token || ! hash_equals( $stored_token, $token ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger oder abgelaufener Link.' ), 400 );
    }

    if ( time() > $expires ) {
        delete_user_meta( $uid, 'eb_pw_reset_token' );
        delete_user_meta( $uid, 'eb_pw_reset_expires' );
        return new WP_REST_Response( array( 'message' => 'Der Link ist abgelaufen. Bitte fordere einen neuen an.' ), 400 );
    }

    // Passwort setzen und Token löschen
    wp_set_password( $password, $uid );
    delete_user_meta( $uid, 'eb_pw_reset_token' );
    delete_user_meta( $uid, 'eb_pw_reset_expires' );

    return new WP_REST_Response( array( 'message' => 'Passwort erfolgreich geändert! Du kannst dich jetzt anmelden.' ), 200 );
}

/* ---------- PROFILE GET ---------- */
function eventboerse_handle_profile_get() {
    global $wpdb;
    $u   = wp_get_current_user();
    $uid = $u->ID;

    // Profil-Meta
    $tagline  = get_user_meta( $uid, 'eb_tagline',  true );
    $location = get_user_meta( $uid, 'eb_location', true );
    $bio      = get_user_meta( $uid, 'eb_bio',      true );
    $gallery  = get_user_meta( $uid, 'eb_gallery',  true );
    $cover    = get_user_meta( $uid, 'eb_cover_url', true );
    $coverPosY = (float) ( get_user_meta( $uid, 'eb_cover_pos_y', true ) ?: 50 );
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

    // Bewertungen aus der DB-Tabelle für alle Inserate dieses Users
    $user_listing_ids = $wpdb->get_col( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_listings WHERE user_id = %d",
        $uid
    ) );
    $avg_rating = null;
    $reviews    = array();
    if ( ! empty( $user_listing_ids ) ) {
        $id_placeholders = implode( ',', array_fill( 0, count( $user_listing_ids ), '%d' ) );
        $avg_rating = (float) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT AVG(rating) FROM {$wpdb->prefix}eb_reviews WHERE listing_id IN ($id_placeholders)",
                $user_listing_ids
            )
        );
        if ( $avg_rating ) {
            $avg_rating = round( $avg_rating, 1 );
        } else {
            $avg_rating = null;
        }
        $review_rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
                 LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
                 WHERE r.listing_id IN ($id_placeholders) ORDER BY r.created_at DESC LIMIT 10",
                $user_listing_ids
            )
        );
        foreach ( $review_rows as $r ) {
            $rname  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
            $rphoto = get_user_meta( $r->uid, 'eb_photo_url', true );
            $reviews[] = array(
                'rating' => (int) $r->rating,
                'text'   => $r->body,
                'name'   => $rname ?: $r->display_name,
                'avatar' => $rphoto ?: ( 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . urlencode( $rname ?: $r->display_name ) ),
                'date'   => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            );
        }
    }

    return new WP_REST_Response( array(
        'tagline'   => $tagline  ?: '',
        'location'  => $location ?: '',
        'bio'       => $bio      ?: '',
        'gallery'   => $gallery,
        'coverUrl'  => $cover    ?: '',
        'coverPosY' => $coverPosY,
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

    // Cover Position Y
    if ( isset( $params['coverPosY'] ) ) {
        $posY = max( 0, min( 100, floatval( $params['coverPosY'] ) ) );
        update_user_meta( $uid, 'eb_cover_pos_y', $posY );
    }

    return new WP_REST_Response( array( 'saved' => true ), 200 );
}

/* =====================================================================
   ACCOUNT SETTINGS HANDLERS
   ===================================================================== */
function eb_settings_update( WP_REST_Request $request ) {
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $first_name = sanitize_text_field( $params['first_name'] ?? '' );
    $last_name  = sanitize_text_field( $params['last_name'] ?? '' );
    $email      = sanitize_email( $params['email'] ?? '' );
    $phone      = sanitize_text_field( $params['phone'] ?? '' );
    $company    = sanitize_text_field( $params['company'] ?? '' );

    if ( empty( $first_name ) ) {
        return new WP_REST_Response( array( 'message' => 'Vorname ist erforderlich.' ), 400 );
    }

    if ( ! is_email( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültige E-Mail-Adresse.' ), 400 );
    }

    // Check if email is already in use by another user
    $existing = email_exists( $email );
    if ( $existing && $existing !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Diese E-Mail wird bereits verwendet.' ), 400 );
    }

    wp_update_user( array(
        'ID'         => $uid,
        'first_name' => $first_name,
        'last_name'  => $last_name,
        'user_email' => $email,
    ) );

    update_user_meta( $uid, 'eb_phone', $phone );
    update_user_meta( $uid, 'eb_company', $company );

    return new WP_REST_Response( array( 'saved' => true ), 200 );
}

function eb_settings_password( WP_REST_Request $request ) {
    $uid    = get_current_user_id();
    $user   = get_userdata( $uid );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    $params = $request->get_json_params();

    $current  = $params['current_password'] ?? '';
    $new_pass = $params['new_password'] ?? '';

    if ( ! wp_check_password( $current, $user->user_pass, $uid ) ) {
        return new WP_REST_Response( array( 'message' => 'Aktuelles Passwort ist falsch.' ), 400 );
    }

    if ( strlen( $new_pass ) < 8 ) {
        return new WP_REST_Response( array( 'message' => 'Neues Passwort muss mind. 8 Zeichen haben.' ), 400 );
    }

    wp_set_password( $new_pass, $uid );
    // Re-authenticate the user so they don't get logged out
    wp_set_auth_cookie( $uid, true, is_ssl() );

    return new WP_REST_Response( array( 'saved' => true ), 200 );
}

function eb_settings_delete_account( WP_REST_Request $request ) {
    $uid    = get_current_user_id();
    $user   = get_userdata( $uid );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }
    $params = $request->get_json_params();
    $password = $params['password'] ?? '';

    if ( empty( $password ) || ! wp_check_password( $password, $user->user_pass, $uid ) ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib dein aktuelles Passwort ein, um dein Konto zu löschen.' ), 403 );
    }

    // Don't allow admins to delete themselves via this endpoint
    if ( user_can( $uid, 'manage_options' ) ) {
        return new WP_REST_Response( array( 'message' => 'Admin-Konten können hier nicht gelöscht werden.' ), 400 );
    }

    require_once( ABSPATH . 'wp-admin/includes/user.php' );
    wp_delete_user( $uid );

    return new WP_REST_Response( array( 'deleted' => true ), 200 );
}

function eb_webauthn_register_options() {
    $uid      = get_current_user_id();
    $user     = get_userdata( $uid );
    $verified = get_user_meta( $uid, 'eb_email_verified', true );

    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array( 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse.' ), 403 );
    }

    $challenge = eb_webauthn_generate_challenge();
    eb_webauthn_store_challenge( 'register', $uid, $challenge, 300 );

    $exclude_credentials = array();
    foreach ( eb_webauthn_get_credentials( $uid ) as $credential ) {
        $descriptor = eb_build_webauthn_credential_descriptor( $credential );
        if ( null !== $descriptor ) {
            $exclude_credentials[] = $descriptor;
        }
    }

    return new WP_REST_Response( array(
        'publicKey' => array(
            'challenge'              => eb_base64url_encode( $challenge ),
            'rp'                     => array(
                'name' => 'Eventbörse',
                'id'   => eb_webauthn_rp_id(),
            ),
            'user'                   => array(
                'id'          => eb_base64url_encode( (string) $uid ),
                'name'        => $user->user_email,
                'displayName' => trim( $user->first_name . ' ' . $user->last_name ) ?: $user->display_name,
            ),
            'pubKeyCredParams'       => array(
                array( 'type' => 'public-key', 'alg' => -7 ),
            ),
            'timeout'                => 60000,
            'attestation'            => 'none',
            'authenticatorSelection' => array(
                'authenticatorAttachment' => 'platform',
                'residentKey'            => 'required',
                'userVerification'       => 'required',
            ),
            'excludeCredentials'     => $exclude_credentials,
            'extensions'             => array( 'credProps' => true ),
        ),
    ), 200 );
}

function eb_webauthn_register_finish( WP_REST_Request $request ) {
    $uid       = get_current_user_id();
    $verified  = get_user_meta( $uid, 'eb_email_verified', true );
    $params    = $request->get_json_params();
    $challenge = eb_webauthn_consume_challenge( 'register', $uid );

    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array( 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse.' ), 403 );
    }

    if ( false === $challenge ) {
        return new WP_REST_Response( array( 'message' => 'Die Passkey-Anfrage ist abgelaufen. Bitte erneut versuchen.' ), 400 );
    }

    $verification = eb_webauthn_verify_registration_response(
        $params['credential'] ?? array(),
        $challenge,
        eb_webauthn_origin(),
        eb_webauthn_rp_id()
    );

    if ( is_wp_error( $verification ) ) {
        return new WP_REST_Response( array( 'message' => $verification->get_error_message() ), 400 );
    }

    $label = sanitize_text_field( $params['label'] ?? '' );
    if ( '' === $label ) {
        $label = 'Passkey ' . wp_date( 'd.m.Y H:i' );
    }

    $saved = eb_webauthn_add_credential( $uid, array(
        'credential_id'      => $verification['credential_id_b64'],
        'credential_id_b64'  => $verification['credential_id_b64'],
        'public_key_pem'     => $verification['public_key_pem'],
        'sign_count'         => $verification['sign_count'],
        'label'              => $label,
        'transports'         => $verification['transports'],
        'attestation_format' => $verification['aaguid_attestation'],
        'created_at'         => current_time( 'mysql' ),
        'last_used_at'       => current_time( 'mysql' ),
    ) );

    if ( is_wp_error( $saved ) ) {
        return new WP_REST_Response( array( 'message' => $saved->get_error_message() ), 400 );
    }

    return new WP_REST_Response( array(
        'saved'        => true,
        'credentials'  => eb_webauthn_public_credentials( $uid ),
        'hasPasskey'   => true,
        'passkeyCount' => count( eb_webauthn_get_credentials( $uid ) ),
    ), 200 );
}

/* ---------- PASSKEY-VERIFIZIERUNG (für neue Registrierungen) ---------- */
function eb_webauthn_verify_options( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $token  = sanitize_text_field( $params['verify_token'] ?? '' );

    if ( empty( $token ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Verifizierungstoken.' ), 400 );
    }

    $tk_key  = 'eb_verify_pk_' . hash( 'sha256', $token );
    $user_id = get_transient( $tk_key );
    if ( false === $user_id ) {
        return new WP_REST_Response( array( 'message' => 'Verifizierungstoken abgelaufen. Bitte melde dich mit E-Mail-Code an.' ), 400 );
    }

    $user = get_userdata( (int) $user_id );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }

    $challenge = eb_webauthn_generate_challenge();
    eb_webauthn_store_challenge( 'register', $user_id, $challenge, 300 );

    return new WP_REST_Response( array(
        'publicKey' => array(
            'challenge'              => eb_base64url_encode( $challenge ),
            'rp'                     => array(
                'name' => 'Eventbörse',
                'id'   => eb_webauthn_rp_id(),
            ),
            'user'                   => array(
                'id'          => eb_base64url_encode( (string) $user_id ),
                'name'        => $user->user_email,
                'displayName' => trim( $user->first_name . ' ' . $user->last_name ) ?: $user->display_name,
            ),
            'pubKeyCredParams'       => array(
                array( 'type' => 'public-key', 'alg' => -7 ),
            ),
            'timeout'                => 60000,
            'attestation'            => 'none',
            'authenticatorSelection' => array(
                'authenticatorAttachment' => 'platform',
                'residentKey'            => 'required',
                'userVerification'       => 'required',
            ),
            'excludeCredentials'     => array(),
            'extensions'             => array( 'credProps' => true ),
        ),
    ), 200 );
}

function eb_webauthn_verify_finish( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $token  = sanitize_text_field( $params['verify_token'] ?? '' );

    if ( empty( $token ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Verifizierungstoken.' ), 400 );
    }

    $tk_key  = 'eb_verify_pk_' . hash( 'sha256', $token );
    $user_id = get_transient( $tk_key );
    if ( false === $user_id ) {
        return new WP_REST_Response( array( 'message' => 'Verifizierungstoken abgelaufen. Bitte melde dich mit E-Mail-Code an.' ), 400 );
    }

    $user = get_userdata( (int) $user_id );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }

    $challenge = eb_webauthn_consume_challenge( 'register', $user_id );
    if ( false === $challenge ) {
        return new WP_REST_Response( array( 'message' => 'Die Passkey-Anfrage ist abgelaufen. Bitte erneut versuchen.' ), 400 );
    }

    $verification = eb_webauthn_verify_registration_response(
        $params['credential'] ?? array(),
        $challenge,
        eb_webauthn_origin(),
        eb_webauthn_rp_id()
    );

    if ( is_wp_error( $verification ) ) {
        return new WP_REST_Response( array( 'message' => $verification->get_error_message() ), 400 );
    }

    $label = 'Passkey ' . wp_date( 'd.m.Y H:i' );
    $saved = eb_webauthn_add_credential( $user_id, array(
        'credential_id'      => $verification['credential_id_b64'],
        'credential_id_b64'  => $verification['credential_id_b64'],
        'public_key_pem'     => $verification['public_key_pem'],
        'sign_count'         => $verification['sign_count'],
        'label'              => $label,
        'transports'         => $verification['transports'],
        'attestation_format' => $verification['aaguid_attestation'],
        'created_at'         => current_time( 'mysql' ),
        'last_used_at'       => current_time( 'mysql' ),
    ) );

    if ( is_wp_error( $saved ) ) {
        return new WP_REST_Response( array( 'message' => $saved->get_error_message() ), 400 );
    }

    // Verifizierung + Token aufräumen
    update_user_meta( $user_id, 'eb_email_verified', '1' );
    delete_user_meta( $user_id, 'eb_email_verify_token' );
    delete_transient( $tk_key );

    // Einloggen
    wp_set_current_user( $user_id );
    wp_set_auth_cookie( $user_id, true, is_ssl() );

    return new WP_REST_Response( eb_auth_user_payload( $user ), 200 );
}

function eb_webauthn_login_options( WP_REST_Request $request ) {
    $params            = $request->get_json_params();
    $email             = sanitize_email( $params['email'] ?? '' );
    $challenge         = eb_webauthn_generate_challenge();
    $request_id        = wp_generate_uuid4();
    $allow_credentials = array();

    if ( $email ) {
        $user = get_user_by( 'email', $email );
        if ( $user ) {
            foreach ( eb_webauthn_get_credentials( $user->ID ) as $credential ) {
                $descriptor = eb_build_webauthn_credential_descriptor( $credential );
                if ( null !== $descriptor ) {
                    $allow_credentials[] = $descriptor;
                }
            }
        }
    }

    eb_webauthn_store_challenge( 'login', $request_id, $challenge, 300 );

    $public_key = array(
        'challenge'        => eb_base64url_encode( $challenge ),
        'rpId'             => eb_webauthn_rp_id(),
        'timeout'          => 60000,
        'userVerification' => 'required',
    );

    if ( ! empty( $allow_credentials ) ) {
        $public_key['allowCredentials'] = $allow_credentials;
    }

    return new WP_REST_Response( array(
        'requestId' => $request_id,
        'publicKey' => $public_key,
    ), 200 );
}

function eb_webauthn_login_finish( WP_REST_Request $request ) {
    $params        = $request->get_json_params();
    $request_id    = sanitize_text_field( $params['requestId'] ?? '' );
    $challenge     = eb_webauthn_consume_challenge( 'login', $request_id );
    $credential    = $params['credential'] ?? array();
    $credential_id = sanitize_text_field( $credential['id'] ?? '' );
    $credential_raw_id = sanitize_text_field( $credential['rawId'] ?? '' );

    if ( '' === $request_id || false === $challenge ) {
        return new WP_REST_Response( array( 'message' => 'Die Passkey-Anfrage ist abgelaufen. Bitte erneut versuchen.' ), 400 );
    }

    if ( '' === $credential_id ) {
        return new WP_REST_Response( array( 'message' => 'Credential-ID fehlt.' ), 400 );
    }

    if ( '' !== $credential_raw_id && ! hash_equals( $credential_id, $credential_raw_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Credential-ID ist inkonsistent.' ), 400 );
    }

    $lookup = eb_webauthn_find_user_by_credential_id( $credential_id );
    if ( ! $lookup ) {
        return new WP_REST_Response( array( 'message' => 'Passkey wurde nicht gefunden.' ), 404 );
    }

    $user = get_userdata( $lookup['user_id'] );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Nutzer zum Passkey wurde nicht gefunden.' ), 404 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array( 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse.' ), 403 );
    }

    $verification = eb_webauthn_verify_authentication_response(
        $credential,
        $lookup['credential'],
        $challenge,
        eb_webauthn_origin(),
        eb_webauthn_rp_id()
    );

    if ( is_wp_error( $verification ) ) {
        return new WP_REST_Response( array( 'message' => $verification->get_error_message() ), 400 );
    }

    $credentials = eb_webauthn_get_credentials( $user->ID );
    foreach ( $credentials as $index => $stored_credential ) {
        $stored_id = eb_webauthn_credential_identifier( $stored_credential );
        if ( '' !== $stored_id && hash_equals( $stored_id, $credential_id ) ) {
            $credentials[ $index ]['sign_count']   = $verification['sign_count'];
            $credentials[ $index ]['last_used_at'] = $verification['last_used_at'];
        }
    }
    eb_webauthn_save_credentials( $user->ID, $credentials );

    wp_set_current_user( $user->ID );
    wp_set_auth_cookie( $user->ID, true, is_ssl() );

    return new WP_REST_Response( array_merge(
        eb_auth_user_payload( $user ),
        array( 'passkeyAuthenticated' => true )
    ), 200 );
}

function eb_webauthn_credentials_list() {
    $uid = get_current_user_id();

    return new WP_REST_Response( array(
        'credentials'  => eb_webauthn_public_credentials( $uid ),
        'hasPasskey'   => eb_webauthn_user_has_credentials( $uid ),
        'passkeyCount' => count( eb_webauthn_get_credentials( $uid ) ),
    ), 200 );
}

function eb_webauthn_credentials_delete( WP_REST_Request $request ) {
    $uid           = get_current_user_id();
    $credential_id = sanitize_text_field( $request->get_param( 'credential_id' ) );

    if ( '' === $credential_id ) {
        return new WP_REST_Response( array( 'message' => 'Credential-ID fehlt.' ), 400 );
    }

    eb_webauthn_delete_credential( $uid, $credential_id );

    return new WP_REST_Response( array(
        'deleted'      => true,
        'credentials'  => eb_webauthn_public_credentials( $uid ),
        'hasPasskey'   => eb_webauthn_user_has_credentials( $uid ),
        'passkeyCount' => count( eb_webauthn_get_credentials( $uid ) ),
    ), 200 );
}

function eb_otp_send( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $email    = sanitize_email( $params['email'] ?? '' );
    $password = $params['password'] ?? '';
    $resend   = ! empty( $params['resend'] );
    $token    = sanitize_text_field( $params['resend_token'] ?? '' );
    $cooldown = get_transient( eb_login_otp_cooldown_key( $email ) );
    $otp_key  = eb_login_otp_transient_key( $email );
    $existing = get_transient( $otp_key );

    if ( empty( $email ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail ist erforderlich.' ), 400 );
    }

    if ( ! $resend && empty( $password ) ) {
        return new WP_REST_Response( array( 'message' => 'E-Mail und Passwort sind erforderlich.' ), 400 );
    }

    if ( $cooldown ) {
        return new WP_REST_Response( array( 'message' => 'Bitte warte kurz, bevor du einen neuen Code anforderst.' ), 429 );
    }

    $user = get_user_by( 'email', $email );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.' ), 401 );
    }

    $verified = get_user_meta( $user->ID, 'eb_email_verified', true );
    if ( '0' === (string) $verified ) {
        return new WP_REST_Response( array(
            'message'              => 'Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe dein Postfach.',
            'pending_verification' => true,
            'email'                => $email,
        ), 403 );
    }

    if ( $resend ) {
        if ( ! is_array( $existing ) || empty( $existing['resend_token'] ) || empty( $token ) || ! hash_equals( (string) $existing['resend_token'], $token ) ) {
            return new WP_REST_Response( array( 'message' => 'Bitte starte die Anmeldung erneut.' ), 400 );
        }
    } elseif ( ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
        return new WP_REST_Response( array( 'message' => 'Anmeldung fehlgeschlagen. Bitte prüfe deine Eingaben.' ), 401 );
    }

    $code = (string) random_int( 100000, 999999 );
    $resend_token = is_array( $existing ) && ! empty( $existing['resend_token'] ) ? (string) $existing['resend_token'] : eb_login_otp_resend_token();
    set_transient( $otp_key, array(
        'user_id'    => $user->ID,
        'code_hash'  => wp_hash( $code ),
        'created_at' => time(),
        'attempts'   => 0,
        'resend_token' => $resend_token,
    ), 10 * MINUTE_IN_SECONDS );
    set_transient( eb_login_otp_cooldown_key( $email ), 1, MINUTE_IN_SECONDS );

    eb_send_login_otp_email( $user, $code );

    return new WP_REST_Response( array(
        'sent'         => true,
        'expiresIn'    => 10 * MINUTE_IN_SECONDS,
        'email'        => $email,
        'resendToken'  => $resend_token,
    ), 200 );
}

function eb_otp_verify( WP_REST_Request $request ) {
    $params  = $request->get_json_params();
    $email   = sanitize_email( $params['email'] ?? '' );
    $code    = preg_replace( '/\D+/', '', (string) ( $params['code'] ?? '' ) );
    $otp_key  = eb_login_otp_transient_key( $email );
    $payload = get_transient( $otp_key );

    if ( empty( $email ) || strlen( $code ) !== 6 ) {
        return new WP_REST_Response( array( 'message' => 'Bitte gib E-Mail und 6-stelligen Code ein.' ), 400 );
    }

    if ( ! is_array( $payload ) || empty( $payload['user_id'] ) || empty( $payload['code_hash'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    $attempts = isset( $payload['attempts'] ) ? (int) $payload['attempts'] : 0;
    if ( $attempts >= 5 ) {
        delete_transient( $otp_key );
        return new WP_REST_Response( array( 'message' => 'Zu viele falsche Versuche. Bitte fordere einen neuen Code an.' ), 429 );
    }

    if ( ! hash_equals( $payload['code_hash'], wp_hash( $code ) ) ) {
        $payload['attempts'] = $attempts + 1;
        set_transient( $otp_key, $payload, 10 * MINUTE_IN_SECONDS );
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    $user = get_userdata( (int) $payload['user_id'] );
    if ( ! $user || ! hash_equals( strtolower( $user->user_email ), strtolower( $email ) ) ) {
        return new WP_REST_Response( array( 'message' => 'Code ungültig oder abgelaufen.' ), 400 );
    }

    delete_transient( $otp_key );

    wp_set_current_user( $user->ID );
    wp_set_auth_cookie( $user->ID, true, is_ssl() );

    return new WP_REST_Response( array_merge(
        eb_auth_user_payload( $user ),
        array( 'otpVerified' => true )
    ), 200 );
}

/* =====================================================================
   Fix REST cookie + nonce authentication
   WordPress core's rest_cookie_check_errors() (priority 100) rejects
   requests when the nonce doesn't match the logged-in cookie session.
   Our filter at priority 101 runs AFTER core: if core returns a nonce
   error we downgrade to anonymous instead of hard-blocking, so that
   public endpoints (e.g. passkey-login) still work with a stale cookie.
   ===================================================================== */
add_filter( 'rest_authentication_errors', function( $result ) {
    if ( is_wp_error( $result ) && 'rest_cookie_invalid_nonce' === $result->get_error_code() ) {
        wp_set_current_user( 0 );
        return null;
    }
    return $result;
}, 101 );

/* Send a fresh nonce in every authenticated REST response so that the
   SPA can keep its nonce up-to-date during long sessions. */
add_filter( 'rest_post_dispatch', function( $response ) {
    if ( is_user_logged_in() ) {
        $response->header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
    }
    return $response;
} );

/* =====================================================================
   CUSTOM DATABASE TABLES
   ===================================================================== */
function eb_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    $sql_listings = "CREATE TABLE {$wpdb->prefix}eb_listings (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        title varchar(255) NOT NULL,
        category varchar(100) NOT NULL DEFAULT '',
        category_label varchar(100) NOT NULL DEFAULT '',
        description longtext,
        price int(10) unsigned NOT NULL DEFAULT 0,
        price_model varchar(50) NOT NULL DEFAULT '',
        price_label varchar(100) NOT NULL DEFAULT '',
        location varchar(255) NOT NULL DEFAULT '',
        region varchar(255) NOT NULL DEFAULT '',
        features longtext,
        tags text,
        images longtext,
        date_from date DEFAULT NULL,
        date_to date DEFAULT NULL,
        time_from varchar(5) DEFAULT NULL,
        time_to varchar(5) DEFAULT NULL,
        duration float DEFAULT 0,
        badge varchar(50) DEFAULT 'Neu',
        negotiable tinyint(1) DEFAULT 1,
        status varchar(20) DEFAULT 'active',
        rating_avg float DEFAULT 0,
        review_count int(10) unsigned DEFAULT 0,
        views int(10) unsigned DEFAULT 0,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        updated_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_user (user_id),
        KEY idx_category (category),
        KEY idx_status (status),
        KEY idx_created (created_at)
    ) $charset;";

    $sql_reviews = "CREATE TABLE {$wpdb->prefix}eb_reviews (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        listing_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        rating tinyint(3) unsigned NOT NULL DEFAULT 5,
        body text,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_listing (listing_id),
        KEY idx_user (user_id)
    ) $charset;";

    $sql_conversations = "CREATE TABLE {$wpdb->prefix}eb_conversations (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_a bigint(20) unsigned NOT NULL,
        user_b bigint(20) unsigned NOT NULL,
        listing_id bigint(20) unsigned DEFAULT NULL,
        updated_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_user_a (user_a),
        KEY idx_user_b (user_b)
    ) $charset;";

    $sql_messages = "CREATE TABLE {$wpdb->prefix}eb_messages (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        conversation_id bigint(20) unsigned NOT NULL,
        sender_id bigint(20) unsigned NOT NULL,
        body text,
        msg_type varchar(20) DEFAULT 'text',
        offer_amount decimal(10,2) DEFAULT NULL,
        offer_status varchar(20) DEFAULT NULL,
        is_read tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        KEY idx_conv (conversation_id),
        KEY idx_sender (sender_id)
    ) $charset;";

    $sql_favorites = "CREATE TABLE {$wpdb->prefix}eb_favorites (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        listing_id bigint(20) unsigned NOT NULL,
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        PRIMARY KEY  (id),
        UNIQUE KEY idx_user_listing (user_id, listing_id)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql_listings );
    dbDelta( $sql_reviews );
    dbDelta( $sql_conversations );
    dbDelta( $sql_messages );
    dbDelta( $sql_favorites );
}
add_action( 'after_switch_theme', 'eb_create_tables' );
// Also run on init once (version check)
function eb_maybe_create_tables() {
    if ( get_option( 'eb_db_version' ) !== '1.8' ) {
        eb_create_tables();
        // Fix any existing listings that have empty status
        global $wpdb;
        $wpdb->query( "UPDATE {$wpdb->prefix}eb_listings SET status = 'active' WHERE status = '' OR status IS NULL" );
        $wpdb->query( "UPDATE {$wpdb->prefix}eb_listings SET badge = 'Neu' WHERE badge = '' OR badge IS NULL" );
        update_option( 'eb_db_version', '1.8' );
    }
}
add_action( 'init', 'eb_maybe_create_tables' );

/* =====================================================================
   ADDITIONAL REST ROUTES
   ===================================================================== */
function eb_register_extra_routes() {

    /* ---------- IMAGE UPLOAD ---------- */
    register_rest_route( 'eventboerse/v1', '/upload', array(
        'methods'             => 'POST',
        'callback'            => 'eb_handle_upload',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- LISTINGS ---------- */
    register_rest_route( 'eventboerse/v1', '/listings', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_listings_list',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_listings_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/listings/(?P<id>\d+)', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_listings_get',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'PUT',
            'callback'            => 'eb_listings_update',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => 'eb_listings_delete',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/my-listings', array(
        'methods'             => 'GET',
        'callback'            => 'eb_my_listings',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- REVIEWS ---------- */
    register_rest_route( 'eventboerse/v1', '/listings/(?P<id>\d+)/reviews', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_reviews_list',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_reviews_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    /* ---------- CONVERSATIONS / MESSAGES ---------- */
    register_rest_route( 'eventboerse/v1', '/conversations', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_conversations_list',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_conversations_create',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/conversations/(?P<id>\d+)/messages', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_messages_list',
            'permission_callback' => 'is_user_logged_in',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_messages_send',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/messages/(?P<id>\d+)/offer-status', array(
        'methods'             => 'POST',
        'callback'            => 'eb_offer_status_update',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- FAVORITES ---------- */
    register_rest_route( 'eventboerse/v1', '/favorites', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'eb_favorites_list',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    register_rest_route( 'eventboerse/v1', '/favorites/(?P<listing_id>\d+)', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'eb_favorites_toggle',
            'permission_callback' => 'is_user_logged_in',
        ),
    ) );

    /* ---------- PUBLIC PROVIDER PROFILE ---------- */
    register_rest_route( 'eventboerse/v1', '/provider/(?P<id>\d+)', array(
        'methods'             => 'GET',
        'callback'            => 'eb_provider_profile',
        'permission_callback' => '__return_true',
    ) );
    /* ---------- DIAGNOSTICS (admin only) ---------- */
    register_rest_route( 'eventboerse/v1', '/diagnostics', array(
        'methods'             => 'GET',
        'callback'            => 'eb_diagnostics',
        'permission_callback' => function() { return current_user_can( 'manage_options' ); },
    ) );

    /* ---------- ACCOUNT SETTINGS ---------- */
    register_rest_route( 'eventboerse/v1', '/settings', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_update',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/settings/password', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_password',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/settings/delete-account', array(
        'methods'             => 'POST',
        'callback'            => 'eb_settings_delete_account',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- PASSKEY / WEBAUTHN ---------- */
    register_rest_route( 'eventboerse/v1', '/webauthn/verify-options', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_verify_options',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/verify-register', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_verify_finish',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/register-options', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_register_options',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/register', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_register_finish',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/login-options', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_login_options',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/login', array(
        'methods'             => 'POST',
        'callback'            => 'eb_webauthn_login_finish',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/credentials', array(
        'methods'             => 'GET',
        'callback'            => 'eb_webauthn_credentials_list',
        'permission_callback' => 'is_user_logged_in',
    ) );

    register_rest_route( 'eventboerse/v1', '/webauthn/credentials/(?P<credential_id>[A-Za-z0-9_-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'eb_webauthn_credentials_delete',
        'permission_callback' => 'is_user_logged_in',
    ) );

    /* ---------- EMAIL OTP ---------- */
    register_rest_route( 'eventboerse/v1', '/otp/send', array(
        'methods'             => 'POST',
        'callback'            => 'eb_otp_send',
        'permission_callback' => '__return_true',
    ) );

    register_rest_route( 'eventboerse/v1', '/otp/verify', array(
        'methods'             => 'POST',
        'callback'            => 'eb_otp_verify',
        'permission_callback' => '__return_true',
    ) );
}
add_action( 'rest_api_init', 'eb_register_extra_routes' );

/** Check DB tables exist and are functional */
function eb_diagnostics() {
    global $wpdb;
    $tables = array( 'eb_listings', 'eb_reviews', 'eb_conversations', 'eb_messages', 'eb_favorites' );
    $result = array( 'db_version' => get_option( 'eb_db_version' ), 'tables' => array() );
    foreach ( $tables as $t ) {
        $full = $wpdb->prefix . $t;
        $exists = $wpdb->get_var( $wpdb->prepare( "SHOW TABLES LIKE %s", $full ) ) === $full;
        $cols = $exists ? $wpdb->get_results( "SHOW COLUMNS FROM `" . esc_sql( $full ) . "`" ) : null;
        $result['tables'][ $t ] = array(
            'exists'  => $exists,
            'columns' => $cols ? wp_list_pluck( $cols, 'Field' ) : null,
        );
    }
    return new WP_REST_Response( $result, 200 );
}

/* =====================================================================
   UPLOAD HANDLER
   ===================================================================== */
function eb_handle_upload( WP_REST_Request $request ) {
    $files = $request->get_file_params();
    if ( empty( $files['file'] ) ) {
        return new WP_REST_Response( array( 'message' => 'Keine Datei hochgeladen.' ), 400 );
    }

    $file = $files['file'];
    $allowed = array( 'image/jpeg', 'image/png', 'image/webp', 'image/gif' );
    if ( ! in_array( $file['type'], $allowed, true ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Dateityp. Erlaubt: JPG, PNG, WebP, GIF.' ), 400 );
    }
    if ( $file['size'] > 5 * 1024 * 1024 ) {
        return new WP_REST_Response( array( 'message' => 'Datei zu groß. Max. 5MB.' ), 400 );
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    $upload = wp_handle_upload( $file, array( 'test_form' => false ) );
    if ( isset( $upload['error'] ) ) {
        return new WP_REST_Response( array( 'message' => $upload['error'] ), 500 );
    }

    // Create attachment in media library
    $attachment = array(
        'post_mime_type' => $upload['type'],
        'post_title'     => sanitize_file_name( $file['name'] ),
        'post_content'   => '',
        'post_status'    => 'inherit',
    );
    $attach_id = wp_insert_attachment( $attachment, $upload['file'] );
    $meta = wp_generate_attachment_metadata( $attach_id, $upload['file'] );
    wp_update_attachment_metadata( $attach_id, $meta );

    return new WP_REST_Response( array(
        'id'  => $attach_id,
        'url' => $upload['url'],
    ), 200 );
}

/* =====================================================================
   LISTINGS HANDLERS
   ===================================================================== */

/** List all active listings (public) */
function eb_listings_list( WP_REST_Request $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'eb_listings';

    $where  = 'WHERE status = %s';
    $params = array( 'active' );

    // Optional filters
    $category = sanitize_text_field( $request->get_param( 'category' ) );
    if ( $category ) {
        $where   .= ' AND category = %s';
        $params[] = $category;
    }
    $search = sanitize_text_field( $request->get_param( 'search' ) );
    if ( $search ) {
        $like     = '%' . $wpdb->esc_like( $search ) . '%';
        $where   .= ' AND (title LIKE %s OR description LIKE %s OR location LIKE %s)';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    $location = sanitize_text_field( $request->get_param( 'location' ) );
    if ( $location ) {
        $like     = '%' . $wpdb->esc_like( $location ) . '%';
        $where   .= ' AND (location LIKE %s OR region LIKE %s)';
        $params[] = $like;
        $params[] = $like;
    }
    $min_price = absint( $request->get_param( 'min_price' ) );
    $max_price = absint( $request->get_param( 'max_price' ) );
    if ( $min_price ) {
        $where   .= ' AND price >= %d';
        $params[] = $min_price;
    }
    if ( $max_price ) {
        $where   .= ' AND price <= %d';
        $params[] = $max_price;
    }
    $min_rating = floatval( $request->get_param( 'min_rating' ) );
    if ( $min_rating > 0 ) {
        $where   .= ' AND rating_avg >= %f';
        $params[] = $min_rating;
    }

    // Sort
    $sort = sanitize_text_field( $request->get_param( 'sort' ) );
    switch ( $sort ) {
        case 'price_asc':
            $order = 'ORDER BY price ASC';
            break;
        case 'price_desc':
            $order = 'ORDER BY price DESC';
            break;
        case 'rating':
            $order = 'ORDER BY rating_avg DESC';
            break;
        case 'newest':
            $order = 'ORDER BY created_at DESC';
            break;
        default:
            $order = 'ORDER BY created_at DESC';
    }

    // Pagination
    $page     = max( 1, absint( $request->get_param( 'page' ) ?: 1 ) );
    $per_page = min( 50, max( 1, absint( $request->get_param( 'per_page' ) ?: 20 ) ) );
    $offset   = ( $page - 1 ) * $per_page;

    $sql = $wpdb->prepare(
        "SELECT * FROM $table $where $order LIMIT %d OFFSET %d",
        array_merge( $params, array( $per_page, $offset ) )
    );
    $rows = $wpdb->get_results( $sql, ARRAY_A );

    $total = (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM $table $where",
        $params
    ) );

    $listings = array_map( 'eb_format_listing', $rows );

    $response = new WP_REST_Response( array(
        'listings' => $listings,
        'total'    => $total,
        'page'     => $page,
        'pages'    => ceil( $total / $per_page ),
    ), 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}

/** Format a DB row into a frontend-friendly listing object */
function eb_format_listing( $row ) {
    $user   = get_userdata( $row['user_id'] );
    $images = json_decode( $row['images'], true );
    if ( ! is_array( $images ) ) $images = array();

    $features = json_decode( $row['features'], true );
    if ( ! is_array( $features ) ) $features = array();

    $tags = json_decode( $row['tags'], true );
    if ( ! is_array( $tags ) ) $tags = array();

    $name = $user ? trim( $user->first_name . ' ' . $user->last_name ) : 'Unbekannt';
    $photo = $user ? ( get_user_meta( $user->ID, 'eb_photo_url', true ) ?: '' ) : '';
    $avatar = $photo ?: ( 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . urlencode( $name ) );
    $since = $user ? date( 'Y', strtotime( $user->user_registered ) ) : '';

    return array(
        'id'            => (int) $row['id'],
        'providerId'    => (int) $row['user_id'],
        'title'         => $row['title'],
        'category'      => $row['category'],
        'categoryLabel' => $row['category_label'],
        'location'      => $row['location'],
        'region'        => $row['region'],
        'price'         => (int) $row['price'],
        'priceModel'    => $row['price_model'],
        'priceLabel'    => $row['price_label'],
        'rating'        => round( (float) $row['rating_avg'], 1 ),
        'reviews'       => (int) $row['review_count'],
        'image'         => ! empty( $images[0] ) ? $images[0] : '',
        'images'        => $images,
        'providerName'  => $name,
        'providerImg'   => $avatar,
        'providerSince' => $since,
        'description'   => $row['description'],
        'features'      => $features,
        'tags'          => $tags,
        'dateFrom'      => $row['date_from'],
        'dateTo'        => $row['date_to'],
        'timeFrom'      => $row['time_from'],
        'timeTo'        => $row['time_to'],
        'duration'      => (float) $row['duration'],
        'badge'         => $row['badge'],
        'negotiable'    => (bool) $row['negotiable'],
        'views'         => (int) $row['views'],
        'createdAt'     => $row['created_at'],
    );
}

/** Get single listing */
function eb_listings_get( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d",
        $id
    ), ARRAY_A );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Inserat nicht gefunden.' ), 404 );
    }

    // Increment views
    $wpdb->query( $wpdb->prepare(
        "UPDATE {$wpdb->prefix}eb_listings SET views = views + 1 WHERE id = %d",
        $id
    ) );

    return new WP_REST_Response( eb_format_listing( $row ), 200 );
}

/** Create listing */
function eb_listings_create( WP_REST_Request $request ) {
    global $wpdb;
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $title = sanitize_text_field( $params['title'] ?? '' );
    if ( empty( $title ) ) {
        return new WP_REST_Response( array( 'message' => 'Titel ist erforderlich.' ), 400 );
    }

    $category       = sanitize_text_field( $params['category'] ?? '' );
    $category_label = sanitize_text_field( $params['categoryLabel'] ?? $category );
    $description    = wp_kses_post( $params['description'] ?? '' );
    $price          = absint( $params['price'] ?? 0 );
    $price_model    = sanitize_text_field( $params['priceModel'] ?? '' );
    $price_label    = sanitize_text_field( $params['priceLabel'] ?? '' );
    $location_val   = sanitize_text_field( $params['location'] ?? '' );
    $region         = sanitize_text_field( $params['region'] ?? '' );
    $features       = isset( $params['features'] ) && is_array( $params['features'] )
        ? wp_json_encode( array_map( 'sanitize_text_field', $params['features'] ) )
        : '[]';
    $tags           = isset( $params['tags'] ) && is_array( $params['tags'] )
        ? wp_json_encode( array_map( 'sanitize_text_field', $params['tags'] ) )
        : '[]';
    $images         = isset( $params['images'] ) && is_array( $params['images'] )
        ? wp_json_encode( array_map( 'esc_url_raw', $params['images'] ) )
        : '[]';
    $date_from  = ! empty( $params['dateFrom'] ) ? sanitize_text_field( $params['dateFrom'] ) : null;
    $date_to    = ! empty( $params['dateTo'] )   ? sanitize_text_field( $params['dateTo'] )   : null;
    $time_from  = ! empty( $params['timeFrom'] ) ? sanitize_text_field( $params['timeFrom'] ) : null;
    $time_to    = ! empty( $params['timeTo'] )   ? sanitize_text_field( $params['timeTo'] )   : null;
    $duration   = floatval( $params['duration'] ?? 0 );
    $negotiable = isset( $params['negotiable'] ) ? (int) (bool) $params['negotiable'] : 1;

    $now = current_time( 'mysql' );

    $wpdb->insert( $wpdb->prefix . 'eb_listings', array(
        'user_id'        => $uid,
        'title'          => $title,
        'category'       => $category,
        'category_label' => $category_label,
        'description'    => $description,
        'price'          => $price,
        'price_model'    => $price_model,
        'price_label'    => $price_label,
        'location'       => $location_val,
        'region'         => $region,
        'features'       => $features,
        'tags'           => $tags,
        'images'         => $images,
        'date_from'      => $date_from,
        'date_to'        => $date_to,
        'time_from'      => $time_from,
        'time_to'        => $time_to,
        'duration'       => $duration,
        'negotiable'     => $negotiable,
        'status'         => 'active',
        'badge'          => 'Neu',
        'created_at'     => $now,
        'updated_at'     => $now,
    ) );

    $new_id = $wpdb->insert_id;
    if ( ! $new_id ) {
        return new WP_REST_Response( array(
            'message'  => 'Fehler beim Erstellen.',
            'db_error' => $wpdb->last_error,
            'table'    => $wpdb->prefix . 'eb_listings',
        ), 500 );
    }

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $new_id
    ), ARRAY_A );

    return new WP_REST_Response( eb_format_listing( $row ), 201 );
}

/** Update listing (only owner) */
function eb_listings_update( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $uid = get_current_user_id();

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $id
    ), ARRAY_A );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Nicht gefunden.' ), 404 );
    }
    if ( (int) $row['user_id'] !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $params = $request->get_json_params();
    $update = array();

    $text_fields = array(
        'title' => 'title', 'category' => 'category', 'category_label' => 'categoryLabel',
        'description' => 'description', 'price_label' => 'priceLabel', 'price_model' => 'priceModel',
        'location' => 'location', 'region' => 'region', 'badge' => 'badge',
        'time_from' => 'timeFrom', 'time_to' => 'timeTo',
    );
    foreach ( $text_fields as $col => $key ) {
        if ( isset( $params[ $key ] ) ) {
            $update[ $col ] = $col === 'description'
                ? wp_kses_post( $params[ $key ] )
                : sanitize_text_field( $params[ $key ] );
        }
    }
    if ( isset( $params['price'] ) )    $update['price']    = absint( $params['price'] );
    if ( isset( $params['duration'] ) ) $update['duration'] = floatval( $params['duration'] );
    if ( isset( $params['dateFrom'] ) ) $update['date_from'] = sanitize_text_field( $params['dateFrom'] );
    if ( isset( $params['dateTo'] ) )   $update['date_to']   = sanitize_text_field( $params['dateTo'] );
    if ( isset( $params['negotiable'] ) ) $update['negotiable'] = (int) (bool) $params['negotiable'];
    if ( isset( $params['features'] ) && is_array( $params['features'] ) ) {
        $update['features'] = wp_json_encode( array_map( 'sanitize_text_field', $params['features'] ) );
    }
    if ( isset( $params['tags'] ) && is_array( $params['tags'] ) ) {
        $update['tags'] = wp_json_encode( array_map( 'sanitize_text_field', $params['tags'] ) );
    }
    if ( isset( $params['images'] ) && is_array( $params['images'] ) ) {
        $update['images'] = wp_json_encode( array_map( 'esc_url_raw', $params['images'] ) );
    }

    if ( ! empty( $update ) ) {
        $wpdb->update( $wpdb->prefix . 'eb_listings', $update, array( 'id' => $id ) );
    }

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE id = %d", $id
    ), ARRAY_A );

    return new WP_REST_Response( eb_format_listing( $row ), 200 );
}

/** Delete listing (only owner) */
function eb_listings_delete( WP_REST_Request $request ) {
    global $wpdb;
    $id  = absint( $request['id'] );
    $uid = get_current_user_id();

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT user_id FROM {$wpdb->prefix}eb_listings WHERE id = %d", $id
    ) );

    if ( ! $row ) {
        return new WP_REST_Response( array( 'message' => 'Nicht gefunden.' ), 404 );
    }
    if ( (int) $row->user_id !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $wpdb->delete( $wpdb->prefix . 'eb_listings', array( 'id' => $id ) );
    $wpdb->delete( $wpdb->prefix . 'eb_reviews', array( 'listing_id' => $id ) );
    $wpdb->delete( $wpdb->prefix . 'eb_favorites', array( 'listing_id' => $id ) );

    return new WP_REST_Response( array( 'deleted' => true ), 200 );
}

/** My listings */
function eb_my_listings() {
    global $wpdb;
    $uid  = get_current_user_id();
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE user_id = %d ORDER BY created_at DESC",
        $uid
    ), ARRAY_A );

    return new WP_REST_Response( array_map( 'eb_format_listing', $rows ?: array() ), 200 );
}

/* =====================================================================
   REVIEWS HANDLERS
   ===================================================================== */
function eb_reviews_list( WP_REST_Request $request ) {
    global $wpdb;
    $listing_id = absint( $request['id'] );
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
         LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
         WHERE r.listing_id = %d ORDER BY r.created_at DESC",
        $listing_id
    ) );

    $reviews = array();
    foreach ( $rows as $r ) {
        $photo = get_user_meta( $r->uid, 'eb_photo_url', true );
        $name  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
        if ( ! $name ) $name = $r->display_name;
        $reviews[] = array(
            'id'          => (int) $r->id,
            'user_id'     => (int) $r->uid,
            'rating'      => (int) $r->rating,
            'text'        => $r->body,
            'comment'     => $r->body,
            'name'        => $name,
            'author_name' => $name,
            'avatar'      => $photo ?: ( 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . urlencode( $name ) ),
            'photo_url'   => $photo ?: '',
            'date'        => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            'created_at'  => $r->created_at,
        );
    }

    $response = new WP_REST_Response( $reviews, 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}

function eb_reviews_create( WP_REST_Request $request ) {
    global $wpdb;
    $listing_id = absint( $request['id'] );
    $uid        = get_current_user_id();
    $params     = $request->get_json_params();

    $rating = max( 1, min( 5, absint( $params['rating'] ?? 5 ) ) );
    $text   = sanitize_textarea_field( $params['comment'] ?? ( $params['text'] ?? '' ) );

    // Check listing exists
    $listing = $wpdb->get_row( $wpdb->prepare(
        "SELECT id, user_id FROM {$wpdb->prefix}eb_listings WHERE id = %d", $listing_id
    ) );
    if ( ! $listing ) {
        return new WP_REST_Response( array( 'message' => 'Inserat nicht gefunden.' ), 404 );
    }
    // Cannot review own listing
    if ( (int) $listing->user_id === $uid ) {
        return new WP_REST_Response( array( 'message' => 'Du kannst dein eigenes Inserat nicht bewerten.' ), 400 );
    }
    // Check duplicate
    $exists = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d AND user_id = %d",
        $listing_id, $uid
    ) );
    if ( $exists ) {
        return new WP_REST_Response( array( 'message' => 'Du hast dieses Inserat bereits bewertet.' ), 400 );
    }

    $wpdb->insert( $wpdb->prefix . 'eb_reviews', array(
        'listing_id'  => $listing_id,
        'user_id'     => $uid,
        'rating'      => $rating,
        'body'        => $text,
        'created_at'  => current_time( 'mysql' ),
    ) );

    // Update listing rating avg and count
    $stats = $wpdb->get_row( $wpdb->prepare(
        "SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM {$wpdb->prefix}eb_reviews WHERE listing_id = %d",
        $listing_id
    ) );
    $wpdb->update( $wpdb->prefix . 'eb_listings', array(
        'rating_avg'   => round( $stats->avg_r, 2 ),
        'review_count' => (int) $stats->cnt,
    ), array( 'id' => $listing_id ) );

    return new WP_REST_Response( array( 'saved' => true, 'rating_avg' => round( $stats->avg_r, 1 ), 'review_count' => (int) $stats->cnt ), 201 );
}

/* =====================================================================
   CONVERSATIONS / MESSAGES HANDLERS
   ===================================================================== */
function eb_conversations_list() {
    global $wpdb;
    $uid = get_current_user_id();

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT c.*,
            (SELECT COUNT(*) FROM {$wpdb->prefix}eb_messages m WHERE m.conversation_id = c.id AND m.sender_id != %d AND m.is_read = 0) as unread_count,
            (SELECT m2.body FROM {$wpdb->prefix}eb_messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.created_at DESC LIMIT 1) as last_msg,
            (SELECT m3.created_at FROM {$wpdb->prefix}eb_messages m3 WHERE m3.conversation_id = c.id ORDER BY m3.created_at DESC LIMIT 1) as last_msg_time
         FROM {$wpdb->prefix}eb_conversations c
         WHERE c.user_a = %d OR c.user_b = %d
         ORDER BY c.updated_at DESC",
        $uid, $uid, $uid
    ) );

    $conversations = array();
    foreach ( $rows as $c ) {
        $other_id = ( (int) $c->user_a === $uid ) ? (int) $c->user_b : (int) $c->user_a;
        $other    = get_userdata( $other_id );
        $name     = $other ? trim( $other->first_name . ' ' . $other->last_name ) : 'Unbekannt';
        $photo    = $other ? ( get_user_meta( $other_id, 'eb_photo_url', true ) ?: '' ) : '';
        $avatar   = $photo ?: ( 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . urlencode( $name ) );

        $time_str = '';
        if ( $c->last_msg_time ) {
            $ts     = strtotime( $c->last_msg_time );
            $today  = strtotime( 'today' );
            $time_str = $ts >= $today ? date( 'H:i', $ts ) : date_i18n( 'j. M', $ts );
        }

        $conversations[] = array(
            'id'           => (int) $c->id,
            'otherId'      => $other_id,
            'other_name'   => $name,
            'other_photo'  => $avatar,
            'name'         => $name,
            'avatar'       => $avatar,
            'lastMsg'      => $c->last_msg ?: '',
            'last_message' => $c->last_msg ?: '',
            'time'         => $time_str,
            'unread'       => (int) $c->unread_count,
            'unread_count' => (int) $c->unread_count,
            'updated_at'   => $c->last_msg_time ?: $c->updated_at,
            'listingId'    => $c->listing_id ? (int) $c->listing_id : null,
        );
    }

    return new WP_REST_Response( $conversations, 200 );
}

function eb_conversations_create( WP_REST_Request $request ) {
    global $wpdb;
    $uid    = get_current_user_id();
    $params = $request->get_json_params();

    $other_id   = absint( $params['other_user_id'] ?? ( $params['userId'] ?? 0 ) );
    $listing_id = absint( $params['listing_id'] ?? ( $params['listingId'] ?? 0 ) );

    if ( ! $other_id || $other_id === $uid ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Empfänger.' ), 400 );
    }
    if ( ! get_userdata( $other_id ) ) {
        return new WP_REST_Response( array( 'message' => 'Benutzer nicht gefunden.' ), 404 );
    }

    // Check if conversation already exists
    $existing = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_conversations
         WHERE (user_a = %d AND user_b = %d) OR (user_a = %d AND user_b = %d)",
        $uid, $other_id, $other_id, $uid
    ) );

    if ( $existing ) {
        return new WP_REST_Response( array( 'id' => (int) $existing, 'existing' => true ), 200 );
    }

    $wpdb->insert( $wpdb->prefix . 'eb_conversations', array(
        'user_a'     => $uid,
        'user_b'     => $other_id,
        'listing_id' => $listing_id ?: null,
        'updated_at' => current_time( 'mysql' ),
    ) );

    $conv_id = $wpdb->insert_id;

    // Add system message
    if ( $listing_id ) {
        $listing_title = $wpdb->get_var( $wpdb->prepare(
            "SELECT title FROM {$wpdb->prefix}eb_listings WHERE id = %d", $listing_id
        ) );
        if ( $listing_title ) {
            $wpdb->insert( $wpdb->prefix . 'eb_messages', array(
                'conversation_id' => $conv_id,
                'sender_id'       => 0,
                'body'            => 'Gespräch gestartet über „' . $listing_title . '"',
                'msg_type'        => 'system',
                'created_at'      => current_time( 'mysql' ),
            ) );
        }
    }

    return new WP_REST_Response( array( 'id' => (int) $conv_id, 'existing' => false ), 201 );
}

function eb_messages_list( WP_REST_Request $request ) {
    global $wpdb;
    $conv_id = absint( $request['id'] );
    $uid     = get_current_user_id();

    // Verify user is part of conversation
    $conv = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conv_id, $uid, $uid
    ) );
    if ( ! $conv ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    // Mark messages as read
    $wpdb->query( $wpdb->prepare(
        "UPDATE {$wpdb->prefix}eb_messages SET is_read = 1 WHERE conversation_id = %d AND sender_id != %d AND is_read = 0",
        $conv_id, $uid
    ) );

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d ORDER BY created_at ASC",
        $conv_id
    ) );

    $messages = array();
    foreach ( $rows as $m ) {
        $msg = array(
            'id'         => (int) $m->id,
            'type'       => (int) $m->sender_id === $uid ? 'sent' : ( $m->msg_type === 'system' ? 'system' : 'received' ),
            'text'       => $m->body,
            'content'    => $m->body,
            'time'       => date( 'H:i', strtotime( $m->created_at ) ),
            'created_at' => $m->created_at,
            'sender_id'  => (int) $m->sender_id,
        );
        if ( $m->msg_type === 'offer' ) {
            $msg['type']        = 'offer';
            $msg['amount']      = rtrim(rtrim(number_format((float)$m->offer_amount, 2, ',', ''), '0'), ',') . '€';
            $msg['status']      = $m->offer_status ?: 'pending';
            $msg['label']       = (int) $m->sender_id === $uid ? 'Dein Angebot' : 'Gegenangebot';
            $msg['statusLabel'] = $m->offer_status === 'accepted' ? 'Angenommen'
                : ( $m->offer_status === 'declined'
                    ? ( (int) $m->sender_id === $uid ? 'Zurückgezogen' : 'Abgelehnt' )
                    : 'Wartet auf Antwort' );
        }
        $messages[] = $msg;
    }

    return new WP_REST_Response( $messages, 200 );
}

function eb_messages_send( WP_REST_Request $request ) {
    global $wpdb;
    $conv_id = absint( $request['id'] );
    $uid     = get_current_user_id();
    $params  = $request->get_json_params();

    // Verify user is part of conversation
    $conv = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conv_id, $uid, $uid
    ) );
    if ( ! $conv ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    $body     = sanitize_textarea_field( $params['content'] ?? ( $params['text'] ?? '' ) );
    $msg_type = sanitize_text_field( $params['type'] ?? 'text' );

    if ( empty( $body ) && $msg_type === 'text' ) {
        return new WP_REST_Response( array( 'message' => 'Nachricht darf nicht leer sein.' ), 400 );
    }

    $insert = array(
        'conversation_id' => $conv_id,
        'sender_id'       => $uid,
        'body'            => $body,
        'msg_type'        => $msg_type,
    );

    if ( $msg_type === 'offer' ) {
        $insert['offer_amount'] = round( abs( floatval( $params['amount'] ?? 0 ) ), 2 );
        $insert['offer_status'] = 'pending';
        $insert['body']         = 'Preisangebot: ' . rtrim(rtrim(number_format($insert['offer_amount'], 2, ',', ''), '0'), ',') . '€';

        // Auto-decline all other pending offers in this conversation
        $wpdb->query( $wpdb->prepare(
            "UPDATE {$wpdb->prefix}eb_messages
             SET offer_status = 'declined'
             WHERE conversation_id = %d AND msg_type = 'offer' AND offer_status = 'pending'",
            $conv_id
        ) );
    }
    $insert['created_at'] = current_time( 'mysql' );

    $wpdb->insert( $wpdb->prefix . 'eb_messages', $insert );

    // Update conversation timestamp
    $wpdb->update( $wpdb->prefix . 'eb_conversations',
        array( 'updated_at' => current_time( 'mysql' ) ),
        array( 'id' => $conv_id )
    );

    return new WP_REST_Response( array(
        'id'         => (int) $wpdb->insert_id,
        'sent'       => true,
        'content'    => $body,
        'created_at' => current_time( 'mysql' ),
        'sender_id'  => $uid,
        'type'       => $msg_type,
    ), 201 );
}

/* =====================================================================
   OFFER STATUS UPDATE
   ===================================================================== */
function eb_offer_status_update( WP_REST_Request $request ) {
    global $wpdb;
    $msg_id = absint( $request['id'] );
    $uid    = get_current_user_id();
    $params = $request->get_json_params();
    $status = sanitize_text_field( $params['status'] ?? '' );

    if ( ! in_array( $status, array( 'accepted', 'declined' ), true ) ) {
        return new WP_REST_Response( array( 'message' => 'Ungültiger Status.' ), 400 );
    }

    // Allow declining an already-accepted offer (Widerruf)
    $allowed_from = $status === 'declined'
        ? array( 'pending', 'accepted' )
        : array( 'pending' );
    $placeholders = implode( ',', array_fill( 0, count( $allowed_from ), '%s' ) );
    $query_args   = array_merge( array( $msg_id ), $allowed_from );

    $msg = $wpdb->get_row( $wpdb->prepare(
        "SELECT m.*, c.user_a, c.user_b FROM {$wpdb->prefix}eb_messages m
         JOIN {$wpdb->prefix}eb_conversations c ON m.conversation_id = c.id
         WHERE m.id = %d AND m.msg_type = 'offer' AND m.offer_status IN ($placeholders)",
        $query_args
    ) );

    if ( ! $msg ) {
        return new WP_REST_Response( array( 'message' => 'Angebot nicht gefunden.' ), 404 );
    }

    if ( (int) $msg->user_a !== $uid && (int) $msg->user_b !== $uid ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }

    // Sender can only withdraw (decline) their own offer, not accept it
    if ( (int) $msg->sender_id === $uid && $status !== 'declined' ) {
        return new WP_REST_Response( array( 'message' => 'Eigenes Angebot kann nur zurückgezogen werden.' ), 400 );
    }

    $wpdb->update(
        $wpdb->prefix . 'eb_messages',
        array( 'offer_status' => $status ),
        array( 'id' => $msg_id )
    );

    // When accepting: auto-decline all OTHER pending offers in the same conversation
    if ( $status === 'accepted' ) {
        $wpdb->query( $wpdb->prepare(
            "UPDATE {$wpdb->prefix}eb_messages
             SET offer_status = 'declined'
             WHERE conversation_id = %d AND msg_type = 'offer' AND offer_status = 'pending' AND id != %d",
            $msg->conversation_id, $msg_id
        ) );
    }

    $was_accepted = $msg->offer_status === 'accepted';
    $is_own       = (int) $msg->sender_id === $uid;
    $amt_fmt      = rtrim(rtrim(number_format((float)$msg->offer_amount, 2, ',', ''), '0'), ',');
    if ( $status === 'accepted' ) {
        $sys_body = '✅ Angebot über ' . $amt_fmt . '€ angenommen!';
    } elseif ( $is_own ) {
        $sys_body = '🚫 Angebot über ' . $amt_fmt . '€ zurückgezogen.';
    } elseif ( $was_accepted ) {
        $sys_body = '↩️ Annahme widerrufen – Angebot über ' . $amt_fmt . '€ doch abgelehnt.';
    } else {
        $sys_body = '❌ Angebot über ' . $amt_fmt . '€ abgelehnt.';
    }

    $wpdb->insert( $wpdb->prefix . 'eb_messages', array(
        'conversation_id' => $msg->conversation_id,
        'sender_id'       => $uid,
        'body'            => $sys_body,
        'msg_type'        => 'system',
        'created_at'      => current_time( 'mysql' ),
    ) );

    $wpdb->update( $wpdb->prefix . 'eb_conversations',
        array( 'updated_at' => current_time( 'mysql' ) ),
        array( 'id' => $msg->conversation_id )
    );

    return new WP_REST_Response( array( 'success' => true, 'status' => $status ), 200 );
}

/* =====================================================================
   FAVORITES HANDLERS
   ===================================================================== */
function eb_favorites_list() {
    global $wpdb;
    $uid = get_current_user_id();

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT l.* FROM {$wpdb->prefix}eb_favorites f
         JOIN {$wpdb->prefix}eb_listings l ON f.listing_id = l.id
         WHERE f.user_id = %d ORDER BY f.created_at DESC",
        $uid
    ), ARRAY_A );

    return new WP_REST_Response( array_map( 'eb_format_listing', $rows ?: array() ), 200 );
}

function eb_favorites_toggle( WP_REST_Request $request ) {
    global $wpdb;
    $uid        = get_current_user_id();
    $listing_id = absint( $request['listing_id'] );

    $exists = $wpdb->get_var( $wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}eb_favorites WHERE user_id = %d AND listing_id = %d",
        $uid, $listing_id
    ) );

    if ( $exists ) {
        $wpdb->delete( $wpdb->prefix . 'eb_favorites', array( 'user_id' => $uid, 'listing_id' => $listing_id ) );
        return new WP_REST_Response( array( 'favorited' => false ), 200 );
    }

    $wpdb->insert( $wpdb->prefix . 'eb_favorites', array(
        'user_id'    => $uid,
        'listing_id' => $listing_id,
        'created_at' => current_time( 'mysql' ),
    ) );

    return new WP_REST_Response( array( 'favorited' => true ), 201 );
}

/* =====================================================================
   PUBLIC PROVIDER PROFILE
   ===================================================================== */
function eb_provider_profile( WP_REST_Request $request ) {
    global $wpdb;
    $provider_id = absint( $request['id'] );
    $user        = get_userdata( $provider_id );
    if ( ! $user ) {
        return new WP_REST_Response( array( 'message' => 'Anbieter nicht gefunden.' ), 404 );
    }

    $name   = trim( $user->first_name . ' ' . $user->last_name );
    $meta   = eb_user_profile_meta( $provider_id );
    $role   = eventboerse_map_role( $user );
    $since  = date( 'Y', strtotime( $user->user_registered ) );

    // Listings by this provider
    $listings = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_listings WHERE user_id = %d AND status = 'active' ORDER BY created_at DESC",
        $provider_id
    ), ARRAY_A );

    // Reviews on their listings
    $listing_ids = wp_list_pluck( $listings, 'id' );
    $listing_titles = array();
    foreach ( $listings as $l ) {
        $listing_titles[ (int) $l['id'] ] = $l['title'];
    }
    $reviews     = array();
    if ( ! empty( $listing_ids ) ) {
        $id_placeholders = implode( ',', array_fill( 0, count( $listing_ids ), '%d' ) );
        $reviews = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT r.*, u.display_name, u.ID as uid FROM {$wpdb->prefix}eb_reviews r
                 LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
                 WHERE r.listing_id IN ($id_placeholders) ORDER BY r.created_at DESC",
                $listing_ids
            )
        );
    }

    $formatted_reviews = array();
    foreach ( $reviews as $r ) {
        $rname  = trim( get_user_meta( $r->uid, 'first_name', true ) . ' ' . get_user_meta( $r->uid, 'last_name', true ) );
        $rphoto = get_user_meta( $r->uid, 'eb_photo_url', true );
        $formatted_reviews[] = array(
            'user_id'      => (int) $r->uid,
            'rating'       => (int) $r->rating,
            'text'         => $r->body,
            'name'         => $rname ?: $r->display_name,
            'avatar'       => $rphoto ?: ( 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . urlencode( $rname ?: $r->display_name ) ),
            'date'         => date_i18n( 'j. F Y', strtotime( $r->created_at ) ),
            'listingTitle' => isset( $listing_titles[ (int) $r->listing_id ] ) ? $listing_titles[ (int) $r->listing_id ] : '',
        );
    }

    $response = new WP_REST_Response( array(
        'id'       => $provider_id,
        'name'     => $name,
        'role'     => $role,
        'since'    => $since,
        'tagline'  => $meta['tagline'],
        'location' => $meta['location'],
        'bio'      => $meta['bio'],
        'coverUrl' => $meta['coverUrl'],
        'coverPosY'=> $meta['coverPosY'],
        'photoUrl' => $meta['photoUrl'],
        'gallery'  => $meta['gallery'],
        'listings' => array_map( 'eb_format_listing', $listings ),
        'reviews'  => $formatted_reviews,
    ), 200 );
    $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
    $response->header( 'Pragma', 'no-cache' );
    return $response;
}

/* =====================================================================
   ALLOW BIGGER UPLOADS
   ===================================================================== */
add_filter( 'upload_size_limit', function() {
    return 5 * 1024 * 1024; // 5 MB
} );
