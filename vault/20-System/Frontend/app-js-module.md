---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

# Frontend: app.js Module

**Artefakt:** `app.js` (~24.900 Zeilen, **generiert**) | **Quelle:** `js/modules/**` (22 Module) | **Architektur:** Vanilla JS SPA

## Modul-Layout (seit 2026-08-01)

`app.js` wird aus den Modulen konkateniert — `./build-app-js.sh` (reines `cat`,
kein Bundler, kein Transpiler; dasselbe Muster wie `build-index-html.sh`).
Reihenfolge: `js/modules/modules.list`. CI (`pr-check.yml`) bricht bei Drift ab.
**app.js nie von Hand editieren** — Modul ändern, bauen, beide committen.

| Ordner | Module | Inhalt |
|--------|--------|--------|
| `core/` | 00-basis, 01-demo-daten, 02-router-navigation, 30-auth | Avatar-Generator, Demo-Filter, LISTINGS, SPA-Router, State, Auth/2FA/Passkey |
| `search/` | 10-karten-home-feed, 11-suche-ki, 12-detail-provider | Card-Renderer, Galerien, `_ebSuggest`/`_ebTaste`, `filterListings`, Detail + Provider |
| `chat/` | 20-chat-nachrichten | Chat, Polling, Offer-Rendering |
| `payments/` | 21-buchung-verhandlung, 44-kv-buchung | Buchung, `calculatePayout`, Kostenvoranschlag→Zahlung |
| `board/` | 40-board-kanban, 41-flow-zahlung, 42-guide-social-feed | Kanban, Flow-View, Stripe-Return/Reconcile, Guide, Social Feed |
| `ai/` | 50-planungs-assistent | Board-Assistent (Intents, Slot-Filling) |
| `ui/` | 22–25, 31, 32, 43, 51 | Inserat-Maske, Settings, Uploads, Dark-Mode, Favoriten, Admin, Reviews, Modals/Toast/QA-Bot, Consent/Init/Map, Showcase, Kalender |

## SPA Router

Der Router verwaltet alle Seiten ohne Seitenneuladen:

| Route | Funktion | Beschreibung |
|-------|----------|--------------|
| `/` | Home | Landing Page |
| `/browse` | Browse | Dienstleister durchsuchen |
| `/detail/:id` | Detail | Service-Detail-Ansicht |
| `/provider/:id` | Provider | Anbieter-Profil |
| `/messages` | Messages | Chat-Übersicht |
| `/messages/:id` | Chat | Einzelner Chat |
| `/profile` | Profile | Eigenes Profil |
| `/settings` | Settings | Einstellungen |
| `/create-listing` | Create | Angebot erstellen |
| `/favorites` | Favorites | Favoriten |
| `/board` | **Board** | **Event-Planungs-Board (Herzstück)** |
| `/admin` | Admin | Admin-Panel |

## Kern-Module

### Authentifizierung
- Registrierung mit E-Mail-Verifizierung
- Login (Passwort + 2FA + WebAuthn)
- Passwort-Reset Flow
- Session-Management
- → [[10-Produkt/Features/Authentication]]

### Event-Planungs-Board (Herzstück)
- Mehrere Event-Projekte parallel verwalten
- **Vorlagen:** Hochzeit, Geburtstag, Firmenfeier, Festival, Konferenz, Taufe, Kinderfest, Privatfeier
- **Auto-Befüllung:** Passende Dienstleister-Kategorien werden bei Projekterstellung als Karten vorausgefüllt
- **Kanban-Board:** 5 Stages (Geplant → Kontaktiert → Gebucht → Bezahlt → Erfüllt) mit Drag & Drop
- **Flow-Ansicht:** n8n-artiger Prozessfluss (Standard-Ansicht)
- **Zeitplan-Ansicht:** Tagesablauf am Event-Tag
- **Checkliste:** Aufgaben-Checkliste je Event-Typ (abhakbar, benutzerdefiniert erweiterbar)
- **Projekt-Details:** Name, Datum, Budget, Gästeanzahl, Event-Typ
- **Countdown:** Tage bis zum Event auf der Projektkarte
- **Cloud-Sync:** Geräteübergreifende Synchronisation via Server (Tombstone-Merge)
- **„Zum Board hinzufügen“ Button** auf Service-Detail-Seiten
- **Dienstleister-Sicht:** Aufträge-Übersicht, Auftrag annehmen/ablehnen, Erbringung bestätigen
- **Benachrichtigungen:** Live-Toasts bei Statusänderungen vom Anbieter
- **Projekt löschen** mit automatischer Absage an kontaktierte Dienstleister
- → [[10-Produkt/Features/Planungsboard]]
- Kategoriefilter (DJ, Catering, Fotografie, etc.)
- Standortbasierte Suche (Leaflet-Karte)
- Preisfilter
- KI-Suche mit Natural Language
- → [[10-Produkt/Features/Listings]]

### Chat & Messaging
- Konversationsliste
- Echtzeit-Nachrichten (Polling)
- Angebot senden/gegenseitig verhandeln
- Nachrichten löschen
- Kontakt-Widgets
- → [[10-Produkt/Features/Messaging]]

### Zahlungen (Stripe)
- Payment Element Integration
- Invoice-Generierung
- Checkout Flow
- Webhook-Verarbeitung
- → [[10-Produkt/Features/Payments]]

### Bewertungen
- 1-5 Sterne Rating
- Textbewertungen
- Anzeige auf Provider-Profilen
- → [[10-Produkt/Features/Reviews]]

### Profil-Management
- Portfolio-Galerie (Fotos)
- Cover-Fotos
- Unternehmensinformationen
- Avatar (self-hosted via `ebAvatar()`)
- Rolle: event_planer / dienstleister

### Admin-Panel
- Nutzerverwaltung
- Rollen-Zuweisung
- SMTP-Konfiguration
- Diagnostik (Mail-Test)
- → [[10-Produkt/Features/Admin]]

### Dark Mode
- Toggle in der Navigation
- Persistenz via localStorage
- CSS-Variablen basiertes System

## API-Kommunikation

```javascript
// Typisches Muster in app.js:
fetchAPI('/wp-json/eventboerse/v1/listings', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + token }
})
```

## Demo-Daten
- `LISTINGS` - Array mit Demo-Dienstleistern
- `REVIEWS` - Array mit Demo-Bewertungen
- `CHATS` - Array mit Demo-Nachrichten
- `EVENTS` - Array mit Demo-Events

## Verknüpfte Notizen
- [[20-System/Architecture/Overview]] - Gesamtarchitektur
- [[20-System/Backend/API-Endpoints]] - Backend Endpoints
- [[10-Produkt/Features/Authentication]] - Auth-System
