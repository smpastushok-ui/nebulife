import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getUnreadSummary } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

/**
 * GET /api/messages/unread-summary
 * Auth: Bearer token
 *
 * Returns aggregated unread counts for all of the player's channels in a single
 * request: { global, system, astra, dm }. Replaces the chatty per-channel
 * polling the client used to run while the chat widget is collapsed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.poll(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const summary = await getUnreadSummary(auth.playerId);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(summary);
  } catch (err) {
    console.error('Unread summary error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
