import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

const DEMO_JOB = 'Elm Street kitchen joinery';

async function openDemo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: `Deposit ledger for ${DEMO_JOB}` })).toBeVisible();
}

async function readDownload(download: import('@playwright/test').Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function addDemoRecord(page: import('@playwright/test').Page, options: { kind?: string; amount: string; description: string }): Promise<void> {
  await page.getByRole('button', { name: 'Record activity' }).click();
  if (options.kind) await page.getByLabel('Record type').selectOption(options.kind);
  await page.getByLabel('Amount').fill(options.amount);
  await page.getByLabel('Description').fill(options.description);
  await page.getByRole('button', { name: 'Save record' }).click();
}

async function demoCounts(page: import('@playwright/test').Page): Promise<{ jobs: number; records: number }> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('demo:retainer-ledger-v1');
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

async function realCounts(page: import('@playwright/test').Page): Promise<{ jobs: number; records: number }> {
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

test('@claim:demo-isolation keeps sample changes out of the real ledger', async ({ page }) => {
  await openDemo(page);
  await addDemoRecord(page, { amount: '15', description: 'Demo-only payment' });
  await expect(page.getByText('Demo-only payment')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Record deposits and show what work used them' })).toBeVisible();
  await expect.poll(() => realCounts(page)).toEqual({ jobs: 0, records: 0 });
  await expect(page.getByText('Demo-only payment')).toHaveCount(0);
});

test('@claim:requested-not-held keeps requested deposits separate from money received', async ({ page }) => {
  await openDemo(page);
  const totals = page.getByLabel('Job totals');
  await expect(totals.getByText('Requested')).toBeVisible();
  await expect(totals.getByText('Payments recorded')).toBeVisible();
  await expect(totals.getByText('$4,800.00')).toHaveCount(2);
  await expect(page.locator('.remaining')).toContainText('$2,450.00');
});

test('@claim:record-types-and-balance records each activity type and shows the remaining deposit', async ({ page }) => {
  await openDemo(page);
  for (const label of ['Deposit request', 'Payment received', 'Approved drawdown', 'Balance adjustment']) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  await expect(page.locator('.remaining')).toContainText('Deposit remaining');
  await expect(page.locator('.remaining')).toContainText('$2,450.00');
});

test('@claim:append-only-adjustments keeps a dated correction in the activity trail', async ({ page }) => {
  await openDemo(page);
  const before = await demoCounts(page);
  await addDemoRecord(page, { kind: 'adjustment', amount: '-100', description: 'Sample correction for changed hardware' });
  await expect(page.getByText('Sample correction for changed hardware')).toBeVisible();
  await expect(page.getByText('Balance adjustment').first()).toBeVisible();
  await expect.poll(() => demoCounts(page)).toEqual({ jobs: before.jobs, records: before.records + 1 });
  await expect(page.getByRole('button', { name: /edit|delete/i })).toHaveCount(0);
});

test('@claim:timestamped-pdf exports a one-page statement with a generated timestamp', async ({ page }) => {
  await openDemo(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF statement' }).click();
  const bytes = await readDownload(await downloadPromise);
  const statement = bytes.toString('utf8');
  expect(statement.startsWith('%PDF-1.4')).toBe(true);
  expect(statement).toContain('Generated ');
  expect(statement).toContain('/Count 1');
});

test('@claim:complete-csv exports every sample activity row as CSV', async ({ page }) => {
  await openDemo(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  const csv = (await readDownload(await downloadPromise)).toString('utf8');
  const rows = csv.trim().split(/\r?\n/);
  expect(rows[0]).toContain('balance_effect');
  expect(rows).toHaveLength(6);
  expect(csv).toContain('Approved site survey and joinery drawings');
  expect(csv).toContain('Credit agreed for revised hardware');
});

test('@claim:json-backup exports a backup and imports a new ledger without replacing the sample', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Data and backups' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON backup' }).click();
  const backup = JSON.parse((await readDownload(await downloadPromise)).toString('utf8')) as { schemaVersion: number; jobs: unknown[]; records: unknown[] };
  expect(backup.schemaVersion).toBe(1);
  expect(backup.jobs).toHaveLength(1);
  expect(backup.records).toHaveLength(5);

  const imported = {
    schemaVersion: 1,
    exportedAt: '2026-09-05T12:00:00.000Z',
    jobs: [{ id: 'demo-imported-job', name: 'Garden studio repair', client: 'Morgan Lee', reference: 'GL-88', currency: 'USD', createdAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-05T09:00:00.000Z', archived: false }],
    records: [{ id: 'demo-imported-request', jobId: 'demo-imported-job', kind: 'request', amountCents: 120000, occurredOn: '2026-09-05', description: 'Deposit requested', reference: 'GL-88', createdAt: '2026-09-05T09:00:00.000Z' }],
    branding: { businessName: '', contactLine: '' },
  };
  await page.locator('#import-file').setInputFiles({ name: 'garden-studio.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.getByText('Garden studio repair')).toBeVisible();
  await expect(page.getByRole('button', { name: /Elm Street kitchen joinery Hawthorn Café/ })).toBeVisible();
});

test('@claim:indexeddb-persistence keeps a recorded activity after a reload', async ({ page }) => {
  await openDemo(page);
  await addDemoRecord(page, { amount: '25', description: 'Sample cash receipt' });
  await expect(page.getByText('Sample cash receipt')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Sample cash receipt')).toBeVisible();
  await expect.poll(() => demoCounts(page)).toEqual({ jobs: 1, records: 6 });
});

test('@claim:offline-reload works offline after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const baseURL = test.info().project.use.baseURL as string;
    await page.goto(`${baseURL}/demo`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: `Deposit ledger for ${DEMO_JOB}` })).toBeVisible();
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('@claim:no-account-or-sync opens the sample ledger without sign-in or an account form', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Records stay on this device.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in|create account/i })).toHaveCount(0);
  await expect(page.locator('input[type="password"], input[type="email"]')).toHaveCount(0);
});

test('@claim:local-only-data keeps sample ledger activity on the product origin', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await openDemo(page);
  await addDemoRecord(page, { amount: '40', description: 'Local-only sample payment' });
  await page.waitForTimeout(150);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('@claim:no-trackers-or-cdns loads the sample without third-party requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.waitForTimeout(150);
  const origin = new URL(page.url()).origin;
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
});

test('@claim:license-request-excludes-ledger-data sends only a license token to verification', async ({ page }) => {
  let verification: import('@playwright/test').Request | undefined;
  await page.route('https://api.sociobot.in/api/v1/products/deposit-drawdown-ledger/verify?license=*', async (route) => {
    verification = route.request();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/demo?license=sample-license-token');
  await expect.poll(() => Boolean(verification)).toBe(true);
  const url = new URL(verification!.url());
  expect([...url.searchParams.keys()]).toEqual(['license']);
  expect(url.searchParams.get('license')).toBe('sample-license-token');
  expect(verification!.postData()).toBeNull();
  expect(await page.evaluate(() => indexedDB.databases().then((items) => items.map((item) => item.name)))).toContain('demo:retainer-ledger-v1');
});

test('@claim:damaged-data-recovery offers a recovery reset and returns to a usable sample ledger', async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('demo:retainer-ledger-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('jobs', 'readwrite');
      transaction.objectStore('jobs').put({ id: 'corrupt-demo-job', name: 'Broken sample', client: 'QA', reference: '', currency: 'USD', createdAt: '2026-09-05T09:00:00.000Z', archived: false });
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Your local ledger could not open.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear local ledger' }).click();
  await page.getByRole('dialog', { name: 'Start with an empty ledger?' }).getByRole('button', { name: 'Clear local ledger' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Deposit ledger for ${DEMO_JOB}` })).toBeVisible();
});

test('@claim:one-free-job offers the paid sheet before a second job can be created', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Create a job' }).click();
  await expect(page.getByRole('dialog', { name: 'More ledgers, your name.' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('$29')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('one time')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Create ledger' })).toHaveCount(0);
});

test('@claim:one-time-unlock starts the hosted $29 checkout and enables unlimited jobs and statement branding after a valid license', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  const offer = page.getByRole('dialog', { name: 'More ledgers, your name.' });
  await expect(offer.getByText('$29')).toBeVisible();
  await expect(offer.getByText('one time')).toBeVisible();
  await expect(offer.getByText('Unlimited job ledgers')).toBeVisible();
  await expect(offer.getByText('Your business name and contact line on PDF statements')).toBeVisible();

  const checkout = offer.getByRole('link', { name: /buy the one-time unlock/i });
  const checkoutHref = await checkout.getAttribute('href');
  expect(checkoutHref).not.toBeNull();
  const checkoutResponse = await page.request.get(checkoutHref!, { maxRedirects: 0 });
  expect(checkoutResponse.status()).toBe(303);
  const checkoutLocation = checkoutResponse.headers().location;
  expect(checkoutLocation).toBeTruthy();
  expect(new URL(checkoutLocation!).hostname).toBe('checkout.dodopayments.com');
  const hostedCheckout = await page.request.get(checkoutHref!, { maxRedirects: 1 });
  expect(hostedCheckout.status()).toBe(200);
  expect(new URL(hostedCheckout.url()).hostname).toBe('checkout.dodopayments.com');

  await offer.getByLabel('Have a license? Paste it here').fill('retainer-ledger-public-invalid-probe');
  await offer.getByRole('button', { name: 'Verify license' }).click();
  await expect(offer.getByText('That license is not active for Retainer Ledger. Check the token and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unlock', exact: true })).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem('sb_license:deposit-drawdown-ledger');
    localStorage.removeItem('sb_license_verdict:deposit-drawdown-ledger');
  });

  await page.route('https://api.sociobot.in/api/v1/products/deposit-drawdown-ledger/verify?license=*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/demo?license=paid-sample-token');
  await expect(page.getByRole('button', { name: 'Unlocked' })).toBeVisible();
  await page.getByRole('button', { name: 'Unlocked' }).click();
  await expect(page.getByText('Unlimited jobs and custom statement branding are active.')).toBeVisible();
  await expect(page.getByLabel('Business name')).toBeVisible();
});
