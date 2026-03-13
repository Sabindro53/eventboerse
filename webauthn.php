<?php
/**
 * Eventbörse – WebAuthn Helper
 *
 * Minimal helper for passkey registration and authentication without
 * external Composer dependencies. Designed for shared hosting.
 *
 * @package Eventboerse
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function eb_base64url_encode( $data ) {
    return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
}

function eb_base64url_decode( $data ) {
    $data = strtr( (string) $data, '-_', '+/' );
    $pad  = strlen( $data ) % 4;
    if ( $pad ) {
        $data .= str_repeat( '=', 4 - $pad );
    }
    return base64_decode( $data, true );
}

function eb_webauthn_rp_id() {
    return wp_parse_url( home_url(), PHP_URL_HOST );
}

function eb_webauthn_origin() {
    $scheme = is_ssl() ? 'https' : 'http';
    $host   = eb_webauthn_rp_id();
    $port   = wp_parse_url( home_url(), PHP_URL_PORT );

    if ( empty( $port ) ) {
        return $scheme . '://' . $host;
    }

    return $scheme . '://' . $host . ':' . (int) $port;
}

function eb_webauthn_generate_challenge( $length = 32 ) {
    return random_bytes( max( 16, (int) $length ) );
}

function eb_webauthn_challenge_key( $scope, $identifier ) {
    return 'eb_webauthn_' . sanitize_key( $scope ) . '_' . md5( (string) $identifier );
}

function eb_webauthn_store_challenge( $scope, $identifier, $challenge, $ttl = 300 ) {
    set_transient( eb_webauthn_challenge_key( $scope, $identifier ), array(
        'challenge'  => eb_base64url_encode( $challenge ),
        'created_at' => time(),
    ), max( 60, (int) $ttl ) );
}

function eb_webauthn_get_challenge( $scope, $identifier ) {
    $payload = get_transient( eb_webauthn_challenge_key( $scope, $identifier ) );
    if ( ! is_array( $payload ) || empty( $payload['challenge'] ) ) {
        return false;
    }

    return eb_base64url_decode( $payload['challenge'] );
}

function eb_webauthn_consume_challenge( $scope, $identifier ) {
    $key       = eb_webauthn_challenge_key( $scope, $identifier );
    $challenge = eb_webauthn_get_challenge( $scope, $identifier );
    delete_transient( $key );
    return $challenge;
}

function eb_webauthn_get_credentials( $user_id ) {
    $credentials = get_user_meta( $user_id, 'eb_webauthn_credentials', true );
    return is_array( $credentials ) ? array_values( $credentials ) : array();
}

function eb_webauthn_save_credentials( $user_id, $credentials ) {
    update_user_meta( $user_id, 'eb_webauthn_credentials', array_values( $credentials ) );
}

function eb_webauthn_add_credential( $user_id, $credential ) {
    $credentials   = eb_webauthn_get_credentials( $user_id );
    $credential_id = isset( $credential['credential_id'] ) ? (string) $credential['credential_id'] : '';

    if ( empty( $credential_id ) ) {
        return new WP_Error( 'missing_credential_id', 'Credential-ID fehlt.' );
    }

    foreach ( $credentials as $index => $existing ) {
        if ( ! empty( $existing['credential_id'] ) && hash_equals( (string) $existing['credential_id'], $credential_id ) ) {
            $credentials[ $index ] = array_merge( $existing, $credential );
            eb_webauthn_save_credentials( $user_id, $credentials );
            return true;
        }
    }

    $credentials[] = $credential;
    eb_webauthn_save_credentials( $user_id, $credentials );
    return true;
}

function eb_webauthn_delete_credential( $user_id, $credential_id ) {
    $credentials = eb_webauthn_get_credentials( $user_id );
    $filtered    = array();

    foreach ( $credentials as $credential ) {
        if ( empty( $credential['credential_id'] ) || ! hash_equals( (string) $credential['credential_id'], (string) $credential_id ) ) {
            $filtered[] = $credential;
        }
    }

    eb_webauthn_save_credentials( $user_id, $filtered );
}

function eb_webauthn_find_user_by_credential_id( $credential_id ) {
    $users = get_users( array(
        'fields'     => array( 'ID' ),
        'number'     => 500,
        'meta_query' => array(
            array(
                'key'     => 'eb_webauthn_credentials',
                'compare' => 'EXISTS',
            ),
        ),
    ) );

    foreach ( $users as $user ) {
        foreach ( eb_webauthn_get_credentials( $user->ID ) as $credential ) {
            if ( ! empty( $credential['credential_id'] ) && hash_equals( (string) $credential['credential_id'], (string) $credential_id ) ) {
                return array(
                    'user_id'     => (int) $user->ID,
                    'credential'  => $credential,
                );
            }
        }
    }

    return false;
}

function eb_webauthn_public_credentials( $user_id ) {
    $public = array();
    foreach ( eb_webauthn_get_credentials( $user_id ) as $credential ) {
        $public[] = array(
            'credential_id' => isset( $credential['credential_id'] ) ? $credential['credential_id'] : '',
            'label'         => ! empty( $credential['label'] ) ? $credential['label'] : 'Passkey',
            'created_at'    => ! empty( $credential['created_at'] ) ? $credential['created_at'] : '',
            'last_used_at'  => ! empty( $credential['last_used_at'] ) ? $credential['last_used_at'] : '',
            'transports'    => ! empty( $credential['transports'] ) && is_array( $credential['transports'] ) ? array_values( $credential['transports'] ) : array(),
        );
    }
    return $public;
}

function eb_webauthn_user_has_credentials( $user_id ) {
    return count( eb_webauthn_get_credentials( $user_id ) ) > 0;
}

function eb_webauthn_sha256( $data ) {
    return hash( 'sha256', $data, true );
}

function eb_webauthn_read_uint16( $bytes ) {
    $parts = unpack( 'n', $bytes );
    return (int) $parts[1];
}

function eb_webauthn_read_uint32( $bytes ) {
    $parts = unpack( 'N', $bytes );
    return (int) $parts[1];
}

function eb_webauthn_cbor_read_length( $data, &$offset, $additional_info ) {
    if ( $additional_info < 24 ) {
        return $additional_info;
    }

    if ( 24 === $additional_info ) {
        $value  = ord( $data[ $offset ] );
        $offset += 1;
        return $value;
    }

    if ( 25 === $additional_info ) {
        $value  = eb_webauthn_read_uint16( substr( $data, $offset, 2 ) );
        $offset += 2;
        return $value;
    }

    if ( 26 === $additional_info ) {
        $value  = eb_webauthn_read_uint32( substr( $data, $offset, 4 ) );
        $offset += 4;
        return $value;
    }

    return null;
}

function eb_webauthn_cbor_decode_item( $data, &$offset ) {
    $initial = ord( $data[ $offset ] );
    $offset += 1;

    $major_type      = $initial >> 5;
    $additional_info = $initial & 0x1f;

    if ( 0 === $major_type ) {
        return eb_webauthn_cbor_read_length( $data, $offset, $additional_info );
    }

    if ( 1 === $major_type ) {
        $value = eb_webauthn_cbor_read_length( $data, $offset, $additional_info );
        return -1 - $value;
    }

    if ( 2 === $major_type || 3 === $major_type ) {
        $length = eb_webauthn_cbor_read_length( $data, $offset, $additional_info );
        $value  = substr( $data, $offset, $length );
        $offset += $length;
        return ( 3 === $major_type ) ? $value : $value;
    }

    if ( 4 === $major_type ) {
        $length = eb_webauthn_cbor_read_length( $data, $offset, $additional_info );
        $items  = array();
        for ( $i = 0; $i < $length; $i++ ) {
            $items[] = eb_webauthn_cbor_decode_item( $data, $offset );
        }
        return $items;
    }

    if ( 5 === $major_type ) {
        $length = eb_webauthn_cbor_read_length( $data, $offset, $additional_info );
        $map    = array();
        for ( $i = 0; $i < $length; $i++ ) {
            $key         = eb_webauthn_cbor_decode_item( $data, $offset );
            $map[ $key ] = eb_webauthn_cbor_decode_item( $data, $offset );
        }
        return $map;
    }

    if ( 7 === $major_type ) {
        if ( 20 === $additional_info ) {
            return false;
        }
        if ( 21 === $additional_info ) {
            return true;
        }
        if ( 22 === $additional_info ) {
            return null;
        }
    }

    return null;
}

function eb_webauthn_cbor_decode( $data ) {
    $offset = 0;
    return eb_webauthn_cbor_decode_item( $data, $offset );
}

function eb_webauthn_parse_authenticator_data( $binary ) {
    if ( strlen( $binary ) < 37 ) {
        return new WP_Error( 'invalid_auth_data', 'Authenticator-Daten sind unvollständig.' );
    }

    $rp_id_hash = substr( $binary, 0, 32 );
    $flags      = ord( $binary[32] );
    $sign_count = eb_webauthn_read_uint32( substr( $binary, 33, 4 ) );
    $offset     = 37;
    $result     = array(
        'rp_id_hash'            => $rp_id_hash,
        'flags'                 => $flags,
        'sign_count'            => $sign_count,
        'user_present'          => (bool) ( $flags & 0x01 ),
        'user_verified'         => (bool) ( $flags & 0x04 ),
        'has_attested_data'     => (bool) ( $flags & 0x40 ),
        'has_extensions'        => (bool) ( $flags & 0x80 ),
        'credential_id_binary'  => null,
        'credential_public_key' => null,
    );

    if ( $result['has_attested_data'] ) {
        if ( strlen( $binary ) < $offset + 18 ) {
            return new WP_Error( 'invalid_attested_data', 'Attested Credential Data ist unvollständig.' );
        }

        $offset += 16; // AAGUID.
        $credential_id_len = eb_webauthn_read_uint16( substr( $binary, $offset, 2 ) );
        $offset           += 2;

        $credential_id = substr( $binary, $offset, $credential_id_len );
        $offset       += $credential_id_len;

        $credential_public_key = substr( $binary, $offset );

        $result['credential_id_binary']  = $credential_id;
        $result['credential_public_key'] = $credential_public_key;
    }

    return $result;
}

function eb_webauthn_der_encode_length( $length ) {
    if ( $length < 128 ) {
        return chr( $length );
    }

    $bytes = '';
    while ( $length > 0 ) {
        $bytes  = chr( $length & 0xff ) . $bytes;
        $length = $length >> 8;
    }

    return chr( 0x80 | strlen( $bytes ) ) . $bytes;
}

function eb_webauthn_der_encode_integer( $value ) {
    if ( '' === $value ) {
        $value = "\x00";
    }
    if ( ord( $value[0] ) > 0x7f ) {
        $value = "\x00" . $value;
    }
    return "\x02" . eb_webauthn_der_encode_length( strlen( $value ) ) . $value;
}

function eb_webauthn_der_to_pem( $der, $label ) {
    return "-----BEGIN " . $label . "-----\n"
        . chunk_split( base64_encode( $der ), 64, "\n" )
        . "-----END " . $label . "-----\n";
}

function eb_webauthn_cose_to_pem( $cose_key_binary ) {
    $cose = eb_webauthn_cbor_decode( $cose_key_binary );
    if ( ! is_array( $cose ) || empty( $cose[1] ) ) {
        return new WP_Error( 'invalid_cose_key', 'COSE-Key konnte nicht gelesen werden.' );
    }

    if ( 2 !== (int) $cose[1] ) {
        return new WP_Error( 'unsupported_cose_key', 'Nur EC2-Passkeys werden aktuell unterstützt.' );
    }

    $x = isset( $cose[-2] ) ? $cose[-2] : '';
    $y = isset( $cose[-3] ) ? $cose[-3] : '';

    if ( 32 !== strlen( $x ) || 32 !== strlen( $y ) ) {
        return new WP_Error( 'invalid_ec_point', 'Öffentlicher Schlüssel ist ungültig.' );
    }

    $uncompressed = "\x04" . $x . $y;
    $algorithm    = hex2bin( '301306072a8648ce3d020106082a8648ce3d030107' );
    $bit_string   = "\x03" . eb_webauthn_der_encode_length( strlen( $uncompressed ) + 1 ) . "\x00" . $uncompressed;
    $spki         = "\x30" . eb_webauthn_der_encode_length( strlen( $algorithm . $bit_string ) ) . $algorithm . $bit_string;

    return eb_webauthn_der_to_pem( $spki, 'PUBLIC KEY' );
}

function eb_webauthn_signature_to_der( $signature ) {
    if ( strlen( $signature ) < 64 ) {
        return $signature;
    }

    $r = substr( $signature, 0, 32 );
    $s = substr( $signature, 32, 32 );
    $r = ltrim( $r, "\x00" );
    $s = ltrim( $s, "\x00" );

    $encoded_r = eb_webauthn_der_encode_integer( $r );
    $encoded_s = eb_webauthn_der_encode_integer( $s );
    $sequence  = $encoded_r . $encoded_s;

    return "\x30" . eb_webauthn_der_encode_length( strlen( $sequence ) ) . $sequence;
}

function eb_webauthn_verify_client_data( $client_data_json, $expected_type, $expected_challenge, $expected_origin ) {
    $client_data = json_decode( $client_data_json, true );
    if ( ! is_array( $client_data ) ) {
        return new WP_Error( 'invalid_client_data', 'Client-Daten sind ungültig.' );
    }

    if ( empty( $client_data['type'] ) || $client_data['type'] !== $expected_type ) {
        return new WP_Error( 'invalid_client_type', 'WebAuthn-Typ stimmt nicht.' );
    }

    if ( empty( $client_data['challenge'] ) ) {
        return new WP_Error( 'missing_challenge', 'Challenge fehlt.' );
    }

    $challenge = eb_base64url_decode( $client_data['challenge'] );
    if ( false === $challenge || ! hash_equals( $expected_challenge, $challenge ) ) {
        return new WP_Error( 'challenge_mismatch', 'Challenge stimmt nicht.' );
    }

    if ( empty( $client_data['origin'] ) || $client_data['origin'] !== $expected_origin ) {
        return new WP_Error( 'origin_mismatch', 'Origin stimmt nicht.' );
    }

    if ( ! empty( $client_data['crossOrigin'] ) ) {
        return new WP_Error( 'cross_origin_not_allowed', 'Cross-Origin WebAuthn ist nicht erlaubt.' );
    }

    return $client_data;
}

function eb_webauthn_verify_registration_response( $payload, $expected_challenge, $expected_origin, $expected_rp_id ) {
    $credential_id     = isset( $payload['id'] ) ? sanitize_text_field( $payload['id'] ) : '';
    $client_data_json  = isset( $payload['response']['clientDataJSON'] ) ? eb_base64url_decode( $payload['response']['clientDataJSON'] ) : false;
    $attestation_bytes = isset( $payload['response']['attestationObject'] ) ? eb_base64url_decode( $payload['response']['attestationObject'] ) : false;

    if ( empty( $credential_id ) || false === $client_data_json || false === $attestation_bytes ) {
        return new WP_Error( 'invalid_registration_payload', 'Registrierungsdaten sind unvollständig.' );
    }

    $client_data = eb_webauthn_verify_client_data( $client_data_json, 'webauthn.create', $expected_challenge, $expected_origin );
    if ( is_wp_error( $client_data ) ) {
        return $client_data;
    }

    $attestation = eb_webauthn_cbor_decode( $attestation_bytes );
    if ( ! is_array( $attestation ) || empty( $attestation['authData'] ) ) {
        return new WP_Error( 'invalid_attestation', 'Attestation konnte nicht gelesen werden.' );
    }

    $auth_data = eb_webauthn_parse_authenticator_data( $attestation['authData'] );
    if ( is_wp_error( $auth_data ) ) {
        return $auth_data;
    }

    if ( ! hash_equals( eb_webauthn_sha256( $expected_rp_id ), $auth_data['rp_id_hash'] ) ) {
        return new WP_Error( 'rp_id_mismatch', 'RP-ID stimmt nicht.' );
    }

    if ( empty( $auth_data['user_present'] ) ) {
        return new WP_Error( 'user_not_present', 'Nutzerbestätigung fehlt.' );
    }

    if ( empty( $auth_data['user_verified'] ) ) {
        return new WP_Error( 'user_not_verified', 'Biometrische Verifizierung wurde nicht bestätigt.' );
    }

    $public_key_pem = eb_webauthn_cose_to_pem( $auth_data['credential_public_key'] );
    if ( is_wp_error( $public_key_pem ) ) {
        return $public_key_pem;
    }

    return array(
        'credential_id'      => $credential_id,
        'credential_id_b64'  => eb_base64url_encode( $auth_data['credential_id_binary'] ),
        'public_key_pem'     => $public_key_pem,
        'sign_count'         => (int) $auth_data['sign_count'],
        'transports'         => ! empty( $payload['response']['transports'] ) && is_array( $payload['response']['transports'] ) ? array_values( $payload['response']['transports'] ) : array(),
        'aaguid_attestation' => ! empty( $attestation['fmt'] ) ? sanitize_text_field( $attestation['fmt'] ) : 'none',
    );
}

function eb_webauthn_verify_authentication_response( $payload, $credential, $expected_challenge, $expected_origin, $expected_rp_id ) {
    $client_data_json     = isset( $payload['response']['clientDataJSON'] ) ? eb_base64url_decode( $payload['response']['clientDataJSON'] ) : false;
    $authenticator_data   = isset( $payload['response']['authenticatorData'] ) ? eb_base64url_decode( $payload['response']['authenticatorData'] ) : false;
    $signature            = isset( $payload['response']['signature'] ) ? eb_base64url_decode( $payload['response']['signature'] ) : false;
    $stored_public_key    = isset( $credential['public_key_pem'] ) ? $credential['public_key_pem'] : '';
    $stored_sign_count    = isset( $credential['sign_count'] ) ? (int) $credential['sign_count'] : 0;

    if ( false === $client_data_json || false === $authenticator_data || false === $signature || empty( $stored_public_key ) ) {
        return new WP_Error( 'invalid_authentication_payload', 'Authentifizierungsdaten sind unvollständig.' );
    }

    $client_data = eb_webauthn_verify_client_data( $client_data_json, 'webauthn.get', $expected_challenge, $expected_origin );
    if ( is_wp_error( $client_data ) ) {
        return $client_data;
    }

    $auth_data = eb_webauthn_parse_authenticator_data( $authenticator_data );
    if ( is_wp_error( $auth_data ) ) {
        return $auth_data;
    }

    if ( ! hash_equals( eb_webauthn_sha256( $expected_rp_id ), $auth_data['rp_id_hash'] ) ) {
        return new WP_Error( 'rp_id_mismatch', 'RP-ID stimmt nicht.' );
    }

    if ( empty( $auth_data['user_present'] ) ) {
        return new WP_Error( 'user_not_present', 'Nutzerbestätigung fehlt.' );
    }

    if ( empty( $auth_data['user_verified'] ) ) {
        return new WP_Error( 'user_not_verified', 'Biometrische Verifizierung wurde nicht bestätigt.' );
    }

    $signed_data = $authenticator_data . eb_webauthn_sha256( $client_data_json );
    $signature   = eb_webauthn_signature_to_der( $signature );
    $verified    = openssl_verify( $signed_data, $signature, $stored_public_key, OPENSSL_ALGO_SHA256 );

    if ( 1 !== $verified ) {
        return new WP_Error( 'invalid_signature', 'Passkey-Signatur konnte nicht verifiziert werden.' );
    }

    if ( $stored_sign_count > 0 && $auth_data['sign_count'] > 0 && $auth_data['sign_count'] <= $stored_sign_count ) {
        return new WP_Error( 'sign_count_invalid', 'Signaturzähler ist ungültig.' );
    }

    return array(
        'sign_count'   => (int) $auth_data['sign_count'],
        'last_used_at' => current_time( 'mysql' ),
    );
}
