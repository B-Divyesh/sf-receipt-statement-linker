import './style.css';
import { createEnrichedCsv, createManifest, findCandidates, formatMoney, inferColumns, normalizeDate, parseAmount, parseCsv } from '../../src/core';
import { BUY_URL, isPro, verifyLicense } from '../../src/license';
import { loadState, saveState, type StoredState } from '../../src/storage';
import type { ColumnMap, CsvDocument, MatchCandidate, Receipt } from '../../src/types';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let state: StoredState = await loadState();
let pendingDocument: CsvDocument | undefined;
let pendingFilename = '';
const dialog = $('#confirm-dialog') as HTMLDialogElement;
let confirmCallback: (() => void | Promise<void>) | undefined;

function setMessage(selector: string, copy: string, kind: 'error' | 'success' | 'info' = 'info') {
  const element = $(selector); element.hidden = false; element.className = `notice ${kind === 'error' ? 'error' : kind === 'success' ? 'success-note' : ''}`; element.textContent = copy;
}

function clearMessage(selector: string) { $(selector).hidden = true; }

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  chrome.downloads.download({ url, filename, saveAs: true }, () => setTimeout(() => URL.revokeObjectURL(url), 2_000));
}

function promptConfirm(title: string, copy: string, actionLabel: string, callback: () => void | Promise<void>) {
  $('#confirm-title').textContent = title; $('#confirm-copy').textContent = copy; $('#confirm-action').textContent = actionLabel; confirmCallback = callback; dialog.showModal(); $('#confirm-cancel').focus();
}

$('#confirm-cancel').addEventListener('click', () => dialog.close());
$('#confirm-action').addEventListener('click', async () => { dialog.close(); await confirmCallback?.(); confirmCallback = undefined; });
dialog.addEventListener('close', () => { confirmCallback = undefined; });

function updateStats() {
  $('#stat-saved').textContent = String(state.receipts.length);
  $('#stat-rows').textContent = String(state.document?.rows.length ?? 0);
  $('#stat-approved').textContent = String(Object.keys(state.approvals).length);
}

function rowSummary(row: CsvDocument['rows'][number], columns: ColumnMap) {
  return {
    merchant: row.values[columns.merchant] || 'No merchant description',
    date: normalizeDate(row.values[columns.date] ?? '') ?? row.values[columns.date] ?? 'Unknown date',
    amount: row.values[columns.amount] || 'Unknown amount'
  };
}

function topCandidateFor(rowId: string, candidates: MatchCandidate[]): MatchCandidate | undefined {
  return candidates.find((candidate) => candidate.rowId === rowId && !state.dismissedPairs.includes(`${candidate.rowId}:${candidate.receiptId}`));
}

