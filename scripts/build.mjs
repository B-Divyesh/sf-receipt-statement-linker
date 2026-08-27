import { cp, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

execFileSync('npx', ['wxt', 'build'], { stdio: 'inherit' });
execFileSync('npx', ['wxt', 'zip'], { stdio: 'inherit' });
execFileSync('npx', ['vite', 'build', '--config', 'vite.site.config.ts'], { stdio: 'inherit' });

const outputs = await readdir('.output');
const archive = outputs.find((name) => name.endsWith('-chrome.zip'));
if (!archive) throw new Error('WXT did not produce a Chrome archive.');
await mkdir('dist/site/downloads', { recursive: true });
await cp(join('.output', archive), 'dist/site/downloads/receipt-statement-linker-chrome.zip');
await mkdir('dist/extension', { recursive: true });
await cp('.output/chrome-mv3', 'dist/extension/chrome-mv3', { recursive: true, force: true });
console.log(`Packaged ${archive} for the static download.`);
