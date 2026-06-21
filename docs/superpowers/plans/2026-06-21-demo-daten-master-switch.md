# Demo-Daten Master-Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den bestehenden Admin-Switch (`/admin/hide-demo` → `window.EB_HIDE_DEMO`) zur einzigen Steuerung *aller* Demo-Daten (Listings/Chats/Events) machen und die Startseiten-Marketing-Zahlen dynamisch aus den sichtbaren Daten berechnen.

**Architecture:** Ein zentraler Helper `demoVisible()` (= `!window.EB_HIDE_DEMO`) ersetzt die verstreuten Ad-hoc-Bedingungen. Chats und Events werden zusätzlich darüber gegated; `updateHeroStats()` berechnet Dienstleister-Zahl und Ø-Bewertung aus `filterDemos(LISTINGS)` (folgt dem Switch automatisch) und schreibt sie in Badge-Elemente mit stabilen IDs in `index.html` + `index.php`.

**Tech Stack:** Vanilla-JS-SPA (`app.js`, ~21k Zeilen), WordPress-Shells `index.html`/`index.php`. **Kein Test-Harness** im Projekt → Verifikation per `node ~/node-v22/bin/node --check app.js` (Syntax) und manuellem/Live-Test. Demo-Arrays bleiben erhalten (nur Gating zentralisieren).

**Spec:** `docs/superpowers/specs/2026-06-21-demo-daten-master-switch-design.md`

---

## File Structure

- **Modify `app.js`** — neuer Helper `demoVisible()`, neue Funktion `updateHeroStats()`, Gating in `renderChatList`, im Events-Else-Zweig, Call-Sites in `loadDbListings`, `case 'home'`, `adminToggleHideDemo`.
- **Modify `index.html`** — stabile IDs an die Hero-Badges + Hero-Sub.
- **Modify `index.php`** — identische ID-Änderungen (Shells synchron halten).

Hinweis: Beide Shells haben **identisches** Badge-Markup — dieselben Edits in beiden.

---

### Task 1: Master-Helper `demoVisible()`

**Files:**
- Modify: `app.js` (nach Zeile 86, direkt nach der `window.EB_HIDE_DEMO`-Zuweisung)

- [ ] **Step 1: Helper einfügen**

Finde diese Zeile (app.js:86):

```js
window.EB_HIDE_DEMO = (typeof window.EB_HIDE_DEMO !== 'undefined') ? !!window.EB_HIDE_DEMO : true;
```

Füge **direkt darunter** ein:

```js
// Einzige Quelle der Wahrheit für die Sichtbarkeit ALLER Demo-Daten
// (Listings, Chats, Events, Marketing-Zahlen). Folgt dem Admin-Switch.
function demoVisible() { return !window.EB_HIDE_DEMO; }
```

- [ ] **Step 2: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#5 demoVisible() Master-Helper für Demo-Sichtbarkeit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Demo-Chats an den Switch koppeln

**Files:**
- Modify: `app.js` (`renderChatList`, ~Zeile 4877)

- [ ] **Step 1: Gating einfügen**

Finde in `renderChatList` (app.js:4877–4879):

```js
  if (!isLoggedIn) {
    // Show demo chats for non-logged-in users
    list.innerHTML = DEMO_CHATS.map(function(c) {
```

Ersetze durch:

```js
  if (!isLoggedIn) {
    if (!demoVisible()) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-light);">Melde dich an, um Chats zu sehen.</div>';
      return;
    }
    // Show demo chats for non-logged-in users
    list.innerHTML = DEMO_CHATS.map(function(c) {
```

- [ ] **Step 2: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#5 Demo-Chats nur bei demoVisible(); sonst Login-CTA

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Demo-Events an den Switch koppeln

**Files:**
- Modify: `app.js` (Events-Else-Zweig, ~Zeile 8493)

- [ ] **Step 1: Gating einfügen**

Finde (app.js:8493–8496):

```js
    } else {
      if (previewBannerEP) previewBannerEP.style.display = 'flex';
      var events = DEMO_EVENTS;
      renderEventGrid(events);
    }
```

Ersetze durch:

```js
    } else {
      if (demoVisible()) {
        if (previewBannerEP) previewBannerEP.style.display = 'flex';
        renderEventGrid(DEMO_EVENTS);
      } else {
        if (previewBannerEP) previewBannerEP.style.display = 'none';
        renderEventGrid([]);
      }
    }
```

