```javascript
/**
 * Eventbörse Service Worker
 * Strategy:
 *   - App Shell (HTML, CSS, JS): Cache-first mit Network-Revalidation
 *   - API Calls (/wp-json/): Network-first, kein Cache
 *   - Bilder: Cache-first, 30-Tage-Expiry
 *   - Offline-Fallback: /offline für navigations-Requests ohne Netz
 */

var CACHE_VERSION = 'eb-v1';
var SHELL_CACHE = CACHE_VERSION + '-shell';
var IMAGE_CACHE = CACHE_VERSION + '-images';

var SHELL_ASSETS = [
  '/',
  '/wp-content/themes/eventboerse/app.js',
  '/wp-content/themes/eventboerse/styles.css',
  '/offline'
];

var MAX_IMAGE_CACHE_ENTRIES = 60;

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache) {
      // addAll schlägt fehl wenn ein Asset 404 zurückgibt —
      // deshalb einzeln cachen und Fehler ignorieren
      return Promise.all(
        SHELL_ASSETS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Shell-Asset konnte nicht gecacht werden:', url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            // Alle alten Caches löschen die nicht zur aktuellen Version gehören
            return name.startsWith('eb-') && name !== SHELL_CACHE && name !== IMAGE_CACHE;
          })
          .map(function(name) {
            console.log('[SW] Alter Cache gelöscht:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  // Nur GET-Requests cachen
  if (req.method !== 'GET') return;

  // Chrome-Extensions / andere Origins ignorieren
  if (url.origin !== location.origin) return;

  // 1. API-Calls: immer Network, nie Cache
  if (url.pathname.startsWith('/wp-json/')) {
    event.respondWith(networkOnly(req));
    return;
  }

  // 2. WordPress Admin / Login: nie cachen
  if (url.pathname.startsWith('/wp-admin') || url.pathname.startsWith('/wp-login')) {
    event.respondWith(networkOnly(req));
    return;
  }

  // 3. Bilder: Cache-first mit Limit
  if (isImageRequest(req)) {
    event.respondWith(cacheFirstImage(req));
    return;
  }

  // 4. App-Shell (HTML, CSS, JS): Stale-while-revalidate
  if (isShellRequest(req)) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }

  // 5. Navigation (HTML-Seiten): Network-first mit Offline-Fallback
  if (req.mode === 'navigate') {
    event.respondWith(navigationHandler(req));
    return;
  }
});

// ─── Strategien ───────────────────────────────────────────────────────────────

function networkOnly(req) {
  return fetch(req).catch(function() {
    return new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(req).then(function(cached) {
      var networkFetch = fetch(req).then(function(response) {
        if (response.ok) {
          cache.put(req, response.clone());
        }
        return response;
      }).catch(function() {
        return cached;
      });

      return cached || networkFetch;
    });
  });
}

function cacheFirstImage(req) {
  return caches.open(IMAGE_CACHE).then(function(cache) {
    return cache.match(req).then(function(cached) {
      if (cached) return cached;

      return fetch(req).then(function(response) {
        if (!response.ok) return response;

        cache.put(req, response.clone());

        // Cache-Größe begrenzen
        trimCache(IMAGE_CACHE, MAX_IMAGE_CACHE_ENTRIES);

        return response;
      }).catch(function() {
        // Bild-Fallback: transparentes 1x1 PNG
        return new Response(
          atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
          { headers: { 'Content-Type': 'image/png' } }
        );
      });
    });
  });
}

function navigationHandler(req) {
  return fetch(req).then(function(response) {
    // Aktuelle Seite in Shell-Cache aufnehmen
    if (response.ok) {
      var clone = response.clone();
      caches.open(SHELL_CACHE).then(function(cache) {
        cache.put(req, clone);
      });
    }
    return response;
  }).catch(function() {
    // Offline: gecachte Version oder Offline-Fallback
    return caches.open(SHELL_CACHE).then(function(cache) {
      return cache.match(req).then(function(cached) {
        return cached || cache.match('/offline') || cache.match('/');
      });
    });
  });
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function isImageRequest(req) {
  return req.destination === 'image' ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico)(\?.*)?$/.test(new URL(req.url).pathname);
}

function isShellRequest(req) {
  var pathname = new URL(req.url).pathname;
  return pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    SHELL_ASSETS.indexOf(req.url) !== -1;
}

function trimCache(cacheName, maxEntries) {
  caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maxEntries) {
        cache.delete(keys[0]).then(function() {
          trimCache(cacheName, maxEntries);
        });
      }
    });
  });
}

// ─── Message-Handler (z.B. für "skipWaiting" vom Frontend) ───────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```