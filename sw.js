// ═══════════════════════════════════════════════════════
//  MAQUIS PRO — Service Worker v2.0
//  Stratégie : Cache-First pour assets statiques
//              Network-First pour les APIs Supabase
//              Offline fallback sur index.html
// ═══════════════════════════════════════════════════════

const CACHE_NAME    = 'maquis-pro-v2';
const CACHE_STATIC  = 'maquis-static-v2';
const CACHE_CDN     = 'maquis-cdn-v2';

// Assets locaux à pré-cacher
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// CDN à mettre en cache à la première requête
const CDN_PATTERNS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
];

// Domaines à exclure du cache (Supabase = toujours réseau)
const NETWORK_ONLY = [
  'supabase.co',
];

// ── INSTALL ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_CDN)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Supabase & APIs → toujours réseau, jamais cache
  if (NETWORK_ONLY.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. CDN (jsPDF, qrcodejs, supabase-js) → Cache-First
  if (CDN_PATTERNS.some(d => url.hostname.includes(d))) {
    event.respondWith(
      caches.open(CACHE_CDN).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // 3. Assets locaux → Cache-First avec fallback index.html
  event.respondWith(
    caches.open(CACHE_STATIC).then(cache =>
      cache.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() =>
            // Offline : renvoyer index.html pour les navigations
            request.mode === 'navigate'
              ? caches.match('/index.html')
              : Response.error()
          );
      })
    )
  );
});

// ── BACKGROUND SYNC (si supporté) ───────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-commandes') {
    // La synchro réelle est gérée par l'app via Supabase
    // Ce tag est enregistré par l'app quand elle reprend du réseau
    console.log('[SW] Background sync triggered:', event.tag);
  }
});

// ── PUSH NOTIFICATIONS (base, extensible) ───────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Maquis Pro', {
      body:  data.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data:  data.url ? { url: data.url } : {},
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
