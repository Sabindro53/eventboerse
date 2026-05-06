# App-Store-Readiness Roadmap

Stand: 2026-05-02 | Owner: Owner

Ziel: Plattform als native App in **Apple App Store** *und* **Google Play Store** anbieten — mit funktionierender Stripe-Integration und produktionsreifer Sicherheit.

Verwandte Notes: [[Dashboard]], [[Stripe]], [[Authentication]], [[Payments]], [[API-Endpoints]]

---

## Aktueller Stand

- **Web-App** lebt unter `{{DOMAIN}}`, deployed via SFTP-Workflow.
- **Backend**: WordPress + ~67 REST-Endpoints in `functions.php`.
- **Frontend**: monolithische `app.js` (~15.000 Zeilen, Vanilla JS SPA).
- **CI**: PR Check, Site Monitor, SFTP-Deploy, Auto-Audit (nightly).
- **Branch-Protection**: Ruleset `main-protection` aktiv (PR-Pflicht, Status-Checks).
- **Audit Issue #13** offen mit 5 P0- und 2 P1-Funden.

## Phasen-Plan

### Phase 1 — P0-Sicherheits-Fixes (Pflicht vor Store-Submission)

Alle 5 P0 aus Issue #13 muessen erledigt sein. Apple/Google lehnen Apps mit unverifizierten Stripe-Webhooks oder XSS sofort ab.

| # | Fund | Datei / Stelle | Aufwand | Status |
|---|------|----------------|---------|--------|
| P0.1 | REST permission_callback fehlt | `functions.php` (~67 Routes) | M | TODO |
| P0.2 | XSS via innerHTML | `app.js:~2419`, Chat, Reviews | L | TODO |
| P0.3 | Stripe-Webhook-Signatur | `functions.php` Webhook-Handler | M | TODO |
| P0.4 | Auth Rate-Limiting | Login/Register/Reset Endpoints | S | TODO |
| P0.5 | Token-Expiry | `app.js` localStorage-Wrapper | S | TODO |

PR-Reihenfolge (klein zu groß, isoliert zu invasiv):
1. **PR `security/stripe-webhook`** — neuer Endpoint mit `Stripe::Webhook::constructEvent`. Ist isoliert, ersetzt zunaechst nicht den existing Code.
2. **PR `security/token-expiry`** — Wrapper `getValidToken()` in app.js, neue Funktion. Kein Breaking-Change.
3. **PR `security/rate-limit`** — Transient-basiert. Drei Endpoints betroffen.
4. **PR `security/dompurify`** — DOMPurify einbinden + Helper `sanitizeHtml()`. Migration der innerHTML-Stellen schrittweise in folgenden Mini-PRs.
5. **PR `security/permission-callbacks`** — Audit aller register_rest_route + Default-Capabilities. Groesster Aufwand.

### Phase 2 — PWA-Foundation (Voraussetzung fuer beide Stores)

Capacitor und TWA setzen beide eine valide PWA voraus.

- `manifest.webmanifest` mit name, short_name, start_url, display: standalone, theme_color, background_color
- App-Icons (192, 512, maskable, monochrome) — generieren via `pwa-asset-generator`
- Splash-Screens fuer iOS-Sizes
- Service Worker fuer Offline-Fallback (`/offline.html`) + Asset-Cache
- `apple-touch-icon` + iOS Meta-Tags
- Lighthouse-Score > 90 in PWA-Kategorie

Aufwand: 2-3 Tage. Output: PR `feat/pwa-foundation`.

### Phase 3 — Apple App Store via Capacitor

**Achtung Stripe/Apple-Konflikt:** Apples Guidelines (3.1.1) verbieten Stripe fuer digital goods (Sub-Plaene, Premium-Features). Erlaubt: Stripe fuer **physical goods und services** (also: Buchungen von Event-Dienstleistungen *in der echten Welt* sind OK — das ist unsere Hauptnutzung).

Was *muss* via Apple In-App Purchase laufen:
- Premium-Abos der Plattform selbst (falls vorhanden)
- Digitale "Boost"-Features fuer Listings

Was *darf* Stripe bleiben:
- Nutzer A bucht echten DJ von Nutzer B fuer Hochzeit am 01.07.
- Nutzer A mietet Eventlocation.

Schritte:
1. Apple Developer Account ($99/Jahr, ~2 Wochen Approval)
2. Capacitor in PWA integrieren (`npx cap init`, `npx cap add ios`)
3. iOS-spezifische Plugins: `@capacitor/push-notifications`, `@capacitor/camera`, `@capacitor/geolocation` falls genutzt
4. Native Build via Xcode, Code Signing, Provisioning
5. Privacy Policy + Privacy Manifest (`PrivacyInfo.xcprivacy`)
6. App Tracking Transparency (ATT) falls Tracking
7. Submission via App Store Connect → Review (~7 Tage)

Aufwand: 1-2 Wochen ohne Review-Wartezeit. Output: PR `feat/capacitor-ios`.

### Phase 4 — Google Play via TWA

Trusted Web Activity ist die einfachste Variante: PWA wird in Chrome-WebView angezeigt, sieht aus wie native App.

- Voraussetzung: PWA mit perfektem Lighthouse-Score + HTTPS + manifest
- Bubblewrap-CLI (`@bubblewrap/cli`) generiert Android-Projekt
- Digital Asset Links (`assetlinks.json` auf der Plattform-Domain) zur Domain-Verifikation
- Google Play Developer Account (25$ einmalig)
- AAB-Build, Signing, Submission

Stripe ist auf Android **nicht** so streng eingeschraenkt wie auf iOS. Kein zwingender IAP-Wechsel.

Aufwand: 3-5 Tage. Output: PR `feat/twa-android`.

## Cross-Cutting Concerns

### DSGVO + Privacy Policy
- Eigene `Datenschutz.md` Seite verlinkt vom Footer
- Cookie-Banner mit echtem Opt-In-Consent (nicht nur Banner-Akzeptieren)
- Auftragsverarbeitungsvertraege mit Stripe, Hosting-Provider, ggf. Analytics-Anbieter
- DSGVO-Loeschanfrage-Endpoint

### Test-Strategy
- Mindestens E2E-Smoke-Tests fuer kritische Flows (Login, Listing erstellen, Stripe-Checkout)
- Playwright vor Stores ist sinnvoll

### Compliance-Doku fuer Apple/Google Reviews
- Demo-Account fuer Reviewer (Stripe-Test-Mode)
- App-Beschreibung in DE + EN
- Screenshots in allen Required Sizes

## Was *nicht* in dieser Roadmap ist

- P1/P2-Funde aus Issue #13 (Polling, Demo-Daten, FULLTEXT-Index, app.js-Refactoring) — kommen nach Store-Launch
- Internationalisierung (EN-Version) — Nice-to-Have
- Native Push-Notifications — Phase 3.5 wenn Apple-Build steht

---

*Dokument wird mit jeder abgeschlossenen Phase aktualisiert.*
