# Shell-Drift Single-Source (#7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den gemeinsamen SPA-Body in eine einzige Datei (`app-shell.html`) auslagern; `index.php` liefert ihn per `readfile`, `index.html` wird daraus gebaut — Shells können nicht mehr inhaltlich driften.

**Architecture:** Ansatz A. Body (PHP-frei, kanonisch aus `index.php` Z.204–4004) → `app-shell.html`. `index.php` = PHP-Head + `<?php readfile(__DIR__.'/app-shell.html'); ?>` + `wp_footer()`. `index.html` = `cat index.local-head.html app-shell.html index.local-foot.html` (Build-Skript, Artefakt committet). Head/Foot bleiben getrennt.

**Tech Stack:** WordPress-PHP-Template, statische HTML-Dev-Shell, Bash-Build-Skript. **Kein Test-Harness** → `php -l`, `bash -n`, Extraktions-Gleichheit per `diff`, Live-Vergleich vor/nach Deploy.

**Spec:** `docs/superpowers/specs/2026-06-23-shell-drift-single-source-design.md`

**Sicherheitsnetz:** Vor Task 1 Backup-Branch anlegen: `git branch backup/shell-drift-2026-06-23`.

---

## File Structure

- **Create `app-shell.html`** — gemeinsamer SPA-Body (einzige Wahrheit), PHP-frei.
- **Create `index.local-head.html`** — statischer Head + `<body>` (nur lokale index.html).
- **Create `index.local-foot.html`** — `<script src>`-Tags + `</body></html>` (nur lokale index.html).
- **Create `build-index-html.sh`** — baut index.html aus den drei Teilen.
- **Modify `index.php`** — Body-Markup → `readfile`; `format-detection`-Meta in den Head.
- **Regenerate `index.html`** — Build-Artefakt, committet.

---

### Task 0: Backup + Boundary-Check

**Files:** keine

- [ ] **Step 1: Backup-Branch + Grenzen verifizieren**

```bash
cd ~/Documents/eventboerse
git branch backup/shell-drift-2026-06-23
echo "index.php 203:"; sed -n '203p' index.php      # erwartet: <body>
echo "index.php 4005:"; sed -n '4005p' index.php    # erwartet: <?php wp_footer(); ?>
echo "index.html 60:"; sed -n '60p' index.html      # erwartet: <body>
echo "index.html 3531:"; sed -n '3531p' index.html  # erwartet: <!-- Drittanbieter-Skripte ... -->
```

Expected: die Kommentare stimmen. **Wenn nicht: STOP** (Datei hat sich verschoben, Grenzen neu bestimmen).

---

### Task 1: `app-shell.html` aus index.php-Body extrahieren

**Files:**
- Create: `app-shell.html` (aus `index.php` Z.204–4004)

- [ ] **Step 1: Body extrahieren**

```bash
cd ~/Documents/eventboerse
sed -n '204,4004p' index.php > app-shell.html
# Referenzkopie des Originals für spätere Gleichheitsprüfung
sed -n '204,4004p' index.php > /tmp/eb_original_body.txt
```

- [ ] **Step 2: PHP-frei verifizieren**

```bash
grep -cE '<\?php|<\?=' app-shell.html
```
Expected: `0`. **Wenn >0: STOP** (Body enthält PHP, Ansatz A ungültig).

- [ ] **Step 3: Keine `<body>`-Tags enthalten**

```bash
grep -cE '<body|</body>' app-shell.html
```
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add app-shell.html
git commit -m "#7 app-shell.html: gemeinsamer SPA-Body als einzige Quelle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Lokale Head-/Foot-Partials aus index.html

**Files:**
- Create: `index.local-head.html` (aus `index.html` Z.1–60)
- Create: `index.local-foot.html` (aus `index.html` Z.3531–3538)

- [ ] **Step 1: Extrahieren**

```bash
cd ~/Documents/eventboerse
sed -n '1,60p'     index.html > index.local-head.html   # endet mit <body>
sed -n '3531,3538p' index.html > index.local-foot.html  # Drittanbieter-Scripts + app.js + </body></html>
```

- [ ] **Step 2: Plausibilität**

```bash
tail -1 index.local-head.html        # erwartet: <body>
grep -c 'app.js' index.local-foot.html  # erwartet: 1
tail -1 index.local-foot.html        # erwartet: </html>
```

