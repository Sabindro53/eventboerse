---
tags: [testing, qa]
---

# Testing

> Pragmatisches QA-Setup ohne Test-Framework-Overkill. Schwerpunkt: manueller Smoke-Test, Lint via PHP-Interpreter, statische Checks via Auto-Audit-Workflow.

## Pyramide

```
       ┌─────────────┐
       │ Manual E2E  │   ← Smoke-Test bei Release
       └──────┬──────┘
       ┌──────┴───────┐
       │  PR-Checks   │   ← GitHub Action pr-check.yml
       └──────┬───────┘
       ┌──────┴───────────────┐
       │ Auto-Audit (KI)      │   ← claude-auto-audit.yml
       └──────────────────────┘
```

Keine Unit-Tests aktuell — Codebase ist hauptsächlich UI-Glue + REST-Wrapper, hoher Mock-Overhead vs. Mehrwert.

## Smoke-Test (vor jedem Release)

Manuell durchklicken, ~15 Minuten:

```
[ ] Startseite lädt < 2 s, kein Layout-Shift
[ ] Login als Test-Provider funktioniert
[ ] Login als Test-Planer funktioniert
[ ] WebAuthn/Passkey-Login (mind. 1 Browser)
[ ] 2FA mit TOTP (Test-Account mit aktiviertem 2FA)
[ ] Listing-Suche: Kategorie + PLZ liefert Ergebnisse
[ ] Listing-Detail: Bilder, CTA, Reviews sichtbar
[ ] Chat: neue Konversation öffnen, Nachricht senden
[ ] Chat: XSS-Test "<img src=x onerror=alert(1)>" → escaped
[ ] Listing erstellen (mind. 1 Bild hochladen → kommt in Uploads an)
[ ] Stripe Test-Buchung (Karte 4242…) → Success-Page
[ ] Stripe Webhook in Stripe-Dashboard sichtbar, Status=processed
[ ] Admin-Panel: Userliste, Diagnostik, Logs
[ ] Logout funktioniert, Session beendet
[ ] Mobile: Burger-Menü, Bottom-Nav, Forms scrollen
[ ] Console: keine Errors / CSP-Violations
```

## PR-Checks (`pr-check.yml`)

- Geänderte Dateien via API auflisten
- PHP-Syntaxcheck via `php -l` für alle geänderten `.php`
- Größen-Diff für `app.js`, `functions.php` (Hard-Limit-Warnung bei +5 %)

## Auto-Audit (`claude-auto-audit.yml`)

- KI-basierter Review bei jedem Push
- Sucht nach: hardcoded Secrets, fehlende Nonce-Checks, `eval`, `exec`, unsicherer SQL-Konstruktion
- Findings werden als PR-Kommentar gepostet

## Manuelle Sicherheitstests

Quartalweise oder vor Major-Release:

| Test | Werkzeug | Ziel |
|---|---|---|
| HTTP-Header-Audit | securityheaders.com | A+ Grade |
| TLS-Audit | ssllabs.com | A+ |
| CSP-Validation | csp-evaluator.withgoogle.com | keine `unsafe-eval` |
| Mobile Performance | Lighthouse | Performance ≥ 80 |
| Accessibility | axe DevTools | 0 critical |
| Upload-Pipeline | manueller PoC mit `.php.jpg` | wird abgewiesen |
| Rate-Limit | curl-Loop auf `/login` | nach N Requests 429 |

## Test-Daten / Test-Accounts

Werden lokal in einer separaten `wp_eb_test_users`-Doku verwaltet — **nicht im Vault, nicht im Repo** (DSGVO).

## Browser-Matrix

Mindest-Test pro Release: aktuelles Chrome **und** aktuelles Safari (iOS 15.4+ Real Device empfohlen).

## Verknüpft

- [[Operations/Runbooks]]
- [[CI-CD/Deployment]]
- [[Security/2026-05-02-Security-Hardening]]
