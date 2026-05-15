const CACHE_NAME = 'versetrack-v5';

// Everything the app needs to run — including all external scripts
// These MUST all be cached for the app to work offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512-maskable.png',
  '/widgets/daily-verse-data.json',
  '/widgets/streak-data.json',
  // Firebase SDKs — required for the app to even start
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  // Tabler icons
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
];

// ── INSTALL: pre-cache everything ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache local files first (these must succeed)
      await cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/icons/icon-512-maskable.png',
      ]);
      // Cache external files best-effort (don't fail install if network is slow)
      const externals = [
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
        'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
      ];
      await Promise.allSettled(
        externals.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => { if (res.ok) cache.put(url, res); })
            .catch(() => {}) // ignore network errors during install
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: wipe old caches ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: smart caching strategy ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── Firestore real-time data: always network, never intercept ────────────
  // (Firestore handles its own offline caching via enablePersistence)
  const firestoreHosts = [
    'firestore.googleapis.com',
    'firebaseio.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
  ];
  if (firestoreHosts.some(h => url.hostname.includes(h))) return;

  // ── Bible API: network with cache fallback ───────────────────────────────
  if (url.hostname.includes('bible-api.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Firebase SDKs + CDN assets: cache-first (they never change) ──────────
  const cacheFirstHosts = [
    'gstatic.com',
    'googleapis.com',
    'jsdelivr.net',
    'fonts.gstatic.com',
  ];
  if (cacheFirstHosts.some(h => url.hostname.includes(h))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        // Not cached yet — fetch and cache it now
        return fetch(event.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  // ── Google Fonts CSS: cache-first ────────────────────────────────────────
  if (url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // ── App shell (index.html + local files): network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'))
      )
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reading-progress') {
    event.waitUntil(notifyClients('SYNC_PROGRESS'));
  }
});

async function notifyClients(type) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type }));
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json?.() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'VerseTrack', {
      body: data.body || "Time for today's reading 📖",
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      tag: 'versetrack-daily',
      renotify: true,
      actions: [
        { action: 'open',    title: '📖 Read Now' },
        { action: 'dismiss', title: 'Later' },
      ],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) existing.focus();
      else self.clients.openWindow('/');
    })
  );
});

// ── MESSAGE HANDLER ───────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
