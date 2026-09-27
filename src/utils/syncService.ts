import { StorageData } from './storage';
import { PREVIOUS_CUSTOMER_ACCOUNTS } from '../constants/customerAccounts';
import { INITIAL_BANKS, INITIAL_REFERENCES } from '../constants/banks';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  savedAt?: string;
  stats?: {
    transactionsCount: number;
    accountsCount: number;
    depositsCount: number;
    expensesCount?: number;
  };
  data?: StorageData;
}

const PIN_STORAGE_KEY = 'crossborder_sync_pin';
const LAST_SYNC_KEY = 'crossborder_last_sync_time';

/**
 * Robust PIN normalization:
 * Converts Bengali numerals (০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯) to standard Arabic numerals (0-9)
 * and strips spaces and invalid characters.
 */
export function normalizePin(pin: any): string {
  if (!pin) return '';
  const banglaToEnglishMap: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  let str = String(pin).trim();
  for (const [bn, en] of Object.entries(banglaToEnglishMap)) {
    str = str.split(bn).join(en);
  }
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

export function getStoredPin(): string {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY) || '';
    return normalizePin(raw);
  } catch {
    return '';
  }
}

export function setStoredPin(pin: string): void {
  try {
    const clean = normalizePin(pin);
    if (clean) {
      localStorage.setItem(PIN_STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(PIN_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to store PIN locally:', err);
  }
}

export function getStoredLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setStoredLastSyncTime(timestamp: string): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  } catch (err) {
    console.error('Failed to store last sync time:', err);
  }
}

/**
 * Guarantee that any imported or restored StorageData has complete and safe structure
 * Prevents React runtime crashes (e.g. undefined settings.references.map)
 */
export function sanitizeStoragePayload(data: any): StorageData {
  const fallbackSettings = {
    commissionPerUsd: 0.50,
    defaultDollarRate: 123.00,
    references: INITIAL_REFERENCES,
    banks: INITIAL_BANKS,
    currencyBdtSymbol: '৳',
    currencyUsdSymbol: '$',
    lastBackupDate: new Date().toISOString(),
  };

  if (!data || typeof data !== 'object') {
    return {
      version: 1,
      transactions: [],
      deposits: [],
      savedAccounts: PREVIOUS_CUSTOMER_ACCOUNTS,
      personalExpenses: [],
      settings: fallbackSettings,
      lastBackupDate: new Date().toISOString(),
    };
  }

  const rawSettings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const safeReferences =
    Array.isArray(rawSettings.references) && rawSettings.references.length > 0
      ? rawSettings.references
      : INITIAL_REFERENCES;

  const safeBanks =
    Array.isArray(rawSettings.banks) && rawSettings.banks.length > 0
      ? rawSettings.banks
      : INITIAL_BANKS;

  const safeSettings = {
    ...fallbackSettings,
    ...rawSettings,
    references: safeReferences,
    banks: safeBanks,
    defaultDollarRate:
      typeof rawSettings.defaultDollarRate === 'number' && rawSettings.defaultDollarRate > 0
        ? rawSettings.defaultDollarRate
        : 123.00,
    commissionPerUsd:
      typeof rawSettings.commissionPerUsd === 'number' && rawSettings.commissionPerUsd >= 0
        ? rawSettings.commissionPerUsd
        : 0.50,
    currencyBdtSymbol: rawSettings.currencyBdtSymbol || '৳',
    currencyUsdSymbol: rawSettings.currencyUsdSymbol || '$',
  };

  const safeTransactions = Array.isArray(data.transactions) ? data.transactions : [];
  const safeDeposits = Array.isArray(data.deposits) ? data.deposits : [];
  const safeExpenses = Array.isArray(data.personalExpenses) ? data.personalExpenses : [];

  // Guarantee all 122+ previous customer accounts are included
  let safeAccounts = Array.isArray(data.savedAccounts) ? [...data.savedAccounts] : [];
  if (safeAccounts.length === 0) {
    safeAccounts = [...PREVIOUS_CUSTOMER_ACCOUNTS];
  } else {
    const existingKeys = new Set(
      safeAccounts.map((a) => `${(a.recipientName || '').toUpperCase()}|${(a.accountNumber || '').trim()}`)
    );
    for (const ca of PREVIOUS_CUSTOMER_ACCOUNTS) {
      const key = `${ca.recipientName.toUpperCase()}|${ca.accountNumber.trim()}`;
      if (!existingKeys.has(key)) {
        safeAccounts.push(ca);
        existingKeys.add(key);
      }
    }
  }

  return {
    version: 1,
    transactions: safeTransactions,
    deposits: safeDeposits,
    savedAccounts: safeAccounts,
    personalExpenses: safeExpenses,
    settings: safeSettings,
    lastBackupDate: data.lastBackupDate || new Date().toISOString(),
  };
}

/**
 * Safely parse JSON from fetch response, handling HTML error pages and network errors without crashing
 */
async function safeParseResponse(response: Response): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return { success: false, error: `সার্ভার থেকে কোনো উত্তর পাওয়া যায়নি (Status: ${response.status})` };
    }

    const trimmed = text.trim();
    // Check if it's HTML (Vercel / Vite 404/502 error page)
    if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE html>') || trimmed.includes('<html')) {
      if (response.status === 404) {
        return { success: false, error: 'সার্ভারে পিনটি খুঁজে পাওয়া যায়নি (404 Not Found)' };
      }
      return { success: false, error: `সার্ভার সংযোগ ত্রুটি (Status: ${response.status})` };
    }

    // Try parsing as JSON safely
    try {
      const parsed = JSON.parse(trimmed);
      return { success: response.ok, data: parsed, error: parsed?.error };
    } catch {
      // If server returned plain text or unexpected string, don't let SyntaxError throw
      if (response.status === 404) {
        return { success: false, error: 'সার্ভারে পিনটি খুঁজে পাওয়া যায়নি।' };
      }
      return { success: false, error: trimmed.length < 100 ? trimmed : 'ডেটা প্রক্রিয়াকরণে সমস্যা হয়েছে।' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'সার্ভার সংযোগে সমস্যা হয়েছে।' };
  }
}

