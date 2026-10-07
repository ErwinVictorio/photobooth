import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'

function publicFiles(dir = 'public') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? publicFiles(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
}

// Build-time asset enumeration keeps every release's offline shell atomic.
export function offlinePlugin() {
  return {
    name: 'photobooth-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((file) => !file.endsWith('.map'))
      const hash = createHash('sha256').update(assets.map((name) => name + (bundle[name].code || bundle[name].source)).join(''))
      const files = publicFiles().sort()
      for (const file of ['index.html', ...files]) hash.update(file).update(readFileSync(file))
      const version = hash.digest('hex').slice(0, 16)
      const urls = ['/', '/index.html', ...files.map(file => file.replace(/^public/, '')), ...assets.map((name) => `/${name}`)]
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
