# EventBoerse - Projekt Dashboard

> **Ziel:** Die beste und funktionalste Eventplattform für jedermann
> **Domain:** [eventbörse.de](https://xn--eventbrse-57a.de) | **Stack:** WordPress + Vanilla JS SPA
> **Stand:** Auto-aktualisiert via Claude Code Hook

---

## Schnellübersicht

| Bereich | Dateien | Status |
|---------|---------|--------|
| [[Frontend/app-js-module\|Frontend SPA]] | `app.js` (14.688 Zeilen) | Aktiv |
| [[Backend/API-Endpoints\|Backend REST API]] | `functions.php` (4.429 Zeilen) | 67 Endpoints |
| [[Architecture/Overview\|Architektur]] | WordPress + SPA | Stabil |
| [[CI-CD/Deployment\|CI/CD]] | GitHub Actions → IONOS | Automatisch |
| [[Roadmap/Current-Sprint\|Roadmap]] | Features & Bugs | Aktiv |

---

## Kern-Module

### Frontend (app.js)
- [[Features/Authentication\|Authentifizierung]] - Login, Register, 2FA, WebAuthn/Passkeys
- [[Features/Listings\|Listings & Suche]] - Dienstleister-Suche, Filter, Karte
- [[Features/Messaging\|Chat & Nachrichten]] - Echtzeit-Messaging, Angebote/Verhandlung
- [[Features/Payments\|Zahlungen]] - Stripe Payment Element
- [[Features/Reviews\|Bewertungen]] - 1-5 Sterne System
- [[Features/Admin\|Admin Panel]] - Nutzerverwaltung, Diagnostik, SMTP

### Backend (functions.php)
- [[Backend/Auth-API\|Auth API]] - 9 Endpoints: Register, Login, Logout, Reset
- [[Backend/Listings-API\|Listings API]] - 5 Endpoints: CRUD für Dienstleistungen
- [[Backend/Messaging-API\|Messaging API]] - 5 Endpoints: Konversationen & Nachrichten
- [[Backend/Payment-API\|Payment API]] - 7 Endpoints: Stripe Checkout, Webhooks
- [[Backend/Admin-API\|Admin API]] - 13 Endpoints: User Management
- [[Backend/WebAuthn-API\|WebAuthn API]] - 8 Endpoints: Passkey Authentication

---

## AI-Gedächtnis System

> Claude liest & schreibt in diesen Vault. Jede Code-Änderung wird dokumentiert.

- [[AI-Gedaechtnis/Claude-Kontext\|Claude Kontext]] - Was Claude über dieses Projekt weiß
- [[AI-Gedaechtnis/Code-Beziehungen\|Code-Beziehungen]] - Welche Module miteinander sprechen
- [[AI-Gedaechtnis/Entscheidungen\|Architektur-Entscheidungen]] - Warum was so gemacht wurde

---

## Roadmap

- [[Roadmap/Current-Sprint\|Aktueller Sprint]] - Was gerade gebaut wird
- [[Roadmap/Feature-Ideen\|Feature-Ideen]] - Was noch fehlt
- [[Roadmap/Bekannte-Bugs\|Bekannte Bugs]] - Offene Probleme

---

## Code-Statistiken (Auto-Update)

```
app.js        ~14.688 Zeilen  (SPA Frontend)
functions.php  ~4.429 Zeilen  (WordPress Backend)
styles.css    ~11.030 Zeilen  (Alle Styles)
index.html    ~149 KB  (SPA Markup)
```

*Zuletzt aktualisiert: 2026-04-30*
