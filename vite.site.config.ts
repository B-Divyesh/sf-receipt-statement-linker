import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { createServiceWorker } from './site/service-worker';

export default defineConfig({
  root: 'site',
  publicDir: 'public',
  plugins: [{
    name: 'release-versioned-service-worker',
    async writeBundle(outputOptions) {
      const outputDir = resolve(outputOptions.dir ?? 'dist/site');
      const files = await readdir(outputDir, { recursive: true });
      const shellFiles = files.filter((fileName) => /\.(?:js|css)$/.test(fileName));
      const revisions = await Promise.all(files.map(async (fileName) => {
        try {
          const contents = await readFile(resolve(outputDir, fileName));
          return `${fileName}:${createHash('sha256').update(contents).digest('hex')}`;
        } catch {
          return null;
        }
      }));
      await writeFile(resolve(outputDir, 'sw.js'), createServiceWorker(shellFiles, revisions.filter((revision): revision is string => revision !== null).sort().join('\n')));
    }
  }],
  build: {
    outDir: '../dist/site',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'site/index.html'),
        privacy: resolve(import.meta.dirname, 'site/privacy/index.html'),
        terms: resolve(import.meta.dirname, 'site/terms/index.html')
      }
    }
  }
});
