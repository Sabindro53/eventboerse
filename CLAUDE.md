# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Obsidian Vault — Kontext immer laden

Zu Beginn jeder Session diese Dateien lesen (in dieser Reihenfolge):

1. `~/Documents/eventboerse-vault/EventBoerse-Vault/AI-Gedaechtnis/Claude-Kontext.md` — Projekt-Gedächtnis & Präferenzen
2. `~/Documents/eventboerse-vault/EventBoerse-Vault/Roadmap/Current-Sprint.md` — Was gerade gebaut wird
3. `~/Documents/eventboerse-vault/EventBoerse-Vault/AI-Gedaechtnis/Code-Beziehungen.md` — Modul-Abhängigkeiten

Nach Code-Änderungen, die relevant für den Vault sind: `Claude-Kontext.md` oder `Current-Sprint.md` aktualisieren.

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
| `app.js` | ~14 700-Zeilen-Monolith: SPA-Router, alle UI-Module, State |
| `styles.css` | ~11 000 Zeilen CSS, mobile-first |
| `index.html` | SPA-Shell für lokale Nutzung |
| `index.php` | WordPress-Template (gleiche SPA) |
| `functions.php` | WordPress-Theme: REST API (67 Endpoints), Asset-Registrierung |
| `webauthn.php` | Passkey/WebAuthn ohne Composer-Dependencies |

### SPA-Router

Alle Navigation läuft über `navigateTo(page, data, skipHistory)`. Seiten-Token: `'home'`, `'browse'`, `'detail'`, `'chat'`, `'board'`, `'profile'`, `'settings'`, `'admin'`. URL-State via `_spaPath()` / `_readSpaRoute()`.

### REST API

Base: `/wp-json/eventboerse/v1/`. Aufgebaut per `_apiUrl(endpoint)` (fällt auf relativen Pfad zurück wenn `eventboerseApi.restUrl` nicht gesetzt). Authentifizierung per WordPress-Nonce → `X-WP-Nonce` Header via `_apiHeaders()`.

67 Endpoints gruppiert nach: Auth (9), Nutzer (4), WebAuthn (8), 2FA (2), Listings (5), Messaging (5), Reviews (2), Payments (7), Favoriten (2), Admin (13), Utilities.

### State

Globaler State in modul-weiten `var`s in `app.js` (`currentUser`, `currentChat` etc.). Demo-Daten (`LISTINGS`, Events, Reviews) sind noch hardcoded oben in der Datei — echte Daten kommen via `loadDbListings()`.

### Event-Planer Board

Kanban/Flow-Planer (`renderBoardPage`, `renderKanban`, `renderBoardFlow`) mit `localStorage` + Server-Sync. Stripe-Zahlung teilweise integriert (`_handleStripeReturn`, `_reconcileStripePayments`).

## Bekannte Schwächen (nicht neu einführen)

- Demo-Daten (`LISTINGS`/`REVIEWS`/`CHATS`) noch hardcoded — werden schrittweise durch DB-Calls ersetzt
- Messaging nutzt Polling (alle 3s), kein WebSocket/SSE
- Keine automatisierten Tests
