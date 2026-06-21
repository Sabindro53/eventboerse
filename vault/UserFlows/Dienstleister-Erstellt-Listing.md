# User Flow: Dienstleister erstellt Listing

> Onboarding-Flow für neue Dienstleister.

## Journey

```
1. REGISTRIERUNG
   Startseite → "Anbieter werden"
   Rolle wählen: dienstleister
   POST /register → E-Mail-Verifizierung

2. PROFIL AUSFÜLLEN
   navigateTo('profile')
   Name, Bio, Kontaktdaten, Avatar
   PUT /profile

3. LISTING ERSTELLEN
   navigateTo('create-listing')
   Titel, Kategorie, Beschreibung, Preis

4. FOTOS HOCHLADEN
   Drag & Drop oder Datei-Auswahl
   POST /upload → URL zurück
   Bis zu 5 Portfolio-Fotos

5. STANDORT SETZEN
   Leaflet-Karte → Pin setzen
   Koordinaten + PLZ automatisch

6. VERÖFFENTLICHEN
   POST /listings → Listing live
   Erscheint in Browse für Event-Planer

7. ANFRAGEN BEARBEITEN
   Benachrichtigung über neue Konversation
   navigateTo('chat') → Nachrichten lesen
   Angebot senden

8. BUCHUNG VERWALTEN
   navigateTo('board')
   Kanban: Angefragt → Gebucht → Bezahlt → Erfüllt
```

## Verknüpfte Notizen
- [[Features/Authentication]] — Schritt 1
- [[Features/Listings]] — Schritt 3–6
- [[Features/Messaging]] — Schritt 7
- [[Komponenten/Board-Kanban]] — Schritt 8
- [[Integrationen/Leaflet]] — Schritt 5
- [[Backend/Listings-API]] — Schritt 6
