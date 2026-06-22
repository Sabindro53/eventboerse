# A11y icon-button aria-labels (#13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den wichtigsten icon-only Buttons in `app-shell.html` und `app.js` `aria-label` geben (Toggle: + `aria-pressed`), damit Screenreader die Kern-Flows ansagen.

**Architecture:** Regel A (Buttons mit `title` → `aria-label=title`) via deterministischem Python-Transform; Regel B (Kern-Flows ohne title) + Regel C (Favoriten-Toggle) via gezielter Edits. Body-Buttons in `app-shell.html` (Single-Source #7) → danach `./build-index-html.sh`.

**Tech Stack:** HTML (`app-shell.html`), Vanilla-JS-Templates (`app.js`). **Kein Test-Harness** → `node --check`, Re-Scan-Zählung, Live-Stichprobe.

**Spec:** `docs/superpowers/specs/2026-06-23-a11y-icon-buttons-design.md`

**Sicherheitsnetz:** `git branch backup/a11y-2026-06-23` vor Task 1.

---

## File Structure

- **Modify `app-shell.html`** — Regel A (Transform) + Regel B (Kern-Flow-Buttons).
- **Modify `app.js`** — Regel A (Transform) + Regel B (Galerie-Pfeile, feed-card) + Regel C (Favoriten + Toggle-Handler).
- **Regenerate `index.html`** — Build aus app-shell.html.

---

### Task 0: Backup + Baseline-Zählung

- [ ] **Step 1: Backup + Baseline**

```bash
cd ~/Documents/eventboerse
git branch backup/a11y-2026-06-23
python3 - <<'PY'
import re
def scan(fn):
    txt=open(fn,encoding='utf-8').read(); n=0
    for b in re.findall(r'<button\b[^>]*>.*?</button>',txt,re.S):
        head=b[:b.index('>')+1]; inner=b[b.index('>')+1:b.rindex('<')]
        if 'aria-label' in head or 'material-icons' not in inner: continue
        ni=re.sub(r'<span class="material-icons[^"]*">[^<]*</span>','',inner)
        vis=re.sub(r'<[^>]+>','',ni); vis=re.sub(r'\$\{[^}]*\}','',vis).strip()
        if not vis: n+=1
    return n
for fn in ('app-shell.html','app.js'): print(fn, "icon-only ohne aria-label:", scan(fn))
PY
```

Notiere die zwei Baseline-Zahlen (für Vergleich am Ende).

---

### Task 1: Regel A — Transform `aria-label=title`

**Files:** Modify `app-shell.html`, `app.js`

- [ ] **Step 1: Transform-Skript schreiben + ausführen**

```bash
cd ~/Documents/eventboerse
python3 - <<'PY'
import re
def add_aria(fn):
    txt=open(fn,encoding='utf-8').read()
    def repl(m):
        whole=m.group(0); gt=whole.index('>'); lt=whole.rindex('<')
        head=whole[:gt+1]; inner=whole[gt+1:lt]
        if 'aria-label' in head: return whole
        if 'material-icons' not in inner: return whole
        ni=re.sub(r'<span class="material-icons[^"]*">[^<]*</span>','',inner)
        vis=re.sub(r'<[^>]+>','',ni); vis=re.sub(r'\$\{[^}]*\}','',vis)
        vis=re.sub(r"'\s*\+.*?\+\s*'",'',vis).strip()
        if vis: return whole
        tm=re.search(r'title="([^"]+)"',head)
        if not tm: return whole
        lab=tm.group(1)
        new_head=head.replace('title="'+lab+'"','title="'+lab+'" aria-label="'+lab+'"',1)
        return new_head+inner+whole[lt:]
    out=re.sub(r'<button\b[^>]*>.*?</button>',repl,txt,flags=re.S)
    open(fn,'w',encoding='utf-8').write(out)
    return out!=txt
for fn in ('app-shell.html','app.js'):
    print(fn, "geändert:", add_aria(fn))
PY
```

- [ ] **Step 2: Syntax + Idempotenz**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
# Erneuter Lauf darf NICHTS mehr ändern (Idempotenz)
```

- [ ] **Step 3: Commit**

```bash
git add app-shell.html app.js
git commit -m "#13-A aria-label=title für icon-only Buttons (Transform)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Regel B — Kern-Flow-Buttons in `app-shell.html`

**Files:** Modify `app-shell.html`

Für jeden Button unten: `aria-label="…"` in das öffnende `<button …>`-Tag einfügen (direkt nach `class="…"`). Exakte Strings via `grep -n` bestätigen, falls Abweichung.

- [ ] **Step 1: Edits anwenden**

| Finde (Auszug öffnendes Tag) | Füge hinzu |
|------------------------------|-----------|
| `<button class="nav-search-btn" onclick="performNavSearch()">` | `aria-label="Suchen"` |
| `<button class="nav-ai-close" onclick="closeNavAiSearch()">` | `aria-label="Suche schließen"` |
| `<button class="map-close-btn" onclick="closeMapOverlay()">` | `aria-label="Karte schließen"` |
| `<button class="view-toggle active" id="gridViewBtn" onclick="setView('grid')">` | `aria-label="Rasteransicht"` |
| `<button class="view-toggle" id="listViewBtn" onclick="setView('list')">` | `aria-label="Listenansicht"` |
| `<button class="provider-back-btn" onclick="history.back()">` | `aria-label="Zurück"` |
| `<button class="chat-back-btn" onclick="closeChatView()">` | `aria-label="Zurück zu den Chats"` |
| `<button class="chat-send-btn" onclick="sendMessage()">` | `aria-label="Nachricht senden"` |
| `plb-close` (3×: closeProviderLightbox / closeCoverLightbox / closeGalleryLightbox) | `aria-label="Galerie schließen"` |
| `plb-nav plb-prev` (2×) | `aria-label="Vorheriges Bild"` |
| `plb-nav plb-next` (2×) | `aria-label="Nächstes Bild"` |

Beispiel-Edit:
`<button class="nav-search-btn" onclick="performNavSearch()">`
→ `<button class="nav-search-btn" aria-label="Suchen" onclick="performNavSearch()">`

Für die mehrfachen `plb-close`/`plb-nav` (gleiches Markup, unterschiedlicher onclick): das `aria-label` an die jeweils eindeutige Zeile via onclick-Kontext hängen (`closeProviderLightbox`, `lightboxNav(-1)`, `galleryLightboxNav(1)` etc.).

- [ ] **Step 2: Zählung in app-shell prüfen**

```bash
cd ~/Documents/eventboerse
grep -c 'aria-label="Vorheriges Bild"\|aria-label="Nächstes Bild"\|aria-label="Galerie schließen"' app-shell.html
```
Expected: ≥ 7 (3 close + 2 prev + 2 next).

- [ ] **Step 3: Commit**

```bash
git add app-shell.html
git commit -m "#13-B aria-labels für Kern-Flow-Buttons in app-shell (Nav/View/Lightbox/Chat)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Regel B+C — Galerie-Pfeile, feed-card, Favoriten (`app.js`)

**Files:** Modify `app.js`

- [ ] **Step 1: Galerie-Pfeile (Regel B)**

Ersetze in `app.js`:
- `<button class="grid-gallery-arrow prev" data-gallery-id=` → füge `aria-label="Vorheriges Bild"` ins Tag ein.
- `<button class="grid-gallery-arrow next" data-gallery-id=` → `aria-label="Nächstes Bild"`.
- `<button class="detail-gallery-arrow prev" onclick="detailGalleryNav(-1)">` → `aria-label="Vorheriges Bild"`.
- `<button class="detail-gallery-arrow next" onclick="detailGalleryNav(1)">` → `aria-label="Nächstes Bild"`.

- [ ] **Step 2: feed-card „Details ansehen" (Regel B)**

`<button class="feed-card-action" onclick="navigateTo('detail',${l.id})">` → füge `aria-label="Details ansehen"` ein.

- [ ] **Step 3: Favoriten-Buttons (Regel C) — Markup**

Für die drei Favoriten-Templates `aria-label` + `aria-pressed` ergänzen:
- `<button class="listing-fav ${isFav ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${listing.id}, this)">`
  → `<button class="listing-fav ${isFav ? 'liked' : ''}" aria-label="Zu Favoriten hinzufügen" aria-pressed="${isFav ? 'true' : 'false'}" onclick="event.stopPropagation(); toggleFavorite(${listing.id}, this)">`
- `<button class="listing-fav" onclick="event.stopPropagation(); toggleFavorite(${l.id}, this)">`
  → analog mit `aria-label="Zu Favoriten hinzufügen" aria-pressed="false"`.
- `<button class="feed-card-action ${isFav ? 'active' : ''}" onclick="toggleFeedFav(this,${l.id})">`
  → `… aria-label="Zu Favoriten hinzufügen" aria-pressed="${isFav ? 'true' : 'false'}" onclick="toggleFeedFav(this,${l.id})">`

- [ ] **Step 4: Favoriten-Toggle (Regel C) — aria-pressed mitschalten**

In `toggleFavorite(id, el)`: nachdem der neue Zustand feststeht (Klasse `liked` gesetzt/entfernt), ergänze:
```js
if (el) el.setAttribute('aria-pressed', el.classList.contains('liked') ? 'true' : 'false');
```
In `toggleFeedFav(el, id)` analog (Zustandsklasse `active`):
```js
if (el) el.setAttribute('aria-pressed', el.classList.contains('active') ? 'true' : 'false');
```
(Exakte Einfügestelle: jeweils direkt nach dem Umschalten der Zustandsklasse — vorher `grep -n "function toggleFavorite\|function toggleFeedFav" app.js` und Stelle lesen.)

- [ ] **Step 5: Syntax**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
```

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "#13-B/C Galerie-Pfeile, feed-card + Favoriten-Toggle (aria-label/aria-pressed)

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

- [ ] **Step 2: Re-Scan (Verbesserung belegen)**

```bash
python3 - <<'PY'
import re
def scan(fn):
    txt=open(fn,encoding='utf-8').read(); n=0
    for b in re.findall(r'<button\b[^>]*>.*?</button>',txt,re.S):
        head=b[:b.index('>')+1]; inner=b[b.index('>')+1:b.rindex('<')]
        if 'aria-label' in head or 'material-icons' not in inner: continue
        ni=re.sub(r'<span class="material-icons[^"]*">[^<]*</span>','',inner)
        vis=re.sub(r'<[^>]+>','',ni); vis=re.sub(r'\$\{[^}]*\}','',vis).strip()
        if not vis: n+=1
    return n
for fn in ('app-shell.html','app.js'): print(fn, "verbleibend ohne aria-label:", scan(fn))
PY
```
Expected: deutlich niedriger als Baseline (Regel A/B/C-Buttons = 0 verbleibend in diesen Flows; Rest = Buttons außerhalb des Scopes ohne title).

- [ ] **Step 3: Doppelte aria-label ausschließen**

```bash
grep -oE '<button[^>]*aria-label[^>]*aria-label[^>]*>' app-shell.html app.js | head
```
Expected: keine Treffer.

- [ ] **Step 4: Rebase + Deploy**

```bash
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
~/node-v22/bin/node --check app.js
git push origin main
```

- [ ] **Step 5: Live-Stichprobe nach Deploy**

```bash
for i in $(seq 1 12); do curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | grep -q 'aria-label="Zu Favoriten hinzufügen"' && { echo live; break; }; sleep 15; done
curl -s "https://xn--eventbrse-57a.de/?cb=$(date +%s)" | grep -oE 'aria-label="(Vorheriges Bild|Nächstes Bild|Galerie schließen|Zu Favoriten hinzufügen)"' | sort | uniq -c
```
Expected: die Labels erscheinen im ausgelieferten HTML.

---

## Self-Review

**Spec-Coverage:**
- Regel A (title→aria-label, 29 Titel) → Task 1 (Transform, beide Dateien) ✓
- Regel B (Kern-Flows) → Task 2 (app-shell) + Task 3 Step 1–2 (app.js Galerie/feed) ✓
- Regel C (Favoriten aria-label+aria-pressed inkl. Toggle-Handler) → Task 3 Step 3–4 ✓
- Body in app-shell.html + rebuild → Task 4 Step 1 ✓
- Verifikation (Re-Scan, keine Doppel-Labels, Live) → Task 4 ✓
- Backup → Task 0 ✓

**Placeholder-Scan:** Transform-Skript + Edit-Tabellen vollständig; keine TBD.

**Typ-/Namens-Konsistenz:** `aria-pressed`-Werte als String `'true'/'false'`; Toggle nutzt `classList.contains('liked')`/`('active')` passend zu den Templates (`isFav?'liked'`/`'active'`). Galerie-Pfeil-Labels „Vorheriges/Nächstes Bild" konsistent in app-shell (plb-nav) und app.js (gallery-arrow).
