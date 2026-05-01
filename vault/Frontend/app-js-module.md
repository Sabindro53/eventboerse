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
| `/admin` | Admin | Admin-Panel |

## Kern-Module

### Authentifizierung
- Registrierung mit E-Mail-Verifizierung
- Login (Passwort + 2FA + WebAuthn)
- Passwort-Reset Flow
- Session-Management
- → [[Features/Authentication]]

### Listings & Suche
- Browse-Ansicht mit Filtermöglichkeiten
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
- Avatar (DiceBear API)
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
