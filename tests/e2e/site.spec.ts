import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/privacy/', '/terms/']) {
  test(`${path} has semantic, accessible basics`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/Receipt Statement Linker/);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('mobile landing exposes download and offline status', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('bank row forgot');
  await expect(page.getByRole('link', { name: /Download for Chromium/ })).toHaveAttribute('href', /receipt-statement-linker-chrome\.zip/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.locator('#network-state')).toContainText('offline');
});

test('desktop layout and keyboard entry remain usable at 1440px', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCSS('outline-width', '3px');
  } finally {
    await context.close();
  }
});

test('the public CTA downloads the packaged extension archive', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: /Download for Chromium/ }).click()
  ]);
  expect(download.suggestedFilename()).toBe('receipt-statement-linker-chrome.zip');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk as Buffer);
  expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe('PK\x03\x04');
});

test('a newly controlled offline reload uses the precached shell and never substitutes HTML for an asset', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('bank row forgot');
  expect(consoleErrors.filter((message) => /module script|MIME type/i.test(message))).toEqual([]);
});

test('the generated worker precaches only files that exist in the production artifact', async () => {
  const worker = await readFile('dist/site/sw.js', 'utf8');
  const shellEntries = [...worker.matchAll(/"(\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((entry): entry is string => entry !== undefined);
  for (const entry of shellEntries.filter((entry) => /\.(?:js|css)$/.test(entry))) {
    const response = await fetch(`http://127.0.0.1:4173${entry}`);
    expect(response.status).toBe(200);
  }
});
