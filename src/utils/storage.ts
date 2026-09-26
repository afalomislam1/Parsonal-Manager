import { INITIAL_BANKS, INITIAL_REFERENCES } from '../constants/banks';
import { PREVIOUS_CUSTOMER_ACCOUNTS } from '../constants/customerAccounts';
import { AppSettings, DepositRecord, PersonalExpense, SavedAccount, Transaction } from '../types';
import { computeBankCharge, computeCommission, computeDepositBDT, computeExpectedBDT, computeProfit } from './calculations';

export const STORAGE_KEY_V1 = 'crossborder_acc_v1';

export interface StorageData {
  version: number;
  transactions: Transaction[];
  deposits: DepositRecord[];
  savedAccounts: SavedAccount[];
  personalExpenses: PersonalExpense[];
  settings: AppSettings;
  lastBackupDate?: string;
  exportedAt?: string;
  appName?: string;
}

export function getDefaultInitialData(): StorageData {
  const defaultSettings: AppSettings = {
    commissionPerUsd: 0.50,
    defaultDollarRate: 123.00,
    references: INITIAL_REFERENCES,
    banks: INITIAL_BANKS,
    currencyBdtSymbol: '৳',
    currencyUsdSymbol: '$',
    lastBackupDate: new Date().toISOString(),
  };

  // Pre-seed exact test scenario from user specification:
  // Deposit: Kaka sends $5,000 at 125 BDT/USD
  const initialDeposit: DepositRecord = {
    id: 'DEP-000001',
    date: '2026-09-01',
    senderName: 'Kaka',
    usdAmount: 5000,
    receivingRate: 125,
    bdtAmount: computeDepositBDT(5000, 125), // 625,000
    receivingMethod: 'Bank Asia',
    note: 'Initial fund from Kaka',
    createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
  };

  // Transaction 1:
  // $300 × 123 = 36,900 expected, Actual = 36,850, Charge = 50, Commission = 150, Profit = 200, Reference = Kaka
  const expectedBdt1 = computeExpectedBDT(300, 123); // 36,900
  const actualSend1 = 36850;
  const charge1 = computeBankCharge(expectedBdt1, actualSend1); // 50
  const commission1 = computeCommission(300, 0.50); // 150
  const profit1 = computeProfit(charge1, commission1); // 200

  const trx1: Transaction = {
    id: 'TRX-000001',
    date: '2026-09-20',
    recipientName: 'Rahim',
    accountNumber: '123456789',
    bankName: 'Dutch-Bangla Bank',
    sendUsd: 300,
    dollarRate: 123,
    expectedBdt: expectedBdt1,
    actualSend: actualSend1,
    bankCharge: charge1,
    commission: commission1,
    profit: profit1,
    referenceBy: 'Kaka',
    note: 'Family support payout',
    status: 'Completed',
    createdAt: new Date('2026-09-20T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-09-20T11:00:00Z').toISOString(),
  };

  // Transaction 2:
  // $500 × 122.50 = 61,250 expected, Actual = 61,000, Charge = 250, Commission = 250, Profit = 500, Reference = Humaiun Kaka's Assistant
  const expectedBdt2 = computeExpectedBDT(500, 122.50); // 61,250
  const actualSend2 = 61000;
  const charge2 = computeBankCharge(expectedBdt2, actualSend2); // 250
  const commission2 = computeCommission(500, 0.50); // 250
  const profit2 = computeProfit(charge2, commission2); // 500

  const trx2: Transaction = {
    id: 'TRX-000002',
    date: '2026-09-20',
    recipientName: 'Md. Karim Ullah',
    accountNumber: '987654321',
    bankName: 'Islami Bank Bangladesh',
    sendUsd: 500,
    dollarRate: 122.50,
    expectedBdt: expectedBdt2,
    actualSend: actualSend2,
    bankCharge: charge2,
    commission: commission2,
    profit: profit2,
    referenceBy: "Humaiun Kaka's Assistant",
    note: 'Urgent transfer request',
    status: 'Completed',
    createdAt: new Date('2026-09-20T12:30:00Z').toISOString(),
    updatedAt: new Date('2026-09-20T12:30:00Z').toISOString(),
  };

  const initialAccounts: SavedAccount[] = [
    {
      id: 'ACC-001',
      recipientName: 'Rahim',
      accountNumber: '123456789',
      bankName: 'Dutch-Bangla Bank',
      lastUsed: '2026-09-20',
      totalTransactions: 1,
      totalUsdSent: 300,
      totalBdtSent: 36850,
      createdAt: '2026-09-20T10:00:00Z',
    },
    {
      id: 'ACC-002',
      recipientName: 'Md. Karim Ullah',
      accountNumber: '987654321',
      bankName: 'Islami Bank Bangladesh',
      lastUsed: '2026-09-20',
      totalTransactions: 1,
      totalUsdSent: 500,
      totalBdtSent: 61000,
      createdAt: '2026-09-20T11:00:00Z',
    },
    {
      id: 'ACC-003',
      recipientName: 'Rahman',
      accountNumber: '20501234567',
      bankName: 'BRAC Bank',
      lastUsed: '2026-09-18',
      totalTransactions: 0,
      totalUsdSent: 0,
      totalBdtSent: 0,
      createdAt: '2026-09-18T09:00:00Z',
    },
    {
      id: 'ACC-004',
      recipientName: 'Rahim Uddin',
      accountNumber: '11029384756',
      bankName: 'City Bank',
      lastUsed: '2026-09-15',
      totalTransactions: 0,
      totalUsdSent: 0,
      totalBdtSent: 0,
      createdAt: '2026-09-15T08:00:00Z',
    }
  ];

  return {
    version: 1,
    transactions: [trx1, trx2],
    deposits: [initialDeposit],
    savedAccounts: [...initialAccounts, ...PREVIOUS_CUSTOMER_ACCOUNTS],
    personalExpenses: [],
    settings: defaultSettings,
    lastBackupDate: new Date().toISOString(),
  };
}