function renderMatches() {
  const list = $('#match-list'); list.replaceChildren();
  const csvDocument = state.document; const columns = state.columns;
  const canExport = Boolean(csvDocument && columns);
  ($('#export-csv') as HTMLButtonElement).disabled = !canExport;
  ($('#export-manifest') as HTMLButtonElement).disabled = !canExport;
  $('#clear-statement').hidden = !csvDocument;
  if (!csvDocument || !columns) {
    const empty = document.createElement('div'); empty.className = 'empty'; empty.innerHTML = '<div><h3>No statement in the room</h3><p class="muted">Choose a CSV above, map three columns, and suggestions will appear here.</p></div>'; list.append(empty); $('#approve-confident').hidden = true; return;
  }
  const candidates = findCandidates(state.receipts, csvDocument, columns);
  const exact = csvDocument.rows.filter((row) => { const match = topCandidateFor(row.id, candidates); return match && match.score >= .92 && !state.approvals[row.id]; });
  $('#approve-confident').hidden = exact.length === 0;
  if (!csvDocument.rows.length) return;
  csvDocument.rows.forEach((row) => {
    const approvedReceipt = state.receipts.find((receipt) => receipt.id === state.approvals[row.id]);
    const candidate = topCandidateFor(row.id, candidates);
    const suggestedReceipt = approvedReceipt ?? state.receipts.find((receipt) => receipt.id === candidate?.receiptId);
    const summary = rowSummary(row, columns);
    const item = document.createElement('article'); item.className = `match${approvedReceipt ? ' approved' : ''}`;

    const bank = document.createElement('div'); bank.className = 'match-side';
    const bankMain = document.createElement('div'); bankMain.className = 'match-main';
    const bankName = document.createElement('span'); bankName.className = 'match-copy'; bankName.textContent = summary.merchant;
    const bankAmount = document.createElement('span'); bankAmount.className = 'amount'; bankAmount.textContent = summary.amount;
    bankMain.append(bankName, bankAmount);
    const bankLabel = document.createElement('span'); bankLabel.className = 'match-label'; bankLabel.textContent = 'Statement row';
    const bankMeta = document.createElement('p'); bankMeta.className = 'match-meta'; bankMeta.textContent = `${summary.date} · ${row.id}`;
    bank.append(bankLabel, bankMain, bankMeta);

    const glyph = document.createElement('span'); glyph.className = 'link-glyph'; glyph.setAttribute('aria-hidden', 'true'); glyph.textContent = approvedReceipt ? '✓' : '↔';
    const receiptSide = document.createElement('div'); receiptSide.className = 'match-side';
    const receiptLabel = document.createElement('span'); receiptLabel.className = 'match-label'; receiptLabel.textContent = approvedReceipt ? 'Approved receipt' : 'Suggested receipt';
    const receiptMain = document.createElement('div'); receiptMain.className = 'match-main';
    const receiptName = document.createElement('span'); receiptName.className = 'match-copy'; receiptName.textContent = suggestedReceipt?.merchant ?? 'No close receipt found';
    const receiptAmount = document.createElement('span'); receiptAmount.className = 'amount'; receiptAmount.textContent = suggestedReceipt ? formatMoney(suggestedReceipt.amount, suggestedReceipt.currency) : '—';
    receiptMain.append(receiptName, receiptAmount);
    const confidence = document.createElement('p'); confidence.className = 'match-meta confidence';
    confidence.textContent = approvedReceipt ? 'Approved by you' : candidate ? `${Math.round(candidate.score * 100)}% confidence · ${suggestedReceipt?.purchaseDate}` : 'Try choosing a receipt manually';
    receiptSide.append(receiptLabel, receiptMain, confidence);

    const actions = document.createElement('div'); actions.className = 'match-actions';
    const select = document.createElement('select'); select.setAttribute('aria-label', `Receipt for ${summary.merchant}`);
    const none = document.createElement('option'); none.value = ''; none.textContent = 'Choose another receipt…'; select.append(none);
    state.receipts.forEach((receipt) => { const option = document.createElement('option'); option.value = receipt.id; option.textContent = `${receipt.merchant} · ${formatMoney(receipt.amount, receipt.currency)} · ${receipt.purchaseDate}`; select.append(option); });
    select.value = suggestedReceipt?.id ?? '';
    const approve = document.createElement('button'); approve.className = approvedReceipt ? 'secondary' : 'success'; approve.type = 'button'; approve.textContent = approvedReceipt ? 'Change link' : 'Approve link'; approve.disabled = !suggestedReceipt;
    approve.addEventListener('click', async () => {
      if (!select.value) return;
      const alreadyOnRow = Object.entries(state.approvals).find(([approvedRow, receiptId]) => receiptId === select.value && approvedRow !== row.id);
      if (alreadyOnRow) { setMessage('#export-message', 'That receipt is already approved for another row. Undo that link first.', 'error'); return; }
      state.approvals[row.id] = select.value; await saveState(state); renderAll(); setMessage('#export-message', 'Link approved. Exports now include this receipt.', 'success');
    });
    const reject = document.createElement('button'); reject.className = approvedReceipt ? 'danger' : 'text-button'; reject.type = 'button'; reject.textContent = approvedReceipt ? 'Undo' : 'Not a match'; reject.disabled = !suggestedReceipt;
    reject.addEventListener('click', async () => {
      if (approvedReceipt) delete state.approvals[row.id];
      else if (candidate) state.dismissedPairs.push(`${row.id}:${candidate.receiptId}`);
      await saveState(state); renderAll();
    });
    actions.append(select, approve, reject);
    item.append(bank, glyph, receiptSide, actions); list.append(item);
  });
}

