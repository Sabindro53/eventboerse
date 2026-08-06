---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Stand heute (2026-08-06)

Diese Zahlen gelten JETZT. Weiter unten stehen abgeschlossene Sprints mit den
Zahlen ihrer Zeit — die sind Historie, kein Ist-Stand. Der Ensemble-Kontext
liest diese Datei von oben; ein Modell, das „68 Tests" als aktuell meldet, hat
einen alten Abschnitt gelesen und nicht diesen.

- **Playwright-Suite: 163 Tests in 11 Suiten**, blockierendes Gate in `pr-check.yml`
- Tore grün: Wissensbasis, Quarantäne, Demo-Feed, Connectors, Modell-Ensemble,
  Arbeitsjournal, app.js-Drift
- HQ-Puls stündlich, 11 Rollen je Lauf, Journal als echte Laufzeitspur per SFTP
- Offen: Repo steht auf **public** mit dem Security-Vault darin (keine
  Zugangsdaten, aber eine Landkarte der Angriffsfläche)

## Zuletzt abgeschlossen (2026-08-05) — HQ Operations-Ensemble & Voice v2

- [x] **Vollständiges Betriebsbild:** zehn Hauptbereiche statt sechs — Produkt
  & Strategie, Engineering, Betrieb & Zuverlässigkeit, Sicherheit & Datenschutz,
  Intelligence & Daten, Community & Support, Sales & Wachstum, Finanzen & Risiko,
  Recht & Governance sowie Voice & UX. Mitarbeiter bleiben im neuronalen
  Gesamtbild verborgen und erscheinen erst im geöffneten Bereich.
- [x] **Echter Aufgabenstrom statt „kein Lauf":** 11 offene OpenRouter-Modelle
  haben je drei rotierende Tasks, eine feste Quote und eine kleine Antwortgrenze.
  `.github/workflows/hq-operations.yml` pulst tokenfrei alle fünf Minuten und
  lässt das Ensemble stündlich arbeiten. `scripts/agent.mjs` prüft vor jedem
  Aufruf Tagesbudget, Restlimit, Rollenquote, Geheimnisse und Providerpreis;
  nur echte Antworten/Stopps/Fehler gelangen ins Arbeitsjournal.
- [x] **Kontingent hart verteilt:** 100 % von maximal **$0,60/Tag**, rollenweise
  sichtbar. Preisrouting nutzt den günstigsten zulässigen Provider,
  `data_collection: deny` und feste Maximalpreise. Der autonome Lieferstrom
  (Scout → Architektur → Patch → Review → Gates → PR → Deploy) bleibt separat.
- [x] **Voice v2:** schneller Qwen-Flash-First-Router unter Preisdeckel,
  Gesprächsverlauf plus geöffneter Bereich/Tasks/letzte Lieferungen als Kontext,
  Erkennungsalternativen und Konfidenz bei undeutlicher Sprache, gezielte
  „Meinst du … oder …?"-Rückfragen, Vorschlags-Chips, Barge-in/Abbruch und
  schnelleres erneutes Zuhören aus dem zentralen Orb.

**Stand: HQ-Kern 32/32 Tests grün; Katalog-, Sicherheits- und Build-Gate grün.**

## Zuletzt abgeschlossen (2026-08-01) — Fable-5-Auftrag: Fundament gesichert

- [x] **Testsuite von null** (Priorität 1): 68 Playwright-Tests in 7 Suiten,
  blockierendes Gate in `pr-check.yml`. Smoke (alle Routen, 0 Page-Errors),
  Suche (natürliche Sätze ↔ Unsinn), Gebühren (centgenau, **JS↔PHP-Parität**
  gegen die echten functions.php-Funktionen), Wissensbasis (Antworten,
  Off-Topic, **0 Leckage**), CSS-Minify (Verlaufsschrift überlebt csso),
  Design-System (Konflikt-Ratsche), A11y (axe, beide Farbmodi).
- [x] **Sicherheits-Audit** über functions.php + app.js gemeinsam: 86 Routen
  (permission, IDOR, SQL, Upload, Webhook, Rate-Limits) + 237 innerHTML-Pfade.
  Juni-Härtung trägt. Behoben: KB-Leckage (Webhook-Signatur-Erwähnung in
  public-Notiz + Verbotsmuster-Filter erweitert), 2 Low-XSS (_escHtml).
  Bericht: 40-Governance/Security/2026-08-01-… (secret).
- [x] **app.js modularisiert**: 24.900 Zeilen → 22 Module (`js/modules/**`),
  `./build-app-js.sh` konkateniert (kein Bundler, byte-identisch verifiziert),
  Drift-Check in CI, Deploy-Artefakt bleibt app.js.
- [x] **Design-System**: --eb-*-Tokens konsolidiert (1 Definition statt 3
  überschreibenden), Live-Bug behoben („Beliebt:"-Chips unsichtbar durch
  Klassenkollision .ai-suggestions → .ai-sug-row), css-duplicates-Analyzer
  + Ratsche gegen neue stille Überschreibungen.
