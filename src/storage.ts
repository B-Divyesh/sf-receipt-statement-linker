import type { ApprovalMap, ColumnMap, CsvDocument, LicenseState, Receipt } from './types';

export type StoredState = {
  receipts: Receipt[];
  document?: CsvDocument;
  columns?: ColumnMap;
  approvals: ApprovalMap;
  dismissedPairs: string[];
  sourceName?: string;
  license: LicenseState;
};

export const EMPTY_STATE: StoredState = { receipts: [], approvals: {}, dismissedPairs: [], license: {} };

export async function loadState(): Promise<StoredState> {
  const value = await chrome.storage.local.get('linkerState');
  return { ...EMPTY_STATE, ...(value.linkerState as Partial<StoredState> | undefined) };
}

export async function saveState(state: StoredState): Promise<void> {
  await chrome.storage.local.set({ linkerState: state });
}
