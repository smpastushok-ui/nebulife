import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { addAdReward, creditQuarks } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';
import { generatePhotoToken } from '../../packages/server/src/photo-token.js';

const REWARD_CONFIG: Record<string, { requiredAds: number }> = {
  quarks: { requiredAds: 3 },
  discovery_photo: { requiredAds: 3 },
  planet_photo: { requiredAds: 3 },
  panorama_photo: { requiredAds: 5 },
};

function verifyAdToken(token: string, playerId: string): boolean {
  const secret = process.env.CRON_SECRET || 'nebulife-ad-secret';
  const parts = token.split(':');
  if (parts.length !== 4) return false;

  const [sessionId, pid, expiresAtStr, sig] = parts;
  if (pid !== playerId) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) return false;

  const payload = `${sessionId}:${pid}:${expiresAtStr}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * POST /api/ads/reward
 * Body: { rewardType, adSessionTokens: string[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.adReward(auth.playerId)) {
      return res.status(429).json({ error: 'Забагато запитів. Зачекайте.' });
    }

    const { rewardType, adSessionTokens } = req.body ?? {};

    if (!rewardType || !REWARD_CONFIG[rewardType]) {
      return res.status(400).json({ error: 'Invalid reward type' });
    }

    const config = REWARD_CONFIG[rewardType];

    // Validate ad session tokens
    if (!Array.isArray(adSessionTokens) || adSessionTokens.length < config.requiredAds) {
      return res.status(400).json({ error: `Requires ${config.requiredAds} valid ad session tokens` });
    }

    const sessionIds = new Set<string>();
    for (const token of adSessionTokens.slice(0, config.requiredAds)) {
      if (typeof token !== 'string' || !verifyAdToken(token, auth.playerId)) {
        return res.status(400).json({ error: 'Invalid or expired ad session token' });
      }
      const sid = token.split(':')[0];
      if (sessionIds.has(sid)) {
        return res.status(400).json({ error: 'Duplicate ad session token' });
      }
      sessionIds.add(sid);
    }

    // Atomic daily limit check + increment
    const allowed = await addAdReward(auth.playerId, config.requiredAds);
    if (!allowed) {
      return res.status(429).json({ error: 'Daily ad limit reached' });
    }

    // Grant reward
    let amount = 0;

    if (rewardType === 'quarks') {
      await creditQuarks(auth.playerId, 5);
      amount = 5;
    } else if (['discovery_photo', 'planet_photo', 'panorama_photo'].includes(rewardType)) {
      amount = 1;
      const photoToken = generatePhotoToken(auth.playerId, rewardType);
      return res.status(200).json({ rewarded: true, amount, photoToken });
    }

    return res.status(200).json({ rewarded: true, amount });
  } catch (err) {
    console.error('Ad reward error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
