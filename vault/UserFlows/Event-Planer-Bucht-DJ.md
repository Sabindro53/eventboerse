# User Flow: Event-Planer bucht DJ

> Häufigster und wichtigster Flow der Plattform.

## Journey

```
1. LANDING
   Startseite → Hero-Marquee sieht DJ-Karten
   navigateTo('home') → renderHeroMarquees()

2. ENTDECKUNG
   "Jetzt entdecken" → Browse-Seite
   navigateTo('browse') → loadDbListings() → filterCategory('dj')

3. SUCHE VERFEINERN
   Standort eingeben (Berlin) → Preis-Slider → KI-Suche "DJ für Hochzeit"
   aiMatchKeyword() → Leaflet-Karte zeigt Marker

4. LISTING ANSCHAUEN
   DJ-Karte klicken → Detail-Seite
   navigateTo('detail', id) → GET /listings/{id}
   → Galerie, Beschreibung, Bewertungen, Preis

5. FAVORISIEREN (optional)
   Herz-Icon → POST /favorites/{id}
   _saveFavoritesToStorage()

6. KONTAKT AUFNEHMEN
   "Anfrage senden" Button → Chat öffnet sich
   POST /conversations → navigateTo('chat', userId)

7. VERHANDLUNG
   Nachrichten austauschen (Polling alle 3s)
   DJ sendet Angebot (offer message, 450€)
   Event-Planer: Gegenangebot (400€) → PUT /messages/{id}/offer-status

8. EINIGUNG
   DJ akzeptiert 420€ → Status: accepted
   DJ klickt "Rechnung senden" → POST /send-invoice

9. ZAHLUNG
   Event-Planer erhält E-Mail mit Zahlungslink
   Klickt Link → POST /stripe/create-checkout
   Stripe Payment Element → Karte eingeben → bezahlen

10. BESTÄTIGUNG
    POST /stripe/webhook → Status: "Bezahlt"
    Board zeigt Karte in Stage "Bezahlt"
    Nach Event: Bewertung schreiben → POST /reviews/{id}
```

## Kritische Punkte

| Schritt | Risiko | Status |
|---------|--------|--------|
| Schritt 2 | Demo-Daten statt DB | ⚠️ P0 |
| Schritt 7 | Polling-Latenz 3s | ⚠️ P1 |
| Schritt 9 | Stripe noch nicht vollständig | ⚠️ P1 |

## Verknüpfte Notizen
- [[Features/Listings]] — Schritt 2–4
- [[Features/Messaging]] — Schritt 6–8
- [[Features/Payments]] — Schritt 9–10
- [[Komponenten/ListingCard]] — Schritt 3
- [[Komponenten/ChatModal]] — Schritt 6
- [[Integrationen/Stripe]] — Schritt 9
- [[Integrationen/Leaflet]] — Schritt 3
