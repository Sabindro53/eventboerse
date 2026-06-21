# Integration: SMTP / E-Mail

**Typ:** E-Mail Versand | **Provider:** IONOS SMTP | **Status:** Aktiv

## Wie eingebunden

```php
// functions.php nutzt WordPress wp_mail()
// Credentials aus wp-config.php (via GitHub Actions injiziert)
define('EB_SMTP_USER', '...');
define('EB_SMTP_PASS', '...');
```

GitHub Actions schreibt `EB_SMTP_USER` und `EB_SMTP_PASS` bei jedem Deploy in `wp-config.php`.

## Wann E-Mails gesendet werden

| Trigger | Empfänger | Betreff |
|---------|-----------|---------|
| Registrierung | Neuer Nutzer | Verifizierungs-Link |
| Passwort vergessen | Nutzer | Reset-Link |
| 2FA Login | Nutzer | OTP-Code |
| Neue Anfrage | Dienstleister | "Du hast eine neue Anfrage" |
| Rechnung senden | Event-Planer | Zahlungslink |
| Zahlung erhalten | Dienstleister | Bestätigung |

## Admin-Konfiguration

`GET/POST /admin/smtp` — SMTP-Einstellungen direkt aus dem Admin-Panel ändern.
`POST /diagnostics/test-mail` — Test-E-Mail senden um SMTP zu prüfen.

## Verknüpfte Notizen
- [[CI-CD/Deployment]] — Secrets-Injection via GitHub Actions
- [[Backend/Admin-API]] — SMTP Admin-Endpoints
- [[Features/Authentication]] — Verifizierungs-Mails
- [[Integrationen/Stripe]] — Rechnungs-Mails