- [ ] **Step 3: Commit**

```bash
git add index.local-head.html index.local-foot.html
git commit -m "#7 Lokale Head/Foot-Partials für die Dev-Shell index.html

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Build-Skript

**Files:**
- Create: `build-index-html.sh`

- [ ] **Step 1: Skript schreiben**

Erstelle `build-index-html.sh` mit folgendem Inhalt:

```bash
#!/usr/bin/env bash
# Baut die lokale Dev-Shell index.html aus der gemeinsamen Body-Quelle.
# index.php nutzt app-shell.html direkt per readfile — nur index.html muss gebaut werden.
# Nach jeder Änderung an app-shell.html ausführen und index.html committen.
set -euo pipefail
cd "$(dirname "$0")"
cat index.local-head.html app-shell.html index.local-foot.html > index.html
echo "index.html neu gebaut ($(wc -l < index.html) Zeilen)."
```

- [ ] **Step 2: Ausführbar + Syntax**

```bash
chmod +x build-index-html.sh
bash -n build-index-html.sh && echo "Syntax OK"
```

- [ ] **Step 3: Commit**

```bash
git add build-index-html.sh
git commit -m "#7 build-index-html.sh: baut Dev-Shell aus app-shell.html

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Sicherheits-Check — was hat index.html im Body, das app-shell NICHT hat?

**Files:** keine (nur Prüfung)

- [ ] **Step 1: Alten index.html-Body gegen app-shell diffen**

```bash
cd ~/Documents/eventboerse
sed -n '61,3530p' index.html > /tmp/eb_old_html_body.txt
echo "=== Nur im alten index.html-Body (geht verloren, falls nicht in index.php): ==="
diff /tmp/eb_old_html_body.txt app-shell.html | grep '^<' | grep -vE '^< *$' | head -40
echo "=== Anzahl solcher Zeilen: ==="
diff /tmp/eb_old_html_body.txt app-shell.html | grep '^<' | grep -vE '^< *$' | wc -l
```

- [ ] **Step 2: Bewerten**

Sind die nur-html-Zeilen reine Whitespace-/Reihenfolge-Unterschiede oder veraltete Reste → weiter.
**Enthalten sie echten, in index.php fehlenden Inhalt → STOP und dem User zeigen**, vor dem Verwerfen entscheiden (ggf. nach index.php/app-shell.html übernehmen).

---

### Task 5: index.html neu bauen

**Files:**
- Regenerate: `index.html`

- [ ] **Step 1: Build ausführen**

```bash
cd ~/Documents/eventboerse
./build-index-html.sh
```

- [ ] **Step 2: Body-Gleichheit zur Quelle prüfen**

Der Body von index.html (ab Zeile nach `<body>`) muss app-shell.html entsprechen:

```bash
HEAD_LINES=$(wc -l < index.local-head.html)
FOOT_LINES=$(wc -l < index.local-foot.html)
TOTAL=$(wc -l < index.html)
sed -n "$((HEAD_LINES+1)),$((TOTAL-FOOT_LINES))p" index.html | diff - app-shell.html && echo "✅ index.html-Body == app-shell.html"
```
Expected: kein Diff-Output + „✅".

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "#7 index.html aus app-shell.html neu gebaut (erhält QA-Bot u.a.)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: index.php auf readfile umstellen + Head-Drift

**Files:**
- Modify: `index.php` (Body Z.204–4004 → `readfile`; `format-detection` in den Head)

- [ ] **Step 1: Body durch readfile ersetzen (Rekonstruktion)**

```bash
cd ~/Documents/eventboerse
{ sed -n '1,203p' index.php; \
  echo '<?php readfile( __DIR__ . "/app-shell.html" ); ?>'; \
  sed -n '4005,$p' index.php; } > /tmp/eb_index.php.new
mv /tmp/eb_index.php.new index.php
```

- [ ] **Step 2: Struktur prüfen**

```bash
grep -n 'readfile( __DIR__' index.php          # genau 1 Treffer, direkt nach <body>
grep -cE '<\?php wp_footer' index.php           # erwartet: 1
php -l index.php                                 # No syntax errors
```

- [ ] **Step 3: `format-detection`-Meta in den Head (Head-Drift-Bereinigung)**

In `index.php` finde:

