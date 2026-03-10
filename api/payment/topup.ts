import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayer, savePaymentIntent } from '../../packages/server/src/db.js';

/**
 * POST /api/payment/topup
 *
 * Body: { playerId: string, amount: number }
 *
 * Creates a Monobank invoice to top up quark balance.
 * 1 UAH = 1 Quark.
 * Returns: { reference, invoiceId, payUrl }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId, amount } = req.body;

    if (!playerId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: playerId, amount' });
    }

    const quarksAmount = Math.floor(Number(amount));
    if (quarksAmount < 1 || quarksAmount > 10000) {
      return res.status(400).json({ error: 'Amount must be between 1 and 10000' });
    }

    // Verify player exists
    const player = await getPlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const monoToken = process.env.MONO_TOKEN;
    if (!monoToken) {
      return res.status(500).json({ error: 'MONO_TOKEN not configured' });
    }

    // Generate unique reference
    const reference = `topup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Save payment intent
    await savePaymentIntent({
      reference,
      playerId,
      amountQuarks: quarksAmount,
      purpose: 'topup',
    });

    // Create Monobank invoice
    const baseUrl = getBaseUrl(req);
    const invoiceBody = {
      amount: quarksAmount * 100, // Convert to kopiykas (1 UAH = 100 kopiykas)
      ccy: 980, // UAH (ISO 4217)
      merchantPaymInfo: {
        reference,
        destination: `Nebulife — поповнення ${quarksAmount} кварків`,
        comment: `Поповнення балансу: ${quarksAmount} ⚛`,
      },
      redirectUrl: `${baseUrl}/?payment=success&topup=true&amount=${quarksAmount}`,
      webHookUrl: `${baseUrl}/api/payment/callback`,
    };

    const monoRes = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': monoToken,
      },
      body: JSON.stringify(invoiceBody),
    });

    if (!monoRes.ok) {
      const errText = await monoRes.text();
      console.error('Monobank topup invoice error:', monoRes.status, errText);
      return res.status(502).json({ error: 'Failed to create payment invoice' });
    }

    const monoData = (await monoRes.json()) as { invoiceId: string; pageUrl: string };

    return res.status(200).json({
      reference,
      invoiceId: monoData.invoiceId,
      payUrl: monoData.pageUrl,
    });
  } catch (err) {
    console.error('Topup error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'nebulife.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
