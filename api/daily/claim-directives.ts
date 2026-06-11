import type { VercelRequest, VercelResponse } from '@vercel/node';
import { claimDailyDirectives, getDirectiveStreak } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * Daily directives reward.
 *
 * GET  — streak info: { streak, claimedToday }
 * POST — claim today's reward (idempotent per UTC day):
 *        { credited, newBalance, streak }
 *        credited = 1 normally, 3 on every 7th consecutive day.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      const info = await getDirectiveStreak(auth.playerId);
      return res.status(200).json(info);
    }
    if (req.method === 'POST') {
      const result = await claimDailyDirectives(auth.playerId);
      return res.status(200).json(result);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[daily/claim-directives] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