```php
    <link rel="manifest" href="/manifest.json">
```

Füge **direkt darunter** ein:

```php
    <meta name="format-detection" content="telephone=no">
```

- [ ] **Step 4: Lint**

```bash
php -l index.php
```
Expected: `No syntax errors detected in index.php`

- [ ] **Step 5: Commit**

```bash
git add index.php
git commit -m "#7 index.php Body via readfile(app-shell.html) + format-detection im Head

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Verifikation, Deploy, Live-Gleichheit

**Files:** keine

- [ ] **Step 1: Lokaler Smoke-Test index.html**

```bash
cd ~/Documents/eventboerse
(python3 -m http.server 8766 >/dev/null 2>&1 & echo $! > /tmp/eb_srv.pid)
sleep 1
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8766/index.html
curl -s http://localhost:8766/index.html | grep -c 'id="qaBot"'   # erwartet: 1 (QA-Bot jetzt auch lokal)
kill "$(cat /tmp/eb_srv.pid)" 2>/dev/null
```
Expected: HTTP 200, qaBot-Count 1.

- [ ] **Step 2: Live-Body VOR Deploy sichern**

```bash
curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | sed -n '/<body>/,/cookie-banner-legal/p' > /tmp/eb_live_before.html
wc -l /tmp/eb_live_before.html
```

- [ ] **Step 3: Rebase + Deploy**

```bash
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
php -l index.php
git push origin main
```

- [ ] **Step 4: Auf Deploy warten + Live-Body NACH Deploy vergleichen**

```bash
for i in $(seq 1 14); do curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | grep -q 'id="qaBot"' && { echo "live"; break; }; sleep 15; done
curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | sed -n '/<body>/,/cookie-banner-legal/p' > /tmp/eb_live_after.html
echo "=== Body-Diff vor/nach Deploy (erwartet: 0 — Refactor ändert Output nicht) ==="
diff /tmp/eb_live_before.html /tmp/eb_live_after.html && echo "✅ identisch"
```
Expected: kein Diff → der Refactor hat den Produktions-Output **nicht** verändert.

- [ ] **Step 5: Deeplink-Smoke**

```bash
curl -sL "https://xn--eventbrse-57a.de/detail/10005/" -o /dev/null -w "detail HTTP %{http_code}\n"
curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | grep -oE 'ai-hero-h1|id="app"|id="qaBot"' | sort -u
```
Expected: HTTP 200 + SPA-Marker vorhanden.

---

## Self-Review

**Spec-Coverage:**
- Geteiltes `app-shell.html` (PHP-frei, kanonisch) → Task 1 ✓
- index.php → readfile → Task 6 Step 1 ✓
- index.html aus Build → Task 3 (Skript) + Task 5 (Build) ✓
- Head/Foot getrennt (Partials) → Task 2 ✓
- Head-Drift (format-detection; manifest schon in beiden) → Task 6 Step 3 ✓
- „html-only Body-Inhalt vor Verwerfen zeigen" → Task 4 ✓
- Deployment-Kompatibilität (readfile __DIR__) → Task 6 + Live-Verify Task 7 ✓
- Output-Gleichheit → Task 7 Step 4 (live vor/nach Diff) ✓ (php -S aus Spec ersetzt: index.php braucht WP-Bootstrap, lokal nicht renderbar → stattdessen Live-Vergleich + Extraktions-Gleichheit by construction)
- Backup-Branch → Task 0 ✓

**Placeholder-Scan:** keine TBD/TODO; jeder Step zeigt vollständige Befehle/Code.

**Typ-/Namens-Konsistenz:** `app-shell.html`, `index.local-head.html`, `index.local-foot.html`, `build-index-html.sh` durchgängig identisch benannt. `readfile( __DIR__ . "/app-shell.html" )` — Pfad relativ zum Theme-Dir (= __DIR__), wird mitdeployed. Grenzen 203/204/4004/4005 (index.php) und 60/61/3530/3531/3538 (index.html) in Task 0 verifiziert, bevor extrahiert wird.

**Abweichung von Spec:** Verifikation per `php -S` ersetzt durch Live-vor/nach-Vergleich, weil index.php WordPress-Funktionen (`wp_head`, `$wpdb`) braucht und nicht standalone rendert. Gleichwertig/stärker (echter Produktions-Output).
