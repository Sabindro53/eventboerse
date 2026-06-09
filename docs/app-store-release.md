# Eventbörse — App-Store-Release-Runbook

Stand: 2026-06-09 · Die Web-App ist PWA-fertig (Manifest, Service Worker,
Offline-Fallback, Installierbarkeit). Beide Stores werden über
**PWABuilder** (https://www.pwabuilder.com) bedient — kein eigener
Native-Code nötig.

## Voraussetzungen (bereits erledigt im Code)

- [x] `manifest.json` mit `id: de.eventboerse.app`, maskable Icons,
      Screenshots, Shortcuts, `display: standalone`
- [x] Service Worker registriert (network-first für Shell, Offline-Page)
- [x] `/.well-known/assetlinks.json` (Android) — wird von WordPress am
      Domain-Root ausgeliefert (`functions.php`, parse_request-Hook)
- [x] `/.well-known/apple-app-site-association` (iOS) — ebenso
- [x] HTTPS erzwungen, Security-Header gesetzt

## Schritt 1 — Google Play (TWA, ~1–2 Tage)

1. **PWABuilder**: https://www.pwabuilder.com → URL `https://xn--eventbrse-57a.de`
   eingeben → "Package for Stores" → **Android**.
   - Package ID: `de.eventboerse.app`
   - App name: `Eventbörse`
   - Signing: "Create new" (PWABuilder generiert den Keystore — **sicher
     ablegen**, z. B. im Passwort-Manager; ohne ihn keine Updates!)
2. **Play Console** (https://play.google.com/console, 25 USD einmalig):
   - Neue App anlegen (Deutsch, App oder Spiel: App, kostenlos)
   - `app-release-signed.aab` hochladen (interner Test-Track zuerst)
   - **Signing-Key-Fingerprint kopieren**: Play Console → Setup →
     App-Signing → SHA-256-Fingerprint
3. **assetlinks.json aktualisieren**: Den SHA-256-Fingerprint aus der Play
   Console in `.well-known/assetlinks.json` eintragen
   (`REPLACE_WITH_PLAY_CONSOLE_SHA256_FINGERPRINT` ersetzen) und auf
   `main` pushen → Auto-Deploy. **Wichtig:** Ohne korrekten Fingerprint
   zeigt die App eine Browser-Leiste (kein Fullscreen).
   - Prüfen: https://developers.google.com/digital-asset-links/tools/generator
4. Store-Listing: Screenshots (PWA-Screenshots aus manifest.json
   wiederverwendbar), Beschreibung, Datenschutz-URL
   (`https://xn--eventbrse-57a.de/datenschutz`).
5. Interner Test → geschlossener Test (min. 12 Tester, 14 Tage — Google-
   Pflicht für neue Konten) → Produktion.

## Schritt 2 — Apple App Store (~1 Woche inkl. Review)

1. **Apple Developer Program** (99 USD/Jahr): https://developer.apple.com
   — Team-ID notieren.
2. **apple-app-site-association aktualisieren**: `REPLACE_TEAMID` durch
   die echte Team-ID ersetzen (Format: `TEAMID.de.eventboerse.app`),
   auf `main` pushen.
3. **PWABuilder → iOS**: generiert ein Xcode-Projekt (Swift-Wrapper um
   WKWebView mit App-Store-konformen Features).
   - Bundle ID: `de.eventboerse.app`
   - Benötigt einen Mac mit Xcode (oder Cloud-Mac, z. B. MacStadium).
4. In Xcode: Team auswählen, Archive → App Store Connect hochladen.
5. **App Store Connect**: App anlegen, Screenshots (6,7" + 5,5" Pflicht),
   Beschreibung, Keywords, Support-URL, Datenschutz-Angaben
   (App Privacy: Account-Daten, Nachrichten, Zahlungsinfos via Stripe).
6. Review einreichen. **Achtung Apple-Guideline 4.2** (Minimum
   Functionality): Die App muss sich "app-artig" anfühlen — gegeben durch
   Planungs-Board, Chat, Push-fähige Buchungen, QA-Bot. Im Review-Feld
   explizit auf diese Features hinweisen.

## Schritt 3 — Nach dem Release

- **Updates**: Web-Deploys (Push auf `main`) aktualisieren die App-Inhalte
  sofort — Store-Updates nur nötig, wenn sich Manifest/Wrapper ändern.
- **Stripe**: Da Zahlungen für physische Dienstleistungen (Events) sind,
  greift Apple In-App-Purchase **nicht** (Guideline 3.1.3(e) — physische
  Güter/Services dürfen externe Payment nutzen). Stripe Checkout im
  WebView ist konform.
- **Push-Notifications** (optional, nächster Ausbau): Web Push via VAPID
  funktioniert in TWA (Android) nativ; iOS ab 16.4 für installierte PWAs.
  Server-Seite braucht: VAPID-Keys, Subscription-Endpoint, Trigger bei
  neuer Nachricht/Buchung.

## Checkliste vor jedem Store-Submit

- [ ] `https://xn--eventbrse-57a.de/.well-known/assetlinks.json` erreichbar (200, application/json)
- [ ] `https://xn--eventbrse-57a.de/.well-known/apple-app-site-association` erreichbar (200, application/json)
- [ ] `https://xn--eventbrse-57a.de/manifest.json` valide (Chrome DevTools → Application → Manifest, keine Warnungen)
- [ ] Lighthouse PWA-Audit ≥ 90 (Chrome DevTools → Lighthouse)
- [ ] Login, Buchung, Chat, Board auf echtem Android- + iOS-Gerät getestet
- [ ] Offline-Fallback zeigt die Offline-Seite (Flugmodus-Test)
