const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');

const origin = 'https://the-treasury.samuelsmanuals.com';
const blankHash = '98f44380dc38040758f1f8096beb794d579551932112f8216cd0777596225d46';
const fixture = path.resolve(__dirname, '../fixtures/payments.csv');
const note = 'Fictional QA: keep a bicycle repair buffer.';
const goal = 'Fictional QA buffer';

function inert(raw, id) {
  const match = raw.match(new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>'));
  if (!match) throw new Error('Missing inert saved block: ' + id);
  return JSON.parse(match[1]);
}
async function enter(page) {
  await expect(page.locator('#treasury-header')).toBeAttached();
  if (await page.locator('#guide').isVisible()) await page.locator('#guide-explore').click();
}
async function save(page, info, button, filename) {
  await page.locator('#data-open').click();
  await page.locator('#save-copy').click();
  const waiting = page.waitForEvent('download');
  await page.locator(button).click();
  const download = await waiting;
  const destination = info.outputPath(filename);
  await download.saveAs(destination);
  await page.getByRole('button', { name: 'Close save', exact: true }).click();
  return destination;
}
async function importCSV(page, existing = false) {
  await page.locator('#dock-import').click();
  await page.locator('#import').setInputFiles(fixture);
  await expect(page.locator('#csv-mapping')).toBeVisible();
  if (existing) await page.locator('#csv-account').selectOption({ label: 'Fictional current account' });
  else await page.locator('#csv-account-name').fill('Fictional current account');
  await page.locator('#preview-csv').click();
  await expect(page.locator('#import-preview')).toBeVisible();
  await page.locator('#apply-import').click();
  await expect(page.locator('#import-panel')).not.toBeVisible();
}

test('downloaded file imports, edits, saves, reopens and restores without network', async ({ browser }, info) => {
  // This executes only on the independent CI VM. Never on a desktop profile.
  const response = await fetch(origin + '/Treasury.html', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TreasuryReleaseQA/1.0)' },
    redirect: 'error', signal: AbortSignal.timeout(30000)
  });
  expect(response.status).toBe(200);
  const bytes = Buffer.from(await response.arrayBuffer());
  expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(blankHash);
  const blank = info.outputPath('Treasury.html');
  await fs.writeFile(blank, bytes);
  const empty = inert(bytes.toString(), 'ledger-data');
  expect(empty.transactions).toEqual([]);
  expect(empty.fictional).toBe(false);

  const context = await browser.newContext({ acceptDownloads: true, offline: true });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await page.goto(pathToFileURL(blank).href);
  expect(new URL(page.url()).protocol).toBe('file:');
  await enter(page);
  await importCSV(page);
  await expect(page.locator('#spending')).toContainText('£947.65');

  await page.getByRole('button', { name: 'Add payment', exact: true }).click();
  await page.locator('#payment-date').fill('2026-01-04');
  await page.locator('#payment-name').fill('Fictional QA coffee');
  await page.locator('#payment-amount').fill('-12.34');
  await page.locator('#payment-category').fill('Food');
  await page.locator('#manual-record').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#spending')).toContainText('£959.99');

  await page.getByRole('button', { name: 'Add strategic note', exact: true }).click();
  await page.locator('#guidance-text').fill(note);
  await page.locator('#guidance-save').click();
  await page.getByRole('button', { name: 'Income-left goal', exact: true }).click();
  await page.locator('#goal-label').fill(goal);
  await page.locator('#goal-metric').selectOption('cash');
  await page.locator('#goal-start').fill('0');
  await page.locator('#goal-date').fill('2026-01-01');
  await page.locator('#goal-target').fill('500');
  await page.locator('#goal-save').click();

  // Reimport into the same account must preserve the manual edit and avoid duplicates.
  await importCSV(page, true);
  const saved = await save(page, info, '#save-html', 'My-Treasury.html');
  const raw = await fs.readFile(saved, 'utf8');
  const ledger = inert(raw, 'ledger-data'), view = inert(raw, 'view-state');
  expect(ledger.transactions).toHaveLength(4);
  expect(ledger.transactions.reduce((sum, row) => sum + row.amount_minor, 0)).toBe(154001);
  expect(ledger.transactions.find(row => row.merchant === 'Fictional QA coffee').amount_minor).toBe(-1234);
  expect(ledger.guidance_notes.some(row => row.text === note)).toBe(true);
  expect(view.goals.some(row => row.label === goal && row.target_minor === 50000)).toBe(true);
  const source = inert(bytes.toString(), 'source-bundle');
  expect(inert(raw, 'source-bundle')).toEqual(source);
  await context.close();

  // Reopen the actual saved file in a fresh context, with no remembered browser state.
  const reopened = await browser.newContext({ acceptDownloads: true, offline: true });
  const second = await reopened.newPage();
  second.on('pageerror', error => errors.push(error.message));
  second.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await second.goto(pathToFileURL(saved).href);
  await enter(second);
  await expect(second.locator('#spending')).toContainText('£959.99');
  await expect(second.locator('#guidance')).toContainText(note);
  await expect(second.locator('.goal-card')).toContainText(goal);
  const backup = await save(second, info, '#save-json', 'My-Treasury.json');
  await second.screenshot({ path: info.outputPath('reopened.png'), fullPage: false });
  await reopened.close();

  const restored = await browser.newContext({ acceptDownloads: true, offline: true });
  const third = await restored.newPage();
  third.on('pageerror', error => errors.push(error.message));
  third.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await third.goto(pathToFileURL(blank).href);
  await enter(third);
  await third.locator('#dock-import').click();
  await third.locator('#import').setInputFiles(backup);
  await expect(third.locator('#import-preview')).toBeVisible();
  await third.locator('#apply-import').click();
  await expect(third.locator('#spending')).toContainText('£959.99');
  await expect(third.locator('#guidance')).toContainText(note);
  await expect(third.locator('.goal-card')).toContainText(goal);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await restored.close();
});
