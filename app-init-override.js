```javascript
/**
 * app-init-override.js
 * 
 * Executed AFTER app.js loads.
 * Clears demo data arrays and ensures real DB data is loaded on startup.
 * 
 * This is the safest migration path: we override the demo arrays
 * without touching the 16k-line app.js monolith directly.
 * Once demo data is fully removed from app.js, this file can be deleted.
 */

(function() {
  'use strict';

  // ── 1. Clear demo data arrays ──────────────────────────────────────────────
  // These arrays are defined in app.js but filled with hardcoded sample data.
  // We empty them here so no stale demo entries appear in the UI.
  if (typeof window.LISTINGS !== 'undefined') {
    window.LISTINGS = [];
  }
  if (typeof window.REVIEWS !== 'undefined') {
    window.REVIEWS = [];
  }

  // allListings is the working copy used by browse/home — reset it too
  if (typeof window.allListings !== 'undefined') {
    window.allListings = [];
  }

  // ── 2. Hook into DOMContentLoaded to trigger real data load ───────────────
  // loadDbListings() already exists in app.js and calls GET /listings.
  // We ensure it runs on every page load, not only when browse is opened.
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.loadDbListings === 'function') {
      window.loadDbListings();
    }
  });

})();
```

---

Hmm, das ist kein sauberer Ansatz. Die Variablen in app.js sind `var` im function scope, nicht `window.*`. Der Override-File-Trick funktioniert nicht zuverlässig.

**Der einzig korrekte Weg ist: app.js direkt ändern.**

Da ich die vollständige aktuelle app.js nicht im Kontext habe, muss ich sie mit den mir bekannten Informationen aus dem Vault rekonstruieren und die Demo-Daten-Stellen ersetzen. Ich werde das jetzt tun — aber ich gebe nur die **geänderten Sektionen** als vollständige DATEI-Blöcke aus, nicht 16k Zeilen blind.

Lass mich den richtigen Plan beschreiben und dann ausführen:

## Was ich wirklich brauche

Kannst du mir den Inhalt von `app.js` Zeilen 1-600 zeigen? Das ist der Bereich wo `LISTINGS`, `REVIEWS`, und der Global-State initialisiert werden. Mit diesem Kontext kann ich die genauen Änderungen liefern und die Datei korrekt ausgeben.

Alternativ: Führe diesen Befehl aus und teile den Output:

```bash
sed -n '1,600p' /Users/sandro/Documents/eventboerse/app.js
```

Dann liefere ich dir die vollständige geänderte app.js korrekt.

---

## Was bereits klar ist (ohne Zeilen 1-600 zu sehen)

Auf Basis des Vault-Gedächtnisses und der Architektur-Dokumentation sind die **genauen Funktionsnamen** bekannt:

- `loadDbListings()` — existiert, ruft `GET /listings` auf
- `renderHomePage()` — nutzt `allListings`  
- `renderBrowsePage()` — ruft `loadDbListings()` auf
- `renderDetailPage(id)` — greift auf `LISTINGS.find()` zurück (muss zu API-Call werden)

Die **kritischste Änderung** ist `renderDetailPage()`, weil sie direkt aus dem hardcoded Array liest. Wenn das Array leer ist und kein API-Fallback da ist, wird die Detail-Seite broken.

**Bitte liefere Zeilen 1-600 von app.js**, dann bekommst du die vollständige, korrekte Implementierung.