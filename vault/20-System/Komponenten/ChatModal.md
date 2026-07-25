---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

# Komponente: Chat / Messaging

**Datei:** `app.js` ~3500+ | **Seite:** `navigateTo('chat', userId)`

## Was sie zeigt

- Konversationsliste (links) — letzter Nachricht, Ungelesen-Badge
- Chat-Fenster (rechts) — Nachrichten-Verlauf
- Eingabefeld + Senden-Button
- Angebots-Karten (offer messages mit Preis + Akzeptieren/Ablehnen)
- Online-Status-Indikator (grüner Punkt)
- Kontakt-Widget (Telefon, WhatsApp, E-Mail)

## Polling-Mechanismus

```javascript
// Nachrichten alle 3 Sekunden aktualisieren
setInterval(() => {
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'))
}, 3000)
```

## Nachrichten-Typen in der UI

| Typ | Darstellung |
|-----|-------------|
| `text` | Normale Sprechblase |
| `offer` | Karte mit Preis + 3 Buttons (Annehmen/Ablehnen/Gegenangebot) |
| `counter_offer` | Wie offer, aber anders gefärbt |
| `invoice` | Zahlungslink-Karte mit Stripe-Button |
| `system` | Zentriert, grau, kursiv |

## Online-Status

```javascript
// Heartbeat alle 30s → eigener Status
POST /heartbeat

// Status anderer Nutzer prüfen
GET /user-status/{id}
```

## Verknüpfte Notizen
- [[10-Produkt/Features/Messaging]] — Feature-Details
- [[20-System/Backend/Messaging-API]] — API-Endpoints
- [[10-Produkt/UserFlows/Event-Planer-Bucht-DJ]] — Schritt 6–8
- [[30-Betrieb/Integrationen/Stripe]] — Invoice-Nachricht
