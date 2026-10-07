import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Build-time asset enumeration keeps every release's offline shell atomic.
export function offlinePlugin() {
  return {
    name: 'photobooth-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((file) => !file.endsWith('.map'))
      const hash = createHash('sha256').update(assets.map((name) => name + (bundle[name].code || bundle[name].source)).join(''))
      for (const file of ['index.html', 'public/manifest.webmanifest', 'public/favicon.svg', 'public/icons/icon-192.png', 'public/icons/icon-512.png', 'public/icons/apple-touch-icon.png']) hash.update(readFileSync(file))
      const version = hash.digest('hex').slice(0, 16)
      const urls = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/favicon.svg', ...assets.map((name) => `/${name}`)]
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'good-moments-${version}';
const ASSETS = ${JSON.stringify([...new Set(urls)])};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('good-moments-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(cached => cached || fetch(event.request)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
  }
});
` })
    },
  }
}
