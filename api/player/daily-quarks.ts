import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { claimPremiumDailyQuarks } from '../../packages/server/src/db.js';

const PRO_DAILY_QUARKS = 5;

/**
 * POST /api/player/daily-quarks
 * Auth: Bearer Firebase token
 * Body: {}
 *
 * Grants 5 free quarks to Pro subscribers once per day.
 * Server verifies Premium and enforces one claim per UTC day.
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

    const updated = await claimPremiumDailyQuarks(auth.playerId, PRO_DAILY_QUARKS);
    if (!updated) {
      return res.status(403).json({ error: 'premium_required_or_already_claimed' });
    }

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
