import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  AppSettings,
  DepositRecord,
  PersonalExpense,
  SavedAccount,
  SourceLedgerItem,
  Transaction,
  ReferenceSummary,
} from '../types';
import {
  computeBankCharge,
  computeCommission,
  computeExpectedBDT,
  computeProfit,
  getTodayDateString,
  roundTo,
} from '../utils/calculations';
import {
  getDefaultInitialData,
  loadStoredData,
  saveStoredData,
  StorageData,
} from '../utils/storage';
import {
  getStoredPin,
  setStoredPin,
  getStoredLastSyncTime,
  setStoredLastSyncTime,
  saveToCloudWithPin,
  loadFromCloudWithPin,
  SyncResult,
} from '../utils/syncService';

export interface NewTransactionDraft {
  date: string;
  recipientName: string;
  accountNumber: string;
  bankName: string;
  sendUsd: number | '';
  dollarRate: number | '';
  sendAmount: number | '';
  referenceBy: string;
  note: string;
  saveAccount: boolean;
}

export interface AccountingContextType {
  transactions: Transaction[];
  deposits: DepositRecord[];
  savedAccounts: SavedAccount[];
  personalExpenses: PersonalExpense[];
  settings: AppSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  draftTransaction: NewTransactionDraft | null;
  setDraftTransaction: (draft: NewTransactionDraft | null) => void;

  // Global Transaction Search & Navigation
  transactionSearchFilter: string;
  setTransactionSearchFilter: (term: string) => void;
  focusedTransactionId: string | null;
  setFocusedTransactionId: (id: string | null) => void;
  navigateToTransaction: (transactionId: string) => void;

  // Computed Global Metrics
  totalDepositedUsd: number;
  totalDepositedBdt: number;
  totalSentUsd: number;
  totalSentBdt: number;
  remainingUsdBalance: number;
  totalPersonalExpenseBdt: number;
  totalPersonalExpenseUsd: number;
  netAvailableUsdBalance: number;
  totalExpectedBdt: number;
  totalBankCharge: number;
  totalCommission: number;
  totalProfit: number;
  completedTransactionsCount: number;

  todayStats: {
    usd: number;
    bdt: number;
    profit: number;
    count: number;
  };

  thisMonthStats: {
    usd: number;
    bdt: number;
    profit: number;
    count: number;
  };

  referenceSummaries: ReferenceSummary[];
  sourceLedger: SourceLedgerItem[];

  // CRUD & Actions
  createTransaction: (data: {
    date: string;
    recipientName: string;
    accountNumber: string;
    bankName: string;
    sendUsd: number;
    dollarRate: number;
    actualSend: number;
    referenceBy: string;
    category?: string;
    note?: string;
    saveAccount?: boolean;
    status?: Transaction['status'];
  }) => Transaction;

  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  createDeposit: (data: {
    date: string;
    senderName: string;
    usdAmount: number;
    receivingRate: number;
    receivingMethod: string;
    note?: string;
  }) => DepositRecord;

  updateDeposit: (id: string, updates: Partial<DepositRecord>) => void;
  deleteDeposit: (id: string) => void;

  createPersonalExpense: (data: {
    date: string;
    time?: string;
    amountBdt: number;
    dollarRate?: number;
    category: string;
    description: string;
    sourceFund?: string;
  }) => PersonalExpense;
  updatePersonalExpense: (id: string, updates: Partial<PersonalExpense>) => void;
  deletePersonalExpense: (id: string) => void;

  saveOrUpdateAccount: (recipientName: string, accountNumber: string, bankName: string) => SavedAccount;
  deleteAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<SavedAccount>) => void;

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  addBank: (bankName: string) => boolean;
  removeBank: (bankName: string) => void;
  addReference: (refName: string) => boolean;
  removeReference: (refName: string) => void;

  restoreFullBackup: (data: StorageData) => boolean;
  resetToDefaultDemo: () => void;
  clearAllData: () => void;

  // PIN Cloud Synchronization (Mobile & PC)
  syncPin: string;
  setSyncPin: (pin: string) => void;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  lastSyncTime: string | null;
  isSyncLoading: boolean;
  syncMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  setSyncMessage: (msg: { text: string; type: 'success' | 'error' | 'info' } | null) => void;
  saveDataToPin: (targetPin?: string) => Promise<SyncResult>;
  loadDataFromPin: (targetPin?: string) => Promise<SyncResult>;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;

  importTransactionsList: (
    items: Array<{
      date: string;
      recipientName: string;
      accountNumber: string;
      bankName: string;
      sendUsd: number;
      dollarRate: number;
      actualSend?: number;
      referenceBy: string;
      id?: string;
      note?: string;
    }>
  ) => { imported: number; successful: number; errors: string[] };
}

