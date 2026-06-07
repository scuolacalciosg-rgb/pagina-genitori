// ═══ SS San Giovanni — Service Worker ═══
const CACHE_NAME = 'ssg-portale-v1';
const ASSETS = [
  '/pagina-genitori/',
  '/pagina-genitori/index.html',
  '/pagina-genitori/manifest.json',
  '/pagina-genitori/icon-192.png',
  '/pagina-genitori/icon-512.png'
];

// ── Installazione: metti in cache le risorse principali ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Attivazione: rimuovi cache vecchie ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: serve dalla cache, aggiorna in background ──
self.addEventListener('fetch', function(e) {
  // Solo richieste GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(response) {
        // Aggiorna la cache con la versione più recente
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });
      // Restituisce cache subito, aggiorna in background
      return cached || fetchPromise;
    })
  );
});

// ── Notifiche Push ──
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'SS San Giovanni', body: e.data ? e.data.text() : 'Nuova comunicazione' }; }

  var options = {
    body: data.body || 'Hai una nuova comunicazione',
    icon: '/pagina-genitori/icon-192.png',
    badge: '/pagina-genitori/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/pagina-genitori/' },
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ],
    tag: data.tag || 'ssg-notification',
    renotify: true
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'SS San Giovanni', options)
  );
});

// ── Click su notifica ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'close') return;

  var url = (e.notification.data && e.notification.data.url) || '/pagina-genitori/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('pagina-genitori') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
