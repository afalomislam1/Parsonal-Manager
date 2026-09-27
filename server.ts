import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { PREVIOUS_CUSTOMER_ACCOUNTS } from './src/constants/customerAccounts';
import { INITIAL_BANKS, INITIAL_REFERENCES } from './src/constants/banks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support JSON payloads up to 50MB for full ledger backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global CORS Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Dual persistent directories for maximum resilience across container environments
const APP_DATA_DIR = path.resolve(__dirname, 'data', 'pins');
const TMP_DATA_DIR = path.resolve('/tmp', 'crossborder_pins');

[APP_DATA_DIR, TMP_DATA_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn(`Could not initialize directory ${dir}:`, e);
  }
});

// In-memory cache for ultra-fast lookup across requests
const pinMemoryStore = new Map<string, { data: any; lastSaved: string; clientIp?: string }>();

/**
 * Standard default data seed used whenever a PIN payload is initialized or healed
 */
function getStandardDefaultData() {
  return {
    version: 1,
    transactions: [
      {
        id: 'TRX-000001',
        date: '2026-09-20',
        recipientName: 'Rahim',
        accountNumber: '123456789',
        bankName: 'Dutch-Bangla Bank',
        sendUsd: 300,
        dollarRate: 123,
        expectedBdt: 36900,
        actualSend: 36850,
        bankCharge: 50,
        commission: 150,
        profit: 200,
        referenceBy: 'Kaka',
        note: 'Family support payout',
        status: 'Completed',
        createdAt: '2026-09-20T11:00:00.000Z',
        updatedAt: '2026-09-20T11:00:00.000Z',
      },
      {
        id: 'TRX-000002',
        date: '2026-09-20',
        recipientName: 'Md. Karim Ullah',
        accountNumber: '987654321',
        bankName: 'Islami Bank Bangladesh',
        sendUsd: 500,
        dollarRate: 122.5,
        expectedBdt: 61250,
        actualSend: 61000,
        bankCharge: 250,
        commission: 250,
        profit: 500,
        referenceBy: "Humaiun Kaka's Assistant",
        note: 'Urgent transfer request',
        status: 'Completed',
        createdAt: '2026-09-20T12:30:00.000Z',
        updatedAt: '2026-09-20T12:30:00.000Z',
      },
    ],
    deposits: [
      {
        id: 'DEP-000001',
        date: '2026-09-01',
        senderName: 'Kaka',
        usdAmount: 5000,
        receivingRate: 125,
        bdtAmount: 625000,
        receivingMethod: 'Bank Asia',
        note: 'Initial fund from Kaka',
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ],
    savedAccounts: PREVIOUS_CUSTOMER_ACCOUNTS,
    personalExpenses: [],
    settings: {
      commissionPerUsd: 0.5,
      defaultDollarRate: 123.0,
      references: INITIAL_REFERENCES,
      banks: INITIAL_BANKS,
      currencyBdtSymbol: '৳',
      currencyUsdSymbol: '$',
      lastBackupDate: new Date().toISOString(),
    },
    lastBackupDate: new Date().toISOString(),
  };
}

/**
 * Guarantee data structure validity to prevent any client-side TypeError or crash
 */
function healStorageData(data: any) {
  const defaults = getStandardDefaultData();
  if (!data || typeof data !== 'object') {
    return defaults;
  }

  const transactions = Array.isArray(data.transactions) ? data.transactions : defaults.transactions;
  const deposits = Array.isArray(data.deposits) ? data.deposits : defaults.deposits;
  const personalExpenses = Array.isArray(data.personalExpenses) ? data.personalExpenses : [];

  let savedAccounts = Array.isArray(data.savedAccounts) && data.savedAccounts.length > 0
    ? [...data.savedAccounts]
    : [...PREVIOUS_CUSTOMER_ACCOUNTS];

  // Merge any missing default customer accounts
  const existingKeys = new Set(
    savedAccounts.map((a: any) => `${(a.recipientName || '').toUpperCase()}|${(a.accountNumber || '').trim()}`)
  );
  for (const ca of PREVIOUS_CUSTOMER_ACCOUNTS) {
    const key = `${ca.recipientName.toUpperCase()}|${ca.accountNumber.trim()}`;
    if (!existingKeys.has(key)) {
      savedAccounts.push(ca);
      existingKeys.add(key);
    }
  }

  const rawSettings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  const settings = {
    ...defaults.settings,
    ...rawSettings,
    references:
      Array.isArray(rawSettings.references) && rawSettings.references.length > 0
        ? rawSettings.references
        : INITIAL_REFERENCES,
    banks:
      Array.isArray(rawSettings.banks) && rawSettings.banks.length > 0
        ? rawSettings.banks
        : INITIAL_BANKS,
    defaultDollarRate:
      typeof rawSettings.defaultDollarRate === 'number' && rawSettings.defaultDollarRate > 0
        ? rawSettings.defaultDollarRate
        : 123.0,
    commissionPerUsd:
      typeof rawSettings.commissionPerUsd === 'number' && rawSettings.commissionPerUsd >= 0
        ? rawSettings.commissionPerUsd
        : 0.5,
  };

  return {
    version: 1,
    transactions,
    deposits,
    savedAccounts,
    personalExpenses,
    settings,
    lastBackupDate: data.lastBackupDate || new Date().toISOString(),
  };
}

/**
 * Pre-hydrate in-memory store from both disk locations on startup
 * And ensure default demo PINs (1234, 7860, 1122) exist with full healthy data
 */
function hydratePinStore() {
  [TMP_DATA_DIR, APP_DATA_DIR].forEach((dir) => {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (file.endsWith('.json')) {
            const pin = file.replace('.json', '');
            try {
              const content = fs.readFileSync(path.join(dir, file), 'utf-8');
              const parsed = JSON.parse(content);
              if (parsed && (parsed.data || parsed.transactions)) {
                const targetData = parsed.data || parsed;
                const healed = healStorageData(targetData);
                const payload = {
                  pin,
                  lastSaved: parsed.lastSaved || new Date().toISOString(),
                  deviceName: parsed.deviceName || 'Device',
                  clientIp: parsed.clientIp,
                  stats: {
                    transactionsCount: healed.transactions.length,
                    depositsCount: healed.deposits.length,
                    accountsCount: healed.savedAccounts.length,
                    expensesCount: healed.personalExpenses.length,
                  },
                  data: healed,
                };
                pinMemoryStore.set(pin, {
                  data: payload,
                  lastSaved: payload.lastSaved,
                  clientIp: parsed.clientIp,
                });
              }
            } catch (err) {
              // ignore malformed file
            }
          }
        });
      }
    } catch (e) {
      console.warn(`Error reading PIN dir ${dir}:`, e);
    }
  });

  // Ensure 1234, 7860, 1122 always have complete default data if not already present or empty
  ['1234', '7860', '1122'].forEach((defaultPin) => {
    const existing = pinMemoryStore.get(defaultPin);
    if (!existing || !existing.data || !existing.data.data || existing.data.data.savedAccounts.length < 50) {
      const defaultData = getStandardDefaultData();
      savePinPayload(defaultPin, defaultData, 'System Default');
    }
  });

  console.log(`PIN store hydrated with ${pinMemoryStore.size} records.`);
}

