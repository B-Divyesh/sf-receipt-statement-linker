import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static deployment policy', () => {
  it('keeps archives out of the SPA fallback and gives release assets an explicit response policy', async () => {
    const policy = JSON.parse(await readFile('site/public/staticwebapp.config.json', 'utf8')) as {
      globalHeaders: Record<string, string>;
      routes: Array<{ route: string; headers: Record<string, string> }>;
      navigationFallback: { exclude: string[] };
    };
    const zip = policy.routes.find((route) => route.route === '/downloads/*.zip');
    const assets = policy.routes.find((route) => route.route === '/assets/*');

    expect(policy.navigationFallback.exclude).toContain('/downloads/*');
    expect(zip?.headers['Content-Type']).toBe('application/zip');
    expect(zip?.headers['Content-Disposition']).toContain('attachment');
    expect(zip?.headers['Cache-Control']).toContain('immutable');
    expect(assets?.headers['Cache-Control']).toContain('immutable');
    expect(policy.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(policy.globalHeaders['X-Frame-Options']).toBe('DENY');
  });

  it('keeps the install path and deployment root aligned', async () => {
    const readme = await readFile('README.md', 'utf8');
    const index = await readFile('site/index.html', 'utf8');

    expect(index).toContain('/downloads/receipt-statement-linker-chrome.zip');
    expect(readme).toContain('dist/site/');
    expect(readme).toContain('downloads/receipt-statement-linker-chrome.zip');
  });
});
