# Komponente: Detail-Galerie

**Datei:** `app.js` ~9781 | **Seite:** `navigateTo('detail', id)`

## Was sie zeigt

- Großes Cover-Bild oben
- Thumbnail-Leiste unten (bis zu 5 Bilder)
- Swipe-Geste (Touch + Maus)
- Pfeil-Navigation
- **Cinematic Preview** — automatischer Ken-Burns-Effekt beim Öffnen

## Galerie-Funktionen

| Funktion | Beschreibung |
|----------|--------------|
| `_initDetailGallerySwipe()` | Touch/Maus-Swipe einrichten |
| `_updateDetailGalleryUI()` | Aktives Bild + Thumbnails highlighten |
| `detailGalleryNav(dir)` | Vor/Zurück navigieren |
| `detailGalleryGoTo(idx)` | Zu bestimmtem Bild springen |
| `_startCinemaPreview(gallery, imgs, title)` | Cinematic-Intro abspielen |

## Cinematic Preview (~9704)

Beim ersten Öffnen einer Detail-Seite:
1. Vollbild-Overlay öffnet sich
2. Bilder wechseln mit sanftem Zoom-Effekt (Ken Burns)
3. Nach ~3s schließt sich der Overlay automatisch
4. Übergang zur normalen Galerie-Ansicht

## Verknüpfte Notizen
- [[Features/Listings]] — Listing-Fotos
- [[UserFlows/Event-Planer-Bucht-DJ]] — Schritt 4
- [[Integrationen/DiceBear]] — Provider-Avatar auf Detail-Seite
- [[Frontend/app-js-module]] — Zeile ~9781