function renderReceipts() {
  const list = $('#receipt-list'); list.replaceChildren();
  if (!state.receipts.length) {
    const empty = document.createElement('div'); empty.className = 'empty'; empty.innerHTML = '<div><h3>Your receipt drawer is empty</h3><p class="muted">Use the toolbar button on a checkout or confirmation page to preserve the merchant, amount, date, and URL.</p></div>'; list.append(empty); return;
  }
  state.receipts.forEach((receipt) => {
    const item = document.createElement('article'); item.className = 'receipt';
    const detail = document.createElement('div'); const title = document.createElement('div'); title.className = 'receipt-title';
    const name = document.createElement('span'); name.textContent = receipt.merchant; const money = document.createElement('span'); money.className = 'amount'; money.textContent = formatMoney(receipt.amount, receipt.currency); title.append(name, money);
    const meta = document.createElement('p'); meta.className = 'receipt-meta'; meta.textContent = `${receipt.purchaseDate}${receipt.note ? ` · ${receipt.note}` : ''}`;
    const link = document.createElement('a'); link.href = receipt.url; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = new URL(receipt.url).hostname; link.setAttribute('aria-label', `Open receipt for ${receipt.merchant}`);
    detail.append(title, meta, link);
    const remove = document.createElement('button'); remove.className = 'danger'; remove.type = 'button'; remove.textContent = 'Delete';
    remove.addEventListener('click', () => promptConfirm('Delete saved receipt?', `${receipt.merchant} (${formatMoney(receipt.amount, receipt.currency)}) will be removed. Approved links using it will also be undone.`, 'Delete receipt', async () => {
      state.receipts = state.receipts.filter((entry) => entry.id !== receipt.id);
      Object.entries(state.approvals).forEach(([rowId, receiptId]) => { if (receiptId === receipt.id) delete state.approvals[rowId]; });
      await saveState(state); renderAll();
    }));
    item.append(detail, remove); list.append(item);
  });
}

function renderLicense() {
  const active = isPro(state.license); $('#library-tools').hidden = !active;
  ($('#license-token') as HTMLInputElement).value = state.license.token ?? '';
  if (active) setMessage('#license-message', 'License active. Unlimited receipt capture and library backup are available.', 'success');
  else if (state.license.token && state.license.reason !== 'offline') setMessage('#license-message', 'License no longer active. Check the token or buy a new license.', 'error');
  else if (state.license.reason === 'offline') setMessage('#license-message', 'Could not verify while offline. The free tools remain available; retry when connected.');
}

function renderAll() { updateStats(); renderMatches(); renderReceipts(); renderLicense(); }

