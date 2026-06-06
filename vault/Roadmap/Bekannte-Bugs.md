# Bekannte Bugs

> Wird aktualisiert wenn Bugs gemeldet oder gefunden werden.

## Offen

### [ADMIN] Moderationsrouten im Vault vs. Code abgleichen
**Gefunden:** 2026-06-06
**Betrifft:** Admin-Moderation, `functions.php`, Vault-Doku
**Symptom:** Ältere Vault-Notizen dokumentieren `/admin/listings/{id}/hide` und `/my-listing-moderation`; aktueller Code registriert diese REST-Routen nicht.
**Reproduzieren:** `rg -n "admin/listings|my-listing-moderation" functions.php` liefert keine Route.
**Status:** offen (P0/P1 prüfen, weil Admin-Ausblenden/Löschen produktrelevant ist)

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
