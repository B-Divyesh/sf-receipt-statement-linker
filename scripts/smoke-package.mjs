import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const archive = resolve('dist/site/downloads/receipt-statement-linker-chrome.zip');
const consumerRoot = await mkdtemp(resolve(tmpdir(), 'receipt-linker-consumer-'));
const extensionPath = resolve(consumerRoot, 'extension');

try {
  execFileSync('unzip', ['-q', archive, '-d', extensionPath], { stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/smoke-extension.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, EXTENSION_PATH: extensionPath }
  });
  console.log('Consumer archive smoke passed: a fresh Chromium profile loaded the packaged ZIP.');
} finally {
  await rm(consumerRoot, { recursive: true, force: true });
}
