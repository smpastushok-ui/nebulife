import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer, savePaymentIntent } from '../../packages/server/src/db.js';

const TOKENS_PER_PURCHASE = 10000;
const PRICE_UAH = 42; // ~$1

/**
 * POST /api/ai/topup
 * Creates a Monobank invoice for 10000 A.S.T.R.A. tokens ($1 / 42 UAH).
 * Returns: { reference, invoiceId, payUrl }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const monoToken = process.env.MONO_TOKEN;
    if (!monoToken) {
      return res.status(500).json({ error: 'MONO_TOKEN not configured' });
    }

    const reference = `astra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await savePaymentIntent({
      reference,
      playerId: auth.playerId,
      amountQuarks: 0,
      purpose: 'astra_tokens',
    });

    const baseUrl = getBaseUrl(req);
    const invoiceBody = {
      amount: PRICE_UAH * 100, // kopiykas
      ccy: 980,
      merchantPaymInfo: {
        reference,
        destination: `Nebulife — A.S.T.R.A. Alpha (${TOKENS_PER_PURCHASE} tokens)`,
        comment: `A.S.T.R.A. Alpha: ${TOKENS_PER_PURCHASE} tokens`,
      },
      redirectUrl: `${baseUrl}/?payment=success&astra_tokens=${TOKENS_PER_PURCHASE}`,
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
      console.error('Monobank astra topup error:', monoRes.status, errText);
      return res.status(502).json({ error: 'Failed to create payment invoice' });
    }

    const monoData = (await monoRes.json()) as { invoiceId: string; pageUrl: string };

    return res.status(200).json({
      reference,
      invoiceId: monoData.invoiceId,
      payUrl: monoData.pageUrl,
    });
  } catch (err) {
    console.error('Astra topup error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'nebulife.space';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
