/**
 * eb-state.js — Centralized State Module
 * Part of the EventBörse modular refactor.
 *
 * Exposes window.EB.State — a reactive-ish store using simple getter/setter
 * wrappers. No framework, no proxies (IE11 concern dropped, but keeping it
 * readable). Modules read/write via EB.State.get() / EB.State.set().
 *
 * Loaded BEFORE app.js via functions.php enqueue order.
 */
(function (global) {
    'use strict';

    // -------------------------------------------------------------------------
    // Internal store — mirrors the var declarations in app.js
    // -------------------------------------------------------------------------
    var _store = {
        // Auth
        currentUser: null,          // WP user object from /me
        isLoggedIn: false,

        // Navigation
        currentPage: 'home',
        previousPage: null,

        // Listings / Browse
        allListings: [],            // loaded from DB via loadDbListings()
        currentListing: null,       // detail view
        browseFilters: {
            category: '',
            location: '',
            priceMin: 0,
            priceMax: 99999,
            sort: 'newest'
        },

        // Chat / Messaging
        currentChat: null,          // { conversationId, otherUserId, otherUserName }
        chatPollingInterval: null,  // setInterval reference
        conversations: [],

        // Board (Event-Planer)
        boardProjects: [],          // _boardProjects
        activeBoardId: null,        // _activeBoardId
        boardView: 'kanban',        // 'kanban' | 'flow' | 'timeline' | 'checklist'

        // Favorites
        favorites: [],

        // UI
        mapInstance: null,          // Leaflet map
        stripeInstance: null,       // Stripe.js instance
        toastQueue: [],

        // Misc
        isMobile: false,
        lastActivity: null
    };

    // -------------------------------------------------------------------------
    // Subscriber registry for state changes
    // -------------------------------------------------------------------------
    var _subscribers = {};

    /**
     * Subscribe to a key change.
     * @param {string} key
     * @param {function} fn  called with (newValue, oldValue)
     * @returns {function} unsubscribe
     */
    function subscribe(key, fn) {
        if (!_subscribers[key]) _subscribers[key] = [];
        _subscribers[key].push(fn);
        return function unsubscribe() {
            _subscribers[key] = _subscribers[key].filter(function (f) {
                return f !== fn;
            });
        };
    }

    function _notify(key, newVal, oldVal) {
        var subs = _subscribers[key];
        if (!subs || subs.length === 0) return;
        for (var i = 0; i < subs.length; i++) {
            try {
                subs[i](newVal, oldVal);
            } catch (e) {
                console.error('[EB.State] subscriber error for key "' + key + '":', e);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Get a state value.
     * @param {string} key  dot-notation supported, e.g. 'browseFilters.category'
     * @returns {*}
     */
    function get(key) {
        if (!key) return _store;
        var parts = key.split('.');
        var cur = _store;
        for (var i = 0; i < parts.length; i++) {
            if (cur === null || cur === undefined) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    /**
     * Set a state value.
     * @param {string} key  dot-notation supported
     * @param {*}      val
     */
    function set(key, val) {
        if (!key) return;
        var parts = key.split('.');
        var cur = _store;
        for (var i = 0; i < parts.length - 1; i++) {
            if (cur[parts[i]] === null || typeof cur[parts[i]] !== 'object') {
                cur[parts[i]] = {};
            }
            cur = cur[parts[i]];
        }
        var lastKey = parts[parts.length - 1];
        var oldVal = cur[lastKey];
        cur[lastKey] = val;
        _notify(key, val, oldVal);
    }

    /**
     * Patch multiple keys at once.
     * @param {Object} patch  flat key→value map (dot-notation supported)
     */
    function patch(patchObj) {
        var keys = Object.keys(patchObj);
        for (var i = 0; i < keys.length; i++) {
            set(keys[i], patchObj[keys[i]]);
        }
    }

    /**
     * Reset state to initial values. Used on logout.
     */
    function reset() {
        set('currentUser', null);
        set('isLoggedIn', false);
        set('currentChat', null);
        set('chatPollingInterval', null);
        set('conversations', []);
        set('favorites', []);
        set('allListings', []);
        set('currentListing', null);
        set('boardProjects', []);
        set('activeBoardId', null);
    }

    // -------------------------------------------------------------------------
    // Expose
    // -------------------------------------------------------------------------
    global.EB = global.EB || {};
    global.EB.State = {
        get: get,
        set: set,
        patch: patch,
        reset: reset,
        subscribe: subscribe,
        // Direct access for migration period — app.js can read _store keys
        // by transitioning one-by-one without a big-bang rewrite.
        _raw: _store
    };

}(window));
