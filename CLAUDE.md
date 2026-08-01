# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vault (Brain) — Kontext immer laden

Der Vault liegt **versioniert im Repo** unter `vault/` (kanonisch).
Der frühere externe Obsidian-Vault `~/Documents/eventboerse-vault/` ist **veraltet
und abgehängt** — nicht mehr verwenden.

Er ist in **sechs Ebenen** geschichtet (Details: `vault/00-Kern/Layer-Modell.md`):

| Layer | Ordner | Inhalt |
|-------|--------|--------|
| L0 Kern | `00-Kern/` | Wissensarchitektur: Layer-Modell, Neural-Map, Wissensströme, Freigaben |
| L1 Produkt | `10-Produkt/` | Features, UserFlows, **öffentliches Wissen** (`Wissen/`) |
| L2 System | `20-System/` | Architecture, Frontend, Backend, Komponenten |
| L3 Betrieb | `30-Betrieb/` | Operations, CI-CD, Integrationen, Testing |
| L4 Governance | `40-Governance/` | Security (🔒 `secret`), Legal |
| L5 Evolution | `50-Evolution/` | Roadmap, AI-Gedaechtnis, Archiv |

Zu Beginn jeder Session diese Dateien lesen (in dieser Reihenfolge):

1. `vault/50-Evolution/AI-Gedaechtnis/Claude-Kontext.md` — Projekt-Gedächtnis & Präferenzen
2. `vault/50-Evolution/Roadmap/Current-Sprint.md` — Was gerade gebaut wird
3. `vault/50-Evolution/AI-Gedaechtnis/Code-Beziehungen.md` — Modul-Abhängigkeiten

Nach Code-Änderungen, die relevant für den Vault sind:
`vault/50-Evolution/AI-Gedaechtnis/Claude-Kontext.md` oder
`vault/50-Evolution/Roadmap/Current-Sprint.md` aktualisieren.

### Frontmatter-Pflicht

Jede Notiz beginnt mit `layer`, `domain`, `share`, `tags`. `share` steuert die Freigabe:

- `public` → fließt in die Website-Wissensbasis (KI-Bot + Board-Assistent)
- `internal` → bleibt im Vault
- `secret` → verlässt den Vault **nie** (gesamter `40-Governance/Security/`-Ordner)

**Fail-Safe:** Fehlt `share`, gilt die Notiz als nicht öffentlich. Eine Notiz von
`internal` auf `public` zu heben ist eine Sicherheitsentscheidung → eigener Commit
mit Begründung. Regeln: `vault/00-Kern/Sicherheits-Klassifikation.md`.

### Wissensbasis neu bauen

Nach jeder Änderung an einer `share: public`-Notiz:

```bash
node scripts/build-knowledge.mjs --report   # baut assets/eb-knowledge.json + Freigabe-Bilanz
```

### Impuls-Strom messen

```bash
node scripts/pulse.mjs   # schreibt vault/00-Kern/Impuls-Strom.md (Ist-Zustand)
```

Zeigt Schichtung, Freigabe-Bilanz, Wissensbasis-Größe, Event-Abdeckung und
Code-Bewegung. Die Notiz wird bei jedem Lauf überschrieben — nicht von Hand
bearbeiten. Architektur & MCP-Ausbau: `vault/30-Betrieb/MCP-Architektur.md`.

Die erzeugte `assets/eb-knowledge.json` **mitcommitten** — sie wird mit dem Theme
ausgeliefert und von `_ebKbSearch()` in `app.js` befragt (QA-Bot und Board-Assistent).
Nie von Hand editieren. Pipeline: `vault/00-Kern/Synergie-Pipeline.md`.

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

## Tests (Pflicht vor jedem Merge)

```bash
npm test                # komplette Playwright-Suite (Server startet automatisch)
npm run test:smoke      # nur Routen-Smoke-Tests
npm run test:css        # CSS-Minify-Regression (Verlaufsschrift)
```

55 Tests in 5 Suiten: Smoke (alle Routen, 0 Page-Errors), Suche (natürliche
Sätze), Gebühren (centgenau, JS↔PHP-Parität), Wissensbasis (Antworten +
Leckage-Schutz), CSS-Minify. `pr-check.yml` blockiert PRs bei Fehlern.

## Deployment

Push auf `main` → GitHub Actions (`.github/workflows/ionos-deploy.yml`) → SFTP nach `/public/wp-content/themes/eventboerse/` auf IONOS. Kein manueller Build nötig.

## Architektur

### Dateien

| Datei | Inhalt |
|-------|--------|
| `app.js` | **Generiert** aus `js/modules/**` via `./build-app-js.sh` — nie von Hand editieren |
| `js/modules/` | Quelle des Frontends: 22 Module in `core/`, `search/`, `chat/`, `payments/`, `board/`, `ai/`, `ui/` (Reihenfolge: `modules.list`) |
| `styles.css` | ~16 300 Zeilen CSS, mobile-first |
| `app-shell.html` | **Einzige Quelle des SPA-Bodys** (PHP-frei). Body-Markup NUR hier editieren. |
| `index.php` | WordPress-Template: PHP-Head (Per-Page-Meta) + `readfile(app-shell.html)` + `wp_footer()`. Body NICHT direkt editieren. |
| `index.html` | Lokale Dev-Shell, **generiert** via `./build-index-html.sh` (= `index.local-head.html` + `app-shell.html` + `index.local-foot.html`). Nicht von Hand editieren. |
| `functions.php` | WordPress-Theme: REST API (86 Routen), Asset-Registrierung |
| `webauthn.php` | Passkey/WebAuthn ohne Composer-Dependencies |

**JS-Workflow (seit 2026-08, kein Drift):** Frontend-Änderungen NUR in `js/modules/**`,
danach `./build-app-js.sh` ausführen und die regenerierte `app.js` mitcommitten. Reine
Konkatenation — kein Bundler, kein Transpiler, Deploy-Artefakt bleibt `app.js`.
CI (`pr-check.yml`) bricht bei Drift zwischen Modulen und `app.js` ab.

**Shell-Workflow (kein Drift, #7):** SPA-Body-Änderungen NUR in `app-shell.html`. `index.php`
liest sie zur Laufzeit per `readfile` (immer aktuell). Für die lokale `index.html` danach
`./build-index-html.sh` ausführen und committen. Head/Foot unterscheiden sich bewusst
(PHP-dynamisch vs. statisch) und werden in `index.php` bzw. `index.local-head/foot.html` gepflegt.

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
