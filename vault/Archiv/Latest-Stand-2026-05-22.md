# AI-Gedächtnis: Historischer Stand (2026-05-22)

> Historischer Snapshot nach den Stabilitäts- und Board-Updates vom Mai 2026. Der aktuelle operative Stand steht in [[Latest-Stand-2026-06-06]].

## Produktionsstand

- Domain/API erreichbar, Listings laden über DB-Route.
- Board- und Listing-Logik wurde in mehreren Schritten gehärtet.
- Fokus lag auf: Datenkonsistenz, Selbstbuchungs-Schutz, klare Rollenlogik, Demo-Sichtbarkeit.

## Wichtige Änderungen (Mai 2026)

### 1) Listings & Demo-Sichtbarkeit stabilisiert
- Einheitliche Sichtbarkeit über Home, Browse, Map und Board.
- Admin-`hide-demo` wirkt konsistent auf alle Oberflächen.
- Board kann Demo-Listings anzeigen, wenn Demo-Modus aktiv ist.

### 2) Selbstbuchung systematisch verhindert
- Eigene Inserate können nicht als fremde Buchung durchrutschen.
- Schutz gilt für Board-Flows und direkte Buchungswege.
- Eigene Angebote werden im Board als `own_offer` behandelt (nicht als buchbares Fremd-Listing).

### 3) Board-Picker verbessert
- Vollständiges Nachladen aller Listings im Picker (`includeAllPages`).
- Such-Listings werden über Marker klassifiziert (nicht mehr primär über Userrolle).
- Planer sehen eigene Angebote im Picker, ohne Selbstbuchungs-Risiko.

### 4) Planungslogik ausgebaut: Baustein + Paket
- `Baustein`: genau ein Eintrag pro Karte.
- `Paket`: mehrere Einträge mit eigenen Zeiten/Preisen/Notizen.
- Neue Card-Felder: `packageItems[]`, `linkedListingIds[]`.
- Paket-Vorschau wird in Kanban und Flow sichtbar gerendert.

### 5) Moderation mit Verlauf und Creator-Feedback
- Admin kann Inserate ausblenden/löschen.
- Ersteller erhalten begründete Benachrichtigungen.
- Moderationsereignisse werden persistent mit Grund protokolliert.

## Relevante Code-Anker

- Frontend:
  - `app.js`: `loadDbListings`, `openAddProviderModal`, `_addProviderCard`, `renderKanban`, `renderBoardFlow`
- Backend:
  - `functions.php`: `eventboerse_handle_board_get/save`, Moderations-Helfer, `hide-demo`-State

## Guardrails für KI-Mitarbeiter

1. Keine Massenänderungen an Listings ohne Sichtbarkeits-Check (`hide-demo` vs. echte Daten).
2. Vor jedem Board-Write prüfen:
   - keine Selbstbuchung,
   - keine doppelten Fremd-Listings im selben Projekt,
   - Paketkarten nur mit mindestens 2 Positionen.
3. Änderungen an Buchungs-/Stripe-Status nie ohne Stage-Regeln anwenden.
4. Bei Fehlern zuerst degradieren (safe fallback), nicht löschen.

## Offene nächste Schritte (pragmatisch)

- Board-Regression-Tests für:
  - Selbstbuchungs-Block,
  - Paket-Bearbeitung,
  - Demo-Visibility.
- Vollständige E2E-Läufe für Listings + Board + Stripe-Rückweg.
- Reduktion der Legacy-Demo-Artefakte in UI-Pfaden, wo DB bereits primär ist.

---
*Erstellt: 2026-05-22*
