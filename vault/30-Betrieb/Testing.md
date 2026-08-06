---
tags: [layer/L3, domain/betrieb, share/internal]
layer: L3
domain: betrieb
share: internal
---

# Testing

> Seit 2026-08-01 gibt es eine **automatisierte E2E-Suite** (Playwright, 163 Tests
> in 11 Suiten) als blockierendes Gate in `pr-check.yml`. Vorher: 0 Tests — die
> letzten Produktionsfehler (Verlaufsschrift nach Minify, Suche ohne Treffer,
> doppelte CSS-Regeln) waren alle Regressionen, die diese Suite gefangen hätte.
> Manueller Smoke-Test bleibt für Backend-Flows (Login, Stripe live).

## Pyramide

```
       ┌─────────────┐
       │ Manual E2E  │   ← Backend-Flows bei Release (Login, Stripe live)
       └──────┬──────┘
       ┌──────┴───────┐
       │  Playwright  │   ← 163 Tests, blockierend in pr-check.yml (NEU 2026-08)
       └──────┬───────┘
       ┌──────┴───────────────┐
       │ Auto-Audit (KI)      │   ← claude-auto-audit.yml
       └──────────────────────┘
```

Keine Unit-Tests aktuell — Codebase ist hauptsächlich UI-Glue + REST-Wrapper, hoher Mock-Overhead vs. Mehrwert.

## Automatisierte E2E-Suite (tests/e2e/, NEU 2026-08-01)

