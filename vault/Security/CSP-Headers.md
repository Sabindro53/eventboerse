# CSP-Header

> Content-Security-Policy + Begleit-Header. Doppelte Schicht: PHP-Header in `functions.php` + Apache-Header in `.htaccess`.

## Aktuelle Policy (PHP-Layer)

```text
default-src 'self';
base-uri 'self';
form-action 'self' https://checkout.stripe.com https://billing.stripe.com;
frame-ancestors 'none';
object-src 'none';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://unpkg.com https://cdn.jsdelivr.net;
script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://unpkg.com https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com https://images.pexels.com {{DOMAIN}};
connect-src 'self' https://api.stripe.com https://m.stripe.network https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org;
frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com;
manifest-src 'self';
worker-src 'self' blob:;
media-src 'self' data: blob:;
upgrade-insecure-requests
```

## Begründung pro Direktive

| Direktive | Warum so |
|---|---|
| `default-src 'self'` | Fallback strikt |
| `frame-ancestors 'none'` | Verhindert Clickjacking; redundant zu `X-Frame-Options: DENY` |
| `object-src 'none'` | Kein Flash, keine Java-Plugins, kein Embedding |
| `base-uri 'self'` | Verhindert `<base href="…">`-Injection (URL-Hijacking) |
| `form-action` | Forms dürfen nur an eigene Origin oder Stripe submitten |
| `script-src` | Stripe + Leaflet + Flatpickr. `'unsafe-inline' + 'unsafe-eval'` aktuell nötig wegen Inline-Onclick und Stripe.js. Roadmap: Nonce-basiert |
| `img-src data: blob:` | Self-hosted Avatare als Data-URI |
| `connect-src` | XHR nur zu Stripe-API, OSM-Nominatim, eigener REST |
| `frame-src` | Nur Stripe Checkout/3DS-Frames |
| `upgrade-insecure-requests` | Auto-Upgrade auf HTTPS |

## NICHT in der CSP (bewusste Entscheidung)

- ~~`https://api.dicebear.com`~~ — entfernt seit Avatar-Self-Hosting
- ~~`https://www.google-analytics.com`~~ — kein Tracking
- ~~`https://fonts.googleapis.com` in `connect-src`~~ — nur `style-src`/`font-src` benötigt

## Begleit-Header

| Header | Wert | Zweck |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HSTS 2 Jahre |
| `X-Frame-Options` | `DENY` | Clickjacking-Backup für alte Browser |
| `X-Content-Type-Options` | `nosniff` | kein MIME-Sniffing |
| `X-XSS-Protection` | `0` | Legacy-Filter aus, CSP ersetzt das |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | URL-Pfade leaken nicht |
| `Cross-Origin-Opener-Policy` | `same-origin` | Spectre/Meltdown-Schutz |
| `Cross-Origin-Resource-Policy` | `same-site` | Resource-Embedding-Limit |
| `X-Permitted-Cross-Domain-Policies` | `none` | Adobe-Cross-Domain-Policy aus |
| `Permissions-Policy` | siehe `functions.php` | Hardware-APIs deaktiviert |

## Test-Strategie

```bash
# CSP-Verstöße in Browser-Console sichtbar.
# Externe Tests:
curl -I https://{{DOMAIN}} | grep -iE 'security|policy|frame|content'
# https://securityheaders.com/?q={{DOMAIN}}     → Ziel: A+
# https://observatory.mozilla.org/analyze/{{DOMAIN}}  → Ziel: A+
```

## Roadmap

- [ ] Inline-Scripts auf Nonce migrieren → `'unsafe-inline'` raus
- [ ] Stripe.js auf neuere Version, die ohne `'unsafe-eval'` läuft
- [ ] Report-URI Endpoint einrichten (`report-to` + `report-uri`-Direktive)

Siehe [[Security/2026-05-02-Security-Hardening]], [[Security/Permissions]].
