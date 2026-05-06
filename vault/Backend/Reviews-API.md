---
tags: [backend, api, reviews]
---

# Reviews-API

> Endpoints für Bewertungen (1–5 Sterne) zwischen Event-Planern und Providern. DSA-Art. 17 Notice-and-Action greift bei gemeldeten Reviews.

REST-Namespace: `eventboerse/v1`
Tabelle: `wp_eb_reviews` ([[Architecture/Datenmodell]])

## GET `/reviews?listing_id=…`

**Auth:** öffentlich
**Query:**

| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `listing_id` | int | — | Pflicht |
| `page` | int | 1 | Pagination |
| `per_page` | int | 10 | max 50 |
| `sort` | enum | `recent` | `recent`, `rating_desc`, `rating_asc`, `helpful` |

**Response 200**
```json
{
  "items": [
    {
      "id": 123,
      "rating": 5,
      "title": "Top Service",
      "body": "Pünktlich, freundlich, …",
      "author": { "id": 9, "display_name": "Lena", "avatar_url": "/wp-json/eventboerse/v1/avatar?seed=9" },
      "created_at": "2026-04-12T18:30:00Z",
      "provider_response": null,
      "verified_booking": true
    }
  ],
  "total": 42,
  "average": 4.7,
  "histogram": { "1": 1, "2": 0, "3": 2, "4": 9, "5": 30 }
}
```

## POST `/reviews`

**Auth:** Login + Permission `eventboerse_perm_planer()`
**Body:**

```json
{
  "listing_id": 17,
  "booking_id": 88,
  "rating": 5,
  "title": "Top Service",
  "body": "Pünktlich, freundlich, …"
}
```

**Validierung:**
- `rating` ∈ {1..5}
- `title` ≤ 100 Zeichen
- `body` ≤ 2000 Zeichen
- `booking_id` muss zum User gehören und Status `completed` haben
- Pro `booking_id` nur eine Bewertung
- Rate-Limit: 5 Reviews / 24h pro User

**Response 201**
```json
{ "id": 124, "status": "published" }
```

**Fehler:**
- `400 invalid_rating`, `invalid_length`
- `403 not_completed_booking`, `already_reviewed`
- `429 rate_limited`

## POST `/reviews/{id}/response`

**Auth:** Owner-Provider des Listings
**Body:** `{ "response": "Danke für…" }` (≤ 1000 Zeichen)
**Effekt:** `provider_response` + `provider_response_at` gesetzt. Genau **eine** Antwort möglich, kein Edit.

## POST `/reviews/{id}/report`

**Auth:** Login (jeder)
**Body:**
```json
{
  "reason": "fake|spam|defamation|illegal|other",
  "details": "max 500 chars"
}
```

DSA-Art. 16 konformes Notice-and-Action. Antrag landet im Admin-Backlog. Siehe [[Legal/Compliance-Overview]].

## DELETE `/reviews/{id}`

**Auth:** Author (innerhalb 24h) oder Admin (jederzeit, mit Begründung).
Soft-Delete: Spalte `deleted_at` wird gesetzt, Inhalt durch „[Bewertung wurde entfernt]" ersetzt.

## Anti-Manipulation

- Verifizierte Bewertungen (`verified_booking = 1`) werden im UI hervorgehoben
- Self-Reviews technisch verhindert (`author_id != listing.owner_id`)
- IP-Hash + User-Agent-Fingerprint im Audit-Log (DSGVO-konform gehasht)

## Verknüpft

- [[Features/Reviews]] – UX-Sicht
- [[Architecture/Datenmodell#wp_eb_reviews]]
- [[Legal/Compliance-Overview]] – DSA Notice-and-Action
