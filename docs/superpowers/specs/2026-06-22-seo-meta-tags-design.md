# Design: SEO-Meta-Tags je Seite (#4c) + zwei akute Server-Bugs

**Datum:** 2026-06-22 · **Katalog-Bezug:** #4c (Meta-Tags je Seite) · **Status:** Entwurf zur Freigabe

## Problem

Beim Umsetzen von #4c (client-seitige `document.title`/Meta je Route) sind in
`index.php` zwei **akute Live-SEO-Bugs** aufgefallen. Alle drei werden zusammen behoben,
weil sie dieselben Dateien und dasselbe Ziel (korrektes Meta je Seite) betreffen.

### Bug A — Falsche Punycode-Domain (akut, betrifft jede Seite)

`index.php:31` hardcodet:

```php
$site_url = 'https://xn--eventbrse-q5a.de'; // IDN: eventbörse.de
```

`xn--eventbrse-q5a.de` ist die **falsche** ACE-Kodierung — die echte Domain ist
`xn--eventbrse-57a.de` (live verifiziert; identischer Bug wie in #4a für robots/sitemap).
Folge: **alle** `<link rel="canonical">`, `og:url`, `og:image`, `twitter:*`-URLs zeigen auf
die falsche Domain → Deindexierungs-/Duplicate-Content-Risiko.

### Bug B — Route-Mismatch: Server kennt `/detail/` nicht

`index.php:17–22` erkennt nur `/listing/(\d+)` und `/provider/(\d+)`. Die echten SPA-Deep-Links
(und die in #4a generierte Sitemap) sind aber **`/detail/{id+10000}`** (`_spaPath('detail', id)`,
app.js:917–919). Folge: Ein Crawler, der eine **Sitemap-URL** wie `/detail/10005` besucht,
fällt durch alle Zweige und bekommt das **generische Default-Meta** statt Listing-Titel/-Bild.

### Bug C — `document.title` wird clientseitig nie gesetzt (#4c-Kern)

In `app.js` gibt es keine einzige `document.title = …`-Zuweisung. Bei SPA-Navigation
(`navigateTo`) bleibt der Tab-Titel statisch auf dem Server-Initialwert. Browser-Verlauf,
Bookmarks und Tab-Leiste zeigen für *jede* Seite denselben Titel.

## Ziel

Jede Seite liefert korrektes, eindeutiges Meta — server-seitig (für Crawler/Social-Preview,
die kein JS ausführen) **und** client-seitig (Tab-Titel/Verlauf bei SPA-Navigation), mit der
**richtigen Domain**.

## Nicht-Ziele

- Provider-Deep-Link-Meta (`/provider/{id}`) inhaltlich anreichern — bleibt vorerst generisch
  (separater Punkt; hier nur Route-Erkennung, kein Provider-Meta-Aufbau).
- index.html (lokale Dev-Shell) — nicht live deployed; bleibt unangetastet.
- Pre-Rendering/SSR der SPA-Inhalte über das Meta hinaus.

## Design

### A — Domain aus `home_url()` statt Hardcode (index.php)

```php
$site_url = rtrim( home_url(), '/' );
```

Ersetzt die hartkodierte Zeile 31. Damit kann nie wieder eine falsche Domain im Meta landen
(gleiche Lösung wie #4a in functions.php). Alle abgeleiteten Werte (`$og_image`, `$canonical`,
`$meta_*`) erben automatisch die korrekte Domain.

### B — `/detail/{id+10000}` server-seitig erkennen (index.php)

Den Routen-Block (Z.17–27) erweitern, **vor** `/listing/`:

```php
if ( preg_match('#^/detail/(\d+)#', $request_uri, $m) ) {
    $url_id     = (int) $m[1];
    $listing_id = $url_id > 10000 ? $url_id - 10000 : $url_id; // Frontend nutzt +10000-Offset
    $page_type  = 'listing';
} elseif ( preg_match('#^/listing/(\d+)#', $request_uri, $m) ) {
    $listing_id = (int) $m[1];
    $page_type  = 'listing';
} elseif ( preg_match('#^/provider/(\d+)#', $request_uri, $m) ) {
    ...
```

Der bestehende Listing-Meta-Block (Z.45–69) greift dann unverändert (`$page_type === 'listing'`).
Das `canonical` für Listings wird auf die **tatsächliche Deep-Link-URL** gesetzt:

```php
$canonical = $site_url . '/detail/' . ( 10000 + $listing_id );
```

(statt `/listing/` Z.63 — konsistent mit Sitemap und SPA).

### C — Client-seitiges Meta je Route (app.js)

Neuer Helper `_setPageMeta(page, data)`:

```js
function _setPageMeta(page, data) {
  var base = 'EventBörse';
  var title = base + ' – Dein Event-Marktplatz';
  var desc  = 'Finde DJs, Catering, Fotografen, Locations und mehr für dein nächstes Event.';
  switch (page) {
    case 'browse': title = 'Dienstleister entdecken – ' + base; break;
    case 'detail':
      if (currentListing && currentListing.title) {
        var cat = currentListing.categoryLabel || currentListing.category || '';
        title = currentListing.title + (cat ? ' – ' + cat : '') + ' | ' + base;
        desc  = (currentListing.description ? String(currentListing.description).replace(/<[^>]*>/g,'').slice(0,155) : desc);
      }
      break;
    case 'board':    title = 'Eventboard – ' + base; break;
    case 'chat':     title = 'Nachrichten – ' + base; break;
    case 'profile':  title = 'Profil – ' + base; break;
    case 'settings': title = 'Einstellungen – ' + base; break;
    case 'admin':    title = 'Admin – ' + base; break;
  }
  document.title = title;
  var md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', desc);
}
```

Aufruf in `navigateTo` (am Ende, nachdem `page`/`data` feststehen) sowie in `loadDetail`,
nachdem `currentListing` gesetzt ist (damit der Detail-Titel den echten Listing-Titel nutzt,
auch wenn das Listing erst async geladen wird).

## Datenfluss

```
Crawler/Direktaufruf  ──► index.php: Route erkennen (/detail,/listing,/browse,/board)
                            │  + home_url() Domain
                            └─► <title>/<meta>/og/canonical (server, korrekt)

SPA-Navigation (navigateTo) ──► _setPageMeta(page,data) ──► document.title + meta[description]
loadDetail (async) ─────────► _setPageMeta('detail', id)  (mit echtem currentListing.title)
```

## Edge Cases

- `/detail/5` ohne Offset (alte/manuelle URL): `id ≤ 10000` → als direkte ID behandelt
  (Fallback, kein Crash).
- Listing nicht gefunden/inaktiv: bestehender Block lässt Default-Meta stehen (kein Fehler).
- Detail-Seite vor Async-Load: `_setPageMeta` läuft zunächst mit Default, dann erneut nach
  `loadDetail` mit echtem Titel.
- JS aus: Server-Meta ist bereits korrekt (Bug A/B gefixt) — Client-Teil ist nur Verbesserung.

## Verifikation

Kein Test-Harness. Stattdessen:

1. `php -l index.php` und `~/node-v22/bin/node --check app.js`.
2. Nach Deploy live:
   - `curl -s https://xn--eventbrse-57a.de/detail/10005 | grep -E '<title>|canonical|og:url'`
     → Listing-spezifischer Titel, Domain `57a`, canonical `/detail/10005`.
   - `curl -s https://xn--eventbrse-57a.de/ | grep canonical` → Domain `57a` (nicht `q5a`).
3. Manuell im Browser zwischen Seiten navigieren → Tab-Titel ändert sich.

## Offene Punkte

Keine — Templates spiegeln die bestehenden Server-Vorlagen, Domain via `home_url()`.
