# User Flow: Suche & Entdeckung

## Browse-Flow

```
navigateTo('browse')
       ↓
loadDbListings() → GET /listings
(fällt zurück auf LISTINGS Demo-Array wenn DB leer)
       ↓
Anzeige: Grid-View oder Karten-View (Leaflet)
```

## Filter-Optionen

```
Kategorie-Filter → filterCategory(btn, category)
Standort + Umkreis → haversineKm() für Entfernung
Preis-Range → client-seitig gefiltert
Datum → Custom Calendar (toggleCalendar)
KI-Suche → aiMatchKeyword() + levenshtein()
```

## KI-Suche (lokal, kein API-Call)

```
Eingabe: "DJ für Hochzeit in Berlin"
       ↓
aiMatchKeyword() — keyword matching + fuzzy
levenshtein() — Tippfehler-Toleranz
       ↓
Ergebnisse nach Relevanz sortiert
```

## Explore-Grid (Instagram-Style)

```
navigateTo('explore') oder Tab wechseln
renderExploreGrid() — mosaic layout
filterExploreGrid() — nach Kategorie
```

## Karten-Ansicht

```
toggleMapOverlay() → Leaflet-Map öffnet sich
initLeafletMap() → addListingMarkers()
Marker klicken → Popup mit Listing-Info
"Details" → closeMapOverlay() + navigateTo('detail', id)
```

## Verknüpfte Notizen
- [[Features/Listings]] — Listing-Daten
- [[Integrationen/Leaflet]] — Karten
- [[Komponenten/ListingCard]] — Grid-Karten
- [[Komponenten/NavBar]] — Suchleiste
- [[Backend/Listings-API]] — GET /listings