- [ ] **Step 2: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#5 Demo-Events nur bei demoVisible(); sonst leeres Grid

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Badge-IDs in beide Shells

**Files:**
- Modify: `index.html` (~Zeile 616, 649, 651)
- Modify: `index.php` (~Zeile 1029, 1062, 1064)

- [ ] **Step 1: Hero-Sub in `index.html`**

Finde:

```html
          <p class="ai-hero-sub">150+ Dienstleister · Sofort kontaktierbar · Top bewertet</p>
```

Ersetze durch:

```html
          <p class="ai-hero-sub"><span id="heroSubProviders">150+ Dienstleister</span> · Sofort kontaktierbar · <span id="heroSubRated">Top bewertet</span></p>
```

- [ ] **Step 2: Stat-Badges in `index.html`**

Finde:

```html
            <span><strong>150+</strong> Dienstleister</span>
            <span class="ai-stat-dot">·</span>
            <span><strong>4.8★</strong> Ø Bewertung</span>
```

Ersetze durch:

```html
            <span><strong id="statProviders">150+</strong> Dienstleister</span>
            <span class="ai-stat-dot">·</span>
            <span id="statRatingItem"><strong id="statRating">4.8★</strong> Ø Bewertung</span>
```

- [ ] **Step 3: Identische Änderungen in `index.php`**

Wende die **exakt gleichen** drei Ersetzungen aus Step 1+2 auf `index.php` an (gleiche Quelltext-Zeilen, ~1029 für die Hero-Sub und ~1062/1064 für die Stat-Badges).

- [ ] **Step 4: Verifizieren, dass die IDs in beiden Shells stehen**

Run: `grep -c 'id="statProviders"\|id="statRating"\|id="heroSubProviders"' index.html index.php`
Expected: jede Datei meldet `3`.

- [ ] **Step 5: Commit**

```bash
git add index.html index.php
git commit -m "#5 Stabile IDs an Hero-Marketing-Badges (beide Shells synchron)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `updateHeroStats()` berechnet die Zahlen

**Files:**
- Modify: `app.js` (neue Funktion direkt nach `demoVisible()` aus Task 1, ~Zeile 89)

- [ ] **Step 1: Funktion einfügen**

Füge direkt nach der `demoVisible()`-Funktion ein:

```js
// Berechnet die Startseiten-Marketing-Zahlen aus dem SICHTBAREN Listing-Set
// (filterDemos respektiert window.EB_HIDE_DEMO → Zahlen folgen dem Switch).
function updateHeroStats() {
  var visible = filterDemos(Array.isArray(LISTINGS) ? LISTINGS.slice() : []);
  var providerIds = {};
  var ratedSum = 0, ratedCount = 0;
  visible.forEach(function(l) {
    if (!l) return;
    var pid = l.providerId != null ? l.providerId : (l.provider && l.provider.id);
    if (pid != null) providerIds[pid] = true;
    var r = parseFloat(l.rating);
    if (r > 0) { ratedSum += r; ratedCount++; }
  });
  var providerCount = Object.keys(providerIds).length;
  if (providerCount === 0) providerCount = visible.length; // Fallback: Listings zählen

  var elProv = document.getElementById('statProviders');
  if (elProv) elProv.textContent = String(providerCount);
  var elSub = document.getElementById('heroSubProviders');
  if (elSub) elSub.textContent = providerCount + ' Dienstleister';

  var elRatingItem = document.getElementById('statRatingItem');
  if (elRatingItem) {
    if (ratedCount > 0) {
      var avg = Math.round((ratedSum / ratedCount) * 10) / 10;
      elRatingItem.innerHTML = '<strong id="statRating">' + avg.toFixed(1) + '★</strong> Ø Bewertung';
    } else {
      elRatingItem.innerHTML = '<strong id="statRating">Neu</strong>';
    }
  }
  var elSubRated = document.getElementById('heroSubRated');
  if (elSubRated) elSubRated.textContent = ratedCount > 0 ? 'Top bewertet' : 'Neu gestartet';
}
```

- [ ] **Step 2: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#5 updateHeroStats(): dynamische Dienstleister-Zahl + Ø-Bewertung

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `updateHeroStats()` an Call-Sites verdrahten

**Files:**
- Modify: `app.js` (`loadDbListings` ~Z.1054, `case 'home'` ~Z.1324, `adminToggleHideDemo` ~Z.8959)

- [ ] **Step 1: Nach DB-Load (in `loadDbListings`)**

Finde (app.js:1054, innerhalb `loadDbListings`):

```js
    try { renderHeroMarquees(); } catch (err) { console.error('Fehler beim Rendern der Hero-Marquee nach Daten-Ladung', err); }
