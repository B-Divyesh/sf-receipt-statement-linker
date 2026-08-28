import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const siteRoot = resolve('dist/site');
const archive = resolve(siteRoot, 'downloads/receipt-statement-linker-chrome.zip');
const policyPath = resolve(siteRoot, 'staticwebapp.config.json');

async function mustExist(path, description) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing ${description}: ${path}`);
  }
}

await mustExist(resolve(siteRoot, 'index.html'), 'site entry point');
await mustExist(archive, 'public extension archive');
await mustExist(policyPath, 'static deployment policy');

const [archiveBytes, archiveStats, policy] = await Promise.all([
  readFile(archive),
  stat(archive),
  readFile(policyPath, 'utf8').then(JSON.parse)
]);

if (archiveStats.size < 1024 || archiveBytes.subarray(0, 4).toString() !== 'PK\x03\x04') {
  throw new Error('The public extension archive is not a non-empty ZIP file.');
}

const archiveRoute = policy.routes?.find((route) => route.route === '/downloads/*.zip');
if (!policy.navigationFallback?.exclude?.includes('/downloads/*')) {
  throw new Error('The static deployment policy would send download requests to the HTML fallback.');
}
if (archiveRoute?.headers?.['Content-Type'] !== 'application/zip' || !archiveRoute?.headers?.['Content-Disposition']?.includes('attachment')) {
  throw new Error('The public extension archive is missing its download response policy.');
}

console.log(`Verified deployable archive: ${archiveStats.size} bytes at dist/site/downloads/receipt-statement-linker-chrome.zip`);
