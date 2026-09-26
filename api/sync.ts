import type { Request, Response } from 'express';

// In-memory fallback for serverless runtime
const memoryStore = new Map<string, any>();

export default async function handler(req: Request, res: Response) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pin = url.searchParams.get('pin') || (req.body && req.body.pin);

  if (req.method === 'POST') {
    const { data, deviceName } = req.body || {};
    if (!pin || pin.length < 3) {
      return res.status(400).json({ success: false, error: 'Valid PIN required' });
    }
    const cleanPin = String(pin).trim();
    const payload = {
      pin: cleanPin,
      lastSaved: new Date().toISOString(),
      deviceName: deviceName || 'Device',
      data,
    };
    memoryStore.set(cleanPin, payload);
    return res.json({
      success: true,
      pin: cleanPin,
      savedAt: payload.lastSaved,
      message: 'Saved to cloud under PIN',
    });
  }

  if (req.method === 'GET') {
    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN parameter required' });
    }
    const cleanPin = String(pin).trim();
    if (memoryStore.has(cleanPin)) {
      const stored = memoryStore.get(cleanPin);
      return res.json({ success: true, data: stored.data, lastSaved: stored.lastSaved });
    }
    return res.status(404).json({ success: false, error: `PIN "${cleanPin}" not found` });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
