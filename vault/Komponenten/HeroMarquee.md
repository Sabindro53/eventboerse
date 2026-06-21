# Komponente: Hero-Marquee

**Datei:** `app.js` ~941 | **Seite:** Home (`navigateTo('home')`)

## Was sie ist

Zwei horizontale, automatisch scrollende Reihen mit Listing-Karten auf der Startseite. Obere Reihe scrollt links, untere scrollt rechts — erzeugt den modernen "Infinite Scroll Carousel"-Effekt.

## Wie es funktioniert

```javascript
renderHeroMarquees()
       ↓
_stopAllMarquees()  // vorherige stoppen
       ↓
getHeroListings()   // 8–12 Listings auswählen
       ↓
cardHTML(l)         // HTML für jede Karte
       ↓
startMarquee(track, speed)
       ↓
requestAnimationFrame → tick(now)  // 60fps animation
```

## Performance-Details

- Nutzt `requestAnimationFrame` (nicht CSS animation)
- Stoppt wenn Tab nicht sichtbar (`visibilitychange`)
- `measureHalf()` — misst die Hälfte der Track-Breite für nahtloses Looping
- Wartet auf Bild-Laden mit `onImgReady()`

## Verknüpfte Notizen
- [[Komponenten/ListingCard]] — Karten im Marquee
- [[Frontend/app-js-module]] — Zeile ~941
- [[Features/Listings]] — Listing-Daten
