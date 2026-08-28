import './styles.css';
import { calculateTotals, formatMoney, parseMoney, recordEffect } from './calculations';
import { buildStatementPdf, safeFilename } from './pdf';
import { checkoutUrl, consumeReturnedLicense, getLicense, isPaidFromCache, storeLicense, verifyLicense } from './license';
import { addJob, addRecord, clearLedger, exportBundle, exportRecoveryBundle, importBundle, loadLedger, saveBranding } from './storage';
import type { Branding, CurrencyCode, Job, LedgerRecord, RecordKind } from './types';

const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;
if (!app) throw new Error('App root was not found.');

let jobs: Job[] = [];
let records: LedgerRecord[] = [];
let branding: Branding = { businessName: '', contactLine: '' };
let selectedJobId = localStorage.getItem('retainer-ledger:selected-job');
let paid = isPaidFromCache();
let loading = true;
let fatalError = '';
let announcement = '';

const icon = (name: 'plus' | 'arrow' | 'download' | 'lock' | 'data' | 'receipt') => {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="m8 5 7 7-7 7"/>',
    download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    data: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function uid(): string {
  return crypto.randomUUID();
}

function currentJob(): Job | undefined {
  return jobs.find((job) => job.id === selectedJobId) ?? jobs[0];
}

function recordsFor(jobId: string): LedgerRecord[] {
  return records.filter((record) => record.jobId === jobId);
}

function announce(message: string): void {
  announcement = message;
  const live = document.querySelector<HTMLElement>('#live-region');
  if (live) live.textContent = message;
}

function showDialog(id: string): void {
  const dialog = document.querySelector<HTMLDialogElement>(`#${id}`);
  dialog?.showModal();
  requestAnimationFrame(() => dialog?.querySelector<HTMLElement>('input, select, button')?.focus());
}

function closeDialog(id: string): void {
  document.querySelector<HTMLDialogElement>(`#${id}`)?.close();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function renderLegal(page: 'privacy' | 'terms'): void {
  const privacy = page === 'privacy';
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Retainer Ledger`;
  app.innerHTML = `
    <header class="site-header"><a class="brand" href="/" data-route><span class="brand-mark">${icon('receipt')}</span><span>Retainer Ledger</span></a></header>
    <main id="main" class="legal-page">
      <p class="eyebrow">Plain-language ${privacy ? 'privacy' : 'terms'}</p>
      <h1>${privacy ? 'Your records stay on this device.' : 'A record-keeping utility, not advice.'}</h1>
      ${privacy ? `
        <p>Retainer Ledger stores job details, deposit requests, payments, drawdowns, adjustments, and optional statement branding in your browser’s IndexedDB. We do not receive or sync those records.</p>
        <h2>What leaves your device</h2><p>If you buy or restore the one-time unlock, the license token is sent to the Sociobot billing API to verify it. Sociobot and Dodo act as merchant of record and process checkout information under their own policies. No ledger entries are included in that request.</p>
        <h2>Your controls</h2><p>You can download a JSON backup or CSV at any time. Clearing site data removes the local copy, so keep a backup. Uninstalling the app may not remove browser storage, depending on your device.</p>
        <h2>Analytics</h2><p>This product includes no analytics, advertising, trackers, third-party fonts, or runtime scripts.</p>` : `
        <p>Retainer Ledger helps you record and explain deposit drawdowns. It does not provide accounting, tax, legal, or revenue-recognition advice. Check the statement against your bank or payment record before sharing it.</p>
        <h2>Your records</h2><p>You are responsible for the accuracy of entries and for keeping backups. Records are append-only in the interface; corrections are preserved as adjustment lines. The software is provided without warranty under the MIT License.</p>
        <h2>One-time unlock</h2><p>The $29 one-time purchase unlocks unlimited jobs and custom statement branding for this product. Sociobot/Dodo is the merchant of record. Refunds are handled there; a refund revokes the license. Core export and accessibility features remain free.</p>
        <h2>Acceptable use</h2><p>Do not use the product to create deceptive records or misrepresent a payment. You retain responsibility for statements you share.</p>`}
      <p><a class="text-link" href="/" data-route>← Back to the ledger</a></p>
    </main>
    <footer class="site-footer"><span>Retainer Ledger</span><span>Effective 28 August 2026</span></footer>`;
  bindRoutes();
}

function renderLoading(): void {
  app.innerHTML = `
    <header class="site-header"><span class="brand"><span class="brand-mark">${icon('receipt')}</span><span>Retainer Ledger</span></span></header>
    <main id="main" class="loading-state"><h1>Opening your ledger…</h1><p>Your records are loaded from this device.</p><div class="loading-lines" aria-hidden="true"></div></main>`;
}

function recordLabel(kind: RecordKind): string {
  return { request: 'Deposit request', payment: 'Payment received', drawdown: 'Approved drawdown', adjustment: 'Balance adjustment' }[kind];
}

function renderRecordRows(job: Job, jobRecords: LedgerRecord[]): string {
  if (jobRecords.length === 0) return '<div class="history-empty"><p>No records yet.</p><p>Record a deposit request or payment to start the trail.</p></div>';
  return `<ol class="record-list">${jobRecords.map((record) => {
    const effect = recordEffect(record);
    const amountClass = effect > 0 ? 'money-in' : effect < 0 ? 'money-out' : 'money-neutral';
    const amount = effect === 0 ? formatMoney(Math.abs(record.amountCents), job.currency) : `${effect > 0 ? '+' : '−'}${formatMoney(Math.abs(effect), job.currency)}`;
    return `<li class="record-row ${amountClass}">
      <div class="record-sign" aria-hidden="true">${record.kind === 'payment' ? '+' : record.kind === 'drawdown' ? '−' : record.kind === 'adjustment' ? '±' : 'R'}</div>
      <div class="record-copy"><strong>${recordLabel(record.kind)}</strong><span>${escapeHtml(record.description)}</span><small>${escapeHtml(record.occurredOn)}${record.reference ? ` · ${escapeHtml(record.reference)}` : ''}</small></div>
      <div class="record-amount"><strong>${amount}</strong><span>${effect === 0 ? 'requested' : 'balance effect'}</span></div>
    </li>`;
  }).join('')}</ol>`;
}

function renderEmpty(): string {
  return `<section class="empty-ledger" aria-labelledby="empty-title">
    <div class="empty-art"><picture><source type="image/avif" srcset="/assets/hero-night-ledger-480.avif 480w, /assets/hero-night-ledger-960.avif 960w" sizes="(max-width: 680px) calc(100vw - 72px), (max-width: 900px) 520px, 42vw"><source type="image/webp" srcset="/assets/hero-night-ledger-480.webp 480w, /assets/hero-night-ledger-960.webp 960w" sizes="(max-width: 680px) calc(100vw - 72px), (max-width: 900px) 520px, 42vw"><img src="/assets/hero-night-ledger-960.jpg" width="960" height="640" alt="A blank cream ledger surrounded by cyan deposit tokens and amber work tokens on a rain-dark market counter." decoding="async" fetchpriority="high"></picture><span class="art-label">Money held → work approved</span></div>
    <div class="empty-copy"><p class="eyebrow">A clean trail, from deposit to done</p><h2 id="empty-title">Give every deposit a story your client can follow.</h2><p>Start a job, record what arrived, and draw down only the work that was approved. Corrections stay visible.</p><button class="button primary" data-action="new-job">${icon('plus')} Start your first ledger</button><p class="micro">Free for one complete job. No account or cloud sync.</p></div>
  </section>`;
}

function renderActive(job: Job): string {
  const jobRecords = recordsFor(job.id);
  const totals = calculateTotals(jobRecords);
  const negative = totals.remaining < 0;
  return `<section class="ledger-workspace" aria-label="Selected job ledger">
    <div class="job-heading">
      <div><p class="eyebrow">${escapeHtml(job.client)}${job.reference ? ` · ${escapeHtml(job.reference)}` : ''}</p><h2>${escapeHtml(job.name)}</h2><p>Created ${new Date(job.createdAt).toLocaleDateString()}</p></div>
      <div class="remaining ${negative ? 'negative' : ''}"><span>Deposit remaining</span><strong>${formatMoney(totals.remaining, job.currency)}</strong><small>${negative ? 'Drawdowns exceed recorded funds' : 'Payments − drawdowns ± adjustments'}</small></div>
    </div>
    <div class="totals-grid" aria-label="Job totals">
      <div><span>Requested</span><strong>${formatMoney(totals.requested, job.currency)}</strong></div>
      <div><span>Payments recorded</span><strong>${formatMoney(totals.received, job.currency)}</strong></div>
      <div><span>Approved work</span><strong>${formatMoney(totals.drawn, job.currency)}</strong></div>
      <div><span>Adjustments</span><strong>${totals.adjustments > 0 ? '+' : ''}${formatMoney(totals.adjustments, job.currency)}</strong></div>
    </div>
    ${negative ? '<div class="balance-warning" role="alert"><strong>Check this balance.</strong> Drawdowns and corrections now exceed the payments recorded for this job.</div>' : ''}
    <div class="ledger-actions"><button class="button primary" data-action="new-record">${icon('plus')} Record activity</button><button class="button secondary" data-action="pdf">${icon('download')} PDF statement</button><button class="button quiet" data-action="csv">CSV</button></div>
    <section class="history" aria-labelledby="history-title"><div class="section-heading"><div><p class="eyebrow">Append-only history</p><h2 id="history-title">Deposit trail</h2></div><p>${jobRecords.length} ${jobRecords.length === 1 ? 'record' : 'records'} · newest first</p></div>${renderRecordRows(job, jobRecords)}</section>
    <div class="record-note"><span aria-hidden="true">i</span><p>Entries cannot be edited or deleted. If something changes, add a dated adjustment so the explanation remains intact.</p></div>
  </section>`;
}

function renderDialogs(job?: Job): string {
  const jobRecords = job ? recordsFor(job.id) : [];
  const totals = calculateTotals(jobRecords);
  return `
    <dialog id="new-job-dialog" aria-labelledby="new-job-title"><form method="dialog" class="dialog-form" id="new-job-form"><div class="dialog-head"><div><p class="eyebrow">New ledger</p><h2 id="new-job-title">Set up the job</h2></div><button class="icon-button" value="cancel" aria-label="Close new job dialog">×</button></div><p class="dialog-intro">The deposit request becomes the first permanent line in this job’s record.</p>
      <div class="form-grid"><label class="wide">Job name<input name="name" required maxlength="80" autocomplete="off"></label><label>Client name<input name="client" required maxlength="80" autocomplete="organization"></label><label>Job reference <span>optional</span><input name="reference" maxlength="40" autocomplete="off"></label><label>Deposit requested<input name="amount" required inputmode="decimal" placeholder="0.00" aria-describedby="new-job-help"></label><label>Currency<select name="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>CAD</option><option>AUD</option></select></label><label>Request date<input name="date" type="date" value="${today()}" required></label><label class="wide">Request note<input name="description" maxlength="120" value="Initial deposit requested" required></label></div><p id="new-job-help" class="form-help">Use the amount formally requested from the client. Record each payment separately when it arrives.</p><p class="form-error" id="new-job-error" role="alert"></p><div class="dialog-actions"><button class="button quiet" value="cancel">Cancel</button><button class="button primary" value="default">Create ledger ${icon('arrow')}</button></div></form></dialog>
    <dialog id="record-dialog" aria-labelledby="record-title"><form method="dialog" class="dialog-form" id="record-form"><div class="dialog-head"><div><p class="eyebrow">${job ? escapeHtml(job.name) : 'Selected job'}</p><h2 id="record-title">Record activity</h2></div><button class="icon-button" value="cancel" aria-label="Close activity dialog">×</button></div><p class="dialog-intro">Every saved record stays visible. Use an adjustment to correct an earlier entry.</p>
      <div class="form-grid"><label class="wide">Record type<select name="kind" id="record-kind"><option value="payment">Payment received</option><option value="drawdown">Approved drawdown</option><option value="request">Additional deposit request</option><option value="adjustment">Balance adjustment</option></select></label><label>Amount<input name="amount" required inputmode="decimal" placeholder="0.00" aria-describedby="record-help"></label><label>Date<input name="date" type="date" value="${today()}" required></label><label class="wide">Description<input name="description" required maxlength="120" placeholder="What this record is for"></label><label class="wide">Reference <span>optional</span><input name="reference" maxlength="60" placeholder="Bank reference, milestone, or approval"></label></div><p id="record-help" class="form-help">Current remaining balance: ${job ? formatMoney(totals.remaining, job.currency) : '—'}. For an adjustment, enter a positive amount to add or a negative amount to reduce the balance.</p><p class="form-error" id="record-error" role="alert"></p><div class="dialog-actions"><button class="button quiet" value="cancel">Cancel</button><button class="button primary" value="default">Save record ${icon('arrow')}</button></div></form></dialog>
    <dialog id="data-dialog" aria-labelledby="data-title"><div class="dialog-form"><div class="dialog-head"><div><p class="eyebrow">Device storage</p><h2 id="data-title">Own your records</h2></div><button class="icon-button" data-close="data-dialog" aria-label="Close data dialog">×</button></div><p class="dialog-intro">Your ledger lives only in this browser. Download a backup before clearing site data or moving devices.</p><div class="data-actions"><button class="button secondary" data-action="backup">${icon('download')} Download JSON backup</button><label class="button quiet file-button">Import JSON backup<input id="import-file" type="file" accept="application/json,.json"></label></div><p class="form-help">Import merges unseen jobs and records. It never overwrites an existing record with the same ID.</p><p class="form-error" id="data-error" role="alert"></p><div class="dialog-actions"><button class="button primary" data-close="data-dialog">Done</button></div></div></dialog>
    <dialog id="unlock-dialog" aria-labelledby="unlock-title"><div class="dialog-form unlock-sheet"><div class="dialog-head"><div><p class="eyebrow">One-time unlock</p><h2 id="unlock-title">More ledgers, your name.</h2></div><button class="icon-button" data-close="unlock-dialog" aria-label="Close unlock dialog">×</button></div>${paid ? `<div class="paid-status"><strong>Unlocked on this device</strong><span>Unlimited jobs and custom statement branding are active.</span></div><form id="branding-form"><label>Business name<input name="businessName" maxlength="70" value="${escapeHtml(branding.businessName)}" placeholder="Your business"></label><label>Statement contact line<input name="contactLine" maxlength="100" value="${escapeHtml(branding.contactLine)}" placeholder="email@example.com · 555 0100"></label><p class="form-help">This appears at the top of PDF statements. Your ledger data is never sent during license verification.</p><button class="button primary" type="submit">Save statement branding</button></form>` : `<p class="price"><strong>$29</strong><span>one time</span></p><ul class="feature-list"><li>Unlimited job ledgers</li><li>Your business name and contact line on PDF statements</li><li>Works offline after activation</li></ul><a class="button primary" href="${checkoutUrl()}">Buy the one-time unlock ${icon('arrow')}</a><div class="restore"><label for="license-token">Have a license? Paste it here</label><div><input id="license-token" autocomplete="off" spellcheck="false"><button class="button secondary" data-action="restore-license">Verify license</button></div><p class="form-error" id="license-error" role="alert"></p></div><p class="legal-copy">Sociobot/Dodo is the merchant of record and handles refunds. A refund revokes the license. <a href="/privacy" data-route>Privacy</a> · <a href="/terms" data-route>Terms</a></p>`}<div class="dialog-actions"><button class="button quiet" data-close="unlock-dialog">Close</button></div></div></dialog>`;
}

function renderApp(): void {
  if (loading) return renderLoading();
  const page = location.pathname.replace(/\/$/, '');
  if (page === '/privacy' || page === '/terms') return renderLegal(page.slice(1) as 'privacy' | 'terms');
  document.title = 'Retainer Ledger — clear deposit drawdowns';
  const job = currentJob();
  if (job && selectedJobId !== job.id) selectedJobId = job.id;
  const online = navigator.onLine;
  app.innerHTML = `
    <header class="site-header"><a class="brand" href="/" aria-label="Retainer Ledger home"><span class="brand-mark">${icon('receipt')}</span><span>Retainer Ledger</span></a><div class="header-actions"><span class="network-status ${online ? '' : 'offline'}"><i></i>${online ? 'Local' : 'Offline'}</span><button class="header-button" data-action="data" aria-label="Data and backups">${icon('data')} <span>Data</span></button><button class="header-button" data-action="unlock">${paid ? 'Unlocked' : `${icon('lock')} Unlock`}</button></div></header>
    <main id="main"><div class="app-title"><div><p class="eyebrow">Deposit → drawdown → balance</p><h1>Retainer Ledger</h1></div><p>A client-ready record of money held and work approved.</p></div>
      ${fatalError ? `<div class="fatal-error" role="alert"><h2>Your local ledger could not open.</h2><p>${escapeHtml(fatalError)}</p><p>Nothing has been sent anywhere. Save a recovery copy before clearing this browser’s damaged local data.</p><div class="dialog-actions"><button class="button secondary" data-action="export-recovery">Download recovery copy</button><button class="button quiet" data-action="retry">Try again</button><button class="button primary" data-action="clear-corrupt-data">Clear local ledger</button></div></div><dialog id="recovery-dialog" aria-labelledby="recovery-title"><div class="dialog-form"><div class="dialog-head"><div><p class="eyebrow">Clear local data</p><h2 id="recovery-title">Start with an empty ledger?</h2></div><button class="icon-button" data-close="recovery-dialog" aria-label="Close recovery dialog">×</button></div><p>This removes all Retainer Ledger jobs, records, and branding from this browser. Download a recovery copy first if you may need the damaged data.</p><div class="dialog-actions"><button class="button quiet" data-close="recovery-dialog">Cancel</button><button class="button primary" data-action="confirm-clear-corrupt-data">Clear local ledger</button></div></div></dialog>` : `<div class="app-shell"><aside class="job-rail"><div class="rail-head"><div><p class="eyebrow">Your work</p><h2>Jobs</h2></div><button class="icon-button add-job" data-action="new-job" aria-label="Create a job">${icon('plus')}</button></div>${jobs.length ? `<nav aria-label="Job ledgers"><ul class="job-list">${jobs.map((item) => { const itemTotals = calculateTotals(recordsFor(item.id)); return `<li><button class="job-button ${item.id === job?.id ? 'active' : ''}" data-job-id="${item.id}" ${item.id === job?.id ? 'aria-current="page"' : ''}><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.client)}</small><strong>${formatMoney(itemTotals.remaining, item.currency)}</strong></button></li>`; }).join('')}</ul></nav>` : '<p class="rail-empty">Your job ledgers will line up here.</p>'}<div class="rail-footer"><span>${paid ? 'Unlimited ledgers' : 'Free ledger · 1 job'}</span>${!paid ? '<button class="text-button" data-action="unlock">See unlock</button>' : ''}</div></aside><div class="workbench">${job ? renderActive(job) : renderEmpty()}</div></div>`}
    </main>
    <footer class="site-footer"><span>Records stay on this device.</span><span><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a><span>Generated illustration · original AI-assisted art</span></span></footer>
    <div id="live-region" class="sr-only" aria-live="polite">${escapeHtml(announcement)}</div><div id="update-toast" class="toast" hidden><span>A fresh version is ready.</span><button class="button secondary" data-action="update">Update now</button></div>
    ${renderDialogs(job)}`;
  bindEvents();
  bindRoutes();
}

function setFormError(id: string, message: string): void {
  const error = document.querySelector<HTMLElement>(`#${id}`);
  if (error) error.textContent = message;
}

function csvCell(value: string | number): string {
  let string = String(value);
  if (/^[=+\-@]/.test(string)) string = `'${string}`;
  return `"${string.replaceAll('"', '""')}"`;
}

function downloadCsv(job: Job): void {
  const rows = [['date', 'type', 'description', 'reference', 'recorded_amount', 'balance_effect', 'currency', 'created_at']];
  for (const record of [...recordsFor(job.id)].reverse()) {
    rows.push([record.occurredOn, record.kind, record.description, record.reference, (record.amountCents / 100).toFixed(2), (recordEffect(record) / 100).toFixed(2), job.currency, record.createdAt]);
  }
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFilename(job.name)}-ledger.csv`);
  announce('CSV downloaded.');
}

async function handleNewJob(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const amount = parseMoney(String(data.get('amount') ?? ''));
  if (amount === null || amount <= 0) return setFormError('new-job-error', 'Enter a deposit amount greater than zero, with no more than two decimal places.');
  const name = String(data.get('name') ?? '').trim();
  const client = String(data.get('client') ?? '').trim();
  const date = String(data.get('date') ?? '');
  if (!name || !client || !date) return setFormError('new-job-error', 'Add the job name, client, and request date.');
  const now = new Date().toISOString();
  const job: Job = { id: uid(), name, client, reference: String(data.get('reference') ?? '').trim(), currency: String(data.get('currency')) as CurrencyCode, createdAt: now, updatedAt: now, archived: false };
  const record: LedgerRecord = { id: uid(), jobId: job.id, kind: 'request', amountCents: amount, occurredOn: date, description: String(data.get('description') ?? '').trim(), reference: job.reference, createdAt: now };
  try {
    await addJob(job, record);
    jobs = [job, ...jobs];
    records = [record, ...records];
    selectedJobId = job.id;
    localStorage.setItem('retainer-ledger:selected-job', job.id);
    closeDialog('new-job-dialog');
    renderApp();
    announce(`${job.name} ledger created.`);
  } catch (error) {
    setFormError('new-job-error', error instanceof Error ? error.message : 'The ledger could not be saved. Try again.');
  }
}

async function handleRecord(form: HTMLFormElement): Promise<void> {
  const job = currentJob();
  if (!job) return;
  const data = new FormData(form);
  const kind = String(data.get('kind')) as RecordKind;
  const parsed = parseMoney(String(data.get('amount') ?? ''));
  if (parsed === null || parsed === 0) return setFormError('record-error', 'Enter a non-zero amount with no more than two decimal places.');
  if (kind !== 'adjustment' && parsed < 0) return setFormError('record-error', 'Use a positive amount for requests, payments, and drawdowns.');
  const amount = kind === 'adjustment' ? parsed : Math.abs(parsed);
  const totals = calculateTotals(recordsFor(job.id));
  if (kind === 'drawdown' && amount > totals.remaining) return setFormError('record-error', `This drawdown is more than the remaining deposit (${formatMoney(totals.remaining, job.currency)}). Record the missing payment or use a clearly described adjustment first.`);
  const description = String(data.get('description') ?? '').trim();
  const date = String(data.get('date') ?? '');
  if (!description || !date) return setFormError('record-error', 'Add a description and date for this permanent record.');
  const now = new Date().toISOString();
  const record: LedgerRecord = { id: uid(), jobId: job.id, kind, amountCents: amount, occurredOn: date, description, reference: String(data.get('reference') ?? '').trim(), createdAt: now };
  const updatedJob = { ...job, updatedAt: now };
  try {
    await addRecord(record, updatedJob);
    records = [record, ...records];
    jobs = [updatedJob, ...jobs.filter((item) => item.id !== job.id)];
    closeDialog('record-dialog');
    renderApp();
    announce(`${recordLabel(kind)} saved. The remaining balance is ${formatMoney(calculateTotals(recordsFor(job.id)).remaining, job.currency)}.`);
  } catch (error) {
    setFormError('record-error', error instanceof Error ? error.message : 'The record could not be saved. Try again.');
  }
}

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => element.addEventListener('click', async () => {
    const action = element.dataset.action;
    if (action === 'new-job') {
      if (!paid && jobs.length >= 1) showDialog('unlock-dialog');
      else showDialog('new-job-dialog');
    }
    if (action === 'new-record') showDialog('record-dialog');
    if (action === 'data') showDialog('data-dialog');
    if (action === 'unlock') showDialog('unlock-dialog');
    if (action === 'retry') await initialize();
    if (action === 'export-recovery') {
      try {
        const bundle = await exportRecoveryBundle();
        downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }), `retainer-ledger-recovery-${today()}.json`);
        announce('Recovery copy downloaded.');
      } catch {
        announce('The recovery copy could not be prepared. Try again before clearing data.');
      }
    }
    if (action === 'clear-corrupt-data') showDialog('recovery-dialog');
    if (action === 'confirm-clear-corrupt-data') {
      try {
        await clearLedger();
        localStorage.removeItem('retainer-ledger:selected-job');
        selectedJobId = null;
        jobs = [];
        records = [];
        branding = { businessName: '', contactLine: '' };
        await initialize();
        announce('The damaged local ledger was cleared. You can start a new ledger now.');
      } catch (error) {
        fatalError = error instanceof Error ? error.message : 'The local ledger could not be cleared.';
        renderApp();
      }
    }
    if (action === 'csv') { const job = currentJob(); if (job) downloadCsv(job); }
    if (action === 'pdf') {
      const job = currentJob();
      if (!job) return;
      const pdfBranding = paid ? branding : { businessName: '', contactLine: '' };
      const bytes = buildStatementPdf(job, recordsFor(job.id), pdfBranding);
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${safeFilename(job.name)}-statement.pdf`);
      announce('One-page PDF statement downloaded.');
    }
    if (action === 'backup') {
      try {
        const bundle = await exportBundle();
        downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }), `retainer-ledger-backup-${today()}.json`);
        announce('JSON backup downloaded.');
      } catch { setFormError('data-error', 'The backup could not be prepared. Try again.'); }
    }
    if (action === 'restore-license') {
      const input = document.querySelector<HTMLInputElement>('#license-token');
      const token = input?.value.trim() ?? '';
      if (!token) return setFormError('license-error', 'Paste the license token from your purchase receipt.');
      storeLicense(token);
      element.setAttribute('disabled', '');
      element.textContent = 'Verifying…';
      const verdict = await verifyLicense(true);
      if (verdict?.valid) {
        paid = true;
        closeDialog('unlock-dialog');
        renderApp();
        announce('License verified. Unlimited jobs and statement branding are unlocked.');
      } else {
        element.removeAttribute('disabled');
        element.textContent = 'Verify license';
        setFormError('license-error', navigator.onLine ? 'That license is not active for Retainer Ledger. Check the token and try again.' : 'You are offline. Connect once to verify this license.');
      }
    }
    if (action === 'update') navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
  }));

  document.querySelectorAll<HTMLElement>('[data-close]').forEach((element) => element.addEventListener('click', () => closeDialog(element.dataset.close ?? '')));
  document.querySelectorAll<HTMLButtonElement>('[data-job-id]').forEach((button) => button.addEventListener('click', () => {
    selectedJobId = button.dataset.jobId ?? null;
    if (selectedJobId) localStorage.setItem('retainer-ledger:selected-job', selectedJobId);
    renderApp();
  }));

  document.querySelector<HTMLFormElement>('#new-job-form')?.addEventListener('submit', (event) => {
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === 'cancel') return;
    event.preventDefault();
    void handleNewJob(event.currentTarget as HTMLFormElement);
  });
  document.querySelector<HTMLFormElement>('#record-form')?.addEventListener('submit', (event) => {
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === 'cancel') return;
    event.preventDefault();
    void handleRecord(event.currentTarget as HTMLFormElement);
  });
  document.querySelector<HTMLFormElement>('#branding-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    branding = { businessName: String(data.get('businessName') ?? '').trim(), contactLine: String(data.get('contactLine') ?? '').trim() };
    await saveBranding(branding);
    closeDialog('unlock-dialog');
    renderApp();
    announce('Statement branding saved.');
  });
  document.querySelector<HTMLInputElement>('#import-file')?.addEventListener('change', async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await importBundle(JSON.parse(await file.text()) as unknown);
      const loaded = await loadLedger();
      jobs = loaded.jobs; records = loaded.records; branding = loaded.branding;
      closeDialog('data-dialog');
      renderApp();
      announce(`Backup merged: ${result.jobsAdded} jobs and ${result.recordsAdded} records added.`);
    } catch (error) {
      setFormError('data-error', error instanceof Error ? error.message : 'That backup could not be imported.');
      input.value = '';
    }
  });
}

