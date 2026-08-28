import type { LedgerRecord, Totals } from './types';

export function calculateTotals(records: LedgerRecord[]): Totals {
  const totals = records.reduce(
    (sum, record) => {
      if (record.kind === 'request') sum.requested += Math.abs(record.amountCents);
      if (record.kind === 'payment') sum.received += Math.abs(record.amountCents);
      if (record.kind === 'drawdown') sum.drawn += Math.abs(record.amountCents);
      if (record.kind === 'adjustment') sum.adjustments += record.amountCents;
      return sum;
    },
    { requested: 0, received: 0, drawn: 0, adjustments: 0 },
  );

  return { ...totals, remaining: totals.received - totals.drawn + totals.adjustments };
}

export function parseMoney(value: string): number | null {
  const normalized = value.trim().replaceAll(',', '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function recordEffect(record: LedgerRecord): number {
  if (record.kind === 'payment') return Math.abs(record.amountCents);
  if (record.kind === 'drawdown') return -Math.abs(record.amountCents);
  if (record.kind === 'adjustment') return record.amountCents;
  return 0;
}
