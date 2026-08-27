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
  await context.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.locator('#network-state')).toContainText('offline');
});
