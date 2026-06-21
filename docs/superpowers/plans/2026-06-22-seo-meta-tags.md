# SEO-Meta-Tags je Seite (#4c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Korrektes, eindeutiges Meta (Titel/Description/canonical/OG) je Seite — server-seitig (richtige Domain, `/detail/`-Route) und client-seitig (`document.title` bei SPA-Navigation).

**Architecture:** Drei Fixes in zwei Dateien. `index.php` (Server-Template): Domain aus `home_url()` statt Hardcode (Bug A) und `/detail/{id+10000}`-Route erkennen → bestehender Listing-Meta-Block greift (Bug B). `app.js`: Helper `_setPageMeta(page,data)` setzt `document.title`+`meta[description]` je Route, verdrahtet in `navigateTo` und `loadDetail` (Bug C).

**Tech Stack:** WordPress-PHP-Template `index.php`, Vanilla-JS-SPA `app.js`. **Kein Test-Harness** → Verifikation per `php -l`, `~/node-v22/bin/node --check` und Live-`curl`.

**Spec:** `docs/superpowers/specs/2026-06-22-seo-meta-tags-design.md`

---

## File Structure

- **Modify `index.php`** — Z.31 Domain (`home_url()`); Routen-Block Z.17ff (`/detail/`); Listing-canonical Z.63.
- **Modify `app.js`** — neuer Helper `_setPageMeta()` bei den Routing-Helfern (~nach `_readSpaRoute`); Call in `navigateTo` (Ende) und `loadDetail` (nach `currentListing = listing;`).

---

### Task 1: Bug A — Domain aus `home_url()` (index.php)

**Files:**
- Modify: `index.php` (Z.31)

- [ ] **Step 1: Hardcodierte Domain ersetzen**

Finde:

```php
$site_url    = 'https://xn--eventbrse-q5a.de'; // IDN: eventbörse.de
```

Ersetze durch:

```php
$site_url    = rtrim( home_url(), '/' ); // IDN-Domain aus WP — nie hardcoden (vermeidet falsches Punycode)
```

- [ ] **Step 2: PHP-Lint**

Run: `php -l index.php`
Expected: `No syntax errors detected in index.php`

- [ ] **Step 3: Commit**

