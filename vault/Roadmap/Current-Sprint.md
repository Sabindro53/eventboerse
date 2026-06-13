# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Aktiver Fokus (P0)

- [x] **Self-Improvement-Dashboard** *(2026-06-13)*
  - `dev-status.html` zeigt Live-Puls (Asset-Loads, SW, API, JS-Fehler, Perf) und Audit-Vorschläge mit Annehmen/Ablehnen.
  - `improvements.json` enthält 10 verifizierte Befunde (AUD-001 … AUD-010).
  - Operator-Workflow: Entscheidungen exportieren → `decisions.json` in Repo → nächste Claude-Session arbeitet die Approved-Items ab.
- [ ] **AUD-Liste abarbeiten** (sobald `decisions.json` vorliegt)
  - Reihenfolge nach Impact: AUD-002 (Admin-Moderation), AUD-006 (Stripe-Cron), AUD-004 (Chat-Backoff), AUD-009 (Health-Endpoint), Rest.
- [ ] **Listings-/Board-Regressionen ausschließen**
  - Ziel: Keine verschwundenen Listings mehr in Board/Startseite/Map/Browse.
  - Pflicht-Checks nach Deploy: Listings API, Board Picker, Demo-Toggle, Selbstbuchungsschutz.
- [ ] **KI-Änderungs-Guardrails operationalisieren**
  - Safe Defaults für automatische Worker (kein destruktives Verhalten bei Unsicherheit).
  - Änderung nur mit nachvollziehbarem Status + Grund.
- [ ] **Stripe Connect E2E im Testmodus finalisieren**
  - Dienstleister-Onboarding, Payment Intent, Webhook, Reconcile, Refund/Dispute-Pfad prüfen.
  - Keine echte Buchung ohne aktives Auszahlungskonto des Dienstleisters.
- [ ] **Admin-Moderation gegen aktuellen Code abgleichen**
  - Vault erwähnt ältere Moderationsrouten; `functions.php` registriert sie aktuell nicht.
  - Prüfen, ob UI-Funktion noch vorhanden ist oder wiederhergestellt werden muss.

## Nächste Prioritäten (P1)

- [ ] **Echtzeit-Messaging** (Polling → SSE/WebSocket).
- [ ] **Suche auf DB-Volltext** umstellen (MySQL FULLTEXT).
- [ ] **Stripe-Flow weiter härten** (Reconcile, Return, Regression-Szenarien).
- [ ] **Board-Paket-Tests** (Mehrfachzeiten pro Paketposition, Edit/Reload-Szenarien).
- [ ] **QA-Bot Wissensmuster erweitern**
  - Tokenfrei bleiben.
  - Mehr direkte Navigations-/Hilfsaktionen für Login, Board, Inserat, Zahlung.

## Nice-to-Have (P2)

- [ ] PWA + Push-Benachrichtigungen.
- [ ] Analytics-Kennzahlen je Listing/Flow.
- [ ] SEO-Pre-Rendering für zentrale Landing-/Browse-Routen.

## Zuletzt ausgeliefert (Mai/Juni 2026)

- [x] QA-Support-Bot rechts über Bottom-Navigation, tokenfrei, mit direkter Bereichs-Navigation.
- [x] QA-Bot Launcher auf transparentes Roboter/Headset/Partyhut-Icon reduziert (keine Card, kein Status-Dot).
- [x] Loader/Hero-Popper bereinigt: doppeltes Popper-Bild entfernt.
- [x] Login/IDN-E-Mail-Flow repariert.
- [x] Board Deep-Link `/board/<id>` + Projektkarte im neuen Tab.
- [x] Stripe Connect Onboarding/Status/Diagnose/Disconnect im Backend/Frontend vorhanden.
- [x] Board lädt alle Listings im Picker (kein künstlicher Cap).
- [x] Saubere Trennung Angebot vs. Gesuch in Board-Auswahl.
- [x] Eigene Angebote für Planer sichtbar, ohne Selbstbuchungslink.
- [x] Demo-Sichtbarkeit über Home/Browse/Map/Board vereinheitlicht.
- [x] Admin-Moderation: Ausblenden/Löschen inkl. Begründung + Verlauf.
- [x] Board-Planungsmodus ausgebaut:
  - [x] `Baustein` (Einzelposition)
  - [x] `Paket` (Mehrfachpositionen mit je eigener Zeit/Preis/Notiz)

---
*Zuletzt aktualisiert: 2026-06-06*

## Verknüpfte Notizen
- [[Roadmap/Feature-Ideen]] — Ideen-Sammlung
- [[Roadmap/Bekannte-Bugs]] — Offene Bugs
- [[AI-Gedaechtnis/Claude-Kontext]] — Prioritätsliste P0/P1
