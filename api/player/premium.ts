import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getServerPremiumStatus, syncRevenueCatPremium } from '../../packages/server/src/premium-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    const status = await getServerPremiumStatus(auth.playerId);
    return res.status(200).json(status);
  }

  if (req.method === 'POST') {
    try {
      const status = await syncRevenueCatPremium(auth.playerId);
      return res.status(200).json(status);
    } catch (err) {
      console.error('[premium] RevenueCat sync failed:', err);
      return res.status(503).json({ error: 'premium_sync_failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
