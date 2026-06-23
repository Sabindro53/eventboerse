# Bekannte Bugs

> Wird aktualisiert wenn Bugs gemeldet oder gefunden werden.

## Offen

### [CHAT] 8 Chat-Menü-Aktionen schlagen still fehl — Backend-Routen fehlen
**Gefunden:** 2026-06-16 (Self-Audit)
**Betrifft:** `app.js` (Chat-Menü, Nachrichten-Hover-Aktionen), `functions.php` (REST-API)
**Symptom:** UI-Buttons im Chat zeigen `showToast('Aktion fehlgeschlagen', 'error')` nach Klick. Die Frontend-Funktionen rufen REST-Endpoints auf, die in `functions.php` nicht via `register_rest_route` registriert sind:

| Frontend-Funktion | Endpoint | UI-Button |
|---|---|---|
| `hideMessageForMe()` (app.js:5172) | `POST messages/{id}/hide` | „Für mich löschen" pro Nachricht |
| `_markChatUnread()` (app.js:5365) | `DELETE conversations/{id}/read` | „Als ungelesen markieren" im Chat-Menü |
| `_clearChat()` (app.js:5373) | `DELETE conversations/{id}` | „Chat löschen" |
| `_toggleBlockUser()` (app.js:5396) | `POST/DELETE users/{id}/block` | „Blockieren / Blockierung aufheben" |
| `_reportUser()` (app.js:5421) | `POST users/{id}/report` | „Melden" |
| `_setChatFlag('mute')` (app.js:5351) | `POST/DELETE conversations/{id}/mute` | „Stummschalten" |
| `_setChatFlag('pin')` (app.js:5351) | `POST/DELETE conversations/{id}/pin` | „Anheften" |
| `_setChatFlag('archive')` (app.js:5351) | `POST/DELETE conversations/{id}/archive` | „Archivieren" |

**Reproduzieren:** Im Chat auf das 3-Punkte-Menü → eine der Aktionen klicken. Erwartet: Aktion wird ausgeführt. Tatsächlich: roter Toast „Aktion fehlgeschlagen".
**Status:** offen (P0 — UI verspricht Funktion, die nirgends implementiert ist)
**Proposed Fix:** REST-Routen in `functions.php` ergänzen + 1-2 User-Meta-Felder bzw. neue DB-Tabelle für `eb_conversation_flags` (mute/pin/archive/read-state) und `eb_user_blocks` / `eb_user_reports`. Siehe `vault/AI-Gedaechtnis/Audit-2026-06-16.md` für Detail-Vorschlag.

### [REPO] 12 ungenutzte JS-Patch-Dateien werden ausgeliefert
**Gefunden:** 2026-06-16 (Self-Audit)
**Betrifft:** Repo-Root (`app-state.js`, `app-router.js`, `app-utils.js`, `app-init-override.js`, `app-demo-patch.js`, `app_patch_listings.js`, `eb-router.js`, `eb-state.js`, `db-bridge.js`, `listings-loader.js`, `mock-data.js`, `ux-improvements.js`) + 2 Patch-Markdowns (`_PATCH_ANLEITUNG.md`, `_patch_demo_data.md`, `functions-analytics-patch.php`)
**Symptom:** Ca. 615 Zeilen JS werden per SFTP nach IONOS deployed, aber von keinem `<script>`-Tag in `index.html`/`index.php` oder via `wp_enqueue_script` in `functions.php` geladen. Sie können nur über direkte URL-Aufrufe (z.B. `/wp-content/themes/eventboerse/eb-state.js`) ausgeliefert werden — toter Code im Live-Theme.
**Reproduzieren:** `grep -rE "app-state\.js|eb-router\.js|...." index.html index.php functions.php` liefert keine Treffer.
**Status:** offen (P2 — kein Funktionsbug, aber Wartungslast + IDE-Verwirrung beim Refactor)
**Proposed Fix:** Dateien einzeln per `git rm` entfernen, nachdem stichprobenweise bestätigt ist, dass kein externer Service sie referenziert.

