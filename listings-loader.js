```javascript
/**
 * listings-loader.js — Ersetzt Demo-Daten durch echte DB-Calls
 *
 * Wird nach app.js geladen (index.html + index.php).
 * Leert LISTINGS[] sofort und implementiert loadDbListings() neu.
 */
(function () {
    'use strict';

    // ── Schritt 1: Demo-Daten sofort leeren ───────────────────────────────
    // LISTINGS ist var im global scope von app.js → window.LISTINGS
    if (Array.isArray(window.LISTINGS)) {
        window.LISTINGS.splice(0, window.LISTINGS.length);
    }

    // ── Schritt 2: loadDbListings() neu implementieren ────────────────────
    /**
     * Lädt Listings vom Backend und füllt globales LISTINGS-Array.
     *
     * @param {Object}   params
     * @param {string}   [params.category]
     * @param {string}   [params.location]
     * @param {string}   [params.search