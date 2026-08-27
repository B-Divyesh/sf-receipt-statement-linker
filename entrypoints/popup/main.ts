import '../../src/ui.css';
import './style.css';
import { isPro } from '../../src/license';
import { loadState, saveState } from '../../src/storage';
import type { Receipt } from '../../src/types';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const form = $('#capture-form') as HTMLFormElement;
const message = $('#form-message');
const merchant = $('#merchant') as HTMLInputElement;
const url = $('#url') as HTMLInputElement;
const date = $('#purchase-date') as HTMLInputElement;
const amount = $('#amount') as HTMLInputElement;
const state = await loadState();

date.value = new Date().toISOString().slice(0, 10);
$('#receipt-count').textContent = `(${state.receipts.length})`;

try {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith('http')) {
    url.value = tab.url;
    const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
    merchant.value = (tab.title?.split(/[|–—-]/)[0]?.trim() || hostname.split('.')[0] || '').slice(0, 120);
  } else {
    url.value = '';
    message.hidden = false;
    message.textContent = 'This browser page cannot be saved. Paste the receipt URL instead.';
  }
} catch { /* Manual entry remains available. */ }

if (!isPro(state.license) && state.receipts.length >= 25) {
  message.hidden = false;
  message.textContent = 'The free library holds 25 receipts. Open the workbench to unlock unlimited capture or export and clear old links.';
  (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.hidden = true;
  const numericAmount = Number.parseFloat(amount.value.replace(/,/g, ''));
  if (!form.reportValidity()) return;
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    message.hidden = false; message.className = 'notice error'; message.textContent = 'Enter an amount greater than zero.'; amount.focus(); return;
  }
  const receipt: Receipt = {
    id: crypto.randomUUID(), merchant: merchant.value.trim(), amount: numericAmount,
    currency: ($('#currency') as HTMLSelectElement).value, purchaseDate: date.value,
    url: url.value.trim(), note: ($('#note') as HTMLTextAreaElement).value.trim(), createdAt: new Date().toISOString()
  };
  state.receipts.unshift(receipt);
  try { await saveState(state); }
  catch { state.receipts.shift(); message.hidden = false; message.className = 'notice error'; message.textContent = 'The browser could not save this receipt. Export or delete older local data, then retry.'; return; }
  message.hidden = false; message.className = 'notice success-note'; message.textContent = `Saved ${receipt.merchant}. It is ready to match.`;
  $('#receipt-count').textContent = `(${state.receipts.length})`;
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="date"]), textarea').forEach((control) => { control.value = ''; });
});

$('#open-workbench').addEventListener('click', () => chrome.runtime.openOptionsPage());
