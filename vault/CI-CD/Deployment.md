# CI/CD: Deployment

## Deployment Pipeline

```
git push → main Branch
       ↓
GitHub Actions: ionos-deploy.yml
       ↓
SFTP via lftp (mirror zum IONOS Server)
       ↓
WordPress Theme-Verzeichnis aktualisiert
       ↓ (optional)
SMTP-Credentials in wp-config.php injizieren
       ↓
Seite ist live auf eventbörse.de
```

## Workflow: ionos-deploy.yml

**Trigger:** Push auf `main` Branch, manueller Dispatch

**Was passiert:**
1. Code auschecken
2. lftp SFTP-Verbindung zu IONOS aufbauen
3. Alle Dateien spiegeln (außer .git, .github, README)
4. Optional: SMTP-Credentials in wp-config.php schreiben

**Ausgeschlossene Dateien:** `.git`, `.github`, `README.md`, `node_modules`

## Workflow: site-monitor.yml

**Trigger:** Alle 30 Minuten (cron), manueller Dispatch

**Was passiert:**
1. HTTPS-Request an xn--eventbrse-57a.de (eventbörse.de)
2. HTTP-Redirect prüfen
3. Bei Fehler: GitHub Issue erstellen "⚠️ Site Down"
4. Bei Wiederherstellung: Issue schließen

→ Automatisches Monitoring ohne Drittanbieter!

## Workflow: pr-check.yml

**Trigger:** Pull Request

**Was passiert:**
1. Geänderte Dateien via GitHub API auflisten
2. Code-Validierung

## GitHub Secrets (benötigt)

| Secret | Beschreibung |
|--------|--------------|
| `IONOS_HOST` | SFTP-Hostname |
| `IONOS_USER` | SFTP-Benutzername |
| `IONOS_PASSWORD` | SFTP-Passwort |
| `IONOS_REMOTE_PATH` | Pfad zum WordPress Theme |

## Deployment-Hinweise

- Kein Build-Schritt nötig (pure PHP + Vanilla JS)
- Dateien werden 1:1 übertragen
- Browser-Caching: JS/CSS 1 Monat, HTML 1 Stunde (.htaccess)
- Cache-Busting via File-Modification-Timestamp in functions.php

## Verknüpfte Notizen
- [[Architecture/Overview]] - Infrastruktur
