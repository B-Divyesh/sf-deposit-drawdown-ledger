import type { Branding, Job, LedgerBundle, LedgerRecord } from './types';

const DB_NAME = 'retainer-ledger-v1';
const DB_VERSION = 1;
const DEFAULT_BRANDING: Branding = { businessName: '', contactLine: '' };

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
  const transaction = db.transaction(['jobs', 'records', 'settings'], 'readonly');
  const [jobs, records, branding] = await Promise.all([
    requestResult(transaction.objectStore('jobs').getAll() as IDBRequest<Job[]>),
    requestResult(transaction.objectStore('records').getAll() as IDBRequest<LedgerRecord[]>),
    requestResult(transaction.objectStore('settings').get('branding') as IDBRequest<Branding | undefined>),
  ]);
  db.close();
  return {
    jobs: jobs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    records: records.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)),
    branding: branding ?? DEFAULT_BRANDING,
  };
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

function isBundle(value: unknown): value is LedgerBundle {
  if (!value || typeof value !== 'object') return false;
  const bundle = value as Partial<LedgerBundle>;
  const jobValid = (job: unknown): job is Job => {
    if (!job || typeof job !== 'object') return false;
    const item = job as Partial<Job>;
    return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.client === 'string' && typeof item.currency === 'string' && typeof item.createdAt === 'string';
  };
  const recordValid = (record: unknown): record is LedgerRecord => {
    if (!record || typeof record !== 'object') return false;
    const item = record as Partial<LedgerRecord>;
    return typeof item.id === 'string' && typeof item.jobId === 'string' && ['request', 'payment', 'drawdown', 'adjustment'].includes(item.kind ?? '') && Number.isSafeInteger(item.amountCents) && typeof item.description === 'string' && typeof item.occurredOn === 'string';
  };
  return bundle.schemaVersion === 1 && Array.isArray(bundle.jobs) && bundle.jobs.every(jobValid) && Array.isArray(bundle.records) && bundle.records.every(recordValid) && !!bundle.branding && typeof bundle.branding.businessName === 'string' && typeof bundle.branding.contactLine === 'string';
}

export async function importBundle(value: unknown): Promise<{ jobsAdded: number; recordsAdded: number }> {
  if (!isBundle(value)) throw new Error('This file is not a Retainer Ledger v1 backup.');
  const current = await loadLedger();
  const jobIds = new Set(current.jobs.map((job) => job.id));
  const recordIds = new Set(current.records.map((record) => record.id));
  const jobs = value.jobs.filter((job) => !jobIds.has(job.id));
  const records = value.records.filter((record) => !recordIds.has(record.id) && (jobIds.has(record.jobId) || jobs.some((job) => job.id === record.jobId)));
  const db = await openDatabase();
  const transaction = db.transaction(['jobs', 'records', 'settings'], 'readwrite');
  for (const job of jobs) transaction.objectStore('jobs').add(job);
  for (const record of records) transaction.objectStore('records').add(record);
  if (!current.branding.businessName && !current.branding.contactLine) transaction.objectStore('settings').put(value.branding, 'branding');
  await transactionDone(transaction);
  db.close();
  return { jobsAdded: jobs.length, recordsAdded: records.length };
}
