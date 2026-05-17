```markdown
# Patch: Demo-Daten → echte API-Calls

## Änderungen app.js

### A) LISTINGS-Array (ca. Zeile 7-450)

Suche nach: `var LISTINGS = [`
Direkt davor einfügen:
```javascript
var _demoListings = null; // wird beim ersten Aufruf gesetzt
```

Direkt nach dem schließenden `];` des LISTINGS-Arrays einfügen:
```javascript
_demoListings = LISTINGS.slice(); // Demo-Kopie sichern
```

### B) loadDbListings() — bestehende Funktion ERSETZEN

```javascript
var _listingsLoadPromise = null;

function loadDbListings(forceReload) {
  if (!forceReload && LISTINGS.length > 0 && _listingsLoad