function bindRoutes(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState({}, '', link.pathname);
    renderApp();
    document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }));
}

async function initialize(): Promise<void> {
  loading = true;
  fatalError = '';
  renderApp();
  const returned = consumeReturnedLicense();
  try {
    const loaded = await loadLedger();
    jobs = loaded.jobs;
    records = loaded.records;
    branding = loaded.branding;
    if (selectedJobId && !jobs.some((job) => job.id === selectedJobId)) selectedJobId = jobs[0]?.id ?? null;
  } catch (error) {
    fatalError = error instanceof Error ? error.message : 'This browser did not provide local storage.';
  }
  loading = false;
  renderApp();
  const verdict = await verifyLicense(returned);
  if (verdict) {
    const wasPaid = paid;
    paid = verdict.valid;
    if (paid !== wasPaid || returned) {
      renderApp();
      announce(paid ? 'License verified. Retainer Ledger is unlocked.' : 'This license is no longer active. Free ledger features remain available.');
    }
  }
}

window.addEventListener('popstate', renderApp);
window.addEventListener('online', () => { renderApp(); announce('Back online. Your ledger always remained available.'); });
window.addEventListener('offline', () => { renderApp(); announce('You are offline. Your local ledger remains available.'); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    if (registration.waiting) document.querySelector<HTMLElement>('#update-toast')?.removeAttribute('hidden');
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) document.querySelector<HTMLElement>('#update-toast')?.removeAttribute('hidden');
      });
    });
    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      location.reload();
    });
  });
}

void initialize();
