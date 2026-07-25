---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Zuletzt abgeschlossen (2026-07-25, Nachtrag)

- [x] **Gebührenmodell wirtschaftlich korrigiert: Stripe-Gebühr trägt der Dienstleister**
  - Vorher trug die **Plattform** die Stripe-Zahlungsgebühr (Application Fee = nur 3 %) —
    bei 1.000 € blieben der Plattform real nur ~1,5 % statt 3 %. Nicht tragfähig.
  - Jetzt: `application_fee_amount = Provision + geschätzte Stripe-Gebühr`.
    Stripe belastet bei Destination Charges das Plattformkonto; über die erhöhte
    Application Fee wird die Gebühr vom Auszahlungsbetrag einbehalten. Netto bleibt
    der Plattform die **volle Provision**.
  - Neue Konstanten (in wp-config überschreibbar): `EB_STRIPE_FEE_PERCENT` (0.015),
    `EB_STRIPE_FEE_FIXED_CENTS` (25) — Standard EWR-Karten.
  - Beispiel 1.000 €: Provision 30 € + Stripe 15,25 € → **Auszahlung 954,75 €**.
  - Frontend (`calculatePayout`, Aufschlüsselung, Auftrags-Texte) spiegelt das Modell
    centgenau; `stripe_fee_payer` ist jetzt `provider`.
  - Wissensbasis aktualisiert (Gebühren & Provision, Buchung & Zahlung, Über Eventbörse);
    Gebührenfragen werden nicht mehr vom Budget-Intent abgefangen.
  - **Offen/Hinweis:** Die Stripe-Gebühr ist ein *Schätzwert*. Weicht die reale Gebühr ab
    (Amex, Nicht-EWR-Karten, Wallets), trägt die Differenz die Plattform. Bei Bedarf die
    Konstanten je nach tatsächlichem Zahlungsmix nachziehen.

## Zuletzt abgeschlossen (2026-07-25)

