// smart21brain — retiring the Stationery OS service worker.
//
// An earlier version of this file had a bug: when a page wasn't cached
// yet AND the network fetch failed, its fetch handler resolved to
// `undefined` instead of a Response, which the browser reports as
// ERR_FAILED — and because the file's content never changed afterwards,
// any browser that had already installed it kept running that same
// broken logic on every visit, even after the rest of the site was
// fixed and redeployed.
//
// This version's only job is to remove itself: unregister, wipe every
// cache this origin's service workers may have created, and stop
// intercepting anything. stationery-app.html no longer registers a
// service worker at all, so once this runs once per browser, the
// Stationery OS goes back to normal, un-intercepted network requests
// for good.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((client) => client.navigate(client.url)))
  );
});

// No fetch handler at all — every request simply falls through to the
// network exactly as if no service worker existed.
