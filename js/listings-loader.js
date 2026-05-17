```javascript
/**
 * listings-loader.js
 * Replaces hardcoded LISTINGS demo data with real DB calls.
 * Loaded after app.js. Overrides LISTINGS and loadDbListings().
 *
 * Load order: app.js → listings-loader.js
 */
(function() {
    'use strict';

    // ── 1. Clear demo data immediately ──────────────────────────────────────
    if (typeof LISTINGS !== 'undefined') {
        LISTINGS.length = 0; // empty in-place (preserves reference)
    }

    // ── 2. Real loadDbListings() ─────────────────────────────────────────────
    /**
     * Loads listings from REST API and populates global LISTINGS array.
     *
     * @param {Object}   params           - Filter params (all optional)
     * @param {string}   params.category  - Category slug e.g. 'dj'
     * @param {string}   params.location  - Location string
     * @param {string}   params.search    - Full-text search term
     * @param {number}   params.min_price
     * @param {number}   params.max_price
     * @param {number}   params.page      - Pagination page (default 1)
     * @param {number}   params.per_page  - Items per page (default 20)
     * @param {boolean}  params.replace   - If false, append instead of replace
     * @param {Function} callback         - cb(error, listings)
     */
    window.loadDbListings = function loadDbListings(params, callback) {
        params = params || {};

        var query = [];
        if (params.category)  query.push('category='  + encodeURIComponent(params.category));
        if (params.location)  query.push('location='  + encodeURIComponent(params.location));
        if (params.search)    query.push('search='    + encodeURIComponent(params.search));
        if (params.min_price !== undefined) query.push('min_price=' + encodeURIComponent(params.min_price));
        if (params.max_price !== undefined) query.push('max_price=' + encodeURIComponent(params.max_price));
        if (params.page)      query.push('page='      + encodeURIComponent(params.page));
        if (params.per_page)  query.push('per_page='  + encodeURIComponent(params.per_page || 20));

        // _apiUrl() and _apiHeaders() are defined in app.js
        var url = (typeof _apiUrl === 'function' ? _apiUrl('listings') : '/wp-json/eventboerse/v1/listings');
        if (query.length) url += '?' + query.join('&');

        var headers = (typeof _apiHeaders === 'function' ? _apiHeaders() : {});

        fetch(url, { headers: headers, credentials: 'same-origin' })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ' beim Laden der Listings');
                }
                return response.json();
            })
            .then(function(data) {
                // Normalize: API may return array or { listings: [], total: n }
                var listings = Array.isArray(data)
                    ? data
                    : (data.listings || data.items || data.data || []);

                var replace = params.replace !== false; // default: replace
                if (replace) {
                    LISTINGS.length = 0;
                    listings.forEach(function(l) { LISTINGS.push(l); });
                } else {
                    listings.forEach(function(l) { LISTINGS.push(l); });
                }

                if (typeof callback === 'function') callback(null, listings);
            })
            .catch(function(err) {
                console.error('[loadDbListings]', err);
                if (typeof callback === 'function') callback(err, []);
            });
    };

    // ── 3. Hook into app init: load listings on DOMContentLoaded ────────────
    // Wait for app.js to finish its own DOMContentLoaded setup, then load.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initListingsLoader);
    } else {
        // DOMContentLoaded already fired
        setTimeout(_initListingsLoader, 0);
    }

    function _initListingsLoader() {
        // Small delay so app.js DOMContentLoaded handler runs first
        setTimeout(function() {
            loadDbListings({}, function(err, listings) {
                if (err) {
                    console.warn('[listings-loader] Initial load failed, demo data stays empty.', err);
                    return;
                }
                console.info('[listings-loader] Loaded ' + listings.length + ' listings from DB.');

                // If browse page is active, re-render it with real data
                if (typeof renderBrowsePage === 'function') {
                    var browsePage = document.getElementById('page-browse');
                    if (browsePage && browsePage.classList.contains('active')) {
                        renderBrowsePage();
                    }
                }

                // If home page is active, refresh featured listings
                if (typeof renderHomePage === 'function') {
                    var homePage = document.getElementById('page-home');
                    if (homePage && homePage.classList.contains('active')) {
                        renderHomePage();
                    }
                }

                // Trigger custom event so any other module can react
                document.dispatchEvent(new CustomEvent('listingsLoaded', { detail: { count: listings.length } }));
            });
        }, 50);
    }

})();
```

---

Warte — das ist immer noch nicht der richtige Weg, weil `LISTINGS` eine `var` in `app.js` ist und von außen via `window.LISTINGS` erreichbar sein muss (nicht bei `var` im Global-Scope eines Scripts garantiert wenn strict mode aktiv ist, aber ohne Module in Vanilla JS ist `var` auf Top-Level = `window.LISTINGS`).

Lass mich den **richtigen, sauberen Weg** gehen: Ich ändere direkt `app.js` an den relevanten Stellen. Ich gebe jetzt den präzisen Plan aus und liefere `app.js` als vollständigen Block — aber da 14k Zeilen unlesbar wären, gebe ich den **gesamten relevanten geänderten Bereich** zusammen mit dem Hinweis welche Zeilen unverändert bleiben.

**Nach nochmaliger Überlegung:** Der sicherste, nachvollziehbarste Ansatz für dieses Projekt ist:

1. `app.js`: LISTINGS-Array leeren + `loadDbListings()` implementieren
2. Kein extra File — bleibt bei einer Datei

Da mir der vollständige `app.js`-Quelltext nicht vorliegt, aber die Vault-Angaben präzise genug sind, wähle ich **Option: Separates Script** — das ist bewusst kein Over-Engineering, sondern ein sicherer, reversibler Eingriff ohne den Monolithen zu destabilisieren.

Hier die finale, vollständige Lieferung:

---