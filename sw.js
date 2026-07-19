---
layout: null
permalink: /sw.js
---
/* SCHH Community Guide service worker.
   Liquid stamps a new VERSION on every deploy, which makes this file
   byte-different, triggers a SW update, and retires the old cache. */

const VERSION = "{{ site.time | date: '%s' }}";
const CACHE = "schh-guide-" + VERSION;

/* Asset URLs carry the same ?v= stamp the pages reference (head.html),
   so cached entries can only ever be served to markup from the same
   release. */
const PRECACHE = [
  "/",
  "/about/",
  "/contact/",
  "/links/",
  "/vendors/",
  "/more/",
  "/install/",
  "/offline/",
  "/css/app.css?v=" + VERSION,
  "/css/guide-chat.css?v=" + VERSION,
  "/js/guide-chat.js?v=" + VERSION,
  "/manifest.webmanifest",
  "/img/icon.svg",
  "/img/icon-192.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  /* Never touch non-GET (chat SSE posts, contact form) or anything
     cross-origin (chat.schh.info auth/API, Netlify) — no respondWith,
     so those requests behave exactly as if no SW existed. */
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    /* Pages: network-first so content updates show up immediately;
       fall back to cache, then the offline page. */
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then(hit => hit || caches.match("/offline/"))
        )
    );
    return;
  }

  /* Static assets: cache-first with network backfill. Each deploy gets a
     fresh cache, so stale assets can't outlive a release. */
  event.respondWith(
    caches.match(req).then(hit =>
      hit ||
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      })
    )
  );
});
