---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

# Komponente: ListingCard

**Datei:** `app.js` ~898 | **Funktion:** `renderListingCard(listing)`

## Was sie zeigt

- Cover-Foto mit Galerie-Swipe
- Kategorie-Badge + "Superhost"/"Top-Bewertet" Badge
- Anbieter-Name + Avatar (DiceBear)
- Titel, Standort, Preis
- Sterne-Bewertung + Anzahl Reviews
- Favorit-Herz (toggle)
- "Verhandelbar"-Badge wenn `listing.negotiable`

## Galerie in der Karte

Jede Karte hat einen eigenen Galerie-Karussell (`_initGridGallerySwipe`):
- Wischgeste links/rechts
- Pfeil-Buttons
- Punkte-Indikatoren

## Wo verwendet

| Seite | Funktion |
|-------|----------|
| Browse | `renderFeaturedGrid()` |
| Home Hero | `renderHeroMarquees()` — horizontaler Scroll |
| Explore | `renderExploreGrid()` — mosaic |
| Karte Popup | `createPriceIcon()` + Popup-HTML |

## Klick-Verhalten

```javascript
// Karte klicken → Detail-Seite
navigateTo('detail', listing.id)

// Herz klicken → Favorit toggle
POST/DELETE /favorites/{id}
```

## Verknüpfte Notizen
- [[20-System/Frontend/app-js-module]] — Zeile ~898
- [[10-Produkt/Features/Listings]] — Listing-Daten
- [[30-Betrieb/Integrationen/DiceBear]] — Avatar
- [[10-Produkt/UserFlows/Suche-und-Entdeckung]] — Browse-Ansicht
- [[10-Produkt/UserFlows/Event-Planer-Bucht-DJ]] — Schritt 3
