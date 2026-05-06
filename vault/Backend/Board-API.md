---
tags: [backend, api, board, planning]
---

# Board-API (Planungsboard)

> Endpoints für das Planungs-Board ([[Features/Planungsboard]]). Vier Ansichten auf demselben Datenmodell: **Kanban**, **Flow** (Timeline), **Liste**, **Checkliste**.

REST-Namespace: `eventboerse/v1`
Tabelle: `wp_eb_board_projects` ([[Architecture/Datenmodell]])

## Datenmodell (verkürzt)

```json
{
  "id": 42,
  "owner_id": 7,
  "title": "Hochzeit Sommer 2026",
  "event_date": "2026-08-15",
  "guests": 80,
  "budget_cents": 1500000,
  "stages": [
    { "id": "venue", "label": "Location", "status": "done", "order": 1, "tasks": [...] },
    { "id": "catering", "label": "Catering", "status": "in_progress", "order": 2, "tasks": [...] }
  ],
  "linked_bookings": [101, 102],
  "notes": "string ≤ 5000",
  "created_at": "...",
  "updated_at": "..."
}
```

`status` ∈ {`open`, `in_progress`, `done`, `blocked`}.

## GET `/board/projects`

**Auth:** Login (Event-Planer)
**Response 200**
```json
{ "items": [ { "id":42, "title":"…", "event_date":"…", "progress":0.6 } ], "total": 1 }
```
`progress` = Anteil `done`-Stages.

## GET `/board/projects/{id}`

**Auth:** Login + Owner
Volles Project-Objekt inkl. Stages und Tasks.

## POST `/board/projects`

**Auth:** Login (Event-Planer)
**Body:** `{ "title", "event_date", "guests", "budget_cents" }`
Default-Stages werden serverseitig generiert (siehe [[Features/Planungsboard]]).

## PATCH `/board/projects/{id}`

**Auth:** Owner
Partial-Update auf Top-Level-Felder.

## PATCH `/board/projects/{id}/stages/{stageId}`

**Auth:** Owner
**Body:** `{ "status": "done", "order": 3 }`
Wird beim Drag-and-Drop in Kanban/Flow aufgerufen.

## POST `/board/projects/{id}/stages/{stageId}/tasks`

**Auth:** Owner
**Body:** `{ "title": "Catering anfragen", "due_at": "2026-06-01", "assignee_email": "..." }`

## PATCH `/board/projects/{id}/stages/{stageId}/tasks/{taskId}`

`{ "done": true }` oder `{ "title", "due_at" }`.

## DELETE `/board/projects/{id}`

**Auth:** Owner
Soft-Delete (`deleted_at`), 30 Tage Wiederherstellung über Admin.

## Limits & Rate-Limits

- Max 50 aktive Projekte pro User (UX, nicht hart)
- Max 500 Tasks pro Projekt
- 60 Schreibzugriffe / Minute pro User

## Konsistenz

- Kanban-Drag schreibt **erst nach Drop**, nicht bei Move (Performance + weniger Konflikte)
- Versioning via `updated_at`-Match — bei Mismatch HTTP 409 mit Server-Version

## Verknüpft

- [[Features/Planungsboard]]
- [[Architecture/Datenmodell#wp_eb_board_projects]]
