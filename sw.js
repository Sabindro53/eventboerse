```javascript
/**
 * Eventbörse Service Worker
 * Strategy: Cache-First for static assets, Network-First for API calls
 * Version bump in CACHE_NAME invalidates all caches on next visit.
 */

var CACHE_NAME = 'eb-cache-v1';
var STATIC_CACHE = 'eb-static-v1';
var API_CACHE    = 'eb-api-v1';

// Assets to pre-cache on install (App Shell)
var APP_SHELL = [
  '/',
  '/wp-content/themes/eventboerse/app.js',
  '/wp-content/themes/eventboerse/styles.css',
  '/wp-content/themes/eventboerse/pwa-install.js',
  '/wp-content/themes/eventboerse/offline.html',
  '/wp-content/themes/eventboerse/icons/icon-192.png',
  '/wp-content/themes/eventboerse/icons/icon-512.png'
];

// API routes that should never be served from cache
var NEVER_CACHE = [
  '/wp-json/eventboerse/v1/login',
  '/wp-json/eventboerse/v1/register',
  '/wp-json/eventboerse/v1/logout',
  '/wp-json/eventboerse/v1/otp/',
  '/wp-json/eventboerse/v1/webauthn/',
  '/wp-json/eventboerse/v1/stripe/'
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        // addAll fails entirely if one request fails — use individual adds
        return Promise.allSettled(
          APP_SHELL.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Pre-cache failed for:', url, err.message);
            });
          })
        );
      })
      .then(function() {
        // Activate immediately without waiting for old SW to unload
        return self.skipWaiting();
      })
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', function(event) {
  var validCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) { return validCaches.indexOf(name) === -1; })
            .map(function(name) {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(function() {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);

  // Only handle same-origin + GET requests
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Never cache auth/payment API calls
  var isNeverCache = NEVER_CACHE.some(function(path) {
    return url.pathname.indexOf(path) !== -1;
  });
  if (isNeverCache) return;

  // Network-First for REST API calls (fresh data preferred, fallback to cache)
  if (url.pathname.indexOf('/wp-json/') !== -1) {
    event.respondWith(networkFirstWithFallback(request, API_CACHE, 4000));
    return;
  }

  // Cache-First for static assets (JS, CSS, images, fonts)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Network-First for HTML pages (SPA shell)
  if (request.headers.get('Accept') && request.headers.get('Accept').indexOf('text/html') !== -1) {
    event.respondWith(networkFirstWithFallback(request, CACHE_NAME, 6000));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirstWithFallback(request, CACHE_NAME, 6000));
});

// ─── Strategies ───────────────────────────────────────────────────────────────

/**
 * Cache-First: serve from cache, fall back to network, update cache silently.
 */
function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(request).then(function(cached) {
      if (cached) {
        // Refresh cache in background (stale-while-revalidate)
        fetch(request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
        }).catch(function() {}); // Ignore network errors during background refresh
        return cached;
      }
      return fetch(request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });
    });
  });
}

/**
 * Network-First with timeout: try network, fall back to cache, fall back to offline page.
 */
function networkFirstWithFallback(request, cacheName, timeoutMs) {
  return caches.open(cacheName).then(function(cache) {
    var networkPromise = fetchWithTimeout(request, timeoutMs)
      .then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });

    return networkPromise.catch(function() {
      return cache.match(request).then(function(cached) {
        if (cached) return cached;
        // Last resort: offline page for HTML requests
        if (request.headers.get('Accept') && request.headers.get('Accept').indexOf('text/html') !== -1) {
          return caches.match('/wp-content/themes/eventboerse/offline.html');
        }
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    });
  });
}

/**
 * Fetch with timeout — rejects if network takes too long.
 */
function fetchWithTimeout(request, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('Network timeout after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    fetch(request).then(function(response) {
      clearTimeout(timer);
      resolve(response);
    }).catch(function(err) {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Returns true for file extensions that benefit from cache-first.
 */
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|ico)(\?.*)?$/.test(pathname);
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data = {};
  try {
    data = event.data.json();
  } catch(e) {
    data = { title: 'Eventbörse', body: event.data.text() };
  }

  var title   = data.title   || 'Eventbörse';
  var options = {
    body:    data.body    || 'Du hast eine neue Benachrichtigung.',
    icon:    data.icon    || '/wp-content/themes/eventboerse/icons/icon-192.png',
    badge:   data.badge   || '/wp-content/themes/eventboerse/icons/icon-96.png',
    tag:     data.tag     || 'eb-notification',
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing window if open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === targetUrl && 'focus