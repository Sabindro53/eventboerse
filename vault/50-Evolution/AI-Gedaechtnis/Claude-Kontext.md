---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# AI-Gedächtnis: Claude Kontext

> Diese Datei ist die **erste Quelle** die Claude Code liest. Sie enthält alles Wichtige über Projekt, Präferenzen und offene Aufgaben.

## Stand 2026-09-23 — die Launch-Prüfung ist live, und Stripe wurde zum ersten Mal gemessen

**PR #283 ist gemergt** (`1482814`), der IONOS-Deploy lief durch (Lauf 1095),
und `site-monitor.yml` bestätigt am gemergten Commit: erreichbar, nicht leer,
`app.js` vollständig. Sechs Funde, fünf behoben, einer an den Inhaber übergeben
und noch am selben Abend von ihm geschlossen.

**Der neue Fund ist der sechste, und er lag auf dem Geldweg.** Der
Stripe-Konnektor wurde freigeschaltet — damit war die Messung möglich, die im
PR-Text vorher ausdrücklich als *„nicht belegt"* stand. Ergebnis am **Live**-Konto
`acct_1TFhA4ARRBfHayLn`:

| | |
|---|---|
| Stripe sendete an unseren Webhook | **2** Ereignisse |
| `eb_stripe_webhook()` behandelt | **10** |

Acht `case`-Zweige unerreichbar. Der teuerste: `eb_booking_record_refund()` in
`includes/booking.php` trägt im eigenen Kommentar *„signed webhooks refresh
rather than invent settlement"* — **gebaut für einen Webhook, den nie jemand
abonniert hat**. Eine Erstattung aus dem Stripe-Dashboard bewegte Geld und
erreichte das Buchungsboard nie. Behoben: `scripts/stripe-webhook.mjs` misst
die Drift jetzt (13 Tests, 9 Mutationen), die fünf fehlenden Ereignisse sind
gesetzt, Rücklesewert **sieben**, Tor grün.

### Fünf Lektionen, alle übertragbar

1. **Eine Diagnose aus einem anderen Fall ist keine Messung.** Ich schrieb dem
   Inhaber, ich könne #283 nicht mergen — der Branch-Schutz verlange eine
   Freigabe, die ein Bot-Token nicht bekommt. Das war der Befund vom 13.09.
   über die **Routine-App**, ungeprüft übertragen. Gemessen war `blocked`
   schlicht der **Draft-Zustand**; nach dem Aufheben stand er auf `clean`.
2. **Push Protection ist scharf, und sie ist das Gegenteil des toten
   Gitleaks-Scans.** Ein erfundener, aber formgleicher Testprüfstein liess den
   Push mit `GH013` abprallen. Der angebotene Freigabe-Link wurde **nicht**
   benutzt — das ist der Weg, auf dem solche Schutzvorrichtungen sterben.
   Geändert wurde der Prüfstein. **Regel: kein schlüsselförmiger Platzhalter
   im Repository, auch nicht in Kommentaren.**
3. **Die zwölfte Kommentar-Falle — und die erste, bei der Kommentarabzug die
   FALSCHE Antwort wäre.** `geheimnisse.mjs` schlug auf den erklärenden
   Kommentar an, den ich zwei Absätze unter der Regel selbst geschrieben
   hatte. Anders als bei `recht.mjs` oder `kontext.mjs` ist das Subjekt dieses
   Prüfers die **Datei**, nicht der Code: ein echter Schlüssel in einem
   Kommentar ist ein echter Schlüssel. **Also weicht der Text, nie der Prüfer.**
4. **Ein Webhook-Ereignis kann einen veralteten SHA tragen.** `check_suite.
   completed` kam für den **vorigen** Head. Wer das als „CI ist durch" liest,
   handelt am falschen Commit — dieselbe Klasse wie der `base`-SHA im
   PR-Objekt, der nicht der Stand von `main` ist.
5. **Bei Stripe ersetzt die API, die Oberfläche ergänzt.** `enabled_events`
   über die API ist ein **Ersetzen**. Wer nur die fünf neuen sendet, löscht die
   zwei bestehenden — und danach wird **keine Buchung mehr erfasst**. Im
   Dashboard sind die bestehenden vorangehakt. Trotzdem gilt: **vor dem
   Speichern auf sieben nachzählen, danach über die API zurücklesen.** Ein
   gespeichertes Formular ist kein Beleg.

### Was am Stripe-Konto sonst gemessen wurde

- **`business_type: individual`** — das Konto läuft auf eine natürliche Person,
  während Impressum und Provisionsrechnung die **UG i. G.** als Aussteller
  führen. Spätestens mit der Eintragung müssen Rechnungsaussteller und
  Zahlungsempfänger dieselbe Person sein.
- **Null verbundene Konten** (`/v1/accounts` ist leer). Der Buchungspfad lehnt
  ohne aktives Connect-Konto mit 409 ab — **heute ist keine Buchung
  bezahlbar.** Der Onboarding-Weg wurde live nie durchlaufen.
- **Chargebacks hatten gar keinen Empfänger** — am selben Abend behoben: der
  Vorgang wird festgehalten und einmal an den Betreiber gemeldet, **ohne einen
  Cent zu bewegen**. Bei einer Destination Charge zieht Stripe vom
  **Plattformkonto** ein, der Anbieter behält seine Auszahlung; ob er dafür
  einsteht, steht in keiner AGB und wird deshalb nicht im Code entschieden.