/**
 * Sanitize PIN:
 * Normalizes Bengali numerals (০-৯ -> 0-9), removes spaces and special symbols
 */
function sanitizePin(pin: any): string {
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

/**
 * Helper to save PIN payload to memory and both disk locations
 */
function savePinPayload(cleanPin: string, data: any, deviceName: string, clientIp?: string) {
  const now = new Date().toISOString();
  const safeData = healStorageData(data);

  const payload = {
    pin: cleanPin,
    lastSaved: now,
    deviceName: deviceName || 'Unknown Device',
    clientIp,
    stats: {
      transactionsCount: safeData.transactions.length,
      depositsCount: safeData.deposits.length,
      accountsCount: safeData.savedAccounts.length,
      expensesCount: safeData.personalExpenses.length,
    },
    data: safeData,
  };

  // 1. In-memory
  pinMemoryStore.set(cleanPin, {
    data: payload,
    lastSaved: now,
    clientIp,
  });

  // 2. Both disk directories
  [APP_DATA_DIR, TMP_DATA_DIR].forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${cleanPin}.json`), JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      // non-fatal if one dir is read-only
    }
  });

  return payload;
}

/**
 * Helper to load PIN payload from memory or disks
 */
function loadPinPayload(cleanPin: string) {
  // Check memory first
  if (pinMemoryStore.has(cleanPin)) {
    const memoryRecord = pinMemoryStore.get(cleanPin)!.data;
    if (memoryRecord && memoryRecord.data) {
      memoryRecord.data = healStorageData(memoryRecord.data);
    }
    return memoryRecord;
  }

  // Check disks
  for (const dir of [APP_DATA_DIR, TMP_DATA_DIR]) {
    try {
      const filePath = path.join(dir, `${cleanPin}.json`);
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (parsed) {
          const targetData = parsed.data || parsed;
          const healed = healStorageData(targetData);
          const payload = {
            pin: cleanPin,
            lastSaved: parsed.lastSaved || new Date().toISOString(),
            deviceName: parsed.deviceName || 'Device',
            clientIp: parsed.clientIp,
            stats: {
              transactionsCount: healed.transactions.length,
              depositsCount: healed.deposits.length,
              accountsCount: healed.savedAccounts.length,
              expensesCount: healed.personalExpenses.length,
            },
            data: healed,
          };
          pinMemoryStore.set(cleanPin, {
            data: payload,
            lastSaved: payload.lastSaved,
            clientIp: parsed.clientIp,
          });
          return payload;
        }
      }
    } catch (e) {
      // continue
    }
  }

  return null;
}

// Hydrate on startup
hydratePinStore();

// -------------------------------------------------------------
// API ROUTES FOR PIN-BASED CROSS-DEVICE SYNC
// -------------------------------------------------------------

/**
 * Health check & status
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    cachedPinsCount: pinMemoryStore.size,
  });
});

/**
 * Save data with PIN - supports both POST /api/sync/save and POST /api/sync
 */
const handleSavePin = (req: Request, res: Response) => {
  try {
    const { pin, data, deviceName } = req.body || {};
    const cleanPin = sanitizePin(pin);

    if (!cleanPin || cleanPin.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be at least 3 digits/characters (e.g. 1234, 7860).',
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data payload provided.',
      });
    }

    const payload = savePinPayload(cleanPin, data, deviceName, req.ip);

    return res.json({
      success: true,
      pin: cleanPin,
      lastSaved: payload.lastSaved,
      stats: payload.stats,
      message: `Successfully saved ${payload.stats.transactionsCount} transactions and ${payload.stats.accountsCount} accounts to PIN [${cleanPin}].`,
    });
  } catch (err: any) {
    console.error('Error saving data to PIN:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while saving data.',
    });
  }
};

app.post('/api/sync/save', handleSavePin);
app.post('/api/sync', handleSavePin);

/**
 * Load data using PIN - supports GET /api/sync/:pin and GET /api/sync?pin=...
 */
const handleGetPin = (req: Request, res: Response) => {
  try {
    const rawPin = req.params.pin || req.query.pin;
    const cleanPin = sanitizePin(rawPin);

    if (!cleanPin || cleanPin.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Valid PIN of at least 3 characters is required.',
      });
    }

    const record = loadPinPayload(cleanPin);

    if (!record || !record.data) {
      return res.status(404).json({
        success: false,
        error: `No records found for PIN "${cleanPin}". Please confirm you saved it from your mobile first.`,
      });
    }

    return res.json({
      success: true,
      pin: cleanPin,
      lastSaved: record.lastSaved,
      data: record.data,
      stats: record.stats,
    });
  } catch (err: any) {
    console.error('Error loading data for PIN:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while retrieving data.',
    });
  }
};

app.get('/api/sync/:pin', handleGetPin);
app.get('/api/sync', handleGetPin);

/**
 * Check metadata for PIN without downloading full dataset
 */
app.get('/api/sync/:pin/meta', (req: Request, res: Response) => {
  try {
    const cleanPin = sanitizePin(req.params.pin || req.query.pin);
    if (!cleanPin || cleanPin.length < 3) {
      return res.status(400).json({ success: false, error: 'Valid PIN is required.' });
    }

    const record = loadPinPayload(cleanPin);

    if (!record) {
      return res.status(404).json({
        success: false,
        exists: false,
        error: `PIN "${cleanPin}" does not exist.`,
      });
    }

    return res.json({
      success: true,
      exists: true,
      pin: cleanPin,
      lastSaved: record.lastSaved,
      deviceName: record.deviceName,
      stats: record.stats,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to inspect PIN metadata.',
    });
  }
});

// CRITICAL: Guarantee all /api/* routes that don't match return JSON (never HTML)
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
