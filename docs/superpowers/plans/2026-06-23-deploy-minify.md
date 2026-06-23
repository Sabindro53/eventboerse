# Deploy-Minify (#6 Part 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app.js` (mangle-only) und `styles.css` (csso) im CI vor dem SFTP-Mirror minifizieren, mit harten Gates (`node --check` + Funktions-Guard), die bei Bruch den Deploy abbrechen.

**Architecture:** Neuer Step-Block in `.github/workflows/ionos-deploy.yml` nach `Checkout`, vor `Install lftp`. Minify überschreibt die Dateien im CI-Workspace; Repo-Quelle bleibt unverändert. Schlägt ein Gate fehl → `exit 1` → kein Mirror, Live-Site unverändert.

**Tech Stack:** GitHub Actions (YAML), `actions/setup-node`, `npx terser`, `npx csso`. **Keine lokale terser-Validierung möglich** → CI ist der erste echte Lauf; Gates schützen die Produktion.

**Spec:** `docs/superpowers/specs/2026-06-23-deploy-minify-design.md`

**Rollback:** Workflow-Commit reverten (nächster Push deployt wieder roh) oder `hq-rollback`-Workflow. Kein Backup-Branch nötig (reine YAML-Änderung, trivial reversibel).

---

### Task 1: Minify-Step in den Workflow einfügen

**Files:** Modify `.github/workflows/ionos-deploy.yml`

- [ ] **Step 1: Steps einfügen**

Finde:

```yaml
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install lftp
        run: sudo apt-get update -qq && sudo apt-get install -y -qq lftp
```

Ersetze durch:

```yaml
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Minify assets (#6 Part 2)
        run: |
          echo "Vorher: app.js $(wc -c < app.js) B, styles.css $(wc -c < styles.css) B"
          npx --yes terser app.js --mangle -o app.js
          # Gate 1: gültiges JS?
          node --check app.js
          # Gate 2: Inline-Handler-Globals noch da? (mangle.toplevel=false → ja)
          for fn in navigateTo toggleFavorite sendMessage filterListings _startChatPoll; do
            grep -q "function $fn" app.js || { echo "FATAL: $fn fehlt nach Minify — Abbruch"; exit 1; }
          done
          # CSS (csso-cli, Fallback csso)
          npx --yes csso-cli styles.css -o styles.css || npx --yes csso styles.css -o styles.css
          echo "Nachher: app.js $(wc -c < app.js) B, styles.css $(wc -c < styles.css) B"

      - name: Install lftp
        run: sudo apt-get update -qq && sudo apt-get install -y -qq lftp
```

- [ ] **Step 2: YAML-Validität prüfen**

```bash
cd ~/Documents/eventboerse
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ionos-deploy.yml')); print('YAML OK')"
```
Expected: `YAML OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ionos-deploy.yml
git commit -m "#6-2 Minify (terser mangle-only + csso) als CI-Step vor SFTP, mit node-check+Funktions-Gate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Deploy, CI-Lauf überwachen, Live verifizieren

**Files:** keine

- [ ] **Step 1: Letzten Deploy-Run-Zeitstempel merken (Baseline)**

```bash
curl -s "https://api.github.com/repos/Sabindro53/eventboerse/actions/runs?per_page=5" \
  | python3 -c "import sys,json;r=[x for x in json.load(sys.stdin)['workflow_runs'] if x['name']=='Deploy to IONOS'][0];print('BASELINE Deploy-Run:',r['created_at'],r['conclusion'])"
```

- [ ] **Step 2: Rebase-Check + Push**

```bash
cd ~/Documents/eventboerse
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 3: Neuen CI-Lauf abwarten + Ergebnis prüfen**

```bash
for i in $(seq 1 20); do
  R=$(curl -s "https://api.github.com/repos/Sabindro53/eventboerse/actions/runs?per_page=5" \
    | python3 -c "import sys,json;r=[x for x in json.load(sys.stdin)['workflow_runs'] if x['name']=='Deploy to IONOS'][0];print(r['created_at'],r['status'],r['conclusion'])")
  echo "  $R"
  echo "$R" | grep -q "completed" && break
  sleep 20
done
```
Expected: neuer Run, `completed success`. **Wenn `failure`:** ein Gate hat angeschlagen → Minify hat etwas gebrochen → Live-Site ist **unverändert** (kein Mirror lief). Logs prüfen, STOP, melden.

- [ ] **Step 4: Live-Verifikation (nur bei success)**

```bash
D=https://xn--eventbrse-57a.de
echo "=== app.js minifiziert? (kleiner + einzeilig-artig, navigateTo vorhanden) ==="
A=$(curl -s --max-time 15 "$D/wp-content/themes/eventboerse/app.js?cb=$(date +%s)")
echo "  Bytes live: $(printf '%s' "$A" | wc -c)"
echo "  Zeilen live: $(printf '%s' "$A" | wc -l)   (vorher ~21k)"
printf '%s' "$A" | grep -c 'function navigateTo'
echo "=== Homepage rendert (SPA-Marker)? ==="
curl -s --max-time 15 "$D/?cb=$(date +%s)" | grep -oE 'ai-hero-h1|id="app"' | sort -u
curl -s -o /dev/null -w "Homepage HTTP %{http_code}\n" --max-time 15 "$D/"
```
Expected: app.js deutlich weniger Zeilen (Whitespace weg) + `function navigateTo` vorhanden; Homepage 200 + SPA-Marker.

- [ ] **Step 5: Funktionaler Live-Smoke (manuell, Nutzer)**

Im Browser: Startseite lädt, Listings erscheinen, eine `onclick`-Aktion (z.B. Kategorie-Filter / Detailseite öffnen) funktioniert → bestätigt, dass die gemangelte app.js die Inline-Handler bedient.

---

## Self-Review

**Spec-Coverage:**
- terser `--mangle` (kein compress) → Task 1 Step 1 ✓
- Gate `node --check` → Task 1 Step 1 (Gate 1) ✓
- Funktions-Guard → Task 1 Step 1 (Gate 2) ✓
- csso (+ Fallback) → Task 1 Step 1 ✓
- setup-node → Task 1 Step 1 ✓
- Repo-Quelle unverändert (nur CI-Workspace) → Minify überschreibt im Runner, kein Commit der Minifikate ✓
- Abbruch-bei-Fehler schützt Produktion → Task 2 Step 3 ✓
- Live-Verifikation → Task 2 Step 4–5 ✓

**Placeholder-Scan:** YAML-Block + Befehle vollständig; keine TBD.

**Konsistenz:** Dateinamen bleiben `app.js`/`styles.css` (kein functions.php-Enqueue-Eingriff). Gates laufen VOR `Install lftp`/`Deploy via SFTP` → bei `exit 1` kein Mirror. `node --check` nutzt das via `setup-node` bereitgestellte Node.
