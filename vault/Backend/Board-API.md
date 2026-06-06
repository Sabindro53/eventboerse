---
tags: [backend, api, board, planning]
---

# Board-API (Planungsboard)

> Persistente Speicherung aller Board-Projekte pro User für Flow/Kanban/Zeitplan/Checkliste.

REST-Namespace: `eventboerse/v1`
Speicherort: `wp_usermeta` Key `eb_board_projects` (JSON, kein eigenes Board-Table)

## Endpoints

| Method | Route | Beschreibung |
|---|---|---|
| GET | `/board-projects` | Lädt komplette Projektliste des eingeloggten Users |
| POST | `/board-projects` | Speichert komplette Projektliste (inkl. Tombstones) |
| GET | `/board-bookings` | Aggregiert Board-Karten, die für einen Dienstleister relevant sind |
| POST | `/board-bookings/update-card` | Aktualisiert eine Board-Karte aus Auftrags-/Buchungskontext |

## Auth & Permission

- Alle Board-Routes sind nur für eingeloggte Nutzer verfügbar.
- Zugriff wird über User-Kontext abgesichert; jeder User schreibt nur in seinen eigenen Meta-Key.
- `board-bookings` durchsucht fremde Boards nur lesend und darf nur Karten zurückgeben, in denen der aktuelle Dienstleister beteiligt ist.

## Request/Response

### GET `/board-projects`

**Response 200**

```json
{
  "projects": [
    {
      "id": "bp_123",
      "name": "Sommerfest 2026",
      "cards": [],
      "updatedAt": 1770000000000
    }
  ]
}
```

### POST `/board-projects`

**Body (vereinfacht):**

```json
{
  "projects": [ ...komplette Projektliste... ]
}
```

**Response 200**

```json
{ "ok": true }
```

## Datenhinweise

- Board-State wird absichtlich als vollständiges JSON serialisiert gespeichert.
- Frontend verwaltet Merge/Sync (u. a. `updatedAt`, Tombstones, Fallback auf localStorage).
- Paketplanung wird über Felder wie `bundleMode`, `packageItems`, `linkedListingIds` innerhalb von `cards[]` abgebildet.
- Selbstbuchung bleibt P0-Guardrail: eigene Inserate dürfen planbar sichtbar sein, aber nie als Fremdbuchung oder Zahlungspfad durchrutschen.

## Relevante Stellen im Code

- `functions.php`:
  - Registrierung der Route `/board-projects`
  - Handler: `eventboerse_handle_board_get`, `eventboerse_handle_board_save`
  - Handler: `eb_board_bookings_get`, `eb_board_bookings_update_card`
- `app.js`:
  - Laden/Speichern + Merge-Logik beim Board-Open/Sync
  - Dienstleister-Auftragsboard nutzt `/board-bookings`

## Verknüpft

- [[Features/Planungsboard]]
- [[Backend/API-Endpoints]]
- [[Architecture/Datenmodell]]
