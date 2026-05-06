---
tags: [architecture, stack, dependencies]
---

# Tech-Stack

> Versionierte Übersicht aller relevanten Komponenten. Quelle der Wahrheit für „läuft das auf X.Y?"-Fragen.

## Runtime

| Komponente | Version (Min/Empfohlen) | Quelle |
|---|---|---|
| PHP | 8.1 / 8.2 | Hosting-Provider |
| MySQL / MariaDB | 8.0 / 10.6 | Hosting-Provider |
| WordPress Core | 6.4 / 6.6 | wp.org |
| Apache | 2.4 (mod_rewrite, mod_headers, mod_deflate, mod_expires) | Hosting-Provider |

## Frontend (kein Build-Step)

| Bibliothek | Version | Wo geladen | Zweck |
|---|---|---|---|
| Vanilla JS (ES2020+) | — | `app.js` | SPA-Logik |
| Stripe.js v3 | latest from CDN | dynamisch in Payment-Flow | Payment Element |
| Leaflet | 1.9.x | Karten-Modul | Provider-Map |
| OpenStreetMap-Tiles | — | via Leaflet | Karten-Layer |
| Self-hosted Avatar-Generator | inline in `app.js` | überall | siehe [[Frontend/Avatar-System]] |

> Bewusst ohne Bundler/Framework — minimiert Dependency-Risiko, beschleunigt Onboarding, eliminiert Supply-Chain-Angriffe via npm.

## Backend

| Komponente | Version | Zweck |
|---|---|---|
| Stripe PHP SDK | 12.x | nur Webhook-Validierung; Charges via API direkt |
| WordPress REST API | Core | Routing |
| PHPMailer | WP Core | SMTP-Versand |

## Externe Services (Auftragsverarbeiter)

Vollständige Liste mit AVV-Status: [[Legal/Auftragsverarbeiter]].

| Service | Zweck | Datenstandort |
|---|---|---|
| Hosting-Provider | Hosting, SMTP, DB-Backups | EU |
| Stripe Payments Europe Ltd. | Zahlungen | EU/USA (SCC) |
| GitHub | Quellcode, CI | USA (SCC) |
| OpenStreetMap Foundation | Karten-Tiles | EU |

## Tooling (DEV-only, nicht im Theme)

- **GitHub Actions** — Deploy, Site-Monitor, PR-Checks, Auto-Audit
- **Obsidian** — Vault-Editor (`vault/`)
- **Coding-Agent (CLI)** — Code-Audits

## Browser-Support

| Browser | Min-Version | Begründung |
|---|---|---|
| Chrome / Edge | 100+ | Optional Chaining, structuredClone |
| Firefox | 100+ | dito |
| Safari | 15.4+ | `:has()`, `aspect-ratio`, WebAuthn |
| iOS Safari | 15.4+ | dito |

Polyfills bewusst nicht eingebaut → minimaler JS-Footprint.

## Update-Politik

- **WP-Core / PHP**: Patch-Updates sofort, Minor zeitnah, Major nach Test in Staging
- **Stripe SDK**: Pinned auf Major-Version, Updates in eigenen PRs
- **Leaflet**: jährliches Refresh
- **Eigene Cache-Buster (`?v=`)**: Bei jedem User-sichtbaren JS/CSS-Change inkrementieren

Siehe auch [[Operations/Runbooks#Stack-Update]].
