import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { creditQuarks } from '../../packages/server/src/db.js';

const PRO_DAILY_QUARKS = 5;

/**
 * POST /api/player/daily-quarks
 * Auth: Bearer Firebase token
 * Body: {}
 *
 * Grants 5 free quarks to Pro subscribers once per day.
 * Client-side tracks the claim date in localStorage (nebulife_pro_daily_date).
 * Server trusts the premium flag from the client (RevenueCat validates at purchase time).
 *
 * Returns: { success: true, quarksGranted: 5, newBalance: number }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const updated = await creditQuarks(auth.playerId, PRO_DAILY_QUARKS);

    return res.status(200).json({
      success: true,
      quarksGranted: PRO_DAILY_QUARKS,
      newBalance: updated.quarks,
    });
  } catch (err) {
    console.error('[daily-quarks] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
