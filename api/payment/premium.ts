import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer, savePaymentIntent } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';
import { getWebPremiumPlan } from '../../packages/server/src/premium-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!await RATE_LIMITS.payment(auth.playerId)) {
    return res.status(429).json({ error: 'Забагато запитів на оплату. Спробуйте пізніше.' });
  }

  try {
    const { planId } = req.body ?? {};
    const plan = getWebPremiumPlan(planId);
    if (!plan) {
      return res.status(400).json({ error: 'Unknown premium plan' });
    }

    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const monoToken = process.env.MONO_TOKEN;
    if (!monoToken) {
      return res.status(500).json({ error: 'MONO_TOKEN not configured' });
    }

    const reference = `premium_${plan.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await savePaymentIntent({
      reference,
      playerId: auth.playerId,
      amountQuarks: 0,
      purpose: plan.purpose,
      purchaseMeta: {
        planId: plan.id,
        productId: plan.productId,
        email: auth.email ?? player.email ?? null,
        amountUah: plan.amountUah,
      },
    });

    const baseUrl = getBaseUrl(req);
    const invoiceBody = {
      amount: plan.amountUah * 100,
      ccy: 980,
      merchantPaymInfo: {
        reference,
        destination: `Nebulife Premium WEB — ${plan.id}`,
        comment: `Nebulife Premium WEB: ${plan.id}`,
      },
      redirectUrl: `${baseUrl}/play?premium=success&reference=${encodeURIComponent(reference)}`,
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
      console.error('Monobank premium invoice error:', monoRes.status, errText);
      return res.status(502).json({ error: 'Failed to create premium invoice' });
    }

    const monoData = (await monoRes.json()) as { invoiceId: string; pageUrl: string };

    return res.status(200).json({
      reference,
      invoiceId: monoData.invoiceId,
      payUrl: monoData.pageUrl,
    });
  } catch (err) {
    console.error('Premium payment error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'nebulife.space';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
