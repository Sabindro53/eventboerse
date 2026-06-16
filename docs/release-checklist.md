# Eventbörse.de — Release-Checkliste

Stand: 2026-06-16 · PR #46 (claude/amazing-fermat-A0a7e)

Diese Liste arbeitest du **einmal** vor dem Live-Schalten von eventbörse.de durch. Reihenfolge ist wichtig — jeder Punkt baut auf dem vorherigen auf.

## 1. Code-Stand verifizieren

- [ ] PR #46 ist auf `main` gemergt
- [ ] GitHub Action `ionos-deploy.yml` ist grün durchgelaufen (Deploy ins Theme-Verzeichnis via SFTP)
- [ ] `https://xn--eventbrse-57a.de/wp-content/themes/eventboerse/styles.css?v=177` lädt mit `200 OK`
- [ ] `https://xn--eventbrse-57a.de/wp-content/themes/eventboerse/app.js?v=178` lädt mit `200 OK`

## 2. WordPress

- [ ] WP-Admin → **Einstellungen → Permalinks → speichern** (löst Rewrite-Rules neu, SPA-Routen `/board/<id>` funktionieren)
- [ ] WP-Admin Frontend einmal aufrufen → in der Konsole sollte `eb_db_version` als `'2.1'` gesetzt sein (über `?eb_diag=1` oder per `get_option`)
- [ ] DB-Spalte `wp_eb_listings.unavailable_dates` existiert (dbDelta migriert automatisch)
- [ ] `.well-known/assetlinks.json` und `apple-app-site-association` am Domain-Root erreichbar (für Android-TWA bzw. iOS Universal Links)

## 3. Stripe — Live-Mode

- [ ] In Stripe Dashboard → **Developers → API Keys** den **Live-Secret-Key** kopieren
- [ ] In WP-Admin → **Eventbörse → Stripe-Settings** den Live-Key eintragen, `EB_STRIPE_LIVE=1` setzen
- [ ] In Stripe Dashboard → **Developers → Webhooks** den Endpoint registrieren:
   - URL: `https://xn--eventbrse-57a.de/wp-json/eventboerse/v1/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `checkout.session.completed`, `charge.refunded`, `refund.created`, `refund.updated`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `account.updated`, `transfer.created`
   - Webhook-Secret kopieren und in WP-Admin als `EB_STRIPE_WEBHOOK_SECRET` eintragen
- [ ] In Stripe Dashboard → **Connect-Settings** → Brand-Logo & Statement-Descriptor `EVENTBOERSE.DE` setzen
- [ ] Plattform-Provision steht aktuell auf **3 %** (siehe `EB_PLATFORM_FEE_RATE` in `functions.php`). Ändern? Konstante setzen, dann neu deployen.

## 4. Smoke-Test (Live, mit Test-Karte 4242 4242 4242 4242)

- [ ] Anmelden als Test-Dienstleister → Stripe Connect Onboarding durchlaufen (Test-Modus reicht für ersten Roundtrip)
- [ ] Inserat erstellen → Preis 50 € eintippen → Live-Fee-Vorschau sagt „Du bekommst 48,50 €"
- [ ] Wochentage aktivieren + Blackout-Termin hinzufügen → Sofortbuchung-Toggle an → Inserat veröffentlichen
- [ ] Anderen Test-User anmelden → Inserat öffnen → Sofortbuchungs-Formular zeigt Datepicker + Pflichtfelder Uhrzeit/Ort
- [ ] Geblockten Tag wählen → Toast „Dieser Tag ist nicht verfügbar"
- [ ] Validen Tag + Uhrzeit + Ort + Gäste eingeben → optional B2B-Toggle an, Firma + Rechnungsadresse → „Buchen"
- [ ] Stripe-Modal: Test-Karte 4242 durchziehen
- [ ] Käufer-Board: Karte „Bezahlt" mit voller Notiz erscheint
- [ ] Dienstleister-Auftragsboard: Buchung mit strukturierten Details (Beginn/Gäste/Ort/Wunsch) + B2B-Rechnungsblock erscheint
- [ ] Push-Notification an Käufer „Buchung bestätigt" und an Dienstleister „Neue Buchung" angekommen (falls Push aktiviert)

## 5. Mobile / PWA

- [ ] Auf iPhone Safari: eventbörse.de öffnen → **Teilen → Zum Home-Bildschirm** → App startet im Standalone-Modus
- [ ] App-Modus erkannt: Im Buchungs-Flow erscheint statt eingebettetem Payment Element die externe-Browser-Karte (Apple Guideline 3.1.1)
- [ ] Klick auf „Im Browser bezahlen" öffnet Stripe Hosted Checkout im echten Safari (App im Hintergrund)
- [ ] Nach Bezahlung App in Vordergrund holen → `/stripe/reconcile` markiert die Karte als bezahlt
- [ ] Auf Android: Chrome → **Menü → App installieren** → Add to Home Screen → identisches Verhalten

## 6. SEO / Meta

- [ ] `https://xn--eventbrse-57a.de/manifest.json` ist valides JSON (keine Markdown-Fence)
- [ ] Inserat-Detail-Seite hat `<script type="application/ld+json">` mit Service-Schema
- [ ] `og:title`, `og:description`, `og:image` ändern sich beim Wechsel zwischen Inseraten
- [ ] Lighthouse-Audit (DevTools → Lighthouse): PWA-Score ≥ 90, Accessibility ≥ 90, Best Practices ≥ 95

## 7. Admin-Routinen

- [ ] Admin-Bereich öffnen → Tab „Inserate & Bilder" zeigt alle DB-Inserate mit Lösch-Knöpfen
- [ ] Im Browse-Grid: roter Flag-Button auf fremdem DB-Inserat → Modal → Bild löschen → Besitzer bekommt Chat + E-Mail
- [ ] Admin-Toggle „Testdaten ausblenden" funktioniert (Demo-Inserate verschwinden)
- [ ] „Test-Push an mich" funktioniert (Notification kommt an)

## 8. App-Stores (kann später, separater Pass)

- [ ] **Google Play (Android TWA)**: PWABuilder.com → Package generieren → Play Console → 25 $ Gebühr → Signing-Schlüssel-SHA-256-Fingerprint in `.well-known/assetlinks.json` eintragen → Push auf `main` deploy
- [ ] **Apple App Store**: Apple Developer Account (99 €/Jahr) → Team-ID in `.well-known/apple-app-site-association` eintragen → PWABuilder iOS-Wrapper → App Store Connect → Review-Wortlaut aus `docs/app-store-release.md` Punkt 5 verwenden

## 9. Backup vor Live-Schaltung

- [ ] IONOS DB-Backup: Mit dem IONOS-Plesk-Backup-Tool einen Snapshot der MySQL-Datenbank ziehen (vor erstem echten Geldfluss)
- [ ] Theme-Verzeichnis-Backup: `/wp-content/themes/eventboerse/` per FTP ziehen
- [ ] GitHub: `git tag v1.0-release` + push, dann auf `main` ein Branch-Protection-Rule setzen (nur PRs, keine Direct-Pushes)

## 10. Launch

- [ ] Live-Toggle: WP-Option `eb_launch_mode = 'live'` setzen (falls genutzt) oder einfach Marketing-Pages freischalten
- [ ] Stripe-Modus prüfen: Im Stripe-Dashboard oben rechts steht **„Live mode"** (nicht „Test mode")
- [ ] Twitter/LinkedIn/Instagram-Posts vorbereitet
- [ ] DSGVO/Impressum/AGB-Stand prüfen (Versionsdatum aktualisieren)

🎉 **Fertig. Launch.**
