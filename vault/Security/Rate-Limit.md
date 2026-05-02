---
tags: [security, p0, auth, rate-limit, brute-force]
date: 2026-05-02
---

# Rate-Limit

WP-Transient-basierter Sliding-Window Rate-Limit-Helper. Behebt P0.4 aus [[2026-05-02-Security-Hardening|Audit]].

## Datei

`includes/security/rate-limit.php` · PR #18

## API

```php
eventboerse_check_rate_limit( $action, $limit, $window_secs, $identifier_override = null )
eventboerse_reset_rate_limit( $action, $identifier_override = null )
eventboerse_get_client_ip()
```

Rueckgabe von `check`: `true` oder `WP_Error` mit HTTP 429 + `retry_after`.

## Empfohlene Limits

| Endpoint | Limit | Fenster |
|----------|-------|---------|
| Login | 5 | 15 min |
| Registrierung | 3 | 1 h |
| Passwort-Reset | 3 | 1 h |
| Schreib-Endpoints (generell) | 30 | 1 min |

## Verbindung zu

- [[2026-05-02-Security-Hardening|Hardening-Index]]
- [[Authentication]] — Login/Register/Reset Flows
- [[Permissions]] — Rate-Limit kommt VOR Permission-Check
- [[EBSession]] — erfolgreiche Logins triggern `reset_rate_limit`

## TODOs

- [[functions.php|functions.php]]: `require_once "includes/security/rate-limit.php"`
- An den drei Auth-Endpoints den Helper als ersten Schritt im Callback
- Optional gegen Username-Enumeration: `$identifier = $username . "|" . $ip`
