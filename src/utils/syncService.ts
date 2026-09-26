import { StorageData } from './storage';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  savedAt?: string;
  stats?: {
    transactionsCount: number;
    accountsCount: number;
    depositsCount: number;
    expensesCount: number;
  };
  data?: StorageData;
}

const PIN_STORAGE_KEY = 'crossborder_sync_pin';
const LAST_SYNC_KEY = 'crossborder_last_sync_time';

export function getStoredPin(): string {
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredPin(pin: string): void {
  try {
    if (pin) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
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
 * Upload & Save local data to cloud under a chosen PIN
 */
export async function saveToCloudWithPin(
  pin: string,
  data: StorageData,
  deviceName = 'Device'
): Promise<SyncResult> {
  const cleanPin = pin.trim();
  if (!cleanPin || cleanPin.length < 3) {
    return {
      success: false,
      error: 'পিনটি কমপক্ষে ৩ অক্ষরের হতে হবে (যেমন: 1234 বা 7860)',
    };
  }

  try {
    // 1. Try native backend route
    const response = await fetch('/api/sync/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pin: cleanPin,
        data,
        deviceName,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Server responded with status ${response.status}`);
    }

    // Save active PIN locally
    setStoredPin(cleanPin);
    const now = new Date().toISOString();
    setStoredLastSyncTime(now);

    return {
      success: true,
      message: `আপনার হিসাব সফলভাবে PIN [${cleanPin}]-এ সেভ করা হয়েছে!`,
      savedAt: result.lastSaved || now,
      stats: result.stats,
    };
  } catch (err: any) {
    console.error('saveToCloudWithPin error:', err);
    return {
      success: false,
      error: err.message || 'ক্লাউডে হিসাব সেভ করতে সমস্যা হয়েছে। ইন্টারনেট কানেকশন চেক করুন।',
    };
  }
}

/**
 * Download & Load cloud data using a PIN
 */
export async function loadFromCloudWithPin(pin: string): Promise<SyncResult> {
  const cleanPin = pin.trim();
  if (!cleanPin) {
    return {
      success: false,
      error: 'অনুগ্রহ করে আপনার পিন কোড দিন (Enter PIN)',
    };
  }

  try {
    const response = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      if (response.status === 404) {
        return {
          success: false,
          error: `এই পিন [${cleanPin}] দিয়ে কোনো হিসাব পাওয়া যায়নি! অনুগ্রহ করে মোবাইল থেকে প্রথমে 'সেভ' করুন।`,
        };
      }
      throw new Error(result.error || `Server responded with status ${response.status}`);
    }

    if (!result.data || !Array.isArray(result.data.transactions)) {
      throw new Error('প্রাপ্ত ডেটা ত্রুটিপূর্ণ বা অসম্পূর্ণ।');
    }

    // Remember this PIN
    setStoredPin(cleanPin);
    const now = new Date().toISOString();
    setStoredLastSyncTime(now);

    return {
      success: true,
      message: `সফলভাবে ডেটা লোড হয়েছে! ${result.data.transactions.length}টি ট্রানজাকশন ও ${result.data.savedAccounts?.length || 0}টি একাউন্ট পাওয়া গেছে।`,
      data: result.data,
      savedAt: result.lastSaved || now,
      stats: result.stats,
    };
  } catch (err: any) {
    console.error('loadFromCloudWithPin error:', err);
    return {
      success: false,
      error: err.message || 'ক্লাউড থেকে ডেটা আনতে ব্যর্থ হয়েছে। অনুগ্রহ করে পিন ঠিক আছে কিনা চেক করুন।',
    };
  }
}

/**
 * Inspect PIN status
 */
export async function checkPinMetadata(pin: string): Promise<{ exists: boolean; stats?: any; lastSaved?: string; error?: string }> {
  try {
    const cleanPin = pin.trim();
    if (!cleanPin) return { exists: false };

    const res = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}/meta`);
    if (res.status === 404) return { exists: false };
    const json = await res.json();
    return {
      exists: json.success && json.exists,
      stats: json.stats,
      lastSaved: json.lastSaved,
    };
  } catch (err: any) {
    return { exists: false, error: err.message };
  }
}
