---
tags: [security, p0, rest, auth, wordpress]
date: 2026-05-02
---

# Permissions

Permission-Callback-Helper fuer alle REST-Endpoints. Behebt P0.1 aus [[2026-05-02-Security-Hardening|Audit]].

## Datei

`includes/security/permissions.php` · PR #20

## Helper

| Funktion | Verwendung |
|----------|------------|
| `eventboerse_perm_public()` | Listings-Liste, Suche — wirklich oeffentlich |
| `eventboerse_perm_authenticated()` | Profil, eigene Buchungen anlegen |
| `eventboerse_perm_admin()` | Site-Settings, User-Mgmt |
| `eventboerse_perm_capability($cap)` | beliebige WP-Capability |
| `eventboerse_perm_owner($r, $type, $id)` | nur Datensatz-Owner darf editieren |

## Audit-Logger

Wenn `WP_DEBUG=true` ist, schreibt jede `/eventboerse/`-Route ohne `permission_callback` ins `error_log` mit Praefix `[eb-perm-audit]`. So findest du alle ungeschuetzten Routes.

## Verbindung zu

- [[2026-05-02-Security-Hardening|Hardening-Index]]
- [[Authentication]] — Login-Flow
- [[API-Endpoints]] — alle ~67 Routes
- [[Stripe-Webhook]] — nutzt explizit `__return_true` (HMAC-Auth statt User-Auth)

## TODOs

- [[functions.php|functions.php]]: `require_once "includes/security/permissions.php"`
- WP_DEBUG einschalten, Log lesen, alle ~67 Routes klassifizieren
- Folge-PRs in Bloecken: Listings-Routes, Reviews-Routes, etc.
