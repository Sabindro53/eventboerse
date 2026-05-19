// sw.js

const CACHE_NAME = 'eventboerse-cache-v1'; // Update cache version if content changes significantly
const urlsToCache = [
  '/', // Root of the SPA
  '/index.html', // Main HTML file
  '/app.js',     // Main JavaScript bundle
  '/styles.css', // Main CSS file
  '/manifest.json', // Web App Manifest
  // Add other critical assets here for offline capability and initial load
  // e.g., common images, fonts, specific API data that can be pre-cached.
  // For Eventbörse, this might include placeholder images, default categories, etc.
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell assets.');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache during install:', error);
      })
  );
  // Forces the waiting service worker to become the active service worker
  // This allows the new service worker to take control of the page immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Check if navigation preload is supported and enable it
      if (self.registration.navigationPreload) {
        console.log('[Service Worker] Navigation preload is supported. Enabling it.');
        // Enable navigation preloads!
        return self.registration.navigationPreload.enable();
      } else {
        console.log('[Service Worker] Navigation preload is NOT supported by the browser.');
        return Promise.resolve(); // Resolve immediately if not supported
      }
    }).then(() => {
      console.log('[Service Worker] New service worker activated and claiming clients.');
      // Immediately take control of any open pages
      return self.clients.claim();
    }).catch(error => {
      console.error('[Service Worker] Error during activation:', error);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // For navigation requests (e.g., HTML documents for SPA routes)
  if (event.request.mode === 'navigate') {
    event.respondWith(async function() {
      try {
        // Try to use the preloaded response if available
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          console.log('[Service Worker] Using navigation preload response for:', event.request.url);
          return preloadResponse;
        }
      } catch (error) {
        console.warn('[Service Worker] Navigation preload failed or not used for:', event.request.url, error);
      }

      // Fallback: Check cache first
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        console.log('[Service Worker] Serving from cache (navigate):', event.request.url);
        return cachedResponse;
      }

      // Fallback: Go to network
      try {
        console.log('[Service Worker] Fetching from network (navigate):', event.request.url);
        const networkResponse = await fetch(event.request);
        // Optionally cache navigation responses for future offline use if applicable
        // const cache = await caches.open(CACHE_NAME);
        // await cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (networkError) {
        console.error('[Service Worker] Network request failed for navigation:', event.request.url, networkError);
        // You might want to serve an offline page here
        // return caches.match('/offline.html');
        return new Response('<h1>Offline</h1><p>Bitte überprüfe deine Internetverbindung.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }());
  } else {
    // For other requests (e.g., CSS, JS, images, API calls)
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log('[Service Worker] Serving from cache (asset):', event.request.url);
          return response;
        }
        // If not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          // You might want to cache dynamic assets here (e.g., API responses, new images)
          // For now, simply return the network response.
          // Example of caching dynamic assets:
          // if (networkResponse.ok && networkResponse.type === 'basic' && urlsToCache.some(url => event.request.url.includes(url))) {
          //   const responseToCache = networkResponse.clone();
          //   caches.open(CACHE_NAME).then((cache) => {
          //     cache.put(event.request, responseToCache);
          //   });
          // }
          return networkResponse;
        }).catch((networkError) => {
          console.log('[Service Worker] Network request failed for asset:', event.request.url, networkError);
          // This catch block handles network errors for assets.
          // You could return a placeholder image for images or a generic error for API calls.
          return new Response('Network error for asset', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
  }
});