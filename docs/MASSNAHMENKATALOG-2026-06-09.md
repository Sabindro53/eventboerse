# Eventbörse — Priorisierter Maßnahmenkatalog

**Stand:** 2026-06-09 · **Methode:** Code-Audit (app.js 20.769 Z., functions.php 6.741 Z., styles.css 14.716 Z., webauthn.php) + Live-Test auf eventbörse.de (Desktop & Mobile-Viewport)

Alle Findings wurden im Code UND live verifiziert. Sortierung: Impact zuerst, innerhalb der Stufen nach Aufwand (kleinster zuerst).

---

## P0 — Kritisch (Sicherheit & Geld)

### 1. Stripe: Betrag kommt ungeprüft vom Client 🔴 ✅ ERLEDIGT (2026-06-09)
**Problem:** Beide Zahlungs-Endpoints übernahmen `amount` direkt aus dem Request-Body ohne Server-Abgleich gegen Angebot oder Listing-Preis — jeder eingeloggte Nutzer konnte eine 500-€-Buchung für 1 € bezahlen. *(Korrektur zum Erstbefund: die Endpoints waren login-geschützt, nicht öffentlich — die Betragsmanipulation war trotzdem möglich.)*
**Umgesetzt:** (a) Toter Endpoint `/stripe/create-checkout` deaktiviert (vom Frontend unbenutzt, keine Connect-Weiterleitung). (b) `create-payment-intent` validiert jetzt server-seitig via `eb_stripe_validate_booking_amount()`: Betrag muss einem akzeptierten Chat-Angebot zwischen Käufer und Anbieter entsprechen ODER ≥ Listing-Basispreis sein (Listings ohne Preis bleiben frei). Fehlermeldung verweist auf den offiziellen Angebotsweg im Chat.

### 2. Kein Brute-Force-Schutz auf /login 🔴 ✅ ERLEDIGT (2026-06-09)
**Umgesetzt:** Transient-basiertes Rate-Limit im Login-Handler (gleiches Muster wie Registrierung): 5 Fehlversuche pro E-Mail+IP → 15 min Sperre (429); 20 Fehlversuche pro IP/Stunde über alle Konten → 1 h Sperre. Zähler wird nur bei Fehlversuchen erhöht, bei Erfolg zurückgesetzt.

