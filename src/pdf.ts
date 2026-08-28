import { calculateTotals, formatMoney, recordEffect } from './calculations';
import type { Branding, Job, LedgerRecord } from './types';

function ascii(value: string): string {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function shorten(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

export function buildStatementPdf(job: Job, records: LedgerRecord[], branding: Branding, generatedAt = new Date()): Uint8Array {
  const totals = calculateTotals(records);
  const sorted = [...records].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  const visible = sorted.slice(0, 18);
  const title = branding.businessName.trim() || 'Retainer Ledger';
  const contact = branding.contactLine.trim() || 'Clear record of deposits and approved work';
  const lines: string[] = [];

  const text = (x: number, y: number, size: number, value: string, font = 'F1') => {
    lines.push(`BT /${font} ${size} Tf ${x} ${y} Td (${ascii(value)}) Tj ET`);
  };
  const rule = (y: number, color = '0.33 0.95 0.81') => lines.push(`${color} RG 0.8 w 48 ${y} m 547 ${y} l S`);

  text(48, 770, 11, title.toUpperCase());
  text(48, 750, 9, contact);
  text(397, 770, 9, 'DEPOSIT DRAWDOWN');
  text(397, 756, 9, 'STATEMENT');
  rule(738);
  text(48, 708, 20, shorten(job.name, 43));
  text(48, 689, 10, `Client: ${shorten(job.client, 55)}`);
  text(48, 673, 10, `Job reference: ${shorten(job.reference || 'Not provided', 47)}`);
  text(350, 708, 9, 'REMAINING DEPOSIT');
  text(350, 682, 18, `${job.currency} ${(totals.remaining / 100).toFixed(2)}`);
  text(48, 642, 9, 'DEPOSIT REQUESTED');
  text(48, 624, 12, formatMoney(totals.requested, job.currency));
  text(200, 642, 9, 'PAYMENTS RECORDED');
  text(200, 624, 12, formatMoney(totals.received, job.currency));
  text(372, 642, 9, 'WORK DRAWN DOWN');
  text(372, 624, 12, formatMoney(totals.drawn, job.currency));
  rule(603, '0.74 0.72 0.68');
  text(48, 582, 9, 'DATE');
  text(118, 582, 9, 'RECORD');
  text(310, 582, 9, 'REFERENCE');
  text(460, 582, 9, 'BALANCE EFFECT');

  let y = 558;
  for (const record of visible) {
    const effect = recordEffect(record);
    const sign = effect > 0 ? '+' : effect < 0 ? '-' : '';
    text(48, y, 8, record.occurredOn);
    text(118, y, 8, shorten(`${record.kind}: ${record.description}`, 35));
    text(310, y, 8, shorten(record.reference || '-', 23));
    text(460, y, 8, effect === 0 ? 'No balance change' : `${sign}${job.currency} ${(Math.abs(effect) / 100).toFixed(2)}`);
    y -= 24;
  }
  if (sorted.length > visible.length) text(48, y + 4, 8, `${sorted.length - visible.length} older records omitted; use the CSV export for the complete history.`);
  rule(100, '0.74 0.72 0.68');
  text(48, 78, 8, `Generated ${generatedAt.toISOString()} | Records are shown as entered and are not accounting advice.`);
  text(48, 62, 8, 'Corrections remain visible as adjustment records. Reconcile payments against your bank or payment record.');

  const stream = lines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function safeFilename(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'job';
}
