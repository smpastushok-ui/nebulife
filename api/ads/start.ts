import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';
import crypto from 'node:crypto';

/**
 * POST /api/ads/start
 * Issues a signed ad session token before showing a rewarded ad.
 * Token is valid for 5 minutes — must be returned to /api/ads/reward.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.adReward(auth.playerId)) {
      return res.status(429).json({ error: 'Too many ad requests' });
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    const secret = process.env.CRON_SECRET || 'nebulife-ad-secret';

    // HMAC-signed token: sessionId:playerId:expiresAt:signature
    const payload = `${sessionId}:${auth.playerId}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const token = `${payload}:${signature}`;

    return res.status(200).json({ adSessionToken: token });
  } catch (err) {
    console.error('Ad start error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
