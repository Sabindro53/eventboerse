/**
 * eb-router.js — optional SPA router helper.
 *
 * This module is intentionally standalone and safe to include or ignore.
 * It exposes `window.EB.Router` without changing existing app.js behavior.
 */
(function (global) {
  'use strict';

  var ROUTES = {
    home:             { slug: '/',                  title: 'Eventbörse – Dein Event-Marktplatz' },
    browse:           { slug: '/browse',            title: 'Dienstleister finden – Eventbörse' },
    detail:           { slug: '/listing/',          title: 'Inserat – Eventbörse' },
    provider:         { slug: '/provider/',         title: 'Profil – Eventbörse' },
    chat:             { slug: '/chat/',             title: 'Nachrichten – Eventbörse' },
    messages:         { slug: '/messages',          title: 'Nachrichten – Eventbörse' },
    board:            { slug: '/board',             title: 'Event-Board – Eventbörse' },
    profile:          { slug: '/profile',           title: 'Mein Profil – Eventbörse' },
    settings:         { slug: '/settings',          title: 'Einstellungen – Eventbörse' },
    admin:            { slug: '/admin',             title: 'Admin – Eventbörse' },
    'my-listings':    { slug: '/meine-inserate',    title: 'Meine Inserate – Eventbörse' },
    'create-listing': { slug: '/inserat-erstellen', title: 'Inserat erstellen – Eventbörse' },
    favorites:        { slug: '/favoriten',         title: 'Meine Favoriten – Eventbörse' },
    login:            { slug: '/login',             title: 'Anmelden – Eventbörse' },
    register:         { slug: '/registrieren',      title: 'Registrieren – Eventbörse' }
  };

  var _leaveHandlers = {};
  var _enterHandlers = {};
  var _renderHook = null;
  var _currentPage = 'home';
  var _previousPage = null;

  function _extractRouteId(data) {
    if (data === null || data === undefined) return null;
    if (typeof data !== 'object') return data;
    if (data.id !== undefined && data.id !== null) return data.id;
    if (data.listingId !== undefined && data.listingId !== null) return data.listingId;
    if (data.providerId !== undefined && data.providerId !== null) return data.providerId;
    if (data.userId !== undefined && data.userId !== null) return data.userId;
    return null;
  }

  function buildPath(page, id) {
    var route = ROUTES[page];
    if (!route) return '/';
    var slug = route.slug;
    if (id !== undefined && id !== null && slug !== '/' && slug.slice(-1) === '/') {
      slug += String(id);
    }
    return slug;
  }

  function readCurrentRoute() {
    var pathname = global.location.pathname || '/';
    var hash = global.location.hash || '';

    if (hash.indexOf('#/') === 0) pathname = hash.slice(1);

    var pageKeys = Object.keys(ROUTES);
    for (var i = 0; i < pageKeys.length; i++) {
      var key = pageKeys[i];
      var slug = ROUTES[key].slug;
      if (slug !== '/' && slug.slice(-1) === '/' && pathname.indexOf(slug) === 0) {
        return { page: key, id: pathname.slice(slug.length) || null };
      }
      if (pathname === slug || pathname === slug + '/') {
        return { page: key, id: null };
      }
    }
    return { page: 'home', id: null };
  }

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
      // ignore on file://
    }
  }

  function onLeave(page, fn) { _leaveHandlers[page] = fn; }
  function onEnter(page, fn) { _enterHandlers[page] = fn; }

  function _runLeave(page) {
    var fn = _leaveHandlers[page];
    if (typeof fn === 'function') {
      try { fn(); } catch (e) { console.warn('[EB.Router] onLeave failed for', page, e); }
    }
  }

  function _runEnter(page, data) {
    var fn = _enterHandlers[page];
    if (typeof fn === 'function') {
      try { fn(data); } catch (e) { console.warn('[EB.Router] onEnter failed for', page, e); }
    }
  }

  function _setStatePointers() {
    if (!global.EB || !global.EB.State) return;
    try {
      global.EB.State.set('previousPage', _previousPage);
      global.EB.State.set('currentPage', _currentPage);
    } catch (e) {}
  }

  function navigateTo(page, data, skipHistory, renderFn) {
    if (!page) return;
    _runLeave(_currentPage);
    _previousPage = _currentPage;
    _currentPage = page;
    _setStatePointers();

    if (!skipHistory) {
      pushHistory(page, _extractRouteId(data), false);
    }

    var renderer = (typeof renderFn === 'function') ? renderFn : _renderHook;
    if (typeof renderer === 'function') renderer(page, data);
    _runEnter(page, data);
  }

  function setRenderHook(fn) {
    _renderHook = (typeof fn === 'function') ? fn : null;
  }

  function syncFromLocation(renderFn) {
    var route = readCurrentRoute();
    navigateTo(route.page, route.id, true, renderFn);
  }

  global.addEventListener('popstate', function (ev) {
    var state = (ev && ev.state) || readCurrentRoute();
    navigateTo(state.page || 'home', state.id || null, true);
  });

  global.EB = global.EB || {};
  global.EB.Router = {
    ROUTES: ROUTES,
    buildPath: buildPath,
    readCurrentRoute: readCurrentRoute,
    pushHistory: pushHistory,
    navigateTo: navigateTo,
    syncFromLocation: syncFromLocation,
    setRenderHook: setRenderHook,
    onLeave: onLeave,
    onEnter: onEnter,
    getCurrentPage: function () { return _currentPage; },
    getPreviousPage: function () { return _previousPage; }
  };
}(window));
