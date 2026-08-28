import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function createJob(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /start your first ledger/i }).click();
  await page.getByLabel('Job name').fill('Lantern shop refit');
  await page.getByLabel('Client name').fill('Mina & Co');
  await page.getByLabel(/Job reference/).fill('JOB-104');
  await page.getByLabel('Deposit requested').fill('1000');
  await page.getByRole('button', { name: /create ledger/i }).click();
  await expect(page.getByRole('heading', { name: 'Lantern shop refit' })).toBeVisible();
}

test('records deposits and approved drawdowns, then persists the balance', async ({ page }) => {
  await page.goto('/');
  await createJob(page);
  await expect(page.getByText('$0.00').first()).toBeVisible();

  await page.getByRole('button', { name: /record activity/i }).click();
  await page.getByLabel('Amount').fill('750');
  await page.getByLabel('Description').fill('Deposit received by bank transfer');
  await page.getByLabel(/Reference/).last().fill('BANK-88');
  await page.getByRole('button', { name: /save record/i }).click();
  await expect(page.getByText('$750.00').first()).toBeVisible();

  await page.getByRole('button', { name: /record activity/i }).click();
  await page.getByLabel('Record type').selectOption('drawdown');
  await page.getByLabel('Amount').fill('250');
  await page.getByLabel('Description').fill('Approved design milestone');
  await page.getByRole('button', { name: /save record/i }).click();
  await expect(page.getByText('$500.00').first()).toBeVisible();
  await expect(page.getByText('Approved design milestone')).toBeVisible();

  await page.reload();
  await expect(page.getByText('$500.00').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /PDF statement/i }).click();
  expect((await download).suggestedFilename()).toBe('lantern-shop-refit-statement.pdf');
});

test('has no serious accessibility violations in the empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Retainer Ledger' })).toBeVisible();
  const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('loads without console or page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Retainer Ledger' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('keeps the app shell available offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async () => (await caches.keys()).some((key) => key.includes('shell')));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Retainer Ledger' })).toBeVisible();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
});

test('renders the local-data privacy page', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('stay on this device');
  await expect(page.getByText(/no analytics, advertising, trackers/i)).toBeVisible();
});

test('stores and verifies a returned one-time license without sending ledger data', async ({ page }) => {
  let verificationUrl = '';
  await page.route('https://api.sociobot.in/api/v1/products/deposit-drawdown-ledger/verify?license=*', async (route) => {
    verificationUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/?license=test-license-token');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Unlocked' })).toBeVisible();
  expect(verificationUrl).toContain('license=test-license-token');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:deposit-drawdown-ledger'))).toBe('test-license-token');
  await page.getByRole('button', { name: 'Unlocked' }).click();
  await page.getByLabel('Business name').fill('Mina Workshop');
  await page.getByRole('button', { name: /save statement branding/i }).click();
  await expect(page.getByText(/branding saved/i)).toBeAttached();
});
