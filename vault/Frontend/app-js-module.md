# Frontend: app.js Module

**Datei:** `app.js` | **Zeilen:** ~14.688 | **Architektur:** Vanilla JS SPA

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
- → [[Features/Authentication]]

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
- → [[Features/Planungsboard]]
- Kategoriefilter (DJ, Catering, Fotografie, etc.)
- Standortbasierte Suche (Leaflet-Karte)
- Preisfilter
- KI-Suche mit Natural Language
- → [[Features/Listings]]

### Chat & Messaging
- Konversationsliste
- Echtzeit-Nachrichten (Polling)
- Angebot senden/gegenseitig verhandeln
- Nachrichten löschen
- Kontakt-Widgets
- → [[Features/Messaging]]

### Zahlungen (Stripe)
- Payment Element Integration
- Invoice-Generierung
- Checkout Flow
- Webhook-Verarbeitung
- → [[Features/Payments]]

### Bewertungen
- 1-5 Sterne Rating
- Textbewertungen
- Anzeige auf Provider-Profilen
- → [[Features/Reviews]]

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
- → [[Features/Admin]]

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
- [[Architecture/Overview]] - Gesamtarchitektur
- [[Backend/API-Endpoints]] - Backend Endpoints
- [[Features/Authentication]] - Auth-System