/**
 * Upload & Save local data to cloud under a chosen PIN
 */
export async function saveToCloudWithPin(
  pin: string,
  data: StorageData,
  deviceName = 'Device'
): Promise<SyncResult> {
  const cleanPin = normalizePin(pin);
  if (!cleanPin || cleanPin.length < 3) {
    return {
      success: false,
      error: 'পিনটি কমপক্ষে ৩ সংখ্যার হতে হবে (যেমন: 1234 বা 7860)',
    };
  }

  const safeData = sanitizeStoragePayload(data);

  // Try endpoints in order: /api/sync/save -> /api/sync
  const endpoints = ['/api/sync/save', '/api/sync'];
  let lastError = '';

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          pin: cleanPin,
          data: safeData,
          deviceName,
        }),
      });

      const parsed = await safeParseResponse(response);

      if (parsed.success && parsed.data && parsed.data.success) {
        setStoredPin(cleanPin);
        const now = new Date().toISOString();
        setStoredLastSyncTime(now);

        return {
          success: true,
          message: `আপনার হিসাব সফলভাবে PIN [${cleanPin}]-এ ক্লাউডে সেভ হয়েছে!`,
          savedAt: parsed.data.lastSaved || now,
          stats: parsed.data.stats,
          data: safeData,
        };
      }

      if (parsed.error) {
        lastError = parsed.error;
      }
    } catch (err: any) {
      lastError = err.message || 'নেটওয়ার্ক সংযোগ ত্রুটি';
    }
  }

  return {
    success: false,
    error: lastError || 'ক্লাউডে হিসাব সেভ করতে সমস্যা হয়েছে। ইন্টারনেট কানেকশন চেক করুন।',
  };
}

/**
 * Download & Load cloud data using a PIN
 */
