# Chat-Anfragen vernetzen & VB-Gegenangebote — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Listing-Anfragen auf den bestehenden `kind:'inquiry'`-Mechanismus umstellen (erbt reiche Karte + Mail), Quelle anzeigen, Gegenangebote auf VB (`negotiable`) gaten (UI + Server).

**Architecture:** Wiederverwendung des vorhandenen Inquiry-Systems (`_renderBookingCard`, Inquiry-E-Mail in `eb_messages_send`, Board-`kind:'inquiry'`). Kleine, gezielte Änderungen — kein neues System.

**Tech Stack:** Vanilla-JS (`app.js`), app-shell.html (Detail-Button → rebuild), PHP (`functions.php`). **Verifikation:** `php -l`, `node --check`, Server-Live (400 auf non-VB-Offer), eingeloggter Browser-Check (Nutzer).

**Spec:** `docs/superpowers/specs/2026-06-24-chat-anfrage-drehscheibe-design.md`

**Sicherheitsnetz:** `git branch backup/chat-inquiry-2026-06-24` vor Task 1.

---

### Task 1 (A): `bookListing` → `kind:'inquiry'` + source

**Files:** Modify `app.js` (bookListing, ~5751–5762)

- [ ] **Step 1: bookingText um kind+source ergänzen**

Finde:

```js
      var bookingText = JSON.stringify({
        listing: currentListing.title || '',
        date: date,
        eventType: eventType,
```

Ersetze durch:

```js
      var bookingText = JSON.stringify({
        kind: 'inquiry',
        source: 'listing',
        listing: currentListing.title || '',
        date: date,
        eventType: eventType,
```

- [ ] **Step 2: type:'booking' → 'message' (triggert Inquiry-Mail-Zweig)**

Finde:

```js
        body: JSON.stringify({ content: bookingText, type: 'booking' })
```

Ersetze durch:

```js
        body: JSON.stringify({ content: bookingText, type: 'message' })
```

- [ ] **Step 3: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && echo OK
git add app.js
git commit -m "#chat-A bookListing sendet kind:'inquiry'+source (erbt reiche Karte+Mail)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2 (B): Quelle in Karte, Mail, Board-Send

**Files:** Modify `app.js` (`_renderBookingCard` ~4828, Board-Send ~16998), `functions.php` (Inquiry-Mail ~4530)

- [ ] **Step 1: Quelle-Zeile in der Karte**

In `_renderBookingCard`, nach der Label-Zeile (`html += '<div class="cbc-label">… Projekt-Anfrage …'`),
füge ein:

```js
  if (isInquiry && data.source) {
    var _srcTxt = data.source === 'board' ? 'aus dem Planungsboard' : (data.source === 'listing' ? 'von der Inseratsseite' : '');
    if (_srcTxt) html += '<div class="cbc-source" style="font-size:12px;color:#717171;margin:2px 0 6px">Anfrage ' + _srcTxt + '</div>';
  }
```

- [ ] **Step 2: Board-Send um source ergänzen**

Im Board-Inquiry-Send (app.js ~16977, `kind: 'inquiry',`) ergänze direkt darunter `source: 'board',`.
Exakten Block beim Ausführen via `grep -n "kind: 'inquiry'," app.js` bestätigen.

- [ ] **Step 3: Quelle in der Inquiry-Mail**

