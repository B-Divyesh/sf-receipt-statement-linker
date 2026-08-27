import { describe, expect, it, vi } from 'vitest';
import { createEnrichedCsv, createManifest, findCandidates, inferColumns, merchantSimilarity, normalizeDate, parseAmount, parseCsv } from '../src/core';
import type { Receipt } from '../src/types';

const receipt: Receipt = { id: 'receipt-1', merchant: 'North Star Market', amount: 48.2, currency: 'USD', purchaseDate: '2026-05-13', url: 'https://northstar.example/receipt/1', note: 'Studio supplies', createdAt: '2026-05-13T12:00:00Z' };

describe('CSV parsing', () => {
  it('parses quoted commas, newlines, and BOMs', () => {
    const csv = parseCsv('\uFEFFDate,Description,Amount\r\n2026-05-14,"North Star, Market",-48.20\r\n2026-05-15,"Line one\nline two",12');
    expect(csv.headers).toEqual(['Date', 'Description', 'Amount']);
    expect(csv.rows).toHaveLength(2);
    expect(csv.rows[0]?.values.Description).toBe('North Star, Market');
    expect(csv.rows[1]?.values.Description).toBe('Line one\nline two');
  });

  it('handles semicolon CSV and rejects malformed documents', () => {
    expect(parseCsv('Date;Payee;Debit\n13/05/2026;Shop;12,40').rows[0]?.values.Debit).toBe('12,40');
    expect(() => parseCsv('a,b\n"broken')).toThrow(/unclosed quote/);
    expect(() => parseCsv('a,b')).toThrow(/No statement rows/);
  });

  it('infers familiar column names', () => expect(inferColumns(['Posted Date', 'Narrative', 'Withdrawal'])).toEqual({ date: 'Posted Date', merchant: 'Narrative', amount: 'Withdrawal' }));
});

describe('normalization and matching', () => {
  it('normalizes currency and dates without silently accepting impossible values', () => {
    expect(parseAmount('($1,240.50)')).toBe(-1240.5);
    expect(parseAmount('$1,234')).toBe(1234);
    expect(parseAmount('1.240,50 €')).toBe(1240.5);
    expect(normalizeDate('14/05/2026')).toBe('2026-05-14');
    expect(normalizeDate('05/14/2026')).toBe('2026-05-14');
    expect(normalizeDate('2026-02-30')).toBeNull();
  });

  it('matches only close amounts and dates, using merchant text for confidence', () => {
    const document = parseCsv('Date,Description,Amount\n2026-05-14,NORTH STAR MARKET 081,-48.20\n2026-06-20,North Star,-48.20\n2026-05-14,Other,-49.20');
    const matches = findCandidates([receipt], document, { date: 'Date', merchant: 'Description', amount: 'Amount' });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.score).toBeGreaterThan(.9);
    expect(merchantSimilarity('North Star Market', 'NORTH STAR MARKET 081')).toBeGreaterThan(.7);
  });
});

describe('exports', () => {
  it('keeps every original row and enriches only explicit approvals', () => {
    const document = parseCsv('Date,Description,Amount\n2026-05-14,"North, Star",-48.20\n2026-05-15,Other,-2');
    const csv = createEnrichedCsv(document, [receipt], { 'row-1': 'receipt-1' });
    expect(csv).toContain('"North, Star"');
    expect(csv).toContain('https://northstar.example/receipt/1');
    expect(csv).toContain('unmatched');
  });

  it('creates a portable manifest from approved links', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-27T00:00:00Z'));
    const manifest = JSON.parse(createManifest([receipt], { 'row-7': 'receipt-1' }));
    expect(manifest.links[0]).toMatchObject({ statementRowId: 'row-7', merchant: 'North Star Market' });
    vi.useRealTimers();
  });
});
