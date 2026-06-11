// sw.js – Eventbörse
//
// Bewusst minimal: Wir wollen PWA-Installierbarkeit, aber KEIN HTML-/CSS-/JS-
// Caching im Service Worker, weil der WordPress-Server bereits Cache-Header
// und filemtime-basiertes Cache-Busting liefert. Aggressives SW-Caching hat
// zu „Styles werden nicht richtig angezeigt" und stale SPA-HTML geführt.
//
// Verhalten:
//   • install  → skipWaiting, kein Precache
//   • activate → alle alten Caches (v1/v2/...) löschen, sofort Kontrolle
//   • fetch    → Pass-Through; nur Navigations bekommen einen Offline-Fallback

const SW_VERSION = 'eventboerse-sw-v3-passthrough';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode !== 'navigate') return; // Browser-Default für alle Assets

  event.respondWith((async () => {
    try {
      const preload = await event.preloadResponse;
      if (preload) return preload;
      return await fetch(req);
    } catch (_) {
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
        '<style>body{font-family:system-ui,sans-serif;margin:2rem;color:#222}</style>' +
        '<h1>Offline</h1><p>Bitte prüfe deine Internetverbindung und lade die Seite erneut.</p>',
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 503 }
      );
    }
  })());
});

