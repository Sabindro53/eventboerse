---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

# Komponente: Event-Planer Board (Kanban)

**Datei:** `app.js` ~10128 | **Seite:** `navigateTo('board')`

## Drei Ansichten

| Ansicht | Funktion | Beschreibung |
|---------|----------|--------------|
| Kanban | `renderBoardPage()` | Spalten-Board mit Drag & Drop |
| Flow | `renderBoardFlow()` | Visuelle Verbindungslinien zwischen Karten |
| Timeline | `renderBoardTimeline()` | Zeitstrahl-Ansicht |

## Kanban-Stages

```
Gebucht → Bezahlt → Erfüllt
```

Drag & Drop: `dragCard()`, `allowDrop()`, `dropCard(event, toStage)`

## Board-Projekte

Jedes Event des Planers ist ein "Projekt" mit eigenen Karten (Dienstleister).

```javascript
_loadBoardProjects()    // aus localStorage + Server
_saveBoardProjects()    // in localStorage + Server-Sync
_syncBoardFromServer()  // GET /board-projects
_pushBoardToServer()    // POST /board-projects
```

## Karten-Daten

Jede Karte enthält:
- Dienstleister-Name, Kategorie, Preis
- `paymentStatus`: pending / Bezahlt
- `paymentMethod`: Stripe / Bar / Überweisung
- `stripePending`: boolean
- Link zum Listing (`listingId`)

## Stripe-Integration

```javascript
_openStripePaymentModal()  // Zahlung starten
_handleStripeReturn()      // Nach Stripe-Redirect
_reconcileStripePayments() // Offene Zahlungen abgleichen
```

## Verknüpfte Notizen
- [[10-Produkt/UserFlows/Event-Planer-Bucht-DJ]] — Schritt 10
- [[10-Produkt/UserFlows/Dienstleister-Erstellt-Listing]] — Schritt 8
- [[10-Produkt/Features/Messaging]] — Board nach Einigung
- [[30-Betrieb/Integrationen/Stripe]] — Zahlungsflow
- [[20-System/Frontend/app-js-module]] — Zeile ~10128
