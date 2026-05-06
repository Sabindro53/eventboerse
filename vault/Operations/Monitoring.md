# Operations: Monitoring

> Was prüft, ob die Plattform läuft, und was passiert bei Fehlern.

## Site-Heartbeat

**Workflow:** `.github/workflows/site-monitor.yml`
**Intervall:** alle 30 min via Cron (GitHub-hosted)

```text
HTTPS GET https://{{DOMAIN}}/
  └─ Status != 200 → GitHub Issue „⚠️ Site Down" anlegen
  └─ Status   200 → existierendes Down-Issue automatisch schließen
```

Vorteil: kein Drittanbieter-Monitoring, GitHub-Notifications via E-Mail/App.

## REST-Heartbeat

**Endpoint:** `GET /wp-json/eventboerse/v1/heartbeat`
**Antwort:** `{ status: "ok", timestamp: 1234567890 }`

Frontend pingt alle 60 s. Bei 3 aufeinanderfolgenden Fehlern → Maintenance-Banner blenden, Form-Submits blockieren, Toast „Verbindung verloren".

## DB-Maintenance-Fallback

`db-error.php` im Theme-Root **und** `wp-content/db-error.php`. WordPress lädt diese Datei automatisch bei DB-Connection-Fail:

- HTTP 503
- Eigene Wartungsseite (Brand-Gradient, „Wartungsarbeiten"-Text, Mailto)
- Kein Stack-Trace, keine Pfade, keine SQL-Fehler im Frontend
- Dark-Mode-Variante

## Logging

| Quelle | Wo | Aufbewahrung |
|---|---|---|
| WordPress `error_log` | Hosting-Provider FS, `wp-content/debug.log` falls `WP_DEBUG_LOG` | 30 Tage manuell |
| Stripe-Webhook-Events | Stripe-Dashboard | 30 Tage |
| GitHub-Actions-Logs | GitHub | 90 Tage |
| Audit-Logger (geplant) | eigene Tabelle `wp_eb_audit` | 1 Jahr |

## Fehler-Sichtbarkeit für User

- 4xx → freundlicher Fehlertext + Toast
- 5xx → Maintenance-Banner + Mail-Kontakt
- DB-Down → `db-error.php` (siehe oben)
- 503 von Stripe → Retry mit exponential backoff client-seitig

## Backup-Strategie

| Art | Frequenz | Aufbewahrung | Wer |
|---|---|---|---|
| DB-Snapshot | täglich | 7 Tage | Hosting-Provider |
| Vollbackup | wöchentlich | 4 Wochen | Hosting-Provider |
| Code | Git-Repo | unendlich | GitHub |
| Stripe | (Zahlungen) | unbegrenzt | Stripe |

Manuelle Restore-Tests vierteljährlich empfohlen.

## Incident-Response (Skizze)

1. **Erkennen** — Site-Monitor-Issue oder User-Mail
2. **Triage** — Hosting-Provider-Status-Page checken, eigenes Logfile
3. **Kommunikation** — Status auf Plattform anzeigen via Maintenance-Banner
4. **Mitigieren** — Restore aus Backup falls DB-Korruption, sonst Code-Rollback via Git
5. **Post-Mortem** — Markdown-Notiz in `vault/Operations/Incidents/YYYY-MM-DD-...md`
6. **DSGVO Art. 33** — bei Datenpanne 72-Std-Frist an Aufsichtsbehörde

Siehe [[CI-CD/Deployment]], [[Security/Cache-Strategy]].
