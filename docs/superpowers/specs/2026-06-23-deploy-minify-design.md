# Design: Minify im Deploy (#6 Part 2)

**Datum:** 2026-06-23 · **Katalog-Bezug:** #6 (Ladezeit), Part 2 · **Status:** Entwurf zur Freigabe

## Problem

`app.js` (~912 KB) und `styles.css` (~424 KB) werden **roh** per SFTP deployed (Workflow
`ionos-deploy.yml` mirror't ohne Build). Sie werden zwar gzip-komprimiert ausgeliefert
(~222/150 KB), aber unminifiziert → unnötige Transfer- und v.a. **Parse-Zeit auf Mobil**.

**Bereits erledigt (kein Handlungsbedarf):**
- Part 1 (Splash früher ausblenden): `__hideAppLoader()` läuft schon direkt nach dem
  Router-Render (`navigateTo` → doppeltes `requestAnimationFrame`, app.js ~8031).
- Part 3 (Demo-Daten): über #5 abgedeckt.

## Ziel

Deployte `app.js`/`styles.css` sind minifiziert (Whitespace/Kommentare weg, lokale Namen
gemangelt) → kleinere Übertragung, schnelleres Parsen — **ohne** Funktionsbruch und **ohne**
die Repo-Quelle zu verändern (Minify nur im CI-Workspace).

## Kernrisiko & Schutz

`app.js` ist ein flaches Top-Level-Script; **hunderte Inline-Handler** (`onclick="navigateTo(…)"`
u.v.m.) referenzieren **Top-Level-Funktionen**, die terser im JS nicht „sieht".

- **Nur `--mangle`, KEIN `--compress`:** terser kann lokal nicht vorab getestet werden
  (kein npx/Netz auf dieser Maschine) → erster echter Lauf ist im CI. Daher die sicherste
  effektive Stufe: Mangle benennt nur **funktions-lokale** Namen um und entfernt
  Whitespace/Kommentare — semantisch quasi identisch, sehr gut erprobt. `compress` (die
  riskantere Stufe mit Inlining/Dead-Code-Elimination) wird **weggelassen**, bis ein
  lokaler/Staging-Test möglich ist.
- **Mangle.toplevel = false (Default):** Top-Level-Namen bleiben unverändert → die
  Inline-Handler (`onclick="navigateTo(…)"`) funktionieren weiter. **Keine** `--toplevel`-,
  **keine** `unsafe`-Flags.
- **Harter CI-Gate `node --check app.js`** direkt nach dem Minify: produziert terser
  ungültiges JS → Build **abbrechen** (kein Deploy).
- **CI-Guard Funktions-Präsenz:** zusätzlich prüfen, dass Schlüssel-Globals als
  `function <name>` im Minifikat vorhanden sind (`navigateTo`, `toggleFavorite`,
  `sendMessage`, `filterListings`, `_startChatPoll`). Fehlt eines → Build abbrechen.

## Design

### CI-Step „Minify assets" (vor dem SFTP-Mirror) in `ionos-deploy.yml`

Nach `Checkout`, vor `Deploy via SFTP`:

1. `actions/setup-node` (Node 20).
2. JS: `npx --yes terser app.js --mangle -o app.js` (kein `--compress`).
3. **Gate:** `node --check app.js` — bei Fehler `exit 1` (kein Deploy).
4. **Guard:** für jede Schlüsselfunktion `grep -q "function <name>" app.js`, sonst `exit 1`.
5. CSS: `npx --yes csso-cli styles.css -o styles.css` (Fallback `csso`).
6. Größen vorher/nachher loggen.

Minify überschreibt die Dateien **im CI-Workspace**; der nachfolgende `mirror --reverse`
deployt die minifizierten Versionen. Repo bleibt unverändert. Asset-Cache-Busting via
`filemtime` greift automatisch (neue mtime → neuer `?v=`).

### Bewusst nicht

- Keine Sourcemaps deployen (Debugging via unminifizierte Repo-Quelle).
- Keine Änderung an `functions.php`-Enqueue (Dateinamen bleiben `app.js`/`styles.css`).
- `app-shell.html`/`index.html`/`index.php` werden **nicht** minifiziert (HTML-Struktur,
  geringer Gewinn, höheres Risiko mit `readfile`/PHP).

## Edge Cases / Risiken

- **terser bricht etwas Subtiles:** CI-Guard fängt fehlende Globals ab; Post-Deploy-Smoke
  fängt Render-Bruch ab. Rollback = Workflow-Commit reverten (nächster Push deployt wieder
  roh) oder `hq-rollback`-Workflow.
- **`csso-cli` Paketname:** falls nicht auflösbar, Fallback `npx --yes csso styles.css -o styles.css`.
- **Node-Verfügbarkeit:** explizit `setup-node`, nicht auf Ubuntu-Default verlassen.
- **Template-Literals/moderne JS:** aktuelles terser unterstützt ES2020+ (app.js nutzt
  Template-Strings, `?.`, etc.).

## Verifikation

1. **Lokaler Trockenlauf nicht möglich** (kein npx/Netz auf dieser Maschine) → die
   Validierung passiert im CI selbst via `node --check` + Funktions-Guard **vor** dem
   SFTP-Mirror. Schlägt einer fehl, bricht der Build ab und es wird **nichts** deployed.
2. **Nach Deploy live:**
   - Homepage 200 + SPA-Marker (`ai-hero-h1`, `id="app"`).
   - `app.js` deutlich kleiner & einzeilig-artig; enthält weiterhin `function navigateTo`.
   - Eine Kern-Interaktion (z.B. Startseite lädt Listings) funktioniert.

## Offene Punkte

Keine — mangle-only (kein compress, da lokal nicht testbar) + harte CI-Gates
(`node --check` + Funktions-Guard vor dem Mirror) festgelegt. `--compress` kann später
ergänzt werden, sobald ein lokaler/Staging-Test möglich ist.