### [ADMIN] Moderationsrouten im Vault vs. Code abgleichen
**Gefunden:** 2026-06-06
**Betrifft:** Admin-Moderation, `functions.php`, Vault-Doku
**Symptom:** Ältere Vault-Notizen dokumentieren `/admin/listings/{id}/hide` und `/my-listing-moderation`; aktueller Code registriert diese REST-Routen nicht.
**Reproduzieren:** `rg -n "admin/listings|my-listing-moderation" functions.php` liefert keine Route.
**Status:** offen (P0/P1 prüfen, weil Admin-Ausblenden/Löschen produktrelevant ist)
**Update 2026-06-16:** Self-Audit bestätigt: in der aktuellen `app.js` ruft kein Frontend-Pfad diese Routen auf. Wahrscheinlich nie implementiert; Vault-Notiz war aspirativ. → Entscheidung nötig: a) Feature bauen oder b) Vault-Notizen archivieren.

### [PAYMENTS] Stripe Connect E2E noch nicht vollständig verifiziert
**Gefunden:** 2026-06-06
**Betrifft:** Stripe Connect, Payment Intent, Webhook/Reconcile
**Symptom:** Codepfade sind vorhanden, aber der komplette Testmodus-Durchlauf mit Dienstleister-Onboarding, Kundenzahlung, Application Fee und Webhook/Reconcile muss noch final geprüft werden.
**Status:** offen (P0 vor echten Zahlungswegen)

### [BOARD] Paketkarten benötigen Regressionstest nach Reload
**Gefunden:** 2026-05-22
**Betrifft:** `app.js` (Board: Paket-/Baustein-Flow)
**Symptom:** Funktionalität läuft, aber es fehlen noch automatisierte Regressionstests für Paket-Edit/Reload/Flow-Transitions.
**Status:** offen (P1)

## Behoben

### [SECURITY] `/admin/init` erlaubte jedem eingeloggten Nutzer Admin-Reset
**Gefunden:** 2026-06-20
**Betrifft:** `functions.php` `eb_admin_init()` (Route `/admin/init`, `permission_callback => is_user_logged_in`)
**Symptom:** Die Funktion löschte ungeprüft ALLE `eb_admin`-Metas und setzte sie auf zwei hartkodierte E-Mails. Jeder eingeloggte Nutzer konnte so legitim hinzugefügte Admins entfernen (Privilege-Manipulation / Availability).
**Fix:** Bootstrap-Guard — sobald bereits ein `eb_admin` existiert, ist die (Neu-)Initialisierung nur für bestehende `eb_admin` oder echte WP-Admins (`manage_options`) erlaubt; sonst 403. Initialer Bootstrap (kein Admin vorhanden) bleibt möglich.
**Status:** gefixt

### [DSGVO] `analytics.php` loggte IP-Adressen ohne Rechtsgrundlage
**Gefunden:** 2026-06-20
**Betrifft:** `analytics.php`, `functions-analytics-patch.php`
**Symptom:** `analytics.php` schrieb bei jedem Direktaufruf die Client-IP (personenbezogenes Datum) in eine Flat-File `analytics.log` — toter Code, nirgends eingebunden, aber als Theme-Datei direkt erreichbar und mitdeployed. Widersprach der Aussage „nur technisch notwendige Cookies, keine Analyse". `functions-analytics-patch.php` war kaputtes Garbage.
**Fix:** `analytics.php` auf inerte No-Op reduziert (kein Logging/PII; nächster Deploy überschreibt die Live-Datei). `functions-analytics-patch.php` entfernt. Kein `analytics.log` im Repo.
**Status:** gefixt (Live-Datei nach Deploy verifizieren; ggf. komplett löschen)

### [UI] Einzelne Bilder wurden nicht angezeigt (kaputtes Bild-Icon)
**Gefunden:** 2026-06-20
**Betrifft:** `app.js` — alle `<img>`-Render-Stellen (Detail-Hero/-Galerie, Alternativen, Portfolio, Events, Booking u. a.)
**Symptom:** Nur einige Render-Stellen (Card, Hero-Marquee) hatten ein `onerror`-Fallback. Andere — insbesondere die Detail-Seiten-Hero und -Galerie — zeigten bei einer toten URL ein kaputtes Bild-Icon statt eines Platzhalters.
**Fix:** Globaler Capture-Phase-`error`-Handler für JEDES `<img>` (Avatar → `ebAvatar`, Inhaltsbild → `EB_IMG_FALLBACK`); Render-Stellen mit eigenem `onerror` werden übersprungen. Zusätzlich `loadDetail()` defensiv: Bilder werden normalisiert (`images` → `image` → Platzhalter), Detailseite zeigt nie mehr eine leere Galerie.
**Status:** gefixt

