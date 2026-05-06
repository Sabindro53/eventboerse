# CI/CD: Deployment

## Deployment Pipeline

```
git push → main Branch
       ↓
GitHub Actions: deploy.yml
       ↓
SFTP via lftp (mirror zum Hosting-Provider)
       ↓
WordPress Theme-Verzeichnis aktualisiert
       ↓ (optional)
SMTP-Credentials in wp-config.php injizieren
       ↓
Seite ist live unter `{{DOMAIN}}`
```

## Workflow: deploy.yml

**Trigger:** Push auf `main` Branch, manueller Dispatch

**Was passiert:**
1. Code auschecken
2. lftp SFTP-Verbindung aufbauen
3. Alle Dateien spiegeln (außer .git, .github, README, vault/)
4. Optional: SMTP-Credentials in wp-config.php schreiben

**Ausgeschlossene Pfade (lftp `-x`-Pattern, Stand 2026-05-06):**

```
^\.git           ^\.github/      ^\.vscode/      ^\.idea/
^\.obsidian/     ^\.claude/      ^\.claude\.json$
^vault/          ^docs/          ^tests/         ^node_modules/
^LICENSE$        ^README\.md$    ^CNAME$         ^AGENTS\.md$
^\.gitignore$    ^\.gitattributes$  ^\.editorconfig$
^sftp-debug\.txt$  ^deploy-probe\.txt$
\.bak$  \.log$  \.swp$  \.DS_Store$
^Attached Element Context
```

> ⚠️ Wegen `mirror --reverse --delete` werden zuvor bereits hochgeladene Pfade dieser Liste beim nächsten Deploy automatisch vom Server **gelöscht**. Defense-in-Depth zu `.htaccess`-Block (`RedirectMatch 404 /vault`).

## Workflow: site-monitor.yml

**Trigger:** Alle 30 Minuten (cron), manueller Dispatch

**Was passiert:**
1. HTTPS-Request an `{{DOMAIN}}`
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
| `DEPLOY_HOST`     | SFTP-Hostname |
| `DEPLOY_USER`     | SFTP-Benutzername |
| `DEPLOY_PASSWORD` | SFTP-Passwort |
| `DEPLOY_PATH`     | Pfad zum WordPress Theme |

## Deployment-Hinweise

- Kein Build-Schritt nötig (pure PHP + Vanilla JS)
- Dateien werden 1:1 übertragen
- Browser-Caching: JS/CSS 1 Monat, HTML 1 Stunde (.htaccess)
- Cache-Busting via File-Modification-Timestamp in functions.php

## Verknüpfte Notizen
- [[Architecture/Overview]] - Infrastruktur
