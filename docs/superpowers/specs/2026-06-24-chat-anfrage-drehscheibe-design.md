# Design: Chat-Anfragen vernetzen & VB-Gegenangebote (korrigiert)

**Datum:** 2026-06-24 · **Bezug:** Chat-Ausbau · **Status:** Freigegeben (auf bestehenden Mechanismus korrigiert)

## Korrektur-Hinweis

Erste Spec-Annahme war falsch: Das Inquiry-Karten-/E-Mail-System **existiert bereits** und wird
wiederverwendet — **kein** paralleles System. Konkret vorhanden:
- `_renderBookingCard()` (app.js ~4730) rendert Nachrichten mit JSON-`body` als reiche Karte;
  `data.kind === 'inquiry'` → „**Systemgenerierte Projekt-Anfrage**" (cbc-inquiry, Bild, Datum,
  Annehmen/Ablehnen). Lebenszyklus `inquiry`/`inquiry_accepted`/`inquiry_rejected`/`inquiry_cancelled` da.
- `eb_messages_send` (functions.php ~4500) rendert dasselbe `kind:'inquiry'`-JSON als reiche
  E-Mail („✦ Systemgenerierte Projekt-Anfrage").
- **Board** „Kontaktieren" (app.js ~16998) sendet bereits `kind:'inquiry'`.

## Ist-Zustand pro Einstiegspunkt (Audit)

| Einstieg | Verhalten | Bewertung |
|----------|-----------|-----------|
| **Board** „Kontaktieren" | `kind:'inquiry'` → reiche Karte **+** reiche Mail | ✅ Soll-Zustand |
| **Listing** `bookListing` (Buchungsanfrage) | `type:'booking'`, JSON **ohne `kind`** → schwächere „Anfrage"-Karte; Mail fällt auf generisch → **zeigt rohes JSON** | 🔴 Gap |
| `startChat` / `startChatWithProvider` (Plain „Nachricht senden") | leere Conversation, „Gespräch gestartet" | ✅ ok (keine strukturierte Anfrage) |
| **Gegenangebot** | nur Login + nicht-eigenes-Inserat geprüft | 🔴 nicht auf `negotiable` (VB) gegated |

## Ziel

Jede *strukturierte Anfrage* (Listing-Buchung, Board) erzeugt **dieselbe** reiche „Projekt-Anfrage"-
Karte im Chat **und** dieselbe reiche E-Mail, mit erkennbarer **Quelle**. Gegenangebote nur bei VB.

## Komponenten

### A — `bookListing` auf das bestehende `kind:'inquiry'` umstellen

`bookListing` (app.js ~5745) sendet künftig statt `{ content: bookingText, type:'booking' }` ein
`kind:'inquiry'`-JSON mit denselben Feldern, die Karte/Mail erwarten:

```js
{ kind:'inquiry', listing:<titel>, image:<bild>, date:<datum>, eventType:<kategorie>,
  price:<priceLabel>, message:<freitext>, source:'listing' }
```

Damit erbt die Listing-Anfrage automatisch die reiche Karte (`cbc-inquiry`) **und** die reiche
E-Mail (`eb_messages_send`-Inquiry-Zweig). Der bisherige rohe-JSON-Mail-Bug entfällt.
Audit ergab keine weiteren strukturierten Einstiege, die umzustellen wären (Plain-„Nachricht
senden" bleibt bewusst leer).

### B — Quelle (`source`) in Karte & Mail

`source`-Feld (`'listing'` | `'board'` | künftige) wird in der Karte (`_renderBookingCard`) und in
der E-Mail (eb_messages_send) als kleine Herkunftszeile gezeigt: „Anfrage von der Inseratsseite" /
„… aus dem Planungsboard". Board-Sends bekommen `source:'board'` ergänzt. Abwärtskompatibel
(fehlt `source` → keine Zeile).

### C — Gegenangebot nur bei VB (`negotiable`)

- **UI:** Verhandlungs-/Gegenangebot-Einstiege (`openNegotiationInChat`, `openCounterOffer`,
  „Gegenangebot"-Button Detailseite + Chat) nur sichtbar/aktiv wenn das relevante Listing
  `negotiable === true`. Bei Festpreis: Button aus + dezenter Hinweis „Festpreis".
- **Server-Guard:** `eb_messages_send` lehnt `type:'offer'` ab, wenn das Listing der Konversation
  `negotiable = 0` ist (400 mit Hinweis). Erst-Anfrage/Buchung zum Festpreis bleibt erlaubt.

## Datenfluss (unverändert, nur vereinheitlicht)

```
Listing bookListing / Board Kontaktieren
  → POST /conversations {other_user_id, listing_id}
  → POST /messages { content: JSON{kind:'inquiry', …, source}, type:'message' }
       ├─ Chat: _renderBookingCard → cbc-inquiry-Karte (mit Quelle)
       └─ eb_messages_send: reiche Inquiry-Mail (mit Quelle) + Deep-Link
```

## Edge Cases / Sicherheit

- **Abwärtskompat:** bestehende `type:'booking'`-Altnachrichten rendern weiter (booking-Zweig bleibt).
- **Nicht-VB:** kein Gegenangebot (UI + Server); Erst-Buchung zum Festpreis erlaubt.
- **XSS:** Felder in Karte (`_escHtml`) und Mail (`esc_html`) escapen (bestehend).
- **VB-Quelle:** `negotiable` kommt aus dem Listing der Konversation (Server-Lookup), nicht aus dem Client.

## Verifikation

- `php -l functions.php`, `~/node-v22/bin/node --check app.js`, Rebuild `index.html` falls app-shell betroffen (VB-Button Detailseite).
- Server live (von mir): `type:'offer'` auf non-VB-Listing → 400; `conversations`/`messages` kein 500.
- **Eingeloggter Browser-Check (Nutzer):** Listing-Anfrage → identische „Projekt-Anfrage"-Karte wie Board + reiche Mail (kein rohes JSON); Quelle sichtbar; Gegenangebot nur bei VB-Inseraten.

## Offene Punkte

Keine — Scope auf den realen Gap (A Listing→inquiry, B Quelle, C VB-Gating) eingegrenzt.
