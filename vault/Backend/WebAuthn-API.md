# Backend: WebAuthn / Passkeys API

**Datei:** `webauthn.php` (inkludiert von `functions.php`) | **Base:** `/wp-json/eventboerse/v1/webauthn/`

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/webauthn/register-options` | Challenge für neuen Passkey generieren |
| POST | `/webauthn/register` | Passkey registrieren |
| POST | `/webauthn/verify-register` | Registrierung verifizieren |
| POST | `/webauthn/login-options` | Challenge für Login generieren |
| POST | `/webauthn/login` | Mit Passkey einloggen |
| POST | `/webauthn/verify-options` | Optionen verifizieren |
| GET | `/webauthn/credentials` | Alle registrierten Passkeys des Nutzers |
| DELETE | `/webauthn/credentials/{id}` | Passkey löschen |

## Implementierung

- Kein Composer, keine externen Dependencies
- Challenge-Speicherung via WordPress Transients (TTL: 5 Min)
- CBOR-Decoding für Authenticator-Antworten
- Unterstützt: Fingerprint, Face ID, Hardware-Keys (YubiKey)

## Verknüpfte Notizen
- [[Backend/Auth-API]] — Klassischer Login
- [[Features/Authentication]] — Frontend Passkey-Flow
- [[Backend/API-Endpoints]] — Alle Endpoints