### 3. E-Mail-Verifizierungstoken läuft nie ab 🟠 ✅ ERLEDIGT (2026-06-09)
**Umgesetzt:** Token wird mit `eb_email_verify_expires` (48 h) gespeichert; Verify-Handler prüft Ablauf (410 + Hinweis auf „E-Mail erneut senden"). Alt-Tokens ohne Expires-Meta gelten als abgelaufen. Aufräumen in allen drei Verify-Pfaden.

---

## P1 — Wichtig (Vertrauen, Auffindbarkeit, Performance)

### 4. SEO ist faktisch tot — und peinlich sichtbar 🔴
**Live verifiziert:**
- Die deployte `sitemap.xml` ist die WordPress-Default-Sitemap mit `sample-page/`, `hello-world/` und `category/uncategorized/` — kein einziges echtes Listing.
- Die live `robots.txt` ist ebenfalls WP-Default; die gepflegten Repo-Dateien sind **nie deployed worden**.
- Obendrein sind die Repo-Versionen von `robots.txt` und `sitemap.xml` ungültig: Sie enthalten Markdown-Codefences (```` ``` ````) im Dateiinhalt.
- Beide Repo-Dateien verweisen auf die **falsche Punycode-Domain** `xn--eventbrse-q5a.de` — die echte ist `xn--eventbrse-57a.de`.
- `<title>` und Meta-Tags bleiben auf Detailseiten statisch („EventBörse – Dein Event-Marktplatz…"), Listing-Deep-Links haben keine eigenen Meta-Daten.

**Umgesetzt (a+b, 2026-06-09):** Ursache gefunden — das SFTP-Deployment spiegelt ins **Theme-Verzeichnis**, statische robots.txt/sitemap.xml erreichen den Webroot nie. Beide werden jetzt aus `functions.php` heraus generiert: `eb_seo_robots_txt` (robots_txt-Filter) und `eb_seo_serve_sitemap` (init-Hook, dynamisch aus `eb_listings` mit korrekten `/detail/{id+10000}`-URLs und `home_url()` — keine hardcodierte Domain mehr). Statische Repo-Dateien sind als Referenz markiert. **Nach dem Deploy live testen:** `/robots.txt` und `/sitemap.xml` abrufen.
**Offen (c):** `document.title` + Meta-Description je Seite im Router setzen (~2 h).

### 5. Demo-Daten dominieren weiterhin die Plattform 🟠
**Live verifiziert:** `LISTINGS` enthält 22 Einträge, davon nur **7 aus der DB** — 15 hardcodierte Demo-Inserate laufen in Produktion mit. Die Startseite wirbt mit „150+ Dienstleister · 4.8★", real existieren 7 Listings mit 0 Bewertungen. Das ist ein Vertrauensrisiko (und wettbewerbsrechtlich heikel).
**Fix:** Demo-Arrays entfernen oder serverseitig per `hide-demo`-Flag dauerhaft aus; Marketing-Zahlen dynamisch aus der DB (`COUNT(*)`) oder ehrlich formulieren („Neu gestartet").
**Aufwand:** ~4–6 h (P0 im Vault, seit April offen)

### 6. Ladezeit: 4,4 s Desktop, Splash bis >7 s mobil 🟠
**Gemessen:** `load` 4.360 ms, DOMContentLoaded 2.918 ms, 139 Requests. app.js 222 KB / styles.css 150 KB übertragen (900 KB / 412 KB unminifiziert, nur gzip). Der Lade-Splash überdeckt dabei bereits fertig gerenderten Inhalt — gefühlte Wartezeit ist länger als nötig.
**Fix (gestaffelt):**
1. Splash früher ausblenden (sobald Router gerendert hat, nicht erst nach allen API-Calls) — 1 h
2. Minifizieren beim Deployment (esbuild/terser-Step in GitHub Action, kein lokaler Build nötig) — ~2 h, spart ~60 %
3. Demo-Daten raus (Punkt 5) spart weitere ~400 Zeilen Parse-Zeit
**Aufwand:** gesamt ~3–4 h

### 7. index.html und index.php driften auseinander 🟠
**Problem:** Zwei Kopien derselben 3.500-Zeilen-SPA-Shell, 589 Zeilen Diff. `manifest.json` ist z. B. nur in index.php verlinkt, `format-detection` nur in index.html. Jede UI-Änderung muss doppelt gepflegt werden — das geht garantiert irgendwann schief.
**Fix:** index.php generiert den Body aus index.html (readfile + Header-Injection) oder die GitHub Action baut index.php aus index.html. Eine Quelle der Wahrheit.
**Aufwand:** ~3 h

### 8. Polling-Last: 4 parallele Timer pro offenem Tab 🟡
Chat alle 3 s, Board-Sync alle 15 s, Heartbeat + Inactivity alle 30 s. Bei wachsender Nutzerzahl skaliert das schlecht auf IONOS-Shared-Hosting (jeder Poll = voller WordPress-Bootstrap).
**Fix kurzfristig:** Chat-Poll auf 5–8 s mit Backoff bei Inaktivität; Polls pausieren wenn Tab `document.hidden`. **Langfristig:** SSE (geht auch auf Shared Hosting, im Gegensatz zu WebSockets).
**Aufwand:** kurzfristig ~2 h · SSE ~1–2 Tage

---

## P2 — Verbesserungen (UX-Politur & Hygiene)

### 9. PWA ist halb fertig verkabelt
`sw.js` (5,6 KB, fertig geschrieben) wird **nirgends registriert** — kein `navigator.serviceWorker.register()` in app.js/index.html/index.php. `manifest.json` nur in index.php verlinkt. Push & Installierbarkeit (P2 im Vault) sind damit 90 % fertig, aber 0 % aktiv.
**Aufwand:** ~1 h für Registrierung + Test

### 10. UX-Inkonsistenzen aus dem Live-Test
- **Preiseinheit wechselt:** Karte „ab 120 € / Stunde" → Detailseite „ab 120 € / Event" (gleiche Anzeige-Quelle vereinheitlichen)
- **Suche per Enter** führt nicht zu Ergebnissen, sondern zeigt nur die Pill „1 Treffer — Ergebnisse anzeigen", die nochmal geklickt werden muss → Enter sollte direkt scrollen/navigieren
- **„Gesucht"-Inserate** („Suche DJ für 28. Geburtstag", „Klavierspieler gesucht") stehen unmarkiert zwischen Anbieter-Inseraten mit „ab 99 €/Event"-Preisen — Nutzer können Anbieter und Gesuche nicht unterscheiden → eigener Badge/Filter „Gesuch"
- **/browse-Deep-Link** kollabiert zu `/` (URL-State geht verloren); /detail/{id} funktioniert
**Aufwand:** je ~1–2 h

### 11. Repo-Hygiene: 12 tote JS-Dateien + Altlasten
`eb-router.js`, `eb-state.js`, `app-router.js`, `app-state.js`, `app-utils.js`, `db-bridge.js`, `mock-data.js`, `listings-loader.js`, `app-demo-patch.js`, `app-init-override.js`, `app_patch_listings.js`, `ux-improvements.js` — alle nirgends referenziert. Dazu: `Attached Element Context from Integrated`(.txt), leere `Stripe.md`, `_PATCH_ANLEITUNG.md`. Verwirrt jede künftige (KI-)Session und wird mit deployed.
**Aufwand:** 30 min Aufräumen

### 12. CSS-Hygiene
198× `!important`, stark duplizierte Selektoren (`.eb-qa-icon-svg` 25×, `.listing-card` 20×, `.btn-primary` 16×), nur 5 `prefers-reduced-motion`-Blöcke bei sehr animationslastiger UI. Positiv: 27× `focus-visible`, mobile-first steht.
**Fix:** Bei Gelegenheit Duplikate konsolidieren; Animationen (Konfetti, Splash) unter `prefers-reduced-motion` stellen.
**Aufwand:** inkrementell

### 13. Accessibility-Grundlagen
Nur 28 `aria-`-Attribute in 20.000 Zeilen UI-Code; einzelne `<img>` ohne `alt`. Icon-Buttons (Favoriten-Herz, Galerie-Pfeile) brauchen `aria-label`.
**Aufwand:** ~3–4 h für die wichtigsten Flows

### 14. Doku/Vault veraltet
CLAUDE.md & Vault nennen 14.700 Zeilen app.js (real: 20.769), 67 Endpoints (real: 80 Routen), 4.429 Zeilen functions.php (real: 6.741). Falsche Zahlen führen KI-Sessions in die Irre.
**Aufwand:** 15 min

---

## Was bereits gut ist (nicht anfassen)

- **Upload-Härtung:** Magic-Bytes-Check, Doppel-Extension-Block, 5-MB-Limit, `wp_check_filetype_and_ext` — vorbildlich
- **Stripe-Webhook:** Signaturprüfung vorhanden, 500 ohne Secret (kein stilles OK), Key-Redaction in Fehlermeldungen
- **Messaging-Autorisierung:** Teilnehmer-Check auf Conversation-Ebene mit prepared statements
- **SQL:** durchgängig `$wpdb->prepare` bei Nutzereingaben
- **XSS:** `_escHtml()` wird konsequent genutzt (252 Aufrufe)
- **WebAuthn:** Challenge-TTL 5 min, `hash_equals`, Origin-Prüfung

## Empfohlene Reihenfolge (Quick-Win-Pfad)

| Woche | Maßnahmen | Effekt |
|-------|-----------|--------|
| 1 | #1 Checkout-Betrag, #2 Login-Rate-Limit, #3 Token-Ablauf, #4a robots/sitemap-Fix | Sicherheitslücken zu, SEO-Peinlichkeit weg |
| 2 | #5 Demo-Daten raus, #6.1+6.2 Splash & Minify, #11 Repo aufräumen | Echte Plattform, halbe Ladezeit |
| 3 | #4b+c dynamische Sitemap & Meta-Tags, #9 PWA aktivieren, #10 UX-Fixes | Auffindbarkeit + Politur |
| 4+ | #7 Shell-Vereinheitlichung, #8 SSE, #13 A11y | Wartbarkeit & Skalierung |
