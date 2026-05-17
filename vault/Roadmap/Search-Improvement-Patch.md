````markdown
# Suchfunktion Verbesserung — Patch-Dokumentation

> Status: Bereit zur Integration | Typ: Server-side Search
> Betroffene Dateien: `functions.php`, `app.js`

## Ziel

Ersetze client-seitige Array-Filterung durch server-seitige MySQL-Suche.
Suchparameter werden als Query-String an `GET /listings` übergeben.

---

## 1. functions.php — Listings-Endpoint erweitern

### Suche: Den Callback der Route `GET /listings` ersetzen

**Suchstring in functions.php:** `'eb_get_listings'` oder `GET /listings` Callback-Funktion.

Ersetze den gesamten Callback der `GET /listings` Route durch folgenden Code:

```php
function eb_get_listings(WP_REST_Request $request) {
    global $wpdb;
    $table = $wpdb->prefix . 'eb_listings';

    // --- Parameter ---
    $search    = sanitize_text_field($request->get_param('search') ?? '');
    $category  = sanitize_text_field($request->get_param('category') ?? '');
    $location  = sanitize_text_field($request->get_param('location') ?? '');
    $price_min = floatval($request->get_param('price_min') ?? 0);
    $price_max = floatval($request->get_param('price_max') ?? 0);
    $sort      = sanitize_text_field($request->get_param('sort') ?? 'newest');
    $page      = max(1, intval($request->get_param('page') ?? 1));
    $per_page  = min(50, max(1, intval($request->get_param('per_page') ?? 20)));
    $offset    = ($page - 1) * $per_page;

    // --- WHERE-Bedingungen ---
    $where   = ['status = %s'];
    $params  = ['active'];

    if ($search !== '') {
        $like = '%' . $wpdb->esc_like($search) . '%';
        $where[] = '(title LIKE %s OR description LIKE %s OR tags LIKE %s)';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if ($category !== '' && $category !== 'alle') {
        $where[] = 'category = %s';
        $params[] = $category;
    }

    if ($location !== '') {
        $like = '%' . $wpdb->esc_like($location) . '%';
        $where[] = '(location LIKE %s OR region LIKE %s)';
        $params[] = $like;
        $params[] = $like;
    }

    if ($price_min > 0) {
        $where[] = 'price_value >= %f';
        $params[] = $price_min;
    }

    if ($price_max > 0) {
        $where[] = 'price_value <= %f';
        $params[] = $price_max;
    }

    $where_sql = 'WHERE ' . implode(' AND ', $where);

    // --- ORDER BY ---
    $order_sql = match($sort) {
        'price_asc'  => 'ORDER BY price_value ASC',
        'price_desc' => 'ORDER BY price_value DESC',
        'rating'     => 'ORDER BY rating_avg DESC',
        'oldest'     => 'ORDER BY created_at ASC',
        default      => 'ORDER BY created_at DESC',  // newest
    };

    // --- Count für Pagination ---
    $count_sql = $wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} {$where_sql}",
        ...$params
    );
    $total = (int) $wpdb->get_var($count_sql);

    // --- Listings laden ---
    $sql = $wpdb->prepare(
        "SELECT * FROM {$table} {$where_sql} {$order_sql} LIMIT %d OFFSET %d",
        ...array_merge($params, [$per_page, $offset])
    );
    $rows = $wpdb->get_results($sql, ARRAY_A);

    if ($rows === null) {
        return new WP_Error('db_error', 'Datenbankfehler', ['status' => 500]);
    }

    // --- JSON-Felder dekodieren ---
    $listings = array_map(function($row) {
        foreach (['images', 'features', 'tags'] as $field) {
            if (isset($row[$field])) {
                $decoded = json_decode($row[$field], true);
                $row[$field] = is_array($decoded) ? $decoded : [];
            }
        }
        return $row;
    }, $rows);

    return rest_ensure_response([
        'listings'   => $listings,
        'total'      => $total,
        'page'       => $page,
        'per_page'   => $per_page,
        'pages'      => (int) ceil($total / $per_page),
    ]);
}
```

**Wichtig:** Falls `price_value` noch nicht als eigene Spalte in `wp_eb_listings` existiert, 
muss sie entweder hinzugefügt oder der Preis aus `price_label` extrahiert werden.
Migration: `ALTER TABLE wp_eb_listings ADD COLUMN price_value DECIMAL(10,2) DEFAULT 0;`

