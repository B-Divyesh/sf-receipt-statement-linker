import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const archivePath = resolve('dist/site/downloads/receipt-statement-linker-chrome.zip');
const releaseUrl = new URL(
  '/downloads/receipt-statement-linker-chrome.zip',
  process.env.RELEASE_URL ?? 'https://receipt-statement-linker.sociobot.in'
);
const expected = await readFile(archivePath);
const expectedHash = createHash('sha256').update(expected).digest('hex');

const response = await fetch(releaseUrl, { headers: { 'Cache-Control': 'no-cache' } });
const actual = Buffer.from(await response.arrayBuffer());
const actualHash = createHash('sha256').update(actual).digest('hex');

if (!response.ok) throw new Error(`Public archive returned HTTP ${response.status}.`);
if (response.headers.get('content-type') !== 'application/zip') {
  throw new Error(`Public archive content type was ${response.headers.get('content-type') ?? 'missing'}, not application/zip.`);
}
if (!response.headers.get('content-disposition')?.includes('attachment')) {
  throw new Error('Public archive is missing an attachment Content-Disposition header.');
}
if (!response.headers.get('cache-control')?.includes('immutable')) {
  throw new Error('Public archive is missing immutable cache policy.');
}
if (actual.subarray(0, 4).toString() !== 'PK\x03\x04') throw new Error('Public archive is not a ZIP file.');
if (actualHash !== expectedHash) {
  throw new Error(`Public archive SHA-256 ${actualHash} does not match build SHA-256 ${expectedHash}.`);
}

console.log(`Verified live extension archive: ${actual.length} bytes, SHA-256 ${actualHash}, ${releaseUrl}`);
