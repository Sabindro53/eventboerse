---
tags: [layer/L2, domain/system, share/internal]
layer: L2
domain: system
share: internal
---

# Favorites-API

> Merkliste: User markiert Listings als Favorit. Tabelle `wp_eb_favorites`.

REST-Namespace: `eventboerse/v1`

## GET `/favorites`

**Auth:** Login
**Response 200**
```json
{
  "items": [
    { "listing_id": 17, "added_at": "2026-04-30T10:00:00Z" }
  ],
  "total": 1
}
```

## POST `/favorites`

**Auth:** Login
**Body:** `{ "listing_id": 17 }`
**Response 201:** `{ "favorited": true }`

Idempotent — doppelter Aufruf gibt `200 { "favorited": true }`.

## DELETE `/favorites/{listing_id}`

**Auth:** Login (nur eigene)
**Response 200:** `{ "favorited": false }`

## GET `/favorites/check?listing_id=…`

**Auth:** Login
**Response 200:** `{ "favorited": true|false }`

Im Frontend: kleines Heart-Icon auf Listing-Cards, optimistisches Toggle.

## Limits

- Max 500 Favorites pro User (UX-Schutz, kein Hard-Lock)
- Rate-Limit: 60 Toggles / Minute

## Verknüpft

- [[10-Produkt/Features/Listings]]
- [[20-System/Architecture/Datenmodell#wp_eb_favorites]]
