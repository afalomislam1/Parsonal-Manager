import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support JSON payloads up to 50MB for full ledger backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists for persistent PIN backups
const DATA_DIR = path.resolve(__dirname, 'data', 'pins');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache for fast lookup
const pinMemoryStore = new Map<string, { data: any; lastSaved: string; clientIp?: string }>();

// Sanitize PIN to prevent directory traversal
function sanitizePin(pin: string): string {
  if (!pin) return '';
  return String(pin).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

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
 * Save data with PIN
 * Mobile or any device sends their full ledger data under their chosen PIN
 */
app.post('/api/sync/save', (req: Request, res: Response) => {
  try {
    const { pin, data, deviceName } = req.body;
    const cleanPin = sanitizePin(pin);

    if (!cleanPin || cleanPin.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be at least 3 characters/digits (e.g. 1234, 7860).',
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data payload provided.',
      });
    }

    const now = new Date().toISOString();
    const payload = {
      pin: cleanPin,
      lastSaved: now,
      deviceName: deviceName || 'Unknown Device',
      clientIp: req.ip,
      stats: {
        transactionsCount: Array.isArray(data.transactions) ? data.transactions.length : 0,
        depositsCount: Array.isArray(data.deposits) ? data.deposits.length : 0,
        accountsCount: Array.isArray(data.savedAccounts) ? data.savedAccounts.length : 0,
        expensesCount: Array.isArray(data.personalExpenses) ? data.personalExpenses.length : 0,
      },
      data,
    };

    // Store in memory cache
    pinMemoryStore.set(cleanPin, {
      data: payload,
      lastSaved: now,
      clientIp: req.ip,
    });

    // Persist to local disk so it survives server reboots
    const filePath = path.join(DATA_DIR, `${cleanPin}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    return res.json({
      success: true,
      pin: cleanPin,
      lastSaved: now,
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
});

/**
 * Load data using PIN
 * Any PC or second device fetches the full ledger data
 */
app.get('/api/sync/:pin', (req: Request, res: Response) => {
  try {
    const cleanPin = sanitizePin(req.params.pin);
    if (!cleanPin) {
      return res.status(400).json({
        success: false,
        error: 'Valid PIN is required.',
      });
    }

    // Check memory store first
    if (pinMemoryStore.has(cleanPin)) {
      const cached = pinMemoryStore.get(cleanPin)!;
      return res.json({
        success: true,
        pin: cleanPin,
        lastSaved: cached.lastSaved,
        data: cached.data.data,
        stats: cached.data.stats,
      });
    }

    // Check disk storage
    const filePath = path.join(DATA_DIR, `${cleanPin}.json`);
    if (fs.existsSync(filePath)) {
      const fileRaw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileRaw);

      // Populate memory cache
      pinMemoryStore.set(cleanPin, {
        data: parsed,
        lastSaved: parsed.lastSaved || new Date().toISOString(),
        clientIp: parsed.clientIp,
      });

      return res.json({
        success: true,
        pin: cleanPin,
        lastSaved: parsed.lastSaved,
        data: parsed.data,
        stats: parsed.stats,
      });
    }

    // Not found
    return res.status(404).json({
      success: false,
      error: `No records found for PIN "${cleanPin}". Please confirm you saved it from your mobile first.`,
    });
  } catch (err: any) {
    console.error('Error loading data for PIN:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while retrieving data.',
    });
  }
});

/**
 * Check metadata for PIN without downloading full dataset
 */
app.get('/api/sync/:pin/meta', (req: Request, res: Response) => {
  try {
    const cleanPin = sanitizePin(req.params.pin);
    if (!cleanPin) {
      return res.status(400).json({ success: false, error: 'Valid PIN is required.' });
    }

    let record: any = null;
    if (pinMemoryStore.has(cleanPin)) {
      record = pinMemoryStore.get(cleanPin)!.data;
    } else {
      const filePath = path.join(DATA_DIR, `${cleanPin}.json`);
      if (fs.existsSync(filePath)) {
        record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

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
