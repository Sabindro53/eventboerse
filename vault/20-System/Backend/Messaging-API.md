---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

# Backend: Messaging API

**Datei:** `functions.php` | **Base:** `/wp-json/eventboerse/v1/`

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/conversations` | Alle Konversationen des Nutzers |
| POST | `/conversations` | Neue Konversation starten |
| GET | `/conversations/{id}/messages` | Nachrichten einer Konversation |
| POST | `/conversations/{id}/messages` | Nachricht senden |
| PUT | `/messages/{id}` | Nachricht aktualisieren |
| DELETE | `/messages/{id}` | Nachricht löschen |
| PUT | `/messages/{id}/offer-status` | Angebots-Status ändern (accept/reject/counter) |

## Nachrichten-Typen

| Typ | Beschreibung |
|-----|--------------|
| `text` | Normale Textnachricht |
| `offer` | Angebot mit Preis |
| `counter_offer` | Gegenangebot |
| `system` | System-Benachrichtigung |
| `invoice` | Rechnungs-/Zahlungslink |

## Online-Status

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/heartbeat` | Nutzer als online markieren |
| GET | `/user-status/{id}` | Online-Status eines Nutzers |
| GET | `/offline` | Offline-Status setzen |

## Verknüpfte Notizen
- [[10-Produkt/Features/Messaging]] — Frontend Chat-Flow
- [[10-Produkt/Features/Payments]] — Angebot → Zahlung
- [[20-System/Backend/API-Endpoints]] — Alle Endpoints