- [x] **Barrierefreiheit**: axe-Verstöße 97 Nodes → **0** (beide Modi × 6
  Seiten). Galerie-Karussells tastaturbedienbar + benannt, Selects/Suchfeld
  beschriftet, neue Text-Tokens --primary-text/--accent-text ≥ 4,5:1.
  Offen: Lighthouse-Score gegen die Live-Seite messen (CI-Umgebung hat
  keinen Zugriff auf eventbörse.de; lighthouse-audit.yml läuft wöchentlich).

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

## Zusammenführung (2026-08-01) — beide Stränge sind vereint

Fable 5s Arbeit lag zunächst nur lokal auf der VS-Code-Maschine; sie ist
inzwischen als `fable5-integration` im Remote und mit dem Opus-5-Strang
zusammengeführt. Was die Zusammenführung gekostet hat:

- **Zwei Konflikte**, beide inhaltlich aufgelöst statt weggeworfen:
  `Current-Sprint.md` behält **beide** Abschnitte; `assets/eb-knowledge.json`
  wurde neu gebaut statt von Hand gemischt (89 Abschnitte / 10 Notizen).
- **`app.js` neu aus den 22 Modulen erzeugt**, `index.html` aus der Shell —
  beide driftfrei. Alle Opus-5-Funktionen nachweislich enthalten
  (`EB_EVENT_UNIVERSE`, `_ebSuggest`, `_ebTasteSignal`, `_ebKbGoodHit`,
  `_ebHeroSceneSvg`, `_ebMatchScore`, `_ebEventTypeFromText`).
- **`playwright.config.js` umgebaut**: der Browser-Pfad wird jetzt erkannt
  statt angenommen (`PW_CHROMIUM_PATH` → `/opt/pw-browsers/chromium` →
  Playwright-Standard). Vorher fielen 58 Tests aus, weil die Umgebung eine
  andere Chromium-Revision vorhält als die Fixversion erwartet.
- **A11y-Nachzügler behoben**: Material-Icons sind Ligatur-**Text**, axe misst
  sie wie Schrift. Gold `#FFB400` (1,8:1), Akzent und Markenrot als Icon-Farbe
  fielen im Hellmodus durch. Neues Token `--star-text` (hell `#8F6400` 5,3:1,
  dunkel bleibt Gold 10,5:1); Icons in `.feature-item`, `.bai-side-foot`,
  `.feed-chip`, `.feed-location-badge`, `.detail-rating`, `.review-stars`,
  `.testimonial-stars` auf die Text-Token umgestellt.

**Stand: 68/68 Tests grün**, A11y 0 Verstöße über beide Farbmodi.

## Zuletzt abgeschlossen (2026-08-02) — HQ-Zugang und Verbindungszentrale

- [x] **Das HQ war faktisch offen.** Die Zugangsprüfung lief im Browser gegen
  eine im HTML mitgelieferte Schlüsselliste (`HQ_KEYS = ['eb-hq-2026', …]`) —
  wer den Quelltext las, kam rein. Jetzt prüft `eb_serve_hq()` serverseitig auf
  `manage_options`, bevor ein Byte das Haus verlässt; Unberechtigte bekommen
  **404** statt 403. Der direkte Theme-Pfad ist in `.htaccess` gesperrt, weil
  Apache dort ausliefert, ohne PHP je zu fragen — ohne diese Sperre wäre die
  Rechteprüfung schlicht umgehbar. Das Schein-Tor im HTML ist ersatzlos raus.
- [x] **Kurze Adresse:** `eventbörse.de/hq`, inklusive Unterpfaden
  (`/hq/connections/github`, `/connections/anthropic`).
- [x] **Systeme & KI-Verbindungen** (HQ 3A, erste Ausbaustufe) — 10 Connectors
  mit Berechtigungen, Fähigkeiten, Kontingent, Schlüssel-Ablage und den
  offiziellen Einrichtungslinks. Tragende Entscheidung: **Katalog ist nicht
  Zustand.** `assets/eb-connectors.json` beschreibt Möglichkeiten; ob etwas
  verbunden ist, entscheidet ausschließlich ein echter Aufruf zur Laufzeit.
  Der Prüfer lehnt jeden Katalogeintrag mit `status` ab.
- [x] **Ehrliche Prüfungen statt Dekoration** — GitHub (`/rate_limit` mit
  echtem Kontingent), Deploy und Monitoring (Actions-Läufe), Vault
  (Contents-API), Website (gleiche Herkunft). Für Anthropic wird geprüft,
  **ob** das Secret hinterlegt ist — GitHub gibt nur Namen heraus, nie Werte.
  Was nicht prüfbar ist, bleibt gelb mit Begründung: Copilot-Restkontingent
  (persönlich nicht als Schnittstelle vorgesehen), Verbrauch bei OpenAI und
  Anthropic (ein Schlüssel im Browser wäre ein Schlüssel für jeden Besucher).
