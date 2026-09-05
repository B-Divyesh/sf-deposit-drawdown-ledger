import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Buffer } from 'node:buffer';

async function createJob(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /start your first ledger/i }).click();
  await page.getByLabel('Job name').fill('Lantern shop refit');
  await page.getByLabel('Client name').fill('Mina & Co');
  await page.getByLabel(/Job reference/).fill('JOB-104');
  await page.getByLabel('Deposit requested').fill('1000');
  await page.getByRole('button', { name: /create ledger/i }).click();
  await expect(page.getByRole('heading', { name: 'Lantern shop refit' })).toBeVisible();
}

async function localLedgerCounts(page: import('@playwright/test').Page): Promise<{ jobs: number; records: number }> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('retainer-ledger-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['jobs', 'records'], 'readonly');
      const jobs = transaction.objectStore('jobs').count();
      const records = transaction.objectStore('records').count();
      transaction.oncomplete = () => { db.close(); resolve({ jobs: jobs.result, records: records.result }); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
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

test('resets the isolated sample ledger without changing real mode', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await page.getByRole('button', { name: 'Record activity' }).click();
  await page.getByLabel('Amount').fill('10');
  await page.getByLabel('Description').fill('Temporary sample payment');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText('Temporary sample payment')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Deposit ledger for Elm Street kitchen joinery' })).toBeVisible();
  await expect(page.getByText('Temporary sample payment')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
});

test('has no serious accessibility violations in the empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
  const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('loads without console or page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('keeps header and footer touch targets at least 44 pixels on a phone', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Touch target measurements apply to the configured phone project.');
  await page.goto('/');
  const targets = [
    page.getByRole('link', { name: 'Retainer Ledger home' }),
    page.getByRole('link', { name: 'Ledger', exact: true }),
    page.getByRole('link', { name: 'Demo', exact: true }),
    page.getByRole('link', { name: 'Privacy', exact: true }).first(),
    page.getByRole('button', { name: 'Data and backups' }),
    page.getByRole('link', { name: 'Terms', exact: true }),
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box, `${await target.innerText()} should have a box`).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('keeps the app shell available offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async () => (await caches.keys()).some((key) => key.includes('shell')));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
});

test('keeps a controlled production-hostname page reloadable offline', async ({ page, context }) => {
  await page.goto('https://deposit-drawdown-ledger.sociobot.in:4174/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async () => (await caches.keys()).some((key) => key.includes('shell')));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
});

test('activates a waiting worker from Update now, reloads, and removes old caches', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'The two-version server is intentionally shared with the desktop regression only.');
  await page.addInitScript(() => {
    const loads = Number(sessionStorage.getItem('qa-worker-loads') ?? '0');
    sessionStorage.setItem('qa-worker-loads', String(loads + 1));
  });
  await page.goto('http://127.0.0.1:4175/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((key) => key === 'retainer-ledger-qa-a-shell'))).toBe(true);

  await page.evaluate(() => fetch('/__qa-worker-version?version=qa-b'));
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  await expect(page.getByText('A fresh version is ready.')).toBeVisible();
  const reloaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Update now' }).click();
  await reloaded;
  await expect.poll(async () => page.evaluate(async () => ({
    caches: await caches.keys(),
    loads: Number(sessionStorage.getItem('qa-worker-loads') ?? '0'),
    controlled: Boolean(navigator.serviceWorker.controller),
  }))).toMatchObject({ caches: expect.arrayContaining(['retainer-ledger-qa-b-shell']), loads: 3, controlled: true });
  await expect.poll(async () => page.evaluate(async () => (await caches.keys()).some((key) => key.startsWith('retainer-ledger-qa-a-')))).toBe(false);
});

test('rejects a malformed backup atomically and remains usable after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /data and backups/i }).click();
  const malformedBackup = {
    schemaVersion: 1,
    exportedAt: '2026-08-28T12:00:00.000Z',
    jobs: [
      { id: 'bad-job-1', name: 'First bad job', client: 'QA', reference: '', currency: 'USD', createdAt: '2026-08-28T10:00:00.000Z', archived: false },
      { id: 'bad-job-2', name: 'Second bad job', client: 'QA', reference: '', currency: 'USD', createdAt: '2026-08-28T10:00:00.000Z', archived: false },
    ],
    records: [],
    branding: { businessName: '', contactLine: '' },
  };
  await page.locator('#import-file').setInputFiles({ name: 'malformed-ledger.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(malformedBackup)) });
  await expect(page.getByText('This file is not a Retainer Ledger v1 backup.')).toBeVisible();
  await expect.poll(() => localLedgerCounts(page)).toEqual({ jobs: 0, records: 0 });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your local ledger could not open.' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /start your first ledger/i })).toBeVisible();
});

test('offers an in-product recovery path for corrupt stored data', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('retainer-ledger-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('jobs', 'readwrite');
      transaction.objectStore('jobs').put({ id: 'damaged-job', name: 'Damaged import', client: 'QA', reference: '', currency: 'USD', createdAt: '2026-08-28T10:00:00.000Z', archived: false });
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your local ledger could not open.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download recovery copy' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear local ledger' }).click();
  const recoveryDialog = page.getByRole('dialog', { name: 'Start with an empty ledger?' });
  await expect(recoveryDialog).toBeVisible();
  await recoveryDialog.getByRole('button', { name: 'Clear local ledger' }).click();
  await expect(page.getByRole('button', { name: /start your first ledger/i })).toBeVisible();
  await expect.poll(() => localLedgerCounts(page)).toEqual({ jobs: 0, records: 0 });
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
