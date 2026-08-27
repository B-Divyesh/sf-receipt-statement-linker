export type Receipt = {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  purchaseDate: string;
  url: string;
  note: string;
  createdAt: string;
};

export type CsvRow = {
  id: string;
  values: Record<string, string>;
};

export type CsvDocument = {
  headers: string[];
  rows: CsvRow[];
};

export type ColumnMap = {
  date: string;
  amount: string;
  merchant: string;
};

export type MatchCandidate = {
  receiptId: string;
  rowId: string;
  score: number;
  amountScore: number;
  dateScore: number;
  merchantScore: number;
};

export type ApprovalMap = Record<string, string>;

export type LicenseState = {
  token?: string;
  valid?: boolean;
  checkedAt?: number;
  reason?: string;
};