| Suite | Prüft | Hintergrund |
|-------|-------|-------------|
| `smoke.spec.js` | 15 öffentliche SPA-Routen + Detail/Provider + Login-Umleitung + Historie, 0 Page-Errors | Verschwundene Listings / kaputte Routen |
| `suche.spec.js` | Natürliche Sätze liefern Treffer, Unsinn 0; Suchbegriffe verlassen den Browser nicht | Regression 8eb5b2b + Lokalitäts-Leitplanke |
| `gebuehren.spec.js` | Brutto = Provision + Stripe + Auszahlung centgenau; **JS↔PHP-Parität** (PHP-Funktionen aus functions.php extrahiert, php-CLI) | Geld-Code nur mit Tests |
| `wissensbasis.spec.js` | Fachfragen beantwortet, Off-Topic abgelehnt, **0 Leckage** (nur 10-Produkt, Verbotsmuster-Scan) | Fand real die Webhook-Signatur-Leckage |
| `css-minify.spec.js` | Gegen **minifiziertes** CSS (csso-cli\@4.0.2 --no-restructure wie Deploy): Verlaufsschrift statisch + computed styles | Regression ae3f624 |
| `design-system.spec.js` | Chips sichtbar; Konflikt-Ratsche (max. 56 Alt-Konflikte); Token-Eindeutigkeit | Klassenkollision .ai-suggestions |
| `barrierefreiheit.spec.js` | axe-core WCAG AA, **beide Farbmodi** × 4 Seiten; Fokus; Dot-Labels | Stand 0 Verstöße halten (vorher 97 Nodes) |
| `verbindungen.spec.js` | **HQ-Zugang** (keine Schlüssel im HTML, serverseitige `manage_options`-Prüfung, Theme-Pfad gesperrt, noindex) + **Connector-Katalog** (kein Zustand, alle 15 Fähigkeiten deklariert, Copilot-Kontingent ehrlich, keine Geheimnisse) + **Oberfläche** (ohne API-Antwort darf nichts „verbunden" zeigen) + **CSP** (`csp-hq.php` rechnet den Header in PHP durch — die JS-Tests blockieren GitHub selbst und sehen einen CSP-Verstoß als dasselbe Bild) | Das HQ war faktisch offen; ein Katalog mit Status wäre eine Lüge in Dateiform |
| `kern.spec.js` | **Impuls-Ehrlichkeit** (nach dem Ereignis ist die Bahn leer, keine `infinite`-Animation) + **Autonomie** (jede Grenze begründet, Finance löst nie aus) + **Ensemble** (nur offene Gewichte, Rollen eindeutig) + Tastaturzugang | Eine Dauer-Animation zeigt Arbeit, die nicht stattfindet |
| `ki-abwehr.spec.js` | **Fremdtext am Modell** (Kontext nur eingezäunt, Zaunmarke pro Lauf zufällig, Regel in der Systemnachricht, Injektionsfunde gezählt statt zitiert, Geheimnisse brechen weiter ab) + **KI-Sammler** (jeder Pflicht-Sammler ausgeschlossen, Googlebot/Bingbot ausdrücklich NICHT, Referenzdatei ohne Drift, kein `/hq` in robots.txt) | Der Code-Prüfer liest PR-Diffs — einen PR darf jeder öffnen. Die Verbotsmuster existierten längst, wurden aber nur im Quarantäne-Tor angewandt |
| `zufluss.spec.js` | **Quarantäne-Tor** (5 Regeln einzeln, Injection innen erlaubt/außen verboten, Geheimnis-Import verweigert) + **Demo-Feed** (nichts wirkt frisch, reproduzierbar, Event-Vielfalt, gerenderte Zeitangaben) | Externer Zufluss ist die einzige Stelle, an der ungeprüfter Text ins System kommt |

```bash
npm test               # alles — Server startet automatisch (playwright.config.js)
npm run test:smoke     # nur Smoke
npm run test:css       # nur CSS-Minify-Regression
```

Audit-Werkzeuge in `tests/audit/`: `xss-scan.js` (ungeescapte innerHTML-
Interpolationen), `css-duplicates.js` (still überschreibende Regeln).

## Smoke-Test (vor jedem Release)

Manuell durchklicken, ~15 Minuten:

```
[ ] Startseite lädt < 2 s, kein Layout-Shift
[ ] Login als Test-Provider funktioniert
[ ] Login als Test-Planer funktioniert
[ ] WebAuthn/Passkey-Login (mind. 1 Browser)
[ ] 2FA mit TOTP (Test-Account mit aktiviertem 2FA)
[ ] Listing-Suche: Kategorie + PLZ liefert Ergebnisse
[ ] Listing-Detail: Bilder, CTA, Reviews sichtbar
[ ] Chat: neue Konversation öffnen, Nachricht senden
[ ] Chat: XSS-Test "<img src=x onerror=alert(1)>" → escaped
[ ] Listing erstellen (mind. 1 Bild hochladen → kommt in Uploads an)
[ ] Stripe Test-Buchung (Karte 4242…) → Success-Page
[ ] Stripe Connect: Dienstleister-Auszahlungskonto Status/Onboarding/Diagnose prüfen
[ ] Stripe Webhook in Stripe-Dashboard sichtbar, Status=processed
[ ] Board: eigenes Inserat kann nicht gebucht/bezahlt werden
[ ] Board: Paket mit mehreren Positionen speichern, reloaden, erneut öffnen
[ ] QA-Bot: Launcher rechts über Bottom-Nav, Panel öffnet, Login/Board/Zahlung-Aktion navigiert korrekt
[ ] Admin-Panel: Userliste, Diagnostik, Logs
[ ] Logout funktioniert, Session beendet
[ ] Mobile: Burger-Menü, Bottom-Nav, Forms scrollen
[ ] Console: keine Errors / CSP-Violations
```

## PR-Checks (`pr-check.yml`)

- **Job tests (blockierend):** npm ci → `./build-app-js.sh --check` (Modul-Drift) → Playwright-Browser → `build-knowledge.mjs --check` → `npx playwright test`; Report-Artefakt bei Fehlern
- Geänderte Dateien via API auflisten
- PHP-Syntaxcheck via `php -l` für alle geänderten `.php`

## Aktueller Release-Check 2026-06-06

Pflicht nach sichtbaren UI-Änderungen:

```bash
php -l index.php
node --check app.js
git diff --check
curl -sL -H 'Cache-Control: no-cache' 'https://xn--eventbrse-57a.de/?check=1' | rg 'styles.css\\?v=2\\.5\\.1|qaLauncher'
```

Zusätzlich im Browser prüfen:
- QA-Bot ist transparentes Roboter/Headset/Partyhut-Icon, kein Card-/Status-Dot-Artefakt.
- Cookie-Banner und Bottom-Nav überdecken den QA-Bot nicht.
- Start-/Loader-Popper erscheint nicht doppelt.

## Auto-Audit (`claude-auto-audit.yml`)

- KI-basierter Review bei jedem Push
- Sucht nach: hardcoded Secrets, fehlende Nonce-Checks, `eval`, `exec`, unsicherer SQL-Konstruktion
- Findings werden als PR-Kommentar gepostet

## Manuelle Sicherheitstests

Quartalweise oder vor Major-Release:

| Test | Werkzeug | Ziel |
|---|---|---|
| HTTP-Header-Audit | securityheaders.com | A+ Grade |
| TLS-Audit | ssllabs.com | A+ |
| CSP-Validation | csp-evaluator.withgoogle.com | keine `unsafe-eval` |
| Mobile Performance | Lighthouse | Performance ≥ 80 |
| Accessibility | axe DevTools | 0 critical |
| Upload-Pipeline | manueller PoC mit `.php.jpg` | wird abgewiesen |
| Rate-Limit | curl-Loop auf `/login` | nach N Requests 429 |

## Test-Daten / Test-Accounts

Werden lokal in einer separaten `wp_eb_test_users`-Doku verwaltet — **nicht im Vault, nicht im Repo** (DSGVO).

## Browser-Matrix

Mindest-Test pro Release: aktuelles Chrome **und** aktuelles Safari (iOS 15.4+ Real Device empfohlen).

## Verknüpft

- [[30-Betrieb/Operations/Runbooks]]
- [[30-Betrieb/CI-CD/Deployment]]
- [[40-Governance/Security/2026-05-02-Security-Hardening]]
