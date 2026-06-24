# Design: Chat als vernetzte Anfrage- & Verhandlungs-Drehscheibe

**Datum:** 2026-06-24 · **Bezug:** Chat-Ausbau („voll umfangreich") · **Status:** Freigegeben (Scope + Architektur)

## Vision

Jede Anfrage auf der Plattform — egal ob von einer **Listing-Detailseite**, **Unterseiten-CTAs**
oder dem **Planungsboard** — läuft über *einen* Kommunikationsweg: sie erzeugt im Chat eine
**erkennbare System-Anfrage mit allen Details** und parallel eine **reiche, deep-verlinkte E-Mail**.
**Gegenangebote** erscheinen nur bei Inseraten mit **Verhandlungsbasis (VB / `negotiable`)**.

## Ist-Zustand (Gap-Analyse, verifiziert)

- 8 Einstiegspunkte rufen den `conversations`-POST-Endpoint (app.js 5011/5680/5706/5745/5821/10903/13889/16998), aber **uneinheitlich** (nicht alle übergeben vollen Kontext).
- Der Endpoint (functions.php ~4337) legt nur eine **Plain-System-Nachricht** an: „Gespräch gestartet über „{Titel}"" — **ohne** Details.
- Die reichen Anfrage-Details (Datum, Event-Typ, Budget, Nachricht) landen aktuell nur in der **E-Mail** (functions.php ~4520), **nicht** im Chat.
- System-Nachrichten werden 7× als simples `<div class="msg msg-system">text</div>` gerendert — **keine** Detail-Karte.
- `negotiable` (VB) existiert als Feld (eb_listings, API `(bool)`), aber der **Gegenangebot-Button ist nicht darauf gegated** (app.js ~5775 prüft nur Login + nicht-eigenes-Inserat).

## Komponenten

### A — Einheitliche Anfrage-Pipeline (`sendInquiry`)

Ein Client-Helper `sendInquiry(opts)`, den **alle** Einstiege nutzen:

```js
sendInquiry({
  providerId, listingId,        // Ziel
  message,                      // Freitext des Anfragenden
  eventDate, eventType, budget, // strukturierter Kontext (optional je Quelle)
  source                        // 'listing' | 'board' | 'subpage:<name>' | 'profile'
})
```

Er ruft `POST /conversations` mit `{ other_user_id, listing_id, inquiry:{...} }`. Bestehende
Einstiegspunkte werden auf `sendInquiry` umgestellt (Audit der 8 Call-Sites + Board-/Unterseiten-CTAs).

### B — Strukturierte System-Anfrage als Karte

**Backend** (`conversations`-Endpoint): legt die System-Nachricht mit **JSON-`body`** an, getaggt
zur Erkennung:

```json
{"_eb":"inquiry","title":"…","image":"…","listingId":123,"date":"…","eventType":"…","budget":"…","source":"listing","message":"…"}
```

Bei **bestehender** Konversation: zusätzliche System-Anfrage-Nachricht anhängen (kein Duplikat
der Konversation) + E-Mail.

**Client-Render:** System-Nachricht, deren `body` als getaggtes Inquiry-JSON parst →
**Detail-Karte** `_renderSystemInquiryCard(data)`: „**Systemanfrage**"-Badge, Listing-Thumbnail +
Titel, Datum, Event-Typ, Budget, Quelle, der Nachrichtentext. Nicht-JSON-System-Nachrichten →
bestehender Plain-Text (abwärtskompatibel).

### C — Gegenangebot nur bei VB

Verhandlungs-/Gegenangebot-Einstiege (`openNegotiationInChat`, `openCounterOffer`, der
„Gegenangebot"-Button auf der Detailseite und im Chat) nur **sichtbar/aktiv**, wenn das relevante
Listing `negotiable === true`. Bei Festpreis: Button ausblenden + dezenter Hinweis „Festpreis —
keine Verhandlung". **Server-Guard:** der Offer-/Counter-Endpoint lehnt Gegenangebote auf
`negotiable=0`-Listings ab (400), damit die Regel nicht nur UI-seitig gilt.

### D — E-Mail konsistent

Dieselbe reiche Anfrage-Mail (bestehendes Template, functions.php ~4520) aus **allen** Einstiegen,
gespeist aus demselben `inquiry`-Payload → Chat-Karte **und** Mail tragen identische Details +
denselben Deep-Link in den Chat.

## Datenfluss

```
Einstieg (Listing / Board / Unterseite)
  → sendInquiry({providerId, listingId, message, eventDate, eventType, budget, source})
    → POST /conversations { other_user_id, listing_id, inquiry }
       ├─ Konversation finden/erstellen
       ├─ System-Nachricht body = JSON(inquiry)         → Chat: Detail-Karte
       └─ wp_mail reiche Anfrage-Mail + Deep-Link        → E-Mail
```

## Edge Cases / Sicherheit

- **Bestehende Konversation:** neue System-Anfrage anhängen (Endpoint gibt heute `existing:true` zurück → erweitern: auch dann Inquiry-Message + Mail).
- **Nicht-VB-Listing:** kein Gegenangebot (UI + Server); Erst-Anfrage/Buchung zum Festpreis bleibt erlaubt.
- **Abwärtskompat:** alte Plain-System-Nachrichten („Gespräch gestartet …") rendern unverändert.
- **XSS:** alle Inquiry-Felder bei Render (`_escHtml`) und in der Mail (`esc_html`) escapen; JSON nur server-seitig erzeugt, Client parst defensiv (try/catch, Tag-Check `_eb==='inquiry'`).
- **Self-Inquiry:** eigenes Inserat anfragen bleibt blockiert (bestehende Prüfung).

## Verifikation

- `php -l functions.php`, `~/node-v22/bin/node --check app.js`, Rebuild `index.html` (app-shell betroffen).
- Server live (von mir): Anfrage erzeugt JSON-System-Nachricht; `conversations`-Endpoint kein 500; Offer-Endpoint lehnt Gegenangebot auf non-VB ab.
- **Eingeloggter Browser-Check (Nutzer):** Anfrage aus Listing/Board/Unterseite → erkennbare Detail-Karte im Chat + Mail mit identischen Details; Gegenangebot nur bei VB-Inseraten; alle Einstiege landen im selben Chat.

## Offene Punkte

- Genaue Liste der „Unterseiten-CTAs", die noch nicht über `sendInquiry` laufen → im Plan via Audit der Call-Sites bestimmt.
- Budget-Quelle je Einstieg (Listing-Preis vs. freie Eingabe) → im Plan je Call-Site festgelegt.
