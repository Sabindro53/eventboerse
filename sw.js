// sw.js — Eventbörse Service Worker
// Strategie:
//  - HTML-Navigation, app.js, styles.css, manifest.json → network-first
//    mit Cache-Fallback. So holen Nutzer nach jedem Deploy direkt die
//    aktuelle Version, ohne den Tab hart neu laden zu müssen.
//  - Statische Assets (Bilder, Fonts, Icons) → cache-first, weil sie sich
//    selten ändern und mit Hash-Pfaden versioniert werden.

const CACHE_NAME = 'eventboerse-cache-v5-2026-06-09';
const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => cacheName !== CACHE_NAME ? caches.delete(cacheName) : null)
    )).then(() => {
      if (self.registration.navigationPreload) {
        return self.registration.navigationPreload.enable();
      }
    }).then(() => self.clients.claim())
  );
});

// Listen for "skipWaiting" message from app — lets the page force a new
// SW to take over after deploy, ohne Tab-Neuladen abzuwarten.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Web Push: Eingehende Notifications anzeigen.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (_) {
    try { data = { body: event.data ? event.data.text() : '' }; } catch (__) {}
  }
  const title = data.title || 'Eventbörse';
  const opts = {
    body: data.body || '',
    icon: data.icon || '/wp-content/themes/eventboerse/icons/icon-192.png',
    badge: data.badge || '/wp-content/themes/eventboerse/icons/icon-72.png',
    data: { url: data.url || '/', payload: data },
    tag: data.tag || undefined,
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

// Klick auf Notification: bestehendes Tab fokussieren oder neues öffnen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      try {
        const u = new URL(c.url);
        if (u.origin === self.location.origin) {
          await c.focus();
          if (c.navigate) try { await c.navigate(targetUrl); } catch (_) {}
          return;
        }
      } catch (_) {}
    }
    await clients.openWindow(targetUrl);
  })());
});

function isAppShellRequest(url) {
  if (url.origin !== self.location.origin) return false;
  const pathname = url.pathname;
  if (pathname === '/' || pathname.endsWith('/index.html')) return true;
  if (pathname.endsWith('/app.js')) return true;
  if (pathname.endsWith('/styles.css')) return true;
  if (pathname.endsWith('/manifest.json')) return true;
  return false;
}

function isApiRequest(url) {
  return url.pathname.indexOf('/wp-json/') !== -1
      || url.pathname.indexOf('/wp-admin/') !== -1
      || url.pathname.indexOf('/wp-login.php') !== -1;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // API-Calls dürfen NIE aus dem Cache kommen — sonst sehen Nutzer alte
  // Inserate, Nachrichten, Konten. Direkt durchreichen.
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (req.method !== 'GET') return;
  if (isApiRequest(url)) return;

  // Navigation: network-first, mit Preload, Cache als Fallback.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const fresh = await fetch(req);
        // NUR die Root-Navigation als Offline-Shell cachen. Würden wir
        // jede Navigation unter '/index.html' ablegen, könnte z. B. eine
        // wp-admin-Seite die SPA-Shell vergiften und der Offline-Modus
        // würde danach Admin-HTML für die ganze App ausliefern.
        if (fresh && fresh.ok && fresh.type !== 'opaque' && url.pathname === '/') {
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
          '<style>body{font:14px system-ui;padding:32px;color:#222}</style>' +
          '<h1>Offline</h1><p>Bitte überprüfe deine Internetverbindung. Die App startet automatisch, sobald du wieder online bist.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // App-Shell (app.js, styles.css, manifest.json) → network-first.
  if (isAppShellRequest(url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response('// offline', { status: 503 });
      }
    })());
    return;
  }

  // Restliche GET-Requests (Bilder, Fonts, Icons) → cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((fresh) => {
        if (fresh && fresh.ok && fresh.type !== 'opaque' && url.origin === self.location.origin) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return fresh;
      }).catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' }));
    })
  );
});
