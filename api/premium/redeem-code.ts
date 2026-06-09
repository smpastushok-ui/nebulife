import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { checkRateLimit } from '../../packages/server/src/rate-limiter.js';
import { redeemPremiumPromoCode } from '../../packages/server/src/premium-service.js';

/**
 * POST /api/premium/redeem-code
 * Body: { code: string }
 *
 * Redeems a one-time premium promo code (tester/partner codes, migration 031).
 * Premium duration comes from the code itself (default 365 days).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  // Brute-force guard: 5 attempts per 10 minutes per player.
  if (!await checkRateLimit(`promo:${auth.playerId}`, 5, 600_000)) {
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  try {
    const result = await redeemPremiumPromoCode(auth.playerId, (req.body ?? {}).code);
    if (!result.ok) {
      const status = result.reason === 'already_premium' ? 409 : 400;
      return res.status(status).json({ error: result.reason });
    }
    return res.status(200).json({ redeemed: true, ...result.status });
  } catch (err) {
    console.error('[promo] Redeem failed:', err);
    return res.status(500).json({ error: 'redeem_failed' });
  }
}
