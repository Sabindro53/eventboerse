# A11y Rest icon-buttons (#13 Rest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den 55 verbleibenden icon-only Buttons `aria-label` geben — dominanter Fall `.modal-close` → „Schließen", plus spezifische Labels.

**Architecture:** Mechanisch & risikofrei (keine Optik/Funktion). `.modal-close` per globalem Replace; spezifische Labels per Skript-Paaren. Body in `app-shell.html` (Single-Source #7) → danach `./build-index-html.sh`.

**Tech Stack:** HTML/JS, Python für deterministische Edits. **Verifikation:** `node --check`, Re-Scan (→0), Bundle-Grep.

**Spec:** `docs/superpowers/specs/2026-06-24-a11y-rest-icon-buttons-design.md`

---

### Task 1: `.modal-close` → „Schließen" (beide Dateien)

**Files:** Modify `app-shell.html`, `app.js`

- [ ] **Step 1: Globaler Replace (idempotent — modal-close hat aktuell kein aria-label)**

```bash
cd ~/Documents/eventboerse
python3 - <<'PY'
for fn in ('app-shell.html','app.js'):
    t=open(fn,encoding='utf-8').read()
    # Nur ersetzen, wo noch kein aria-label am modal-close-Tag steht: das exakte class-Attribut
    n=t.count('class="modal-close"')
    t=t.replace('class="modal-close"','class="modal-close" aria-label="Schließen"')
    open(fn,'w',encoding='utf-8').write(t)
    print(fn, "modal-close ersetzt:", n)
PY
~/node-v22/bin/node --check app.js && echo "JS OK"
```

- [ ] **Step 2: Commit**

```bash
git add app-shell.html app.js
git commit -m "#13 Rest: aria-label='Schließen' für alle .modal-close

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Spezifische Labels in `app-shell.html`

**Files:** Modify `app-shell.html`

- [ ] **Step 1: Skript-Paare anwenden**

```bash
cd ~/Documents/eventboerse
python3 - <<'PY'
fn='app-shell.html'; t=open(fn,encoding='utf-8').read()
reps=[
 ('<button type="button" class="settings-pw-toggle"','<button type="button" class="settings-pw-toggle" aria-label="Passwort anzeigen"'),
 ('<button type="button" class="password-toggle" tabindex="-1">','<button type="button" class="password-toggle" tabindex="-1" aria-label="Passwort anzeigen">'),
 ('<button type="button" class="dur-btn dur-down" id="durDown">','<button type="button" class="dur-btn dur-down" id="durDown" aria-label="Verringern">'),
 ('<button type="button" class="dur-btn dur-up" id="durUp">','<button type="button" class="dur-btn dur-up" id="durUp" aria-label="Erhöhen">'),
 ('<button type="button" class="listing-live-preview-arrow prev" onclick="livePreviewNav(-1)">','<button type="button" class="listing-live-preview-arrow prev" aria-label="Vorheriges Bild" onclick="livePreviewNav(-1)">'),
 ('<button type="button" class="listing-live-preview-arrow next" onclick="livePreviewNav(1)">','<button type="button" class="listing-live-preview-arrow next" aria-label="Nächstes Bild" onclick="livePreviewNav(1)">'),
 ('<button type="button" class="ai-live-feedback" id="aiLiveFeedback" hidden onclick="_ebScrollToBrowseResults()"','<button type="button" class="ai-live-feedback" id="aiLiveFeedback" hidden aria-label="Zu den Ergebnissen" onclick="_ebScrollToBrowseResults()"'),
 ('<button onclick="document.getElementById(\'commWarning\').style.display=\'none\'">','<button aria-label="Hinweis schließen" onclick="document.getElementById(\'commWarning\').style.display=\'none\'">'),
]
miss=[]
for a,b in reps:
    if a in t and 'aria-label' not in a: t=t.replace(a,b,3 if 'password-toggle' in a else 1)
    elif a not in t: miss.append(a[:55])
open(fn,'w',encoding='utf-8').write(t)
print("angewendet:",len(reps)-len(miss),"/",len(reps)); [print("  FEHLT:",m) for m in miss]
PY
```
(Hinweis: `password-toggle` kommt mehrfach identisch vor → `replace(...,3)`. Falls Anzahl
abweicht, beim Ausführen anpassen.)

- [ ] **Step 2: Commit**

```bash
git add app-shell.html
git commit -m "#13 Rest: aria-labels für app-shell-Buttons (pw-toggle, dur, preview, feedback)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Spezifische Labels in `app.js`

**Files:** Modify `app.js`

- [ ] **Step 1: Exakte Strings bestätigen (Escapes in Template-Strings!)**

```bash
cd ~/Documents/eventboerse
grep -nE 'data-act="(pin|mute|archive|block)"|class="pec-delete"|class="kc-del"|editBoardCard|_postCalNav|post-img-remove|sa-submit|_copyFlowShareUrl|navigateTo\(.detail.,' + '?.*card.listingId' app.js | head -20
```

- [ ] **Step 2: Skript-Paare anwenden**

```bash
python3 - <<'PY'
fn='app.js'; t=open(fn,encoding='utf-8').read()
reps=[
 ('<button data-act="pin">','<button data-act="pin" aria-label="Anpinnen">'),
 ('<button data-act="mute">','<button data-act="mute" aria-label="Stummschalten">'),
 ('<button data-act="archive">','<button data-act="archive" aria-label="Archivieren">'),
 ('<button data-act="block" class="chat-menu-danger">','<button data-act="block" class="chat-menu-danger" aria-label="Blockieren">'),
 ('<button class="post-img-remove" onclick="_removePostImage()">','<button class="post-img-remove" aria-label="Bild entfernen" onclick="_removePostImage()">'),
 ('<button type="button" class="cal-nav" onclick="_postCalNav(event,-1)">','<button type="button" class="cal-nav" aria-label="Voriger Monat" onclick="_postCalNav(event,-1)">'),
 ('<button type="button" class="cal-nav" onclick="_postCalNav(event,1)">','<button type="button" class="cal-nav" aria-label="Nächster Monat" onclick="_postCalNav(event,1)">'),
 ('<button class="sa-submit" id="saSubmitBtn">','<button class="sa-submit" id="saSubmitBtn" aria-label="Absenden">'),
 ('<button type="button" class="btn-primary" onclick="_copyFlowShareUrl()">','<button type="button" class="btn-primary" aria-label="Link kopieren" onclick="_copyFlowShareUrl()">'),
]
miss=[]
for a,b in reps:
    if a in t: t=t.replace(a,b,1)
    else: miss.append(a[:55])
open(fn,'w',encoding='utf-8').write(t)
print("angewendet:",len(reps)-len(miss),"/",len(reps)); [print("  FEHLT:",m) for m in miss]
PY
```

- [ ] **Step 3: Rest mit Escapes (pec-delete, kc-del, editBoardCard, filter-clear, detail) gezielt**

Diese stehen in Template-Strings mit `\'`-Escapes → beim Ausführen exakte Quelle via `grep` aus
Step 1 übernehmen und je `aria-label` einfügen:
- `.pec-delete` (`_deleteEventConnection`) → „Verknüpfung entfernen"
- `.kc-del` (`deleteBoardCard`) → „Karte löschen"
- `editBoardCard(...)` → „Karte bearbeiten"
- Filter-Clear (`…value=''; filterListings()`) → „Eingabe löschen"
- `navigateTo('detail', card.listingId)` → „Details ansehen"

- [ ] **Step 4: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
git add app.js
git commit -m "#13 Rest: aria-labels für app.js-Buttons (chat-menu, board, cal, share)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Build, Re-Scan, Deploy, Verify

- [ ] **Step 1: index.html bauen + Lints**

```bash
cd ~/Documents/eventboerse
./build-index-html.sh
~/node-v22/bin/node --check app.js && php -l index.php
```

- [ ] **Step 2: Re-Scan (Ziel: ~0 verbleibend)**

```bash
python3 - <<'PY'
import re
def scan(fn):
    txt=open(fn,encoding='utf-8').read(); n=0
    for b in re.findall(r'<button\b[^>]*>.*?</button>',txt,re.S):
        head=b[:b.index('>')+1]; inner=b[b.index('>')+1:b.rindex('<')]
        if 'aria-label' in head or 'material-icons' not in inner: continue
        ni=re.sub(r'<span class="material-icons[^"]*">[^<]*</span>','',inner)
        vis=re.sub(r'<[^>]+>','',ni); vis=re.sub(r'\$\{[^}]*\}','',vis); vis=re.sub(r"'\s*\+.*?\+\s*'",'',vis).strip()
        if not vis: n+=1
    return n
for fn in ('app-shell.html','app.js'): print(fn,"verbleibend:",scan(fn))
PY
grep -oE '<button[^>]*aria-label[^>]*aria-label[^>]*>' app-shell.html app.js | head   # keine Doppel
```
Expected: verbleibend ≈ 0; keine doppelten aria-label.

- [ ] **Step 3: Rebase + Deploy**

```bash
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
~/node-v22/bin/node --check app.js
git push origin main
```

- [ ] **Step 4: Live-Verifikation**

```bash
for i in $(seq 1 12); do curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | grep -q 'aria-label="Schließen"' && { echo live; break; }; sleep 15; done
curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | grep -oc 'aria-label="Schließen"'
```
Expected: `aria-label="Schließen"` mehrfach im ausgelieferten HTML.

---

## Self-Review

**Spec-Coverage:** `.modal-close` (Task 1), app-shell-Spezifische (Task 2), app.js-Spezifische +
Escape-Fälle (Task 3), Build/Re-Scan/Deploy (Task 4). Alle Mapping-Zeilen abgedeckt.

**Placeholder-Hinweis:** Task 3 Step 3 (Escape-behaftete Template-Strings) verweist bewusst auf
`grep`-bestätigte Exakt-Strings beim Ausführen statt geratener Escapes — die Labels sind
festgelegt, nur die exakte Quell-Syntax wird zur Laufzeit bestätigt.

**Risiko:** Null visuell/funktional (nur aria-label). Verifizierbar ohne Login (Bundle-Grep).
