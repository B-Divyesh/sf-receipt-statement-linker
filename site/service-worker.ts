import { createHash } from 'node:crypto';

const STATIC_SHELL = [
  '/',
  '/privacy/',
  '/terms/',
  '/assets/evidence-desk-900.avif',
  '/assets/evidence-desk-900.webp',
  '/assets/evidence-desk-1536.avif',
  '/assets/evidence-desk-1536.webp',
  '/assets/mark.svg'
];

/** Creates a release-specific worker whose precache exactly matches the built shell. */
export function createServiceWorker(emittedFiles: string[], releaseSeed = emittedFiles.join('\n')): string {
  const shell = [...new Set([...STATIC_SHELL, ...emittedFiles.map((file) => `/${file.replace(/^\/+/, '')}`)])].sort();
  const release = createHash('sha256').update(releaseSeed).digest('hex').slice(0, 16);

  return `/* Generated during the production build. Do not edit. */
const CACHE = 'receipt-linker-shell-${release}';
const SHELL = ${JSON.stringify(shell)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith('receipt-linker-shell-') && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
`;
}
