import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayerDMChannels } from '../../packages/server/src/db.js';

/**
 * GET /api/messages/channels
 * Auth: Bearer token
 * Returns DM channels for the authenticated player with last message info.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const channels = await getPlayerDMChannels(auth.playerId);
    return res.status(200).json(channels);
  } catch (err) {
    console.error('Get channels error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
