---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

# Backend: Listings API

**Datei:** `functions.php` | **Base:** `/wp-json/eventboerse/v1/`

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/listings` | Alle Listings (Filter: category, location, maxPrice) |
| POST | `/listings` | Neues Listing erstellen (nur Dienstleister) |
| GET | `/listings/{id}` | Einzelnes Listing mit Reviews |
| PUT | `/listings/{id}` | Listing aktualisieren |
| GET | `/my-listings` | Eigene Listings des eingeloggten Nutzers |
| GET | `/listings/{id}/reviews` | Bewertungen eines Listings |
| POST | `/upload` | Bild hochladen → URL zurück |

## Datenspeicherung

Listings werden als WordPress Custom Posts (`wp_posts`) gespeichert, Metadaten (Preis, Standort, Kategorie) als `wp_postmeta`.

## Verknüpfte Notizen
- [[10-Produkt/Features/Listings]] — Browse + Suche
- [[20-System/Backend/API-Endpoints]] — Alle Endpoints
- [[20-System/Frontend/app-js-module]] — `loadDbListings()` Zeile ~641
