# Avatar-System (Self-Hosted)

> Migrationsstand: vollständig self-hosted seit Mai 2026. Keine Drittanbieter-API mehr.

## Motivation

- **DSGVO**: kein Drittlandtransfer (DiceBear-API liefert von US/CDN aus)
- **Performance**: kein DNS-Lookup, kein TLS-Handshake, kein 5 KB-SVG je Avatar
- **Datenschutz**: kein User-Seed wird an Dritte übertragen
- **Verfügbarkeit**: keine Abhängigkeit von externer API

## Generator-Pattern

Identische deterministische Hash-Funktion in **JS** (Frontend) und **PHP** (Backend), damit gleiche Seeds auf beiden Seiten exakt gleiche Avatare ergeben.

### Frontend: `window.ebAvatar(seed, name)`

`app.js` (IIFE am Datei-Anfang):

```js
window.ebAvatar = function(seed, name) {
  // 1. djb2-Hash des Seeds → Index in 12-Farben-Palette
  // 2. Initialen aus name (1 oder 2 Zeichen)
  // 3. SVG mit Linear-Gradient + Initials zusammenbauen
  // 4. Memoize in _cache
  // 5. return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
};
```

Output ≈ 300 Byte je Avatar, inline im DOM, vollständig cachebar via `Cache-Control: immutable` für die JS-Datei.

### Backend: `eb_avatar_url($seed, $name)`

`functions.php`. Bit-identische Implementierung:

```php
function eb_avatar_url($seed, $name = '') {
    static $cache = [];
    // gleicher Hash-Algorithmus, gleiche Palette, gleiches Initial-Pattern
    return 'data:image/svg+xml;utf8,' . rawurlencode($svg);
}
```

Wird in REST-Antworten direkt mitgeliefert, sodass das Frontend nicht neu generieren muss.

## Palette

12 Markenfarben (Brand Primary `#FF385C` + 11 weitere). Index bestimmt sich aus `hash(seed) % 12`. Zweite Farbe für den Gradient: `(hash >> 4) % 12`.

## Initialen-Logik

| Eingabe `name` | Output |
|---|---|
| `"Jana Müller"` | `JM` |
| `"Jana"` | `JA` |
| `""` (leer) | erste 2 Zeichen des Seeds |

## Fallback-Schicht (Defense-in-Depth)

`app.js` registriert global einen `error`-Listener für `<img>`-Tags. Falls in der DB noch alte DiceBear-URLs aus User-Profilen vor der Migration stecken, wird `event.target.src` automatisch durch `ebAvatar()` ersetzt → keine Broken-Images, keine externen Requests.

## Cache-Verhalten

- JS-Funktion: in-memory `_cache[seed+'|'+name]`, lebt bis Tab-Close
- HTTP: Avatare sind `data:`-URIs, also Bestandteil der `app.js` bzw. der REST-JSON-Antwort → werden mit dem normalen Caching der einbettenden Ressource bedient. Keine separaten Avatar-Requests.

## CSP-Auswirkung

`img-src 'self' data: blob: …` reicht. `https://api.dicebear.com` ist aus der CSP entfernt, der `dns-prefetch`-Hinweis aus `index.html` ebenfalls.

Siehe [[Security/CSP-Headers]], [[Frontend/app-js-module]].
