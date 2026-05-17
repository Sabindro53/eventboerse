```javascript
/**
 * EventBörse Service Worker
 * Handles: Web Push Notifications
 * Version: 1.0.0
 */

var CACHE_NAME = 'eventboerse-v1';

// Install — skip waiting so new SW activates immediately
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

// Activate — claim clients immediately
self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// Push — show notification
self.addEventListener('push', function(event) {
    var data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'EventBörse', body: event.data.text() };
        }
    }

    var title = data.title || 'EventBörse';
    var options = {
        body: data.body || 'Du hast eine neue Benachrichtigung.',
        icon: data.icon || '/wp-content/themes/eventboerse/icon-192.png',
        badge: data.badge || '/wp-content/themes/eventboerse/badge-72.png',
        tag: data.tag || 'eventboerse-notification',
        data: {
            url: data.url || '/',
            notificationId: data.notificationId || null
        },
        requireInteraction: false,
        silent: false
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click — focus or open tab
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    var targetUrl = (event.notification.data && event.notification.data.url)
        ? event.notification.data.url
        : '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // If a window is already open, focus it and navigate
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        client.navigate(targetUrl);
                    }
                    return;
                }
            }
            // Otherwise open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});

// Notification close (optional analytics hook)
self.addEventListener('notificationclose', function(event) {
    // Could send analytics here in future
});
```