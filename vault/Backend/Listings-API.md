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
- [[Features/Listings]] — Browse + Suche
- [[Backend/API-Endpoints]] — Alle Endpoints
- [[Frontend/app-js-module]] — `loadDbListings()` Zeile ~641