```

Füge **direkt darunter** ein:

```js
    try { updateHeroStats(); } catch (err) { /* Stats optional */ }
```

- [ ] **Step 2: Beim Home-Render (`case 'home'`)**

Finde (app.js:1324):

```js
      try { renderHeroMarquees(); } catch (err) { console.error('Fehler renderHeroMarquees in navigateTo(home)', err); }
```

Füge **direkt darunter** ein:

```js
      try { updateHeroStats(); } catch (err) { /* Stats optional */ }
```

- [ ] **Step 3: Beim Admin-Umschalten (`adminToggleHideDemo`)**

Finde (app.js, im `.then(function(d){…}`-Block, ~Z.8964):

```js
    try { renderHeroMarquees(); } catch(e) {}
    try { renderBrowseGrid(LISTINGS); } catch(e) {}
```

Füge **direkt darunter** (nach der `renderBrowseGrid`-Zeile) ein:

```js
    try { updateHeroStats(); } catch(e) {}
```

- [ ] **Step 4: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "#5 updateHeroStats() an Call-Sites: DB-Load, Home-Render, Admin-Toggle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Lokaler Smoke-Test, Deploy, Live-Verifikation

**Files:** keine

- [ ] **Step 1: Finaler Syntax-Check**

Run: `~/node-v22/bin/node --check app.js`
Expected: Exit 0.

- [ ] **Step 2: Lokaler Smoke-Test**

Run: `python3 -m http.server 8000` (im Repo-Root), dann im Browser `http://localhost:8000`.
Prüfen: Startseite lädt, keine JS-Fehler in der Konsole, Hero-Badges zeigen Zahlen.
(Hinweis: API-Calls schlagen lokal fehl — das ist erwartet; `LISTINGS`-Demo dient als Datenbasis.)

- [ ] **Step 3: Rebase auf origin/main + Deploy**

```bash
git fetch origin && git rebase origin/main
~/node-v22/bin/node --check app.js   # nach Rebase erneut
git push origin main
```

- [ ] **Step 4: Live-Verifikation (nach Deploy)**

Als Admin einloggen und den „Testdaten ein-/ausblenden"-Switch betätigen. Bei **ausgeblendet** prüfen:
- Keine Demo-Listings mehr.
- Chat-Liste (ausgeloggt) zeigt Login-CTA statt Demo-Chats.
- Event-Preview leer statt Demo-Events.
- Hero zeigt echte Dienstleister-Zahl und „Neu" statt „4.8★", Hero-Sub „Neu gestartet".

Bei **eingeblendet**: Demo-Listings/Chats/Events sichtbar, Zahlen inkl. Demo.

Schnell-Check der Live-Startseite (ausgeblendeter Zustand, Erwartung: kein „150+"):

```bash
curl -s https://xn--eventbrse-57a.de/ | grep -oE 'id="statProviders"[^<]*<[^>]*>[0-9]+|150\+'
```

---

## Self-Review

**Spec-Coverage:**
- Master-Helper → Task 1 ✓
- Chats gegated → Task 2 ✓ (CTA „Melde dich an, um Chats zu sehen")
- Events gegated → Task 3 ✓
- Dynamische Zahlen (distinct providerId, Ø rating>0, „Neu" wenn keine) → Task 5 ✓
- Hero-Sub dynamisch + „Neu gestartet" → Task 5 (`heroSubRated`) ✓
- IDs in beiden Shells → Task 4 ✓
- Kopplung an Switch (folgt automatisch via filterDemos) → Task 5 + Verdrahtung Task 6 ✓
- Demo-Arrays bleiben → keine Löschung in irgendeinem Task ✓
- Verifikation node --check + Live-Toggle → Task 7 ✓

**Placeholder-Scan:** keine TBD/TODO; jeder Code-Step zeigt vollständigen Code.

**Typ-/Namens-Konsistenz:** IDs `statProviders`, `statRating`, `statRatingItem`, `heroSubProviders`, `heroSubRated` in Task 4 (Markup) und Task 5 (JS) identisch. `demoVisible()`/`updateHeroStats()` in Task 1/5 definiert, in Task 2/3/6 verwendet. `filterDemos`/`providerId`/`rating` existieren bereits in app.js (verifiziert).
