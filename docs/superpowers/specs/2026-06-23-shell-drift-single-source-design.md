# Design: Shell-Drift beheben — eine Quelle der Wahrheit für den SPA-Body (#7)

**Datum:** 2026-06-23 · **Katalog-Bezug:** #7 · **Status:** Entwurf zur Freigabe

## Problem

`index.html` (lokale Dev-Shell) und `index.php` (WordPress-Produktions-Template) enthalten
zwei Kopien derselben SPA-Shell und **driften auseinander**:

- Gesamt-Diff: 627 Zeilen (548 nur-php, 79 nur-html).
- **Der Body driftet inhaltlich:** 380 Diff-Zeilen. `index.php` ist der vollständigere,
  kanonische Stand — er enthält z.B. einen kompletten **QA-Support-Bot-Block (~115 Zeilen)**,
  der in `index.html` fehlt. `index.html` hängt Features hinterher.
- Jede Body-Änderung muss heute doppelt gepflegt werden (bei #5 und #4c gerade erlebt) →
  geht zwangsläufig irgendwann schief.

**Wichtige Eigenschaften (verifiziert):**
- Der Body von `index.php` (Z.203–4004, zwischen `<body>` und `<?php wp_footer(); ?>`) ist
  **PHP-frei** (0 PHP-Tags) → 1:1 teilbar.
- Head und Foot **müssen** unterschiedlich bleiben: `index.php` hat einen dynamischen
  PHP-Head (Per-Page-Meta aus #4c, `wp_head()`, Asset-Versionierung, `eventboerseApi`-Config)
  und `<?php wp_footer(); ?>` für die Script-Auslieferung; `index.html` braucht einen
  statischen Head und explizite `<script src>`-Tags (leaflet, flatpickr, stripe, app.js).

## Ziel

Der gemeinsame SPA-Body lebt in **genau einer Datei**. `index.php` und `index.html` setzen
nur noch ihren jeweils eigenen (kleinen) Head/Foot drumherum. Body-Änderungen passieren an
**einer** Stelle; die beiden Shells können nicht mehr inhaltlich auseinanderlaufen.

## Nicht-Ziele

- Verhalten/Optik ändern — reiner Struktur-Refactor, Output bleibt identisch.
- Build-Schritt ins Deployment einbauen (Deploy bleibt „push → SFTP", kein Build).
- Head/Foot vereinheitlichen — die unterscheiden sich berechtigt (PHP vs. statisch).

## Architektur (Ansatz A — geteiltes Body-Partial)

```
app-shell.html          ← EINZIGE Quelle des SPA-Bodys (PHP-frei, aus index.php übernommen)
index.local-head.html   ← statischer Head + <body>   (nur für lokale index.html)
index.local-foot.html   ← <script src>-Tags + </body></html>  (nur für lokale index.html)

index.php   = PHP-Head (unverändert) + <body> + <?php readfile(__DIR__.'/app-shell.html'); ?>
              + <?php wp_footer(); ?> + </body></html>
index.html  = build-index-html.sh: cat index.local-head.html app-shell.html index.local-foot.html
```

### Komponenten

| Datei | Verantwortung | Quelle |
|-------|---------------|--------|
| `app-shell.html` (neu) | Gemeinsamer SPA-Body (inneres Markup, **ohne** `<body>`-Tags). Einzige Wahrheit. | aus index.php Z.203–4004 |
| `index.php` (geändert) | PHP-Head + `readfile(app-shell.html)` + `wp_footer()`. Body-Markup entfällt. | — |
| `index.local-head.html` (neu) | Statischer Head bis inkl. `<body>` für lokale Dev-Shell. | aus index.html Z.1–60 |
| `index.local-foot.html` (neu) | Drittanbieter-`<script>` + `app.js` + `</body></html>`. | aus index.html Z.3532–3538 |
| `build-index-html.sh` (neu) | `cat head + app-shell + foot > index.html`. | — |
| `index.html` (regeneriert) | Build-Artefakt für lokale Entwicklung. Committet, damit lokal sofort lauffähig. | generiert |

### Datenfluss

```
Body-Änderung  →  app-shell.html (1 Stelle)
                    ├─► index.php: readfile zur Laufzeit  → immer aktuell, nie regenerieren
                    └─► build-index-html.sh ausführen      → index.html neu (committen)
```

## Kanonik & Migration

`index.php`-Body ist der Übernahme-Stand (vollständiger, inkl. QA-Bot). `index.html` erbt
dadurch die fehlenden Features. Vor der Migration wird geprüft, ob `index.html` Body-Inhalte
hat, die `index.php` **nicht** hat (erwartet: nur veraltete Reste); solche werden bewusst
verworfen oder — falls relevant — vorher nach `index.php` übernommen.

## Head-Drift-Bereinigung (einmalig)

Der Katalog nennt zwei **versehentliche** Head-Unterschiede: `manifest.json` nur in index.php,
`format-detection` nur in index.html. Diese werden einmalig abgeglichen (beides in beide
Heads), da Head/Foot künftig getrennt gepflegt werden.

## Deployment-Kompatibilität

Der SFTP-Deploy spiegelt das Repo ins Theme-Verzeichnis. `app-shell.html` wird mitdeployed;
`readfile(__DIR__ . '/app-shell.html')` löst dort korrekt auf (`__DIR__` = Theme-Dir).
Kein Build im Deploy nötig — `index.php` ist zur Laufzeit selbsttragend.

## Edge Cases / Risiken

- **Produktions-Template:** `index.php` wird umgebaut (Body → `readfile`). Risiko mittel.
  Absicherung: `php -l`, lokaler PHP-Built-in-Server-Test (`php -S`) mit Vergleich des
  gerenderten Outputs gegen den alten Stand **vor** Deploy; Backup-Branch.
- **`readfile` schlägt fehl** (Datei fehlt): leere Seite. Absicherung: Existenz-Prüfung im
  Deploy-Verify (curl Startseite nach Deploy muss SPA-Marker enthalten).
- **Doppelte `<body>`-Tags:** app-shell.html enthält **keine** `<body>`-Tags; die liefert
  jeweils der Head/Wrapper. Beim Extrahieren strikt darauf achten.
- **app.js-Version:** lokal `app.js?v=158` (statisch), Produktion via `filemtime` — bleibt
  so (Foot getrennt), kein Drift-Thema.

## Verifikation

Kein Test-Harness. Stattdessen:

1. `php -l index.php`, `bash -n build-index-html.sh`.
2. **Output-Gleichheit Produktion:** vor Umbau gerenderten index.php-Body sichern; nach Umbau
   `php -S localhost:8123` + `curl` → Body-Bereich muss byte-identisch zum gesicherten sein.
3. **Lokal:** `build-index-html.sh` ausführen, `python3 -m http.server` → index.html lädt,
   keine Konsolenfehler, SPA rendert.
4. **Drift-Beweis:** Body-Region von index.html (generiert) und index.php (readfile-Quelle)
   müssen identisch sein → `diff` der app-shell-Region = 0.
5. Nach Deploy live: Startseite + ein `/detail/`-Deeplink laden (SPA-Marker vorhanden).

## Offene Punkte

Keine — Ansatz A bestätigt, Body PHP-frei, Head/Foot bleiben getrennt.
