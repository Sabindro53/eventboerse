# Backend: Alle REST API Endpoints

**Datei:** `functions.php` | **Zeilen:** ~4.429 | **Endpoints:** 67 total
**Base URL:** `/wp-json/eventboerse/v1/`

## Authentifizierung (9 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/register` | Nutzer registrieren |
| POST | `/register/verify` | E-Mail verifizieren |
| POST | `/register/resend` | Verifikation erneut senden |
| POST | `/login` | Einloggen |
| POST | `/logout` | Ausloggen |
| GET | `/me` | Eingeloggter Nutzer |
| POST | `/forgot-password` | Passwort vergessen |
| POST | `/verify-email` | E-Mail bestätigen |
| POST | `/reset-password` | Passwort zurücksetzen |

→ [[Backend/Auth-API]] | [[Features/Authentication]]

## Nutzer-Verwaltung (4 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET/PUT | `/profile` | Profil lesen/aktualisieren |
| GET/PUT | `/settings` | Einstellungen |
| POST | `/settings/password` | Passwort ändern |
| DELETE | `/settings/delete-account` | Account löschen |
| POST/DELETE | `/settings/2fa` | 2FA aktivieren/deaktivieren |

## WebAuthn / Passkeys (8 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/webauthn/register-options` | Registrierungsoptionen |
| POST | `/webauthn/register` | Passkey registrieren |
| POST | `/webauthn/verify-register` | Registrierung verifizieren |
| POST | `/webauthn/login-options` | Login-Optionen |
| POST | `/webauthn/login` | Mit Passkey einloggen |
| POST | `/webauthn/verify-options` | Optionen verifizieren |
| GET | `/webauthn/credentials` | Alle Passkeys |
| DELETE | `/webauthn/credentials/{id}` | Passkey löschen |

→ [[Backend/WebAuthn-API]]

## 2FA / OTP (2 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/otp/send` | OTP per E-Mail senden |
| POST | `/otp/verify` | OTP verifizieren |

## Listings & Services (5 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/listings` | Alle Listings laden |
| POST | `/listings` | Neues Listing erstellen |
| GET | `/listings/{id}` | Einzelnes Listing |
| PUT | `/listings/{id}` | Listing aktualisieren |
| GET | `/my-listings` | Eigene Listings |
| GET | `/listings/{id}/reviews` | Bewertungen eines Listings |

→ [[Backend/Listings-API]] | [[Features/Listings]]

## Messaging & Verhandlung (5 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/conversations` | Alle Konversationen |
| POST | `/conversations` | Neue Konversation starten |
| GET | `/conversations/{id}/messages` | Nachrichten laden |
| PUT | `/messages/{id}` | Nachricht aktualisieren |
| PUT | `/messages/{id}/offer-status` | Angebotsstatus ändern |

→ [[Backend/Messaging-API]] | [[Features/Messaging]]

## Bewertungen (2 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/reviews/{id}` | Bewertung lesen |
| POST/PUT | `/reviews/{id}` | Bewertung schreiben/aktualisieren |

→ [[Features/Reviews]]

## Zahlungen / Stripe (7 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/send-invoice` | Rechnung per E-Mail |
| POST | `/stripe/create-checkout` | Checkout Session erstellen |
| GET | `/stripe/public-key` | Stripe Public Key |
| POST | `/stripe/create-payment-intent` | Payment Intent erstellen |
| POST | `/stripe/verify-payment` | Zahlung verifizieren |
| POST | `/stripe/webhook` | Stripe Webhooks empfangen |
| POST | `/stripe/reconcile` | Zahlungen abgleichen |

→ [[Backend/Payment-API]] | [[Features/Payments]]

## Favoriten (2 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET/POST | `/favorites` | Favoriten laden/hinzufügen |
| GET/DELETE | `/favorites/{listing_id}` | Favorit prüfen/entfernen |

## Admin (13 Endpoints)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/admin/users` | Alle Nutzer |
| GET/PUT | `/admin/user-tags` | Nutzer-Tags |
| GET | `/admin/all-tags` | Alle Tags |
| DELETE | `/admin/delete-user/{id}` | Nutzer löschen |
| POST | `/admin/make-admin` | Admin-Rolle vergeben |
| GET | `/admin/list-admins` | Alle Admins |
| POST | `/admin/init` | System initialisieren |
| POST | `/admin/change-role` | Rolle wechseln |
| POST | `/admin/revoke-admin` | Admin-Rolle entziehen |
| POST | `/admin/toggle-active` | Account aktivieren/deaktivieren |
| GET/POST | `/admin/smtp` | SMTP-Konfiguration |
| POST | `/admin/reset` | System zurücksetzen |

→ [[Backend/Admin-API]] | [[Features/Admin]]

## Utilities (diverse)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/upload` | Medien hochladen |
| GET | `/heartbeat` | API-Status prüfen |
| GET | `/offline` | Offline-Status |
| GET | `/user-status/{id}` | Nutzer-Online-Status |
| GET | `/provider/{id}` | Provider-Profil |
| GET | `/diagnostics` | System-Diagnostik |
| POST | `/diagnostics/test-mail` | Mail-Test |
| GET | `/board-projects` | Board-Projekte |
| GET/POST | `/registrations` | Registrierungen |
| GET | `/registrations/{id}` | Einzelne Registrierung |
