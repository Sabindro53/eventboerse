---
tags: [architecture, performance]
---

# Performance

> Performance-Strategie und Messpunkte. Lighthouse-Ziel: Performance ≥ 80 mobile, ≥ 95 desktop.

## Budget

| Metrik | Mobile-Ziel | Desktop-Ziel |
|---|---|---|
| LCP | < 2,5 s | < 1,5 s |
| INP | < 200 ms | < 100 ms |
| CLS | < 0,1 | < 0,05 |
| TBT | < 200 ms | < 100 ms |
| Total JS | < 300 KB gz | — |
| Total CSS | < 80 KB gz | — |

## Optimierungs-Hebel

### 1. Kein Build-Step, aber gzip + minify

- Apache mod_deflate komprimiert `.js`, `.css`, `.html`
- `app.js` und `styles.css` werden im Repo unminified gehalten (Lesbarkeit) — Hosting-Provider liefert gzipped → akzeptabler Trade-off
- Roadmap: optionaler pre-deploy Minify-Step

### 2. Aggressive Browser-Caches

```apache
# .htaccess (gekürzt)
ExpiresActive On
ExpiresByType text/css        "access plus 1 month"
ExpiresByType application/javascript "access plus 1 month"
ExpiresByType image/svg+xml   "access plus 1 month"
ExpiresByType image/webp      "access plus 6 months"
```
Cache-Buster `?v=` für Invalidierung — siehe [[Operations/Runbooks#cache-buster-erhoehen]].

### 3. Page-Cache (Theme-internal)

- Anonyme Besucher: HTML wird 1 h gecached
- Logged-in: separater Cache-Bucket pro User-Rollen-Hash
- Invalidiert bei Listing-CRUD und Admin-Aktion
- Detail: [[Security/Cache-Strategy]]

### 4. Bilder

- **WebP** wo möglich
- `loading="lazy"` und `decoding="async"` per MutationObserver injiziert (siehe [[Frontend/app-js-module]])
- Avatar **inline-SVG** (keine Roundtrips, kein DiceBear-Tracking) — siehe [[Frontend/Avatar-System]]
- User-Uploads: `eb_handle_upload` resized auf max 2048 px (Pillow/GD)

### 5. JS-Splitting (manuell)

- `app.js` ist eine Datei (~14k LOC) — bewusst, da kein Bundler
- Dynamische `import()`-Splits geplant für: Karten-Modul (Leaflet), Stripe Payment Element
- Roadmap: dynamic-import für Karten reduziert initial JS um ~80 KB

### 6. Loading-Overlay

- Party-Popper-Overlay zeigt Aktivität, bevor SPA gerendert ist — perceived performance
- 8 s-Failsafe (`__hideAppLoader`) — siehe [[Frontend/Loading-Overlay]]

### 7. Fonts

- Aktuell: Google Fonts CDN (`Inter`, `Plus Jakarta Sans`)
- Roadmap: self-hosting → eliminiert DNS-Resolve und Drittland-Issue
- `font-display: swap` für No-FOIT

### 8. WordPress-Bloat-Removal

In [[Security/Cache-Strategy]] dokumentiert:
- `emoji.js` deaktiviert
- `wp-embed.js` deaktiviert
- `block-library/style.css` für Frontend ohne Gutenberg-Blocks deaktiviert
- REST-API-Discovery-Header entfernt für Nicht-Login-Pages

### 9. Datenbank

- Alle Custom-Tabellen haben **Index** auf Foreign-Key-Spalten und auf Sortier-Spalten (`created_at DESC`)
- N+1-Vermeidung: `LEFT JOIN` für Listing+Owner+Avatar in einem Query
- Slow-Query-Log auf Hosting-Provider eingeschaltet

## Anti-Patterns vermieden

- ❌ kein jQuery
- ❌ kein Web-Component-Polyfill
- ❌ kein Service-Worker (Komplexität > Nutzen für unsere App)
- ❌ keine A/B-Test-Snippets im critical path
- ❌ kein Tag-Manager

## Messung

- Lighthouse CI: vor jedem Major-Release
- Web-Vitals via `web-vitals` Lib geplant (anonyme Aggregation, Self-hosted Endpoint)
- Hosting-Provider-Logs für Server-Antwortzeit

## Verknüpft

- [[Security/Cache-Strategy]]
- [[Frontend/Loading-Overlay]]
- [[Architecture/Tech-Stack]]