---

## 2. app.js — Browse-Filter Server-seitig machen

### 2a. `loadDbListings()` mit Parametern

**Suche:** `function loadDbListings` oder `loadDbListings`

Ersetze durch:

```javascript
async function loadDbListings(params) {
    params = params || {};
    try {
        var query = Object.keys(params)
            .filter(function(k) { return params[k] !== '' && params[k] !== null && params[k] !== undefined; })
            .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
            .join('&');
        var url = _apiUrl('listings') + (query ? '?' + query : '');
        var res = await fetch(url, { headers: _apiHeaders() });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        // API gibt jetzt { listings, total, page, pages } zurück
        return Array.isArray(data) ? data : (data.listings || []);
    } catch(e) {
        console.error('loadDbListings error:', e);
        return [];
    }
}
```

### 2b. Browse-Filter anpassen

**Suche:** `function applyBrowseFilters` oder den Bereich wo Kategorie/Location/Preis-Filter angewendet werden.

Der Filter soll keinen `LISTINGS`-Array mehr client-seitig filtern, sondern `loadDbListings()` mit Parametern aufrufen:

```javascript
async function applyBrowseFilters() {
    // UI-Werte auslesen (Selektoren an tatsächliche IDs anpassen)
    var search    = (document.getElementById('browse-search') || {}).value || '';
    var category  = (document.getElementById('browse-category') || {}).value || '';
    var location  = (document.getElementById('browse-location') || {}).value || '';
    var price_min = (document.getElementById('browse-price-min') || {}).value || '';
    var price_max = (document.getElementById('browse-price-max') || {}).value || '';
    var sort      = (document.getElementById('browse-sort') || {}).value || 'newest';

    showBrowseLoader(true);  // Ladeanzeige einschalten (falls vorhanden)

    var listings = await loadDbListings({
        search:    search,
        category:  category,
        location:  location,
        price_min: price_min,
        price_max: price_max,
        sort:      sort,
        page:      1,
        per_page:  24
    });

    renderListingsGrid(listings);  // bestehende Render-Funktion wiederverwenden
    showBrowseLoader(false);
}
```

**Event-Handler:** Suchfeld, Dropdowns und Preis-Inputs feuern `applyBrowseFilters()`.
- Suchfeld: `input`-Event mit 400ms Debounce
- Dropdowns/Selects: `change`-Event sofort

```javascript
// Debounce-Helper (falls noch nicht vorhanden)
function debounce(fn, ms) {
    var timer;
    return function() {
        clearTimeout(timer);
        var args = arguments;
        var ctx = this;
        timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
}

// Einmalig beim Browse-Page-Init aufrufen:
function initBrowseSearch() {
    var searchInput = document.getElementById('browse-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyBrowseFilters, 400));
    }
    ['browse-category', 'browse-location', 'browse-sort'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', applyBrowseFilters);
    });
    ['browse-price-min', 'browse-price-max'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', debounce(applyBrowseFilters, 600));
    });
}
```

---

## Integration-Checkliste

- [ ] `functions.php`: `eb_get_listings` Callback ersetzen
- [ ] DB-Migration: `price_value`-Spalte prüfen/hinzufügen (falls nötig)
- [ ] `app.js`: `loadDbListings()` Parameter-fähig machen
- [ ] `app.js`: `applyBrowseFilters()` auf Server-Calls umstellen
- [ ] `app.js`: Debounce-Helper prüfen (evtl. schon vorhanden)
- [ ] `app.js`: Browse-Init-Funktion um `initBrowseSearch()` erweitern
- [ ] Test: Suche nach "DJ Berlin" → nur Berliner DJs
- [ ] Test: Kategorie-Filter → korrekter API-Parameter
- [ ] Test: Leere Suche → alle aktiven Listings (max 24)
- [ ] Test: Pagination: `page=2` liefert nächste 24

---

## Risiken

| Risiko | Mitigation |
|--------|-----------|
| `price_value`-Spalte fehlt | Migration-SQL oben ausführen, oder Preisfilter vorerst weglassen |
| Element-IDs weichen ab | IDs aus dem echten HTML prüfen und anpassen |
| `match()` PHP 8.0+ only | Shared Hosting läuft PHP 8.1 (laut Stack-Doku) — OK |
| Bestehende client-seitige Filter-Aufrufe | Alle Stellen finden die `LISTINGS.filter()` auf