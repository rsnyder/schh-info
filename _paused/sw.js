/* Kill-switch service worker, deployed only while the site is paused.
   Browsers that installed the app re-check /sw.js, get this byte-different
   file, and it removes every cache, unregisters itself, and reloads open
   tabs so they fetch the paused page from the network. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(function (c) { c.navigate(c.url); });
  })());
});
