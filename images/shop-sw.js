// Smart21Shop — service worker.
//
// Deliberately tiny and defensive (mirrors school-sw.js). Every code path
// here ends in a real Response.
//
//  - Registered with scope "/shop-", so it only controls shop-app.html,
//    shop-login.html and shop.html. Nothing else on the site is touched.
//  - /api/* is NEVER intercepted: shop data is always live from the network.
//  - Pages/CSS/JS: network first, fall back to the last good copy, so the app
//    shell still opens when the connection drops.
const CACHE = 'shop-shell-v1';
const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#0E0F1A;color:#fff;text-align:center"><div><h2>You are offline</h2><p>Connect to the internet and try again. Smart21Shop needs a connection to load your shop\'s data.</p><button onclick="location.reload()" style="padding:.7rem 1.4rem;border:0;border-radius:10px;background:#4F46E5;color:#fff;font-size:1rem">Try again</button></div></body>';

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
