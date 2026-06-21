# Scripts

## `localize-demo-images.mjs` — Demo-Bilder lokal hosten

Lädt alle externen Demo-Bilder (Pexels/Unsplash) aus `app.js` herunter, legt sie
unter `assets/demo/` ab und schreibt die URLs in `app.js` auf lokale Pfade um.

**Warum:** Externe Hotlinks können jederzeit verschwinden (→ einzelne Bilder
fehlen) und übertragen beim Seitenaufruf die Besucher-IP an Pexels/Unsplash.
Lokale Bilder sind stabil, schneller und DSGVO-sauberer.

### Ausführen (auf dem PC, Node 18+, keine Abhängigkeiten)

```bash
node scripts/localize-demo-images.mjs --dry-run   # nur anzeigen, nichts ändern
node scripts/localize-demo-images.mjs             # herunterladen + app.js umschreiben
node scripts/localize-demo-images.mjs --force     # vorhandene Dateien neu laden
```

Danach prüfen und committen:

```bash
git add assets/demo app.js
git commit -m "chore: Demo-Bilder lokal hosten"
```

### Sicherheit / Verhalten

- Legt vor dem Schreiben ein Backup `app.js.bak` an.
- Ersetzt **nur** Bild-URLs der bekannten Demo-Hosts (Pexels/Unsplash).
- Schlägt ein Download fehl, bleibt die **Original-URL** erhalten (kein Bruch).
- Idempotent: erneutes Ausführen überspringt bereits lokale Bilder.
- Fügt einmalig `window.EB_ASSET_BASE` in `app.js` ein. Die Basis wird zur
  Laufzeit aus dem `<script src=".../app.js">` abgeleitet, damit die Pfade
  sowohl lokal (`index.html`) als auch im WordPress-Theme
  (`get_template_directory_uri()`) korrekt auflösen.

> Validiert: 94 URLs erkannt, app.js bleibt nach Umschreiben gültiges JS,
> `EB_ASSET_BASE` löst zur Laufzeit korrekt auf. Der eigentliche Bild-Download
> muss in einer Umgebung mit freiem Netzzugang laufen (z. B. lokaler PC).