- [x] **Abonnement ≠ API-Guthaben** wird auf beiden KI-Karten getrennt
  ausgewiesen — ein Test erzwingt das.

**Stand: 94/94 Tests in 9 Suiten grün** (`verbindungen.spec.js` neu, 14 Tests).
Ein Test fährt die Seite mit blockierter GitHub-API und besteht nur, wenn dann
nichts „verbunden" behauptet.

### Offen an 3A
Echte OAuth-2.1/PKCE-Flows, `getUsage`/`getQuota` für OpenAI und Anthropic
(beides braucht eine Serverseite als Proxy), anklickbare Impuls-Ströme rund um
den Orb, Connector-Assistent für neue Dienste.

## Zuletzt abgeschlossen (2026-08-01) — der Zufluss von außen

Die drei offenen Punkte aus [[30-Betrieb/MCP-Architektur]] §5 sind zu.
Gemeinsamer Nenner: an jeder Stelle, an der Inhalte ins System kommen, ohne
dass ein Mensch sie geschrieben hat, steht jetzt ein Tor.

- [x] **Quarantäne-Tor** (`scripts/quarantine.mjs`) — `vault/50-Evolution/Recherche/`
  ist die einzige Schleuse für externen Text. Fünf Regeln, in CI durchgesetzt:
  nichts darin ist `public`, Herkunft (`quelle` + `abgerufen`) ist Pflicht,
  Fremdtext steht im Datenblock, keine Geheimnisse (auch nicht in `internal`),
  **keine fremden Anweisungen in unserem eigenen Text**. Die letzte Regel ist
  der Prompt-Injection-Schutz: im Datenblock ist „ignoriere deine Anweisungen"
  erwartbarer Inhalt, außerhalb ein Befund. Aufnahme mit Geheimnis wird
  verweigert, statt sie als `internal` zu verstecken.
- [x] **Web-Recherche** (`recherche.yml`, Do 06:23 UTC) — schreibt
  ausschließlich über das Skript, öffnet einen **Draft-PR**, veröffentlicht
  nichts. Zwei Riegel im Workflow: jede Änderung außerhalb der Schleuse und
  jedes `+share: public` brechen den Lauf ab.
- [x] **Tages-Demo-Feed** (`demo-feed.yml`, 03:17 UTC) — erzeugt täglich
  9 Beiträge aus dem gesamten Event-Universum. Der feste Anker
  `EB_DEMO_ANCHOR_MS` alterte (nach Monaten stand überall „vor 6 Monaten");
  die naheliegende Abhilfe wäre eine Lüge gewesen. Jetzt: frischer Inhalt,
  Erstellzeiten aber **immer ≥ 10 Tage** zurück — der Browser prüft das beim
  Laden nach und verwirft einen Feed, der „gestern" behauptet.
- [x] **Feedback-Loop geschlossen** — der EB Circle im HQ exportiert die
  Wissenslücken (⬇︎), `scripts/wissensluecken.mjs` macht daraus
  [[50-Evolution/AI-Gedaechtnis/Wissensluecken]]. Bewusst über einen Menschen:
  die Fragen bleiben im Browser, bis jemand sie exportiert. Versehentlich
  eingetippte Zugangsdaten filtert das Skript heraus.
- [x] **Verbotsmuster vereinheitlicht** (`scripts/lib/verbotsmuster.mjs`) —
  getrennt in *Geheimnisse* (nirgends erlaubt, auch nicht in `internal`) und
  *Angriffsfläche* (nur im öffentlichen Export verboten). Vorher lag die Liste
  nur in `build-knowledge.mjs`; das Quarantäne-Tor hätte sonst eine zweite,
  driftende Kopie gebraucht.

**Stand: 80/80 Tests in 8 Suiten grün** (`zufluss.spec.js` neu, 12 Tests).

### Offen aus §5
Stripe-MCP lesend fürs HQ-Kostenbild · Vektor- statt Keyword-Suche ·
YouTube-Transkripte (das Tor steht, es fehlt nur der Abholer).

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
- [x] **KI-Änderungs-Guardrails operationalisieren** *(2026-08-04, OpenRouter-Autopilot)*
  - Vier getrennte Rollen: Scout → Architektur → Implementierung → unabhängiges Review.
  - Feste Whitelist kleiner Frontend-Dateien; max. 2 Dateien/260 Diff-Zeilen;
    Backend, Auth, Payment, Workflows, Netzwerk und Storage hart ausgeschlossen.
  - Kostenlimit 0,35 USD/Lauf; bei gesetztem Key-Limit Mindestrest 1 USD;
    Modell/Token/Kosten im PR.
  - Autonome Auslieferung nur nach Syntax-Gates, Reproduzierbarkeits-Gate,
    kompletter Playwright-Suite und erneuter Scope-Prüfung; danach explizit
    gestarteter, normaler Rollback-fähiger Deploy.
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
