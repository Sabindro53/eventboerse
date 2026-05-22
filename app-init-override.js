/**
 * app-init-override.js
 *
 * Optional lightweight startup hook.
 * Safe no-op when not loaded by the template.
 */
(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    // Keep this defensive: only call when app.js exposed the loader.
    if (typeof window.loadDbListings === 'function') {
      try {
        window.loadDbListings();
      } catch (e) {
        console.warn('[app-init-override] loadDbListings failed:', e);
      }
    }
  });
})();
