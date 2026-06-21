# EventBoerse - Projekt Dashboard

> **Ziel:** Die beste und funktionalste Eventplattform für jedermann
> **Domain:** `{{DOMAIN}}` (anonymisiert) | **Stack:** WordPress + Vanilla JS SPA
> **Stand:** 2026-06-06 (Live: `styles.css?v=2.5.1`, GitHub `main` `3c1e752`)

---

> **Neu hier?** → Starte mit [[Onboarding]].

## Schnellübersicht

| Bereich | Dateien | Status |
|---------|---------|--------|
| [[Frontend/app-js-module\|Frontend SPA]] | `app.js` (21.093 Zeilen) | Aktiv |
| [[Backend/API-Endpoints\|Backend REST API]] | `functions.php` (7.294 Zeilen) | 81 Route-Registrierungen |
| [[Architecture/Overview\|Architektur]] | WordPress + SPA | Stabil |
| [[Architecture/Tech-Stack\|Tech-Stack]] | PHP 8.1+ / WP 6.4+ / Vanilla JS | versioniert |
| [[CI-CD/Deployment\|CI/CD]] | GitHub Actions → IONOS SFTP | Automatisch |
| [[Testing\|Testing & QA]] | Smoke-Test + PR-Checks + Live-Monitor | manuell + automatisiert |
| [[Roadmap/Current-Sprint\|Roadmap]] | Features & Bugs | Aktiv |

---

## Kern-Module

### Frontend (app.js)
- [[Features/Authentication\|Authentifizierung]] - Login, Register, 2FA, WebAuthn/Passkeys
- [[Features/Listings\|Listings & Suche]] - Dienstleister-Suche, Filter, Karte
- [[Features/Messaging\|Chat & Nachrichten]] - Echtzeit-Messaging, Angebote/Verhandlung
- [[Features/Payments\|Zahlungen]] - Stripe Payment Element
- QA-Support-Bot - tokenfreie Hilfe, rechts über Bottom-Navigation
- [[Features/Reviews\|Bewertungen]] - 1-5 Sterne System
- [[Features/Admin\|Admin Panel]] - Nutzerverwaltung, Diagnostik, SMTP
- [[Features/Planungsboard\|Planungs-Board]] - Kanban / Flow / Timeline / Checkliste

### Frontend-Architektur
- [[Frontend/app-js-module\|app.js Modul-Übersicht]]
- [[Frontend/UI-Patterns\|UI-Patterns]] - Cards, Modals, Toasts, Banner, Skeletons
- [[Frontend/State-Management\|State-Management]] - 4 Ebenen, kein Redux
- [[Frontend/Loading-Overlay\|Loading-Overlay]] - Party-Popper vor SPA-Render
- [[Frontend/Avatar-System\|Avatar-System]] - self-hosted SVG-Generator
- [[Architecture/Frontend-Routing\|Routing]] - `navigateTo()` + Server-Rewrites

### Backend (functions.php)
- [[Backend/Auth-API\|Auth API]] - 9 Endpoints: Register, Login, Logout, Reset
- [[Backend/Listings-API\|Listings API]] - 5 Endpoints: CRUD für Dienstleistungen
- [[Backend/Messaging-API\|Messaging API]] - 5 Endpoints: Konversationen & Nachrichten
- [[Backend/Payment-API\|Payment API]] - 7 Endpoints: Stripe Checkout, Webhooks
- Stripe Connect - Dienstleister-Onboarding, Diagnose, Status, Disconnect
- [[Backend/Admin-API\|Admin API]] - 13 Endpoints: User Management
- [[Backend/WebAuthn-API\|WebAuthn API]] - 8 Endpoints: Passkey Authentication
- [[Backend/Reviews-API\|Reviews API]] - Bewertungen + DSA-Notice
- [[Backend/Favorites-API\|Favorites API]] - Merkliste
- [[Backend/Board-API\|Board API]] - Planungsboard
- [[Backend/Upload-Handler\|Upload-Handler]] - 7-Schichten-Validierung

