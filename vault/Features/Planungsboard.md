# Feature: Event-Planungs-Board (Herzstück)

> Das Planungs-Board ist das zentrale Werkzeug der Plattform – hier plant man den kompletten Ablauf eines Events und verwaltet mehrere Dienstleister gleichzeitig.

## Übersicht

```
Detail-Seite → "Zum Planungs-Board hinzufügen"
       ↓
Projektwahl (bestehendes Projekt oder neues erstellen)
       ↓
Projekt-Übersicht (alle Event-Projekte auf einen Blick)
       ↓
Board-Ansicht (Flow / Kanban / Zeitplan / Checkliste)
       ↓
Dienstleister kontaktieren → Buchen → Zahlen → Erfüllen
```

## Kern-Funktionen

### Projekterstellung
- **9 Vorlagen:** Hochzeit, Geburtstag, Firmenfeier, Festival, Konferenz, Taufe, Kinderfest, Privatfeier, Eigenes
- **Auto-Befüllung:** Passende Dienstleister-Kategorien als Platzhalter-Karten beim Erstellen
- Felder: Name, Datum, Budget (€), Gästeanzahl, Event-Typ
- Bearbeitung jederzeit über den ✎-Button auf der Projektkarte

### Projekt-Übersicht (Grid)
- Countdown-Badge (Tage bis Event / "Heute!" / vergangen)
- Fortschrittsbalken mit 5 Stages (farbcodiert)
- Gästeanzahl-Badge wenn gesetzt
- Kosten-Summierung aller Karten

### Board-Ansichten (4 Tabs)

| Ansicht | Zweck |
|---------|-------|
| **Prozess** (Flow) | n8n-artiger Überblick – Standardansicht |
| **Kanban** | Karten ziehen zwischen Stages |
| **Zeitplan** | Tagesablauf am Event-Tag mit bestätigten Anbietern |
| **Checkliste** | Aufgaben-Liste (Vorlage je Event-Typ + eigene) |

### Kanban-Stages

| Stage | Farbe | Bedeutung | Wie befüllt |
|-------|-------|-----------|-------------|
| Geplant | Grau | Idee / noch nicht kontaktiert | Manuell, Auto-Vorlage, "Zum Board" |
| Kontaktiert | Orange | Anfrage raus | via "Anfragen" in Detail-Seite |
| Gebucht | Lila | Angebot liegt vor | via Buchungs-Flow |
| Bezahlt | Grün | Anbieter hat angenommen | Anbieter klickt "Auftrag annehmen" |
| Erfüllt | Rot | Beide Seiten haben bestätigt | Beidseitige Bestätigung |

### Checkliste
- Automatisch befüllt je nach Event-Typ (z.B. Hochzeit → 16 Aufgaben)
- Fortschrittsbalken (X / Y erledigt)
- Eigene Aufgaben hinzufügen
- Abhaken und per X-Button löschen (nur eigene)
- Wird in `project.checklist[]` gespeichert und cloud-synchronisiert

### "Zum Board hinzufügen" Button
- Erscheint auf der Detail-Seite im Buchungs-Widget
- Kein Projekt vorhanden → öffnet "Neues Projekt erstellen" Modal
- Genau ein Projekt → wird sofort hinzugefügt
- Mehrere Projekte → Projekt-Picker Modal

### Cloud-Sync
- Jedes Speichern → debounced Push an `/wp-json/eventboerse/v1/board-projects`
- Bei Tab-Fokus + alle 8 Sekunden resync vom Server
- Merge-Strategie: neuestes `updatedAt` gewinnt
- Tombstones (60 Tage) verhindern gelöschte Projekte bei Cross-Device-Sync
- Offline-Modus: localStorage als Fallback

### Dienstleister-Sicht (Aufträge-Tab)
- Zeigt alle Karten, bei denen der eingeloggte User als Provider hinterlegt ist
- Auftrag annehmen (→ Stage wechselt auf "Bezahlt", Provision wird berechnet)
- Erbringung bestätigen
- Gebühren-Aufteilung: 3% Stripe + 3% Plattform = 94% Auszahlung

## Datenstruktur

```javascript
{
  id: 'bp_1234',
  name: 'Hochzeit Julia & Mark',
  date: '15.08.2026',
  budget: 8000,
  guests: 120,
  template: 'wedding',
  cards: [
    {
      id: 'bc_5678',
      name: 'DJ SoundMaster',
      category: 'DJ',
      stage: 'bestaetigt',
      price: 450,
      listingId: 1,
      startTime: '20:00',
      endTime: '02:00',
      note: '...',
      avatar: '...',
      providerAcceptedAt: '2026-05-01T10:00:00Z',
      paidAt: '...'
    }
  ],
  checklist: [
    { id: 'cli_tmpl_0', text: 'Location buchen', done: true, isTemplate: true },
    { id: 'cli_custom_1234', text: 'Parkplatzschilder drucken', done: false, isTemplate: false }
  ],
  createdAt: '2026-04-01T08:00:00Z',
  updatedAt: 1746000000000
}
```

## Betroffene Dateien

- **Frontend:** `app.js` (~10128–14500) – Board-Logik
- **Frontend:** `index.html` – `#page-board`, Booking-Widget Button
- **Frontend:** `styles.css` – Board-Styles (~8350–8900)
- **Backend:** `functions.php` – `/board-projects` GET + POST (Zeile ~530)

## API

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/board-projects` | Alle Projekte des eingeloggten Users |
| POST | `/board-projects` | Projekte speichern (komplette Liste) |

Daten werden in `wp_usermeta` unter `eb_board_projects` (JSON) abgelegt.

## Verknüpfte Notizen
- [[Frontend/app-js-module]] – Frontend-Module
- [[Backend/API-Endpoints]] – Alle Endpoints
- [[Features/Messaging]] – Chat & Anfrage-Flow
- [[Features/Payments]] – Zahlungsintegration

---
*Zuletzt aktualisiert: 2026-05-03*
