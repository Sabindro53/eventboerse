```javascript
/**
 * eb-router.js — SPA Router Module
 * Part of the EventBörse modular refactor.
 *
 * Exposes window.EB.Router
 *
 * Extracted from app.js navigateTo() + _spaPath() + _readSpaRoute() logic.
 * app.js delegates to EB.Router.navigateTo() — the original function stays as
 * a thin wrapper for backward compatibility (existing call sites unchanged).
 *
 * Loaded BEFORE app.js.
 */
(function (global) {
    'use strict';

    // -------------------------------------------------------------------------
    // Route registry
    // All known page tokens mapped to their URL slug and optional init hint.
    // app.js renderX() functions are still responsible for actual rendering.
    // -------------------------------------------------------------------------
    var ROUTES = {
        home:             { slug: '/',                   title: 'Eventbörse – Dein Event-Marktplatz' },
        browse:           { slug: '/browse',             title: 'Dienstleister finden – Eventbörse' },
        detail:           { slug: '/listing/',           title: 'Inserat – Eventbörse' },
        provider:         { slug: '/provider/',          title: 'Profil – Eventbörse' },
        chat:             { slug: '/chat/',              title: 'Nachrichten – Eventbörse' },
        messages:         { slug: '/messages',           title: 'Nachrichten – Eventbörse' },
        board:            { slug: '/board',              title: 'Event-Board – Eventbörse' },
        profile:          { slug: '/profile',            title: 'Mein Profil – Eventbörse' },
        settings:         { slug: '/settings',           title: 'Einstellungen – Eventbörse' },
        admin:            { slug: '/admin',              title: 'Admin – Eventbörse' },
        'my-listings':    { slug: '/meine-inserate',     title: 'Meine Inserate – Eventbörse' },
        'create-listing': { slug: '/inserat-erstellen',  title: 'Inserat erstellen – Eventbörse' },
        favorites:        { slug: '/favoriten',          title: 'Meine Favoriten – Eventbörse' },
        login:            { slug: '/login',              title: 'Anmelden – Eventbörse' },
        register:         { slug: '/registrieren',       title: 'Registrieren – Eventbörse' }
    };

    // -------------------------------------------------------------------------
    // History helpers (extracted from app.js _spaPath / _readSpaRoute)
    // -------------------------------------------------------------------------

    /**
     * Build a canonical URL path for a given page token + optional id.
     * @param {string} page
     * @param {string|number} [id]
     * @returns {string}
     */
    function buildPath(page, id) {
        var route = ROUTES[page];
        if (!route) return '/';
        var slug = route.slug;
        if (id !== undefined && id !== null) {
            // slug already ends with '/' for parameterized routes
            slug = slug + id;
        }
        return slug;
    }

    /**
     * Read the current SPA route from the URL.
     * Returns { page, id } — mirrors _readSpaRoute() in app.js.
     * @returns {{ page: string, id: string|null }}
     */
    function readCurrentRoute() {
        var pathname = global.location.pathname;
        var hash = global.location.hash;

        // Hash-routing fallback (#/browse, #/listing/123)
        if (hash && hash.indexOf('#/') === 0) {
            pathname = hash.slice(1);
        }

        var pageKeys = Object.keys(ROUTES);
        for (var i = 0; i < pageKeys.length; i++) {
            var key = pageKeys[i];
            var slug = ROUTES[key].slug;
            // Parameterized route (ends with /)
            if (slug !== '/' && slug.slice(-1) === '/' && pathname.indexOf(slug) === 0) {
                var id = pathname.slice(slug.length) || null;
                return { page: key, id: id };
            }
            // Exact match
            if (pathname === slug || pathname === slug + '/') {
                return { page: key, id: null };
            }
        }

        // Fallback: home
        return { page: 'home', id: null };
    }

    /**
     * Push a new history entry for a page.
     * @param {string} page
     * @param {string|number} [id]
     * @param {boolean} [replace=false]  use replaceState instead of pushState
     */
    function pushHistory(page, id, replace) {
        var route = ROUTES[page];
        var path = buildPath(page, id);
        var title = (route && route.title) || document.title;
        try {
            if (replace) {
                global.history.replaceState({ page: page, id: id || null }, title, path);
            } else {
                global.history.pushState({ page: page, id: id || null }, title, path);
            }
            document.title = title;
        } catch (e) {
            // Fails on file:// origins during local dev — silently ignore
        }
    }

    // -------------------------------------------------------------------------
    // Navigation lifecycle hooks
    // app.js registers onLeave / onEnter handlers here.
    // -------------------------------------------------------------------------
    var _leaveHandlers = {};
    var _enterHandlers = {};

    function onLeave(page, fn) {
        _leaveHandlers[page] = fn;
    }

    function onEnter(page, fn) {
        _enterHandlers[page] = fn;
    }

    function _runLeave(page) {
        if (_leaveHandlers[page]) {
            try { _leaveHandlers[page](); } catch (e) {
                console.warn('[EB.Router] onLeave error for "' + page + '":', e);
            }
        }
    }

    function _runEnter(page, data) {
        if (_enterHandlers[page]) {
            try { _enterHandlers[page](data); } catch (e) {
                console.warn('[EB.Router] onEnter error for "' + page + '":', e);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Core navigate function
    // This is called by the shim in app.js — keeps all existing call sites.
    // -------------------------------------------------------------------------
    var _currentPage = 'home';
    var _previousPage = null;

    /**
     * Navigate to a page.
     * @param {string}          page
     * @param {*}               [data]         passed to render function / onEnter
     * @param {boolean}         [skipHistory]  don't push history entry
     * @param {function}        [renderFn]     called by app.js shim with (page, data)
     */
    function navigateTo(page, data, skipHistory, renderFn) {
        if (!page) return;

        _runLeave(_currentPage);

        _previousPage = _currentPage;
        _currentPage = page;

        // Update EB.State if available
        if (global.EB && global.EB.State) {
            global.EB.State.set('previousPage', _previousPage);
            global.EB.State.set('currentPage', _currentPage);
        }

        if (!skipHistory) {
            var idForHistory = (data && typeof data !== 'object') ? data