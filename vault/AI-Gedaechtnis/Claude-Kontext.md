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
| Frontend | `app.js` 20.769 Zeilen, Vanilla JS SPA |
| Backend | `functions.php` 6.741 Zeilen, WordPress REST API (80 Route-Registrierungen) |
| Styling | `styles.css` 14.716 Zeilen, mobile-first |
| Hosting | IONOS/Shared WordPress Hosting, automatisches Deployment via GitHub Actions + SFTP |
| Auth | Login/Register + 2FA (OTP per E-Mail) + WebAuthn/Passkeys |
| Zahlungen | Stripe Payment Element + Connect Express + Webhook + Reconcile (integriert, E2E weiter zu härten) |
| QA-Support | Tokenfreier QA-Bot in der UI, regelbasiert mit direkten Navigationsaktionen |

→ [[Frontend/app-js-module]] | [[Features/Authentication]] | [[Features/Payments]]

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

*(Claude trägt hier neue Erkenntnisse ein)*

## Self-Improvement-Loop (seit 2026-06-13)

Eigenständiges Dashboard, das laufende Audits sichtbar macht und Vorschläge per Annehmen/Ablehnen verwaltet:

- `dev-status.html` + `dev-status.js` + `dev-status.css` — standalone Diagnose-Seite. Lokal: `http://localhost:8000/dev-status.html`. Live: `https://eventbörse.de/wp-content/themes/eventboerse/dev-status.html`.
- `improvements.json` — Audit-Manifest, jeweils mit `id`, `type`, `effort`, `impact`, `evidence`, `why`, `what_changes`, `risk`. Aktuell: AUD-001 bis AUD-010.
- **Schleife für nächste Claude-Sessions:**
  1. Operator öffnet `dev-status.html`, sieht "Was läuft / Was nicht" (System-Puls) + alle offenen Vorschläge.
  2. Operator klickt Annehmen / Ablehnen / Später.
  3. Operator klickt "Entscheidungen exportieren" → lädt `decisions.json`.
  4. `decisions.json` ins Repo committen (oder in eine PR-Beschreibung paste).
  5. Nächste Claude-Session liest `decisions.json` und arbeitet die `approved` Einträge ab.
  6. Erledigte Einträge werden in `improvements.json` auf `status: "done"` gesetzt und neue Audit-Items angehängt.
- **Wichtig:** Dashboard fasst weder `app.js` noch `functions.php` an — Null-Risiko-Tool.

→ Workflow-Status in `vault/Roadmap/Current-Sprint.md` als neuer P0-Punkt.

---
*Zuletzt aktualisiert: 2026-06-13*
