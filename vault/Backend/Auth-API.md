# Backend: Auth API

**Datei:** `functions.php` | **Base:** `/wp-json/eventboerse/v1/`

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/register` | Account anlegen, Verifikations-E-Mail senden |
| POST | `/register/verify` | Token aus E-Mail bestätigen |
| POST | `/register/resend` | Verifikations-E-Mail erneut senden |
| POST | `/login` | Login → Session-Token oder `2fa_required` |
| POST | `/logout` | Session beenden |
| GET | `/me` | Eingeloggten Nutzer abrufen |
| POST | `/forgot-password` | Reset-Link per E-Mail |
| POST | `/verify-email` | E-Mail-Adresse verifizieren |
| POST | `/reset-password` | Neues Passwort setzen |

## Nutzer-Rollen

| Rolle | Beschreibung |
|-------|--------------|
| `event_planer` | Sucht Dienstleister, bucht Services |
| `dienstleister` | Bietet Services an, erstellt Listings |
| `administrator` | Vollzugriff, User-Verwaltung |

## Verknüpfte Notizen
- [[Backend/API-Endpoints]] — Alle Endpoints
- [[Features/Authentication]] — Frontend Auth-Flow
- [[Backend/WebAuthn-API]] — Passkey Login