- **Kein Fund, obwohl es danach aussah:** die fünf Live-PaymentIntents ohne
  `transfer_data` stammen vom 13.05.–02.06.2026, die Destination-Charge-Mechanik
  kam am 26.08. in den Code. Geschichte, kein offener Fehler. Wer hier
  „repariert", baut an einem funktionierenden Pfad um.
- `capabilities.transfers: active`, `charges_enabled`, `payouts_enabled`,
  `requirements.currently_due: []` — die Grundlage trägt.
- Kleineres: MCC `5734` („Computer Software Stores") für einen
  Event-Dienstleistungsmarktplatz · `support_phone` ist eine private
  Mobilnummer, `support_email`/`support_url` leer · Branding-Farbe `#ff3366`
  statt der dokumentierten `#FF385C` (sichtbar im Express-Onboarding).

### Release-Bereitschaft: was wirklich noch fehlt (Stand 23.09.2026)

**Die Gründung selbst blockiert nichts.** Notartermin, Gesellschaftsvertrag,
Stammkapital, Handelsregister, Gewerbeanmeldung können laufen.

**Echte Sperren vor dem ersten echten Zahlungsverkehr:**

| # | Sperre | Wer |
|---|---|---|
| 1 | **Null Connect-Konten** — ohne ein aktives ist keine Buchung bezahlbar | Inhaber: Onboarding einmal echt durchlaufen |
| 2 | `EB_STEUERNUMMER` / `EB_UST_ID` in `wp-config.php` — vorher entsteht bewusst kein Provisionsbeleg (§ 14 UStG) | Inhaber, nach dem Finanzamt |
| 3 | Vier Impressum-Platzhalter füllen, danach „i. G." entfernen — das Tor verlangt **beides zusammen** | Inhaber, nach der Eintragung |
| 4 | Stripe-Konto von `individual` auf die UG umstellen | Inhaber, nach der Eintragung |
| 5 | Chargebacks werden seit 23.09. **festgehalten und gemeldet** (`eb_booking_record_dispute()`, 13 Tests, 10 Mutationen). Offen bleibt die **Rückholung** vom Anbieter — AGB-Frage. Dazu fehlen **drei Haken** im Stripe-Dashboard, sonst ist der Empfänger ein toter Zweig; `stripe-webhook.mjs` meldet sie | Inhaber: AGB-Klausel + drei Haken |

**Rechtsfragen, die keine Messung ersetzt:** ZAG-Einordnung unter Destination
Charges anwaltlich bestätigen · PStTG/DAC7 mit dem Steuerberater, insbesondere
was Stripe Connect davon abdeckt · Datenschutzerklärung § 10a, erst dann
`EB_HANDLE_NACHTRAG` setzen (dieselbe Hand, derselbe Moment).

**Technisch offen, von mir baubar:**

- **API-Version nirgends festgeschrieben.** Endpunkt steht auf
  `2026-03-25.dahlia`, unsere Aufrufe nehmen die Kontovorgabe. Pinnen ändert
  die **Gestalt jeder Antwort** — nur mit Gegenprobe im Testmodus, sonst legt
  es die Kasse still.
- Ruleset auf `main` zusätzlich auf `E2E-Testsuite (Playwright)` verlangen
  (Einstellung des Inhabers; der Code-Weg deckt es seit 14.09. ab).
- 105 Deko-Animationen auf der Landeseite (~257 ms) — Gestaltungsfrage.
- App Store: APNs-Schlüssel, `Info.plist`-Zwecktexte, Händlerstatus vor der
  EU-Listung umstellen.

**Erledigt und belegt:** Zahlungsmodell im Impressum · PStTG-Erhebung ·
Provisionsrechnung · PAngV-Gesamtpreis · Impressum-Tor · Stripe-Webhook.

### Offen, bewusst beim Inhaber (Stand 23.09.2026)

- Die fünf Sperren oben, Zeile für Zeile.
- Storno-Höhe (voll vs. anteilig) · Benachrichtigung des Dienstleisters
  (Push/E-Mail) · Ausnahme im Branch-Schutz für die Routine-App ·
  Board-Platz in der Mobilleiste.
- **Drei alte PRs** noch offen: #46 (trägt echte Sicherheitsfixes, ungeprüft ob
  sie inzwischen auf `main` sind), #199 und #228 (dasselbe HQ-Panel zweimal;
  #228 ist der lebende Zweig). Die fünf Routine-PRs #217–#222 und #271 sind am
  23.09. geschlossen — sie trugen nur veraltete erzeugte Dateien.

## Stand 2026-09-15 — die Entwarnung, die der Vault selbst weitergetragen hat

Beauftragt war eine Prüfung „auf Herz und Nieren" zu Nutzerfreundlichkeit und
Gestaltung. Der schwerste Fund liegt eine Ebene darunter, und er betrifft
**diese Datei**.

- **Ein Tor prüft 5 von 34 Seiten, und drei Notizen machten daraus „0 Verstöße
  in der gesamten Anwendung".** Gemessen über die übrigen Seiten: **40
  verstoßende Knoten, 20 `critical`**, alle zwanzig aus **einer** Ursache
  (`<label>` ohne `for=`). Vollständig, mit Kontrastwerten und Handgriffen:
  [[30-Betrieb/Barrierefreiheit-Abdeckung]].
