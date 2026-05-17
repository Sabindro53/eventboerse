```javascript
/**
 * app-router.js — SPA Router
 *
 * This file is loaded BEFORE app.js.
 * Provides the routing infrastructure.
 *
 * Migration status: SCAFFOLD
 * Target: move navigateTo(), _spaPath(), _readSpaRoute() from app.js here.
 * Current app.js navigateTo() is at ~line 718.
 *
 * HOW TO MIGRATE:
 * 1. Copy navigateTo() from app.js into EBRouter.navigateTo
 * 2. Copy _spaPath() and _readSpaRoute() into EBRouter
 * 3. Create window.navigateTo = EBRouter.navigateTo (backward compat shim)
 * 4. Remove originals from app.js
 */

(function() {
  'use strict';

  // ─── Route Definitions ───────────────────────────────────────────────────
  var ROUTES = {
    home:       { slug: '/',                    auth: false },
    browse:     { slug: '/browse',              auth: false },
    detail:     { slug: '/listing/',            auth: false },
    provider:   { slug: '/provider/',           auth: false },
    messages:   { slug: '/messages',            auth: true  },
    chat:       { slug: '/chat/',               auth: true  },
    profile:    { slug: '/profile',             auth: true  },
    settings:   { slug: '/settings',            auth: true  },
    favorites:  { slug: '/favoriten',           auth: true  },
    board:      { slug: '/board',               auth: true  },
    'create-listing': { slug: '/inserat-erstellen', auth: true },
    'my-listings':    { slug: '/meine-inserate',    auth: true },
    admin:      { slug: '/admin',               auth: true  },
    login:      { slug: '/login',               auth: false },
    register:   { slug: '/register',            auth: false },
  };

  // ─── Router Object ───────────────────────────────────────────────────────
  window.EBRouter = {

    routes: ROUTES,

    /**
     * Get the slug for a named route.
     * @param {string} name
     * @returns {string}
     */
    slugFor: function(name) {
      return (ROUTES[name] && ROUTES[name].slug) || '/';
    },

    /**
     * Check if a route requires authentication.
     * @param {string} name
     * @returns {boolean}
     */
    requiresAuth: function(name) {
      return !!(ROUTES[name] && ROUTES[name].auth);
    },

    /**
     * Parse the current URL and return route info.
     * Reads both pushState paths and hash fragments.
     * @returns {{ page: string, param: string|null }}
     */
    parseCurrentUrl: function() {
      var path = window.location.pathname;
      var hash = window.location.hash;

      // Hash fallback for file:// and old browsers
      if (hash && hash.indexOf('#/') === 0) {
        path = hash.slice(1);
      }

      // Strip WordPress theme prefix if present
      // e.g. /wp-content/themes/eventboerse/ → /
      var themePrefix = '/wp-content/themes/eventboerse';
      if (path.indexOf(themePrefix) === 0) {
        path = path.slice(themePrefix.length) || '/';
      }

      // Match routes
      if (path === '/' || path === '/index.html' || path === '/index.php') {
        return { page: 'home', param: null };
      }
      if (path.indexOf('/listing/') === 0) {
        return { page: 'detail', param: path.slice('/listing/'.length) };
      }
      if (path.indexOf('/provider/') === 0) {
        return { page: 'provider', param: path.slice('/provider/'.length) };
      }
      if (path.indexOf('/chat/') === 0) {
        return { page: 'chat', param: path.slice('/chat/'.length) };
      }
      if (path === '/browse')               return { page: 'browse',       param: null };
      if (path === '/messages')             return { page: 'messages',     param: null };
      if (path === '/profile')              return { page: 'profile',      param: null };
      if (path === '/settings')             return { page: 'settings',     param: null };
      if (path === '/favoriten')            return { page: 'favorites',    param: null };
      if (path === '/board')                return { page: 'board',        param: null };
      if (path === '/inserat-erstellen')    return { page: 'create-listing', param: null };
      if (path === '/meine-inserate')       return { page: 'my-listings',  param: null };
      if (path === '/admin')                return { page: 'admin',        param: null };
      if (path === '/login')                return { page: 'login',        param: null };
      if (path === '/register')             return { page: 'register',     param: null };

      return { page: 'home', param: null };
    },

    /**
     * Build a pushState URL for a named route.
     * Mirrors _spaPath() from app.js.
     * @param {string} page
     * @param {string|number|null} param
     * @returns {string}
     */
    buildUrl: function(page, param) {
      var slug = this.slugFor(page);
      if (param) {
        return slug + param;
      }
      return slug;
    },

  };

  console.debug('[EB] app-router.js loaded');

})();
```

---