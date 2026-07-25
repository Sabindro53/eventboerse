---
layer: L3
domain: betrieb
share: internal
tags: [layer/L3, domain/betrieb, share/internal]
---

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
- [[10-Produkt/UserFlows/Suche-und-Entdeckung]] — Karten im Browse-Flow
- [[10-Produkt/UserFlows/Dienstleister-Erstellt-Listing]] — Standort setzen
- [[10-Produkt/Features/Listings]] — Listing-Standorte
- [[20-System/Komponenten/ListingCard]] — Karten-Popup
