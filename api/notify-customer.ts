/**
 * notify-customer — /api/notify-customer
 *
 * Auto-sends a WhatsApp feedback request to the customer when job is marked done.
 * Uses Green API (green-api.com) — free tier: 500 msgs/month, no Meta Business needed.
 *
 * Setup (5 minutes, completely free):
 *   1. Register at green-api.com
 *   2. Create an instance → scan QR code to connect your WhatsApp number
 *   3. Copy Instance ID   → GREEN_API_INSTANCE_ID
 *   4. Copy API Token     → GREEN_API_TOKEN
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customerPhone, customerName, orderNo, serviceType, technicianName } = req.body ?? {};

  if (!customerPhone || !customerName || !orderNo || !serviceType || !technicianName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;

  if (!instanceId || !token) {
    return res.status(503).json({ error: 'WhatsApp not configured' });
  }

  // Normalise phone: strip non-digits + leading +, ensure starts with 60
  let phone = customerPhone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '60' + phone.slice(1);
  if (!phone.startsWith('60')) phone = '60' + phone;

  const message =
    `Hi ${customerName} 👋\n\n` +
    `Your *${serviceType}* service (${orderNo}) has been completed by our technician *${technicianName}*.\n\n` +
    `How was your experience? Your feedback helps us improve our service! 🙏\n\n` +
    `Reply to this message and let us know. Thank you for choosing *Sejuk Sejuk Service* ❄️`;

  try {
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

    const waRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${phone}@c.us`,
        message,
      }),
    });

    const data = await waRes.json() as Record<string, unknown>;

    if (!waRes.ok) {
      console.error('[notify-customer] Green API error:', data);
      return res.status(502).json({ error: 'WhatsApp send failed', details: data });
    }

    return res.status(200).json({ ok: true, idMessage: data.idMessage });
  } catch (err) {
    console.error('[notify-customer] error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
