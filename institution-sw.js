// Smart21Institution — service worker.
//
// Also shows push notifications (see "push" below).
// Deliberately tiny and defensive (mirrors shop-sw.js). Every code path
// here ends in a real Response.
//
//  - Registered with scope "/institution-", so it only controls institution-app.html,
//    institution-login.html and institution.html. Nothing else on the site is touched.
//  - /api/* is NEVER intercepted: institution data is always live from the network.
//  - Pages/CSS/JS: network first, fall back to the last good copy, so the app
//    shell still opens when the connection drops.
const CACHE = 'institution-shell-v3';
const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#0B1F1E;color:#fff;text-align:center"><div><h2>You are offline</h2><p>Connect to the internet and try again. Smart21Institution needs a connection to load your institution\'s data.</p><button onclick="location.reload()" style="padding:.7rem 1.4rem;border:0;border-radius:10px;background:#0F766E;color:#fff;font-size:1rem">Try again</button></div></body>';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => {})
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // let the browser handle it
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // fonts/CDNs: untouched
  if (url.pathname.startsWith('/api/')) return;           // live data: untouched

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate') {
            return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});

// ---------------------------------------------------------------------------------------------
// Push notifications. The server sends an EMPTY push (no message text passes through the push
// service). When it arrives we ask the server — using the person's own signed-in session — for
// their newest unread notice and show that. If that cannot be done (signed out, offline) a short
// generic message is shown instead, so the push is never silent.
// ---------------------------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Smart21Institution'; let body = 'You have a new notification.'; let link = '/institution-app.html#dashboard'; let tag = 'in-generic';
    try {
      const res = await fetch('/api/institution/notifications', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const n = (data.notifications || []).find((x) => !x.read_at);
        if (n) { title = n.title || title; body = n.message || ''; tag = 'in-' + n.id; link = '/institution-app.html' + (n.link && /^#[\w-]+(\?[\w=&%-]*)?$/.test(n.link) ? n.link : '#dashboard'); }
      }
    } catch (e) { /* offline: generic message */ }
    await self.registration.showNotification(title, { body, tag, icon: '/icons/institution-192.png', badge: '/icons/institution-192.png', data: { link } });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/institution-app.html#dashboard';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).pathname === '/institution-app.html' && 'focus' in c) { await c.focus(); if ('navigate' in c) await c.navigate(link).catch(() => {}); return; }
    }
    await self.clients.openWindow(link);
  })());
});