### Architektur
- [[Architecture/Overview\|System-Übersicht]]
- [[Architecture/Tech-Stack\|Tech-Stack]] - Versionsmatrix
- [[Architecture/Datenmodell\|Datenmodell]] - DB-Schema, Tabellen, Meta-Keys
- [[Architecture/Security-Model\|Security-Model]] - Threat-Model + Defense-in-Depth
- [[Architecture/Performance\|Performance]] - Budgets, Hebel, Anti-Patterns
- [[Architecture/Frontend-Routing\|Routing]]

### Sicherheit
- [[Security/2026-05-02-Security-Hardening\|Security-Hardening 05/2026]]
- [[Security/Permissions\|Permission-Callbacks]]
- [[Security/EBSafeHTML\|XSS-Schutz / Sanitizer]]
- [[Security/EBSession\|Session / Token-Expiry]]
- [[Security/Rate-Limit\|Rate-Limit]]
- [[Security/Stripe-Webhook\|Stripe-Webhook-Signatur]]
- [[Security/Upload-Hardening\|Upload-Hardening]]
- [[Security/CSP-Headers\|CSP & Security-Headers]]
- [[Security/Cache-Strategy\|Cache-Strategie]]

### Recht & Compliance
- [[Legal/Compliance-Overview\|Compliance-Übersicht]] - DSGVO, DSA, P2B, BFSG, etc.
- [[Legal/Cookie-Liste\|Cookie- & Storage-Liste]] - TDDDG § 25 / DSGVO Art. 13
- [[Legal/Loeschkonzept\|Löschkonzept]] - DSGVO Art. 5/17, Aufbewahrungsfristen
- [[Legal/Auftragsverarbeiter\|Auftragsverarbeiter]] - Art. 28 + Drittland

### Operations
- [[Operations/Monitoring\|Monitoring & Heartbeat]]
- [[Operations/Runbooks\|Runbooks]] - Cache, SMTP, Reset, DSGVO
- [[Operations/Backup-Restore\|Backup & Restore]] - RPO 24h / RTO 4h
- [[Operations/Incident-Response\|Incident-Response-Playbook]]

---

## AI-Gedächtnis System

> Coding-Agents lesen & schreiben in diesen Vault. Jede Code-Änderung wird dokumentiert.

- [[AI-Gedaechtnis/Claude-Kontext\|Agent-Kontext]] - Was der Coding-Agent über dieses Projekt weiß
- [[AI-Gedaechtnis/Latest-Stand-2026-06-06\|Latest Stand 2026-06-06]] - Aktueller stabiler Projektzustand
- [[AI-Gedaechtnis/Latest-Stand-2026-05-22\|Latest Stand 2026-05-22]] - Historischer Board/Listings-Snapshot
- [[AI-Gedaechtnis/Code-Beziehungen\|Code-Beziehungen]] - Welche Module miteinander sprechen
- [[AI-Gedaechtnis/Entscheidungen\|Architektur-Entscheidungen]] - Warum was so gemacht wurde

---

## Roadmap

- [[Roadmap/Current-Sprint\|Aktueller Sprint]] - Was gerade gebaut wird
- [[Roadmap/Feature-Ideen\|Feature-Ideen]] - Was noch fehlt
- [[Roadmap/Bekannte-Bugs\|Bekannte Bugs]] - Offene Probleme
- [[Roadmap/App-Store-Readiness\|App-Store-Readiness]] - Native-App-Pfad

---

## Hilfreich

- [[Onboarding]] - Einstieg für neue Entwickler:innen
- [[Glossar]] - Begriffe + Anonymisierungs-Konventionen
- [[Testing]] - Smoke-Test-Checkliste + Sicherheitstests

---

## Code-Statistiken (Auto-Update)

```
app.js        21.093 Zeilen  (SPA Frontend)
functions.php  7.294 Zeilen  (WordPress Backend)
styles.css    14.716 Zeilen  (Alle Styles)
index.php      3.934 Zeilen  (WP Theme Markup)
index.html     3.537 Zeilen  (statische/Legacy Markup-Kopie)
```

*Zuletzt aktualisiert: 2026-06-06*
