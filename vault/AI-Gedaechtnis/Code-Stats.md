# Code-Statistiken (Auto-Generated)

> Letztes Update: 2026-06-06

## Dateigrößen

| Datei | Zeilen | Größe |
|-------|--------|-------|
| app.js | 20.769 | 918 KB |
| functions.php | 6.741 | 296 KB |
| styles.css | 14.716 | 421 KB |
| index.php | 3.934 | 251 KB |
| index.html | 3.537 | 227 KB |
| webauthn.php | 536 | 19 KB |

## REST API Endpoints (80 Registrierungen gefunden)

- `/admin/all-tags`
- `/admin/bot-accept-inquiry`
- `/admin/change-role`
- `/admin/delete-user/(?P<id>\d+)`
- `/admin/hide-demo`
- `/admin/init`
- `/admin/list-admins`
- `/admin/make-admin`
- `/admin/reset`
- `/admin/revoke-admin`
- `/admin/seed-test-listing`
- `/admin/smtp`
- `/admin/toggle-demo`
- `/admin/toggle-active`
- `/admin/user-tags`
- `/admin/users`
- `/ai-office/health`
- `/board-bookings`
- `/board-bookings/update-card`
- `/board-projects`
- `/conversations`
- `/conversations/(?P<id>\d+)/messages`
- `/diagnostics`
- `/diagnostics/test-mail`
- `/favorites`
- `/favorites/(?P<listing_id>\d+)`
- `/forgot-password`
- `/heartbeat`
- `/listings`
- `/listings/(?P<id>\d+)`
- `/listings/(?P<id>\d+)/reviews`
- `/login`
- `/logout`
- `/me`
- `/messages/(?P<id>\d+)`
- `/messages/(?P<id>\d+)/offer-status`
- `/my-listings`
- `/offline`
- `/otp/send`
- `/otp/verify`
- `/profile`
- `/provider/(?P<id>\d+)`
- `/register`
- `/register/resend`
- `/register/verify`
- `/registrations`
- `/registrations/(?P<id>\d+)`
- `/resend-verification`
- `/reset-password`
- `/reviews/(?P<id>\d+)`
- `/send-invoice`
- `/settings`
- `/settings/2fa`
- `/settings/delete-account`
- `/settings/password`
- `/stripe/connect/diagnostics`
- `/stripe/connect/disconnect`
- `/stripe/connect/onboard`
- `/stripe/connect/status`
- `/stripe/create-checkout`
- `/stripe/create-payment-intent`
- `/stripe/create-payment-intent-admin`
- `/stripe/fee-quote`
- `/stripe/payment-domain/register`
- `/stripe/public-key`
- `/stripe/reconcile`
- `/stripe/verify-payment`
- `/stripe/webhook`
- `/upload`
- `/user-status/(?P<id>\d+)`
- `/verify-email`
- `/webauthn/credentials`
- `/webauthn/credentials/(?P<credential_id>[A-Za-z0-9_-]+)`
- `/webauthn/login`
- `/webauthn/login-options`
- `/webauthn/register`
- `/webauthn/register-options`
- `/webauthn/verify-options`
- `/webauthn/verify-register`

## Abgleich-Hinweis 2026-06-06

- In älteren Vault-Notizen genannte Moderationsrouten wie `/admin/listings/{id}/hide` und `/my-listing-moderation` sind im aktuellen `functions.php` nicht als REST-Routen registriert. Vor weiterer Admin-Moderationsarbeit zuerst Code/Live-Verhalten prüfen und Doku danach aktualisieren.
- Lokale Knowledge-Artefakte (`ki-knowledge.json`, `Attached Element Context*`) bleiben lokal und dürfen nicht deployed werden.

## Verknüpfte Notizen
- [[Dashboard]] - Hauptübersicht
- [[Backend/API-Endpoints]] - Endpoint-Dokumentation
- [[AI-Gedaechtnis/Claude-Kontext]] - Claude Kontext
- [[AI-Gedaechtnis/Code-Beziehungen]] - Modul-Abhängigkeiten
- [[AI-Gedaechtnis/Entscheidungen]] - Architektur-Gründe
