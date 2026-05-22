/**
 * js/listings-loader.js
 *
 * Optional startup helper:
 * if app.js exposes `loadDbListings`, trigger one background sync on boot.
 */
(function () {
  'use strict';

  function run() {
    if (typeof window.loadDbListings !== 'function') return;
    try {
      window.loadDbListings();
    } catch (e) {
      console.warn('[js/listings-loader] loadDbListings failed:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
