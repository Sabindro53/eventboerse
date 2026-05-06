# Cache-Strategie

Mehrschichtiger Cache, weil Shared-Hosting + WordPress + großer SPA-Bundle eine Herausforderung sind.

## Layer 1 — Browser-Cache

`.htaccess` setzt **immutable**-Cache für versionierte Assets:

```apache
<FilesMatch "\.(css|js|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

Cache-Busting via Query-String: `app.js?v=132`, `styles.css?v=135`. Bei Code-Änderung die Version bumpen.

## Layer 2 — WordPress Page-Cache (anonyme User)

`functions.php` setzt für nicht eingeloggte User:

```text
Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=60
```

Eingeloggte User:

```text
Cache-Control: private, no-store
```

Damit darf der CDN/Reverse-Proxy anonyme HTML-Antworten 5–10 min cachen, aber niemals private Daten.

## Layer 3 — Object-Cache (WordPress Transient API)

Verwendet für:
- Rate-Limit-Counter (`set_transient` mit TTL)
- API-Antworten teurer Listen-Queries
- Stripe Public-Key
- Geocoding-Ergebnisse

## Layer 4 — Avatar-Inline-Cache

Self-hosted Avatare als `data:`-URI in REST-Antworten → keine separaten Requests, in der einbettenden JSON-Antwort enthalten.

## Layer 5 — REST-API explizit nicht cachen

`.htaccess`:

```apache
<If "%{REQUEST_URI} =~ m#/wp-json/#">
  Header set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
</If>
```

REST liefert dynamische User-Daten → niemals cachen.

## WordPress-Bloat-Removal

In `functions.php` deaktiviert:
- `wp_emoji`, `wp_generator`-Meta, `rsd_link`, `wlwmanifest`
- `wp-block-library` CSS, `global-styles`, `classic-theme-styles`
- `jquery-migrate`
- Heartbeat im Frontend
- XML-RPC

→ ~150 KB weniger Initial-Payload.

## Empfehlung manuell

- Page-Cache-Plugin (W3 Total Cache / WP Super Cache) auf Hosting-Provider aktivieren
- OPcache aktivieren in `php.ini` (PHP-Bytecode-Cache)
- ggf. CloudFlare als Reverse-Proxy davor (kostenlos)

Siehe [[CI-CD/Deployment]], [[Security/CSP-Headers]].
