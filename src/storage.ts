import type { Branding, CurrencyCode, Job, LedgerBundle, LedgerRecord } from './types';

const DB_NAME = 'retainer-ledger-v1';
const DB_VERSION = 1;
const DEFAULT_BRANDING: Branding = { businessName: '', contactLine: '' };
const CURRENCIES = new Set<CurrencyCode>(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']);

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('jobs')) db.createObjectStore('jobs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('records')) {
        const records = db.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('jobId', 'jobId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save locally.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local save was cancelled.'));
  });
}

export async function loadLedger(): Promise<{ jobs: Job[]; records: LedgerRecord[]; branding: Branding }> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(['jobs', 'records', 'settings'], 'readonly');
    const [jobs, records, branding] = await Promise.all([
      requestResult(transaction.objectStore('jobs').getAll() as IDBRequest<unknown[]>),
      requestResult(transaction.objectStore('records').getAll() as IDBRequest<unknown[]>),
      requestResult(transaction.objectStore('settings').get('branding') as IDBRequest<unknown>),
    ]);
    const jobIds = new Set(jobs.filter(isJob).map((job) => job.id));
    if (!jobs.every(isJob) || !records.every(isRecord) || records.some((record) => isRecord(record) && !jobIds.has(record.jobId)) || (branding !== undefined && !isBranding(branding))) {
      throw new Error('Local ledger data is incomplete or corrupt. Download a recovery copy, then clear the local ledger to start again.');
    }
    return {
      jobs: [...jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      records: [...records].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)),
      branding: branding ?? DEFAULT_BRANDING,
    };
  } finally {
    db.close();
  }
}

export async function addJob(job: Job, firstRecord: LedgerRecord): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['jobs', 'records'], 'readwrite');
  transaction.objectStore('jobs').add(job);
  transaction.objectStore('records').add(firstRecord);
  await transactionDone(transaction);
  db.close();
}

export async function addRecord(record: LedgerRecord, job: Job): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['jobs', 'records'], 'readwrite');
  transaction.objectStore('records').add(record);
  transaction.objectStore('jobs').put(job);
  await transactionDone(transaction);
  db.close();
}

export async function saveBranding(branding: Branding): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('settings', 'readwrite');
  transaction.objectStore('settings').put(branding, 'branding');
  await transactionDone(transaction);
  db.close();
}

export async function exportBundle(): Promise<LedgerBundle> {
  const data = await loadLedger();
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), ...data };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isBranding(value: unknown): value is Branding {
  return isObject(value) && typeof value.businessName === 'string' && typeof value.contactLine === 'string';
}

function isJob(value: unknown): value is Job {
  if (!isObject(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.name) && isNonEmptyString(value.client) && typeof value.reference === 'string'
    && typeof value.currency === 'string' && CURRENCIES.has(value.currency as CurrencyCode) && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt) && typeof value.archived === 'boolean';
}

function isRecord(value: unknown): value is LedgerRecord {
  if (!isObject(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.jobId) && typeof value.kind === 'string'
    && ['request', 'payment', 'drawdown', 'adjustment'].includes(value.kind) && Number.isSafeInteger(value.amountCents)
    && typeof value.description === 'string' && typeof value.reference === 'string' && isCalendarDate(value.occurredOn)
    && isTimestamp(value.createdAt);
}

function isBundle(value: unknown): value is LedgerBundle {
  if (!isObject(value)) return false;
  if (value.schemaVersion !== 1 || !isTimestamp(value.exportedAt) || !Array.isArray(value.jobs) || !Array.isArray(value.records) || !isBranding(value.branding)) return false;
  if (!value.jobs.every(isJob) || !value.records.every(isRecord)) return false;
  const jobIds = new Set(value.jobs.map((job) => job.id));
  const recordIds = new Set(value.records.map((record) => record.id));
  return jobIds.size === value.jobs.length && recordIds.size === value.records.length;
}

export async function importBundle(value: unknown): Promise<{ jobsAdded: number; recordsAdded: number }> {
  if (!isBundle(value)) throw new Error('This file is not a Retainer Ledger v1 backup.');
  const current = await loadLedger();
  const jobIds = new Set(current.jobs.map((job) => job.id));
  const recordIds = new Set(current.records.map((record) => record.id));
  const importedJobIds = new Set(value.jobs.map((job) => job.id));
  if (value.records.some((record) => !jobIds.has(record.jobId) && !importedJobIds.has(record.jobId))) {
    throw new Error('This backup has a record without its job ledger. Nothing was imported.');
  }
  const jobs = value.jobs.filter((job) => !jobIds.has(job.id));
  const records = value.records.filter((record) => !recordIds.has(record.id) && (jobIds.has(record.jobId) || jobs.some((job) => job.id === record.jobId)));
  const db = await openDatabase();
  try {
    const transaction = db.transaction(['jobs', 'records', 'settings'], 'readwrite');
    for (const job of jobs) transaction.objectStore('jobs').add(job);
    for (const record of records) transaction.objectStore('records').add(record);
    if (!current.branding.businessName && !current.branding.contactLine) transaction.objectStore('settings').put(value.branding, 'branding');
    await transactionDone(transaction);
    return { jobsAdded: jobs.length, recordsAdded: records.length };
  } finally {
    db.close();
  }
}

export async function exportRecoveryBundle(): Promise<Record<string, unknown>> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(['jobs', 'records', 'settings'], 'readonly');
    const [jobs, records, branding] = await Promise.all([
      requestResult(transaction.objectStore('jobs').getAll() as IDBRequest<unknown[]>),
      requestResult(transaction.objectStore('records').getAll() as IDBRequest<unknown[]>),
      requestResult(transaction.objectStore('settings').get('branding') as IDBRequest<unknown>),
    ]);
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), recovery: true, jobs, records, branding: branding ?? DEFAULT_BRANDING };
  } finally {
    db.close();
  }
}

export async function clearLedger(): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(['jobs', 'records', 'settings'], 'readwrite');
    transaction.objectStore('jobs').clear();
    transaction.objectStore('records').clear();
    transaction.objectStore('settings').clear();
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
