# AI-Gedächtnis: Latest Stand (2026-06-06)

> Operativer Snapshot für Coding-Agents und Team. Diese Datei ist der aktuelle Einstieg für den realen Stand von Eventbörse nach den Listing-/Board-, Stripe- und QA-Bot-Stabilisierungen.

## Produktionsstand

- GitHub `main`: `3c1e752` (`QA-Bot Launcher: Status-Dot entfernt, alle UA-Button-Reste neutralisiert`).
- Live-Domain erreichbar: `https://xn--eventbrse-57a.de/` liefert `styles.css?v=2.5.1`.
- GitHub Actions:
  - `Deploy to IONOS` für `3c1e752`: erfolgreich.
  - `Site Monitor - Keep Alive`: erfolgreich am 2026-06-06.
- Stack bleibt: WordPress Theme + Vanilla JS SPA, kein Build-Schritt, SFTP-Deploy über GitHub Actions.

## Wichtigste Änderungen seit 2026-05-22

### 1) QA-Support-Bot ohne KI-Token
- Rechts über der Bottom-Navigation eingebaut.
- Regelbasierte Hilfe ohne Tokenverbrauch: Login, Board, Inserat, Zahlung/Stripe.
- Aktionen können Nutzer direkt in passende Bereiche navigieren.
- Launcher wurde mehrfach nachjustiert und ist aktuell transparent: Roboter/Support-Agent mit Partyhut, Headset, Mikro; keine Card, kein Status-Dot, keine Browser-UA-Button-Reste.

### 2) Start-/Loader-Optik bereinigt
- Celebration-Popper auf der Start-/AI-Hero-Fläche neu gezeichnet.
- Doppelbild im Loader entfernt: nur noch ein Popper-Emoji statt überlagerter Bilder.
- Brand-Farben bleiben Pink, Violett, Türkis; keine unnötige zusätzliche Bildlast.

### 3) Login/IDN-Fluss stabilisiert
- E-Mail-Login akzeptiert wieder internationale Domains wie `eventbörse.de`.
- Login-Form erkennt Eingaben sauberer und blockiert nicht mehr fälschlich wegen leerer E-Mail.

### 4) Board/Listings weiter geschützt
- Board Deep-Link `/board/<id>` unterstützt.
- Projekt-Karten können in neuem Tab geöffnet werden.
- Bestehender Schutz bleibt P0: keine Selbstbuchung, keine verschwundenen Listings, Demo-Sichtbarkeit konsistent halten.

### 5) Stripe Connect / Auszahlungspfad weiter ausgebaut
- Dienstleister sehen in Einstellungen das Stripe-Auszahlungskonto.
- Onboarding wird über Stripe Connect Express gestartet.
- Backend enthält Diagnose-/Onboarding-/Disconnect-/Status-Routen.
- Zahlungen nutzen Destination Charges mit Application Fee; Buchung wird blockiert, wenn Dienstleister-Auszahlungen noch nicht aktiv sind.

## Aktuelle Code-Zahlen

| Datei | Stand |
|---|---:|
| `app.js` | 20.769 Zeilen / 918 KB |
| `functions.php` | 6.741 Zeilen / 296 KB |
| `styles.css` | 14.716 Zeilen / 421 KB |
| `index.php` | 3.934 Zeilen / 251 KB |
| `index.html` | 3.537 Zeilen / 227 KB |

## Relevante Code-Anker

- QA-Bot:
  - `index.php`: `#qaBot`, `#qaPanel`, `#qaLauncher`
  - `styles.css`: `.eb-qa-*`
  - `app.js`: `QA_TOPICS`, `toggleQaBot`, `handleQaAsk`, `runQaAction`
- Stripe Connect:
  - `index.php`: Einstellungen → Auszahlungs-Konto
  - `app.js`: `loadStripeConnectStatus`, `connectStripeAccount`, `runStripeConnectDiagnostics`
  - `functions.php`: `eb_stripe_connect_onboard`, `eb_stripe_connect_status`, `eb_stripe_connect_diagnostics`
- Board:
  - `app.js`: `renderBoardPage`, `openBoardProject`, `openAddProviderModal`, `_addProviderCard`
  - `functions.php`: `eventboerse_handle_board_get/save`, `eb_board_bookings_get`, `eb_board_bookings_update_card`

## Guardrails für KI-Mitarbeiter

1. Keine Änderung an Listings/Board ohne Smoke-Check:
   - Home/Browse/Map/Board laden Listings.
   - Demo-Visibility ist konsistent.
   - Eigene Inserate können nicht gebucht oder bezahlt werden.
2. Keine Stripe-Änderung ohne sicheren Fallback:
   - Public/Secret Key müssen im selben Modus sein.
   - Connect-Onboarding darf Bankdaten nie im Eventbörse-Frontend speichern.
   - Webhook/Return/Reconcile müssen idempotent bleiben.
3. Kein UI-Deploy ohne Cache-Buster:
   - `index.php` `$asset_ver` erhöhen, wenn `styles.css`, `app.js` oder sichtbares Markup geändert wurde.
4. Keine KI-Automation darf Code ersetzen, wenn Guardrails fehlschlagen:
   - Markdown-Codefences in generierten Dateien blockieren.
   - Zu kleine oder zu große Datei-Ersetzungen blockieren.
   - Bei Provider-Tokenlimit Arbeitsschritt persistent notieren und mit anderem Provider fortsetzen.
5. Lokale Knowledge-Dateien bleiben lokal:
   - `ki-knowledge.json` und `Attached Element Context*` nicht committen/deployen.

## Offene nächste Schritte

- Board-Regressionstest für Paket-Reload, Selbstbuchungsblock, Demo-Visibility.
- Stripe Connect E2E im Testmodus: Provider-Onboarding, Payment Intent, Webhook, Reconcile, Refund-Pfad.
- QA-Bot Wissensmuster erweitern: echte Weiterleitungen statt generischer Antworten, aber weiterhin tokenfrei.
- KI-Office Guardrails in Repo/Vault mit festen Akzeptanzkriterien verknüpfen.

---
*Erstellt: 2026-06-06*
