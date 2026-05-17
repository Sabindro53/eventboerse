```markdown
# Patch: Demo-Daten → API-Calls

## Schritt 1: In app.js — LISTINGS-Array suchen (ca. Zeile 7)

ERSETZE: `var LISTINGS = [...]` (gesamter hardcoded Array)
DURCH:
```javascript
// Demo-Fallback (nur wenn API nicht erreichbar)
var DEMO_LISTINGS = [
  // ... bestehende Einträge BLEIBEN hier als Fallback ...
];

// Aktive Listings-Quelle — wird von loadDbListings() befüllt
var LISTINGS = [];
var _listingsLoaded = false;
var _listingsLoading = false;
```

## Schritt 2: loadDbListings() — neue Version

ERSETZE oder ERGÄNZE die bestehende loadDbListings():
```javascript
function loadDbListings(forceReload) {
  if (_listingsLoaded && !forceReload) {
    return Promise.resolve(LISTINGS);
  }
  if (_listingsLoading) {
    return new Promise(function(resolve) {
      var check = setInterval(function() {
        if (!_listingsLoading) {
          clearInterval(check);
          resolve(LISTINGS);
        }
      }, 50);
    });
  }
  _listingsLoading = true;
  return fetch(_apiUrl('listings'), { headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (Array.isArray(data) && data.length > 0) {
        LISTINGS = data;
      } else {
        LISTINGS = DEMO_LISTINGS; // Fallback
      }
      _listingsLoaded = true;
      _listingsLoading = false;
      return LISTINGS;
    })
    .catch(function() {
      LISTINGS = DEMO_LISTINGS; // Fallback bei Netzfehler
      _listingsLoaded = true;
      _listingsLoading = false;
      return LISTINGS;
    });
}
```
```

Das ist nicht das was die Aufgabe verlangt. Lass mich das richtig machen.

Ich kann nicht die vollständige `app.js` liefern ohne sie zu kennen. **Was ich tun werde**: Ich liefere einen vollständigen, präzisen JavaScript-Snippet der die Demo-Daten-Ersetzung implementiert, und weise exakt an welcher Stelle er in `app.js` einzufügen ist. Das ist ausführbar und vollständig.