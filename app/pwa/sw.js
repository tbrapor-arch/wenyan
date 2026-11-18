// Offline copy of the published app (tools/site.py fills in __BUILD__). The page itself: network first, so new
// lessons arrive as soon as you are online, and the copy in the cache when offline (the page holds all the course
// data, so that one file is the whole app). Icons and the Google Fonts files: cache first, kept once loaded; the
// fonts' stylesheet is answered from the cache and refreshed behind. api.github.com is left alone: sync talks to
// GitHub live, and the private module keeps its own files in the page's cache (app/src/module.js).
const VERSION = '__BUILD__';
const SHELL = 'wenyan-shell-' + VERSION, MEDIA = 'wenyan-media-1';
const PRECACHE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const ROOT = new URL('./', self.registration.scope).pathname;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith('wenyan-shell-') && k !== SHELL) || (k.startsWith('wenyan-media-') && k !== MEDIA)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    // only the app page itself becomes the offline copy (not an error page)
    const app = url.origin === location.origin && (url.pathname === ROOT || url.pathname === ROOT + 'index.html');
    e.respondWith(fetch(req).then(r => {
      if (app && r.ok) { const copy = r.clone(); e.waitUntil(caches.open(SHELL).then(c => c.put('./', copy))); }
      return r;
    }).catch(() => caches.match(app ? './' : req).then(hit => hit || caches.match('./'))));
    return;
  }
  if (url.hostname === 'api.github.com') return;
  if (url.hostname === 'fonts.googleapis.com') {   // the stylesheet: from the cache at once, refreshed for next time
    e.respondWith(caches.open(MEDIA).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.status === 200 || r.type === 'opaque') return c.put(req, r.clone()).then(() => r); return r; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
    return;
  }
  const media = url.hostname === 'fonts.gstatic.com' || (url.origin === location.origin && /\.png$/.test(url.pathname));
  if (media) {
    e.respondWith(caches.open(MEDIA).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.status === 200 || r.type === 'opaque') e.waitUntil(c.put(req, r.clone()));
      return r;
    }))));
  }
});
