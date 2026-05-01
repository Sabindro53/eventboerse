# Features: Authentifizierung

## Überblick

Das Auth-System unterstützt drei Login-Methoden:
1. **Klassisch:** E-Mail + Passwort + optionale 2FA
2. **WebAuthn:** Passkeys (Fingerprint, Face ID, Hardware-Key)
3. **2FA:** OTP-Code per E-Mail

## Registrierungs-Flow

```
1. Formular ausfüllen (Name, E-Mail, Passwort, Rolle)
       ↓
2. POST /register → Account erstellt, E-Mail gesendet
       ↓
3. POST /register/verify (Token aus E-Mail)
       ↓
4. Account aktiv, automatischer Login
```

## Login-Flow

```
Standard:
POST /login → Session-Token zurück

Mit 2FA:
POST /login → "2fa_required" Response
       ↓
POST /otp/send → OTP-E-Mail
       ↓
POST /otp/verify → Session-Token

Mit WebAuthn:
POST /webauthn/login-options → Challenge
       ↓
Browser: Passkey-Assertion
       ↓
POST /webauthn/login → Session-Token
```

## Nutzer-Rollen

| Rolle | Beschreibung |
|-------|--------------|
| `event_planer` | Sucht nach Dienstleistern, bucht Services |
| `dienstleister` | Bietet Services an, erstellt Listings |
| `administrator` | Vollzugriff, verwaltet alle Nutzer |

## Sicherheitsfeatures

- E-Mail-Verifizierung bei Registrierung
- TOTP / OTP-Codes per E-Mail für 2FA
- WebAuthn / FIDO2 für passwortlose Anmeldung
- Passwort-Reset via E-Mail-Link
- Account kann deaktiviert werden (Admin)

## Betroffene Dateien

- **Frontend:** `app.js` (Auth-Modul, Login/Register Forms)
- **Backend:** `functions.php` (/register, /login, /logout Endpoints)
- **WebAuthn:** `webauthn.php` (FIDO2 Bibliothek)

## Verknüpfte Notizen
- [[Backend/Auth-API]] - API Endpoints
- [[Backend/WebAuthn-API]] - Passkey Endpoints
- [[Architecture/Overview]] - System-Übersicht
- [[Features/Listings]] — Nach Login: Services entdecken
- [[Features/Admin]] — Admin Nutzerverwaltung
