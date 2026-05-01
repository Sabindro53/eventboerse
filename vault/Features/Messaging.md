# Features: Chat & Messaging

## Überblick

Das Messaging-System ermöglicht Verhandlungen zwischen Event-Planern und Dienstleistern, inklusive Angebots-System.

## Chat-Flow

```
Browse → Listing-Detail → "Anfrage senden"
       ↓
POST /conversations → Neue Konversation
       ↓
/messages/:id → Chat öffnet sich
       ↓
Nachrichten senden (Polling für Updates)
       ↓
Angebot senden → Preisverhandlung
       ↓
Einigung → Buchung → Zahlung (Stripe)
```

## Nachrichten-Typen

| Typ | Beschreibung |
|-----|--------------|
| `text` | Normale Textnachricht |
| `offer` | Angebot mit Preis |
| `counter_offer` | Gegenangebot |
| `system` | System-Benachrichtigung |
| `invoice` | Rechnung / Zahlungslink |

## Angebots-Verhandlung

```
Dienstleister: Angebot senden (Preis: 500€)
       ↓
Event-Planer: Annehmen / Ablehnen / Gegenangebot
       ↓
PUT /messages/{id}/offer-status
       ↓
Status: pending → accepted / rejected / countered
       ↓
Bei Einigung: Invoice / Stripe Checkout
```

## Features

- Konversationsliste mit letzter Nachricht
- Ungelesene-Nachrichten-Badge
- Nachrichten löschen
- Kontakt-Widget (Telefon, WhatsApp, E-Mail)
- Angebote mit Preisangabe
- Negotiation-Flow (Angebot/Gegenangebot)
- Board-Ansicht (Gebucht/Bezahlt/Erfüllt)

## Board-System (Kanban)

Stages für gebuchte Events:
1. **Gebucht** - Buchung bestätigt
2. **Bezahlt** - Zahlung eingegangen
3. **Erfüllt** - Event durchgeführt

## Betroffene Dateien

- **Frontend:** `app.js` (Messages Seite, Chat Komponente)
- **Backend:** `functions.php` (/conversations, /messages Endpoints)

## Verknüpfte Notizen
- [[Backend/Messaging-API]] - API Endpoints
- [[Features/Payments]] - Zahlungsintegration
- [[Features/Listings]] - Listings durchsuchen
