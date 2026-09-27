import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Memory store for serverless
const memoryStore = new Map<string, any>();
const TMP_DATA_DIR = path.resolve('/tmp', 'crossborder_pins');

try {
  if (!fs.existsSync(TMP_DATA_DIR)) {
    fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
  }
} catch (e) {
  // ignore
}

export function sanitizePin(pin: any): string {
  if (!pin) return '';
  return String(pin).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const rawPin = url.searchParams.get('pin') || (req.body && req.body.pin) || (req.query && (req.query.pin as string));
  const pin = sanitizePin(rawPin);

  if (req.method === 'POST') {
    const { data, deviceName } = req.body || {};
    if (!pin || pin.length < 3) {
      return res.status(400).json({ success: false, error: 'Valid PIN of at least 3 chars required' });
    }
    const now = new Date().toISOString();
    const payload = {
      pin,
      lastSaved: now,
      deviceName: deviceName || 'Device',
      stats: {
        transactionsCount: Array.isArray(data?.transactions) ? data.transactions.length : 0,
        depositsCount: Array.isArray(data?.deposits) ? data.deposits.length : 0,
        accountsCount: Array.isArray(data?.savedAccounts) ? data.savedAccounts.length : 0,
      },
      data,
    };
    memoryStore.set(pin, payload);
    try {
      fs.writeFileSync(path.join(TMP_DATA_DIR, `${pin}.json`), JSON.stringify(payload), 'utf-8');
    } catch {}

    return res.json({
      success: true,
      pin,
      savedAt: now,
      stats: payload.stats,
      message: 'Saved to cloud under PIN',
    });
  }

  if (req.method === 'GET') {
    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN parameter required' });
    }

    if (memoryStore.has(pin)) {
      const stored = memoryStore.get(pin);
      return res.json({ success: true, pin, data: stored.data, lastSaved: stored.lastSaved, stats: stored.stats });
    }

    try {
      const filePath = path.join(TMP_DATA_DIR, `${pin}.json`);
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        memoryStore.set(pin, parsed);
        return res.json({ success: true, pin, data: parsed.data, lastSaved: parsed.lastSaved, stats: parsed.stats });
      }
    } catch {}

    return res.status(404).json({ success: false, error: `PIN "${pin}" not found` });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