### [DETAIL] Detailseite konnte bei Listing ohne `images`-Array crashen
**Gefunden:** 2026-06-20
**Betrifft:** `app.js` `loadDetail()`
**Symptom:** `listing.images.length` / `.map()` ohne Array-Guard → `TypeError`, gesamte Detailseite blieb leer, wenn ein Listing kein `images`-Array trug. Auch `priceLabel.split()` und `features.map()` waren nicht defensiv.
**Fix:** Defensive Normalisierung von `images`, `priceLabel`, `features`. Zusätzlich `browseSort`-Zugriff in `filterListings()` mit `?.` abgesichert (war als einziger Filterzugriff nicht defensiv).
**Status:** gefixt

### [QA] QA-Bot Icon/Launcher wirkte kaputt und nicht wie Support
**Gefunden:** 2026-06-05
**Betrifft:** `index.php`, `styles.css`, QA-Bot Launcher
**Symptom:** Icon wirkte wie fragmentierte SVG/Card statt Support-Bot mit Headset und Partyhut.
**Fix:** Launcher mehrfach vereinfacht: transparenter Button, Roboter/Headset/Partyhut, Status-Dot und UA-Button-Reste entfernt.
**Status:** gefixt (`3c1e752`)

### [UI] Loader/Hero zeigte doppelten Popper
**Gefunden:** 2026-06-05
**Betrifft:** `index.php`, `index.html`, `styles.css`
**Symptom:** Popper/Loader wirkte doppelt bzw. überlagert.
**Fix:** doppeltes Bild entfernt; nur ein Popper-Emoji/Asset bleibt sichtbar.
**Status:** gefixt (`58752cc`)

### [AUTH] IDN-E-Mail-Login blockierte Eingaben
**Gefunden:** 2026-06-05
**Betrifft:** Login-Flow
**Symptom:** Login erkannte E-Mail mit internationaler Domain teilweise nicht sauber.
**Fix:** IDN-/E-Mail-Handling im Login stabilisiert.
**Status:** gefixt (`f2d77f2`)

### [LISTINGS] Listings verschwinden je nach Oberfläche inkonsistent
**Gefunden:** 2026-05-22
**Betrifft:** Home/Browse/Map/Board
**Symptom:** Unterschiedliche Demo-/Echt-Sichtbarkeit, dadurch scheinbar fehlende Listings.
**Fix:** Einheitliche Sichtbarkeitsfunktion über alle Oberflächen.
**Status:** gefixt

### [BOARD] Board-Picker zeigte nur Teilmenge der Listings
**Gefunden:** 2026-05-22
**Betrifft:** `openAddProviderModal()`
**Symptom:** Nutzer sahen im Board nur einen Teil der verfügbaren Angebote.
**Fix:** `includeAllPages` + Entfernen der harten Picker-Kappung.
**Status:** gefixt

### [BOARD] Eigene Angebote führten zu Selbstbuchungs-Risiko
**Gefunden:** 2026-05-22
**Betrifft:** Board-Planung + Sofortbuchung
**Symptom:** Eigene Inserate konnten in problematischen Pfaden als buchbar erscheinen.
**Fix:** mehrstufiger Selbstbuchungs-Guard + `own_offer`-Modus ohne Fremd-Listing-Link.
**Status:** gefixt

---

## Format für neue Einträge

```
### [BUG-TITEL]
**Gefunden:** DATUM
**Betrifft:** Datei / Feature
**Symptom:** Was passiert falsch
**Reproduzieren:** Schritte
**Status:** offen / in Arbeit / gefixt
```

## Verknüpfte Notizen
- [[Roadmap/Current-Sprint]] — Aktuelle Prioritäten
- [[Roadmap/Feature-Ideen]] — Feature-Backlog
- [[AI-Gedaechtnis/Claude-Kontext]] — P0/P1 Liste
