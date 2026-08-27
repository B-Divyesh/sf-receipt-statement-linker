const SLUG = 'receipt-statement-linker';
const API = 'https://api.sociobot.in/api/v1';
const KEY = `sb_license:${SLUG}`;
const CACHE_KEY = `${KEY}:verdict`;
const status = document.querySelector<HTMLElement>('#license-status')!;
const entry = document.querySelector<HTMLElement>('#license-entry')!;
const tokenInput = document.querySelector<HTMLInputElement>('#license-token')!;

function showStatus(copy: string, error = false) {
  status.textContent = copy; status.style.color = error ? 'var(--danger)' : 'var(--cyan)';
}

async function verify(token: string, force = false) {
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as { token: string; valid: boolean; checkedAt: number } | null;
  if (!force && cached?.token === token && Date.now() - cached.checkedAt < 86_400_000) { showStatus(cached.valid ? 'License active on this browser.' : 'License no longer active.', !cached.valid); return; }
  try {
    const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error();
    const verdict = await response.json() as { valid: boolean };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ token, valid: verdict.valid, checkedAt: Date.now() }));
    showStatus(verdict.valid ? 'License active. Paste this token into the extension workbench to unlock it there.' : 'This license is not active. Check the token and try again.', !verdict.valid);
  } catch { showStatus('Verification is unavailable offline. Your free workflow still works.', true); }
}

const returned = new URLSearchParams(location.search).get('license');
if (returned) {
  localStorage.setItem(KEY, returned); history.replaceState({}, '', `${location.pathname}${location.hash}`); void verify(returned, true);
}
const stored = localStorage.getItem(KEY);
if (stored && !returned) void verify(stored);

document.querySelector('#restore-license')?.addEventListener('click', () => { entry.hidden = false; tokenInput.value = stored ?? ''; tokenInput.focus(); });
document.querySelector('#verify-license')?.addEventListener('click', () => {
  const token = tokenInput.value.trim(); if (!token) { showStatus('Paste the license token from your purchase email.', true); return; }
  localStorage.setItem(KEY, token); void verify(token, true);
});

function updateNetwork() {
  const element = document.querySelector<HTMLElement>('#network-state')!;
  element.textContent = navigator.onLine ? '' : 'You are offline. The cached guide still works; checkout and license verification need a connection.';
}
window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork); updateNetwork();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));

export {};
