# Integration: Leaflet.js

**Typ:** Interaktive Karten | **Version:** 1.9.4 | **Status:** Aktiv

## Wie eingebunden

```php
// functions.php
wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
```

## Wo in app.js (ab Zeile ~9957)

| Funktion | Beschreibung |
|----------|--------------|
| `initLeafletMap()` | Karte initialisieren, OpenStreetMap Tiles |
| `addListingMarkers(listings)` | Alle Listings als Marker hinzufügen |
| `createPriceIcon(listing)` | Preis-Badge als Marker-Icon |
| `focusMapMarker(listingId)` | Auf einen Marker zoomen |
| `filterMapMarkers()` | Marker nach Kategorie/Filter anzeigen |
| `toggleMapOverlay()` | Karte einblenden/ausblenden |
| `closeMapOverlay()` | Karte schließen |
| `renderLocationsList(listings)` | Liste neben der Karte |

## Tile-Provider

OpenStreetMap (kostenlos, keine API-Key nötig):
```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

## Koordinaten-Berechnung

`haversineKm(lat1, lng1, lat2, lng2)` — Entfernung in km zwischen zwei Punkten (für Umkreissuche).

## Verknüpfte Notizen
- [[UserFlows/Suche-und-Entdeckung]] — Karten im Browse-Flow
- [[UserFlows/Dienstleister-Erstellt-Listing]] — Standort setzen
- [[Features/Listings]] — Listing-Standorte
- [[Komponenten/ListingCard]] — Karten-Popup