- [x] **Board-Assistent führt durch die Projektanlage (Slot-Filling)**
  - Fehlende Eckdaten werden nacheinander erfragt: Datum → Gäste → Budget → Ort,
    jede Frage überspringbar („Weiß ich noch nicht"), Abbruch per „abbrechen".
  - Antworten werden dem **passenden** Slot zugeordnet, auch in falscher Reihenfolge
    (`_aiRouteSlot`). Blanke Jahreszahl ist kein Termin mehr, benennt nur das Projekt.
  - `location` wird im Projekt gespeichert; Abschluss zeigt eine Zusammenfassung.
- [x] **Beide Bots klären über alles Öffentliche auf**
  - Neue public-Notiz [[10-Produkt/Wissen/Gebuehren-und-Provision]] mit den echten
    Fakten aus `eb_stripe_platform_fee_rate()`: **3 % Provision** (Application Fee),
    Auszahlung 97 %, Stripe-Gebühren trägt die Plattform, keine Grundgebühr.
    Vage Gebührensätze in „Buchung & Zahlung" und „Über Eventbörse" korrigiert.
  - „Was kannst du erklären?" listet alle Themen (nur `10-Produkt/Wissen/`).
  - Fallback schlägt jetzt passende Fragen vor statt in der Sackgasse zu enden.
  - Retrieval gehärtet: Füllverben („funktioniert") als Stoppwörter, Komposita über
    Präfixe („Provisionsregelung" → „Provision"), Überschriften-Treffer stärker gewichtet.
  - `Glossar` und `Features/Admin` auf `internal` gesetzt (Entwickler-/Admin-Interna).
  - Verifiziert: **17/17** Fachfragen korrekt beantwortet, 2/2 Off-Topic abgelehnt,
    geführter Dialog liefert vollständigen Entwurf, 0 Leckage.

## Zuletzt abgeschlossen (2026-07-24)

- [x] **Brain-Umbau: 6-Layer-Vault + Synergie zur Website**
  - Vault in `00-Kern` … `50-Evolution` geschichtet, alle 92 Notizen mit Frontmatter
    (`layer`, `domain`, `share`) klassifiziert, alle Wiki-Links umgeschrieben (0 tote Links).
  - Graph färbt nach `tag:#layer/*`; `neural.css` mit Impuls-Puls und Layer-/Share-Badges.
  - Neue L0-Notizen: [[00-Kern/Layer-Modell]], [[00-Kern/Neural-Map]],
    [[00-Kern/Wissensstroeme]], [[00-Kern/Sicherheits-Klassifikation]],
    [[00-Kern/Synergie-Pipeline]].
  - Neuer öffentlicher Wissens-Layer `10-Produkt/Wissen/` (9 Notizen, nutzerseitige Fragen).
  - `scripts/build-knowledge.mjs` → `assets/eb-knowledge.json` (115 Abschnitte aus 21
    `share: public`-Notizen). Whitelist + Verbotsmuster-Scan; `secret`/`internal` bleiben drin.
  - `app.js`: `_ebKbLoad/_ebKbSearch/_ebKbGoodHit` — **QA-Bot und Board-Assistent**
    beantworten Inhaltsfragen aus dem Vault, Intents behalten Vorrang bei Navigation.
    Ohne Treffer: ehrlicher Fallback + Wissenslücke in `eb_kb_misses` (Impuls 6).
  - `functions.php`: `themeUrl` in `eventboerseApi` ergänzt (KB-URL auf Unterrouten).
  - Verifiziert: 10/11 Testfragen korrekt beantwortet, Off-Topic korrekt abgelehnt,
    0 Leckage aus Governance/System/Betrieb/Evolution.

## Aktiver Fokus (P0)

- [ ] **Listings-/Board-Regressionen ausschließen**
  - Ziel: Keine verschwundenen Listings mehr in Board/Startseite/Map/Browse.
  - Pflicht-Checks nach Deploy: Listings API, Board Picker, Demo-Toggle, Selbstbuchungsschutz.
- [ ] **KI-Änderungs-Guardrails operationalisieren**
  - Safe Defaults für automatische Worker (kein destruktives Verhalten bei Unsicherheit).
  - Änderung nur mit nachvollziehbarem Status + Grund.
- [ ] **Stripe Connect E2E im Testmodus finalisieren**
  - Dienstleister-Onboarding, Payment Intent, Webhook, Reconcile, Refund/Dispute-Pfad prüfen.
  - Keine echte Buchung ohne aktives Auszahlungskonto des Dienstleisters.
- [x] **Admin-Moderation gegen aktuellen Code abgleichen** *(erledigt 2026-06-26, live)*
  - Admin-Bild-Löschen umgesetzt: Detailseite (`adminDeleteListingImage`) + Provider-Portfolio/Lightbox (`adminDeleteProfileImage`).
  - Backend `POST /admin/moderate-image` + persistente Blocklist (`eb_demo_image_blocklist`) → wirkt auch für hardcodierte Demo-Listings.
- [x] **Security-Härtung** *(erledigt 2026-06-26, live)*
  - XSS-Escaping (`_escHtml` inkl. Quotes), Brute-Force-Rate-Limiting (Login/OTP/Reset/Register), CSP ohne `'unsafe-eval'`, WP-User-Enumeration gesperrt, CDN gepinnt, CI-Security-Workflow + `SECURITY.md`.
  - Offen (User): `security@eventbörse.de`-Postfach; optional CDN-SRI; CSP ohne `'unsafe-inline'` (Inline-Handler-Refactor).

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

## Zuletzt ausgeliefert (Juli 2026)

- [x] Demo-Konten kontaktierbar (wie eBay): Nachricht landet im Chat, Benachrichtigungs-Mail geht an kontakt@eventbörse.de (Banner: Demo-Konto, Absender inkl. User-ID/E-Mail, Inserat, Conversation-Nr.). Server: eb_demo_provider_name-Verzeichnis, eb_ops_notify_address, Demo-IDs auf 90001–90015 vervollständigt.
- [x] Inserate-Erstellung als EINE Maske: Biete/Suche-Umschalter (listing_type in DB, Migration 2.3), optionaler einklappbarer Verfügbarkeitskalender (Häkchen = verfügbar, PUT availability nach dem Speichern), Rollen-Vorwahl (Planer→Suche).
- [x] Board→Chat-Kette repariert: providerId auf Karten, loadDbListings in Board-Route, Erfolgs-Button öffnet Konversation; Picker mit Browse-Parität (getHeroListings statt _visibleListings).
- [x] Showcase-Animationen butterweich: rAF-Loop + Lerp statt Scroll-Events/CSS-Transitions (iPhone-Einfrier-Bug behoben); „So funktioniert's" auf 4 Schritte gestrafft.
- [x] Planungs-Board im ChatGPT-Look: Sidebar links (Neues Projekt, Projekt-Liste mit Edit/Delete, 8 Dienstleister-Kategorien), rechts lokaler Planungs-Assistent (`_ai*` in app.js, `.bai-*` CSS). Regelbasiert, ohne KI-Token: legt Projekte aus Freitext an (Typ/Datum/Gäste/Budget-Parsing), empfiehlt Dienstleister je Kategorie („+ Board" → Karte in Geplant), beantwortet Budget/offene Schritte (Guide-Deadlines)/Countdown/Status. Chat-Verlauf in localStorage pro Nutzer; Auftragsboard für Dienstleister bleibt darunter.
- [x] Home-Showcase finalisiert: Mac dreht von Rückseite auf & schwebt, Demo-Szene + Widgets mit Inline-SVG-Illustrationen, Spacing/Mobile-Fixes, Board-Picker-Rollen (Planer sehen Angebote, Dienstleister alles).

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
*Zuletzt aktualisiert: 2026-07-16*

## Verknüpfte Notizen
- [[50-Evolution/Roadmap/Feature-Ideen]] — Ideen-Sammlung
- [[50-Evolution/Roadmap/Bekannte-Bugs]] — Offene Bugs
- [[50-Evolution/AI-Gedaechtnis/Claude-Kontext]] — Prioritätsliste P0/P1
