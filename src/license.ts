import type { LicenseState } from './types';

export const PRODUCT_SLUG = 'receipt-statement-linker';
export const BILLING_API = 'https://api.sociobot.in/api/v1';
export const BUY_URL = `${BILLING_API}/products/${PRODUCT_SLUG}/checkout`;
const DAY = 86_400_000;

export async function verifyLicense(token: string, previous: LicenseState = {}, force = false): Promise<LicenseState> {
  if (!token.trim()) return {};
  if (!force && previous.token === token && previous.checkedAt && Date.now() - previous.checkedAt < DAY) return previous;
  try {
    const response = await fetch(`${BILLING_API}/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token.trim())}`);
    if (!response.ok) throw new Error('Verification unavailable');
    const verdict = await response.json() as { valid: boolean; reason?: string };
    return { token: token.trim(), valid: verdict.valid, reason: verdict.reason, checkedAt: Date.now() };
  } catch {
    return previous.token === token ? previous : { token: token.trim(), valid: false, reason: 'offline' };
  }
}

export function isPro(state: LicenseState): boolean {
  return Boolean(state.token && state.valid);
}