- **Die Zahl der geprüften Seiten stand an vier Stellen und war viermal
  verschieden** (6 / 6 / 4 / „die gesamte Anwendung") — gemessen: 5. Das ist
  nicht die Fehlerklasse „Notiz veraltet", sondern „**der Prüfer hat sein
  Subjekt nie genannt**, und jeder Leser hat sich das größere gedacht".
- **Gestaltung:** das Token-System trägt (2331 `var(--)`), daneben stehen 294
  Hex-Literale und 265 ins Markup geschriebene Stile — und genau daraus
  entstehen zwei **unsichtbare Texte** im Dunkelmodus.
  [[20-System/Frontend/Design-System-Drift]].
- **Die Markenfarbe als Text ist der größte Kontrast-Einzelposten**
  (`#FF385C` auf Weiß = 3,51 : 1, sieben Knoten). Die Regel dagegen steht seit
  dem 01.08.2026 im Vault und wird an 23 Stellen befolgt — es fehlt nichts
  außer ihrer Anwendung an sieben weiteren.

Bericht für den Inhaber: <https://claude.ai/artifact/GHTqNwUFftAaBbWLTJhWC1>

### Die Lektion des Tages: der erste Messwert ist ein Entwurf

**Zwei Zahlen dieses Berichts waren beim ersten Messen falsch** und sind vor
dem Eintrag hier nachgemessen worden:

| berichtet | nachgemessen | Ursache |
|---|---|---|
| 32 Seiten in der Shell | **34** | Muster ohne Ziffern, dazu falsch gezählt |
| 46 verstoßende Knoten | **40** | Seiten mitgezählt, die auf eine andere zurückgefallen waren |

Die zweite ist die lehrreiche: abgemeldet fallen `auftraege`, `business` und
`my-listings` auf die Landeseite zurück, `home` wird `browse`, `profile` wird
`provider`. Wer nicht nachsieht, **welche Seite wirklich aktiv wurde**, misst
dieselbe Seite mehrfach und hält das für Abdeckung.

Die Nachmessung hat dabei einen **zweiten** unsichtbaren Text gefunden, den die
erste übersehen hatte (`.create-payout-title`, 1,15 : 1). Nachmessen ist also
nicht Pflichterfüllung, es findet etwas.

**Regel daraus:** was in den Vault geht, wird vorher noch einmal gemessen —
nicht aus dem Gesprächsverlauf abgeschrieben. Eine Zahl in einer Notiz liest
jede künftige Sitzung als Messwert.

### Drei Fehlschlüsse in Folge am selben Element

Die drei Einstiege der Landeseite (`.ai-hero-wege`) habe ich dreimal falsch
gelesen, bevor die Messung trug: „ausgegraut" (Deckkraft gemessen = 1), „langsam
eingeblendet" (ab 375 ms bei 1), „Kontrastfehler" (mein Helfer lief an den
durchsichtigen Vorfahren vorbei bis zum `body` und meldete einen Hintergrund,
den die Seite nicht zeigt).

Was wirklich trägt: `page.screenshot({ clip })` auf die echte Seite plus
`getComputedStyle`. **Element-Screenshots setzen `backdrop-filter` anders
zusammen als Seiten-Screenshots** — wer ein Element einzeln aufnimmt, sieht
einen Zustand, den es im Bild nicht gibt.

Und der Befund dahinter ist einer, den **kein Tor je melden wird**: über einem
Verlauf meldet axe `incomplete`, nicht `violation`.

### Weitere Betriebserkenntnisse dieser Sitzung

- **Die Dev-Shell hat keine REST-API.** `/freunde` zeigt dort zu Recht seinen
  Störungszustand — dann existiert `#sozGruppeName` gar nicht. Wer ohne
  gestellte `social/*`-Antworten misst, prüft seinen eigenen Prüfstand. Genau
  daran hätte ich beinahe einen Fehler gemeldet, den es nicht gibt.
- **Eine Mutation kann legitim überleben.** `ebAuftragSchluessel()` sortiert
  Datumslose nach hinten — durch die Gruppierung ist das an der Seite **nicht
  beobachtbar**. Die Wache hat ihr Subjekt auf Helferebene bekommen, statt
  einen Seitentest zu erfinden, der eine Wirkung behauptet, die es dort nicht
  gibt.
- **Der Agent-Proxy nimmt nur HTTPS-CONNECT-Tunnel.** GitHub-API-Aufrufe gehen
  an `https://api.github.com/…`, nie an `$HTTPS_PROXY/…`.
- **`--reporter=line`: immer nach `failed|passed` greifen.** `tail -1` verbirgt
  Fehlschläge.
- **`mergeable_state` wird faul berechnet** — die erste Abfrage liefert
  `unknown`. Und `updated_at` eines Workflow-Laufs kann in der API veraltet
  sein; daraus „hängt" zu schließen, war einmal falsch.
- **Benachrichtigungen zu veröffentlichten Berichten kommen hier nicht an**
  (`mint_failed`, zweimal versucht). Rückmeldung zu einem Artifact muss im Chat
  kommen, sonst sieht sie niemand.

### Offen, bewusst beim Inhaber (Stand 15.09.2026)

- **Die vier Handgriffe** aus dem Bericht: 14 `for`-Attribute · der schwarze
  Knopf im Storno-Block · das Tor aus `app-shell.html` ableiten · Statusfarben
  für den Dunkelmodus. Angeboten, **nicht beauftragt**.
- **Neun alte PRs** (#46, #199, #217, #218, #219, #221, #222, #228, #271), alle
  `mergeable_state: dirty`. Gesichtet, nichts geschlossen oder gemergt — der
  Inhaber entscheidet. → [[50-Evolution/Roadmap/Current-Sprint]]
- Ruleset auf `E2E-Testsuite (Playwright)` · Storno-Höhe (voll vs. anteilig) ·
  Benachrichtigung des Dienstleisters (Push/E-Mail) · Ausnahme im Branch-Schutz
  für die Routine-App · Board-Platz in der Mobilleiste · APNs-Schlüssel,
  `Info.plist`-Zwecktexte, Händlerstatus.

## Stand 2026-08-13 — Befund → Arbeit ist geschlossen

- **Die Kette steht und ist Glied für Glied belegt:** elf Rollen finden (Puls,
  `ROLLEN_OK: 11`), `scripts/auftragsstrom.mjs` macht daraus eine
  Warteschlange mit Herkunft, der Scout zieht daraus, der Autopilot liefert
  Patch → Gates → PR → Deploy. Vorher fand das Haus Dinge, an denen niemand
  arbeitete.
- **Der Strom kann den Sicherheitsrahmen nie weiten.** Whitelist liegt in
  `scripts/lib/sichere-dateien.mjs` und wird von Autopilot UND Strom geteilt,
  nicht kopiert. Was draußen bleibt, steht mit Grund unter `ausserhalb` —
  Arbeit für Menschen, nicht für den Autopiloten.
- **Ein Patch darf Schutzkonstrukte nicht wegnehmen.** `patchPruefen()` sah nur
  hinzugefügte Zeilen; `${escHtml(n)}` → `${n}` war damit eine unerkannte
  XSS-Lücke. Geprüft wird jetzt die Bilanz von acht Konstrukten (Maskierung,
  Fehlerbehandlung, Speicher-Aufräumen, `nonce`, `currentUser`, `noopener`).
  Verschieben erlaubt, wegnehmen nicht.
- **Der Autopilot stirbt nicht mehr an einem kaputten Diff.** Die Patch-Prüfung
  läuft jetzt INNERHALB der Modell-Fallback-Schleife; scheitern alle Modelle,
  endet der Lauf wie ein Scout ohne Fund — ohne Änderung, mit festgehaltenem
  Grund. Vier Lagen ohne Änderung werden unterschieden und stehen im Log,
  nicht nur in der Step-Summary.

### Die Lektion des Tages: eine Momentaufnahme ist keine Eigenschaft

Vier festgeschriebene Werte haben entweder eine Unwahrheit am Leben gehalten
oder eine Korrektur blockiert:

| Literal | Folge |
|---|---|
| `'Lagebild 4×/Tag'` im Test | hielt die Behauptung fest, als der Cron längst 30 Min. war |
| `'0.60'` im Autopilot-Test | blockierte die Trennung der Budget-Töpfe |
| `GITHUB_RUN_NUMBER % 12` | behauptete „stündlich", lieferte achtstündlich |
| `'Kontingent $0,60/Tag'` | konservierte den alten Topf an drei Stellen im HQ |

Alle vier sind durch die Eigenschaft dahinter ersetzt. **Beim Schreiben eines
Tests immer fragen: sichere ich eine Eigenschaft zu oder eine Einstellung?**
Eine Einstellung zu ändern ist eine erlaubte Entscheidung; sie wegzulassen
nicht. Der Takt-Test vergleicht deshalb Katalog-Angabe gegen echten Cron,
statt eine Zahl festzuschreiben.

### Zweite Lektion: gemessen schlägt behauptet

- Geplante Workflows sind bei GitHub **best-effort**. `*/30` und `2/5` sind
  Anforderungen, keine Zusagen — gemessen kamen sie alle 31–82 Min. Das HQ
  nennt jetzt beides.
- Eine Behauptung über Wirkung braucht eine **Grundlinie**. Ich hatte
  `ui-enhancements.css` für schädlich erklärt; mit sauberer Messung (ohne /
  vorher / nachher, HTTP-200 verifiziert) war sie wirkungslos. Die erste
  Messung hatte keine Grundlinie.
- Eine Lage, die man **nur an einer Stelle** sehen kann, sieht man meistens gar
  nicht. Gründe und Kosten gehen deshalb per `tee -a` ins Log UND in die
  Step-Summary.

### Offen, bewusst beim Inhaber

Rahmen-Erweiterung auf `core/01-demo-daten.js` und `search/13-event-radar.js`
(13 → 15 Dateien). Gemessen und vorgeschlagen, **nicht entschieden** — das ist
eine Sicherheitsentscheidung. Nie empfohlen: `board/`, `core/30-auth.js`,
`payments/`.

## Stand 2026-08-04 — OpenRouter-Autopilot ist die primäre KI-Automation

- **Vier echte Rollen statt Modell-Dekoration:** Ela/Gemma scoutet, Ada/Llama
  plant, Timo/Qwen Coder schreibt einen kleinen Patch, Kito/DeepSeek prüft ihn
  unabhängig. OpenRouter-Fallbacks halten den Lauf bei Provider-Ausfällen am
  Leben. Alle IDs stehen als echte OpenRouter-Modell-Slugs im Katalog.
- **Harte Änderungsgrenze:** ausschließlich eine feste Whitelist kleiner,
  nicht-sensibler Frontend-Dateien; höchstens 2 Dateien und 260 Diff-Zeilen.
  Kein Backend, Auth, Payment, Workflow, bestehender Test, Netzwerk-, Cookie-
  oder Storage-Pfad. `git apply --check` läuft vor dem Anwenden.
- **Kostenbremse:** höchstens 0,35 USD je Wochenlauf; bei einem Key mit eigenem
  Limit startet unter 1 USD Rest kein Lauf. OpenRouters `null` bedeutet „kein
  Key-Limit", nicht 0 USD. Modell, Token und Kosten stehen im PR.
- **Vollautonome, aber rückholbare Auslieferung:** Agenten-Review → Gate →
  Syntax-Gates → komplette Playwright-Suite → eindeutig zugeordneter PR →
  erneute Scope-Prüfung → Squash-Merge → explizit gestarteter bestehender
  IONOS-Deploy. Jeder Schritt kann den Lauf stoppen; Geld/Kommunikation bleiben
  außerhalb.
- **Anthropic-Routinen sind Legacy/manuell.** Ihre Zeitpläne sind entfernt,
  damit fehlende oder getrennt abgerechnete Anthropic-Keys nicht wöchentlich
  rote Läufe erzeugen.
- **HQ-Proxy repariert:** `/hq` setzt jetzt einen `wp_rest`-Nonce in die nur für
  Admins ausgelieferte Seite ein; die Probes senden `X-WP-Nonce`. Der vorherige
  401/403 war Cookie-Auth ohne REST-Nonce, nicht ein ungültiger OpenRouter-Key.

## Stand 2026-08-01 — Fable-5-Auftrag umgesetzt (Testsuite, Audit, Module, Design, A11y)

**Die fünf Auftragsschritte sind live auf main. Wichtigste neue Regeln:**

1. **app.js ist GENERIERT** — Quelle ist `js/modules/**` (22 Module in core/,
   search/, chat/, payments/, board/, ai/, ui/; Reihenfolge `modules.list`).
   Nach Modul-Änderung: `./build-app-js.sh` + regenerierte app.js mitcommitten.
   CI bricht bei Drift ab. Reines cat — kein Bundler (Leitplanke bleibt gewahrt).
2. **Testsuite existiert** (68 Tests, 7 Suiten, `npm test`): Smoke alle Routen,
   Suche (natürliche Sätze), Gebühren (centgenau, JS↔PHP-Parität via php-CLI),
   Wissensbasis (Antworten + Leckage), CSS-Minify (Verlaufsschrift), Design-System
   (Konflikt-Ratsche), Barrierefreiheit (axe, beide Modi). **Blockiert PRs.**
   Vor jedem Merge: `npm test` muss grün sein.
3. **Sicherheits-Audit** aller 86 Routen + 237 innerHTML-Pfade: Bericht in
   `40-Governance/Security/2026-08-01-Sicherheits-Audit-Fable5.md` (secret).
   Ergebnis: Juni-Härtung trägt; 1 mittlerer Fund (KB-Leckage Webhook-Signatur,
   behoben + Verbotsmuster erweitert), 2 Low-XSS behoben. Scanner bleiben in
   `tests/audit/` (xss-scan.js, css-duplicates.js).
4. **Design-Tokens:** --eb-*-Tokens nur noch EINMAL definiert (vorher 3×
   überschreibend). Neue Text-Tokens `--primary-text` / `--accent-text` für
   WCAG-AA-Text auf hellem/dunklem Grund — Markenfarbe #FF385C bleibt für
   Flächen/Icons. Behobener Live-Bug: „Beliebt:"-Chips waren durch
   Klassenkollision (.ai-suggestions ×2) unsichtbar → Hero-Chips heißen
   jetzt `.ai-sug-row`.
5. **A11y:** 97 axe-Verstoß-Nodes → **0** über beide Farbmodi × 6 Kernseiten
   (Galerie-Dots/Tracks mit Labels + Tastatur, Selects beschriftet, Kontraste).
   axe ist Teil der Suite — neue Verstöße machen CI rot.
   > ⚠️ **Am 15.09.2026 widerlegt, Satz bleibt als Protokoll stehen.** Das Tor
   > misst **5** Routen, nicht 6 Kernseiten, und die Anwendung hat **34**
   > Seiten. Die „0" galt also für ein Sechstel der Anwendung und wurde hier
   > wie eine Aussage über das Ganze notiert. Gemessen über die übrigen
   > Seiten: **40 Knoten, 20 `critical`.** →
   > [[30-Betrieb/Barrierefreiheit-Abdeckung]]

## Projekt-Essenz

**Plattform** ist ein deutscher Marktplatz, der Event-Planer mit Dienstleistern (DJs, Catering, Foto, Locations etc.) verbindet. Ziel: beste und funktionalste Eventplattform in Deutschland.

→ [[20-System/Architecture/Overview]] | [[20-System/Backend/API-Endpoints]] | [[30-Betrieb/CI-CD/Deployment]]

## Nutzer-Präferenzen

- **Sprache:** Deutsch in Konversation, Englisch in Code-Kommentaren
- **Stil:** Direkt umsetzen, nicht zu viel fragen — wenn etwas unklar ist, kurz nachfragen dann sofort handeln
- **Kein Over-Engineering:** Keine Abstraktionen die nicht gebraucht werden, keine Tests für unmögliche Szenarien
- **Vanilla JS bleibt:** Bewusste Entscheidung gegen React/Vue — keine Framework-Migration vorschlagen

## Technische Realität

> **Zahlen hier sind Größenordnungen, keine Messwerte.** Die geprüften Angaben
> stehen in `CLAUDE.md` und werden von `scripts/kontext.mjs` gegen den Code
> gemessen. Diese Tabelle stand bis zum 15.09.2026 auf Werten von Juni und war
> um bis zu 60 % daneben — wer sie für aktuell hält, plant falsch.

| Was | Details (Stand 15.09.2026) |
|-----|---------|
| Frontend | `app.js` ~30.700 Zeilen, Vanilla JS SPA (generiert aus `js/modules/**`) |
| Backend | `functions.php` ~11.900 Zeilen + `includes/`, WordPress REST API |
| Styling | `styles.css` ~17.800 Zeilen, mobile-first |
| Oberfläche | `app-shell.html`, **34 Seiten** (`id="page-…"`) |
| Hosting | IONOS/Shared WordPress Hosting, automatisches Deployment via GitHub Actions + SFTP |
| Auth | Login/Register + 2FA (OTP per E-Mail) + WebAuthn/Passkeys |
| Zahlungen | Stripe Payment Element + Connect Express + Webhook + Reconcile (integriert, E2E weiter zu härten) |
| QA-Support | Tokenfreier QA-Bot in der UI, regelbasiert mit direkten Navigationsaktionen |

→ [[20-System/Frontend/app-js-module]] | [[10-Produkt/Features/Authentication]] | [[10-Produkt/Features/Payments]]

## Stand 2026-08-01 — Betriebsregeln für kommende Sessions

**Zuerst lesen, dann handeln.** Was eine neue Session wissen muss:

- **Wissensbasis speist sich NUR aus `10-Produkt/Wissen/`.** `Features/` und
  `UserFlows/` sind `internal` — sie enthalten Endpunkte und
  Schutzmaßnahmen. Nie zurück auf `public` heben, ohne Zeile für Zeile zu
  prüfen. Ein Verstoß war live: HMAC-Webhook-Verifizierung ging an anonyme
  Chat-Nutzer.
- **Zwei Retrieval-Engines, gleiche Regeln:** `_ebKbSearch` in `app.js` und
  der EB Circle in `hq.html`. Ändert man die eine, die andere mitziehen —
  sonst antworten Website und HQ unterschiedlich.
- **`node scripts/pulse.mjs`** nach größeren Änderungen laufen lassen; die
  Notiz [[00-Kern/Impuls-Strom]] ist generiert und wird überschrieben.
- **Event-Universum ist die Vision-Metrik.** „Jede Art von Event abbilden"
  misst sich an `EB_EVENT_UNIVERSE` (aktuell 30 Typen). Erweitern heißt:
  Eintrag + Synonym-Cluster in `_EB_SYN_GROUPS`, sonst findet die Suche nichts.
- **Externer Zufluss braucht Quarantäne** → [[30-Betrieb/MCP-Architektur]].
  Geholtes Wissen landet als `internal` in `50-Evolution/Recherche/`; die
  Hebung auf `public` entscheidet der Mensch.
- **Konfliktlage beachten:** Solange Fable 5s Modularisierung nicht gepusht
  ist, sind `app.js`/`styles.css`/`app-shell.html` heikel. Siehe
  „Offen" in [[50-Evolution/Roadmap/Current-Sprint]].
- **Rolle:** Der Nutzer führt als CEO/Review, ich arbeite operativ. Er greift
  ein, wenn ihm etwas nicht gefällt — das heißt: liefern, verifizieren,
  ehrlich berichten, Risiken benennen statt zu beschönigen.

## Stand 2026-07-24 — Brain-Architektur & Website-Synergie (live)

**Der Vault ist jetzt geschichtet und speist die Website.** Wichtigste Konsequenzen für
künftige Sessions:

- **Pfade haben sich geändert.** Kontext liegt unter `50-Evolution/AI-Gedaechtnis/` und
  `50-Evolution/Roadmap/`. Ebenen: `00-Kern` (Wissensarchitektur), `10-Produkt`,
  `20-System`, `30-Betrieb`, `40-Governance`, `50-Evolution`.
- **Jede Notiz braucht Frontmatter** (`layer`, `domain`, `share`, `tags`). Ohne
  `share: public` ist eine Notiz nicht öffentlich (Fail-Safe). `40-Governance/Security/`
  ist vollständig `secret` und darf **nie** exportiert werden.
- **Wissensbasis:** `scripts/build-knowledge.mjs` erzeugt `assets/eb-knowledge.json` aus
  allen `share: public`-Notizen (Whitelist + Verbotsmuster-Scan). Nach jeder Änderung an
  einer public-Notiz neu bauen **und die JSON mitcommitten** — sonst hinkt die Website nach.
- **Beide Bots nutzen sie:** `_ebKbGoodHit()` wird im QA-Bot (`_qaAnswer`) und im
  Board-Assistenten (`_aiAnswer`, Stufe 9) vor dem Fallback befragt. Intents behalten
  Vorrang für Navigation/Aktionen; die KB liefert Inhaltsantworten.
- **Wissenslücken** landen in `localStorage.eb_kb_misses` — Rohmaterial für neue
  public-Notizen (Impuls 6 aus [[00-Kern/Wissensstroeme]]).
- Nutzer-Vision dahinter: „Synergie zwischen Brain, Claude und Website" — das Brain ist
  die gemeinsame Quelle, nicht bloß Doku. Änderungen daran mit derselben Sorgfalt wie Code.

→ [[00-Kern/Layer-Modell]] | [[00-Kern/Synergie-Pipeline]] | [[00-Kern/Sicherheits-Klassifikation]]

## Neuester Stand (2026-06-20)

- **Bild-Robustheit:** Globaler `<img>`-Fehler-Handler (Capture-Phase) sorgt dafür, dass JEDES Bild bei toter URL ein sauberes Fallback bekommt (Avatar bzw. „Bild nicht verfügbar"). Vorher hatten nur Card + Hero-Marquee ein Fallback — Detail-Hero/-Galerie zeigten kaputte Icons.
- **Detailseite crash-sicher:** `loadDetail()` normalisiert `images`/`priceLabel`/`features` defensiv; ein Listing ohne `images`-Array zerstört die Seite nicht mehr.
- **Filter gehärtet:** `browseSort`-Zugriff defensiv (`?.`). Filterlogik (Tokenisierung, Synonyme, Fuzzy, Kategorie/Ort/Preis/Rating/Datum) per Headless-Browser verifiziert: dj→3, „catering hamburg"→1, fotograf→2, cat+ort→1, keine Treffer→Alternativen.
- Verifikation: Vanilla-SPA lokal mit Playwright/Chromium durchgeklickt (browse/detail/provider/board/feed/favorites/settings) — **0 Page-Errors**. Backend-/API-gebundene Flows (Login, Inserat-Erstellung, Stripe) brauchen den Live-WordPress-Server und sind hier nicht prüfbar.

## Neuester Stand (2026-06-06)

- Live-Stand: GitHub `main` `3c1e752`, Domain erreichbar, Assets mit `styles.css?v=2.5.1`.
- Board-Picker lädt vollständige Listing-Mengen (`includeAllPages`), nicht nur gekappte Teilmengen.
- Such-Listings werden sauber markiert (nicht mehr über Rollen-Heuristik).
- Selbstbuchung ist auf mehreren Ebenen blockiert (Board + Direktbuchung).
- Eigene Angebote sind für Planer im Board sichtbar, aber nicht als Fremdbuchung verlinkt.
- Demo-Sichtbarkeit ist zwischen Home/Browse/Map/Board vereinheitlicht.
- Paketplanung wurde erweitert: Multi-Select + mehrere Zeitfenster pro Paketposition.
- Stripe Connect ist als Dienstleister-Onboarding in Einstellungen sichtbar; Bank-/KYC-Daten laufen über Stripe, nicht über Eventbörse.
- QA-Bot ist rechts über der Bottom-Navigation: Roboter/Support-Agent mit Partyhut, Headset, Mikro; transparent, ohne Card/Status-Dot.
- Loader/Hero-Popper wurden bereinigt; doppelte Popper-Bilder entfernt.
- IDN-E-Mail-Login (`eventbörse.de`) ist repariert.

→ [[50-Evolution/Archiv/Latest-Stand-2026-06-06]]

## Architektur-Stärken (nicht anfassen)

- Einfaches SFTP-Deployment (kein Build-Schritt)
- WordPress als bewährter Auth/DB-Layer
- WebAuthn schon implementiert (selten bei kleinen Projekten)
- Stripe-Grundgerüst + Connect-Onboarding vorhanden
- Tokenfreie Support-Hilfe vorhanden (QA-Bot)

## Bekannte Schwächen (Prioritätsliste)

### P0 — Kritisch
- [ ] **Listings/Board Regression-Schutz** — feste Smoke-Tests gegen Selbstbuchung, verschwundene Listings und Demo-Visibility-Regressions.
- [ ] **Sichere Default-Pfade für KI-Automation** — Änderungen nur mit Guardrails (kein destruktives Bulk-Verhalten bei Unsicherheit).
- [ ] **Stripe Connect E2E absichern** — Dienstleister-Onboarding, Payment Intent, Webhook, Reconcile, Refund-Pfad im Testmodus durchtesten.

### P1 — Wichtig
- [ ] **Echtzeit-Messaging** — Polling mit abfallendem Takt (5 s → 20 s, Pause bei verstecktem Tab), **nicht mehr „alle 3s"**. SSE ist auf dem IONOS-Pool die schlechtere Wahl → [[50-Evolution/AI-Gedaechtnis/Entscheidungen]]
- [ ] **Volltextsuche** — echte MySQL FULLTEXT statt client-seitiger Filterung
- [ ] **Review-System** — Bewertungen nach Buchungsabschluss konsistent in allen Ansichten ausrollen
- [ ] **Stripe-Härtung** — Reconcile/Return-Flow weiter absichern, E2E-Prüfpfade automatisieren

→ [[10-Produkt/Features/Messaging]] | [[10-Produkt/Features/Payments]] | [[50-Evolution/Roadmap/Current-Sprint]]

### P2 — Nice-to-Have
- [ ] PWA + Service Worker (Push-Benachrichtigungen, App-Installation)
- [ ] SEO-Pre-rendering (aktuell reines SPA, schlecht für Google)
- [ ] Analytics-Dashboard

## Code-Beziehungs-Map

```
app.js ──liest──→ /wp-json/eventboerse/v1/* (functions.php)
       ──nutzt──→ Stripe.js (Zahlungen)
       ──nutzt──→ Leaflet.js (Karten)
       ──ruft──→ self-hosted Avatar-Generator (`ebAvatar()`)
       ──ruft──→ _apiUrl() → _apiHeaders() (Nonce-Auth)

functions.php ──nutzt──→ WordPress User Meta (DB)
              ──sendet──→ SMTP E-Mail (Hosting-Provider)
              ──ruft──→ Stripe API (PHP SDK)
              ──inkludiert──→ webauthn.php (Passkeys)
```

→ [[50-Evolution/AI-Gedaechtnis/Code-Beziehungen]]

## SPA-Router Cheatsheet

```javascript
navigateTo('home')          // Startseite
navigateTo('browse')        // Listings-Übersicht
navigateTo('detail', id)    // Listing-Detail
navigateTo('chat', userId)  // Chat öffnen
navigateTo('board')         // Event-Planer Board
navigateTo('profile')       // Eigenes Profil
navigateTo('settings')      // Einstellungen
navigateTo('admin')         // Admin-Panel
```

## Wichtige app.js Sektionen

| Zeile | Inhalt |
|-------|--------|
| ~947 | `loadDbListings()` |
| ~10237 | `_apiUrl()` / `_apiHeaders()` |
| ~11600 | QA-Bot Regeln und Actions (`QA_TOPICS`, `handleQaAsk`) |
| ~12500 | `renderBoardPage()` |
| ~13000 | Board-Buchungs-/Provider-Update-Pfade |
| ~15600 | Stripe Connect Status/Diagnose/Onboarding |
| ~17000 | `openAddProviderModal()` (Baustein/Paket Picker) |
| ~17600 | `_addProviderCard()` (Paket-/Selbstbuchungs-Guards) |

## Lernpunkte aus vergangenen Gesprächen

- **`hq.html` = EventBörse HQ (Mission Control):** Eigenständiges, self-contained Dev-Command-Center über die GitHub-API. Gamifiziert (Level/XP, Streak, Quests = Roadmap, Achievements, Bot-Team, Aktivitäts-Log, Confetti/SFX). Kein Build-Schritt, kein Framework. Zugriff per `HQ_KEYS`, GitHub-PAT (sessionStorage) für Rollback/Bot-Trigger. Quests spiegeln die Sprint-Roadmap — beim Hinzufügen neuer Roadmap-Punkte auch das `QUESTS`-Array in `hq.html` pflegen. GitHub-Daten werden per stale-while-revalidate in `localStorage` gecacht (geringere Rate-Limit-Last).
- **Auto-Routinen (GitHub Actions):** `claude-improve.yml` setzt wöchentlich (Mo 05:00 UTC, rotierender Fokus performance→ux→a11y→seo→security→code-quality) EINE fokussierte Verbesserung um und öffnet via `peter-evans/create-pull-request` einen **Draft-PR** (nutzt `anthropics/claude-code-action` + Secret `ANTHROPIC_API_KEY`). `lighthouse-audit.yml` misst wöchentlich Perf/SEO/A11y der Live-Seite (kein API-Key). `claude-auto-audit.yml` läuft wieder wöchentlich (Report-Issues). Alle im HQ unter „Routinen & Bot-Team" sichtbar/triggerbar (`BOTS`-Array). **Voraussetzungen:** Secret `ANTHROPIC_API_KEY` + Repo-Setting „Allow GitHub Actions to create and approve pull requests". Draft-PRs werden von `security.yml` (`node --check app.js`) + `pr-check.yml` geprüft, bevor sie mergebar sind; Merge nach `main` deployt automatisch.

## Stand 2026-06-26 — Admin-Bildmoderation & Security-Härtung (live auf main)

- **Admin-Bildmoderation (umgesetzt):** Admins können einzelne Bilder löschen
  - Detailseite: roter „Löschen"-Button pro Galerie-Bild (`adminDeleteListingImage`).
  - Provider-Portfolio: Lösch-Overlay (`adminDeleteProfileImage`) + Lightbox-Button, dauerhaft sichtbar.
  - Backend: `POST /admin/moderate-image` (nur Admin) entfernt Bild aus `eb_gallery` + allen Listings des Nutzers.
  - **Persistente Blocklist** (`eb_demo_image_blocklist`, normalisierte Pfade) → wirkt auch für hardcodierte Demo-Listings (z. B. Blumenträume München, Pyroshock), reload-fest. Client: `window.EB_IMG_BLOCKLIST` via `eventboerseApi.imageBlocklist`, gefiltert in Demo-LISTINGS, `loadDbListings`, `loadProvider`.
  - Damit ist der alte Sprint-P0 „Admin-Moderation gegen Code abgleichen" erledigt.
- **Security (live):** XSS-Härtung (`_escHtml` encodet jetzt auch Quotes; Map-/Card-Render escapt); Brute-Force-Rate-Limiting verdrahtet (`includes/security/rate-limit.php` war vorher nie eingebunden) auf Login/OTP/Reset/Register mit Reset-on-Success; CSP `'unsafe-eval'` entfernt (Frontend nutzt kein eval, kein jQuery); WP-User-Enumeration gesperrt (`/wp/v2/users` + `?author=N`).
- **CI/Deploy:** Neuer Workflow `.github/workflows/security.yml` (php -l alle + node --check + Pattern-Scan, läuft bei Push/PR). Minifier-Versionen gepinnt (`terser@5.48.0`, `csso-cli@5.0.5`) — Ursache eines früheren Ausfalls (unpinned `npx` zog kaputtes terser-Release). `SECURITY.md` mit Responsible-Disclosure-Policy.
- **Offen (User-Seite):** Postfach `security@eventbörse.de` einrichten; optional CDN-SRI/Self-Hosting (von CI-Umgebung nicht möglich, Outbound geblockt); strikte CSP ohne `'unsafe-inline'` würde Inline-Handler-Refactor erfordern (groß, bewusst zurückgestellt).

<!-- Dieser Abschnitt stand hier zweimal wörtlich hintereinander; die Kopie ist
     am 15.09.2026 entfernt. Eine doppelte Fassung in der Datei, die jede
     Sitzung zuerst liest, kostet Kontext und lässt zwei Stände entstehen,
     sobald jemand nur eine der beiden pflegt. -->

---
*Zuletzt aktualisiert: 2026-09-15*
