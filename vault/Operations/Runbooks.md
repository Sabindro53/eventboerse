---
tags: [operations, runbook]
---

# Operations: Runbooks

> Häufige Wartungsaufgaben Schritt für Schritt. Ergänzt [[Operations/Monitoring]] und [[Operations/Incident-Response]].

## Cache leeren (alle Ebenen)

Reihenfolge: innen nach außen.

```bash
# 1. WordPress Object-Cache (Transients)
wp transient delete --all   # via wp-cli falls vorhanden
# Alternativ in admin/Diagnostik: Button "Caches leeren"

# 2. Theme-internes Page-Cache (anonymous + logged-in)
# admin/Diagnostik → "Page-Cache leeren"

# 3. Browser Hard-Reload (Tester)
# DevTools offen → Cmd-Shift-R
```

Cache-Buster `?v=` für `app.js`/`styles.css` in `index.php` inkrementieren, falls JS/CSS-Update.

## Cache-Buster erhöhen

1. In `index.php`: `$asset_ver = '2.5.1';` erhöhen.
2. Betrifft `styles.css` und `ui-enhancements.css`; bei sichtbaren UI-Änderungen immer erhöhen.
3. Commit mit Message `chore: bump asset cache to vNNN`
4. Push → Auto-Deploy
5. Live prüfen:

```bash
curl -sL -H 'Cache-Control: no-cache' 'https://xn--eventbrse-57a.de/?check=1' | rg 'styles.css\\?v='
```

## SMTP testen

```bash
# REST-Heartbeat-Endpoint (auth: Admin)
curl -X POST "https://{{DOMAIN}}/wp-json/eventboerse/v1/admin/smtp-test" \
  -H "X-WP-Nonce: $NONCE" \
  -d '{"to":"alerts@…"}'
```

Oder: admin/Diagnostik → „Test-Mail senden" → Mail-Header in Empfänger prüfen (`Received-SPF`, `Authentication-Results`).

## User-Passwort zurücksetzen (Admin-Pfad)

1. WP-Admin → Users → Ziel-User
2. „Send Reset Link" (per WP-Core)
3. **Alternativ**: REST `POST /admin/users/{id}/reset-password` (sendet via Theme-SMTP statt WP-Default)
4. Audit-Log-Eintrag prüfen in admin/Diagnostik → Logs

## User sperren / entsperren

```
admin/Users → Account → "Sperren" Button
  ↓
usermeta.eb_locked = '1' + eb_lock_reason = '...'
  ↓
Login wird mit "Account gesperrt" abgewiesen
```

Begründung **immer** dokumentieren (DSGVO-Auskunftsrecht).

## Stripe-Webhook-Replay

Wenn Webhooks fehlschlagen (siehe [[Operations/Incident-Response#Stripe-Webhook-Recovery]]):
1. Stripe-Dashboard → Developers → Webhooks → Endpoint
2. „Logs" Tab → fehlgeschlagene Events markieren
3. „Resend" — idempotenz-sicher

## Stripe Connect Onboarding prüfen

Wenn Dienstleister nicht zum Stripe-Onboarding weitergeleitet werden:

1. Einstellungen → Auszahlungs-Konto → „Stripe-Konfiguration prüfen".
2. REST-Diagnose prüfen: `GET /wp-json/eventboerse/v1/stripe/connect/diagnostics` (auth erforderlich).
3. Sicherstellen:
   - `EB_STRIPE_MODE` passt zu Public/Secret/Webhook Keys.
   - Secret Key gehört zum Plattformkonto, nicht zu einem Connected Account.
   - Restricted Key hat Connect-/Account-Link-/Connected-Account-Rechte.
   - Stripe Connect ist im Plattformkonto aktiviert.
4. Danach `POST /stripe/connect/onboard` erneut starten.
5. Eventbörse speichert keine IBAN; Bankdaten müssen im Stripe Express Flow landen.

## Theme-Update deployen (manueller Force-Push)

Nur im Notfall, sonst Auto-Deploy via `git push main`.

```bash
git tag -a hotfix-YYYY-MM-DD -m "manueller Hotfix: <Beschreibung>"
git push origin main hotfix-YYYY-MM-DD
# In GitHub Actions: Workflow „Deploy to IONOS" → Run workflow
```

## Stack-Update (PHP / WP-Core)

1. Backup: Hosting-Provider-Konsole → DB- + File-Backup ziehen
2. Staging-Klon erstellen, Update dort installieren
3. Smoke-Test-Script: [[Testing#smoke]]
4. Bei OK: Live-Update im Wartungsfenster
5. Cache vollständig leeren
6. Cache-Buster erhöhen

## DSGVO-Auskunft (Art. 15)

User-Antrag eingegangen → max 30 Tage Frist.

```
1. Identität verifizieren (E-Mail Double-Confirm)
2. REST POST /admin/users/{id}/dsgvo-export
   → ZIP mit JSON: profile, listings, messages, reviews, bookings, audit-log
3. Mail mit Download-Link (7 Tage TTL, signed URL)
4. Vorgang in admin/Diagnostik → Logs
```

Endpoint ist **noch zu implementieren** (siehe [[Roadmap/Feature-Ideen]]).

## DSGVO-Löschung (Art. 17)

```
1. Identität verifizieren
2. Pending-Bookings auf "cancelled" setzen, Refund anstoßen
3. REST POST /admin/users/{id}/anonymize
   → user_email → "geloescht-<id>@anonym.local"
   → display_name → "Geloeschter Nutzer"
   → alle Listings → Owner: System-User, "(historisch)"-Suffix
   → Reviews bleiben, aber Author wird anonymisiert
4. Stripe-Customer löschen (`customers.delete`)
5. Backup-Frist beachten: 30 Tage rolling, dann endgültig weg
```

## Robots & Sitemap regenerieren

`sitemap.xml` und `robots.txt` sind statisch im Theme. Nach Routing-Änderungen:
1. Neue Routen in `sitemap.xml` ergänzen
2. `lastmod` auf heute setzen
3. Commit + Deploy

Siehe [[Operations/Monitoring]] für Heartbeat-Details.
