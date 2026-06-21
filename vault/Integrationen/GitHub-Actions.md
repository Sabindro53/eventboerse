# Integration: GitHub Actions

**Typ:** CI/CD Pipeline | **Status:** Aktiv

## Workflows

### ionos-deploy.yml — Deployment
**Trigger:** Push auf `main` oder manuell

```
git push main
       ↓
checkout → lftp SFTP → mirror to IONOS
/public/wp-content/themes/eventboerse/
       ↓
(optional) SMTP-Secrets in wp-config.php schreiben
```

**Ausgeschlossen:** `.git`, `.github`, `README.md`, `node_modules`

### site-monitor.yml — Uptime-Monitoring
**Trigger:** Alle 30 Minuten (cron: `*/30 * * * *`)

```
HTTPS-Request → eventbörse.de
✅ OK → offenes "site-down" Issue schließen
⚠️ nur HTTP → HTTPS-Problem melden
🚨 nicht erreichbar → neues GitHub Issue erstellen
```

### pr-check.yml — Pull Request Validierung
**Trigger:** Pull Request auf `main`

## GitHub Secrets

| Secret | Verwendung |
|--------|-----------|
| `IONOS_FTP_SERVER` | SFTP-Host |
| `IONOS_FTP_USERNAME` | SFTP-User |
| `IONOS_FTP_PASSWORD` | SFTP-Passwort |
| `IONOS_FTP_REMOTE_DIR` | Zielpfad |
| `EB_SMTP_USER` | SMTP-E-Mail |
| `EB_SMTP_PASS` | SMTP-Passwort |

## Verknüpfte Notizen
- [[CI-CD/Deployment]] — Deployment-Details
- [[Integrationen/SMTP]] — Secrets-Injection
- [[Architecture/Overview]] — Infrastruktur
