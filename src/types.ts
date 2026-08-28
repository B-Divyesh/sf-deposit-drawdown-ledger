export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD';
export type RecordKind = 'request' | 'payment' | 'drawdown' | 'adjustment';

export interface Job {
  id: string;
  name: string;
  client: string;
  reference: string;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface LedgerRecord {
  id: string;
  jobId: string;
  kind: RecordKind;
  amountCents: number;
  occurredOn: string;
  description: string;
  reference: string;
  createdAt: string;
}

export interface Branding {
  businessName: string;
  contactLine: string;
}

export interface LedgerBundle {
  schemaVersion: 1;
  exportedAt: string;
  jobs: Job[];
  records: LedgerRecord[];
  branding: Branding;
}

export interface Totals {
  requested: number;
  received: number;
  drawn: number;
  adjustments: number;
  remaining: number;
}
