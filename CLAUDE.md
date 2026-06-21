# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vault — Kontext immer laden

Der Vault liegt **versioniert im Repo** unter `vault/` (kanonisch, Stand 2026-06-21).
Der frühere externe Obsidian-Vault `~/Documents/eventboerse-vault/` ist **veraltet
und abgehängt** — nicht mehr verwenden.

Zu Beginn jeder Session diese Dateien lesen (in dieser Reihenfolge):

1. `vault/AI-Gedaechtnis/Claude-Kontext.md` — Projekt-Gedächtnis & Präferenzen
2. `vault/Roadmap/Current-Sprint.md` — Was gerade gebaut wird
3. `vault/AI-Gedaechtnis/Code-Beziehungen.md` — Modul-Abhängigkeiten

Nach Code-Änderungen, die relevant für den Vault sind: `vault/AI-Gedaechtnis/Claude-Kontext.md`
oder `vault/Roadmap/Current-Sprint.md` aktualisieren.

## Projekt

**Eventbörse** — deutscher Marktplatz für Event-Planer und Dienstleister (DJs, Catering, Fotografen etc.).
**Domain:** eventbörse.de | **Stack:** WordPress (API) + Vanilla JS SPA

## Lokale Entwicklung

```bash
# UI ohne Backend (kein Build-Schritt nötig)
python3 -m http.server 8000
# oder
npx serve .
```

API-Calls (`/wp-json/eventboerse/v1/…`) funktionieren nur auf dem Live-WordPress-Server.

## Deployment

Push auf `main` → GitHub Actions (`.github/workflows/ionos-deploy.yml`) → SFTP nach `/public/wp-content/themes/eventboerse/` auf IONOS. Kein manueller Build nötig.

## Architektur

### Dateien

| Datei | Inhalt |
|-------|--------|
| `app.js` | ~21 000-Zeilen-Monolith: SPA-Router, alle UI-Module, State |
| `styles.css` | ~15 000 Zeilen CSS, mobile-first |
| `index.html` | SPA-Shell für lokale Nutzung |
| `index.php` | WordPress-Template (gleiche SPA) |
| `functions.php` | WordPress-Theme: REST API (~81 Routen), Asset-Registrierung |
| `webauthn.php` | Passkey/WebAuthn ohne Composer-Dependencies |

### SPA-Router

Alle Navigation läuft über `navigateTo(page, data, skipHistory)`. Seiten-Token: `'home'`, `'browse'`, `'detail'`, `'chat'`, `'board'`, `'profile'`, `'settings'`, `'admin'`. URL-State via `_spaPath()` / `_readSpaRoute()`.

### REST API

Base: `/wp-json/eventboerse/v1/`. Aufgebaut per `_apiUrl(endpoint)` (fällt auf relativen Pfad zurück wenn `eventboerseApi.restUrl` nicht gesetzt). Authentifizierung per WordPress-Nonce → `X-WP-Nonce` Header via `_apiHeaders()`.

~81 Route-Registrierungen (`register_rest_route`, Stand 2026-06), grob gruppiert nach: Auth, Nutzer, WebAuthn, 2FA, Listings, Messaging, Reviews, Payments, Favoriten, Admin, Utilities.

### State

Globaler State in modul-weiten `var`s in `app.js` (`currentUser`, `currentChat` etc.). Demo-Daten (`LISTINGS`, Events, Reviews) sind noch hardcoded oben in der Datei — echte Daten kommen via `loadDbListings()`.

### Event-Planer Board

Kanban/Flow-Planer (`renderBoardPage`, `renderKanban`, `renderBoardFlow`) mit `localStorage` + Server-Sync. Stripe-Zahlung teilweise integriert (`_handleStripeReturn`, `_reconcileStripePayments`).

## Bekannte Schwächen (nicht neu einführen)

- Demo-Daten (`LISTINGS`/`REVIEWS`/`CHATS`) noch hardcoded — werden schrittweise durch DB-Calls ersetzt
- Messaging nutzt Polling (alle 3s), kein WebSocket/SSE
- Keine automatisierten Tests