```bash
git add index.php
git commit -m "#4c-A Server-Meta-Domain aus home_url() statt falschem Hardcode

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Bug B — `/detail/{id+10000}` server-seitig erkennen (index.php)

**Files:**
- Modify: `index.php` (Routen-Block Z.17ff + Listing-canonical Z.63)

- [ ] **Step 1: `/detail/`-Branch vor `/listing/` einfügen**

Finde:

```php
if ( preg_match('#^/listing/(\d+)#', $request_uri, $m) ) {
    $listing_id = (int) $m[1];
    $page_type  = 'listing';
} elseif ( preg_match('#^/provider/(\d+)#', $request_uri, $m) ) {
```

Ersetze durch:

```php
if ( preg_match('#^/detail/(\d+)#', $request_uri, $m) ) {
    $url_id     = (int) $m[1];
    $listing_id = $url_id > 10000 ? $url_id - 10000 : $url_id; // Frontend nutzt +10000-Offset
    $page_type  = 'listing';
} elseif ( preg_match('#^/listing/(\d+)#', $request_uri, $m) ) {
    $listing_id = (int) $m[1];
    $page_type  = 'listing';
} elseif ( preg_match('#^/provider/(\d+)#', $request_uri, $m) ) {
```

- [ ] **Step 2: Listing-canonical auf `/detail/` umstellen**

Finde:

```php
        $canonical   = $site_url . '/listing/' . $listing_id;
```

Ersetze durch:

```php
        $canonical   = $site_url . '/detail/' . ( 10000 + $listing_id );
```

- [ ] **Step 3: PHP-Lint**

Run: `php -l index.php`
Expected: `No syntax errors detected in index.php`

- [ ] **Step 4: Commit**

```bash
git add index.php
git commit -m "#4c-B Server erkennt /detail/{id+10000}; canonical auf /detail/

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Bug C — `_setPageMeta()` Helper (app.js)

**Files:**
- Modify: `app.js` (neuer Helper direkt vor dem `// Prevent href="#"`-Kommentar, nach `_readSpaRoute`)

- [ ] **Step 1: Helper einfügen**

Finde:

```js
// Prevent href="#" from appending "#" to clean URLs
```

Füge **direkt davor** ein:

```js
// Setzt document.title + meta[description] je SPA-Route (#4c). Templates
// spiegeln die Server-Vorlagen in index.php für Konsistenz.
function _setPageMeta(page, data) {
  var base = 'EventBörse';
  var title = base + ' – Dein Event-Marktplatz';
  var desc  = 'Finde DJs, Catering, Fotografen, Locations und mehr für dein nächstes Event.';
  switch (page) {
    case 'browse': title = 'Dienstleister entdecken – ' + base; break;
    case 'detail':
      if (currentListing && currentListing.title) {
        var cat = currentListing.categoryLabel || currentListing.category || '';
        title = currentListing.title + (cat ? ' – ' + cat : '') + ' | ' + base;
        if (currentListing.description) {
          desc = String(currentListing.description).replace(/<[^>]*>/g, '').trim().slice(0, 155);
        }
      }
      break;
    case 'board':    title = 'Eventboard – ' + base; break;
    case 'chat':     title = 'Nachrichten – ' + base; break;
    case 'messages': title = 'Nachrichten – ' + base; break;
    case 'profile':  title = 'Profil – ' + base; break;
    case 'settings': title = 'Einstellungen – ' + base; break;
    case 'admin':    title = 'Admin – ' + base; break;
  }
  document.title = title;
  var md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', desc);
}
```

- [ ] **Step 2: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#4c-C _setPageMeta(): document.title + meta[description] je Route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `_setPageMeta()` verdrahten (app.js)

**Files:**
- Modify: `app.js` (`navigateTo`-Ende + `loadDetail` nach `currentListing = listing;`)

- [ ] **Step 1: Aufruf am Ende von `navigateTo`**

Finde:

```js
  var gf = document.getElementById('globalFooter');
  if (gf) gf.style.display = (page === 'messages') ? 'none' : '';
```

Füge **direkt darunter** ein:

```js
  try { _setPageMeta(page, data); } catch (e) { /* Meta optional */ }
```

- [ ] **Step 2: Aufruf in `loadDetail` (echter Listing-Titel)**

Finde (app.js, in `loadDetail`):

```js
  currentListing = listing;
```

Füge **direkt darunter** ein:

```js
  try { _setPageMeta('detail', listingId); } catch (e) { /* Meta optional */ }
```

- [ ] **Step 3: Syntax prüfen**

Run: `~/node-v22/bin/node --check app.js`
Expected: kein Output (Exit 0).

- [ ] **Step 4: Verdrahtung prüfen (1 Def + 2 Calls = 3)**

Run: `grep -c '_setPageMeta' app.js`
Expected: `3`

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "#4c-C _setPageMeta() verdrahtet in navigateTo + loadDetail

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Verifikation, Deploy, Live-Test

**Files:** keine

- [ ] **Step 1: Finale Lints**

Run: `php -l index.php && ~/node-v22/bin/node --check app.js`
Expected: `No syntax errors detected in index.php` + Exit 0.

- [ ] **Step 2: Rebase auf origin/main + Deploy**

```bash
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst: git rebase origin/main
php -l index.php && ~/node-v22/bin/node --check app.js     # nach evtl. Rebase
git push origin main
```

- [ ] **Step 3: Auf Deploy warten**

Poll bis live (max ~3 min):

```bash
for i in $(seq 1 12); do curl -s --max-time 10 "https://xn--eventbrse-57a.de/detail/10005?cb=$(date +%s)" | grep -q '/detail/10005' && { echo "live"; break; }; echo "warte… ($((i*15))s)"; sleep 15; done
```

- [ ] **Step 4: Live-Verifikation Server-Meta**

```bash
echo "--- /detail/10005 (erwartet: Listing-Titel, Domain 57a, canonical /detail/10005) ---"
curl -s "https://xn--eventbrse-57a.de/detail/10005" | grep -E '<title>|rel="canonical"|og:url|og:title' | head
echo "--- Startseite (erwartet: Domain 57a, NICHT q5a) ---"
curl -s "https://xn--eventbrse-57a.de/" | grep -E 'rel="canonical"|og:url'
```

Erwartung: `<title>` zeigt den echten Listing-Titel (nicht „EventBörse – Dein Event-Marktplatz"), alle URLs `xn--eventbrse-57a.de`, kein `q5a` mehr.

- [ ] **Step 5: Client-Titel manuell prüfen**

Im Browser zwischen Startseite, /browse, einem Detail und /board navigieren → Tab-Titel ändert sich je Seite; Detail zeigt den Listing-Titel.

---

## Self-Review

**Spec-Coverage:**
- Bug A Domain `home_url()` → Task 1 ✓
- Bug B `/detail/`-Route + Offset → Task 2 Step 1 ✓; canonical `/detail/` → Task 2 Step 2 ✓
- Bug C `_setPageMeta` (Titel + meta[description], Detail async) → Task 3 (Def) + Task 4 (navigateTo + loadDetail) ✓
- Nicht-Ziel Provider-Meta → nicht angefasst (nur bestehende /provider/-Erkennung bleibt) ✓
- Verifikation php -l / node --check / live curl → Task 5 ✓

**Placeholder-Scan:** keine TBD/TODO; jeder Code-Step zeigt vollständigen Code.

**Typ-/Namens-Konsistenz:** `_setPageMeta(page, data)` in Task 3 definiert, in Task 4 mit identischer Signatur aufgerufen. `currentListing.title/categoryLabel/category/description` — Felder existieren am Listing-Objekt (API-Felder verifiziert: `categoryLabel`, `title`; `description` an Demo-/DB-Listings). `home_url()` ist im WP-Template verfügbar. `$listing_id`/`$page_type`/`$canonical` existieren bereits im Server-Block.
