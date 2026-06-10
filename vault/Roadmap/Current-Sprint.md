# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Aktiver Fokus (P0)

- [ ] **PR #46 mergen + App-Store-Pfad starten**
  - Branch `claude/amazing-fermat-A0a7e` enthält das Release-Paket (siehe „Zuletzt ausgeliefert").
  - Nach Merge: `.well-known`-URLs am Domain-Root prüfen, dann PWABuilder
    (Runbook: `docs/app-store-release.md`).
- [ ] **Listings-/Board-Regressionen ausschließen**
  - Ziel: Keine verschwundenen Listings mehr in Board/Startseite/Map/Browse.
  - Pflicht-Checks nach Deploy: Listings API, Board Picker, Demo-Toggle, Selbstbuchungsschutz.
- [ ] **KI-Änderungs-Guardrails operationalisieren**
  - Safe Defaults für automatische Worker (kein destruktives Verhalten bei Unsicherheit).
  - Änderung nur mit nachvollziehbarem Status + Grund.
- [ ] **Stripe Connect E2E im Testmodus finalisieren**
  - Dienstleister-Onboarding, Payment Intent, Webhook, Reconcile, Refund/Dispute-Pfad prüfen.
  - Keine echte Buchung ohne aktives Auszahlungskonto des Dienstleisters.

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

### PR #46 — Release-Paket (2026-06-09, Branch claude/amazing-fermat-A0a7e)
- [x] **Bugfix Listing→falscher Account**: Feed/Suche fielen auf `l.id` (Offset-ID) statt `providerId` zurück.
- [x] **Admin-Bildmoderation**: Tab „Inserate & Bilder", Einzelbild-Löschung mit Begründung, Chat-Nachricht (`msg_type='moderation'`) + E-Mail an Besitzer. Endpoints: `GET /admin/listings`, `POST /admin/listings/{id}/delete-image`, `POST /admin/notify-user`.
- [x] **Security**: msg_type-Whitelist in `eb_messages_send` (Moderation-Impersonation verhindert).
- [x] **Stage-Hardening**: Server-Whitelist + Anti-Downgrade in `eventboerse_handle_board_save`; Client-Sperre für Rückwärts-Drag bezahlter Karten.
- [x] **Stripe Checkout**: +8 Methoden (SEPA, Klarna, Sofort, Giropay, Bancontact, EPS, P24, Link), locale=de.
- [x] **Stripe Refunds + Disputes** vollständig: Webhook-Handler für `charge.refunded`, `refund.created/updated`, `charge.dispute.created/updated/closed`. Karten werden automatisch zurückgesetzt (paymentStatus=Erstattet, stage=kontaktiert), Disputes per wp_mail an admin_email. `/stripe/reconcile` liefert jetzt zusätzlich `refunds[]`.
- [x] **Stripe-Fehlermeldungen** in Klartext: `_humanizeStripeError` mappt card_declined, insufficient_funds, do_not_honor, authentication_required u.v.m. auf deutsche Texte mit nächstem Schritt. PaymentIntent-Status-Mapping für 3-D Secure, processing usw.
- [x] **Web Push (PWA)**: VAPID-Keypair lazy via openssl, vollständige RFC-8291-Implementation (ECDH+HKDF+aes128gcm) ohne Composer. Endpoints `/push/vapid-public-key`, `/push/subscribe`, `/push/unsubscribe`, `/push/test`. Service Worker mit `push` + `notificationclick`-Handler. Trigger bei neuer Nachricht. Settings-UI mit Aktivieren/Deaktivieren-Toggle.
- [x] **App-Store-konforme Zahlung (Apple 3.1.1)**: Im App-Modus (`_ebIsAppContext()`: standalone/TWA/iOS) wird JEDE Zahlung in den externen Browser ausgelagert (Stripe Hosted Checkout via „Im Browser bezahlen"-Button). Rückmeldung via Webhook + `/stripe/reconcile`-Polling. Sofortbuchungen legen vorab eine Pending-Karte an (Stage angebot, stripePending), die der Reconcile auf bestaetigt befördert.
- [x] **Hosted-Checkout-Routing-Bug behoben (kritisch)**: `eb_stripe_create_checkout` hatte kein Stripe-Connect-Routing — Geld wäre zu 100% auf dem Plattformkonto gelandet. Jetzt Destination Charge + Application Fee + Schutzregeln (Inserat-Pflicht, Selbstbuchungs-Sperre, Onboarding-Pflicht) identisch zum PaymentIntent-Pfad. Metadata wird via payment_intent_data auf den PI kopiert (Webhook liest dort).
- [x] **PWA repariert**: manifest.json + mobile-overrides.css waren in Markdown-Fences (unparsebar); Service Worker wurde nie registriert → jetzt aktiv (network-first Shell, Offline-Page, Auto-Reload). `.htaccess` Cache-Falle (immutable auf app.js) behoben.
- [x] **App-Store-Vorbereitung**: `.well-known/assetlinks.json` + `apple-app-site-association` (Templates, via WP-Hook am Domain-Root serviert), Manifest mit `id`/`display_override`, Install-Prompt, Web-Share auf Detail-Seite, Runbook `docs/app-store-release.md`.
- [x] **SEO**: JSON-LD Service-Schema pro Inserat (provider als LocalBusiness, aggregateRating, areaServed, offers).
- [x] **Offline-Indicator**: globaler Top-Banner via `navigator.onLine`, „Wieder online"-Toast beim Wiedereinstieg.
- [x] **Performance**: Bilder mit `loading="lazy"` + `decoding="async"` auf Avataren, Galerie, Chat-Liste; Hero-Bild mit `fetchpriority="high"`.
- [x] **UX**: QA-Roboter kleiner, dynamische Tab-Titel + OG-Tags, Chat-Skeleton, Chat-Poll pausiert im Hintergrund, Direktbuchung→Einzelbuchung.

### Davor
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
*Zuletzt aktualisiert: 2026-06-09*

## Verknüpfte Notizen
- [[Roadmap/Feature-Ideen]] — Ideen-Sammlung
- [[Roadmap/Bekannte-Bugs]] — Offene Bugs
- [[AI-Gedaechtnis/Claude-Kontext]] — Prioritätsliste P0/P1
