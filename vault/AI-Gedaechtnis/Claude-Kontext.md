# AI-Gedächtnis: Claude Kontext

> Diese Datei ist die **erste Quelle** die Claude Code liest. Sie enthält alles Wichtige über Projekt, Präferenzen und offene Aufgaben.

## Projekt-Essenz

**Plattform** ist ein deutscher Marktplatz, der Event-Planer mit Dienstleistern (DJs, Catering, Foto, Locations etc.) verbindet. Ziel: beste und funktionalste Eventplattform in Deutschland.

→ [[Architecture/Overview]] | [[Backend/API-Endpoints]] | [[CI-CD/Deployment]]

## Nutzer-Präferenzen

- **Sprache:** Deutsch in Konversation, Englisch in Code-Kommentaren
- **Stil:** Direkt umsetzen, nicht zu viel fragen — wenn etwas unklar ist, kurz nachfragen dann sofort handeln
- **Kein Over-Engineering:** Keine Abstraktionen die nicht gebraucht werden, keine Tests für unmögliche Szenarien
- **Vanilla JS bleibt:** Bewusste Entscheidung gegen React/Vue — keine Framework-Migration vorschlagen

## Technische Realität

| Was | Details |
|-----|---------|
| Frontend | `app.js` 21.093 Zeilen, Vanilla JS SPA |
| Backend | `functions.php` 7.294 Zeilen, WordPress REST API (81 Route-Registrierungen) |
| Styling | `styles.css` 14.716 Zeilen, mobile-first |
| Hosting | IONOS/Shared WordPress Hosting, automatisches Deployment via GitHub Actions + SFTP |
| Auth | Login/Register + 2FA (OTP per E-Mail) + WebAuthn/Passkeys |
| Zahlungen | Stripe Payment Element + Connect Express + Webhook + Reconcile (integriert, E2E weiter zu härten) |
| QA-Support | Tokenfreier QA-Bot in der UI, regelbasiert mit direkten Navigationsaktionen |

→ [[Frontend/app-js-module]] | [[Features/Authentication]] | [[Features/Payments]]

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

→ [[AI-Gedaechtnis/Latest-Stand-2026-06-06]]

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

→ [[Features/Messaging]] | [[Features/Payments]] | [[Roadmap/Current-Sprint]]

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

→ [[AI-Gedaechtnis/Code-Beziehungen]]

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
