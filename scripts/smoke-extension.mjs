import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const extensionPath = resolve('.output/chrome-mv3');
const context = await chromium.launchPersistentContext('', {
  headless: true,
  channel: 'chromium',
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
});

try {
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  if (await page.locator('h1').textContent() !== 'Save this purchase') throw new Error('Popup did not render.');
  await page.locator('#merchant').fill('North Star Market');
  await page.locator('#amount').fill('48.20');
  await page.locator('#purchase-date').fill('2026-05-13');
  await page.locator('#url').fill('https://northstar.example/receipt/1');
  await page.locator('#capture-form button[type="submit"]').click();
  await page.locator('#form-message').waitFor();
  const popupAxe = await new AxeBuilder({ page }).analyze();
  const popupSerious = popupAxe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  if (popupSerious.length) throw new Error(`Popup axe violations: ${popupSerious.map((violation) => violation.id).join(', ')}`);

  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator('#csv-file').setInputFiles({
    name: 'statement.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Date,Description,Amount\n2026-05-14,NORTH STAR MARKET 081,-48.20\n2026-05-18,Other Shop,-9.00')
  });
  await page.locator('#use-columns').click();
  await page.locator('.match').first().getByRole('button', { name: 'Approve link' }).click();
  if (await page.locator('#stat-approved').textContent() !== '1') throw new Error('Approval was not persisted.');
  const download = page.waitForEvent('download');
  await page.locator('#export-csv').click();
  if (!(await download).suggestedFilename().endsWith('.csv')) throw new Error('CSV export did not start.');

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  if (serious.length) throw new Error(`Extension axe violations: ${JSON.stringify(serious.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })))}`);
  if (consoleErrors.length) throw new Error(`Extension console errors: ${consoleErrors.join(' | ')}`);
  console.log('Extension smoke passed: capture → CSV import → approval → export, with no serious axe violations.');
} finally {
  await context.close();
}
