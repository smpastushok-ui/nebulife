import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';
import { areAdsAllowedForRequest } from '../../packages/server/src/ad-geo.js';
import crypto from 'node:crypto';

/**
 * POST /api/ads/start
 * Issues a signed ad session token before showing a rewarded ad.
 * Token is valid for 5 minutes — must be returned to /api/ads/reward.
 */
function createAdToken(params: { sessionId: string; playerId: string; expiresAt: number }): string {
  const secret = process.env.CRON_SECRET || 'nebulife-ad-secret';
  const payload = Buffer.from(JSON.stringify(params)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    // Rewarded ads are only enabled in Tier-1 (high-eCPM) countries. Elsewhere
    // the reward (free quarks) costs more than the ad earns, so we refuse to
    // issue a session token — the client hides the ad UI for these regions too.
    if (!areAdsAllowedForRequest(req.headers)) {
      return res.status(403).json({ error: 'ads_region_blocked' });
    }

    if (!await RATE_LIMITS.adStart(auth.playerId)) {
      return res.status(429).json({ error: 'Too many ad requests' });
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
    const token = createAdToken({ sessionId, playerId: auth.playerId, expiresAt });

    return res.status(200).json({ adSessionToken: token });
  } catch (err) {
    console.error('Ad start error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