export function loadStoredData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V1);
    if (!raw) {
      const initial = getDefaultInitialData();
      saveStoredData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as StorageData;
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.deposits)) {
      const fallback = getDefaultInitialData();
      saveStoredData(fallback);
      return fallback;
    }
    // Ensure default settings fields exist (e.g. defaultDollarRate)
    const defaults = getDefaultInitialData();
    parsed.settings = {
      ...defaults.settings,
      ...(parsed.settings || {}),
    };

    // Ensure personalExpenses array exists
    if (!Array.isArray(parsed.personalExpenses)) {
      parsed.personalExpenses = [];
    }

    // Ensure all default banks exist in settings.banks
    const currentBanks = new Set(parsed.settings.banks || []);
    for (const b of defaults.settings.banks) {
      if (!currentBanks.has(b)) {
        parsed.settings.banks.push(b);
        currentBanks.add(b);
      }
    }

    // Ensure all previous customer accounts are merged into savedAccounts if not already present
    if (!Array.isArray(parsed.savedAccounts)) {
      parsed.savedAccounts = defaults.savedAccounts;
      saveStoredData(parsed);
    } else {
      const existingAccountKeys = new Set(
        parsed.savedAccounts.map((a) => `${(a.recipientName || '').toUpperCase()}|${(a.accountNumber || '').trim()}`)
      );
      let addedCount = 0;
      for (const cust of PREVIOUS_CUSTOMER_ACCOUNTS) {
        const key = `${cust.recipientName.toUpperCase()}|${cust.accountNumber.trim()}`;
        if (!existingAccountKeys.has(key)) {
          parsed.savedAccounts.push(cust);
          existingAccountKeys.add(key);
          addedCount++;
        }
      }
      if (addedCount > 0) {
        saveStoredData(parsed);
      }
    }

    return parsed;
  } catch (err) {
    console.error('Failed to load storage data, using defaults:', err);
    return getDefaultInitialData();
  }
}