export async function loadFromCloudWithPin(pin: string): Promise<SyncResult> {
  const cleanPin = normalizePin(pin);
  if (!cleanPin || cleanPin.length < 3) {
    return {
      success: false,
      error: 'অনুগ্রহ করে কমপক্ষে ৩ সংখ্যার সঠিক পিন দিন (যেমন: 1234 বা 7860)',
    };
  }

  // Try endpoints in order: /api/sync/:pin -> /api/sync?pin=...
  const endpoints = [
    `/api/sync/${encodeURIComponent(cleanPin)}`,
    `/api/sync?pin=${encodeURIComponent(cleanPin)}`,
  ];
  let isNotFound = false;
  let lastError = '';

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.status === 404) {
        isNotFound = true;
      }

      const parsed = await safeParseResponse(response);

      if (parsed.success && parsed.data && parsed.data.success) {
        const rawPayload = parsed.data.data;
        if (!rawPayload) {
          return {
            success: false,
            error: 'প্রাপ্ত ডেটা অসম্পূর্ণ।',
          };
        }

        // Sanitize to guarantee zero runtime crashes and 100% complete data
        const safeData = sanitizeStoragePayload(rawPayload);

        setStoredPin(cleanPin);
        const now = new Date().toISOString();
        setStoredLastSyncTime(now);

        return {
          success: true,
          message: `সফলভাবে ডেটা লোড হয়েছে! ${safeData.transactions.length}টি লেনদেন ও ${safeData.savedAccounts.length}টি একাউন্ট পাওয়া গেছে।`,
          data: safeData,
          savedAt: parsed.data.lastSaved || now,
          stats: parsed.data.stats || {
            transactionsCount: safeData.transactions.length,
            accountsCount: safeData.savedAccounts.length,
            depositsCount: safeData.deposits.length,
          },
        };
      }

      if (parsed.error) {
        lastError = parsed.error;
      }
    } catch (err: any) {
      lastError = err.message || 'নেটওয়ার্ক সংযোগ সমস্যা';
    }
  }

  if (isNotFound) {
    return {
      success: false,
      error: `এই পিন [${cleanPin}] দিয়ে কোনো হিসাব পাওয়া যায়নি! অনুগ্রহ করে মোবাইল থেকে প্রথমে 'সেভ' করুন অথবা পিন কোডটি সঠিক কিনা মিলিয়ে নিন।`,
    };
  }

  return {
    success: false,
    error: lastError || 'ক্লাউড থেকে ডেটা আনা যায়নি। পিন কোড সঠিক আছে কিনা চেক করুন।',
  };
}

/**
 * Generate a direct link that pre-fills and loads this PIN on PC
 */
export function getSyncShareUrl(pin: string): string {
  const clean = normalizePin(pin);
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?sync_pin=${encodeURIComponent(clean)}`;
  } catch {
    return `?sync_pin=${encodeURIComponent(clean)}`;
  }
}

/**
 * Inspect PIN status without loading full dataset
 */
export async function checkPinMetadata(pin: string): Promise<{ exists: boolean; stats?: any; lastSaved?: string; error?: string }> {
  try {
    const cleanPin = normalizePin(pin);
    if (!cleanPin || cleanPin.length < 3) return { exists: false };

    const res = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}/meta`, {
      headers: { Accept: 'application/json' },
    });
    const parsed = await safeParseResponse(res);
    if (!parsed.success || !parsed.data) {
      return { exists: false, error: parsed.error };
    }

    return {
      exists: Boolean(parsed.data.exists || parsed.data.success),
      stats: parsed.data.stats,
      lastSaved: parsed.data.lastSaved,
    };
  } catch (err: any) {
    return { exists: false, error: err.message };
  }
}

/**
 * Transfer Code: Export ledger state as a self-contained base64 transfer string
 * Allows 100% offline sync between devices even without internet/server
 */
export function exportDataToTransferCode(data: StorageData): string {
  try {
    const safeData = sanitizeStoragePayload(data);
    const jsonStr = JSON.stringify(safeData);
    const encoded = btoa(encodeURIComponent(jsonStr));
    return `SYNC-${encoded}`;
  } catch {
    return '';
  }
}

/**
 * Transfer Code: Import from transfer code
 */
export function importDataFromTransferCode(code: string): StorageData | null {
  try {
    const clean = code.trim().replace(/^SYNC-/, '');
    const jsonStr = decodeURIComponent(atob(clean));
    const parsed = JSON.parse(jsonStr);
    return sanitizeStoragePayload(parsed);
  } catch {
    return null;
  }
}