const AccountingContext = createContext<AccountingContextType | null>(null);

export function AccountingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StorageData>(() => loadStoredData());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [draftTransaction, setDraftTransaction] = useState<NewTransactionDraft | null>(null);
  const [transactionSearchFilter, setTransactionSearchFilter] = useState<string>('');
  const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);

  // PIN Cloud Sync State
  const [syncPin, setSyncPinState] = useState<string>(() => getStoredPin());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getStoredLastSyncTime());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSyncLoading, setIsSyncLoading] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('crossborder_auto_sync');
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  });

  const setSyncPin = (pin: string) => {
    setSyncPinState(pin);
    setStoredPin(pin);
  };

  const setAutoSyncEnabled = (enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    try {
      localStorage.setItem('crossborder_auto_sync', enabled ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  };

  const navigateToTransaction = (transactionId: string) => {
    setTransactionSearchFilter(transactionId);
    setFocusedTransactionId(transactionId);
    setActiveTab('transactions');
  };

  // Sync to local storage whenever state changes
  useEffect(() => {
    saveStoredData(data);
  }, [data]);

  const { transactions, deposits, savedAccounts, settings } = data;
  const personalExpenses = data.personalExpenses || [];

  // Helper to generate next IDs
  const getNextTransactionId = (): string => {
    let maxNum = 0;
    for (const t of transactions) {
      const match = t.id.match(/^TRX-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `TRX-${String(nextNum).padStart(6, '0')}`;
  };

  const getNextDepositId = (): string => {
    let maxNum = 0;
    for (const d of deposits) {
      const match = d.id.match(/^DEP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `DEP-${String(nextNum).padStart(6, '0')}`;
  };

  const getNextExpenseId = (): string => {
    let maxNum = 0;
    for (const e of personalExpenses) {
      const match = e.id.match(/^EXP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `EXP-${String(nextNum).padStart(6, '0')}`;
  };

  // Only completed transactions contribute to financial totals
  const completedTransactions = useMemo(
    () => transactions.filter((t) => t.status === 'Completed'),
    [transactions]
  );

  // Computed Financial Totals
  const totalDepositedUsd = useMemo(
    () => roundTo(deposits.reduce((sum, d) => sum + d.usdAmount, 0), 2),
    [deposits]
  );

  const totalDepositedBdt = useMemo(
    () => roundTo(deposits.reduce((sum, d) => sum + d.bdtAmount, 0), 2),
    [deposits]
  );

  const totalSentUsd = useMemo(
    () => roundTo(completedTransactions.reduce((sum, t) => sum + t.sendUsd, 0), 2),
    [completedTransactions]
  );

  const totalSentBdt = useMemo(
    () => roundTo(completedTransactions.reduce((sum, t) => sum + t.actualSend, 0), 2),
    [completedTransactions]
  );

  // Core formula: Total USD Received - Total Completed USD Sent = Remaining USD
  const remainingUsdBalance = useMemo(
    () => roundTo(totalDepositedUsd - totalSentUsd, 2),
    [totalDepositedUsd, totalSentUsd]
  );

  // Personal Expenses Totals & Net Balance
  const totalPersonalExpenseBdt = useMemo(
    () => roundTo(personalExpenses.reduce((sum, e) => sum + e.amountBdt, 0), 2),
    [personalExpenses]
  );

  const totalPersonalExpenseUsd = useMemo(
    () => roundTo(personalExpenses.reduce((sum, e) => sum + e.amountUsd, 0), 2),
    [personalExpenses]
  );

  const netAvailableUsdBalance = useMemo(
    () => roundTo(remainingUsdBalance - totalPersonalExpenseUsd, 2),
    [remainingUsdBalance, totalPersonalExpenseUsd]
  );

  const totalExpectedBdt = useMemo(
    () => roundTo(completedTransactions.reduce((sum, t) => sum + t.expectedBdt, 0), 2),
    [completedTransactions]
  );

  const totalBankCharge = useMemo(
    () => roundTo(completedTransactions.reduce((sum, t) => sum + t.bankCharge, 0), 2),
    [completedTransactions]
  );

  const totalCommission = useMemo(
    () => roundTo(completedTransactions.reduce((sum, t) => sum + t.commission, 0), 2),
    [completedTransactions]
  );

  const totalProfit = useMemo(
    () => roundTo(completedTransactions.reduce((sum, t) => sum + t.profit, 0), 2),
    [completedTransactions]
  );

  const completedTransactionsCount = completedTransactions.length;

  // Today & This Month calculations
  const todayStr = getTodayDateString();
  const currentYearMonth = todayStr.slice(0, 7); // YYYY-MM

  const todayStats = useMemo(() => {
    const todayList = completedTransactions.filter((t) => t.date === todayStr);
    return {
      usd: roundTo(todayList.reduce((sum, t) => sum + t.sendUsd, 0), 2),
      bdt: roundTo(todayList.reduce((sum, t) => sum + t.actualSend, 0), 2),
      profit: roundTo(todayList.reduce((sum, t) => sum + t.profit, 0), 2),
      count: todayList.length,
    };
  }, [completedTransactions, todayStr]);

  const thisMonthStats = useMemo(() => {
    const monthList = completedTransactions.filter((t) => t.date.startsWith(currentYearMonth));
    return {
      usd: roundTo(monthList.reduce((sum, t) => sum + t.sendUsd, 0), 2),
      bdt: roundTo(monthList.reduce((sum, t) => sum + t.actualSend, 0), 2),
      profit: roundTo(monthList.reduce((sum, t) => sum + t.profit, 0), 2),
      count: monthList.length,
    };
  }, [completedTransactions, currentYearMonth]);

  // Reference-wise accounting summary
  const referenceSummaries = useMemo(() => {
    // Collect all configured references plus any reference found in existing transactions
    const allRefs = Array.from(
      new Set([...settings.references, ...transactions.map((t) => t.referenceBy)])
    ).filter(Boolean);

    return allRefs.map((refName) => {
      const refTxns = completedTransactions.filter((t) => t.referenceBy === refName);
      const refUsd = roundTo(refTxns.reduce((s, t) => s + t.sendUsd, 0), 2);
      const refBdt = roundTo(refTxns.reduce((s, t) => s + t.actualSend, 0), 2);
      const refExpBdt = roundTo(refTxns.reduce((s, t) => s + t.expectedBdt, 0), 2);
      const refCharge = roundTo(refTxns.reduce((s, t) => s + t.bankCharge, 0), 2);
      const refComm = roundTo(refTxns.reduce((s, t) => s + t.commission, 0), 2);
      const refProfit = roundTo(refTxns.reduce((s, t) => s + t.profit, 0), 2);

      return {
        referenceName: refName,
        totalUsdSent: refUsd,
        totalBdtSent: refBdt,
        totalExpectedBdt: refExpBdt,
        totalBankCharge: refCharge,
        totalCommission: refComm,
        totalProfit: refProfit,
        transactionCount: refTxns.length,
      };
    });
  }, [completedTransactions, settings.references, transactions]);

  // Source / Sender Ledger from Deposits
  const sourceLedger = useMemo(() => {
    const map = new Map<
      string,
      { totalUsd: number; totalBdt: number; count: number; rates: number[]; lastDate: string }
    >();

    for (const d of deposits) {
      const name = d.senderName.trim() || 'Unspecified';
      const existing = map.get(name) || {
        totalUsd: 0,
        totalBdt: 0,
        count: 0,
        rates: [],
        lastDate: '',
      };

      existing.totalUsd += d.usdAmount;
      existing.totalBdt += d.bdtAmount;
      existing.count += 1;
      existing.rates.push(d.receivingRate);
      if (!existing.lastDate || d.date > existing.lastDate) {
        existing.lastDate = d.date;
      }
      map.set(name, existing);
    }

    const result: SourceLedgerItem[] = [];
    map.forEach((val, key) => {
      const avgRate = val.totalUsd > 0 ? val.totalBdt / val.totalUsd : 0;
      result.push({
        sourceName: key,
        totalUsdReceived: roundTo(val.totalUsd, 2),
        totalBdtValue: roundTo(val.totalBdt, 2),
        depositCount: val.count,
        averageRate: roundTo(avgRate, 2),
        lastDepositDate: val.lastDate,
      });
    });

    return result.sort((a, b) => b.totalUsdReceived - a.totalUsdReceived);
  }, [deposits]);

  // Save or update recipient in saved accounts
  const saveOrUpdateAccount = (
    recipientName: string,
    accountNumber: string,
    bankName: string,
    txUsd: number = 0,
    txBdt: number = 0,
    txDate: string = ''
  ): SavedAccount => {
    const trimmedName = recipientName.trim();
    const trimmedAcc = accountNumber.trim();
    const trimmedBank = bankName.trim();

    let accountUpdated: SavedAccount | null = null;

    setData((prev) => {
      const accounts = [...prev.savedAccounts];
      const matchIndex = accounts.findIndex(
        (a) =>
          a.recipientName.toLowerCase() === trimmedName.toLowerCase() &&
          a.accountNumber === trimmedAcc
      );

      if (matchIndex >= 0) {
        const existing = accounts[matchIndex];
        const updated: SavedAccount = {
          ...existing,
          bankName: trimmedBank || existing.bankName,
          lastUsed: txDate || existing.lastUsed || getTodayDateString(),
          totalTransactions: existing.totalTransactions + (txUsd > 0 ? 1 : 0),
          totalUsdSent: roundTo(existing.totalUsdSent + txUsd, 2),
          totalBdtSent: roundTo(existing.totalBdtSent + txBdt, 2),
        };
        accounts[matchIndex] = updated;
        accountUpdated = updated;
      } else {
        const newAcc: SavedAccount = {
          id: `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          recipientName: trimmedName,
          accountNumber: trimmedAcc,
          bankName: trimmedBank,
          lastUsed: txDate || getTodayDateString(),
          totalTransactions: txUsd > 0 ? 1 : 0,
          totalUsdSent: txUsd,
          totalBdtSent: txBdt,
          createdAt: new Date().toISOString(),
        };
        accounts.push(newAcc);
        accountUpdated = newAcc;
      }

      return {
        ...prev,
        savedAccounts: accounts,
      };
    });

    return (
      accountUpdated || {
        id: `ACC-FALLBACK`,
        recipientName: trimmedName,
        accountNumber: trimmedAcc,
        bankName: trimmedBank,
        lastUsed: txDate || getTodayDateString(),
        totalTransactions: 1,
        totalUsdSent: txUsd,
        totalBdtSent: txBdt,
        createdAt: new Date().toISOString(),
      }
    );
  };

  // Transaction Actions
  const createTransaction = (params: {
    date: string;
    recipientName: string;
    accountNumber: string;
    bankName: string;
    sendUsd: number;
    dollarRate: number;
    actualSend: number;
    referenceBy: string;
    category?: string;
    note?: string;
    saveAccount?: boolean;
    status?: Transaction['status'];
  }): Transaction => {
    const expectedBdt = computeExpectedBDT(params.sendUsd, params.dollarRate);
    const bankCharge = computeBankCharge(expectedBdt, params.actualSend);
    const commission = computeCommission(params.sendUsd, settings.commissionPerUsd);
    const profit = computeProfit(bankCharge, commission);
    const nowIso = new Date().toISOString();

    const newTx: Transaction = {
      id: getNextTransactionId(),
      date: params.date || getTodayDateString(),
      recipientName: params.recipientName.trim(),
      accountNumber: params.accountNumber.trim(),
      bankName: params.bankName.trim(),
      sendUsd: params.sendUsd,
      dollarRate: params.dollarRate,
      expectedBdt,
      actualSend: params.actualSend,
      bankCharge,
      commission,
      profit,
      referenceBy: params.referenceBy.trim() || settings.references[0] || 'Kaka',
      category: params.category || 'Family Support',
      note: params.note?.trim() || '',
      status: params.status || 'Completed',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setData((prev) => {
      let nextAccounts = [...prev.savedAccounts];
      // If user checked "save this account" or if it already exists, update stats
      if (params.saveAccount || nextAccounts.some(
        (a) =>
          a.recipientName.toLowerCase() === newTx.recipientName.toLowerCase() &&
          a.accountNumber === newTx.accountNumber
      )) {
        const matchIdx = nextAccounts.findIndex(
          (a) =>
            a.recipientName.toLowerCase() === newTx.recipientName.toLowerCase() &&
            a.accountNumber === newTx.accountNumber
        );
        if (matchIdx >= 0) {
          nextAccounts[matchIdx] = {
            ...nextAccounts[matchIdx],
            bankName: newTx.bankName || nextAccounts[matchIdx].bankName,
            lastUsed: newTx.date,
            totalTransactions: nextAccounts[matchIdx].totalTransactions + 1,
            totalUsdSent: roundTo(nextAccounts[matchIdx].totalUsdSent + newTx.sendUsd, 2),
            totalBdtSent: roundTo(nextAccounts[matchIdx].totalBdtSent + newTx.actualSend, 2),
          };
        } else {
          nextAccounts.push({
            id: `ACC-${Date.now()}`,
            recipientName: newTx.recipientName,
            accountNumber: newTx.accountNumber,
            bankName: newTx.bankName,
            lastUsed: newTx.date,
            totalTransactions: 1,
            totalUsdSent: newTx.sendUsd,
            totalBdtSent: newTx.actualSend,
            createdAt: nowIso,
          });
        }
      }

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        savedAccounts: nextAccounts,
      };
    });

    return newTx;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setData((prev) => {
      const list = prev.transactions.map((t) => {
        if (t.id !== id) return t;

        const sendUsd = updates.sendUsd !== undefined ? updates.sendUsd : t.sendUsd;
        const dollarRate = updates.dollarRate !== undefined ? updates.dollarRate : t.dollarRate;
        const actualSend = updates.actualSend !== undefined ? updates.actualSend : t.actualSend;

        const expectedBdt = computeExpectedBDT(sendUsd, dollarRate);
        const bankCharge = computeBankCharge(expectedBdt, actualSend);
        const commission = computeCommission(sendUsd, prev.settings.commissionPerUsd);
        const profit = computeProfit(bankCharge, commission);

        return {
          ...t,
          ...updates,
          sendUsd,
          dollarRate,
          expectedBdt,
          actualSend,
          bankCharge,
          commission,
          profit,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        transactions: list,
      };
    });
  };

  const deleteTransaction = (id: string) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  // Deposit Actions
  const createDeposit = (params: {
    date: string;
    senderName: string;
    usdAmount: number;
    receivingRate: number;
    receivingMethod: string;
    note?: string;
  }): DepositRecord => {
    const bdtAmount = roundTo(params.usdAmount * params.receivingRate, 2);
    const newDep: DepositRecord = {
      id: getNextDepositId(),
      date: params.date || getTodayDateString(),
      senderName: params.senderName.trim() || 'Kaka',
      usdAmount: params.usdAmount,
      receivingRate: params.receivingRate,
      bdtAmount,
      receivingMethod: params.receivingMethod.trim() || 'Bank Asia',
      note: params.note?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      deposits: [newDep, ...prev.deposits],
    }));

    return newDep;
  };

  const updateDeposit = (id: string, updates: Partial<DepositRecord>) => {
    setData((prev) => {
      const list = prev.deposits.map((d) => {
        if (d.id !== id) return d;
        const usdAmount = updates.usdAmount !== undefined ? updates.usdAmount : d.usdAmount;
        const receivingRate =
          updates.receivingRate !== undefined ? updates.receivingRate : d.receivingRate;
        const bdtAmount = roundTo(usdAmount * receivingRate, 2);

        return {
          ...d,
          ...updates,
          usdAmount,
          receivingRate,
          bdtAmount,
        };
      });
      return {
        ...prev,
        deposits: list,
      };
    });
  };

  const deleteDeposit = (id: string) => {
    setData((prev) => ({
      ...prev,
      deposits: prev.deposits.filter((d) => d.id !== id),
    }));
  };

  // Personal Expense Actions
  const createPersonalExpense = (input: {
    date: string;
    time?: string;
    amountBdt: number;
    dollarRate?: number;
    category: string;
    description: string;
    sourceFund?: string;
  }): PersonalExpense => {
    const rate = input.dollarRate && input.dollarRate > 0 ? input.dollarRate : (settings.defaultDollarRate || 123);
    const amountUsd = roundTo(input.amountBdt / rate, 2);
    const now = new Date();
    const timeStr = input.time?.trim() || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newExpense: PersonalExpense = {
      id: getNextExpenseId(),
      date: input.date || getTodayDateString(),
      time: timeStr,
      amountBdt: input.amountBdt,
      dollarRate: rate,
      amountUsd,
      category: input.category?.trim() || 'Personal Cash',
      description: input.description?.trim() || '',
      sourceFund: input.sourceFund?.trim() || "Kaka's Fund",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setData((prev) => ({
      ...prev,
      personalExpenses: [newExpense, ...(prev.personalExpenses || [])],
    }));

    return newExpense;
  };

  const updatePersonalExpense = (id: string, updates: Partial<PersonalExpense>) => {
    setData((prev) => {
      const list = (prev.personalExpenses || []).map((e) => {
        if (e.id !== id) return e;
        const merged = { ...e, ...updates, updatedAt: new Date().toISOString() };
        if (updates.amountBdt !== undefined || updates.dollarRate !== undefined) {
          const rate = merged.dollarRate && merged.dollarRate > 0 ? merged.dollarRate : (settings.defaultDollarRate || 123);
          merged.amountUsd = roundTo(merged.amountBdt / rate, 2);
        }
        return merged;
      });
      return { ...prev, personalExpenses: list };
    });
  };

  const deletePersonalExpense = (id: string) => {
    setData((prev) => ({
      ...prev,
      personalExpenses: (prev.personalExpenses || []).filter((e) => e.id !== id),
    }));
  };

  // Account actions
  const deleteAccount = (id: string) => {
    setData((prev) => ({
      ...prev,
      savedAccounts: prev.savedAccounts.filter((a) => a.id !== id),
    }));
  };

  const updateAccount = (id: string, updates: Partial<SavedAccount>) => {
    setData((prev) => ({
      ...prev,
      savedAccounts: prev.savedAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  // Settings actions
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setData((prev) => {
      const merged = { ...prev.settings, ...newSettings };
      // If commission rate changed, optionally recompute existing transactions
      const recomputedTx = prev.transactions.map((t) => {
        const commission = computeCommission(t.sendUsd, merged.commissionPerUsd);
        const profit = computeProfit(t.bankCharge, commission);
        return { ...t, commission, profit };
      });
      return {
        ...prev,
        settings: merged,
        transactions: recomputedTx,
      };
    });
  };

  const addBank = (bankName: string): boolean => {
    const trimmed = bankName.trim();
    if (!trimmed) return false;
    if (settings.banks.some((b) => b.toLowerCase() === trimmed.toLowerCase())) return false;
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        banks: [...prev.settings.banks, trimmed],
      },
    }));
    return true;
  };

  const removeBank = (bankName: string) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        banks: prev.settings.banks.filter((b) => b !== bankName),
      },
    }));
  };

  const addReference = (refName: string): boolean => {
    const trimmed = refName.trim();
    if (!trimmed) return false;
    if (settings.references.some((r) => r.toLowerCase() === trimmed.toLowerCase())) return false;
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        references: [...prev.settings.references, trimmed],
      },
    }));
    return true;
  };

  const removeReference = (refName: string) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        references: prev.settings.references.filter((r) => r !== refName),
      },
    }));
  };

  const restoreFullBackup = (importedData: StorageData): boolean => {
    if (!importedData || !Array.isArray(importedData.transactions) || !Array.isArray(importedData.deposits)) {
      return false;
    }
    setData({
      version: 1,
      transactions: importedData.transactions,
      deposits: importedData.deposits,
      savedAccounts: importedData.savedAccounts || [],
      personalExpenses: importedData.personalExpenses || [],
      settings: importedData.settings || settings,
      lastBackupDate: new Date().toISOString(),
    });
    return true;
  };

  const resetToDefaultDemo = () => {
    const defaultData = getDefaultInitialData();
    setData(defaultData);
  };

  const clearAllData = () => {
    setData({
      version: 1,
      transactions: [],
      deposits: [],
      savedAccounts: [],
      personalExpenses: [],
      settings,
      lastBackupDate: new Date().toISOString(),
    });
  };

  const saveDataToPin = async (targetPin?: string): Promise<SyncResult> => {
    const effectivePin = (targetPin || syncPin).trim();
    if (!effectivePin || effectivePin.length < 3) {
      const errRes: SyncResult = {
        success: false,
        error: 'অনুগ্রহ করে কমপক্ষে ৩ সংখ্যার একটি পিন দিন (যেমন: 1234 বা 7860)',
      };
      setSyncMessage({ text: errRes.error!, type: 'error' });
      return errRes;
    }

    setIsSyncLoading(true);
    setSyncMessage(null);
    try {
      const result = await saveToCloudWithPin(effectivePin, data);
      if (result.success) {
        setSyncPin(effectivePin);
        if (result.savedAt) setLastSyncTime(result.savedAt);
        setSyncMessage({
          text: `সফলভাবে PIN [${effectivePin}]-এ আপনার সকল হিসাব ক্লাউডে ব্যাকআপ হয়েছে!`,
          type: 'success',
        });
      } else {
        setSyncMessage({
          text: result.error || 'ক্লাউডে সেভ করতে সমস্যা হয়েছে।',
          type: 'error',
        });
      }
      return result;
    } finally {
      setIsSyncLoading(false);
    }
  };

  const loadDataFromPin = async (targetPin?: string): Promise<SyncResult> => {
    const effectivePin = (targetPin || syncPin).trim();
    if (!effectivePin) {
      const errRes: SyncResult = {
        success: false,
        error: 'অনুগ্রহ করে আপনার পিন কোড দিন',
      };
      setSyncMessage({ text: errRes.error!, type: 'error' });
      return errRes;
    }

    setIsSyncLoading(true);
    setSyncMessage(null);
    try {
      const result = await loadFromCloudWithPin(effectivePin);
      if (result.success && result.data) {
        setSyncPin(effectivePin);
        restoreFullBackup(result.data);
        if (result.savedAt) setLastSyncTime(result.savedAt);
        setSyncMessage({
          text: `সফলভাবে হিসাব লোড হয়েছে! (${result.data.transactions?.length || 0}টি লেনদেন, ${result.data.savedAccounts?.length || 0}টি একাউন্ট)`,
          type: 'success',
        });
      } else {
        setSyncMessage({
          text: result.error || 'ক্লাউড থেকে ডেটা পাওয়া যায়নি।',
          type: 'error',
        });
      }
      return result;
    } finally {
      setIsSyncLoading(false);
    }
  };

  // CSV Import Processor
  const importTransactionsList = (
    items: Array<{
      date: string;
      recipientName: string;
      accountNumber: string;
      bankName: string;
      sendUsd: number;
      dollarRate: number;
      actualSend?: number;
      referenceBy: string;
      id?: string;
      note?: string;
    }>
  ) => {
    const errors: string[] = [];
    const validTransactions: Transaction[] = [];
    const existingIds = new Set(transactions.map((t) => t.id.toLowerCase()));
    let nextNum = transactions.length + 1;

    items.forEach((row, idx) => {
      const lineNum = idx + 1;
      if (!row.recipientName) {
        errors.push(`Row ${lineNum}: Missing Recipient Name.`);
        return;
      }
      if (isNaN(row.sendUsd) || row.sendUsd <= 0) {
        errors.push(`Row ${lineNum}: Invalid Send USD amount (${row.sendUsd}).`);
        return;
      }
      if (isNaN(row.dollarRate) || row.dollarRate <= 0) {
        errors.push(`Row ${lineNum}: Invalid Dollar Rate (${row.dollarRate}).`);
        return;
      }

      const expectedBdt = computeExpectedBDT(row.sendUsd, row.dollarRate);
      const actualSend = row.actualSend !== undefined && !isNaN(row.actualSend) ? row.actualSend : expectedBdt;
      const bankCharge = computeBankCharge(expectedBdt, actualSend);
      const commission = computeCommission(row.sendUsd, settings.commissionPerUsd);
      const profit = computeProfit(bankCharge, commission);

      let txId = row.id?.trim() || '';
      if (txId && existingIds.has(txId.toLowerCase())) {
        errors.push(`Row ${lineNum}: Skipped because Transaction ID ${txId} already exists.`);
        return;
      }
      if (!txId) {
        while (existingIds.has(`TRX-${String(nextNum).padStart(6, '0')}`.toLowerCase())) {
          nextNum++;
        }
        txId = `TRX-${String(nextNum).padStart(6, '0')}`;
        nextNum++;
      }
      existingIds.add(txId.toLowerCase());

      const nowIso = new Date().toISOString();
      validTransactions.push({
        id: txId,
        date: row.date || getTodayDateString(),
        recipientName: row.recipientName.trim(),
        accountNumber: (row.accountNumber || '').trim(),
        bankName: (row.bankName || 'Dutch-Bangla Bank').trim(),
        sendUsd: row.sendUsd,
        dollarRate: row.dollarRate,
        expectedBdt,
        actualSend,
        bankCharge,
        commission,
        profit,
        referenceBy: row.referenceBy?.trim() || settings.references[0] || 'Kaka',
        note: row.note || 'Imported via CSV',
        status: 'Completed',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    if (validTransactions.length > 0) {
      setData((prev) => ({
        ...prev,
        transactions: [...validTransactions, ...prev.transactions],
      }));
    }

    return {
      imported: items.length,
      successful: validTransactions.length,
      errors,
    };
  };

  const value: AccountingContextType = {
    transactions,
    deposits,
    savedAccounts,
    personalExpenses,
    settings,
    activeTab,
    setActiveTab,
    draftTransaction,
    setDraftTransaction,

    transactionSearchFilter,
    setTransactionSearchFilter,
    focusedTransactionId,
    setFocusedTransactionId,
    navigateToTransaction,

    totalDepositedUsd,
    totalDepositedBdt,
    totalSentUsd,
    totalSentBdt,
    remainingUsdBalance,
    totalPersonalExpenseBdt,
    totalPersonalExpenseUsd,
    netAvailableUsdBalance,
    totalExpectedBdt,
    totalBankCharge,
    totalCommission,
    totalProfit,
    completedTransactionsCount,

    todayStats,
    thisMonthStats,
    referenceSummaries,
    sourceLedger,

    createTransaction,
    updateTransaction,
    deleteTransaction,

    createDeposit,
    updateDeposit,
    deleteDeposit,

    createPersonalExpense,
    updatePersonalExpense,
    deletePersonalExpense,

    saveOrUpdateAccount,
    deleteAccount,
    updateAccount,

    updateSettings,
    addBank,
    removeBank,
    addReference,
    removeReference,

    restoreFullBackup,
    resetToDefaultDemo,
    clearAllData,

    // PIN Cloud Sync
    syncPin,
    setSyncPin,
    isSyncModalOpen,
    setIsSyncModalOpen,
    lastSyncTime,
    isSyncLoading,
    syncMessage,
    setSyncMessage,
    saveDataToPin,
    loadDataFromPin,
    autoSyncEnabled,
    setAutoSyncEnabled,

    importTransactionsList,
  };

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccounting(): AccountingContextType {
  const ctx = useContext(AccountingContext);
  if (!ctx) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return ctx;
}