In `functions.php` `eb_messages_send`, im Inquiry-Mail-Block (nach der „Systemgenerierte
Projekt-Anfrage"-Kopfzeile), füge eine Herkunftszeile ein, wenn `$inquiry['source']` gesetzt:

```php
            if ( ! empty( $inquiry['source'] ) ) {
                $src_txt = $inquiry['source'] === 'board' ? 'aus dem Planungsboard' : ( $inquiry['source'] === 'listing' ? 'von der Inseratsseite' : '' );
                if ( $src_txt ) $message .= '<div style="padding:2px 0 8px;color:#717171;font-size:13px">Anfrage ' . esc_html( $src_txt ) . '</div>';
            }
```
(Exakte Einfügestelle beim Ausführen anhand des Mail-Blocks ~4530 wählen.)

- [ ] **Step 4: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && php -l functions.php
git add app.js functions.php
git commit -m "#chat-B Quelle (source) in Inquiry-Karte, Mail und Board-Send

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3 (C-UI): Gegenangebot nur bei VB

**Files:** Modify `app.js` (`openNegotiationInChat` ~5843, `openCounterOffer` ~5865, `loadDetail`), `app-shell.html`

- [ ] **Step 1: Guard in den Verhandlungs-Funktionen**

Am Anfang von `openNegotiationInChat` und `openCounterOffer` (jeweils nach den bestehenden
Login-/Eigeninserat-Checks) einfügen:

```js
  if (currentListing && currentListing.negotiable === false) {
    showToast('Dieses Inserat ist ein Festpreis — kein Gegenangebot möglich.', 'info');
    return;
  }
```

- [ ] **Step 2: Detail-Button bei Festpreis ausblenden**

In `loadDetail` (nachdem `currentListing`/`listing` gesetzt ist), den Preisverhandlungs-Button
(app-shell `onclick="openNegotiationInChat()"`, in der Buchungskarte) ausblenden, wenn nicht VB.
Anker via `grep -n 'openNegotiationInChat()' app-shell.html` → das Button-Element bekommt eine
ID (z.B. `id="detailNegotiateBtn"`), und `loadDetail` setzt
`var nb=document.getElementById('detailNegotiateBtn'); if(nb) nb.style.display = listing.negotiable ? '' : 'none';`.
(app-shell-Änderung → danach `./build-index-html.sh`.)

- [ ] **Step 3: Chat-Karten-Button gaten**

Der „Gegenangebot"-Button in der Inquiry-Karte (app.js ~4868) wird nur gerendert, wenn das
zugehörige Listing VB ist — falls die Karte den negotiable-Status nicht kennt, greift der
Funktions-Guard aus Step 1 (funktional ausreichend; Server-Guard in Task 4 als Netz).

- [ ] **Step 4: Build + Syntax + Commit**

```bash
./build-index-html.sh
~/node-v22/bin/node --check app.js && php -l index.php
git add app.js app-shell.html index.html
git commit -m "#chat-C UI: Gegenangebot nur bei negotiable (Guards + Detail-Button-Hide)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4 (C-Server): Offer auf non-VB ablehnen

**Files:** Modify `functions.php` (`eb_messages_send`, vor dem Offer-Insert ~4480)

- [ ] **Step 1: Server-Guard**

In `eb_messages_send`, **bevor** eine `offer`-Nachricht eingefügt wird (msg_type === 'offer'),
das Listing der Konversation prüfen:

```php
    if ( $msg_type === 'offer' && $conv->listing_id ) {
        $neg = $wpdb->get_var( $wpdb->prepare(
            "SELECT negotiable FROM {$wpdb->prefix}eb_listings WHERE id = %d", (int) $conv->listing_id
        ) );
        if ( $neg !== null && (int) $neg === 0 ) {
            return new WP_REST_Response( array( 'message' => 'Dieses Inserat ist ein Festpreis — Gegenangebote sind nicht möglich.' ), 400 );
        }
    }
```
(Exakte Stelle: nach dem Autorisierungs-/`$conv`-Lookup, vor `$wpdb->insert( … eb_messages …)`.)

- [ ] **Step 2: Lint + Commit**

```bash
php -l functions.php
git add functions.php
git commit -m "#chat-C Server: type:offer auf negotiable=0-Listing → 400

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Deploy + Verifikation

- [ ] **Step 1: Lints + Rebase + Push**

```bash
php -l functions.php && ~/node-v22/bin/node --check app.js
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 2: Deploy abwarten (app.js live)**

```bash
for i in $(seq 1 12); do curl -s "https://xn--eventbrse-57a.de/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -q "kind:'inquiry'" && { echo live; break; }; sleep 15; done
```

- [ ] **Step 3: Browser-Verifikation (Nutzer, eingeloggt)**

- Listing-Anfrage (Buchungsformular) senden → im Chat **dieselbe „Projekt-Anfrage"-Karte** wie
  beim Board, mit „Anfrage von der Inseratsseite"; Empfänger-Mail = reiche „Systemgenerierte
  Projekt-Anfrage" (kein rohes JSON).
- VB-Inserat: „Gegenangebot" vorhanden & funktioniert. Festpreis-Inserat: Button weg + bei
  forciertem Offer Server-400.

---

## Self-Review

**Spec-Coverage:** A bookListing→inquiry (Task 1) ✓; B Quelle Karte/Mail/Board (Task 2) ✓;
C-UI Gating (Task 3) + C-Server Guard (Task 4) ✓; Verifikation (Task 5) ✓.

**Placeholder-Hinweis:** Task 2 Step 2/3 und Task 3 Step 2 / Task 4 Step 1 verweisen für die
*exakte Einfügestelle* auf `grep`-Bestätigung beim Ausführen (Mail-Block, Board-Send, Offer-Insert)
— Inhalt/Code ist vollständig vorgegeben, nur die Zeile wird zur Laufzeit fixiert.

**Konsistenz:** `kind:'inquiry'`/`source`-Felder identisch in Send (Task 1/2) und Render/Mail
(Task 2). VB aus `negotiable` (Client `currentListing.negotiable`, Server Listing-Lookup) —
doppelt abgesichert (UI + 400-Guard).
