# Features: Listings & Suche

## Überblick

Das Listing-System ermöglicht Dienstleistern, ihre Services anzubieten und Event-Planern, diese zu finden.

## Kategorien

- DJ & Musik
- Catering & Gastronomie
- Fotografie & Video
- Floristen & Dekoration
- Veranstaltungstechnik
- Location & Räume
- Entertainment & Animation
- Weitere Services

## Browse-Flow

```
/browse → Listing-Übersicht geladen
       ↓
Filter anwenden (Kategorie, Standort, Preis, Datum)
       ↓
GET /listings?category=dj&location=Berlin&maxPrice=500
       ↓
Karten-View (Leaflet) + Listen-View
       ↓
Listing anklicken → /detail/:id
       ↓
GET /listings/{id} → Detail-Ansicht
       ↓
"Kontakt aufnehmen" → POST /conversations
```

## Filter-Optionen

| Filter | Beschreibung |
|--------|--------------|
| Kategorie | Art des Services |
| Standort | PLZ / Stadt + Umkreis (km) |
| Preis | Min/Max Preis |
| Datum | Verfügbarkeit |
| Bewertung | Mindest-Sterne |
| KI-Suche | Natural Language Search |

## Listing-Daten

Ein Listing enthält:
- Titel, Beschreibung, Kategorie
- Preisbereich (min/max)
- Standort (PLZ, Stadt, Koordinaten)
- Portfolio-Fotos (Galerie)
- Cover-Foto
- Kontaktdaten des Anbieters
- Bewertungen & Durchschnitt

## Listing erstellen (Dienstleister)

```
/create-listing → Formular
       ↓
Name, Beschreibung, Kategorie, Preis
       ↓
Fotos hochladen (POST /upload)
       ↓
Standort auf Karte setzen
       ↓
POST /listings → Listing live
```

## Favoriten

- Event-Planer können Listings favorisieren
- POST/DELETE `/favorites/{listing_id}`
- Anzeige unter `/favorites`

## Betroffene Dateien

- **Frontend:** `app.js` (Browse, Detail, Create Listing Seiten)
- **Backend:** `functions.php` (/listings, /my-listings Endpoints)

## Verknüpfte Notizen
- [[Backend/Listings-API]] - API Endpoints
- [[Features/Messaging]] - Kontakt aufnehmen
- [[Features/Reviews]] - Bewertungen
