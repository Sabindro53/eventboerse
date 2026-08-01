---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Zuletzt abgeschlossen (2026-08-01) — Event-Universum, EB Circle, Brain-Messung

- [x] **Offenes Event-Universum** — `EB_EVENT_UNIVERSE`: 30 Typen in 7 Gruppen
  statt 6 fixer Optionen. Enthält Tabletop/D&D, LAN & Gaming, Cosplay,
  Quiz, Escape/Krimidinner, Vernissage, Poetry Slam, Retreat, Saisonfeste,
  Trauerfeier; `custom` hält die Liste offen. Filter-Select wird gruppiert
  daraus befüllt, Vorschlags-Engine erkennt die Typen, 20 neue Synonym-Cluster
  machen sie auffindbar. Geprüft: „DJ für mein Dungeons and Dragons Event"
  → als Tabletop erkannt, 14 Treffer.
- [x] **EB Circle im HQ** — sprechender KI-Kreis: antwortet aus der
  Wissensbasis **mit Quellenangabe**, kennt den HQ-Livezustand, zeigt
  **Wissenslücken** (Impuls 6) gruppiert nach Häufigkeit. Voice in beide
  Richtungen über die Web-Speech-API (lokal, kein externer Dienst).
- [x] **Sicherheit: Leckage in der Wissensbasis geschlossen**
  `Features/Payments.md` exportierte „Stripe Webhook-Signatur-Verifizierung
  (HMAC)" und interne API-Routen an anonyme Chat-Nutzer. Ursache: die
  Erst-Migration stufte `Features/` und `UserFlows/` pauschal als `public`
  ein — das sind aber Entwickler-Notizen. **10 Notizen auf `internal`**;
  die Wissensbasis speist sich jetzt nur noch aus `10-Produkt/Wissen/`.
  Verifiziert: 0 Leckage, Abdeckung unverändert 17/17.
- [x] **Retrieval gehärtet (beide Engines)** — kurze Wörter zählen nur als
  ganzes Wort, Frage-Modifikatoren (hoch, viel, lange …) sind Stoppwörter.
  Vorher beantwortete „Wie hoch ist der Mond?" mit „Hochzeit".
- [x] **Impuls-Strom messbar** — `scripts/pulse.mjs` → [[00-Kern/Impuls-Strom]]:
  Schichtung, Freigabe-Bilanz, Wissensbasis, Event-Abdeckung, Code-Bewegung.
- [x] **MCP-Architektur dokumentiert** → [[30-Betrieb/MCP-Architektur]]:
  Ist-Stand, MCP-Bewertung nach Nutzen ÷ Risiko, Quarantäne-Tor für externen
  Zufluss, Empfehlung **gegen** einen Obsidian-MCP.
- [x] **Tages-Routine aktiv** (04:00 UTC): Gesundheitscheck → ein verifizierter
  Fortschritt → Vault fortschreiben → deployen.

### ⚠️ Offen — nicht von hier lösbar

**Fable 5s sieben Commits sind nirgends im Remote.** Geprüft: keiner der
Commits (`fddac3c`…`148fdae`) liegt auf einem Branch, kein Branch enthält
`js/modules/`. Die Arbeit (Testsuite, Sicherheits-Audit, Modularisierung in
22 Module, Design-Tokens, A11y 97→0) existiert nur lokal auf der
VS-Code-Maschine.

→ Dort im Terminal `git push origin HEAD:main` ausführen (kostet keine
Tokens, ist ein Git-Befehl). Bis dahin gilt: **`app.js`, `styles.css` und
`app-shell.html` möglichst nicht umbauen** — jede Änderung kollidiert sonst
mit der Modularisierung. Ist der Workspace weg, muss die Testsuite neu
gebaut werden (höchste Priorität, siehe [[00-Kern/Fable5-Auftrag]]).

## Zuletzt abgeschlossen (2026-07-27) — Intelligente Suche & Hero

