import type { ApprovalMap, ColumnMap, CsvDocument, CsvRow, MatchCandidate, Receipt } from './types';

const DAY = 86_400_000;
const stopWords = new Set(['the', 'com', 'www', 'inc', 'llc', 'ltd', 'payment', 'purchase', 'online', 'card']);

export function parseCsv(input: string): CsvDocument {
  const source = input.replace(/^\uFEFF/, '');
  if (!source.trim()) throw new Error('This file is empty. Choose a statement CSV with a header row.');
  const delimiter = detectDelimiter(source);
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell.trim()); cell = '';
      if (row.some((value) => value !== '')) matrix.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quote. Export it again and retry.');
  row.push(cell.trim());
  if (row.some((value) => value !== '')) matrix.push(row);
  if (matrix.length < 2) throw new Error('No statement rows were found below the header.');
  const rawHeaders = matrix[0]!;
  const headers = rawHeaders.map((header, index) => header || `Column ${index + 1}`);
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
    throw new Error('The CSV has duplicate column names. Rename them and retry.');
  }
  const rows = matrix.slice(1).map((values, index) => ({
    id: `row-${index + 1}`,
    values: Object.fromEntries(headers.map((header, position) => [header, values[position] ?? '']))
  }));
  return { headers, rows };
}

function detectDelimiter(input: string): string {
  const line = input.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', ';', '\t'];
  return candidates.sort((a, b) => countOutsideQuotes(line, b) - countOutsideQuotes(line, a))[0] ?? ',';
}

function countOutsideQuotes(line: string, needle: string): number {
  let count = 0; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    if (!quoted && line[index] === needle) count += 1;
  }
  return count;
}

export function inferColumns(headers: string[]): ColumnMap {
  const find = (patterns: RegExp[]) => headers.find((header) => patterns.some((pattern) => pattern.test(header.toLowerCase()))) ?? '';
  return {
    date: find([/^date$/, /transaction.*date/, /posted/, /booking/]),
    amount: find([/^amount$/, /debit/, /withdrawal/, /value/]),
    merchant: find([/merchant/, /description/, /payee/, /narrative/, /details/])
  };
}

export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const negative = /^\s*\(.*\)\s*$/.test(trimmed) || /^\s*-/.test(trimmed);
  let normalized = trimmed.replace(/[^\d,.-]/g, '').replace(/[()]/g, '');
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma > dot) {
    const commaCount = (normalized.match(/,/g) ?? []).length;
    const decimalDigits = normalized.length - comma - 1;
    normalized = commaCount === 1 && decimalDigits !== 3 ? normalized.replace(/\./g, '').replace(',', '.') : normalized.replace(/,/g, '');
  }
  else normalized = normalized.replace(/,/g, '');
  const amount = Number.parseFloat(normalized.replace(/^-/, ''));
  return Number.isFinite(amount) ? (negative ? -amount : amount) : null;
}

export function normalizeDate(value: string): string | null {
  const compact = value.trim();
  if (!compact) return null;
  const iso = compact.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return validIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = compact.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (local) {
    const year = Number(local[3]) < 100 ? 2000 + Number(local[3]) : Number(local[3]);
    const first = Number(local[1]); const second = Number(local[2]);
    return second > 12 && first <= 12 ? validIso(year, first, second) : validIso(year, second, first);
  }
  const parsed = new Date(compact);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function validIso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function merchantTokens(value: string): Set<string> {
  const tokens = value.toLowerCase().replace(/https?:\/\//g, ' ').replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((token) => token.length > 1 && !stopWords.has(token));
  return new Set(tokens);
}

export function merchantSimilarity(left: string, right: string): number {
  const a = merchantTokens(left); const b = merchantTokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((token) => { if (b.has(token) || [...b].some((other) => other.startsWith(token) || token.startsWith(other))) overlap += 1; });
  return overlap / Math.max(a.size, b.size);
}

export function scoreMatch(receipt: Receipt, row: CsvRow, columns: ColumnMap): MatchCandidate | null {
  const rowAmount = parseAmount(row.values[columns.amount] ?? '');
  const rowDate = normalizeDate(row.values[columns.date] ?? '');
  if (rowAmount === null || rowDate === null) return null;
  const amountDelta = Math.abs(Math.abs(rowAmount) - Math.abs(receipt.amount));
  if (amountDelta > 0.02) return null;
  const days = Math.abs(new Date(`${receipt.purchaseDate}T00:00:00Z`).getTime() - new Date(`${rowDate}T00:00:00Z`).getTime()) / DAY;
  if (days > 10) return null;
  const amountScore = amountDelta <= 0.005 ? 1 : 0.85;
  const dateScore = Math.max(0, 1 - days / 10);
  const merchantScore = merchantSimilarity(receipt.merchant, row.values[columns.merchant] ?? '');
  const score = amountScore * 0.58 + dateScore * 0.27 + merchantScore * 0.15;
  return { receiptId: receipt.id, rowId: row.id, score, amountScore, dateScore, merchantScore };
}

export function findCandidates(receipts: Receipt[], document: CsvDocument, columns: ColumnMap): MatchCandidate[] {
  return receipts.flatMap((receipt) => document.rows.map((row) => scoreMatch(receipt, row, columns)).filter((match): match is MatchCandidate => Boolean(match)))
    .sort((left, right) => right.score - left.score);
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createEnrichedCsv(document: CsvDocument, receipts: Receipt[], approvals: ApprovalMap): string {
  const receiptById = new Map(receipts.map((receipt) => [receipt.id, receipt]));
  const extra = ['Receipt Merchant', 'Receipt URL', 'Receipt Date', 'Receipt Note', 'Link Status'];
  const lines = [[...document.headers, ...extra].map(csvCell).join(',')];
  document.rows.forEach((row) => {
    const receipt = receiptById.get(approvals[row.id] ?? '');
    const values = document.headers.map((header) => row.values[header] ?? '');
    lines.push([...values, receipt?.merchant ?? '', receipt?.url ?? '', receipt?.purchaseDate ?? '', receipt?.note ?? '', receipt ? 'approved' : 'unmatched'].map(csvCell).join(','));
  });
  return `${lines.join('\r\n')}\r\n`;
}

export function createManifest(receipts: Receipt[], approvals: ApprovalMap): string {
  const rowByReceipt = new Map(Object.entries(approvals).map(([rowId, receiptId]) => [receiptId, rowId]));
  return JSON.stringify({
    schema: 'receipt-statement-linker/1',
    exportedAt: new Date().toISOString(),
    links: receipts.filter((receipt) => rowByReceipt.has(receipt.id)).map((receipt) => ({
      statementRowId: rowByReceipt.get(receipt.id),
      receiptId: receipt.id,
      receiptUrl: receipt.url,
      merchant: receipt.merchant,
      amount: receipt.amount,
      currency: receipt.currency,
      purchaseDate: receipt.purchaseDate,
      note: receipt.note
    }))
  }, null, 2);
}

export function formatMoney(amount: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}