export function saveStoredData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function exportBackupJSON(data: StorageData): void {
  const exportPayload = {
    ...data,
    exportedAt: new Date().toISOString(),
    appName: 'Cross-Border USD/BDT Accounting Manager',
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `usd-bdt-accounting-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportJSONBackup = exportBackupJSON;

export async function importJSONBackup(file: File): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as StorageData;
        if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.deposits)) {
          throw new Error('Invalid backup file structure: missing transactions or deposits.');
        }
        saveStoredData(parsed);
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse backup JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

export function exportTransactionsCSV(
  transactions: Transaction[],
  filename: string,
  referenceFilterName?: string,
  dateRangeStr?: string,
  categoryFilterName?: string
): void {
  const headers = [
    'Date',
    'Transaction ID',
    'Recipient',
    'Account Number',
    'Bank',
    'USD',
    'Rate',
    'Expected BDT',
    'Actual Sent (BDT)',
    'Bank Charge (BDT)',
    'Commission (BDT)',
    'Profit (BDT)',
    'Source Reference',
    'Status',
    'Note',
  ];

  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map((t) => [
    escapeCSV(t.date),
    escapeCSV(t.id),
    escapeCSV(t.recipientName),
    escapeCSV(t.accountNumber),
    escapeCSV(t.bankName),
    escapeCSV(t.sendUsd),
    escapeCSV(t.dollarRate),
    escapeCSV(t.expectedBdt),
    escapeCSV(t.actualSend),
    escapeCSV(t.bankCharge),
    escapeCSV(t.commission),
    escapeCSV(t.profit),
    escapeCSV(t.referenceBy),
    escapeCSV(t.status),
    escapeCSV(t.note || ''),
  ]);

  // Calculate totals for Completed items
  const completed = transactions.filter((t) => t.status === 'Completed');
  const totalUsd = completed.reduce((sum, t) => sum + t.sendUsd, 0);
  const totalExpectedBdt = completed.reduce((sum, t) => sum + t.expectedBdt, 0);
  const totalActualSend = completed.reduce((sum, t) => sum + t.actualSend, 0);
  const totalBankCharge = completed.reduce((sum, t) => sum + t.bankCharge, 0);
  const totalCommission = completed.reduce((sum, t) => sum + t.commission, 0);
  const totalProfit = completed.reduce((sum, t) => sum + t.profit, 0);

  const summaryRow = [
    escapeCSV('TOTAL (Completed)'),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(totalUsd),
    escapeCSV(''),
    escapeCSV(totalExpectedBdt),
    escapeCSV(totalActualSend),
    escapeCSV(totalBankCharge),
    escapeCSV(totalCommission),
    escapeCSV(totalProfit),
    escapeCSV(''),
    escapeCSV(`${completed.length} Completed`),
    escapeCSV(''),
  ];

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Bengali/English compatibility
  const reportTitle = referenceFilterName && referenceFilterName !== 'All' 
    ? `${referenceFilterName} Source Report` 
    : categoryFilterName && categoryFilterName !== 'All'
    ? `${categoryFilterName} Category Report`
    : 'Cross-Border Transactions Ledger Report';

  csvContent += `Report Title:,"${reportTitle}"\r\n`;
  if (categoryFilterName && categoryFilterName !== 'All') {
    csvContent += `Category Filter:,"${categoryFilterName}"\r\n`;
  }
  if (referenceFilterName && referenceFilterName !== 'All') {
    csvContent += `Source Reference Filter:,"${referenceFilterName}"\r\n`;
  }
  if (dateRangeStr) {
    csvContent += `Date Range:,"${dateRangeStr}"\r\n`;
  }
  csvContent += `Total Records Exported:,${transactions.length}\r\n`;
  csvContent += `Generated At:,"${new Date().toLocaleString()}"\r\n\r\n`;

  csvContent += headers.join(',') + '\r\n';
  rows.forEach((r) => {
    csvContent += r.join(',') + '\r\n';
  });
  csvContent += '\r\n' + summaryRow.join(',') + '\r\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPersonalExpensesCSV(
  expenses: PersonalExpense[],
  filename: string
): void {
  const headers = [
    'Date',
    'Time',
    'Expense ID',
    'Category',
    'Amount (BDT)',
    'Dollar Rate',
    'Equivalent (USD)',
    'Source Fund',
    'Description / Purpose',
  ];

  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = expenses.map((e) => [
    escapeCSV(e.date),
    escapeCSV(e.time || ''),
    escapeCSV(e.id),
    escapeCSV(e.category),
    escapeCSV(e.amountBdt),
    escapeCSV(e.dollarRate),
    escapeCSV(e.amountUsd),
    escapeCSV(e.sourceFund || "Kaka's Fund"),
    escapeCSV(e.description || ''),
  ]);

  const totalBdt = expenses.reduce((sum, e) => sum + e.amountBdt, 0);
  const totalUsd = expenses.reduce((sum, e) => sum + e.amountUsd, 0);

  const summaryRow = [
    escapeCSV('TOTAL EXPENSE'),
    escapeCSV(''),
    escapeCSV(`${expenses.length} records`),
    escapeCSV(''),
    escapeCSV(totalBdt),
    escapeCSV(''),
    escapeCSV(totalUsd.toFixed(2)),
    escapeCSV(''),
    escapeCSV(''),
  ];

  let csvContent = '\uFEFF';
  csvContent += `Report Title:,"Personal Expense Ledger (Kaka's Fund)"\r\n`;
  csvContent += `Generated At:,"${new Date().toLocaleString()}"\r\n\r\n`;
  csvContent += headers.join(',') + '\r\n';
  rows.forEach((r) => {
    csvContent += r.join(',') + '\r\n';
  });
  csvContent += '\r\n' + summaryRow.join(',') + '\r\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