- [x] **Satz-Vervollständigung („Look & Feel AI") in Suche + Board**
  - `_ebSuggest(text)` erkennt Gewerk, Anlass, Ort, Gästezahl und Datum im
    angefangenen Satz und setzt ihn **in der Formulierung des Nutzers** fort.
    Grammatik über `_EB_CAT_GRAMMAR` (Akkusativ-Artikel) und `_EB_TYPE_GRAMMAR`.
  - Bindewort-Logik: „Fotograf für" + „für meine Hochzeit" wird zu
    „Fotograf **für meine Hochzeit**" (kein doppeltes „für"). Wer sein Event
    beschreibt, bekommt einen sauberen Anschluss („… — dafür suche ich einen DJ").
  - UI Suchseite: Inline-Ghost im Feld (grau) + Panel mit Primärvorschlag
    (**Tab** übernimmt) und **3 Alternativen** (anderer Anlass / passendes
    Zusatzgewerk / Ort bzw. Größe eingrenzen). Weiterschreiben bleibt möglich.
  - Board-Assistent nutzt dieselbe Engine live beim Tippen (`_aiInputSuggest`).
- [x] **Selbstlernendes Ranking (`_ebTaste`)**
  - Signale: Suche (1), Ansicht (1.5), Favorit (3), Board (4), Kontakt (6);
    Buckets cats/locs/types/terms, tägliches Decay (×0,92), gedeckelt.
  - Wirkt auf: Suchvorschläge, Standard-Sortierung der Treffer, Feed „Für dich",
    Board-Chips. Ohne Signale bleibt Verhalten wie bisher (keine Filterblase
    für Neulinge).
  - **Sicherheit:** rein lokal (localStorage), keine Übertragung; Blockliste
    gegen Kontakt-/Zahlungsdaten (`@`, Telefon, IBAN, URLs, lange Zahlen);
    max. 32 Zeichen/Token, 40 Begriffe; jede Ausgabe `_escHtml`;
    `_ebTasteReset()` direkt im Vorschlags-Panel verlinkt.
- [x] **Hero der Suchseite neu**
  - Headline **„EVENTBÖRSE, finde dein Event ©"**.
  - 10 generative Motive (`_ebHeroSceneSvg`, Data-URI, keine externen Requests):
    Montage in 2 s (200 ms/Bild), danach ruhiger 5-s-Wechsel;
    `prefers-reduced-motion` → Standbild. Lesbarkeits-Verlauf darüber.
  - Motive sind austauschbar: echte Foto-Renderings können in `_ebHeroShots()`
    eingesetzt werden, der Ablauf bleibt gleich.
  - Verifiziert: Ghost pixelgenau am Input (Versatz 0), Tab übernimmt,
    Weiterschreiben funktioniert, 10 Bilder self-hosted, 0 Page-Errors.

## Zuletzt abgeschlossen (2026-07-26) — Centgenaue Gebührenabrechnung

- [x] **Ist-Gebühren statt Schätzung: automatischer Abgleich gegen Stripe**
  - `eb_stripe_settlement_facts()` liest die echte **Balance-Transaction**
    (`expand=latest_charge.balance_transaction`) inkl. `fee_details`-Aufschlüsselung.
  - `eb_stripe_reconcile_payment()` vergleicht Ist gegen Schätzung und korrigiert:
    Δ > 0 → **Transfer-Reversal** (Differenz vom Dienstleister zurück),
    Δ < 0 → **Nachtransfer** (Differenz an den Dienstleister).
    Idempotent über Idempotency-Keys + `reconciled`-Flag.
  - Hooks: Webhook `payment_intent.succeeded` **und** `charge.updated` (dort liefert
    Stripe die Balance-Transaction meist erst), plus stündlicher Cron
    `eb_stripe_reconcile_cron` für Nachzügler (max. 12 Versuche, dann Aufgabe).
  - **Ledger** (`eb_payment_ledger`, 180 Tage): Brutto, Provision, Schätzung, Ist,
    Δ, Ausgleichsbuchung, Auszahlung, Plattform-Netto, Refunds.
  - Neue Endpoints: `GET /stripe/settlement/{pi}` (Käufer/Anbieter/Admin) und
    `GET /stripe/cost-report` (Admin: Summen, Ist-vs-Schätzung, Gebühren nach Typ,
    effektive Netto-Marge, offene Abgleiche).
  - Frontend: `fetchSettlement()` + `_settlementBreakdownHtml()` zeigen den
    **Ist-Betrag** mit Aufschlüsselung und „✓ Centgenau abgerechnet".
  - **Fail-Safe:** Schlägt die Ausgleichsbuchung fehl, bleibt es beim Schätzwert —
    die Differenz trägt dann die Plattform, nie der Dienstleister unbemerkt.
  - Verifiziert (6 Szenarien: EWR, Amex, SEPA, Nicht-EWR, 10 €, 25.000 €):
    Brutto = Provision + Ist-Gebühr + Auszahlung **centgenau**, Plattform behält
    in **allen** Fällen exakt 3 %. Idempotenz geprüft (zweiter Lauf ohne API-Calls).

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
