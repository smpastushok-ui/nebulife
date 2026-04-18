import type { VercelRequest, VercelResponse } from '@vercel/node';
import { claimDailyLoginBonus } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/player/login-bonus
 *
 * Idempotent daily login bonus.
 *  - First call of the day:  credits +1⚛, advances login_streak, returns credited=1.
 *  - Subsequent calls:       credited=0, returns current balance.
 *
 * Streak rule:
 *  - last_login was YESTERDAY (UTC):  streak += 1
 *  - last_login was older than that:  streak = 1 (reset)
 *  - last_login was TODAY:            streak unchanged (no double-credit)
 *
 * Response: { credited: number, newBalance: number, streak: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const result = await claimDailyLoginBonus(auth.playerId);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[player/login-bonus] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
