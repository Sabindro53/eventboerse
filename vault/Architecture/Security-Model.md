---
tags: [architecture, security]
---

# Security-Model

> Wer darf was, wann und wie wird es bewiesen? Übersicht der Schutzmechanismen — Detail-Docs in [[Security/Permissions]], [[Security/EBSafeHTML]], [[Security/EBSession]] etc.

## Schutzziele (CIA + Datenschutz)

| Ziel | Mechanismus |
|---|---|
| **Vertraulichkeit** | TLS, HSTS, gehashte Passwörter (WP-Core), keine Klartext-Logs |
| **Integrität** | Stripe-Webhook-Signatur, REST-Nonces, CSRF-Token, Permission-Callbacks |
| **Verfügbarkeit** | Rate-Limit, Hosting-Provider-Backups, Site-Monitor |
| **Authentizität** | Passwort + 2FA + WebAuthn/Passkey |
| **Datenschutz** | Datensparsamkeit, Löschkonzept, Cookie-Consent |

## Auth-Pyramide

```
                ┌──────────────────┐
                │  Passkey (FIDO2) │   ← stärkste Stufe, Phishing-resistent
                └────────┬─────────┘
                         │
                ┌────────┴─────────┐
                │  Passwort + 2FA  │   ← TOTP via Authenticator
                └────────┬─────────┘
                         │
                ┌────────┴─────────┐
                │ Passwort allein  │   ← Mindestens 12 Zeichen
                └──────────────────┘
```

User wählt selbst die Stufe. Admins zwingen sich zur höchsten Stufe via Policy.

## Token-Modell

- **WordPress-Cookies** (`wordpress_logged_in_*`) — Session-Cookie, HttpOnly, Secure, SameSite=Lax
- **REST-Nonce** (`X-WP-Nonce` Header) — pro Session erneuert, schützt vor CSRF
- **WebAuthn-Challenges** — single-use, in Server-Session gespeichert, 5 min TTL
- **2FA-TOTP-Secrets** — verschlüsselt in `usermeta.eb_2fa_secret`

Detail: [[Security/EBSession]].

## Defense-in-Depth-Schichten

```
┌────────────────────────────────────────────────────────┐
│ 1.  Apache: HSTS, CSP, X-Frame-Options, .htaccess-Block│
├────────────────────────────────────────────────────────┤
│ 2.  WordPress-Core: Auth, Capabilities, Nonces         │
├────────────────────────────────────────────────────────┤
│ 3.  Theme/REST: Permission-Callbacks, Rate-Limit       │
├────────────────────────────────────────────────────────┤
│ 4.  Theme/Input: sanitize_*(), Validation, finfo magic │
├────────────────────────────────────────────────────────┤
│ 5.  Theme/Output: _sanitizeHtml, _escHtml, esc_html    │
├────────────────────────────────────────────────────────┤
│ 6.  Frontend: CSP, MutationObserver, kein eval/innerHTML│
└────────────────────────────────────────────────────────┘
```

Eine Schicht darf nicht das einzige Bollwerk sein.

## Threat-Model (verkürzt)

| Bedrohung | Mitigations |
|---|---|
| **XSS in Chat-Nachrichten** | `_sanitizeHtml` mit URL-Scheme-Allowlist, `_escHtml` für Time/Author |
| **CSRF auf REST-Endpoints** | `wp_verify_nonce` + Permission-Callback |
| **SQL-Injection** | nur `$wpdb->prepare()`, keine String-Concat |
| **Brute-Force-Login** | Rate-Limit pro IP+Username, exponential backoff |
| **Stripe-Webhook-Spoofing** | Signaturprüfung mit `EB_STRIPE_WEBHOOK` |
| **Datei-Upload-RCE** | 7-Schichten-Validierung + .htaccess-Exec-Block, [[Security/Upload-Hardening]] |
| **SVG-XSS** | SVG-Uploads werden als `attachment; sandbox` ausgeliefert |
| **Account-Takeover via E-Mail-Reset** | Single-use Token, 1h-TTL, an alte Mail benachrichtigt |
| **DSA-Notice-Spoofing** | Authentifizierung erforderlich, Audit-Log |
| **Pixel-Tracker / Drittland-Cookies** | nicht eingesetzt; Google Fonts noch zu self-hosten |

## Was bewusst NICHT umgesetzt ist

- Kein WAF-Plugin (Wordfence) im Live-Betrieb (false-positives, Performance)
- Keine eigene Verschlüsselung über DB-Ebene hinaus (Hosting-Provider macht At-Rest)
- Kein Bug-Bounty-Programm (zu früh)

Verknüpfungen: [[Security/Permissions]], [[Security/Rate-Limit]], [[Security/CSP-Headers]], [[Security/Upload-Hardening]], [[Operations/Incident-Response]].
