# Design: Demo-Daten sauber an den Admin-Master-Switch koppeln

**Datum:** 2026-06-21 · **Katalog-Bezug:** #5 (Demo-Daten) · **Status:** Entwurf zur Freigabe

## Problem

Die Plattform zeigt echten Besuchern Demo-Inhalte und irreführende Marketing-Zahlen:

- **Live verifiziert (2026-06-21):** `EB_HIDE_DEMO=false`. Die Startseite bewirbt
  „**150+ Dienstleister · 4.8★ Ø Bewertung". Real existieren **7 Listings, 0 Bewertungen,
  Rating 0** bei allen. Das ist ein Vertrauens- und Rechtsrisiko (irreführende Werbung,
  P2B/UWG).
- Es existiert bereits ein Admin-Switch (`/admin/hide-demo`, WP-Option `eb_hide_demo`,
  als `window.EB_HIDE_DEMO` injiziert), **aber er steuert nur die Listings.**
  Demo-Chats, Demo-Events und die Marketing-Zahlen laufen an ihm vorbei:

| Demo-Daten | Aktuelles Gating | Leck |
|------------|------------------|------|
| Listings (`const LISTINGS`, app.js:332) | `isDemoListing` / `EB_HIDE_DEMO` | — am Switch |
| Chats (`renderChatList`, app.js:4879) | nur `!isLoggedIn` | ignoriert Switch |
| Events (app.js:8495) | nur `!isLoggedIn` | ignoriert Switch |
| Marketing-Zahlen (index.html/php) | statisch „150+" / „4.8★" | komplett hartcodiert |

Hinweis: Demo-**Reviews** (`DEMO_REVIEWS`) sind faktisch schon auf Demo-Listings begrenzt —
`renderDetailReviews` routet echte DB-Listings zur API (`loadDetailReviews`), nur
Demo-Listings fallen auf `getAllReviewsForListing` zurück. Kein eigenes Gating nötig.

## Ziel

Der **eine** Admin-Switch „Demo ausblenden/einblenden" steuert **sämtliche** Demo-Daten
sauber. Demo-Daten bleiben im Code erhalten (nicht löschen) — sie sind ein bewusstes
Schaufenster-/Seed-Feature. Marketing-Zahlen kommen dynamisch aus den tatsächlich
sichtbaren Daten und folgen damit automatisch dem Switch.

## Nicht-Ziele

- Demo-Daten löschen (ausdrücklich gewünscht: behalten + integrieren).
- index.html/index.php-Drift (#7) generell beheben — hier nur die Badge-Stellen synchron pflegen.
- Neue Server-Endpoints für Zählungen (Client rechnet aus dem geladenen Set).

## Design

### 1. Ein Master-Helper

```js
function demoVisible() { return !window.EB_HIDE_DEMO; }
```

Einzige Quelle der Wahrheit. Alle Demo-Gates referenzieren diesen Helper statt eigener
Bedingungen. `window.EB_HIDE_DEMO` wird unverändert server-seitig injiziert
(`eb_hide_demo`-Option, default '0').

### 2. Lecks schließen

- **Chats** (`renderChatList`, app.js:4879): Demo-Chats nur rendern wenn
  `!isLoggedIn && demoVisible()`. Andernfalls: dezenter Empty-State/CTA für Besucher
  („Melde dich an, um Chats zu sehen"), keine Demo-Chats.
- **Events** (app.js:8495): Event-Preview nur wenn `demoVisible()` (zusätzlich zur
  bestehenden `!isLoggedIn`-Bedingung). Sonst leeres Grid / bestehender Empty-State.
- **Listings**: bereits korrekt am Switch — unverändert.

### 3. Dynamische Marketing-Zahlen — `updateHeroStats()`

Rechnet aus dem **sichtbaren** Listing-Set (`LISTINGS` nach Demo-Filter — respektiert den
Switch bereits):

- **Dienstleister-Zahl** = Anzahl eindeutiger `providerId` über sichtbare Listings.
  Anzeige als echte Zahl (z.B. „7"), kein „150+".
- **Ø Bewertung** = arithmetischer Schnitt über sichtbare Listings mit `rating > 0`,
  auf eine Nachkommastelle. Gibt es **kein** bewertetes Listing → Badge zeigt „**Neu**"
  statt „0.0★".
- **Hero-Sub-Zeile** („150+ Dienstleister · Sofort kontaktierbar · Top bewertet") →
  Dienstleister-Teil dynamisch; bei 0 Bewertungen „Top bewertet" weglassen/neutralisieren.

Aufrufzeitpunkt: nach `loadDbListings()` (Startseiten-Render) und nach jedem Umschalten
des Demo-Flags im Admin-Bereich, damit die Zahlen sofort konsistent sind.

Kopplung an den Switch ergibt sich automatisch: Demo eingeblendet → sichtbares Set enthält
Demo → Zahlen zählen Demo mit; Demo ausgeblendet → nur echte.

### 4. Markup

`index.html` und `index.php` bekommen stabile IDs an den Badge-Elementen:
`#statProviders` (Dienstleister-Zahl), `#statRating` (Ø-Bewertung), `#heroSubProviders`
(Hero-Sub). Beide Shells **synchron** pflegen. JS schreibt Werte hinein; die statischen
„150+"/„4.8★" dienen nur noch als Fallback, falls JS nicht läuft.

### 5. Demo-Arrays

`LISTINGS` (Demo-Teil), `DEMO_CHATS`, `DEMO_EVENTS`, `DEMO_REVIEWS` bleiben im Code.
Nur das Gating wird zentralisiert.

## Datenfluss

```
eb_hide_demo (WP-Option)
      │  inject
      ▼
window.EB_HIDE_DEMO ──► demoVisible() ──┬─► Listings-Filter (bestehend)
                                        ├─► renderChatList  (neu gegated)
                                        ├─► Event-Preview   (neu gegated)
                                        └─► updateHeroStats() ──► #statProviders / #statRating / Hero-Sub
```

## Edge Cases

- **Demo aus, 7 echte Listings, 0 Reviews:** „7 Dienstleister", Rating-Badge „Neu".
- **Demo an:** Zahlen inkl. Demo (Schaufenster), z.B. „~22 Dienstleister, 4.8★".
- **Mehrere Listings pro Provider:** Dienstleister-Zahl zählt eindeutige `providerId`,
  nicht Listings.
- **JS deaktiviert:** statische Fallback-Werte bleiben sichtbar (SPA rendert ohne JS
  ohnehin nicht — akzeptabel).

## Verifikation

Kein automatisiertes Test-Harness im Projekt. Stattdessen:

1. `node --check app.js` (Syntax — ein Fehler killt die ganze SPA).
2. Lokal `python3 -m http.server` + manueller Klick durch Chat/Events/Startseite.
3. Nach Deploy live: Admin-Switch an/aus schalten und prüfen, dass Listings, Chats,
   Events UND die Zahlen jeweils konsistent mitschalten.

## Entschiedene Detailpunkte (2026-06-21, freigegeben)

- **Besucher-Empty-State bei Chats** (Demo aus, nicht eingeloggt): dezenter CTA
  „Melde dich an, um Chats zu sehen" statt Demo-Chats.
- **Hero-Sub bei 0 Bewertungen:** „Top bewertet" wird durch „Neu gestartet" ersetzt
  (nicht ersatzlos gestrichen).