($('#csv-file') as HTMLInputElement).addEventListener('change', async (event) => {
  clearMessage('#import-message'); const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
  if (file.size > 3 * 1024 * 1024) { setMessage('#import-message', 'This file is over 3 MB. Export a smaller date range and try again.', 'error'); return; }
  try {
    pendingDocument = parseCsv(await file.text()); pendingFilename = file.name;
    const inferred = inferColumns(pendingDocument.headers); const selects = [$('#date-column') as HTMLSelectElement, $('#amount-column') as HTMLSelectElement, $('#merchant-column') as HTMLSelectElement];
    selects.forEach((select) => { select.replaceChildren(); const blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Select a column'; select.append(blank); pendingDocument!.headers.forEach((header) => { const option = document.createElement('option'); option.value = header; option.textContent = header; select.append(option); }); });
    selects[0]!.value = inferred.date; selects[1]!.value = inferred.amount; selects[2]!.value = inferred.merchant;
    $('#mapping-summary').textContent = `${file.name} · ${pendingDocument.rows.length} rows found`;
    $('#mapping').hidden = false;
  } catch (error) { setMessage('#import-message', error instanceof Error ? error.message : 'This CSV could not be read.', 'error'); }
});

$('#cancel-import').addEventListener('click', () => { pendingDocument = undefined; $('#mapping').hidden = true; ($('#csv-file') as HTMLInputElement).value = ''; });
$('#use-columns').addEventListener('click', async () => {
  if (!pendingDocument) return;
  const columns = { date: ($('#date-column') as HTMLSelectElement).value, amount: ($('#amount-column') as HTMLSelectElement).value, merchant: ($('#merchant-column') as HTMLSelectElement).value };
  if (!columns.date || !columns.amount || !columns.merchant || new Set(Object.values(columns)).size !== 3) { setMessage('#import-message', 'Choose three different columns for date, amount, and merchant.', 'error'); return; }
  const validRows = pendingDocument.rows.filter((row) => normalizeDate(row.values[columns.date] ?? '') && parseAmount(row.values[columns.amount] ?? '') !== null);
  if (!validRows.length) { setMessage('#import-message', 'No rows have both a readable date and amount in those columns. Check the mapping.', 'error'); return; }
  state.document = pendingDocument; state.columns = columns; state.sourceName = pendingFilename; state.approvals = {}; state.dismissedPairs = [];
  try { await saveState(state); }
  catch { delete state.document; delete state.columns; delete state.sourceName; state.approvals = {}; state.dismissedPairs = []; setMessage('#import-message', 'This statement does not fit in local browser storage. Export a smaller date range and retry.', 'error'); return; }
  pendingDocument = undefined; $('#mapping').hidden = true; ($('#csv-file') as HTMLInputElement).value = '';
  setMessage('#import-message', `${state.document.rows.length} rows are ready. ${state.document.rows.length - validRows.length} unreadable row(s) will stay unmatched.`, 'success'); renderAll(); location.hash = 'review';
});

$('#approve-confident').addEventListener('click', async () => {
  if (!state.document || !state.columns) return;
  const used = new Set(Object.values(state.approvals)); const candidates = findCandidates(state.receipts, state.document, state.columns);
  state.document.rows.forEach((row) => { const candidate = topCandidateFor(row.id, candidates); if (candidate && candidate.score >= .92 && !used.has(candidate.receiptId) && !state.approvals[row.id]) { state.approvals[row.id] = candidate.receiptId; used.add(candidate.receiptId); } });
  await saveState(state); renderAll(); setMessage('#export-message', 'Exact candidates approved. Review them before exporting.', 'success');
});

$('#clear-statement').addEventListener('click', () => promptConfirm('Clear imported statement?', 'The local statement rows and approvals will be removed. Saved receipts stay in your drawer.', 'Clear statement', async () => {
  delete state.document; delete state.columns; delete state.sourceName; state.approvals = {}; state.dismissedPairs = []; await saveState(state); clearMessage('#import-message'); renderAll();
}));

$('#export-csv').addEventListener('click', () => { if (state.document) { download('receipt-linked-statement.csv', createEnrichedCsv(state.document, state.receipts, state.approvals), 'text/csv'); setMessage('#export-message', 'Enriched CSV prepared. Check your browser downloads.', 'success'); } });
$('#export-manifest').addEventListener('click', () => { download('receipt-attachment-manifest.json', createManifest(state.receipts, state.approvals), 'application/json'); setMessage('#export-message', 'Attachment manifest prepared. Check your browser downloads.', 'success'); });
$('#add-receipt').addEventListener('click', () => chrome.action.openPopup().catch(() => setMessage('#export-message', 'Use the extension toolbar button on the receipt page to save another purchase.')));

$('#license-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const token = ($('#license-token') as HTMLInputElement).value.trim();
  if (!token) { setMessage('#license-message', 'Paste the license token from your purchase email.', 'error'); return; }
  setMessage('#license-message', 'Checking this license…'); state.license = await verifyLicense(token, state.license, true); await saveState(state); renderLicense();
});
$('#backup-library').addEventListener('click', () => download(`receipt-library-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ schema: 'receipt-statement-linker/library/1', receipts: state.receipts }, null, 2), 'application/json'));
($('#restore-file') as HTMLInputElement).addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try {
    const backup = JSON.parse(await file.text()) as { schema?: string; receipts?: Receipt[] };
    if (backup.schema !== 'receipt-statement-linker/library/1' || !Array.isArray(backup.receipts) || backup.receipts.some((receipt) => !receipt.id || !receipt.merchant || !receipt.url || !receipt.purchaseDate || !Number.isFinite(receipt.amount))) throw new Error();
    const byId = new Map([...state.receipts, ...backup.receipts].map((receipt) => [receipt.id, receipt]));
    promptConfirm('Restore receipt library?', `${backup.receipts.length} receipt(s) will be merged with this library. Existing receipt IDs will use the backup copy.`, 'Restore library', async () => {
      state.receipts = [...byId.values()]; await saveState(state); renderAll(); setMessage('#license-message', 'Library backup restored and merged.', 'success');
    });
  } catch { setMessage('#license-message', 'This is not a valid Receipt Statement Linker library backup.', 'error'); }
  input.value = '';
});
($('#buy-link') as HTMLAnchorElement).href = BUY_URL;

renderAll();
if (state.license.token) { state.license = await verifyLicense(state.license.token, state.license); await saveState(state); renderLicense(); }
