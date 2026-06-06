# Feature: Event-Planungs-Board (Herzstück)

> Das Board ist die operative Kommandozentrale für Planung, Anfrage, Buchung und Abwicklung.

## Prozess-Flow

```
Detail-Seite / Browse / Admin
        ↓
"Zum Planungsboard hinzufügen"
        ↓
Projekt wählen oder neu erstellen
        ↓
Board-Ansicht (Flow / Kanban / Zeitplan / Checkliste)
        ↓
Kontaktieren → Gebucht → Bezahlt → Erfüllt
```

## Aktueller Funktionsumfang (Stand 2026-06-06)

### 1) Rollenbasierte Planung
- Eventplaner (privat/gewerblich) und Dienstleister erhalten unterschiedliche Planungsprofile.
- Stage `Geplant` zeigt profilabhängige Hinweise und Presets.

### 2) Planungsmodus: Baustein vs. Paket

| Modus | Verhalten |
|---|---|
| **Baustein** | Ein einzelner Eintrag (Angebot/Gesuch/manuell) wird als Karte geplant. |
| **Paket** | Mehrere Einträge werden als Paket geplant; jede Position kann eigene Zeiten, Preis und Notiz haben. |

Neu: Paketkarten speichern `packageItems[]` und `linkedListingIds[]`.

### 3) Sichere Einbindung eigener Angebote
- Eigene Inserate sind für Planer im Picker sichtbar.
- Eigene Inserate werden als `own_offer` übernommen, **ohne** buchbaren Fremd-Link (`listingId` bleibt leer).
- Schutz gegen Selbstbuchung bleibt dadurch aktiv.

### 4) Picker-Verbesserungen
- Listings werden vollständig geladen (`loadDbListings({ includeAllPages: true })`).
- Such-/Angebots-Typen werden über explizite Marker klassifiziert (nicht mehr über Rolle geschätzt).
- In Paketmodus ist Multi-Select aktiv, in Bausteinmodus Single-Select.

### 5) Demo-/Echt-Daten Sichtbarkeit
- Einheitliche Sichtbarkeitslogik über Home/Browse/Map/Board.
- Admin kann Demo-Daten global ein-/ausblenden (`hide-demo` Toggle).
- Board respektiert den Demo-Status konsistent.

### 6) Buchungs- und Stage-Schutz
- Selbstbuchung ist systemseitig blockiert (Board + Sofortbuchung).
- Geschützte Stages können nicht beliebig per Drag erreicht werden.
- Bezahlte Karten sind gegen kritische Manipulationen geschützt.

### 7) Dienstleister-Auftragsboard
- `/board-bookings` aggregiert relevante Karten für Dienstleister.
- `/board-bookings/update-card` schreibt Status-/Card-Updates zurück.
- Muss strikt prüfen, dass nur beteiligte Dienstleister ihre relevanten Karten sehen oder verändern.

## Board-Ansichten

| Ansicht | Zweck |
|---|---|
| **Prozess (Flow)** | Gesamtüberblick mit Stage-Nodes, Budget, Aktionen |
| **Kanban** | Kartenorientierte Bearbeitung je Stage |
| **Zeitplan** | Eventtag-Fokus mit Zeitfenstern |
| **Checkliste** | Aufgabenplanung pro Eventtyp + eigene Aufgaben |

## Stage-Modell

| Stage | Bedeutung |
|---|---|
| `geplant` | Vorbereitung / Strukturierung |
| `kontaktiert` | Anfrage läuft |
| `angebot` | Buchungsangebot liegt vor |
| `bestaetigt` | Zahlung/Bestätigung erfolgt |
| `abgeschlossen` | Leistung erbracht |

## Datenstruktur (vereinfacht)

```javascript
{
  id: "bp_...",
  name: "Eventname",
  cards: [
    {
      id: "card_...",
      bundleMode: "fragment" | "package",
      sourceKind: "manual" | "own_offer" | "external_listing" | "search_listing" | "mixed_package",
      listingId: 123,               // bei package/own_offer optional null
      linkedListingIds: [123, 456], // neu für Pakete
      packageItems: [               // neu
        {
          key: "li_123_external_listing",
          listingId: 123,
          name: "DJ ...",
          category: "DJ",
          price: 500,
          startTime: "18:00",
          endTime: "23:00",
          note: ""
        }
      ]
    }
  ]
}
```

## Technische Referenzen

- Frontend:
  - `app.js`: `openAddProviderModal`, `_addProviderCard`, `renderKanban`, `renderBoardFlow`
  - `styles.css`: Picker-/Paket-UI und Board-Kartenstile
- Backend:
  - `functions.php`: Endpoints `/board-projects`, `/board-bookings`, `/board-bookings/update-card`
  - Demo-Flags: `/admin/hide-demo`, `/admin/toggle-demo`

## Verknüpfte Notizen

- [[Backend/Board-API]]
- [[Backend/API-Endpoints]]
- [[Features/Listings]]
- [[Features/Payments]]
- [[AI-Gedaechtnis/Latest-Stand-2026-06-06]]

---
*Zuletzt aktualisiert: 2026-06-06*
