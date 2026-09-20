export type TransactionStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface Transaction {
  id: string; // e.g. "TRX-000001"
  date: string; // YYYY-MM-DD
  recipientName: string;
  accountNumber: string;
  bankName: string;
  sendUsd: number;
  dollarRate: number;
  expectedBdt: number; // sendUsd * dollarRate
  actualSend: number; // Send Amount in BDT
  bankCharge: number; // expectedBdt - actualSend
  commission: number; // sendUsd * commissionRate
  profit: number; // bankCharge + commission
  referenceBy: string; // "Kaka" | "Humaiun Kaka's Assistant" | custom
  note?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DepositRecord {
  id: string; // e.g. "DEP-000001"
  date: string; // YYYY-MM-DD
  senderName: string; // e.g. "Kaka", "Other Source"
  usdAmount: number;
  receivingRate: number;
  bdtAmount: number; // usdAmount * receivingRate
  receivingMethod: string; // Bank or method
  note?: string;
  createdAt: string;
}

export interface SavedAccount {
  id: string;
  recipientName: string;
  accountNumber: string;
  bankName: string;
  lastUsed: string;
  totalTransactions: number;
  totalUsdSent: number;
  totalBdtSent: number;
  createdAt: string;
}

export interface PersonalExpense {
  id: string; // e.g. "EXP-000001"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  amountBdt: number;
  dollarRate: number;
  amountUsd: number; // amountBdt / dollarRate
  category: string; // e.g. "Personal Cash", "Family / Household", "Medical", "Food & Grocery", "Emergency", "Other"
  description: string;
  sourceFund: string; // "Kaka's Fund"
  createdAt: string;
  updatedAt: string;
}

export interface SourceLedgerItem {
  sourceName: string;
  totalUsdReceived: number;
  totalBdtValue: number;
  depositCount: number;
  averageRate: number;
  lastDepositDate: string;
}

export interface ReferenceSummary {
  referenceName: string;
  totalUsdSent: number;
  totalBdtSent: number;
  totalExpectedBdt: number;
  totalBankCharge: number;
  totalCommission: number;
  totalProfit: number;
  transactionCount: number;
}

export interface AppSettings {
  commissionPerUsd: number; // default 0.50
  defaultDollarRate?: number; // default dollar rate (BDT per USD) configurable from Settings
  references: string[]; // default ['Kaka', "Humaiun Kaka's Assistant"]
  banks: string[];
  currencyBdtSymbol: string; // '৳'
  currencyUsdSymbol: string; // '$'
  lastBackupDate?: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'new-transaction' 
  | 'transactions' 
  | 'deposits' 
  | 'saved-accounts' 
  | 'personal-expense'
  | 'sources' 
  | 'reports' 
  | 'profile' 
  | 'export-import' 
  | 'settings';
