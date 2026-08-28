import { describe, expect, it } from 'vitest';
import { calculateTotals, parseMoney, recordEffect } from '../src/calculations';
import { buildStatementPdf } from '../src/pdf';
import type { Job, LedgerRecord } from '../src/types';

const base = { id: 'r', jobId: 'j', occurredOn: '2026-08-28', description: 'Record', reference: '', createdAt: '2026-08-28T10:00:00.000Z' };
const records: LedgerRecord[] = [
  { ...base, id: 'request', kind: 'request', amountCents: 100_000 },
  { ...base, id: 'payment', kind: 'payment', amountCents: 80_000 },
  { ...base, id: 'draw', kind: 'drawdown', amountCents: 25_000 },
  { ...base, id: 'adjust', kind: 'adjustment', amountCents: -500 },
];

describe('ledger calculations', () => {
  it('separates a deposit request from money actually held', () => {
    expect(calculateTotals(records)).toEqual({ requested: 100_000, received: 80_000, drawn: 25_000, adjustments: -500, remaining: 54_500 });
  });

  it('maps record types to their balance effect', () => {
    expect(recordEffect(records[0]!)).toBe(0);
    expect(recordEffect(records[1]!)).toBe(80_000);
    expect(recordEffect(records[2]!)).toBe(-25_000);
    expect(recordEffect(records[3]!)).toBe(-500);
  });

  it('parses money without accepting ambiguous precision', () => {
    expect(parseMoney('1,234.50')).toBe(123_450);
    expect(parseMoney('-5.25')).toBe(-525);
    expect(parseMoney('1.234')).toBeNull();
    expect(parseMoney('money')).toBeNull();
  });
});

describe('statement PDF', () => {
  it('creates a one-page PDF with a generated timestamp and visible adjustment history', () => {
    const job: Job = { id: 'j', name: 'Market stall refit', client: 'North Lane', reference: 'NL-7', currency: 'USD', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z', archived: false };
    const bytes = buildStatementPdf(job, records, { businessName: 'Clear Works', contactLine: 'hello@example.com' }, new Date('2026-08-28T12:00:00.000Z'));
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('Generated 2026-08-28T12:00:00.000Z');
    expect(text).toContain('/Count 1');
    expect(text).toContain('adjustment: Record');
  });
});
