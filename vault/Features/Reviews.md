# Features: Bewertungen

## Überblick

1–5 Sterne Bewertungssystem. Event-Planer können Dienstleister nach Abschluss eines Events bewerten.

## Bewertungs-Flow

```
Event durchgeführt (Board-Stage: "Erfüllt")
       ↓
Event-Planer erhält Bewertungs-Aufforderung
       ↓
POST /reviews/{listing_id} → Bewertung gespeichert
       ↓
Durchschnittsbewertung auf Listing aktualisiert
```

## Bewertungs-Daten

- **Sterne:** 1–5
- **Kommentar:** Freitext
- **Datum:** Automatisch
- **Reviewer:** Eingeloggter Nutzer (Event-Planer)

## Anzeige

- Auf Listing-Detail-Seite: Durchschnitt + alle Reviews
- Im Browse-Filter: Mindest-Sterne-Filter
- Auf Provider-Profil: Alle erhaltenen Bewertungen

## Betroffene Dateien

- **Frontend:** `app.js` (Review-Formulare, Sterne-Anzeige)
- **Backend:** `functions.php` (/reviews Endpoints)

## Verknüpfte Notizen
- [[Backend/API-Endpoints]] — Reviews Endpoints
- [[Features/Listings]] — Bewertungen auf Listings
- [[Features/Messaging]] — Review nach Buchungsabschluss
- [[Features/Payments]] — Review nach Zahlungsabschluss
