# Design: Board-Rollen, Zahlungsfluss & Layout

**Datum:** 2026-06-05
**Kontext:** Folgeauftrag zur gestrigen Board-Rollentrennung. Drei Probleme:
1. Dienstleister soll **auch** Events planen können (Firmenfeier) + Dienstleister zusammenstellen,
   zusätzlich zum Auftragsboard. Event-Planer nur Planungs-Board.
2. Eine Sandbox-Zahlung (Instant-Booking) erschien in **keinem** Board, ohne Feedback/Weiterleitung.
3. Boards wirken auf der Start-/Dashboard-Seite eingequetscht; sollen mehr Platz haben.

## Diagnose Zahlungs-Bug
- Instant-Booking & Board-Karten-Zahlung laufen über `_openStripePaymentModal` →
  `stripe.confirmPayment({ redirect: 'if_required', return_url: window.location.href })`.
- Die Board-Karte + das Feedback entstehen **nur** im `onSuccess`-Closure.
- Erfordert eine Karte einen Redirect (3-D-Secure / bestimmte Sandbox-Karten), lädt die Seite neu →
  `onSuccess` ist weg → keine Karte, kein Toast, keine Weiterleitung.
- `_handleStripeReturn()` kennt nur den alten Checkout-Flow (`?stripe=success`), **nicht** die
  Payment-Element-Rückgabe (`?payment_intent=…&redirect_status=succeeded`).
- Zusätzlich: Dienstleister sieht Buchungen nur für **echte** DB-Inserate (`eb_board_bookings_get`).

## Entscheidungen

### A. Rollen-Modell (kehrt gestrigen Hart-Redirect teilweise um)
- Nur **eine** Einschränkung: Event-Planer sieht kein Auftragsboard (`auftraege`→`board`).
- Dienstleister bekommt **beide** Menüpunkte (Planungs-Board + Auftragsboard).
- `_applyRoleNav()`: `boardMenuBtn` immer sichtbar; `auftraegeMenuBtn` nur Dienstleister;
  Mobile-Slot immer „Board"; `btnAddToBoard` für alle (auch Dienstleister planen Events).
- `navigateTo`-Weiche: nur noch `auftraege`→`board` für Event-Planer.

### B. Zahlungsfluss (Kern)
- **Pending-Persistenz**: vor `confirmPayment` ein serialisierbares Objekt in
  `localStorage['eb_pending_payment']` ablegen (`type:'instant'|'card'` + nötige Daten).
- **Wiederverwendbare Apply-Helfer** (von inline-onSuccess UND Redirect-Rückkehr genutzt):
  - `_applyInstantBookingSuccess(info, res)` – „Direktbuchungen"-Karte anlegen.
  - `_applyCardPaymentSuccess(cardId, projectId, amount, res)` – bestehende Karte auf bezahlt.
  - `_showBookingSuccess(info)` – einheitlicher Erfolgs-Screen mit Aufklärung + „Zum Board".
- **Redirect-Rückkehr**: `_handleStripeReturn()` erkennt `payment_intent`+`redirect_status`,
  verifiziert via `/stripe/verify-payment`, wendet das Pending an, zeigt den Erfolgs-Screen,
  räumt Pending + URL auf (async board-load für `type:'card'` abwarten).
- **Resonanz für Dienstleister**: auch bei Instant-Booking `_sendInvoiceNotification(...)` senden,
  damit der Dienstleister unabhängig vom Board-Scan benachrichtigt wird.
- **Beide Boards**: Zahler-Board erhält Karte (Fix), Dienstleister via `board-bookings`
  (echte Inserate). Demo-Inserate ohne echten Anbieter bleiben naturgemäß ohne Empfänger.

### C. Layout
- Auftragsboard: große „So funktioniert's"-Infobox einklappbar/kompakt → mehr Platz für
  Buchungskarten. Board-Vollansicht prüfen/sicherstellen. Bewusst risikoarm gehalten.

## Verifikation
- `node --check app.js`.
- Logik-Test der Rollen-Nav (Dienstleister sieht beide, Event-Planer nur Planung) per node-VM.
- Pending-Persistenz/Redirect-Pfad: simulierter Return mit gesetztem `eb_pending_payment`.
- Manuell live: Instant-Booking mit 3-D-Secure-Testkarte (`4000 0027 6000 3184`) → Redirect →
  Erfolgs-Screen + Karte in beiden Boards.
