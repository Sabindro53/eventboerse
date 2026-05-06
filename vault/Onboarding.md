---
tags: [onboarding, einstieg]
---

# Onboarding

> Einstiegspunkt für neue Entwickler:innen und Coding-Agents. Wenn du das hier zum ersten Mal liest, lies anschließend **in dieser Reihenfolge**: [[Glossar]] → [[Architecture/Overview]] → [[Architecture/Datenmodell]] → [[Frontend/app-js-module]] → [[Backend/API-Endpoints]] → [[Security/2026-05-02-Security-Hardening]].

## Mentale Modelle (5 Minuten)

1. **Hybrid-App** — WordPress als CMS/Auth/REST-Backend, frontseitig praktisch reine SPA in `app.js`. Kein React, kein Build-Step.
2. **Multi-User-Marktplatz** — drei Rollen: Provider (Dienstleister), Event-Planer (Kunden), Admin. Stripe Connect Express für Zahlungen, 3 % Application Fee.
3. **WordPress Theme-Architektur** — alles wohnt in `wp-content/themes/eventboerse/`. `index.php` liefert die SPA-Hülle, `functions.php` ist das Backend.
4. **Compliance-First** — DSGVO, DSA, P2B, BFSG. Siehe [[Legal/Compliance-Overview]].

## Lokale Einrichtung

```bash
# 1. Repo clonen
git clone <repo-url> eventboerse && cd eventboerse

# 2. WP-Hülle (LocalWP / DDEV / Lando empfohlen)
#    Theme symlinken nach wp-content/themes/eventboerse/
ln -s "$(pwd)" /pfad/zu/local/wp-content/themes/eventboerse

# 3. Plugin-Mindeststand: WooCommerce-frei, kein Page-Builder
#    Aktivieren: Akismet (Spam), ggf. Wordfence (DEV-Only)

# 4. Stripe-Test-Keys lokal in wp-config.php:
define('EB_STRIPE_PUBLIC',  'pk_test_...');
define('EB_STRIPE_SECRET',  'sk_test_...');
define('EB_STRIPE_WEBHOOK', 'whsec_...');
```

> ⚠️ Niemals echte Production-Keys oder echte SMTP-Credentials in lokalen Configs committen.

## Wichtigste Dateien

| Datei | Was | Größe |
|---|---|---|
| `app.js` | SPA, Routing, alle UI-Module | ~14.7k LOC |
| `functions.php` | REST-API, Auth, Stripe, Upload | ~4.4k LOC |
| `styles.css` | Design-Tokens + Component-Styles | ~11k LOC |
| `index.php` | SPA-Shell, Page-Cache | klein |
| `index.html` | Statisches Marketing-Render (Pre-Login) | ~149 KB |
| `.htaccess` | Security-Header, Rewrites, Upload-Block | mittel |

## Was du als Erstes lesen solltest

1. [[Architecture/Overview]] — System auf einer Seite
2. [[Architecture/Datenmodell]] — DB-Schema
3. [[Architecture/Frontend-Routing]] — wie Seiten geladen werden
4. [[Backend/API-Endpoints]] — Backend-Vertrag
5. [[Security/Permissions]] — Permission-Callbacks-Pattern
6. [[Security/EBSafeHTML]] — XSS-Schutz-Sanitizer

## Conventions in 60 Sekunden

- **Funktions-Prefix:** `eb_*` (PHP) und `eb*` (JS)
- **REST-Namespace:** `eventboerse/v1` (öffentlich aus dem Browser ablesbar)
- **DB-Prefix:** `wp_eb_*`
- **Meta-Keys:** `eb_*`
- **CSS-Klassen:** `eb-*` mit BEM-ähnlichen Modifiern
- **Cache-Busting:** `?v=<int>` an `app.js`/`styles.css` hochzählen bei jedem Release
- **Commits:** prägnante Imperativ-Form (DE oder EN), Sicherheits-Fixes mit Prefix `security:`

## Was NICHT verändern

- ❌ REST-Namespace umbenennen (Frontend hardcoded)
- ❌ Meta-Key-Schema brechen ohne Migration in `eb_db_migrate()`
- ❌ Stripe-Webhook-Handler ohne Signaturprüfung
- ❌ `_sanitizeHtml()` ohne Audit lockern (XSS-Risiko, siehe [[Security/EBSafeHTML]])
- ❌ Inline-Eventhandler in App-generiertem HTML (CSP)

## Wenn du verloren bist

→ [[Dashboard]] hat den vollständigen Index.
→ [[Glossar]] erklärt unsere Begriffe.
→ [[AI-Gedaechtnis/Claude-Kontext]] enthält die Quintessenz.
