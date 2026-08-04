---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# AI-Gedächtnis: Claude Kontext

> Diese Datei ist die **erste Quelle** die Claude Code liest. Sie enthält alles Wichtige über Projekt, Präferenzen und offene Aufgaben.

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

## Projekt-Essenz

**Plattform** ist ein deutscher Marktplatz, der Event-Planer mit Dienstleistern (DJs, Catering, Foto, Locations etc.) verbindet. Ziel: beste und funktionalste Eventplattform in Deutschland.

→ [[20-System/Architecture/Overview]] | [[20-System/Backend/API-Endpoints]] | [[30-Betrieb/CI-CD/Deployment]]

## Nutzer-Präferenzen

- **Sprache:** Deutsch in Konversation, Englisch in Code-Kommentaren
- **Stil:** Direkt umsetzen, nicht zu viel fragen — wenn etwas unklar ist, kurz nachfragen dann sofort handeln
- **Kein Over-Engineering:** Keine Abstraktionen die nicht gebraucht werden, keine Tests für unmögliche Szenarien
- **Vanilla JS bleibt:** Bewusste Entscheidung gegen React/Vue — keine Framework-Migration vorschlagen

## Technische Realität

| Was | Details |
|-----|---------|
| Frontend | `app.js` ~23.100 Zeilen, Vanilla JS SPA |
| Backend | `functions.php` ~7.700 Zeilen, WordPress REST API (84 Route-Registrierungen) |
| Styling | `styles.css` ~16.300 Zeilen, mobile-first |
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
- [ ] **Echtzeit-Messaging** — aktuell Polling alle 3s, WebSockets/SSE wäre besser
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

---
*Zuletzt aktualisiert: 2026-06-26*
