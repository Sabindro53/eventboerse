# Sicherheitsrichtlinie — Eventbörse

Wir nehmen die Sicherheit unserer Plattform und der Daten unserer Nutzer ernst.
Dieses Dokument beschreibt, wie Schwachstellen gemeldet werden und welche
Schutzmaßnahmen aktiv sind.

## Schwachstelle melden (Responsible Disclosure)

Bitte melde Sicherheitslücken **vertraulich** und **nicht** über öffentliche
GitHub-Issues.

- **E-Mail:** security@eventbörse.de (Punycode: security@xn--eventbrse-57a.de)
- Bitte gib eine Beschreibung, Reproduktionsschritte und – wenn möglich – einen
  Proof-of-Concept an.
- Wir bestätigen den Eingang innerhalb von **72 Stunden** und halten dich über
  den Fortschritt auf dem Laufenden.
- Bitte gib uns angemessene Zeit zur Behebung, bevor Details veröffentlicht
  werden. Wir nennen dich auf Wunsch in einer Danksagung.

**Bitte nicht:** automatisierte Massen-Scans gegen die Produktivumgebung,
Denial-of-Service, Social Engineering gegen Mitarbeiter/Nutzer oder Zugriff auf
fremde Konten/Daten über einen Proof-of-Concept hinaus.

## Aktive Schutzmaßnahmen

Stand der im Code umgesetzten Maßnahmen (siehe `functions.php`,
`includes/security/`, `webauthn.php`):

| Bereich | Maßnahme |
|---|---|
| **Injection (SQL)** | Durchgängig `$wpdb->prepare()` mit Platzhaltern; keine String-Interpolation von Eingaben in Queries. |
| **XSS** | Server: `sanitize_text_field` / `wp_kses_post`. Client: vollständiges HTML-Escaping inkl. Anführungszeichen (`_escHtml`) und Allowlist-Sanitizer (`_sanitizeHtml`, DOMParser, strippt alle Event-Handler). |
| **Content-Security-Policy** | Restriktive CSP mit Allowlist (Stripe/Leaflet/Fonts), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors`/`X-Frame-Options: DENY`. |
| **Weitere Header** | HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP. |
| **Authentifizierung** | WordPress-Passwort-Hashing; 2FA (TOTP/OTP) und WebAuthn/Passkeys (Challenge + RP-ID-Bindung, `hash_equals`). |
| **Brute-Force** | IP-basiertes Rate-Limiting (Transients) auf Login/OTP/Passwort-Reset, plus per-Konto-/per-Code-Drosselung. |
| **Zugriffskontrolle** | REST-Endpoints mit `permission_callback`; Ownership-/Teilnehmer-Checks (Listings, Konversationen, Nachrichten); Admin-Endpoints via `eb_is_admin_user`/`manage_options`. |
| **Datei-Upload** | Magic-Byte-MIME-Erkennung, Bild-Allowlist, Block von SVG/Doppel-Extensions/ausführbaren Endungen, `getimagesize`-Recheck, 5 MB-Limit. |
| **Zahlungen** | Serverseitige Betragsvalidierung gegen das Listing; Stripe-Webhook-Signaturprüfung (HMAC-SHA256, `hash_equals`, Replay-Schutz). |
| **CSRF** | WordPress-Nonces (`X-WP-Nonce`) für authentifizierte Aktionen. |
| **Cookies** | `HttpOnly`, `Secure` (über HTTPS), `SameSite=Lax`. |

## Automatisierte Prüfungen

Bei jedem Push und Pull-Request laufen Sicherheits-Checks
(`.github/workflows/security.yml`):

- PHP-Lint **aller** `.php`-Dateien (verhindert Fatal-Errors im Deploy).
- JS-Syntaxprüfung von `app.js`.
- Advisory-Pattern-Scan auf riskante Muster (eval/extract, Superglobals in SQL,
  schwaches Hashing, ungeprüfte Query-Interpolation).

Der Deploy-Workflow pinnt zusätzlich die Minifier-Versionen, damit Builds
reproduzierbar bleiben.

## Geltungsbereich

Diese Richtlinie gilt für die Eventbörse-Plattform (eventbörse.de) und dieses
Repository. Drittanbieter (Stripe, IONOS, OpenStreetMap) unterliegen ihren
eigenen Sicherheitsrichtlinien.
