# CI/CD: Deployment

## Deployment Pipeline

```
git push → main Branch
       ↓
GitHub Actions: ionos-deploy.yml
       ↓
SFTP via lftp (mirror zum Hosting-Provider)
       ↓
WordPress Theme-Verzeichnis aktualisiert
       ↓ (optional)
SMTP-Credentials in wp-config.php injizieren
       ↓
Seite ist live unter `{{DOMAIN}}`
```

## Workflow: ionos-deploy.yml

**Trigger:** Push auf `main` Branch, manueller Dispatch

**Was passiert:**
1. Code auschecken
2. lftp SFTP-Verbindung aufbauen
3. Alle Dateien spiegeln (außer `.git`, `.github`, `README`, `vault/`, lokale Artefakte)
4. Optional: SMTP-Credentials in `wp-config.php` schreiben
5. Optional: Stripe/Stripe-Test-Credentials in `wp-config.php` schreiben

**Ausgeschlossene Pfade (lftp `-x`-Pattern, Stand 2026-06-06):**

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
| `IONOS_FTP_SERVER` | SFTP-Hostname |
| `IONOS_FTP_USERNAME` | SFTP-Benutzername |
| `IONOS_FTP_PASSWORD` | SFTP-Passwort |
| `EB_SMTP_USER` / `EB_SMTP_PASS` | SMTP-Konfiguration |
| `EB_STRIPE_MODE` | `test`/`live` (auch als Variable möglich) |
| `EB_STRIPE_PUBLIC_KEY` / `EB_STRIPE_SECRET_KEY` | Live Stripe Keys |
| `EB_STRIPE_WEBHOOK_SECRET` | Live Webhook Secret |
| `EB_STRIPE_TEST_PUBLIC_KEY` / `EB_STRIPE_TEST_SECRET_KEY` | Testmodus/Sandbox Keys |
| `EB_STRIPE_TEST_WEBHOOK_SECRET` | Testmodus Webhook Secret |

## Deployment-Hinweise

- Kein Build-Schritt nötig (pure PHP + Vanilla JS)
- Dateien werden 1:1 übertragen
- Browser-Caching: JS/CSS können gecached werden; sichtbare UI-Änderungen brauchen `$asset_ver` in `index.php`.
- Aktueller Asset-Stand: `2.5.1`.
- Deploy-Check nach Push:
  - GitHub Actions `Deploy to IONOS` muss `success` sein.
  - Live-HTML mit Cache-Bypass prüfen: `curl -H 'Cache-Control: no-cache' https://xn--eventbrse-57a.de/`.
  - Wenn normale Requests noch alt wirken: CDN/Browsercache abwarten oder Hard Reload.

## Verknüpfte Notizen
- [[Architecture/Overview]] - Infrastruktur
