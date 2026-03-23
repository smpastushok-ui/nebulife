import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { addAdReward, creditQuarks, addAstraPurchasedTokens } from '../../packages/server/src/db.js';

const REWARD_CONFIG: Record<string, { requiredAds: number }> = {
  quarks: { requiredAds: 3 },
  astra_charge: { requiredAds: 2 },
  premium_photo: { requiredAds: 2 },
};

/**
 * POST /api/ads/reward
 * Body: { rewardType: 'quarks' | 'astra_charge' | 'premium_photo', adsWatched: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { rewardType, adsWatched } = req.body ?? {};

    if (!rewardType || !REWARD_CONFIG[rewardType]) {
      return res.status(400).json({ error: 'Invalid reward type' });
    }

    const config = REWARD_CONFIG[rewardType];
    if (typeof adsWatched !== 'number' || adsWatched < config.requiredAds) {
      return res.status(400).json({ error: `Requires ${config.requiredAds} ads watched` });
    }

    // Check and record daily limit (server-side validation)
    const allowed = await addAdReward(auth.playerId, adsWatched);
    if (!allowed) {
      return res.status(429).json({ error: 'Daily ad limit reached' });
    }

    // Grant reward
    let amount = 0;

    if (rewardType === 'quarks') {
      await creditQuarks(auth.playerId, 5);
      amount = 5;
    } else if (rewardType === 'astra_charge') {
      await addAstraPurchasedTokens(auth.playerId, 200);
      amount = 200;
    } else if (rewardType === 'premium_photo') {
      // No server-side action needed — client uses the unlock to trigger generation
      amount = 1;
    }

    return res.status(200).json({ rewarded: true, amount });
  } catch (err) {
    console.error('Ad reward error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
