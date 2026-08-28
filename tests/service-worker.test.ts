import { describe, expect, it } from 'vitest';
import { createServiceWorker } from '../site/service-worker';

describe('release service worker', () => {
  it('precaches every emitted script and stylesheet with a release-specific cache', () => {
    const first = createServiceWorker(['assets/main-a1b2.js', 'assets/main-c3d4.css']);
    const second = createServiceWorker(['assets/main-a1b2.js', 'assets/main-e5f6.css']);
    const changedStaticAsset = createServiceWorker(['assets/main-a1b2.js', 'assets/main-c3d4.css'], 'evidence-desk-900.avif:changed');

    expect(first).toContain('"/assets/main-a1b2.js"');
    expect(first).toContain('"/assets/main-c3d4.css"');
    expect(first).toContain("self.skipWaiting()");
    expect(first).toContain("self.clients.claim()");
    expect(first).toContain("key.startsWith('receipt-linker-shell-') && key !== CACHE");
    expect(first).toContain("event.request.mode === 'navigate'");
    expect(first).toContain("event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));" );
    const assetHandler = first.slice(first.lastIndexOf('event.respondWith(caches.match'));
    expect(assetHandler).not.toContain('caches.match(\'/\')');
    expect(assetHandler).not.toContain('catch(');
    expect(first.match(/receipt-linker-shell-([a-f0-9]{16})/)?.[1]).not.toBe(second.match(/receipt-linker-shell-([a-f0-9]{16})/)?.[1]);
    expect(first.match(/receipt-linker-shell-([a-f0-9]{16})/)?.[1]).not.toBe(changedStaticAsset.match(/receipt-linker-shell-([a-f0-9]{16})/)?.[1]);
  });
});
